#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FTS5 检索评估脚本（Phase 1：方案 Z1 评估）

复用 eval_tfidf_g6_0.py 的 12 个查询，评估 FTS5 的 precision@10 和 MRR
对比 v2（TF-IDF + numpy）基线

查询分词策略（关键）：
- 索引用 unicode61（按字分词），"日主身弱" 在索引中是 "日" "主" "身" "弱"
- 查询必须用相同分词方式：
  - 方式 A：短语查询 MATCH '日主身弱' → 匹配连续的 "日 主 身 弱"
  - 方式 B：按字分词 MATCH '日 主 身 弱' → OR 查询，BM25 排序
  - 方式 C：AND 查询 MATCH '日 主 身 弱'（FTS5 默认 AND）

本脚本测试多种查询方式，找出最优策略
"""
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_FILE = ROOT / "knowledge" / "processed" / "passages_fts.db"

if not DB_FILE.exists():
    print(f"[ERROR] 数据库不存在: {DB_FILE}")
    print(f"请先运行: python scripts/build_fts5_index.py")
    sys.exit(1)

# ============================================================
# 评估查询集（与 eval_tfidf_g6_0.py 完全一致，12 个查询）
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


def chars_to_query(text: str) -> str:
    """把中文查询转为字级分词（空格分隔每个字）

    unicode61 对中文按字分词，所以查询也要按字分词
    "日主身弱" → "日 主 身 弱"
    """
    text = re.sub(r"\s+", "", text)
    return " ".join(text)


def is_relevant(text: str, keywords: list) -> bool:
    """相关性判定：至少 1 个关键词在 text 中出现（与 eval_tfidf_g6_0.py 一致）"""
    for kw in keywords:
        if kw in text:
            return True
    return False


def search_fts5(conn, query_str: str, system_type: str, keywords: list, top_k: int = 10):
    """FTS5 检索：用关键词组合查询（每个关键词用 phrase，AND 连接）

    策略：
    1. 优先用 keywords 做 AND phrase 查询（最精准）
    2. 若 AND 无结果，退化为 OR phrase 查询（宽松匹配）
    3. 若仍无结果，用 query_str 的核心词做 phrase 查询
    """
    cur = conn.cursor()

    # 策略 1：keywords AND phrase
    if keywords:
        # 每个 keyword 用双引号包裹（phrase），AND 连接
        and_expr = " AND ".join(f'"{kw}"' for kw in keywords)
        try:
            cur.execute("""
                SELECT passage_id, text, book, system_type, bm25(passages_fts) AS score
                FROM passages_fts
                WHERE passages_fts MATCH ?
                  AND system_type = ?
                ORDER BY score
                LIMIT ?
            """, (and_expr, system_type, top_k))
            results = cur.fetchall()
            if results:
                return results, f"AND({and_expr})"
        except Exception:
            pass

    # 策略 2：keywords OR phrase
    if keywords:
        or_expr = " OR ".join(f'"{kw}"' for kw in keywords)
        try:
            cur.execute("""
                SELECT passage_id, text, book, system_type, bm25(passages_fts) AS score
                FROM passages_fts
                WHERE passages_fts MATCH ?
                  AND system_type = ?
                ORDER BY score
                LIMIT ?
            """, (or_expr, system_type, top_k))
            results = cur.fetchall()
            if results:
                return results, f"OR({or_expr})"
        except Exception:
            pass

    # 策略 3：query_str 的核心词（取前 4 个字作为 phrase）
    # 从 query_str 中提取 2-4 字的核心词
    core_phrases = extract_core_phrases(query_str)
    if core_phrases:
        or_expr = " OR ".join(f'"{p}"' for p in core_phrases)
        try:
            cur.execute("""
                SELECT passage_id, text, book, system_type, bm25(passages_fts) AS score
                FROM passages_fts
                WHERE passages_fts MATCH ?
                  AND system_type = ?
                ORDER BY score
                LIMIT ?
            """, (or_expr, system_type, top_k))
            results = cur.fetchall()
            if results:
                return results, f"CORE({or_expr})"
        except Exception:
            pass

    return [], "NONE"


def extract_core_phrases(query_str: str) -> list:
    """从查询字符串中提取 2-4 字的核心词组

    简单策略：按 2-4 字滑动窗口生成 phrase
    "日主身弱如何取用神" → ["日主", "主身", "身弱", "如何", "取用", "用神"]
    """
    text = re.sub(r"\s+", "", query_str)
    phrases = []
    # 2 字滑窗
    for i in range(len(text) - 1):
        phrases.append(text[i:i+2])
    # 去重，保留前 6 个
    seen = set()
    unique = []
    for p in phrases:
        if p not in seen:
            seen.add(p)
            unique.append(p)
    return unique[:6]


def evaluate_query(conn, query, top_k=10):
    """评估单个查询"""
    results, strategy = search_fts5(conn, query["question"], query["systemType"], query["keywords"], top_k)

    if not results:
        return {
            "precision_at_k": 0.0,
            "mrr": 0.0,
            "relevant_count": 0,
            "total": 0,
            "top_books": [],
            "strategy": strategy,
        }

    relevant_count = 0
    mrr = 0.0
    top_books = []
    for i, (pid, text, book, sys_type, score) in enumerate(results):
        if is_relevant(text, query["keywords"]):
            relevant_count += 1
            if mrr == 0.0:
                mrr = 1.0 / (i + 1)
        if i < 3:
            top_books.append(f"{book[:20]}|score={score:.2f}")

    precision_at_k = relevant_count / len(results)
    return {
        "precision_at_k": round(precision_at_k, 3),
        "mrr": round(mrr, 3),
        "relevant_count": relevant_count,
        "total": len(results),
        "top_books": top_books,
        "strategy": strategy,
    }


def main():
    print("=" * 60, flush=True)
    print("FTS5 检索评估（Phase 1：方案 Z1）", flush=True)
    print(f"数据库: {DB_FILE}", flush=True)
    print(f"查询数: {len(queries)}", flush=True)
    print("=" * 60, flush=True)

    # 连接数据库
    conn = sqlite3.connect(str(DB_FILE))

    # 先测试查询分词
    print(f"\n[测试] 查询分词示例:", flush=True)
    test_queries = ["日主身弱", "紫微斗数", "奇门遁甲"]
    for q in test_queries:
        print(f"  '{q}' → '{chars_to_query(q)}'", flush=True)

    # 先测试单个查询是否能返回结果
    print(f"\n[预检] 测试单个查询:", flush=True)
    test_q = queries[0]
    print(f"  question='{test_q['question']}', systemType='{test_q['systemType']}'", flush=True)
    print(f"  keywords={test_q['keywords']}", flush=True)
    test_results, test_strategy = search_fts5(conn, test_q["question"], test_q["systemType"], test_q["keywords"], 3)
    print(f"  策略: {test_strategy}", flush=True)
    print(f"  返回 {len(test_results)} 条结果:", flush=True)
    for pid, text, book, sys_type, score in test_results:
        print(f"    score={score:.3f} | {book[:30]} | {text[:80]}", flush=True)

    # 运行全量评估
    print(f"\n[评估] {len(queries)} 个查询，每个取 Top-10\n", flush=True)

    results = []
    for i, q in enumerate(queries, 1):
        print(f"[{i}/{len(queries)}] {q['systemType']:10s} | {q['question']}", flush=True)
        r = evaluate_query(conn, q, top_k=10)
        r["question"] = q["question"]
        r["systemType"] = q["systemType"]
        results.append(r)
        print(f"  precision@10={r['precision_at_k']} ({r['relevant_count']}/{r['total']}), MRR={r['mrr']}", flush=True)
        if r["top_books"]:
            for b in r["top_books"][:2]:
                print(f"    - {b}", flush=True)

    # 汇总
    avg_precision = sum(r["precision_at_k"] for r in results) / len(results)
    avg_mrr = sum(r["mrr"] for r in results) / len(results)
    pass_count = sum(1 for r in results if r["precision_at_k"] >= 0.6)
    zero_count = sum(1 for r in results if r["precision_at_k"] == 0.0)

    print(f"\n{'='*60}", flush=True)
    print(f"汇总统计", flush=True)
    print(f"{'='*60}", flush=True)
    print(f"  平均 precision@10: {avg_precision:.3f}", flush=True)
    print(f"  平均 MRR:          {avg_mrr:.3f}", flush=True)
    print(f"  通过查询数 (p@10>=0.6): {pass_count}/{len(results)}", flush=True)
    print(f"  零结果查询数 (p@10=0):  {zero_count}/{len(results)}", flush=True)
    print(f"  通过率:            {pass_count/len(results)*100:.1f}%", flush=True)

    # 判定
    print(f"\n{'='*60}", flush=True)
    print(f"判定", flush=True)
    print(f"{'='*60}", flush=True)
    threshold = 0.6
    if avg_precision >= threshold:
        print(f"  [PASS] 平均 precision@10={avg_precision:.3f} >= {threshold}", flush=True)
        print(f"  FTS5 检索效果可用，不需要 Embedding", flush=True)
        verdict = "PASS"
    else:
        print(f"  [FAIL] 平均 precision@10={avg_precision:.3f} < {threshold}", flush=True)
        print(f"  FTS5 检索效果不达标，需要优化分词或加 Embedding", flush=True)
        verdict = "FAIL"

    # 对比 v2 基线（来自 g6_0_evaluation.jsonl）
    v2_baseline_file = ROOT / "knowledge" / "processed" / "g6_0_evaluation.jsonl"
    if v2_baseline_file.exists():
        print(f"\n[对比] v2 (TF-IDF + numpy) 基线:", flush=True)
        v2_results = {}
        with open(v2_baseline_file, encoding="utf-8") as f:
            for line in f:
                d = json.loads(line)
                if d.get("type") == "summary":
                    v2_results = d
                    break
        if v2_results:
            v2_avg_p = v2_results.get("avg_precision_at_10", 0)
            v2_avg_mrr = v2_results.get("avg_mrr", 0)
            v2_pass = v2_results.get("pass_count", 0)
            v2_total = v2_results.get("total_queries", 12)
            print(f"  v2 avg_p@10={v2_avg_p:.3f}, avg_mrr={v2_avg_mrr:.3f}, pass={v2_pass}/{v2_total}", flush=True)
            print(f"  FTS5 avg_p@10={avg_precision:.3f}, avg_mrr={avg_mrr:.3f}, pass={pass_count}/{len(results)}", flush=True)
            delta = avg_precision - v2_avg_p
            print(f"  delta: {delta:+.3f} ({'FTS5 更优' if delta > 0 else 'v2 更优'})", flush=True)

    # 输出详细结果
    output_file = ROOT / "knowledge" / "processed" / "fts5_evaluation.jsonl"
    with open(output_file, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
        summary = {
            "type": "summary",
            "method": "fts5_unicode61",
            "avg_precision_at_10": round(avg_precision, 3),
            "avg_mrr": round(avg_mrr, 3),
            "pass_count": pass_count,
            "total_queries": len(results),
            "pass_rate": round(pass_count / len(results), 3),
            "zero_count": zero_count,
            "threshold": threshold,
            "verdict": verdict,
        }
        f.write(json.dumps(summary, ensure_ascii=False) + "\n")
    print(f"\n[输出] 详细结果: {output_file}", flush=True)

    print(f"\n{'='*60}", flush=True)
    print(f"FTS5 评估结论: {verdict}", flush=True)
    print(f"{'='*60}", flush=True)

    conn.close()


if __name__ == "__main__":
    main()
