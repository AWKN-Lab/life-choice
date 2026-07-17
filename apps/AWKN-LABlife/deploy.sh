#!/bin/bash
# ==========================================
# 人生决策宗师 - 阿里云一键部署脚本
# 运行在阿里云轻量应用服务器
# IP: 8.148.245.29
# ==========================================

set -e

echo "======================================"
echo "  人生决策宗师 - 生产部署"
echo "======================================"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js 未安装${NC}"
  echo "安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}⚠️ 安装 PM2...${NC}"
  npm install -g pm2
fi

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}⚠️ Docker 未安装，跳过容器部署${NC}"
  USE_DOCKER=false
else
  USE_DOCKER=true
  echo -e "${GREEN}✅ Docker 已安装${NC}"
fi

# 项目目录
PROJECT_DIR="/opt/awkn-life"
echo ""
echo -e "${YELLOW}项目目录: $PROJECT_DIR${NC}"

# 如果目录不存在，克隆
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${YELLOW}⚠️ 项目目录不存在，请先上传代码${NC}"
  echo "或运行: git clone <repo> $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

# ---- 创建部署前备份点 ----
# 在任何修改前创建完整备份点，供 rollback.sh 使用
# 备份内容：后端代码 + 前端构建产物 + .env.prod + 数据库
# 备份点路径记录到 /opt/awkn-life-backups/last-backup-point
create_backup_point() {
  local ts
  ts=$(date +%Y%m%d_%H%M%S)
  local backup_point="/opt/awkn-life-backup-${ts}"
  local backup_index_dir="/opt/awkn-life-backups"

  echo ""
  echo -e "${YELLOW}📦 创建部署前备份点: $backup_point${NC}"

  mkdir -p "$backup_point"
  mkdir -p "$backup_index_dir"

  # 1. 备份后端代码
  if [ -d "$PROJECT_DIR/awkn-life-backend" ]; then
    cp -r "$PROJECT_DIR/awkn-life-backend" "$backup_point/awkn-life-backend"
    echo "  ✅ 后端代码已备份"
  else
    echo -e "  ${YELLOW}⚠️ 后端代码目录不存在，跳过${NC}"
  fi

  # 2. 备份前端构建产物（如果有）
  if [ -d "$PROJECT_DIR/app/dist" ]; then
    mkdir -p "$backup_point/app"
    cp -r "$PROJECT_DIR/app/dist" "$backup_point/app/dist"
    echo "  ✅ 前端构建产物已备份"
  else
    echo -e "  ${YELLOW}⚠️ 前端构建产物不存在，跳过${NC}"
  fi

  # 3. 备份 .env.prod
  local env_prod="$PROJECT_DIR/awkn-life-backend/apps/api-server/.env.prod"
  if [ -f "$env_prod" ]; then
    cp "$env_prod" "$backup_point/.env.prod"
    echo "  ✅ .env.prod 已备份"
  else
    echo -e "  ${YELLOW}⚠️ .env.prod 不存在，跳过${NC}"
  fi

  # 4. 备份数据库（优先 prod.db，回退 dev.db）
  local prod_db="$PROJECT_DIR/awkn-life-backend/apps/api-server/prisma/prod.db"
  local dev_db="$PROJECT_DIR/awkn-life-backend/apps/api-server/prisma/dev.db"
  local db_source=""
  if [ -f "$prod_db" ]; then
    db_source="$prod_db"
  elif [ -f "$dev_db" ]; then
    db_source="$dev_db"
  fi
  if [ -n "$db_source" ]; then
    mkdir -p "$backup_point/prisma"
    # 优先使用 sqlite3 .backup 原子操作
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 "$db_source" ".backup '$backup_point/prisma/$(basename "$db_source")'"
    else
      cp "$db_source" "$backup_point/prisma/$(basename "$db_source")"
    fi
    echo "  ✅ 数据库已备份: $(basename "$db_source")"
  else
    echo -e "  ${YELLOW}⚠️ 数据库文件不存在，跳过${NC}"
  fi

  # 5. 记录备份点路径到 last-backup-point（供 rollback.sh 使用）
  echo "$backup_point" > "$backup_index_dir/last-backup-point"
  echo "  ✅ 备份点路径已记录到 $backup_index_dir/last-backup-point"

  echo -e "${GREEN}✅ 备份点创建完成: $backup_point${NC}"
}

# ---- 方式1: Docker 部署 ----
deploy_docker() {
  echo ""
  echo -e "${GREEN}🚀 Docker 部署模式${NC}"

  # 部署前创建备份点
  create_backup_point

  # 复制环境变量
  if [ ! -f "./awkn-life-backend/apps/api-server/.env" ]; then
    echo -e "${YELLOW}⚠️ 创建 .env 文件...${NC}"
    cp ./awkn-life-backend/apps/api-server/.env.example \
       ./awkn-life-backend/apps/api-server/.env
    echo "请编辑 .env 填入真实配置"
  fi

  # 备份数据库
  echo "📦 备份生产数据库..."
  if ! "$PROJECT_DIR/scripts/backup-db.sh"; then
    echo -e "${RED}❌ 数据库备份失败，中止部署${NC}"
    exit 1
  fi

  # 构建并启动
  docker-compose down 2>/dev/null || true
  docker-compose build --no-cache
  docker-compose up -d

  echo -e "${GREEN}✅ Docker 部署完成${NC}"
  echo "访问 http://8.148.245.29"
}

# ---- 方式2: PM2 直接部署 ----
deploy_pm2() {
  echo ""
  echo -e "${GREEN}🚀 PM2 部署模式${NC}"

  # ---- Q3 P0-1: 部署前置检查 ----
  echo ""
  echo -e "${YELLOW}🚦 执行部署前置检查...${NC}"
  if [ -f "$PROJECT_DIR/scripts/pre-deploy-check.sh" ]; then
    if ! bash "$PROJECT_DIR/scripts/pre-deploy-check.sh"; then
      echo -e "${RED}❌ 部署前置检查失败，中止部署${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}⚠️ pre-deploy-check.sh 不存在，跳过前置检查${NC}"
  fi

  # 部署前创建备份点
  create_backup_point

  # 安装依赖
  echo "安装后端依赖..."
  cd "$PROJECT_DIR/awkn-life-backend"
  npm ci --legacy-peer-deps

  # 生成 Prisma
  cd apps/api-server

  # 备份数据库
  echo "📦 备份生产数据库..."
  if ! "$PROJECT_DIR/scripts/backup-db.sh"; then
    echo -e "${RED}❌ 数据库备份失败，中止部署${NC}"
    exit 1
  fi

  npx prisma generate
  npx prisma migrate deploy

  # 创建日志目录
  mkdir -p "$PROJECT_DIR/logs"

  # 复制环境变量
  if [ ! -f "./.env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️ 请编辑 .env 填入真实配置${NC}"
  fi

  # 启动后端（使用 PM2）
  # ---- Q3 P0-6 (2026-06-27 E230): chmod + 完整性校验门 ----
  echo "🔒 chmod + integrity check (E230)..."
  cd "$PROJECT_DIR/awkn-life-backend/apps/api-server"
  chmod +x node_modules/.bin/* 2>/dev/null || true
  find node_modules -name '*.sh' -exec chmod +x {} \; 2>/dev/null || true

  # 完整性校验
  node -e "
    const fs = require('fs');
    const pkg = require('./package.json');
    const all = {...pkg.dependencies, ...pkg.devDependencies};
    const missing = Object.keys(all).filter(name =>
      !fs.existsSync('./node_modules/' + name + '/package.json')
    );
    if (missing.length) {
      console.error('[deploy] ❌ Missing node_modules:', missing.join(', '));
      process.exit(1);
    }
    console.log('[deploy] ✅ All', Object.keys(all).length, 'deps present');
  " || { echo -e "${RED}❌ node_modules 不完整，请手动 npm install${NC}"; exit 1; }

  # 模块可解析性预检
  node -e "
    const pkg = require('./package.json');
    for (const name of Object.keys({...pkg.dependencies, ...pkg.devDependencies})) {
      try { require.resolve(name); } catch (e) {
        throw new Error(name + ': ' + e.message);
      }
    }
    console.log('[deploy] ✅ All modules resolvable');
  " || { echo -e "${RED}❌ 模块解析失败，请手动排查${NC}"; exit 1; }

  pm2 delete awkn-life-backend 2>/dev/null || true
  pm2 start "$PROJECT_DIR/awkn-life-backend/ecosystem.config.js" --env production

  # 确保管理员账号
  echo "确保管理员账号..."
  cd "$PROJECT_DIR/awkn-life-backend"
  ADMIN_PASSWORD=$ADMIN_PASSWORD node apps/api-server/scripts/ensure-admin.js

  # ---- Q3 P0-4: 管理员保底校验 ----
  echo "🔍 执行管理员保底校验..."
  if [ -f "apps/api-server/scripts/verify-admin.js" ]; then
    ADMIN_PASSWORD=$ADMIN_PASSWORD node apps/api-server/scripts/verify-admin.js
    if [ $? -ne 0 ]; then
      echo -e "${YELLOW}⚠️ 管理员校验失败，请手动检查${NC}"
    fi
  fi

  # 保存 PM2 进程列表
  pm2 save
  # 设置开机自启
  pm2 startup

  # ---- Q3 P0-7 (2026-06-27 E232): 部署后必做 5 件套验证 ----
  echo "✅ 部署后 5 件套验证（E232）..."
  if [ -f "$PROJECT_DIR/scripts/verify-deploy.sh" ]; then
    bash "$PROJECT_DIR/scripts/verify-deploy.sh" || {
      echo -e "${RED}❌ 部署验证失败，触发回滚${NC}"
      "$PROJECT_DIR/scripts/rollback.sh"
      exit 1
    }
  else
    echo -e "${YELLOW}⚠️ verify-deploy.sh 不存在，跳过 5 件套验证${NC}"
    # 回退到旧的 smoke_check
    if ! smoke_check; then
      echo -e "${RED}❌ 部署后烟测失败，触发回滚${NC}"
      "$PROJECT_DIR/scripts/rollback.sh"
      exit 1
    fi
  fi

  # 部署后烟测
  if ! smoke_check; then
    echo -e "${RED}❌ 部署后烟测失败，触发回滚${NC}"
    "$PROJECT_DIR/scripts/rollback.sh"
    exit 1
  fi

  # ---- Q3 P0-2: 前端 SPA 路由测试 ----
  if ! smoke_check_frontend; then
    echo -e "${RED}❌ 前端烟测失败，触发回滚${NC}"
    "$PROJECT_DIR/scripts/rollback.sh"
    exit 1
  fi

  echo -e "${GREEN}✅ PM2 部署完成${NC}"
  echo "后端: http://8.148.245.29:3000"
  pm2 list
}

# ---- 方式3: Nginx 静态托管（前后端分离）----
deploy_nginx() {
  echo ""
  echo -e "${GREEN}🚀 Nginx + PM2 部署模式${NC}"

  # 安装 Nginx
  if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    apt-get update && apt-get install -y nginx
  fi

  # 复制 Nginx 配置
  cp "$PROJECT_DIR/nginx/nginx.conf" /etc/nginx/nginx.conf

  # 前端构建
  echo "构建前端..."
  cd "$PROJECT_DIR/app"
  npm ci --legacy-peer-deps
  VITE_API_BASE_URL=http://8.148.245.29:3000/api npx vite build

  # 前端部署到 Nginx 目录
  mkdir -p /usr/share/nginx/html
  rm -rf /usr/share/nginx/html/*
  cp -r "$PROJECT_DIR/app/dist"/* /usr/share/nginx/html/

  # 后端部署
  deploy_pm2

  # 重启 Nginx
  nginx -t && systemctl restart nginx

  # 部署后烟测
  if ! smoke_check; then
    echo -e "${RED}❌ 部署后烟测失败，触发回滚${NC}"
    "$PROJECT_DIR/scripts/rollback.sh"
    exit 1
  fi

  echo -e "${GREEN}✅ 部署完成${NC}"
  echo "访问 http://8.148.245.29"
}

# ---- 烟测：30 次 × 2s，多端点健康检查 ----
smoke_check() {
  echo ""
  echo -e "${YELLOW}🩺 部署后烟测（30 次 × 2s）...${NC}"
  local i
  for i in $(seq 1 30); do
    if curl -fsS http://localhost:3000/health >/dev/null 2>&1 \
       || curl -fsS http://localhost/life/api/v1/health >/dev/null 2>&1; then
      echo -e "${GREEN}✅ 烟测通过（${i}/30 次）${NC}"

      # 详细健康检查输出
      echo ""
      echo -e "${YELLOW}📋 详细健康检查...${NC}"

      # /health
      HEALTH_RESP=$(curl -fsS http://localhost:3000/health 2>/dev/null || echo "UNREACHABLE")
      if [ "$HEALTH_RESP" != "UNREACHABLE" ]; then
        echo -e "  ${GREEN}[PASS]${NC} /health → $HEALTH_RESP"
      else
        echo -e "  ${RED}[FAIL]${NC} /health 不可达"
      fi

      # /api/v1/health
      API_HEALTH=$(curl -fsS http://localhost:3000/api/v1/health 2>/dev/null || echo "UNREACHABLE")
      if [ "$API_HEALTH" != "UNREACHABLE" ]; then
        echo -e "  ${GREEN}[PASS]${NC} /api/v1/health → $API_HEALTH"
      else
        echo -e "  ${RED}[FAIL]${NC} /api/v1/health 不可达"
      fi

      # /health/llm
      LLM_HEALTH=$(curl -fsS --max-time 10 http://localhost:3000/health/llm 2>/dev/null || echo "UNREACHABLE")
      if [ "$LLM_HEALTH" != "UNREACHABLE" ]; then
        echo -e "  ${GREEN}[PASS]${NC} /health/llm → $LLM_HEALTH"
      else
        echo -e "  ${YELLOW}[WARN]${NC} /health/llm 不可达（LLM 服务可能未配置）"
      fi

      # / (首页可达性)
      HOME_RESP=$(curl -fsS -o /dev/null -w "%{http_code}" http://localhost/life/ 2>/dev/null || echo "000")
      if [ "$HOME_RESP" = "200" ]; then
        echo -e "  ${GREEN}[PASS]${NC} / (首页) → HTTP $HOME_RESP"
      else
        echo -e "  ${YELLOW}[WARN]${NC} / (首页) → HTTP $HOME_RESP（前端可能未部署）"
      fi

      return 0
    fi
    sleep 2
  done
  echo -e "${RED}❌ 烟测失败：60s 内 /health 不可达${NC}"
  return 1
}

# ---- Q3 P0-2: 前端 SPA 路由冒烟测试 ----
smoke_check_frontend() {
  echo ""
  echo -e "${YELLOW}🖥️ 前端 SPA 路由冒烟测试...${NC}"
  if [ -f "$PROJECT_DIR/scripts/smoke-test-frontend.sh" ]; then
    if bash "$PROJECT_DIR/scripts/smoke-test-frontend.sh"; then
      echo -e "${GREEN}✅ 前端 SPA 路由测试通过${NC}"
      return 0
    else
      echo -e "${RED}❌ 前端 SPA 路由测试失败${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️ smoke-test-frontend.sh 不存在，跳过${NC}"
    return 0
  fi
}

# ---- 选择部署模式 ----
echo ""
echo "请选择部署模式:"
echo "  1) Docker Compose (推荐，一键)"
echo "  2) PM2 + Nginx (更轻量)"
echo "  3) 仅后端 PM2"
read -p "请输入 [1-3]: " mode

case $mode in
  1) deploy_docker ;;
  2) deploy_nginx ;;
  3) deploy_pm2 ;;
  *) echo "无效选择"; exit 1 ;;
esac

echo ""
echo -e "${GREEN}======================================"
echo "  部署完成!"
echo "======================================${NC}"
