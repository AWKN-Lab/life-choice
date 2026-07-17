# PRD-00B：EvidenceComposer Lite — 结构化证据打包器

> **主 PRD**：PRD-00 人生决策宗师装甲就位 v0.2
> **优先级**：P0（依赖 PRD-00A）
> **定位**：把 chartSnapshot + matchedRules + userContext 合成 evidencePackage
> **不做**：全量 RAG、全知识库向量化、独立 score-engine

---

## 1. 目标

把三个来源的证据合并成一个 structured evidence package，作为 LLM 的唯一输入。

**一句话**：让 LLM 吃的是"证据包"，不是"裸八字"。

---

## 2. 证据来源

```
┌─────────────────┐
│  chartSnapshot  │ ← bazi-engine（确定性计算）
│  (排盘结果)      │
├─────────────────┤
│  matchedRules   │ ← RuleMatcher（规则命中）
│  (命中规则)      │
├─────────────────┤
│  userContext    │ ← 用户输入（现实描述）
│  (用户上下文)    │
├─────────────────┤
│  knowledgeFrags │ ← KnowledgeRetriever L2（规则绑定片段）
│  (知识片段)      │
└─────────────────┘
         ↓
  EvidenceComposer
         ↓
  evidencePackage (JSON)
         ↓
  prompt-layers.ts (LLM 输入)
```

---

## 3. KnowledgeRetriever 分层策略

**P0 只做 L2，不做 L1 和 L3。**

| 层 | 内容 | 实现方式 | 时机 |
|----|------|----------|------|
| L1 | 文件索引 + 标题/路径/关键词检索 | 扫描 `knowledge/` 目录 → 生成 JSON 索引 | **Spiral 2**（P0 不需要全量索引） |
| **L2** | 规则绑定知识片段 | 每条规则预挂 1-3 个可信片段（JSON 配置） | **P0** |
| L3 | embedding 向量检索 | 全量 knowledge/ → embedding → 向量库 | **Spiral 2** |

**为什么 L1 推迟**：`knowledge/` 目录有数千篇 MD，P0 阶段只需要为姻缘 20 条规则绑定片段，不需要全量扫描。等 L2 稳定后再做 L1 全量索引。

### L2 实现（规则绑定片段）

每条规则预绑 1-3 个知识片段引用：

```json
{
  "R001": {
    "ruleName": "夫妻宫子午冲",
    "knowledgeRefs": [
      {
        "source": "滴天髓阐微·六亲论",
        "filePath": "knowledge/eastern-metaphysics/八字命理/滴天髓/滴天髓阐微(六亲论).md",
        "section": "第三节",
        "fragment": "待人工确认后填入真实片段",
        "status": "placeholder"
      }
    ]
  }
}
```

**P0 阶段 `fragment` 可以是占位，但 `source` 和 `filePath` 必须真实。** 后续由人工确认片段内容后填入。

---

## 4. 输入 Schema

```typescript
interface EvidenceComposerInput {
  recordId: string;
  questionType: string;
  userQuestion: string;
  chartSnapshot: {
    male: BaziChart;
    female?: BaziChart;
  };
  matchedRules: MatchedRule[];  // 来自 RuleMatcher
  userContext: {
    background: string;
    concerns: string[];
  };
}
```

---

## 5. 输出 Schema（evidencePackage）

```typescript
interface EvidencePackage {
  /** 元信息 */
  meta: {
    recordId: string;
    questionType: string;
    generatedAt: string; // ISO timestamp
    versions: {
      prompt: string;      // prompt 版本号
      rules: string;       // 规则库版本号
      knowledge: string;   // 知识库版本号
    };
  };

  /** 用户问题 */
  userQuestion: string;

  /** 排盘快照 */
  chartSnapshot: {
    male: { bazi: string; wangshuai: string; dayun: string; liunian: string };
    female?: { bazi: string; wangshuai: string; dayun: string; liunian: string };
  };

  /** 命中规则 */
  matchedRules: {
    high: MatchedRule[];    // severity=high
    medium: MatchedRule[];  // severity=medium
    low: MatchedRule[];     // severity=low
  };

  /** 知识片段 */
  knowledgeFragments: {
    ruleId: string;
    fragments: KnowledgeFragment[];
  }[];

  /** 用户上下文 */
  userContext: {
    background: string;
    concerns: string[];
  };

  /** 规则化分值（P0 rule-based lite） */
  ruleBasedScore: {
    /** 资料完整度 + 规则命中覆盖度（0-1） */
    evidenceCompleteness: number;
    /** 当前能否下判断的置信度（0-1）。命中多不一定更准，冲突多可能更复杂。 */
    decisionConfidence: number;
    riskLevel: 'high' | 'medium' | 'low';
    decisionBias: 'continue' | 'stop' | 'observe' | 'proceed' | 'delay';
    relationshipScoreRange?: [number, number];
  };
}

interface KnowledgeFragment {
  source: string;       // 来源书名
  filePath: string;     // 文件路径
  fragment: string;     // 片段内容
  /** 三种状态：
   *  confirmed  — 可被 LLM 引用（人工确认过的真实片段）
   *  placeholder — 只用于内部定位，不可进入 LLM 正文
   *  disabled   — 暂不使用
   */
  status: 'confirmed' | 'placeholder' | 'disabled';
  relevance: number;    // 0-1
}
```

---

## 6. EvidenceComposer 核心逻辑

```typescript
class EvidenceComposerService {
  compose(input: EvidenceComposerInput): EvidencePackage {
    // 1. 按 severity 分组 matchedRules
    const grouped = this.groupBySeverity(input.matchedRules);

    // 2. 从 L2 配置中获取知识片段
    const knowledgeFrags = this.getKnowledgeFragments(input.matchedRules);

    // 3. 计算 rule-based score
    const score = this.calculateRuleBasedScore(input.matchedRules);

    // 4. 组装 evidencePackage
    return {
      meta: {
        recordId: input.recordId,
        questionType: input.questionType,
        generatedAt: new Date().toISOString(),
        versions: {
          prompt: 'v2.0',
          rules: 'v0.1',
          knowledge: 'l2-v0.1',
        },
      },
      userQuestion: input.userQuestion,
      chartSnapshot: this.formatChartSnapshot(input.chartSnapshot),
      matchedRules: grouped,
      knowledgeFragments: knowledgeFrags,
      userContext: input.userContext,
      ruleBasedScore: score,
    };
  }

  private calculateRuleBasedScore(rules: MatchedRule[]): RuleBasedScore {
    const highCount = rules.filter(r => r.severity === 'high').length;
    const mediumCount = rules.filter(r => r.severity === 'medium').length;

    // 资料完整度：命中规则覆盖了冲合/十神/大运/风险几个维度
    const categories = new Set(rules.map(r => r.category));
    const evidenceCompleteness = Math.min(categories.size / 4, 1.0); // 4 个维度

    // 决策置信度：规则多且一致 → 高；规则多但冲突（如既冲又合）→ 低
    const conflictCount = rules.filter(r => r.severity === 'high').length;
    const decisionConfidence = highCount >= 2 && conflictCount <= 2
      ? 0.7 + (mediumCount * 0.05)
      : 0.5 + (mediumCount * 0.03);

    const riskLevel = highCount >= 2 ? 'high' : highCount >= 1 ? 'medium' : 'low';
    const chongCount = rules.filter(r => r.category === 'chonghe').length;
    const shangGuanCount = rules.filter(r => r.ruleId === 'R007').length;
    const decisionBias = chongCount >= 2 ? 'observe' : shangGuanCount > 0 ? 'delay' : 'proceed';

    return { evidenceCompleteness, decisionConfidence, riskLevel, decisionBias };
  }
}
```

---

## 7. 实现位置

```
src/consult/orchestrator/
├── evidence-composer/
│   ├── evidence-composer.service.ts   # 主入口
│   ├── knowledge-retriever/
│   │   ├── rule-knowledge-bindings.json # L2 规则绑定配置（P0 唯一知识检索产物）
│   │   └── knowledge-retriever.service.ts
│   ├── evidence-composer.types.ts     # 类型定义
│   └── __tests__/
│       ├── evidence-composer.spec.ts
│       └── fixtures/
│           └── sample-evidence-package.json
```

**注意**：L1 的 `knowledge-index.json` 在 P0 阶段不生成，推迟到 Spiral 2。

---

## 8. 验收标准

- [ ] 输入 gc-001（姻缘 case）→ 输出 evidencePackage 包含 3 类证据
- [ ] evidencePackage.chartSnapshot 来自 calc-engine（非 LLM 生成）
- [ ] evidencePackage.matchedRules 来自 RuleMatcher（非 LLM 识别）
- [ ] evidencePackage.knowledgeFragments 至少每条规则有 1 个占位引用
- [ ] evidencePackage.ruleBasedScore 包含 evidenceCompleteness + decisionConfidence + riskLevel + decisionBias
- [ ] evidencePackage.meta.versions 包含 prompt/rules/knowledge 版本号
- [ ] L2 绑定的 `filePath` 全部指向真实存在的文件
- [ ] `evidence-composer.spec.ts` 全量通过
- [ ] `tsc --noEmit` 零错误