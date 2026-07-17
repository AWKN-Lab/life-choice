# 架构基线 v2：判例转换层（Case-to-Humanizer Layer）

> **状态**：冻结 v1（2026-06-26）
> **变更原则**：变更必须升版本，未写入本文件的口头变更视为无效
> **定位**：本文件不是替换 PLAN.md，是在 PLAN.md 之上补"判例转换层"的设计，不动 Prisma schema，不动已有模块

---

## 1. 为什么需要这一层

### 1.1 案例.docx 的水准拆解

案例.docx（婚姻咨询）展示了项目期望的输出水准。10 个能力点里，**只有第 10 个（价值判断）真正需要 LLM 强推理**：

| # | 能力 | 案例 LLM 做了 | 真需要 LLM 吗 | 现状 |
|---|---|---|---|---|
| 1 | 真太阳时校正 | ✅ 自己算 | ❌ 算法 | `solarTime.ts` 已有 |
| 2 | 八字排盘 | ✅ 自己排 | ❌ 算法 | `calc-engine/bazi-engine` 已有 |
| 3 | 大运流年起算 | ✅ 自己推 | ❌ 算法 | `atom-tools/bazi/dayun-stage` 已有 |
| 4 | 古籍引用 | ✅ 自己引 | ❌ 检索 | `knowledge-retriever` 已有，但素材未结构化 |
| 5 | 格局判定 | ✅ 自己定 | ❌ 规则 | `rule-engine` + `bazi-engine` 已有 |
| 6 | 多窗口预测 | ✅ 自己推 | ❌ 算法+模板 | `atom-tools/bazi/liunian` 已有 |
| 7 | 分值/观察期/红线 | ✅ 自己构造 | 🟡 半需要 | **缺口**：未模板化 |
| 8 | 古文→白话翻译 | ✅ 自己译 | 🟡 弱 LLM 可 | **缺口**：未工程化 |
| 9 | 十神配置解读 | ✅ 自己解 | 🟡 弱 LLM 可 | **缺口**：未标准化 |
| 10 | 价值判断 | ✅ 自己判 | ✅ 真需要 | LLM 发挥，靠 prompt-layers 约束 |

### 1.2 真问题

用弱 LLM（Kimi/Doubao/MiniMax）时，能力 4/7/8/9 全靠 LLM 自由发挥，**输出水准不稳定**。案例.docx 的水准来自强 LLM 推理，换弱 LLM 就崩。

### 1.3 解决思路

**钢铁侠逻辑**：把非核心部件工程化，让反应堆（LLM）只做最核心的能量输出（价值判断）。

新增"判例转换层"，把古籍原文→结构化判例→模板渲染→弱 LLM 润色，让弱 LLM 也能稳定输出案例水准。

---

## 2. 4 层确定性架构（已隐式存在，本文件补明第 5 层）

```
Layer 0  确定性层（完全不需要 LLM）       ← calc-engine + solarTime + rule-engine（已有）
Layer 1  检索层（完全不需要 LLM）           ← knowledge-retriever（已有）
Layer 2  半确定性层（弱 LLM 即可）         ← prompt-layers v1/v2（已有，但缺判例注入）
Layer 3  价值判断层（LLM 真正发力）         ← LLM provider + quality-gate（已有）
Layer 4  可证伪输出层（模板化，不需 LLM）   ← 【本文件新增，缺口】
```

### 2.1 Layer 0｜确定性层（已有，不改动）

| 模块 | 路径 | 输入 | 输出 |
|---|---|---|---|
| 真太阳时校正 | `app/src/lib/solarTime.ts` | (北京时间, 城市) | 真太阳时+时辰 |
| 节气熔断 | `calc-engine/bazi-engine/core/solar-terms.ts` | 真太阳时 | {是否交接, 月令} |
| 八字排盘 | `calc-engine/bazi-calculator-wrapper.ts` | 真太阳时 | 四柱+纳音+十神+神煞 |
| 大运流年 | `atom-tools/bazi/dayun-stage.ts` + `liunian.ts` | 四柱+性别 | 大运+流年 |
| 格局判定 | `rule-engine` + `atom-tools/bazi/shishen.ts` | 四柱 | {格局名, 用神, 成败, 救应} |
| 强弱量化 | `atom-tools/bazi/rizhu-strength.ts` + `wuxing-balance.ts` | 四柱 | 日元强弱值+十神得分 |

**契约**：同一输入永远同一输出。本层是项目根基，禁止 LLM 重算。

### 2.2 Layer 1｜检索层（已有，需补判例素材）

| 模块 | 路径 | 输入 | 输出 |
|---|---|---|---|
| 古籍检索 | `knowledge-retriever.service.ts`（接 8701 内网） | (routeType, 证据标签) | 古籍片段+相似案例 |
| 案例库 | `shared/case-library/case-library.service.ts` | 命例特征 | 相似命例 |

**已有素材**：`knowledge/eastern-metaphysics/八字命理/` 30+ 古籍原文（已入库）

**缺口（Step 5 要做）**：素材未结构化为"判例单元"。当前是整段原文检索，弱 LLM 拿到后还要自己翻译，输出不稳定。需要把古籍拆成结构化判例。

### 2.3 Layer 2｜半确定性层（已有 prompt-layers，需补判例注入）

| 模块 | 路径 | 状态 |
|---|---|---|
| 5 层 Prompt 架构 | `prompt-layers.ts` | ✅ Identity/Capability/Context/Dynamic/Confirmation |
| Prompt 版本管理 | `prompt-registry.service.ts` | ✅ v1/v2 |
| 输出格式约束 | `prompt-layers.ts` Layer 2 | ✅ 事实层/解读层/推演层/建议层/点睛层 |

**缺口（Step 7 要做）**：Layer 4 Dynamic 目前只注入 `agentSummary`（算法核心结论），**没注入结构化判例**。弱 LLM 拿不到"子午冲→夫妻宫正冲→男方先想再动/女方先动再说→长期必拉扯"这种现成的转换结果，只能自己推，水准不稳。

### 2.4 Layer 3｜价值判断层（已有，不改动）

| 模块 | 路径 | 状态 |
|---|---|---|
| LLM 调用 | `llm-providers.service.ts` | ✅ Doubao/MiniMax |
| Quality Gate | `quality-gate.service.ts` | ✅ 拦截 raw JSON/巴纳姆话 |
| 代价确认环 | `prompt-layers.ts` Layer 5 | ✅ 重大决策追问 |

### 2.5 Layer 4｜可证伪输出层（缺口，本文件冻结设计）

这是案例.docx 做到了但项目没工程化的部分。

| 模块 | 路径 | 状态 | 输出 |
|---|---|---|---|
| 分值规则引擎 | `atom-tools/decision/risk.ts`（已有风险评估） | 🟡 需扩展 | 1-100 分+3 条得分依据 |
| 观察期模板 | `templates/scenario-*.md`（新建） | ❌ 缺 | N 个月+通过/不通过条件 |
| 红线模板 | `templates/scenario-*.md`（新建） | ❌ 缺 | 3-5 条可观察禁令 |
| 三窗口预测 | `atom-tools/bazi/liunian.ts`（已有算法）+模板 | 🟡 需扩展 | 近/中/远三段 |

---

## 3. 判例转换层（项目核心护城河）

### 3.1 它是什么

把古籍原文（如《子平真诠》"论地支六冲"整段）转换为"可直接注入 prompt 的结构化判例单元"的机制。

**判例单元 schema**：

```json
{
  "id": "ZP-CHONG-001",
  "source": "子平真诠·论地支六冲",
  "originalText": "子午冲，子为水，午为火，水火相克...",
  "keywords": ["子午冲", "夫妻宫", "地支六冲"],
  "modernScene": "marriage",
  "translationTemplate": {
    "core": "夫妻宫正冲，两套生活系统对冲",
    "manifestations": [
      "男方先想清楚再行动，女方先行动再说",
      "男方重底层逻辑，女方重当下感受",
      "长期相处容易变成一个觉得被逼、一个觉得被冷落"
    ],
    "decisionHint": "不是不爱，是爱与系统不兼容并存",
    "redLine": ["不冲动领证", "不共同贷款", "不仓促买房"]
  },
  "applicableConditions": ["日支子+对方日支午", "无合解"]
}
```

### 3.2 为什么这是护城河

| 对比项 | 文墨天机 | 我们 |
|---|---|---|
| 古籍引用 | 黑箱（用户看不到依据） | ✅ 判例单元含 originalText + 出处 |
| 古文翻译 | 不做 | ✅ translationTemplate 含 core + manifestations + decisionHint |
| 现代场景映射 | 不做 | ✅ modernScene 标注（marriage/career/wealth） |
| 红线可观察 | 不做 | ✅ redLine 列出具体禁令 |
| 弱 LLM 友好 | 不友好（强 LLM 才能引） | ✅ 模板化后弱 LLM 直接渲染 |

### 3.3 转换流水线

```
古籍原文（30+ 本）
  ↓ [Step 5 结构化]
结构化判例库（data/case-precedents/*.json）
  ↓ [Step 6 检索]
命中判例单元（按 keywords + scene 匹配）
  ↓ [Step 7 注入 prompt]
prompt-layers Layer 4 Dynamic 注入 translationTemplate
  ↓ [弱 LLM 渲染]
拟真人专业内容（案例.docx 水准）
```

### 3.4 与已有模块的衔接

- **不替换** `knowledge-retriever.service.ts`——它继续负责向量检索，判例层在它之上做结构化封装
- **不替换** `prompt-layers.ts`——它继续负责 5 层 Prompt 架构，判例层只补 Layer 4 的注入字段
- **不替换** `quality-gate.service.ts`——它继续拦截，判例层让拦截更少触发（因为输出更稳定）
- **新增** `case-precedent-retriever.service.ts`——在 knowledge-retriever 之上，把检索结果结构化为判例单元
- **扩展** `prompt-layers.ts` 的 `DynamicLayerInput`——增加 `precedentUnit` 字段

---

## 4. 升级计划（修正版，4 步而非 10 步）

### Step 1｜冻结本架构基线（当前动作）
- 动作：本文件
- 验收：文件存在，含 4 层映射 + 判例转换层设计
- 风险：低
- 回滚：删除文件

### Step 2｜结构化判例库 MVP（10 条种子判例）
- 动作：从案例.docx 反向抽取 10 条判例单元（子午冲、伤官见官、伏吟局等），写入 `data/case-precedents/marriage.json`
- 产出：`人生决策宗师/data/case-precedents/marriage.json`
- 验收：10 条判例单元，每条含 originalText + keywords + modernScene + translationTemplate
- 验证：用案例.docx 的"子午冲"段落反向匹配，命中第 1 条判例单元
- 风险：中（古籍片段≤100字+标来源）
- 回滚：删除 JSON

### Step 3｜判例检索器 + prompt 注入
- 动作：
  - 新建 `case-precedent-retriever.service.ts`：输入(八字特征, 场景) → 返回命中判例单元
  - 扩展 `prompt-layers.ts` 的 `DynamicLayerInput`：增加 `precedentUnit` 字段
  - 在 Layer 4 Dynamic 末尾追加判例注入段
- 产出：1 个新服务 + 1 处 prompt-layers 扩展
- 验收：弱 LLM 跑同一八字，输出含判例的 translationTemplate.core
- 验证：跑 3 次，输出结构稳定
- 风险：中（动 prompt-layers，需跑回归测试）
- 回滚：恢复 prompt-layers，删除新服务

### Step 4｜可证伪输出模板 + 端到端回归
- 动作：
  - 新建 `templates/scenario-marriage.md`：观察期+红线+三窗口模板
  - 用案例.docx 的 10 个判断点做 golden case
  - 端到端跑 1 次：八字输入→判例检索→prompt 注入→弱 LLM 渲染→模板输出
- 产出：1 个模板 + 10 条 golden case + 1 次端到端记录
- 验收：10 条判断点≥8 条匹配案例水准
- 验证：跑 1 次端到端，记录 diff
- 风险：中（端到端可能发现链路问题）
- 回滚：模板可丢弃，不阻塞主链

---

## 5. 钢铁侠逻辑（写在最后）

| 错误版本 | 修正 |
|---|---|
| 第一轮：提示词是 Mark I，补丁升级 | 错。提示词是操控手册，LLM 才是反应堆 |
| 第二轮：4 层架构是新方案 | 错。项目已有等价架构，不能另起炉灶 |
| 第三轮：10 步计划工程化 | 错。9/10 能力已有模块，只有 1 个真缺口 |
| **本轮（正确）** | **判例转换层是 Mark I 缺的装甲片。装上它，弱 LLM 也能稳定输出案例水准** |

**核心原则**：弱 LLM + 强工程 = 案例水准。护城河不是 LLM 强，是"古文判例→拟真人专业内容"的转换能力被工程化。

---

## 6. 变更记录

| 版本 | 日期 | 变更 | 作者 |
|---|---|---|---|
| v1 | 2026-06-26 | 冻结基线，4 步升级计划 | 天火 |
