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
        try_files $uri $uri/ /life/index.html;
        internal;
    }'''

# Actually internal won't work here either. Let me try a different approach.
# The real fix: use alias without try_files, and handle SPA routing via a separate named location.

replacement = '''location ^~ /life/ {
        alias /www/wwwroot/awkn-lab/life/;
        index index.html;
    }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(conf_path, "w") as f:
    f.write(content)

print("Fixed: simple alias without try_files")
