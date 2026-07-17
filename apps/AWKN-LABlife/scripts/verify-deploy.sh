#!/bin/bash
# ==========================================
# verify-deploy.sh - 部署后必做 5 件套验证
# 来源：E232（部署后必做 4 验 + unstable_restarts=0 判稳）
# 创建：2026-06-27（P1-B+P2-B 部署故障后）
# 适用：人生决策宗师 / apps/AWKN-LABlife
# ==========================================
set -euo pipefail

# ---- 配置 ----
PORT_FRONTEND="${PORT_FRONTEND:-80}"
PORT_BACKEND="${PORT_BACKEND:-30000}"
SERVICE_NAME="${SERVICE_NAME:-awkn-life-backend}"
EXPECTED_TITLE="${EXPECTED_TITLE:-人生决策宗师}"

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---- 计数器 ----
PASS=0
FAIL=0

# ---- 工具函数 ----
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

check_pass() {
  echo -e "  ${GREEN}[PASS]${NC} $1"
  PASS=$((PASS + 1))
}

check_fail() {
  echo -e "  ${RED}[FAIL]${NC} $1"
  FAIL=$((FAIL + 1))
}

# ---- 主流程 ----
echo "======================================"
echo "  部署验证（5 件套）"
echo "  服务: $SERVICE_NAME"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# 1. HTML title
echo "[1/5] HTML title ..."
HTML=$(curl -s -m 5 "http://localhost:$PORT_FRONTEND/" 2>/dev/null || echo "")
if echo "$HTML" | grep -q "<title>$EXPECTED_TITLE</title>"; then
  check_pass "HTML title = '$EXPECTED_TITLE'"
else
  check_fail "HTML title 不匹配（期望: $EXPECTED_TITLE）"
fi

# 2. JS 哈希
echo ""
echo "[2/5] JS 哈希（防 dist 未同步）..."
if echo "$HTML" | grep -qE 'src="[^"]+-[A-Za-z0-9_-]{8,}\.js"'; then
  JS_HASH=$(echo "$HTML" | grep -oE 'src="[^"]+-[A-Za-z0-9_-]{8,}\.js"' | head -1)
  check_pass "JS 哈希存在: $JS_HASH"
else
  check_fail "JS 哈希缺失或格式错误"
fi

# 3. 健康检查
echo ""
echo "[3/5] 健康检查 ..."
HEALTH=$(curl -s -m 5 "http://localhost:$PORT_BACKEND/api/v1/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"code":0'; then
  check_pass "健康检查通过: $HEALTH"
else
  check_fail "健康检查失败: $HEALTH"
fi

# 4. API 路由（404 必须返回 404，不能是 500）
echo ""
echo "[4/5] API 路由（404 正确性）..."
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT_BACKEND/api/v1/__nonexistent__" 2>/dev/null || echo "000")
if [ "$STATUS" = "404" ]; then
  check_pass "API 路由返回 404（正确）"
else
  check_fail "API 路由返回 $STATUS（期望 404）"
fi

# 5. PM2 稳定（unstable_restarts 必须为 0）
echo ""
echo "[5/5] PM2 稳定（unstable_restarts）..."
if command -v pm2 &> /dev/null; then
  UNSTABLE=$(pm2 describe "$SERVICE_NAME" 2>/dev/null | grep 'unstable restarts' | awk '{print $4}' || echo "unknown")
  if [ "$UNSTABLE" = "0" ]; then
    check_pass "unstable_restarts = 0（稳定）"
  else
    check_fail "unstable_restarts = $UNSTABLE（崩溃-重启循环）"
  fi
else
  check_fail "pm2 命令不存在"
fi

# ---- 汇总 ----
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ 部署验证失败${NC}"
  echo -e "${YELLOW}建议操作：${NC}"
  echo "  1. 查看 PM2 日志: pm2 logs $SERVICE_NAME --nostream | tail -50"
  echo "  2. 查看 PM2 状态: pm2 list"
  echo "  3. 触发回滚: bash /opt/awkn-life/scripts/rollback.sh"
  exit 1
fi

echo -e "${GREEN}✅ 部署验证全部通过${NC}"
exit 0