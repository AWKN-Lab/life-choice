import json
d = json.load(open('/tmp/llm2.json'))
print('type:', type(d))
print('keys:', list(d.keys()) if isinstance(d, dict) else 'NOT DICT')
zbso = d.get('zhangbanshan_output', {}) if isinstance(d, dict) else {}
j = zbso.get('judgment', '')
print('judgment:', repr(j)[:200] if j else 'EMPTY')
fl_top = d.get('fiveLayers') if isinstance(d, dict) else None
fl_inner = zbso.get('five_layers') if isinstance(d, dict) else None
print('top fiveLayers:', 'YES' if fl_top else 'NO', '(' + str(len(str(fl_top))) + ' bytes)' if fl_top else '')
print('zbso.five_layers:', 'YES' if fl_inner else 'NO', '(' + str(len(str(fl_inner))) + ' bytes)' if fl_inner else '')
