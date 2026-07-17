#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ChromaDB 入库（步骤 4）

输入：
- knowledge/processed/classics_index.jsonl
- knowledge/processed/embeddings.npy

输出：
- knowledge/services/chroma_db/（持久化的 ChromaDB 集合）

集合：classics_v1（按 system_type 拆分存储便于过滤）
"""
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
EMB_FILE = ROOT / "knowledge" / "processed" / "embeddings.npy"
CHROMA_DIR = ROOT / "knowledge" / "services" / "chroma_db"

CHROMA_DIR.mkdir(parents=True, exist_ok=True)
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "classics_v1")


def main():
    print(f"[ChromaDB] 入库")
    print(f"  index={INDEX_FILE}")
    print(f"  emb={EMB_FILE}")
    print(f"  chroma={CHROMA_DIR}")

    if not INDEX_FILE.exists():
        print(f"[ERROR] 缺少 {INDEX_FILE}，请先运行 knowledge_ingest.py")
        sys.exit(1)
    if not EMB_FILE.exists():
        print(f"[ERROR] 缺少 {EMB_FILE}，请先运行 embed_classics.py")
        sys.exit(1)

    # 加载数据
    print(f"\n[Load] 读取索引和向量 ...")
    items = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            items.append(json.loads(line))
    embeddings = np.load(EMB_FILE)
    n = len(items)
    print(f"  passages={n}, embeddings.shape={embeddings.shape}")
    assert embeddings.shape[0] == n, f"行数不匹配: items={n}, embeddings={embeddings.shape[0]}"

    # 初始化 ChromaDB（Plan B：用默认 embedding function=None 跳过 ChromaDB 内置 onnx 下载）
    print(f"\n[Chroma] 初始化客户端（持久化到 {CHROMA_DIR}）...")
    import chromadb
    from chromadb.config import Settings
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False, allow_reset=False),
    )

    # 创建/获取集合（Plan B：传 embedding_function=None 跳过默认 onnx 下载）
    try:
        try:
            client.delete_collection(COLLECTION_NAME)
            print(f"  已删除旧集合 {COLLECTION_NAME}")
        except Exception:
            pass
        collection = client.create_collection(
            name=COLLECTION_NAME,
            embedding_function=None,  # Plan B：禁用默认 onnx（避免下载模型）
            metadata={"hnsw:space": "cosine", "dim": int(embeddings.shape[1])},
        )
        print(f"  新建集合 {COLLECTION_NAME}（embedding_function=None）")
    except Exception as e:
        print(f"  [WARN] 创建集合失败: {e}，尝试 get_or_create")
        collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            embedding_function=None,
            metadata={"hnsw:space": "cosine", "dim": int(embeddings.shape[1])},
        )

    # 批量导入
    print(f"\n[Insert] 批量写入 {n} 条 ...")
    BATCH = 500
    t0 = time.time()
    for start in range(0, n, BATCH):
        end = min(start + BATCH, n)
        batch_items = items[start:end]
        batch_emb = embeddings[start:end]
        collection.add(
            ids=[it["passage_id"] for it in batch_items],
            embeddings=batch_emb.tolist(),
            documents=[it["text"] for it in batch_items],
            metadatas=[
                {
                    "book": it["book"][:200],
                    "chapter": (it.get("chapter") or "")[:200],
                    "system_type": it["system_type"],
                    "source": it.get("source", "")[:200],
                }
                for it in batch_items
            ],
        )
        if (start // BATCH) % 5 == 0:
            elapsed = time.time() - t0
            rate = (end) / max(elapsed, 0.1)
            print(f"  [{end}/{n}] {elapsed:.1f}s, {rate:.0f} passages/s")

    elapsed = time.time() - t0
    print(f"  完成，耗时 {elapsed:.1f}s（{n/elapsed:.0f} passages/s）")

    # 验证
    print(f"\n[Verify] 检索验证 ...")
    cnt = collection.count()
    print(f"  collection.count()={cnt}")
    if cnt != n:
        print(f"  [WARN] 数量不匹配: 预期={n}, 实际={cnt}")
    # Plan B：query_texts 会触发默认 onnx 下载，改用 query_embeddings 跳过
    plan_b = META_FILE.exists() and json.loads(META_FILE.read_text(encoding="utf-8")).get("plan_b_used", True)
    test_queries = [
        ("bazi", "日主身弱如何取用神"),
        ("bazi", "甲木生于午月用神"),
        ("liuren", "贼克法如何取三传"),
    ]
    if plan_b:
        # 用同样的 TF-IDF 公式生成 query 向量
        from scripts.embed_classics import TfidfCharBigramEmbedder
        qe = TfidfCharBigramEmbedder(dim=embeddings.shape[1])
        qe.fit([it["text"] for it in items])
        for sys_type, q in test_queries:
            print(f"\n  query: [{sys_type}] {q}")
            qvec = qe.encode_one(q).tolist()
            res = collection.query(query_embeddings=[qvec], n_results=3, where={"system_type": sys_type})
            if res.get("ids") and res["ids"][0]:
                for i, (doc, meta, dist) in enumerate(zip(res["documents"][0], res["metadatas"][0], res["distances"][0])):
                    print(f"    [{i+1}] {meta['book'][:30]} | {doc[:80]}... (dist={dist:.3f})")
            else:
                print(f"    [WARN] 无结果")
    else:
        for sys_type, q in test_queries:
            print(f"\n  query: [{sys_type}] {q}")
            res = collection.query(query_texts=[q], n_results=3, where={"system_type": sys_type})
            for i, (doc, meta, dist) in enumerate(zip(res["documents"][0], res["metadatas"][0], res["distances"][0])):
                print(f"    [{i+1}] {meta['book'][:30]} | {doc[:80]}... (dist={dist:.3f})")

    print(f"\n[DONE] collection={COLLECTION_NAME}, count={cnt}")


if __name__ == "__main__":
    main()
