import json
import os
from typing import List, Dict

from jsonl_dataset import iter_jsonl_lines, resolve_jsonl_paths

# loader.py 位于 apps/AWKN-LABlife/services/knowledge-service/
# __file__ = .../apps/AWKN-LABlife/services/knowledge-service/loader.py
# x1=knowledge-service, x2=services, x3=AWKN-LABlife, x4=apps, x5=人生决策宗师
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_APPS_LIFE_DIR = os.path.dirname(os.path.dirname(_THIS_DIR))  # apps/AWKN-LABlife
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_APPS_LIFE_DIR))  # 人生决策宗师/

# 优先用环境变量 KNOWLEDGE_DATA_DIR（服务器部署用），否则基于 _PROJECT_ROOT
_KNOWLEDGE_DATA_DIR = os.getenv("KNOWLEDGE_DATA_DIR", os.path.join(_PROJECT_ROOT, 'knowledge', 'processed'))
INDEX_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, 'classics_index.jsonl')
MANIFEST_FILE = os.path.join(_KNOWLEDGE_DATA_DIR, '_manifest.json')


def load_all() -> Dict:
    """从 classics_index.jsonl 加载全量 passages，按 system_type 分组。

    返回结构:
        {
            'items': List[Dict],          # 全量 passage（text 截断到 500 字）
            'by_system': Dict[str, List], # 按 system_type 分组
            'sources': {'total': int, 'books': int},
            'manifest': Dict,             # _manifest.json 原始内容
        }
    """
    items = []

    # 1. 加载部署单文件，或 Git 中按序保存的分片
    index_paths = resolve_jsonl_paths(INDEX_FILE)
    if not index_paths:
        print(f"[loader] WARNING: classics_index 数据集不存在: {INDEX_FILE}，检索将返回空")
        return {
            'items': [],
            'by_system': {},
            'sources': {'total': 0, 'books': 0},
            'manifest': {},
        }

    for path, line_no, line in iter_jsonl_lines(INDEX_FILE):
        line = line.strip()
        if not line:
            continue
        try:
            it = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"[loader] WARN: {path} 第 {line_no} 行 JSON 解析失败: {e}")
            continue
        items.append({
            'source': it.get('source', ''),
            'text': (it.get('text', '') or '')[:500],  # 截断到 500 字
            'system_type': it.get('system_type', 'other'),
            'book': it.get('book', ''),
            'passage_id': it.get('passage_id', ''),
            'chapter': it.get('chapter', ''),
        })

    # 2. 按 system_type 分组
    by_system: Dict[str, List[Dict]] = {}
    for it in items:
        sys_type = it['system_type']
        by_system.setdefault(sys_type, []).append(it)

    # 3. 加载 manifest
    manifest = {}
    if os.path.exists(MANIFEST_FILE):
        try:
            with open(MANIFEST_FILE, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        except Exception as e:
            print(f"[loader] WARN: _manifest.json 加载失败: {e}")

    # 4. 兼容旧接口：保留 'bazi'/'liuren' 顶层键（指向 by_system 的对应分类）
    result = {
        'items': items,
        'by_system': by_system,
        'sources': {
            'total': len(items),
            'books': manifest.get('total_books', manifest.get('books', 0)) if isinstance(manifest, dict) else 0,
        },
        'manifest': manifest,
    }
    # 兼容旧 main.py 的 DATA.get('bazi', []) / DATA.get('liuren', [])
    result['bazi'] = by_system.get('bazi', [])
    result['liuren'] = by_system.get('liuren', [])

    print(f"[loader] 加载完成: {len(items)} passages, {len(by_system)} 分类, "
          f"books={result['sources']['books']}")
    return result
