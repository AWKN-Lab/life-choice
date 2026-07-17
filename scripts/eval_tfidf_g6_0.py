"""G6-0 TF-IDF 效果评估

评估方案：
- 准备 12 个查询（覆盖主要分类：bazi/ziwei/liuren/qimen/zhouyi/liuyao/fengshui/xiangshu）
- 对每个查询，用 embed_search 获取 Top-10 结果
- 相关性判定：查询中的核心关键词在结果 text 中出现 → 相关
- 计算 precision@10（Top-10 中相关结果比例）
- 计算 MRR（第一个相关结果的倒数排名）

判定规则：
- precision@10 >= 0.6 → PASS（TF-IDF 可用，不需要 G6 升级）
- precision@10 < 0.6 → FAIL（需要 G6 升级方案）
"""
import sys
import os
import json
import time

os.chdir(os.path.join(os.path.dirname(__file__), "..", "apps", "AWKN-LABlife", "services", "knowledge-service"))
sys.path.insert(0, ".")

os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["HF_HUB_OFFLINE"] = "1"

print("=" * 60)
print("G6-0 TF-IDF 效果评估")
print("=" * 60)

t0 = time.time()
import main
print(f"[import] main 加载完成 ({time.time()-t0:.2f}s)")

# ============================================================
# 评估查询集（12 个查询，覆盖主要分类）
# 每个查询包含：question, systemType, keywords（用于相关性判断）
# ============================================================
queries = [
    # bazi
    {"question": "日主身弱如何取用神", "systemType": "bazi", "keywords": ["身弱", "用神", "日主"]},
    {"question": "财官印绶格局分析", "systemType": "bazi", "keywords": ["财", "官", "印", "格局"]},
    # ziwei
    {"question": "紫微斗数十四主星性格", "systemType": "ziwei", "keywords": ["紫微", "主星", "十四"]},
    {"question": "紫微斗数命宫身宫", "systemType": "ziwei", "keywords": ["命宫", "身宫", "紫微"]},
    # liuren
    {"question": "大六壬贼克法取三传", "systemType": "liuren", "keywords": ["贼克", "三传", "六壬"]},
    {"question": "六壬天将贵人", "systemType": "liuren", "keywords": ["天将", "贵人", "六壬"]},
    # qimen
    {"question": "奇门遁甲九宫八卦", "systemType": "qimen", "keywords": ["九宫", "八卦", "奇门"]},
    {"question": "奇门遁甲八门吉凶", "systemType": "qimen", "keywords": ["八门", "吉凶", "奇门"]},
    # zhouyi
    {"question": "周易卦象爻辞解读", "systemType": "zhouyi", "keywords": ["卦", "爻", "周易"]},
    # liuyao
    {"question": "六爻断卦用神原神忌神", "systemType": "liuyao", "keywords": ["用神", "原神", "忌神", "六爻"]},
    # fengshui
    {"question": "风水峦头理气", "systemType": "fengshui", "keywords": ["峦头", "理气", "风水"]},
    # xiangshu
    {"question": "相术面部五官", "systemType": "xiangshu", "keywords": ["面", "五官", "相"]},
]

# ============================================================
# 评估函数
# ============================================================
def is_relevant(text, keywords):
    """相关性判定：至少 1 个关键词在 text 中出现"""
    text_lower = text.lower()
    for kw in keywords:
        if kw in text_lower:
            return True
    return False

def evaluate_query(query, top_k=10):
    """评估单个查询，返回 precision@k, mrr, top_results"""
    req = main.EmbedSearchRequest(
        question=query["question"],
        systemType=query["systemType"],
        limit=top_k
    )
    resp = main.embed_search(req)
    items = resp.items

    if not items:
        return {"precision_at_k": 0.0, "mrr": 0.0, "relevant_count": 0, "total": 0}

    relevant_count = 0
    mrr = 0.0
    for i, it in enumerate(items):
        if is_relevant(it.text, query["keywords"]):
            relevant_count += 1
            if mrr == 0.0:
                mrr = 1.0 / (i + 1)

    precision_at_k = relevant_count / len(items)
    return {
        "precision_at_k": round(precision_at_k, 3),
        "mrr": round(mrr, 3),
        "relevant_count": relevant_count,
        "total": len(items),
    }

# ============================================================
# 运行评估
# ============================================================
print(f"\n[评估] {len(queries)} 个查询，每个取 Top-10\n")

results = []
for i, q in enumerate(queries, 1):
    print(f"[{i}/{len(queries)}] {q['systemType']:10s} | {q['question']}")
    r = evaluate_query(q)
    r["question"] = q["question"]
    r["systemType"] = q["systemType"]
    results.append(r)
    print(f"  precision@10={r['precision_at_k']} ({r['relevant_count']}/{r['total']}), MRR={r['mrr']}")

# ============================================================
# 汇总统计
# ============================================================
avg_precision = sum(r["precision_at_k"] for r in results) / len(results)
avg_mrr = sum(r["mrr"] for r in results) / len(results)
pass_count = sum(1 for r in results if r["precision_at_k"] >= 0.6)

print(f"\n{'='*60}")
print(f"汇总统计")
print(f"{'='*60}")
print(f"  平均 precision@10: {avg_precision:.3f}")
print(f"  平均 MRR:          {avg_mrr:.3f}")
print(f"  通过查询数 (p@10>=0.6): {pass_count}/{len(results)}")
print(f"  通过率:            {pass_count/len(results)*100:.1f}%")

# ============================================================
# 判定
# ============================================================
print(f"\n{'='*60}")
print(f"判定")
print(f"{'='*60}")
threshold = 0.6
if avg_precision >= threshold:
    print(f"  [PASS] 平均 precision@10={avg_precision:.3f} >= {threshold}")
    print(f"  TF-IDF 检索效果可用，不需要 G6 升级方案")
    verdict = "PASS"
else:
    print(f"  [FAIL] 平均 precision@10={avg_precision:.3f} < {threshold}")
    print(f"  TF-IDF 检索效果不达标，需要 G6 升级方案")
    verdict = "FAIL"

# ============================================================
# 输出详细结果到 jsonl
# ============================================================
output_file = os.path.join(os.path.dirname(__file__), "..", "knowledge", "processed", "g6_0_evaluation.jsonl")
with open(output_file, "w", encoding="utf-8") as f:
    for r in results:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
    # 汇总行
    summary = {
        "type": "summary",
        "avg_precision_at_10": round(avg_precision, 3),
        "avg_mrr": round(avg_mrr, 3),
        "pass_count": pass_count,
        "total_queries": len(results),
        "pass_rate": round(pass_count / len(results), 3),
        "threshold": threshold,
        "verdict": verdict,
    }
    f.write(json.dumps(summary, ensure_ascii=False) + "\n")
print(f"\n[输出] 详细结果: {output_file}")

print(f"\n{'='*60}")
print(f"G6-0 评估结论: {verdict}")
print(f"{'='*60}")
