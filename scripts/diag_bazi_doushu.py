"""诊断：bazi 分类中含'斗数/紫微'书名的 passages 详情"""
import json
from collections import Counter

INDEX_FILE = "knowledge/processed/classics_index.jsonl"

bazi_doushu_books = Counter()
bazi_doushu_passages = []

with open(INDEX_FILE, encoding="utf-8") as f:
    for line in f:
        it = json.loads(line)
        if it.get("system_type") == "bazi":
            book = it.get("book", "")
            if "斗数" in book or "紫微" in book:
                bazi_doushu_books[book] += 1
                if len(bazi_doushu_passages) < 3:
                    bazi_doushu_passages.append(it)

print(f"bazi 分类中含'斗数/紫微'的书名统计:")
for book, count in bazi_doushu_books.most_common():
    print(f"  {book}: {count} passages")

print(f"\n总计: {sum(bazi_doushu_books.values())} passages / {len(bazi_doushu_books)} 本书")

print(f"\n样例 passages:")
for p in bazi_doushu_passages:
    print(f"  passage_id={p.get('passage_id', '')[:60]}")
    print(f"  book={p.get('book', '')}")
    print(f"  source={p.get('source', '')}")
    print(f"  text={p.get('text', '')[:100]}")
    print()

# 同时统计 ziwei 分类的书
print(f"\n--- ziwei 分类的书名 ---")
ziwei_books = Counter()
with open(INDEX_FILE, encoding="utf-8") as f:
    for line in f:
        it = json.loads(line)
        if it.get("system_type") == "ziwei":
            ziwei_books[it.get("book", "")] += 1
print(f"ziwei 分类共 {len(ziwei_books)} 本书, {sum(ziwei_books.values())} passages")
for book, count in ziwei_books.most_common(10):
    print(f"  {book}: {count} passages")
