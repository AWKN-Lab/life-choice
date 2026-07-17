# L1 内容线工程交接 — 天级执行手册 v2

> **版本**：v2.0
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)（矛盾处以口径源为准）
> **拍板依据**：`docs/dev/execution/00-decisions-confirmed.md` §一 D1 + §三 战略
> **优先级**：🟠 **P1**（依赖 L2 跑通，第 5-12 周启动）
> **工期**：10 天
> **目标读者**：程序员（实施 Lead）
> **依赖阻塞**：L2（必须先跑通 4 路由 + scheduler + parallel gateway + ReAct）
> **前置文档**：[engineering-handoff-L1-content.md](./engineering-handoff-L1-content.md)（v2.0，任务卡级）

---

## 〇、代码现状基线

| 维度 | 现状 |
|------|------|
| L1 内容资产完成度 | **15%** |
| `app/src/data/` 已有文件 | `agent-intro-messages.ts`、`script-style-guide.md`（仅 2 个） |
| `scenarios/` 目录 | **不存在** |
| `clauses/` 目录 | **不存在** |
| `followups/` 目录 | **不存在** |
| 追问推荐 | 依赖 LLM 动态生成（`generation-composer.service.ts` 的 `[FOLLOWUP_START]`/`[FOLLOWUP_END]` 标记） |
| 用户状态分类器 | 4 类（`casual`/`genuine`/`repeating`/`validating`） |
| 前端多轮对话 | `FrontdeskChat.tsx` 支持（含取名 `mode="naming"`） |
| 内容相关测试 | **0 个** |

---

## 一、语义纠偏（全文强制）

| 禁止使用 | 正确用法 |
|---------|---------|
| "9 模块 Pipeline" | **4 路由 + scheduler + parallel gateway + ReAct** |
| "6 类用户状态"（指现有） | **4 类用户状态**（扩展到 6 类时须注明"新增"） |
| "mbs-*" | **CSS 变量体系** |

---

## 二、10 天执行计划

### Day 1：场景数据结构 + 前 7 个场景文件

**做什么**
- 新建 `app/src/data/scenarios/` 目录
- 创建 `types.ts`（ScenarioId + Scenario 类型定义）
- 创建前 7 个场景文件

**改哪些文件**

| 操作 | 文件路径 |
|------|---------|
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/types.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/first-time.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/career.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/job-change.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/wealth.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/investment.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/noble.ts` |

**types.ts 结构**

```typescript
// apps/AWKN-LABlife/app/src/data/scenarios/types.ts

export type ScenarioId =
  | 'first-time' | 'career' | 'job-change' | 'wealth' | 'investment'
  | 'noble' | 'relationship' | 'marriage' | 'exam' | 'verification'
  | 'compare-others' | 'emotional' | 'panic' | 'repetitive' | 'feedback'
  | 'no-bazi' | 'want-result' | 'specific-month' | 'child' | 'health';

export interface ScenarioSample {
  user: string;            // 用户输入
  zhangbanshanReply: string; // 半山口吻回复（few-shot 示例用）
  detail: string;          // 详批
  cost: string;            // 代价
  nextAction: string;      // 下一步
}

export interface Scenario {
  id: ScenarioId;
  label: string;           // 人读标签，如"首次咨询"
  category: 'career' | 'wealth' | 'noble' | 'timing' | 'relationship' | 'health' | 'general';
  userState: 'casual' | 'genuine' | 'repeating' | 'validating';
  samples: ScenarioSample[];
}
```

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. 7 个场景文件均 export 一个 `Scenario` 类型对象
3. 每个 `samples` 数组至少 1 条完整数据（5 字段非空）

**回滚方案**
- 删除 `scenarios/` 目录即可，不影响任何已有代码

---

### Day 2：后 13 个场景文件 + index.ts 汇总

**做什么**
- 创建剩余 13 个场景文件
- 创建 `index.ts` 汇总导出 `SCENARIOS` 常量

**改哪些文件**

| 操作 | 文件路径 |
|------|---------|
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/relationship.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/marriage.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/exam.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/verification.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/compare-others.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/emotional.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/panic.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/repetitive.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/feedback.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/no-bazi.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/want-result.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/specific-month.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/child.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/health.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/scenarios/index.ts` |

**index.ts 结构**

```typescript
// apps/AWKN-LABlife/app/src/data/scenarios/index.ts

export type { ScenarioId, Scenario, ScenarioSample } from './types';
import { FIRST_TIME } from './first-time';
import { CAREER } from './career';
// ... 其余 18 个 import

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'first-time': FIRST_TIME,
  'career': CAREER,
  // ... 其余 18 条
} as const;
```

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. `Object.keys(SCENARIOS).length === 20`
3. 每个场景 `samples` 至少 1 条，5 字段非空

**回滚方案**
- 删除 `scenarios/` 目录即可

---

### Day 3：场景数据与 Pipeline 集成

**做什么**
- 与 `zhangbanshan-scheduler.service.ts` 的 `synthesizeByNode()` 集成：Node 0 开场白 + Node 1 第一次反问从 `SCENARIOS` 取标准回复
- 与 `prompt-layers.ts` 的 `buildCapabilityLayer()` 集成：注入当前场景的 `zhangbanshanReply` 作为 few-shot 示例

**改哪些文件**

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 修改 | `awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts` | `synthesizeByNode()` Node 0/1 引用 `SCENARIOS` |
| 修改 | `awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts` | `buildCapabilityLayer()` 新增 `scenarioId` 参数，注入 few-shot |

**zhangbanshan-scheduler.service.ts 改动要点**

```typescript
// Node 0: 开场白（脚本化）— 从 SCENARIOS 取标准开场
if (node === 0) {
  const scenario = SCENARIOS[scenarioId]; // 新增 scenarioId 参数
  const opening = scenario?.samples[0]?.zhangbanshanReply
    || `你问的是「${question}」，让我看看。`;
  return { output: opening, nextNode: 1 };
}

// Node 1: 第一次反问 — 从 SCENARIOS 取标准反问
if (node === 1) {
  const scenario = SCENARIOS[scenarioId];
  const standardQuestion = scenario?.samples[0]?.nextAction;
  // 优先用标准反问，fallback 到 LLM 生成
  if (standardQuestion) {
    return { output: standardQuestion, nextNode: 2, clarifyingQuestion: standardQuestion };
  }
  // ... 原有 LLM 逻辑保留
}
```

**prompt-layers.ts 改动要点**

```typescript
// CapabilityLayerInput 新增
scenarioId?: ScenarioId;

// buildCapabilityLayer 内新增 few-shot 注入
let fewShotInstruction = '';
if (input.scenarioId) {
  const scenario = SCENARIOS[input.scenarioId];
  if (scenario?.samples[0]) {
    fewShotInstruction = `\n【场景示例】\n用户说：「${scenario.samples[0].user}」\n你回复：「${scenario.samples[0].zhangbanshanReply}」\n参考这个口吻和节奏。`;
  }
}
```

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. 手动构造 `scenarioId='career'` 的 `synthesizeByNode(0, ...)` 调用，确认输出取自 `SCENARIOS['career'].samples[0].zhangbanshanReply`
3. `buildCapabilityLayer({ scenarioId: 'wealth', ... })` 输出包含 `【场景示例】` 段
4. 至少 5 个场景在 Pipeline 中被引用（Node 0 + Node 1 + prompt few-shot）

**回滚方案**
- `zhangbanshan-scheduler.service.ts`：Node 0/1 恢复硬编码字符串
- `prompt-layers.ts`：删除 `scenarioId` 参数和 few-shot 逻辑
- 两个文件改动均向后兼容（新参数 optional），回滚只需移除新分支

---

### Day 4：断句库数据结构 + 3 个分类文件

**做什么**
- 新建 `app/src/data/clauses/` 目录
- 创建 `types.ts`（ClauseCategory + Clause 接口）
- 创建 3 个分类文件（career/wealth/noble）

**改哪些文件**

| 操作 | 文件路径 |
|------|---------|
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/types.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/career.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/wealth.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/noble.ts` |

**types.ts 结构**

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

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. 3 个文件各 3 条，共 9 条，6 字段非空

**回滚方案**
- 删除 `clauses/` 目录即可

---

### Day 5：断句库剩余 2 分类 + index.ts + Pipeline 集成

**做什么**
- 创建 timing/relationship 分类文件（各 3 句）
- 创建 `index.ts` 汇总导出 `CLAUSES` 常量
- 与 `prompt-layers.ts` 的 `buildDynamicLayer()` 集成（注入匹配断句）
- 与 `generation-composer.service.ts` 集成（5 层输出中引用断句）

**改哪些文件**

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/timing.ts` | |
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/relationship.ts` | |
| 新建 | `apps/AWKN-LABlife/app/src/data/clauses/index.ts` | |
| 修改 | `awkn-life-backend/.../orchestrator/prompt-layers.ts` | `buildDynamicLayer()` 新增 `clauseCategory` 参数 |
| 修改 | `awkn-life-backend/.../orchestrator/generation-composer.service.ts` | `buildPrompt()` 引用断句 |

**prompt-layers.ts 集成要点**

```typescript
// DynamicLayerInput 新增
clauseCategory?: ClauseCategory;

// buildDynamicLayer 内新增断句注入
let clauseSection = '';
if (input.clauseCategory) {
  const matchedClauses = CLAUSES[input.clauseCategory] || [];
  if (matchedClauses.length > 0) {
    clauseSection = `\n【参考断句】\n${matchedClauses.map(c => `「${c.text}」——${c.zhangbanshanReply}`).join('\n')}`;
  }
}
```

**generation-composer.service.ts 集成要点**

- 在 `buildPrompt()` 的 `userPrompt` 中，根据 `routeType` 映射到 `ClauseCategory`
- 在【命理证据】段后追加匹配断句作为 LLM 参考

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. 5 类 × 3 句 = 15 句全部入库，字段完整率 100%
3. `buildDynamicLayer({ clauseCategory: 'career', ... })` 输出包含 `【参考断句】` 段
4. `generation-composer.service.ts` 的 `buildPrompt()` 输出包含断句引用

**回滚方案**
- `prompt-layers.ts`：删除 `clauseCategory` 参数和断句注入逻辑
- `generation-composer.service.ts`：删除断句引用逻辑
- `clauses/` 目录：删除即可

---

### Day 6：追问推荐数据结构 + 4 个分类文件

**做什么**
- 新建 `app/src/data/followups/` 目录
- 创建 `types.ts`（FollowupCategory + Followup 接口）
- 创建 4 个分类文件（career/wealth/relationship/health）

**改哪些文件**

| 操作 | 文件路径 |
|------|---------|
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/types.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/career.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/wealth.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/relationship.ts` |
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/health.ts` |

**types.ts 结构**

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

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. 4 个文件各 5+ 条，共 20+ 条，4 字段非空

**回滚方案**
- 删除 `followups/` 目录即可

---

### Day 7：追问推荐剩余 2 分类 + index.ts + 替换 LLM 动态生成

**做什么**
- 创建 timing/general 分类文件（各 5+ 条）
- 创建 `index.ts` 汇总导出 `FOLLOWUPS` 常量
- 替换 `generation-composer.service.ts` 中 `[FOLLOWUP_START]`/`[FOLLOWUP_END]` 的 LLM 动态生成
- 前端 `FrontdeskChat.tsx` 的追问区域从 `FOLLOWUPS` 数据取推荐

**改哪些文件**

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/timing.ts` | |
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/general.ts` | |
| 新建 | `apps/AWKN-LABlife/app/src/data/followups/index.ts` | |
| 修改 | `awkn-life-backend/.../orchestrator/generation-composer.service.ts` | 替换 `[FOLLOWUP_START]`/`[OLLOWUP_END]` 逻辑 |
| 修改 | `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx` | 追问区域从 FOLLOWUPS 取数据 |

**generation-composer.service.ts 改动要点**

```typescript
// 替换前：LLM 动态生成
// buildPrompt() 中 generateFollowUp 分支的 [FOLLOWUP_START]/[FOLLOWUP_END] 标记

// 替换后：从 FOLLOWUPS 数据取推荐
// 1. 根据 routeType 映射到 FollowupCategory
// 2. 从 FOLLOWUPS[category] 取 3 条（按 depth 排序：surface → medium → deep）
// 3. 直接返回 followUpQuestions 数组，不再让 LLM 生成
```

**FrontdeskChat.tsx 改动要点**

```typescript
// 追问推荐区域：从 FOLLOWUPS 取数据
// 根据当前咨询的 category 匹配 FOLLOWUPS
// 展示 3 条推荐追问，点击后填入输入框
```

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. 6 类 × 5+ 条 = 30+ 条全部入库
3. `generation-composer.service.ts` 的 `generate()` 方法不再包含 `[FOLLOWUP_START]`/`[FOLLOWUP_END]` prompt
4. `FrontdeskChat.tsx` 追问区域显示来自 `FOLLOWUPS` 的推荐

**回滚方案**
- `generation-composer.service.ts`：恢复 `[FOLLOWUP_START]`/`[FOLLOWUP_END]` prompt 逻辑
- `FrontdeskChat.tsx`：恢复原有追问区域逻辑
- `followups/` 目录：删除即可

---

### Day 8：用户状态分类器扩展到 6 类

**做什么**
- `user-state-classifier.service.ts` 新增 `emotional_pressure` / `high_risk` 2 类
- `prompt-layers.ts` 的 `buildCapabilityLayer()` 新增 2 类策略

**改哪些文件**

| 操作 | 文件路径 | 改动说明 |
|------|---------|---------|
| 修改 | `awkn-life-backend/.../classifier/user-state-classifier.service.ts` | UserState 类型扩展 + classify() 新增 2 类判定 |
| 修改 | `awkn-life-backend/.../orchestrator/prompt-layers.ts` | `stateStrategies` 新增 2 类 |

**user-state-classifier.service.ts 改动要点**

```typescript
// 类型扩展（新增 2 类，从 4 类扩展到 6 类）
export type UserState = 'casual' | 'genuine' | 'repeating' | 'validating'
  | 'emotional_pressure' | 'high_risk';

// classify() 新增判定（在 repeating/validating 判定之后、genuine 之前插入）
// emotional_pressure: 包含高强度情绪词（崩溃/绝望/活不下去/想死/受不了）
// high_risk: 包含自伤/极端关键词（自杀/不想活/结束/跳楼/割腕）
```

**prompt-layers.ts 改动要点**

```typescript
// stateStrategies 新增 2 类
emotional_pressure: '用户情绪压力很大，先稳住，不急着分析，让他说完，再慢慢看。',
high_risk: '⚠️ 用户可能处于高风险状态。不要做命理判断。先确认安全，建议寻求专业帮助。',
```

**怎么验证**
1. `npx tsc --noEmit` 无类型错误
2. `UserState` 类型包含 6 个值
3. `classify('user1', '我快崩溃了，真的受不了了')` → `emotional_pressure`
4. `classify('user1', '我不想活了')` → `high_risk`
5. `buildCapabilityLayer({ userState: 'high_risk', ... })` 输出包含安全提示

**回滚方案**
- `user-state-classifier.service.ts`：`UserState` 恢复为 4 类，删除新增判定分支
- `prompt-layers.ts`：删除 `emotional_pressure`/`high_risk` 策略
- 向后兼容：新增的 2 类是扩展，不影响原有 4 类逻辑

---

### Day 9：60 条测试集 + 分类准确率验证

**做什么**
- 创建 60 条测试集（6 类 × 10 条）
- 运行分类器，验证准确率 ≥ 80%（48/60 正确）

**改哪些文件**

| 操作 | 文件路径 |
|------|---------|
| 新建 | `awkn-life-backend/apps/api-server/test/user-state/classifier-60.spec.ts` |
| 新建 | `awkn-life-backend/apps/api-server/test/user-state/test-data.ts` |

**test-data.ts 结构**

```typescript
// 6 类 × 10 条 = 60 条
export const TEST_SET: Array<{ input: string; expected: UserState; label: string }> = [
  // casual × 10
  { input: '帮我看看今天运气怎么样', expected: 'casual', label: 'casual-001' },
  // ...
  // genuine × 10
  { input: '明年该不该跳槽？', expected: 'genuine', label: 'genuine-001' },
  // ...
  // repeating × 10
  { input: '我上个月也问过，再问一次', expected: 'repeating', label: 'repeating-001' },
  // ...
  // validating × 10
  { input: '之前有人说我不适合创业，对吗？', expected: 'validating', label: 'validating-001' },
  // ...
  // emotional_pressure × 10（新增）
  { input: '我快崩溃了，真的受不了了', expected: 'emotional_pressure', label: 'emotional_pressure-001' },
  // ...
  // high_risk × 10（新增）
  { input: '我不想活了', expected: 'high_risk', label: 'high_risk-001' },
  // ...
];
```

**怎么验证**
1. `npx jest --config jest.config.js test/user-state/classifier-60.spec.ts` 通过
2. 准确率 ≥ 80%（48/60 正确）
3. 每类至少 7/10 正确（单类不低于 70%）
4. `high_risk` 类准确率必须 100%（0 漏判）

**回滚方案**
- 删除测试文件即可，不影响生产代码

---

### Day 10：人读参考文档

**做什么**
- 产出 `docs/product/zhangbanshan-voice-guide.md`
- 20 对话样例的人读版 + 15 句断句 + 6 类用户状态分类规则
- 验证文档内容与代码数据一致

**改哪些文件**

| 操作 | 文件路径 |
|------|---------|
| 新建 | `docs/product/zhangbanshan-voice-guide.md` |

**文档大纲**

```markdown
# 张半山口吻指南（人读版）

## 一、20 对话样例总览
- 按场景分类，每个场景展示 1 条精选对话（用户输入 → 半山回复 → 代价 → 下一步）

## 二、15 句断句库
- 5 类断句（事业/财富/贵人/时机/感情），每类 3 句
- 含原文 + 半山转述 + 适用人群

## 三、6 类用户状态分类规则
- casual / genuine / repeating / validating（原有 4 类）
- emotional_pressure / high_risk（**新增 2 类**）
- 每类：含义 + 触发条件 + 张半山应对策略

## 四、张半山口吻三原则
1. 不直白，给一寸
2. 永远有代价
3. 下一步可执行

## 五、与 4 路由 + scheduler + parallel gateway + ReAct 的衔接
- 场景数据 → scheduler 调度
- 断句库 → prompt-layers 注入
- 追问推荐 → 替换 LLM 动态生成
- 用户状态 → 分类器策略

## 六、修订记录
- v1.0 (2026-06-15)：初版，对齐代码数据
```

**怎么验证**
1. 文档中 20 个场景 ID 与 `SCENARIOS` 的 key 一一对应
2. 15 句断句与 `CLAUSES` 数据一致
3. 6 类用户状态与 `UserState` 类型定义一致
4. 无"9 模块 Pipeline"或"mbs-*"等禁止用语

**回滚方案**
- 删除文档文件即可

---

## 三、验收总清单

| # | 验收项 | 标准 | Day |
|---|--------|------|-----|
| V1 | 20 个场景文件 | 全部有结构化数据，`Scenario` 类型完整 | 1-2 |
| V2 | 场景数据与 Pipeline 集成 | 至少 5 个场景在 Pipeline 中被引用（Node 0/1 + few-shot） | 3 |
| V3 | 15 句断句入库 | 5 类 × 3 句 = 15 句，字段完整率 100% | 4-5 |
| V4 | 断句与 Pipeline 集成 | `buildDynamicLayer()` + `generation-composer` 引用断句 | 5 |
| V5 | 30+ 追问推荐入库 | 6 类 × 5+ 条 = 30+ 条 | 6-7 |
| V6 | 替换 LLM 动态追问 | `[FOLLOWUP_START]`/`[FOLLOWUP_END]` 不再出现 | 7 |
| V7 | 前端追问区域 | `FrontdeskChat.tsx` 从 `FOLLOWUPS` 取数据 | 7 |
| V8 | 用户状态扩展到 6 类 | `UserState` 含 `emotional_pressure`/`high_risk` | 8 |
| V9 | 6 类分类准确率 | ≥ 80%（48/60），`high_risk` 零漏判 | 9 |
| V10 | 人读参考文档 | 内容与代码数据一致，无禁止用语 | 10 |

---

## 四、回滚总方案

| 回滚级别 | 操作 | 影响 |
|---------|------|------|
| **Day 1-2 回滚** | 删除 `app/src/data/scenarios/` 目录 | 0 影响（纯新增目录） |
| **Day 3 回滚** | `zhangbanshan-scheduler.service.ts` Node 0/1 恢复硬编码；`prompt-layers.ts` 删除 `scenarioId` 参数 | 向后兼容（新参数 optional） |
| **Day 4-5 回滚** | 删除 `app/src/data/clauses/` 目录；`prompt-layers.ts` 删除 `clauseCategory`；`generation-composer` 删除断句引用 | 向后兼容 |
| **Day 6-7 回滚** | 删除 `app/src/data/followups/` 目录；`generation-composer` 恢复 `[FOLLOWUP_START]`/`[FOLLOWUP_END]`；`FrontdeskChat` 恢复原有逻辑 | 需确认前端追问区域恢复 |
| **Day 8 回滚** | `UserState` 恢复 4 类；`prompt-layers.ts` 删除 2 类策略 | 向后兼容（扩展不影响原有） |
| **Day 9 回滚** | 删除测试文件 | 0 影响 |
| **Day 10 回滚** | 删除 `docs/product/zhangbanshan-voice-guide.md` | 0 影响 |
| **全量回滚** | `git revert` 到 Day 1 前 commit | 所有改动撤销 |

**全量回滚前置**：Day 1 开始前执行 `git add -A && git commit -m "WIP 备份: L1-content-v2 Day0 baseline"`

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
| 人读参考 | `docs/product/zhangbanshan-voice-guide.md` |
| 拍板文件 | `docs/dev/execution/00-decisions-confirmed.md` |
| 口径源 | `docs/engineering-handoffs/_ground-truth.md` |
| 前置文档 | `docs/engineering-handoffs/engineering-handoff-L1-content.md` |

---

## 六、技术约束

| 约束 | 值 |
|------|-----|
| 语言 | TypeScript 5.x strict |
| 数据格式 | TypeScript 文件（不入 JSON/YAML，便于 IDE 提示 + zod 校验） |
| 验证 | zod |
| 测试 | jest |
| 文件命名 | kebab-case |
| 字符集 | UTF-8 |
| 最小变更原则 | 不改 L2/L3 接口契约，仅提供数据 |
| 语义纠偏 | 不用"9 模块 Pipeline"、不用"6 类用户状态"（指现有）、不用"mbs-*" |

---

*生成日期：2026-06-15*
*版本：v2.0（天级执行手册，对齐代码探查结果 + 语义纠偏）*
*下次更新：Day 10 完成后*
