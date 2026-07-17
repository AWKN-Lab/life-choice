# 人生决策宗师 - 部署指南

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）
> **原始日期**：2026-06-15
> **生产校准日期**：2026-07-07
> **当前生产部署入口**：[`DEPLOY-当前生产基线-20260707.md`](./DEPLOY-当前生产基线-20260707.md)
> **统一口径源**：[`_ground-truth.md`](../工程交接/_ground-truth.md)

当前生产使用端口 `30000`、前端目录 `/www/wwwroot/awkn.cn/life/`、Node.js 22.22.2。下文历史命令不能直接用于当前发布。

---

## 1. 架构概览

| 属性 | 值 |
|------|-----|
| 服务器 | 阿里云轻量应用服务器 `8.148.245.29` |
| 项目目录 | `/opt/awkn-life` |
| 前端 base path | `/life/`（开发 + 生产统一） |
| 后端端口 | `3000` |
| 数据库 | SQLite（Prisma ORM），绝对路径 `file:/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db` |
| 进程管理 | PM2（fork 模式，1 实例） |
| 反向代理 | Nginx（可选） |
| 容器化 | Docker Compose（可选） |
| Redis | 强制禁用（`REDIS_ENABLED=false`） |
| 默认 LLM Provider | `deepseek-direct` |
| 辅助 LLM Provider | `sensenova` |

### 架构图

```
用户浏览器
  │
  ├─ /life/* ──────────► Nginx 静态托管（/usr/share/nginx/html/）
  │
  └─ /api/* ───────────► Nginx 反向代理 ──► PM2 (awkn-life-backend:3000)
                              │
                              ├─ /health        健康检查
                              ├─ /health/db     数据库连通性
                              ├─ /health/llm    LLM 服务可用性
                              └─ /api/v1/*      业务 API
```

---

## 2. 三种部署模式

### 模式 1：Docker Compose（推荐，一键部署）

```bash
cd /opt/awkn-life

# 复制环境变量（首次）
cp ./awkn-life-backend/apps/api-server/.env.example \
   ./awkn-life-backend/apps/api-server/.env
# 编辑 .env 填入真实配置

# 备份数据库
bash scripts/backup-db.sh

# 构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 验证
curl http://8.148.245.29/health
```

**适用场景**：新服务器首次部署、需要完整隔离环境。

### 模式 2：PM2 + Nginx（前后端分离，更轻量）

```bash
cd /opt/awkn-life

# 安装 Nginx（如未安装）
apt-get update && apt-get install -y nginx

# 复制 Nginx 配置
cp nginx/nginx.conf /etc/nginx/nginx.conf

# 构建前端
cd /opt/awkn-life/app
npm ci --legacy-peer-deps
VITE_API_BASE_URL=http://8.148.245.29:3000/api npx vite build

# 部署前端到 Nginx 目录
mkdir -p /usr/share/nginx/html
rm -rf /usr/share/nginx/html/*
cp -r /opt/awkn-life/app/dist/* /usr/share/nginx/html/

# 部署后端（见模式 3）
# ... deploy_pm2 逻辑 ...

# 重启 Nginx
nginx -t && systemctl restart nginx

# 验证
curl http://8.148.245.29/health
```

**适用场景**：生产环境推荐，前端静态资源由 Nginx 托管，后端由 PM2 管理。

### 模式 3：仅后端 PM2

```bash
cd /opt/awkn-life/awkn-life-backend

# 安装依赖
npm ci --legacy-peer-deps

# 数据库迁移
cd apps/api-server
npx prisma generate
npx prisma migrate deploy

# 创建日志目录
mkdir -p /opt/awkn-life/logs

# 复制环境变量（首次）
cp .env.example .env
# 编辑 .env 填入真实配置

# 启动后端
pm2 delete awkn-life-backend 2>/dev/null || true
pm2 start /opt/awkn-life/awkn-life-backend/ecosystem.config.js --env production

# 确保管理员账号
cd /opt/awkn-life/awkn-life-backend
ADMIN_PASSWORD=$ADMIN_PASSWORD node apps/api-server/scripts/ensure-admin.js

# 保存 PM2 进程列表 + 设置开机自启
pm2 save
pm2 startup

# 验证
curl http://8.148.245.29:3000/health
```

**适用场景**：仅部署后端 API，前端另行托管或本地开发。

---

## 3. 环境变量

### 后端环境变量（`.env`）

完整路径：`/opt/awkn-life/awkn-life-backend/apps/api-server/.env`

#### 服务器配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 后端监听端口 |
| `NODE_ENV` | `development` | 环境标识（生产设为 `production`） |
| `FRONTEND_URL` | `http://localhost:5173` | 前端 URL（CORS 配置） |
| `CORS_ORIGINS` | — | 额外 CORS 来源（逗号分隔，覆盖默认值） |

#### 数据库

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `file:/opt/awkn-life/.../dev.db` | SQLite 连接字符串（生产务必用绝对路径） |

#### JWT 认证

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `JWT_SECRET` | `your_jwt_secret_here` | JWT 签名密钥（生产必须替换） |
| `JWT_EXPIRES_IN` | `15m` | Token 过期时间 |

#### LLM Provider

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DEFAULT_LLM_PROVIDER` | `sensenova` | 默认 LLM 提供商（ecosystem.config.js 覆盖为 `deepseek-direct`） |
| `CHEAP_LLM_PROVIDER` | — | 辅助任务 Provider（ecosystem.config.js 设为 `sensenova`） |
| `VOLCENGINE_API_KEY` | — | 火山引擎共享 Key |
| `ARK_API_KEY` | — | 火山引擎 ARK Key 别名 |
| `MOONSHOT_API_KEY` / `KIMI_API_KEY` | — | Moonshot (Kimi) API Key |
| `MOONSHOT_BASE_URL` | `https://api.moonshot.cn/v1` | Moonshot API 地址 |
| `MOONSHOT_MODEL` | `moonshot-v1-8k` | Moonshot 模型 |
| `DOUBAO_API_KEY` | — | 豆包 API Key |
| `DOUBAO_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | 豆包 API 地址 |
| `DOUBAO_MODEL` | — | 豆包模型/端点 |
| `DEEPSEEK_API_KEY` | — | DeepSeek（火山引擎）API Key |
| `DEEPSEEK_BASE_URL` | `https://ark.cn-beijing.volces.com/api/v3` | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | DeepSeek 模型 |
| `MINIMAX_API_KEY` | — | MiniMax API Key |
| `MINIMAX_BASE_URL` | `https://api.minimaxi.com/v1` | MiniMax API 地址 |
| `MINIMAX_MODEL` | `MiniMax-Text-01` | MiniMax 模型 |
| `SENSENOVA_API_KEY` | — | 商汤日日新 API Key |
| `SENSENOVA_BASE_URL` | `https://token.sensenova.cn/v1` | 商汤 API 地址 |
| `SENSENOVA_MODEL` | `deepseek-v4-flash` | 商汤模型 |
| `DEEPSEEK_DIRECT_API_KEY` | — | DeepSeek 官方直连 API Key |
| `DEEPSEEK_DIRECT_BASE_URL` | `https://api.deepseek.com/v1` | DeepSeek 官方 API 地址 |
| `DEEPSEEK_DIRECT_MODEL` | `deepseek-v4-pro` | DeepSeek 官方模型 |
| `SPARK_API_KEY` / `XFYUN_API_KEY` | — | 讯飞星火 API Key |
| `SPARK_BASE_URL` | `https://maas-api.cn-huabei-1.xf-yun.com/v2` | 讯飞 API 地址 |
| `SPARK_MODEL` | `xopqwen36v35b` | 讯飞模型 |
| `OPENAI_API_KEY` | — | OpenAI 兼容 API Key（兜底） |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API 地址 |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI 模型 |

#### 支付

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `STRIPE_SECRET_KEY` | `sk_test_xxx` | Stripe 密钥 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Stripe Webhook 签名 |
| `WECHAT_APP_ID` | — | 微信支付 App ID |
| `WECHAT_MCH_ID` | — | 微信支付商户号 |
| `WECHAT_API_KEY` | — | 微信支付 API Key |
| `ALIPAY_APP_ID` | — | 支付宝 App ID |
| `ALIPAY_PRIVATE_KEY` | — | 支付宝私钥 |
| `ALIPAY_PUBLIC_KEY` | — | 支付宝公钥 |

#### 管理员

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ADMIN_EMAIL` | `10919669@qq.com` | 管理员邮箱 |
| `ADMIN_PASSWORD` | `changeme` | 管理员密码（首次启动时创建） |

#### 其他

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DIVINATION_SERVICE_URL` | `http://127.0.0.1:5001` | Python 算命引擎地址 |
| `LLM_PROMPT_VERSION` | `v1` | LLM Prompt 版本标记 |
| `ANALYTICS_ENABLED` | `true` | 分析统计开关 |

#### Feature Flags

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_ENABLED` | `true` | Redis 队列开关（ecosystem.config.js 强制 `false`） |
| `COST_WARNING_ENABLED` | `false` | 费用提醒 |
| `COST_CONFIRMATION_ENABLED` | `false` | 费用确认 |
| `CALLBACK_ENABLED` | `false` | 回调通知 |
| `MEMORY_ANCHOR_ENABLED` | `false` | 记忆锚点 |
| `USER_CLASSIFIER_ENABLED` | `false` | 用户分类器 |
| `MULTI_TURN_ENABLED` | `false` | 多轮对话 |

### 前端环境变量（`.env`）

完整路径：`/opt/awkn-life/app/.env`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:30001/api/v1` | 后端 API 地址 |
| `VITE_USE_MOCK` | `false` | 是否使用 Mock 数据 |

---

## 4. PM2 配置

配置文件：`/opt/awkn-life/awkn-life-backend/ecosystem.config.js`

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `name` | `awkn-life-backend` | 进程名称 |
| `script` | `scripts/bootstrap-production.js` | 启动脚本 |
| `cwd` | `/opt/awkn-life/awkn-life-backend` | 工作目录 |
| `instances` | `1` | 单实例 |
| `exec_mode` | `fork` | fork 模式 |
| `max_memory_restart` | `500M` | 内存超限自动重启 |
| `watch` | `false` | 不监听文件变化 |
| `NODE_ENV` | `production` | 生产环境 |
| `PORT` | `3000` | 监听端口 |
| `REDIS_ENABLED` | `false` | 强制禁用 Redis |
| `DEFAULT_LLM_PROVIDER` | `deepseek-direct` | 默认 LLM |
| `CHEAP_LLM_PROVIDER` | `sensenova` | 辅助 LLM |

### 日志文件

| 文件 | 路径 |
|------|------|
| 错误日志 | `/opt/awkn-life/awkn-life-backend/logs/backend-error.log` |
| 输出日志 | `/opt/awkn-life/awkn-life-backend/logs/backend-out.log` |
| 合并日志 | `/opt/awkn-life/awkn-life-backend/logs/backend-combined.log` |

---

## 5. 健康检查

### 端点列表

| 端点 | 方法 | 说明 | 预期响应 |
|------|------|------|---------|
| `/health` | GET | 基础健康检查 | `{"status":"ok"}` |
| `/api/v1/health` | GET | API 健康检查 | `{"status":"ok"}` |
| `/health/db` | GET | 数据库连通性 | `{"db":"connected","provider":"sqlite"}` |
| `/health/llm` | GET | LLM 服务可用性 | LLM 连接状态（超时 10s） |

### 烟测脚本（deploy.sh 内置）

部署后自动执行 30 次 × 2s 轮询：

```bash
# 自动检查以下端点：
# 1. http://localhost:3000/health
# 2. http://localhost:3000/api/v1/health
# 3. http://localhost:3000/health/llm
# 4. http://localhost/life/ (首页可达性)
```

### 手动健康检查

```bash
# 基础检查
curl http://8.148.245.29:3000/health

# 数据库检查
curl http://8.148.245.29:3000/health/db

# LLM 检查
curl --max-time 10 http://8.148.245.29:3000/health/llm

# 首页检查
curl -o /dev/null -w "%{http_code}" http://8.148.245.29/life/
```

---

## 6. 回滚 SOP

### 回滚策略

- **前端**：恢复到最近一次备份
- **后端**：恢复代码 + 重启 PM2
- **数据库**：不做迁移回滚，只做配置回滚和管理员真值校验

### 回滚脚本

```bash
bash /opt/awkn-life/scripts/rollback.sh
```

### 回滚步骤（5 步）

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1/5 | 备份当前前端 | `cp -r /www/wwwroot/awkn-lab/life /tmp/life-rollback-$TIMESTAMP` |
| 2/5 | 恢复前端 | 从 `/opt/awkn-life-backup-*/app/dist` 恢复 |
| 3/5 | 恢复后端 | 从 `/opt/awkn-life-backup-*` 恢复代码 + `npm ci` + `prisma generate` + PM2 重启 |
| 4/5 | 管理员真值校验 | `ADMIN_PASSWORD=xxx node apps/api-server/scripts/ensure-admin.js` |
| 5/5 | 重载 Nginx | `nginx -t && systemctl reload nginx` |

### 灰度回滚（不停机）

```bash
# 关闭新 Pipeline
export PIPELINE_V2_ENABLED=false

# 重启服务
pm2 reload awkn-life-backend

# 健康检查
curl http://localhost:3000/health
```

### 数据库备份

```bash
# 手动备份
bash /opt/awkn-life/scripts/backup-db.sh

# 备份位置
# /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/backups/dev.db.YYYYMMDD_HHMMSS.bak

# 保留策略：最近 10 个备份
```

---

## 7. 常用运维操作

### PM2 操作

```bash
# 查看进程状态
pm2 list

# 查看详细信息
pm2 describe awkn-life-backend

# 重启服务
pm2 restart awkn-life-backend

# 重载（零停机）
pm2 reload awkn-life-backend

# 停止服务
pm2 stop awkn-life-backend

# 查看实时日志
pm2 logs awkn-life-backend

# 查看最近 100 行日志
pm2 logs awkn-life-backend --lines 100

# 清空日志
pm2 flush awkn-life-backend
```

### 日志查看

```bash
# 错误日志
tail -f /opt/awkn-life/awkn-life-backend/logs/backend-error.log

# 输出日志
tail -f /opt/awkn-life/awkn-life-backend/logs/backend-out.log

# 合并日志
tail -f /opt/awkn-life/awkn-life-backend/logs/backend-combined.log
```

### 环境变量更新

```bash
# 1. 编辑 .env
vim /opt/awkn-life/awkn-life-backend/apps/api-server/.env

# 2. 重启服务（环境变量在启动时加载）
pm2 restart awkn-life-backend

# 3. 验证
curl http://8.148.245.29:3000/health
```

### 数据库迁移

```bash
cd /opt/awkn-life/awkn-life-backend/apps/api-server

# 生成 Prisma Client
npx prisma generate

# 执行迁移（生产环境）
npx prisma migrate deploy

# 打开 Prisma Studio（数据浏览）
npx prisma studio
```

### 前端重新构建

```bash
cd /opt/awkn-life/app
npm ci --legacy-peer-deps
VITE_API_BASE_URL=http://8.148.245.29:3000/api npx vite build

# 部署到 Nginx
rm -rf /usr/share/nginx/html/*
cp -r dist/* /usr/share/nginx/html/
```

### Nginx 操作

```bash
# 测试配置
nginx -t

# 重载配置（不停机）
systemctl reload nginx

# 重启 Nginx
systemctl restart nginx

# 查看 Nginx 状态
systemctl status nginx
```

---

## 8. SSH 连接

```bash
ssh -i ~/.ssh/aliyun_awkn root@8.148.245.29
```

---

## 9. 部署前检查清单

| # | 检查项 | 命令 |
|---|--------|------|
| 1 | Node.js 已安装 | `node -v`（需 v20+） |
| 2 | PM2 已安装 | `pm2 -v` |
| 3 | .env 已配置 | `cat .env \| grep -v "^#" \| grep -v "^$"` |
| 4 | JWT_SECRET 已替换 | `.env` 中非 `your_jwt_secret_here` |
| 5 | 数据库已备份 | `bash scripts/backup-db.sh` |
| 6 | 前端构建成功 | `npx vite build` 无报错 |
| 7 | Prisma 迁移就绪 | `npx prisma migrate deploy` 无报错 |
| 8 | 健康检查通过 | `curl http://localhost:3000/health` |

---

*生成日期：2026-06-15*
