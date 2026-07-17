#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L8-d: v3 (BGE-small-zh-v1.5) vs v2 (TF-IDF) 检索效果对比评估

复用 eval_tfidf_g6_0.py 的 12 个查询 + 关键词相关性判定
直接加载 embeddings_v3.npy,绕过 main.py(避免重启服务)

判定规则:
- precision@10 >= 0.917 (v2 基线) → v3 持平或优于 v2
- precision@10 >= 0.7 但 < 0.917 → v3 可用但弱于 v2
- precision@10 < 0.7 → v3 不可用
"""
import json
import os
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
V3_EMB_FILE = ROOT / "knowledge" / "processed" / "embeddings_v3.npy"
V2_RESULT_FILE = ROOT / "knowledge" / "processed" / "g6_0_evaluation.jsonl"
OUTPUT_FILE = ROOT / "knowledge" / "processed" / "l8_v3_evaluation.jsonl"

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

# 12 个查询(与 eval_tfidf_g6_0.py 完全一致)
QUERIES = [
    {"question": "日主身弱如何取用神", "systemType": "bazi", "keywords": ["身弱", "用神", "日主"]},
    {"question": "财官印绶格局分析", "systemType": "bazi", "keywords": ["财", "官", "印", "格局"]},
    {"question": "紫微斗数十四主星性格", "systemType": "ziwei", "keywords": ["紫微", "主星", "十四"]},
    {"question": "紫微斗数命宫身宫", "systemType": "ziwei", "keywords": ["命宫", "身宫", "紫微"]},
    {"question": "大六壬贼克法取三传", "systemType": "liuren", "keywords": ["贼克", "三传", "六壬"]},
    {"question": "六壬天将贵人", "systemType": "liuren", "keywords": ["天将", "贵人", "六壬"]},
    {"question": "奇门遁甲九宫八卦", "systemType": "qimen", "keywords": ["九宫", "八卦", "奇门"]},
    {"question": "奇门遁甲八门吉凶", "systemType": "qimen", "keywords": ["八门", "吉凶", "奇门"]},
    {"question": "周易卦象爻辞解读", "systemType": "zhouyi", "keywords": ["卦", "爻", "周易"]},
    {"question": "六爻断卦用神原神忌神", "systemType": "liuyao", "keywords": ["用神", "原神", "忌神", "六爻"]},
    {"question": "风水峦头理气", "systemType": "fengshui", "keywords": ["峦头", "理气", "风水"]},
    {"question": "相术面部五官", "systemType": "xiangshu", "keywords": ["面", "五官", "相"]},
]


def is_relevant(text, keywords):
    """相关性判定:至少 1 个关键词在 text 中出现(与 eval_tfidf_g6_0.py 一致)"""
    text_lower = text.lower()
    for kw in keywords:
        if kw in text_lower:
            return True
    return False


def load_index():
    print(f"[Load] 读取 {INDEX_FILE.name} ...")
    items = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            items.append(json.loads(line))
    print(f"  共 {len(items)} passages")
    return items


def load_v2_baseline():
    """加载 v2 (TF-IDF) 评估结果作为对比基线"""
    if not V2_RESULT_FILE.exists():
        print(f"  [WARN] v2 基线结果不存在: {V2_RESULT_FILE}")
        return {}
    baseline = {}
    with open(V2_RESULT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r.get("type") == "summary":
                baseline["_summary"] = r
            else:
                baseline[r["question"]] = r
    return baseline


def main():
    print("=" * 60)
    print("L8-d: v3 (BGE-small-zh-v1.5) vs v2 (TF-IDF) 对比评估")
    print("=" * 60)

    if not V3_EMB_FILE.exists():
        print(f"[ERROR] 缺少 {V3_EMB_FILE},请先运行 embed_classics_v3.py")
        sys.exit(1)

    items = load_index()
    n = len(items)

    print(f"\n[Load] 读取 {V3_EMB_FILE.name} ...")
    t0 = time.time()
    # v3 是 np.memmap 写入(无 .npy header),用 np.memmap 加载
    # 从 _embed_meta_v3.json 读取 dim(默认 512 BGE-small-zh)
    meta_file = ROOT / "knowledge" / "processed" / "_embed_meta_v3.json"
    dim = 512  # 默认 BGE-small-zh
    if meta_file.exists():
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        dim = meta.get("dim", 512)
        print(f"  [Meta] dim={dim}, model={meta.get('model','')}")
    embeddings_v3 = np.memmap(V3_EMB_FILE, dtype=np.float32, mode='r', shape=(n, dim))
    print(f"  shape={embeddings_v3.shape}, 加载耗时 {time.time()-t0:.2f}s")
    if embeddings_v3.shape[0] != n:
        print(f"[ERROR] v3 shape[0]={embeddings_v3.shape[0]} != items count {n}")
        sys.exit(1)

    # 加载 v2 基线
    v2_baseline = load_v2_baseline()
    if v2_baseline:
        s = v2_baseline.get("_summary", {})
        print(f"\n[V2 Baseline] avg_precision@10={s.get('avg_precision_at_10')}, "
              f"avg_mrr={s.get('avg_mrr')}, pass={s.get('pass_count')}/{s.get('total_queries')}")

    # 加载 BGE 模型编码查询
    print(f"\n[Model] 加载 BGE-small-zh-v1.5 ...")
    t0 = time.time()
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("BAAI/bge-small-zh-v1.5")
    print(f"  [OK] ({time.time()-t0:.2f}s), dim={model.get_sentence_embedding_dimension()}")

    # 编码 12 个查询
    print(f"\n[Encode] 编码 {len(QUERIES)} 个查询 ...")
    query_texts = [q["question"] for q in QUERIES]
    query_vecs = model.encode(
        query_texts,
        batch_size=len(query_texts),
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)
    print(f"  query_vecs shape={query_vecs.shape}")

    # 评估每个查询
    print(f"\n[Eval] 评估 {len(QUERIES)} 个查询,每个取 Top-10\n")
    results = []
    for i, q in enumerate(QUERIES, 1):
        qv = query_vecs[i-1]  # (512,)
        # 计算与所有 passage 的相似度(点积,因为已归一化)
        sims = embeddings_v3 @ qv  # (n,)
        # 取 Top-10
        top_k = 10
        top_indices = np.argpartition(-sims, top_k)[:top_k]
        top_indices = top_indices[np.argsort(-sims[top_indices])]

        relevant_count = 0
        mrr = 0.0
        top_items = []
        for rank, idx in enumerate(top_indices):
            text = items[idx].get("text", "")
            rel = is_relevant(text, q["keywords"])
            if rel:
                relevant_count += 1
                if mrr == 0.0:
                    mrr = 1.0 / (rank + 1)
            top_items.append({
                "rank": rank + 1,
                "passage_id": items[idx].get("passage_id", ""),
                "book": items[idx].get("book", ""),
                "score": float(sims[idx]),
                "relevant": rel,
                "text_preview": text[:80],
            })

        precision_at_k = relevant_count / top_k
        v2_p = v2_baseline.get(q["question"], {}).get("precision_at_k", None)
        v2_mrr = v2_baseline.get(q["question"], {}).get("mrr", None)

        r = {
            "question": q["question"],
            "systemType": q["systemType"],
            "precision_at_k": round(precision_at_k, 3),
            "mrr": round(mrr, 3),
            "relevant_count": relevant_count,
            "total": top_k,
            "v2_precision_at_k": v2_p,
            "v2_mrr": v2_mrr,
            "delta_precision": round(precision_at_k - v2_p, 3) if v2_p is not None else None,
            "delta_mrr": round(mrr - v2_mrr, 3) if v2_mrr is not None else None,
        }
        results.append(r)

        print(f"[{i}/{len(QUERIES)}] {q['systemType']:10s} | {q['question']}")
        print(f"  v3: p@10={r['precision_at_k']} ({relevant_count}/{top_k}), MRR={r['mrr']}")
        if v2_p is not None:
            delta = r["delta_precision"]
            mark = "↑" if delta > 0 else ("↓" if delta < 0 else "=")
            print(f"  v2: p@10={v2_p}, MRR={v2_mrr}  | delta_p@10={delta:+.3f} {mark}")
        # 显示 Top-3 结果
        for it in top_items[:3]:
            mark = "✓" if it["relevant"] else "✗"
            print(f"    {mark} #{it['rank']} score={it['score']:.4f} "
                  f"book={it['book'][:20]} | {it['text_preview']}")
        print()

    # 汇总
    avg_p_v3 = sum(r["precision_at_k"] for r in results) / len(results)
    avg_mrr_v3 = sum(r["mrr"] for r in results) / len(results)
    pass_count_v3 = sum(1 for r in results if r["precision_at_k"] >= 0.6)

    v2_summary = v2_baseline.get("_summary", {})
    avg_p_v2 = v2_summary.get("avg_precision_at_10", 0)
    avg_mrr_v2 = v2_summary.get("avg_mrr", 0)
    pass_count_v2 = v2_summary.get("pass_count", 0)

    print("=" * 60)
    print("汇总对比")
    print("=" * 60)
    print(f"  {'指标':<20} {'v2(TF-IDF)':<15} {'v3(BGE-small)':<15} {'delta':<10}")
    print(f"  {'avg_precision@10':<20} {avg_p_v2:<15.3f} {avg_p_v3:<15.3f} {avg_p_v3-avg_p_v2:+.3f}")
    print(f"  {'avg_mrr':<20} {avg_mrr_v2:<15.3f} {avg_mrr_v3:<15.3f} {avg_mrr_v3-avg_mrr_v2:+.3f}")
    print(f"  {'pass_count(>=0.6)':<20} {pass_count_v2}/12{'':<9} {pass_count_v3}/12")

    # 判定
    print(f"\n{'='*60}")
    print("判定")
    print(f"{'='*60}")
    if avg_p_v3 >= avg_p_v2:
        verdict = "V3_SUPERIOR"
        print(f"  [V3_SUPERIOR] v3 avg_p@10={avg_p_v3:.3f} >= v2 {avg_p_v2:.3f}")
        print(f"  建议: v3 可作为下一版生产 embedding 候选")
    elif avg_p_v3 >= 0.7:
        verdict = "V3_USABLE"
        print(f"  [V3_USABLE] v3 avg_p@10={avg_p_v3:.3f} < v2 {avg_p_v2:.3f} 但 >= 0.7")
        print(f"  建议: v3 可用但弱于 v2,需进一步分析(可能维度从1024降到512影响)")
    else:
        verdict = "V3_INFERIOR"
        print(f"  [V3_INFERIOR] v3 avg_p@10={avg_p_v3:.3f} < 0.7,明显弱于 v2")
        print(f"  建议: 放弃 v3,保留 v2,等服务器扩容后试 bge-large-zh-v1.5(1024维)")

    # 输出详细结果
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
        summary = {
            "type": "summary",
            "v3_avg_precision_at_10": round(avg_p_v3, 3),
            "v3_avg_mrr": round(avg_mrr_v3, 3),
            "v3_pass_count": pass_count_v3,
            "v2_avg_precision_at_10": avg_p_v2,
            "v2_avg_mrr": avg_mrr_v2,
            "v2_pass_count": pass_count_v2,
            "delta_precision": round(avg_p_v3 - avg_p_v2, 3),
            "delta_mrr": round(avg_mrr_v3 - avg_mrr_v2, 3),
            "verdict": verdict,
            "v3_model": "bge-small-zh-v1.5",
            "v3_dim": 512,
            "v2_model": "tfidf-char-bigram-v1",
            "v2_dim": 1024,
        }
        f.write(json.dumps(summary, ensure_ascii=False) + "\n")
    print(f"\n[输出] {OUTPUT_FILE}")

    print(f"\n{'='*60}")
    print(f"L8-d 评估结论: {verdict}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
