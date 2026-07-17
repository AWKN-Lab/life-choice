# 工程交接文档：P0 装甲就位

> **版本**：v1.0 | **日期**：2026-06-27
> **上游 PRD**：
> - [PRD-00 主文档](../../01产品定位与PRD/产品定位/PRD-人生决策宗师-模块化架构-v0.2-批判性重写.md)
> - [PRD-00A RuleMatcher Lite](../../01产品定位与PRD/产品定位/PRD-00A-RuleMatcher-Lite.md)
> - [PRD-00B EvidenceComposer Lite](../../01产品定位与PRD/产品定位/PRD-00B-EvidenceComposer-Lite.md)
> - [PRD-00C Prompt 证据包改造](../../01产品定位与PRD/产品定位/PRD-00C-Prompt-Evidence-Package-改造.md)
> **代码事实验证**：bazi-calculator-wrapper.ts / prompt-layers.ts / mvp0-runner.ts / zhangbanshan-scheduler.service.ts
> **状态**：待审查

---

## 1. 当前代码现状（基于事实，非假设）

### 1.1 八字引擎现状

**文件**：`src/calc-engine/bazi-calculator-wrapper.ts` L38-156

| 维度 | 现状 | 离目标差距 |
|------|------|-----------|
| 排盘字段 | `BaziFullResult` 15+ 字段段（四柱/十神/五行/大运/流年/神煞/纳音/空亡/胎元/命宫/身宫/藏干十神/十二长生/刑冲合害/自坐/按柱神煞） | 无差距，字段完整 |
| 十神 | 4 个独立字段 `yearShishen/monthShishen/dayShishen/hourShishen`（不是数组） | 无差距 |
| 大运 | `daYun: Array<{ index, gan, zhi, full, startAge, endAge }>` | 无差距 |
| 流年 | `liuNian: Array<{ year, ganZhi, shishen }>` + `liuNianDetail`（含 he/chong/hai/xing/yongJi/score/theme） | 无差距 |
| 刑冲合害 | `xingChongHeHai: { he, chong, hai, xing }` 各为 `Array<{ pillars, relation }>` **已结构化** | 无差距，RuleMatcher 直接读取 |
| 神煞 | `shenSha: Record<string, string[]>` + `shenShaByPillar` | 无差距 |
| 藏干十神 | `zangganShishen: { year, month, day, hour }` 各为 `Array<{ gan, shishen }>` | 无差距 |
| 性别 | `BaziFullResult` 无 `gender` 字段（性别在输入 `BaziInput` 里） | RuleMatcher 如需性别，从 userContext 传入 |

**结论**：八字引擎完全成熟，RuleMatcher 不需要重新计算任何排盘字段。

### 1.2 张半山调度器现状

**文件**：`src/consult/orchestrator/zhangbanshan-scheduler.service.ts`

| 维度 | 现状 | 离目标差距 |
|------|------|-----------|
| AgentType 枚举 | L11: `'liuren' | 'qimen' | 'ziping' | 'ziwei' | 'liuyao' | 'quming' | 'meihua'`（7 种） | 无差距，已预留多 Agent |
| 调度决策 | L24-40: `SchedulingDecision` 含 `primaryAgent` + `secondaryAgent` | 无差距，已是多 Agent 调度 |
| 仲裁 | L68-75: `ArbitrationResult` 含 `consistency` + `trustedAgent` + `agentConfidences` | 无差距，已有冲突仲裁 |
| 输出 | L42-66: `ZhangbanshanOutput` 含 `primary_agent` + `agent_consistency` + `arbitration_note` | 无差距 |

**结论**：张半山已是调度器架构，不是单体算法。P0 不需要改调度器。

### 1.3 Prompt 层现状

**文件**：`src/consult/orchestrator/prompt-layers.ts`

| 维度 | 现状 | 离目标差距 |
|------|------|-----------|
| 架构 | 5 层：Identity / Capability / Context / Dynamic / Confirmation | 无差距 |
| 入口 | `buildSystemPromptFromLayers(input: BuildSystemPromptInput)` L337-374 | 需新增 `evidencePackage?` 字段 |
| 排盘注入点 | Layer 4 `buildDynamicLayer` L355-361，通过 `agentSummary` 注入 | evidencePackage 应在此层追加 |
| 14 段骨架 | Layer 2 `buildCapabilityLayer` 已包含 | 无差距 |
| 完整性约束 | Layer 2 已含强制 14 段完整性约束 | 无差距 |

**结论**：prompt 层结构完善，只需在 `buildDynamicLayer` 追加 evidencePackage 段。

### 1.4 Golden Case 现状

**文件**：`src/consult/__tests__/golden/golden-cases.json`

| 维度 | 现状 | 离目标差距 |
|------|------|-----------|
| 总数 | `totalCases: 20`（gc-001 ~ gc-020） | 无差距 |
| 覆盖模块 | 姻缘（gc-001~012）、财运（gc-013/014）、健康（gc-015/016）、子女（gc-017/018）、合作（gc-019/020） | 无差距 |
| 多轮 case | gc-012 含 `multiTurn: true` + `rounds[]` + `partnerBirthInfo` | 无差距 |
| 验证工具 | `mvp0-runner.ts` 支持 partnerBirthInfo + 互冲分析 | 无差距 |

**结论**：Golden case 覆盖完整，可直接用于 T5 回归。

### 1.5 缺口总结

| 缺口 | 严重度 | P0 任务 |
|------|--------|---------|
| **RuleMatcher 不存在** | 高 | T1 |
| **EvidenceComposer 不存在** | 高 | T2 |
| **prompt-layers 无 evidencePackage 注入** | 高 | T3 |
| **AgentRun 无记录** | 中 | T4（先 JSON log） |
| **姻缘 case 未回归** | 高 | T5 |

---

## 2. 工程任务包

### 2.1 T1：RuleMatcher Lite（无依赖，最先做）

**目标**：输入 `BaziFullResult` → 输出 `matchedRules[]`

#### 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/consult/orchestrator/rule-matcher/rule-matcher.types.ts` | 新建 | 类型定义 |
| `src/consult/orchestrator/rule-matcher/rule-matcher.service.ts` | 新建 | 主入口 |
| `src/consult/orchestrator/rule-matcher/rules/chonghe.rules.ts` | 新建 | R001-R006 冲合刑害 |
| `src/consult/orchestrator/rule-matcher/rules/shishen.rules.ts` | 新建 | R007-R011 十神格局 |
| `src/consult/orchestrator/rule-matcher/rules/dayun.rules.ts` | 新建 | R012-R015 大运流年 |
| `src/consult/orchestrator/rule-matcher/rules/risk.rules.ts` | 新建 | R016-R020 风险决策 |
| `src/consult/orchestrator/rule-matcher/__tests__/rule-matcher.spec.ts` | 新建 | 单元测试 |
| `src/consult/orchestrator/rule-matcher/__tests__/fixtures/gc-001-chart-snapshot.json` | 新建 | gc-001 排盘快照 |
| `src/consult/orchestrator/rule-matcher/__tests__/fixtures/gc-012-chart-snapshot.json` | 新建 | gc-012 排盘快照 |

#### 接口定义

```typescript
// rule-matcher.types.ts
import { BaziFullResult } from '../../../calc-engine/bazi-calculator-wrapper';

export interface RuleMatcherInput {
  chartSnapshot: {
    male: BaziFullResult;
    female?: BaziFullResult;  // 姻缘场景必填
  };
  questionType: 'marriage_decision' | 'career_decision' | 'wealth_decision' | 'health_decision';
  userContext: {
    background: string;
    concerns: string[];
  };
}

export interface MatchedRule {
  ruleId: string;           // e.g. "R001"
  ruleName: string;         // e.g. "夫妻宫冲"
  severity: 'high' | 'medium' | 'low';
  evidence: string;         // e.g. "男方日支子 ↔ 女方日支午，子午相冲"
  pillar?: string;          // e.g. "日柱"
  source: 'bazi' | 'user_context' | 'cross_ref';
}

export interface RuleMatcherOutput {
  matchedRules: MatchedRule[];
  summary: string;
}
```

#### 第一轮 8 条核心规则

| ID | 规则名 | 检测逻辑 | 数据来源 |
|----|--------|----------|----------|
| R001 | 夫妻宫冲 | 双方 `dayPillar[1]` 交叉对比 | 非 xingChongHeHai，需手动对比 |
| R002 | 子午冲 | 读 `xingChongHeHai.chong`，匹配含"子""午"的 relation | `xingChongHeHai.chong` |
| R003 | 卯酉冲 | 读 `xingChongHeHai.chong`，匹配含"卯""酉"的 relation | `xingChongHeHai.chong` |
| R007 | 伤官见官 | 四柱十神含伤官 + `daYun`/`liuNian` 见正官 | `yearShishen` 等 + `daYun` + `liuNian` |
| R008 | 财星引动 | `daYun` + `liuNian` 引动日主财星 | `daYun` + `liuNian` + 四柱十神 |
| R012 | 大运引动夫妻宫 | `daYun[].zhi` + `dayPillar[1]` 相冲/相合 | `daYun` + `dayPillar` |
| R019 | 价值观冲突 | 双方 `dayPillar[0]` 五行相克 | `dayPillar[0]` + `WUXING_TIANGAN` 映射 |
| R020 | 决策方式冲突 | 男方官杀旺 vs 女方伤官旺 | 双方四柱十神对比 |

#### 地支相冲对照表

```typescript
const CHONG_PAIRS: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};
```

#### 验收标准

- [ ] gc-001 命中 >=3 条规则
- [ ] gc-012 命中 >=5 条规则
- [ ] 每条 evidence 必须包含具体柱位、地支/十神、规则名
- [ ] 单命输入（无 female）不报错，只跑单命适用规则
- [ ] `rule-matcher.spec.ts` 8 条规则各至少 1 个正向 case
- [ ] `tsc --noEmit` 零错误
- [ ] 不接 LLM、不接数据库

#### 回滚方式

RuleMatcher 是全新模块，不修改任何现有文件。回滚 = 删除 `rule-matcher/` 目录。

---

### 2.2 T2：EvidenceComposer Lite（依赖 T1）

**目标**：把 chartSnapshot + matchedRules + userContext 打包成 evidencePackage

#### 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/consult/orchestrator/evidence-composer/evidence-composer.types.ts` | 新建 | 类型定义 |
| `src/consult/orchestrator/evidence-composer/evidence-composer.service.ts` | 新建 | 主入口 |
| `src/consult/orchestrator/evidence-composer/knowledge-retriever/rule-knowledge-bindings.json` | 新建 | L2 规则绑定配置 |
| `src/consult/orchestrator/evidence-composer/knowledge-retriever/knowledge-retriever.service.ts` | 新建 | L2 检索 |
| `src/consult/orchestrator/evidence-composer/__tests__/evidence-composer.spec.ts` | 新建 | 单元测试 |
| `src/consult/orchestrator/evidence-composer/__tests__/fixtures/sample-evidence-package.json` | 新建 | 样例 |

#### 接口定义

```typescript
// evidence-composer.types.ts
import { BaziFullResult } from '../../../calc-engine/bazi-calculator-wrapper';
import { MatchedRule } from '../rule-matcher/rule-matcher.types';

export interface EvidenceComposerInput {
  chartSnapshot: {
    male: BaziFullResult;
    female?: BaziFullResult;
  };
  matchedRules: MatchedRule[];
  userContext: {
    background: string;
    concerns: string[];
  };
}

export interface KnowledgeFragment {
  ruleId: string;
  fragments: Array<{
    source: string;      // 书名/文件名
    filePath: string;    // knowledge/ 下的路径
    fragment: string;    // 片段内容
    status: 'confirmed' | 'placeholder' | 'disabled';
  }>;
}

export interface RuleBasedScore {
  evidenceCompleteness: number;   // 0-1，资料完整度 + 规则命中覆盖度
  decisionConfidence: number;     // 0-1，当前能否下判断的置信度
  riskLevel: 'low' | 'medium' | 'high';
  decisionBias: 'proceed' | 'observe' | 'stop' | 'defer';
}

export interface EvidencePackage {
  chartSnapshot: {
    male: BaziFullResult;
    female?: BaziFullResult;
  };
  matchedRules: {
    high: MatchedRule[];
    medium: MatchedRule[];
    low: MatchedRule[];
  };
  knowledgeFragments: KnowledgeFragment[];
  userContext: {
    background: string;
    concerns: string[];
  };
  ruleBasedScore: RuleBasedScore;
  meta: {
    versions: {
      prompt: string;
      rules: string;
      knowledge: string;
    };
    createdAt: string;
  };
}
```

#### L2 知识检索策略

- **P0 只做 L2**（规则绑定片段），不做 L1（全量文件索引）、不做 L3（向量检索）
- 每条规则预挂 1-3 个知识片段引用
- fragment 分三种状态：
  - `confirmed`：可被 LLM 引用
  - `placeholder`：只用于内部定位，**不可引用**
  - `disabled`：暂不使用

#### 验收标准

- [ ] 输入 gc-001 → 输出 evidencePackage 包含 3 类证据（排盘/规则/用户描述）
- [ ] evidencePackage.chartSnapshot 来自 calc-engine（非 LLM 生成）
- [ ] evidencePackage.matchedRules 来自 RuleMatcher（非 LLM 识别）
- [ ] evidencePackage.ruleBasedScore 包含 4 个字段（evidenceCompleteness/decisionConfidence/riskLevel/decisionBias）
- [ ] evidencePackage.meta.versions 包含 prompt/rules/knowledge 版本号
- [ ] L2 绑定的 filePath 全部指向真实存在的文件
- [ ] `evidence-composer.spec.ts` 全量通过
- [ ] `tsc --noEmit` 零错误

#### 回滚方式

EvidenceComposer 是全新模块，不修改任何现有文件。回滚 = 删除 `evidence-composer/` 目录。

---

### 2.3 T3：Prompt 证据包改造（依赖 T2）

**目标**：在 `buildDynamicLayer` 追加 evidencePackage 段

#### 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/consult/orchestrator/prompt-layers.ts` | **修改** | 新增 evidencePackage 注入 |
| `src/consult/orchestrator/__tests__/prompt-layers.spec.ts` | 修改 | 新增证据包测试 |

#### 改动点（精确到行）

**改动 1**：`BuildSystemPromptInput` 接口新增字段

```typescript
export interface BuildSystemPromptInput {
  // ... 现有字段保持不变 ...
  /** v2: 结构化证据包 */
  evidencePackage?: EvidencePackage;
}
```

**改动 2**：`DynamicLayerInput` 接口新增字段

```typescript
export interface DynamicLayerInput {
  // ... 现有字段保持不变 ...
  /** v2 新增：证据包 */
  evidencePackage?: EvidencePackage;
}
```

**改动 3**：`buildDynamicLayer` 函数新增 evidencePackage 分支

在现有 `agentSummary` 之后、`secondarySection` 之前，追加 `formatEvidencePackage()` 输出。

**改动 4**：`buildSystemPromptFromLayers` L355-361 传递 evidencePackage

```typescript
const layer4 = buildDynamicLayer({
  question: input.question,
  agentName: input.agentName,
  agentSummary: input.agentSummary,
  secondarySection: input.secondarySection,
  precedentUnit: input.precedentUnit,
  evidencePackage: input.evidencePackage,  // 新增
});
```

**改动 5**：新增 `formatEvidencePackage(pkg: EvidencePackage): string` 函数

输出格式：
```
【命中规则】（来自规则引擎，你不需要重新识别）
[高] 夫妻宫子午冲：男方日柱壬子 ↔ 女方日柱丙午，子午相冲
[中] 大运引动夫妻宫：男方当前大运戊辰，辰子合水

【知识片段】（来自知识库检索，可引用）
《滴天髓阐微·六亲论》：子午冲者，水火不交...

【用户现实描述】
背景：价值观冲突、言语带刺
担忧：父母边界、共同负债

【规则化评估】
证据完整度：0.7
决策置信度：0.62
风险等级：high
决策偏置：observe
```

#### 向后兼容

`evidencePackage` 为可选字段。当不存在时，`buildDynamicLayer` 走旧路径，`evidenceSection` 为空字符串，行为不变。

#### 验收标准

- [ ] 输入 evidencePackage → prompt 含"命中规则""知识片段""用户现实描述""规则化评估"4 段
- [ ] 输入空 evidencePackage → 走旧路径，prompt 行为不变
- [ ] 14 段骨架不变
- [ ] `prompt-layers.spec.ts` 新增证据包测试 + 旧路径回归全量通过
- [ ] `tsc --noEmit` 零错误

#### 回滚方式

`evidencePackage` 是可选字段。回滚 = 删除新增字段和 `formatEvidencePackage` 函数，恢复 `buildDynamicLayer` 原签名。旧路径不受影响。

---

### 2.4 T4：AgentRun JSON Log（无依赖，可与 T1 并行）

**目标**：先做 JSON log，不做 Prisma migration

#### 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/consult/orchestrator/agent-run/agent-run-logger.ts` | 新建 | JSON 文件日志 |
| `src/consult/orchestrator/agent-run/agent-run.types.ts` | 新建 | 类型定义 |

#### 接口定义

```typescript
export interface AgentRunLog {
  recordId: string;
  agentName: string;
  inputJson: unknown;
  matchedRules?: unknown[];
  outputJson: unknown;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  latencyMs: number;
  modelName?: string;
  promptVersion?: string;
  ruleVersion?: string;
  knowledgeVersion?: string;
  inputHash?: string;
  outputHash?: string;
  followUpId?: string;
  createdAt: string;
}
```

#### 存储方式

写入 `logs/agent-runs/` 目录，按日期分文件：`logs/agent-runs/2026-06-27.jsonl`

#### 验收标准

- [ ] 每次 RuleMatcher/EvidenceComposer/LLM 调用后写入一条 AgentRunLog
- [ ] JSONL 格式，每行一条 JSON
- [ ] 不做 Prisma migration
- [ ] `tsc --noEmit` 零错误

#### 回滚方式

删除 `agent-run/` 目录 + `logs/agent-runs/` 目录。

---

### 2.5 T5：姻缘 Golden Case 回归（依赖 T1+T2+T3）

**目标**：3-5 条姻缘 case 跑通新链路

#### 文件清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src/consult/__tests__/golden/p0-armor-regression.spec.ts` | 新建 | 回归测试 |

#### 回归 case

| Case ID | 场景 | 预期命中规则数 |
|---------|------|---------------|
| gc-001 | 姻缘首问 | >=3 |
| gc-012 | 合婚多轮 | >=5 |
| gc-002 | 姻缘追问 | >=3 |
| gc-003 | 姻缘止损 | >=3 |
| gc-004 | 姻缘观察 | >=3 |

#### 验收标准

- [ ] 5 条 case 全部跑通（14 段骨架完整）
- [ ] LLM 输出无"推算八字""我推算出"
- [ ] LLM 输出含"根据排盘结果""命中规则"
- [ ] 主矛盾来自 matchedRules（非 LLM 自行识别）
- [ ] placeholder 知识片段不进入 LLM 正文
- [ ] 旧路径仍可回退（无 evidencePackage 时行为不变）

#### 回滚方式

删除 `p0-armor-regression.spec.ts`。旧链路不受影响。

---

## 3. 执行顺序与闸门

```
T1 RuleMatcher ──→ 闸门1（汇报+确认）──→ T2 EvidenceComposer ──→ 闸门2 ──→ T3 Prompt改造 ──→ 闸门3 ──→ T5 回归
                                                                                                            ↑
T4 AgentRun Log ──────────────────────────────────────────────────────────────────────────────────────┘（并行）
```

### 闸门规则

| 闸门 | 触发条件 | 停顿动作 |
|------|----------|----------|
| 闸门1 | T1 完成 | 汇报：文件列表 + 8 条规则完成情况 + 测试结果 + tsc 结果。**不继续 T2** |
| 闸门2 | T2 完成 | 汇报：文件列表 + evidencePackage 结构 + L2 绑定数量 + 测试结果。**不继续 T3** |
| 闸门3 | T3 完成 | 汇报：改动行数 + 新 prompt 样例 + 旧路径回归结果。**不继续 T5** |
| 终验 | T5 完成 | 汇报：5 条 case 回归结果 + 完整链路验证 |

---

## 4. 禁令清单

- ❌ 不做梅花/六壬/奇门/太乙 Agent
- ❌ 不做向量库（L3）
- ❌ 不做 L1 全量文件索引
- ❌ 不做 Prisma migration
- ❌ 不改 14 段骨架
- ❌ 不清理 Git dangling 资产
- ❌ 不改 `buildIdentityLayer` / `buildCapabilityLayer` / `buildContextLayer` / `buildConfirmationLayer`
- ❌ 不新建 `BaziChart` 接口（直接用 `BaziFullResult`）
- ❌ 不重新计算 `xingChongHeHai`（直接读取）
- ❌ placeholder 知识片段不得进入 LLM 正文

---

## 5. 风险与回滚

### 5.1 风险清单

| 风险 | 严重度 | 缓解措施 |
|------|--------|----------|
| T3 改动 prompt-layers 影响现有链路 | 高 | evidencePackage 是可选字段，旧路径完全兼容 |
| T1 规则命中数不足 | 中 | 先跑 gc-001/gc-012，不足则补规则 |
| T2 L2 绑定的 filePath 不存在 | 中 | 绑定前用 Glob 验证文件存在 |
| T4 JSON log 文件膨胀 | 低 | 按日期分文件，定期清理 |

### 5.2 整体回滚方案

| 步骤 | 回滚动作 |
|------|----------|
| T1 回滚 | 删除 `rule-matcher/` 目录 |
| T2 回滚 | 删除 `evidence-composer/` 目录 |
| T3 回滚 | 删除 `evidencePackage` 字段和 `formatEvidencePackage` 函数 |
| T4 回滚 | 删除 `agent-run/` 目录 |
| T5 回滚 | 删除 `p0-armor-regression.spec.ts` |

**所有回滚都不影响现有生产链路**，因为 T1/T2/T4 是全新模块，T3 是可选字段。

---

## 6. 需要用户授权/确认的关键决策点

### 决策 1：T1 第一轮 8 条规则是否足够？

**当前方案**：R001/R002/R003/R007/R008/R012/R019/R020

**替代方案**：可以增减规则，但建议第一轮不超过 10 条。

**默认**：按当前 8 条执行。

### 决策 2：T4 AgentRun 用 JSON log 还是 Prisma？

**当前方案**：JSON log（避免 migration 风险）

**替代方案**：直接做 Prisma migration（更规范但有风险）

**默认**：JSON log。等链路稳定后再迁移到 Prisma。

### 决策 3：T5 回归用哪 5 条 case？

**当前方案**：gc-001/gc-012/gc-002/gc-003/gc-004

**替代方案**：可以换其他姻缘 case

**默认**：按当前 5 条执行。

### 决策 4：是否在 T3 后立即接入 orchestrator 主链路？

**当前方案**：T3 只改 prompt-layers，不接入 orchestrator。T5 用 mvp0-runner 跑回归。

**替代方案**：T3 后直接改 orchestrator.service.ts，让真实用户首问走新链路。

**默认**：不接入主链路。等 T5 回归通过后，再单独做接入。

---

## 7. 完成定义（DoD）

- [ ] T1: RuleMatcher 8 条规则，gc-001 命中 >=3，gc-012 命中 >=5
- [ ] T2: EvidenceComposer 产出 evidencePackage，含 4 类证据 + ruleBasedScore
- [ ] T3: prompt-layers 注入 evidencePackage，旧路径兼容
- [ ] T4: AgentRun JSON log 记录每次调用
- [ ] T5: 5 条姻缘 case 回归通过，14 段骨架完整
- [ ] 全程 `tsc --noEmit` 零错误
- [ ] 全程不违反禁令清单
