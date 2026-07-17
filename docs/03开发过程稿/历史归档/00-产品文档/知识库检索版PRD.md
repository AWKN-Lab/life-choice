# 人生决策宗师 完整知识库检索版 PRD

> **状态**: REFERENCE | **权威替代**: — | **最后核验**: 2026-06-05

---

## 1. 目标

在"稳定案例级 v1"基础上，新增正式检索证据层，让子平、六壬、取名、人生K线的结论都能追溯到算法证据、知识库片段和相似案例，减少LLM杜撰，提高复盘与调参效率。

### 1.1 核心问题

| 问题 | 现状 | 目标 |
|------|------|------|
| LLM杜撰 | 解读内容无法追溯来源 | 每条结论可追溯到sourceId |
| 调参困难 | 无法定位哪条知识影响了输出 | 检索日志可回溯 |
| 案例参考缺失 | LLM无法参考相似案例 | 相似案例自动召回 |
| 质量不可观测 | 无质量指标 | 质量看板实时监控 |

### 1.2 成功标准

- 每条核心结论至少1个 `sourceId`
- 子平/六壬 golden case 通过率 ≥ 85%
- 经典引用0杜撰，未检索到原文时只能写"按知识库释义"
- 用户可见结论保留"决策参考"边界，不输出绝对化承诺

---

## 2. 核心能力

### 2.1 资源索引建立

建立覆盖全命理体系的资源索引，每条知识片段生成唯一标识。

| 索引类别 | 内容 | 数量级 | 示例 |
|---------|------|--------|------|
| 命理法则 | 格局判断、用神取法、旺衰标准 | 200+ | "甲木生于寅月，得令为旺" |
| 经典摘录 | 《子平真诠》《滴天髓》《三命通会》等 | 500+ | "滴天髓云：甲木参天..." |
| 案例 | 历史案例、验证案例 | 300+ | "某男命甲日主寅月..." |
| 名人八字 | 历史人物八字格局 | 100+ | "苏轼：甲木日主..." |
| 六壬课体 | 课体分类、课体判断规则 | 64+ | "重审课：上克下..." |
| 神煞 | 天乙贵人、驿马、桃花等 | 50+ | "甲戊庚牛羊..." |
| 节气月将 | 节气与月将对照、真太阳时修正 | 24+ | "雨水后月将在亥" |
| 冲合刑害 | 地支冲合刑害关系 | 30+ | "寅申冲、巳酉丑三合" |

### 2.2 知识片段结构

每条知识片段包含以下字段：

```typescript
interface KnowledgeSnippet {
  sourceId: string;
  type: 'law' | 'classic' | 'case' | 'celebrity' | 'keti' | 'shensha' | 'jieqi' | 'chonghe';
  title: string;
  category: string;
  routeType: 'ziping' | 'liuren' | 'quming' | 'kline';
  keywords: string[];
  originalText?: string;
  paraphrase: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}
```

### 2.3 LLM Gateway检索注入

LLM Gateway根据算法证据包检索3-8条证据，注入prompt：

```typescript
interface EvidenceInjection {
  algorithmTags: string[];
  retrievedSnippets: KnowledgeSnippet[];
  caseRefs: CaseReference[];
}

class LLMGatewayWithEvidence {
  async generateWithEvidence(
    prompt: string,
    algorithmResult: AlgorithmResult
  ): Promise<LLMResponse> {
    const tags = this.extractAlgorithmTags(algorithmResult);
    const snippets = this.knowledgeIndex.search(tags, { limit: 8 });
    const cases = this.caseLibrary.findSimilar(algorithmResult, { limit: 3 });

    const enrichedPrompt = this.buildPromptWithEvidence(
      prompt,
      snippets,
      cases
    );

    return this.generate(enrichedPrompt);
  }
}
```

**关键约束**：LLM只能引用检索到的 `sourceId`，不得凭空编造来源。

### 2.4 相似案例召回

按以下维度召回相似案例，作为表达和判断参考：

| 召回维度 | 八字 | 六壬 |
|---------|------|------|
| 主维度 | 格局 + 日主 + 月令 | 课体 + 三传 |
| 辅维度 | 大运 + 问题类型 | 问题类型 + 神煞 |
| 召回数 | 3-5个 | 3-5个 |

### 2.5 质量看板

| 指标 | 计算方式 | 告警阈值 |
|------|---------|---------|
| LLM成功率 | 成功调用/总调用 | < 95% |
| 重试率 | 重试次数/总调用 | > 10% |
| JSON失败率 | 解析失败/总返回 | > 5% |
| sourceId覆盖率 | 有sourceId结论/总结论 | < 80% |
| fallback率 | 模板兜底/总调用 | > 5% |
| 用户反馈 | 负面反馈/总反馈 | > 20% |

---

## 3. 数据接口

### 3.1 EvidenceSnippet

```typescript
interface EvidenceSnippet {
  sourceId: string;
  type: 'law' | 'classic' | 'case' | 'celebrity' | 'keti' | 'shensha' | 'jieqi' | 'chonghe';
  title: string;
  text: string;
  paraphrase: string;
  tags: string[];
  routeType: 'ziping' | 'liuren' | 'quming' | 'kline';
  confidence: number;
}
```

### 3.2 RetrievedEvidence

```typescript
interface RetrievedEvidence {
  query: string;
  algorithmTags: string[];
  snippets: EvidenceSnippet[];
  caseRefs: CaseReference[];
}
```

### 3.3 LlmQualityTrace

```typescript
interface LlmQualityTrace {
  recordId: string;
  provider: string;
  model: string;
  schemaValid: boolean;
  qualityScore: number;
  sourceCoverage: number;
  retryCount: number;
  fallbackReason?: string;
}
```

### 3.4 CaseReference

```typescript
interface CaseReference {
  caseId: string;
  similarity: number;
  matchDimensions: string[];
  outcome: string;
}
```

---

## 4. 实施阶段

### 阶段1：离线整理知识库

| 任务 | 产出 | 验收标准 |
|------|------|---------|
| 整理八字知识库JSON | 11个JSON文件 | 每条有sourceId |
| 整理六壬知识库JSON | 11个JSON文件 | 每条有sourceId |
| 生成可读JSON索引 | 统一索引文件 | 支持关键词检索 |

**当前状态**：`knowledge-base/bazi/` 和 `knowledge-base/liuren/` 已有基础JSON数据，需补充sourceId和结构化字段。

### 阶段2：接入关键词检索

| 任务 | 产出 | 验收标准 |
|------|------|---------|
| 实现关键词检索服务 | KnowledgeIndexService | 按tags检索返回3-8条 |
| 不先上向量库 | — | 保证可控可解释 |
| 检索性能优化 | 缓存机制 | P99 < 50ms |

**设计决策**：先关键词检索，不先上向量库，保证可控可解释。

### 阶段3：接入Prompt

| 任务 | 产出 | 验收标准 |
|------|------|---------|
| Ziping Agent接入检索 | ziping-agent.service.ts | prompt包含检索证据 |
| Liuren Agent接入检索 | liuren-agent.service.ts | prompt包含检索证据 |
| sourceId强制校验 | 校验中间件 | LLM只能引用检索到的sourceId |

```typescript
function buildPromptWithEvidence(
  basePrompt: string,
  evidence: RetrievedEvidence
): string {
  const evidenceBlock = evidence.snippets
    .map((s, i) => `[${s.sourceId}] ${s.title}: ${s.paraphrase}`)
    .join('\n');

  const caseBlock = evidence.caseRefs
    .map((c, i) => `案例${c.caseId}(相似度${c.similarity}): ${c.outcome}`)
    .join('\n');

  return `${basePrompt}

## 可引用的证据来源（只能引用以下sourceId）
${evidenceBlock}

## 相似案例参考
${caseBlock}

## 输出约束
- 每条核心结论必须标注sourceId
- 不得引用未列出的sourceId
- 未检索到原文时只能写"按知识库释义"`;
}
```

### 阶段4：案例召回

| 任务 | 产出 | 验收标准 |
|------|------|---------|
| 建立案例库索引 | case-library.service.ts | 支持多维度召回 |
| Golden case自动评测 | eval-golden.cjs | 通过率≥85% |
| 相似度算法调优 | — | 召回准确率≥80% |

**当前状态**：`shared/case-library/cases.json` 已有基础案例数据，`evals/golden-cases.json` 已有golden case。

### 阶段5：质量日志

| 任务 | 产出 | 验收标准 |
|------|------|---------|
| LLM调用日志增强 | LlmQualityTrace记录 | 每次调用有trace |
| 后台质量看板 | admin页面 | 实时展示6项指标 |
| 用户反馈聚合 | 反馈收集接口 | 负面反馈可追溯 |

---

## 5. 验收标准

### 5.1 功能验收

| # | 验收项 | 标准 | 优先级 |
|---|--------|------|--------|
| 1 | sourceId覆盖 | 每条核心结论至少1个sourceId | P0 |
| 2 | Golden case通过率 | 子平/六壬 ≥ 85% | P0 |
| 3 | 经典引用0杜撰 | 未检索到原文时只能写"按知识库释义" | P0 |
| 4 | 决策参考边界 | 不输出绝对化承诺 | P0 |
| 5 | 检索性能 | P99 < 50ms | P1 |
| 6 | 质量看板 | 6项指标实时展示 | P1 |

### 5.2 质量验收

| # | 验收项 | 标准 |
|---|--------|------|
| 1 | LLM成功率 | ≥ 95% |
| 2 | sourceId覆盖率 | ≥ 80% |
| 3 | fallback率 | ≤ 5% |
| 4 | JSON解析失败率 | ≤ 5% |

---

## 6. 风险与约束

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 知识库整理工作量大 | 阶段1延期 | 优先整理高频法则，分批上线 |
| 关键词检索召回率不足 | 证据覆盖不够 | 后续可升级为向量检索 |
| LLM忽略sourceId约束 | 杜撰来源 | prompt强制 + 输出校验 |
| Golden case标准不统一 | 评测不可靠 | 建立标注规范，多人审核 |

---

## 7. 版本信息

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-05-15 | 从 `docs/完整知识库检索版PRD.md` 提取归档 |

---

*源文件：AWKN-LABlife/docs/完整知识库检索版PRD.md*
