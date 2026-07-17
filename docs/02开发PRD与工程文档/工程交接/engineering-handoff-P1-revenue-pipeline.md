# P1 收入主链路战线工程交接

> **版本**：v2.0
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **生成日期**：2026-06-14
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md` §三 战略 + 北极星指标
> **优先级**：🔴 **P1 / 收入生命线**（北极星指标：问事深度推演完成率）
> **工期**：P1 战线 20 天（问事 16 天 + K线 3.5 天 + 取名 3 天，部分并行）
> **目标读者**：天火（架构 Lead）、程序员（实施）、前端 Lead、CEO（验收）
> **依赖阻塞**：L2 Pipeline 4 路由 + 两段式漏斗 + ReAct 循环完成（P1-1 依赖 L2 P0 修管）

---

## 〇、阅读路径

```
本文档 §一  ←  变更摘要 + 影响范围（爆炸半径）  ← 天火/程序员先看
        §二  ←  接口契约（三大入口 API + 数据结构）  ← 核心交付
        §三  ←  数据变更（Prisma schema + 积分/会员）  ← 后端必看
        §四  ←  测试用例（12 任务 + 转化漏斗）  ← 验收
        §五  ←  部署说明（灰度 + 付费上线）  ← 上线
        §六  ←  回滚方案（按入口拆分）  ← 应急
        §七  ←  RACI + 技术约束  ← 责任到人
```

---

## 一、变更摘要 + 影响范围

### 1.1 变更摘要

| # | 变更 | 所属入口 | 优先级 | 工期 | 用户感知变化 |
|---|------|---------|--------|------|-------------|
| **P1-1** | L2 Pipeline 串联：4 路由 + 两段式漏斗 + ReAct 循环端到端跑通 | 问事 | 🔴 P0 | 5 天 | 用户输入问题后能拿到完整结果 |
| **P1-2** | 三套输出格式强制：zod schema 校验（三段式 ZhangbanshanOutput + 5 层 FiveLayerOutput + 6 段 Prompt） | 问事 | 🔴 P0 | 3 天 | 结果"先给判断，再给原因，再给走法" |
| **P1-3** | 张半山身份 prompt 注入（最小版） | 问事 | 🔴 P0 | 1 天 | 回复不再像通用 AI |
| **P1-4** | 追问不断链：多轮对话上下文保持 | 问事 | 🔴 P0 | 3 天 | 追问时不整页刷新、不丢上下文 |
| **P1-5** | LLM 输出质量基线：5 个典型场景人工对标 | 问事 | 🟠 P1 | 2 天 | "真的在判断我这件事" |
| **P1-6** | 付费升级感：免费结果 → 付费深推升级提示明确 | 问事 | 🟠 P1 | 2 天 | 用户知道"更深判断需付费" |
| **P1-7** | 修复 KlineIntroPage route_type | K线 | 🔴 P0 | 0.5 天 | K线结果页展示与预期一致 |
| **P1-8** | K线可传播性：分享卡片 | K线 | 🟠 P1 | 2 天 | 用户愿意转发 |
| **P1-9** | K线付费升级感 | K线 | 🟠 P1 | 1 天 | 自然升级 |
| **P1-10** | 统一取名入口路径 | 取名 | 🔴 P0 | 0.5 天 | 入口路径唯一 |
| **P1-11** | 取名全程对话化 | 取名 | 🟠 P1 | 2 天 | 不跳页 |
| **P1-12** | 取名 PDF 导出确认 | 取名 | 🟡 P2 | 0.5 天 | 可下载报告 |

**总工期**：20 天（问事 16 天为主线，K线/取名部分并行）

**执行顺序约束**：
- P1-1 → P1-2 → P1-3（Pipeline 先跑通，再强制格式，再注入身份）
- P1-1 完成后 P1-4/P1-5 可并行
- P1-6 依赖 P1-2 + P1-3（格式和身份到位后再做付费升级感）
- P1-7 独立，可随时修复
- P1-10 独立，可随时修复

### 1.2 影响范围（爆炸半径）

| 影响层 | 文件/目录 | 风险 |
|--------|----------|------|
| **后端核心 — 问事 Pipeline** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/*.ts` | 🔴 高（4 路由 + 两段式漏斗 + ReAct 循环变更） |
| **后端安全** | `consult/safety/high-risk-detector.service.ts` + `crisis-keywords.ts` | 🟡 中（P1-3 身份注入不改动安全模块） |
| **后端记忆** | `consult/memory/user-memory.service.ts` + `memory-extractor.service.ts` | 🟡 中（P1-4 追问上下文需增强记忆调用，4 JSON 字段 + 7 类正则规则） |
| **后端 K线** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/kline-tide/` | 🟡 中（P1-7 route_type 修复 + P1-9 Paywall 联动） |
| **后端取名** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/` | 🟡 中（P1-10 入口统一 + P1-11 对话化改造） |
| **后端会员** | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/membership/membership.service.ts` | 🔴 高（P1-6/P1-9 付费升级依赖会员服务） |
| **前端 — 问事** | `apps/AWKN-LABlife/app/src/pages/ConsultPage.tsx` + `ResultPage.tsx` | 🔴 高（P1-4 追问交互 + P1-6 付费升级 UI） |
| **前端 — K线** | `apps/AWKN-LABlife/app/src/pages/KlineIntroPage.tsx` + `TidePage.tsx` | 🟡 中（P1-7 route_type + P1-8 分享卡片） |
| **前端 — 取名** | `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx` | 🟡 中（P1-10 入口统一 + P1-11 对话化） |
| **前端 Paywall** | `apps/AWKN-LABlife/app/src/components/tide/PaywallOverlay.tsx` | 🟡 中（P1-6/P1-9 共用 Paywall 组件） |
| **前端支付** | `apps/AWKN-LABlife/app/src/api/payment.ts` | 🟢 低（不改动，仅消费） |
| **数据库** | `apps/AWKN-LABlife/awkn-life-backend/prisma/schema.prisma` | 🔴 高（新增 ConsultPipeline + 积分消费记录） |
| **LLM Provider** | 7+ 通道 failover（不变） | 🟢 低 |

**爆炸半径**：约 45 个文件，最大风险是 Pipeline 串联 + 会员积分联动 + 前端追问交互。

---

## 二、接口契约（三大入口 API + 数据结构）

### 2.1 问事入口

#### 2.1.1 前端链路

```
FrontdeskChat mode="question"
  → ConsultPage（用户输入问题 + 多轮追问）
    → ResultPage（5 层报告展示 + 付费升级入口）
```

#### 2.1.2 后端 API

```typescript
// POST /api/v1/consult
// Request
{
  question: string;              // 用户问题（1-2000 字）
  userState?: UserState;         // L1 推断的 4 类状态（casual/genuine/repeating/validating）
  context?: {
    conversationId?: string;     // 多轮对话 ID（P1-4 追问用）
    turnIndex?: number;          // 当前轮次（0=首次，1+=追问）
    memories?: Record<string, any>;  // 4 JSON 字段直读（chartHistory/consultHistory/timelineEvents/insights）
    recentIssues?: string[];     // 近期问题摘要
  };
}

// Response
{
  data: {
    zhangbanshan_output: ZhangbanshanOutput;  // 三段式输出（断事+半山+走法）
    fiveLayers: FiveLayerOutput;              // 5 层输出（断事+半山+详批+代价+下一步）
    promptOutput: PromptOutput;               // 6 段 Prompt 输出
    conversationId: string;                   // 对话 ID（追问时回传）
    turnIndex: number;                        // 当前轮次
    freeQuotaRemaining: number;               // 免费次数剩余
    upgradeHint: {                            // 付费升级提示（P1-6）
      available: boolean;
      tier: 'deep_push' | 'monthly' | 'annual';
      price: number;
      description: string;
    } | null;
    meta: {
      pipelineVersion: 'v2.0';
      elapsedMs: number;
      llmProvider: string;
      modulesCompleted: string[];             // 已完成的模块列表
    };
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.1.3 三套输出格式（强约束，P1-2 zod 校验）

```typescript
import { z } from 'zod';

// ── 三段式输出：张半山核心判断 ──
const ZhangbanshanOutputSchema = z.object({
  judgment: z.string().min(10),           // 第 1 段：断事（直给判断）
  halfMountain: z.string().min(10),      // 第 2 段：半山（不直白，给一寸）
  action: z.string().min(10),            // 第 3 段：走法（下一步怎么做）
});

// ── 5 层输出：完整推演 ──
const FiveLayerOutputSchema = z.object({
  clauses: z.object({
    category: z.enum(['career', 'wealth', 'noble', 'timing', 'relationship']),
    text: z.string().min(10),            // 第 1 层：断事
  }),
  halfMountain: z.string().min(10),      // 第 2 层：半山
  detail: z.string().min(20),            // 第 3 层：详批
  cost: z.string().min(10),              // 第 4 层：代价
  nextAction: z.string().min(10),        // 第 5 层：下一步
});

// ── 6 段 Prompt 输出：LLM 原始结构化 ──
const PromptOutputSchema = z.object({
  systemPrompt: z.string(),              // 系统提示词
  identityPrompt: z.string(),            // 身份提示词（张半山）
  scenePrompt: z.string(),               // 场景提示词
  memoryPrompt: z.string(),              // 记忆注入提示词
  safetyPrompt: z.string(),              // 安全提示词
  outputFormatPrompt: z.string(),        // 输出格式提示词
});

type ZhangbanshanOutput = z.infer<typeof ZhangbanshanOutputSchema>;
type FiveLayerOutput = z.infer<typeof FiveLayerOutputSchema>;
type PromptOutput = z.infer<typeof PromptOutputSchema>;

// 三套输出必须全部存在，缺失任何一段 → zod 校验失败 → 走降级文案
```

#### 2.1.4 追问接口（P1-4）

```typescript
// POST /api/v1/consult/followup
// Request
{
  conversationId: string;        // 从首次 consult 返回的 ID
  followupQuestion: string;      // 追问内容
  turnIndex: number;             // 当前轮次
}

// Response — 同 consult Response，但 context 自动携带前文
```

#### 2.1.5 付费深推接口（P1-6）

```typescript
// POST /api/v1/consult/deep-push
// Request
{
  conversationId: string;        // 基于哪次对话深推
  paymentMethod: 'points' | 'membership';
  tier: 'deep_push';            // 199 元/次
}

// Response
{
  data: {
    deepReport: {
      zhangbanshan_output: ZhangbanshanOutput;  // 更深层的断事+半山+走法
      fiveLayers: FiveLayerOutput;              // 更详细的 5 层推演
      promptOutput: PromptOutput;               // 6 段 Prompt
      timeline: string;                         // 深推独有：时间线
      riskAssessment: string;                   // 深推独有：风险评估
    };
    pointsConsumed: number;                     // 消耗积分数
    membershipTier: string | null;
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.1.6 后端核心路径

| 模块 | 文件 | 职责 |
|------|------|------|
| 意图路由 | `consult/orchestrator/intent-router.service.ts` | 4 路由分类 |
| 质量门 | `consult/orchestrator/quality-gate.service.ts` | zod 校验 + 降级 |
| 三套输出渲染 | `consult/orchestrator/generation-composer.service.ts` | 三段式 + 5 层 + 6 段 Prompt 组装 |
| 提示词分层 | `consult/orchestrator/prompt-layers.ts` | 张半山身份 + 场景 prompt |
| 主流程编排 | `consult/orchestrator/orchestrator.service.ts` | 4 路由 + 两段式漏斗 + ReAct 循环 |
| 角色调度 | `consult/orchestrator/zhangbanshan-scheduler.service.ts` | 角色切换 |
| 安全检测 | `consult/safety/high-risk-detector.service.ts` | 4 级风险 |
| 危机关键词 | `consult/safety/crisis-keywords.ts` | 关键词库 |
| 用户记忆 | `consult/memory/user-memory.service.ts` | 记忆读写（4 JSON 字段：profile/state/preferences/history） |
| 记忆提取 | `consult/memory/memory-extractor.service.ts` | 从对话提取记忆（7 类正则规则匹配） |

---

### 2.2 命运K线入口

#### 2.2.1 前端链路

```
KlineIntroPage（用户输入出生信息 + 选择关注领域）
  → ResultPage（K线图 + 摘要）
    → TidePage（三 Tab：K线摘要 / 状态雷达 / 相位空间）
      → PaywallOverlay（K线解锁 3 积分 / 状态雷达 3 积分 / 相位空间免费）
```

#### 2.2.2 后端 API

```typescript
// POST /api/v1/kline-tide/analyze
// Request
{
  birthInfo: {
    date: string;                // YYYY-MM-DD
    time: string;                // HH:mm
    gender: 'male' | 'female';
  };
  focusArea?: ('career' | 'wealth' | 'relationship')[];
  routeType: 'zhangsheng';      // ⚠️ P1-7 修复：必须为 zhangsheng，不能写死 ziping
}

// Response
{
  data: {
    klineData: {
      summary: string;           // K线摘要
      trend: 'rising' | 'stable' | 'declining' | 'volatile';
      phases: Array<{
        period: string;          // 时间段
        score: number;           // 0-100
        description: string;
      }>;
    };
    tideData: {
      radar: {                   // 状态雷达（3 积分解锁）
        dimensions: Array<{
          name: string;
          value: number;
        }>;
      } | null;                  // null = 未解锁
      phase: {                   // 相位空间（免费引流）
        current: string;
        description: string;
        nextShift: string;
      };
    };
    unlockStatus: {
      kline: 'locked' | 'unlocked';
      tideRadar: 'locked' | 'unlocked';
      tidePhase: 'unlocked';    // 始终免费
    };
    shareCard: {                 // P1-8 分享卡片
      imageUrl: string;
      shareText: string;
    } | null;
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.2.3 K线解锁接口（P1-9）

```typescript
// POST /api/v1/kline-tide/unlock
// Request
{
  module: 'kline' | 'tide_radar';
  paymentMethod: 'points' | 'membership';
}

// Response
{
  data: {
    unlocked: boolean;
    pointsConsumed: number;      // kline=3, tide_radar=3
    content: ...;                // 解锁后的完整内容
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.2.4 P1-7 修复说明

**当前问题**：`KlineIntroPage.tsx` 提交时 `route_type` 写死为 `ziping`（紫平），但 K线分析应使用 `zhangsheng`（张生）路径。

**修复位置**：`apps/AWKN-LABlife/app/src/pages/KlineIntroPage.tsx`

```typescript
// 修复前
const routeType = 'ziping';  // ❌ 写死

// 修复后
const routeType = 'zhangsheng';  // ✅ K线分析使用 zhangsheng 路径
```

**影响**：后端 `KlineTideController` 根据 `routeType` 分发到不同分析引擎，写错会导致结果页数据不匹配。

#### 2.2.5 后端核心路径

| 模块 | 文件 | 职责 |
|------|------|------|
| K线控制器 | `kline-tide/kline-tide.controller.ts` | API 入口 |
| K线服务 | `kline-tide/kline-tide.service.ts` | K线计算 + 潮汐分析 |
| 潮汐推理 | `kline-tide/tide-inference.service.ts` | 状态雷达 + 相位空间 |
| Paywall | `app/src/components/tide/PaywallOverlay.tsx` | 前端付费墙 |

---

### 2.3 取名入口

#### 2.3.1 前端链路

**当前（两条路径不一致）**：
```
路径 A：FrontdeskChat mode="naming" → QumingAgentService
路径 B：BrandStrategy → RenameComparison → NamingPDFExport
```

**P1-10/P1-11 修复后（统一路径）**：
```
FrontdeskChat mode="naming"（唯一入口）
  → 全程对话化（不跳页，P1-11）
    → 品牌策略 → 改名对比（对话内展开）
      → PDF 导出确认（P1-12）
```

#### 2.3.2 后端 API

```typescript
// POST /api/v1/quming/analyze
// Request
{
  type: 'naming' | 'renaming';  // 新取名 / 改名
  birthInfo: {
    date: string;
    time: string;
    gender: 'male' | 'female';
  };
  preferences?: {
    style?: 'traditional' | 'modern' | 'literary';
    elements?: string[];         // 五行偏好
    surname: string;
  };
  conversationId?: string;      // 对话化（P1-11）
}

// Response
{
  data: {
    names: Array<{
      name: string;
      score: number;             // 综合评分
      analysis: {
        wuxing: string;          // 五行分析
        meaning: string;         // 寓意
        compatibility: string;   // 与出生信息匹配度
      };
    }>;
    brandStrategy?: {            // 品牌策略（对话内展开）
      positioning: string;
      differentiation: string;
    };
    conversationId: string;      // 对话 ID
    pdfExportAvailable: boolean; // PDF 导出可用
    unlockStatus: {
      naming: 'locked' | 'unlocked';
      pdfExport: 'locked' | 'unlocked';
    };
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.3.3 取名解锁接口

```typescript
// POST /api/v1/quming/unlock
// Request
{
  module: 'naming' | 'pdf_export';
  paymentMethod: 'points' | 'membership';
}

// Response
{
  data: {
    unlocked: boolean;
    pointsConsumed: number;      // naming=1, pdf_export=0（会员免费）
    content: ...;
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.3.4 PDF 导出接口（P1-12）

```typescript
// GET /api/v1/quming/pdf/:reportId
// Response: PDF binary (application/pdf)
// Headers: Content-Disposition: attachment; filename="naming-report.pdf"
```

#### 2.3.5 后端核心路径

| 模块 | 文件 | 职责 |
|------|------|------|
| 取名 Agent | `quming-agent/quming-agent.service.ts` | 取名主逻辑 |
| 取名计算 | `quming-agent/naming-calculator.ts` | 五行/笔画/评分 |
| 前端入口 | `app/src/components/frontdesk/FrontdeskChat.tsx` | 统一入口 |

---

### 2.4 会员/积分共享接口

#### 2.4.1 积分解锁模块映射

```typescript
// 解锁模块与积分消耗
const UNLOCK_MODULES = {
  breakthrough: { points: 2, label: '突破推演' },
  morning:      { points: 1, label: '晨间提醒' },
  kline:        { points: 3, label: 'K线解锁' },
  tide_radar:   { points: 3, label: '状态雷达' },
  tide_phase:   { points: 0, label: '相位空间' },  // 免费引流
  naming:       { points: 1, label: '取名解锁' },
  question:     { points: 1, label: '问事解锁' },
} as const;

// 积分双轨制：会员层级优先，积分兜底
// 会员 → 对应模块免费
// 非会员 → 扣积分
```

> ⚠️ **积分系统初始规则待确认**：上述积分数值（如 breakthrough=2、kline=3 等）为设计值，实际初始规则需在开发前与产品确认，包括：初始赠送积分数、每日签到积分、积分过期策略、各模块消耗是否与设计一致。

#### 2.4.2 会员服务接口

```typescript
// POST /api/v1/membership/check-access
// Request
{
  userId: string;
  module: keyof typeof UNLOCK_MODULES;
}

// Response
{
  data: {
    hasAccess: boolean;
    accessSource: 'membership' | 'points' | 'free';
    membershipTier: 'monthly' | 'annual' | 'single' | 'punch' | null;
    pointsRequired: number;
    pointsBalance: number;
  } | null,
  error: { code: string; message: string } | null
}
```

#### 2.4.3 支付接口

```typescript
// POST /api/v1/payment/create-session
// Request
{
  tier: 'monthly' | 'annual' | 'single' | 'punch';
  channel: 'stripe' | 'wechat' | 'alipay';
}

// Response
{
  data: {
    sessionId: string;
    paymentUrl: string;          // 跳转支付页
    amount: number;              // 金额（分）
    currency: 'cny';
  } | null,
  error: { code: string; message: string } | null
}
```

**支付路径**：`apps/AWKN-LABlife/app/src/api/payment.ts`（stripe/wechat/alipay 三通道）

> ⚠️ **支付通道接入状态待确认**：`.env.example` 中有 `STRIPE_SECRET_KEY` / `WECHAT_PAY_*` / `ALIPAY_*` 配置项，但实际接入状态需确认。开发前需验证各通道是否已完成商户认证、密钥配置和沙箱联调。

---

## 三、数据变更

### 3.1 新增模型

```prisma
// prisma/schema.prisma 新增

/// 问事对话记录（P1-4 追问用）
model ConsultConversation {
  id              String   @id @default(cuid())
  userId          String
  question        String
  routeType       String   @default("question")
  state           String   // 4 类 UserState（casual/genuine/repeating/validating）
  turnCount       Int      @default(0)
  lastReportJson  Json?    // 最近一次三套输出（zhangbanshan_output + fiveLayers + promptOutput）
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  turns           ConsultTurn[]
  
  @@index([userId, createdAt])
  @@map("ConsultConversation")
}

/// 对话轮次（P1-4 追问上下文）
model ConsultTurn {
  id              String   @id @default(cuid())
  conversationId  String
  turnIndex       Int
  question        String
  reportJson      Json     // 三套输出（zhangbanshan_output + fiveLayers + promptOutput）
  llmProvider     String?
  elapsedMs       Int?
  isDeepPush      Boolean  @default(false)
  createdAt       DateTime @default(now())

  conversation    ConsultConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@unique([conversationId, turnIndex])
  @@index([conversationId])
  @@map("ConsultTurn")
}

/// 积分消费记录
model PointsTransaction {
  id              String   @id @default(cuid())
  userId          String
  module          String   // breakthrough/morning/kline/tide_radar/tide_phase/naming/question/pdf_export
  pointsConsumed  Int
  paymentMethod   String   // points/membership/free
  referenceId     String?  // 关联的 conversationId 或 reportId
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([module])
  @@map("PointsTransaction")
}

/// K线分析记录
model KlineAnalysis {
  id              String   @id @default(cuid())
  userId          String
  birthDate       String
  birthTime       String
  gender          String
  routeType       String   @default("zhangsheng")
  klineResultJson Json
  tideResultJson  Json?
  shareCardUrl    String?  // P1-8 分享卡片
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@map("KlineAnalysis")
}

/// 取名报告
model NamingReport {
  id              String   @id @default(cuid())
  userId          String
  type            String   // naming/renaming
  surname         String
  namesJson       Json     // 取名结果数组
  brandStrategyJson Json?
  pdfUrl          String?  // P1-12 PDF 导出
  conversationId  String?  // P1-11 对话化
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@map("NamingReport")
}
```

### 3.2 迁移策略

| 阶段 | 动作 | 回滚 |
|------|------|------|
| 1 | `npx prisma migrate dev --name add-p1-revenue-tables`（开发） | 删除 migration 文件 |
| 2 | `npx prisma migrate deploy`（生产） | `npx prisma migrate resolve --rolled-back <name>` |
| 3 | 数据回填（可选：历史 ConsultPipeline → ConsultConversation） | 备份恢复 |

**回滚 SOP**：见 `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\rollback-sop.md`

### 3.3 会员档位数据

| 档位 | 价格 | 权益 |
|------|------|------|
| 月卡 | 99 元/月 | 全模块解锁 + 每日 1 次深推 |
| 年卡 | 699 元/年 | 全模块解锁 + 每日 3 次深推 + 优先排队 |
| 单次 | 199 元/次 | 1 次宗师深推 |
| 次卡 | 0.9 元/次 | 1 次基础问事 |

**会员服务实现**：`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/membership/membership.service.ts`

---

## 四、测试用例

### 4.1 问事主链路测试（P1-1 ~ P1-6）

| # | 测试用例 | 对应任务 | 预期 |
|---|---------|---------|------|
| T-Q1 | 4 路由 + 两段式漏斗 + ReAct 循环端到端跑通（career 类问题） | P1-1 | 三套输出完整返回，无报错 |
| T-Q2 | 4 路由 + 两段式漏斗 + ReAct 循环端到端跑通（wealth 类问题） | P1-1 | 三套输出完整返回 |
| T-Q3 | 4 路由 + 两段式漏斗 + ReAct 循环端到端跑通（relationship 类问题） | P1-1 | 三套输出完整返回 |
| T-Q4 | 5 层 zod 校验：缺 halfMountain 字段 | P1-2 | 校验失败 → 降级文案 |
| T-Q5 | 5 层 zod 校验：5 段齐全 | P1-2 | 校验通过 → 正常输出 |
| T-Q6 | 张半山身份 prompt 注入验证 | P1-3 | 输出含张半山特征（不直白、给一寸） |
| T-Q7 | 首次问事 → 追问 1 次 → 追问 2 次 → 追问 3 次 | P1-4 | 3 轮追问无错乱，上下文保持 |
| T-Q8 | 追问时 conversationId 一致性 | P1-4 | 同一对话 turnIndex 递增 |
| T-Q9 | 5 个典型场景人工对标 | P1-5 | CEO review 通过 |
| T-Q10 | 免费结果页付费升级入口可见 | P1-6 | upgradeHint.available = true |
| T-Q11 | 付费深推返回深推独有字段 | P1-6 | timeline + riskAssessment 存在 |
| T-Q12 | 高风险问题触发 lockdown | P1-1 | 不返回推演结果，返回安全提示 |

### 4.2 K线主链路测试（P1-7 ~ P1-9）

| # | 测试用例 | 对应任务 | 预期 |
|---|---------|---------|------|
| T-K1 | KlineIntroPage 提交 route_type 为 zhangsheng | P1-7 | 结果页正确展示 K线数据 |
| T-K2 | K线结果页展示 K线图 + 摘要 | P1-7 | klineData 非空 |
| T-K3 | 分享卡片生成 | P1-8 | shareCard.imageUrl 非空 |
| T-K4 | 分享卡片内容含 K线摘要 | P1-8 | shareCard.shareText 含关键信息 |
| T-K5 | K线 Paywall 触发（非会员） | P1-9 | unlockStatus.kline = 'locked' |
| T-K6 | K线解锁（3 积分） | P1-9 | 解锁成功 + pointsConsumed = 3 |
| T-K7 | 状态雷达解锁（3 积分） | P1-9 | 解锁成功 + tideData.radar 非空 |
| T-K8 | 相位空间免费 | P1-9 | unlockStatus.tidePhase = 'unlocked' |

### 4.3 取名主链路测试（P1-10 ~ P1-12）

| # | 测试用例 | 对应任务 | 预期 |
|---|---------|---------|------|
| T-N1 | 取名入口路径唯一（仅 FrontdeskChat mode="naming"） | P1-10 | 无 BrandStrategy 独立入口 |
| T-N2 | 取名全程对话化（无页面跳转） | P1-11 | conversationId 贯穿全程 |
| T-N3 | 取名对话中展开品牌策略 | P1-11 | brandStrategy 在对话内返回 |
| T-N4 | 取名对话中展开改名对比 | P1-11 | 对比结果在对话内返回 |
| T-N5 | PDF 导出可用 | P1-12 | GET /api/v1/quming/pdf/:id 返回 PDF |
| T-N6 | PDF 内容含取名结果 | P1-12 | PDF 可打开 + 含姓名 + 五行分析 |

### 4.4 转化漏斗验证

| 漏斗环节 | 指标 | 目标 | 验证方式 |
|---------|------|------|---------|
| 首页 → 问事入口 | 点击率 | ≥ 30% | 埋点 `question_entry_click` / `home_view` |
| 问事入口 → 完成推演 | 完成率 | ≥ 60% | 埋点 `consult_complete` / `question_entry_click` |
| 完成推演 → 追问 1 次 | 追问率 | ≥ 40% | 埋点 `followup_submit` / `consult_complete` |
| 追问 → 付费升级 | 转化率 | ≥ 5% | 埋点 `deep_push_payment` / `followup_submit` |
| 首页 → K线入口 | 点击率 | ≥ 25% | 埋点 `kline_entry_click` / `home_view` |
| K线结果 → 分享 | 分享率 | ≥ 10% | 埋点 `kline_share` / `kline_result_view` |

**埋点规范**：所有事件格式 `{ event: string, userId: string, timestamp: number, properties: Record<string, unknown> }`

### 4.5 端到端 e2e（Playwright）

```typescript
// e2e/revenue-pipeline.spec.ts

// 问事主链路
test('user submits question → receives 3-set output → followup → upgrade hint', async ({ page }) => {
  await page.goto('/consult');
  await page.fill('[data-testid="question-input"]', '明年该不该跳槽？');
  await page.click('[data-testid="submit-btn"]');
  await expect(page.locator('[data-testid="report-clauses"]')).toBeVisible();
  await expect(page.locator('[data-testid="report-halfMountain"]')).toBeVisible();
  await expect(page.locator('[data-testid="report-detail"]')).toBeVisible();
  await expect(page.locator('[data-testid="report-cost"]')).toBeVisible();
  await expect(page.locator('[data-testid="report-nextAction"]')).toBeVisible();
  // 追问
  await page.fill('[data-testid="followup-input"]', '那薪资方面呢？');
  await page.click('[data-testid="followup-submit"]');
  await expect(page.locator('[data-testid="report-clauses"]')).toBeVisible();
  // 付费升级提示
  await expect(page.locator('[data-testid="upgrade-hint"]')).toBeVisible();
});

// K线主链路
test('user submits K-line → sees result → share card available', async ({ page }) => {
  await page.goto('/kline');
  await page.fill('[data-testid="birth-date"]', '1990-01-15');
  await page.fill('[data-testid="birth-time"]', '14:30');
  await page.click('[data-testid="submit-btn"]');
  await expect(page.locator('[data-testid="kline-result"]')).toBeVisible();
  await expect(page.locator('[data-testid="share-btn"]')).toBeVisible();
});

// 取名主链路
test('user enters naming → full conversation → PDF export', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="naming-entry"]');
  await page.fill('[data-testid="naming-input"]', '想给男孩取名，姓李');
  await page.click('[data-testid="submit-btn"]');
  await expect(page.locator('[data-testid="naming-result"]')).toBeVisible();
  await expect(page.locator('[data-testid="pdf-export-btn"]')).toBeVisible();
});
```

---

## 五、部署说明

### 5.1 部署前置条件

| 条件 | 检查命令 | 预期 |
|------|---------|------|
| L2 P0 修管完成 | `curl http://8.148.245.29:3000/health` + Pipeline e2e 测试 | 4 路由 + 两段式漏斗 + ReAct 循环 e2e 无报错 |
| Prisma 迁移就绪 | `npx prisma migrate status` | 无 pending migration |
| Redis 可用 | `redis-cli ping` | PONG |
| 支付通道配置 | 检查 `STRIPE_SECRET_KEY` / `WECHAT_PAY_*` / `ALIPAY_*` 环境变量 | 非空 |

### 5.2 部署步骤

```bash
# 1. 拉取代码
cd /opt/awkn-life && git pull origin main

# 2. 安装依赖
npm ci

# 3. 数据库迁移
npx prisma migrate deploy

# 4. 构建
npm run build

# 5. 灰度开关设置（首次部署先关）
export USE_NEW_PIPELINE=false
export P1_REVENUE_ENABLED=false

# 6. 重载（不中断）
pm2 reload api-server

# 7. 健康检查
curl http://8.148.245.29:3000/health

# 8. 开启 P1 收入链路（确认健康后）
export P1_REVENUE_ENABLED=true
pm2 reload api-server
```

### 5.3 灰度开关

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `P1_REVENUE_ENABLED` | `false` | P1 收入链路总开关 |
| `P1_CONSULT_FOLLOWUP` | `false` | 问事追问功能 |
| `P1_DEEP_PUSH` | `false` | 付费深推功能 |
| `P1_KLINE_SHARE` | `false` | K线分享卡片 |
| `P1_NAMING_CONVERSATION` | `false` | 取名对话化 |
| `P1_PDF_EXPORT` | `false` | PDF 导出 |
| `USE_NEW_PIPELINE` | `false` | 4 路由 + 两段式漏斗 + ReAct 循环 Pipeline（L2） |
| `PIPELINE_TIMEOUT_MS` | `30000` | Pipeline 总超时 |

**灰度顺序**：
1. P1-7（K线 route_type 修复）→ 全量（零风险 bug fix）
2. P1-10（取名入口统一）→ 全量（零风险 bug fix）
3. P1-1 + P1-2 + P1-3（Pipeline + 格式 + 身份）→ 1% → 10% → 50% → 100%
4. P1-4（追问）→ 1% → 10% → 50% → 100%
5. P1-6 + P1-9（付费升级）→ 1% → 10% → 50% → 100%
6. P1-8（K线分享）→ 全量
7. P1-11 + P1-12（取名对话化 + PDF）→ 1% → 10% → 50% → 100%

每阶段 ≥ 24h 观察，监控 5xx 率 + 转化漏斗数据。

### 5.4 监控指标

| 指标 | 告警阈值 | 监控方式 |
|------|---------|---------|
| Pipeline e2e 失败率 | > 5% | PipelineModuleLog status=failed |
| 5 层输出缺失率 | > 1% | zod 校验失败计数 |
| 追问上下文丢失 | > 0.5% | conversationId 不一致计数 |
| 付费转化异常 | 低于基线 50% | deep_push_payment 事件计数 |
| K线 route_type 错误 | > 0 | routeType != 'zhangsheng' 计数 |
| PDF 导出失败率 | > 2% | PDF 生成错误计数 |
| LLM 全通道失败 | 7/7 | 降级文案触发计数 |

---

## 六、回滚方案

### 6.1 故障信号 → 降级动作

| 故障信号 | 阈值 | 降级动作 | 回滚开关 |
|---------|------|---------|---------|
| Pipeline e2e 失败率 | > 5% | 切回旧 Pipeline | `USE_NEW_PIPELINE=false` |
| 5 层输出缺失 | > 1% | 重试 + 降级文案 | `PIPELINE_FALLBACK_ENABLED=true` |
| 追问上下文丢失 | > 0.5% | 关闭追问功能 | `P1_CONSULT_FOLLOWUP=false` |
| 付费深推异常 | 任一支付失败 | 关闭深推 | `P1_DEEP_PUSH=false` |
| K线 route_type 错误 | > 0 | 回滚 K线代码 | `git revert` |
| 取名对话化异常 | > 2% | 回滚到旧路径 | `P1_NAMING_CONVERSATION=false` |
| PDF 导出失败 | > 5% | 关闭 PDF 导出 | `P1_PDF_EXPORT=false` |
| 整线收入异常 | 收入下降 > 30% | 全量回滚 P1 | `P1_REVENUE_ENABLED=false` |

### 6.2 按入口拆分的回滚 SOP

#### 问事回滚

```bash
# 1. 关闭追问 + 深推
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set P1_CONSULT_FOLLOWUP false && pm2 env set P1_DEEP_PUSH false'

# 2. 如需回滚 Pipeline
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set USE_NEW_PIPELINE false'

# 3. 重载
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 reload api-server'

# 4. 健康检查
curl http://8.148.245.29:3000/health

# 5. 监控 5 分钟，确认无 5xx
```

#### K线回滚

```bash
# 1. 关闭分享卡片
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set P1_KLINE_SHARE false'

# 2. 如需回滚 route_type 修复
git revert <commit-hash>  # 回滚 KlineIntroPage.tsx 的修改
pm2 reload api-server

# 3. 健康检查
curl http://8.148.245.29:3000/health
```

#### 取名回滚

```bash
# 1. 关闭对话化 + PDF
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set P1_NAMING_CONVERSATION false && pm2 env set P1_PDF_EXPORT false'

# 2. 重载
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 reload api-server'

# 3. 健康检查
curl http://8.148.245.29:3000/health
```

#### 全量回滚

```bash
# 1. 关闭 P1 收入链路总开关
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 env set P1_REVENUE_ENABLED false'

# 2. 回滚代码到 P1 之前
git revert <commit-hash-range>

# 3. 数据库回滚
npx prisma migrate resolve --rolled-back add-p1-revenue-tables

# 4. 重载
pm2 reload api-server

# 5. 健康检查 + 5 分钟监控
curl http://8.148.245.29:3000/health
```

---

## 七、RACI + 技术约束

### 7.1 RACI

| 任务 | R | A | C | I |
|------|---|---|---|---|
| P1-1 Pipeline 串联 | 天火 | CEO | 程序员 | 全部 |
| P1-2 5 层格式强制 | 天火 | CEO | 程序员 | 全部 |
| P1-3 身份 prompt 注入 | 程序员 | 天火 | 产品 Lead | 全部 |
| P1-4 追问不断链 | 前端 Lead | CEO | 天火 / 程序员 | 全部 |
| P1-5 质量基线 | 产品 Lead | CEO | 天火 | 全部 |
| P1-6 付费升级感 | 前端 Lead | CEO | 产品 Lead / 天火 | 全部 |
| P1-7 K线 route_type 修复 | 程序员 | 天火 | 前端 Lead | 全部 |
| P1-8 K线分享卡片 | 前端 Lead | CEO | 设计 Lead | 全部 |
| P1-9 K线付费升级感 | 前端 Lead | CEO | 天火 | 全部 |
| P1-10 取名入口统一 | 程序员 | 天火 | 前端 Lead | 全部 |
| P1-11 取名对话化 | 前端 Lead | CEO | 天火 / 程序员 | 全部 |
| P1-12 PDF 导出 | 程序员 | 天火 | 前端 Lead | 全部 |
| Prisma 迁移 | 后端 Lead | CEO | 天火 | 全部 |
| 灰度放量 | 后端 Lead | CEO | 前端 Lead | 全部 |
| 紧急回滚 | 后端 Lead | CEO | 天火 | 全部 |
| 转化漏斗埋点 | 前端 Lead | 产品 Lead | 天火 | 全部 |

### 7.2 技术约束

| 约束 | 值 |
|------|-----|
| Node.js | 20.x LTS |
| NestJS | 10.x |
| Prisma | 5.x |
| BullMQ | 5.x |
| TypeScript | 5.x strict |
| React | 18.x |
| Vite | 5.x |
| Tauri | 最新稳定版 |
| shadcn/ui + Tailwind | 3.x |
| Zustand | 4.x |
| 数据库 | PostgreSQL 16（生产）/ SQLite（开发） |
| Redis | 7.x（BullMQ 依赖） |
| API 错误格式 | `{ data: T \| null, error: { code, message } \| null }` |
| 验证 | zod |
| 日志 | Pino（结构化） |
| 测试 | jest + Playwright |
| 支付 | stripe + wechat + alipay 三通道 |
| LLM Provider | 7+ 通道 failover（doubao/moonshot/deepseek/minimax/sensenova/deepseek-direct/spark/openai），默认 deepseek-direct，辅助 sensenova |

### 7.3 P1 特有约束

| 约束 | 说明 |
|------|------|
| 追问轮次上限 | 单次对话最多 10 轮追问（防刷） |
| 付费深推冷却 | 同一对话 24h 内最多 1 次深推 |
| 积分扣减原子性 | 积分扣减 + 内容解锁必须在同一事务 |
| K线分享卡片缓存 | 分享卡片 URL 有效期 7 天 |
| PDF 导出限流 | 每用户每天最多 3 次 PDF 导出 |
| 降级文案 | 所有付费功能必须有降级文案（不接 LLM 时也能用） |

---

## 附录 A：关键文件路径

### 问事

- Pipeline 目录：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\`
- 安全模块：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\safety\`
- 记忆模块：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\memory\`
- 前端 ConsultPage：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\pages\ConsultPage.tsx`
- 前端 ResultPage：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\pages\ResultPage.tsx`

### K线

- 后端 K线：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\kline-tide\`
- 前端 KlineIntroPage：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\pages\KlineIntroPage.tsx`
- 前端 TidePage：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\pages\TidePage.tsx`
- 前端 Paywall：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\components\tide\PaywallOverlay.tsx`

### 取名

- 后端取名：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\quming-agent\`
- 前端入口：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\components\frontdesk\FrontdeskChat.tsx`

### 会员/支付

- 会员服务：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\membership\membership.service.ts`
- 支付 API：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\api\payment.ts`

### 共享

- Prisma schema：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\prisma\schema.prisma`
- 拍板文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 回滚 SOP：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\rollback-sop.md`
- 总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
- L2 Pipeline 交接：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`

---

*生成日期：2026-06-14*
*修订日期：2026-06-15（v2.0）*
*下次更新：P1-1 Pipeline 串联完成时*
