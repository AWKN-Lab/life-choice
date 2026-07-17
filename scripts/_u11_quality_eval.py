#!/usr/bin/env python3
"""U11: 评估 45 本独立 passages 质量"""
import json
import sqlite3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "knowledge" / "knowledge_base" / "metaphysics.db"
PROGRESS_FILE = ROOT / "knowledge" / "processed" / "_recovered_import_progress.txt"
OUTPUT = ROOT / "knowledge" / "processed" / "_g4_quality_report.json"

# 1. 获取 45 本独立的 source_sha
print("[1] 识别 45 本独立书籍 ...")
conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()
cur.execute("SELECT id, title, source_sha, source_type, total_paragraphs FROM books")
db_rows = cur.fetchall()

imported_shas = set()
with open(PROGRESS_FILE, encoding="utf-8") as f:
    for line in f:
        sha = line.strip()
        if sha:
            imported_shas.add(sha)

db_only_rows = [r for r in db_rows if r[2] and r[2] not in imported_shas]
print(f"  独立书籍: {len(db_only_rows)}")

# 2. 评估每本书的质量
print(f"\n[2] 评估质量 ...")
results = []
for book_id, title, source_sha, source_type, total_paragraphs in db_only_rows:
    # 从 passages 表获取该书的所有 passages
    cur.execute("SELECT content FROM passages WHERE book_id = ?", (book_id,))
    passages = cur.fetchall()
    passage_count = len(passages)

    if passage_count == 0:
        results.append({
            "book_id": book_id, "title": title[:40], "sha": source_sha[:16],
            "source_type": source_type, "passage_count": 0,
            "avg_len": 0, "chinese_ratio": 0, "quality": "empty", "recommendation": "skip",
        })
        continue

    # 统计
    total_len = 0
    total_chinese = 0
    total_chars = 0
    for (content,) in passages:
        text = content or ""
        total_len += len(text)
        total_chars += len(text)
        # 中文字符数
        chinese = len(re.findall(r'[\u4e00-\u9fff]', text))
        total_chinese += chinese

    avg_len = total_len / passage_count if passage_count > 0 else 0
    chinese_ratio = total_chinese / total_chars if total_chars > 0 else 0

    # 质量判定
    if avg_len < 50:
        quality = "fragment"
        recommendation = "skip"
    elif chinese_ratio < 0.3:
        quality = "garbled"
        recommendation = "skip"
    elif avg_len < 100:
        quality = "short"
        recommendation = "partial"
    else:
        quality = "good"
        recommendation = "import"

    results.append({
        "book_id": book_id, "title": title[:40], "sha": source_sha[:16],
        "source_type": source_type, "passage_count": passage_count,
        "avg_len": round(avg_len, 1), "chinese_ratio": round(chinese_ratio, 2),
        "quality": quality, "recommendation": recommendation,
    })

conn.close()

# 3. 统计
quality_dist = {}
rec_dist = {}
for r in results:
    quality_dist[r["quality"]] = quality_dist.get(r["quality"], 0) + 1
    rec_dist[r["recommendation"]] = rec_dist.get(r["recommendation"], 0) + 1

print(f"\n[3] 质量分布: {quality_dist}")
print(f"  建议分布: {rec_dist}")

# 4. 输出报告
good_count = rec_dist.get("import", 0)
partial_count = rec_dist.get("partial", 0)
skip_count = rec_dist.get("skip", 0)

if good_count + partial_count >= len(results) * 0.6:
    overall_rec = "全量导入"
elif good_count + partial_count >= len(results) * 0.3:
    overall_rec = "部分导入"
else:
    overall_rec = "不导入"

report = {
    "total_independent_books": len(results),
    "quality_distribution": quality_dist,
    "recommendation_distribution": rec_dist,
    "overall_recommendation": overall_rec,
    "books": results,
}

OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n[4] 报告已写入: {OUTPUT}")
print(f"  总体建议: {overall_rec}")
print(f"  good={good_count}, partial={partial_count}, skip={skip_count}")
