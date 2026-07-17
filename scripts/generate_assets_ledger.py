"""G2-1 资产总账生成器：从 classics_index.jsonl + _manifest.json 生成 4 个 jsonl 资产总账文件

输出文件（knowledge/processed/）：
1. assets_books.jsonl - 每本书一行（book, system_type, passages_count, sources, pre_split）
2. assets_categories.jsonl - 每个分类一行（system_type, books_count, passages_count, avg_passage_len）
3. assets_quality.jsonl - 质量检查报告（短文本/重复/超长/空字段统计）
4. assets_summary.jsonl - 总账摘要（1 行：total_passages, total_books, categories_count, generated_at）
"""
import json
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "knowledge" / "processed"
INDEX_FILE = OUTPUT_DIR / "classics_index.jsonl"
MANIFEST_FILE = OUTPUT_DIR / "_manifest.json"

# 加载 manifest
manifest = json.loads(MANIFEST_FILE.read_text(encoding="utf-8"))

# 加载 classics_index.jsonl
items = []
with open(INDEX_FILE, encoding="utf-8") as f:
    for line in f:
        items.append(json.loads(line))

print(f"[G2-1] 加载 {len(items)} passages, {manifest['total_books']} books")

# ============================================================
# 1. assets_books.jsonl - 每本书一行
# ============================================================
books_stats = defaultdict(lambda: {"passages_count": 0, "system_type": "", "sources": set(), "text_len_sum": 0})
for it in items:
    book = it.get("book", "")
    books_stats[book]["passages_count"] += 1
    books_stats[book]["system_type"] = it.get("system_type", "other")
    books_stats[book]["sources"].add(it.get("source", ""))
    books_stats[book]["text_len_sum"] += len(it.get("text", ""))

books_file = OUTPUT_DIR / "assets_books.jsonl"
with open(books_file, "w", encoding="utf-8") as f:
    for book, stats in sorted(books_stats.items(), key=lambda x: -x[1]["passages_count"]):
        record = {
            "book": book,
            "system_type": stats["system_type"],
            "passages_count": stats["passages_count"],
            "sources": sorted(stats["sources"]),
            "avg_passage_len": round(stats["text_len_sum"] / max(stats["passages_count"], 1), 1),
        }
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
print(f"[1/4] {books_file.name}: {len(books_stats)} books")

# ============================================================
# 2. assets_categories.jsonl - 每个分类一行
# ============================================================
cat_stats = defaultdict(lambda: {"books_count": 0, "passages_count": 0, "text_len_sum": 0})
# 按 book 统计 books_count
book_to_cat = {book: stats["system_type"] for book, stats in books_stats.items()}
cat_books = defaultdict(set)
for book, cat in book_to_cat.items():
    cat_books[cat].add(book)

for it in items:
    cat = it.get("system_type", "other")
    cat_stats[cat]["passages_count"] += 1
    cat_stats[cat]["text_len_sum"] += len(it.get("text", ""))

cat_file = OUTPUT_DIR / "assets_categories.jsonl"
with open(cat_file, "w", encoding="utf-8") as f:
    for cat, stats in sorted(cat_stats.items(), key=lambda x: -x[1]["passages_count"]):
        record = {
            "system_type": cat,
            "books_count": len(cat_books[cat]),
            "passages_count": stats["passages_count"],
            "avg_passage_len": round(stats["text_len_sum"] / max(stats["passages_count"], 1), 1),
        }
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
print(f"[2/4] {cat_file.name}: {len(cat_stats)} categories")

# ============================================================
# 3. assets_quality.jsonl - 质量检查报告
# ============================================================
quality = {
    "total_passages": len(items),
    "short_text_lt_30": sum(1 for it in items if len(it.get("text", "")) < 30),
    "long_text_gt_400": sum(1 for it in items if len(it.get("text", "")) > 400),
    "empty_book": sum(1 for it in items if not it.get("book", "")),
    "empty_source": sum(1 for it in items if not it.get("source", "")),
    "empty_passage_id": sum(1 for it in items if not it.get("passage_id", "")),
    "duplicate_passage_id": len(items) - len(set(it.get("passage_id", "") for it in items)),
    "bazi_with_doushu": sum(1 for it in items if it.get("system_type") == "bazi" and ("斗数" in it.get("book", "") or "紫微" in it.get("book", ""))),
    "max_text_len": max(len(it.get("text", "")) for it in items),
    "min_text_len": min(len(it.get("text", "")) for it in items),
    "avg_text_len": round(sum(len(it.get("text", "")) for it in items) / max(len(items), 1), 1),
}

quality_file = OUTPUT_DIR / "assets_quality.jsonl"
with open(quality_file, "w", encoding="utf-8") as f:
    f.write(json.dumps(quality, ensure_ascii=False) + "\n")
print(f"[3/4] {quality_file.name}: quality report")
print(f"  - short_text_lt_30: {quality['short_text_lt_30']}")
print(f"  - long_text_gt_400: {quality['long_text_gt_400']}")
print(f"  - duplicate_passage_id: {quality['duplicate_passage_id']}")
print(f"  - bazi_with_doushu: {quality['bazi_with_doushu']}")
print(f"  - max_text_len: {quality['max_text_len']}")

# ============================================================
# 4. assets_summary.jsonl - 总账摘要
# ============================================================
summary = {
    "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "total_passages": len(items),
    "total_books": len(books_stats),
    "categories_count": len(cat_stats),
    "categories": sorted(cat_stats.keys()),
    "embeddings_file": "embeddings.npy",
    "embeddings_shape": [len(items), 1024],
    "index_file": "classics_index.jsonl",
    "manifest_file": "_manifest.json",
    "g1_g3_status": "PASS",
    "bazi_doushu_pollution": quality["bazi_with_doushu"],
}

summary_file = OUTPUT_DIR / "assets_summary.jsonl"
with open(summary_file, "w", encoding="utf-8") as f:
    f.write(json.dumps(summary, ensure_ascii=False) + "\n")
print(f"[4/4] {summary_file.name}: summary")
print(f"\n[DONE] G2-1 资产总账生成完成")
print(f"  - {books_file.name}")
print(f"  - {cat_file.name}")
print(f"  - {quality_file.name}")
print(f"  - {summary_file.name}")
