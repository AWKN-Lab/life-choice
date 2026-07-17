#!/usr/bin/env python3
"""快速测试 FTS5 不同查询语法"""
import sqlite3
import time
from pathlib import Path

DB_FILE = Path(__file__).resolve().parent.parent / "knowledge" / "processed" / "passages_fts.db"

conn = sqlite3.connect(str(DB_FILE))
cur = conn.cursor()

test_queries = [
    # (描述, SQL MATCH 表达式, system_type)
    ("AND 字级分词", "日 主 身 弱", "bazi"),
    ("OR 字级分词", "日 OR 主 OR 身 OR 弱", "bazi"),
    ("Phrase 短语", "\"日主身弱\"", "bazi"),
    ("Phrase 紫微斗数", "\"紫微斗数\"", "ziwei"),
    ("OR 紫微斗数", "紫 OR 微 OR 斗 OR 数", "ziwei"),
    ("单字 日主", "日主", "bazi"),
    ("前缀 日主*", "日主*", "bazi"),
    ("Phrase 身弱", "\"身弱\"", "bazi"),
    ("Phrase 用神", "\"用神\"", "bazi"),
    ("Phrase 三传", "\"三传\"", "liuren"),
    ("Phrase 贼克", "\"贼克\"", "liuren"),
]

for desc, match_expr, sys_type in test_queries:
    t0 = time.time()
    try:
        cur.execute("""
            SELECT passage_id, book, system_type, bm25(passages_fts) AS score, text
            FROM passages_fts
            WHERE passages_fts MATCH ?
              AND system_type = ?
            ORDER BY score
            LIMIT 3
        """, (match_expr, sys_type))
        results = cur.fetchall()
        elapsed = (time.time() - t0) * 1000
        print(f"\n[{desc}] expr='{match_expr}', sys='{sys_type}', {len(results)}条, {elapsed:.1f}ms")
        for pid, book, st, score, text in results:
            print(f"  score={score:.3f} | {book[:25]} | {text[:80]}")
    except Exception as e:
        print(f"\n[{desc}] expr='{match_expr}' ERROR: {e}")

# 测试不带 system_type 过滤
print("\n\n=== 不带 system_type 过滤 ===")
for desc, match_expr in [
    ("Phrase 日主身弱", "\"日主身弱\""),
    ("Phrase 紫微斗数", "\"紫微斗数\""),
    ("Phrase 奇门遁甲", "\"奇门遁甲\""),
]:
    t0 = time.time()
    cur.execute("""
        SELECT count(*) FROM passages_fts WHERE passages_fts MATCH ?
    """, (match_expr,))
    cnt = cur.fetchone()[0]
    elapsed = (time.time() - t0) * 1000
    print(f"  [{desc}] expr='{match_expr}' → {cnt} 条, {elapsed:.1f}ms")

conn.close()
