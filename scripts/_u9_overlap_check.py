#!/usr/bin/env python3
"""U9: 评估 589 库与当前 587 本的重叠度"""
import sqlite3
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "knowledge" / "knowledge_base" / "metaphysics.db"
ASSETS_BOOKS = ROOT / "knowledge" / "processed" / "assets_books.jsonl"
OUTPUT = ROOT / "knowledge" / "processed" / "_g4_overlap_report.json"

# 1. 从 metaphysics.db 导出 589 本的 sha256 列表
print(f"[1] 读取 {DB_PATH} ...")
conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# 查看表结构
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print(f"  tables: {tables}")

cur.execute("PRAGMA table_info(books)")
cols = [(r[1], r[2]) for r in cur.fetchall()]
print(f"  books columns: {cols}")

cur.execute("SELECT COUNT(*) FROM books")
db_count = cur.fetchone()[0]
print(f"  books count: {db_count}")

# 查找 sha256 列名
sha_col = None
for name, _ in cols:
    if 'sha' in name.lower() or 'hash' in name.lower():
        sha_col = name
        break
if not sha_col:
    # 尝试常见的列名
    for candidate in ['sha256', 'sha', 'hash', 'source_sha256', 'source_id']:
        if candidate in [n for n, _ in cols]:
            sha_col = candidate
            break

if sha_col:
    print(f"  sha column: {sha_col}")
    cur.execute(f"SELECT {sha_col}, title FROM books")
    db_rows = cur.fetchall()
    db_shas = {r[0] for r in db_rows if r[0]}
    print(f"  db sha256 count: {len(db_shas)}")
else:
    print(f"  [WARN] 未找到 sha256 列，尝试所有列")
    cur.execute("SELECT * FROM books LIMIT 3")
    sample = cur.fetchall()
    print(f"  sample rows: {sample}")
    db_shas = set()

conn.close()

# 2. 从 assets_books.jsonl 导出当前 587 本的 sha256 列表
print(f"\n[2] 读取 {ASSETS_BOOKS} ...")
assets_shas = set()
assets_books = []
if ASSETS_BOOKS.exists():
    with open(ASSETS_BOOKS, encoding="utf-8") as f:
        for line in f:
            it = json.loads(line)
            assets_books.append(it)
            sha = it.get("sha256") or it.get("sha") or it.get("source_sha256")
            if sha:
                assets_shas.add(sha)
    print(f"  assets books count: {len(assets_books)}")
    print(f"  assets sha256 count: {len(assets_shas)}")
else:
    print(f"  [WARN] {ASSETS_BOOKS} 不存在")

# 3. 计算交集
overlap = db_shas & assets_shas
db_only = db_shas - assets_shas
assets_only = assets_shas - db_shas

print(f"\n[3] 重叠分析:")
print(f"  db sha256: {len(db_shas)}")
print(f"  assets sha256: {len(assets_shas)}")
print(f"  重叠(交集): {len(overlap)}")
print(f"  db独有: {len(db_only)}")
print(f"  assets独有: {len(assets_only)}")

# 4. 输出报告
report = {
    "db_count": db_count,
    "db_sha256_count": len(db_shas),
    "assets_books_count": len(assets_books),
    "assets_sha256_count": len(assets_shas),
    "overlap_count": len(overlap),
    "db_only_count": len(db_only),
    "assets_only_count": len(assets_only),
    "sha_col_used": sha_col,
}

OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[4] 报告已写入: {OUTPUT}")
print(json.dumps(report, ensure_ascii=False, indent=2))
