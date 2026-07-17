#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
U2: 批量导入 Git 恢复的 docx/xlsx/epub 资产到知识库

输入：
- _recovered_assets/docx_for_import/manifest_import.csv (602 条)
- _recovered_assets/docx_for_import/manifest_epub_xlsx.csv (45 条元数据)

输出：
- knowledge/processed/_recovered_import.jsonl (passages jsonl)
- knowledge/processed/_recovered_import_progress.txt (断点续跑)
- knowledge/processed/_recovered_import_stats.json (统计报告)

特性：
- --dry-run N: 只跑前 N 条，不写入
- --single <zip_path>: 只跑单个文件
- 断点续跑：跳过 _recovered_import_progress.txt 中已记录的 sha
- 内容分类：基于文本关键词判断 system_type
"""
import sys
import csv
import json
import time
import argparse
import traceback
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from _extract_recovered import (
    detect_zip_inner_type, extract_text,
    detect_system_type_with_meta, detect_book_name_from_meta,
)
from knowledge_ingest import split_md_content

# 路径常量
IMPORT_DIR = ROOT / "_recovered_assets" / "docx_for_import"
MANIFEST_CSV = IMPORT_DIR / "manifest_import.csv"
META_CSV = IMPORT_DIR / "manifest_epub_xlsx.csv"
OUTPUT_DIR = ROOT / "knowledge" / "processed"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_JSONL = OUTPUT_DIR / "_recovered_import.jsonl"
PROGRESS_FILE = OUTPUT_DIR / "_recovered_import_progress.txt"
STATS_FILE = OUTPUT_DIR / "_recovered_import_stats.json"


def load_meta() -> dict:
    """加载元数据 CSV (manifest_epub_xlsx.csv)
    返回 sha -> {book_type, title, author, hit_keywords} 字典
    """
    meta = {}
    if not META_CSV.exists():
        return meta
    with open(META_CSV, encoding='utf-8') as f:
        for row in csv.DictReader(f):
            sha = row.get('sha', '').strip()
            if sha:
                meta[sha] = {
                    'book_type': row.get('book_type', '').strip(),
                    'title': row.get('title', '').strip(),
                    'author': row.get('author', '').strip(),
                    'hit_keywords': row.get('hit_keywords', '').strip(),
                }
    return meta


def load_progress() -> set:
    """加载已处理 sha 集合（断点续跑）"""
    if not PROGRESS_FILE.exists():
        return set()
    with open(PROGRESS_FILE, encoding='utf-8') as f:
        return {line.strip() for line in f if line.strip()}


def append_progress(sha: str) -> None:
    """追加写入已处理 sha"""
    with open(PROGRESS_FILE, 'a', encoding='utf-8') as f:
        f.write(sha + '\n')


def append_passages(passages: list, jsonl_path: Path) -> None:
    """追加写入 passages 到 jsonl"""
    with open(jsonl_path, 'a', encoding='utf-8') as f:
        for p in passages:
            f.write(json.dumps(p, ensure_ascii=False) + '\n')


def process_one(zip_path: Path, sha: str, short_sha: str, meta: dict) -> dict:
    """处理单个 zip 文件，返回结果统计"""
    result = {
        'sha': sha,
        'short_sha': short_sha,
        'zip_path': str(zip_path.relative_to(ROOT)).replace('\\', '/'),
        'zip_size': zip_path.stat().st_size,
    }

    # 1. 检测类型
    ftype = detect_zip_inner_type(zip_path)
    result['detected_type'] = ftype
    if ftype.startswith('error') or ftype in ('unknown', 'pdf'):
        result['status'] = 'skip'
        result['reason'] = f'type={ftype}'
        return result

    # 2. 提取文本
    try:
        text = extract_text(zip_path, ftype)
    except Exception as e:
        result['status'] = 'extract_fail'
        result['reason'] = str(e)[:200]
        result['traceback'] = traceback.format_exc()[:500]
        return result

    text_len = len(text.strip())
    result['text_length'] = text_len
    if text_len < 100:
        result['status'] = 'too_short'
        result['reason'] = f'text_length={text_len}'
        return result

    # 3. 综合分类判断
    m = meta.get(sha, {}) or meta.get(short_sha, {})
    book_type = m.get('book_type')
    title = m.get('title')
    author = m.get('author')

    try:
        system_type = detect_system_type_with_meta(
            text=text,
            zip_path=zip_path,
            book_type=book_type,
            title=title,
        )
    except Exception as e:
        system_type = 'other'
        result['classify_error'] = str(e)[:100]
    result['system_type'] = system_type

    # 4. 书名
    book_name = detect_book_name_from_meta(zip_path, title=title, author=author)
    result['book'] = book_name

    # 5. 切分 passages（复用 knowledge_ingest.split_md_content）
    source_path = str(zip_path.relative_to(ROOT)).replace('\\', '/')
    try:
        items = split_md_content(text, book_name, source_path, system_type)
    except Exception as e:
        result['status'] = 'split_fail'
        result['reason'] = str(e)[:200]
        result['traceback'] = traceback.format_exc()[:500]
        return result

    result['passages_count'] = len(items)
    result['status'] = 'success'
    if items:
        result['first_passage_preview'] = items[0]['text'][:80]

    # 6. 写入 jsonl
    try:
        append_passages(items, OUTPUT_JSONL)
    except Exception as e:
        result['status'] = 'write_fail'
        result['reason'] = str(e)[:200]
        return result

    return result


def main():
    parser = argparse.ArgumentParser(description='U2: 批量导入 Git 恢复的 docx/xlsx/epub 资产')
    parser.add_argument('--dry-run', type=int, default=0, metavar='N',
                        help='只跑前 N 条，不写入 jsonl 和 progress')
    parser.add_argument('--single', type=str, default='', metavar='ZIP_PATH',
                        help='只跑单个 zip 文件')
    parser.add_argument('--limit', type=int, default=0, metavar='N',
                        help='最多处理 N 条（0=不限制）')
    parser.add_argument('--restart', action='store_true',
                        help='清空 progress 和 jsonl，从头开始')
    args = parser.parse_args()

    # restart 模式：清空输出
    if args.restart:
        if PROGRESS_FILE.exists():
            PROGRESS_FILE.unlink()
        if OUTPUT_JSONL.exists():
            OUTPUT_JSONL.unlink()
        print('[Restart] 已清空 progress 和 jsonl')

    # 加载元数据
    meta = load_meta()
    print(f'[Meta] 加载元数据: {len(meta)} 条')

    # 加载断点续跑
    if args.dry_run > 0 or args.single:
        progress = set()  # dry-run/single 模式不使用断点
    else:
        progress = load_progress()
        print(f'[Progress] 已处理: {len(progress)} 条（断点续跑）')

    # 加载 manifest
    if args.single:
        # 单文件模式
        zip_path = Path(args.single).resolve()
        if not zip_path.exists():
            print(f'ERROR: 文件不存在: {zip_path}')
            sys.exit(1)
        rows = [{
            'sha': zip_path.stem,
            'short_sha': zip_path.stem[:12],
            'size_mb': f'{zip_path.stat().st_size / 1024 / 1024:.4f}',
            'export_path': str(zip_path.relative_to(ROOT)).replace('\\', '/'),
            'detected_type': 'zip/docx/xlsx/epub',
        }]
    else:
        with open(MANIFEST_CSV, encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        print(f'[Manifest] 共 {len(rows)} 条记录')

    # 过滤已处理
    if progress:
        before = len(rows)
        rows = [r for r in rows if r['sha'] not in progress]
        print(f'[Progress] 跳过已处理 {before - len(rows)} 条，剩余 {len(rows)} 条')

    # dry-run 限制
    if args.dry_run > 0:
        rows = rows[:args.dry_run]
        print(f'[Dry-Run] 仅处理前 {args.dry_run} 条')

    # limit 限制
    if args.limit > 0:
        rows = rows[:args.limit]
        print(f'[Limit] 限制处理 {args.limit} 条')

    if not rows:
        print('\n[Done] 无待处理记录')
        return

    print(f'\n[Start] 待处理: {len(rows)} 条')
    print('=' * 70)

    # 处理
    stats = {
        'total': len(rows),
        'success': 0,
        'skip': 0,
        'extract_fail': 0,
        'too_short': 0,
        'split_fail': 0,
        'write_fail': 0,
        'total_passages': 0,
        'type_dist': Counter(),
        'system_dist': Counter(),
        'failures': [],
    }

    start_time = time.time()
    for i, row in enumerate(rows, 1):
        sha = row['sha']
        short_sha = row['short_sha']
        zip_path = ROOT / row['export_path']

        if not zip_path.exists():
            print(f'[{i}/{len(rows)}] MISSING: {zip_path.name}')
            stats['skip'] += 1
            stats['failures'].append({'sha': sha, 'reason': 'file_missing'})
            continue

        elapsed = time.time() - start_time
        rate = i / elapsed if elapsed > 0 else 0
        eta = (len(rows) - i) / rate if rate > 0 else 0
        print(f'[{i}/{len(rows)}] {short_sha} (size={row.get("size_mb", "?")}MB, '
              f'elapsed={elapsed:.0f}s, eta={eta:.0f}s)', flush=True)

        try:
            result = process_one(zip_path, sha, short_sha, meta)
        except Exception as e:
            result = {
                'status': 'unexpected_fail',
                'reason': str(e)[:200],
                'sha': sha,
            }
            print(f'  UNEXPECTED ERROR: {e}')

        status = result.get('status', 'unknown')
        stats[status] = stats.get(status, 0) + 1
        stats['type_dist'][result.get('detected_type', 'unknown')] += 1
        if result.get('system_type'):
            stats['system_dist'][result['system_type']] += 1
        if result.get('passages_count'):
            stats['total_passages'] += result['passages_count']

        if status != 'success':
            stats['failures'].append({
                'sha': sha,
                'short_sha': short_sha,
                'status': status,
                'reason': result.get('reason', ''),
            })

        print(f'  → {status} | type={result.get("detected_type", "-")} | '
              f'sys={result.get("system_type", "-")} | '
              f'passages={result.get("passages_count", 0)} | '
              f'book={result.get("book", "-")[:30]}')
        if result.get('reason'):
            print(f'  reason: {result["reason"][:100]}')

        # 记录断点（dry-run 不写入）
        if args.dry_run == 0 and not args.single:
            append_progress(sha)

    # 输出统计
    elapsed = time.time() - start_time
    print('\n' + '=' * 70)
    print('汇总统计')
    print('=' * 70)
    print(f'总数: {stats["total"]}')
    print(f'成功: {stats["success"]} ({stats["success"]*100//max(stats["total"],1)}%)')
    print(f'跳过: {stats["skip"]}')
    print(f'提取失败: {stats["extract_fail"]}')
    print(f'文本过短: {stats["too_short"]}')
    print(f'切分失败: {stats["split_fail"]}')
    print(f'写入失败: {stats["write_fail"]}')
    print(f'总 passages: {stats["total_passages"]}')
    print(f'耗时: {elapsed:.1f}s')
    print(f'类型分布: {dict(stats["type_dist"])}')
    print(f'分类分布: {dict(stats["system_dist"])}')

    if stats['failures']:
        print(f'\n失败列表 (前 20 条):')
        for f in stats['failures'][:20]:
            print(f'  {f.get("short_sha", f.get("sha", "?"))}: {f["status"]} - {f.get("reason", "")[:80]}')

    # 写入统计文件
    stats_out = {
        'total': stats['total'],
        'success': stats['success'],
        'skip': stats['skip'],
        'extract_fail': stats['extract_fail'],
        'too_short': stats['too_short'],
        'split_fail': stats['split_fail'],
        'write_fail': stats['write_fail'],
        'total_passages': stats['total_passages'],
        'elapsed_seconds': round(elapsed, 2),
        'type_dist': dict(stats['type_dist']),
        'system_dist': dict(stats['system_dist']),
        'failures_count': len(stats['failures']),
        'failures_sample': stats['failures'][:50],
    }
    stats_path = STATS_FILE if args.dry_run == 0 and not args.single \
        else OUTPUT_DIR / '_recovered_import_stats_dryrun.json'
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats_out, f, ensure_ascii=False, indent=2)
    print(f'\n统计报告: {stats_path}')

    # 验收
    success_rate = stats['success'] * 100 // max(stats['total'], 1)
    print(f'\n[U2 验收] success_rate = {success_rate}%')
    if success_rate >= 80:
        print('[U2 验收] PASS (success_rate >= 80%)')
        sys.exit(0)
    else:
        print('[U2 验收] FAIL (success_rate < 80%)')
        sys.exit(1)


if __name__ == '__main__':
    main()
