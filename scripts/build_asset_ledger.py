#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
G2 资产总账生成（步骤 4）

输入：
- knowledge/processed/classics_index.jsonl
- knowledge/processed/_manifest.json

输出：
- knowledge/asset-ledger/knowledge-asset-ledger.jsonl  — 资产总账（每个来源文件一条）
- knowledge/asset-ledger/canonical-work-catalog.jsonl  — 作品目录（SHA256）
- knowledge/asset-ledger/source-lineage.jsonl          — 来源血缘（每个 passage 一条）
- knowledge/asset-ledger/duplicate-groups.jsonl        — 重复组（相同文本的 passage 组）
"""
import json
import os
import hashlib
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
MANIFEST_FILE = ROOT / "knowledge" / "processed" / "_manifest.json"
OUTPUT_DIR = ROOT / "knowledge" / "asset-ledger"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

LEDGER_FILE = OUTPUT_DIR / "knowledge-asset-ledger.jsonl"
CATALOG_FILE = OUTPUT_DIR / "canonical-work-catalog.jsonl"
LINEAGE_FILE = OUTPUT_DIR / "source-lineage.jsonl"
DUPLICATES_FILE = OUTPUT_DIR / "duplicate-groups.jsonl"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def detect_type(source: str) -> str:
    ext = Path(source).suffix.lower()
    return {".md": "book", ".pdf": "pdf", ".docx": "docx", ".epub": "epub",
            ".json": "json", ".jsonl": "jsonl", ".txt": "book"}.get(ext, "unknown")


def main():
    print(f"[G2] 资产总账生成")
    print(f"  ROOT={ROOT}")
    print(f"  OUTPUT={OUTPUT_DIR}")

    if not INDEX_FILE.exists():
        print(f"[ERROR] 缺少 {INDEX_FILE}")
        return

    # 加载 classics_index.jsonl
    print(f"\n[Load] 读取 classics_index.jsonl ...")
    items = []
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                items.append(json.loads(line))
    print(f"  共 {len(items)} 条 passages")

    # 加载 manifest
    manifest = {}
    if MANIFEST_FILE.exists():
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    # ============================================================
    # 1. knowledge-asset-ledger.jsonl — 资产总账（按来源文件聚合）
    # ============================================================
    print(f"\n[G2-1] 生成 knowledge-asset-ledger.jsonl ...")
    by_source = defaultdict(lambda: {"passages": [], "system_type": set(), "books": set()})
    for it in items:
        src = it.get("source", "")
        by_source[src]["passages"].append(it)
        by_source[src]["system_type"].add(it.get("system_type", ""))
        by_source[src]["books"].add(it.get("book", ""))

    ledger_count = 0
    with open(LEDGER_FILE, "w", encoding="utf-8") as f:
        for source, info in sorted(by_source.items()):
            src_path = ROOT / source if not os.path.isabs(source) else Path(source)
            asset_id = ""
            file_size = 0
            if src_path.exists():
                try:
                    asset_id = sha256_file(src_path)
                    file_size = src_path.stat().st_size
                except Exception:
                    pass
            entry = {
                "assetId": asset_id,
                "type": detect_type(source),
                "source": source,
                "gitSha": "",  # 可后续从 git log 补充
                "reachability": "reachable" if src_path.exists() else "missing",
                "currentStatus": "in_v2" if info["passages"] else "not_parsed",
                "title": "|".join(sorted(info["books"])),
                "systemType": "|".join(sorted(filter(None, info["system_type"]))),
                "size": file_size,
                "passagesCount": len(info["passages"]),
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            ledger_count += 1
    print(f"  写入 {ledger_count} 条资产记录")

    # ============================================================
    # 2. canonical-work-catalog.jsonl — 作品目录（按 book 聚合，SHA256）
    # ============================================================
    print(f"\n[G2-2] 生成 canonical-work-catalog.jsonl ...")
    by_book = defaultdict(lambda: {"passages": [], "sources": set(), "system_type": ""})
    for it in items:
        book = it.get("book", "")
        by_book[book]["passages"].append(it.get("text", ""))
        by_book[book]["sources"].add(it.get("source", ""))
        by_book[book]["system_type"] = it.get("system_type", "")

    catalog_count = 0
    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
        for book, info in sorted(by_book.items()):
            # 计算全书文本的 SHA256
            full_text = "\n".join(info["passages"])
            entry = {
                "book": book,
                "sha256": sha256_text(full_text),
                "passagesCount": len(info["passages"]),
                "systemType": info["system_type"],
                "sources": sorted(info["sources"]),
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            catalog_count += 1
    print(f"  写入 {catalog_count} 条作品记录")

    # ============================================================
    # 3. source-lineage.jsonl — 来源血缘（每个 passage 一条）
    # ============================================================
    print(f"\n[G2-3] 生成 source-lineage.jsonl ...")
    lineage_count = 0
    with open(LINEAGE_FILE, "w", encoding="utf-8") as f:
        for it in items:
            entry = {
                "passageId": it.get("passage_id", ""),
                "book": it.get("book", ""),
                "source": it.get("source", ""),
                "systemType": it.get("system_type", ""),
                "chapter": it.get("chapter", ""),
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            lineage_count += 1
    print(f"  写入 {lineage_count} 条血缘记录")

    # ============================================================
    # 4. duplicate-groups.jsonl — 重复组（相同文本的 passage 组）
    # ============================================================
    print(f"\n[G2-4] 生成 duplicate-groups.jsonl ...")
    by_text_hash = defaultdict(list)
    for it in items:
        text = it.get("text", "").strip()
        if text:
            h = sha256_text(text)
            by_text_hash[h].append(it.get("passage_id", ""))

    dup_count = 0
    dup_passages = 0
    with open(DUPLICATES_FILE, "w", encoding="utf-8") as f:
        for h, passage_ids in by_text_hash.items():
            if len(passage_ids) > 1:
                entry = {
                    "hash": h,
                    "passages": passage_ids,
                    "count": len(passage_ids),
                }
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                dup_count += 1
                dup_passages += len(passage_ids)
    print(f"  写入 {dup_count} 个重复组（涉及 {dup_passages} 条 passages）")

    print(f"\n[DONE] G2 资产总账生成完成")
    print(f"  ledger: {LEDGER_FILE} ({ledger_count} 条)")
    print(f"  catalog: {CATALOG_FILE} ({catalog_count} 条)")
    print(f"  lineage: {LINEAGE_FILE} ({lineage_count} 条)")
    print(f"  duplicates: {DUPLICATES_FILE} ({dup_count} 组)")


if __name__ == "__main__":
    main()
