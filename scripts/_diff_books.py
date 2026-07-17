#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P0-2 计数复核：diff classics_index.jsonl.book vs knowledge-asset-ledger.jsonl.title

输出：
  - 集合 A 大小（classics_index book 字段去重）
  - 集合 B 大小（ledger title 字段去重）
  - B - A 差集（在 ledger 中有但 classics_index 中无的 book title）
  - A - B 差集（反向，应为空）
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
LEDGER_FILE = ROOT / "knowledge" / "asset-ledger" / "knowledge-asset-ledger.jsonl"
OUT_FILE = ROOT / "docs" / "05审核与质量" / "取证" / "_diff_books_result.json"


def load_index_books():
    """从 classics_index.jsonl 提取所有 book 字段值，去重返回 set"""
    books = set()
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            book = item.get("book", "")
            if book:
                books.add(book)
    return books


def load_ledger_titles():
    """从 knowledge-asset-ledger.jsonl 提取所有 title 字段值，去重返回 set"""
    titles = set()
    with open(LEDGER_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            title = item.get("title", "")
            if title:
                titles.add(title)
    return titles


def load_ledger_records():
    """加载 ledger 全部记录用于交叉查询"""
    records = []
    with open(LEDGER_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


def main():
    if not INDEX_FILE.exists():
        print(f"[ERROR] 索引文件不存在: {INDEX_FILE}", file=sys.stderr)
        sys.exit(1)
    if not LEDGER_FILE.exists():
        print(f"[ERROR] 资产账本不存在: {LEDGER_FILE}", file=sys.stderr)
        sys.exit(1)

    set_a = load_index_books()
    set_b = load_ledger_titles()
    ledger_records = load_ledger_records()

    # B - A: 在 ledger 中有但 classics_index 中无
    diff_b_minus_a = set_b - set_a
    # A - B: 反向（应为空，若有则说明 classics_index 有但 ledger 无登记）
    diff_a_minus_b = set_a - set_b

    # 为每个 B-A 差集项找到对应的 ledger 记录
    diff_details = []
    for title in sorted(diff_b_minus_a):
        for rec in ledger_records:
            if rec.get("title") == title:
                diff_details.append({
                    "title": title,
                    "source": rec.get("source", ""),
                    "reachability": rec.get("reachability", ""),
                    "currentStatus": rec.get("currentStatus", ""),
                    "systemType": rec.get("systemType", ""),
                    "passagesCount": rec.get("passagesCount", 0),
                })
                break

    result = {
        "set_a_size": len(set_a),
        "set_b_size": len(set_b),
        "b_minus_a_count": len(diff_b_minus_a),
        "a_minus_b_count": len(diff_a_minus_b),
        "b_minus_a_titles": sorted(list(diff_b_minus_a)),
        "a_minus_b_titles": sorted(list(diff_a_minus_b)),
        "b_minus_a_details": diff_details,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[DONE] diff 结果已写入: {OUT_FILE}")
    print(f"  集合 A (classics_index.jsonl book 字段去重): {len(set_a)}")
    print(f"  集合 B (ledger title 字段去重): {len(set_b)}")
    print(f"  B - A 差集: {len(diff_b_minus_a)}")
    print(f"  A - B 反向差集（应为空）: {len(diff_a_minus_b)}")
    print()
    print("=== B - A 差集明细 ===")
    for d in diff_details:
        print(f"  - {d['title']}")
        print(f"    source: {d['source']}")
        print(f"    reachability: {d['reachability']}, currentStatus: {d['currentStatus']}")


if __name__ == "__main__":
    main()
