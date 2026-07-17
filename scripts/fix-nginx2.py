#!/usr/bin/env python3
conf_path = "/etc/nginx/conf.d/awkn.cn.conf"
with open(conf_path, "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    stripped = line.strip()
    # Fix the try_files line in /life/ block
    if stripped.startswith("try_files") and "/life/index.html" in stripped:
        new_lines.append("        try_files $uri $uri/ /life/index.html;\n")
    else:
        new_lines.append(line)

with open(conf_path, "w") as f:
    f.writelines(new_lines)

print("Fixed try_files lines")
