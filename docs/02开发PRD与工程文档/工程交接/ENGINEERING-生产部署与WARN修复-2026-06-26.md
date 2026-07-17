# ENGINEERING — 生产部署与 WARN 修复（v1 2026-06-26）

> **本文档为 PRD v1 的工程实现侧**  
> **关联 PRD**：[PRD-生产部署与WARN修复-2026-06-26.md](../../01产品定位与PRD/需求文档/PRD-生产部署与WARN修复-2026-06-26.md)  
> **关联 spec**：`docs/06IDE配置与记忆/TRAE配置/specs/code-deploy-and-backend-warn-fix/`  
> **关联 spec**：`docs/06IDE配置与记忆/TRAE配置/specs/critical-review-cicd-deploy-blockers/`

---

## 0｜执行摘要

| 项 | 值 |
|---|---|
| 变更类型 | 部署类（无代码改动、无 API 变更） |
| 受影响接口 | 无 |
| 受影响服务 | `awkn-life-backend`（PM2）+ `awkn-life`（Nginx） |
| 风险等级 | **中-高**（生产环境） |
| 部署窗口 | 30-60min（不含 24h 观察期） |
| 监督人 | 用户在场监督（PRD REQ-1） |
| 关键依赖 | SSH `aliyun-awkn` / `.env.prod` / 旧 build 备份 |
| 关键发现 | 5 个 Agent 装饰器 + knowledge-base assets 修复**已存在于 master**，本次仅部署已修代码 |

---

## 1｜技术约束（必读）

| 维度 | 值 |
|------|---|
| 操作系统 | Linux（阿里云 ECS，Ubuntu 22.04） |
| Node 版本 | 18.20.x（PM2 + NestJS 8.x） |
| 包管理 | npm + `npm ci --legacy-peer-deps` |
| 数据库 | SQLite（dev.db / staging.db / prod.db 隔离） |
| ORM | Prisma 5.x |
| 日志 | winston + winston-daily-rotate-file（30 天保留） |
| 进程管理 | PM2（`awkn-life-backend`） |
| Web 服务器 | Nginx（前端静态 + 反向代理 `/api`） |
| SSH 别名 | `aliyun-awkn`（已 Task 24.3 统一） |
| 部署目录 | `/opt/awkn-life/`（生产） / `/opt/awkn-life-staging/`（预演） |
| 旧 build 备份 | `/opt/awkn-life-prev-deploy/`（**部署前必须确认存在**） |
| 健康端点 | `GET /api/health` / `/api/health/db` / `/api/health/ready` |
| 回滚脚本 | `/opt/awkn-life/scripts/rollback.sh` |
| 冒烟脚本 | `/opt/awkn-life/scripts/smoke-test.sh` |
| 日志路径 | `logs/backend-*.log`（按日轮转） / `/var/log/awkn-rollback.log` |

---

## 2｜影响范围

### 2.1 接口影响
- ❌ **无新增接口**
- ❌ **无接口变更**
- ❌ **无字段变更**
- ❌ **无错误码变更**
- ✅ **强化现有健康端点**（已在 critical-review-cicd-deploy-blockers Task 7 完成）
  - `GET /api/health`：DB 异常时返回 503
  - `GET /api/health/db`：返回真实 DB 状态 + responseTimeMs
  - `GET /api/health/ready`：检查 DB + LLM + JWT，返回 200 / 503

### 2.2 数据影响
- ❌ **无 schema 变更**
- ❌ **无数据迁移**
- ✅ **DB 文件覆盖**（prod.db）— 回滚脚本会自动恢复
- ✅ **winston 日志追加**（30 天保留）

### 2.3 文档影响
- ✅ 创建 PRD：`docs/01产品定位与PRD/需求文档/PRD-生产部署与WARN修复-2026-06-26.md`
- ✅ 创建本文档：`docs/02开发PRD与工程文档/工程交接/ENGINEERING-生产部署与WARN修复-2026-06-26.md`
- ✅ 更新 `specs/code-deploy-and-backend-warn-fix/tasks.md`（标记代码修复部分为"已修"）
- ✅ 更新 `specs/critical-review-cicd-deploy-blockers/tasks.md`（如本计划合并 Task 21.1）

### 2.4 配置影响
- ✅ `.env.prod` 必须在部署前对比 `.env.prod.example`（避免环境变量漂移）
- ✅ `ecosystem.config.js` 不变（winston 已接管日志）
- ✅ `nest-cli.json` 不变（assets 已配置）
- ✅ Nginx 配置不变（前端 dist 直接覆盖）

---

## 3｜分步执行清单

> **规则**：每步含 动作/产出/验收/Plan B；高风险步骤标红。

---

### Step 0｜前置：现状核查（高优先级，必做）

> **批判性审视发现**：spec 中描述的 5 个 Agent 装饰器修复 + knowledge-base assets 修复**已全部存在于 master**。执行前必须做最后核查，避免做了无效工作。

- **动作**：
  ```bash
  # 0.1 检查 5 个 Agent 装饰器
  cd apps/AWKN-LABlife/awkn-life-backend/apps/api-server
  grep -l '@Optional.*Inject.*LlmProviders' src/*-agent/*.service.ts
  
  # 0.2 检查 nest-cli.json
  cat nest-cli.json | grep -A2 "knowledge-base"
  
  # 0.3 检查知识库资源
  ls src/knowledge-base/liuren/ke-ti.json
  
  # 0.4 检查本地 vs 生产代码 drift
  git status --short | wc -l  # 本地未提交文件数
  ```
- **产出**：1 份 `现状核查-2026-06-26.md`
- **验收**：5 个 Agent 文件全部含装饰器 + nest-cli.json 含 knowledge-base + ke-ti.json 存在 + drift 数量与 PRD 描述一致
- **风险标记**：低
- **Plan B**：核查发现某项未修复 → 走"补充修复"分支（用回 tasks.md 原流程）

---

### Step 1｜SSH 凭据与服务器状态预演

- **动作**：
  ```bash
  ssh aliyun-awkn  # 或 ssh root@8.148.245.29 -i ~/.ssh/aliyun-awkn
  pm2 status
  pm2 logs awkn-life-backend --lines 100 --nostream --raw > WARN-baseline-2026-06-26.txt
  ```
- **产出**：`WARN-baseline-2026-06-26.txt`（含当前 WARN 现场）
- **验收**：SSH 连接成功 / `pm2 status` 显示 `awkn-life-backend` online / 抓出当前 WARN 列表
- **风险标记**：低
- **Plan B**：SSH 失败 → 用 `ssh root@8.148.245.29 -i ~/.ssh/aliyun-awkn` 显式 IP 连接

---

### Step 2｜本地代码状态评估与备份

- **动作**：
  ```bash
  cd /c/Users/10919/Desktop/AWKN-Lab/人生决策宗师
  git status --short
  git diff --stat | tail -1
  git add -A
  git commit -m "WIP 备份: 20260626_pre_deploy_$(git diff --cached --name-only | wc -l)文件"
  git log -1 --format="%H %s"
  ```
- **产出**：WIP backup commit（如 `a1f4ca2f WIP 备份: 20260626_pre_deploy_64文件`）
- **验收**：`git log -1` 显示备份 commit / `git status` 清洁
- **风险标记**：低
- **Plan B**：commit 信息含 secret → `git reset --soft HEAD~1` 重做

---

### Step 3｜本地代码打包与上传

- **动作**：
  ```bash
  cd /c/Users/10919/Desktop/AWKN-Lab
  tar czf awkn-life-20260626.tar.gz --exclude=node_modules --exclude=.git --exclude=dist 人生决策宗师/
  scp awkn-life-20260626.tar.gz aliyun-awkn:/opt/awkn-life/
  ```
- **产出**：`/opt/awkn-life/awkn-life-20260626.tar.gz`
- **验收**：`ls -lh /opt/awkn-life/awkn-life-20260626.tar.gz` 显示文件 + 大小 > 0
- **风险标记**：中
- **Plan B**：tar.gz > 1GB → 用 `git bundle create` 替代（增量 + 压缩）

---

### Step 4｜服务器解压到 staging 子目录

- **动作**：
  ```bash
  ssh aliyun-awkn "mkdir -p /opt/awkn-life-staging && tar xzf /opt/awkn-life/awkn-life-20260626.tar.gz -C /opt/awkn-life-staging/"
  ssh aliyun-awkn "ls /opt/awkn-life-staging/人生决策宗师/package.json"
  ```
- **产出**：staging 目录就绪，不影响 prod
- **验收**：`ls` 返回 0 / 路径含 `人生决策宗师/package.json`
- **风险标记**：低
- **Plan B**：路径含中文解压失败 → 用 `unzip` + zip 格式

---

### Step 5｜staging 跑 build

- **动作**：
  ```bash
  ssh aliyun-awkn "cd /opt/awkn-life-staging/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend && \
    npm ci --legacy-peer-deps 2>&1 | tail -10 && \
    cd apps/api-server && \
    rm -rf dist && \
    npm run build 2>&1 | tail -10"
  ```
- **产出**：`dist/main.js` + 知识库 assets 复制到 `dist/`
- **验收**：`ls dist/main.js` 存在 / `ls dist/knowledge-base/liuren/ke-ti.json` 存在
- **风险标记**：中
- **Plan B**：build 失败 → `npx tsc --noEmit` 找首个报错，先在本地修

---

### Step 6｜staging 启动 PM2 + 抓 WARN

- **动作**：
  ```bash
  ssh aliyun-awkn "cd /opt/awkn-life-staging/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server && \
    pm2 start dist/main.js --name awkn-life-staging --env staging"
  sleep 10
  ssh aliyun-awkn "pm2 logs awkn-life-staging --lines 200 --nostream --raw > /tmp/WARN-after-staging-2026-06-26.txt"
  ssh aliyun-awkn "curl -s https://awkn.cn/api/health/ready"  # 测试用，可能返回 503 因为没在 prod
  ```
- **产出**：`WARN-after-staging-2026-06-26.txt`
- **验收**：`pm2 status` 显示 staging online / 抓出的 WARN 应少于 baseline
- **风险标记**：**高**
- **Plan B**：启动失败 → `pm2 logs` 抓 stack trace / 常见原因：环境变量缺失、port 冲突

---

### Step 7｜WARN 对比验证（核心步骤）

- **动作**：
  ```bash
  ssh aliyun-awkn "diff <(grep -i 'warn' /tmp/WARN-baseline-2026-06-26.txt | sort -u) \
                        <(grep -i 'warn' /tmp/WARN-after-staging-2026-06-26.txt | sort -u) > /tmp/WARN-diff-2026-06-26.txt"
  ssh aliyun-awkn "grep -c 'Agent.*LLM' /tmp/WARN-after-staging-2026-06-26.txt"
  ssh aliyun-awkn "grep -c '知识库.*加载失败' /tmp/WARN-after-staging-2026-06-26.txt"
  ```
- **产出**：`WARN-diff-2026-06-26.txt`（应为空或仅保留新 WARN）
- **验收**：
  - "Agent LLM" 关键词 = 0
  - "知识库.*加载失败" 关键词 = 0
  - WARN 数量比 baseline 减少 ≥ 50%
- **风险标记**：**高**（核心验收点）
- **Plan B**：WARN 未消失 → 保留旧 build 不动 + 排查根因（不进入 prod）

---

### Step 8｜smoke-test 5/5

- **动作**：
  ```bash
  ssh aliyun-awkn "bash /opt/awkn-life-staging/人生决策宗师/scripts/smoke-test.sh"
  ```
  （注：smoke-test 脚本需用 `staging` 端口；如脚本硬编码 prod，需手动 `curl` 5 个核心端点）
- **产出**：smoke-test 退出码 + 输出
- **验收**：5/5 全部通过
- **风险标记**：中
- **Plan B**：单项失败 → 隔离到该端点，6 步定位法（网络 / 鉴权 / 参数 / 业务逻辑 / 数据库 / 第三方）

---

### Step 9｜staging 稳定观察 30 分钟

- **动作**：
  ```bash
  for i in 1 2 3; do
    sleep 600  # 10min
    ssh aliyun-awkn "pm2 logs awkn-life-staging --lines 100 --nostream --raw > /tmp/staging-log-$i.txt"
    ssh aliyun-awkn "curl -s https://awkn.cn/api/health/ready"  # 或 staging URL
  done
  ```
- **产出**：`staging-stability-report-2026-06-26.md`（含 3 次日志扫描结果）
- **验收**：3 次扫描无 P0 错误（`error` 关键词 = 0） + `/health/ready` 持续 200
- **风险标记**：中
- **Plan B**：出现 P0 错误 → 立即停止 + 排查（不进入 prod）

---

### Step 10｜备份当前 prod build（旧 build 备份）

- **动作**：
  ```bash
  ssh aliyun-awkn "pm2 stop awkn-life-backend && \
    rm -rf /opt/awkn-life-prev-deploy && \
    cp -r /opt/awkn-life /opt/awkn-life-prev-deploy && \
    pm2 start awkn-life-backend"
  ```
- **产出**：`/opt/awkn-life-prev-deploy/`（旧 build 完整副本）
- **验收**：`ls /opt/awkn-life-prev-deploy/package.json` 存在 + PM2 重启后 prod 仍 online
- **风险标记**：**高**（回滚依赖）
- **Plan B**：备份失败 → 立即停止（不能进入 Step 11）

---

### Step 11｜prod 部署（手动触发，按 环境晋级流程.md）

- **动作**：
  ```bash
  # 11.1 备份当前 DB
  ssh aliyun-awkn "bash /opt/awkn-life/scripts/backup-db.sh"
  
  # 11.2 部署新代码到 prod 目录
  ssh aliyun-awkn "cd /opt/awkn-life && \
    rm -rf backend.new && \
    mv /opt/awkn-life-staging/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend backend.new"
  
  # 11.3 切换 prod 引用
  ssh aliyun-awkn "cd /opt/awkn-life/apps/AWKN-LABlife && \
    rm -rf awkn-life-backend.bak && \
    mv awkn-life-backend awkn-life-backend.bak && \
    mv ../../backend.new awkn-life-backend"
  
  # 11.4 build + 重启
  ssh aliyun-awkn "cd /opt/awkn-life/apps/AWKN-LABlife/awkn-life-backend/apps/api-server && \
    npm ci --legacy-peer-deps 2>&1 | tail -5 && \
    rm -rf dist && npm run build 2>&1 | tail -5 && \
    pm2 restart awkn-life-backend"
  ```
- **产出**：prod 服务运行新代码
- **验收**：`pm2 status` 显示 prod online
- **风险标记**：**高**（生产发布）
- **Plan B**：部署失败 → 立即 `pm2 stop` + `mv` 回退 + `pm2 start`

---

### Step 12｜prod smoke-test + 健康端点验证

- **动作**：
  ```bash
  sleep 30  # 等待服务完全启动
  for i in 1 2 3; do
    curl -s https://awkn.cn/api/health
    curl -s https://awkn.cn/api/health/db
    curl -s https://awkn.cn/api/health/ready
    bash /opt/awkn-life/scripts/smoke-test.sh
    sleep 600
  done
  ```
- **产出**：3 次 prod 验证报告
- **验收**：
  - `/api/health` 3/3 = 200
  - `/api/health/db` 3/3 = 200 + `status: ok`
  - `/api/health/ready` 3/3 = 200
  - smoke-test 3/3 = 5/5
- **风险标记**：**高**
- **Plan B**：任一不通过 → `bash /opt/awkn-life/scripts/rollback.sh`

---

### Step 13｜WARN 归零最终确认

- **动作**：
  ```bash
  ssh aliyun-awkn "pm2 logs awkn-life-backend --lines 1000 --nostream --raw > /tmp/WARN-after-prod-2026-06-26.txt"
  ssh aliyun-awkn "grep -c 'Agent.*LLM' /tmp/WARN-after-prod-2026-06-26.txt"  # 应 = 0
  ssh aliyun-awkn "grep -c '知识库.*加载失败' /tmp/WARN-after-prod-2026-06-26.txt"  # 应 = 0
  ```
- **产出**：`WARN-after-prod-2026-06-26.txt`
- **验收**：2 个关键词都 = 0
- **风险标记**：**高**
- **Plan B**：仍有 WARN → 排查根因（不大于 5min）+ 决定继续观察或回滚

---

### Step 14｜命运K线 v1 桌面+移动端目视验收（destiny-kline-v1 Task 9.2）

- **动作**：
  - 桌面 Chrome：访问 `https://awkn.cn/life/`，截图保存到 `docs/05审核与质量/验收截图/2026-06-26/desktop-home.png`
  - 桌面 Chrome：访问结果页（如 `https://awkn.cn/life/result/123`），截图 `desktop-result.png`
  - 移动 Safari：访问 `https://awkn.cn/life/`，截图 `mobile-home.png`
  - 移动 Safari：访问结果页，截图 `mobile-result.png`
  - 检查项清单 10 项（见下）
- **产出**：4 张截图 + 检查项清单
- **验收**：检查项 10/10 全部 ✅
- **风险标记**：低

**检查项清单**：
1. 桌面首页显示命运K线主 CTA（不是普通算命入口）
2. 桌面首页加载新组件（MetaphysicsShowcase / BaguaDiagram 等）
3. 桌面结果页显示 K线总览 + AI解盘师
4. 桌面结果页加载 LifeKLineChart 组件
5. 移动首页布局正确（响应式）
6. 移动结果页布局正确
7. 移动端 K线卡片首位增强
8. 移动端隐私信息脱敏
9. 桌面端三语 locale 切换正常
10. 移动端三语 locale 切换正常

---

### Step 15｜MingLi-Bench 三组评测（与 prod 部署并行，可选）

- **动作**：
  ```bash
  # 三组并发跑（与 prod 流量错峰）
  nohup bash -c "mingli-bench run --preset A --output mingli-bench-A-2026-06-26.json" > /dev/null 2>&1 &
  nohup bash -c "mingli-bench run --preset B --output mingli-bench-B-2026-06-26.json" > /dev/null 2>&1 &
  nohup bash -c "mingli-bench run --preset C --output mingli-bench-C-2026-06-26.json" > /dev/null 2>&1 &
  ```
  （注：mingli-bench CLI 需先确认在 prod 环境就位；否则在本地跑）
- **产出**：`mingli-bench-{A,B,C}-2026-06-26.json`（3 个文件，每组 160 题）
- **验收**：3 个 JSON 文件存在 + 每组 `total: 160`
- **风险标记**：中（API 限流）
- **Plan B**：API 429 → 加 `Retry-After` 退避 / 单组切低并发（5 → 2）

---

### Step 16｜24h 稳定观察期（异步）

- **动作**：
  - 在天火对话窗设置 24h 后回访
  - 期间监控 Sentry 事件
  - 期间监控 PM2 日志（每日 1 次）
- **产出**：`24h-stability-report-2026-06-27.md`
- **验收**：24h 内无 P0 错误
- **风险标记**：中
- **Plan B**：24h 内出现 P0 → 立即回滚 + 复盘

---

### Step 17｜验收报告与经验沉淀

- **动作**：
  - 创建 `docs/05审核与质量/验收报告-2026-06-26.md`
  - 创建 `docs/04复盘总结/经验整合/E1-001-2026-06-26.md` 等
  - 更新 `specs/code-deploy-and-backend-warn-fix/tasks.md` 全部状态
  - 更新 `specs/critical-review-cicd-deploy-blockers/tasks.md` Task 21.1（如本计划合并执行）
  - commit：`git add -A && git commit -m "docs: 部署与WARN修复验收报告 + 经验沉淀"`
- **产出**：4-5 份文档 + 1 个 commit
- **验收**：所有文档齐全 + git log 显示 commit
- **风险标记**：低

---

## 4｜测试用例

### 4.1 部署前单元/集成测试
- **TC-1**：5 个 Agent 装饰器测试
  - 预期：每个 Agent `instance.llmProviders` 不为 undefined
  - 测试命令：`npm test -- --testPathPattern=agents`
  - 关联：[src/ziping-agent/*/__tests__/](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/ziping-agent/)
- **TC-2**：知识库加载测试
  - 预期：`LiurenCalculator.load()` 成功加载 ke-ti.json
  - 测试命令：`npm test -- --testPathPattern=liuren`

### 4.2 部署后 smoke-test
- **ST-1**：`GET /api/health` → 200
- **ST-2**：`GET /api/health/db` → 200 + `{status: "ok", responseTimeMs: <500}`
- **ST-3**：`GET /api/health/ready` → 200 + 3 项 checks 全部 ok
- **ST-4**：`POST /api/consult` → 202 + recordId
- **ST-5**：`GET /` → 200 + HTML 包含命运K线 CTA

### 4.3 端到端目视测试
- **E2E-1**：桌面端首页 → 命运K线 CTA 可见
- **E2E-2**：桌面端结果页 → K线总览 + AI解盘师可见
- **E2E-3**：移动端首页 → 布局正确 + CTA 可见
- **E2E-4**：移动端结果页 → 布局正确

### 4.4 回归测试
- **REG-1**：登录链路（POST /api/auth/login）
- **REG-2**：咨询发起 → 结果返回（完整链路 ≤ 120s）
- **REG-3**：支付链路（基础验证）
- **REG-4**：首页加载无 404
- **REG-5**：Sentry 静默（0 ERROR 事件）

---

## 5｜部署说明

### 5.1 部署前
1. 用户在场监督
2. SSH 凭据确认（`ssh aliyun-awkn` 测试）
3. `.env.prod` 对比 `.env.prod.example`
4. 旧 build 备份目录 `/opt/awkn-life-prev-deploy/` 存在
5. 数据库备份（`bash scripts/backup-db.sh`）

### 5.2 部署中
1. 按 Step 11 顺序执行
2. 任何一步出错立即停止
3. 关键日志抓取到 `/tmp/`

### 5.3 部署后
1. 3 次健康端点验证（间隔 10min）
2. 3 次 smoke-test
3. WARN 归零确认
4. 4 张目视截图
5. 24h 稳定观察

### 5.4 回滚方案
```bash
# 一键回滚（PRD REQ-5 要求 5min 内完成）
bash /opt/awkn-life/scripts/rollback.sh
```

回滚脚本自动完成：
- 恢复 `awkn-life-backend` 代码
- 恢复 `.env.prod`
- 恢复 `prod.db`
- 重启 PM2
- 跑 smoke-test
- 写入 `/var/log/awkn-rollback.log`

---

## 6｜变更记录

| 变更 | 范围 | 影响 | 风险 | 回滚 |
|------|------|------|------|------|
| 后端打包 | 60+ 文件 | 无功能变更 | 中 | 回滚旧 build |
| 前端打包 | 40+ 文件 | 用户体验提升 | 中 | 回滚前端 dist |
| 5 Agent 修复 | 已修 | WARN 归零 | 低 | 旧代码可用 |
| knowledge-base assets | 已修 | 资源加载成功 | 低 | 旧 build 可用 |
| 健康端点强化 | 已加 | 监控增强 | 低 | 不影响主流程 |

---

## 7｜未确认项 / 依赖项

| 项 | 状态 | 需谁确认 |
|---|------|---------|
| 命运K线 v1 桌面+移动端验收清单 10 项 | 待最终确认 | 产品方 |
| 24h 观察期具体起止时间 | 待定 | 部署完成后定 |
| 命运K线 v1 是否同步发版 | 已是生产一部分 | 产品方 |
| MingLi-Bench 三组评测是否本计划内 | 可选（如不冲突则并行） | 用户 |
| `apps/AWKN-LABlife/scripts/` 重复脚本是否清理 | 已 Task 16.3 完成 | 无 |
| Task 21.1 ci.yml turbo 迁移是否合并 | 待评估 | 用户 |

---

## 8｜附录

### 8.1 关键文件路径速查

| 用途 | 路径 |
|------|------|
| 部署目录 | `/opt/awkn-life/` |
| staging 目录 | `/opt/awkn-life-staging/` |
| 旧 build 备份 | `/opt/awkn-life-prev-deploy/` |
| 后端代码 | `apps/AWKN-LABlife/awkn-life-backend/` |
| 前端代码 | `apps/AWKN-LABlife/app/` |
| PM2 配置 | `apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js` |
| 健康端点 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/health.controller.ts` |
| 回滚脚本 | `scripts/rollback.sh` |
| 冒烟脚本 | `scripts/smoke-test.sh` |
| 健康检查脚本 | `scripts/health-check.sh` |
| 数据库备份脚本 | `scripts/backup-db.sh` |
| SSH 凭据 | `~/.ssh/aliyun-awkn` |
| SSH 别名 | `aliyun-awkn` |
| 生产域名 | `https://awkn.cn/life/` |
| 健康端点 URL | `https://awkn.cn/api/health` / `/health/db` / `/health/ready` |

### 8.2 完整 git 命令速查

```bash
# 备份
git add -A && git commit -m "WIP 备份: 20260626_pre_deploy_$(git diff --cached --name-only | wc -l)文件"

# 经验沉淀
git add -A && git commit -m "docs: 部署与WARN修复验收报告 + 经验沉淀"
```

### 8.3 部署命令速查

```bash
# SSH
ssh aliyun-awkn

# 备份
ssh aliyun-awkn "bash /opt/awkn-life/scripts/backup-db.sh"

# 健康检查
curl -s https://awkn.cn/api/health
curl -s https://awkn.cn/api/health/db
curl -s https://awkn.cn/api/health/ready

# 冒烟
ssh aliyun-awkn "bash /opt/awkn-life/scripts/smoke-test.sh"

# 回滚
ssh aliyun-awkn "bash /opt/awkn-life/scripts/rollback.sh"
```

---

## 9｜复盘要求（必做）

部署完成后必须完成以下 5 项复盘：

1. **写经验文档**：`docs/04复盘总结/经验整合/E1-001-spec陈旧性验证-2026-06-26.md`
   - 核心：spec 描述的 5 Agent 修复已存在于代码，必须 `git grep` 验证
2. **更新 spec 状态**：
   - `specs/code-deploy-and-backend-warn-fix/tasks.md` 全部标记为已修/已完成
   - 标记该 spec 为"代码修复部分完成，部署待执行"
3. **更新验收报告**：`docs/05审核与质量/验收报告-2026-06-26.md`
4. **commit 完整记录**：所有变更（代码+文档）一个 commit
5. **写本次复盘到 `C:\Users\10919\Desktop\AWKN-Lab\记忆系统\`**（按个人全局开发规则）

---

## 10｜修订记录

| 版本 | 日期 | 修改人 | 修订内容 |
|------|------|--------|----------|
| v1 | 2026-06-26 | 天火 | 初版，基于 PRD v1 + 批判性审视形成；识别 spec 中 5 Agent + assets 修复已就位；14 任务简化为 9 任务（仅部署相关） |

---

> **最后一道关卡**：请工程师（用户）确认本工程文档 v1 是否符合预期。如有调整请直接批注文档。
