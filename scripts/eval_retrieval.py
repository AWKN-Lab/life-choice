#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
G6-0 TF-IDF 检索效果评估

输入：
- knowledge/golden-queries.json — 评估查询集（带期望答案）

输出：
- 控制台评估报告
- knowledge/eval-report.json — 详细评估结果

指标：
- recall@10: 期望的书名是否出现在 top-10 结果中
- precision@10: top-10 结果中相关项的比例

决策阈值：
- recall@10 >= 0.7 且 precision@10 >= 0.6 → TF-IDF 够用，不做 G6
- 否则 → 需要 G6-1/G6-2
"""
import json
import os
import sys

# 切换到 knowledge-service 目录
os.chdir(os.path.join(os.path.dirname(__file__), "..", "apps", "AWKN-LABlife", "services", "knowledge-service"))
sys.path.insert(0, ".")

# 抑制 chroma telemetry
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["HF_HUB_OFFLINE"] = "1"

import main
from fastapi.testclient import TestClient

client = TestClient(main.app)

# 加载 golden-queries
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUERIES_FILE = os.path.join(ROOT, "knowledge", "golden-queries.json")
REPORT_FILE = os.path.join(ROOT, "knowledge", "eval-report.json")

with open(QUERIES_FILE, encoding="utf-8") as f:
    queries = json.load(f)

print(f"[G6-0] TF-IDF 检索效果评估")
print(f"  查询数: {len(queries)}")
print(f"  阈值: recall@10 >= 0.7, precision@10 >= 0.6")
print()

results = []
total_recall = 0
total_precision = 0
pass_count = 0

for i, q in enumerate(queries):
    # 调用 /hybrid_search
    r = client.post("/hybrid_search", json={
        "routeType": q["expected_system"],
        "question": q["query"],
        "limit": 10
    })
    items = r.json().get("items", [])

    # recall@10: 期望的书是否出现在 top-10 中
    returned_titles = [it.get("title", "") for it in items]
    hit_books = 0
    for expected in q["expected_books"]:
        for title in returned_titles:
            if expected in title:
                hit_books += 1
                break
    recall = hit_books / len(q["expected_books"]) if q["expected_books"] else 0

    # precision@10: top-10 中相关项的比例（通过书名关键词匹配）
    relevant = 0
    for it in items:
        title = it.get("title", "")
        for expected in q["expected_books"]:
            if expected in title:
                relevant += 1
                break
    precision = relevant / len(items) if items else 0

    passed = recall >= 0.7 and precision >= 0.6
    if passed:
        pass_count += 1

    total_recall += recall
    total_precision += precision

    status = "PASS" if passed else "FAIL"
    print(f"  [{i+1:2d}/{len(queries)}] {status} {q['query'][:25]:25s} | recall={recall:.2f} precision={precision:.2f} | top3={returned_titles[:3]}")

    results.append({
        "query": q["query"],
        "expected_system": q["expected_system"],
        "expected_books": q["expected_books"],
        "recall@10": round(recall, 3),
        "precision@10": round(precision, 3),
        "passed": passed,
        "returned_titles": returned_titles[:5],
    })

avg_recall = total_recall / len(queries)
avg_precision = total_precision / len(queries)
overall_pass = avg_recall >= 0.7 and avg_precision >= 0.6

print()
print("=" * 70)
print(f"评估结果:")
print(f"  查询数: {len(queries)}")
print(f"  单查询通过: {pass_count}/{len(queries)} ({pass_count/len(queries)*100:.0f}%)")
print(f"  平均 recall@10:    {avg_recall:.3f} (阈值 0.7) → {'PASS' if avg_recall >= 0.7 else 'FAIL'}")
print(f"  平均 precision@10: {avg_precision:.3f} (阈值 0.6) → {'PASS' if avg_precision >= 0.6 else 'FAIL'}")
print(f"  决策: {'TF-IDF 够用，不做 G6' if overall_pass else '需要 G6-1/G6-2'}")
print("=" * 70)

# 保存报告
report = {
    "total_queries": len(queries),
    "pass_count": pass_count,
    "avg_recall@10": round(avg_recall, 3),
    "avg_precision@10": round(avg_precision, 3),
    "threshold": {"recall@10": 0.7, "precision@10": 0.6},
    "overall_pass": overall_pass,
    "decision": "no_g6_needed" if overall_pass else "g6_required",
    "results": results,
}
with open(REPORT_FILE, "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(f"\n报告已保存: {REPORT_FILE}")

sys.exit(0 if overall_pass else 1)
