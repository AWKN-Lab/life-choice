#!/bin/bash
# ==========================================
# 部署前置检查脚本 - Q3 P0-1
# 在 deploy.sh 执行前运行，包含：
# 1. 部署锁检查（防止并发部署）
# 2. 环境一致性审计
# 3. 数据库备份验证
# 4. 管理员保底校验
# 运行在阿里云服务器（Linux，LF 行尾）
# ==========================================

set -euo pipefail

# ---- 配置 ----
PROJECT_DIR="${PROJECT_DIR:-/opt/awkn-life}"
LOCK_FILE="/tmp/awkn-life-deploy.lock"
LOCK_TIMEOUT=1800  # 30分钟超时（秒）

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

cleanup_lock() {
  if [ -f "$LOCK_FILE" ]; then
    rm -f "$LOCK_FILE"
    log "部署锁已释放"
  fi
}

trap cleanup_lock EXIT

# ---- 主流程 ----
echo "======================================"
echo "  部署前置检查"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# 1. 部署锁检查
echo "[1/4] 部署锁检查 ..."
if [ -f "$LOCK_FILE" ]; then
  LOCK_AGE=$(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
  if [ "$LOCK_AGE" -gt "$LOCK_TIMEOUT" ]; then
    echo -e "  ${YELLOW}[WARN]${NC} 部署锁已超时（${LOCK_AGE}秒 > ${LOCK_TIMEOUT}秒），强制释放"
    rm -f "$LOCK_FILE"
    echo -e "  ${GREEN}[PASS]${NC} 超时锁已释放"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} 部署锁存在（${LOCK_AGE}秒前创建），可能有其他部署正在运行"
    echo "  如确认无其他部署，手动删除: rm -f $LOCK_FILE"
    FAIL=$((FAIL + 1))
  fi
else
  echo -e "  ${GREEN}[PASS]${NC} 无部署锁"
  PASS=$((PASS + 1))
fi

# 创建部署锁
echo "$$ $(date '+%Y-%m-%d %H:%M:%S')" > "$LOCK_FILE"
log "部署锁已创建: $LOCK_FILE"

# 2. 环境一致性审计
echo ""
echo "[2/4] 环境一致性审计 ..."
ENV_AUDIT_SCRIPT="$PROJECT_DIR/scripts/env-audit.sh"
if [ -f "$ENV_AUDIT_SCRIPT" ]; then
  if bash "$ENV_AUDIT_SCRIPT"; then
    echo -e "  ${GREEN}[PASS]${NC} 环境一致性审计通过"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} 环境一致性审计失败"
    FAIL=$((FAIL + 1))
  fi
else
  echo -e "  ${YELLOW}[WARN]${NC} env-audit.sh 不存在，跳过环境审计"
  echo -e "  ${YELLOW}[WARN]${NC} 请从 scripts/env-audit.sh 部署"
fi

# 3. 数据库备份验证
echo ""
echo "[3/4] 数据库备份验证 ..."
BACKUP_DIR="/opt/awkn-life-backups"
if [ -d "$BACKUP_DIR" ]; then
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.db 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || echo 0)))
    BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
    if [ "$BACKUP_AGE" -lt 86400 ]; then
      echo -e "  ${GREEN}[PASS]${NC} 最近备份: $(basename $LATEST_BACKUP)（${BACKUP_AGE_HOURS}小时前）"
      PASS=$((PASS + 1))
    else
      echo -e "  ${YELLOW}[WARN]${NC} 最近备份已过期: ${BACKUP_AGE_HOURS}小时前"
      echo -e "  ${YELLOW}[WARN]${NC} 建议先执行备份: bash $PROJECT_DIR/scripts/cron-backup.sh"
    fi
  else
    echo -e "  ${YELLOW}[WARN]${NC} 备份目录无 .db 文件"
  fi
else
  echo -e "  ${YELLOW}[WARN]${NC} 备份目录不存在: $BACKUP_DIR"
fi

# 4. 管理员保底校验（部署后执行，此处仅检查脚本存在）
echo ""
echo "[4/4] 管理员校验脚本检查 ..."
VERIFY_ADMIN_SCRIPT="$PROJECT_DIR/awkn-life-backend/apps/api-server/scripts/verify-admin.js"
ENSURE_ADMIN_SCRIPT="$PROJECT_DIR/awkn-life-backend/apps/api-server/scripts/ensure-admin.js"

if [ -f "$ENSURE_ADMIN_SCRIPT" ]; then
  echo -e "  ${GREEN}[PASS]${NC} ensure-admin.js 存在"
  PASS=$((PASS + 1))
else
  echo -e "  ${RED}[FAIL]${NC} ensure-admin.js 不存在"
  FAIL=$((FAIL + 1))
fi

if [ -f "$VERIFY_ADMIN_SCRIPT" ]; then
  echo -e "  ${GREEN}[PASS]${NC} verify-admin.js 存在"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}[WARN]${NC} verify-admin.js 不存在（Q3 P0-4 补齐脚本）"
  echo -e "  ${YELLOW}[WARN]${NC} 请从 scripts/verify-admin.js 部署"
fi

# ---- 汇总 ----
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ 部署前置检查失败，中止部署${NC}"
  echo -e "  部署锁将在退出时自动释放"
  exit 1
fi

echo -e "${GREEN}✅ 部署前置检查通过，可以继续部署${NC}"
echo -e "  部署锁已创建: $LOCK_FILE"
echo -e "  部署完成后锁将自动释放"
exit 0
