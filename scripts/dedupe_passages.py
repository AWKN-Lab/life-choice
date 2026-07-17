#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Passages 去重脚本（A-S1 / A-S2）

输入:
  knowledge/processed/classics_index.jsonl

输出:
  knowledge/processed/classics_index.dedup.jsonl   去重后的索引
  knowledge/processed/_dedup_report.json           去重报告

去重策略（与 build_asset_ledger.py L165-185 保持一致）:
  - 按 text.strip() 的 SHA256 分组
  - 每组首遇保留（passage_id 字典序最小）
  - 其余视为重复

幂等: 相同输入重跑结果相同
"""
import json
import hashlib
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
OUT_FILE = ROOT / "knowledge" / "processed" / "classics_index.dedup.jsonl"
REPORT_FILE = ROOT / "knowledge" / "processed" / "_dedup_report.json"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    if not INDEX_FILE.exists():
        print(f"[ERROR] 索引文件不存在: {INDEX_FILE}", file=sys.stderr)
        sys.exit(1)

    print(f"[Dedup] Passages 去重")
    print(f"  输入: {INDEX_FILE}")
    print(f"  输出: {OUT_FILE}")

    # 1) 第一遍扫描: 按 text SHA256 分组
    print(f"\n[Phase 1] 扫描 + 分组 ...")
    by_hash = defaultdict(list)  # h -> [(idx_in_file, passage_id)]
    total = 0
    empty_text = 0
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                print(f"  [WARN] 第 {idx} 行 JSON 解析失败, 跳过", file=sys.stderr)
                continue
            total += 1
            text = (item.get("text") or "").strip()
            if not text:
                empty_text += 1
                continue
            h = sha256_text(text)
            by_hash[h].append((idx, item.get("passage_id", "")))

    print(f"  扫描完成: total={total}, empty_text={empty_text}, unique_hash={len(by_hash)}")

    # 2) 计算保留集合: 每组首遇（passage_id 字典序最小，回退到 idx_in_file）
    print(f"\n[Phase 2] 计算保留集合 ...")
    keep_passage_ids = set()
    dup_groups = 0
    dup_passages = 0
    per_group_sizes = []
    for h, occurrences in by_hash.items():
        if len(occurrences) > 1:
            # 首遇保留: passage_id 字典序最小
            occurrences_sorted = sorted(occurrences, key=lambda x: (x[1], x[0]))
            keep_passage_ids.add(occurrences_sorted[0][1])
            dup_groups += 1
            dup_passages += len(occurrences) - 1
            per_group_sizes.append(len(occurrences))
        else:
            keep_passage_ids.add(occurrences[0][1])

    kept = len(keep_passage_ids)
    removed = total - kept - empty_text  # 排除空文本
    print(f"  保留: {kept}")
    print(f"  重复组: {dup_groups}")
    print(f"  重复 passages（移除）: {dup_passages}")
    print(f"  空文本（跳过）: {empty_text}")
    print(f"  预期去重后总数: {kept}")

    # 3) 第二遍扫描: 写出保留的 passages（保持原顺序）
    print(f"\n[Phase 3] 写出去重后的索引 ...")
    written = 0
    skipped_empty = 0
    skipped_dup = 0
    with open(INDEX_FILE, "r", encoding="utf-8") as fin, \
         open(OUT_FILE, "w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = (item.get("text") or "").strip()
            if not text:
                skipped_empty += 1
                continue
            pid = item.get("passage_id", "")
            if pid in keep_passage_ids:
                fout.write(json.dumps(item, ensure_ascii=False) + "\n")
                written += 1
                # 移除已写入的，防止意外重复（理论上不会发生）
                keep_passage_ids.discard(pid)
            else:
                skipped_dup += 1

    print(f"  写入: {written}")
    print(f"  跳过（重复）: {skipped_dup}")
    print(f"  跳过（空文本）: {skipped_empty}")

    # 4) 生成报告
    print(f"\n[Phase 4] 生成去重报告 ...")
    per_group_dist = {}
    for size in per_group_sizes:
        per_group_dist[str(size)] = per_group_dist.get(str(size), 0) + 1

    report = {
        "input_file": str(INDEX_FILE.relative_to(ROOT)).replace("\\", "/"),
        "output_file": str(OUT_FILE.relative_to(ROOT)).replace("\\", "/"),
        "total_input": total,
        "empty_text": empty_text,
        "unique_hash": len(by_hash),
        "kept": written,
        "removed_duplicates": skipped_dup,
        "dup_groups": dup_groups,
        "dup_passages_total": dup_passages,
        "dup_rate_pct": round(dup_passages / total * 100, 4) if total else 0,
        "per_group_size_distribution": per_group_dist,
        "strategy": "keep_first_by_passage_id_asc",
    }
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  报告: {REPORT_FILE}")

    # 5) 二次验证: 重新扫描输出文件，确认无重复
    print(f"\n[Phase 5] 二次验证输出文件无重复 ...")
    verify_hash = defaultdict(int)
    verify_total = 0
    with open(OUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            verify_total += 1
            text = (item.get("text") or "").strip()
            if text:
                verify_hash[sha256_text(text)] += 1

    verify_dup = sum(1 for c in verify_hash.values() if c > 1)
    if verify_dup == 0:
        print(f"  ✅ PASS: 输出文件无重复, total={verify_total}")
    else:
        print(f"  ❌ FAIL: 输出文件仍有 {verify_dup} 个重复组", file=sys.stderr)
        sys.exit(2)

    print(f"\n[DONE] 去重完成")
    print(f"  输入: {total}")
    print(f"  输出: {written}")
    print(f"  移除: {skipped_dup} (重复率 {report['dup_rate_pct']}%)")


if __name__ == "__main__":
    main()
