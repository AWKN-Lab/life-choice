"""
update_env.py — 生产环境 .env 配置更新脚本
密钥通过环境变量传入，禁止硬编码：
  export MINIMAX_API_KEY="sk-xxx"
  export DEEPSEEK_DIRECT_API_KEY="sk-xxx"
"""
import os
import re

p = '/opt/awkn-life/awkn-life-backend/.env'
s = open(p).read()

minimax_key = os.environ.get('MINIMAX_API_KEY', '')
deepseek_key = os.environ.get('DEEPSEEK_DIRECT_API_KEY', '')

if not minimax_key or not deepseek_key:
    print('ERROR: 请通过环境变量设置 MINIMAX_API_KEY 和 DEEPSEEK_DIRECT_API_KEY')
    exit(1)

# 替换 MINIMAX key
s = re.sub(
    r'MINIMAX_API_KEY="[^"]*"',
    f'MINIMAX_API_KEY="{minimax_key}"',
    s
)
# 替换默认 provider
s = s.replace(
    'DEFAULT_LLM_PROVIDER="doubao"',
    'DEFAULT_LLM_PROVIDER="deepseek-direct"'
)
# 追加 DEEPSEEK 配置
if 'DEEPSEEK_DIRECT_API_KEY' not in s:
    s += '\n# DEEPSEEK Direct (2026-06-15 user-config)\n'
    s += f'DEEPSEEK_DIRECT_API_KEY="{deepseek_key}"\n'
    s += 'DEEPSEEK_DIRECT_BASE_URL="https://api.deepseek.com/v1"\n'
    s += 'DEEPSEEK_DIRECT_MODEL="deepseek-chat"\n'
open(p, 'w').write(s)
print('UPDATED — keys sourced from environment variables')
