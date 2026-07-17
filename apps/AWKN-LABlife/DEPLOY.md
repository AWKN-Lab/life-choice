# 人生决策宗师 - 部署指南

## 一、架构概览

```
浏览器 ──→ Nginx (80/443) ──→ 前端静态文件 (SPA)
                    └──→ 后端 API :3000 ──→ SQLite/PG
                                          └──→ LLM Providers (DeepSeek/SenseNova/MiniMax)
```

## SQLite 单实例约束

当前数据库为 SQLite 单实例，不支持：
- 水平扩展（多实例无法共享 SQLite 文件）
- 高可用（单点故障）
- 高并发写入（SQLite 写锁是数据库级）

PostgreSQL 迁移计划见 Week 16-20（独立项目）。

在完成 PostgreSQL 迁移前：
- 部署仅支持单实例 PM2（exec_mode: fork 或 cluster instances: 1）
- 不支持 Docker 多容器部署
- 备份使用 sqlite3 .backup 命令（见 4.5 章节）

## 二、部署清单

### 2.1 阿里云轻量应用服务器

| 项目 | 配置 |
|------|------|
| IP | 8.148.245.29 |
| SSH | `ssh -i ~/.ssh/aliyun-awkn root@8.148.245.29` |
| 系统 | Linux（推荐 Ubuntu 22.04） |

**安全组需开放：**
- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH)

### 2.2 上传代码到服务器

```bash
# 在本机执行，压缩项目
cd "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师"
tar -czf awkn-life.tar.gz AWKN-LABlife/ --exclude='awkn-life.tar.gz' \
  --exclude='node_modules' --exclude='.git' --exclude='dist'

# 上传到服务器
scp -i "C:\Users\10919\.ssh\aliyun-awkn" \
  awkn-life.tar.gz \
  root@8.148.245.29:/opt/

# 在服务器解压
ssh -i "~/.ssh/aliyun-awkn" root@8.148.245.29
cd /opt
tar -xzf awkn-life.tar.gz
```

### 2.3 服务器环境安装

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 Docker (可选)
curl -fsSL get.docker.com | bash
```

### 2.4 配置环境变量

```bash
cd /opt/awkn-life

# 复制并编辑环境变量
cp awkn-life-backend/apps/api-server/.env.example \
   awkn-life-backend/apps/api-server/.env

# 必须修改以下项：
# JWT_SECRET=填入强随机字符串
# 确认 LLM API Key 已填入
nano awkn-life-backend/apps/api-server/.env
```

### 2.5 一键部署

```bash
chmod +x deploy.sh
./deploy.sh
```

### 2.6 部署完整性校验（2026-06-27 更新，源自 P1-B+P2-B 部署故障）

> 来源：E230（npm install 中断导致 node_modules 不完整）

#### 2.6.1 故障场景

2026-06-27 部署时，`npm install --legacy-peer-deps` 因 prisma generate 权限问题中途退出，导致 node_modules 缺失 98 个包。Node.js 启动时 `require('gpt-tokenizer')` 报 `MODULE_NOT_FOUND`，PM2 持续崩溃重启（restarts=293）。

#### 2.6.2 deploy.sh 必须包含的 3 个门禁

```bash
# ---- G1: chmod 门 ----
echo "[deploy] chmod node_modules/.bin/*"
cd $PROJECT_DIR/awkn-life-backend/apps/api-server
chmod +x node_modules/.bin/* 2>/dev/null || true
find node_modules -name '*.sh' -exec chmod +x {} \;

# ---- G2: 完整性校验门 ----
echo "[deploy] verify node_modules integrity"
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
" || { echo "[deploy] FAILED: node_modules incomplete"; exit 1; }

# ---- G3: 模块可解析性预检 ----
echo "[deploy] preflight module resolvability"
node -e "
  const pkg = require('./package.json');
  for (const name of Object.keys({...pkg.dependencies, ...pkg.devDependencies})) {
    try { require.resolve(name); } catch (e) {
      throw new Error(name + ': ' + e.message);
    }
  }
  console.log('[deploy] ✅ All', Object.keys({...pkg.dependencies, ...pkg.devDependencies}).length, 'modules resolvable');
" || { echo "[deploy] FAILED: module resolve"; exit 1; }
```

#### 2.6.3 快速恢复（如果服务已崩溃）

```bash
# 方案 A: 单包 npm install 自动补齐（推荐，<60s）
cd $PROJECT_DIR/awkn-life-backend/apps/api-server
npm install <missing-pkg>@<version> --legacy-peer-deps --no-audit --no-fund
# 例: npm install gpt-tokenizer@^2.5.0 --legacy-peer-deps

# 方案 B: 删除 node_modules 完整重装（5-10 min）
cd $PROJECT_DIR/awkn-life-backend/apps/api-server
rm -rf node_modules
npm install --legacy-peer-deps --no-audit --no-fund

# 方案 C: 回滚到备份点（1-2 min，丢失新代码）
bash $PROJECT_DIR/scripts/rollback.sh
```

## 三、部署模式

### 模式1：Docker Compose（推荐）

```bash
docker-compose up -d
# 访问 http://8.148.245.29
```

### 模式2：PM2 + Nginx

```bash
# 前端构建
cd app
npm install
VITE_API_BASE_URL=http://8.148.245.29:3000/api npx vite build

  # 后端构建
  cd ../awkn-life-backend/apps/api-server
  npm install
  npx prisma generate
  # 新增数据表（Invite/Referral/GrowthOffer）
  npx prisma db push
  # 或正式环境使用 migrate:
  # npx prisma migrate deploy

# PM2 启动
pm2 start /opt/awkn-life/ecosystem.config.js

# Nginx
cp /opt/awkn-life/nginx/nginx.conf /etc/nginx/nginx.conf
nginx -t && systemctl restart nginx
```

## 四、关键配置

### 4.1 LLM Provider

支持多 LLM Provider，自动 failover（2026-06-19 更新，反映实际配置）：

```
# 默认 Provider（实际运行时由 LlmProvidersService 初始化）
DEFAULT_LLM_PROVIDER=deepseek-direct

# DeepSeek（默认主路径）
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# SenseNova（廉价路径，用于简单任务）
SENSENOVA_API_KEY=xxx
SENSENOVA_BASE_URL=https://api.sensenova.cn/v1

# MiniMax（容灾备选）
MINIMAX_API_KEY=sk-xxx
MINIMAX_BASE_URL=https://api.minimaxi.com/v1

# Doubao / Spark 等其他 provider 可选配置
```

Provider 优先级：deepseek-direct（默认）→ sensenova（廉价）→ minimax/doubao/spark（容灾）。
具体启用状态见启动日志 `[LlmProvidersService] LLM Providers initialized`。

### 4.2 数据库

默认 SQLite（`prisma/prod.db`），生产量大后切换 PostgreSQL：

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/awkn_life"
```

切换步骤：
1. 修改 `.env` 的 `DATABASE_URL`
2. 运行 `npx prisma migrate deploy`
3. 重启服务

### 4.3 HTTPS（可选）

使用 Let's Encrypt 免费证书：

```bash
apt-get install certbot
certbot certonly --nginx -d your-domain.com
# 然后编辑 nginx.conf 取消 HTTPS server 块注释
```

### 4.4 HTTPS 证书自动续期

Let's Encrypt 证书有效期 90 天，建议配置 cron 自动续期。续期脚本位于 `apps/AWKN-LABlife/scripts/cert-renew.sh`，执行流程：

1. `certbot renew --quiet` 静默续期
2. 续期成功后 `systemctl reload nginx`（失败回退 `nginx -s reload`）
3. 失败时发送告警（webhook / 邮件占位，通过环境变量 `ALERT_WEBHOOK` / `ALERT_EMAIL` 注入）
4. 全过程记录到 `/var/log/cert-renew.log`

#### 4.4.1 cron 配置

每周一 03:00 执行一次续期（certbot 自身只在证书到期前 30 天才会真正续期，其余时间会跳过，因此每周执行是安全的）：

```
0 3 * * 1 /opt/awkn-life/scripts/cert-renew.sh >> /var/log/cert-renew.log 2>&1
```

#### 4.4.2 服务器端安装命令

```bash
# 1. 复制脚本到服务器
scp apps/AWKN-LABlife/scripts/cert-renew.sh user@server:/opt/awkn-life/scripts/

# 2. 赋予可执行权限
chmod +x /opt/awkn-life/scripts/cert-renew.sh

# 3. 添加 cron 任务（每周一 03:00）
(crontab -l 2>/dev/null; echo "0 3 * * 1 /opt/awkn-life/scripts/cert-renew.sh >> /var/log/cert-renew.log 2>&1") | crontab -

# 4. （可选）配置告警环境变量
#    ALERT_WEBHOOK=https://your-feishu-or-dingtalk-webhook
#    ALERT_EMAIL=ops@your-domain.com
```

#### 4.4.3 验证

```bash
# 1. 验证 cron 任务已添加
crontab -l | grep cert-renew
# 期望输出：0 3 * * 1 /opt/awkn-life/scripts/cert-renew.sh >> /var/log/cert-renew.log 2>&1

# 2. 验证 certbot 续期流程可用（不会真正续期，仅模拟）
certbot renew --dry-run
# 期望输出：Congratulations, all simulated renewals succeeded

# 3. 手动执行一次脚本，确认日志写入正常
/opt/awkn-life/scripts/cert-renew.sh
tail -f /var/log/cert-renew.log

# 4. 检查证书到期时间
openssl x509 -enddate -noout -in /etc/letsencrypt/live/your-domain.com/cert.pem
```

#### 4.4.4 回滚

如需移除自动续期：

```bash
# 移除 cron 任务
crontab -l | grep -v cert-renew | crontab -
# 确认已移除
crontab -l | grep cert-renew  # 应无输出
```

证书本身仍可手动续期：`certbot renew`。

### 4.5 数据库定时备份

SQLite 数据库是核心数据资产，建议配置 cron 每日定时备份。备份脚本位于 `apps/AWKN-LABlife/scripts/cron-backup.sh`，执行流程：

1. 优先使用 `sqlite3 .backup`（原子操作，不会拷贝到不一致状态），无 `sqlite3` 时回退 `cp`
2. 备份到 `/opt/awkn-life-backups/awkn-life-YYYYMMDD-HHMMSS.db`
3. 保留最近 30 份，超出部分自动清理
4. 失败时发送告警（webhook / 邮件占位，通过环境变量 `ALERT_WEBHOOK` / `ALERT_EMAIL` 注入）
5. 全过程记录到 `/var/log/awkn-backup.log`

DB_PATH 解析优先级：命令行参数 > 环境变量 `DB_PATH` > 默认值 `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db`。

#### 4.5.1 cron 配置

每日 02:00 执行一次备份：

```
0 2 * * * /opt/awkn-life/scripts/cron-backup.sh >> /var/log/awkn-backup.log 2>&1
```

#### 4.5.2 服务器端安装命令

```bash
# 1. 复制脚本到服务器
scp apps/AWKN-LABlife/scripts/cron-backup.sh user@server:/opt/awkn-life/scripts/

# 2. 赋予可执行权限
chmod +x /opt/awkn-life/scripts/cron-backup.sh

# 3. 创建备份目录
mkdir -p /opt/awkn-life-backups

# 4. 添加 cron 任务（每日 02:00）
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/awkn-life/scripts/cron-backup.sh >> /var/log/awkn-backup.log 2>&1") | crontab -

# 5. （可选）配置告警环境变量与 DB_PATH
#    在 /etc/environment 或 cron 调用 wrapper 中注入：
#    DB_PATH=/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db
#    ALERT_WEBHOOK=https://your-feishu-or-dingtalk-webhook
#    ALERT_EMAIL=ops@your-domain.com
```

> 注：cron 默认环境极简，若需指定生产 DB（如 `prod.db`），建议在 cron 行前显式注入环境变量，或编写 wrapper 脚本调用 `cron-backup.sh`。

#### 4.5.3 验证

```bash
# 1. 验证 cron 任务已添加
crontab -l | grep cron-backup
# 期望输出：0 2 * * * /opt/awkn-life/scripts/cron-backup.sh >> /var/log/awkn-backup.log 2>&1

# 2. 手动执行一次脚本，确认备份生成
/opt/awkn-life/scripts/cron-backup.sh
# 期望输出：[INFO] 备份成功（sqlite3 .backup 原子操作）

# 3. 查看备份目录
ls -lh /opt/awkn-life-backups/
# 期望输出：awkn-life-YYYYMMDD-HHMMSS.db 文件

# 4. 查看日志
tail -f /var/log/awkn-backup.log
# 期望包含：==== 数据库定时备份结束 (成功) ====

# 5. 验证备份文件可读（sqlite3 完整性检查）
sqlite3 /opt/awkn-life-backups/awkn-life-YYYYMMDD-HHMMSS.db "PRAGMA integrity_check;"
# 期望输出：ok
```

#### 4.5.4 回滚

如需移除定时备份：

```bash
# 移除 cron 任务
crontab -l | grep -v cron-backup | crontab -
# 确认已移除
crontab -l | grep cron-backup  # 应无输出
```

历史备份文件保留在 `/opt/awkn-life-backups/`，可手动清理：

```bash
# 清理所有历史备份（谨慎执行）
# rm -rf /opt/awkn-life-backups/*.db
```

## 五、运维命令

```bash
# 查看日志
pm2 logs awkn-life-backend

# 重启服务
pm2 restart awkn-life-backend

# 查看状态
pm2 list

# 更新代码后重部署
git pull
docker-compose down && docker-compose up -d --build
# 或
pm2 restart awkn-life-backend

# 备份数据库
cp prisma/prod.db prisma/prod.db.bak.$(date +%Y%m%d)
```

## 六、健康检查

> 来源：E232（部署后必做 4 验 + unstable_restarts=0 → 部署验收门升级）
> 2026-06-27 更新：从 1 件套升级到 5 件套

### 6.1 1 件套（旧版，已废弃）

```bash
curl http://8.148.245.29:3000/api/v1/health
# 期望返回 {"code":0,"message":"ok","service":"awkn-life-backend"}
```

**问题**：健康通过但前端白屏/后端 API 500/PM2 崩溃-重启 等场景无法检测。

### 6.2 5 件套（推荐 2026-06-27 起）

```bash
#!/bin/bash
# verify-deploy.sh - 部署后必做 5 件套验证
set -e

PORT_FRONTEND="${PORT_FRONTEND:-80}"
PORT_BACKEND="${PORT_BACKEND:-30000}"
SERVICE_NAME="${SERVICE_NAME:-awkn-life-backend}"
EXPECTED_TITLE="${EXPECTED_TITLE:-人生决策宗师}"

echo "[1/5] HTML title"
HTML=$(curl -s -m 5 http://localhost:$PORT_FRONTEND/)
echo "$HTML" | grep -q "<title>$EXPECTED_TITLE</title>" && echo "  ✅ OK" || { echo "  ❌ FAILED"; exit 1; }

echo "[2/5] JS 哈希（防 dist 未同步）"
echo "$HTML" | grep -qE 'src="[^"]+-[A-Za-z0-9_-]{8,}\.js"' && echo "  ✅ OK" || { echo "  ❌ FAILED"; exit 1; }

echo "[3/5] 健康检查"
HEALTH=$(curl -s -m 5 http://localhost:$PORT_BACKEND/api/v1/health)
echo "$HEALTH" | grep -q '"code":0' && echo "  ✅ OK" || { echo "  ❌ FAILED: $HEALTH"; exit 1; }

echo "[4/5] API 路由（404 必须返回 404，不能是 500）"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT_BACKEND/api/v1/__nonexistent__)
[ "$STATUS" = "404" ] && echo "  ✅ OK" || { echo "  ❌ FAILED: $STATUS"; exit 1; }

echo "[5/5] PM2 稳定（unstable_restarts 必须为 0）"
UNSTABLE=$(pm2 describe $SERVICE_NAME 2>/dev/null | grep 'unstable restarts' | awk '{print $4}')
[ "$UNSTABLE" = "0" ] && echo "  ✅ OK" || { echo "  ❌ FAILED: unstable_restarts=$UNSTABLE"; exit 1; }

echo ""
echo "🎉 ALL 5 CHECKS PASSED"
```

### 6.3 验证脚本使用

```bash
# 部署后立即执行
cd /opt/awkn-life
bash scripts/verify-deploy.sh

# 失败时自动回滚
bash scripts/verify-deploy.sh || bash scripts/rollback.sh
```

### 6.4 5 件套覆盖矩阵

| 验证项 | 防何种故障 |
|--------|-----------|
| HTML title | 前端 dist 未同步（白屏） |
| JS 哈希 | 构建产物缺失（前端缓存） |
| 健康检查 | 后端未启动 / 数据库断连 |
| API 404 | 控制器未注册 / 全局异常吞 500 |
| unstable_restarts | 静默崩溃-重启循环 |

## 七、故障排查

| 问题 | 解决方案 |
|------|---------|
| 502 Bad Gateway | 检查后端是否运行：`pm2 list` |
| LLM 调用失败 | 检查 API Key 和网络连同性 |
| 页面空白 | 检查 Nginx 配置和前端构建产物 |
| 数据库错误 | 运行 `npx prisma db push` |

## 八、Staging 环境

Staging 环境用于 develop 分支的集成验证，与生产环境完全隔离（独立服务器、独立数据库、独立域名、独立 .env）。

### 8.1 环境信息

| 项目 | 配置 |
|------|------|
| Staging 服务器 IP | `<STAGING_HOST>`（占位符，配置于 GitHub Secret `STAGING_DEPLOY_HOST`） |
| SSH 用户 | `<STAGING_USER>`（占位符，配置于 GitHub Secret `STAGING_DEPLOY_USER`） |
| SSH Key | 配置于 GitHub Secret `STAGING_DEPLOY_SSH_KEY` |
| Staging 域名 | `staging.example.com`（占位符，需在 DNS 解析到 staging 服务器） |
| 后端端口 | `3001`（与生产 3000 隔离） |
| 后端 PM2 进程名 | `awkn-life-staging`（与生产 `awkn-life-backend` 隔离） |
| 项目目录 | `/opt/awkn-life-staging`（与生产 `/opt/awkn-life` 隔离） |
| 前端静态目录 | `/var/www/awkn-life-staging/`（与生产 `/var/www/awkn-life/` 隔离） |

### 8.2 Staging 数据库

Staging 使用独立的 SQLite 文件，与生产数据库物理隔离：

```env
DATABASE_URL="file:./staging.db"
```

- 文件位置：`/opt/awkn-life-staging/awkn-life-backend/apps/api-server/prisma/staging.db`
- **禁止**指向生产的 `prod.db`，避免 staging 测试数据污染生产
- Staging 数据库可随时重置（`rm staging.db && npx prisma migrate deploy`），不影响生产

### 8.3 Staging .env 配置

Staging 后端使用独立的 `.env.staging`，与生产 `.env` / `.env.prod` 完全隔离：

```bash
# 在 staging 服务器首次部署时创建
cd /opt/awkn-life-staging/awkn-life-backend/apps/api-server
cp .env.example .env.staging
nano .env.staging
```

`.env.staging` 必须配置的关键项：

```env
# 独立数据库
DATABASE_URL="file:./staging.db"

# JWT 密钥（与生产不同，避免 token 串用）
JWT_SECRET=<staging-only-strong-random-string>

# LLM Provider（可使用测试 Key 或共享 Key，按需调整）
DEFAULT_LLM_PROVIDER=deepseek-direct
DEEPSEEK_API_KEY=<staging-key-or-shared-key>

# 端口（与生产隔离）
PORT=3001
NODE_ENV=staging
```

> 首次部署时 CI 会执行 `cp -n .env.staging .env`（仅在 .env 不存在时复制）；后续部署保留现有 .env，避免覆盖人工调优的配置。

### 8.4 部署流程（CI 自动部署）

Staging 部署由 GitHub Actions 自动触发，**无需手动操作**：

```
develop 分支 push
    ↓
CI workflow 触发
    ↓
backend / frontend / security 三个 job 全部通过
    ↓
staging-deploy job 执行（SSH 到 staging 服务器）
    ↓
git pull origin develop
    ↓
后端：npm ci → prisma migrate deploy → npm run build → pm2 reload awkn-life-staging
    ↓
前端：npm ci → npm run build → rsync 到 /var/www/awkn-life-staging/
    ↓
部署后健康监测（连续 3 次 /health，间隔 30s）
    ↓
部署后冒烟测试（BASE_URL=http://localhost:3001 smoke-test.sh）
    ↓
全部通过 → ✅ Staging 部署完成
任一失败 → ❌ 自动回滚 + 告警
```

对应 ci.yml 中的 `staging-deploy` job，触发条件：`github.event_name == 'push' && github.ref == 'refs/heads/develop'`，依赖 `backend / frontend / security` 三个 job 通过（不含 docker-build，因为 docker-build 仅在 main 分支运行）。

### 8.5 Staging 回滚

Staging 部署失败时自动触发回滚，回滚策略与生产略有差异：

| 场景 | 生产 | Staging |
|------|------|---------|
| 回滚工具 | `rollback.sh`（配置回滚 + 管理员真值校验） | `pm2 rollback awkn-life-staging` |
| 触发方式 | 部署后健康检查/冒烟失败自动触发 | 同左 |

**为什么 Staging 不使用 rollback.sh？**

`rollback.sh` 当前硬编码生产路径（`PROJECT_DIR=/opt/awkn-life`、PM2 进程 `awkn-life-backend`、前端目录 `/www/wwwroot/awkn-lab/life`、`.env.prod`），不支持 `BASE_URL` 环境变量。在 staging 服务器上调用会因路径不匹配而失效，甚至可能误操作。因此 staging 回滚使用 `pm2 rollback awkn-life-staging`（PM2 内置的版本回滚，依赖部署时 `pm2 save` 的版本快照）。

**手动回滚 Staging：**

```bash
ssh <STAGING_USER>@<STAGING_HOST>
pm2 rollback awkn-life-staging
# 回滚后验证
BASE_URL=http://localhost:3001 bash /opt/awkn-life-staging/apps/AWKN-LABlife/scripts/smoke-test.sh
```

> 已知限制：`rollback.sh` 暂不支持 staging（路径硬编码 + 不支持 BASE_URL）。如需统一回滚入口，未来需重构 rollback.sh 支持环境参数化（`PROJECT_DIR` / `PM2_NAME` / `BASE_URL` 由环境变量注入）。该改进不在本次范围内。

### 8.6 Staging 冒烟测试

`smoke-test.sh` 原生支持 `BASE_URL` 环境变量（默认 `http://localhost:3000`），Staging 冒烟测试通过环境变量指向 staging 端口：

```bash
# CI 中自动执行（staging-deploy job 内）
BASE_URL=http://localhost:3001 bash /opt/awkn-life-staging/apps/AWKN-LABlife/scripts/smoke-test.sh

# 手动执行
ssh <STAGING_USER>@<STAGING_HOST>
BASE_URL=http://localhost:3001 bash /opt/awkn-life-staging/apps/AWKN-LABlife/scripts/smoke-test.sh
```

冒烟测试覆盖 5 个核心链路（健康检查、数据库连通性、咨询链路、支付链路、根路径可达性），任一失败即阻断部署或触发回滚。

### 8.7 Staging 与生产隔离清单

| 维度 | 生产 | Staging |
|------|------|---------|
| 服务器 | `8.148.245.29` | `<STAGING_HOST>` |
| 项目目录 | `/opt/awkn-life` | `/opt/awkn-life-staging` |
| 后端端口 | 3000 | 3001 |
| PM2 进程 | `awkn-life-backend` | `awkn-life-staging` |
| 数据库 | `prisma/prod.db` | `prisma/staging.db` |
| 环境变量 | `.env` / `.env.prod` | `.env.staging` |
| 前端目录 | `/var/www/awkn-life/` | `/var/www/awkn-life-staging/` |
| 触发分支 | `main` | `develop` |
| CI Job | `deploy` | `staging-deploy` |
| 回滚工具 | `rollback.sh` + `pm2 rollback` | `pm2 rollback` |

### 8.8 首次部署 Staging（一次性准备）

```bash
# 1. 在 staging 服务器克隆代码
ssh <STAGING_USER>@<STAGING_HOST>
cd /opt
git clone <repo-url> awkn-life-staging
cd awkn-life-staging
git checkout develop

# 2. 配置 staging 环境变量
cd awkn-life-backend/apps/api-server
cp .env.example .env.staging
nano .env.staging  # 按 8.3 章节配置
cp -n .env.staging .env

# 3. 安装依赖并初始化数据库
npm ci
npx prisma migrate deploy
npm run build

# 4. 用 PM2 启动（端口 3001）
pm2 start ecosystem.config.js --name awkn-life-staging --update-env
pm2 save

# 5. 配置 Nginx（staging 域名反代到 3001）
# 略：参考生产 Nginx 配置，server_name 改为 staging.example.com，proxy_pass 改为 http://localhost:3001

# 6. 验证
curl http://localhost:3001/api/v1/health
BASE_URL=http://localhost:3001 bash /opt/awkn-life-staging/apps/AWKN-LABlife/scripts/smoke-test.sh
```

首次准备完成后，后续 develop 分支推送即由 CI 自动部署，无需手动操作。

## 九、文件清单

```
AWKN-LABlife/
├── app/                      # 前端 React
├── awkn-life-backend/        # 后端 NestJS
│   └── apps/api-server/
│       ├── .env.example      # 环境变量模板
│       └── prisma/           # 数据库 Schema
├── nginx/
│   └── nginx.conf            # Nginx 配置
├── Dockerfile               # 容器镜像
├── docker-compose.yml        # 容器编排
├── ecosystem.config.js       # PM2 配置
├── deploy.sh                # 一键部署脚本
└── DEPLOY.md               # 本文档
```
