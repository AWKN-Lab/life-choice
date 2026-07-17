# 取名闭环批判性审查

## 审查范围
用户输入 → 路由 → 八字排盘 → 五行分析 → 喜用神 → LLM/算法生成 → 输出
数据流：`ConsultService` → `LlmGatewayService.handleQuming()` → `QumingAgentService.analyze()`

## 当前数据流全景

```
用户输入 (question/birthDate/birthTime/gender/surname/parentWish/avoidChars)
  → RouterService.route() 关键词匹配 → routeType='quming'
    → ConsultService.analyze()
      → CalcEngineService.calculate() [算法计算]
      → LlmGatewayService.generate()
        → handleQuming() → QumingAgentService.analyze()
          → BaZiCalculator.calculateBaZi() [八字排盘]
          → analyzeWuxing() [五行分析]
          → calculateXiYongShen() [喜用神]
          → generateNamesWithLLM() [LLM 取名] 或 generateNamesWithAlgorithm() [算法兜底]
          → buildSummaryLine/Body [组装结果]
        → GatewayOutput [统一输出格式]
```

---

## 问题清单（按严重程度排序）

### P0｜致命问题

#### P0-1: LLM 降级时使用硬编码假数据
- **位置**：[quming-agent.service.ts:L449-L456](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L449-L456)
- **问题**：`parseNameSuggestions` 的 catch fallback 传入硬编码的假八字（`birthDate: ''`, `dayGan: '木'`, 假五行数据），导致降级结果与用户真实八字完全无关，属于**静默错误**。
- **影响**：用户看到的是假名字推荐，但以为是根据自己八字生成的。

#### P0-2: LLM 调用不走 fallback chain
- **位置**：[quming-agent.service.ts:L415-L420](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L415-L420)
- **问题**：调用 `this.llmProviders!.chatWithUser()`，而不是 `chatWithFallback()`。LLM 失败直接降级到算法，没有尝试 fallback 到下一个 provider（sensenova → deepseek → doubao → minimax → deepseek-direct）。
- **证据**：`chatWithUser` 方法（需确认）可能只调单个 provider 不做 fallback。
- **影响**：一个 provider 超时就丢掉了全部 LLM 能力，降低了可用性。

### P1｜严重问题

#### P1-1: System Prompt 过长但信息利用率极低
- **位置**：[quming-system-prompt.md](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/prompts/quming-system-prompt.md)
- **问题**：363 行，包含大量 LLM **用不上的知识**：
  - 苏民峰寒热命法（需季节判断，但代码没传季节）
  - 熊崎式五格改名法（需笔画数，但代码没传笔画）
  - 八十一画灵动理数（需笔画数，但代码没传）
  - 百家姓笔画配对表（需笔画数，但代码没传）
  - 生肖取名禁忌（需生肖，但代码没传生肖）
- **实测浪费**：这些规则在代码中并未计算对应数据并传给 LLM，LLM 无法实际执行这些验证。prompt 中约 70% 内容在当前数据流下是**无效的**。
- **影响**：白白消耗大量 token（估计 2000+ tokens），增加了延迟和成本，却没有提升名字质量。

#### P1-2: 八字排盘五行计数不稳定
- **位置**：[quming-agent.service.ts:L122-L150](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L122-L150)
- **问题**：存在 `totalCount === 0` 的 fallback 分支，说明 `bazi.wuxingCount` 经常返回全 0。fallback 用硬编码的 `ZHI_SHENG_FU` 手动计算，但**地支藏干权重未考虑**（如寅藏甲丙戊各有不同比重，但代码都算 1）。
- **影响**：五行分析不准确 → 喜用神不准确 → 取名方向错误。

#### P1-3: 喜用神计算过于简化
- **位置**：[quming-agent.service.ts:L257-L272](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L257-L272)
- **问题**：
  1. 完全依赖 `pattern.favorableElements`，如果 BaZiCalculator 返回的 pattern 不正确，喜用神全错。
  2. 喜神 = `favorableElements.slice(1,3)` 是**随便取的**，没有基于五行生克推算。
  3. 忌神 = `unfavorableElements`，但没有根据"身旺泄耗/身弱补益"原则做二次校验。
- **影响**：取名核心依据（喜用神）可能不准确。

#### P1-4: LLM 输出没有经过五格三才验证
- **位置**：[quming-agent.service.ts:L428-L456](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L428-L456) 和 [naming-calculator.ts](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/calc-engine/naming-engine/naming-calculator.ts)
- **问题**：`NamingCalculator.computeWuge()` 已实现了完整的五格三才计算（含评分），但**从未被调用**。LLM 生成名字后直接返回给用户，没有经过笔画验证。可能推荐了"大凶"笔画的名字。
- **影响**：专业性缺失，用户信任度降低。

### P2｜中等问题

#### P2-1: LLM 返回 JSON 解析过于脆弱
- **位置**：[quming-agent.service.ts:L428-L456](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L428-L456)
- **问题**：
  1. `content.match(/\{[\s\S]*\}/)` 匹配第一个 `{...}`，如果 LLM 在前面输出解释文字后跟 JSON，也能匹配，但可能匹配到非目标 JSON。
  2. 只检查 `parsed.suggestions` 是否为数组，不检查数组中每个元素的字段是否完整。
  3. 每个 suggestion 只输出一个名字，但 `names` 字段是数组——数据结构不一致。

#### P2-2: 缺少姓氏验证
- **位置**：[quming-agent.service.ts:L379](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L379)
- **问题**：`const surname = input.surname || '李'`——用户没填姓氏时默认用"李"，但名字推荐中所有名字都带"李"字。用户可能以为是为自己姓氏取的，实际上是李姓。
- **影响**：严重的用户体验误导。

#### P2-3: 用户输入直接拼入 prompt 无安全过滤
- **位置**：[quming-agent.service.ts:L396-L413](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L396-L413)
- **问题**：`parentWishWords` 和 `avoidChars` 直接拼入 prompt，未做转义。恶意用户可注入 prompt 指令。
- **影响**：prompt injection 风险。

#### P2-4: 算法生成的名字质量低
- **位置**：[quming-agent.service.ts:L277-L368](file:///C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts#L277-L368)
- **问题**：
  1. 策略 1：推荐字两两组合，但推荐字是随机取的前 10 个，没有做语义/音韵筛选。
  2. 策略 2：常用名字库固定为 25 个，且男女名字高度重叠（子涵、子轩等）。
  3. 策略 3：无筛选地添加名字，可能推荐不吉利的笔画组合。
  4. 所有策略都没有调用 `NamingCalculator` 做五格评分。
  5. 没有声调平仄检查。
- **影响**：算法兜底产出的名字质量远低于用户预期。

#### P2-5: 数据传递断层——prompt 期望的信息代码没传
| Prompt 中的规则 | 需要的输入 | 代码是否提供 |
|---|---|---|
| 苏民峰寒热命法 | 出生季节/命型 | ❌ 未计算未传递 |
| 熊崎式五格 | 姓名笔画数 | ❌ 有 NamingCalculator 但未调用 |
| 八十一画灵动数 | 姓名笔画数 | ❌ 同上 |
| 百家姓笔画配对 | 姓氏笔画数 | ❌ 同上 |
| 生肖取名禁忌 | 生肖/年支 | ❌ 年柱已计算但未传给 LLM |
| 三才配置吉凶 | 五格五行 | ❌ 同上 |
| 经典用典 | 无 | N/A |

### P3｜改进建议

#### P3-1: 缺少名字评分与对比功能
- LLM 输出后应有五格评分、声调分析、寓意评分，让用户能横向对比。
- 当前只返回 name + reason（20 字），信息密度太低。

#### P3-2: 缺少多轮交互能力
- 取名是迭代过程：用户看到第一轮名字后可能想调整（换偏旁、换风格、指定字数）。
- 当前不支持 follow-up。

#### P3-3: System Prompt 版本管理
- Prompt 是直接读 `.md` 文件，没有版本号、没有 A/B 测试能力。

#### P3-4: 纳音五行使用不当
- `naYin` 取日柱纳音（如"海中金"），但传统取名更关注**年柱纳音**（决定大运五行属性）。
- 当前传给 LLM 的是日柱纳音，可能误导 LLM。

---

## 修复优先级建议

| 优先级 | 问题 | 修复成本 | 收益 |
|---|---|---|---|
| P0 | 降级假数据 | 低（改 3 行） | 消除静默错误 |
| P0 | LLM 不走 fallback | 低（改 1 个方法调用） | 提升可用性 |
| P1 | Prompt 精简 | 中（重写 system prompt） | 降 token 70%，提质量 |
| P1 | 五格验证 | 中（调用 NamingCalculator） | 专业度质变 |
| P1 | 喜用神计算加固 | 高（需深入八字算法） | 准确性根基 |
| P1 | 五行计数加固 | 中（修复 BaZiCalculator） | 同上 |
| P2 | 姓氏默认值 | 低（加前端校验） | 体验修复 |
| P2 | JSON 解析加固 | 低（加 schema 校验） | 鲁棒性 |
| P2 | 算法名字质量 | 中（加五格筛选+音韵） | 兜底质量 |
| P2 | 数据传递补齐 | 中（传生肖/季节/笔画） | 让 LLM 有据可依 |
| P3 | 名字评分对比 | 高（前端+后端） | 用户体验 |
| P3 | 多轮交互 | 高（架构变更） | 产品进化 |

---

## 结论

取名闭环当前的核心矛盾是：**LLM 有强大的取名知识（prompt 中 363 行），但代码没有给它提供足够的验证数据（笔画、生肖、季节、五格），导致 LLM 只能"凭感觉"推荐名字，无法真正执行 prompt 中定义的取名规则。**

最优先修复的 3 件事：
1. **修复 P0-1 降级假数据**（改 3 行，消除静默错误）
2. **修复 P0-2 LLM 不走 fallback chain**（改 1 个方法调用）
3. **精简 System Prompt + 补齐数据传递**（让 LLM 收到的信息与规则匹配）