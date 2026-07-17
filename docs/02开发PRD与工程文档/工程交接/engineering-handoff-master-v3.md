# 人生决策宗师 (AWKN-LABlife) — 工程交接总文档

> **版本**：v3.1
> **原始基线日期**：2026-06-16
> **生产校准日期**：2026-07-07
> **用途**：工程交接总览。当前生产事实先读取 2026-07-07 基线文档。
> **上游口径**：[`_ground-truth.md`](./_ground-truth.md) v3.0。

## 0. 当前生产事实入口

- [`ENGINEERING-当前生产技术基线-20260707.md`](./ENGINEERING-当前生产技术基线-20260707.md)
- [`API-当前生产接口基线-20260707.md`](../接口文档/API-当前生产接口基线-20260707.md)
- [`DATABASE-当前生产Schema基线-20260707.md`](../数据库文档/DATABASE-当前生产Schema基线-20260707.md)
- [`DEPLOY-当前生产基线-20260707.md`](../部署文档/DEPLOY-当前生产基线-20260707.md)
- [`TEST-当前生产烟测基线-20260707.md`](../测试用例/TEST-当前生产烟测基线-20260707.md)

当前覆盖结论：

```text
后端端口：30000
前端目录：/www/wwwroot/awkn.cn/life
生产 Node：22.22.2
生产实际版本：4bbcd7c + 521 个已跟踪变更 + 19 个未跟踪项
知识库：1,135 books / 329,577 passages
生产数据库缺少 ConsultDialogueTurn、MemoryEmbedding
```

本文第 1 节及以后保留原工程架构和设计背景。部署路径、版本、数据库、知识规模和接口状态以 2026-07-07 专项基线为准。

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| 项目名称 | 人生决策宗师 (AWKN-LABlife) |
| 产品定位 | AI 命理咨询平台 — 子平八字 / 六壬 / 奇门 / 六爻 / 取名 / 紫微 / 人生K线 |
| 核心人设 | 张半山 — 命理师人格，三段式输出（判断/前提/代价） |
| 仓库位置 | `c:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\` |
| 应用目录 | `apps\AWKN-LABlife\` |
| 在线地址 | https://awkn.cn/life/ |

### 技术栈

| 层 | 技术 | 版本/说明 |
|----|------|-----------|
| 后端框架 | NestJS | ^10.3.0 |
| ORM | Prisma | ^5.10.0 |
| 数据库 | SQLite（生产） | `apps/api-server/prisma/dev.db` |
| 运行方式 | PM2 + Node.js | `bootstrap-production.js` 启动编译产物 `dist/main.js` |
| 前端框架 | React + Vite | React ^19.2.0, Vite ^7.2.4 |
| UI 库 | Radix UI + Tailwind CSS | shadcn/ui 组件体系 |
| 状态管理 | Zustand | ^5.0.12 |
| 图表 | Recharts + ECharts | K线图 / 雷达图 |
| 实时通信 | Socket.IO | WebSocket 推送咨询进度 |
| 队列 | BullMQ（已禁用） | REDIS_ENABLED=false，走同步降级 |
| 认证 | JWT + Passport | AuthGuard / OptionalJwtAuthGuard |

### 服务器

| 属性 | 值 |
|------|-----|
| 云服务商 | 阿里云轻量应用服务器 |
| IP | 8.148.245.29 |
| SSH | `ssh -i ~/.ssh/aliyun_awkn root@8.148.245.29` |
| 反向代理 | Nginx — `/life/` → 前端静态文件，`/api/` 与 `/life/api/` → 后端 :30000 |
| PM2 进程名 | `awkn-life-backend`、`knowledge-service` |
| 前端部署路径 | `/www/wwwroot/awkn.cn/life/` |
| 后端部署路径 | `/opt/awkn-life/awkn-life-backend/` |

---

## 2. 执行框架

### 三战线优先级

| 优先级 | 战线 | 目标 | 说明 |
|--------|------|------|------|
| **P0** | 生产稳定 | 部署不炸、数据不丢、链路不断 | 最高优先，阻塞一切 |
| **P1** | 收入主链路 | 问事完成率 + K线传播率 + 取名转化率 | Week 1-8 |
| **P2** | 能力增强 | 记忆/回访/角色/IP | Week 8+ |

### 四线并行计划

| 线 | 内容 | 优先级 | 工期 | 依赖 |
|----|------|--------|------|------|
| **L2** | Pipeline | 🔴 P0 最高 | 22 天 | 最先启动 |
| **L1** | 内容 | P1 | 13 天 | 依赖 L2 跑通 |
| **L3** | 记忆 | P2 | 13 周 + 9 周灰度 | — |
| **L4** | 角色 | P3 | 16 周 | 与 L2 并行启动 |

### 参考文档

| 文档 | 路径 |
|------|------|
| 执行框架声明 | `.trae/rules/execution-framework.md` |
| 四线并行总览 | `docs/dev/execution/00-overview.md` |
| L2 Pipeline | `docs/dev/execution/line-02-pipeline.md` |
| L1 内容 | `docs/dev/execution/line-01-content.md` |
| L3 记忆 | `docs/dev/execution/line-03-memory.md` |
| Ground Truth | `docs/engineering-handoffs/_ground-truth.md` |
| 交接包索引 | `docs/engineering-handoffs/INDEX.md` |

---

## 3. 核心架构

### 3.1 Pipeline 流程

```
用户提问
  │
  ▼
IntentRouter（4 路由分类）
  │  ziping / liuren / mixed / clarify
  ▼
XuanxueOrchestratorService.processJob()
  │
  ├─ Step 1: High-Risk Detector（命中即返回心理援助热线）
  ├─ Step 2: User Memory（记忆加载）
  ├─ Step 3: Classifier（4 类 UserState）
  ├─ Step 4: Zhangbanshan Scheduler（6 Agent 调度 + 2 模式）
  ├─ Step 5: Evidence Packet Builder（证据包构建）
  ├─ Step 6: Knowledge Retriever（知识检索）
  ├─ Step 7: LLM Parallel Gateway + ReAct 循环（仅 deep_consult）
  ├─ Step 8: Generation Composer（5 层输出合成）
  ├─ Step 9: Quality Gate（质量验证）
  └─ Step 10: Render（三段式最终渲染）
```

### 3.2 路由与调度

| 组件 | 类型 | 说明 | 代码来源 |
|------|------|------|---------|
| IntentRouter | 4 路由 | `ziping` / `liuren` / `mixed` / `clarify` | `intent-router.service.ts` |
| ZhangbanshanScheduler | 6 Agent | `liuren` / `qimen` / `ziping` / `ziwei` / `liuyao` / `quming` | `zhangbanshan-scheduler.service.ts` |
| 调度模式 | 2 模式 | `quick_read`（1-2s）/ `deep_consult`（主+佐调+工具链+仲裁+ReAct） | 同上 |
| ReAct 循环 | 最大 5 轮 | THINK → ACT → OBSERVE → REFLECT → DONE | `react-engine.service.ts` |
| 超时降级 | 60s | L2 超时返回 L1 快速结果，后台继续推演 | `orchestrator.service.ts` |

### 3.3 三套输出格式并存

#### A. 三段式 ZhangbanshanOutput（主路径）

| 字段 | 含义 |
|------|------|
| `judgment` | 我的判断 |
| `premise` | 前提 |
| `cost` | 代价 |
| `reasoning_trace` | 推理轨迹（可选） |
| `costWarnings` | 代价提醒（可选） |
| `costConfirmationRequired` | 是否需要代价确认环 |
| `memoryAnchor` | 记忆锚定文案 |

代码来源：`zhangbanshan-scheduler.service.ts` ZhangbanshanOutput 接口

#### B. 5 层 FiveLayerOutput（付费分层）

| 层 | 字段 | 标记正则 | 付费门控 |
|----|------|---------|---------|
| L2-1 | `factLayer` | `【事实层】|【八字排盘】` | 免费 |
| L2-2 | `interpretationLayer` | `【解读层】|【格局用神】` | 免费 |
| L2-3 | `deductionLayer` | `【推演层】|【推演路径】` | 🔒 付费 |
| L2-4 | `adviceLayer` | `【建议层】|【行动建议】` | 🔒 付费 |
| L2-5 | `insightLayer` | `【点睛层】|【金句】` | 🔒 付费 |

代码来源：`generation-composer.service.ts`

#### C. 6 段 Prompt（降级路径）

| 序号 | 段标题 |
|------|--------|
| 1 | 一句话定性 |
| 2 | 判断依据 |
| 3 | 当前风险 |
| 4 | 建议动作 |
| 5 | 时间窗口 |
| 6 | 落一句最实在的话 |

代码来源：`generation-composer.service.ts:282-288`

**前端消费方式**：`llmResult` JSON 同时包含 `zhangbanshan_output`（三段式）和 `fiveLayers`（5 层）。

### 3.4 用户状态分类

| 类型 | 判定规则 | 优先级 |
|------|---------|--------|
| `repeating` | 30 天内问过类似问题 | 最高 |
| `validating` | 问题含验证型关键词（"之前有人说"/"别的师傅说"） | 次高 |
| `genuine` | 问题具体 + 有情绪词 + 有背景描述（三条件满足任意两个） | 中 |
| `casual` | 默认兜底 | 最低 |

代码来源：`user-state-classifier.service.ts` — 纯规则分类，不调 LLM

### 3.5 LLM 成本路由

| 方法 | Provider | 模型 | 用途 |
|------|----------|------|------|
| `chatCheap()` | sensenova（商汤） | deepseek-v4-flash | 记忆提取/主动问候/编年史/枢密院摆开等辅助任务 |
| `chat()` | deepseek-direct | deepseek-v4-pro | 核心咨询生成（贵） |

**6 个 Provider 可用**：minimax / doubao / deepseek / sensenova / deepseek-direct / spark

代码来源：`llm-providers.service.ts`

---

## 4. 数据库

### 4.1 基本信息

| 属性 | 值 |
|------|-----|
| 当前引擎 | SQLite（Prisma） |
| 开发库路径 | `awkn-life-backend/apps/api-server/prisma/dev.db` |
| 生产库路径 | `awkn-life-backend/apps/api-server/prisma/prod.db` |
| 迁移计划 | Week 16-20 SQLite → PostgreSQL（不提前迁移） |
| WAL 模式 | 生产环境需启用（health-check.sh 第 8 项检查） |

### 4.2 模型清单（22 个）

| 模型 | 用途 | 关键字段 |
|------|------|---------|
| **User** | 用户 | email/phone/wxOpenId/creditBalance/isAdmin |
| **BaZiProfile** | 八字命理档案 | 四柱/五行/身旺/喜忌用神/十神/神煞/大运 |
| **ConsultRecord** | 🔴 核心业务表 | question/routeType/status/flowStatus/calcResult/llmResult/summaryLine |
| **ConsultFeedback** | 专家标注闭环 | rating/accuracy/calibrationTag |
| **ConsultFollowUp** | 回访系统 | scheduledAt/completedAt/result |
| **ConsultDialogue** | 多轮对话 | state(6态)/turns/costConfirmed |
| **ConsultPreview** | 预览内容 | freeContent/gatedContent |
| **PersonProfile** | 人物档案 | 四柱/纳音/关系类型/风险标签 |
| **PersonEightDimensions** | 八维看人 | role/relationship/motivation/ability/credit/risk |
| **PersonRelatedCase** | 相关事项 | hisRole/whatHeSaid/whatHeDid |
| **PersonProfileRecord** | 人物-咨询关联 | personProfileId/consultRecordId |
| **KlineBar** | 🔴 K线数据（7线OHLCV） | career/wealth/health/relationship/growth/freedom/buffer |
| **StateSnapshot** | 🔴 12维状态向量 | energy~buffer + timeGroup/positionGroup/mindGroup |
| **EvidencePacket** | 证据包 | routeType/packetJson/warnings |
| **GenerationRun** | 生成运行记录 | provider/model/qualityScore/durationMs |
| **KnowledgeHit** | 知识检索命中 | sourceId/snippet/score |
| **InteractionEvent** | 交互事件 | eventType/eventJson |
| **UserMemory** | 用户长期记忆 | chartHistory/consultHistory/timelineEvents/insights |
| **ChronicleEntry** | 通鉴记录 | title/content/initialView/whatHappened/gotRight/gotWrong |
| **UserInsightProfile** | 用户画像 | commonStuckPoints/riskPreference/misjudgmentPatterns |
| **SavedCase** | 命例库 | name/category/snapshot/visibility |
| **BenchmarkRun** | MingLi-Bench 评估 | provider/model/accuracy/avgDurationMs |

**辅助模型**：CreditLedger / Session / Membership / Order / Invite / Referral / GrowthOffer / LiurenCase / PageVisit / UserActivity

### 4.3 关键表详解

#### ConsultRecord（核心业务表）

```
status: pending / analyzing / clarify / completed / failed
flowStatus: speaking / spreading / bottomed / chronicled / reviewed（枢密院专用）
routeType: liuren / ziping / liuyao / qimen / shumiyuan
```

重要字段：
- `inputData` — 用户输入原始数据（JSON）
- `calcResult` — 八字计算结果（JSON）
- `llmResult` — LLM 返回原始 JSON（含 zhangbanshan_output + fiveLayers）
- `analysisData` — 完整分析结果（JSON）
- `spreadData` — 枢密院摆开数据
- `bottomData` — 枢密院这事底数据
- `emotionSnapshot` — 3维命理情绪快照（gravity/warmth/caution）
- `extractedFacts` — 提取出的事实
- `isHighRisk` — 高风险标记
- `costConfirmationPrompt` / `costUserRestated` / `costConfirmedAt` — 代价确认环

#### KlineBar（7 线 OHLCV）

7 条人生线：career / wealth / health / relationship / growth / freedom / buffer

每条线存储 JSON：`{open, high, low, close, volume}`

唯一约束：`@@unique([userId, year, month])`

#### StateSnapshot（12 维状态向量）

12 维度：energy / recovery / emotion / clarity / liquidity / momentum / support / agency / order / growth / optionality / buffer

V0.7 三组聚合：
- **时**：avg(liquidity, momentum, optionality)
- **位**：avg(support, agency, order, growth, buffer)
- **心**：avg(energy, recovery, emotion, clarity)

衍生指标：capacity / entropy / quadrant

### 4.4 SQLite 特殊约束

| 约束 | 说明 |
|------|------|
| 不支持并发写入 | 生产环境需注意，一次只允许一个写操作 |
| Json 类型为 String | Prisma Json 在 SQLite 中存为 String，需手动 `JSON.parse()` / `JSON.stringify()` |
| WAL 模式 | 生产环境需启用，提升读并发性能 |
| 无原生枚举 | 所有枚举用 String 存储 |

---

## 5. API 端点概览

### 全局配置

| 属性 | 值 |
|------|-----|
| 全局前缀 | `/api/v1` |
| Nginx 代理 | `/life/api/` → `http://127.0.0.1:3000/api/` |
| 认证方式 | JWT（AuthGuard） |
| 健康检查 | `/api/v1/health` / `/api/v1/health/db` / `/api/v1/health/llm` |

### 端点分组

| 分组 | Controller | 认证 | 说明 |
|------|-----------|------|------|
| **认证** | `auth.controller.ts` | 无 | 登录/注册/刷新 Token |
| **咨询主链路** | `consult.controller.ts` | OptionalJwt / JwtAuthGuard | 提问/结果/历史/收藏 |
| **多轮对话** | `dialogue.controller.ts` | ⚠️ 缺 JwtAuthGuard | 张半山反问-观察-判断闭环 |
| **追问** | `followup.controller.ts` | JwtAuthGuard | 追问链路 |
| **K线潮汐** | `kline-tide.controller.ts` | JwtAuthGuard | K线数据/状态快照 |
| **潮汐推理** | `tide-inference.service.ts` | 内部服务 | K线推演（非 Controller） |
| **取名** | — | — | 前端路由，走 consult 路由 |
| **MingLi-Bench** | `mingli-bench.controller.ts` | — | 评估基准测试 |
| **管理后台** | `admin.controller.ts` | JwtAuthGuard + AdminGuard | 用户管理/数据统计 |
| **反馈** | `feedback.controller.ts` | JwtAuthGuard | 用户评价/专家标注 |
| **会员** | `membership.controller.ts` | — | 会员管理 |
| **支付** | `payment.controller.ts` | — | 订单/支付 |
| **增长** | `growth.controller.ts` | — | 邀请/推荐 |
| **用户** | `user.controller.ts` | — | 用户信息 |
| **用户画像** | `user-profile.controller.ts` | — | 个人资料 |
| **枢密院** | `shumiyuan.controller.ts` | — | 人生枢密院功能 |
| **星图** | `star-chart.controller.ts` | — | 星盘功能 |
| **庙算** | `miaosuan.controller.ts` | — | 庙算功能 |
| **编年史** | `chronicle.controller.ts` | — | 通鉴记录 |
| **命例库** | `saved-case.controller.ts` | JwtAuthGuard | 收藏/管理命例 |
| **分析** | `analytics.controller.ts` | JwtAuthGuard | 行为分析 |
| **Feature Flags** | `feature-flags.controller.ts` | — | 功能开关 |
| **健康** | `health.controller.ts` | 无 | 服务健康检查 |

### 后端模块结构（AppModule 注册）

```
AuthModule / UserModule / ConsultModule / PaymentModule / MembershipModule
SavedCaseModule / WebsocketModule / LlmProvidersModule / AnalyticsModule
GrowthModule / AdminModule / UserProfileModule / MingliBenchModule
ShumiyuanModule / StarChartModule / MiaosuanModule / ChronicleModule
KlineTideModule / TideInferenceModule / FeedbackModule / FeatureFlagsModule
RedisModule / QueueModule
```

---

## 6. 部署流程

### 6.1 一键部署脚本

| 脚本 | 路径 | 说明 |
|------|------|------|
| PowerShell 部署 | `scripts/deploy/deploy-awkn-life.ps1` | 8 步全流程（确认→构建→打包→上传→部署→权限→健康检查） |
| Shell 部署 | `apps/AWKN-LABlife/deploy.sh` | 3 种模式（Docker/PM2+Nginx/仅后端） |
| 健康检查 | `scripts/health-check.sh` | 9 项检查 |
| 回滚 | `scripts/rollback.sh` | 回滚到上一版本（从备份点恢复代码+DB+.env.prod） |
| 数据库备份 | `scripts/backup-db.sh` | 数据库备份 |

### 6.2 部署步骤（deploy-awkn-life.ps1）

```
Step 1/8: 部署前确认（SSH 连通性 / PM2 状态 / 磁盘空间）
Step 2/8: 本地构建前端（npm run build → dist/）
Step 3/8: 本地构建后端（npm run build → dist/）
Step 4/8: 压缩打包（7z 或 tar，排除 node_modules/.git）
Step 5/8: SCP 上传到服务器 /tmp/awkn-life-deploy.tgz
Step 6/8: 服务器端部署（备份→解压→保留 .env 和 prod.db→原子切换→npm ci→prisma generate→PM2 重启→前端部署→Nginx 重载）
Step 7/8: 文件权限修复（www:www / 755:644）
Step 8/8: 结构化健康检查（后端端口/前端可达/JS MIME）
```

### 6.3 PM2 配置

```javascript
// ecosystem.config.js
{
  name: "awkn-life-backend",
  script: "scripts/bootstrap-production.js",  // tsx 直接运行 TS
  cwd: "/opt/awkn-life/awkn-life-backend",
  instances: 1,          // fork 模式，单实例
  max_memory_restart: "500M",
  env: {
    NODE_ENV: "production",
    PORT: 3000,
    REDIS_ENABLED: "false",     // 强制禁用 Redis
    DEFAULT_LLM_PROVIDER: "deepseek-direct",
    CHEAP_LLM_PROVIDER: "sensenova",
  }
}
```

### 6.4 Nginx 配置

```nginx
# API 反向代理
location /life/api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_read_timeout 300s;  # LLM 调用可能较慢
}

# 静态资源（长缓存）
location ^~ /life/assets/ {
    alias /www/wwwroot/awkn-lab/life/assets/;
    expires 30d;
}

# SPA 路由
location ^~ /life/ {
    alias /www/wwwroot/awkn-lab/life/;
    try_files $uri $uri/ @life_spa;
}
```

### 6.5 健康检查（9 项）

| # | 检查项 | 端点/命令 | 期望 |
|---|--------|----------|------|
| 1 | 后端健康 | `/api/v1/health` | `{"status":"ok"}` |
| 2 | 数据库连接 | `/api/v1/health/db` | `{"db":"connected","provider":"sqlite"}` |
| 3 | 管理员保底 | 登录接口 | `isAdmin=true` |
| 4 | PM2 进程 | `pm2 show awkn-life-backend` | 运行中 |
| 5 | 前端可达 | `curl /life/` | HTTP 200 |
| 6 | 前端版本 | bundle 文件名 | 检测到 JS |
| 7 | 数据库文件一致性 | `stat prod.db` | 文件存在 |
| 8 | SQLite WAL 模式 | `PRAGMA journal_mode` | `wal` |
| 9 | LLM Provider | `/api/v1/health/llm` | `{"status":"ok"}` |

### 6.6 回滚方案

```bash
# 自动备份位置
/opt/awkn-life-backup-{Timestamp}

# 手动回滚
ssh root@8.148.245.29 \
  'rm -rf /opt/awkn-life && \
   mv /opt/awkn-life-backup-{Timestamp} /opt/awkn-life && \
   pm2 start /opt/awkn-life/awkn-life-backend/ecosystem.config.js && \
   pm2 save && \
   systemctl reload nginx'
```

---

## 7. 已知问题与技术债

### 7.1 安全问题

| 问题 | 严重性 | 位置 | 说明 |
|------|--------|------|------|
| dialogue.controller.ts 缺 JwtAuthGuard | 🔴 高 | `consult/dialogue/dialogue.controller.ts:11` | TODO 注释，未加认证守卫，任何人可访问对话接口 |

### 7.2 测试问题

| 问题 | 位置 | 说明 |
|------|------|------|
| 21 个测试失败 | `consult.service.spec.ts` | 缺 LlmProvidersService mock，需补全依赖注入 |

### 7.3 类型安全

| 问题 | 规模 | 说明 |
|------|------|------|
| 411 处 `any` 类型 | 61 个文件 | 需逐步替换为具体类型 |

### 7.4 性能问题

| 问题 | 位置 | 说明 |
|------|------|------|
| TidePage chunk 686kB | 前端构建产物 | 需代码分割，当前 manualChunks 已做部分拆分 |

### 7.5 数据一致性

| 问题 | 说明 |
|------|------|
| 双数据目录 | `calc-engine/data/`（13 文件）与 `knowledge-base/bazi/`（11 文件）有 11 对语义等价 JSON，`calc-engine/data/` 为唯一源 |
| kangxi-strokes.ts | 已修正 129 个字符（康熙笔画），但需部署验证 |
| WUXING_MAP 重复定义 | 在 5-6 个文件中重复定义，应统一到 `bazi-data.service.ts` |

### 7.6 功能缺口

| 缺口 | 优先级 | 说明 |
|------|--------|------|
| 生肖禁忌过滤 | P1 | 五格数理已完成，生肖禁忌规则表（12生肖×忌用部首）未实现 |
| 紫微前端入口 | P1 | 后端 ziwei-agent + iztro 已就绪，前端无独立页面 |
| 奇门 Golden Fixture | P1 | C++ 和 JS 两套实现从未交叉验证 |

### 7.7 已废弃

| 项目 | 说明 |
|------|------|
| qimen-cpp-* 5 份文档 | C++ 微服务方案已被 JS @yhjs/dunjia 替代 |
| dunjia-stub.ts | 保持 stub 地位，@yhjs/dunjia 是正式实现 |
| C++ 微服务集成 | 保留为算法参考资产，不再投入 |

---

## 8. 不存在的类型/变量（勿误用）

以下类型/变量在旧文档或规划中出现过，但**代码库中不存在**。在编写代码时切勿引用：

| 名称 | 说明 | 实际替代 |
|------|------|---------|
| `JudgmentReport` | 不存在 | 使用 `ZhangbanshanOutput` |
| `DecisionIssue` | 不存在 | 使用 `ConsultRecord` |
| `USE_9_NODE_MACHINE` | 不存在（P2-5 规划目标） | 使用 `ConsultRecord.status` 字符串 |
| `XState` | 未安装（P2-5 规划目标） | 使用 Zustand + 字符串状态 |
| `mini-state-machine.service.ts` | 不存在（仅有设计文档） | 使用 `ConsultDialogue.state` |
| `identity-layer.ts` | 不存在 | 嵌入式实现：`prompt-layers.ts` buildIdentityLayer() |
| `relations.config.ts` | 不存在 | 硬编码在 `atom-tools/decision/relationship.ts` |
| `risk-classifier.service.ts` | 不存在 | 内嵌在 `HighRiskDetectorService` |
| `mbs-*` 5 色 token | 不存在（P2-7 规划目标） | 使用 CSS 变量体系（hsl） |

---

## 9. 未完成任务清单

### P0 生产稳定（6 项，全部未启动）

| # | 任务 | 说明 |
|---|------|------|
| P0-1 | 生产环境 prod.db 确认 | 确保生产使用 prod.db 而非 dev.db |
| P0-2 | Tide 页 API 数据标识 | 前端需标注数据来源 |
| P0-3 | 历史页登录守卫 | 未登录用户显示"请先登录" |
| P0-4 | 管理员保底 | ensure-admin.js 确保管理员账号存在 |
| P0-5 | LLM Provider 健康检查 | /health/llm 端点可用 |
| P0-6 | 前端构建产物部署验证 | JS MIME 类型正确 |

### L2 Pipeline 串联

| 状态 | 说明 |
|------|------|
| 未启动 | L2 完成度从 70% 下调至 35%（2026-06-15 纠偏） |

### 已完成

| 任务 | 完成日期 |
|------|---------|
| 4 份交接文档概念纠偏（v2.1） | 2026-06-15 |
| Day 3 返工清单 7 步 | 2026-06-15 |

---

## 10. 技术约束

| 约束 | 说明 | 影响 |
|------|------|------|
| tsx 直接运行 TS | 后端不编译为 JS，PM2 通过 `scripts/bootstrap-production.js` 用 tsx 运行 | 修改 TS 文件后重启即可生效，无需 build |
| SQLite 不支持并发写入 | 一次只允许一个写操作 | 高并发场景需排队，或迁移 PostgreSQL |
| Prisma Json → SQLite String | 需手动 `JSON.parse()` / `JSON.stringify()` | 读取时必须 parse，写入时必须 stringify |
| LLM 调用 30s 超时 | 默认超时设置 | 复杂咨询可能超时，Nginx proxy_read_timeout 已设 300s |
| 前端 base 路径 `/life/` | 开发和生产环境均为 `/life/` | 必须与 Nginx location 一致 |
| Redis 强制禁用 | `REDIS_ENABLED=false` | BullMQ 队列不可用，Orchestrator 走同步降级 |
| PM2 单实例 fork | 1 个进程，内存上限 500M | 不支持水平扩展，高负载需调整 |
| 前端 Vite 构建需 `BROWSERSLIST_IGNORE_OLD_DATA=1` | 部署脚本已处理 | 本地手动构建需设置此环境变量 |

---

## 11. 目录结构速查

```
人生决策宗师/
├── apps/AWKN-LABlife/                    # 应用主目录
│   ├── app/                              # 前端 React + Vite
│   │   ├── src/
│   │   │   ├── api/                      # API 调用层
│   │   │   ├── components/               # UI 组件
│   │   │   │   ├── result/               # 结果页组件（核心）
│   │   │   │   ├── dialogue/             # 对话组件
│   │   │   │   ├── kline/                # K线图组件
│   │   │   │   ├── tide/                 # 潮汐页组件
│   │   │   │   ├── naming/               # 取名组件
│   │   │   │   ├── frontdesk/            # 前台组件
│   │   │   │   └── ui/                   # shadcn/ui 基础组件
│   │   │   ├── pages/                    # 页面路由
│   │   │   ├── store/                    # Zustand 状态管理
│   │   │   ├── hooks/                    # 自定义 Hooks
│   │   │   ├── lib/                      # 工具库
│   │   │   │   └── destinyKline/         # K线推演算法
│   │   │   ├── services/                 # 前端服务层
│   │   │   └── types/                    # TypeScript 类型
│   │   ├── vite.config.ts                # Vite 配置（base: /life/）
│   │   └── package.json
│   │
│   ├── awkn-life-backend/                # 后端 NestJS
│   │   └── apps/api-server/
│   │       ├── src/
│   │       │   ├── consult/              # 🔴 核心咨询模块
│   │       │   │   ├── orchestrator/     # Pipeline 编排
│   │       │   │   │   ├── orchestrator.service.ts      # 主编排器
│   │       │   │   │   ├── intent-router.service.ts     # 意图路由
│   │       │   │   │   ├── zhangbanshan-scheduler.service.ts  # Agent 调度
│   │       │   │   │   ├── evidence-packet-builder.service.ts # 证据包
│   │       │   │   │   ├── knowledge-retriever.service.ts     # 知识检索
│   │       │   │   │   ├── generation-composer.service.ts     # 输出合成
│   │       │   │   │   ├── quality-gate.service.ts            # 质量验证
│   │       │   │   │   ├── react-engine.service.ts            # ReAct 循环
│   │       │   │   │   └── prompt-layers.ts                   # Prompt 分层
│   │       │   │   ├── dialogue/         # 多轮对话
│   │       │   │   ├── followup/         # 追问
│   │       │   │   ├── memory/           # 记忆提取
│   │       │   │   ├── classifier/       # 用户状态分类
│   │       │   │   └── safety/           # 高风险检测
│   │       │   ├── llm-providers/        # LLM Provider 管理
│   │       │   ├── llm-gateway/          # LLM 并行网关
│   │       │   ├── kline-tide/           # K线潮汐
│   │       │   ├── tide-inference/       # 潮汐推理
│   │       │   ├── shumiyuan/            # 枢密院
│   │       │   ├── miaosuan/             # 庙算
│   │       │   ├── chronicle/            # 编年史
│   │       │   ├── auth/                 # 认证
│   │       │   ├── prisma/               # 数据库
│   │       │   └── shared/               # 共享模块（Redis/Queue/Logger/Monitor）
│   │       ├── prisma/
│   │       │   └── schema.prisma         # 🔴 数据库 Schema
│   │       └── package.json
│   │
│   ├── nginx/                            # Nginx 配置
│   │   └── life-locations.conf           # /life/ 路由配置
│   ├── scripts/                          # 运维脚本
│   │   ├── health-check.sh               # 9 项健康检查
│   │   ├── backup-db.sh                  # 数据库备份
│   │   └── rollback.sh                   # 回滚
│   └── DEPLOY.md                         # 部署指南
│
├── docs/                                 # 文档
│   ├── engineering-handoffs/             # 🔴 工程交接包
│   │   ├── INDEX.md                      # 交接包索引
│   │   ├── _ground-truth.md              # 唯一真相源 v2.0
│   │   ├── engineering-handoff-L2-pipeline-v2.md
│   │   ├── engineering-handoff-L1-content-v2.md
│   │   ├── engineering-handoff-L3-memory-v2.md
│   │   └── engineering-handoff-L4-character-v2.md
│   ├── dev/execution/                    # 执行计划
│   └── engineering/                      # 技术文档
│
├── knowledge/                            # 知识库
│   ├── eastern-metaphysics/              # 东方玄学知识
│   └── knowledge-base/                   # 结构化知识库
│
└── scripts/deploy/                       # 部署脚本
    └── deploy-awkn-life.ps1              # 🔴 一键部署
```

---

## 12. 关键文件快速索引

| 用途 | 文件路径 |
|------|---------|
| 数据库 Schema | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma` |
| 后端入口模块 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/app.module.ts` |
| Pipeline 编排器 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts` |
| 意图路由 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/intent-router.service.ts` |
| Agent 调度器 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts` |
| LLM Provider | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/llm-providers/llm-providers.service.ts` |
| PM2 配置 | `apps/awkn-lablife/awkn-life-backend/ecosystem.config.js` |
| Nginx 配置 | `apps/AWKN-LABlife/nginx/life-locations.conf` |
| 前端 Vite 配置 | `apps/AWKN-LABlife/app/vite.config.ts` |
| 前端入口 | `apps/AWKN-LABlife/app/src/App.tsx` |
| 部署脚本 | `scripts/deploy/deploy-awkn-life.ps1` |
| 健康检查 | `scripts/health-check.sh` |
| Ground Truth | `docs/engineering-handoffs/_ground-truth.md` |
| 执行框架 | `.trae/rules/execution-framework.md` |

---

## 13. 运维速查

### 常用命令

```bash
# 查看后端日志
pm2 logs awkn-life-backend

# 重启后端
pm2 restart awkn-life-backend

# 查看进程状态
pm2 list

# 健康检查（服务器端）
bash /opt/awkn-life/scripts/health-check.sh

# 备份数据库
cp /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db \
   /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db.bak.$(date +%Y%m%d)

# Prisma 迁移
cd /opt/awkn-life/awkn-life-backend
npx prisma migrate deploy

# 重新生成 Prisma Client
npx prisma generate
```

### 故障排查

| 问题 | 排查步骤 |
|------|---------|
| 502 Bad Gateway | `pm2 list` 检查后端是否运行；`pm2 logs` 查看错误日志 |
| LLM 调用失败 | 检查 API Key（`.env`）；`curl /api/v1/health/llm` 检查连通性 |
| 页面空白 | 检查 Nginx 配置；确认 `/www/wwwroot/awkn-lab/life/index.html` 存在 |
| 数据库错误 | `npx prisma db push`；检查 WAL 模式 |
| JS MIME 错误 | Nginx 需正确配置 `location ^~ /life/assets/` |
| 前端路由 404 | 检查 `@life_spa` fallback 配置 |
| PM2 内存溢出 | `max_memory_restart: 500M`；检查是否有内存泄漏 |

---

## 修订记录

| 日期 | 版本 | 修订内容 | 依据 |
|------|------|---------|------|
| 2026-06-16 | v3.0 | 全面重写为工程交接总文档，整合 Ground Truth v2.0 + 执行框架 + 部署流程 + 技术债 | 代码探查：schema.prisma / orchestrator.service.ts / intent-router.service.ts / zhangbanshan-scheduler.service.ts / llm-providers.service.ts / ecosystem.config.js / vite.config.ts / life-locations.conf / deploy-awkn-life.ps1 / health-check.sh / app.module.ts / dialogue.controller.ts |
