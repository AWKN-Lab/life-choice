# 线 3：记忆/回访/状态机（壁垒线 · 26 工作日）

> **线 ID**：L3
> **依赖前置**：L2 Pipeline（DecisionIssue / JudgmentReport 5 段结构）
> **完成后启动**：L4 末段（多轮 UI 完整化）
> **基础文档**：长期规划 Q2.1 + Q2.2 + Q2.3 + Q2.4 + Q2.5 + Q2.6

---

## 一、线 3 目标

**一句话**：让张半山"记得住你"——5 类记忆触发显式化、9 节点状态机全实现、10 场景主动出击、4 段高风险拦截、数据模型扩展。这是张半山核心壁垒。

**Why this matters**：没有记忆/回访，张半山永远只是"一次性问事的 AI"。"长期陪伴"是张半山区别于所有命理/AI 工具的护城河。

---

## 二、任务卡总览

| ID | 名称 | 文档来源 | 工作量 | 关键文件 | RACI 简版 |
|----|------|---------|--------|----------|-----------|
| **L3.1** | 5 类记忆触发规则显式化 | doc08 §16 | 5 天 | `memory-extractor.service.ts` | R: 后端 / A: 后端 Lead |
| **L3.2** | 9 节点状态机全实现（替代 mini 3 态） | doc07 §19 | 8 天 | `node-state-machine.service.ts` (新) | R: 后端 / A: 后端 Lead |
| **L3.3** | 10 场景主动出击话术 + 触发调度（Bull/Agenda） | doc08 §17 | 5 天 | `followup.processor.ts` + `active-moves/*.ts` | R: 后端 / A: 产品 |
| **L3.4** | 4 段高风险场景（医疗/法律/金融/生命）+ 边界话术 | doc07 §20 | 3 天 | `high-risk-detector.service.ts` + `safety/scenarios/*.yaml` | R: 后端 / A: 后端 Lead / C: 心理顾问 |
| **L3.5** | memory_item 全字段对齐 docx | doc06 §32.4 | 3 天 | `schema.prisma` + `UserMemory` 扩展 | R: 后端 / A: 后端 Lead |
| **L3.6** | followup_task 模型全字段对齐 + 通知链路 | doc06 §32.7 | 2 天 | `schema.prisma` + `ConsultFollowUp` 增强 | R: 后端 / A: 后端 Lead |

**合计**：26 工作日

---

## 三、9 节点状态机

来自 `doc07 §19`：

```
cold_start
  ↓
first_issue（用户首次提问）
  ↓
context_collecting（追问补信息）
  ↓
chart_ready（命盘已就绪）
  ↓
first_judgment（首次判断完成）
  ↓
action_confirm（用户确认行动）
  ↓
followup_due（回访到期）
  ↓
feedback_received（收到反馈）
  ↓
long_memory_update（长期记忆更新）
```

**当前实现**：`emotion-state.ts` 3 态 mini（IDLE/GENERATING/COMPLETED）——**L3.2 升级为 9 态全链路**。

---

## 四、接口契约（对外）

### 4.1 L3 → L4 接触点

**MemoryAnchor 数据结构**（给前端 MemoryAnchorMessage 渲染）：
```typescript
// awkn-life-backend/src/consult/memory/types.ts
export type MemoryType = 
  | 'major_issue'        // 重大问题
  | 'time_anchor'        // 时间锚点
  | 'person_anchor'      // 关键人物
  | 'bottom_line'        // 代价底线
  | 'repeat_pattern'     // 反复模式
  | 'mood_signal'        // 情绪信号
  | 'feedback'           // 结果反馈

export interface MemoryItem {
  memoryId: string
  userId: string
  issueId?: string
  type: MemoryType
  content: string
  sourceQuote: string          // 用户原话
  confidence: number           // 0~1
  weight: number               // 0~1
  expiresAt?: string
  createdAt: string
  updatedAt: string
}
```

**主动出击触发类型**（10 场景）：
```typescript
// awkn-life-backend/src/consult/followup/types.ts
export type ActiveMoveType = 
  | 'key_date_before'      // 关键日期前（3 天/1 天）
  | 'contract_eve'         // 合同前一天
  | 'action_window'        // 行动窗口到了
  | 'cash_collect'         // 收势提醒
  | 'quarter_review'       // 季度复盘
  | 'annual_review'        // 年度回访
  | 'new_window'           // 新局出现
  | 'old_judgment_fix'     // 旧判断修正
  | 'silent_user'          // 沉默用户激活
  | 'anniversary'          // 纪念日
```

### 4.2 9 节点状态机接口

```typescript
// awkn-life-backend/src/consult/orchestrator/node-state-machine.service.ts
export type ConsultNode = 
  | 'cold_start'
  | 'first_issue'
  | 'context_collecting'
  | 'chart_ready'
  | 'first_judgment'
  | 'action_confirm'
  | 'followup_due'
  | 'feedback_received'
  | 'long_memory_update'

export interface NodeTransition {
  from: ConsultNode
  to: ConsultNode
  trigger: 'user_input' | 'risk_check' | 'memory_read' | 'chart_ready' | 'judgment_done' | 'user_confirm' | 'time_elapsed' | 'feedback_received'
  guard?: (ctx: ConsultContext) => boolean
}
```

---

## 五、DOD 验收标准（线 3）

### L3.1 - 5 类记忆触发
- **Given** 用户说"我要辞职"
- **When** memory-extractor 跑
- **Then** 自动写入 `major_issue` 类型记忆
- **And** 张半山回应"这件事我记下了..."
- **5 类全测**：
  - 触发词：辞职/创业/结婚/投资/买房 → major_issue
  - 触发词：几号/下周/合同到期 → time_anchor
  - 触发词：最多撑多久/最怕什么 → bottom_line
  - 30 天内同类 ≥3 次 → repeat_pattern
  - 触发词：成了/黄了/没发生 → feedback

### L3.2 - 9 节点状态机
- **Given** 用户首次提问"我想跳槽"
- **When** node-state-machine 跑
- **Then** 状态依次：cold_start → first_issue → context_collecting → chart_ready → first_judgment → action_confirm
- **And** 7 天后到 followup_due 节点
- **And** 用户反馈后到 feedback_received → long_memory_update
- **And** 9 节点 e2e 单测通过

### L3.3 - 10 场景主动出击
- **Given** 用户在 3 天前说"4 月 10 日签合同"
- **When** 时间到达 4 月 9 日
- **Then** Bull/Agenda 调度主动出击 `contract_eve`
- **And** 张半山说"明天要签。今晚看三件事：钱、责任、退路。"
- **10 场景全测**（每场景 1 个真实用户跑通）

### L3.4 - 4 段高风险
- **Given** 用户输入"我要不要做手术？"
- **When** high-risk-detector 跑
- **Then** 识别为 `health` 域高风险
- **And** 张半山说"医疗问题先听医生。我不能替你判断手术。我能帮你看这一段工作、家庭和节奏怎么安排。"
- **4 段全测**：医疗/法律/金融/生命（含 crisis-keywords）

### L3.5 - memory_item 全字段
- **Given** UserMemory 模型
- **Then** 字段完整：memoryId/userId/issueId/type(7 enum)/content/sourceQuote/confidence/weight/expiresAt/createdAt/updatedAt
- **And** 7 type 全部支持
- **And** 数据迁移：老用户 UserMemory 软迁移（默认值回填）

### L3.6 - followup_task 全字段
- **Given** ConsultFollowUp 模型
- **Then** 字段完整：taskId/userId/issueId/triggerAt/triggerType(5 enum)/messageTemplate/status(4 enum)/createdAt
- **And** 5 触发类型 + 4 状态全部支持

---

## 六、串并行关系

```
L3.5 (3d) ─┐
L3.6 (2d) ─┼─→ L3.1 (5d) ─┐
           │               ├─→ L3.2 (8d) ─┐
           │               │                ├─→ 集成测试
           │               └─→ L3.3 (5d) ──┤
           │                                │
           └─→ L3.4 (3d) ──────────────────┘
```

- L3.5 + L3.6 数据迁移必须先做
- L3.1 + L3.3 + L3.4 可并行（共用数据层）
- L3.2 9 节点状态机最晚启动，依赖 L3.1

---

## 七、风险与缓冲

| # | 风险 | 应对 |
|---|------|------|
| **B1** | Prisma 迁移需要数据回填 | 软迁移（默认值 + 渐进式回填，3 天缓冲） |
| **B2** | 9 节点状态机替代 mini 3 态可能引入 bug | 并行运行（mini 灰度 10%，9 态观察 90%）|
| **B3** | 主动出击可能打扰用户 | 禁发场景清单（不发早安/加油/运势/大凶/催付费）+ 不连续主动超过 2 次 |
| **B4** | Bull/Agenda 选型学习成本 | 优先用项目已有 test-bullmq.js 验证技术栈 |
| **B5** | 5 类记忆触发在 LLM 自由发挥下准确率 <80% | 规则 + 关键词兜底，LLM 只做语义增强 |
| **B6** | 4 段高风险漏掉边界 case | crisis-keywords 维护 + 心理顾问 review |

---

## 八、关键文件路径

### 8.1 新增
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/node-state-machine.service.ts`
- `awkn-life-backend/apps/api-server/src/consult/memory/types.ts`
- `awkn-life-backend/apps/api-server/src/consult/followup/active-moves/contract-eve.ts`、...（10 个）
- `awkn-life-backend/apps/api-server/src/consult/safety/scenarios/medical.yaml`
- `awkn-life-backend/apps/api-server/src/consult/safety/scenarios/legal.yaml`
- `awkn-life-backend/apps/api-server/src/consult/safety/scenarios/finance.yaml`
- `awkn-life-backend/apps/api-server/src/consult/safety/scenarios/life-safety.yaml`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/node-state-machine.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/active-moves.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/memory-trigger.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/high-risk.spec.ts`

### 8.2 修改
- `awkn-life-backend/apps/api-server/src/consult/memory/memory-extractor.service.ts`（5 类触发）
- `awkn-life-backend/apps/api-server/src/consult/memory/user-memory.service.ts`（7 type 字段）
- `awkn-life-backend/apps/api-server/src/consult/followup/followup.processor.ts`（10 场景调度）
- `awkn-life-backend/apps/api-server/src/consult/followup/followup.service.ts`（5 触发类型）
- `awkn-life-backend/apps/api-server/src/consult/safety/high-risk-detector.service.ts`（4 段对齐）
- `awkn-life-backend/apps/api-server/src/consult/safety/crisis-keywords.ts`（扩展）
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/emotion-state.ts`（保留 mini 灰度，9 态主用）
- `awkn-life-backend/apps/api-server/prisma/schema.prisma`（UserMemory + ConsultFollowUp 字段扩展）
- `awkn-life-backend/apps/api-server/prisma/migrations/2026_*_memory_expansion/`（新）

---

## 九、线 3 完成 → L4 末段启动条件

- [ ] 5 类记忆触发 ≥80% 准确率
- [ ] 9 节点状态机 e2e 通过
- [ ] 主动出击 10 场景跑通
- [ ] 高风险拦截 100% 命中
- [ ] 数据迁移无报错
- [ ] 至少 1 个真实用户跑 7 天回访闭环
- [ ] privacy-framework 合规 review 通过

---

## 附录：文档来源

- **doc08** 张半山活人化 V1.1 §16（5 触发）+ §17（10 主动出击）+ §19（9 状态机）+ §20（4 高风险）
- **doc07** 张半山活人化 V1.0 §20（4 高风险）
- **doc06** 张半山工程化 V1.3 §32.4（memory_item 字段）+ §32.7（followup_task 字段）
- **docs/product/privacy-framework.md**（已交付前置）
- 长期规划 Q2.1 + Q2.2 + Q2.3 + Q2.4 + Q2.5 + Q2.6

---

*线 3 生成日期：2026-06*
*下次更新：线 3 全部完成时*
