#!/usr/bin/env python3
"""检查 assets_books.jsonl 和 metaphysics.db 的字段，找比对方式"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 1. assets_books.jsonl 字段
print("=== assets_books.jsonl ===")
with open(ROOT / "knowledge" / "processed" / "assets_books.jsonl", encoding="utf-8") as f:
    first = json.loads(f.readline())
    print(f"fields: {list(first.keys())}")
    print(f"sample: {json.dumps(first, ensure_ascii=False)[:500]}")

# 统计各字段非空数
counts = {}
with open(ROOT / "knowledge" / "processed" / "assets_books.jsonl", encoding="utf-8") as f:
    for line in f:
        it = json.loads(line)
        for k in first.keys():
            if k not in counts:
                counts[k] = 0
            v = it.get(k)
            if v and str(v).strip():
                counts[k] += 1
print(f"\n非空统计: {counts}")

# 2. metaphysics.db books 表样本
print("\n=== metaphysics.db books ===")
conn = sqlite3.connect(str(ROOT / "knowledge" / "knowledge_base" / "metaphysics.db"))
cur = conn.cursor()
cur.execute("SELECT id, title, source_sha, source_type, book_type FROM books LIMIT 5")
for r in cur.fetchall():
    print(f"  id={r[0]}, title={r[1][:40]}, source_sha={r[2][:20] if r[2] else None}..., source_type={r[3]}, book_type={r[4]}")
conn.close()

# 3. classics_index.jsonl 的 source 字段样本
print("\n=== classics_index.jsonl source 字段 ===")
sources = set()
with open(ROOT / "knowledge" / "processed" / "classics_index.jsonl", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if i >= 1000:
            break
        it = json.loads(line)
        src = it.get("source", "")
        if src:
            sources.add(src.split("/")[0] if "/" in src else src[:30])
print(f"  前1000条 source 前缀样本: {list(sources)[:10]}")
