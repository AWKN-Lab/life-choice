import json
import sys

with open('/tmp/llm.json', 'r') as f:
    data = f.read()

# sqlite output is a single column row, just the JSON string
llm_str = data.strip()
r = json.loads(llm_str)
print('TOP KEYS:', list(r.keys()))
print('---')
print('zhangbanshan_output keys:', list(r.get('zhangbanshan_output', {}).keys()))
print('---')
print('judgment:', repr(r.get('zhangbanshan_output', {}).get('judgment', 'MISSING')))
print('---')
# Look for 5-layer structure
zbso = r.get('zhangbanshan_output', {})
for k in ['five_layers', 'fiveLayers', 'layer5_output', 'fact_layer', 'interpretation_layer']:
    if k in zbso:
        print(f'  {k}:', str(zbso[k])[:200])
print('---')
# Look anywhere for 5 layers
def find_layers(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if 'layer' in k.lower() or '五层' in str(k) or '事实' in str(k) or '解读' in str(k):
                print(f'  FOUND at {path}.{k}:', str(v)[:150])
            find_layers(v, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            find_layers(v, f'{path}[{i}]')
find_layers(r)
