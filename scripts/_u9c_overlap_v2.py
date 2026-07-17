#!/usr/bin/env python3
"""U9 v2: 用 source_sha 与 _recovered_import_progress.txt 比对"""
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "knowledge" / "knowledge_base" / "metaphysics.db"
PROGRESS_FILE = ROOT / "knowledge" / "processed" / "_recovered_import_progress.txt"
OUTPUT = ROOT / "knowledge" / "processed" / "_g4_overlap_report.json"

# 1. metaphysics.db 的 source_sha
print("[1] 读取 metaphysics.db source_sha ...")
conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()
cur.execute("SELECT id, title, source_sha, source_type FROM books")
db_rows = cur.fetchall()
conn.close()
db_shas = {r[2]: r for r in db_rows if r[2]}
print(f"  db books: {len(db_rows)}, 有 source_sha: {len(db_shas)}")

# 2. _recovered_import_progress.txt 的已处理 sha
print(f"\n[2] 读取 {PROGRESS_FILE} ...")
imported_shas = set()
if PROGRESS_FILE.exists():
    with open(PROGRESS_FILE, encoding="utf-8") as f:
        for line in f:
            sha = line.strip()
            if sha:
                imported_shas.add(sha)
    print(f"  已导入 sha: {len(imported_shas)}")
else:
    print(f"  [WARN] 文件不存在")

# 3. 比对
overlap_shas = set(db_shas.keys()) & imported_shas
db_only_shas = set(db_shas.keys()) - imported_shas

print(f"\n[3] 重叠分析:")
print(f"  db source_sha: {len(db_shas)}")
print(f"  已导入 sha: {len(imported_shas)}")
print(f"  重叠(已导入): {len(overlap_shas)}")
print(f"  db独有(未导入): {len(db_only_shas)}")

# 4. 也用 title 比对（从 classics_index.jsonl）
print(f"\n[4] 从 classics_index.jsonl 提取 book 名称 ...")
index_books = set()
with open(ROOT / "knowledge" / "processed" / "classics_index.jsonl", encoding="utf-8") as f:
    for line in f:
        it = json.loads(line)
        book = it.get("book", "")
        if book:
            index_books.add(book)
print(f"  classics_index books: {len(index_books)}")

# metaphysics.db 中正常 title（非 sha-xxx 格式）与 classics_index book 比对
db_titles = {}
for r in db_rows:
    title = r[1] or ""
    if title and not title.startswith("sha-"):
        db_titles[title] = r
print(f"  db 正常 title: {len(db_titles)}")
title_overlap = set(db_titles.keys()) & index_books
print(f"  title 重叠: {len(title_overlap)}")

# 5. 输出报告
report = {
    "db_count": len(db_rows),
    "db_sha_count": len(db_shas),
    "imported_sha_count": len(imported_shas),
    "sha_overlap_count": len(overlap_shas),
    "sha_db_only_count": len(db_only_shas),
    "index_books_count": len(index_books),
    "db_normal_title_count": len(db_titles),
    "title_overlap_count": len(title_overlap),
    "conclusion": "sha_overlap + title_overlap = 已在索引中的数量",
    "db_only_sample": [
        {"title": db_shas[s][1][:30], "sha": s[:16]} for s in list(db_only_shas)[:5]
    ],
}

OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[5] 报告已写入: {OUTPUT}")
print(json.dumps(report, ensure_ascii=False, indent=2))
