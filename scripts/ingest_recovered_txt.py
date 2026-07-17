#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
U4: 导入 5 个 small_docx_hits txt 文件到 _recovered_import.jsonl

输入：_recovered_assets/small_docx_hits/*.txt (5 个)
输出：追加到 knowledge/processed/_recovered_import.jsonl
"""
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from _extract_recovered import detect_system_type_from_text, detect_system_type_with_meta
from knowledge_ingest import split_md_content

INPUT_DIR = ROOT / "_recovered_assets" / "small_docx_hits"
OUTPUT_JSONL = ROOT / "knowledge" / "processed" / "_recovered_import.jsonl"


def main():
    txt_files = sorted(INPUT_DIR.glob("*.txt"))
    print(f"[U4] 处理 {len(txt_files)} 个 txt 文件")
    print("=" * 70)

    stats = {
        'total': len(txt_files),
        'success': 0,
        'too_short': 0,
        'fail': 0,
        'total_passages': 0,
        'system_dist': {},
    }

    with open(OUTPUT_JSONL, 'a', encoding='utf-8') as out_f:
        for i, txt_path in enumerate(txt_files, 1):
            short_sha = txt_path.stem
            print(f"[{i}/{len(txt_files)}] {txt_path.name} (size={txt_path.stat().st_size}B)")

            # 读取文本（尝试多种编码）
            text = ""
            for enc in ('utf-8', 'gb18030', 'gbk', 'utf-16'):
                try:
                    text = txt_path.read_text(encoding=enc)
                    break
                except UnicodeDecodeError:
                    continue
            if not text:
                text = txt_path.read_text(encoding='utf-8', errors='ignore')

            text_len = len(text.strip())
            print(f"  text_length={text_len}")

            if text_len < 100:
                print(f"  → too_short")
                stats['too_short'] += 1
                continue

            # 分类判断（基于文本内容，因为 txt 文件名是 sha）
            system_type = detect_system_type_from_text(text)
            if system_type == 'other':
                # 用综合判断兜底（zip_path=None）
                system_type = detect_system_type_with_meta(text=text, zip_path=None)
            print(f"  system_type={system_type}")

            # 书名用 sha（无元数据）
            book_name = short_sha

            # 切分 passages
            source_path = str(txt_path.relative_to(ROOT)).replace('\\', '/')
            try:
                items = split_md_content(text, book_name, source_path, system_type)
            except Exception as e:
                print(f"  → split_fail: {e}")
                stats['fail'] += 1
                continue

            print(f"  → success, passages={len(items)}")
            stats['success'] += 1
            stats['total_passages'] += len(items)
            stats['system_dist'][system_type] = stats['system_dist'].get(system_type, 0) + 1

            # 追加写入
            for item in items:
                out_f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print("\n" + "=" * 70)
    print(f"总数: {stats['total']}")
    print(f"成功: {stats['success']}")
    print(f"过短: {stats['too_short']}")
    print(f"失败: {stats['fail']}")
    print(f"总 passages: {stats['total_passages']}")
    print(f"分类分布: {stats['system_dist']}")


if __name__ == '__main__':
    main()
