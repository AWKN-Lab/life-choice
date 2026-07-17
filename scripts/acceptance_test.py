"""端到端验收脚本（步骤 9）

验证：
1. ChromaDB 表行数
2. knowledge-service /health-v2 状态
3. /embed_search 检索效果（5 个八字 + 5 个六壬测试问题）
4. /hybrid_search 混合检索效果
5. 命中率统计

输出：knowledge/processed/_acceptance_report.json
"""
import sys
import os
import json
import time

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["ANONYMIZED_TELEMETRY"] = "False"

KS_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "apps", "AWKN-LABlife", "services", "knowledge-service"
))
os.chdir(KS_DIR)
sys.path.insert(0, ".")

import main

print("=" * 70)
print("步骤 9：端到端验收")
print("=" * 70)

report = {
    "version": "v1.0",
    "generated_at": "2026-06-18",
    "steps": {},
}

# 1. ChromaDB 行数
print("\n[1] ChromaDB 行数检查 ...")
ok = main._init_chroma()
if not ok:
    print(f"  [FAIL] init_chroma 失败: {main._chroma_init_error}")
    sys.exit(1)
cnt = main._chroma_col.count()
print(f"  count={cnt}")
report["steps"]["chroma_count"] = {"ok": cnt >= 26000, "count": cnt}

# 2. /health-v2
print("\n[2] /health-v2 状态 ...")
health = main.health_v2()
print(f"  v2_initialized={health.get('v2_initialized')}")
print(f"  chroma_count={health.get('chroma_count')}")
print(f"  baziItems={health.get('baziItems')}, liurenItems={health.get('liurenItems')}")
report["steps"]["health_v2"] = {
    "ok": health.get("v2_initialized") and health.get("chroma_count", 0) >= 26000,
    "v2_initialized": health.get("v2_initialized"),
    "chroma_count": health.get("chroma_count"),
    "baziItems": health.get("baziItems"),
    "liurenItems": health.get("liurenItems"),
}

# 3. /embed_search 测试
print("\n[3] /embed_search 检索测试 ...")
test_queries = [
    ("bazi", "日主身弱如何取用神", "身弱"),
    ("bazi", "甲木生于午月用神", "甲木"),
    ("bazi", "财旺身弱如何发财", "财"),
    ("bazi", "七杀无制如何化解", "杀"),
    ("bazi", "伤官见官祸百出", "伤官"),
    ("liuren", "贼克法如何取三传", "贼克"),
    ("liuren", "毕法赋核心法则", "毕法"),
    ("liuren", "九宗门起课方法", "九宗"),
    ("liuren", "天将腾蛇主何事", "腾蛇"),
    ("liuren", "课体返吟主吉凶", "返吟"),
]
embed_results = []
hit_count = 0
for sys_type, q, expected_keyword in test_queries:
    t0 = time.time()
    req = main.EmbedSearchRequest(question=q, systemType=sys_type, limit=3)
    resp = main.embed_search(req)
    elapsed = time.time() - t0
    items = resp.items
    # 判定命中：top3 文本是否包含期望关键词（放宽到 top3，更符合实际使用场景）
    all_text = " ".join(it.text for it in items)
    is_hit = expected_keyword in all_text
    if is_hit:
        hit_count += 1
    embed_results.append({
        "query": q,
        "system_type": sys_type,
        "expected_keyword": expected_keyword,
        "items_count": len(items),
        "top1_score": items[0].score if items else 0,
        "top1_title": items[0].title if items else "",
        "top1_text_preview": items[0].text[:100] if items else "",
        "hit": is_hit,
        "elapsed_ms": round(elapsed * 1000),
    })
    status = "✓" if is_hit else "✗"
    print(f"  {status} [{sys_type}] {q} -> {len(items)} items, top1_score={items[0].score if items else 0:.3f}, {items[0].title if items else 'N/A'}")

hit_rate = hit_count / len(test_queries)
print(f"\n  命中率: {hit_count}/{len(test_queries)} = {hit_rate:.1%}")
report["steps"]["embed_search"] = {
    "ok": hit_rate >= 0.8,
    "hit_count": hit_count,
    "total": len(test_queries),
    "hit_rate": round(hit_rate, 3),
    "results": embed_results,
}

# 4. /hybrid_search 测试
print("\n[4] /hybrid_search 混合检索测试 ...")
hybrid_queries = [
    ("ziping", "日主身弱"),
    ("ziping", "甲木午月"),
    ("liuren", "贼克法"),
]
hybrid_results = []
for route_type, q in hybrid_queries:
    t0 = time.time()
    req = main.HybridSearchRequest(routeType=route_type, question=q, limit=5)
    resp = main.hybrid_search(req)
    elapsed = time.time() - t0
    items = resp.items
    hybrid_results.append({
        "query": q,
        "route_type": route_type,
        "items_count": len(items),
        "top1_score": items[0].score if items else 0,
        "top1_title": items[0].title if items else "",
        "elapsed_ms": round(elapsed * 1000),
    })
    print(f"  [{route_type}] {q} -> {len(items)} items, top1_score={items[0].score if items else 0:.3f}, {items[0].title if items else 'N/A'}")

report["steps"]["hybrid_search"] = {
    "ok": all(r["items_count"] > 0 for r in hybrid_results),
    "results": hybrid_results,
}

# 5. 总结
print("\n" + "=" * 70)
print("验收总结")
print("=" * 70)
all_ok = all(s["ok"] for s in report["steps"].values())
report["overall_ok"] = all_ok
for step_name, step_result in report["steps"].items():
    status = "✓ PASS" if step_result["ok"] else "✗ FAIL"
    print(f"  {step_name}: {status}")
print(f"\n  总体: {'✓ PASS' if all_ok else '✗ FAIL'}")

# 写入报告
report_path = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "knowledge", "processed", "_acceptance_report.json"
))
with open(report_path, "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(f"\n  报告已写入: {report_path}")
