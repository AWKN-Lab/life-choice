# 线 1：内容/对话资产（启动线 · 13 工作日）

> **线 ID**：L1
> **依赖前置**：无
> **完成后启动**：L2 工程/Pipeline
> **基础文档**：长期规划 Q1.1 + Q1.2 + Q1.3 + Q1.7

---

## 一、线 1 目标

**一句话**：让张半山"开口像人"——20 个对话场景、15 句断句、30+ 推荐问题、6 类用户状态全部入代码可调用。

**Why this first**：L1 独立可启、可并行最快产生"人味"感知；L2 Pipeline 需 L1 产出作为"血肉"。

---

## 二、任务卡总览

| ID | 名称 | 文档来源 | 工作量 | 关键文件 | RACI 简版 |
|----|------|---------|--------|----------|-----------|
| **L1.1** | 20 个对话样例入代码（结构化模板） | doc04 §24 | 5 天 | `app/src/data/scenarios/*.ts` (新) | R: 前端 / A: 产品 / C: 设计师 |
| **L1.2** | 15 句断句库（5 类 × 3 句）入代码 | doc04 §25 | 3 天 | `app/src/data/clauses/*.ts` (新) | R: 前端 / A: 产品 |
| **L1.3** | 30+ 追问推荐规则（6 类）入代码 | doc04 §26 | 3 天 | `app/src/data/followups/*.ts` (新) | R: 前端 / A: 产品 |
| **L1.4** | 6 类用户状态分类器对齐 docx | doc07 + V1.1 | 2 天 | `awkn-life-backend/.../classifier/user-state-classifier.service.ts` | R: 后端 / A: 产品 / C: 设计师 |

**合计**：13 工作日（可与 L4 Q1.4 同步启动）

---

## 三、接口契约（对外）

### 3.1 L1 → L2 接触点

**断句库数据结构**：
```typescript
// app/src/data/clauses/types.ts
export type ClauseCategory = 'career' | 'wealth' | 'noble' | 'timing' | 'relationship'

export interface Clause {
  id: string                       // 例：'career-1'
  category: ClauseCategory
  text: string                     // 数术断句：「官星得照，名位有光」
  halfMountain: string             // 半山落句：「今年先有人看见你」
  fit: string[]                    // 适合：「升职/资质/平台」
  cost: string                     // 代价：「人一被看见，责任也跟着来」
  action: string                   // 动作：「抓一个能留下名字的项目」
}

export const CLAUSES: Record<ClauseCategory, Clause[]> = {
  career: [...],       // 3 句
  wealth: [...],       // 3 句
  noble: [...],        // 3 句
  timing: [...],       // 3 句
  relationship: [...], // 3 句
}
```

**对话样例数据结构**：
```typescript
// app/src/data/scenarios/types.ts
export type ScenarioId = 'first_time' | 'career' | 'job_change' | 'wealth' | 'investment' 
  | 'noble' | 'relationship' | 'marriage' | 'exam' | 'verification' 
  | 'compare_others' | 'emotional_pressure' | 'panic' | 'repetitive' 
  | 'feedback' | 'no_bazi' | 'want_result' | 'specific_month' | 'child' | 'health'

export interface Scenario {
  id: ScenarioId
  userInput: string
  zhangbanshanReply: string        // 张半山标准回复
  sideNote?: string                // 半山旁批（部分场景无）
  applicableDomains: string[]
}

export const SCENARIOS: Record<ScenarioId, Scenario> = { ... }  // 20 个
```

**追问推荐数据结构**：
```typescript
// app/src/data/followups/types.ts
export type FollowupDomain = 'career_annual' | 'wealth' | 'noble' | 'relationship' | 'investment' | 'partnership'

export interface FollowupQuestion {
  domain: FollowupDomain
  purpose: 'month' | 'person' | 'money' | 'cost' | 'next_step' | 'review'
  text: string
}

export const FOLLOWUPS: Record<FollowupDomain, FollowupQuestion[]> = { ... }
```

### 3.2 L1 → L3 接触点

**6 类用户状态**：
```typescript
// awkn-life-backend/src/consult/classifier/types.ts
export type UserState = 
  | 'casual'           // 随便试试
  | 'real_issue'       // 真遇到事
  | 'verification'     // 验证（带别人结论来问）
  | 'repetitive'       // 反复问（30 天内同问题 ≥3 次）
  | 'emotional_pressure' // 情绪压顶
  | 'high_risk'        // 高风险（医疗/法律/金融/生命）

export const USER_STATE_DESCRIPTORS: Record<UserState, string> = {
  casual: '用户随便问问，不需要深度断句',
  real_issue: '用户真遇到事，要给具体落点',
  // ... 6 类描述
}
```

---

## 四、DOD 验收标准（线 1）

### L1.1 - 20 个对话样例
- **Given** 启动后端，输入"我想跳槽"
- **When** Intent Router 识别 domain=career，scenario=job_change
- **Then** 系统从 `SCENARIOS.job_change` 返回张半山标准回复"跳槽先不看走不走..."
- **And** 包含 3 件事追问（为什么想走 / 外面有没有 offer / 现金流）
- **And** 包含【半山旁批】"他说跳槽，真正要看退路。先问 offer 和现金流。"

### L1.2 - 15 句断句库
- **Given** 用户咨询"事业 + 升职"
- **When** Judgment Composer 渲染 career-1 断句
- **Then** 显示「官星得照，名位有光」+「今年先有人看见你」+ 适合+代价+动作
- **And** 5 类（career/wealth/noble/timing/relationship）各 3 句共 15 句全部入库
- **And** 字段完整率 100%（无空字段）

### L1.3 - 30+ 追问推荐
- **Given** 用户完成事业年度报告
- **When** ResultChat 渲染追问区域
- **Then** 显示 6 个追问（5 维目的各 1+）：
  - 1+ 看月份（"哪几个月适合主动争取机会？"）
  - 1+ 看人（"今年贵人更像上级、客户、还是外部平台？"）
  - 1+ 看钱（"哪些合作只是热闹，不值得接？"）
  - 1+ 看代价（"今年最该守住的底线是什么？"）
  - 1+ 看下一步（"如果想跳槽，应该先看哪三件事？"）
  - 1+ 看回访（"这件事，三个月后想看到什么？"）

### L1.4 - 6 类用户状态分类
- **Given** 用户输入"你准不准？"
- **When** classifier 跑 classifyUserState()
- **Then** 识别为 `verification`（验证型）
- **And** 6 类覆盖率 100%（每类至少 10 个测试样例）
- **And** 分类准确率 ≥80%

---

## 五、串并行关系

```
L1.1 (5d) ─┐
L1.2 (3d) ─┼─→ L1.5 验证
L1.3 (3d) ─┤
L1.4 (2d) ─┘
```

- L1.1 L1.2 L1.3 L1.4 **可全并行**（无依赖）
- L1.5（验证 + 集成）= 1 天
- 全部完成后 → 启动 L2

---

## 六、风险与缓冲

| # | 风险 | 应对 |
|---|------|------|
| **B1** | 20 场景文案质量参差 | L1.1 中预留 0.5 天给 CEO/产品 review buffer |
| **B2** | L1.4 分类器准确率 <80% | 用 LLM 二次校验 + 规则兜底 |
| **B3** | 6 类用户状态与 L3 高风险分类冲突 | L1.4 与 L3 高风险检测共用 keyword 词表 |
| **B4** | 30+ 追问推荐可能被 LLM 自由发挥覆盖 | 渲染层强制从 FOLLOWUPS 取，不让 LLM 生成 |

---

## 七、关键文件路径

### 7.1 新增
- `app/src/data/scenarios/types.ts`
- `app/src/data/scenarios/first-time.ts`、`career.ts`、`job-change.ts`、...（20 个）
- `app/src/data/scenarios/index.ts`
- `app/src/data/clauses/types.ts`
- `app/src/data/clauses/career.ts`、`wealth.ts`、`noble.ts`、`timing.ts`、`relationship.ts`
- `app/src/data/clauses/index.ts`
- `app/src/data/followups/types.ts`
- `app/src/data/followups/career-annual.ts`、`wealth.ts`、...（6 个）
- `app/src/data/followups/index.ts`
- `awkn-life-backend/apps/api-server/src/consult/classifier/types.ts`
- `awkn-life-backend/apps/api-server/src/consult/__tests__/user-state-classifier.spec.ts`

### 7.2 修改
- `awkn-life-backend/apps/api-server/src/consult/classifier/user-state-classifier.service.ts`（6 类对齐）
- `awkn-life-backend/apps/api-server/src/consult/orchestrator/prompt-layers.ts`（注入断句库引用）

---

## 八、线 1 完成 → L2 启动条件

- [ ] 20 个对话样例全部入代码
- [ ] 15 句断句库全部入库
- [ ] 30+ 追问推荐全部入库
- [ ] 6 类用户状态分类器 ≥80% 准确率
- [ ] 至少 1 个真实用户验证（端到端 demo）
- [ ] CEO/产品 review 通过

---

## 附录：文档来源

- **doc04** 张半山对话与规则文档 §24（20 场景）+ §25（15 句断句）+ §26（30+ 推荐）
- **doc07** 张半山活人化 V1.0 §10（用户状态分类）
- **doc08** 张半山活人化 V1.1 §16（记忆触发规则中 6 类状态）
- 长期规划 Q1.1 + Q1.2 + Q1.3 + Q1.7

---

*线 1 生成日期：2026-06*
*下次更新：线 1 全部完成时*
