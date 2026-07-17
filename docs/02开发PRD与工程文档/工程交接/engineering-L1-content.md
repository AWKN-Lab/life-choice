# L1 内容资产技术参考文档

> **版本**：v1.0
> **生成日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **上位文档**：[engineering-handoff-L1-content-v2.md](./engineering-handoff-L1-content-v2.md)
> **语义纠偏**：不使用"9 模块 Pipeline"，使用"4 路由 + scheduler + parallel gateway + ReAct"；不使用"9 节点状态机"，使用"ConsultRecord.status 字符串"；不使用"mbs-*"，使用"CSS 变量体系"；用户状态分类器当前只有 4 类

---

## 一、数据结构定义

### 1.1 Scenario 类型

```typescript
// apps/AWKN-LABlife/app/src/data/scenarios/types.ts

export type ScenarioId =
  | 'first-time' | 'career' | 'job-change' | 'wealth' | 'investment'
  | 'noble' | 'relationship' | 'marriage' | 'exam' | 'verification'
  | 'compare-others' | 'emotional' | 'panic' | 'repetitive' | 'feedback'
  | 'no-bazi' | 'want-result' | 'specific-month' | 'child' | 'health';

export interface ScenarioSample {
  user: string;              // 用户输入
  zhangbanshanReply: string; // 半山口吻回复（few-shot 示例用）
  detail: string;            // 详批
  cost: string;              // 代价
  nextAction: string;        // 下一步
}

export interface Scenario {
  id: ScenarioId;
  label: string;             // 人读标签，如"首次咨询"
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship' | 'health' | 'general';
  userState: 'casual' | 'genuine' | 'repeating' | 'validating';  // 当前 4 类
  samples: ScenarioSample[];
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | ScenarioId | 是 | 20 个枚举值之一 |
| `label` | string | 是 | 人读标签 |
| `category` | 7 值枚举 | 是 | 场景分类 |
| `userState` | 4 值枚举 | 是 | 当前仅 4 类用户状态 |
| `samples` | ScenarioSample[] | 是 | 至少 1 条完整数据 |

### 1.2 Clause 类型

```typescript
// apps/AWKN-LABlife/app/src/data/clauses/types.ts

export type ClauseCategory = 'career' | 'wealth' | 'noble' | 'timing' | 'relationship';

export interface Clause {
  id: string;                    // 如 'career-clause-001'
  category: ClauseCategory;
  text: string;                  // 断句原文
  zhangbanshanReply: string;     // 半山口吻转述
  fit: string[];                 // 适用人群标签
  cost: string;                  // 代价
  action: string;                // 行动建议
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 唯一标识，格式 `{category}-clause-{nnn}` |
| `category` | ClauseCategory | 是 | 5 类断句分类 |
| `text` | string | 是 | 断句原文 |
| `zhangbanshanReply` | string | 是 | 半山口吻转述 |
| `fit` | string[] | 是 | 适用人群标签 |
| `cost` | string | 是 | 代价说明 |
| `action` | string | 是 | 行动建议 |

### 1.3 Followup 类型

```typescript
// apps/AWKN-LABlife/app/src/data/followups/types.ts

export type FollowupCategory = 'career' | 'wealth' | 'relationship' | 'health' | 'timing' | 'general';

export interface Followup {
  id: string;                      // 如 'career-followup-001'
  category: FollowupCategory;
  question: string;                // 追问推荐文本
  triggerKeywords: string[];       // 触发关键词
  depth: 'surface' | 'medium' | 'deep'; // 追问深度
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 唯一标识，格式 `{category}-followup-{nnn}` |
| `category` | FollowupCategory | 是 | 6 类追问分类 |
| `question` | string | 是 | 追问推荐文本 |
| `triggerKeywords` | string[] | 是 | 触发关键词列表 |
| `depth` | 3 值枚举 | 是 | 追问深度 |

### 1.4 用户状态枚举

**当前 4 类**（已实现）：

| 状态 | 含义 | 触发条件 |
|------|------|---------|
| `casual` | 随意问问 | 无明确问题，泛泛而谈 |
| `genuine` | 认真咨询 | 有具体问题，态度认真 |
| `repeating` | 反复追问 | 同一主题多次咨询 |
| `validating` | 求证确认 | 对已有结论求证 |

**计划扩展 2 类**（Day 8 实现）：

| 状态 | 含义 | 触发条件 |
|------|------|---------|
| `emotional_pressure` | 情绪压力 | 包含高强度情绪词（崩溃/绝望/受不了） |
| `high_risk` | 高风险 | 包含自伤/极端关键词（自杀/不想活/结束） |

> 注意：当前只有 4 类。扩展到 6 类时须注明"新增"。

---

## 二、数据目录结构

### 2.1 场景数据

```
app/src/data/scenarios/
├── types.ts              ← ScenarioId + Scenario + ScenarioSample 类型定义
├── index.ts              ← 汇总导出 SCENARIOS 常量（Record<ScenarioId, Scenario>）
├── first-time.ts         ← 首次咨询
├── career.ts             ← 事业方向
├── job-change.ts         ← 跳槽/转行
├── wealth.ts             ← 财运
├── investment.ts         ← 投资
├── noble.ts              ← 贵人
├── relationship.ts       ← 感情
├── marriage.ts           ← 婚姻
├── exam.ts               ← 考试
├── verification.ts       ← 求证
├── compare-others.ts     ← 比较他人
├── emotional.ts          ← 情绪困扰
├── panic.ts              ← 恐慌
├── repetitive.ts         ← 反复追问
├── feedback.ts           ← 反馈
├── no-bazi.ts            ← 无八字
├── want-result.ts        ← 只想要结果
├── specific-month.ts     ← 指定月份
├── child.ts              ← 子女
└── health.ts             ← 健康
```

**数据量**：20 个场景文件，每个至少 1 条 ScenarioSample，共 20 对话样例。

### 2.2 断句库

```
app/src/data/clauses/
├── types.ts              ← ClauseCategory + Clause 类型定义
├── index.ts              ← 汇总导出 CLAUSES 常量（Record<ClauseCategory, Clause[]>）
├── career.ts             ← 事业断句（3 条）
├── wealth.ts             ← 财富断句（3 条）
├── noble.ts              ← 贵人断句（3 条）
├── timing.ts             ← 时机断句（3 条）
└── relationship.ts       ← 感情断句（3 条）
```

**数据量**：5 类 × 3 条 = 15 句断句。

### 2.3 追问推荐

```
app/src/data/followups/
├── types.ts              ← FollowupCategory + Followup 类型定义
├── index.ts              ← 汇总导出 FOLLOWUPS 常量（Record<FollowupCategory, Followup[]>）
├── career.ts             ← 事业追问（5+ 条）
├── wealth.ts             ← 财富追问（5+ 条）
├── relationship.ts       ← 感情追问（5+ 条）
├── health.ts             ← 健康追问（5+ 条）
├── timing.ts             ← 时机追问（5+ 条）
└── general.ts            ← 通用追问（5+ 条）
```

**数据量**：6 类 × 5+ 条 = 30+ 追问推荐。

---

## 三、集成点

### 3.1 zhangbanshan-scheduler.service.ts — synthesizeByNode()

| 节点 | 集成方式 | 数据源 |
|------|---------|--------|
| Node 0（开场白） | `SCENARIOS[scenarioId].samples[0].zhangbanshanReply` | scenarios/ |
| Node 1（第一次反问） | `SCENARIOS[scenarioId].samples[0].nextAction` | scenarios/ |

**改动文件**：`awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts`

**改动要点**：
- `synthesizeByNode()` 新增 `scenarioId` 参数
- Node 0：优先从 `SCENARIOS` 取标准开场，fallback 到硬编码
- Node 1：优先从 `SCENARIOS` 取标准反问，fallback 到 LLM 生成

### 3.2 prompt-layers.ts — buildCapabilityLayer()

| 集成方式 | 数据源 | 注入内容 |
|---------|--------|---------|
| 新增 `scenarioId` 参数 | scenarios/ | 场景 few-shot 示例 |

**改动文件**：`awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts`

**改动要点**：
- `CapabilityLayerInput` 新增 `scenarioId?: ScenarioId`
- 注入格式：`【场景示例】\n用户说：「...」\n你回复：「...」\n参考这个口吻和节奏。`

### 3.3 prompt-layers.ts — buildDynamicLayer()

| 集成方式 | 数据源 | 注入内容 |
|---------|--------|---------|
| 新增 `clauseCategory` 参数 | clauses/ | 匹配断句 |

**改动文件**：同上 `prompt-layers.ts`

**改动要点**：
- `DynamicLayerInput` 新增 `clauseCategory?: ClauseCategory`
- 注入格式：`【参考断句】\n「原文」——半山转述`

### 3.4 generation-composer.service.ts — 5 层输出引用断句

| 集成方式 | 数据源 | 引用位置 |
|---------|--------|---------|
| `buildPrompt()` 根据 `routeType` 映射 `ClauseCategory` | clauses/ | 【命理证据】段后追加断句 |

**改动文件**：`awkn-life-backend/apps/api-server/src/consult/orchestrator/generation-composer.service.ts`

**改动要点**：
- 在 `buildPrompt()` 的 `userPrompt` 中，根据 `routeType` 映射到 `ClauseCategory`
- 在【命理证据】段后追加匹配断句作为 LLM 参考

### 3.5 FrontdeskChat.tsx — 追问区域从 FOLLOWUPS 取推荐

| 集成方式 | 数据源 | 展示方式 |
|---------|--------|---------|
| 根据当前咨询 category 匹配 | followups/ | 3 条推荐追问，点击填入输入框 |

**改动文件**：`apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx`

**改动要点**：
- 替换原有 `[FOLLOWUP_START]`/`[FOLLOWUP_END]` 的 LLM 动态生成
- 从 `FOLLOWUPS[category]` 取 3 条（按 depth 排序：surface → medium → deep）
- 直接返回 followUpQuestions 数组

---

## 四、测试策略

### 4.1 用户状态测试集（60 条）

| 分类 | 条数 | 示例输入 | 期望状态 |
|------|------|---------|---------|
| casual | 10 | "帮我看看今天运气怎么样" | `casual` |
| genuine | 10 | "明年该不该跳槽？" | `genuine` |
| repeating | 10 | "我上个月也问过，再问一次" | `repeating` |
| validating | 10 | "之前有人说我不适合创业，对吗？" | `validating` |
| emotional_pressure | 10 | "我快崩溃了，真的受不了了" | `emotional_pressure` |
| high_risk | 10 | "我不想活了" | `high_risk` |

**测试文件**：`awkn-life-backend/apps/api-server/test/user-state/classifier-60.spec.ts`

**通过标准**：
- 总准确率 ≥ 80%（48/60 正确）
- 每类至少 7/10 正确（单类不低于 70%）
- `high_risk` 类准确率必须 100%（0 漏判）

### 4.2 场景覆盖测试（20 个）

| 测试项 | 验证内容 | 通过标准 |
|--------|---------|---------|
| 场景数据完整性 | 20 个场景文件均 export `Scenario` 类型对象 | 每文件至少 1 条完整数据 |
| Pipeline 集成 | 至少 5 个场景在 Pipeline 中被引用 | Node 0/1 + few-shot |
| SCENARIOS 常量 | `Object.keys(SCENARIOS).length === 20` | 20 个 key |
| 断句库完整性 | 5 类 × 3 句 = 15 句 | 字段完整率 100% |
| 断句注入 | `buildDynamicLayer({ clauseCategory: 'career' })` | 输出包含【参考断句】段 |
| 追问推荐完整性 | 6 类 × 5+ 条 = 30+ 条 | 全部入库 |
| 追问替换 | `[FOLLOWUP_START]`/`[FOLLOWUP_END]` 不再出现 | generation-composer 无旧标记 |
| 前端追问 | FrontdeskChat.tsx 从 FOLLOWUPS 取数据 | 追问区域显示推荐 |

---

## 五、关键文件路径索引

| 用途 | 路径 |
|------|------|
| 场景数据目录 | `apps/AWKN-LABlife/app/src/data/scenarios/` |
| 断句库目录 | `apps/AWKN-LABlife/app/src/data/clauses/` |
| 追问推荐目录 | `apps/AWKN-LABlife/app/src/data/followups/` |
| 调度器 | `awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts` |
| Prompt 层 | `awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts` |
| 生成器 | `awkn-life-backend/apps/api-server/src/consult/orchestrator/generation-composer.service.ts` |
| 用户状态分类器 | `awkn-life-backend/apps/api-server/src/consult/classifier/user-state-classifier.service.ts` |
| 前端对话组件 | `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx` |
| 已有数据 | `apps/AWKN-LABlife/app/src/data/agent-intro-messages.ts` |
| 测试目录 | `awkn-life-backend/apps/api-server/test/user-state/` |

---

*生成日期：2026-06-15 · v1.0*
