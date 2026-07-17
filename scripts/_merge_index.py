"""U6: 合并 _recovered_import.jsonl 到 classics_index.jsonl

策略：
1. 备份 classics_index.jsonl 为 classics_index.jsonl.bak-prerecover
2. 加载 classics_index.jsonl 现有 passage_id 集合（去重基线）
3. 加载 _recovered_import.jsonl，过滤已存在的 passage_id
4. 追加合并到 classics_index.jsonl
5. 验证：合并后行数 + 去重检查
6. 更新 _manifest.json
"""
import json
import shutil
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
CLASSICS = ROOT / "knowledge" / "processed" / "classics_index.jsonl"
RECOVERED = ROOT / "knowledge" / "processed" / "_recovered_import.jsonl"
MANIFEST = ROOT / "knowledge" / "processed" / "_manifest.json"
BACKUP = ROOT / "knowledge" / "processed" / "classics_index.jsonl.bak-prerecover"


def main():
    # 1. 备份
    print(f"[1/5] 备份 classics_index.jsonl → {BACKUP.name}")
    shutil.copy2(CLASSICS, BACKUP)
    print(f"  备份完成: {BACKUP.stat().st_size} bytes")

    # 2. 加载现有 classics_index 的 passage_id（去重基线）
    print(f"\n[2/5] 加载 classics_index.jsonl 现有 passage_id")
    existing_ids = set()
    existing_books = set()
    with open(CLASSICS, encoding='utf-8') as f:
        for line in f:
            obj = json.loads(line)
            existing_ids.add(obj['passage_id'])
            existing_books.add(obj['book'])
    print(f"  现有: {len(existing_ids)} passages / {len(existing_books)} books")

    # 3. 加载 _recovered_import.jsonl，过滤已存在
    print(f"\n[3/5] 加载 _recovered_import.jsonl 并去重")
    new_passages = []
    skip_duplicate = 0
    with open(RECOVERED, encoding='utf-8') as f:
        for line in f:
            obj = json.loads(line)
            pid = obj['passage_id']
            if pid in existing_ids:
                skip_duplicate += 1
                continue
            new_passages.append(obj)
            existing_ids.add(pid)  # 防止 recovered 内部重复
    print(f"  新增: {len(new_passages)} passages")
    print(f"  跳过重复: {skip_duplicate}")

    # 4. 追加合并到 classics_index.jsonl
    print(f"\n[4/5] 追加 {len(new_passages)} passages 到 classics_index.jsonl")
    with open(CLASSICS, 'a', encoding='utf-8') as f:
        for p in new_passages:
            f.write(json.dumps(p, ensure_ascii=False) + '\n')

    # 5. 验证
    print(f"\n[5/5] 验证合并结果")
    new_count = 0
    new_books = set()
    new_sys_dist = {}
    with open(CLASSICS, encoding='utf-8') as f:
        for line in f:
            obj = json.loads(line)
            new_count += 1
            new_books.add(obj['book'])
            sys_t = obj.get('system_type', 'unknown')
            new_sys_dist[sys_t] = new_sys_dist.get(sys_t, 0) + 1

    print(f"\n{'='*70}")
    print(f"合并结果:")
    print(f"  classics_index.jsonl 总行数: {new_count}")
    print(f"  books 总数: {len(new_books)}")
    print(f"  system_type 分布:")
    for k, v in sorted(new_sys_dist.items(), key=lambda x: -x[1]):
        print(f"    {k}: {v}")

    # 6. 更新 _manifest.json
    print(f"\n[更新] _manifest.json")
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    else:
        manifest = {}
    manifest['last_merge'] = {
        'timestamp': datetime.now().isoformat(),
        'recovered_added': len(new_passages),
        'skipped_duplicates': skip_duplicate,
        'total_passages_after_merge': new_count,
        'total_books_after_merge': len(new_books),
        'backup_file': BACKUP.name,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"  _manifest.json 已更新")

    print(f"\n[U6 验收]")
    print(f"  [备份成功] {'PASS' if BACKUP.exists() else 'FAIL'}")
    print(f"  [合并无重复] {'PASS' if skip_duplicate == 0 else f'WARN (跳过{skip_duplicate}条重复)'}")
    print(f"  [新增 passages > 0] {'PASS' if len(new_passages) > 0 else 'FAIL'}")
    print(f"  [总 passages > 原有] {'PASS' if new_count > len(existing_ids) else 'FAIL'}")


if __name__ == '__main__':
    main()
