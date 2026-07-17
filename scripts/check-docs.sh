#!/bin/bash
# check-docs.sh — 文档失效引用检查
# 用法: bash scripts/check-docs.sh [docs-root]
# 退出码: 0=全部有效, 1=发现失效引用

set -euo pipefail

DOCS_ROOT="${1:-.}"
EXIT_CODE=0
FAILED_COUNT=0
CHECKED_COUNT=0

echo "=== 文档失效引用检查 ==="
echo "扫描根目录: $DOCS_ROOT"
echo ""

# 1. 扫描所有 .md 文件（排除 node_modules/.next/dist/_archive 等非源码目录）
SKIP_DIRS=(-path '*/node_modules/*' -o -path '*/.next/*' -o -path '*/dist/*' -o -path '*/_archive/*' -o -path '*/.git/*' -o -path '*/build/*')
while IFS= read -r file; do
  # 2. 提取内部链接（排除 http/https/file:///）
  links=$(grep -oP '\[.*?\]\(\K(?!https?://|file:///|mailto:)[^)]+' "$file" 2>/dev/null || true)

  for link in $links; do
    CHECKED_COUNT=$((CHECKED_COUNT + 1))

    # 3. 解析相对路径
    dir=$(dirname "$file")
    target="$dir/$link"

    # 4. 检查目标是否存在
    if [[ ! -e "$target" ]]; then
      echo "❌ 失效引用: $file → $link"
      FAILED_COUNT=$((FAILED_COUNT + 1))
      EXIT_CODE=1
    fi
  done
done < <(find "$DOCS_ROOT" -name "*.md" -type f -not \( "${SKIP_DIRS[@]}" \) 2>/dev/null)

echo ""
echo "=== 检查结果 ==="
echo "检查链接数: $CHECKED_COUNT"
echo "失效引用数: $FAILED_COUNT"

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ 所有文档引用有效"
else
  echo "❌ 发现 $FAILED_COUNT 处失效引用，请修复后再提交"
fi

exit $EXIT_CODE
