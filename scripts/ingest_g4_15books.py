#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""L6 S2: 从 metaphysics.db 抽取 15 本独立书籍的 passages,输出 jsonl

数据源: knowledge/knowledge_base/metaphysics.db
输出: knowledge/processed/_g4_15books_import.jsonl
进度: knowledge/processed/_g4_15books_progress.txt

用法:
  python scripts/ingest_g4_15books.py --dry-run          # 只输出计划
  python scripts/ingest_g4_15books.py --book-id 547      # 单本测试
  python scripts/ingest_g4_15books.py --batch            # 批量执行
"""
import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

DB_PATH = ROOT / "knowledge" / "knowledge_base" / "metaphysics.db"
QUALITY_REPORT = ROOT / "knowledge" / "processed" / "_g4_quality_report.json"
OUTPUT = ROOT / "knowledge" / "processed" / "_g4_15books_import.jsonl"
PROGRESS = ROOT / "knowledge" / "processed" / "_g4_15books_progress.txt"
FAILURES = ROOT / "knowledge" / "processed" / "_g4_15books_failures.jsonl"

# 短文本过滤阈值(S1 抽样发现大量 < 30 字的标题/来源行)
MIN_PASSAGE_LEN = 30

# 导入分类函数
from _extract_recovered import detect_system_type_from_text


def load_15books():
    """从质量报告加载 15 本清单"""
    report = json.loads(QUALITY_REPORT.read_text(encoding="utf-8"))
    return [b for b in report["books"] if b["recommendation"] in ("import", "partial")]


def load_progress():
    """加载已处理的 book_id"""
    if not PROGRESS.exists():
        return set()
    return set(int(line.strip()) for line in PROGRESS.read_text(encoding="utf-8").splitlines() if line.strip())


def append_progress(book_id: int):
    with open(PROGRESS, "a", encoding="utf-8") as f:
        f.write(f"{book_id}\n")


def append_failure(book_id: int, title: str, reason: str):
    with open(FAILURES, "a", encoding="utf-8") as f:
        f.write(json.dumps({"book_id": book_id, "title": title, "reason": reason}, ensure_ascii=False) + "\n")


def process_book(conn, book_info, dry_run=False):
    """处理单本书,返回 passages 列表"""
    book_id = book_info["book_id"]
    title = book_info["title"]
    sha_short = book_info["sha"]
    expected_passages = book_info["passage_count"]

    cur = conn.cursor()
    cur.execute("SELECT content FROM passages WHERE book_id = ?", (book_id,))
    rows = cur.fetchall()

    if not rows:
        print(f"  [FAIL] book_id={book_id} {title}: 无 passages")
        if not dry_run:
            append_failure(book_id, title, "无 passages")
        return []

    # 过滤短文本 + 空内容
    valid_passages = []
    skipped_short = 0
    for (content,) in rows:
        text = (content or "").strip()
        if len(text) < MIN_PASSAGE_LEN:
            skipped_short += 1
            continue
        valid_passages.append(text)

    print(f"  [OK] book_id={book_id} {title[:30]}: 原 {len(rows)} 条 → 过滤后 {len(valid_passages)} 条 (跳过 {skipped_short} 条短文本)")

    if dry_run:
        return [{"dry_run": True, "book_id": book_id, "title": title, "passages": len(valid_passages)}]

    # 分类:取前 5000 字判断
    sample_text = " ".join(valid_passages[:50])[:5000]
    system_type = detect_system_type_from_text(sample_text)
    print(f"    分类: {system_type}")

    # 生成 passage_id 和输出
    passages_out = []
    for i, text in enumerate(valid_passages):
        passage_id = f"{sha_short}::p{i:05d}"
        passages_out.append({
            "passage_id": passage_id,
            "book": title,
            "chapter": "",
            "system_type": system_type,
            "text": text[:2000],  # 截断到 2000 字,与现有索引一致
            "source": f"metaphysics.db::book_{book_id}",
        })

    return passages_out


def main():
    parser = argparse.ArgumentParser(description="L6 S2: 抽取 15 本 passages")
    parser.add_argument("--dry-run", action="store_true", help="只输出计划")
    parser.add_argument("--book-id", type=int, help="单本测试")
    parser.add_argument("--batch", action="store_true", help="批量执行")
    args = parser.parse_args()

    books = load_15books()
    print(f"加载 15 本清单: {len(books)} 本")

    if args.book_id:
        books = [b for b in books if b["book_id"] == args.book_id]
        if not books:
            print(f"未找到 book_id={args.book_id}")
            return 1
        print(f"单本测试: book_id={args.book_id}")

    if not args.batch and not args.book_id and not args.dry_run:
        print("请指定 --dry-run / --book-id / --batch")
        return 1

    progress = load_progress()
    print(f"已处理: {len(progress)} 本")

    conn = sqlite3.connect(str(DB_PATH))

    if args.dry_run:
        print("\n[Dry Run] 计划:")
        total_passages = 0
        for book in books:
            passages = process_book(conn, book, dry_run=True)
            if passages:
                total_passages += passages[0]["passages"]
        print(f"\n预计总 passages: {total_passages}")
        conn.close()
        return 0

    total_out = 0
    success_count = 0
    fail_count = 0

    with open(OUTPUT, "a", encoding="utf-8") as out_f:
        for book in books:
            if book["book_id"] in progress:
                print(f"  [SKIP] book_id={book['book_id']} {book['title'][:30]}: 已处理")
                continue

            try:
                passages = process_book(conn, book)
                if passages:
                    for p in passages:
                        out_f.write(json.dumps(p, ensure_ascii=False) + "\n")
                    total_out += len(passages)
                    success_count += 1
                    append_progress(book["book_id"])
                else:
                    fail_count += 1
            except Exception as e:
                print(f"  [ERROR] book_id={book['book_id']} {book['title'][:30]}: {e}")
                append_failure(book["book_id"], book["title"], str(e))
                fail_count += 1

            out_f.flush()

    conn.close()

    print(f"\n[完成] 成功 {success_count} 本, 失败 {fail_count} 本, 总 passages {total_out}")
    print(f"输出: {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
