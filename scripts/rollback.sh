#!/bin/bash
# ==========================================
# P0 回滚脚本
# 回滚策略：从备份点恢复 代码 + DB + .env.prod，重启服务
# 备份点由 deploy.sh 创建，路径记录在 /opt/awkn-life-backups/last-backup-point
# 运行在阿里云服务器（Linux，LF 行尾）
# ==========================================

set -euo pipefail

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---- 配置 ----
PROJECT_DIR="/opt/awkn-life"
BACKEND_DIR="$PROJECT_DIR/awkn-life-backend"
API_SERVER_DIR="$BACKEND_DIR/apps/api-server"
PRISMA_DIR="$API_SERVER_DIR/prisma"
FRONTEND_DIR="/www/wwwroot/awkn-lab/life"

BACKUP_INDEX_FILE="/opt/awkn-life-backups/last-backup-point"
LOG_FILE="/var/log/awkn-rollback.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

PM2_PROCESS="awkn-life-backend"
SMOKE_TEST_SCRIPT="$PROJECT_DIR/scripts/smoke-test.sh"
HEALTH_CHECK_SCRIPT="$PROJECT_DIR/scripts/health-check.sh"

# ---- 工具函数 ----
log() {
  local level="$1"
  shift
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE" 2>/dev/null || true
}

# ---- 主流程 ----
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

echo "======================================"
echo "  P0 回滚脚本"
echo "  时间: $TIMESTAMP"
echo "======================================"
log "INFO" "==== 回滚开始 ===="

# 1. 确定备份点路径（支持参数传入，默认读 last-backup-point）
BACKUP_POINT="${1:-}"
if [ -z "$BACKUP_POINT" ]; then
  if [ ! -f "$BACKUP_INDEX_FILE" ]; then
    log "ERROR" "无可用备份点（$BACKUP_INDEX_FILE 不存在）"
    echo -e "${RED}❌ 无可用备份点${NC}"
    echo "  请通过参数指定备份点: bash rollback.sh /opt/awkn-life-backup-YYYYMMDD_HHMMSS"
    exit 1
  fi
  BACKUP_POINT=$(cat "$BACKUP_INDEX_FILE")
fi

# 去除可能的空白字符
BACKUP_POINT=$(echo "$BACKUP_POINT" | tr -d '[:space:]')

# 校验备份点存在
if [ ! -d "$BACKUP_POINT" ]; then
  log "ERROR" "备份点目录不存在: $BACKUP_POINT"
  echo -e "${RED}❌ 备份点目录不存在: $BACKUP_POINT${NC}"
  exit 1
fi

log "INFO" "使用备份点: $BACKUP_POINT"
echo -e "${YELLOW}📦 使用备份点: $BACKUP_POINT${NC}"

# 2. 校验备份点关键内容
if [ ! -d "$BACKUP_POINT/awkn-life-backend" ]; then
  log "ERROR" "备份点缺少 awkn-life-backend 目录: $BACKUP_POINT/awkn-life-backend"
  echo -e "${RED}❌ 备份点缺少 awkn-life-backend 目录${NC}"
  exit 1
fi

# 3. 确认回滚
echo ""
echo -e "${YELLOW}⚠️ 警告：此操作将回滚到备份点 $BACKUP_POINT${NC}"
echo "回滚内容："
echo "  - 后端代码: $BACKUP_POINT/awkn-life-backend → $BACKEND_DIR"
[ -d "$BACKUP_POINT/prisma" ] && echo "  - 数据库:   $BACKUP_POINT/prisma/*.db → $PRISMA_DIR/"
[ -f "$BACKUP_POINT/.env.prod" ] && echo "  - .env:    $BACKUP_POINT/.env.prod → $API_SERVER_DIR/.env.prod"
[ -d "$BACKUP_POINT/app/dist" ] && echo "  - 前端:    $BACKUP_POINT/app/dist → $FRONTEND_DIR"
echo ""
read -p "确认回滚？(y/N): " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  log "INFO" "用户取消回滚"
  echo "取消回滚"
  exit 0
fi

# 4. 停止服务
echo ""
echo "[1/7] 停止服务..."
log "INFO" "停止 PM2 进程: $PM2_PROCESS"
pm2 stop "$PM2_PROCESS" 2>/dev/null || {
  log "WARN" "PM2 进程 $PM2_PROCESS 停止失败（可能未运行）"
  echo -e "  ${YELLOW}⚠️ PM2 进程 $PM2_PROCESS 停止失败（可能未运行）${NC}"
}
echo -e "  ${GREEN}✅ 服务已停止${NC}"

# 5. 恢复后端代码
echo ""
echo "[2/7] 恢复后端代码..."
log "INFO" "恢复后端代码: $BACKUP_POINT/awkn-life-backend → $BACKEND_DIR"

# 先备份当前后端代码（便于二次回滚）
if [ -d "$BACKEND_DIR" ]; then
  cp -r "$BACKEND_DIR" "/tmp/awkn-life-backend-pre-rollback-$TIMESTAMP"
  log "INFO" "当前后端代码已备份到 /tmp/awkn-life-backend-pre-rollback-$TIMESTAMP"
  echo -e "  ${YELLOW}📦 当前后端代码已备份到 /tmp/awkn-life-backend-pre-rollback-$TIMESTAMP${NC}"
fi

rm -rf "$BACKEND_DIR"
cp -r "$BACKUP_POINT/awkn-life-backend" "$BACKEND_DIR"
log "INFO" "后端代码已恢复"
echo -e "  ${GREEN}✅ 后端代码已恢复${NC}"

# 6. 恢复 .env.prod
echo ""
echo "[3/7] 恢复 .env.prod..."
if [ -f "$BACKUP_POINT/.env.prod" ]; then
  log "INFO" "恢复 .env.prod: $BACKUP_POINT/.env.prod → $API_SERVER_DIR/.env.prod"
  cp "$BACKUP_POINT/.env.prod" "$API_SERVER_DIR/.env.prod"
  log "INFO" ".env.prod 已恢复"
  echo -e "  ${GREEN}✅ .env.prod 已恢复${NC}"
else
  log "WARN" "备份点无 .env.prod，保留当前 .env.prod"
  echo -e "  ${YELLOW}⚠️ 备份点无 .env.prod，保留当前 .env.prod${NC}"
fi

# 7. 恢复数据库
echo ""
echo "[4/7] 恢复数据库..."
if [ -d "$BACKUP_POINT/prisma" ]; then
  mkdir -p "$PRISMA_DIR"
  # 备份当前数据库（便于二次回滚）
  for db_file in "$PRISMA_DIR"/*.db; do
    [ -f "$db_file" ] || continue
    cp "$db_file" "/tmp/$(basename "$db_file")-pre-rollback-$TIMESTAMP" 2>/dev/null || true
    log "INFO" "当前数据库已备份: /tmp/$(basename "$db_file")-pre-rollback-$TIMESTAMP"
  done

  # 恢复备份点的数据库
  restored_count=0
  for db_file in "$BACKUP_POINT/prisma"/*.db; do
    [ -f "$db_file" ] || continue
    local_db="$PRISMA_DIR/$(basename "$db_file")"
    log "INFO" "恢复数据库: $db_file → $local_db"
    cp "$db_file" "$local_db"
    echo -e "  ${GREEN}✅ 数据库已恢复: $(basename "$db_file")${NC}"
    restored_count=$((restored_count + 1))
  done

  if [ "$restored_count" -eq 0 ]; then
    log "WARN" "备份点 prisma 目录无 .db 文件"
    echo -e "  ${YELLOW}⚠️ 备份点 prisma 目录无 .db 文件${NC}"
  fi
else
  log "WARN" "备份点无 prisma 目录，跳过数据库恢复"
  echo -e "  ${YELLOW}⚠️ 备份点无 prisma 目录，跳过数据库恢复${NC}"
fi

# 8. 恢复前端（可选，如果备份点有 app/dist）
echo ""
echo "[5/7] 恢复前端..."
if [ -d "$BACKUP_POINT/app/dist" ]; then
  log "INFO" "恢复前端: $BACKUP_POINT/app/dist → $FRONTEND_DIR"
  if [ -d "$FRONTEND_DIR" ]; then
    cp -r "$FRONTEND_DIR" "/tmp/life-pre-rollback-$TIMESTAMP" 2>/dev/null || true
    log "INFO" "当前前端已备份到 /tmp/life-pre-rollback-$TIMESTAMP"
    rm -rf "$FRONTEND_DIR"/*
  else
    mkdir -p "$FRONTEND_DIR"
  fi
  cp -r "$BACKUP_POINT/app/dist"/* "$FRONTEND_DIR"/ 2>/dev/null || true
  chown -R www:www "$FRONTEND_DIR" 2>/dev/null || true
  log "INFO" "前端已恢复"
  echo -e "  ${GREEN}✅ 前端已恢复${NC}"
else
  log "INFO" "备份点无 app/dist，跳过前端恢复"
  echo -e "  ${YELLOW}⚠️ 备份点无 app/dist，跳过前端恢复${NC}"
fi

# 9. 安装依赖 + Prisma generate
echo ""
echo "[6/7] 安装依赖..."
log "INFO" "安装后端依赖"
cd "$BACKEND_DIR"
npm ci --legacy-peer-deps 2>&1 | tail -3
log "INFO" "生成 Prisma Client"
cd "$API_SERVER_DIR"
npx prisma generate 2>&1 | tail -3
echo -e "  ${GREEN}✅ 依赖已安装${NC}"

# 10. 重启服务
echo ""
echo "[7/7] 重启服务..."
log "INFO" "重启 PM2 进程: $PM2_PROCESS"
pm2 restart "$PM2_PROCESS" 2>/dev/null || {
  log "WARN" "PM2 restart 失败，尝试 pm2 start"
  pm2 start "$BACKEND_DIR/ecosystem.config.js" --env production
}
pm2 save
log "INFO" "服务已重启"
echo -e "  ${GREEN}✅ 服务已重启${NC}"

# 11. 执行 smoke-test
echo ""
echo "🩺 执行冒烟测试..."
sleep 5
if [ -f "$SMOKE_TEST_SCRIPT" ]; then
  log "INFO" "执行 smoke-test: $SMOKE_TEST_SCRIPT"
  if bash "$SMOKE_TEST_SCRIPT"; then
    log "INFO" "冒烟测试通过"
    echo -e "${GREEN}✅ 冒烟测试通过${NC}"
  else
    log "ERROR" "冒烟测试失败"
    echo -e "${RED}❌ 冒烟测试失败，请手动检查${NC}"
    echo -e "  手动验证: bash $HEALTH_CHECK_SCRIPT"
    exit 1
  fi
else
  log "WARN" "smoke-test.sh 不存在: $SMOKE_TEST_SCRIPT"
  echo -e "  ${YELLOW}⚠️ smoke-test.sh 不存在，跳过冒烟测试${NC}"
  echo -e "  手动验证: bash $HEALTH_CHECK_SCRIPT"
fi

# ---- 完成 ----
echo ""
echo -e "${GREEN}======================================"
echo "  回滚完成!"
echo "======================================${NC}"
log "INFO" "==== 回滚结束 (成功) ===="
log "INFO" "备份点: $BACKUP_POINT"
log "INFO" "回滚前代码备份: /tmp/awkn-life-backend-pre-rollback-$TIMESTAMP"
echo ""
echo "  回滚日志: $LOG_FILE"
echo "  验证: bash $HEALTH_CHECK_SCRIPT"
