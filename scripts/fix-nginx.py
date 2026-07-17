#!/usr/bin/env python3
import re

conf_path = "/etc/nginx/conf.d/awkn.cn.conf"
with open(conf_path, "r") as f:
    content = f.read()

# Fix location ^~ /life/ block: replace alias with root and fix try_files
old_block = r'''location \^~ /life/ \{
\s+alias /www/wwwroot/awkn-lab/life/;
\s+index index\.html;
\s+add_header Cache-Control "no-cache, no-store, must-revalidate" always;
\s+add_header Pragma "no-cache" always;
\s+try_files[^\n]+;
\s+\}'''

new_block = '''location ^~ /life/ {
        root /www/wwwroot/awkn-lab;
        index index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        try_files $uri $uri/ /life/index.html;
    }'''

content = re.sub(old_block, new_block, content)

# Also fix location ^~ /life/assets/ block: replace alias with root
old_assets = r'''location \^~ /life/assets/ \{
\s+alias /www/wwwroot/awkn-lab/life/assets/;'''

new_assets = '''location ^~ /life/assets/ {
        alias /www/wwwroot/awkn-lab/life/assets/;'''

# Keep assets as alias since it doesn't have try_files (alias is fine here)

# Fix location = /life/index.html block
old_index = r'''location = /life/index\.html \{
\s+alias /www/wwwroot/awkn-lab/life/index\.html;'''

new_index = '''location = /life/index.html {
        alias /www/wwwroot/awkn-lab/life/index.html;'''

# Keep index.html as alias (it's an exact match, no try_files)

with open(conf_path, "w") as f:
    f.write(content)

print("Nginx config updated")
