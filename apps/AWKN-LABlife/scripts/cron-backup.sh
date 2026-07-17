#!/bin/bash
# ==========================================
# SQLite 数据库定时备份脚本（cron 触发）
# - 备份 SQLite 到 /opt/awkn-life-backups/awkn-life-YYYYMMDD-HHMMSS.db
# - 优先使用 sqlite3 .backup（原子操作），回退 cp
# - 保留最近 30 份
# - 失败时发送告警（webhook / 邮件占位）
# - 日志写入 /var/log/awkn-backup.log
# 运行环境：Linux 服务器（阿里云 Ubuntu 22.04）
# ==========================================

set -euo pipefail

# ---------- 配置 ----------
# DB_PATH 解析优先级：命令行参数 > 环境变量 DB_PATH > 默认值
DEFAULT_DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"
DB_PATH="${1:-${DB_PATH:-$DEFAULT_DB_PATH}}"

BACKUP_DIR="/opt/awkn-life-backups"
LOG_FILE="/var/log/awkn-backup.log"
KEEP_COPIES=30

# 告警通道（可选，通过环境变量注入）
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

HOSTNAME_FQDN="$(hostname -f 2>/dev/null || hostname)"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
BACKUP_TIMESTAMP="$(date '+%Y%m%d-%H%M%S')"
BACKUP_FILE="$BACKUP_DIR/awkn-life-${BACKUP_TIMESTAMP}.db"

# ---------- 工具函数 ----------
log() {
  # 统一日志格式：[时间] [级别] 消息
  local level="$1"
  shift
  echo "[$TIMESTAMP] [$level] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  # 失败告警：优先 webhook，其次邮件，最后仅日志
  local msg="$1"
  log "ERROR" "告警: $msg"

  if [ -n "$ALERT_WEBHOOK" ]; then
    # webhook 占位：实际部署时替换为飞书/钉钉/企业微信等
    # curl -sS -X POST "$ALERT_WEBHOOK" \
    #   -H "Content-Type: application/json" \
    #   -d "{\"text\":\"[数据库备份告警] $msg (host=$HOSTNAME_FQDN)\"}" >/dev/null 2>&1 || true
    echo "[ALERT-WEBHOOK] $msg (host=$HOSTNAME_FQDN)" >> "$LOG_FILE"
  fi

  if [ -n "$ALERT_EMAIL" ]; then
    # 邮件告警占位：实际部署时配置 sendmail / msmtp / SES
    # echo "$msg" | mail -s "[数据库备份告警] $HOSTNAME_FQDN" "$ALERT_EMAIL" || true
    echo "[ALERT-EMAIL] -> $ALERT_EMAIL: $msg" >> "$LOG_FILE"
  fi
}

# ---------- 主流程 ----------
log "INFO" "==== 数据库定时备份开始 (host=$HOSTNAME_FQDN) ===="
log "INFO" "DB_PATH=$DB_PATH"
log "INFO" "BACKUP_DIR=$BACKUP_DIR"
log "INFO" "KEEP_COPIES=$KEEP_COPIES"

# 1. 检查源数据库存在
if [ ! -f "$DB_PATH" ]; then
  send_alert "数据库文件不存在: $DB_PATH"
  log "ERROR" "数据库文件不存在: $DB_PATH"
  exit 1
fi

# 2. 创建备份目录
mkdir -p "$BACKUP_DIR"

# 3. 执行备份（优先 sqlite3 .backup 原子操作，回退 cp）
log "INFO" "执行备份 -> $BACKUP_FILE"
if command -v sqlite3 >/dev/null 2>&1; then
  if sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"; then
    log "INFO" "备份成功（sqlite3 .backup 原子操作）"
  else
    RET=$?
    send_alert "sqlite3 .backup 失败 (exit=$RET)，尝试 cp 回退"
    log "WARN" "sqlite3 .backup 失败 (exit=$RET)，尝试 cp 回退"
    if cp "$DB_PATH" "$BACKUP_FILE"; then
      log "WARN" "备份成功（cp 回退，非原子操作）"
    else
      RET=$?
      send_alert "cp 备份失败 (exit=$RET)"
      log "ERROR" "cp 备份失败 (exit=$RET)"
      exit "$RET"
    fi
  fi
else
  # 无 sqlite3 命令，直接 cp（可能不一致，但总比没有备份好）
  log "WARN" "未找到 sqlite3 命令，使用 cp（建议安装 sqlite3 以获得原子备份）"
  if cp "$DB_PATH" "$BACKUP_FILE"; then
    log "WARN" "备份成功（cp 方式）"
  else
    RET=$?
    send_alert "cp 备份失败 (exit=$RET)"
    log "ERROR" "cp 备份失败 (exit=$RET)"
    exit "$RET"
  fi
fi

# 4. 记录备份大小
if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "INFO" "备份文件大小: $SIZE"
else
  send_alert "备份文件未生成: $BACKUP_FILE"
  log "ERROR" "备份文件未生成: $BACKUP_FILE"
  exit 1
fi

# 5. 清理旧备份，保留最近 $KEEP_COPIES 份
log "INFO" "清理旧备份（保留最近 $KEEP_COPIES 份）..."
cd "$BACKUP_DIR"
# 列出按修改时间倒序的备份文件，跳过前 $KEEP_COPIES 个，删除其余
DELETED=$(ls -t awkn-life-*.db 2>/dev/null | tail -n +$((KEEP_COPIES + 1)) | xargs -r rm -fv)
if [ -n "$DELETED" ]; then
  log "INFO" "已删除旧备份:"
  echo "$DELETED" | tee -a "$LOG_FILE"
else
  log "INFO" "无旧备份需要清理"
fi

# 6. 统计当前备份总数
TOTAL=$(ls -1 awkn-life-*.db 2>/dev/null | wc -l)
log "INFO" "当前备份总数: $TOTAL"

log "INFO" "==== 数据库定时备份结束 (成功) ===="
exit 0
