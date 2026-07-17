import sys
import os

os.chdir(os.path.join(os.path.dirname(__file__), "..", "apps", "AWKN-LABlife", "services", "knowledge-service"))
sys.path.insert(0, ".")
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["HF_HUB_OFFLINE"] = "1"

import main

# 触发加载
main.health()

tests = [
    ('六壬神课金口诀', 'liuren'),
    ('奇门遁甲排盘', 'qimen'),
    ('道德经道可道', 'daoism'),
    ('姓名与人生', 'quming'),
]

for query, sys_type in tests:
    req = main.EmbedSearchRequest(question=query, systemType=sys_type, limit=5)
    resp = main.embed_search(req)
    items = resp.items
    print(f'\n[query={query}, sys={sys_type}] items={len(items)}')
    for it in items[:5]:
        sid = (it.sourceId or '')[:50]
        is_l7 = 'l7p' in sid
        marker = ' [L7]' if is_l7 else ''
        print(f'  - {sid} score={it.score:.3f}{marker}')
        print(f'    {it.text[:80]}')
