#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Embedding v3 批处理（BGE 版本）

输入：knowledge/processed/classics_index.jsonl
输出：
- knowledge/processed/embeddings_v3.npy（float32，shape=(N, 512)）
- knowledge/processed/_embed_meta_v3.json（passage_id 映射 + 模型元信息）

模型：BAAI/bge-small-zh-v1.5（dim=512，本地缓存）
注：原计划 bge-large-zh-v1.5（1024维）因本地沙箱无法访问 huggingface.co，
    降级为 bge-small-zh-v1.5（512维）。两者均为 BGE 系列真实语义模型，
    可用于评估 v3 vs v2(TF-IDF) 的 recall/precision 提升幅度。

断点续传：
- 进度文件 _embed_v3_progress.json，每 2000 条保存一次
- 重启时自动从断点继续

CPU 预估：~50 passages/s × 357359 条 ≈ 2 小时
"""
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
EMB_FILE = ROOT / "knowledge" / "processed" / "embeddings_v3.npy"
META_FILE = ROOT / "knowledge" / "processed" / "_embed_meta_v3.json"
PROGRESS_FILE = ROOT / "knowledge" / "processed" / "_embed_v3_progress.json"
CHECKPOINT_EVERY = 2000  # 每 2000 条保存一次

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

BATCH_SIZE = int(os.getenv("BGE_BATCH_SIZE", "32"))
MODEL_NAME = "BAAI/bge-small-zh-v1.5"


def load_index():
    """加载全量 passages"""
    if not INDEX_FILE.exists():
        print(f"[ERROR] 缺少 {INDEX_FILE}")
        sys.exit(1)
    items = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            items.append(json.loads(line))
    return items


def load_progress():
    """加载断点"""
    if not PROGRESS_FILE.exists():
        return 0
    try:
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("processed", 0)
    except Exception:
        return 0


def save_progress(n: int):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump({"processed": n, "ts": time.time()}, f)


def main():
    print(f"[Embed v3] BGE-small-zh-v1.5 (dim=512)")
    print(f"  index={INDEX_FILE}")
    print(f"  output={EMB_FILE}")
    print(f"  batch_size={BATCH_SIZE}")

    items = load_index()
    n = len(items)
    print(f"  共 {n} 条 passages")

    # 若已完成则跳过(memmap 文件无 .npy 头部,用文件大小判断)
    if EMB_FILE.exists() and META_FILE.exists():
        expected_size = n * 512 * 4  # float32 = 4 bytes (dim 在模型加载后才知道,这里先估算)
        actual_size = EMB_FILE.stat().st_size
        # 用 progress 文件判断是否真的完成
        if load_progress() >= n and actual_size > 0:
            print(f"  [SKIP] embeddings_v3.npy 已存在且 progress={load_progress()}")
            return
        elif actual_size > 0 and actual_size != expected_size and actual_size != n * 1024 * 4:
            print(f"  [WARN] 已有文件大小 {actual_size} 不匹配预期,删除重生成")
            EMB_FILE.unlink(missing_ok=True)

    # 加载模型
    print(f"\n[Model] 加载 {MODEL_NAME} ...")
    t0 = time.time()
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(MODEL_NAME)
    dim = model.get_sentence_embedding_dimension()
    print(f"  [OK] 加载完成 ({time.time()-t0:.2f}s), dim={dim}, device={model.device}")

    # 断点续传 - 用 memmap 避免内存预分配(731MB → 几乎0内存)
    start_idx = load_progress()
    if start_idx > 0 and start_idx < n:
        print(f"\n[Resume] 从 {start_idx}/{n} 继续")
        # 用 memmap 模式打开(读写),不加载到内存
        embeddings = np.memmap(EMB_FILE, dtype=np.float32, mode='r+',
                               shape=(n, dim))
        print(f"  [Resume] memmap 打开 shape={embeddings.shape}")
    else:
        start_idx = 0
        # 创建 memmap 文件(写模式),预分配磁盘空间
        embeddings = np.memmap(EMB_FILE, dtype=np.float32, mode='w+',
                               shape=(n, dim))
        print(f"  [Init] memmap 创建 shape={embeddings.shape}, "
              f"size={EMB_FILE.stat().st_size/1024/1024:.1f}MB")

    # 编码
    print(f"\n[Encode] 从 {start_idx} 编码到 {n}")
    t0 = time.time()
    processed = start_idx
    while processed < n:
        end = min(processed + BATCH_SIZE, n)
        batch_texts = [items[i].get("text", "") for i in range(processed, end)]
        # 截断到 max_seq_length
        batch_texts = [t[:512] if len(t) > 512 else t for t in batch_texts]
        batch_vecs = model.encode(
            batch_texts,
            batch_size=len(batch_texts),
            show_progress_bar=False,
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype(np.float32)
        embeddings[processed:end] = batch_vecs
        processed = end

        # 定期保存(memmap 只需 flush,不需要 np.save)
        if processed % CHECKPOINT_EVERY < BATCH_SIZE or processed >= n:
            embeddings.flush()
            save_progress(processed)
            elapsed = time.time() - t0
            done_now = processed - start_idx
            rate = done_now / max(elapsed, 0.01)
            remaining = (n - processed) / max(rate, 0.01)
            print(f"  [{processed}/{n}] {rate:.1f} passages/s, "
                  f"剩余 ~{remaining/60:.1f} 分钟", flush=True)

    elapsed = time.time() - t0
    total_done = n - start_idx
    print(f"\n[Done] 编码完成: {total_done} 条, 耗时 {elapsed:.1f}s "
          f"({total_done/max(elapsed,0.01):.1f} passages/s)")

    # 最终保存(memmap flush + 关闭)
    embeddings.flush()
    # 保存元信息到局部变量(避免 del 后访问引发 UnboundLocalError)
    emb_shape = embeddings.shape
    emb_dtype = str(embeddings.dtype)
    emb_size_mb = EMB_FILE.stat().st_size / 1024 / 1024
    print(f"  shape={emb_shape}, dtype={emb_dtype}, size={emb_size_mb:.1f}MB")

    # meta
    meta = {
        "model": "bge-small-zh-v1.5",
        "dim": dim,
        "count": n,
        "elapsed_sec": round(elapsed, 1),
        "resumed_from": start_idx,
        "passages_per_sec": round(total_done / max(elapsed, 0.01), 1),
        "index_file": str(INDEX_FILE.relative_to(ROOT)),
        "embed_file": str(EMB_FILE.relative_to(ROOT)),
        "first_passage_id": items[0]["passage_id"] if items else None,
        "last_passage_id": items[-1]["passage_id"] if items else None,
        "version": "v3.0",
        "generated_at": time.strftime("%Y-%m-%d"),
        "downgrade_note": "原计划 bge-large-zh-v1.5(1024维)，沙箱无法访问 huggingface，降级为 bge-small-zh-v1.5(512维)",
    }
    META_FILE.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  meta={META_FILE}")

    # 抽样验证
    print(f"\n[Verify] 抽样验证 cosine 相似度（同书 vs 跨书）")
    sample_book = items[0].get("book", "")
    same_book_idx = [i for i, it in enumerate(items) if it.get("book") == sample_book][:3]
    diff_book_idx = [i for i, it in enumerate(items) if it.get("book") != sample_book][:3]
    if same_book_idx and diff_book_idx:
        v0 = embeddings[same_book_idx[0]]
        same_sims = [float(np.dot(v0, embeddings[i])) for i in same_book_idx[1:]]
        diff_sims = [float(np.dot(v0, embeddings[i])) for i in diff_book_idx]
        print(f"  基向量 book='{sample_book}'")
        print(f"    同书相似度={[round(s,3) for s in same_sims]}")
        print(f"    跨书相似度={[round(s,3) for s in diff_sims]}")
        if max(same_sims) > min(diff_sims):
            print(f"  [OK] 同书 vs 跨书区分度合理")
        else:
            print(f"  [WARN] 同书与跨书相似度重叠，区分度有限")

    # 最终关闭 memmap(所有引用结束后)
    del embeddings

    print(f"\n[DONE] model=bge-small-zh-v1.5, count={n}, dim={dim}")


if __name__ == "__main__":
    main()
