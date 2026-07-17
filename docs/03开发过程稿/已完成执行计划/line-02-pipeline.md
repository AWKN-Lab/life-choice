# 线 2：工程/Pipeline（主工程线 · 15 工作日）

> **线 ID**：L2
> **依赖前置**：L1 内容资产（断句库 + 对话样例 + 推荐规则）
> **完成后启动**：L3 记忆/回访/状态机
> **基础文档**：长期规划 Q1.5 + Q1.6 + Q3.3

---

## 一、线 2 目标

**一句话**：把 9 模块 pipeline 端到端串联，加上 8 个工程测试用例，加上 5 层输出格式强制——让"一次咨询"从输入到结果完整跑通且可验证。

**Why this matters**：9 模块 pipeline 是张半山整个系统的"骨架"。骨架不通，L3/L4 全部价值打折。

---

## 二、9 模块 Pipeline 速览

来自 `doc06 §31.2`：

```
用户输入
  ↓
1. 意图识别 Intent Router      ← 已有 intent-router.service.ts
2. 风险识别 Risk Guard          ← 已有 high-risk-detector.service.ts
3. 用户状态读取 Memory Reader   ← 已有 user-memory.service.ts
4. 问题建模 Issue Builder       ← 需新建/对齐
5. 术数工具调度 Divination Router ← 已有 zhangbanshan-scheduler.service.ts
6. 结果融合 Judgment Composer   ← 已有 generation-composer.service.ts
7. 张半山话术生成 Prompt Compiler ← 已有 prompt-layers.ts
8. 结构校验 Output Validator    ← 已有 quality-gate.service.ts
9. 前端展示 Report Renderer     ← 已有 ReportSectionMessage 等
10. 记忆写入 Memory Writer     ← 已有 memory-extractor.service.ts
11. 回访任务 Follow-up Scheduler ← 已有 followup.processor.ts
```

**当前状态**：11 步模块**单独都存在**，**端到端未串联**。

---

## 三、任务卡总览

| ID | 名称 | 文档来源 | 工作量 | 关键文件 | RACI 简版 |
|----|------|---------|--------|----------|-----------|
| **L2.1a** | 5 模块核心串联（Intent→Risk→Memory→Issue→Divination） | doc06 §31.2 | 4 天 | `orchestrator.service.ts` | R: 后端 / A: 后端 Lead |
| **L2.1b** | 6 模块完整串联（+Judgment→Prompt→Validator→Render） | doc06 §31.2 | 4 天 | `orchestrator.service.ts` | R: 后端 / A: 后端 Lead |
| **L2.2** | 8 个工程测试用例（Vitest） | doc04 §29 | 3 天 | `__tests__/*.spec.ts` (新) | R: 后端 / A: 后端 Lead / C: 产品 |
| **L2.3** | 5 层输出格式强制（Structured Output + zod schema） | Mark 14 | 4 天 | `prompt-layers.ts` + `output-validator.service.ts` | R: 后端 / A: 后端 Lead |

**合计**：15 工作日

---

## 四、接口契约（对外）

### 4.1 L2 → L3 接触点

**DecisionIssue 模型**（与 L3 共享）：
```typescript
// awkn-life-backend/src/consult/types/decision-issue.ts
export type Domain = 'career' | 'wealth' | 'relationship' | 'investment' | 'migration' | 'family' | 'health' | 'exam' | 'legal' | 'other'
export type Stage = 'new' | 'collecting' | 'judging' | 'action' | 'waiting_feedback' | 'closed'
export type Urgency = 'low' | 'medium' | 'high' | 'critical'

export interface DecisionIssue {
  issueId: string
  userId: string
  domain: Domain
  title: string
  originalQuestion: string
  currentStage: Stage
  urgency: Urgency
  deadline?: string
  keyPeople?: string[]
  bottomLine?: string
  createdAt: string
  updatedAt: string
}
```

**JudgmentReport 5 段结构**：
```typescript
// awkn-life-backend/src/consult/types/judgment-report.ts
export type ReportType = 'quick_judgment' | 'annual_report' | 'monthly_window' | 'relationship_judgment' | 'investment_judgment' | 'followup_review'

export interface ReportSection {
  title: string                     // '事业' | '财' | '贵人' | '月份' | '三句话收束'
  clause?: string                   // 数术断句（来自 L1 断句库）
  halfMountainLine: string          // 半山落句
  detail: string                    // 具体落点
  cost?: string                     // 代价提醒
  nextAction?: string               // 下一步动作
}

export interface JudgmentReport {
  reportId: string
  userId: string
  issueId: string
  reportType: ReportType
  mainClause: string                // 5 段之外的主断句
  humanTranslation: string          // 半山落句（顶层）
  sections: ReportSection[]         // 5 段（事业/财/贵人/月份/三句话收束）
  actionSteps: string[]
  costWarning: string               // 顶部 ⚠️ 代价提醒
  followupDate?: string
  confidence: number                // 0~1
  createdAt: string
}
```

### 4.2 L2 → L4 接触点

**9 模块调用入口**（暴露给前端 ConsultPage/ResultPage）：
```typescript
// awkn-life-backend/src/consult/consult.controller.ts
POST /api/consult
Body: { userId, question, context? }
Response: { data: { issueId, status: 'collecting' | 'ready' | 'generating' }, error: null }

// 后续流式通过 WebSocket 推 5 段报告
WS /consult/:issueId/stream → { section: 'career' | 'wealth' | ... , content, cost, action }
```

---

## 五、DOD 验收标准（线 2）

### L2.1a - 5 模块核心串联
- **Given** 用户输入"我想跳槽"
- **When** POST /api/consult
- **Then** 5 模块依次跑通：Intent(识别 career) → Risk(无) → Memory(读取历史) → Issue(建 DecisionIssue) → Divination(调八字)
- **And** 返回 issueId + status='generating'
- **And** 单测 5 模块串联无报错

### L2.1b - 6 模块完整串联
- **Given** L2.1a 跑通
- **When** 流式生成 5 段报告
- **Then** Judgment(融合 5 段) → Prompt(注入张半山身份) → Validator(校验格式) → Render(输出 JSON)
- **And** 输出符合 JudgmentReport 5 段结构
- **And** WebSocket 流式推送 ≥3 次 progress 回调

### L2.2 - 8 个工程测试用例
完整覆盖 doc04 §29：
- [x] T1: 用户只问大词"我想看事业" → 先追问事业落点
- [x] T2: 用户问财运 → 先拆财源
- [x] T3: 用户问投资"稳赚" → 先拦稳赚
- [x] T4: 用户问"你准不准" → 不争准，拉回具体事
- [x] T5: 用户反馈"上次说的不对" → 不防御，先问变化
- [x] T6: 高风险医疗"我要不要手术" → 先边界，提醒找医生
- [x] T7: 记忆触发（现金流 3 个月 → 创业时主动提醒）
- [x] T8: 主动回访（合同前 1 天提醒 3 件事）

每条 Given-When-Then 在 vitest 中可执行。

### L2.3 - 5 层输出格式强制
- **Given** LLM 输出断句
- **When** Output Validator 校验
- **Then** 必须满足 5 层结构（zod schema 强制）：
  - L1 数术断句（clause: string）
  - L2 半山落句（halfMountain: string）
  - L3 具体落点（detail: string）
  - L4 代价提醒（cost: string）
  - L5 下一步动作（nextAction: string）
- **And** 任一字段缺失 → validator 抛 VALIDATION_ERROR，不返回前端
- **And** 强制率 100%（LLM 不可绕过）

---

## 六、串并行关系

```
L2.1a (4d) ─┐
            ├─→ L2.2 (3d) ─→ L2.3 (4d)
L2.1b (4d) ─┘
```

- L2.1a 和 L2.1b **可并行**（独立模块）
- L2.2 依赖 L2.1a/1b
- L2.3 依赖 L2.1a/1b

---

## 七、风险与缓冲

| # | 风险 | 应对 |
|---|------|------|
| **B1** | 9 模块串联 8 天偏乐观 | 拆 L2.1a/L2.1b，先做 5 模块（Day 1-4）+ 后 6 模块（Day 5-8） |
| **B2** | LLM 输出 5 层格式不稳定 | Structured Output（JSON Schema）+ 后处理正则兜底 |
| **B3** | 8 个测试用例可能假阳性 | 用 L1 的真实对话样例作为测试输入 |
| **B4** | WebSocket 进度回调与前端 consultStore 不同步 | 严格按事件协议（section: 'career'/'wealth'/...）|
| **B5** | Prompt Compiler 注入 L1 断句库可能 token 超限 | L2.3 用 zod schema 强制，prompt 只注入断句 ID 而非全文 |

---

## 八、关键文件路径

### 8.1 修改
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts`（9 模块串联）
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts`（5 层输出格式）
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/quality-gate.service.ts`（升级为 zod validator）

### 8.2 新增
- `awkn-life-backend/apps/api-server/src/consult/__tests__/pipeline-e2e.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-1-big-word.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-2-wealth.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-3-investment.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-4-verification.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-5-feedback.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-6-medical-risk.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-7-memory-trigger.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/test-8-active-followup.spec.ts`
- `awkn-life-backend/apps/api-server/src/consult/types/decision-issue.ts`
- `awkn-life-backend/apps/api-server/src/consult/types/judgment-report.ts`
- `awkn-life-backend/apps/api-server/src/consult/schemas/output-schema.ts`（zod schema）

---

## 九、线 2 完成 → L3 启动条件

- [ ] 9 模块 pipeline 端到端跑通
- [ ] 8 个测试用例全过
- [ ] 5 层输出格式 100% 强制
- [ ] 至少 1 个真实用户跑 demo
- [ ] consultStore 前端 store 集成 L2 状态
- [ ] 与 L1 断句库 / 对话样例的契约验证

---

## 附录：文档来源

- **doc06** 张半山工程化文档 V1.3 §31（9 模块）+ §34（Prompt 9 层）+ §36（5 层校验）
- **doc04** 张半山对话与规则文档 §28（工程配置补充）+ §29（8 个测试用例）
- **Mark 14** §14.12（5 层输出格式）
- 长期规划 Q1.5 + Q1.6 + Q3.3

---

*线 2 生成日期：2026-06*
*下次更新：线 2 全部完成时*
