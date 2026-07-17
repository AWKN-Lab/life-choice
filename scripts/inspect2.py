import json
with open('/tmp/llm2.json') as f:
    d = json.loads(f.read())
print('raw len:', len(d))
r = json.loads(d)
print('TOP KEYS:', list(r.keys()))
zbso = r.get('zhangbanshan_output', {})
print('zhangbanshan_output.judgment:', repr(zbso.get('judgment', 'MISSING'))[:200])
print('zhangbanshan_output.five_layers:', json.dumps(zbso.get('five_layers', 'MISSING'), ensure_ascii=False)[:500])
print('top-level fiveLayers:', json.dumps(r.get('fiveLayers', 'MISSING'), ensure_ascii=False)[:500])
