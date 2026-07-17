# 人生决策宗师 — 项目技术文档

> 文档版本：v1.1
> 首次生成：2026-06-27
> 当前事实复核：2026-07-04
> 项目代号：AWKN-LABlife
> 部署地址：阿里云轻量 8.148.245.29
> 文档定位：完整工程交接包（架构 + 技术栈 + 接口 + 数据库 + 部署 + 测试）

---

## 目录

- [第 0 章 — 文档使用说明](#第-0-章--文档使用说明)
- [第 1 章 — 项目概览](#第-1-章--项目概览)
- [第 2 章 — 系统架构](#第-2-章--系统架构)
- [第 3 章 — 技术栈与依赖](#第-3-章--技术栈与依赖)
- [第 4 章 — 后端模块清单](#第-4-章--后端模块清单)
- [第 5 章 — API 接口文档](#第-5-章--api-接口文档)
- [第 6 章 — 数据库 Schema](#第-6-章--数据库-schema)
- [第 7 章 — 前端结构与路由](#第-7-章--前端结构与路由)
- [第 8 章 — LLM Provider 配置](#第-8-章--llm-provider-配置)
- [第 9 章 — 关键业务流程](#第-9-章--关键业务流程)
- [第 10 章 — 部署架构](#第-10-章--部署架构)
- [第 11 章 — 环境变量](#第-11-章--环境变量)
- [第 12 章 — 测试体系](#第-12-章--测试体系)
- [第 13 章 — 安全与监控](#第-13-章--安全与监控)
- [第 14 章 — 已知约束与遗留问题](#第-14-章--已知约束与遗留问题)
- [第 15 章 — 变更记录与复盘索引](#第-15-章--变更记录与复盘索引)

---

## 第 0 章 — 文档使用说明

### 0.1 文档受众

| 受众 | 推荐阅读章节 |
|------|-------------|
| 新加入工程师 | 第 1、2、3、7 章 → 第 4、5 章 → 第 9 章 |
| 后端工程师 | 第 2、4、5、6、8 章 |
| 前端工程师 | 第 2、7、11 章 |
| 部署 / 运维 | 第 10、11、12、13 章 |
| 审核 / QA | 第 4、5、6、9、12 章 |
| 产品方 | 第 1、9 章（业务流程），第 14、15 章 |

### 0.2 文档生成依据

本文档基于以下源码事实自动生成：

- `awkn-life-backend/apps/api-server/src/**/*.controller.ts`（22 个 Controller）
- `awkn-life-backend/apps/api-server/src/app.module.ts`（30+ NestJS Module）
- `awkn-life-backend/apps/api-server/prisma/schema.prisma`（26 个 Prisma Model）
- `awkn-life-backend/apps/api-server/package.json`（25 个生产依赖）
- `app/src/App.tsx`（27 个前端路由）
- `app/package.json`（58 个生产依赖）
- `app/vite.config.ts`（PWA + 构建配置）
- `awkn-life-backend/ecosystem.config.js`（PM2 配置）
- `awkn-life-backend/apps/api-server/.env.example`（环境变量模板）
- `app/.env.example`（前端环境变量）
- `SUB-MODULES.md`、`INDEX.md`、`CLAUDE.md`（项目自描述）
- `docs/engineering/生产代码独立运行时验证与技术债务审计-20260704.md`（当前生产事实与准入判断）

### 0.3 2026-07-04 当前生产事实

| 维度 | 当前事实 |
|---|---|
| 本地最新提交 | `9d5a5ab8`；77 套件 / 1354 passed / 4 skipped |
| 生产 Git | `02227c4`；本地仓库无法解析该提交，生产工作区存在未提交修改 |
| 当前生产数据库 | SQLite，实际运行文件为 `apps/api-server/prisma/dev.db` |
| 当前生产证据包 | `EVIDENCE_PACKAGE_ENABLED=true` |
| 当前生产 Redis | `REDIS_ENABLED=false`；生成和回访队列处于降级模式 |
| 生产快照独立验证 | 构建和启动通过；73 套件中 72 通过，1 个知识来源完整性测试失败 |
| 本地 Phase 4/5/G4 | commit `9d5a5ab8` 增量运行时验证通过（2026-07-04）：3 个新模块（MemoryEmbeddingService / LlmCostDashboardService / LlmRouterService）编译+加载+API 可用性全部 PASS，2 个新 admin API（`/admin/llm-cost`、`/admin/llm-router`）返回真实数据；详见 `生产代码增量运行时验证-20260704.md` |
| 当前部署准入 | 暂缓；先收口 Git 真相、显式路由、FactLedger、结构化输出和知识来源 |

> 本文后续章节仍保留 2026-06-27 的完整工程结构描述。出现冲突时，以本节和 2026-07-04 审计报告为当前事实。文件尾部存在第 13—15 章与附录重复，列入文档治理任务。

---

## 第 1 章 — 项目概览

### 1.1 产品定位

**人生决策宗师** 是一款基于东方术数（中国传统命理学）的智能化人生决策辅助 Web 应用，提供六壬、八字、奇门遁甲、六爻、紫微斗数五大术数 Agent 的问事分析能力。

### 1.2 核心能力

| 能力 | 说明 |
|------|------|
| **问事咨询** | 用户提出具体问题（如"是否换工作"），系统调度相应术数 Agent 分析 |
| **多模态排盘** | 八字排盘 + 六壬起课 + 奇门遁甲 + 六爻 + 紫微斗数 |
| **人生 K 线 / 潮汐图** | 月度 OHLCV 七线数据 + 12 维状态向量 |
| **多轮对话** | 张班珊反问-观察-判断 6 态状态机 |
| **通鉴系统** | 决策编年史 + 回看 + 用户画像生成 |
| **命例库** | 用户收藏命盘/卦例/案例 |
| **付费会员** | 信用点制 + 会员等级 + 解锁模块 |
| **增长体系** | 邀请码 + 海报 + 三级邀请链路 |

### 1.3 目标用户

- 对东方术数有需求的 C 端用户
- 想做人生决策（职业、婚姻、财运、健康、时机）辅助的个人
- 命理师 / 玄学爱好者（可收藏命例、研究反馈闭环）

### 1.4 业务规模指标

| 指标 | 数据 |
|------|------|
| 后端 Module 数 | 30+ |
| 后端 Controller 数 | 22 |
| 数据库表数 | 26 |
| 前端页面数 | 27 |
| 前端组件数 | 200+ |
| 本地测试套件数 | 77（2026-07-04 实跑） |
| 本地测试用例数 | 1354 passed / 4 skipped / 0 failed |
| 生产快照测试 | 72/73 套件通过；1320 passed / 4 skipped / 1 failed |
| P0 装甲状态 | rule-matcher / evidence-composer / agent-run 已存在；生产 `EVIDENCE_PACKAGE_ENABLED=true`；16 条知识绑定源文件在生产全部缺失，需完成来源收口 |

---

## 第 2 章 — 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         浏览器（前端 SPA）                          │
│   React 19 + Vite 7 + Tailwind 3 + Radix UI + shadcn/ui         │
│   base: /life/                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Nginx（反向代理 + 静态托管）                  │
│   80/443 → /var/www/awkn-life/life (前端 dist)                  │
│            → localhost:30000/api/v1 (后端)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  NestJS API      │  │  Knowledge        │  │  Redis / BullMQ  │
│  Server          │  │  Service (Python) │  │  (队列/缓存)      │
│  port: 30000     │  │  port: 8701       │  │  port: 6379      │
│  (PM2 托管)      │  │  (PM2 托管)       │  │  (Docker)        │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  SQLite          │  │  知识库 JSON      │
│  (单实例)        │  │  + mmapped 数据   │
│  prisma/dev.db   │  │  /opt/awkn-life/ │
│  prisma/prod.db  │  │  knowledge/      │
└──────────────────┘  └──────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│                  LLM Provider 集群                         │
│   DeepSeek Direct / SenseNova / Kimi / Doubao / MiniMax  │
│   Spark / OpenAI                                          │
│   (统一通过 OpenAI 兼容 SDK 调用)                          │
└──────────────────────────────────────────────────────────┘
```

### 2.2 进程与端口分配

| 进程 | PM2 名称 | 端口 | 类型 | 说明 |
|------|---------|------|------|------|
| NestJS API | `awkn-life-backend` | 30000 | fork | 主后端服务 |
| Knowledge Service | `knowledge-service` | 8701 | fork | Python 知识库检索服务 |
| Redis | (Docker) | 6379 | daemon | 已配置；生产 `REDIS_ENABLED=false`，生成与回访队列当前走降级路径 |
| Nginx | system | 80/443 | system | 反向代理 + 静态 |

### 2.3 数据流向

**咨询链路**：

```
用户问事
  ↓ POST /api/v1/consult/analyze
NestJS ConsultController
  ↓
ZhangBanshanScheduler (调度器)
  ├→ IntentRouter (意图分类: liuren/ziping/qimen/liuyao/ziwei)
  ├→ KnowledgeBaseModule (知识检索)
  ├→ SafetyService (高风险检测)
  ├→ BaZiCalculator / LiurenCalculator / 等计算器 (排盘)
  ├→ AgentForensics (智能体取证)
  ├→ GenerationComposer (生成编排)
  ├→ LlmProvidersService (LLM 调用)
  └→ QualityGate (质量门控)
  ↓
ConsultRecord 入库 + 返回结果
```

---

## 第 3 章 — 技术栈与依赖

### 3.1 后端技术栈

| 维度 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | 22.x |
| 框架 | NestJS | 10.3.x |
| ORM | Prisma | 5.10.x |
| 数据库 | SQLite | 3.x |
| 缓存/队列 | Redis + BullMQ | BullMQ 5.78.x |
| 鉴权 | Passport-JWT + bcryptjs | - |
| 实时通信 | Socket.IO | 4.x（@nestjs/platform-socket.io） |
| LLM SDK | OpenAI 兼容 | openai 4.26.x |
| Token 计数 | gpt-tokenizer | 2.5.x |
| 日志 | Winston + Daily Rotate | winston 3.19.x |
| 错误监控 | Sentry | @sentry/node 8.55.x |
| 校验 | class-validator + Zod | - |
| 支付 | Stripe | 14.14.x |
| 时间处理 | dayjs | 1.11.x |

### 3.2 前端技术栈

| 维度 | 选型 | 版本 |
|------|------|------|
| 框架 | React | 19.2.x |
| 构建 | Vite | 7.2.x |
| 类型 | TypeScript | 5.9.x |
| 路由 | React Router DOM | 7.13.x |
| 样式 | Tailwind CSS + CSS Variables | 3.4.x |
| 组件库 | Radix UI + shadcn/ui | Radix 1.x |
| 状态管理 | Zustand | 5.0.x |
| 表单 | React Hook Form + Zod | 7.70.x / 4.3.x |
| 动画 | GSAP + Framer Motion + split-type | - |
| 图表 | ECharts + D3 + Recharts | - |
| 国际化 | i18next + react-i18next | i18next 26.x |
| 实时 | socket.io-client | 4.7.x |
| PWA | vite-plugin-pwa | 1.3.x |
| 错误监控 | Sentry React | 8.55.x |
| 二维码 | qrcode | 1.5.x |
| 测试 | Vitest + Testing Library | Vitest 4.x |

### 3.3 子服务 / 工具链

| 服务 | 语言 | 路径 | 用途 |
|------|------|------|------|
| knowledge-service | Python 3.11 | `/opt/awkn-life/services/knowledge-service/` | 知识库检索（mmapped JSON 数据） |
| 紫微排盘 CLI | Python | `python-validator/` | 紫微斗数排盘命令 |

### 3.4 TypeScript 模块系统

**关键变更**：后端采用 CommonJS（NestJS 默认兼容性最佳）。

```json
// awkn-life-backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@/*": ["./src/*"],
      "@awkn/shared": ["../packages/shared/src"]
    }
  }
}
```

**前端采用 ESM**（Vite 7 + `"type": "module"`）。

---

## 第 4 章 — 后端模块清单

### 4.1 NestJS Module 总览

来自 `src/app.module.ts` 的 30+ 个 Module：

| 顺序 | Module | 职责 | 路径 |
|------|--------|------|------|
| 1 | **ConfigModule** | 环境变量加载 | @nestjs/config |
| 2 | **PrismaModule** | 数据库连接 | `src/prisma/` |
| 3 | **AuthModule** | JWT 鉴权 | `src/auth/` |
| 4 | **UserModule** | 用户管理 | `src/user/` |
| 5 | **ConsultModule** | 咨询主链路 | `src/consult/` |
| 6 | **PaymentModule** | 支付（Stripe/微信/支付宝） | `src/payment/` |
| 7 | **MembershipModule** | 会员 + 信用点 | `src/membership/` |
| 8 | **SavedCaseModule** | 命例库 | `src/saved-case/` |
| 9 | **WebsocketModule** | WebSocket 实时通信 | `src/websocket/` |
| 10 | **FeedbackModule** | 专家标注反馈 | `src/feedback/` |
| 11 | **LlmProvidersModule** | LLM Provider 路由 | `src/llm-providers/` |
| 12 | **AnalyticsModule** | 埋点分析 | `src/analytics/` |
| 13 | **GrowthModule** | 邀请/海报/三级链路 | `src/growth/` |
| 14 | **AdminModule** | 管理后台 | `src/admin/` |
| 15 | **UserProfileModule** | 用户档案 | `src/user-profile/` |
| 16 | **MingliBenchModule** | 命理基准测试 | `src/mingli-bench/` |
| 17 | **ShumiyuanModule** | 枢密院主链路 | `src/shumiyuan/` |
| 18 | **StarChartModule** | 星图 | `src/star-chart/` |
| 19 | **MiaosuanModule** | 庙算 | `src/miaosuan/` |
| 20 | **ChronicleModule** | 通鉴编年史 | `src/chronicle/` |
| 21 | **KlineTideModule** | K 线 + 潮汐图 | `src/kline-tide/` |
| 22 | **TideInferenceModule** | 潮汐推断 | `src/tide-inference/` |
| 23 | **FeatureFlagsModule** | 功能开关 | `src/feature-flags/` |
| 24 | **DecisionFrameworkModule** | 决策框架（ADL/VFM） | `src/decision-framework/` |
| 25 | **GuardrailsModule** | 护栏（prompt 注入/经典校验） | `src/guardrails/` |
| 26 | **SolarTimeModule** | 真太阳时 | `src/calc-engine/solar-time/` |
| 27 | **ZiweiEngineModule** | 紫微引擎 | `src/calc-engine/ziwei-engine/` |
| 28 | **KnowledgeBaseModule** | 知识库检索 | `src/knowledge-base-data/` |
| 29 | **WritingPipelineModule** | 写作管线 | `src/writing-pipeline/` |
| 30 | **RedisModule / QueueModule** | Redis + BullMQ | `src/shared/redis/` |

### 4.2 ConsultModule 内部子结构

```
src/consult/
├── consult.controller.ts              # 主入口 (prefix: consult)
├── consult.service.ts                 # 业务编排
├── consult.module.ts                  # NestJS module
├── behavior/                          # 行为埋点
├── clarification/                     # 澄清反问
│   ├── clarification.service.ts
│   └── completeness-assessor.service.ts
├── classifier/                        # 用户状态分类
│   └── user-state-classifier.service.ts
├── context/                           # 上下文管理 + Token 计数
│   ├── context-builder.service.ts
│   ├── summary-compressor.service.ts
│   └── token-counter.service.ts
├── dialogue/                          # 多轮对话
│   ├── dialogue.controller.ts (consult/dialogue)
│   ├── dialogue.service.ts
│   └── dialogue-timeout.service.ts
├── dto/
├── followup/                          # 回访
│   ├── followup.controller.ts (consult/followup)
│   ├── followup.service.ts
│   └── active-moves.ts
├── generators/                        # 运势生成
│   ├── kline.generator.ts
│   ├── monthly.generator.ts
│   ├── wuxing.generator.ts
│   └── short-cycle.generator.ts
├── memory/                            # 用户长期记忆
│   ├── memory-extractor.service.ts
│   └── user-memory.service.ts
├── orchestrator/                      # 主调度器（核心）
│   ├── zhangbanshan-scheduler.service.ts  # 张班珊调度
│   ├── orchestrator.service.ts
│   ├── generation-composer.service.ts
│   ├── quality-gate.service.ts
│   ├── react-engine.service.ts
│   ├── prompt-layers.ts
│   ├── intent-router.service.ts
│   ├── agent-run/                     # P2-B 埋点
│   │   ├── agent-run-logger.ts
│   │   └── agent-run.types.ts
│   ├── evidence-composer/             # P1-B 证据包
│   │   ├── evidence-composer.service.ts
│   │   ├── evidence-composer.types.ts
│   │   └── knowledge-retriever/
│   ├── rule-matcher/                  # 规则匹配
│   │   ├── rule-matcher.service.ts
│   │   ├── rule-matcher.types.ts
│   │   └── rules/
│   └── rules/
│       └── scenario-rules.yaml
├── safety/                            # 安全检测
│   ├── crisis-keywords.ts
│   ├── high-risk-detector.service.ts
│   └── scenario-rules.yaml
├── schemas/
└── types/
```

### 4.3 LLM Provider 抽象

`LlmProvidersService` 提供统一调用接口，支持 7 个 Provider 自动 failover：

```typescript
// 简化的调用示例
const result = await llmProvidersService.call({
  prompt: '...',
  preferredProvider: 'deepseek-direct',
  fallback: ['sensenova', 'kimi', 'minimax'],
});
```

**Provider 优先级**（按 .env.example）：
1. `DEFAULT_LLM_PROVIDER`（默认 sensenova）
2. 失败时按 fallback 列表重试

---

## 第 5 章 — API 接口文档

### 5.1 全局约定

| 项 | 值 |
|----|---|
| **Base URL** | `http://8.148.245.29:30000/api/v1` |
| **本地开发** | `http://localhost:3000/api/v1` |
| **统一响应格式** | `{ code: 0, message: 'ok', data: ... }` 或 `{ code: <非0>, message: '<错误>', data: null }` |
| **鉴权头** | `Authorization: Bearer <JWT>`（除公开路由外） |
| **限流** | 通过 BullMQ 队列控制并发 |
| **错误码** | 业务异常 4xx，系统异常 5xx（统一由 AllExceptionsFilter 处理） |

### 5.2 Controller 一览

| # | Controller | Prefix | 路径数 | 主要功能 |
|---|-----------|--------|--------|---------|
| 1 | HealthController | `health` | 4 | 健康检查 / LLM 状态 / DB 状态 / Readiness |
| 2 | ConsultController | `consult` | 22 | 咨询主链路：analyze / preview / route / clarify / result / records / followup / 等 |
| 3 | DialogueController | `consult/dialogue` | 3 | 多轮对话：start / reply / result |
| 4 | FollowUpController | `consult/followup` | 2 | 回访调度与查询 |
| 5 | AdminController | `admin` | 30+ | 管理后台：users / records / evidence / stats / rules |
| 6 | KLineTideController | `kline-tide` | 8 | K 线 / 潮汐数据 |
| 7 | AuthController | `auth` | 4 | 注册 / 登录 / 刷新 / 登出 |
| 8 | UserController | `user` | 3 | 用户基础信息 |
| 9 | UserProfileController | `user/profile` | 5 | 用户档案 / 八字 |
| 10 | MembershipController | `membership` | 11 | 会员计划 / 信用点 |
| 11 | SavedCaseController | `cases` | 5 | 命例库 CRUD |
| 12 | AnalyticsController | `analytics` | 8 | 埋点 / 访问统计 |
| 13 | FeedbackController | `feedback` | 8 | 反馈与专家校准 |
| 14 | GrowthController | `growth` | 7 | 邀请码 / 海报 / 三级链路 |
| 15 | MingliBenchController | `mingli-bench` | 7 | 命理基准测试 |
| 16 | WritingPipelineController | `writing-pipeline` | 2 | 写作管线 |
| 17 | FeatureFlagsController | `feature-flags` | 1 | 功能开关查询 |
| 18 | StarChartController | `star-chart` | - | 星图数据 |
| 19 | ShumiyuanController | `shumiyuan` | - | 枢密院 |
| 20 | MiaosuanController | `miaosuan` | - | 庙算 |
| 21 | ChronicleController | `chronicle` | - | 通鉴编年史 |
| 22 | PaymentController | `payment` | - | 支付（Stripe/微信/支付宝） |

### 5.3 核心 API 详细列表

#### 5.3.1 健康检查（无需鉴权）

| Method | Path | 用途 |
|--------|------|------|
| GET | `/health` | 基础健康检查（含 DB 状态） |
| GET | `/health/llm` | LLM Provider 健康状态 |
| GET | `/health/db` | 数据库连接检查 |
| GET | `/health/ready` | Kubernetes Readiness 探针 |

**示例**：
```bash
curl http://8.148.245.29:30000/api/v1/health
# {"code":0,"message":"ok","service":"awkn-life-backend","database":"connected","timestamp":"2026-06-27T09:21:06.318Z"}
```

#### 5.3.2 鉴权 `/auth`

| Method | Path | 用途 |
|--------|------|------|
| POST | `/auth/register` | 邮箱注册 |
| POST | `/auth/login` | 密码登录 |
| POST | `/auth/refresh` | 刷新 token |
| POST | `/auth/logout` | 登出 |

#### 5.3.3 咨询主链路 `/consult`（核心）

| Method | Path | 用途 |
|--------|------|------|
| POST | `/consult/preview` | 免费预览（生成免费内容） |
| POST | `/consult/analyze` | **完整咨询分析**（核心入口） |
| POST | `/consult/route` | 意图路由（识别用哪个术数 Agent） |
| POST | `/consult/clarify` | 主动澄清反问 |
| POST | `/consult/info` | 用户信息补全 |
| GET | `/consult/result/:recordId` | 获取结果 |
| POST | `/consult/save` | 保存命例 |
| GET | `/consult/records` | 历史记录列表 |
| POST | `/consult/records/delete` | 软删除记录 |
| POST | `/consult/records/:recordId/closed-loop` | P3-1 闭环结果回写 |
| GET | `/consult/person-profiles` | 人物档案列表 |
| GET | `/consult/person-profiles/:profileId/records` | 某人物的记录 |
| DELETE | `/consult/person-profiles/:profileId` | 删除人物 |
| GET | `/consult/fortune/daily` | 每日运势 |
| GET | `/consult/fortune/monthly/:year/:month` | 月运 |
| GET | `/consult/fortune/yearly/:year` | 年运 |
| GET | `/consult/celebrity-cases` | 名人命例 |
| GET | `/consult/celebrity-cases/:id` | 单个命例 |
| POST | `/consult/celebrity-cases/:id/similarity` | 与名人相似度对比 |
| POST | `/consult/records/:recordId/modules/:moduleId/destiny-snapshot` | 命运快照 |
| GET | `/consult/records/:recordId/modules/:moduleId` | 某模块结果 |
| POST | `/consult/records/:id/behavior` | 行为事件 |
| POST | `/consult/records/:recordId/modules/:moduleId/retry` | 重试模块 |
| GET | `/consult/admin/asset-overview` | 资产概览（管理员） |
| GET | `/consult/naming/history` | 取名历史 |

#### 5.3.4 多轮对话 `/consult/dialogue`

| Method | Path | 用途 |
|--------|------|------|
| POST | `/consult/dialogue/start` | 启动对话 |
| POST | `/consult/dialogue/:dialogueId/reply` | 用户回复 |
| GET | `/consult/dialogue/:dialogueId/result` | 对话结果 |

#### 5.3.5 回访 `/consult/followup`

| Method | Path | 用途 |
|--------|------|------|
| POST | `/consult/followup` | 创建回访 |
| GET | `/consult/followup/:followUpId` | 查询回访 |

#### 5.3.6 管理后台 `/admin`

| Method | Path | 用途 |
|--------|------|------|
| POST | `/admin/rules/reload` | 热重载规则 |
| GET | `/admin/users` | 用户列表 |
| GET | `/admin/person-profiles` | 人物档案 |
| GET | `/admin/consult-records` | 咨询记录 |
| GET | `/admin/consult-records/:id` | 单条记录 |
| GET | `/admin/consult-records/:id/manifest` | 记录 manifest |
| **GET** | **`/admin/consult-records/:id/evidence`** | **P1-B 证据包查询** |
| GET | `/admin/consult-records/:id/generation-runs` | 生成运行记录 |
| GET | `/admin/knowledge-hits` | 知识命中 |
| GET | `/admin/interaction-events` | 交互事件 |
| GET | `/admin/consult-previews` | 预览记录 |
| GET | `/admin/memberships` | 会员列表 |
| GET | `/admin/naming-records` | 取名记录 |
| GET | `/admin/question-records` | 问事记录 |
| GET | `/admin/kline-records` | K 线记录 |
| GET | `/admin/unlock-records` | 解锁记录 |
| GET | `/admin/credit-usage` | 信用点使用 |
| GET | `/admin/llm-failures` | LLM 失败记录 |
| GET | `/admin/llm-cost?days=7` | LLM 成本看板（Phase 5 T5.2，按 provider/routeType/日期聚合 + 单轮vs多轮对比） |
| GET | `/admin/llm-router` | LLM 智能路由配置（Phase 5 T5.3，返回 enabled + routeTable 8 条路由） |
| GET | `/admin/stats` | 基础统计 |
| GET | `/admin/stats/enhanced` | 增强统计 |

#### 5.3.7 K 线 / 潮汐 `/kline-tide`

| Method | Path | 用途 |
|--------|------|------|
| GET | `/kline-tide/bars` | K 线 Bar 数据 |
| GET | `/kline-tide/snapshots` | 状态快照 |
| GET | `/kline-tide/phase-points` | 相位点 |
| GET | `/kline-tide/package` | 综合数据包 |
| GET | `/kline-tide/scores` | 评分 |
| GET | `/kline-tide/node-explanation` | 节点解释 |
| POST | `/kline-tide/seed` | 种子数据 |

#### 5.3.8 会员 / 信用点 `/membership`

| Method | Path | 用途 |
|--------|------|------|
| GET | `/membership/plans` | 套餐列表 |
| GET | `/membership/plans/:planId` | 单个套餐 |
| GET | `/membership/current` | 当前会员 |
| POST | `/membership/activate` | 激活 |
| POST | `/membership/unlock` | 解锁模块 |
| GET | `/membership/check/:moduleId` | 模块解锁检查 |
| GET | `/membership/history` | 历史 |
| POST | `/membership/cancel/:membershipId` | 取消 |
| GET | `/membership/credit/balance` | 信用点余额 |
| GET | `/membership/credit/history` | 信用点流水 |
| GET | `/membership/credit/costs` | 各模块扣费 |
| GET | `/membership/free-trial/status` | 限免状态 |
| POST | `/membership/free-trial/use` | 使用限免 |

#### 5.3.9 命例库 `/cases`

| Method | Path | 用途 |
|--------|------|------|
| GET | `/cases` | 我的命例列表 |
| POST | `/cases` | 创建命例 |
| GET | `/cases/:id` | 详情 |
| PATCH | `/cases/:id` | 更新 |
| DELETE | `/cases/:id` | 删除 |

#### 5.3.10 反馈与校准 `/feedback`

| Method | Path | 用途 |
|--------|------|------|
| POST | `/feedback` | 提交反馈 |
| GET | `/feedback/record/:recordId` | 某记录反馈 |
| GET | `/feedback/admin/list` | 反馈列表（管理员） |
| POST | `/feedback/:id/calibrate` | 专家校准 |
| POST | `/feedback/:id/apply` | 应用校准 |
| GET | `/feedback/unapplied` | 未应用校准 |
| GET | `/feedback/calibrate/suggestions` | 校准建议 |
| POST | `/feedback/calibrate/run` | 执行校准 |

#### 5.3.11 增长体系 `/growth`

| Method | Path | 用途 |
|--------|------|------|
| GET | `/growth/invite-code` | 我的邀请码 |
| GET | `/growth/invite-stats` | 邀请统计 |
| POST | `/growth/referral/record` | 记录邀请 |
| POST | `/growth/referral/activate` | 激活邀请 |
| GET | `/growth/offers` | 增长 offer 列表 |
| POST | `/growth/poster-share` | 海报分享 |
| GET | `/growth/referral-rewards` | 邀请奖励 |

#### 5.3.12 命理基准 `/mingli-bench`

| Method | Path | 用途 |
|--------|------|------|
| GET | `/mingli-bench/categories` | 类别列表 |
| POST | `/mingli-bench/run` | 运行基准 |
| POST | `/mingli-bench/run-comparison` | 对比运行 |
| POST | `/mingli-bench/run-voting` | 投票运行 |
| POST | `/mingli-bench/run-subagent` | 子 Agent 运行 |
| POST | `/mingli-bench/analyze-categories` | 分析类别 |
| GET | `/mingli-bench/history` | 历史 |
| GET | `/mingli-bench/history/:runId` | 单次详情 |
| GET | `/mingli-bench/history/:runId/export` | 导出 |

#### 5.3.13 分析埋点 `/analytics`

| Method | Path | 用途 |
|--------|------|------|
| GET | `/analytics/admin/stats` | 管理员统计 |
| POST | `/analytics/page-visit` | 页面访问 |
| POST | `/analytics/activity` | 用户活动 |
| POST | `/analytics/event` | 事件 |
| POST | `/analytics/bazi-profile` | 八字档案上报 |
| GET | `/analytics/bazi-profile` | 八字档案查询 |
| GET | `/analytics/stats` | 统计 |
| POST | `/analytics/consult-result` | 咨询结果 |

---

## 第 6 章 — 数据库 Schema

### 6.1 数据库类型

- **当前**：SQLite 3.x（单实例）
- **演进**：Week 16-20 迁移 PostgreSQL（独立项目）

### 6.2 数据模型总览（26 个 Model）

| # | Model | 说明 | 核心字段 |
|---|-------|------|----------|
| 1 | **User** | 用户主表 | id, email, phone, wxOpenId, isAdmin, creditBalance, freeTrialUsed |
| 2 | **CreditLedger** | 信用点流水 | userId, amount, reason, balanceAfter |
| 3 | **UserMemory** | 用户长期记忆 | 7 type: major_issue/time_anchor/person_anchor/bottom_line/repeat_pattern/mood_signal/feedback |
| 4 | **BaZiProfile** | 八字档案 | 四柱/五行/身旺/喜忌/十神/神煞/胎元/命宫/纳音 |
| 5 | **ConsultRecord** | 咨询记录（核心） | question, routeType, status, inputData, calcResult, llmResult, analysisData |
| 6 | **NamingResult** | 取名结果 | names (JSON), wuge, sancai |
| 7 | **ConsultFeedback** | 专家反馈 | rating, accuracy, helpfulness, calibrationTag |
| 8 | **PersonProfile** | 人物档案 | 出生信息 + 关系元数据 |
| 9 | **PersonProfileRecord** | 人物-咨询关联 | many-to-many |
| 10 | **PageVisit** | 页面访问埋点 | pageName, duration, source |
| 11 | **UserActivity** | 用户活动埋点 | activityType, activityData |
| 12 | **Session** | 登录会话 | refreshToken, expiresAt |
| 13 | **Membership** | 会员订阅 | type, status, startDate, expireDate |
| 14 | **Order** | 订单 | productType, amount, paymentMethod |
| 15 | **Invite** | 邀请码 | code, rewardTier |
| 16 | **Referral** | 邀请关系 | parentReferralId（3级链路） |
| 17 | **GrowthOffer** | 增长 offer | title, subtitle, startAt, expireAt |
| 18 | **LiurenCase** | 六壬命例 | source, lessonData, judgment |
| 19 | **EvidencePacket** | 证据包（P1-B） | recordId, routeType, version, inputHash, packetJson |
| 20 | **GenerationRun** | LLM 生成运行 | provider, model, promptVersion, finalJson |
| 21 | **KnowledgeHit** | 知识命中 | runId, sourceId, score |
| 22 | **InteractionEvent** | 交互事件 | eventType, eventJson |
| 23 | **ConsultPreview** | 免费预览 | module, freeContent (JSON) |
| 24 | **BenchmarkRun** | 命理基准测试 | provider, model, useCot, accuracy |
| 25 | **PersonEightDimensions** | 八维看人 | role/relationship/motivation/ability 等 8 维 |
| 26 | **PersonRelatedCase** | 人物相关事项 | caseTitle, hisRole, whatHeSaid, result |
| 27 | **ChronicleEntry** | 通鉴记录 | title, content, initialView, whatHappened |
| 28 | **UserInsightProfile** | 用户画像 | commonStuckPoints, accuracyRate |
| 29 | **KlineBar** | 月度 K 线 | 七线 OHLCV JSON |
| 30 | **StateSnapshot** | 12 维状态快照 | 12 维度 + 时位心三组 + quadrant |
| 31 | **ConsultFollowUp** | 回访（P3-1） | scheduledAt, triggerType, result |
| 32 | **ConsultDialogue** | 多轮对话（P4-1） | 6 态状态机 + turns JSON |
| 33 | **SavedCase** | 命例库（Week 1 Day 1） | name, snapshot, visibility |

> 注：实际 Prisma 文件中 model 数量为 33（包含部分关系中间表）。

### 6.3 核心 Model 详情

#### 6.3.1 User（用户）

```prisma
model User {
  id              String    @id @default(uuid())
  email           String?   @unique
  phone           String?   @unique
  wxOpenId        String?   @unique
  password        String?
  nickname        String?
  gender          String?
  birthDate       DateTime?
  birthTime       String?
  birthPlace      String?
  timezone        String?
  isAdmin         Boolean   @default(false)
  creditBalance   Int       @default(0)
  freeTrialUsed   Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  baZiProfile     BaZiProfile?
  records         ConsultRecord[]
  personProfiles  PersonProfile[]
  orders          Order[]
  memberships     Membership[]
  creditLedgers   CreditLedger[]
  sessions        Session[]
  invites         Invite[]
  pageVisits      PageVisit[]
  activities      UserActivity[]
  chronicleEntries ChronicleEntry[]
  insightProfile  UserInsightProfile?
  memories        UserMemory[]
  followUps       ConsultFollowUp[]
  namingResults   NamingResult[]
  dialogues       ConsultDialogue[]
  savedCases      SavedCase[]
}
```

#### 6.3.2 ConsultRecord（咨询记录）

```prisma
model ConsultRecord {
  id              String    @id @default(uuid())
  userId          String?
  sessionId       String?   @unique @default(uuid())
  question        String
  routeType       String    // liuren/ziping/liuyao/qimen/shumiyuan
  status          String    @default("pending")
  flowStatus      String?   // speaking/spreading/bottomed/chronicled/reviewed
  inputData       String    @default("{}")
  calcResult      String?   // 八字计算结果（JSON）
  llmResult       String?   // LLM 返回的原始 JSON
  summaryScore    Int?      @default(0)
  summaryLine     String?
  analysisData    String?   @default("{}")
  spreadData      String?
  bottomData      String?
  calcDuration    Int?      // 毫秒
  llmDuration     Int?
  modelUsed       String?
  isSaved         Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // v1.5 新增：后端原子资产留存
  anonymousId       String?
  structuredInput   String?   @default("{}")
  coreChartSnapshot String?
  resultSummary     String?
  lastViewedAt      DateTime?
  deletedAt         DateTime? // 软删除

  sourceEntry   String?    // 'kline' | 'naming' | 'question'
  namingType    String?    // 'baby' | 'adult' | 'brand'
  questionIntent String?   // 问事意图分类
  klineType     String?    // monthly/yearly/decade
  unlockStatus  String?    // preview/unlocked_partial/unlocked_full
  shareGenerated Boolean   @default(false)
  shareCount    Int        @default(0)
  retryCount    Int        @default(0)
  consultationId String?   @unique

  emotionSnapshot String?
  extractedFacts  String?  // P1-2 事实提取
  isHighRisk      Boolean  @default(false)  // P1.5 高风险标记
  costConfirmationPrompt String?
  costUserRestated      String?
  costConfirmedAt       DateTime?
  closedLoopResult      String?  // P3-1 闭环
}
```

### 6.4 ER 关系图

```
User (1) ─┬─ (1) BaZiProfile
          ├─ (N) ConsultRecord ─┬─ (N) ConsultFeedback
          │                     ├─ (1) ConsultDialogue
          │                     ├─ (N) ConsultFollowUp
          │                     ├─ (N) PersonProfileRecord
          │                     ├─ (N) ChronicleEntry
          │                     ├─ (N) EvidencePacket
          │                     ├─ (N) GenerationRun ─ (N) KnowledgeHit
          │                     └─ (1) NamingResult
          ├─ (N) PersonProfile ─┬─ (N) PersonEightDimensions
          │                     └─ (N) PersonRelatedCase
          ├─ (N) Order
          ├─ (N) Membership
          ├─ (N) CreditLedger
          ├─ (N) Session
          ├─ (N) Invite ─ (N) Referral (3 级)
          ├─ (N) PageVisit
          ├─ (N) UserActivity
          ├─ (1) UserMemory
          ├─ (1) UserInsightProfile
          ├─ (N) SavedCase
          └─ (N) KlineBar
          └─ (N) StateSnapshot
```

---

## 第 7 章 — 前端结构与路由

### 7.1 路由总览（27 个页面）

来自 `app/src/App.tsx`：

| # | Path | Component | 功能 |
|---|------|-----------|------|
| 1 | `/` | HomePage | 首页 |
| 2 | `/consult` | ConsultPage | 咨询入口 |
| 3 | `/info` | InfoPage | 用户信息填写 |
| 4 | `/result` / `/result/:recordId` | ResultPage | 咨询结果 |
| 5 | `/membership` | MembershipPage | 会员中心 |
| 6 | `/profile` | ProfilePage | 个人中心 |
| 7 | `/history` | HistoryPage | 历史记录 |
| 8 | `/library` | LibraryPage | 命例库 |
| 9 | `/pricing` | PricePage | 定价页 |
| 10 | `/feedback` | FeedbackPage | 反馈页 |
| 11 | `/growth` | GrowthPage | 增长激励 |
| 12 | `/fortune` | FortunePage | 运势（日/月/年） |
| 13 | `/admin` | AdminPage | 管理后台 |
| 14 | `/kline-intro` | KlineIntroPage | K 线介绍 |
| 15 | `/kline` | KlinePage | K 线 |
| 16 | `/tide` | TidePage | 潮汐图 |
| 17 | `/landing` | LandingPage | 落地页 |
| 18 | `/kline-compare` | KlineComparePage | K 线对比 |
| 19 | `/naming` | FrontdeskChat (mode=naming) | 取名 |
| 20 | `/question` | FrontdeskChat (mode=question) | 问事 |
| 21 | `/miaosuan` | MiaosuanPage | 庙算 |
| 22 | `/shumiyuan` | ShumiyuanPage | 枢密院 |
| 23 | `/tongjian` | TongjianPage | 通鉴编年史 |
| 24 | `/xingtu` | XingtuPage | 星图 |
| 25 | `/ziwei` | ZiweiPage | 紫微斗数 |
| 26 | `/followup/:followUpId` | FollowUpPage | 回访 |

### 7.2 组件分类（200+ 组件）

| 分类 | 代表组件 | 数量 |
|------|---------|------|
| 基础 UI（shadcn/ui） | button, input, dialog, sheet, tooltip, tabs, card, table 等 | 50+ |
| 业务组件 | CardDisplay, KLineImageGenerator, LifeKLineChart, NPCFateDisplay, MultiEndingDisplay, ConfigDrivenStateMachine | 6 |
| 分析结果组件 | BaZiTable, BaZiDetail, AnalysisResult, ConclusionPreview, ChineseConclusionC, ModernConclusionB, TraditionalConclusionA | 7 |
| 运势组件 | DailyFortune, MonthlyFortune, YearlyFortune | 3 |
| 首页区块 | HeroSection, ServicesSection, ProcessSection, AboutSection, TestimonialsSection, FooterSection | 6 |
| 命盘展示 | BaZiTable, BaZiDetail, ReasoningPanel, SuggestionsCard, ShenShaCard | 8+ |
| 取名 | RenameComparison, MultiRoundFilter, BrandStrategy, NamingPDFExport | 4 |
| K 线 / 潮汐 | KlineChart, KlineSkeleton, TideTimeline, PhaseSpace, StateRadar, ExchangeDrawer, PaywallOverlay, CreditBalance | 8+ |
| 多轮对话 | DialogueChat | 1 |
| 反馈 | FeedbackWidget, ConnectionIndicator, LoginRequired, LoadingState, ErrorState, EmptyState | 6 |
| 海报 | PosterGenerator, PosterModal, KLineShareCard | 3 |

### 7.3 Vite 构建配置

```typescript
// vite.config.ts 关键配置
{
  base: '/life/',  // 生产和开发都是 /life/
  plugins: [
    react(),
    visualizer(),
    VitePWA({
      registerType: 'autoUpdate',
      navigateFallback: 'index.html',  // SPA 路由回退
      navigateFallbackDenylist: [/^\/api\//],  // API 不走 SW
    }),
  ],
  server: {
    port: 8080,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 拆 vendor 包: vendor-react / vendor-motion / vendor-i18n / vendor-recharts
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}
```

---

## 第 8 章 — LLM Provider 配置

### 8.1 Provider 列表（7 个）

| Provider | 模型 | Base URL | 用途 |
|----------|------|----------|------|
| **DeepSeek Direct** | deepseek-v4-pro | https://api.deepseek.com/v1 | 默认主路径 |
| **SenseNova** | deepseek-v4-flash | https://token.sensenova.cn/v1 | 廉价路径 |
| **Kimi (Moonshot)** | moonshot-v1-8k | https://api.moonshot.cn/v1 | 长上下文 |
| **Doubao** | doubao-lite | https://ark.cn-beijing.volces.com/api/v3 | 低延迟 |
| **MiniMax** | MiniMax-Text-01 | https://api.minimaxi.com/v1 | 多语言 |
| **Spark (Xfyun)** | xopqwen36v35b | https://maas-api.cn-huabei-1.xf-yun.com/v2 | 备选 |
| **OpenAI** | gpt-4o | https://api.openai.com/v1 | 兜底 |

### 8.2 调用流程

```typescript
// LlmProvidersService 调用示例
{
  preferredProvider: process.env.DEFAULT_LLM_PROVIDER,  // sensenova / deepseek-direct
  fallbackChain: ['kimi', 'doubao', 'minimax'],
  prompt: '...',
  temperature: 0.7,
  maxTokens: 2048,
}

// 自动 failover：超时 / 5xx / 4xx (除 429) 触发降级
```

### 8.3 提示词版本

通过 `LLM_PROMPT_VERSION=v1` 管理。所有 prompt 模板存放在：

```
src/liuren-agent/prompts/
src/meihua-agent/prompts/
src/consult/orchestrator/prompt-layers.ts
```

---

## 第 9 章 — 关键业务流程

### 9.1 主链路：用户咨询

```
1. 用户访问 /consult
2. 表单填写（八字信息 + 问题描述）
3. POST /api/v1/consult/preview（免费预览）
   ↓ 生成 freeContent
4. 前端展示免费预览内容 + 解锁按钮
5. 用户付费 / 使用信用点 / 限免 1 次
6. POST /api/v1/consult/analyze（完整分析）
   ↓
7. ConsultController.analyze()
   ↓
8. ZhangBanshanScheduler.synthesizeThreeStage()
   ├─ IntentRouter: routeType = liuren / ziping / qimen / liuyao / ziwei
   ├─ SafetyService: high-risk 检测（crisis / investment / medical）
   ├─ BaZiCalculator / LiurenCalculator: 排盘
   ├─ EvidenceComposer (P1-B): 打包 evidencePackage [EVIDENCE_PACKAGE_ENABLED 控制]
   │   ├─ chartSnapshot
   │   ├─ matchedRules (RuleMatcher: 8 条规则)
   │   ├─ knowledgeFragments (KnowledgeRetriever: L2 检索)
   │   └─ ruleBasedScore
   ├─ AgentRunLogger (P2-B): 3 处埋点
   │   ├─ RuleMatcher.match 后
   │   ├─ EvidenceComposer.compose 后
   │   └─ LLM 调用后（含失败）
   ├─ LlmProvidersService: 注入 evidencePackage 调 LLM
   ├─ QualityGate: 质量门控（retry / fallback）
   └─ GenerationComposer: 最终拼装
9. 写入 ConsultRecord + GenerationRun + KnowledgeHit + InteractionEvent
10. 返回结构化结果给前端
11. ResultPage 渲染（BaZiTable + SuggestionsCard + ReasoningSteps + Citations）
```

### 9.2 多轮对话（P4-1）

```
状态机：IDLE → SCHEDULING → CLARIFYING/GENERATING → RESPONDING → COMPLETED

1. POST /consult/dialogue/start (创建 ConsultDialogue)
2. POST /consult/dialogue/:id/reply (用户回复)
3. 张班珊反问 0-6 节点
4. 收集 background + cost
5. POST /consult/dialogue/:id/result (生成最终结果)
```

### 9.3 会员解锁

```
1. 用户点击"解锁深度报告"
2. 前端调 POST /membership/unlock { moduleId }
3. 后端校验：会员 / 信用点 / 限免
4. 扣信用点 → 写入 CreditLedger
5. 返回解锁后的咨询记录
6. 前端展示完整报告
```

### 9.4 邀请链路（3 级）

```
1. 用户 A 生成 inviteCode: GET /growth/invite-code
2. 用户 B 通过 A 的邀请码注册
3. POST /growth/referral/record (记录 referral)
4. 用户 B 再邀请 C → C 注册触发 POST /growth/referral/activate
5. Referral.parentReferralId 形成 3 级链路
6. 自动触发奖励：GET /growth/referral-rewards
```

### 9.5 闭环反馈（P3-1）

```
1. 咨询完成后 7 天
2. ConsultFollowUp.scheduledAt = now + 7d
3. Cron 扫描 status='pending' 的 followup
4. 推送消息（站内 / 微信）
5. 用户填写实际结果
6. POST /consult/records/:id/closed-loop (写入 userReflection + actualOutcome + accuracyCheck)
7. 反馈进入 ConsultFeedback + 触发 calibrations
```

---

## 第 10 章 — 部署架构

### 10.1 服务器信息

| 项 | 值 |
|----|---|
| 服务器 | 阿里云轻量应用服务器 |
| IP | 8.148.245.29 |
| OS | Linux（Ubuntu 22.04 推荐） |
| 项目目录 | `/opt/awkn-life/` |
| 备份目录 | `/opt/awkn-life-backups/` |
| SSH Key | `~/.ssh/aliyun_awkn` |

### 10.2 进程管理（PM2）

```javascript
// ecosystem.config.js
{
  apps: [
    {
      name: "awkn-life-backend",
      script: "scripts/bootstrap-production.js",
      cwd: "/opt/awkn-life/awkn-life-backend",
      instances: 1,           // SQLite 单实例约束
      exec_mode: "fork",     // 非 cluster
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
    },
    {
      name: "knowledge-service",
      script: "main.py",
      cwd: "/opt/awkn-life/services/knowledge-service",
      interpreter: "python3.11",
      instances: 1,
      exec_mode: "fork",
      env: {
        KNOWLEDGE_DATA_DIR: "/opt/awkn-life/knowledge/processed",
        KNOWLEDGE_USE_MMAP: "1",
      },
      max_memory_restart: "800M",
    },
  ],
}
```

### 10.3 关键路径

| 路径 | 用途 |
|------|------|
| `/opt/awkn-life/awkn-life-backend/` | 后端根目录 |
| `/opt/awkn-life/awkn-life-backend/apps/api-server/dist/` | 后端构建产物 |
| `/opt/awkn-life/awkn-life-backend/apps/api-server/.env.prod` | 生产环境变量 |
| `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db` | 生产数据库 |
| `/opt/awkn-life/app/dist/` | 前端构建产物 |
| `/var/www/awkn-life/life/` | Nginx 静态托管目录（前端） |
| `/opt/awkn-life/services/knowledge-service/` | Python 知识服务 |
| `/opt/awkn-life/knowledge/processed/` | mmapped 知识数据 |
| `/opt/awkn-life-backups/` | 数据库备份 |
| `/opt/awkn-life-backup-<timestamp>/` | 部署前完整备份点 |
| `/var/log/cert-renew.log` | HTTPS 续期日志 |
| `/var/log/awkn-backup.log` | 数据库备份日志 |

### 10.4 部署脚本（已升级，2026-06-27）

```bash
# deploy.sh - 一键部署（生产）
cd /opt/awkn-life
./deploy.sh
```

**deploy.sh 关键阶段**（来自源码 + 升级后的补丁）：

1. **预检查**：部署锁 + env 一致性 + 数据库备份存在
2. **代码同步**：git pull 或 git archive
3. **依赖安装**：`npm ci --legacy-peer-deps` 或 `npm install`
4. **G1 门禁**：`chmod +x node_modules/.bin/*`（E230）
5. **G2 门禁**：node_modules 完整性校验（E230）
6. **G3 门禁**：模块可解析性预检（E230）
7. **数据库迁移**：`prisma migrate deploy`
8. **构建**：`npm run build`（含 assets 拷贝）
9. **预启动校验**：`preflight-check.js`
10. **PM2 启动**：`pm2 start ecosystem.config.js --env production`
11. **PM2 save**
12. **部署后 5 件套验证**：`bash scripts/verify-deploy.sh`（E232）
13. **失败回滚**：任一失败 → `bash scripts/rollback.sh`

### 10.5 回滚脚本

```bash
# scripts/rollback.sh - 从备份点恢复
bash /opt/awkn-life/scripts/rollback.sh
```

**功能**：
- 从 `/opt/awkn-life/last-backup-point/` 恢复代码、前端产物、`.env.prod`、数据库
- PM2 重启
- 烟测

### 10.6 数据库备份（cron）

```
# /etc/crontab
0 2 * * * /opt/awkn-life/scripts/cron-backup.sh >> /var/log/awkn-backup.log 2>&1
```

**备份策略**：
- 每日 02:00 执行
- 使用 `sqlite3 .backup`（原子操作）
- 保留最近 30 份
- 备份到 `/opt/awkn-life-backups/awkn-life-YYYYMMDD-HHMMSS.db`

### 10.7 HTTPS 证书续期（cron）

```
0 3 * * 1 /opt/awkn-life/scripts/cert-renew.sh >> /var/log/cert-renew.log 2>&1
```

### 10.8 部署后 5 件套验证（E232，2026-06-27 升级）

```bash
#!/bin/bash
# scripts/verify-deploy.sh

[1/5] HTML title             # curl http://localhost/ | grep "<title>人生决策宗师</title>"
[2/5] JS 哈希                 # grep -E 'src="[^"]+-[A-Za-z0-9_-]{8,}\.js"'
[3/5] 健康检查                # curl http://localhost:30000/api/v1/health
[4/5] API 404                 # curl http://localhost:30000/api/v1/__nonexistent__
[5/5] PM2 unstable_restarts   # pm2 describe | grep "unstable restarts" | awk '{print $4}' == "0"
```

---

## 第 11 章 — 环境变量

### 11.1 后端 `.env.example`（生产模板）

```bash
# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://awkn.cn
CORS_ORIGINS=https://awkn.cn,https://www.awkn.cn

# Database
DATABASE_URL=file:/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db

# JWT
JWT_SECRET=<32 字符强随机>
JWT_EXPIRES_IN=15m

# Default LLM
DEFAULT_LLM_PROVIDER=deepseek-direct

# LLM Provider Keys（全部从环境变量注入，禁止写入代码）
DEEPSEEK_DIRECT_API_KEY=...
DEEPSEEK_DIRECT_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_DIRECT_MODEL=deepseek-v4-pro

SENSENOVA_API_KEY=...
SENSENOVA_BASE_URL=https://token.sensenova.cn/v1
SENSENOVA_MODEL=deepseek-v4-flash

# 其他 provider（KIMI/DOUBAO/MINIMAX/SPARK/OPENAI）...

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# 微信支付（可选）
WECHAT_APP_ID=wx_xxx
WECHAT_MCH_ID=xxx
WECHAT_API_KEY=xxx

# 支付宝（可选）
ALIPAY_APP_ID=xxx
ALIPAY_PRIVATE_KEY=xxx
ALIPAY_PUBLIC_KEY=xxx

# Admin（首次启动自动创建）
ADMIN_EMAIL=10919669@qq.com
ADMIN_PASSWORD=<强密码>

# Divination Service（Python 算命引擎）
DIVINATION_SERVICE_URL=http://127.0.0.1:5001

# LLM Prompt 版本
LLM_PROMPT_VERSION=v1

# Feature Flags（默认全关闭，按需开启）
REDIS_ENABLED=true
COST_WARNING_ENABLED=false
COST_CONFIRMATION_ENABLED=false
CALLBACK_ENABLED=false
MEMORY_ANCHOR_ENABLED=false
USER_CLASSIFIER_ENABLED=false
MULTI_TURN_ENABLED=false

# P1-B 灰度控制（默认 false）
EVIDENCE_PACKAGE_ENABLED=false  # 模板默认值；生产 2026-07-04 实际为 true

# Analytics + Sentry（可选）
ANALYTICS_ENABLED=true
SENTRY_DSN=
```

### 11.2 前端 `.env.example`

```bash
VITE_API_BASE_URL=http://localhost:30001/api/v1
VITE_USE_MOCK=false
VITE_INVITE_DOMAIN=https://awkn.cn
VITE_SENTRY_DSN=
```

### 11.3 关键环境变量矩阵

| 变量 | 类型 | 默认 | 必填 | 说明 |
|------|------|------|------|------|
| `PORT` | number | 3000 | ❌ | API 端口 |
| `NODE_ENV` | string | development | ❌ | 模式 |
| `DATABASE_URL` | string | - | ✅ | SQLite 路径（生产必须绝对路径） |
| `JWT_SECRET` | string | - | ✅ | JWT 签名密钥 |
| `DEFAULT_LLM_PROVIDER` | string | sensenova | ❌ | 默认 Provider |
| `EVIDENCE_PACKAGE_ENABLED` | boolean | false | ❌ | 模板默认 false；生产 2026-07-04 已设为 true，需同时满足知识来源完整性门禁 |
| `*_API_KEY` | string | - | ✅ | 各 Provider 必须配 |
| `ADMIN_PASSWORD` | string | - | ✅ | 首次启动自动创建管理员 |

---

## 第 12 章 — 测试体系

### 12.1 后端测试（jest）

```
apps/api-server/
├── jest.config.js
├── __mocks__/
│   └── moment.js  # 解决 winston-daily-rotate-file 间接依赖
└── src/**/__tests__/
```

**测试覆盖**：

| 套件 | 主题 | 用例数 |
|------|------|--------|
| zhangbanshan-scheduler.evidence.spec.ts | P1-B+P2-B 灰度/降级/埋点 | 11 |
| p0-armor-regression.spec.ts | P0 回归 | 32 |
| pipeline-e2e.spec.ts | 端到端管线 | 20+ |
| orchestrator.spec.ts | 编排器 | 10+ |
| behavior.controller.spec.ts | 行为埋点 | 5+ |
| router.service.spec.ts | 路由 | 5+ |
| followup/*.spec.ts | 回访 | 8+ |
| evidence-composer/*.spec.ts | 证据包 | 19+ |
| rule-matcher/*.spec.ts | 规则匹配 | 21+ |
| decision-framework/*.spec.ts | 决策框架 | 8+ |
| quality-gate.spec.ts | 质量门控 | 8+ |
| react-engine.spec.ts | ReAct 引擎 | 6+ |
| high-risk-detector.spec.ts | 高风险检测 | 4+ |
| prompt-injection-guard.spec.ts | prompt 注入护栏 | 4+ |
| **本地最新** | **77 套件** | **1354 passed / 4 skipped / 0 failed**（2026-07-04 实跑） |
| **生产快照独立验证** | **73 套件** | **1320 passed / 4 skipped / 1 failed**（知识来源文件缺失） |

### 12.2 前端测试（Vitest）

```
app/src/**/__tests__/
└── lib/__tests__/LifeKLineChart.test.tsx
```

**测试命令**：
```bash
cd app
npm run test:run
npm run test:coverage
```

### 12.3 命例基准（mingli-bench）

`apps/api-server/src/mingli-bench/` 包含 20+ 个 Golden Case：

- `mvp0-bazi-gc-001-deepseek-direct.json` 等
- 多种 Provider × 多种 case 的输出对比
- 用于回归基准 + Provider 选择依据

### 12.4 2026-07-04 生产验证补充

当前测试口径分为两条：

1. 本地最新版本：77 套件、1354 passed、4 skipped、0 failed。
2. 当前生产快照：73 套件、1320 passed、4 skipped、1 failed。

生产快照失败项来自 EvidenceComposer 的知识来源完整性测试：16 条绑定源文件在生产全部缺失，其中 10 条已标记 `confirmed`。构建与独立启动可以通过，发布审计和来源回溯仍处于阻塞状态。

生产日志同时确认以下运行时缺口：显式 Ziping 路由被覆盖、ReAct 重复追问、五层输出校验失败、紫微 CLI 导入失败、三法融合类型错误、知识检索超时、LLM JSON 截断与模板降级。完整证据和执行顺序见 `生产代码独立运行时验证与技术债务审计-20260704.md`。

---

## 第 13 章 — 安全与监控

### 13.1 安全机制

| 层 | 措施 |
|----|------|
| **传输层** | HTTPS（Let's Encrypt）+ Nginx |
| **API 鉴权** | JWT + Passport（`@nestjs/passport`） |
| **管理员** | `isAdmin` 标志 + `JwtAuthGuard` + `AdminGuard` |
| **密码存储** | bcryptjs（cost 10） |
| **CORS** | 白名单（awkn.cn / localhost） |
| **API 限流** | BullMQ 队列控制并发 |
| **Prompt 注入** | `prompt-injection-guard.service.ts` + 经典校验 |
| **高风险检测** | `high-risk-detector.service.ts`（crisis / investment / medical） |
| **危机关键词** | `crisis-keywords.ts`（自伤/医疗红线） |
| **决策框架** | ADL-guard（任务-动作-语言一致性）+ VFM（价值-可行性-匹配度） |
| **费用确认** | `COST_CONFIRMATION_ENABLED` 灰度 |
| **回调确认** | `CALLBACK_ENABLED` 灰度 |

### 13.2 监控

| 工具 | 用途 |
|------|------|
| **Sentry**（@sentry/node） | 错误捕获（可选） |
| **Winston + Daily Rotate** | 日志轮转（保留 30 天） |
| **PM2 monit** | 进程监控 |
| **BullMQ** | 队列状态 |

### 13.3 日志路径

```
awkn-life-backend/
├── logs/
│   ├── backend-YYYY-MM-DD.log           # 全量
│   └── backend-error-YYYY-MM-DD.log     # 错误
```

---

## 第 14 章 — 已知约束与遗留问题

### 14.1 SQLite 单实例约束

来源：[DEPLOY.md](file:///C:/Users/10919/Desktop/AWKN-Lab/%E4%BA%BA%E7%94%9F%E5%86%B3%E7%AD%96%E5%AE%97%E5%B8%88/apps/AWKN-LABlife/DEPLOY.md)

> 当前数据库为 SQLite 单实例，不支持：
> - 水平扩展（多实例无法共享 SQLite 文件）
> - 高可用（单点故障）
> - 高并发写入（SQLite 写锁是数据库级）
>
> PostgreSQL 迁移计划见 Week 16-20（独立项目）。

**应对**：
- 部署仅支持单实例 PM2（fork 或 cluster instances=1）
- 备份使用 sqlite3 .backup 命令

### 14.2 npm install 完整性风险（E230）

> npm install 中断可能导致 node_modules 不完整，运行时崩溃但部署看起来成功。

**应对**：
- deploy.sh 升级了 3 个门禁（G1 chmod / G2 完整性 / G3 可解析）
- 单包 npm install 可自动补齐缺失依赖

### 14.3 部署完整性依赖 chmod

> 部署脚本必须包含 `chmod +x node_modules/.bin/*`（已在 2026-06-27 升级）

### 14.4 LLM Provider 依赖

> 至少 1 个 LLM Provider 密钥必须可用，否则咨询主链路不可用

### 14.5 证据包已启用，来源完整性未收口

> 生产 `EVIDENCE_PACKAGE_ENABLED=true`。16 条知识绑定源文件全部缺失，其中 10 条状态为 `confirmed`。当前内嵌片段可被加载，来源回溯与发布审计仍待完成。

### 14.6 命理基准测试数据

> 20 个 Golden Case 文件已存在，可用于 LLM Provider 选择与回归

---

## 第 15 章 — 变更记录与复盘索引

### 15.1 变更记录（按版本）

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v0.1 | 2026-03 | MVP 上线（基础八字咨询） |
| v0.2 | 2026-04 | 六壬 Agent + K 线 |
| v0.3 | 2026-05 | 多轮对话 + 紫微斗数 |
| v0.4 | 2026-05 | 通鉴编年史 + 八维看人 |
| v0.5 | 2026-06 | 投资基准 + P2-B 增长 |
| v1.0 | 2026-06 | P1-B 证据包 + P2-B AgentRun 埋点 + 部署升级 |

### 15.2 关联复盘文档

| 文档 | 路径 | 主题 |
|------|------|------|
| **E217** trae-checker 部署复盘 | `记忆系统/02-evolution/` | 4 件套验证 |
| **E230** npm install 中断 | `apps/AWKN-LABlife/docs/复盘/E230_*.md` | 部署完整性校验门 |
| **E231** 单包 npm install | `apps/AWKN-LABlife/docs/复盘/E231_*.md` | 故障快速恢复模式 |
| **E232** 5 件套验证 | `apps/AWKN-LABlife/docs/复盘/E232_*.md` | 部署验收门升级 |
| **2026-06-27 决策** | `apps/AWKN-LABlife/docs/复盘/2026-06-27_P1B-P2B部署复盘决策.md` | P1-B+P2-B 部署全过程 |
| **2026-06-27 PRD** | `apps/AWKN-LABlife/docs/复盘/2026-06-27_P1B-P2B-PRD.md` | P1-B+P2-B 产品需求 |

### 15.3 关键提交

| Commit | 描述 |
|--------|------|
| 6a9ba684 | P1-B+P2-B 代码集成（构造函数 4 个 @Optional + chartSnapshot + EVIDENCE_PACKAGE_ENABLED + 3 处 AgentRun 埋点） |

---

## 附录 A — 完整 API 速查表

### A.1 按功能域分类

| 域 | Controller | 路径前缀 |
|----|-----------|---------|
| 健康 | HealthController | `/health` |
| 鉴权 | AuthController | `/auth` |
| 用户 | UserController, UserProfileController | `/user`, `/user/profile` |
| 咨询 | ConsultController | `/consult` |
| 对话 | DialogueController | `/consult/dialogue` |
| 回访 | FollowUpController | `/consult/followup` |
| 命例库 | SavedCaseController | `/cases` |
| 会员 | MembershipController | `/membership` |
| 支付 | PaymentController | `/payment` |
| 反馈 | FeedbackController | `/feedback` |
| 增长 | GrowthController | `/growth` |
| 分析 | AnalyticsController | `/analytics` |
| K 线 | KLineTideController | `/kline-tide` |
| 星图 | StarChartController | `/star-chart` |
| 庙算 | MiaosuanController | `/miaosuan` |
| 枢密院 | ShumiyuanController | `/shumiyuan` |
| 通鉴 | ChronicleController | `/chronicle` |
| 命理基准 | MingliBenchController | `/mingli-bench` |
| 写作管线 | WritingPipelineController | `/writing-pipeline` |
| 功能开关 | FeatureFlagsController | `/feature-flags` |
| 管理 | AdminController | `/admin` |

### A.2 公开 vs 鉴权

| 公开（无需 JWT） | 鉴权（需要 JWT） | 管理员（需要 isAdmin=true） |
|------------------|-----------------|---------------------------|
| `/health/*` | `/consult/*`（部分） | `/admin/*` |
| `/auth/register` | `/cases/*` | `/feedback/admin/list` |
| `/auth/login` | `/membership/*` | `/analytics/admin/stats` |
| `/auth/refresh` | `/growth/invite-code` | `/consult/admin/asset-overview` |
| `/consult/preview`（部分） | `/user/*` | |
| `/feature-flags` | `/analytics/page-visit` | |
| | `/consult/fortune/*`（部分） | |
| | `/consult/celebrity-cases` | |

---

## 附录 B — 文件树（关键路径）

```
AWKN-LABlife/
├── app/                                  # 前端 SPA
│   ├── src/
│   │   ├── pages/                        # 27 个页面
│   │   ├── components/                   # 200+ 组件
│   │   ├── sections/                     # 首页区块
│   │   ├── stores/                       # Zustand stores
│   │   ├── api/                          # API 客户端
│   │   ├── lib/                          # 工具库
│   │   ├── hooks/                        # React hooks
│   │   ├── types/                        # TS 类型
│   │   ├── locales/                      # i18n
│   │   ├── _archived/                    # 已归档 demo
│   │   ├── App.tsx                       # 路由
│   │   └── main.tsx                      # 入口
│   ├── public/                           # 静态资源
│   ├── vite.config.ts
│   └── package.json
│
├── awkn-life-backend/                    # 后端
│   ├── apps/api-server/
│   │   ├── src/
│   │   │   ├── consult/                  # 咨询主链路（含 orchestrator）
│   │   │   ├── auth/, user/, user-profile/
│   │   │   ├── payment/, membership/
│   │   │   ├── admin/
│   │   │   ├── kline-tide/, tide-inference/
│   │   │   ├── miaosuan/, shumiyuan/, chronicle/, star-chart/
│   │   │   ├── saved-case/, feedback/, growth/, analytics/
│   │   │   ├── mingli-bench/, writing-pipeline/
│   │   │   ├── decision-framework/, guardrails/
│   │   │   ├── feature-flags/
│   │   │   ├── knowledge-base/            # 知识库 JSON（节气/天将/课体/毕法/神煞）
│   │   │   ├── knowledge-base-data/       # KnowledgeSearchService
│   │   │   ├── calc-engine/solar-time/
│   │   │   ├── calc-engine/ziwei-engine/
│   │   │   ├── llm-providers/
│   │   │   ├── shared/redis/, shared/queue/
│   │   │   ├── prisma/
│   │   │   ├── common/filters/all-exceptions.filter.ts
│   │   │   ├── health.controller.ts
│   │   │   └── main.ts
│   │   ├── prisma/schema.prisma           # 33 个 Model
│   │   ├── scripts/                       # 启动/迁移/备份脚本
│   │   ├── jest.config.js
│   │   └── package.json
│   ├── ecosystem.config.js                # PM2 配置
│   ├── tsconfig.json
│   ├── scripts/                           # 跨 app 脚本
│   │   ├── verify-deploy.sh               # 5 件套验证
│   │   ├── rollback.sh                    # 回滚
│   │   ├── backup-db.sh                   # 数据库备份
│   │   ├── cron-backup.sh                 # 定时备份
│   │   └── cert-renew.sh                  # HTTPS 续期
│   └── package.json
│
├── services/
│   └── knowledge-service/                 # Python 知识库检索
│       ├── main.py
│       ├── loader.py
│       └── requirements.txt
│
├── scripts/                               # 全局部署/运维脚本
│   ├── pre-deploy-check.sh                # 部署锁 + env 审计
│   ├── env-audit.sh
│   ├── ensure-admin.js
│   ├── verify-admin.js
│   └── ...
│
├── docs/                                  # 项目文档
│   ├── SUB-MODULES.md                     # 子模块索引
│   ├── INDEX.md                           # 主索引
│   ├── DEPLOY.md                          # 部署指南
│   ├── CLAUDE.md                          # AI 上下文
│   ├── engineering/
│   │   └── TECHNICAL_DOCUMENTATION.md     # 本文档
│   ├── execution-plans/
│   ├── raw/
│   └── 复盘/                              # E 经验 + 决策 + PRD
│
├── nginx/                                 # Nginx 配置
├── Dockerfile
├── docker-compose.yml
├── deploy.sh                              # 一键部署（含 5 件套验证）
└── README.md
```

---

## 第 13 章 — 安全与监控

### 13.1 安全机制

| 层 | 措施 |
|----|------|
| **传输层** | HTTPS（Let's Encrypt）+ Nginx |
| **API 鉴权** | JWT + Passport（`@nestjs/passport`） |
| **管理员** | `isAdmin` 标志 + `JwtAuthGuard` + `AdminGuard` |
| **密码存储** | bcryptjs（cost 10） |
| **CORS** | 白名单（awkn.cn / localhost） |
| **API 限流** | BullMQ 队列控制并发 |
| **Prompt 注入** | `prompt-injection-guard.service.ts` + 经典校验 |
| **高风险检测** | `high-risk-detector.service.ts`（crisis / investment / medical） |
| **危机关键词** | `crisis-keywords.ts`（自伤/医疗红线） |
| **决策框架** | ADL-guard（任务-动作-语言一致性）+ VFM（价值-可行性-匹配度） |
| **费用确认** | `COST_CONFIRMATION_ENABLED` 灰度 |
| **回调确认** | `CALLBACK_ENABLED` 灰度 |

### 13.2 监控

| 工具 | 用途 |
|------|------|
| **Sentry**（@sentry/node） | 错误捕获（可选） |
| **Winston + Daily Rotate** | 日志轮转（保留 30 天） |
| **PM2 monit** | 进程监控 |
| **BullMQ** | 队列状态 |

### 13.3 日志路径

```
awkn-life-backend/
├── logs/
│   ├── backend-YYYY-MM-DD.log           # 全量
│   └── backend-error-YYYY-MM-DD.log     # 错误
```

### 13.4 验证脚本（部署后 5 件套）

详见 `apps/AWKN-LABlife/scripts/verify-deploy.sh`（E232）。

---

## 第 14 章 — 已知约束与遗留问题

### 14.1 SQLite 单实例约束

来源：[DEPLOY.md](file:///C:/Users/10919/Desktop/AWKN-Lab/%E4%BA%BA%E7%94%9F%E5%86%B3%E7%AD%96%E5%AE%97%E5%B8%88/apps/AWKN-LABlife/DEPLOY.md)

> 当前数据库为 SQLite 单实例，不支持：
> - 水平扩展（多实例无法共享 SQLite 文件）
> - 高可用（单点故障）
> - 高并发写入（SQLite 写锁是数据库级）
>
> PostgreSQL 迁移计划见 Week 16-20（独立项目）。

**应对**：
- 部署仅支持单实例 PM2（fork 或 cluster instances=1）
- 备份使用 sqlite3 .backup 命令

### 14.2 npm install 完整性风险（E230）

> npm install 中断可能导致 node_modules 不完整，运行时崩溃但部署看起来成功。

**应对**：
- deploy.sh 升级了 3 个门禁（G1 chmod / G2 完整性 / G3 可解析）
- 单包 npm install 可自动补齐缺失依赖（E231）

### 14.3 部署完整性依赖 chmod

> 部署脚本必须包含 `chmod +x node_modules/.bin/*`（已在 2026-06-27 升级）

### 14.4 LLM Provider 依赖

> 至少 1 个 LLM Provider 密钥必须可用，否则咨询主链路不可用

### 14.5 证据包已启用，来源完整性未收口

> 生产 `EVIDENCE_PACKAGE_ENABLED=true`。16 条知识绑定源文件全部缺失，其中 10 条状态为 `confirmed`。当前内嵌片段可被加载，来源回溯与发布审计仍待完成。

### 14.6 命理基准测试数据

> 20 个 Golden Case 文件已存在，可用于 LLM Provider 选择与回归

---

## 第 15 章 — 变更记录与复盘索引

### 15.1 变更记录（按版本）

| 版本 | 日期 | 主要变更 |
|------|------|----------|
| v0.1 | 2026-03 | MVP 上线（基础八字咨询） |
| v0.2 | 2026-04 | 六壬 Agent + K 线 |
| v0.3 | 2026-05 | 多轮对话 + 紫微斗数 |
| v0.4 | 2026-05 | 通鉴编年史 + 八维看人 |
| v0.5 | 2026-06 | 投资基准 + P2-B 增长 |
| v1.0 | 2026-06 | P1-B 证据包 + P2-B AgentRun 埋点 + 部署升级 |

### 15.2 关联复盘文档

| 文档 | 路径 | 主题 |
|------|------|------|
| **E217** trae-checker 部署复盘 | `记忆系统/02-evolution/` | 4 件套验证 |
| **E230** npm install 中断 | `apps/AWKN-LABlife/docs/复盘/E230_*.md` | 部署完整性校验门 |
| **E231** 单包 npm install | `apps/AWKN-LABlife/docs/复盘/E231_*.md` | 故障快速恢复模式 |
| **E232** 5 件套验证 | `apps/AWKN-LABlife/docs/复盘/E232_*.md` | 部署验收门升级 |
| **2026-06-27 决策** | `apps/AWKN-LABlife/docs/复盘/2026-06-27_P1B-P2B部署复盘决策.md` | P1-B+P2-B 部署全过程 |
| **2026-06-27 PRD** | `apps/AWKN-LABlife/docs/复盘/2026-06-27_P1B-P2B-PRD.md` | P1-B+P2-B 产品需求 |

### 15.3 关键提交

| Commit | 描述 |
|--------|------|
| 6a9ba684 | P1-B+P2-B 代码集成（构造函数 4 个 @Optional + chartSnapshot + EVIDENCE_PACKAGE_ENABLED + 3 处 AgentRun 埋点） |

---

## 附录 A — 完整 API 速查表

### A.1 按功能域分类

| 域 | Controller | 路径前缀 |
|----|-----------|---------|
| 健康 | HealthController | `/health` |
| 鉴权 | AuthController | `/auth` |
| 用户 | UserController, UserProfileController | `/user`, `/user/profile` |
| 咨询 | ConsultController | `/consult` |
| 对话 | DialogueController | `/consult/dialogue` |
| 回访 | FollowUpController | `/consult/followup` |
| 命例库 | SavedCaseController | `/cases` |
| 会员 | MembershipController | `/membership` |
| 支付 | PaymentController | `/payment` |
| 反馈 | FeedbackController | `/feedback` |
| 增长 | GrowthController | `/growth` |
| 分析 | AnalyticsController | `/analytics` |
| K 线 | KLineTideController | `/kline-tide` |
| 星图 | StarChartController | `/star-chart` |
| 庙算 | MiaosuanController | `/miaosuan` |
| 枢密院 | ShumiyuanController | `/shumiyuan` |
| 通鉴 | ChronicleController | `/chronicle` |
| 命理基准 | MingliBenchController | `/mingli-bench` |
| 写作管线 | WritingPipelineController | `/writing-pipeline` |
| 功能开关 | FeatureFlagsController | `/feature-flags` |
| 管理 | AdminController | `/admin` |

### A.2 公开 vs 鉴权

| 公开（无需 JWT） | 鉴权（需要 JWT） | 管理员（需要 isAdmin=true） |
|------------------|-----------------|---------------------------|
| `/health/*` | `/consult/*`（部分） | `/admin/*` |
| `/auth/register` | `/cases/*` | `/feedback/admin/list` |
| `/auth/login` | `/membership/*` | `/analytics/admin/stats` |
| `/auth/refresh` | `/growth/invite-code` | `/consult/admin/asset-overview` |
| `/consult/preview`（部分） | `/user/*` | |
| `/feature-flags` | `/analytics/page-visit` | |
| | `/consult/fortune/*`（部分） | |
| | `/consult/celebrity-cases` | |

---

## 附录 B — 文件树（关键路径）

（见正文）

---

## 附录 C — 文档维护

### C.1 文档更新触发条件

- 新增 Module / Controller
- API 接口变更
- 数据库 schema 变更
- LLM Provider 变更
- 部署架构变更
- 安全策略变更
- 重大故障复盘（E 经验沉淀）

### C.2 文档质量门

- ✅ 所有 API endpoint 来自源码扫描（22 个 Controller 完整采集）
- ✅ 所有 Model 来自 schema.prisma 完整解析
- ✅ 所有依赖来自 package.json 真实数据
- ✅ 所有路由来自 App.tsx 真实数据
- ✅ 部署路径来自 ecosystem.config.js 真实数据
- ✅ 环境变量来自 .env.example 完整列举

### C.3 文档使用反馈

如发现遗漏或错误，请：
1. 在项目根 `docs/engineering/` 下提交 issue
2. 或联系项目维护者（admin@awkn.cn）

---

**文档结束** | 共 15 章 + 3 附录 | v1.1 | 当前事实复核 2026-07-04