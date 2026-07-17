# 部署文档

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）
> **当前生产入口**：[`DEPLOY-当前生产基线-20260707.md`](./DEPLOY-当前生产基线-20260707.md)
> **历史版本**：v1.0 / 2026-06-16

2026-07-07 当前口径：

```text
后端端口：30000
前端目录：/www/wwwroot/awkn.cn/life
后端入口：PM2 → scripts/bootstrap-production.js → apps/api-server/dist/main.js
Node：22.22.2
生产版本：4bbcd7c + 工作区变更 + 构建产物
磁盘：94%，剩余约 2.5GB
```

以下内容保留历史流程，不能直接作为当前生产发布命令。

---

## 1. 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | `8.148.245.29`（阿里云轻量应用服务器） |
| 项目目录 | `/opt/awkn-life` |
| 后端目录 | `/opt/awkn-life/awkn-life-backend` |
| 前端目录 | `/opt/awkn-life/app` |
| PM2 进程名 | `awkn-life-backend` |
| PM2 启动脚本 | `scripts/bootstrap-production.js` |
| PM2 配置文件 | `/opt/awkn-life/awkn-life-backend/ecosystem.config.js` |
| 前端静态文件 | `/www/wwwroot/awkn-lab/life/` |
| 日志目录 | `/opt/awkn-life/awkn-life-backend/logs/` |
| Node.js 版本 | 20.x |

---

## 2. 部署模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| **Docker Compose** | 一键容器化部署，含 DB + 后端 | 全新环境、需要隔离 |
| **PM2 + Nginx** | 前后端分离，PM2 管理后端，Nginx 托管前端 | **当前生产模式** |
| **仅后端 PM2** | 只部署后端 API，前端另行处理 | 调试、前端独立部署 |

---

## 3. 部署流程（PM2 + Nginx 模式）

### 3.1 预部署

```bash
# 1. 备份数据库（必须！失败则中止部署）
/opt/awkn-life/scripts/backup-db.sh

# 2. 检查当前状态
pm2 list
pm2 show awkn-life-backend
curl -sf http://localhost:3000/api/v1/health
```

### 3.2 后端部署

```bash
cd /opt/awkn-life/awkn-life-backend

# 1. 安装依赖
npm ci --legacy-peer-deps

# 2. 生成 Prisma Client
cd apps/api-server
npx prisma generate

# 3. 执行数据库迁移
npx prisma migrate deploy

# 4. 确保 .env 存在
if [ ! -f "./.env" ]; then
  cp .env.example .env
  echo "⚠️ 请编辑 .env 填入真实配置"
fi

# 5. 创建日志目录
mkdir -p /opt/awkn-life/logs

# 6. 重启 PM2（必须先 cd 到后端目录再启动）
cd /opt/awkn-life/awkn-life-backend
pm2 delete awkn-life-backend 2>/dev/null || true
pm2 start /opt/awkn-life/awkn-life-backend/ecosystem.config.js --env production

# 7. 确保管理员账号
cd /opt/awkn-life/awkn-life-backend
ADMIN_PASSWORD=$ADMIN_PASSWORD node apps/api-server/scripts/ensure-admin.js

# 8. 保存 PM2 进程列表 + 设置开机自启
pm2 save
pm2 startup
```

### 3.3 前端部署

```bash
cd /opt/awkn-life/app

# 1. 安装依赖
npm ci --legacy-peer-deps

# 2. 构建（指定 API 地址）
VITE_API_BASE_URL=http://8.148.245.29:3000/api npx vite build

# 3. 部署到 Nginx 目录
mkdir -p /www/wwwroot/awkn-lab/life/
rm -rf /www/wwwroot/awkn-lab/life/*
cp -r /opt/awkn-life/app/dist/* /www/wwwroot/awkn-lab/life/

# 4. 确保 Nginx 配置正确
nginx -t && systemctl restart nginx
```

### 3.4 部署后验证

```bash
# 运行完整健康检查
/opt/awkn-life/scripts/health-check.sh

# 或手动烟测
curl -sf http://localhost:3000/api/v1/health
curl -sf http://localhost:3000/api/v1/health/db
curl -sf http://localhost:3000/api/v1/health/llm
curl -sf http://localhost/life/
```

---

## 4. 环境变量

### 4.1 核心变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NODE_ENV` | `production` | 运行环境 |
| `PORT` | `3000` | 后端监听端口（**注意**：ecosystem.config.js 中为 3000，Nginx 代理到 3002 时需确认） |
| `DATABASE_URL` | — | SQLite/PostgreSQL 连接串 |
| `REDIS_ENABLED` | `false` | Redis 开关（当前强制禁用，orchestrator 走直接处理路径） |

### 4.2 LLM Provider 配置

| 变量 | 说明 |
|------|------|
| `DEFAULT_LLM_PROVIDER` | 默认 LLM 提供商（当前：`deepseek-direct`） |
| `CHEAP_LLM_PROVIDER` | 辅助任务提供商（当前：`sensenova`） |
| `DEEPSEEK_DIRECT_BASE_URL` | DeepSeek API 地址 |
| `DEEPSEEK_DIRECT_MODEL` | DeepSeek 模型名（`deepseek-v4-flash`） |
| `DEEPSEEK_DIRECT_API_KEY` | DeepSeek API Key（从 .env 读取，不硬编码） |
| `DOUBAO_BASE_URL` | 豆包 API 地址 |
| `DOUBAO_MODEL` | 豆包模型名 |
| `KIMI_MODEL` | Kimi 模型名 |
| `MINIMAX_MODEL` | MiniMax 模型名 |
| `MINIMAX_API_KEY` | MiniMax API Key（从 .env 读取，不硬编码） |

### 4.3 管理员配置

| 变量 | 说明 |
|------|------|
| `ADMIN_PASSWORD` | 管理员密码（用于 ensure-admin.js 和健康检查） |

> **安全提醒**：API Key 迁移到 `.env` 文件，不再硬编码在 ecosystem.config.js 中。`.env` 文件不进代码、不进 commit。

---

## 5. Nginx 配置

### 5.1 路由规则

| 路径 | 目标 | 说明 |
|------|------|------|
| `/life/` | 前端静态文件 `/www/wwwroot/awkn-lab/life/` | SPA 入口 |
| `/life/api/` | `http://localhost:3002` → 后端 | API 代理 |

### 5.2 配置来源

生产环境存在**双源配置**问题：

| 来源 | 路径 | 说明 |
|------|------|------|
| 宝塔面板 | `/www/server/panel/vhost/nginx/` | 宝塔管理的 Nginx 配置 |
| 系统默认 | `/etc/nginx/nginx.conf` | 标准 Nginx 配置 |

> **注意**：如果使用宝塔面板管理服务器，Nginx 配置以宝塔为准，不要直接修改 `/etc/nginx/nginx.conf`，否则宝塔重启时会覆盖。

### 5.3 参考配置

```nginx
server {
    listen 80;
    server_name 8.148.245.29;

    # 前端静态文件
    location /life/ {
        alias /www/wwwroot/awkn-lab/life/;
        try_files $uri $uri/ /life/index.html;
    }

    # 后端 API 代理
    location /life/api/ {
        proxy_pass http://127.0.0.1:3002/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. 健康检查

### 6.1 检查脚本

```bash
/opt/awkn-life/scripts/health-check.sh
```

### 6.2 九项检查清单

| 序号 | 检查项 | 端点/命令 | 通过标准 |
|------|--------|----------|---------|
| 1 | 后端健康 | `GET /api/v1/health` | HTTP 200 |
| 2 | 数据库连接 | `GET /api/v1/health/db` | `{ db: 'connected' }` |
| 3 | 管理员保底 | `POST /api/v1/auth/login` | `isAdmin=true` |
| 4 | PM2 进程 | `pm2 show awkn-life-backend` | 进程存在 + cwd 正确 |
| 5 | 前端可达 | `GET /life/` | HTTP 200 |
| 6 | 前端版本 | `GET /life/` 检查 bundle | `assets/index-*.js` 存在 |
| 7 | 数据库文件一致性 | `stat $EXPECTED_DB` | 文件存在 + 大小 > 0 |
| 8 | SQLite WAL 模式 | `PRAGMA journal_mode` | 返回 `wal` |
| 9 | LLM Provider | `GET /api/v1/health/llm` | `{ status: 'ok' }` |

### 6.3 烟测（deploy.sh 内置）

部署脚本内置 30 次 × 2s 轮询烟测，检查 `/health` 端点可达性。通过后输出详细健康信息（/health、/api/v1/health、/health/llm、/life/ 首页）。失败则自动触发回滚。

---

## 7. 回滚流程

### 7.1 数据库回滚

```bash
# 从最近备份恢复
BACKUP_FILE=$(ls -t /opt/awkn-life/backups/*.db | head -1)
cp $BACKUP_FILE /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db
```

### 7.2 后端回滚

```bash
# 回退到上一版本代码
cd /opt/awkn-life/awkn-life-backend
git log --oneline -5  # 找到上一版本 commit
git checkout <previous-commit>

# 重新安装依赖 + 重启
npm ci --legacy-peer-deps
cd apps/api-server && npx prisma generate
pm2 restart awkn-life-backend
```

### 7.3 前端回滚

```bash
# 回退前端代码
cd /opt/awkn-life/app
git log --oneline -5
git checkout <previous-commit>

# 重新构建 + 部署
npm ci --legacy-peer-deps
VITE_API_BASE_URL=http://8.148.245.29:3000/api npx vite build
rm -rf /www/wwwroot/awkn-lab/life/*
cp -r /opt/awkn-life/app/dist/* /www/wwwroot/awkn-lab/life/
```

### 7.4 一键回滚（如有脚本）

```bash
/opt/awkn-life/scripts/rollback.sh
```

---

## 8. 常见问题与修复

### 8.1 端口冲突（3000 vs 3002）

**现象**：ecosystem.config.js 中 `PORT=3000`，但 Nginx 代理到 `3002`，导致 502。

**原因**：ecosystem.config.js 的 `env.PORT` 为 `3000`，但 `.env` 文件或环境变量中覆盖为 `3002`。

**修复**：

```bash
# 检查实际监听端口
pm2 show awkn-life-backend | grep "script path"
ss -tlnp | grep node

# 统一端口：确认 .env 中 PORT=3002 与 Nginx 配置一致
# 或修改 Nginx 代理目标为 3000
```

### 8.2 静态资源 403

**现象**：前端页面加载后 JS/CSS 返回 403 Forbidden。

**原因**：Nginx 进程（www-data）无权读取 `/www/wwwroot/awkn-lab/life/` 目录。

**修复**：

```bash
chmod -R 755 /www/wwwroot/awkn-lab/life/
chown -R www-data:www-data /www/wwwroot/awkn-lab/life/
```

### 8.3 PM2 cwd 问题

**现象**：PM2 启动后 Prisma 找不到数据库文件，或相对路径报错。

**原因**：ecosystem.config.js 中 `cwd` 配置为 `/opt/awkn-life/awkn-life-backend`，但 `pm2 start` 时不在该目录执行。

**修复**：

```bash
# 必须先 cd 再 pm2 start
cd /opt/awkn-life/awkn-life-backend
pm2 start ecosystem.config.js --env production

# 或使用绝对路径
pm2 start /opt/awkn-life/awkn-life-backend/ecosystem.config.js --env production
```

### 8.4 Nginx 双源配置冲突

**现象**：修改 `/etc/nginx/nginx.conf` 后重启，配置被宝塔覆盖。

**原因**：宝塔面板管理 Nginx 配置，直接修改系统配置文件会被覆盖。

**修复**：

```bash
# 方案 A：通过宝塔面板修改配置（推荐）
# 登录宝塔 → 网站 → 配置文件

# 方案 B：修改宝塔管理的配置文件
# 路径通常在 /www/server/panel/vhost/nginx/

# 确认当前生效配置
nginx -T | head -20
```

### 8.5 数据库迁移失败

**现象**：`npx prisma migrate deploy` 报错。

**修复**：

```bash
# 检查迁移状态
npx prisma migrate status

# 强制标记迁移已应用（数据未变时）
npx prisma migrate resolve --applied <migration_name>

# 严重时从备份恢复
cp /opt/awkn-life/backups/latest.db /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db
```

### 8.6 LLM Provider 不可用

**现象**：`/health/llm` 返回超时或异常。

**修复**：

```bash
# 检查 API Key 是否配置
grep -E "(DEEPSEEK|MINIMAX|DOUBAO).*KEY" /opt/awkn-life/awkn-life-backend/apps/api-server/.env

# 检查网络连通性
curl -sf https://api.deepseek.com/v1/models

# 临时切换 Provider（修改 .env）
DEFAULT_LLM_PROVIDER=doubao
pm2 restart awkn-life-backend
```

---

## 9. PM2 常用命令

```bash
pm2 list                          # 查看所有进程
pm2 show awkn-life-backend        # 查看进程详情
pm2 logs awkn-life-backend        # 查看日志
pm2 restart awkn-life-backend     # 重启
pm2 stop awkn-life-backend        # 停止
pm2 delete awkn-life-backend      # 删除
pm2 monit                         # 监控面板
pm2 save                          # 保存进程列表
pm2 startup                       # 设置开机自启
```

---

## 10. 目录结构（服务器端）

```
/opt/awkn-life/
├── awkn-life-backend/            ← 后端代码
│   ├── apps/api-server/          ← API 服务
│   │   ├── .env                  ← 环境变量（API Key 在此）
│   │   ├── prisma/               ← 数据库
│   │   │   ├── prod.db           ← 生产数据库
│   │   │   └── migrations/       ← 迁移文件
│   │   └── scripts/
│   │       └── ensure-admin.js   ← 管理员保底脚本
│   ├── ecosystem.config.js       ← PM2 配置
│   ├── scripts/
│   │   └── bootstrap-production.js  ← PM2 启动入口
│   └── logs/                     ← 运行日志
│       ├── backend-error.log
│       ├── backend-out.log
│       └── backend-combined.log
├── app/                          ← 前端代码
│   └── dist/                     ← 构建产物
├── scripts/
│   ├── backup-db.sh              ← 数据库备份
│   └── rollback.sh               ← 一键回滚
└── nginx/
    └── nginx.conf                ← Nginx 配置参考
```

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-06-16 | v1.0 | 初始版本：服务器信息、部署流程、环境变量、Nginx 配置、健康检查、回滚流程、常见问题 |
