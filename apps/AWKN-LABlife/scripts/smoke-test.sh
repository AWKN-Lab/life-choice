#!/bin/bash
# ==========================================
# 冒烟测试脚本 - 部署前置健康门禁
# 测试 5 个核心链路，任一失败则 exit 1
# 运行在阿里云服务器（Linux，LF 行尾）
# ==========================================

set -euo pipefail

# ---- 配置 ----
BASE_URL="${BASE_URL:-http://localhost:3000}"
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
# 检查 HTTP 状态码是否在允许的范围内
# 参数: $1=测试名称 $2=URL $3=允许的状态码（逗号分隔，如 "200" 或 "200,401,404"）
check_endpoint() {
  local name="$1"
  local url="$2"
  local allowed_codes="$3"
  local start_time end_time elapsed http_code

  start_time=$(date +%s%N)

  # -s 静默 -o 丢弃 body -w 输出 http_code --max-time 超时
  # 注意：curl 连接失败时 -w "%{http_code}" 仍会输出 "000"，所以用 || true 避免重复
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_TIMEOUT" "$url" 2>/dev/null) || true
  [ -z "$http_code" ] && http_code="000"

  end_time=$(date +%s%N)
  elapsed=$(( (end_time - start_time) / 1000000 ))  # 毫秒

  # 检查状态码是否在允许列表中
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
    echo -e "        状态码: $http_code (期望: $allowed_codes)  耗时: ${elapsed}ms"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} $name"
    echo -e "        URL: $url"
    echo -e "        状态码: $http_code (期望: $allowed_codes)  耗时: ${elapsed}ms"
    FAIL=$((FAIL + 1))
  fi
}

# ---- 主流程 ----
echo "======================================"
echo "  冒烟测试 (Smoke Test)"
echo "  BASE_URL: $BASE_URL"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# 1. 健康检查端点（核心：服务存活）
echo "[1/5] 健康检查 /api/v1/health ..."
check_endpoint "健康检查" "$BASE_URL/api/v1/health" "200"

# 2. 数据库连通性（Task 7 已修复：/health 实际 ping DB，/health/db 显式返回 DB 状态）
echo ""
echo "[2/5] 数据库连通性 /api/v1/health/db ..."
check_endpoint "数据库连通性" "$BASE_URL/api/v1/health/db" "200"

# 3. 咨询核心链路（公开接口：名人案例列表）
echo ""
echo "[3/5] 咨询链路 /api/v1/consult/celebrity-cases ..."
check_endpoint "咨询链路" "$BASE_URL/api/v1/consult/celebrity-cases" "200"

# 4. 支付链路（公开接口：订单状态查询，订单不存在返回 400/404，只要不是 5xx 即可）
echo ""
echo "[4/5] 支付链路 /api/v1/payment/status/smoke-test ..."
check_endpoint "支付链路" "$BASE_URL/api/v1/payment/status/smoke-test" "200,400,404"

# 5. 静态资源/根路径可达性（后端根路径返回 404 是正常的，只要不是 5xx）
echo ""
echo "[5/5] 根路径可达性 / ..."
check_endpoint "根路径可达性" "$BASE_URL/" "200,301,302,404"

# ---- 汇总 ----
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ 冒烟测试失败，阻断部署${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 冒烟测试全部通过${NC}"
exit 0
