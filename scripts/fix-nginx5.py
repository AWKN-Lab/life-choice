#!/usr/bin/env python3
conf_path = "/etc/nginx/conf.d/awkn.cn.conf"
with open(conf_path, "r") as f:
    content = f.read()

import re

# Replace the /life/ location block
pattern = r'location \^~ /life/ \{[^}]*?try_files[^\n]*\n\s*\}'

replacement = '''location ^~ /life/ {
        root /www/wwwroot/awkn-lab;
        index index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        try_files $uri $uri/ =404;
        error_page 404 /life/index.html;
    }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(conf_path, "w") as f:
    f.write(content)

print("Fixed: try_files with error_page fallback")
