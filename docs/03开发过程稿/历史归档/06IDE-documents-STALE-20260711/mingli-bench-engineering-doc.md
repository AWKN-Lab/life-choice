# 工程交接文档：MingLi-Bench 接入 + 推理可视化 + 资产字段应用

> 版本：v1 | 日期：2026-05-25 | 状态：Specify→Build 交接

---

## 一、变更概览

| 维度 | 内容 |
|------|------|
| 产品名 | 人生决策宗师 |
| 变更范围 | 3 个独立功能模块 |
| 模块 A | MingLi-Bench 评估工具（后端） |
| 模块 B | LLM 推理过程可视化（全栈） |
| 模块 C | 用户画像 + 个性化推荐（全栈） |
| 技术栈 | NestJS + Prisma + React + Tailwind |
| 数据库 | SQLite（prod.db） |

---

## 二、接口文档

### 2.1 MingLi-Bench 评估模块

#### POST /api/v1/benchmark/run

运行一次 MingLi-Bench 基准测试。

**请求**

```typescript
interface RunBenchmarkRequest {
  year: 2022 | 2023 | 2024 | 2025;
  sampleSize?: number;
  useCot?: boolean;
  useAstro?: boolean;
  provider?: 'minimax' | 'doubao' | 'deepseek' | 'sensenova' | 'deepseek-direct';
}
```

**响应**

```typescript
interface RunBenchmarkResponse {
  runId: string;
  results: Array<{
    questionId: string;
    question: string;
    correctAnswer: string;
    predictedAnswer: string;
    isCorrect: boolean;
    reasoningContent?: string;
    durationMs: number;
  }>;
  summary: {
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
    avgDurationMs: number;
    byCategory: Record<string, {
      total: number;
      correct: number;
      accuracy: number;
    }>;
  };
}
```

**错误码**

| HTTP | code | 说明 |
|------|------|------|
| 400 | INVALID_YEAR | 年份不在 2022-2025 范围 |
| 400 | SAMPLE_TOO_LARGE | sampleSize 超过题目总数 |
| 500 | BENCHMARK_RUN_FAILED | 评估执行异常 |

---

#### GET /api/v1/benchmark/history

查询历史评估结果。

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| provider | string | 否 | 按模型筛选 |
| year | number | 否 | 按年份筛选 |
| limit | number | 否 | 默认 20 |
| offset | number | 否 | 默认 0 |

**响应**

```typescript
interface BenchmarkHistoryResponse {
  total: number;
  runs: Array<{
    id: string;
    year: number;
    provider: string;
    model: string;
    useCot: boolean;
    useAstro: boolean;
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
    avgDurationMs: number;
    createdAt: string;
  }>;
}
```

---

### 2.2 用户画像接口

#### GET /api/v1/user/profile/insights

获取当前用户的画像洞察（需 JwtAuthGuard）。

**响应**

```typescript
interface UserProfileInsightsResponse {
  topEntry: string | null;
  preferredRouteType: string | null;
  unlockedModules: string[];
  recentTopics: string[];
  consultCount: number;
  entryDistribution: Record<string, number>;
  routeTypeDistribution: Record<string, number>;
}
```

**业务规则**

- 无记录的用户返回空对象（所有字段为 null/空数组/0）
- `topEntry` 取频次最高的 sourceEntry
- `preferredRouteType` 取频次最高的 routeType
- `recentTopics` 取最近 5 条 ConsultRecord 的 question 字段（截断到 50 字符）
- `entryDistribution` 和 `routeTypeDistribution` 为全量统计

---

### 2.3 现有接口变更

#### GET /consult/result/:recordId（变更）

**新增返回字段**

```typescript
interface ResultResponse {
  // ... 现有字段不变 ...
  generationRuns?: Array<{
    id: string;
    moduleId: string;
    status: string;
    reasoningContent?: string;         // 新增：LLM 推理过程
  }>;
}
```

**变更说明**

- `reasoningContent` 字段已存在于 `GenerationRun` 表（schema.prisma L366）
- 当前 `GenerationComposerService` 的 `update` 调用未写入此字段，需补充
- 前端通过 `consultApi.getRecord(recordId)` 已可获取完整记录，无需新增 API

---

## 三、数据库文档

### 3.1 现有表变更

#### GenerationRun（已存在，无需迁移）

| 字段 | 类型 | 说明 | 变更 |
|------|------|------|------|
| reasoningContent | String? | LLM 推理过程 | 已存在，无需新增 |

**关键发现**：计划中 Step 2（扩展 GenerationRun 表）实际已完成。`reasoningContent` 字段已在 schema.prisma L366 定义。

**代码层变更**：`GenerationComposerService` 的 `prisma.generationRun.update()` 调用需补充写入 `reasoningContent`。

涉及文件：
- [generation-composer.service.ts](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/generation-composer.service.ts#L86) — L86-97 两处 `update` 调用需增加 `reasoningContent: result.reasoningContent`

---

### 3.2 新增表

#### BenchmarkRun

```prisma
model BenchmarkRun {
  id              String   @id @default(uuid())
  year            Int
  provider        String
  model           String
  useCot          Boolean  @default(false)
  useAstro        Boolean  @default(false)
  totalQuestions  Int
  correctCount    Int
  accuracy        Float
  avgDurationMs   Int
  resultsJson     String
  createdAt       DateTime @default(now())

  @@index([provider, createdAt])
  @@index([year, createdAt])
}
```

**迁移命令**

```bash
cd awkn-life-backend
npx prisma migrate dev --name add_benchmark_run
```

**回滚方式**

```bash
npx prisma migrate rollback
```

---

### 3.3 数据流图

```
MingLi-Bench 题目数据集（本地 JSON）
    │
    ▼
MingLiBenchService.run()
    │── 读取题目 → 构造 Prompt → LlmProvidersService.chat()
    │── 解析 LLM 返回 → 对比答案 → 计算准确率
    │── 写入 BenchmarkRun 表
    ▼
BenchmarkRun（持久化）

ConsultRecord.sourceEntry / routeType / unlockStatus
    │
    ▼
UserProfileService.getUserInsights()
    │── 聚合 sourceEntry 频次 → topEntry
    │── 聚合 routeType 频次 → preferredRouteType
    │── 聚合 unlockStatus → unlockedModules
    ▼
UserProfileInsightsResponse

LlmProvidersService.chat()
    │── 返回 reasoningContent
    ▼
GenerationComposerService.generate()
    │── 写入 GenerationRun.reasoningContent
    ▼
GET /consult/result/:recordId
    │── 返回 reasoningContent
    ▼
ResultPage → ReasoningPanel（折叠面板展示）
```

---

## 四、模块边界与依赖

### 4.1 后端新增模块

| 模块 | 路径 | 职责 | 依赖 |
|------|------|------|------|
| MingLiBenchModule | `mingli-bench/` | 基准测试评估 | LlmProvidersService, PrismaService |
| UserProfileModule | `user-profile/` | 用户画像聚合 | PrismaService |

### 4.2 后端变更模块

| 模块 | 文件 | 变更内容 |
|------|------|----------|
| GenerationComposerService | `generation-composer.service.ts` | 两处 `update` 增加 `reasoningContent` 写入 |
| ConsultController | `consult.controller.ts` | `getModuleStatus` 返回增加 `reasoningContent` 字段 |
| AppModule | `app.module.ts` | 导入 MingLiBenchModule, UserProfileModule |

### 4.3 前端新增组件

| 组件 | 位置 | 职责 |
|------|------|------|
| ReasoningPanel | `components/ReasoningPanel.tsx` | 折叠面板展示推理过程 |
| PersonalizedRecommendations | `components/PersonalizedRecommendations.tsx` | 个性化推荐卡片 |

### 4.4 前端变更组件

| 组件 | 文件 | 变更内容 |
|------|------|----------|
| ResultPage | `pages/ResultPage.tsx` | 集成 ReasoningPanel |
| HomePage | `pages/HomePage.tsx` | 集成 PersonalizedRecommendations |
| consult API | `api/consult.ts` | 新增 `getUserInsights()` 方法 |

### 4.5 依赖清单

| 依赖 | 用途 | 是否新增 |
|------|------|----------|
| @nestjs/common | NestJS 核心 | 否 |
| @prisma/client | ORM | 否 |
| React + Tailwind | 前端 | 否 |
| MingLi-Bench 数据集 | 160 道命理基准题 | 是（本地文件） |

---

## 五、测试用例

### 5.1 MingLi-Bench 模块

| ID | 用例 | 前置条件 | 操作 | 预期结果 |
|----|------|----------|------|----------|
| BM-01 | 运行 5 题抽样评估 | 数据集已加载 | POST /benchmark/run `{year:2025, sampleSize:5}` | 返回 5 条 results + summary.accuracy |
| BM-02 | CoT 模式评估 | 数据集已加载 | POST /benchmark/run `{year:2025, sampleSize:3, useCot:true}` | results 包含 reasoningContent |
| BM-03 | 排盘注入评估 | 数据集已加载 | POST /benchmark/run `{year:2025, sampleSize:3, useAstro:true}` | Prompt 包含排盘数据 |
| BM-04 | 指定提供商 | API Key 已配置 | POST /benchmark/run `{year:2025, sampleSize:2, provider:'deepseek-direct'}` | 使用指定提供商 |
| BM-05 | 无效年份 | - | POST /benchmark/run `{year:2020}` | 返回 400 INVALID_YEAR |
| BM-06 | 查询历史 | 至少运行过 1 次评估 | GET /benchmark/history | 返回非空 runs 数组 |
| BM-07 | 按提供商筛选 | 存在多条记录 | GET /benchmark/history?provider=sensenova | 只返回匹配记录 |
| BM-08 | 评估结果持久化 | 运行评估后 | 查询 BenchmarkRun 表 | 存在对应记录 |

### 5.2 推理过程可视化

| ID | 用例 | 前置条件 | 操作 | 预期结果 |
|----|------|----------|------|----------|
| RV-01 | 有推理内容时显示按钮 | GenerationRun.reasoningContent 非空 | 打开结果页 | 显示"查看 AI 推理过程"按钮 |
| RV-02 | 点击展开推理 | 按钮可见 | 点击按钮 | 展开显示推理内容 |
| RV-03 | 再次点击折叠 | 推理已展开 | 再次点击按钮 | 折叠回原状态 |
| RV-04 | 无推理内容时隐藏按钮 | GenerationRun.reasoningContent 为 null | 打开结果页 | 不显示按钮 |
| RV-05 | 移动端适配 | 移动端浏览器 | 打开结果页 | 按钮和面板正常显示 |
| RV-06 | 推理内容写入 DB | 使用支持 reasoning 的模型咨询 | 查询 GenerationRun | reasoningContent 非空 |
| RV-07 | 不支持 reasoning 的模型 | 使用不支持 reasoning_content 的模型 | 查询 GenerationRun | reasoningContent 为 null，流程不崩溃 |

### 5.3 用户画像 + 个性化推荐

| ID | 用例 | 前置条件 | 操作 | 预期结果 |
|----|------|----------|------|----------|
| UP-01 | 老用户画像统计 | 用户有 ≥3 条咨询记录 | GET /user/profile/insights | topEntry/preferredRouteType 非空 |
| UP-02 | 新用户空画像 | 用户无咨询记录 | GET /user/profile/insights | 所有字段为 null/空/0 |
| UP-03 | 入口频次分布 | 用户有多种入口记录 | GET /user/profile/insights | entryDistribution 包含多个 key |
| UP-04 | 首页推荐卡片-老用户 | 用户有画像数据 | 打开首页 | 显示"为您推荐"卡片，内容与历史匹配 |
| UP-05 | 首页推荐卡片-新用户 | 用户无画像数据 | 打开首页 | 显示默认推荐（K线预览） |
| UP-06 | 推荐卡片跳转 | 推荐卡片可见 | 点击推荐卡片 | 正常跳转到对应入口 |
| UP-07 | 不同用户不同推荐 | 两个不同画像用户 | 分别打开首页 | 推荐内容不同 |

### 5.4 回归测试

| ID | 用例 | 操作 | 预期结果 |
|----|------|------|----------|
| RG-01 | K线咨询流程 | 完整走一次 K线咨询 | 正常出结果 |
| RG-02 | 取名咨询流程 | 完整走一次取名咨询 | 正常出结果 |
| RG-03 | 问事咨询流程 | 完整走一次问事咨询 | 正常出结果 |
| RG-04 | 会员解锁 | 解锁一个模块 | 正常解锁 |
| RG-05 | 结果页现有模块 | 打开已有结果页 | K线图表/八字分析正常显示 |
| RG-06 | 首页 EntryGrid | 打开首页 | 入口网格正常渲染 |
| RG-07 | i18n 切换 | 切换语言 | 新增 key 有翻译 |
| RG-08 | 连续 10 次咨询 | 连续发起 10 次咨询 | 无报错 |

---

## 六、部署说明

### 6.1 部署前置校验门

| # | 检查项 | 通过标准 |
|---|--------|----------|
| 1 | 后端 typecheck | `npm run typecheck` 零错误 |
| 2 | 后端测试 | `npm test` 零失败 |
| 3 | 前端构建 | `npm run build` 成功 |
| 4 | 数据库迁移 | `npx prisma migrate status` 无待执行迁移 |
| 5 | 环境变量 | 所有新增 API Key 已配置 |

### 6.2 部署步骤

```bash
# 1. 拉取代码
git pull origin main

# 2. 后端部署
cd awkn-life-backend
npm install
npx prisma migrate deploy
npm run typecheck
npm test
npm run build

# 3. 前端部署
cd ../app
npm install
npm run build

# 4. 重启服务
```

### 6.3 冒烟验收

| # | 验收项 | 方法 |
|---|--------|------|
| 1 | 健康检查 | `curl http://localhost:3002/health` 返回 200 |
| 2 | 咨询流程 | 发起一次完整咨询，确认结果正常 |
| 3 | 推理展示 | 打开结果页，确认推理按钮可见且可展开 |
| 4 | 评估接口 | `curl -X POST http://localhost:3002/api/v1/benchmark/run -H 'Content-Type: application/json' -d '{"year":2025,"sampleSize":2}'` |
| 5 | 画像接口 | `curl http://localhost:3002/api/v1/user/profile/insights` |
| 6 | 首页推荐 | 打开首页，确认推荐卡片显示 |

### 6.4 回滚策略

| 场景 | 回滚方式 |
|------|----------|
| 数据库迁移失败 | `npx prisma migrate rollback` |
| 后端启动失败 | 回退到上一版本 commit，重新部署 |
| 前端构建失败 | 回退到上一版本 commit，重新构建 |
| 新功能异常但核心流程正常 | 注释掉新模块导入 |
| BenchmarkRun 表导致问题 | `DROP TABLE BenchmarkRun;` + 回滚迁移 |

---

## 七、变更记录

| # | 变更文件 | 变更类型 | 说明 |
|---|----------|----------|------|
| 1 | `mingli-bench/mingli-bench.module.ts` | 新增 | NestJS 模块定义 |
| 2 | `mingli-bench/mingli-bench.service.ts` | 新增 | 评估核心逻辑 |
| 3 | `mingli-bench/mingli-bench.controller.ts` | 新增 | API 端点 |
| 4 | `mingli-bench/dto/run-benchmark.dto.ts` | 新增 | 请求 DTO |
| 5 | `user-profile/user-profile.module.ts` | 新增 | NestJS 模块定义 |
| 6 | `user-profile/user-profile.service.ts` | 新增 | 画像聚合逻辑 |
| 7 | `user-profile/user-profile.controller.ts` | 新增 | API 端点 |
| 8 | `prisma/schema.prisma` | 新增 | 新增 BenchmarkRun 模型 |
| 9 | `generation-composer.service.ts` | 修改 | 两处 update 增加 reasoningContent 写入 |
| 10 | `consult.controller.ts` | 修改 | getModuleStatus 返回增加 reasoningContent |
| 11 | `app.module.ts` | 修改 | 导入新模块 |
| 12 | `components/ReasoningPanel.tsx` | 新增 | 推理折叠面板组件 |
| 13 | `components/PersonalizedRecommendations.tsx` | 新增 | 个性化推荐卡片组件 |
| 14 | `pages/ResultPage.tsx` | 修改 | 集成 ReasoningPanel |
| 15 | `pages/HomePage.tsx` | 修改 | 集成 PersonalizedRecommendations |
| 16 | `api/consult.ts` | 修改 | 新增 getUserInsights 方法 |
| 17 | i18n 翻译文件 | 修改 | 新增 reasoning/recommendation 相关 key |

---

## 八、风险与约束

| # | 风险项 | 等级 | 缓解措施 |
|---|--------|------|----------|
| 1 | Prisma 迁移失败（SQLite） | 中 | 备用 `npx prisma db push`；最差手动建表 |
| 2 | 不同模型 reasoning_content 格式差异 | 中 | LlmProvidersService 已统一解析逻辑；不支持时留空 |
| 3 | MingLi-Bench 评估耗时过长 | 低 | 支持 sampleSize 参数控制；默认抽样 |
| 4 | 用户画像统计性能 | 低 | 只读聚合，无复杂计算；数据量小 |
| 5 | 前端 bundle 体积增加 | 低 | 新增组件轻量；按需加载 |

---

## 九、环境变量

| 变量名 | 用途 | 是否新增 | 必填 |
|--------|------|----------|------|
| DEFAULT_LLM_PROVIDER | 默认 LLM 提供商 | 否 | 是 |
| SENSENOVA_API_KEY | SenseNova API Key | 否 | 是 |
| DEEPSEEK_DIRECT_API_KEY | DeepSeek Direct API Key | 否 | 否 |
| DOUBAO_API_KEY | 火山引擎 API Key | 否 | 否 |
| MINIMAX_API_KEY | MiniMax API Key | 否 | 否 |
| MINGLI_BENCH_DATA_PATH | MingLi-Bench 数据集路径 | 是 | 是 |

---

## 十、任务依赖与执行顺序

```
Step 1 (MingLi-Bench模块) ──┬── Step 7 (评估持久化)
                             │
Step 2 (DB扩展) ─────────────┼── Step 3 (捕获reasoning) ── Step 4 (前端展示)
  ↑ 已完成（字段已存在）      │
Step 5 (用户画像) ───────────┴── Step 6 (个性化推荐)
                             │
Step 8 (构建验证) ───────────┴── 依赖所有前面步骤
```

**可并行分组**：
- 组 A：Step 1 + Step 5（独立后端模块）
- 组 B：Step 3 + Step 4（依赖 Step 2，但 Step 2 已完成）
- 组 C：Step 6（依赖 Step 5）
- 组 D：Step 7（依赖 Step 1）
- 组 E：Step 8（依赖所有）

**关键发现**：Step 2（GenerationRun 增加 reasoningContent 字段）实际已完成，无需迁移。Step 3 的核心逻辑（LlmProvidersService 解析 reasoning_content）也已存在，仅需补充 GenerationComposerService 的写入。
