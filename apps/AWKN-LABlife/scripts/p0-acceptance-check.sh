#!/bin/bash
# ==========================================
# P0 最小可验收清单脚本 (p0-acceptance-check.sh)
# 版本: v1 (2026-06-26)
#
# 目的：把 P0-1/P0-2/P0-3 已验收通过的检查项固化为可重复执行的清单
#       每次部署后 5 分钟内一键验证生产是否健康
#
# 覆盖项：
#   P0-1 LLM 供应链：health/ready 的 llmProvider + health/llm 的 provider 配置
#   P0-2 三主链：    问事链(consult/celebrity-cases) + K线链(kline-tide/bars)
#   P0-3 构建产物：  health/ready 的 assets/pythonCli/knowledgeService + degradations
#
# 用法：
#   ssh aliyun-awkn "bash /opt/awkn-life/scripts/p0-acceptance-check.sh"
#   或本地：bash scripts/p0-acceptance-check.sh
#
# 退出码：0=全 PASS，1=任一 FAIL
# ==========================================

set -uo pipefail

# ---- 配置 ----
# P3 (2026-06-26): 默认端口改为 30000（与 Nginx proxy_pass 对齐）
# 之前默认 3000，但 P0-1 修复后 .env.prod 的 PORT=30000，导致脚本连不上
BASE_URL="${BASE_URL:-http://localhost:30000}"
CURL_TIMEOUT=10

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ---- 计数器 ----
PASS=0
FAIL=0
WARN=0

# ---- 工具函数 ----
log_pass() { echo -e "  ${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); }
log_fail() { echo -e "  ${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }
log_warn() { echo -e "  ${YELLOW}[WARN]${NC} $1"; WARN=$((WARN + 1)); }

# 获取 HTTP 状态码（不输出 body）
http_code() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_TIMEOUT" "$url" 2>/dev/null) || true
  [ -z "$code" ] && code="000"
  echo "$code"
}

# 获取 HTTP body（用于解析 JSON）
http_body() {
  local url="$1"
  curl -s --max-time "$CURL_TIMEOUT" "$url" 2>/dev/null || echo ""
}

# ---- 主流程 ----
echo "======================================"
echo "  P0 最小可验收清单 (v1)"
echo "  BASE_URL: $BASE_URL"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# ==========================================
# 检查 1: /api/v1/health/ready 返回 200 且 status != "down"
# 对应 P0-3 Step5：构建产物完整性 + 降级标志位
# ==========================================
echo "[1/5] /api/v1/health/ready 就绪探针 ..."
READY_CODE=$(http_code "$BASE_URL/api/v1/health/ready")
READY_BODY=$(http_body "$BASE_URL/api/v1/health/ready")

if [ "$READY_CODE" = "200" ]; then
  # 解析 status 字段（用 grep + sed 避免依赖 jq）
  READY_STATUS=$(echo "$READY_BODY" | grep -o '"status":"[^"]*"' | head -1 | sed 's/"status":"//;s/"//')
  if [ "$READY_STATUS" = "ok" ] || [ "$READY_STATUS" = "degraded" ]; then
    log_pass "health/ready 返回 200, status=$READY_STATUS"
  else
    log_fail "health/ready 返回 200 但 status=\"$READY_STATUS\"（期望 ok/degraded）"
  fi
else
  log_fail "health/ready 返回 $READY_CODE（期望 200）"
fi

# 显示降级项（非致命，仅提示）
DEGRADATIONS=$(echo "$READY_BODY" | grep -o '"degradations":\[[^]]*\]' | head -1)
if [ -n "$DEGRADATIONS" ] && [ "$DEGRADATIONS" != '"degradations":[]' ]; then
  log_warn "降级项: $DEGRADATIONS（非致命，前端应读此数组提示用户）"
fi

# ==========================================
# 检查 2: llmProvider 检查项 = ok
# 对应 P0-1：LLM 供应链稳定化（按 DEFAULT_LLM_PROVIDER 动态校验）
# ==========================================
echo ""
echo "[2/5] llmProvider 配置检查 ..."
LLM_PROVIDER_STATUS=$(echo "$READY_BODY" | grep -o '"llmProvider":{"status":"[^"]*"' | head -1 | sed 's/.*"status":"//;s/"//')
if [ "$LLM_PROVIDER_STATUS" = "ok" ]; then
  log_pass "llmProvider=ok（按 DEFAULT_LLM_PROVIDER 动态校验对应 API Key）"
else
  log_fail "llmProvider=\"$LLM_PROVIDER_STATUS\"（期望 ok，检查 DEFAULT_LLM_PROVIDER 与对应 API Key）"
fi

# ==========================================
# 检查 3: /api/v1/health/llm 显示 provider 配置
# 对应 P0-1：LLM provider 链路（deepseek-direct 主 + sensenova 备）
# ==========================================
echo ""
echo "[3/5] /api/v1/health/llm provider 链路 ..."
LLM_HEALTH_CODE=$(http_code "$BASE_URL/api/v1/health/llm")
if [ "$LLM_HEALTH_CODE" = "200" ]; then
  LLM_HEALTH_BODY=$(http_body "$BASE_URL/api/v1/health/llm")
  # 检查 rateLimits 中是否含 deepseek-direct（主 provider）
  if echo "$LLM_HEALTH_BODY" | grep -q '"deepseek-direct"'; then
    log_pass "health/llm 返回 200，含 deepseek-direct provider 配置"
  else
    log_fail "health/llm 返回 200 但未找到 deepseek-direct provider"
  fi
else
  log_fail "health/llm 返回 $LLM_HEALTH_CODE（期望 200）"
fi

# ==========================================
# 检查 4: 问事链可达（consult/celebrity-cases）
# 对应 P0-2：问事链 E2E 验收（轻量级：仅检查端点可达）
# ==========================================
echo ""
echo "[4/5] 问事链 /api/v1/consult/celebrity-cases ..."
CONSULT_CODE=$(http_code "$BASE_URL/api/v1/consult/celebrity-cases")
if [ "$CONSULT_CODE" = "200" ]; then
  log_pass "问事链可达（celebrity-cases 返回 200）"
else
  log_fail "问事链不可达（celebrity-cases 返回 $CONSULT_CODE，期望 200）"
fi

# ==========================================
# 检查 5: K线链可达（kline-tide/bars）
# 对应 P0-2：命运K线链 E2E 验收（轻量级：仅检查端点可达）
# 注：kline-tide/bars 需鉴权，401=端点存在但需登录，也算可达
# ==========================================
echo ""
echo "[5/5] K线链 /api/v1/kline-tide/bars ..."
KLINE_CODE=$(http_code "$BASE_URL/api/v1/kline-tide/bars")
if [ "$KLINE_CODE" = "200" ] || [ "$KLINE_CODE" = "401" ]; then
  log_pass "K线链可达（kline-tide/bars 返回 $KLINE_CODE，端点已注册）"
else
  log_fail "K线链不可达（kline-tide/bars 返回 $KLINE_CODE，期望 200/401）"
fi

# ---- 汇总 ----
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}  ${YELLOW}WARN=$WARN${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ P0 验收失败，存在 $FAIL 个 FAIL 项${NC}"
  echo ""
  echo "排查建议："
  echo "  1. 查 PM2 状态: pm2 status awkn-life-backend"
  echo "  2. 查启动日志: pm2 logs awkn-life-backend --lines 50 --nostream"
  echo "  3. 查 preflight: 看日志中 [preflight] FAILED 行"
  echo "  4. 查 LLM 配置: 确认 .env.prod 含 DEFAULT_LLM_PROVIDER + DEEPSEEK_DIRECT_API_KEY"
  exit 1
fi

echo -e "${GREEN}✅ P0 最小可验收清单全部通过${NC}"
if [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}   （含 $WARN 个 WARN 降级项，非致命）${NC}"
fi
exit 0
