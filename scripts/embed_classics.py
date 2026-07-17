#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Embedding 批处理（步骤 3，Plan B 版本）

输入：knowledge/processed/classics_index.jsonl
输出：
- knowledge/processed/embeddings.npy（float32 数组，shape=(N, 1024)）
- knowledge/processed/_embed_meta.json（行号→passage_id 映射 + 模型元信息）

模型选择（按优先级自动降级）：
1. BGE-Large-ZH（如果 BGE_MODEL_PATH 或网络可用）
2. Plan B: TF-IDF 字符级 Bigram（纯 Python，无需下载）

降级原因：当前 Windows 沙箱环境无法访问 huggingface.co
"""
import json
import os
import re
import sys
import time
import hashlib
import math
from pathlib import Path
from typing import List, Dict, Optional

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
EMB_FILE = ROOT / "knowledge" / "processed" / "embeddings.npy"
META_FILE = ROOT / "knowledge" / "processed" / "_embed_meta.json"

EXPECTED_DIM = 1024  # 统一 1024 维
BATCH_SIZE = int(os.getenv("BGE_BATCH_SIZE", "32"))


# ============================================================
# Plan B: TF-IDF 字符级 Bigram Embedding（纯 numpy）
# ============================================================
class TfidfCharBigramEmbedder:
    """字符级 Bigram TF-IDF Embedder，维度 = EXPECTED_DIM"""

    def __init__(self, dim: int = EXPECTED_DIM):
        self.dim = dim
        self.vocab_size = dim
        self.idf = None  # 逆文档频率
        self.fitted = False

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """字符级 bigram + 单字 + 词级 token 混合"""
        text = re.sub(r"\s+", "", text)
        tokens = []
        # 字符级 bigram
        for i in range(len(text) - 1):
            tokens.append(text[i:i+2])
        # 单字（中文常用）
        tokens.extend(list(text))
        return tokens

    @staticmethod
    def _hash(token: str, dim: int) -> int:
        """稳定 hash 映射 token 到维度槽位"""
        h = hashlib.md5(token.encode("utf-8")).digest()
        # 取前 8 字节转 int
        return int.from_bytes(h[:8], "big") % dim

    def fit(self, texts: List[str]):
        """计算 IDF"""
        print(f"  [TF-IDF] 统计 IDF，语料 {len(texts)} 条 ...")
        df = np.zeros(self.dim, dtype=np.float64)
        for text in texts:
            tokens = self._tokenize(text)
            if not tokens:
                continue
            unique = set(tokens)
            for t in unique:
                df[self._hash(t, self.dim)] += 1
        # IDF 公式：log(N / (1 + df)) + 1
        n = len(texts)
        self.idf = np.log(n / (1.0 + df)) + 1.0
        self.fitted = True
        print(f"  [TF-IDF] 词汇覆盖: {(df > 0).sum()}/{self.dim} 槽位非空")

    def save_idf(self, path: str):
        """保存 IDF 向量到文件（用于服务器部署，避免重复 fit）"""
        import pickle
        if not self.fitted:
            raise RuntimeError("请先调用 fit()")
        data = {"idf": self.idf, "dim": self.dim, "fitted": self.fitted}
        with open(path, "wb") as f:
            pickle.dump(data, f)
        print(f"  [TF-IDF] IDF 缓存已保存: {path} ({len(data['idf'])} 维)")

    def load_idf(self, path: str) -> bool:
        """从文件加载 IDF 向量（服务器部署用，跳过 fit 过程）"""
        import pickle
        try:
            with open(path, "rb") as f:
                data = pickle.load(f)
            if data["dim"] != self.dim:
                print(f"  [TF-IDF] IDF 维度不匹配: {data['dim']} != {self.dim}")
                return False
            self.idf = data["idf"]
            self.fitted = True
            print(f"  [TF-IDF] IDF 缓存已加载: {path} ({len(self.idf)} 维)")
            return True
        except Exception as e:
            print(f"  [TF-IDF] 加载 IDF 缓存失败: {e}")
            return False

    def encode_one(self, text: str) -> np.ndarray:
        """单条文本 -> 1024 维向量（归一化）"""
        if not self.fitted:
            raise RuntimeError("请先调用 fit()")
        tokens = self._tokenize(text)
        if not tokens:
            return np.zeros(self.dim, dtype=np.float32)
        vec = np.zeros(self.dim, dtype=np.float32)
        for t in tokens:
            vec[self._hash(t, self.dim)] += 1.0
        # TF 归一化（除以 token 总数）
        vec /= len(tokens)
        # 乘以 IDF
        vec *= self.idf
        # L2 归一化
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec

    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """批量编码"""
        n = len(texts)
        out = np.zeros((n, self.dim), dtype=np.float32)
        t0 = time.time()
        for i in range(n):
            out[i] = self.encode_one(texts[i])
            if (i + 1) % 1000 == 0:
                rate = (i + 1) / max(time.time() - t0, 0.01)
                print(f"  [{i+1}/{n}] {rate:.0f} passages/s")
        return out


# ============================================================
# 主流程
# ============================================================
def try_bge_model() -> Optional["SentenceTransformer"]:
    """尝试加载 BGE-Large-ZH，失败返回 None"""
    # 已确认当前环境无法联网 huggingface.co，直接跳过
    if os.getenv("SKIP_BGE", "1") == "1":
        print(f"  [BGE] SKIP_BGE=1，直接跳过 BGE 尝试（当前环境无 huggingface 访问）")
        return None
    try:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv("BGE_MODEL_PATH", "BAAI/bge-large-zh-v1.5")
        cache_path = Path(os.getenv("BGE_MODEL_CACHE_DIR", ""))
        if cache_path.exists() and (cache_path / "config.json").exists():
            print(f"  [BGE] 使用本地缓存: {cache_path}")
            return SentenceTransformer(str(cache_path))
        print(f"  [BGE] 尝试在线加载 {model_name}（5秒超时）...")
        import socket
        socket.setdefaulttimeout(5)
        model = SentenceTransformer(model_name)
        return model
    except Exception as e:
        print(f"  [BGE] 加载失败: {type(e).__name__}: {str(e)[:200]}")
        return None


def main():
    print(f"[Embed] 开始")
    print(f"  index={INDEX_FILE}")
    print(f"  output={EMB_FILE}")

    if not INDEX_FILE.exists():
        print(f"[ERROR] 缺少 {INDEX_FILE}，请先运行 knowledge_ingest.py")
        sys.exit(1)

    # 加载索引
    print(f"\n[Load] 读取 classics_index.jsonl ...")
    items = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line))
    n = len(items)
    print(f"  共 {n} 条 passages")

    # 检查已存在的 embeddings（断点续传）
    if EMB_FILE.exists():
        try:
            existing = np.load(EMB_FILE)
            if existing.shape == (n, EXPECTED_DIM):
                print(f"  [SKIP] embeddings.npy 已存在且匹配（shape={existing.shape}）")
                if META_FILE.exists():
                    print(f"  meta={META_FILE.read_text(encoding='utf-8')[:300]}")
                return
            else:
                print(f"  [WARN] 已有 embeddings shape={existing.shape}，不匹配，重新生成")
                EMB_FILE.unlink()
        except Exception as e:
            print(f"  [WARN] 读取已有 embeddings 失败: {e}，重新生成")

    # 尝试加载 BGE，失败则用 Plan B
    print(f"\n[Model] 尝试 BGE-Large-ZH ...")
    bge = try_bge_model()
    model_used = None
    embedder = None

    if bge is not None:
        model_used = "bge-large-zh-v1.5"
        print(f"  [OK] BGE 加载成功，device={bge.device}")
        # 用 BGE
        texts = [item["text"] for item in items]
        t0 = time.time()
        embeddings = bge.encode(
            texts, batch_size=BATCH_SIZE, show_progress_bar=True,
            normalize_embeddings=True, convert_to_numpy=True,
        ).astype(np.float32)
        elapsed = time.time() - t0
    else:
        print(f"\n[Plan B] 使用 TF-IDF 字符级 Bigram Embedder（纯 numpy，dim={EXPECTED_DIM}）")
        model_used = "tfidf-char-bigram-v1"
        embedder = TfidfCharBigramEmbedder(dim=EXPECTED_DIM)
        t0 = time.time()
        embedder.fit([item["text"] for item in items])
        print(f"  fit 完成，耗时 {time.time()-t0:.1f}s")
        t0 = time.time()
        embeddings = embedder.encode([item["text"] for item in items])
        elapsed = time.time() - t0

    print(f"  完成，耗时 {elapsed:.1f}s（{n/elapsed:.1f} passages/s）")

    # 验证
    assert embeddings.shape == (n, EXPECTED_DIM), f"shape 不匹配: {embeddings.shape}"
    if embeddings.dtype != np.float32:
        embeddings = embeddings.astype(np.float32)

    # 保存
    print(f"\n[Save] 写入 {EMB_FILE}")
    np.save(EMB_FILE, embeddings)
    print(f"  shape={embeddings.shape}, dtype={embeddings.dtype}, size={EMB_FILE.stat().st_size/1024/1024:.1f}MB")

    # meta
    meta = {
        "model": model_used,
        "dim": EXPECTED_DIM,
        "count": n,
        "elapsed_sec": round(elapsed, 1),
        "passages_per_sec": round(n / elapsed, 1),
        "index_file": str(INDEX_FILE.relative_to(ROOT)),
        "embed_file": str(EMB_FILE.relative_to(ROOT)),
        "first_passage_id": items[0]["passage_id"] if items else None,
        "last_passage_id": items[-1]["passage_id"] if items else None,
        "version": "v1.0",
        "generated_at": "2026-06-18",
        "plan_b_used": bge is None,
    }
    META_FILE.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  meta={META_FILE}")

    # 抽样验证
    print(f"\n[Verify] 抽样验证 cosine 距离（基向量与同书/跨书对比）")
    sample_book = items[0]["book"]
    same_book_idx = [i for i, it in enumerate(items) if it["book"] == sample_book][:3]
    diff_book_idx = [i for i, it in enumerate(items) if it["book"] != sample_book][:3]
    if same_book_idx and diff_book_idx:
        v0 = embeddings[same_book_idx[0]]
        same_dists = [float(np.dot(v0, embeddings[i])) for i in same_book_idx[1:]]
        diff_dists = [float(np.dot(v0, embeddings[i])) for i in diff_book_idx]
        print(f"  基向量 book='{sample_book}'")
        print(f"    同书相似度={[round(d,3) for d in same_dists]}")
        print(f"    跨书相似度={[round(d,3) for d in diff_dists]}")
        if max(same_dists) > min(diff_dists):
            print(f"  [WARN] 同书与跨书相似度有重叠，模型区分度有限")
        else:
            print(f"  [OK] 同书与跨书相似度区分明显")

    print(f"\n[DONE] model={model_used}, count={n}")


if __name__ == "__main__":
    main()
