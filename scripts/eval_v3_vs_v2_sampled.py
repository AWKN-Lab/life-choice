#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L8-c+d 一体化: 分层采样 + v3(BGE) vs v2(TF-IDF) 对比评估

策略:
1. 加载全量 classics_index.jsonl (357359 条)
2. 加载 v2 embeddings.npy (1024维 TF-IDF, mmap) + idf_cache.pkl
3. 按 system_type 分层采样,每分类 N 条(默认 2000)
4. 用 BGE-small-zh-v1.5 编码采样的 passages → v3 (在内存中)
5. 用 TfidfCharBigramEmbedder 编码 12 个查询 → v2 query
6. 用 BGE 编码 12 个查询 → v3 query
7. 在采样的 v2 和 v3 上分别检索 Top-10,对比 precision@10 和 MRR

优势:
- 30 分钟完成(全量需 5+ 小时)
- 分层采样保证分类覆盖
- v2 和 v3 在相同样本上对比,公平
"""
import json
import os
import sys
import time
import pickle
from pathlib import Path
from collections import defaultdict

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
V2_EMB_FILE = ROOT / "knowledge" / "processed" / "embeddings.npy"
IDF_CACHE_FILE = ROOT / "knowledge" / "processed" / "idf_cache.pkl"
V2_BASELINE_FILE = ROOT / "knowledge" / "processed" / "g6_0_evaluation.jsonl"
OUTPUT_FILE = ROOT / "knowledge" / "processed" / "l8_v3_sampled_evaluation.jsonl"

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

# 采样配置
PER_SYSTEM_SAMPLE = int(os.getenv("PER_SYSTEM_SAMPLE", "2000"))
BATCH_SIZE = 64

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
    """相关性判定:至少 1 个关键词在 text 中出现"""
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


def stratified_sample(items, per_system=PER_SYSTEM_SAMPLE):
    """按 system_type 分层采样"""
    by_system = defaultdict(list)
    for idx, it in enumerate(items):
        by_system[it.get("system_type", "other")].append(idx)

    sampled_indices = []
    print(f"\n[Sample] 分层采样,每分类最多 {per_system} 条:")
    for sys_type, indices in sorted(by_system.items()):
        n_take = min(per_system, len(indices))
        # 均匀采样(每隔 len/n_take 取一个)
        if n_take < len(indices):
            step = len(indices) / n_take
            sampled = [indices[int(i * step)] for i in range(n_take)]
        else:
            sampled = indices
        sampled_indices.extend(sampled)
        print(f"  {sys_type}: {len(indices)} → {len(sampled)}")
    sampled_indices.sort()
    print(f"  总采样: {len(sampled_indices)}")
    return sampled_indices


def load_v2_baseline():
    if not V2_BASELINE_FILE.exists():
        return {}
    baseline = {}
    with open(V2_BASELINE_FILE, "r", encoding="utf-8") as f:
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
    print(f"L8-c+d: 分层采样 v3(BGE) vs v2(TF-IDF) 对比评估")
    print(f"  每分类采样: {PER_SYSTEM_SAMPLE} 条")
    print("=" * 60)

    items = load_index()
    n = len(items)

    # 分层采样
    sampled_indices = stratified_sample(items)
    n_sampled = len(sampled_indices)

    # 加载 v2 embeddings (mmap,只读取采样的行)
    print(f"\n[Load v2] 读取 {V2_EMB_FILE.name} (mmap) ...")
    t0 = time.time()
    v2_all = np.load(V2_EMB_FILE, mmap_mode="r")
    print(f"  v2 shape={v2_all.shape}, 加载耗时 {time.time()-t0:.2f}s")
    v2_dim = v2_all.shape[1]
    # 提取采样的 v2 向量到内存(26000 * 1024 * 4 = 100MB,可接受)
    v2_sampled = np.array([v2_all[i] for i in sampled_indices], dtype=np.float32)
    print(f"  v2_sampled shape={v2_sampled.shape}")

    # 加载 v2 TF-IDF embedder (用于编码查询)
    print(f"\n[Load v2 TF-IDF] 加载 idf_cache.pkl ...")
    sys.path.insert(0, str(ROOT / "scripts"))
    from embed_classics import TfidfCharBigramEmbedder
    tfidf = TfidfCharBigramEmbedder(dim=v2_dim)
    if not tfidf.load_idf(str(IDF_CACHE_FILE)):
        print(f"[ERROR] IDF 缓存加载失败")
        sys.exit(1)

    # 加载 BGE 模型
    print(f"\n[Load v3] 加载 BGE-small-zh-v1.5 ...")
    t0 = time.time()
    from sentence_transformers import SentenceTransformer
    bge = SentenceTransformer("BAAI/bge-small-zh-v1.5")
    v3_dim = bge.get_sentence_embedding_dimension()
    print(f"  [OK] ({time.time()-t0:.2f}s), dim={v3_dim}, device={bge.device}")

    # 编码采样的 passages (v3)
    print(f"\n[Encode v3] 编码 {n_sampled} 条采样 passages ...")
    t0 = time.time()
    sampled_texts = [items[i].get("text", "")[:512] for i in sampled_indices]
    v3_sampled = bge.encode(
        sampled_texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)
    elapsed = time.time() - t0
    print(f"  v3_sampled shape={v3_sampled.shape}, 耗时 {elapsed:.1f}s "
          f"({n_sampled/elapsed:.1f} passages/s)")

    # 编码 12 个查询
    print(f"\n[Encode queries] 编码 {len(QUERIES)} 个查询 ...")
    query_texts = [q["question"] for q in QUERIES]
    # v2 query (TF-IDF)
    v2_query_vecs = np.array([tfidf.encode_one(q) for q in query_texts], dtype=np.float32)
    print(f"  v2_query_vecs shape={v2_query_vecs.shape}")
    # v3 query (BGE)
    v3_query_vecs = bge.encode(
        query_texts,
        batch_size=len(query_texts),
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)
    print(f"  v3_query_vecs shape={v3_query_vecs.shape}")

    # v2 基线(全量评估结果)
    v2_baseline = load_v2_baseline()
    if v2_baseline:
        s = v2_baseline.get("_summary", {})
        print(f"\n[V2 Baseline 全量] avg_p@10={s.get('avg_precision_at_10')}, "
              f"avg_mrr={s.get('avg_mrr')}, pass={s.get('pass_count')}/{s.get('total_queries')}")

    # 评估
    print(f"\n[Eval] 在 {n_sampled} 条采样上评估 v2 和 v3\n")
    results = []
    for i, q in enumerate(QUERIES, 1):
        q_text = q["question"]
        q_sys = q["systemType"]

        # v2 检索(在采样上)
        v2_qv = v2_query_vecs[i-1]  # (1024,)
        v2_sims = v2_sampled @ v2_qv  # (n_sampled,)
        v2_top_idx = np.argpartition(-v2_sims, 10)[:10]
        v2_top_idx = v2_top_idx[np.argsort(-v2_sims[v2_top_idx])]

        # v3 检索(在采样上)
        v3_qv = v3_query_vecs[i-1]  # (512,)
        v3_sims = v3_sampled @ v3_qv  # (n_sampled,)
        v3_top_idx = np.argpartition(-v3_sims, 10)[:10]
        v3_top_idx = v3_top_idx[np.argsort(-v3_sims[v3_top_idx])]

        # 计算 v2 precision@10 和 MRR (在采样上)
        v2_rel = 0
        v2_mrr = 0.0
        for rank, sample_idx in enumerate(v2_top_idx):
            orig_idx = sampled_indices[sample_idx]
            text = items[orig_idx].get("text", "")
            if is_relevant(text, q["keywords"]):
                v2_rel += 1
                if v2_mrr == 0.0:
                    v2_mrr = 1.0 / (rank + 1)
        v2_p = v2_rel / 10

        # 计算 v3 precision@10 和 MRR (在采样上)
        v3_rel = 0
        v3_mrr = 0.0
        for rank, sample_idx in enumerate(v3_top_idx):
            orig_idx = sampled_indices[sample_idx]
            text = items[orig_idx].get("text", "")
            if is_relevant(text, q["keywords"]):
                v3_rel += 1
                if v3_mrr == 0.0:
                    v3_mrr = 1.0 / (rank + 1)
        v3_p = v3_rel / 10

        # v2 全量基线
        v2_full = v2_baseline.get(q_text, {})
        v2_full_p = v2_full.get("precision_at_k", None)
        v2_full_mrr = v2_full.get("mrr", None)

        r = {
            "question": q_text,
            "systemType": q_sys,
            "v2_sampled_p@10": round(v2_p, 3),
            "v2_sampled_mrr": round(v2_mrr, 3),
            "v3_sampled_p@10": round(v3_p, 3),
            "v3_sampled_mrr": round(v3_mrr, 3),
            "v2_full_p@10": v2_full_p,
            "v2_full_mrr": v2_full_mrr,
            "delta_p@10": round(v3_p - v2_p, 3),
            "delta_mrr": round(v3_mrr - v2_mrr, 3),
        }
        results.append(r)

        print(f"[{i}/{len(QUERIES)}] {q_sys:10s} | {q_text}")
        print(f"  v2(采样): p@10={v2_p:.3f} ({v2_rel}/10), MRR={v2_mrr:.3f}")
        print(f"  v3(采样): p@10={v3_p:.3f} ({v3_rel}/10), MRR={v3_mrr:.3f}")
        print(f"  v2(全量): p@10={v2_full_p}, MRR={v2_full_mrr}")
        print(f"  delta(v3-v2采样): p@10={r['delta_p@10']:+.3f}, MRR={r['delta_mrr']:+.3f}")
        # 显示 v3 Top-3
        for rank, sample_idx in enumerate(v3_top_idx[:3]):
            orig_idx = sampled_indices[sample_idx]
            text = items[orig_idx].get("text", "")
            rel = is_relevant(text, q["keywords"])
            mark = "✓" if rel else "✗"
            print(f"    {mark} #{rank+1} score={v3_sims[sample_idx]:.4f} "
                  f"book={items[orig_idx].get('book','')[:20]} | {text[:60]}")
        print()

    # 汇总
    v2_avg_p = sum(r["v2_sampled_p@10"] for r in results) / len(results)
    v3_avg_p = sum(r["v3_sampled_p@10"] for r in results) / len(results)
    v2_avg_mrr = sum(r["v2_sampled_mrr"] for r in results) / len(results)
    v3_avg_mrr = sum(r["v3_sampled_mrr"] for r in results) / len(results)
    v2_pass = sum(1 for r in results if r["v2_sampled_p@10"] >= 0.6)
    v3_pass = sum(1 for r in results if r["v3_sampled_p@10"] >= 0.6)

    v2_full_summary = v2_baseline.get("_summary", {})
    v2_full_avg_p = v2_full_summary.get("avg_precision_at_10", 0)

    print("=" * 60)
    print("汇总对比 (相同采样样本)")
    print("=" * 60)
    print(f"  {'指标':<20} {'v2(采样)':<15} {'v3(采样)':<15} {'v2(全量)':<15} {'delta(v3-v2采样)':<15}")
    print(f"  {'avg_p@10':<20} {v2_avg_p:<15.3f} {v3_avg_p:<15.3f} {v2_full_avg_p:<15.3f} {v3_avg_p-v2_avg_p:+.3f}")
    print(f"  {'avg_mrr':<20} {v2_avg_mrr:<15.3f} {v3_avg_mrr:<15.3f} {'':15} {v3_avg_mrr-v2_avg_mrr:+.3f}")
    print(f"  {'pass_count(>=0.6)':<20} {v2_pass}/12{'':<11} {v3_pass}/12")

    # 判定
    print(f"\n{'='*60}")
    print("判定")
    print(f"{'='*60}")
    if v3_avg_p > v2_avg_p + 0.05:
        verdict = "V3_SUPERIOR"
        print(f"  [V3_SUPERIOR] v3 avg_p@10={v3_avg_p:.3f} 显著优于 v2(采样) {v2_avg_p:.3f} (delta=+{v3_avg_p-v2_avg_p:.3f})")
        print(f"  建议: v3 可作为下一版生产 embedding 候选,待服务器扩容后全量编码 bge-large-zh-v1.5(1024维)")
    elif v3_avg_p >= v2_avg_p - 0.05:
        verdict = "V3_PARITY"
        print(f"  [V3_PARITY] v3 avg_p@10={v3_avg_p:.3f} 与 v2(采样) {v2_avg_p:.3f} 持平 (delta={v3_avg_p-v2_avg_p:+.3f})")
        print(f"  建议: v3 与 v2 效果相当,可考虑用 v3 替代(语义模型更通用),但收益不明显")
    else:
        verdict = "V3_INFERIOR"
        print(f"  [V3_INFERIOR] v3 avg_p@10={v3_avg_p:.3f} 弱于 v2(采样) {v2_avg_p:.3f} (delta={v3_avg_p-v2_avg_p:.3f})")
        print(f"  建议: 放弃 v3-small(512维),保留 v2,等服务器扩容后试 bge-large-zh-v1.5(1024维)")

    # 输出
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
        summary = {
            "type": "summary",
            "sample_size": n_sampled,
            "per_system_sample": PER_SYSTEM_SAMPLE,
            "v2_sampled_avg_p@10": round(v2_avg_p, 3),
            "v3_sampled_avg_p@10": round(v3_avg_p, 3),
            "v2_sampled_avg_mrr": round(v2_avg_mrr, 3),
            "v3_sampled_avg_mrr": round(v3_avg_mrr, 3),
            "v2_full_avg_p@10": v2_full_avg_p,
            "v2_sampled_pass": v2_pass,
            "v3_sampled_pass": v3_pass,
            "delta_p@10": round(v3_avg_p - v2_avg_p, 3),
            "delta_mrr": round(v3_avg_mrr - v2_avg_mrr, 3),
            "verdict": verdict,
            "v3_model": "bge-small-zh-v1.5",
            "v3_dim": v3_dim,
            "v2_model": "tfidf-char-bigram-v1",
            "v2_dim": v2_dim,
        }
        f.write(json.dumps(summary, ensure_ascii=False) + "\n")
    print(f"\n[输出] {OUTPUT_FILE}")

    print(f"\n{'='*60}")
    print(f"L8-c+d 评估结论: {verdict}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
