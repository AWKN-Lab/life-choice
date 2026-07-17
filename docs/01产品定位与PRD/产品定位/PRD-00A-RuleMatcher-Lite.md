# PRD-00A：RuleMatcher Lite — 姻缘 20 条规则命中引擎

> **主 PRD**：PRD-00 人生决策宗师装甲就位 v0.2
> **优先级**：P0（无依赖，可立即开工）
> **定位**：输入 BaziFullResult（来自 `calc-engine/bazi-calculator-wrapper.ts`）→ 输出结构化 matchedRules[]
> **螺旋策略**：第一轮 8 条核心规则 → 跑通姻缘 case → 第二轮补齐 20 条
> **不做**：全术数规则大百科、六爻/梅花/六壬规则、rule DSL

---

## 0. 螺旋执行策略

**第一轮（8 条核心）**：先跑通姻缘 case，验证规则命中逻辑正确。

```
R001 夫妻宫冲       R002 子午冲
R003 卯酉冲         R007 伤官见官
R008 财星引动       R012 大运引动夫妻宫
R019 价值观冲突     R020 决策方式冲突
```

**第二轮（补齐 20 条）**：确认核心 8 条通过后，补齐剩余 12 条。

**不做**：一轮做满 20 条。先验证核心逻辑，再扩展覆盖。

---

## 1. 目标

让 LLM 不再自己"识别"命理规则。RuleMatcher 从八字排盘结果中自动检测冲合刑害、十神格局、大运流年引动，输出结构化命中规则列表。

**一句话**：把 prompt 里的规则识别逻辑，搬进 TypeScript 代码。

---

## 2. 范围

**只做姻缘 P0 的 20 条规则。**

### 冲合刑害（6 条）

**关键复用**：`BaziFullResult.xingChongHeHai` 已结构化（he/chong/hai/xing 各含 `pillars[]` + `relation`）。R001-R006 **不需要重新算冲克**，直接读取并映射到规则 ID。

**双方交叉冲克**：`xingChongHeHai` 是单命结果，双方互冲需额外做四柱交叉对比（参考 mvp0-runner.ts L197-235 已有逻辑）。

| ID | 规则名 | 检测逻辑 | 数据来源 |
|----|--------|----------|----------|
| R001 | 夫妻宫冲 | 双方日支相冲 | 双方 `dayPillar[1]` 交叉对比（非 xingChongHeHai） |
| R002 | 子午冲 | 任一柱子午相冲 | 读 `xingChongHeHai.chong`，匹配含"子""午"的 relation |
| R003 | 卯酉冲 | 任一柱卯酉相冲 | 读 `xingChongHeHai.chong`，匹配含"卯""酉"的 relation |
| R004 | 寅申冲 | 任一柱寅申相冲 | 读 `xingChongHeHai.chong`，匹配含"寅""申"的 relation |
| R005 | 巳亥冲 | 任一柱巳亥相冲 | 读 `xingChongHeHai.chong`，匹配含"巳""亥"的 relation |
| R006 | 辰戌丑未冲 | 辰戌/丑未相冲 | 读 `xingChongHeHai.chong`，匹配含"辰""戌""丑""未"的 relation |

**单命冲克读取示例**：
```typescript
// 直接从排盘结果读取，不重新计算
const chongList = baziResult.xingChongHeHai.chong; // Array<{ pillars: string[]; relation: string }>
for (const c of chongList) {
  // c.relation 形如 "子午相冲" / "卯酉相冲"
  if (c.relation.includes('子') && c.relation.includes('午')) matchRule('R002', c);
  if (c.relation.includes('卯') && c.relation.includes('酉')) matchRule('R003', c);
  // ...
}
```

**双方日支冲（R001）**：需要取男女双方 `dayPillar[1]` 做交叉对比：
```typescript
const maleDayZhi = maleResult.dayPillar[1];
const femaleDayZhi = femaleResult.dayPillar[1];
const CHONG_PAIRS: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};
if (femaleResult && CHONG_PAIRS[maleDayZhi] === femaleDayZhi) {
  matchRule('R001', { male: maleDayZhi, female: femaleDayZhi });
}
```

### 十神格局（5 条）

**注意**：`BaziFullResult` 没有 `shishen[]` 数组，十神是 4 个独立字段：`yearShishen/monthShishen/dayShishen/hourShishen`。藏干十神在 `zangganShishen`。

| ID | 规则名 | 检测逻辑 | BaziFullResult 字段 |
|----|--------|----------|-----------------|
| R007 | 伤官见官 | 四柱十神含伤官，且大运/流年见正官 | `yearShishen/monthShishen/dayShishen/hourShishen` + `daYun` + `liuNian` |
| R008 | 财星引动 | 流年/大运引动日主财星 | `daYun` + `liuNian` + 四柱十神 |
| R009 | 官杀显现 | 女命官杀混杂（正官+七杀同现） | 四柱十神 + `zangganShishen`（性别从外部传入） |
| R010 | 比劫夺财 | 比劫旺 + 财星弱 + 流年比劫 | `wuxing`（判旺衰）+ 四柱十神 + `liuNian` |
| R011 | 食伤过旺 | 女命食伤多（≥3）+ 官星弱 | 四柱十神 + `zangganShishen`（性别从外部传入） |

### 大运流年（4 条）

**注意**：大运是 `daYun`（不是 `dayun`），流年是 `liuNian`（不是 `liunian`）。

| ID | 规则名 | 检测逻辑 | BaziFullResult 字段 |
|----|--------|----------|-----------------|
| R012 | 大运引动夫妻宫 | 大运地支与日支相合/相冲 | `daYun[].zhi` + `dayPillar[1]` |
| R013 | 流年合动婚姻宫 | 流年地支与日支相合 | `liuNianDetail[].he` + `dayPillar[1]` |
| R014 | 伏吟 | 大运/流年与四柱任一支相同 | `daYun[].zhi` + `liuNianDetail[].ganZhi[1]` + 四柱地支 |
| R015 | 反吟 | 大运/流年与四柱任一支相冲 | `daYun[].zhi` + `liuNianDetail[].chong` + 四柱地支 |

### 风险与决策（5 条）

| ID | 规则名 | 检测逻辑 | 来源 |
|----|--------|----------|------|
| R016 | 共同负债风险 | 比劫夺财 + 夫妻宫冲 | R001+R010 |
| R017 | 父母边界风险 | 年柱冲克 + 印星受损 | `xingChongHeHai` 含年柱 + 四柱十神判印星 |
| R018 | 三个月验证 | 大运交接前后 3 个月 | `daYun[].startAge` + 用户当前年龄 |
| R019 | 价值观冲突 | 双方日主五行相克 | `dayPillar[0]` + `WUXING_TIANGAN` 映射 |
| R020 | 决策方式冲突 | 男方官杀旺 vs 女方伤官旺 | 双方四柱十神对比 |

---

## 3. 输入 Schema

**直接引用 `BaziFullResult`（来自 `src/calc-engine/bazi-calculator-wrapper.ts` L38-156），不要新建接口。**

```typescript
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';

interface RuleMatcherInput {
  /** bazi-engine 输出（直接用 BaziFullResult，不要新建 BaziChart） */
  chartSnapshot: {
    /** 男方八字 */
    male: BaziFullResult;
    /** 女方八字（可选，姻缘场景必填） */
    female?: BaziFullResult;
  };
  /** 问题类型 */
  questionType: 'marriage_decision' | 'career_decision' | 'wealth_decision' | 'health_decision';
  /** 用户上下文 */
  userContext: {
    background: string;
    concerns: string[];
  };
}
```

**BaziFullResult 关键字段速查**（完整定义见 `src/calc-engine/bazi-calculator-wrapper.ts` L38-156）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `yearPillar/monthPillar/dayPillar/hourPillar` | `string` | 四柱（如 "己巳"） |
| `yearShishen/monthShishen/dayShishen/hourShishen` | `string` | 四柱十神（不是数组，是 4 个独立字段） |
| `wuxing` | `{ wood, fire, earth, metal, water }` | 五行统计 |
| `daYun` | `Array<{ index, gan, zhi, full, startAge, endAge }>` | 大运（注意大小写 `daYun` 不是 `dayun`） |
| `liuNian` | `Array<{ year, ganZhi, shishen }>` | 流年（注意大小写 `liuNian` 不是 `liunian`） |
| `liuNianDetail` | `Array<{ year, ganZhi, shishen, he, chong, hai, xing, yongJi, score, theme }>` | 流年详情含刑冲合害/用忌/评分/主题 |
| `xingChongHeHai` | `{ he, chong, hai, xing }` 各为 `Array<{ pillars, relation }>` | **已结构化的刑冲合害，RuleMatcher 直接读取** |
| `shenSha` | `Record<string, string[]>` | 神煞 |
| `zangganShishen` | `{ year, month, day, hour }` 各为 `Array<{ gan, shishen }>` | 藏干十神 |
| `naYin` | `{ year, month, day, hour }` | 纳音 |
| `kongWang` | `string[]` | 空亡 |
| `taiYuan/mingGong/shenGong` | `string` | 胎元/命宫/身宫 |
| `changsheng` | `{ year, month, day, hour }` | 十二长生 |
| `selfSeat` | `{ year, month, day, hour }` | 自坐 |
| `shenShaByPillar` | `{ year, month, day, hour }` 各为 `string[]` | 按柱神煞 |

**注意**：`BaziFullResult` 没有 `gender` 字段。性别在输入 `BaziInput` 里，不在输出里。RuleMatcher 如需性别，从 `userContext` 或调用方传入。

---

## 4. 输出 Schema

```typescript
interface RuleMatcherOutput {
  matchedRules: MatchedRule[];
  summary: {
    totalRulesMatched: number;
    highSeverityCount: number;
    mediumSeverityCount: number;
    primaryConflict: string; // 最核心的矛盾
  };
}

interface MatchedRule {
  ruleId: string;          // R001-R020
  ruleName: string;        // 规则中文名
  category: 'chonghe' | 'shishen' | 'dayun' | 'risk';
  severity: 'high' | 'medium' | 'low';
  evidence: string;        // 具体证据描述
  relatedPillars: string[]; // 涉及的四柱
  knowledgeRefs: string[];  // 关联的知识片段引用（L2 绑定）
  dualCheck?: {            // 双方八字交叉验证
    male: string;
    female: string;
    conflict: string;
  };
}
```

**输出示例**：
```json
{
  "matchedRules": [
    {
      "ruleId": "R001",
      "ruleName": "夫妻宫子午冲",
      "category": "chonghe",
      "severity": "high",
      "evidence": "男方日柱壬子，女方日柱丙午，子午相冲",
      "relatedPillars": ["男方日柱", "女方日柱"],
      "knowledgeRefs": ["待 KnowledgeRetriever L2 绑定"],
      "dualCheck": {
        "male": "壬子 日柱",
        "female": "丙午 日柱",
        "conflict": "子午相冲，水火不交"
      }
    }
  ],
  "summary": {
    "totalRulesMatched": 3,
    "highSeverityCount": 2,
    "mediumSeverityCount": 1,
    "primaryConflict": "夫妻宫子午冲"
  }
}
```

---

## 5. 实现位置

```
src/consult/orchestrator/
├── rule-matcher/
│   ├── rule-matcher.service.ts    # 主入口
│   ├── rules/
│   │   ├── chonghe.rules.ts       # 冲合刑害规则 R001-R006
│   │   ├── shishen.rules.ts       # 十神格局规则 R007-R011
│   │   ├── dayun.rules.ts         # 大运流年规则 R012-R015
│   │   └── risk.rules.ts          # 风险决策规则 R016-R020
│   ├── rule-matcher.types.ts      # 类型定义
│   └── __tests__/
│       └── rule-matcher.spec.ts   # 测试（至少 20 条规则各 1 个 case）
```

---

## 6. 验收标准

- [ ] 输入 gc-001（姻缘 case）→ 命中 ≥3 条规则
- [ ] 输入 gc-012（合婚 case）→ 命中 ≥5 条规则（双命）
- [ ] 输入单命八字 → 不报错，命中适用的单命规则
- [ ] 每条命中规则的 evidence 字段包含具体柱位和地支
- [ ] 20 条规则各至少 1 个正向测试 case
- [ ] `rule-matcher.spec.ts` 全量通过
- [ ] `tsc --noEmit` 零错误

---

## 7. 不做

- ❌ 不做六爻/梅花/六壬/奇门规则
- ❌ 不做事业/财运/健康/学业模块规则（Spiral 2+）
- ❌ 不做 rule DSL（用 TypeScript 硬编码 JSON 规则）
- ❌ 不做规则权重调参（先用 severity 三级）
- ❌ 不做知识库真实检索（knowledgeRefs 先写占位，PRD-00B 接入）