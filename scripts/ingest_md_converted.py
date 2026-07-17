#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
L7 md_converted 导入脚本（B-S1 / B-S2）

输入:
  _archive/data-dumps/md_converted/东方术数/**/*.md（24 个核心术数类）
  knowledge/processed/classics_index.jsonl（用于去重对比）

输出:
  knowledge/processed/_l7_md_import.jsonl   导入的 passages
  knowledge/processed/_l7_import_report.json  导入报告

策略:
  - 复用 knowledge_ingest.py 的 split_md_content + detect_system_type
  - passage_id: <book>::l7p<NNNNN>
  - 去重: SHA256(text.strip()) 与现有 classics_index.jsonl 对比，跳过已存在
"""
import json
import sys
import hashlib
import re
from pathlib import Path
from collections import Counter
from typing import Dict

# 复用 knowledge_ingest.py 的 sanitize_text(DRY 原则)
from knowledge_ingest import sanitize_text

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT / "_archive" / "data-dumps" / "md_converted"
INDEX_FILE = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
OUT_FILE = ROOT / "knowledge" / "processed" / "_l7_md_import.jsonl"
REPORT_FILE = ROOT / "knowledge" / "processed" / "_l7_import_report.json"

# ============================================================
# L7 导入清单（24 个核心术数类 md 文件）
# 路径相对于 _archive/data-dumps/md_converted/
# system_type 显式指定（避免 detect_system_type 误判）
# ============================================================
L7_FILES = [
    # 六壬类（10 个）
    ("东方术数/六壬/六壬大全.md", "liuren"),
    ("东方术数/六壬/六壬捷录新解.md", "liuren"),
    ("东方术数/六壬/六壬神课初学详解 .md", "liuren"),
    ("东方术数/六壬/六壬神课金口诀现代实例精解.md", "liuren"),
    ("东方术数/六壬/大六壬神课研究应用课程讲义.md", "liuren"),
    ("东方术数/六壬/大六壬神课金口诀分类解断.md", "liuren"),
    ("东方术数/六壬/_processed_md/大六壬高级预测学.md", "liuren"),
    ("东方术数/六壬/_processed_md/六壬指南例题解.md", "liuren"),
    ("东方术数/六壬/_processed_md/六壬断案详解.md", "liuren"),
    ("东方术数/六壬/大六壬择日精要_pipeline/大六壬择日精要/auto/大六壬择日精要.md", "liuren"),
    # 六爻（1 个）
    ("东方术数/六壬/六爻正道.md", "liuyao"),
    # 奇门（4 个）
    ("东方术数/奇门/不吹牛第一届奇门遁甲培训班讲义.md", "qimen"),
    ("东方术数/奇门/妙派奇门遁甲使用方法.md", "qimen"),
    ("东方术数/奇门/彩票与奇门.md", "qimen"),
    ("东方术数/于城道人天目奇门.md", "qimen"),
    # 紫微（4 个）
    ("东方术数/紫薇/中州派紫微斗数初级讲义.md", "ziwei"),
    ("东方术数/紫薇/依婷紫微斗数讲课记录.md", "ziwei"),
    ("东方术数/紫薇/紫微斗数断命法.md", "ziwei"),
    ("东方术数/紫薇/紫微斗数精奥.md", "ziwei"),
    # 八字（1 个）
    ("东方术数/八字命理/子平推命/图解子平真诠 干支密码(3) (沈孝瞻) (z-library.sk, 1lib.sk, z-lib.sk).md", "bazi"),
    # 姓名学（1 个）
    ("东方术数/名至实归：姓名与人生的关系 (周德元) (z-library.sk, 1lib.sk, z-lib.sk).md", "quming"),
    # 道学（1 个）
    ("东方术数/理解《道德经》.md", "daoism"),
    # 周易（2 个）
    ("奇门遁甲/ZhouYiLab/docs/大六壬入门.md", "liuren"),
    ("奇门遁甲/ZhouYiLab/docs/大六壬快速入门完整.md", "liuren"),
]

# ============================================================
# 复用 knowledge_ingest.py 的切分逻辑
# ============================================================
TITLE_PATTERNS = [
    re.compile(r"^#{1,4}\s+(.+)$"),
    re.compile(r"^第[一二三四五六七八九十百千]+[卷章节篇回].*$"),
    re.compile(r"^【.+】$"),
]
PARA_BREAK = re.compile(r"\n\s*\n")


def _make_item(book: str, chapter: str, system_type: str, text: str, source: str, idx: int) -> Dict:
    return {
        "passage_id": f"{book}::l7p{idx:05d}",
        "book": book,
        "chapter": chapter or "",
        "system_type": system_type,
        "text": sanitize_text(text),  # 防御性清洗
        "source": source,
        "meta": {"l7_import": True, "auto_split": True},
    }


def split_md_content(content: str, book: str, source: str, system_type: str):
    """按段落+章节切分 .md 内容（与 knowledge_ingest.py L175-222 一致）"""
    # 清洗 NULL bytes 和控制字符(防止 NULL bytes 进入 text 字段)
    content = sanitize_text(content)
    items = []
    chapter_pattern = re.compile(r"^(#{1,4}\s+.+|第[一二三四五六七八九十百千]+[卷章节篇回].*)$", re.MULTILINE)
    parts = chapter_pattern.split(content)
    chapter = ""
    idx = 0
    for i, part in enumerate(parts):
        if chapter_pattern.match(part or ""):
            chapter = re.sub(r"^#+\s*", "", part).strip()
            continue
        text = (part or "").strip()
        if not text:
            continue
        for j, para in enumerate(PARA_BREAK.split(text)):
            para = para.strip()
            if not para or len(para) < 30:
                continue
            MAX_LEN = 400
            if len(para) > MAX_LEN:
                chunks = re.split(r"(?<=[。！？])\s*", para)
                buf = ""
                for c in chunks:
                    while len(c) > MAX_LEN:
                        if buf:
                            items.append(_make_item(book, chapter, system_type, buf, source, idx))
                            idx += 1
                            buf = ""
                        hard_chunk = c[:MAX_LEN]
                        items.append(_make_item(book, chapter, system_type, hard_chunk, source, idx))
                        idx += 1
                        c = c[MAX_LEN:]
                    if len(buf) + len(c) > MAX_LEN and buf:
                        items.append(_make_item(book, chapter, system_type, buf, source, idx))
                        idx += 1
                        buf = c
                    else:
                        buf += c
                if buf.strip():
                    items.append(_make_item(book, chapter, system_type, buf, source, idx))
                    idx += 1
            else:
                items.append(_make_item(book, chapter, system_type, para, source, idx))
                idx += 1
    return items


def detect_book_name(file_path: Path) -> str:
    """从文件名提取典籍名（与 knowledge_ingest.py L123-132 一致）"""
    name = file_path.stem
    name = re.sub(r"\s*\(Z-Library\)", "", name)
    name = re.sub(r"\s*\(z-library\.sk.*?\)", "", name)
    name = re.sub(r"\s*\(.*?lib\.sk.*?\)", "", name)
    name = name.strip()
    return name


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def main():
    print(f"[L7] md_converted 导入")
    print(f"  ARCHIVE={ARCHIVE}")
    print(f"  输出: {OUT_FILE}")
    print(f"  清单: {len(L7_FILES)} 个文件")

    # 1) 加载现有 classics_index.jsonl 的 text SHA256（用于去重）
    print(f"\n[Phase 1] 加载现有 classics_index.jsonl 的 SHA256 ...")
    existing_hashes = set()
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                text = (item.get("text") or "").strip()
                if text:
                    existing_hashes.add(sha256_text(text))
        print(f"  现有 hashes: {len(existing_hashes)}")
    else:
        print(f"  [WARN] classics_index.jsonl 不存在，跳过去重对比")

    # 2) 处理每个 md 文件
    print(f"\n[Phase 2] 处理 md 文件 ...")
    all_items = []
    seen_books = {}
    skipped_files = []
    per_file_stats = []

    for rel_path, system_type in L7_FILES:
        full_path = ARCHIVE / rel_path
        if not full_path.exists():
            print(f"  [SKIP] 文件不存在: {rel_path}")
            skipped_files.append(rel_path)
            continue

        book = detect_book_name(full_path)
        if book in seen_books:
            print(f"  [SKIP] 重复书名: {book}（已在 {seen_books[book]}）")
            continue

        content = full_path.read_text(encoding="utf-8", errors="ignore")
        if len(content) < 200:
            print(f"  [SKIP] 内容过短 (<200): {book}")
            skipped_files.append(rel_path)
            continue

        source = f"_archive/{rel_path}".replace("\\", "/")
        items = split_md_content(content, book, source, system_type)
        if not items:
            print(f"  [SKIP] 切分后无 passages: {book}")
            skipped_files.append(rel_path)
            continue

        # 去重：跳过与现有 classics_index.jsonl 重复的 passages
        new_items = []
        dup_with_existing = 0
        for item in items:
            h = sha256_text(item["text"].strip())
            if h in existing_hashes:
                dup_with_existing += 1
                continue
            new_items.append(item)
            existing_hashes.add(h)  # 防止本次导入内部重复

        all_items.extend(new_items)
        seen_books[book] = rel_path
        per_file_stats.append({
            "book": book,
            "system_type": system_type,
            "total_split": len(items),
            "new_added": len(new_items),
            "dup_with_existing": dup_with_existing,
            "source": source,
        })
        print(f"  + {book} ({system_type}): split={len(items)}, new={len(new_items)}, dup_skip={dup_with_existing}")

    # 3) 写出
    print(f"\n[Phase 3] 写出 _l7_md_import.jsonl ...")
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        for item in all_items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"  写入: {len(all_items)} 条")

    # 4) 生成报告
    print(f"\n[Phase 4] 生成报告 ...")
    cat_counter = Counter(item["system_type"] for item in all_items)
    report = {
        "input_files": len(L7_FILES),
        "skipped_files": skipped_files,
        "skipped_count": len(skipped_files),
        "processed_books": len(seen_books),
        "total_passages_added": len(all_items),
        "by_category": dict(cat_counter),
        "per_file_stats": per_file_stats,
        "dedup_strategy": "SHA256(text.strip()) vs existing classics_index.jsonl",
    }
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  报告: {REPORT_FILE}")

    # 5) 二次验证：导入文件内部无重复
    print(f"\n[Phase 5] 二次验证导入文件内部无重复 ...")
    from collections import defaultdict
    verify_hash = defaultdict(int)
    with open(OUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                item = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = (item.get("text") or "").strip()
            if text:
                verify_hash[sha256_text(text)] += 1
    verify_dup = sum(1 for c in verify_hash.values() if c > 1)
    if verify_dup == 0:
        print(f"  ✅ PASS: 导入文件内部无重复")
    else:
        print(f"  ❌ FAIL: 导入文件仍有 {verify_dup} 个重复组", file=sys.stderr)
        sys.exit(2)

    print(f"\n[DONE] L7 导入完成")
    print(f"  处理文件: {len(seen_books)}")
    print(f"  跳过文件: {len(skipped_files)}")
    print(f"  新增 passages: {len(all_items)}")
    print(f"  分类分布: {dict(cat_counter)}")


if __name__ == "__main__":
    main()
