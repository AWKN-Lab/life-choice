#!/bin/bash
# backup-db.sh - SQLite 数据库备份脚本
# P0-1: 生产环境安全备份
# - 优先使用 sqlite3 .backup（原子操作，不会拷贝到不一致状态）
# - 回退到 cp（如果没有 sqlite3 命令）
# - 自动检测 prod.db / dev.db
set -e

# P0-1: 自动检测数据库路径
# 优先使用环境变量，其次自动检测 prod.db，最后回退 dev.db
if [ -n "$DATABASE_URL" ]; then
  # 从 DATABASE_URL 提取路径（file:../prisma/prod.db 格式）
  DB_RELATIVE=$(echo "$DATABASE_URL" | sed 's|^file:||')
  DB_PATH="${1:-/opt/awkn-life/awkn-life-backend/apps/api-server/${DB_RELATIVE}}"
else
  # 自动检测：prod.db 优先
  PROD_DB="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db"
  DEV_DB="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"
  if [ -f "$PROD_DB" ]; then
    DB_PATH="${1:-$PROD_DB}"
  else
    DB_PATH="${1:-$DEV_DB}"
  fi
fi

BACKUP_DIR="$(dirname "$DB_PATH")/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BASENAME=$(basename "$DB_PATH")
BACKUP_FILE="$BACKUP_DIR/${DB_BASENAME}.${TIMESTAMP}.bak"

# 检查源文件存在
if [ ! -f "$DB_PATH" ]; then
  echo "❌ 数据库文件不存在: $DB_PATH"
  exit 1
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# P0-1: 优先使用 sqlite3 .backup（原子操作，安全）
if command -v sqlite3 &> /dev/null; then
  if sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"; then
    echo "✅ 数据库备份成功（sqlite3 .backup 原子操作）: $BACKUP_FILE"
    echo "   大小: $(du -h "$BACKUP_FILE" | cut -f1)"
  else
    echo "❌ sqlite3 .backup 失败，尝试 cp 回退"
    if cp "$DB_PATH" "$BACKUP_FILE"; then
      echo "⚠️ 数据库备份成功（cp 回退，非原子操作）: $BACKUP_FILE"
      echo "   大小: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
      echo "❌ 数据库备份失败"
      exit 1
    fi
  fi
else
  # 回退到 cp（可能不一致，但总比没有备份好）
  if cp "$DB_PATH" "$BACKUP_FILE"; then
    echo "⚠️ 数据库备份成功（cp 方式，建议安装 sqlite3 以获得原子备份）: $BACKUP_FILE"
    echo "   大小: $(du -h "$BACKUP_FILE" | cut -f1)"
  else
    echo "❌ 数据库备份失败"
    exit 1
  fi
fi

# 保留最近 10 个备份
cd "$BACKUP_DIR"
ls -t ${DB_BASENAME}.*.bak | tail -n +11 | xargs -r rm -f
echo "✅ 已清理旧备份（保留最近 10 个）"
