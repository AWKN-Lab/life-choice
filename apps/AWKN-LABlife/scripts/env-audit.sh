#!/bin/bash
# ==========================================
# 环境一致性审计脚本 - Q3 P0-3
# 对比 .env.example 与生产 .env 的字段清单
# 识别缺失字段、多余字段、运行时配置漂移
# 运行在阿里云服务器（Linux，LF 行尾）
# ==========================================

set -euo pipefail

# ---- 配置 ----
PROJECT_DIR="${PROJECT_DIR:-/opt/awkn-life}"
API_SERVER_DIR="$PROJECT_DIR/awkn-life-backend/apps/api-server"
ENV_EXAMPLE="$API_SERVER_DIR/.env.example"
ENV_PROD="$API_SERVER_DIR/.env.prod"
ENV_RUNTIME="$API_SERVER_DIR/.env"

# 优先使用 .env.prod，回退到 .env
if [ -f "$ENV_PROD" ]; then
  ENV_ACTUAL="$ENV_PROD"
elif [ -f "$ENV_RUNTIME" ]; then
  ENV_ACTUAL="$ENV_RUNTIME"
else
  ENV_ACTUAL=""
fi

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---- 计数器 ----
PASS=0
FAIL=0
WARN=0

# ---- 工具函数 ----
extract_keys() {
  # 提取 .env 文件中的 key（忽略注释和空行）
  grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$1" 2>/dev/null | sed 's/=.*//' | sort -u
}

check_file_exists() {
  local name="$1"
  local path="$2"
  if [ -f "$path" ]; then
    echo -e "  ${GREEN}[PASS]${NC} $name 存在: $path"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} $name 不存在: $path"
    FAIL=$((FAIL + 1))
  fi
}

# ---- 主流程 ----
echo "======================================"
echo "  环境一致性审计"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
echo ""

# 1. 检查文件存在性
echo "[1/4] 检查环境变量文件存在性 ..."
check_file_exists ".env.example" "$ENV_EXAMPLE"
if [ -n "$ENV_ACTUAL" ]; then
  check_file_exists "生产 .env" "$ENV_ACTUAL"
else
  echo -e "  ${RED}[FAIL]${NC} 生产 .env 不存在（.env.prod 和 .env 都不存在）"
  FAIL=$((FAIL + 1))
fi

# 2. 对比字段清单
echo ""
echo "[2/4] 对比 .env.example 与生产 .env 字段清单 ..."

if [ ! -f "$ENV_EXAMPLE" ] || [ -z "$ENV_ACTUAL" ] || [ ! -f "$ENV_ACTUAL" ]; then
  echo -e "  ${YELLOW}[SKIP]${NC} 文件缺失，跳过字段对比"
  WARN=$((WARN + 1))
else
  EXAMPLE_KEYS=$(extract_keys "$ENV_EXAMPLE")
  ACTUAL_KEYS=$(extract_keys "$ENV_ACTUAL")

  # 找出 .env.example 有但生产 .env 缺失的字段
  MISSING_KEYS=$(comm -23 <(echo "$EXAMPLE_KEYS") <(echo "$ACTUAL_KEYS"))
  if [ -n "$MISSING_KEYS" ]; then
    echo -e "  ${RED}[FAIL]${NC} 生产 .env 缺失以下字段:"
    echo "$MISSING_KEYS" | while read -r key; do
      echo "    - $key"
    done
    FAIL=$((FAIL + 1))
  else
    echo -e "  ${GREEN}[PASS]${NC} 生产 .env 无缺失字段"
    PASS=$((PASS + 1))
  fi

  # 找出生产 .env 有但 .env.example 没有的字段（多余字段）
  EXTRA_KEYS=$(comm -13 <(echo "$EXAMPLE_KEYS") <(echo "$ACTUAL_KEYS"))
  if [ -n "$EXTRA_KEYS" ]; then
    echo -e "  ${YELLOW}[WARN]${NC} 生产 .env 有以下多余字段（.env.example 未定义）:"
    echo "$EXTRA_KEYS" | while read -r key; do
      echo "    - $key"
    done
    WARN=$((WARN + 1))
  else
    echo -e "  ${GREEN}[PASS]${NC} 生产 .env 无多余字段"
    PASS=$((PASS + 1))
  fi
fi

# 3. 检查关键密钥是否为空
echo ""
echo "[3/4] 检查关键密钥非空 ..."

CRITICAL_KEYS=(
  "JWT_SECRET"
  "DATABASE_URL"
  "DEEPSEEK_API_KEY"
  "DEFAULT_LLM_PROVIDER"
)

if [ -z "$ENV_ACTUAL" ] || [ ! -f "$ENV_ACTUAL" ]; then
  echo -e "  ${YELLOW}[SKIP]${NC} 生产 .env 不存在，跳过密钥检查"
  WARN=$((WARN + 1))
else
  for key in "${CRITICAL_KEYS[@]}"; do
    value=$(grep -E "^${key}=" "$ENV_ACTUAL" 2>/dev/null | sed "s/^${key}=//" | tr -d '"' | tr -d "'")
    if [ -z "$value" ] || [ "$value" = "your-secret-here" ] || [ "$value" = "xxx" ]; then
      echo -e "  ${RED}[FAIL]${NC} $key 为空或为占位符"
      FAIL=$((FAIL + 1))
    else
      echo -e "  ${GREEN}[PASS]${NC} $key 已配置"
      PASS=$((PASS + 1))
    fi
  done
fi

# 4. 检查端口配置一致性
echo ""
echo "[4/4] 检查端口配置 ..."

if [ -z "$ENV_ACTUAL" ] || [ ! -f "$ENV_ACTUAL" ]; then
  echo -e "  ${YELLOW}[SKIP]${NC} 生产 .env 不存在，跳过端口检查"
  WARN=$((WARN + 1))
else
  PORT_VALUE=$(grep -E "^PORT=" "$ENV_ACTUAL" 2>/dev/null | sed 's/^PORT=//' | tr -d '"' | tr -d "'")
  if [ -z "$PORT_VALUE" ]; then
    echo -e "  ${YELLOW}[WARN]${NC} PORT 未设置（将使用默认端口）"
    WARN=$((WARN + 1))
  elif [ "$PORT_VALUE" = "3000" ]; then
    echo -e "  ${GREEN}[PASS]${NC} PORT=$PORT_VALUE（生产标准端口）"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}[WARN]${NC} PORT=$PORT_VALUE（非标准生产端口 3000，请确认）"
    WARN=$((WARN + 1))
  fi

  NODE_ENV_VALUE=$(grep -E "^NODE_ENV=" "$ENV_ACTUAL" 2>/dev/null | sed 's/^NODE_ENV=//' | tr -d '"' | tr -d "'")
  if [ "$NODE_ENV_VALUE" = "production" ]; then
    echo -e "  ${GREEN}[PASS]${NC} NODE_ENV=production"
    PASS=$((PASS + 1))
  elif [ -z "$NODE_ENV_VALUE" ]; then
    echo -e "  ${YELLOW}[WARN]${NC} NODE_ENV 未设置"
    WARN=$((WARN + 1))
  else
    echo -e "  ${RED}[FAIL]${NC} NODE_ENV=$NODE_ENV_VALUE（非 production）"
    FAIL=$((FAIL + 1))
  fi
fi

# ---- 汇总 ----
echo ""
echo "======================================"
echo -e "  结果: ${GREEN}PASS=$PASS${NC}  ${RED}FAIL=$FAIL${NC}  ${YELLOW}WARN=$WARN${NC}"
echo "======================================"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ 环境一致性审计失败，存在阻塞性问题${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 环境一致性审计通过${NC}"
if [ "$WARN" -gt 0 ]; then
  echo -e "${YELLOW}⚠️ 有 $WARN 个警告项需关注${NC}"
fi
exit 0
