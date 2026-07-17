import json
from pathlib import Path

pf = Path(r'C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\东方术数\紫薇-md\_progress.json')
with open(pf, 'r', encoding='utf-8') as f:
    p = json.load(f)

print('finished_at:', p.get('finished_at', 'NO'))
print('started_at:', p.get('started_at', 'NO'))
print('completed:', len(p.get('completed', {})))
print('failed:', len(p.get('failed', {})))
print('done_pages:', p.get('done_pages', 0))
print()

print('--- All Completed ---')
all_comp = sorted(p.get('completed', {}).keys())
for n in all_comp:
    info = p['completed'][n]
    print(f'  [{info.get("pages","?")}p] {n}')

if p.get('failed', {}):
    print()
    print('--- Failed ---')
    for n, v in p['failed'].items():
        print(f'  {n}: {v.get("error", "?")}')
