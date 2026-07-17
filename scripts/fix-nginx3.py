#!/usr/bin/env python3
conf_path = "/etc/nginx/conf.d/awkn.cn.conf"
with open(conf_path, "r") as f:
    content = f.read()

# Replace the /life/ location block entirely
# Find and replace the block between "location ^~ /life/ {" and the closing "}"
import re

# Match the /life/ location block (not /life/api/, /life/assets/, /life/socket.io/, /life/index.html)
pattern = r'location \^~ /life/ \{[^}]*?try_files[^\n]*\n\s*\}'

replacement = '''location ^~ /life/ {
        alias /www/wwwroot/awkn-lab/life/;
        index index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        try_files $uri $uri/ @life_fallback;
    }

    location @life_fallback {
        root /www/wwwroot/awkn-lab;
        try_files /life/index.html =404;
    }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(conf_path, "w") as f:
    f.write(content)

print("Fixed with named location fallback")
