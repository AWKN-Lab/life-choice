#!/bin/bash
# ==========================================
# 前端 SPA 路由冒烟测试 - Q3 P0-2 补齐
# 测试 /life/ 子路径、静态资源、SPA 路由可达性
# 运行在阿里云服务器（Linux，LF 行尾）
# ==========================================

set -euo pipefail

# ---- 配置 ----
FRONTEND_BASE_URL="${FRONTEND_BASE_URL:-http://localhost/life}"
CURL_TIMEOUT=5

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---- 计数器 ----
PASS=0
FAIL=0

# ---- 工具函数 ----
check_endpoint() {
  local name="$1"
  local url="$2"
  local allowed_codes="$3"
  local http_code

  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_TIMEOUT" "$url" 2>/dev/null) || true
  [ -z "$http_code" ] && http_code="000"

  local code_match=0
  IFS=',' read -ra CODES <<< "$allowed_codes"
  for code in "${CODES[@]}"; do
    if [ "$http_code" = "$code" ]; then
      code_match=1
      break
    fi
  done

  if [ "$code_match" -eq 1 ]; then
    echo -e "  ${GREEN}[PASS]${NC} $name"
    echo -e "        URL: $url"
    echo -e "        状态码: $http_code (期望: $allowed_codes)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} $name"
    echo -e "        URL: $url"
    echo -e "        状态码: $http_code (期望: $allowed_codes)"
    FAIL=$((FAIL + 1))
  fi
}

# ---- 主流程 ----
echo "======================================"
echo "  前端 SPA 路由冒烟测试"
echo "  FRONTEND_BASE_URL: $FRONTEND_BASE_URL"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# 1. /life/ 首页可达性
echo "[1/11] /life/ 首页 ..."
check_endpoint "/life/ 首页" "$FRONTEND_BASE_URL/" "200"

# 2. SPA 路由 - 问事
echo ""
echo "[2/11] SPA 路由 /life/question ..."
check_endpoint "SPA /life/question" "$FRONTEND_BASE_URL/question" "200"

# 3. SPA 路由 - 取名
echo ""
echo "[3/11] SPA 路由 /life/naming ..."
check_endpoint "SPA /life/naming" "$FRONTEND_BASE_URL/naming" "200"

# 4. SPA 路由 - 命运K线
echo ""
echo "[4/11] SPA 路由 /life/kline ..."
check_endpoint "SPA /life/kline" "$FRONTEND_BASE_URL/kline" "200"

# 5. SPA 路由 - 问事咨询
echo ""
echo "[5/11] SPA 路由 /life/consult ..."
check_endpoint "SPA /life/consult" "$FRONTEND_BASE_URL/consult" "200"

# 6. SPA 路由 - 潮汐
echo ""
echo "[6/11] SPA 路由 /life/tide ..."
check_endpoint "SPA /life/tide" "$FRONTEND_BASE_URL/tide" "200"

# 7. SPA 路由 - 历史记录
echo ""
echo "[7/11] SPA 路由 /life/history ..."
check_endpoint "SPA /life/history" "$FRONTEND_BASE_URL/history" "200"

# 8. SPA 路由 - 结果页
echo ""
echo "[8/11] SPA 路由 /life/result ..."
check_endpoint "SPA /life/result" "$FRONTEND_BASE_URL/result" "200"

# 9. SPA 路由 - 管理后台
echo ""
echo "[9/11] SPA 路由 /life/admin ..."
check_endpoint "SPA /life/admin" "$FRONTEND_BASE_URL/admin" "200"

# 10. 静态资源 - CSS
echo ""
echo "[10/11] 静态资源 CSS ..."
CSS_PATH=$(curl -s "$FRONTEND_BASE_URL/" 2>/dev/null | grep -oP 'href="[^"]*\.css"' | head -1 | sed 's/href="//;s/"//')
if [ -n "$CSS_PATH" ]; then
  # 处理相对路径和绝对路径
  case "$CSS_PATH" in
    http*) CSS_URL="$CSS_PATH" ;;
    /*) CSS_URL="http://localhost$CSS_PATH" ;;
    *) CSS_URL="$FRONTEND_BASE_URL/$CSS_PATH" ;;
  esac
  check_endpoint "静态资源 CSS" "$CSS_URL" "200"
else
  echo -e "  ${YELLOW}[SKIP]${NC} 未找到 CSS 引用（前端可能未部署）"
  FAIL=$((FAIL + 1))
fi

# 11. 静态资源 - JS
echo ""
echo "[11/11] 静态资源 JS ..."
JS_PATH=$(curl -s "$FRONTEND_BASE_URL/" 2>/dev/null | grep -oP 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
if [ -n "$JS_PATH" ]; then
  case "$JS_PATH" in
    http*) JS_URL="$JS_PATH" ;;
    /*) JS_URL="http://localhost$JS_PATH" ;;
    *) JS_URL="$FRONTEND_BASE_URL/$JS_PATH" ;;
  esac
  check_endpoint "静态资源 JS" "$JS_URL" "200"
else
  echo -e "  ${YELLOW}[SKIP]${NC} 未找到 JS 引用（前端可能未部署）"
  FAIL=$((FAIL + 1))
fi

# ---- 汇总 ----
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ 前端 SPA 路由测试失败，阻断部署${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 前端 SPA 路由测试全部通过${NC}"
exit 0
