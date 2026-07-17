# L2 Pipeline 工程交接 — 🔴 最高优先级

> ⚠️ **DEPRECATED（2026-06-25）**：本文件已被 [`engineering-handoff-L2-pipeline-v2.md`](./engineering-handoff-L2-pipeline-v2.md) 取代。本文件仅作历史参考，不再维护。权威版本请查阅 -v2.md。

> **版本**：v2.0
> **生成日期**：2026-06-14 | **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)（全文档集唯一真相源）
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md` §一 D2 + §三 战略
> **优先级**：🔴 **P0 / 最高**（CEO 原话："先把 L2 管道修稳，这是真正的瓶颈"）
> **工期**：P0 修管 1-4 周
> **目标读者**：天火（架构 Lead）、程序员（实施）
> **依赖阻塞**：无（最先启动）

---

## 〇、阅读路径

```
本文档 §一  ←  变更摘要 + 影响范围            ← 天火/程序员先看
        §二  ←  接口契约（4 路由 + 三套输出）  ← 核心交付
        §三  ←  数据变更（Prisma schema）     ← 后端必看
        §四  ←  测试用例（9 步 + 三套输出）   ← 验收
        §五  ←  部署说明（BullMQ 修复）      ← 上线
        §六  ←  回滚方案（回退到旧模式）     ← 应急
        §七  ←  RACI + 技术约束             ← 责任到人
```

---

## 一、变更摘要 + 影响范围

### 1.1 变更摘要

| # | 变更 | 优先级 | 工期 |
|---|------|--------|------|
| **C-L2-1** | 修复 BullMQ 条件加载（当前不工作） | 🔴 P0 | 2 天 |
| **C-L2-2** | 修复 asset copying（当前不工作） | 🔴 P0 | 1 天 |
| **C-L2-3** | 同步 Prisma client（当前不同步） | 🔴 P0 | 1 天 |
| **C-L2-4** | Pipeline 9 步流程修稳（4 路由 + 两段式漏斗 + ReAct 循环） | 🔴 P0 | 8 天 |
| **C-L2-5** | 三套输出格式对齐（三段式 + 5 层 + 6 段 Prompt） | 🔴 P0 | 3 天 |
| **C-L2-6** | 8 个工程测试用例（jest） | 🟠 P1 | 3 天 |
| **C-L2-7** | 数据迁移（SQLite → PostgreSQL 准备） | 🟡 P2 | 2 天 |
| **C-L2-8** | 灰度开关（USE_NEW_PIPELINE 1%→10%→50%→100%） | 🟠 P1 | 2 天 |

**总工期**：22 天（拆 L2.1a = 12 天 + L2.1b = 10 天，应对乐观估计 C2 盲点）

### 1.2 影响范围（爆炸半径）

| 影响层 | 文件 | 风险 |
|--------|------|------|
| **后端核心** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/*.ts` | 🔴 高 |
| **后端队列** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/*.ts`（BullMQ） | 🔴 高 |
| **数据库** | `apps/AWKN-LABlife/awkn-life-backend/prisma/schema.prisma` | 🔴 高（迁移需谨慎） |
| **前端** | `apps/AWKN-LABlife/app/src/pages/ConsultPage.tsx` + `ResultPage.tsx` | 🟡 中 |
| **LLM Provider** | 7+ 通道 failover（不变） | 🟢 低 |
| **部署** | `pm2 reload`（不中断） | 🟢 低 |

**爆炸半径**：约 30 个文件，最大风险是 schema 迁移 + BullMQ 行为变更。

---

## 二、接口契约（4 路由 + 两段式漏斗 + ReAct + 三套输出）

### 2.1 Pipeline 9 步流程（实际架构）

```
[用户输入]
  → Step 1: Intent Router（4 路由：ziping/liuren/mixed/clarify）
  → Step 2: High-Risk Detector（命中即返回，不走 LLM）
  → Step 3: User Memory（记忆加载）
  → Step 4: Classifier（4 类 UserState）
  → Step 5: Zhangbanshan Scheduler（6 Agent 调度 + 2 模式选择）
  → Step 6: Prompt Layers + LLM Parallel Gateway + ReAct 循环（仅 deep_consult）
  → Step 7: Generation Composer（5 层输出合成）
  → Step 8: Validator（质量验证）
  → Step 9: Render（三段式最终渲染）
```

| # | 步骤 | 输入 | 输出 | 实现位置 |
|---|------|------|------|----------|
| 1 | **Intent Router** | 原始问题 | `RouteType`（ziping/liuren/mixed/clarify） | `intent-router.service.ts` |
| 2 | **High-Risk Detector** | 问题 + 路由 | 风险等级（isCrisis + isHighRisk），命中即返回 | `safety/high-risk-detector.service.ts` + `crisis-keywords.ts` + `scenario-rules.yaml` |
| 3 | **User Memory** | userId | 4 JSON 字段（chartHistory/consultHistory/timelineEvents/insights） | `memory/user-memory.service.ts` |
| 4 | **Classifier** | 问题 + 记忆 | `UserState`（casual/genuine/repeating/validating） | `classifier/user-state-classifier.service.ts` |
| 5 | **Zhangbanshan Scheduler** | 路由 + 状态 + 记忆 | 6 Agent 调度 + 模式选择（quick_read/deep_consult） | `zhangbanshan-scheduler.service.ts` |
| 6 | **Prompt Layers + LLM + ReAct** | 调度结果 + 5 层 Prompt | LLM 原始输出 + ReAct 循环结果（最大 5 轮） | `prompt-layers.ts` + `react-engine.service.ts` |
| 7 | **Generation Composer** | LLM 输出 | 5 层输出（factLayer~insightLayer） | `generation-composer.service.ts` |
| 8 | **Validator** | 5 层输出 | zod 校验后结构 | `quality-gate.service.ts` |
| 9 | **Render** | 校验后结构 | 三段式最终渲染（judgment/premise/cost） | `orchestrator.service.ts` renderOutput |

### 2.2 两段式漏斗

| 模式 | 触发条件 | 执行路径 | 延迟 |
|------|---------|---------|------|
| **quick_read** | 路由为 clarify 或用户状态为 casual | 仅主调 LLM，1-2 秒出初步结论 | < 3s |
| **deep_consult** | 路由为 ziping/liuren/mixed 且用户状态为 genuine/repeating | 主+佐调 + 完整工具链 + 仲裁 + ReAct 循环 | < 60s |

**超时降级**：L2 超过 60 秒 → 返回 L1 快速降级结果，后台继续推演 L2。

### 2.3 三套输出格式（并存）

#### A. 张半山三段式（主路径，最终渲染）

```typescript
type ZhangbanshanOutput = {
  judgment: string;          // 我的判断
  premise: string;           // 前提
  cost: string;              // 代价
  reasoning_trace?: string;  // 推理轨迹（可选）
  costWarnings?: string[];   // 代价提醒（可选）
};
```

代码来源：`orchestrator.service.ts` renderOutput 方法

#### B. 5 层输出（付费分层，Generation Composer 合成）

```typescript
type FiveLayerOutput = {
  factLayer: string;           // L2-1 事实层
  interpretationLayer: string; // L2-2 解读层
  deductionLayer: string;      // L2-3 推演层（免费用户 gated）
  adviceLayer: string;         // L2-4 建议层（免费用户 gated）
  insightLayer: string;        // L2-5 点睛层（免费用户 gated）
};
```

5 层标记正则（`generation-composer.service.ts:38-44`）：
```
factLayer:           /【事实层】|【L2-1】|【八字排盘】|【事实】/
interpretationLayer: /【解读层】|【L2-2】|【格局用神】|【解读】/
deductionLayer:      /【推演层】|【L2-3】|【推演路径】|【推演】/
adviceLayer:         /【建议层】|【L2-4】|【行动建议】|【建议】/
insightLayer:        /【点睛层】|【L2-5】|【金句】|【点睛】/
```

**付费分层**：免费用户后 3 层（deductionLayer/adviceLayer/insightLayer）标记为 gated。

#### C. 6 段 Prompt（降级路径，Generation Composer buildPrompt）

| 序号 | 段标题 |
|------|--------|
| 1 | 一句话定性 |
| 2 | 判断依据 |
| 3 | 当前风险 |
| 4 | 建议动作 |
| 5 | 时间窗口 |
| 6 | 落一句最实在的话 |

代码来源：`generation-composer.service.ts:282-288`

### 2.4 Pipeline 调用入口（暴露给前端）

```typescript
// POST /api/v1/consult
// Request
{
  question: string;            // 用户问题
  userState?: UserState;       // 4 类状态（casual/genuine/repeating/validating）
  context?: {                  // 上下文
    memories?: Record<string, any>;  // 4 JSON 字段直读
    recentIssues?: string[];
  };
}

// Response
{
  data: {
    zhangbanshan_output: ZhangbanshanOutput;  // 三段式（主路径）
    fiveLayers: FiveLayerOutput;               // 5 层（付费分层）
    rawText: string;                           // 完整文本（含 6 段 Prompt 降级路径）
    meta: {
      pipelineVersion: 'v2.0';
      routeType: RouteType;                    // ziping/liuren/mixed/clarify
      scheduleMode: 'quick_read' | 'deep_consult';
      userState: UserState;                    // casual/genuine/repeating/validating
      elapsedMs: number;
      llmProvider: string;                     // 实际使用的 Provider
      reactRounds?: number;                    // ReAct 循环轮次（仅 deep_consult）
    };
  } | null,
  error: { code: string; message: string } | null
}
```

### 2.5 4 路由类型详解

| 路由 | 含义 | 典型问题 | 调度模式 |
|------|------|---------|---------|
| `ziping` | 八字排盘 | "我明年运势怎么样" | deep_consult（ziping Agent） |
| `liuren` | 六壬/奇门 | "这件事能不能成" | deep_consult（liuren/qimen Agent） |
| `mixed` | 混合（需多 Agent） | "事业和感情哪个先管" | deep_consult（多 Agent + 仲裁） |
| `clarify` | 澄清（问题模糊） | "帮我看看" | quick_read |

### 2.6 ReAct 循环

```typescript
// react-engine.service.ts
// 最大 5 轮迭代
// 循环状态：THINK → ACT → OBSERVE → REFLECT → DONE
// 仅 deep_consult 模式启用
// 超时降级：60s 后返回 L1 快速结果
```

### 2.7 6 Agent 类型

| Agent | 用途 | 调度条件 |
|-------|------|---------|
| `liuren` | 六壬 | 路由=liuren |
| `qimen` | 奇门 | 路由=liuren + 特定关键词 |
| `ziping` | 八字排盘 | 路由=ziping |
| `ziwei` | 紫微斗数 | 路由=mixed + 事业/财运 |
| `liuyao` | 六爻 | 路由=liuren + 具体事件 |
| `quming` | 起名 | 特定关键词触发 |

---

## 三、数据变更（Prisma schema）

### 3.1 现有模型（无需新增，仅需确认对齐）

**ConsultRecord**（`schema.prisma:152`）：
```prisma
model ConsultRecord {
  id          String   @id @default(cuid())
  userId      String
  question    String
  status      String   @default("pending")   // pending/analyzing/clarify/completed/failed
  flowStatus  String?                          // speaking/spreading/bottomed/chronicled/reviewed
  contentJson String?
  llmProvider String?
  elapsedMs   Int?
  createdAt   DateTime @default(now())
  // ... 其他字段
}
```

**UserMemory**（`schema.prisma:71-85`）：
```prisma
model UserMemory {
  id              String   @id @default(cuid())
  userId          String   @unique
  chartHistory    String?  @default("{}")   // 命盘历史（JSON）
  consultHistory  String?  @default("{}")   // 咨询历史（JSON）
  timelineEvents  String?  @default("{}")   // 时间线事件（JSON）
  insights        String?  @default("{}")   // 洞察记录（JSON）
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 3.2 可选新增（P2 阶段）

```prisma
// 以下模型为 P2 规划，当前不需要

model ConsultPipeline {
  id            String   @id @default(cuid())
  userId        String
  question      String
  routeType     String   // ziping/liuren/mixed/clarify
  scheduleMode  String   // quick_read/deep_consult
  userState     String   // casual/genuine/repeating/validating
  reportJson    Json     // 三套输出完整 JSON
  pipelineVer   String   @default("v2.0")
  llmProvider   String?
  elapsedMs     Int?
  reactRounds   Int?
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
  @@map("ConsultPipeline")
}

model PipelineStepLog {
  id            String   @id @default(cuid())
  pipelineId    String
  stepName      String   // intent_router/high_risk_detector/memory/classifier/scheduler/prompt_llm_react/composer/validator/render
  status        String   // success/failed/skipped
  durationMs    Int
  errorMsg      String?
  createdAt     DateTime @default(now())

  @@index([pipelineId])
  @@map("PipelineStepLog")
}
```

### 3.3 迁移策略

| 阶段 | 动作 | 回滚 |
|------|------|------|
| 1 | `npx prisma migrate dev --name add-pipeline-tables`（开发） | 删除 migration 文件 |
| 2 | `npx prisma migrate deploy`（生产） | `npx prisma migrate resolve --rolled-back <name>` |
| 3 | 数据回填（可选） | 备份恢复 |

**回滚 SOP**：见 `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\rollback-sop.md`

---

## 四、测试用例（9 步 + 三套输出）

### 4.1 9 步流程单测

| 步骤 | 测试 | 预期 |
|------|------|------|
| Step 1 Intent Router | 4 路由分类准确率 | ≥85% |
| Step 2 High-Risk Detector | 危机关键词 + 场景规则 | 100% 正确拦截 |
| Step 3 User Memory | 4 JSON 字段召回 | ≥80% |
| Step 4 Classifier | 4 类 UserState | ≥85% |
| Step 5 Scheduler | 6 Agent 调度 + 2 模式 | 100% 不空 |
| Step 6 Prompt+LLM+ReAct | 5 层 Prompt + ReAct 循环 | ≤5 轮收敛 |
| Step 7 Generation Composer | 5 层输出完整 | 100% |
| Step 8 Validator | zod 校验 | 100% |
| Step 9 Render | 三段式 + 5 层双输出 | 100% |

### 4.2 8 个工程测试用例（jest）

```typescript
// test/pipeline.e2e.spec.ts

1. should return zhangbanshan_output + fiveLayers for valid question
2. should return 400 when question is empty
3. should return 400 when question > 2000 chars
4. should trigger high_risk lockdown for crisis keywords (自杀/自残)
5. should fall back to degraded mode when all LLM providers fail
6. should return quick_read result for clarify route
7. should complete deep_consult with ReAct within 60s
8. should respect USE_NEW_PIPELINE flag (off → old mode)
```

### 4.3 两段式漏斗测试

| 场景 | 路由 | UserState | 预期模式 | 预期延迟 |
|------|------|-----------|---------|---------|
| 模糊问题 | clarify | casual | quick_read | < 3s |
| 具体八字 | ziping | genuine | deep_consult | < 60s |
| 重复提问 | ziping | repeating | deep_consult + 记忆锚点 | < 60s |
| 验证型 | liuren | validating | deep_consult + 对比逻辑 | < 60s |

### 4.4 端到端 e2e（Playwright）

```typescript
// e2e/pipeline.spec.ts
test('user submits question → receives zhangbanshan_output + fiveLayers', async ({ page }) => {
  await page.goto('/life/consult');
  await page.fill('[data-testid="question-input"]', '明年该不该跳槽？');
  await page.click('[data-testid="submit-btn"]');
  await expect(page.locator('[data-testid="report-judgment"]')).toBeVisible();
  await expect(page.locator('[data-testid="report-premise"]')).toBeVisible();
  await expect(page.locator('[data-testid="report-cost"]')).toBeVisible();
  // 5 层输出可见（付费用户）
  await expect(page.locator('[data-testid="layer-fact"]')).toBeVisible();
  await expect(page.locator('[data-testid="layer-interpretation"]')).toBeVisible();
});
```

---

## 五、部署说明（BullMQ 修复 + 灰度开关）

### 5.1 BullMQ 条件加载修复

**当前问题**：`queue.service.ts` 的 BullMQ 条件分支不工作，无论环境变量如何都加载。

**修复**：
```typescript
// consult/orchestrator/orchestrator.processor.module.ts 修复后
@Injectable()
export class QueueService {
  private bullQueue: Queue | null = null;

  constructor(private config: ConfigService) {
    if (this.config.get('ENABLE_BULLMQ') === 'true') {
      this.bullQueue = new Queue('consult', {
        redis: { host: this.config.get('REDIS_HOST') },
      });
    }
  }

  async addConsultJob(data: ConsultJobData) {
    if (this.bullQueue) {
      return this.bullQueue.add('process', data, { attempts: 3, backoff: 5000 });
    }
    // fallback: 同步执行
    return this.pipelineService.process(data);
  }
}
```

### 5.2 asset copying 修复

**当前问题**：`scripts/copy-assets.sh` 找不到源目录，assets 没复制到 dist。

**修复**：
```bash
# scripts/copy-assets.sh 修复后
#!/bin/bash
set -e
SOURCE_DIR="$(dirname "$0")/../src/assets"
TARGET_DIR="$(dirname "$0")/../dist/assets"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "ERROR: Source dir not found: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp -r "$SOURCE_DIR/"* "$TARGET_DIR/"
echo "Assets copied: $(ls "$TARGET_DIR" | wc -l) files"
```

### 5.3 Prisma client 同步

**当前问题**：`schema.prisma` 改了但 client 没重生成。

**修复**：
```bash
# scripts/sync-prisma.sh
#!/bin/bash
set -e
cd "$(dirname "$0")/../../apps/AWKN-LABlife/awkn-life-backend/apps/api-server"
npx prisma generate
npx prisma db push
echo "Prisma client synced"
```

### 5.4 灰度开关

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `USE_NEW_PIPELINE` | `false` | 新 9 步流程开关 |
| `USE_NEW_PIPELINE_PCT` | `0` | 灰度百分比（0/1/10/50/100） |
| `BULLMQ_ENABLED` | `true` | BullMQ 队列 |
| `PIPELINE_TIMEOUT_MS` | `60000` | Pipeline 总超时（60s，超时降级到 L1） |

**灰度顺序**：1% → 10% → 50% → 100%，每阶段 ≥24h 观察。

---

## 六、回滚方案

### 6.1 故障信号 → 降级动作

| 故障信号 | 阈值 | 降级动作 | 回滚开关 |
|---------|------|---------|---------|
| 9 步流程 e2e 失败率 | > 5% | 切回旧模式 | `USE_NEW_PIPELINE=false` |
| 三段式输出缺失 | > 1% | 重试 + 降级文案 | `PIPELINE_FALLBACK_ENABLED=true` |
| BullMQ 队列堆积 | > 1000 | 同步执行 + 告警 | `BULLMQ_ENABLED=false` |
| LLM 全通道失败 | 7+/7+ | 降级文案（不接 LLM） | `LLM_DEGRADED_MODE=true` |
| Prisma 迁移错误 | 任一 | 回滚 schema + 数据回填 | `git revert` + 备份恢复 |
| **C9 连续 2 周无进展** | — | 自动 CEO review | `LINE_L2_STATUS=stalled` |

### 6.2 回滚 SOP

```bash
# 1. 关停新 Pipeline
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set USE_NEW_PIPELINE false'

# 2. 重载（不中断）
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 reload api-server'

# 3. 健康检查
curl http://8.148.245.29:3000/health

# 4. 监控 5 分钟
# 确认无 5xx 后回滚完成
```

---

## 七、RACI + 技术约束

### 7.1 RACI

| 任务 | R | A | C | I |
|------|---|---|---|---|
| Pipeline 9 步流程代码 | 天火 | CEO | 程序员 | 全部 |
| BullMQ 修复 | 天火 | CEO | 程序员 | 全部 |
| Prisma 迁移 | 后端 Lead | CEO | 天火 | 全部 |
| 灰度放量 | 后端 Lead | CEO | 前端 Lead | 全部 |
| 紧急回滚 | 后端 Lead | CEO | 天火 | 全部 |

### 7.2 技术约束

| 约束 | 值 |
|------|-----|
| Node.js | 20.x LTS |
| NestJS | 10.x |
| Prisma | 5.x |
| BullMQ | 5.x |
| TypeScript | 5.x strict |
| 数据库 | PostgreSQL 16（生产）/ SQLite（开发） |
| Redis | 7.x（BullMQ 依赖，当前强制禁用 REDIS_ENABLED=false） |
| PM2 | 1 实例 fork 模式，500M 内存上限 |
| API 错误格式 | `{ data, error }` |
| 验证 | zod |
| 日志 | Pino（结构化） |
| 测试 | jest + Playwright |
| 默认 LLM Provider | deepseek-direct |
| 辅助 LLM Provider | sensenova |

---

## 附录 A：关键文件路径

- Orchestrator 主文件：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts`
- Intent Router：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/intent-router.service.ts`
- Zhangbanshan Scheduler：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts`
- Generation Composer：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/generation-composer.service.ts`
- ReAct Engine：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/react-engine.service.ts`
- Prompt Layers：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts`
- High-Risk Detector：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/safety/high-risk-detector.service.ts`
- Crisis Keywords：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/safety/crisis-keywords.ts`
- User State Classifier：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/classifier/user-state-classifier.service.ts`
- User Memory：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/memory/user-memory.service.ts`
- Memory Extractor：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/memory/memory-extractor.service.ts`
- Prisma schema：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma`
- 拍板文件：`docs/dev/execution/00-decisions-confirmed.md`
- 计划详情：`docs/dev/execution/line-02-pipeline.md`
- 总览：`docs/engineering-handoffs/engineering-handoff-overview.md`
- 口径源：`docs/engineering-handoffs/_ground-truth.md`

---

*生成日期：2026-06-14 | 修订日期：2026-06-15（v2.0 代码态重写）*
*下次更新：Week 2 L2.1a 完结汇报时*
