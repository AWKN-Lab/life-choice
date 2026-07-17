# 取名闭环修复执行计划（P0-1 ~ P1-4）

## 前置发现：P0-2 撤销

经代码验证，`chatWithUser(provider=undefined)` 内部调用 `chatWithFallback`（[llm-providers.service.ts:L261-L281](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/llm-providers/llm-providers.service.ts#L261-L281)），fallback chain 正常工作。**P0-2 从修复清单中移除。**

---

## Fix 1: P0-1 消除降级假数据

**文件**：`quming-agent.service.ts`

**问题**：[L449-L455](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L449-L455) — `parseNameSuggestions` catch 分支传入硬编码假八字数据调用 `generateNamesWithAlgorithm`

**修复**：
- 删除 catch 分支中的 `generateNamesWithAlgorithm` 调用
- 改为返回空数组 + `logger.error` 记录原始 LLM 输出便于排查
- 外层 `analyze()` 已有 `try-catch` 保护，返回空数组后 summary 仍能正常显示八字分析结果

**改动行数**：~5 行

**验收**：
- 模拟 LLM 返回非 JSON 格式，确认不再生成假名字
- 确认日志中能看到原始 LLM 输出

---

## Fix 2: P1-1 精简 System Prompt

**文件**：`quming-agent/prompts/quming-system-prompt.md`

**当前**：363 行，包含大量 LLM 无法执行的规则

**修复原则**：只保留 LLM 在给定数据下能执行的规则

**删除内容**（约 250 行）：
- 苏民峰寒热命法（无季节数据）
- 熊崎式五格改名法（无笔画数据 → 由 P1-4 代码端处理）
- 三才配置吉凶（同上）
- 八十一画灵动理数（同上）
- 生肖取名禁忌（无生肖数据 → 待 P1-4 补充后可选加入）
- 百家姓吉利笔画配对（同上）

**保留/增强内容**（约 80 行）：
- 核心取名原则（五行补缺、喜用神、忌神规避）
- 五行偏旁速查表（LLM 实际能用）
- 音韵美感规则
- 寓意来源（诗经楚辞）
- 字形协调
- 忌讳规则
- 输出格式

**改动行数**：363 → ~80 行

**验收**：
- LLM 调用 token 消耗显著降低（预期 ~70%）
- 生成的名字质量不降

---

## Fix 3: P1-2 修复五行计数不稳定

**文件**：
1. `quming-agent.service.ts`（删除重复逻辑）
2. `knowledge-base/bazi-calculator.ts`（加固根因）

**问题 A**：[quming-agent.service.ts:L122-L150](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L122-L150) — quming-agent 中硬编码了一份 `WU_XING_MAP` 和 `ZHI_SHENG_FU` 做 fallback，与 BaZiCalculator 中版本可能不一致

**问题 B**：`BaZiCalculator.calculateWuXingCount` 使用 `ZHI_SHENG_FU` 藏干但未加权重（寅藏甲丙戊，甲为主气权重应更高）

**修复**：
1. **quming-agent 端**：移除本地 fallback 逻辑，改为从 `bazi.chart` 中各柱的 `hiddenStems` 重新计算（`hiddenStems` 已由 BaZiCalculator 填充）
2. **BaZiCalculator 端**：给藏干加权重：
   - 主气（每个地支第一个藏干）权重 ×3
   - 中气 ×2
   - 余气 ×1
   - 天干权重 ×2

**改动行数**：quming-agent ~20 行删除，bazi-calculator ~10 行新增

**验收**：
- 确认 `totalCount` 不再为 0
- 五行分布更合理（藏干有权重区分）

---

## Fix 4: P1-3 加固喜用神计算

**文件**：`quming-agent.service.ts` 的 `calculateXiYongShen` 方法

**问题**：[L257-L272](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L257-L272) — 完全依赖 `pattern.favorableElements`，`xi = favorableElements.slice(1,3)` 是随意取的，没有基于日主强弱做二次校验

**修复策略**：用户指定的三层判定法

```
输入：pattern (含 patternName/subType/favorableElements) + wuxingAnalysis + dayGan

步骤：
1. 判定是否特殊格局（patternName 含 化气/专旺/两气成象/从格）
   → 是：直接使用 pattern.favorableElements，完全忽略五行计数
   → 需要严格阈值：只有 patternName 明确为上述类型时才走此分支

2. 非特殊格局：计算两路用神
   路径A（pattern）：pattern.favorableElements 中的十神 → 映射到五行
   路径B（日主强弱）：
     - dayCount = 日主五行在 wuxingAnalysis.current 中的数量
     - dayCount >= 4（身旺）→ 用神 = 克泄日主（克我 + 我生）
     - dayCount <= 2（身弱）→ 用神 = 生助日主（生我 + 同我）
     - dayCount == 3（中性）→ 以路径A为准

3. 取交集：
   - 交集非空 → 用交集（核心用神高度可信）
   - 交集为空 → 回溯检查矛盾根源，以 pattern 为准（pattern 考虑了合化/通根/月令），记录日志供后续迭代

4. 喜神/忌神：
   - 喜神：用神之外五行生克链上的次选
   - 忌神：克用神或过旺的五行

5. 边界模糊（如临界从格）→ 降级以 pattern 为准，不强制二选一
```

**改动行数**：~50 行

**验收**：
- 身旺案例：用神应为克泄日主元素，与 pattern 交集后输出
- 身弱案例：用神应为生助日主元素
- 特殊格局（从格等）：直接使用 pattern 用神
- 矛盾案例：以 pattern 为准 + logger.warn 记录

---

## Fix 5: P1-4 接入五格三才验证

**文件**：
1. `quming-agent.service.ts`（新增验证逻辑）
2. `calc-engine/naming-engine/naming-calculator.ts`（已有，直接调用）

**问题**：`NamingCalculator.computeWuge()` 已实现但从未被调用

**修复**：
1. 在 `QumingAgentService` 中注入 `NamingCalculator`
2. LLM 生成名字后，对每个名字调用 `computeWuge({ surname, givenName })`
3. 筛选规则：
   - 五格全部为吉 → 名字直接通过
   - 1-2 格为凶 → 保留但标注风险
   - 3 格以上为凶 → 过滤掉
4. 在输出 `nameSuggestions` 中新增 `wuge` 字段（可选，前端可展示）
5. 在 system prompt 中提示 LLM 优先推荐笔画数吉利的字（如 5,6,7,8,11,13,15,16,21,23,24,25,29,31,32,33,35,37,39,41,45,47,48,52,57,61,63,65,67,68,73,75,81 画），但不强制（因为 LLM 不知道具体笔画数）

**接口变更**（QumingOutput.nameSuggestions 新增字段）：
```typescript
nameSuggestions: {
  characters: string[];
  names: string[];
  reason: string;
  wuge?: {  // 新增
    tiange: { num: number; wuxing: string; ji: boolean };
    renge: { num: number; wuxing: string; ji: boolean };
    dige: { num: number; wuxing: string; ji: boolean };
    waige: { num: number; wuxing: string; ji: boolean };
    zongge: { num: number; wuxing: string; ji: boolean };
    score: number;  // 吉格数 / 5
  };
}[];
```

**改动行数**：~50 行

**验收**：
- 每个 LLM 生成的名字都有五格评分
- 三格以上为凶的名字被过滤
- 算法兜底的名字也经过五格验证

---

## 执行顺序

```
Step 1: P0-1 修复（5行，消除致命错误）
Step 2: P1-1 System Prompt 重写（~280行删除）
Step 3: P1-2 五行计数加固（~30行）
Step 4: P1-3 喜用神加固（~40行）
Step 5: P1-4 五格验证接入（~50行 + 接口变更）
```

## 不做清单
- 不改前端（五格数据前端可后续展示）
- 不改生肖/季节数据传递（需较大重构，放入下个版本）
- 不改算法兜底名字质量（P2-4，非本轮范围）
- 不改 JSON 解析加固（P2-1，非本轮范围）
- 不改姓氏默认值（P2-2，非本轮范围）
- 不改 LLM prompt 版本管理（P3-3，非本轮范围）

## 部署方式
- 本地编译 → SCP 到服务器 → PM2 restart
- 部署后验证：调用取名接口，检查五格评分字段 + token 消耗下降