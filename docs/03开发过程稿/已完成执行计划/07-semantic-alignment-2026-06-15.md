# 语义纠偏 Errata（2026-06-15 代码探查权威信源）

> **生成日期**：2026-06-15
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\04-day2-summary.md` §二
> **状态**：🚧 **部分完成**——本文档为权威纠偏信源，4 份交接文档的**正文语义偏差**未修改，工程师以本文档 + 实际代码为准
> **后续**：本 session 成本超限，待新 session 做 4 份交接文档的全文搜索替换（计划 Day 3 下午开工）

---

## 一、纠偏总览

| 偏差概念 | 交接文档说 | 实际代码/Schema | 出处文件 |
|---------|----------|----------------|----------|
| **5 段输出** | clauses/halfMountain/detail/cost/nextAction（5 段 JSON） | **6 段**自由文本：一句话定性/判断依据/当前风险/建议动作/时间窗口/落一句最实在的话 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/generation-composer.service.ts:135-141` |
| **6 类用户状态** | casual/real_issue/verification/repetitive/emotional_pressure/high_risk | **4 类**：casual/genuine/repeating/validating | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/classifier/user-state-classifier.service.ts:4` |
| **9 节点状态机** | XState 5.x，cold_start→first_issue→context_collecting→chart_ready→first_judgment→action_confirm→followup_due→feedback_received→long_memory_update | **当前无独立状态机**。仅 `ConsultRecord.status` 字符串（analyzing/clarify/completed/failed） | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts:175-180` |
| **5 类记忆触发** | identity/preference/issue/feedback/timing 5 字段 | **4 JSON 字段**：chartHistory/consultHistory/timelineEvents/insights，1:1 with User（@unique on userId） | `apps/AWKN-LABlife/awkn-life-backend/prisma/schema.prisma` UserMemory 模型 |
| **9 模块 Pipeline** | Intent→Risk→Memory→Issue→Divination→Judgment→Prompt→Validator→Render | **4 路由**（ziping/liuren/mixed/clarify）+ scheduler + parallel gateway + ReAct 循环 + quality gate | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts:81-348` + `intent-router.service.ts` |
| **JudgmentReport** | 结构化 JSON 类型（5 字段） | **不存在**该类型。实际是 Prompt 模板中 6 段自由文本约束 | `generation-composer.service.ts:135-167` |
| **DecisionIssue** | 结构化问题类型（id/userId/question/state/report/createdAt） | **不存在**该类型。Orchestrator 走 ConsultRecord 模型 + flowStatus 字符串 | `prisma/schema.prisma` ConsultRecord + `orchestrator.service.ts` |
| **USE_9_NODE_MACHINE** | 9 节点开关 | **不存在**该环境变量。实际是 `USE_NEW_PIPELINE` + `BULLMQ_ENABLED` | `engineering-handoff-L3-memory.md:56-57` 文档错引 |
| **4 段高风险拦截** | medical/legal/financial/life 4 类切 high_risk | **未在 classifier 中实现**。可能独立 risk-classifier.service.ts | 需后续读代码确认 |
| **XState** | XState 5.x 状态机库 | **未安装**该库。当前无状态机 | `package.json` 无 xstate 依赖 |

---

## 二、每份交接文档的偏差位置清单

### 2.1 engineering-handoff-overview.md

| 行号 | 偏差 | 建议替换 |
|------|------|----------|
| L33 | "L3 9 节点状态机" | "L3 记忆模型（4 JSON 字段）" |
| L104 | "提供 6 类用户状态分类" | "提供 4 类用户状态分类（casual/genuine/repeating/validating）" |
| L105 | "提供 DecisionIssue + 5 段报告" | "提供 ConsultRecord + 6 段自由文本报告" |
| L106 | "提供 9 模块调用入口" | "提供 orchestrator 调用入口" |
| L107 | "消费 5 段 ReportSection" | "消费 6 段 Prompt 输出" |
| L123 | `type UserState = 'casual' \| 'real_issue' \| 'verification' \| 'repetitive' \| 'emotional_pressure' \| 'high_risk';` | `type UserState = 'casual' \| 'genuine' \| 'repeating' \| 'validating';` |
| L126-133 | DecisionIssue 类型 | **删除**（实际不存在） |
| L136-142 | JudgmentReport 类型 | **删除**（实际不存在，参考 §一 6 段说明） |
| L165 | "L3 9节点" | "L3 记忆" |
| L174 | "9 模块 e2e 100%，5 层输出 100%" | "4 路由 e2e 100%，6 段输出 100%" |
| L176 | "5 类记忆触发 ≥80%，1% 灰度" | "4 JSON 字段写入测试 100%" |
| L233 | "暂停 9 节点，回 mini 3 态" | "暂停 L3 改造" |

### 2.2 engineering-handoff-L1-content.md

| 行号 | 偏差 | 建议替换 |
|------|------|----------|
| §三 5 类断句结构 | **无需改**——这是内容设计（L1 数据层），不是输出格式 |
| §四 6 类用户状态 | **已修正**（6 类 → 4 类，2026-06-15 Edit） |
| 5 类断句库结构 | **保持**——career/wealth/noble/timing/relationship 是内容分类，不冲突 |

### 2.3 engineering-handoff-L2-pipeline.md

| 行号 | 偏差 | 建议替换 |
|------|------|----------|
| L7-9 | 顶部勘误块（已加） | 保留 |
| L30 | "9 模块 + 5 层输出" | "4 路由 + 6 段输出" |
| L32 | "9 模块 + 8 个工程" | "4 路由 + 6 段 + 8 个工程" |
| L49 | "9 模块 Pipeline 串联（Intent→Risk→Memory→Issue→Divination→Judgment→Prompt→Validator→Render）" | "4 路由 Pipeline（ziping/liuren/mixed/clarify）+ scheduler + parallel gateway + ReAct 循环" |
| L64 | "调用 9 模块入口" | "调用 orchestrator 入口" |
| L72 | "9 模块 + 5 层输出" | "4 路由 + 6 段输出" |
| L74 | "9 模块 Pipeline" | "4 路由 Pipeline" |
| L77 | "Intent → Risk → ... → Render → [5 段报告]" | "Scheduler → RouteType → parallel gateway → ReAct → [6 段报告]" |
| L85 | "Issue" 模块 | **删除/合并**（不在 4 路由内） |
| L86 | "Divination" 5 个 agent | **保留**（实际有 liuren/liuyao/qimen/quming/bazi agents） |
| L87 | "JudgmentReport 5 段" | "6 段 Prompt 输出" |
| L88 | "Prompt 5 段" | "Prompt 6 段" |
| L95-94 | "5 段报告 JudgmentReport" | **整段替换**为"6 段自由文本说明"（见 §一 6 段定义） |
| L107 | "5 段必须全部存在" | "6 段必须全部存在（按标题前缀识别）" |
| L117 | "L1 推断的 6 类状态" | "L1 推断的 4 类状态" |
| L127 | "report: JudgmentReport" | **删除**（实际不存在该类型） |
| L151 | "6 类 UserState" | "4 类 UserState" |
| L152 | "JudgmentReport 5 段" | "6 段 Prompt 输出（free text）" |
| L188 | "9 模块 + 8 个工程" | "4 路由 + 6 段 + 8 个工程" |
| L190 | "9 模块单测" | "4 路由单测" |
| L199 | "5 段齐" | "6 段齐" |
| L202 | "5 段齐 + JSON" | "6 段齐 + Prompt 解析" |
| L229 | "5 段全部可见" | "6 段全部可见" |
| L307 | "新 9 模块开关" | "新 Pipeline 开关" |
| L310 | "9 模块总超时" | "Pipeline 总超时" |
| L322 | "9 模块 e2e 失败率" | "Pipeline e2e 失败率" |
| L322 | "切回旧 5 模块" | "切回旧 Pipeline" |
| L353 | "9 模块 Pipeline 代码" | "Pipeline 代码" |
| L379 | "9 模块目录" | "orchestrator 目录" |

### 2.4 engineering-handoff-L3-memory.md

| 行号 | 偏差 | 建议替换 |
|------|------|----------|
| L7-9 | 顶部勘误块（已加） | 保留 |
| L22 | "L1（6 类用户状态）+ L2（5 段报告 + DecisionIssue）" | "L1（4 类用户状态）+ L2（6 段报告）" |
| L30 | "9 节点状态机" | "scheduler 实际流程" |
| L41-50 | "D3 拍板：9 节点状态机替代 mini 3 态" | **整段改写**——"D3 拍板：1% 灰度放量（mini 3 态兜底）走 ConsultRecord.status 字符串" |
| L56-57 | "USE_9_NODE_MACHINE / USE_9_NODE_MACHINE_PCT" | **删除**（实际不存在该环境变量） |
| L62-68 | "9 节点 1%→10%→50%→100%" | "新 Pipeline 1%→10%→50%→100%" |
| L110-181 | §二 9 节点状态机整章 | **整章改写**——"§二 ConsultRecord.status 状态机" |
| L185-208 | §三 5 类记忆触发 | **整段改写**——"§三 4 JSON 字段（chartHistory/consultHistory/timelineEvents/insights）" |
| L282 | "9 节点状态机" 注释 | "ConsultRecord.status 状态" 注释 |
| L340 | "9 节点状态机" RACI | "记忆模型" RACI |
| L351 | "XState 5.x 或自研（轻量）" | **删除**（当前无状态机） |

### 2.5 engineering-handoff-L4-character.md

**L4 文档无 5 段/6 类/9 节点偏差**，保持原样（5 维旁批/8 道具/3 IP 锚点都是 L4 独立设计）。

---

## 三、Day 3 后续行动建议

### 3.1 优先级

| # | 任务 | 工期 | 备注 |
|---|------|------|------|
| 1 | 用 Edit replace_all 把 L2 §2.1/L2 §2.2/L2 §2.3/L3 §二/L3 §三/overview L1-L4 接触点矩阵的旧概念全替换 | 1.5h | 工程师必做 |
| 2 | 删 DecisionIssue/JudgmentReport/USE_9_NODE_MACHINE/XState 类型定义 | 0.5h | 4 份文档都涉及 |
| 3 | 4 份交接文档顶部添加"已对齐 2026-06-15 代码"标记 | 0.5h | 替换原顶部勘误块 |

### 3.2 验证

```bash
# 搜索残留
grep -rn "JudgmentReport\|DecisionIssue\|USE_9_NODE_MACHINE\|XState\|9 节点状态机\|5 段报告\|6 类用户状态" \
  C:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/docs/engineering-handoffs/
# 预期：除本 errata 文件外，无残留
```

---

## 四、关键文件路径

- 本文：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\07-semantic-alignment-2026-06-15.md`
- Day 2 总结（待追加 errata）：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\04-day2-summary.md`
- 4 份交接文档：
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L1-content.md`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L3-memory.md`
- 探查代码：
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\prisma\schema.prisma`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\orchestrator.service.ts`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\generation-composer.service.ts`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\classifier\user-state-classifier.service.ts`
  - `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\consult\orchestrator\intent-router.service.ts`

---

*生成日期：2026-06-15*
*下次更新：Day 3 下午——4 份交接文档语义对齐返工后*
