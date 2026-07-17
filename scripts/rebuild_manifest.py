#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重建 _manifest.json（A-S3 / B-S3 复用）

输入:
  knowledge/processed/classics_index.jsonl

输出:
  knowledge/processed/_manifest.json

Schema 保持与当前生产一致:
  {
    "count": <int>,
    "books": <int>,
    "categories": {<system_type>: <int>},
    "generated_at": "<YYYY-MM-DD HH:MM:SS>",
    "source": "<描述>",
    "version": "<版本>"
  }
"""
import json
import sys
from pathlib import Path
from collections import Counter
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
MANIFEST_FILE = ROOT / "knowledge" / "processed" / "_manifest.json"


def main():
    if not INDEX_FILE.exists():
        print(f"[ERROR] 索引文件不存在: {INDEX_FILE}", file=sys.stderr)
        sys.exit(1)

    # 命令行参数: 版本 + source 描述
    version = sys.argv[1] if len(sys.argv) > 1 else "v1.2-dedup"
    source_desc = sys.argv[2] if len(sys.argv) > 2 else "classics_index.jsonl (deduped)"

    print(f"[Manifest] 重建 _manifest.json")
    print(f"  输入: {INDEX_FILE}")
    print(f"  版本: {version}")
    print(f"  来源: {source_desc}")

    total = 0
    books = set()
    cat_counter = Counter()
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            total += 1
            book = item.get("book", "")
            if book:
                books.add(book)
            cat = item.get("system_type", "other")
            cat_counter[cat] += 1

    manifest = {
        "count": total,
        "books": len(books),
        "categories": dict(cat_counter),
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "source": source_desc,
        "version": version,
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[DONE]")
    print(f"  count: {total}")
    print(f"  books: {len(books)}")
    print(f"  categories: {dict(cat_counter)}")
    print(f"  输出: {MANIFEST_FILE}")


if __name__ == "__main__":
    main()
