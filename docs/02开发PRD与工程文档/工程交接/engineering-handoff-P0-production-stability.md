# P0 生产稳定战线工程交接

> **版本**：v2.0
> **生成日期**：2026-06-14
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **拍板依据**：线上 5 次事故复盘 + 生产环境审计 + 代码探查验证
> **优先级**：🔴 **P0 / 紧急**（线上已发生数据覆盖事故）
> **工期**：4 天（6 项任务并行）
> **目标读者**：天火（架构 Lead）、程序员（实施）、CEO（验收）
> **依赖阻塞**：无（最先执行，其他所有线的前提）

---

## 〇、阅读路径

```
本文档 §一  ←  变更摘要 + 爆炸半径         ← 天火/CEO 先看
        §二  ←  事故复盘 + 根因分析         ← 理解"为什么做"
        §三  ←  接口契约（6 项 P0 变更）    ← 核心交付
        §四  ←  数据变更（SQLite 保护）     ← 后端必看
        §五  ←  测试用例（8 项验收）        ← 验收标准
        §六  ←  部署说明（deploy.sh 改造）  ← 上线
        §七  ←  回滚方案                   ← 应急
        §八  ←  RACI + 技术约束            ← 责任到人
```

---

## 一、变更摘要 + 影响范围

### 1.1 变更摘要

| # | 变更 | 优先级 | 工期 | 验收标准 |
|---|------|--------|------|---------|
| **P0-1** | 生产数据库保护：部署脚本加 prisma db push 前置检查 + SQLite 文件锁 + 备份命令 | 🔴 P0 | 1 天 | 部署时自动备份 DB + 不覆盖已有数据 |
| **P0-2** | 部署前后自动校验：deploy.sh 加入 8 项健康检查（复用 health-check.sh） | 🔴 P0 | 0.5 天 | 部署失败自动回滚 + 30s 内检测到 |
| **P0-3** | /health/db 端点安全：✅ 已修复，当前返回 `{ db: 'connected', provider: 'sqlite' }`，不泄露 DATABASE_URL | 🟡 验证项 | 0.5 天 | 验证线上返回不含敏感信息 |
| **P0-4** | 管理员保底：每次部署后自动检查 admin 账号存在 + 密码有效 | 🔴 P0 | 0.5 天 | 管理员不再"消失" |
| **P0-5** | /life 静态资源 + 子路径修复：Nginx 配置 + Vite base path 对齐 | 🟠 P1 | 1 天 | 所有静态资源 200 |
| **P0-6** | 环境一致性：.env.example 与生产 .env 差异审计 | 🟡 P2 | 0.5 天 | 无隐性配置漂移 |

**总工期**：4 天（P0-1/P0-5 可并行，其余串行）

### 1.2 影响范围（爆炸半径）

| 影响层 | 文件 | 风险 | 说明 |
|--------|------|------|------|
| **部署脚本** | `apps/AWKN-LABlife/deploy.sh` | 🔴 高 | 改部署流程，影响每次上线 |
| **PM2 配置** | `apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js` | 🟠 中 | 内存/实例调整 |
| **健康检查** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/health.controller.ts` | 🟠 中 | 改接口返回格式 |
| **Nginx** | `apps/AWKN-LABlife/nginx/nginx.conf` + `awkn.cn.conf.current` + `life-locations.conf` | 🟠 中 | 改路由规则 |
| **Vite 构建** | `apps/AWKN-LABlife/app/vite.config.ts` | 🟡 低 | base path 调整 |
| **数据库** | 生产 SQLite `/opt/awkn-life/.../dev.db` | 🔴 高 | 保护目标，不改结构 |
| **环境变量** | `.env.example` + 生产 `.env` | 🟡 低 | 审计，不改值 |
| **Docker** | `apps/AWKN-LABlife/docker-compose.yml` + `Dockerfile` | 🟢 低 | 不改，仅确认兼容 |

**爆炸半径**：约 12 个文件，最大风险是 deploy.sh 改造（影响每次部署流程）。

---

## 二、事故复盘 + 根因分析

### 2.1 线上已发生的 5 次事故

| # | 事故 | 时间 | 影响 | 根因 | 严重度 |
|---|------|------|------|------|--------|
| **A1** | `/life` 静态资源 403 | 上线首日 | 用户无法访问结果页 | Nginx alias 配置 + Vite base path 不对齐 | 🔴 严重 |
| **A2** | 子站路径资源错配 | 上线首日 | CSS/JS 加载 404 | Nginx location 块未覆盖 `/life/` 子路径 | 🔴 严重 |
| **A3** | 结果页主题错乱 | 上线次日 | 5 色主题渲染异常 | CSS 变量在子路径下未正确加载 | 🟠 中等 |
| **A4** | 管理员账号"消失" | 上线次日 | 无法登录管理后台 | 部署后 `prisma db push` 重置了 seed 数据 | 🔴 严重 |
| **A5** | **部署覆盖生产 SQLite** | 上线第 3 日 | **所有用户数据丢失** | deploy.sh 无备份步骤，`prisma db push` 覆盖已有 DB | 🔴🔴 **灾难级** |

### 2.2 根因分析

**A5 灾难级事故链**：

```
deploy.sh 执行
  → git pull（拉新代码）
  → npm ci（安装依赖）
  → npx prisma db push（⚠️ 无前置检查，直接 push）
  → SQLite 文件被覆盖（⚠️ 无备份）
  → 所有用户数据 + 管理员账号 + 咨询记录丢失
```

**根本原因**：
1. **deploy.sh 缺少数据库保护**：无备份、无锁、无前置检查
2. **prisma db push 语义误用**：生产环境应使用 `prisma migrate deploy`，`db push` 会重建表
3. **无部署后校验**：部署完没有健康检查，问题发现滞后
4. **/health/db 泄露路径**：✅ 已修复，当前返回 `{ db: 'connected', provider: 'sqlite' }`，不泄露 DATABASE_URL
5. **PM2 1 实例 fork 模式**：无负载均衡，LLM 调用可能 OOM（当前 500M 内存上限）

### 2.3 经验沉淀

> **铁律**：部署脚本必须"先备份、再检查、后执行"。任何写操作前，先确认可回滚。

---

## 三、接口契约（6 项 P0 变更）

### 3.1 P0-1：生产数据库保护机制

#### deploy.sh 改造

```bash
# ===== 新增：数据库保护（加在 prisma db push 之前）=====

# 1. 备份 SQLite
backup_db() {
  local DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"
  local BACKUP_DIR="/opt/awkn-life/backups"
  local TIMESTAMP=$(date +%Y%m%d_%H%M%S)

  if [ -f "$DB_PATH" ]; then
    mkdir -p "$BACKUP_DIR"
    cp "$DB_PATH" "$BACKUP_DIR/dev.db.${TIMESTAMP}"
    echo "[DB-BACKUP] 备份成功: dev.db.${TIMESTAMP}"

    # 保留最近 10 个备份
    ls -t "$BACKUP_DIR"/dev.db.* | tail -n +11 | xargs -r rm
    echo "[DB-BACKUP] 清理旧备份，保留最近 10 个"
  else
    echo "[DB-BACKUP] 数据库文件不存在，跳过备份"
  fi
}

# 2. SQLite 文件锁检查
check_db_lock() {
  local DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"
  if [ -f "${DB_PATH}-journal" ] || [ -f "${DB_PATH}-wal" ]; then
    echo "[DB-LOCK] ⚠️ 检测到 SQLite WAL/Journal 文件，数据库可能正在写入"
    echo "[DB-LOCK] 等待 5 秒后重试..."
    sleep 5
    if [ -f "${DB_PATH}-journal" ] || [ -f "${DB_PATH}-wal" ]; then
      echo "[DB-LOCK] ❌ 数据库仍在写入，中止部署"
      exit 1
    fi
  fi
  echo "[DB-LOCK] ✅ 数据库无活跃写入"
}

# 3. prisma db push 前置检查（生产环境改用 migrate deploy）
prisma_safe_deploy() {
  local DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"

  if [ -f "$DB_PATH" ]; then
    # 已有数据库：只做 migrate deploy，不做 db push
    echo "[PRISMA] 检测到已有数据库，使用 prisma migrate deploy（安全）"
    cd /opt/awkn-life/awkn-life-backend/apps/api-server
    npx prisma migrate deploy
  else
    # 无数据库：首次部署，允许 db push + seed
    echo "[PRISMA] 未检测到数据库，首次部署使用 prisma db push + seed"
    cd /opt/awkn-life/awkn-life-backend/apps/api-server
    npx prisma db push
    npx prisma db seed
  fi
}
```

#### 部署流程改造

```bash
# 改造前（危险）
git pull && npm ci && npx prisma db push && pm2 reload all

# 改造后（安全）
git pull && npm ci && backup_db && check_db_lock && prisma_safe_deploy && pm2 reload all
```

### 3.2 P0-2：部署前后自动校验

#### deploy.sh 新增健康检查

```bash
# ===== 新增：部署前后健康检查 =====

# 部署前检查（记录基线）
pre_deploy_check() {
  echo "[PRE-CHECK] 部署前健康检查..."
  bash /opt/awkn-life/scripts/health-check.sh > /tmp/pre-deploy-health.log 2>&1
  PRE_STATUS=$?
  if [ $PRE_STATUS -ne 0 ]; then
    echo "[PRE-CHECK] ⚠️ 部署前健康检查异常（状态码: $PRE_STATUS），但继续部署"
    echo "[PRE-CHECK] 异常项："
    grep "FAIL" /tmp/pre-deploy-health.log || true
  fi
  echo "[PRE-CHECK] 基线已记录"
}

# 部署后检查（对比基线）
post_deploy_check() {
  echo "[POST-CHECK] 部署后健康检查（等待 10s 服务启动）..."
  sleep 10

  bash /opt/awkn-life/scripts/health-check.sh > /tmp/post-deploy-health.log 2>&1
  POST_STATUS=$?

  if [ $POST_STATUS -ne 0 ]; then
    echo "[POST-CHECK] ❌ 部署后健康检查失败！自动回滚..."
    rollback_deploy
    exit 1
  fi

  echo "[POST-CHECK] ✅ 部署后健康检查通过"
}

# 自动回滚
rollback_deploy() {
  echo "[ROLLBACK] 开始回滚..."
  cd /opt/awkn-life

  # 1. 回滚代码
  git reset --hard HEAD~1
  npm ci

  # 2. 恢复数据库
  local LATEST_BACKUP=$(ls -t /opt/awkn-life/backups/dev.db.* | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    cp "$LATEST_BACKUP" /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db
    echo "[ROLLBACK] 数据库已恢复: $LATEST_BACKUP"
  fi

  # 3. 重启服务
  pm2 reload all
  echo "[ROLLBACK] 回滚完成"
}
```

#### health-check.sh 8 项检查清单

| # | 检查项 | 命令 | 通过标准 |
|---|--------|------|---------|
| HC-1 | 后端 /health | `curl -sf http://localhost:3000/health` | HTTP 200 |
| HC-2 | /health/db | `curl -sf http://localhost:3000/health/db` | HTTP 200，返回 `{ db: 'connected', provider: 'sqlite' }` |
| HC-3 | /health/llm | `curl -sf http://localhost:3000/health/llm` | 至少 1 通道可用 |
| HC-4 | 前端 /life/ | `curl -sf https://awkn.cn/life/` | HTTP 200 |
| HC-5 | PM2 进程 | `pm2 list \| grep awkn-life` | status = online |
| HC-6 | 磁盘空间 | `df -h /opt \| awk 'NR==2{print $5}'` | 使用率 < 90% |
| HC-7 | 内存使用 | `free -m \| awk 'NR==2{printf "%.0f", $3/$2*100}'` | 使用率 < 85% |
| HC-8 | 数据库文件大小 | `stat -c%s /opt/awkn-life/.../dev.db \| awk '{if($1>536870912) exit 1}'` | < 512MB |

#### health-check.sh 完整脚本

```bash
#!/bin/bash
# health-check.sh — 8 项生产健康检查
# 用法：bash /opt/awkn-life/scripts/health-check.sh
# 返回：0 = 全部通过，1 = 有失败项

set -uo pipefail

PASS=0
FAIL=0
DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"

check() {
  local name="$1"
  local cmd="$2"
  local expect="$3"

  result=$(eval "$cmd" 2>&1)
  status=$?

  if [ $status -eq 0 ]; then
    echo "[PASS] $name"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $name — $result"
    FAIL=$((FAIL + 1))
  fi
}

echo "===== 健康检查 $(date '+%Y-%m-%d %H:%M:%S') ====="

# HC-1: 后端 /health
check "HC-1 后端 /health" \
  "curl -sf http://localhost:3000/health -o /dev/null" \
  "HTTP 200"

# HC-2: /health/db
check "HC-2 /health/db" \
  "curl -sf http://localhost:3000/health/db | grep -q '\"connected\"'" \
  "db=connected, provider=sqlite"

# HC-3: /health/llm
check "HC-3 /health/llm" \
  "curl -sf http://localhost:3000/health/llm -o /dev/null" \
  "至少 1 通道可用"

# HC-4: 前端 /life/
check "HC-4 前端 /life/" \
  "curl -sf https://awkn.cn/life/ -o /dev/null" \
  "HTTP 200"

# HC-5: PM2 进程
check "HC-5 PM2 进程" \
  "pm2 jlist | grep -q '\"name\":\"awkn-life\"' && pm2 jlist | grep -q '\"pm2_env\":{\"status\":\"online\"'" \
  "status=online"

# HC-6: 磁盘空间
DISK_USAGE=$(df -h /opt | awk 'NR==2{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -lt 90 ] 2>/dev/null; then
  echo "[PASS] HC-6 磁盘空间 — 使用率 ${DISK_USAGE}%"
  PASS=$((PASS + 1))
else
  echo "[FAIL] HC-6 磁盘空间 — 使用率 ${DISK_USAGE}%（阈值 90%）"
  FAIL=$((FAIL + 1))
fi

# HC-7: 内存使用
MEM_USAGE=$(free -m | awk 'NR==2{printf "%.0f", $3/$2*100}')
if [ "$MEM_USAGE" -lt 85 ] 2>/dev/null; then
  echo "[PASS] HC-7 内存使用 — 使用率 ${MEM_USAGE}%"
  PASS=$((PASS + 1))
else
  echo "[FAIL] HC-7 内存使用 — 使用率 ${MEM_USAGE}%（阈值 85%）"
  FAIL=$((FAIL + 1))
fi

# HC-8: 数据库文件大小
if [ -f "$DB_PATH" ]; then
  DB_SIZE=$(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null)
  DB_SIZE_MB=$((DB_SIZE / 1048576))
  if [ "$DB_SIZE" -lt 536870912 ] 2>/dev/null; then
    echo "[PASS] HC-8 数据库文件大小 — ${DB_SIZE_MB}MB（阈值 512MB）"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] HC-8 数据库文件大小 — ${DB_SIZE_MB}MB（阈值 512MB）"
    FAIL=$((FAIL + 1))
  fi
else
  echo "[FAIL] HC-8 数据库文件不存在 — $DB_PATH"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "===== 结果：PASS=${PASS} FAIL=${FAIL} ====="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
```

### 3.3 P0-3：/health/db 端点安全（✅ 已修复，降级为验证项）

> **当前状态**：已修复。`health.controller.ts` 现在返回 `{ db: 'connected', provider: 'sqlite' }`，不泄露 DATABASE_URL。
> 本项从 P0 开发任务降级为线上验证项，确认生产环境返回符合预期即可。

#### 当前实现（已安全）

```typescript
// health.controller.ts — 当前实现（已安全）
@Get('db')
async checkDb() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      db: 'connected',
      provider: 'sqlite',
      // 不返回 DATABASE_URL、路径、文件名等敏感信息
    };
  } catch (error) {
    return {
      db: 'disconnected',
      provider: 'sqlite',
      // 不返回错误详情（可能含路径信息）
    };
  }
}
```

#### 接口契约（当前线上状态）

| 字段 | 值 | 说明 |
|------|-----|------|
| `db` | `"connected"` / `"disconnected"` | 连接状态，不含路径 |
| `provider` | `"sqlite"` | 数据库类型 |
| 错误信息 | 不返回 | 防止泄露路径信息 |

### 3.4 P0-4：管理员保底

#### deploy.sh 新增管理员检查

```bash
# ===== 新增：管理员保底 =====

ensure_admin() {
  local DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"
  local ADMIN_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM User WHERE role='admin';" 2>/dev/null || echo "0")

  if [ "$ADMIN_COUNT" -eq 0 ]; then
    echo "[ADMIN] ⚠️ 未检测到管理员账号，执行 seed..."
    cd /opt/awkn-life/awkn-life-backend/apps/api-server
    npx prisma db seed
    echo "[ADMIN] ✅ 管理员账号已恢复"
  else
    echo "[ADMIN] ✅ 管理员账号存在（数量: $ADMIN_COUNT）"
  fi
}
```

#### 部署流程中的位置

```bash
# 完整部署流程（改造后）
git pull
npm ci
backup_db           # P0-1：备份
check_db_lock       # P0-1：锁检查
prisma_safe_deploy  # P0-1：安全迁移
ensure_admin        # P0-4：管理员保底
pm2 reload all
post_deploy_check   # P0-2：部署后校验
```

### 3.5 P0-5：/life 静态资源 + 子路径修复

#### Nginx 配置修正

```nginx
# awkn.cn.conf.current — 修正后

# /life 子站
location /life {
    alias /opt/awkn-life/app/dist;
    index index.html;
    try_files $uri $uri/ /life/index.html;

    # 静态资源缓存
    location ~* /life/assets/.*\.(js|css|png|jpg|svg|woff2)$ {
        alias /opt/awkn-life/app/dist/assets;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}

# API 代理
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 健康检查
location /health {
    proxy_pass http://127.0.0.1:3000/health;
}
```

#### Vite base path 对齐

```typescript
// vite.config.ts — 修正后
export default defineConfig({
  base: '/life/',  // 与 Nginx alias 路径对齐
  // ... 其余配置不变
});
```

#### 验证清单

| URL | 预期状态 | 说明 |
|-----|---------|------|
| `https://awkn.cn/life/` | 200 | 主页 |
| `https://awkn.cn/life/assets/*.js` | 200 | JS 资源 |
| `https://awkn.cn/life/assets/*.css` | 200 | CSS 资源 |
| `https://awkn.cn/life/consult` | 200 | SPA 路由 |
| `https://awkn.cn/api/v1/health` | 200 | API 健康检查 |

### 3.6 P0-6：环境一致性审计

#### 审计方法

```bash
# 对比 .env.example 与生产 .env
diff .env.example /opt/awkn-life/awkn-life-backend/apps/api-server/.env > /tmp/env-diff.log 2>&1

# 检查项
# 1. .env.example 缺失的变量（生产有但 example 没有）
# 2. 默认值不同的变量
# 3. 生产独有的变量（未文档化）
# 4. 敏感变量是否在 .env.example 中有占位符
```

#### 审计输出格式

| 变量名 | .env.example 值 | 生产值 | 差异 | 风险 |
|--------|----------------|--------|------|------|
| `DATABASE_URL` | `file:./dev.db` | `file:/opt/awkn-life/.../dev.db` | 路径不同 | 🟡 中 |
| `LLM_DEFAULT_PROVIDER` | `deepseek-direct` | `deepseek-direct` | 一致 | 🟢 低 |
| `JWT_SECRET` | `<your-secret>` | `***` | 占位符 | 🟢 低 |
| ... | ... | ... | ... | ... |

---

## 四、数据变更

### 4.1 SQLite 保护（不改结构）

本次 P0 **不修改任何数据库 schema**，仅增加保护机制：

| 变更 | 说明 | 影响 |
|------|------|------|
| 自动备份 | 部署前 `cp dev.db → backups/dev.db.{timestamp}` | 磁盘占用增加（每个备份约 5-50MB） |
| 备份清理 | 保留最近 10 个备份 | 磁盘占用可控 |
| 文件锁检查 | 部署前检查 `-journal` / `-wal` 文件 | 无额外影响 |
| 迁移方式变更 | `prisma db push` → `prisma migrate deploy` | 更安全，不重建表 |

### 4.2 Prisma 迁移策略变更

| 场景 | 改造前 | 改造后 |
|------|--------|--------|
| 首次部署 | `prisma db push` | `prisma db push`（首次允许） |
| 增量部署 | `prisma db push` | `prisma migrate deploy`（安全） |
| Schema 变更 | 直接 push（危险） | 先 `prisma migrate dev` 生成迁移文件，再 `migrate deploy` |

### 4.3 备份目录结构

```
/opt/awkn-life/backups/
├── dev.db.20260614_100000     # 备份 1
├── dev.db.20260614_110000     # 备份 2
├── ...
└── dev.db.20260614_190000     # 备份 10（最多保留 10 个）
```

### 4.4 输出格式（三套并存）

> 口径源：[_ground-truth.md](./_ground-truth.md) §2

系统输出为**三套并存**，不同路径使用不同格式：

| 套 | 名称 | 适用路径 | 字段 |
|-----|------|---------|------|
| **A** | 张半山三段式 | quick_read + deep_consult 最终渲染 | `judgment` / `premise` / `cost` / `reasoning_trace`(可选) / `costWarnings`(可选) |
| **B** | 5 层输出 | 付费分层，Generation Composer 合成 | `factLayer` / `interpretationLayer` / `deductionLayer` / `adviceLayer` / `insightLayer` |
| **C** | 6 段 Prompt | 降级路径，Generation Composer buildPrompt | 一句话定性 / 判断依据 / 当前风险 / 建议动作 / 时间窗口 / 落一句最实在的话 |

**前端消费**：`llmResult` JSON 同时包含 `zhangbanshan_output`（三段式）和 `fiveLayers`（5 层）。

**付费分层**：免费用户后 3 层（deductionLayer/adviceLayer/insightLayer）标记为 gated。

### 4.5 用户状态分类（4 类）

> 口径源：[_ground-truth.md](./_ground-truth.md) §3

| 类别 | 枚举值 | 含义 | 优先级 |
|------|--------|------|--------|
| 重复咨询 | `repeating` | 30 天内问过类似问题 | 最高 |
| 验证型 | `validating` | 问题含验证型关键词（"之前有人说"/"别的师傅说"等） | 高 |
| 真诚咨询 | `genuine` | 问题具体 + 有情绪词 + 有背景描述（三条件满足任意两个） | 中 |
| 随意浏览 | `casual` | 默认兜底 | 低 |

分类方式：纯规则（不调 LLM），代码来源 `user-state-classifier.service.ts`。

> **⚠️ 原文档 6 类（real_issue/verification/emotional_pressure/high_risk 等）未实现，已废弃。**

---

## 五、测试用例

### 5.1 P0-1：数据库保护验收

| # | 用例 | 操作 | 预期结果 |
|---|------|------|---------|
| T1-1 | 备份触发 | 执行 deploy.sh | `/opt/awkn-life/backups/` 出现新备份文件 |
| T1-2 | 备份清理 | 连续部署 12 次 | 只保留最近 10 个备份 |
| T1-3 | 锁检查-正常 | 无活跃写入时部署 | 通过，继续部署 |
| T1-4 | 锁检查-写入中 | 模拟 SQLite 写入时部署 | 等待 5s 后重试，仍写入则中止 |
| T1-5 | 已有数据库 | 有 dev.db 时部署 | 使用 `prisma migrate deploy`，不覆盖 |
| T1-6 | 首次部署 | 无 dev.db 时部署 | 使用 `prisma db push` + `seed` |
| T1-7 | 备份恢复 | 手动删除 dev.db，从备份恢复 | 数据完整，服务正常 |

### 5.2 P0-2：部署校验验收

| # | 用例 | 操作 | 预期结果 |
|---|------|------|---------|
| T2-1 | 正常部署 | 代码无问题，部署 | 前后检查通过，服务正常 |
| T2-2 | 部署失败回滚 | 模拟部署后健康检查失败 | 自动回滚到上一版本 + 恢复数据库 |
| T2-3 | 30s 检测 | 部署后服务挂掉 | 10s 等待 + 健康检查 ≤ 30s 内检测到 |
| T2-4 | 8 项检查全覆盖 | 执行 health-check.sh | 8 项全部 PASS |

### 5.3 P0-3：健康端点安全验收

| # | 用例 | 操作 | 预期结果 |
|---|------|------|---------|
| T3-1 | 正常响应 | `curl /health/db` | 返回 `{ status: "ok", database: "connected" }` |
| T3-2 | 无路径泄露 | `curl /health/db \| grep -i "file:"` | 无匹配 |
| T3-3 | 无 URL 泄露 | `curl /health/db \| grep -i "DATABASE_URL"` | 无匹配 |
| T3-4 | 数据库断开 | 停止 SQLite 后请求 | 返回 `{ status: "error", database: "disconnected" }` |

### 5.4 P0-4：管理员保底验收

| # | 用例 | 操作 | 预期结果 |
|---|------|------|---------|
| T4-1 | 管理员存在 | 正常部署 | 日志显示"管理员账号存在"，不执行 seed |
| T4-2 | 管理员丢失 | 删除 admin 用户后部署 | 自动执行 seed，管理员恢复 |
| T4-3 | 多管理员 | 有 2+ admin 时 | 不重复 seed |

### 5.5 P0-5：静态资源验收

| # | 用例 | 操作 | 预期结果 |
|---|------|------|---------|
| T5-1 | 主页加载 | `curl -sf https://awkn.cn/life/` | HTTP 200 |
| T5-2 | JS 资源 | `curl -sf https://awkn.cn/life/assets/*.js` | HTTP 200 |
| T5-3 | CSS 资源 | `curl -sf https://awkn.cn/life/assets/*.css` | HTTP 200 |
| T5-4 | SPA 路由 | `curl -sf https://awkn.cn/life/consult` | HTTP 200（非 404） |
| T5-5 | 无 403 | 全站扫描 | 无 403 响应 |

### 5.6 P0-6：环境审计验收

| # | 用例 | 操作 | 预期结果 |
|---|------|------|---------|
| T6-1 | 差异报告 | 执行审计脚本 | 生成差异报告 |
| T6-2 | 无未文档化变量 | 检查生产独有变量 | 所有变量在 .env.example 中有占位符 |
| T6-3 | 敏感变量保护 | 检查 .env.example | 无真实密钥/密码 |

---

## 六、部署说明

### 6.1 部署脚本改造：deploy.sh

**文件路径**：`apps/AWKN-LABlife/deploy.sh`

**改造要点**：

```bash
#!/bin/bash
set -euo pipefail

# ===== 配置 =====
DEPLOY_DIR="/opt/awkn-life"
BACKUP_DIR="/opt/awkn-life/backups"
DB_PATH="/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db"
HEALTH_CHECK="/opt/awkn-life/scripts/health-check.sh"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ===== 1. 部署前检查 =====
echo "===== [1/8] 部署前健康检查 ====="
pre_deploy_check

# ===== 2. 备份数据库 =====
echo "===== [2/8] 备份数据库 ====="
backup_db

# ===== 3. 数据库锁检查 =====
echo "===== [3/8] 数据库锁检查 ====="
check_db_lock

# ===== 4. 拉取代码 + 安装依赖 =====
echo "===== [4/8] 拉取代码 + 安装依赖 ====="
cd "$DEPLOY_DIR"
git pull
npm ci

# ===== 5. 安全数据库迁移 =====
echo "===== [5/8] 安全数据库迁移 ====="
prisma_safe_deploy

# ===== 6. 管理员保底 =====
echo "===== [6/8] 管理员保底 ====="
ensure_admin

# ===== 7. 重启服务 =====
echo "===== [7/8] 重启服务 ====="
pm2 reload all

# ===== 8. 部署后检查 =====
echo "===== [8/8] 部署后健康检查 ====="
post_deploy_check

echo "===== 部署完成 ====="
```

### 6.2 部署模式

deploy.sh 支持 3 种模式（保持现有）：

| 模式 | 命令 | 说明 | 备份状态 |
|------|------|------|---------|
| 完整部署（Docker） | `bash deploy.sh` | Docker 全流程 | ✅ deploy_docker 有备份步骤 |
| PM2 + Nginx | `bash deploy.sh --pm2` | PM2 模式部署 | ⚠️ deploy_pm2 **缺少备份步骤** |
| 仅后端 | `bash deploy.sh --backend-only` | 跳过前端构建 | ⚠️ 同上 |
| 回滚 | `bash deploy.sh --rollback` | 回滚到上一版本 + 恢复数据库 | — |

> **⚠️ deploy_pm2 备份缺失修复建议**：
> 当前 `deploy_docker` 模式在启动前有 `cp dev.db → backups/` 备份步骤，但 `deploy_pm2` 模式未包含此逻辑。
> 修复方案：在 `deploy_pm2()` 函数中，`prisma_safe_deploy` 调用前增加 `backup_db` 调用，与 deploy_docker 保持一致：
> ```bash
> # deploy_pm2() 中 prisma_safe_deploy 前增加
> backup_db
> check_db_lock
> ```

### 6.3 PM2 配置

**文件路径**：`apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js`

| 配置项 | 当前值 | 说明 |
|--------|--------|------|
| `instances` | 1 | SQLite 不支持多实例并发写，保持单实例 |
| `exec_mode` | fork | 与单实例匹配，fork 模式 |
| `max_memory_restart` | 500M | 内存上限 500M，超出自动重启 |
| `env.DEFAULT_LLM_PROVIDER` | deepseek-direct | 默认 LLM 通道 |
| `env.CHEAP_LLM_PROVIDER` | sensenova | 辅助 LLM 通道 |

> **注意**：SQLite 不支持多进程并发写入，因此 PM2 保持 1 实例 fork 模式。如需多实例，需先迁移到 PostgreSQL（参考 `migrate-sqlite-to-mysql.js`）。

### 6.4 Docker 兼容性

**文件路径**：`apps/AWKN-LABlife/docker-compose.yml` + `Dockerfile`

Docker 部署模式同样需要数据库保护。Dockerfile 三阶段构建流程中，需在 `pm2-runtime` 启动前加入备份逻辑：

```dockerfile
# Dockerfile — pm2-runtime 启动前增加备份
CMD ["sh", "-c", "if [ -f /app/prisma/dev.db ]; then cp /app/prisma/dev.db /app/backups/dev.db.$(date +%Y%m%d_%H%M%S); fi && npx prisma migrate deploy && pm2-runtime start ecosystem.config.js"]
```

---

## 七、回滚方案

### 7.1 自动回滚（部署后健康检查失败时触发）

```bash
rollback_deploy() {
  echo "[ROLLBACK] ===== 开始回滚 ====="

  # 1. 回滚代码到上一个 commit
  cd /opt/awkn-life
  git reset --hard HEAD~1
  npm ci

  # 2. 恢复数据库（从最近备份）
  local LATEST_BACKUP=$(ls -t /opt/awkn-life/backups/dev.db.* 2>/dev/null | head -1)
  if [ -n "$LATEST_BACKUP" ]; then
    cp "$LATEST_BACKUP" "$DB_PATH"
    echo "[ROLLBACK] 数据库已恢复: $LATEST_BACKUP"
  else
    echo "[ROLLBACK] ⚠️ 无可用备份，数据库未恢复"
  fi

  # 3. 重启服务
  pm2 reload all
  sleep 5

  # 4. 回滚后健康检查
  bash "$HEALTH_CHECK"
  if [ $? -eq 0 ]; then
    echo "[ROLLBACK] ✅ 回滚成功，服务正常"
  else
    echo "[ROLLBACK] ❌ 回滚后服务仍异常，需人工介入！"
  fi
}
```

### 7.2 手动回滚

```bash
# 1. SSH 到服务器
ssh root@8.148.245.29

# 2. 查看可用备份
ls -lt /opt/awkn-life/backups/

# 3. 选择备份恢复
cp /opt/awkn-life/backups/dev.db.20260614_100000 /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/dev.db

# 4. 回滚代码
cd /opt/awkn-life && git reset --hard <commit-hash>

# 5. 重启
pm2 reload all

# 6. 验证
curl -sf http://localhost:3000/health
```

### 7.3 回滚验证清单

| # | 检查项 | 命令 | 通过标准 |
|---|--------|------|---------|
| R1 | 服务存活 | `pm2 list` | online |
| R2 | 健康检查 | `curl /health` | 200 |
| R3 | 数据库完整 | `sqlite3 dev.db "SELECT COUNT(*) FROM User"` | 有数据 |
| R4 | 管理员存在 | `sqlite3 dev.db "SELECT COUNT(*) FROM User WHERE role='admin'"` | ≥ 1 |
| R5 | 前端可访问 | `curl -sf https://awkn.cn/life/` | 200 |

---

## 八、RACI + 技术约束

### 8.1 RACI

| 任务 | R（执行） | A（拍板） | C（咨询） | I（知情） |
|------|----------|----------|----------|----------|
| P0-1 数据库保护 | 程序员 | 天火 | CEO | 全部 |
| P0-2 部署校验 | 程序员 | 天火 | CEO | 全部 |
| P0-3 健康端点安全 | 程序员 | 天火 | CEO | 全部 |
| P0-4 管理员保底 | 程序员 | 天火 | CEO | 全部 |
| P0-5 静态资源修复 | 程序员 | 天火 | 前端 Lead | 全部 |
| P0-6 环境审计 | 程序员 | 天火 | CEO | 全部 |
| 部署执行 | 天火 | CEO | 程序员 | 全部 |
| 紧急回滚 | 天火 | CEO | 程序员 | 全部 |

### 8.2 技术约束

| 约束 | 值 | 说明 |
|------|-----|------|
| 数据库 | SQLite（生产） | 不改，仅加保护；未来迁移 PostgreSQL |
| ORM | Prisma 5.x | `migrate deploy` 替代 `db push` |
| 部署方式 | PM2 + Nginx | 不改 |
| 服务器 | 8.148.245.29 | 阿里云轻量应用服务器 |
| 生产目录 | `/opt/awkn-life` | 不改 |
| 备份保留 | 最近 10 个 | 每个约 5-50MB |
| 健康检查超时 | 30s | 部署后等待 10s + 检查 20s |
| 回滚策略 | 自动 + 手动 | 健康检查失败自动回滚 |
| Shell | bash | deploy.sh 使用 `set -euo pipefail` |
| 字符集 | UTF-8 | 全链路 |
| Redis | 强制禁用（REDIS_ENABLED=false） | 当前不使用 Redis 缓存 |
| 前端 base path | /life/ | 开发+生产统一 |

#### LLM Provider 通道列表（8 通道）

| 优先级 | Provider | 环境变量前缀 | 说明 |
|--------|----------|-------------|------|
| 1 | doubao（火山引擎） | DOUBAO_* | 火山引擎豆包 |
| 2 | moonshot（Kimi） | MOONSHOT_* / KIMI_* | Kimi 大模型 |
| 3 | deepseek | DEEPSEEK_* | DeepSeek API |
| 4 | minimax | MINIMAX_* | MiniMax |
| 5 | sensenova（商汤） | SENSENOVA_* | 商汤日日新 |
| 6 | **deepseek-direct** | DEEPSEEK_DIRECT_* | **默认 Provider** |
| 7 | spark（讯飞） | SPARK_* / XFYUN_* | 讯飞星火 |
| 8 | openai（兼容） | OPENAI_* | OpenAI 兼容接口 |

- **默认 Provider**：`deepseek-direct`（ecosystem.config.js DEFAULT_LLM_PROVIDER）
- **辅助 Provider**：`sensenova`（ecosystem.config.js CHEAP_LLM_PROVIDER）

### 8.3 安全约束

| 约束 | 说明 |
|------|------|
| `/health/db` 返回 `{ db: 'connected', provider: 'sqlite' }`，不泄露 DATABASE_URL | ✅ 已修复（P0-3 验证项） |
| 备份文件权限 600 | 仅 root 可读写 |
| .env 不进 git | .gitignore 已配置 |
| 密钥不进前端 | 环境变量权威来源唯一 |

### 8.4 已知限制

| 限制 | 说明 | 后续方案 |
|------|------|---------|
| SQLite 单实例 | 不支持多进程并发写 | 迁移 PostgreSQL（`migrate-sqlite-to-mysql.js`） |
| PM2 1 实例 fork 模式 | 无负载均衡 | PostgreSQL 迁移后可开启 cluster |
| 内存上限 500M | LLM 调用可能溢出 | 监控 OOM 重启频率，必要时调整 |
| 无 CDN | 静态资源走源站 | 后续接入 CDN |
| 无监控告警 | 依赖手动健康检查 | 后续接入 Prometheus + Grafana |

---

## 附录 A：关键文件路径

| 类别 | 文件路径 |
|------|---------|
| 部署脚本 | `apps/AWKN-LABlife/deploy.sh` |
| PM2 配置 | `apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js` |
| Docker 配置 | `apps/AWKN-LABlife/docker-compose.yml` + `Dockerfile` |
| Nginx 主配置 | `apps/AWKN-LABlife/nginx/nginx.conf` |
| Nginx 站点配置 | `apps/AWKN-LABlife/nginx/awkn.cn.conf.current` |
| Nginx 子路径 | `apps/AWKN-LABlife/nginx/life-locations.conf` |
| 健康检查控制器 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/health.controller.ts` |
| P0 健康检查脚本 | `scripts/health-check.sh` |
| 回滚脚本 | `scripts/rollback.sh` |
| .env.example | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/.env.example` |
| Prisma Schema | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma` |
| SQLite 迁移脚本 | `apps/AWKN-LABlife/awkn-life-backend/scripts/migrate-sqlite-to-mysql.js` |
| Vite 配置 | `apps/AWKN-LABlife/app/vite.config.ts` |

## 附录 B：上游/下游文档

| 方向 | 文档 | 关系 |
|------|------|------|
| 上游 | `engineering-handoff-overview.md` | 总览（P0 修管阶段） |
| 上游 | `engineering-handoff-L2-pipeline.md` | L2 Pipeline（P0 修管核心） |
| 上游 | `docs/dev/execution/00-decisions-confirmed.md` | 拍板文件 |
| 下游 | `scripts/health-check.sh` | 健康检查脚本（需更新） |
| 下游 | `scripts/rollback.sh` | 回滚脚本（需更新） |
| 下游 | `docs/dev/rollback-sop.md` | 回滚 SOP |

## 附录 C：部署检查清单（打印版）

```
□ 1. 备份数据库（backup_db）
□ 2. 检查数据库锁（check_db_lock）
□ 3. 拉取代码（git pull）
□ 4. 安装依赖（npm ci）
□ 5. 安全迁移（prisma_safe_deploy）
□ 6. 管理员保底（ensure_admin）
□ 7. 重启服务（pm2 reload all）
□ 8. 部署后检查（post_deploy_check）
□ 9. 验证前端可访问（curl https://awkn.cn/life/）
□ 10. 验证 API 可用（curl https://awkn.cn/api/v1/health）
```

---

*生成日期：2026-06-14*
*修订日期：2026-06-15（v2.0 代码探查修正）*
*下次更新：P0 全部任务完成后*
