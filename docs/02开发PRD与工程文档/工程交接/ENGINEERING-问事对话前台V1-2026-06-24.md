# 问事对话前台 V1 — 工程交接文档

> 日期：2026-06-24
> 状态：ACTIVE
> 上游 PRD：`docs/01产品定位与PRD/需求文档/PRD-问事对话前台V1-2026-06-24.md`
> 关联文档：
> - `docs/01商业计划/V1-V3阶段路线图-2026-06-24.md`
> - `docs/02开发PRD与工程文档/工程交接/ENGINEERING-三入口闭环修复与资产留存-20260517.md`
> 部署约束：只作用于 `awkn.cn/life`，不修改 `awkn.cn/` 根主页

---

## 1. 目标

本工程文档解决的不是“再做一个问事页面”，而是把现有问事链路收敛成一个统一的对话前台闭环：

1. 首页点击“问事”后，直接在统一前台里说问题。
2. 系统在对话中按需补问，不先铺完整表单。
3. 免费初判必须在当前事项上下文内生成。
4. 深入推演失败时支持原地重试，不整页刷新。
5. 继续追问必须继承原 `recordId` 与上下文。
6. 用户问题、补问信息、结果、追问链写入后台，进入历史与管理员视图。

---

## 2. 当前代码事实

### 2.1 前端现状

已存在文件：

- `apps/AWKN-LABlife/app/src/pages/HomePage.tsx`
- `apps/AWKN-LABlife/app/src/pages/ResultPage.tsx`
- `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx`
- `apps/AWKN-LABlife/app/src/components/frontdesk/frontdeskConfigs.ts`
- `apps/AWKN-LABlife/app/src/components/frontdesk/types.ts`
- `apps/AWKN-LABlife/app/src/components/question/FollowUpQuestions.tsx`
- `apps/AWKN-LABlife/app/src/components/question/HistoryReview.tsx`
- `apps/AWKN-LABlife/app/src/components/question/MajorDecisionAnalysis.tsx`
- `apps/AWKN-LABlife/app/src/components/ClarifyQuestion.tsx`

当前结论：

1. `FrontdeskChat.tsx` 已经同时承担 `naming` 与 `question`，但仍明显偏取名实现。
2. `question` 模式当前仍主要停留在“输入 → 路由 → 页面跳转”层，不是完整问事闭环。
3. `frontdeskConfigs.ts` 里 `question.steps` 只有 `chat`，缺少补问、提交中、初判、重试、继续追问等明确状态设计。
4. `ResultPage.tsx` 责任过重，既承载结果、解锁、K线、追问、失败兜底，也承担问事链路的状态收口。

### 2.2 后端现状

已存在文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.controller.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.controller.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dialogue/dialogue.controller.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dialogue/dialogue.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/clarification/*`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/context/*`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/*`

当前结论：

1. `POST /consult/analyze` 仍是现有主生成入口。
2. `POST /consult/followup` 已存在，可复用追问能力。
3. `POST /consult/preview` 明确是开发实验接口，生产不可作为主链路。
4. 后端已经存在 `clarification`、`dialogue`、`context`、`orchestrator` 能力，但前台尚未把“按需补问 + 对话式收口”完整接入。

---

## 3. 本期范围

### 3.1 必做

1. 首页问事入口统一接入 `FrontdeskChat mode="question"`。
2. 问事前台支持自然语言首问。
3. 问事前台支持按需补问最少必要信息。
4. 提交 `analyze` 时写入 `sourceEntry=question` 与问题相关字段。
5. 初步结论展示用户问了什么、当前判断、风险、建议、追问方向。
6. 深入推演失败支持原地重试。
7. 继续追问复用 `POST /consult/followup`，必须传 `recordId`。
8. 历史记录保留事项视角基础数据。

### 3.2 暂不做

1. 不新开独立问事站点。
2. 不改成完全开放聊天产品。
3. 不重构整个后端 orchestrator。
4. 不一次性补完所有知识库接入。
5. 不在本期新增复杂关系图谱或案例广场。

---

## 4. 目标状态机

前台状态机建议统一为以下 7 态：

```text
idle
→ collecting_question
→ clarifying
→ submitting
→ preview_ready
→ deepening
→ followup_chat
```

### 4.1 状态定义

| 状态 | 含义 | 进入条件 | 退出条件 |
|---|---|---|---|
| `idle` | 前台刚打开 | 点击首页问事 | 用户开始输入 |
| `collecting_question` | 接收首问 | 有输入焦点 | 用户提交问题 |
| `clarifying` | 系统补问关键信息 | 首问不足以判断 | 补问完成后提交 |
| `submitting` | 正在请求初判 | 已准备 payload | 返回结果或错误 |
| `preview_ready` | 初步结论已展示 | `analyze` 成功 | 用户深推/追问/关闭 |
| `deepening` | 深入推演中 | 用户点击深推 | 成功、失败或重试 |
| `followup_chat` | 已进入追问链 | 首次追问开始 | 用户关闭或转历史 |

### 4.2 关键原则

1. 前台状态与结果页状态分离，避免所有状态都挤进 `ResultPage`。
2. “补问”必须是显式状态，不再隐含在临时变量里。
3. “深推失败可重试”必须有单独状态，不应靠整页刷新恢复。

---

## 5. 前端改造

### 5.1 首页入口

文件：

- `apps/AWKN-LABlife/app/src/pages/HomePage.tsx`

改造：

1. 问事入口统一只做一件事：设置 `activeFrontdesk='question'`。
2. 首页不再把问事主流程跳到独立 `/question` 页面。
3. `/life/question` 仅保留兼容路由，内部复用同一前台组件。

验收：

1. 首页点击问事后留在当前语境。
2. 页面兼容路由仍可单独打开。

### 5.2 通用前台组件

文件：

- `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx`
- `apps/AWKN-LABlife/app/src/components/frontdesk/frontdeskConfigs.ts`
- `apps/AWKN-LABlife/app/src/components/frontdesk/types.ts`

改造方向：

1. 把 `question` 模式从临时逻辑抽成明确配置驱动。
2. 为 `question` 模式增加状态字段：

```ts
type QuestionPhase =
  | 'input'
  | 'clarify'
  | 'submitting'
  | 'preview'
  | 'deepening'
  | 'followup';
```

3. `frontdeskConfigs.question` 补齐：
   - greeting
   - quick intents
   - clarify strategy
   - payload builder
   - success handler
   - retry handler

4. 把“问事首问”“补问”“提交中”“初判”“下一步操作”分成更清晰的渲染块，而不是继续全部堆在一个大组件里。

验收：

1. `FrontdeskChat` 内部能独立跑完问事主链路。
2. 不需要另起 `QuestionFrontdesk` 才能完成 V1。

### 5.3 初步结论承接

文件：

- `apps/AWKN-LABlife/app/src/pages/ResultPage.tsx`
- `apps/AWKN-LABlife/app/src/components/question/FollowUpQuestions.tsx`
- `apps/AWKN-LABlife/app/src/components/question/HistoryReview.tsx`
- `apps/AWKN-LABlife/app/src/components/question/MajorDecisionAnalysis.tsx`

改造：

1. 问事结果显示“用户问了什么”。
2. 初步结论至少有 5 块：
   - 问题摘要
   - 当前判断
   - 风险提醒
   - 行动建议
   - 推荐追问
3. 删除或隐藏面向普通用户的工程暴露文案：
   - `algorithm`
   - `calc-engine`
   - `纯算法来源`
4. 深推失败时只重试当前模块，不刷新整个页。

验收：

1. 问事结果不是只有命理摘要。
2. 点击“重试”不丢上下文。

### 5.4 历史记录

文件：

- `apps/AWKN-LABlife/app/src/pages/ResultPage.tsx`
- 历史页相关组件与接口调用点（按当前实现对接）

改造：

1. 历史列表展示以“事项摘要/对象/日期”为主。
2. 不只显示“咨询记录”。
3. 支持单选、多选、全选、删除。

说明：

已有后端接口 `POST /consult/records/delete` 支持批量软删除，可直接复用。

---

## 6. 后端改造

### 6.1 analyze 入口

文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.controller.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts`

改造：

1. 继续使用 `POST /consult/analyze` 作为首问初判入口。
2. 前端提交 `routeType`、`sourceEntry=question`、`questionIntent`、必要补问信息。
3. 服务端创建/更新 `ConsultRecord` 时，确保写入：
   - `sourceEntry`
   - `questionIntent`
   - `analysisData`
   - 问题文本与必要补充字段

注意：

当前 `analyze` 被 `JwtAuthGuard` 保护。若问事需要匿名首问，必须单独评估是否改成 `OptionalJwtAuthGuard` 或增加匿名链路。  
本期工程文档不直接拍板改鉴权，但这是必查点。

### 6.2 追问入口

文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.controller.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.service.ts`

当前接口：

```ts
POST /consult/followup
{
  recordId: string;
  question: string;
  context?: Array<{ role: string; content: string }>;
}
```

本期要求：

1. 继续复用现有接口。
2. 前端追问必须传 `recordId`。
3. `context` 至少包含当前可见问题摘要与最近回答，避免追问失忆。
4. 追问返回结果要继续挂在原事项链上，而不是新开单。

### 6.3 对话补问链

文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/dialogue/dialogue.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/clarification/clarification.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/context/context-builder.service.ts`

本期策略：

1. 不要求前台直接重写到 `dialogue/*` 全链路。
2. 但要复用其“按需补问”的思想和字段设计。
3. 若当前前台先走 `analyze`，补问策略需保持和 `clarification` 口径一致，避免前后端对“必要字段”判断不一。

建议：

- 问事前台的补问槽位与 `clarification/slot-schema.ts` 对齐。

---

## 7. 前后端契约

### 7.1 首问提交 payload

建议前端统一结构：

```ts
interface QuestionConsultPayload {
  routeType: 'liuren' | 'liuyao' | 'qimen' | 'ziping' | 'auto';
  sourceEntry: 'question';
  question: string;
  questionIntent?: string;
  extraContext?: {
    person?: string;
    relation?: string;
    timeline?: string;
    background?: string;
  };
  birth?: {
    date?: string;
    hour?: number;
    minute?: number;
    gender?: 'male' | 'female';
    location?: string;
  };
}
```

说明：

1. 可以不要求一次提交所有字段。
2. 只在补问收集到后再补入 payload。
3. 与现有 DTO 不完全一致的字段，先由前端在 `buildPayload` 内映射到当前后端入参。

### 7.2 初步结论返回最小字段

V1 前端最少依赖这些字段：

```ts
interface QuestionPreviewResult {
  record_id: string;
  route_type: string;
  summaryLine?: string;
  questionSummary?: string;
  analysisData?: unknown;
  followUpQuestions?: string[];
}
```

要求：

1. 没有结构化字段时前端要有兜底提取逻辑。
2. 不因某一字段缺失导致结果页崩溃。

---

## 8. 数据资产落库要求

本期至少保证以下资产进入后台：

1. 原始问题文本
2. 事项意图分类
3. 补问信息
4. 初步结论摘要
5. 深推解锁状态
6. 追问链
7. 删除状态

优先使用现有记录体系，不新增大规模表。

---

## 9. 埋点

建议新增或核对以下事件：

| 事件 | 触发时机 |
|---|---|
| `question_entry_open` | 打开问事前台 |
| `question_first_submit` | 首问提交 |
| `question_clarify_shown` | 系统发出补问 |
| `question_clarify_submit` | 用户完成补问 |
| `question_preview_view` | 初步结论展示 |
| `question_deepen_click` | 点击深入推演 |
| `question_deepen_retry` | 深推失败后重试 |
| `question_followup_click` | 点击推荐追问 |
| `question_followup_submit` | 追问提交 |
| `question_history_reopen` | 从历史重开事项 |

---

## 10. 测试要求

### 10.1 前端验证

1. 首页点击问事后，在 modal 内直接进入首问。
2. 用户输入一句问题即可开始，不先显示完整八字表单。
3. 补问只按需出现。
4. 初步结论显示“问了什么”。
5. 深推失败可原地重试。
6. 追问后不新开记录。

### 10.2 后端验证

建议补充或核对：

- `consult/dialogue/__tests__/dialogue.service.spec.ts`
- `consult/clarification/__tests__/clarification.service.spec.ts`
- `consult/__tests__/pipeline-e2e.spec.ts`
- `consult/__tests__/integration/pipeline-integration.spec.ts`
- `consult/__tests__/followup/active-moves.spec.ts`

至少增加以下场景：

1. 问事首问创建记录并写入 `sourceEntry=question`
2. 补问后再次提交能合并上下文
3. `POST /consult/followup` 追问沿用原 `recordId`
4. 深推失败返回结构化错误，前端可原地重试
5. 批量删除历史记录只软删当前用户数据

### 10.3 构建验证

本期至少执行：

```bash
npm run build
```

如果有针对性测试脚本，可追加：

```bash
npm test -- consult
```

---

## 11. 风险与处理

### 风险 1：问事匿名首问与当前鉴权冲突

事实：

- `POST /consult/analyze` 当前挂了 `JwtAuthGuard`

影响：

- 问事若要像首页产品一样支持先问后登录，当前会被卡住

处理：

1. 先明确业务是否要求匿名首问
2. 如果要求，单列鉴权调整任务

### 风险 2：补问逻辑前后端各写一套

影响：

- 前台问的字段和后端判断必需字段不一致

处理：

1. 对齐 `clarification/slot-schema.ts`
2. 前台只做 UI 层编排，不自创另一套规则

### 风险 3：ResultPage 继续膨胀

影响：

- 结果页继续成为无法维护的巨型页面

处理：

1. 问事首屏卡片和追问块尽量拆子组件
2. 把前台状态留在 `FrontdeskChat`

---

## 12. 实施顺序

### Step 1

前台收口：

- `HomePage.tsx`
- `FrontdeskChat.tsx`
- `frontdeskConfigs.ts`
- `types.ts`

### Step 2

结果页收口：

- `ResultPage.tsx`
- `question/*` 相关组件

### Step 3

后端与记录：

- `consult.service.ts`
- `followup.service.ts`
- 相关 DTO / Prisma 写入逻辑

### Step 4

测试与验证：

- 前端手测
- 后端测试
- 构建验证

---

## 13. 验收清单

- [ ] 首页“问事”走统一对话前台
- [ ] 可直接自然语言首问
- [ ] 按需补问，不预铺完整表单
- [ ] 初步结论显示用户原问题摘要
- [ ] 深推失败支持原地重试
- [ ] 继续追问复用原 `recordId`
- [ ] 问题、补问、结果、追问写入后台
- [ ] 历史记录具备事项视角基础能力
- [ ] 不影响 `awkn.cn` 根主页，仅作用于 `/life`
