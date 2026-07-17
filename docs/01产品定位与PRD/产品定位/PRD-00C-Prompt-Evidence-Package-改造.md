# PRD-00C：Prompt 证据包改造 — LLM 输入从裸八字到结构化证据

> **主 PRD**：PRD-00 人生决策宗师装甲就位 v0.2
> **优先级**：P0（依赖 PRD-00B）
> **定位**：改造 `prompt-layers.ts`，让 LLM 只吃 evidencePackage，不再裸排盘/自行识别规则/凭空引古籍
> **不做**：新增 prompt 约束、改变 14 段骨架、改 LLM 模型

---

## 1. 目标

**让 LLM 从"算命先生"变成"证据翻译官"。**

当前 prompt：LLM 收到裸八字 + 裸问题，自己排盘、自己识别规则、自己引古籍 → 不可控。

改造后 prompt：LLM 收到结构化 evidencePackage，只负责融合证据 + 叙事翻译 + 决策建议。

---

## 2. 改造对比

### 改造前（当前真实状态）

prompt-layers.ts 是 5 层架构：
- Layer 1 Identity：张半山人格定义（`buildIdentityLayer`）
- Layer 2 Capability：场景+工具+14段骨架（`buildCapabilityLayer`）
- Layer 3 Context：记忆+情绪（`buildContextLayer`）
- Layer 4 Dynamic：问题+算法结果（`buildDynamicLayer`）← **evidencePackage 注入点**
- Layer 5 Confirmation：代价确认环（`buildConfirmationLayer`）

当前 `buildDynamicLayer` 收到 `agentSummary`（mvp0-runner.ts L285-314 构建），已包含排盘结果（四柱+十神+五行+大运+流年+刑冲合害+神煞+空亡），但**不包含 matchedRules 和 knowledgeFragments**。

**问题**：LLM 在"自己识别规则"（排盘结果有了，但规则命中没有）。

### 改造后（目标）

在 `buildDynamicLayer` 的 `agentSummary` 之后，新增 `matchedRules` 和 `knowledgeFragments` 两段。**不推翻重写，在现有基础上增强。**

```
【系统已为你完成八字排盘，请基于以下排盘事实进行解读，不要再自己排盘】
（现有 agentSummary 内容保持不变）

【命中规则】（新增，来自 RuleMatcher，你不需要重新识别）
1. [高] 夫妻宫子午冲：男方日柱壬子 ↔ 女方日柱丙午，子午相冲
2. [高] 伤官见官：女方日主丙火，时干甲木伤官，大运见官星
3. [中] 大运引动夫妻宫：男方当前大运戊辰，辰子合水，子午冲加剧

【知识片段】（新增，来自 KnowledgeRetriever L2，只引用 status=confirmed 的）
（待 KnowledgeRetriever L2 接入，placeholder 不得进入正文）

【用户现实描述】
背景：价值观冲突、言语带刺、决策方式不合
担忧：父母边界、共同负债

请基于以上证据，按 14 段骨架输出。
```

---

## 3. 改造范围

**改 `prompt-layers.ts` 的两个位置**：
1. `BuildSystemPromptInput` 接口新增 `evidencePackage?` 字段
2. `buildDynamicLayer` 函数新增 evidencePackage 分支（在现有 agentSummary 之后追加 matchedRules + knowledgeFragments）

**不改** `buildIdentityLayer`、`buildCapabilityLayer`、`buildContextLayer`、`buildConfirmationLayer`。

### 3.1 输入变更

`BuildSystemPromptInput` 新增字段：

```typescript
export interface BuildSystemPromptInput {
  // ... 现有字段保持不变（scenarioName, primaryAgent, question, agentSummary 等）...

  /** v2: 结构化证据包。如果存在，在 agentSummary 之后追加 matchedRules + knowledgeFragments。 */
  evidencePackage?: EvidencePackage;
}
```

`DynamicLayerInput` 新增字段：

```typescript
export interface DynamicLayerInput {
  question: string;
  agentName: string;
  agentSummary: string;          // 现有：排盘结果
  secondarySection: string;
  precedentUnit?: PrecedentUnit;
  /** v2 新增：证据包（matchedRules + knowledgeFragments） */
  evidencePackage?: EvidencePackage;
}
```

### 3.2 逻辑变更

```typescript
export function buildDynamicLayer(input: DynamicLayerInput): string {
  // 现有逻辑保持不变（precedentSection 等）

  // v2 新增：evidencePackage 证据段
  let evidenceSection = '';
  if (input.evidencePackage) {
    evidenceSection = formatEvidencePackage(input.evidencePackage);
  }

  return `---
现在，你需要基于以下算法分析结果，按三段式格式输出你的判断：

算法分析结果由${input.agentName}提供。
用户的问题是：「${input.question}」

算法核心结论：${input.agentSummary}
${evidenceSection}
${input.secondarySection}${precedentSection}

请输出（严格按以上格式，不要输出其他内容）。`;
}

function formatEvidencePackage(pkg: EvidencePackage): string {
  const { matchedRules, knowledgeFragments, userContext, ruleBasedScore } = pkg;
  let sections = '';

  // 命中规则
  if (matchedRules.high.length > 0 || matchedRules.medium.length > 0) {
    sections += '\n\n【命中规则】（来自规则引擎，你不需要重新识别）\n';
    for (const r of matchedRules.high) {
      sections += `[高] ${r.ruleName}：${r.evidence}\n`;
    }
    for (const r of matchedRules.medium) {
      sections += `[中] ${r.ruleName}：${r.evidence}\n`;
    }
  }

  // 知识片段（只输出 status=confirmed 的）
  const confirmedFrags = knowledgeFragments
    .flatMap(kf => kf.fragments)
    .filter(f => f.status === 'confirmed');
  if (confirmedFrags.length > 0) {
    sections += '\n【知识片段】（来自知识库检索，可引用）\n';
    for (const f of confirmedFrags) {
      sections += `《${f.source}》：${f.fragment}\n`;
    }
  }

  // 用户现实描述
  if (userContext.background || userContext.concerns.length > 0) {
    sections += '\n【用户现实描述】\n';
    if (userContext.background) sections += `背景：${userContext.background}\n`;
    if (userContext.concerns.length > 0) sections += `担忧：${userContext.concerns.join('、')}\n`;
  }

  // 规则化评估
  sections += `\n【规则化评估】\n证据完整度：${ruleBasedScore.evidenceCompleteness}\n决策置信度：${ruleBasedScore.decisionConfidence}\n风险等级：${ruleBasedScore.riskLevel}\n决策偏置：${ruleBasedScore.decisionBias}\n`;

  return sections;
}
```

### 3.3 向后兼容

`evidencePackage` 为可选字段。当不存在时，`buildDynamicLayer` 走旧路径，`evidenceSection` 为空字符串，行为不变。

```typescript
// buildSystemPromptFromLayers 调用时：
const layer4 = buildDynamicLayer({
  question: input.question,
  agentName: input.agentName,
  agentSummary: input.agentSummary,
  secondarySection: input.secondarySection,
  precedentUnit: input.precedentUnit,
  evidencePackage: input.evidencePackage, // 可选，不存在时走旧路径
});
```

---

## 4. 禁止项强化

在 `buildCapabilityLayer` 末尾追加以下硬约束（在现有的 14 段约束之后）：

```
【证据驱动约束】（v2 新增，P0 装甲就位）
1. 禁止输出"我推算出""我重新排出""根据我推算"等暗示 LLM 自行排盘的字样。改为"根据排盘结果"。
2. 禁止在没有 matchedRules 证据的情况下自行识别命理规则（如"子午冲""伤官见官"）。规则结论必须来自 matchedRules。
3. 禁止在没有 knowledgeFragments (status=confirmed) 的情况下引用古籍原文。placeholder 片段不得进入正文。
4. 每条核心结论必须能对应到 matchedRules 或 userContext 中的具体条目。
5. 分值段使用 ruleBasedScore 中的数据，不要自行评估分数。
6. 允许"命盘显示""排盘结果"等描述性用语（当它们引用的是 chartSnapshot 而非 LLM 自行推算时）。
```

---

## 5. 14 段骨架保持不变

14 段骨架已通过验证，结构不变。但各段的"证据来源"标注需要更新：

| 段 | 名称 | 证据来源 |
|----|------|----------|
| 1 | 事实层 | chartSnapshot（排盘结果） |
| 2 | 解读层 | matchedRules + LLM 三层翻译 |
| 3 | 推演层 | matchedRules + LLM 推演 |
| 4 | 建议层 | ruleBasedScore.decisionBias + LLM |
| 5 | 点睛层 | LLM 金句 |
| 6 | 我的判断 | LLM 综合判断 |
| 7 | 前提 | userContext |
| 8 | 代价 | matchedRules (severity=high) + LLM |
| 9 | 推理轨迹 | matchedRules 顺序 |
| 10 | 分值 | ruleBasedScore |
| 11 | 观察期 | matchedRules (R018 三个月验证) |
| 12 | 红线 | matchedRules (severity=high) + userContext.concerns |
| 13 | 三窗口 | matchedRules + LLM |
| 14 | 落一句最实在的话 | LLM |

---

## 6. 向后兼容

`evidencePackage` 字段为可选。当不存在时，`buildCapabilityLayer` 走旧路径，不影响现有功能。

```typescript
// 构造 prompt 时：
const evidencePackage = orchestrator.buildEvidencePackage(recordId);
const systemPrompt = buildSystemPromptFromLayers({
  ...ctx,
  evidencePackage, // 可选
});
```

---

## 7. 实现位置

```
src/consult/orchestrator/
├── prompt-layers.ts              # 修改：新增 buildEvidenceBasedPrompt
├── prompt-layers.types.ts        # 修改：NodeContext 新增 evidencePackage?
├── evidence-composer/            # PRD-00B 产出
└── __tests__/
    └── prompt/
        └── prompt-layers.spec.ts # 新增：证据包 prompt 测试
```

---

## 8. 验收标准

- [ ] 输入 evidencePackage → LLM 输出不包含"根据八字推算""我推算出""命盘显示"
- [ ] 输入 evidencePackage → LLM 输出包含"根据排盘结果""规则命中""用户描述"
- [ ] 输入空 evidencePackage → 走旧路径，向后兼容，行为不变
- [ ] 输入 evidencePackage 但 knowledgeFragments 为空 → LLM 不引用古籍原文
- [ ] 输入 evidencePackage → 每条核心结论可追溯到 matchedRules 或 userContext
- [ ] 现有 20 条 golden case 用旧路径运行，输出不变（回归验证）
- [ ] `prompt-layers.spec.ts` 全量通过（新增证据包测试 + 旧路径回归）
- [ ] `tsc --noEmit` 零错误