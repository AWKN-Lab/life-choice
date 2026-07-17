#!/bin/bash
# ==========================================
# rollback.sh - 部署失败回滚脚本
# 从 last-backup-point 恢复后端代码/前端产物/.env.prod/数据库
# 运行在阿里云服务器（Linux，LF 行尾）
# ==========================================
set -euo pipefail

# ---- 配置 ----
PROJECT_DIR="${PROJECT_DIR:-/opt/awkn-life}"
BACKUP_INDEX_DIR="/opt/awkn-life-backups"
LAST_BACKUP_POINT_FILE="$BACKUP_INDEX_DIR/last-backup-point"

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ---- 检查备份点 ----
if [ ! -f "$LAST_BACKUP_POINT_FILE" ]; then
  echo -e "${RED}❌ 无备份点记录: $LAST_BACKUP_POINT_FILE 不存在${NC}"
  echo "  无法自动回滚，请手动检查 /opt/awkn-life-backup-* 目录"
  exit 1
fi

BACKUP_POINT=$(cat "$LAST_BACKUP_POINT_FILE")

if [ ! -d "$BACKUP_POINT" ]; then
  echo -e "${RED}❌ 备份点目录不存在: $BACKUP_POINT${NC}"
  exit 1
fi

echo "======================================"
echo "  部署失败回滚"
echo "  备份点: $BACKUP_POINT"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

# ---- 1. 停止 PM2 服务 ----
echo ""
echo -e "${YELLOW}[1/5] 停止 PM2 服务...${NC}"
pm2 delete awkn-life-backend 2>/dev/null || true
echo -e "  ${GREEN}✅ PM2 服务已停止${NC}"

# ---- 2. 恢复后端代码 ----
echo ""
echo -e "${YELLOW}[2/5] 恢复后端代码...${NC}"
if [ -d "$BACKUP_POINT/awkn-life-backend" ]; then
  rm -rf "$PROJECT_DIR/awkn-life-backend"
  cp -r "$BACKUP_POINT/awkn-life-backend" "$PROJECT_DIR/awkn-life-backend"
  echo -e "  ${GREEN}✅ 后端代码已恢复${NC}"
else
  echo -e "  ${YELLOW}⚠️ 备份点无后端代码，跳过${NC}"
fi

# ---- 3. 恢复前端构建产物 ----
echo ""
echo -e "${YELLOW}[3/5] 恢复前端构建产物...${NC}"
if [ -d "$BACKUP_POINT/app/dist" ]; then
  rm -rf "$PROJECT_DIR/app/dist"
  mkdir -p "$PROJECT_DIR/app"
  cp -r "$BACKUP_POINT/app/dist" "$PROJECT_DIR/app/dist"
  echo -e "  ${GREEN}✅ 前端构建产物已恢复${NC}"
else
  echo -e "  ${YELLOW}⚠️ 备份点无前端产物，跳过${NC}"
fi

# ---- 4. 恢复 .env.prod ----
echo ""
echo -e "${YELLOW}[4/5] 恢复 .env.prod...${NC}"
if [ -f "$BACKUP_POINT/.env.prod" ]; then
  cp "$BACKUP_POINT/.env.prod" "$PROJECT_DIR/awkn-life-backend/apps/api-server/.env.prod"
  echo -e "  ${GREEN}✅ .env.prod 已恢复${NC}"
else
  echo -e "  ${YELLOW}⚠️ 备份点无 .env.prod，跳过${NC}"
fi

# ---- 5. 恢复数据库 ----
echo ""
echo -e "${YELLOW}[5/5] 恢复数据库...${NC}"
BACKUP_DB_DIR="$BACKUP_POINT/prisma"
PROD_DB="$PROJECT_DIR/awkn-life-backend/apps/api-server/prisma/prod.db"
DEV_DB="$PROJECT_DIR/awkn-life-backend/apps/api-server/prisma/dev.db"

if [ -d "$BACKUP_DB_DIR" ]; then
  BACKUP_DB=$(ls "$BACKUP_DB_DIR"/*.db 2>/dev/null | head -1)
  if [ -n "$BACKUP_DB" ]; then
    # 检测目标数据库（prod.db 优先）
    TARGET_DB=""
    if [ -f "$PROD_DB" ]; then
      TARGET_DB="$PROD_DB"
    elif [ -f "$DEV_DB" ]; then
      TARGET_DB="$DEV_DB"
    else
      TARGET_DB="$PROD_DB"
    fi

    # 使用 sqlite3 恢复（原子操作）
    if command -v sqlite3 &> /dev/null; then
      sqlite3 "$TARGET_DB" ".restore '$BACKUP_DB'"
      echo -e "  ${GREEN}✅ 数据库已恢复（sqlite3 .restore）: $(basename $BACKUP_DB) → $(basename $TARGET_DB)${NC}"
    else
      cp "$BACKUP_DB" "$TARGET_DB"
      echo -e "  ${GREEN}✅ 数据库已恢复（cp）: $(basename $BACKUP_DB) → $(basename $TARGET_DB)${NC}"
    fi
  else
    echo -e "  ${YELLOW}⚠️ 备份点无数据库文件，跳过${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠️ 备份点无 prisma 目录，跳过${NC}"
fi

# ---- 重新安装依赖 + 启动 ----
echo ""
echo -e "${YELLOW}重新安装依赖...${NC}"
cd "$PROJECT_DIR/awkn-life-backend"
npm ci --legacy-peer-deps 2>&1 | tail -3

cd apps/api-server
npx prisma generate 2>&1 | tail -3

echo ""
echo -e "${YELLOW}启动 PM2 服务...${NC}"
pm2 start "$PROJECT_DIR/awkn-life-backend/ecosystem.config.js" --env production
pm2 save

# ---- 烟测 ----
echo ""
echo -e "${YELLOW}回滚后烟测...${NC}"
sleep 3
for i in $(seq 1 15); do
  if curl -fsS http://localhost:3000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 回滚后烟测通过（${i}/15 次）${NC}"
    echo ""
    echo "======================================"
    echo -e "  ${GREEN}回滚完成！${NC}"
    echo "  服务已恢复到备份点: $BACKUP_POINT"
    echo "======================================"
    exit 0
  fi
  sleep 2
done

echo -e "${RED}❌ 回滚后烟测失败，服务可能不可用${NC}"
echo "  请手动检查: pm2 logs awkn-life-backend --lines 50"
exit 1
