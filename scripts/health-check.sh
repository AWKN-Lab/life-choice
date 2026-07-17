#!/bin/bash
# ==========================================
# P0 健康检查脚本
# 验证生产基线收口是否完成
# 运行在阿里云服务器
# ==========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name=$1
  local result=$2
  if [ "$result" = "PASS" ]; then
    echo -e "  ${GREEN}[PASS]${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "======================================"
echo "  P0 健康检查"
echo "======================================"

# 1. 后端健康
echo ""
echo "[1/9] 后端健康检查..."
if curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  check "后端 /api/v1/health" "PASS"
else
  check "后端 /api/v1/health" "FAIL"
fi

# 2. 数据库连接
echo "[2/9] 数据库连接检查..."
DB_INFO=$(curl -sf http://localhost:3000/api/v1/health/db 2>/dev/null || echo '{}')
DB_STATUS=$(echo "$DB_INFO" | python3 -c "import sys,json;print(json.load(sys.stdin).get('db',''))" 2>/dev/null || echo "")
if [ "$DB_STATUS" = "connected" ]; then
  DB_PROVIDER=$(echo "$DB_INFO" | python3 -c "import sys,json;print(json.load(sys.stdin).get('provider','unknown'))" 2>/dev/null || echo "unknown")
  check "数据库连接正常 (provider=$DB_PROVIDER)" "PASS"
else
  check "数据库连接异常 (db=$DB_STATUS)" "FAIL"
fi

# 3. 管理员保底
echo "[3/9] 管理员保底检查..."
if [ -n "$ADMIN_PASSWORD" ]; then
  ADMIN_CHECK=$(curl -sf -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"10919669","password":"'"$ADMIN_PASSWORD"'"}' 2>/dev/null || echo '{}')
  IS_ADMIN=$(echo "$ADMIN_CHECK" | python3 -c "import sys,json;print(json.load(sys.stdin).get('user',{}).get('isAdmin',False))" 2>/dev/null || echo "False")
  if [ "$IS_ADMIN" = "True" ] || [ "$IS_ADMIN" = "true" ]; then
    check "管理员 isAdmin=true" "PASS"
  else
    check "管理员 isAdmin!=true (got: $IS_ADMIN)" "FAIL"
  fi
else
  check "管理员保底 (ADMIN_PASSWORD 未设置，跳过)" "PASS"
fi

# 4. PM2 进程
echo "[4/9] PM2 进程检查..."
if pm2 show awkn-life-backend > /dev/null 2>&1; then
  CWD=$(pm2 show awkn-life-backend 2>/dev/null | grep "exec cwd" | awk '{print $NF}')
  if [ -z "$CWD" ] || [ "$CWD" = "│" ]; then
    CWD="/opt/awkn-life/awkn-life-backend"
  fi
  check "PM2 进程运行中 (cwd=$CWD)" "PASS"
else
  check "PM2 进程未运行" "FAIL"
fi

# 5. 前端可达
echo "[5/9] 前端可达检查..."
if curl -sf http://localhost/life/ > /dev/null 2>&1; then
  check "前端 /life/ 可达" "PASS"
else
  check "前端 /life/ 不可达" "FAIL"
fi

# 6. 前端版本
echo "[6/9] 前端版本检查..."
BUNDLE=$(curl -sf http://localhost/life/ 2>/dev/null | grep -oE 'assets/index-[a-zA-Z0-9_-]+\.js' | head -1 || echo "")
if [ -n "$BUNDLE" ]; then
  check "前端 bundle: $BUNDLE" "PASS"
else
  # Fallback: check if index.html exists and has any JS references
  HAS_JS=$(curl -sf http://localhost/life/ 2>/dev/null | grep -c '<script' || echo "0")
  if [ "$HAS_JS" -gt 0 ]; then
    check "前端 JS 引用存在 ($HAS_JS 个 script 标签)" "PASS"
  else
    check "前端 bundle 未检测到" "FAIL"
  fi
fi

# 7. 数据库文件一致性
echo "[7/9] 数据库文件一致性检查..."
if [ -n "$CWD" ]; then
  # P0-1: 生产环境用 prod.db，开发用 dev.db
  if echo "$DB_URL" | grep -q "prod"; then
    EXPECTED_DB="$CWD/prisma/prod.db"
  else
    EXPECTED_DB="$CWD/prisma/dev.db"
  fi
  if [ -f "$EXPECTED_DB" ]; then
    SIZE=$(stat -c%s "$EXPECTED_DB" 2>/dev/null || echo "0")
    check "数据库文件存在 ($EXPECTED_DB, ${SIZE}B)" "PASS"
  else
    check "数据库文件不存在: $EXPECTED_DB" "FAIL"
  fi
fi

# 8. P0-1: SQLite WAL 模式检查
echo "[8/9] SQLite WAL 模式检查..."
if [ -n "$EXPECTED_DB" ] && [ -f "$EXPECTED_DB" ] && command -v sqlite3 &> /dev/null; then
  JOURNAL_MODE=$(sqlite3 "$EXPECTED_DB" "PRAGMA journal_mode" 2>/dev/null || echo "unknown")
  if [ "$JOURNAL_MODE" = "wal" ]; then
    check "SQLite WAL 模式已启用" "PASS"
  else
    check "SQLite WAL 模式未启用 (当前: $JOURNAL_MODE)" "FAIL"
  fi
else
  check "SQLite WAL 检查 (sqlite3 未安装或数据库不存在，跳过)" "PASS"
fi

# 9. LLM 健康检查
echo "[9/9] LLM Provider 健康检查..."
LLM_HEALTH=$(curl -sf --max-time 15 http://localhost:3000/api/v1/health/llm 2>/dev/null || echo "UNREACHABLE")
if [ "$LLM_HEALTH" != "UNREACHABLE" ]; then
  LLM_STATUS=$(echo "$LLM_HEALTH" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('status','') or d.get('llm',''))" 2>/dev/null || echo "")
  if [ "$LLM_STATUS" = "ok" ] || [ "$LLM_STATUS" = "connected" ]; then
    check "LLM Provider 可用" "PASS"
  else
    check "LLM Provider 异常 (status=$LLM_STATUS)" "FAIL"
  fi
else
  check "LLM 健康检查不可达（可能超时）" "FAIL"
fi

# 汇总
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
