# ENGINEERING — 构建产物完整性治理（v1 2026-06-26）

> **本文档为 P0-3 阶段工程落地侧**
> **上游**：用户 2026-06-26 批判性评估（"构建产物纪律还没彻底建立…当前构建产物对 prompts / rules / data 的打包仍不可靠"）
> **关联**：[ENGINEERING-生产部署与WARN修复-2026-06-26.md](./ENGINEERING-生产部署与WARN修复-2026-06-26.md)（前置）
> **阶段**：阶段1 保命计划 第3步
> **状态**：待审查

---

## 0｜执行摘要

| 项 | 值 |
|---|---|
| 变更类型 | 工程基础设施类（构建链路 + 部署脚本 + 启动校验 + 健康检查） |
| 受影响接口 | `/api/v1/health/ready`（强化检查项） |
| 受影响服务 | `awkn-life-backend`（PM2） |
| 风险等级 | **高**（触及构建链路、启动脚本、健康端点） |
| 预计改动文件数 | 8-12 个 |
| 关键根因 | assets 清单散落 3+ 处无单一权威源；deploy.sh 缺 build 步骤；fallback 文化掩盖构建问题 |
| 设计原则 | Fail-fast > 静默降级；单一权威清单；四阶段校验链 |

---

## 1｜批判性分析（问题诊断）

### 1.1 根本病灶：四阶段断裂带

当前"构建-部署-启动-运行"四个阶段**没有任何完整性校验环节**，每个阶段都假设上游正确，错误一路传递到用户感知层面才暴露。

```
[nest build]  →  [deploy.sh]  →  [bootstrap]  →  [runtime fallback]
   ↓ 清单A         ↓ 清单B(?)      ↓ 清单C         ↓ 静默降级
  nest-cli.json   deploy_server   ASSETS_DIRS     fs.existsSync→[]
   4项assets      .sh 改写砍半     13项目录         8处fallback
```

**清单不一致实证**：

| 清单来源 | assets 项数 | 内容 |
|---|---|---|
| `nest-cli.json` (仓库原版) | 4 项 | prompts/*.md + knowledge-base/**/*.json + calc-engine/data/**/*.json + **/*.yaml |
| `deploy_server.sh` 服务器改写版 | 2 项 | prompts/*.md + knowledge-base/**/*.json（**砍掉 yaml 和 calc-engine/data**）|
| `bootstrap-production.js` ASSETS_DIRS | 13 目录 + 1 文件 | 含 orchestrator/rules、各 agent prompts、knowledge-base 子目录、safety/scenario-rules.yaml |

三份清单互不一致，新增 asset 需同时改 3 处，遗漏几乎必然发生。

### 1.2 已发生的遗漏（证据）

| 遗漏项 | 证据 | 后果 |
|---|---|---|
| `data/knowledge-base/bazi-classics.json` | 服务器日志 `Knowledge base file not found` | 知识库检索返回空，用户拿不到经典引用 |
| `meihua-agent/prompts` | 不在 ASSETS_DIRS，不在 Dockerfile COPY | 梅花代理 prompt 降级到 60 字兜底 |
| `ZIWEI_CLI_PATH` | PM2 模式无环境变量 | 紫微斗数降级到 iztro（JS 库） |
| `deploy.sh` 无 `npm run build` | 第 164-250 行只 npm ci + prisma | 部署旧代码或 dist 不存在 |

### 1.3 运行时 fallback 是"防御"还是"掩盖"？

**判定标准**：fallback 后系统能否完成核心功能 + 是否有显式上报。

| 文件 | fallback 行为 | 判定 |
|---|---|---|
| `scenario-rules-loader.ts:91` 返回空规则集 | 调度器无规则，所有问题走默认路由 | **掩盖** |
| `high-risk-detector.service.ts:42` `rules=[]` | 高危场景检测失效，服务继续提供咨询 | **掩盖且危险** |
| `rule-engine.service.ts:19-21` 直接 return | 所有规则匹配返回空 | **掩盖** |
| `ziwei-agent.service.ts:122` 用默认 prompt | LLM 输出质量降级，用户无感 | **掩盖** |
| `ziwei-agent.service.ts:282` 降级到 iztro | Python 失败时用 JS 库，有 warn 日志 | **合理防御** |
| `bazi-data.service.ts:18` 直接 throw | 核心数据不可缺 | **合理 fail-fast** |
| `knowledge-search.service.ts:50` `entries=[]` | 检索返回空，API 仍 200 | **掩盖** |

**90% 的 fallback 是掩盖**：不上报 Sentry、不设降级标志位、不进 /health 状态、不触发告警。服务"假健康"。

### 1.4 为什么 .env.prod 问题能存在数天未被发现？

**根因链**（5 个环节全部失守）：

1. **bootstrap 只加载不校验**：`.env.prod` 缺失只 `console.error`，不 `process.exit(1)`
2. **main.ts 只校验 2 个变量**：`DATABASE_URL` + `JWT_SECRET`，不校验 LLM API Key
3. **/health 只看 DB**：不检查 assets/LLM/Python/knowledge-service
4. **/health/ready 检查项错位**：检查 `DOUBAO_API_KEY || OPENAI_API_KEY`，但实际默认 provider 是 `deepseek-direct`，应查 `DEEPSEEK_API_KEY`
5. **所有 fallback 都不上报**：运维只能人工看日志

### 1.5 路径模式混用导致不可预测

| 文件 | 路径模式 | 期望位置 |
|---|---|---|
| `knowledge-search.service.ts:39` | `path.resolve('data/...')` 相对 cwd | `/opt/awkn-life/awkn-life-backend/data/...` |
| `bazi-data.service.ts:5` | `join(__dirname, '../../data')` 相对编译产物 | `dist/calc-engine/data/` |
| `scenario-rules-loader.ts:48` | `join(__dirname, 'rules', ...)` | `dist/consult/orchestrator/rules/` |
| `ziwei-agent.service.ts:118` | `join(__dirname, 'prompts', ...)` | `dist/ziwei-agent/prompts/` |

cwd 与 `__dirname` 相对路径混用，且 PM2 cwd（`/opt/awkn-life`）、bootstrap projectRoot（`/opt/awkn-life/awkn-life-backend`）、spawn 子进程 cwd（`/opt/awkn-life/awkn-life-backend`）三者不一致。

---

## 2｜技术方案

### 2.1 设计原则

| 原则 | 含义 |
|---|---|
| **Fail-fast > 静默降级** | 关键 asset 缺失即 exit(1)，不靠 fallback 顶着 |
| **单一权威清单** | `assets-manifest.json` 是唯一来源，nest-cli.json / bootstrap / Dockerfile 都从它生成或引用 |
| **四阶段校验链** | build 后校验 → 部署后校验 → 启动前校验 → 运行时可观测降级 |
| **降级必须可观测** | 所有 fallback 设标志位 + 上报 + 进 /health 状态 |

### 2.2 总体架构

```
[构建阶段]                    [部署阶段]                   [启动阶段]                  [运行阶段]
nest build                    deploy.sh                    bootstrap-production.js     runtime
  ↓                             ↓                            ↓                          ↓
verify-build.js ←─── 引用 ─── assets-manifest.json ──── 引用 ───→ preflight-check.js
  ↓                             ↓                            ↓
dist/assets-manifest.json     部署后校验                    启动前校验
(产物清单+hash)                dist完整性                   env+assets+python
                              失败→rollback                失败→exit(1)
                                                                                        ↓
                                                                                   /health/ready
                                                                                   暴露 degradations[]
```

### 2.3 assets-manifest.json 设计（单一权威清单）

**位置**：`apps/api-server/assets-manifest.json`（与 nest-cli.json 同级）

**结构**：

```json
{
  "$schema": "./assets-manifest.schema.json",
  "version": "1.0.0",
  "description": "构建产物完整性权威清单 —— 所有非 .js 资源的单一来源",
  "dirs": [
    {"src": "calc-engine/data", "dest": "calc-engine/data", "required": true},
    {"src": "consult/orchestrator/rules", "dest": "consult/orchestrator/rules", "required": true},
    {"src": "liuren-agent/prompts", "dest": "liuren-agent/prompts", "required": true},
    {"src": "liuyao-agent/prompts", "dest": "liuyao-agent/prompts", "required": true},
    {"src": "meihua-agent/prompts", "dest": "meihua-agent/prompts", "required": true},
    {"src": "qimen-agent/prompts", "dest": "qimen-agent/prompts", "required": true},
    {"src": "quming-agent/prompts", "dest": "quming-agent/prompts", "required": true},
    {"src": "shared/prompts", "dest": "shared/prompts", "required": true},
    {"src": "shared/rule-engine/rules", "dest": "shared/rule-engine/rules", "required": true},
    {"src": "ziping-agent/prompts", "dest": "ziping-agent/prompts", "required": true},
    {"src": "ziwei-agent/prompts", "dest": "ziwei-agent/prompts", "required": true},
    {"src": "knowledge-base/bazi-rules", "dest": "knowledge-base/bazi-rules", "required": true},
    {"src": "knowledge-base/liuren", "dest": "knowledge-base/liuren", "required": true},
    {"src": "knowledge-base/liuren-rules", "dest": "knowledge-base/liuren-rules", "required": true},
    {"src": "knowledge-base-data", "dest": "knowledge-base-data", "required": false, "note": "knowledge-search.service.ts 消费，cwd 相对路径"}
  ],
  "files": [
    {"src": "consult/safety/scenario-rules.yaml", "dest": "consult/safety/scenario-rules.yaml", "required": true},
    {"src": "consult/orchestrator/rules/scenario-rules.yaml", "dest": "consult/orchestrator/rules/scenario-rules.yaml", "required": true, "note": "orchestrator 调度规则，与 safety 同名但内容不同"}
  ],
  "dataDirs": [
    {"src": "../data/knowledge-base", "dest": "../data/knowledge-base", "required": false, "note": "在 src 外，knowledge-search.service.ts 用 cwd 相对路径消费"}
  ]
}
```

**关键设计**：
- `required: true` → 缺失即 fail-fast
- `required: false` → 缺失设降级标志位，不 exit
- `dataDirs` → src 外的数据目录（如 `apps/api-server/data/`），单独处理

### 2.4 四阶段校验链

#### 阶段1：构建后校验（verify-build.js）

**新增文件**：`apps/api-server/scripts/verify-build.js`

**职责**：
- 读取 `assets-manifest.json`
- 检查 dist/ 下每个 dest 路径是否存在
- required=true 且缺失 → `process.exit(1)`
- required=false 且缺失 → warn 但不 fail
- 生成 `dist/assets-checksum.json`（记录每个文件的 md5，供部署后对比）

**接入方式**：修改 `package.json` 的 build 脚本

```json
"build": "nest build && node scripts/verify-build.js"
```

#### 阶段2：部署后校验（verify-deploy.sh）

**新增文件**：`apps/AWKN-LABlife/scripts/verify-deploy.sh`

**职责**：
- SSH 到服务器
- 检查 dist/ 下 `assets-checksum.json` 是否存在
- 对比关键文件 hash（抽查 5 个核心文件）
- 失败 → 触发 rollback

#### 阶段3：启动前校验（preflight-check.js）

**新增文件**：`apps/api-server/scripts/preflight-check.js`

**职责**（在 bootstrap spawn main.js 之前执行）：
- 校验 `.env.prod` 存在且非空（生产环境）
- 校验关键环境变量：`DATABASE_URL`, `JWT_SECRET`, `DEFAULT_LLM_PROVIDER`, 对应 provider 的 API Key
- 校验 dist/assets-manifest.json 中 required=true 的所有文件存在
- 校验 Python CLI（若 ZIWEI_CLI_PATH 设置则检查文件存在+可执行）
- 校验 knowledge-service（127.0.0.1:8701）可达（3s 超时，不可达设降级标志位）
- 任何 required 校验失败 → `process.exit(1)`

**接入方式**：修改 `bootstrap-production.js`

```javascript
// 在 ensureAssets() 之后、spawn 之前
const preflightOk = require('./preflight-check.js')();
if (!preflightOk) {
  console.error('[bootstrap] preflight check failed, refusing to start');
  process.exit(1);
}
```

#### 阶段4：运行时可观测降级

**修改文件**：
- `health.controller.ts`：`/health/ready` 增加 assets/LLM/knowledge-service 检查项
- 各 fallback 代码：设置 `process.env.DEGRADED_<FEATURE>=true`

**/health/ready 新响应结构**：

```json
{
  "status": "ok|degraded|down",
  "checks": {
    "database": "ok",
    "llmProvider": "ok",
    "jwtSecret": "ok",
    "assets": "ok",
    "pythonCli": "degraded",
    "knowledgeService": "degraded"
  },
  "degradations": ["pythonCli", "knowledgeService"],
  "timestamp": "2026-06-26T14:00:00Z"
}
```

---

## 3｜分步执行清单

### Step 1｜创建 assets-manifest.json（单一权威清单）

- **动作**：新建 `apps/api-server/assets-manifest.json`（结构见 2.3）
- **产出**：1 个新文件
- **验收标准**：JSON 可解析；包含 15 个 dirs + 2 个 files + 1 个 dataDir；每项有 required 字段
- **验证方法**：`node -e "JSON.parse(require('fs').readFileSync('assets-manifest.json'))"`
- **回滚方式**：删除文件
- **风险标记**：低

### Step 2｜编写 verify-build.js（构建后校验）

- **动作**：新建 `apps/api-server/scripts/verify-build.js`
- **产出**：1 个新脚本 + 修改 `package.json` build 脚本
- **验收标准**：
  - 读取 manifest，检查 dist/ 下所有 required 文件
  - required 缺失 → exit(1)
  - 生成 dist/assets-checksum.json
- **验证方法**：本地 `npm run build`，故意删一个 prompt 文件，verify-build 应 exit(1)
- **回滚方式**：恢复 package.json build 脚本为 `"nest build"`
- **风险标记**：中（触及 build 链路）

### Step 3｜编写 preflight-check.js（启动前校验）

- **动作**：新建 `apps/api-server/scripts/preflight-check.js`
- **产出**：1 个新脚本
- **验收标准**：
  - 校验 .env.prod + 关键环境变量 + dist assets + Python CLI + knowledge-service
  - required 失败 → 返回 false
  - 输出详细校验报告
- **验证方法**：本地 `node scripts/preflight-check.js`，删除 .env.prod 应返回 false
- **回滚方式**：从 bootstrap-production.js 移除 require 行
- **风险标记**：中

### Step 4｜修改 bootstrap-production.js（接入 preflight）

- **动作**：修改 `scripts/bootstrap-production.js`
- **产出**：
  - 在 ensureAssets() 后调用 preflight-check.js
  - preflight 失败 → process.exit(1)
  - 废除 deploy_server.sh 的 nest-cli.json 改写（标记为 deprecated）
- **验收标准**：
  - preflight 失败时进程不启动
  - 成功时正常 spawn main.js
- **验证方法**：本地模拟缺失 .env.prod，bootstrap 应 exit(1)
- **回滚方式**：git checkout scripts/bootstrap-production.js
- **风险标记**：高（生产启动脚本）
- **Plan B**：preflight 检查过严导致服务无法启动 → 设置 `SKIP_PREFLIGHT=1` 环境变量可跳过（仅紧急情况）

### Step 5｜强化 /health/ready（运行时可观测）

- **动作**：修改 `health.controller.ts`
- **产出**：
  - /health/ready 增加 assets/pythonCli/knowledgeService 检查项
  - 修复 llmProvider 检查变量名（按 DEFAULT_LLM_PROVIDER 动态校验）
  - 暴露 degradations[] 数组
- **验收标准**：
  - assets 缺失时 /health/ready 返回 degraded
  - knowledge-service 不可达时返回 degraded
  - 前端可读取 degradations 数组
- **验证方法**：curl /api/v1/health/ready，检查响应含 checks.assets
- **回滚方式**：git checkout src/health.controller.ts
- **风险标记**：中

### Step 6｜修复 deploy.sh（补 build 步骤 + 废除改写）

- **动作**：修改 `apps/AWKN-LABlife/deploy.sh`
- **产出**：
  - deploy_pm2() 函数新增 `npm run build` 步骤（在 prisma generate 之后）
  - 部署后调用 verify-deploy.sh
  - 废除 deploy_server.sh 的 nest-cli.json 改写逻辑（或标记 deprecated）
- **验收标准**：
  - deploy.sh 执行流程含 build 步骤
  - 部署后自动跑产物校验
- **验证方法**：dry-run 模式检查脚本流程
- **回滚方式**：git checkout deploy.sh
- **风险标记**：高（部署脚本）
- **Plan B**：build 失败 → 部署中止，保留旧 dist

### Step 7｜路径模式统一（knowledge-search.service.ts）

- **动作**：修改 `knowledge-search.service.ts`
- **产出**：
  - 将 `path.resolve('data/knowledge-base/...')` 改为 `path.resolve(__dirname, '../../data/knowledge-base/...')`
  - 或将 bazi-classics.json 移入 src/knowledge-base-data/（已有副本）
- **验收标准**：代码不再依赖 process.cwd()，路径解析与部署模式无关
- **验证方法**：本地 + 服务器测试，确认能加载知识库
- **回滚方式**：git checkout
- **风险标记**：中

### Step 8｜端到端验收

- **动作**：服务器部署完整流程验收
- **产出**：验收报告
- **验收标准**：
  - `npm run build` 成功 + verify-build 通过
  - `pm2 restart` 后 preflight 通过
  - /health/ready 返回 ok 或 degraded（非 down）
  - 三主链 E2E（问事/取名/K线）全部通过
  - 服务器日志无 "not found" 警告
- **验证方法**：复用 P0-2 的 E2E 验收脚本
- **回滚方式**：恢复 bootstrap-production.js.bak + pm2 restart
- **风险标记**：高

---

## 4｜风险清单（自动标红）

| 风险项 | 等级 | 触发条件 | Plan B |
|---|---|---|---|
| 改 build 链路 | 高 | verify-build 误判导致 CI 失败 | `SKIP_VERIFY_BUILD=1` 跳过 |
| 改启动脚本 | 高 | preflight 过严导致服务无法启动 | `SKIP_PREFLIGHT=1` 跳过 |
| 改部署脚本 | 高 | deploy.sh build 步骤失败 | 保留旧 dist，中止部署 |
| 改健康端点 | 中 | /health/ready 误报 down | 保留旧 /health 逻辑，新检查项可选 |
| 路径模式变更 | 中 | knowledge-search 加载失败 | 回退到 cwd 相对路径 |
| 废除 nest-cli.json 改写 | 中 | 服务器仍依赖改写版 | 保留改写版作为 fallback |

---

## 5｜最终验收（DoD）

### 5.1 构建阶段
- [ ] `npm run build` 成功
- [ ] verify-build.js 通过（所有 required assets 存在）
- [ ] dist/assets-checksum.json 生成

### 5.2 部署阶段
- [ ] deploy.sh 含 `npm run build` 步骤
- [ ] 部署后 verify-deploy.sh 通过
- [ ] dist/ 完整性确认

### 5.3 启动阶段
- [ ] preflight-check.js 通过
- [ ] .env.prod 加载成功（已在 P0-1 修复）
- [ ] 关键环境变量非空
- [ ] Python CLI 可达（或降级标志位设置）

### 5.4 运行阶段
- [ ] /health/ready 返回 ok 或 degraded（非 down）
- [ ] /health/ready 响应含 checks.assets / checks.pythonCli / checks.knowledgeService
- [ ] 三主链 E2E 全部通过（复用 P0-2 脚本）
- [ ] 服务器日志无 "not found" 警告
- [ ] degradations[] 数组正确反映降级状态

### 5.5 回归清单
- [ ] 问事链 E2E（ziping 路由）HTTP 201 + LLM 成功
- [ ] 取名链 E2E（quming 路由）HTTP 201 + 6 个名字建议
- [ ] K线链 E2E（kline-tide）HTTP 200 + LLM 成功
- [ ] /api/v1/health 返回 200
- [ ] /api/v1/health/ready 返回 200 或 503（不再"假健康"）
- [ ] LLM 调用日志全部 deepseek-direct 成功

---

## 6｜复盘记录（待填写）

| 项 | 内容 |
|---|---|
| 本轮通过 Step | （待填） |
| 卡点根因 | （待填） |
| 下轮第一步 | （待填） |

---

## 7｜关联文档

- 上游批判性评估：用户 2026-06-26 长篇评估消息
- 前置：[ENGINEERING-生产部署与WARN修复-2026-06-26.md](./ENGINEERING-生产部署与WARN修复-2026-06-26.md)
- 关联：[ENGINEERING-知识库生产部署-20260626.md](./ENGINEERING-知识库生产部署-20260626.md)
- 关键文件：
  - [bootstrap-production.js](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/scripts/bootstrap-production.js)
  - [nest-cli.json](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/nest-cli.json)
  - [deploy.sh](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/deploy.sh)
  - [health.controller.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/health.controller.ts)
  - [knowledge-search.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/knowledge-base-data/knowledge-search.service.ts)

---

## 8｜强制收尾句

> 下次遇到类似情况，先做哪 3 件事？
> 1. 查看当前状态（pm2 logs + /health/ready + dist 目录 ls）
> 2. 备份当前版本（git commit + 服务器 cp .bak）
> 3. 读取完整文件并确认修改位置（grep assets 引用 + 读 manifest）
