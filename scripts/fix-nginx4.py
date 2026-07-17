#!/usr/bin/env python3
conf_path = "/etc/nginx/conf.d/awkn.cn.conf"
with open(conf_path, "r") as f:
    content = f.read()

import re

# Replace the /life/ location block + @life_fallback
pattern = r'location \^~ /life/ \{.*?location @life_fallback \{.*?\}'

replacement = '''location ^~ /life/ {
        root /www/wwwroot/awkn-lab;
        index index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        try_files $uri $uri/ /life/index.html;
    }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Also fix /life/assets/ to use root instead of alias
content = content.replace(
    "location ^~ /life/assets/ {\n        alias /www/wwwroot/awkn-lab/life/assets/;",
    "location ^~ /life/assets/ {\n        root /www/wwwroot/awkn-lab;"
)

# Also fix /life/index.html exact match
content = content.replace(
    "location = /life/index.html {\n        alias /www/wwwroot/awkn-lab/life/index.html;",
    "location = /life/index.html {\n        root /www/wwwroot/awkn-lab;"
)

with open(conf_path, "w") as f:
    f.write(content)

print("Fixed: all /life/ locations use root instead of alias")
