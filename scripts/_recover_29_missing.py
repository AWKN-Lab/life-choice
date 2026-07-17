#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P0-3 29 本 missing 源文件混合策略处置

修正后策略（基于 Phase B 发现）：
- 10 本真正 missing（_archive 路径，无同名 reachable）→ 复制到 _recovered_from_archive/
- 4 本 _archive 重复登记 → 标 deduplicated-archive
- 15 本 metaphysics.db 重复登记 → 标 deduplicated-db-with-zip-reachable

操作：
1. 复制 10 本 _archive 文件到 knowledge/eastern-metaphysics/_recovered_from_archive/{liuren,liuyao,daoism}/
2. 更新 knowledge/asset-ledger/knowledge-asset-ledger.jsonl 中 29 条记录的 reachability 字段
3. 输出操作摘要
"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEDGER_FILE = ROOT / "knowledge" / "asset-ledger" / "knowledge-asset-ledger.jsonl"
ARCHIVE_PREFIX_LOCAL = ROOT / "_archive" / "data-dumps" / "md_converted"
RECOVERED_DIR = ROOT / "knowledge" / "eastern-metaphysics" / "_recovered_from_archive"


def load_ledger():
    records = []
    with open(LEDGER_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records


def load_reachable_titles(records):
    """返回 ledger 中所有 reachability='reachable' 的 title 集合"""
    return {r.get("title", "") for r in records if r.get("reachability") == "reachable"}


def map_archive_path(source):
    """
    ledger.source: _archive/东方术数/六壬/_processed_md/X.md
    实际本地: _archive/data-dumps/md_converted/东方术数/六壬/_processed_md/X.md
    """
    if source.startswith("_archive/"):
        relative = source[len("_archive/"):]
        return ROOT / "_archive" / "data-dumps" / "md_converted" / relative
    return None


def get_target_subdir(system_type):
    """根据 systemType 返回子目录名"""
    mapping = {
        "liuren": "liuren",
        "liuyao": "liuyao",
        "daoism": "daoism",
        "qimen": "qimen",
        "bazi": "bazi",
    }
    return mapping.get(system_type, "other")


def main():
    if not LEDGER_FILE.exists():
        print(f"[ERROR] ledger 不存在: {LEDGER_FILE}", file=sys.stderr)
        sys.exit(1)

    records = load_ledger()
    reachable_titles = load_reachable_titles(records)

    missing_records = [r for r in records if r.get("reachability") == "missing"]
    print(f"[INFO] ledger 中 missing 记录: {len(missing_records)} 条")
    print(f"[INFO] reachable titles 集合大小: {len(reachable_titles)}")
    print()

    # 分类
    truly_missing = []      # 10 本：复制
    dup_archive = []        # 4 本：标 deduplicated-archive
    dup_db = []             # 15 本：标 deduplicated-db-with-zip-reachable

    for r in missing_records:
        title = r.get("title", "")
        source = r.get("source", "")
        if title in reachable_titles:
            if source.startswith("_archive/"):
                dup_archive.append(r)
            elif source.startswith("metaphysics.db::"):
                dup_db.append(r)
            else:
                truly_missing.append(r)  # 意外情况，归入 truly_missing
        else:
            truly_missing.append(r)

    print(f"=== 分类结果 ===")
    print(f"  真正 missing（待物理恢复）: {len(truly_missing)} 本")
    print(f"  _archive 重复登记: {len(dup_archive)} 本")
    print(f"  metaphysics.db 重复登记: {len(dup_db)} 本")
    print()

    # ===== 步骤 1：物理复制 10 本 =====
    print(f"=== 步骤 1：物理复制 {len(truly_missing)} 本 _archive 文件 ===")
    recovered_count = 0
    local_also_missing = []

    for r in truly_missing:
        title = r.get("title", "")
        source = r.get("source", "")
        system_type = r.get("systemType", "other")
        target_subdir = get_target_subdir(system_type)
        target_dir = RECOVERED_DIR / target_subdir
        target_dir.mkdir(parents=True, exist_ok=True)

        # 文件名：用 source 的 basename，但去掉路径
        src_filename = Path(source).name
        target_file = target_dir / src_filename

        # 实际本地路径
        local_path = map_archive_path(source)

        if local_path and local_path.exists():
            shutil.copy2(local_path, target_file)
            r["reachability"] = "recovered-to-eastern-metaphysics"
            r["recoveredPath"] = str(target_file.relative_to(ROOT)).replace("\\", "/")
            r["originalSource"] = source
            r["source"] = r["recoveredPath"]  # 更新 source 指向新位置
            recovered_count += 1
            print(f"  [OK] {title}")
            print(f"       from: {local_path.relative_to(ROOT)}")
            print(f"       to:   {target_file.relative_to(ROOT)}")
        else:
            # 尝试在 _archive 下递归搜索文件名
            found = False
            if local_path:
                search_name = local_path.name
                for candidate in (ROOT / "_archive").rglob(search_name):
                    shutil.copy2(candidate, target_file)
                    r["reachability"] = "recovered-to-eastern-metaphysics"
                    r["recoveredPath"] = str(target_file.relative_to(ROOT)).replace("\\", "/")
                    r["originalSource"] = source
                    r["source"] = r["recoveredPath"]
                    recovered_count += 1
                    found = True
                    print(f"  [OK via rglob] {title}")
                    print(f"       from: {candidate.relative_to(ROOT)}")
                    print(f"       to:   {target_file.relative_to(ROOT)}")
                    break
            if not found:
                r["reachability"] = "local-also-missing"
                local_also_missing.append(r)
                print(f"  [FAIL] {title}")
                print(f"       expected at: {local_path if local_path else 'N/A'}")
                print(f"       source: {source}")

    print()
    print(f"  物理恢复成功: {recovered_count} / {len(truly_missing)}")
    print(f"  本地也缺失: {len(local_also_missing)}")
    print()

    # ===== 步骤 2：标记 19 本 deduplicated =====
    print(f"=== 步骤 2：标记 {len(dup_archive) + len(dup_db)} 本 deduplicated ===")
    for r in dup_archive:
        r["reachability"] = "deduplicated-archive"
        r["deduplicatedNote"] = "同书已有同名 reachable 版本在 knowledge/eastern-metaphysics/，_archive 是早期版本"
        print(f"  [dedup-archive] {r.get('title','')}")

    for r in dup_db:
        r["reachability"] = "deduplicated-db-with-zip-reachable"
        r["deduplicatedNote"] = "metaphysics.db 内容已有同名 .zip reachable 版本在 _recovered_assets/docx_for_import/，两版本都已 in_v2"
        print(f"  [dedup-db] {r.get('title','')}")

    print()

    # ===== 步骤 3：写回 ledger =====
    print(f"=== 步骤 3：写回 ledger ===")

    # 构建更新后的 records 字典（按原始顺序）
    updated_count = 0
    for r in records:
        if r.get("reachability") in (
            "recovered-to-eastern-metaphysics",
            "deduplicated-archive",
            "deduplicated-db-with-zip-reachable",
            "local-also-missing",
        ):
            updated_count += 1

    # 备份原 ledger
    backup_file = LEDGER_FILE.with_suffix(".jsonl.bak-pre-P0-3")
    shutil.copy2(LEDGER_FILE, backup_file)
    print(f"  原 ledger 备份: {backup_file.relative_to(ROOT)}")

    # 写新 ledger
    with open(LEDGER_FILE, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"  ledger 更新: {updated_count} 条记录 reachability 字段已更新")
    print(f"  输出: {LEDGER_FILE.relative_to(ROOT)}")
    print()

    # ===== 摘要 =====
    print(f"=== P0-3 操作摘要 ===")
    print(f"  物理恢复: {recovered_count} 本 (10 真正 missing)")
    print(f"  本地也缺失: {len(local_also_missing)} 本")
    print(f"  deduplicated-archive: {len(dup_archive)} 本")
    print(f"  deduplicated-db: {len(dup_db)} 本")
    print(f"  ledger 更新记录数: {updated_count}")
    print()
    if local_also_missing:
        print(f"=== 本地也缺失的 {len(local_also_missing)} 本 ===")
        for r in local_also_missing:
            print(f"  - {r.get('title','')}: {r.get('source','')}")


if __name__ == "__main__":
    main()
