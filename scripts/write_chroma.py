#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 embeddings.npy + classics_index.jsonl 写入 ChromaDB

输入：
- knowledge/processed/embeddings.npy
- knowledge/processed/classics_index.jsonl

输出：
- ChromaDB collection classics_v1（含 26568 条向量 + metadata）

幂等：先删除旧 collection，再创建新 collection 写入
"""
import os
import sys
import json
import time
import numpy as np

# Monkey-patch: chromadb 旧版用了 np.float_（numpy 2.0 已移除）
if not hasattr(np, 'float_'):
    np.float_ = np.float64
if not hasattr(np, 'int_'):
    np.int_ = np.int64
if not hasattr(np, 'uint'):
    np.uint = np.uint64

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMBED_FILE = ROOT / "knowledge" / "processed" / "embeddings.npy"
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"

# ChromaDB 路径（与 main.py 保持一致）
CHROMA_DIR = ROOT / "apps" / "knowledge" / "services" / "chroma_db"
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "classics_v1")

BATCH_SIZE = 500  # 每批写入 500 条


def main():
    print(f"=== ChromaDB 写入脚本 ===")
    print(f"  EMBED_FILE: {EMBED_FILE}")
    print(f"  INDEX_FILE: {INDEX_FILE}")
    print(f"  CHROMA_DIR: {CHROMA_DIR}")
    print(f"  COLLECTION: {COLLECTION_NAME}")

    # 1. 检查输入文件
    if not EMBED_FILE.exists():
        print(f"[ERROR] embeddings.npy 不存在: {EMBED_FILE}")
        sys.exit(1)
    if not INDEX_FILE.exists():
        print(f"[ERROR] classics_index.jsonl 不存在: {INDEX_FILE}")
        sys.exit(1)

    # 2. 加载数据
    print(f"\n[Load] 加载 embeddings.npy...")
    emb = np.load(EMBED_FILE)
    print(f"  shape={emb.shape}, dtype={emb.dtype}, size={emb.nbytes / 1024 / 1024:.1f}MB")

    print(f"[Load] 加载 classics_index.jsonl...")
    items = []
    with open(INDEX_FILE, encoding='utf-8') as f:
        for line in f:
            items.append(json.loads(line))
    print(f"  items={len(items)}")

    if len(items) != emb.shape[0]:
        print(f"[ERROR] 数量不匹配: items={len(items)}, embeddings={emb.shape[0]}")
        sys.exit(1)

    # 3. 初始化 ChromaDB
    print(f"\n[Init] 初始化 ChromaDB...")
    import chromadb
    from chromadb.config import Settings

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False, allow_reset=False),
    )

    # 4. 删除旧 collection（幂等）
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"  已删除旧 collection: {COLLECTION_NAME}")
    except Exception:
        print(f"  旧 collection 不存在，跳过删除")

    # 5. 创建新 collection
    col = client.create_collection(COLLECTION_NAME, embedding_function=None)
    print(f"  已创建新 collection: {COLLECTION_NAME}")

    # 6. 分批写入
    print(f"\n[Write] 分批写入 {len(items)} 条（batch={BATCH_SIZE}）...")
    t0 = time.time()
    total = len(items)
    for i in range(0, total, BATCH_SIZE):
        batch_end = min(i + BATCH_SIZE, total)
        batch_ids = [f"p{idx:06d}" for idx in range(i, batch_end)]
        batch_embeddings = emb[i:batch_end].tolist()
        batch_documents = [items[idx].get('text', '')[:2000] for idx in range(i, batch_end)]
        batch_metadatas = []
        for idx in range(i, batch_end):
            it = items[idx]
            batch_metadatas.append({
                'book': it.get('book', '')[:200],
                'chapter': it.get('chapter', '')[:200],
                'system_type': it.get('system_type', 'bazi'),
                'source': it.get('source', '')[:300],
                'passage_id': it.get('passage_id', f"p{idx:06d}"),
            })

        col.add(
            ids=batch_ids,
            embeddings=batch_embeddings,
            documents=batch_documents,
            metadatas=batch_metadatas,
        )

        if (i // BATCH_SIZE) % 10 == 0 or batch_end == total:
            elapsed = time.time() - t0
            speed = batch_end / max(elapsed, 0.1)
            print(f"  [{batch_end}/{total}] {speed:.0f} items/s, elapsed={elapsed:.1f}s")

    elapsed = time.time() - t0
    print(f"\n[DONE] 写入完成，耗时 {elapsed:.1f}s")

    # 7. 验证
    count = col.count()
    print(f"\n[Verify] collection count = {count}")
    if count != total:
        print(f"[WARNING] 数量不匹配: expected={total}, actual={count}")

    # 8. 抽样查询验证
    print(f"\n[Sample Query] 抽样查询验证...")
    sample_qvec = emb[0].tolist()
    res = col.query(query_embeddings=[sample_qvec], n_results=3)
    print(f"  查询 passage_id={items[0].get('passage_id', 'p000000')}")
    print(f"  Top 3 结果:")
    for i, (rid, doc, meta, dist) in enumerate(zip(
        res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]
    )):
        print(f"    [{i+1}] id={rid}, book={meta.get('book', '')[:30]}, dist={dist:.4f}")
        print(f"        text={doc[:80]}...")

    print(f"\n=== 写入成功 ===")
    print(f"  ChromaDB 路径: {CHROMA_DIR}")
    print(f"  Collection: {COLLECTION_NAME}")
    print(f"  总条数: {count}")


if __name__ == "__main__":
    main()
