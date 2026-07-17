# 取名对话前台 V1 — 工程交接文档

> 日期：2026-06-24
> 状态：ACTIVE
> 上游 PRD：`docs/01产品定位与PRD/需求文档/PRD-取名对话前台V1-2026-06-24.md`
> 关联文档：
> - `docs/01商业计划/V1-V3阶段路线图-2026-06-24.md`
> - `docs/02开发PRD与工程文档/工程交接/ENGINEERING-三入口闭环修复与资产留存-20260517.md`
> 部署约束：只作用于 `awkn.cn/life`，不修改 `awkn.cn/` 根主页

---

## 1. 目标

本工程文档解决的不是“再做一个取名页面”，而是把现有取名链路收敛成一个高价值、可转化、可留存的统一前台闭环：

1. 首页点击“取名”后，直接在统一前台内完成场景分流。
2. 用户先定类型与方向，再补必要信息，不先掉进重表单。
3. 免费结果必须给出首轮候选与解释，不只是几个字。
4. 完整方案、再筛一次、导出和历史回看属于同一条连续链路。
5. 取名结果不能静默依赖假数据或未验证依据。
6. 取名偏好、候选、筛选动作和结果摘要写入后台，进入用户资产。

---

## 2. 当前代码事实

### 2.1 前端现状

已存在文件：

- `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx`
- `apps/AWKN-LABlife/app/src/components/frontdesk/frontdeskConfigs.ts`
- `apps/AWKN-LABlife/app/src/components/frontdesk/types.ts`
- `apps/AWKN-LABlife/app/src/components/naming/NamingPDFExport.tsx`
- `apps/AWKN-LABlife/app/src/components/naming/RenameComparison.tsx`
- `apps/AWKN-LABlife/app/src/components/naming/MultiRoundFilter.tsx`
- `apps/AWKN-LABlife/app/src/components/naming/BrandStrategy.tsx`

当前结论：

1. `FrontdeskChat.tsx` 里已经承载了大量取名逻辑，是当前取名前台主实现。
2. 现有 `naming` 流程已经具备多轮阶段，但状态仍然更像组件内部脚本，不是明确的产品状态机。
3. `types.ts` 里 `FrontdeskMode` 只有 `naming | question`，说明统一前台已成事实，不应再回到双前台分裂。
4. `NamingPDFExport.tsx`、`RenameComparison.tsx` 已显示出结果页存在导出、对比等能力，但不少计算仍带明显占位或随机模拟痕迹，不能作为最终可信度依据。

### 2.2 后端现状

已存在文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/calc-engine/naming-engine/naming-calculator.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.controller.ts`

当前结论：

1. 取名后端已具备八字排盘、五行分析、喜用神、LLM 输出、算法兜底、五格验证接口能力。
2. `QumingAgentService` 当前已有 `NamingCalculator` 注入与 `validateNameWuge` 路径，说明五格验证已经进入实现层，而不再只是未来规划。
3. 当前 `QumingAgentService` 里仍存在一些高风险点，需要在本期工程约束中明确禁止扩散到前台体验：
   - 姓氏默认成 `李`
   - 随机或模拟比较逻辑
   - 输出结构与真实验证能力不一致时的误导风险

---

## 3. 本期范围

### 3.1 必做

1. 首页取名入口统一接入 `FrontdeskChat mode="naming"`。
2. 取名前台支持三类场景：
   - 宝宝取名
   - 成人改名
   - 品牌取名
3. 前台支持“类型 → 方向 → 必要信息 → 首轮候选”的渐进式流程。
4. 免费结果展示至少 3 个候选和简短解释。
5. 完整方案承接会员或积分解锁。
6. 用户可以在结果后继续筛选风格，而不是重开流程。
7. 取名记录、偏好与结果摘要写入后台。
8. 明确结果可信度底线，避免前台把半成品依据包装成专业结论。

### 3.2 暂不做

1. 不新做独立取名产品线。
2. 不在本期补全全部命名算法能力。
3. 不在本期重做全套 PDF/报告系统。
4. 不在本期做专家人工审校台。
5. 不在本期做复杂品牌命名知识库编辑后台。

---

## 4. 目标状态机

取名前台状态机建议统一为以下 8 态：

```text
idle
→ selecting_type
→ setting_direction
→ collecting_details
→ submitting
→ preview_ready
→ refining
→ unlocked_full
```

### 4.1 状态定义

| 状态 | 含义 | 进入条件 | 退出条件 |
|---|---|---|---|
| `idle` | 前台刚打开 | 点击首页取名 | 用户开始操作 |
| `selecting_type` | 选择宝宝/成人/品牌 | 前台打开 | 用户完成类型选择 |
| `setting_direction` | 明确风格/目标 | 已选类型 | 用户完成方向选择 |
| `collecting_details` | 收必要结构化信息 | 方向已定 | 信息满足提交要求 |
| `submitting` | 正在请求首轮结果 | payload 完整 | 返回结果或错误 |
| `preview_ready` | 免费候选已生成 | 首轮成功 | 用户解锁/再筛/关闭 |
| `refining` | 基于首轮结果继续调整 | 用户点击再筛一次 | 返回新结果或取消 |
| `unlocked_full` | 完整方案已解锁 | 付费/积分成功 | 用户导出/保存/继续筛 |

### 4.2 关键原则

1. 不允许取名结果一开始就伪装成“完整专家结论”。
2. “方向选择”必须是显式状态，不能直接被埋进表单字段。
3. “再筛一次”必须复用上一轮结果与偏好，不应重开新流程。

---

## 5. 前端改造

### 5.1 首页入口

文件：

- `apps/AWKN-LABlife/app/src/pages/HomePage.tsx`

改造：

1. 取名入口统一只做一件事：设置 `activeFrontdesk='naming'`。
2. 首页不再以独立复杂页面作为取名主入口。
3. `/life/naming` 仅保留兼容路由，复用同一前台组件。

验收：

1. 首页点击取名后留在当前语境。
2. 兼容路由仍可独立打开。

### 5.2 统一前台组件

文件：

- `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx`
- `apps/AWKN-LABlife/app/src/components/frontdesk/frontdeskConfigs.ts`
- `apps/AWKN-LABlife/app/src/components/frontdesk/types.ts`

改造方向：

1. 将当前命名对话阶段显式化，不再依赖大量隐式局部状态拼装。
2. 当前代码已有：

```ts
type NamingPhase =
  | 'type'
  | 'surname'
  | 'gender'
  | 'expectation'
  | 'style'
  | 'analyzing'
  | 'result';
```

3. V1 建议扩展为更贴近产品语义的阶段：

```ts
type NamingPhase =
  | 'type'
  | 'direction'
  | 'details'
  | 'submitting'
  | 'preview'
  | 'refining'
  | 'full_result';
```

4. `frontdeskConfigs.naming` 补齐：
   - 场景介绍
   - 类型分流
   - 方向选项
   - 按场景收集字段策略
   - payload builder
   - refine handler
   - result handoff

验收：

1. 同一前台能覆盖宝宝、成人、品牌三类路径。
2. 用户不需要一开始就看完整表单。

### 5.3 结果与导出

文件：

- `apps/AWKN-LABlife/app/src/components/naming/NamingPDFExport.tsx`
- `apps/AWKN-LABlife/app/src/components/naming/RenameComparison.tsx`
- `apps/AWKN-LABlife/app/src/components/naming/MultiRoundFilter.tsx`
- `apps/AWKN-LABlife/app/src/components/naming/BrandStrategy.tsx`
- `apps/AWKN-LABlife/app/src/pages/ResultPage.tsx`

改造：

1. 免费版先显示首轮候选和简短解释。
2. 结果页要区分“首轮候选”与“完整方案”。
3. `RenameComparison.tsx` 中当前使用随机模拟的逻辑不可作为正式可信度展示依据，若保留必须降级为纯视觉占位或改为真实数据驱动。
4. `NamingPDFExport.tsx` 要求：
   - 免费仅预览
   - 会员/付费导出完整版本
   - 不展示未真实计算的随机评分

验收：

1. 结果页能清晰看懂推荐方向与候选理由。
2. 导出不放大半成品或随机数据问题。

### 5.4 结果后再筛一次

文件：

- `apps/AWKN-LABlife/app/src/components/naming/MultiRoundFilter.tsx`
- `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx`

改造：

1. 用户可以基于上一轮候选继续调风格、语气和用途。
2. 再筛一次应继承：
   - namingType
   - 方向偏好
   - 已输入信息
   - 上一轮候选

验收：

1. 用户不需要重新输入原始信息。
2. 历史里能看出这是一条连续筛选链。

---

## 6. 后端改造

### 6.1 首轮分析入口

文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.controller.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/consult.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts`

改造：

1. 继续使用现有咨询主链路进入 `routeType='quming'`。
2. 前端提交时写入：
   - `sourceEntry='naming'`
   - `namingType`
   - `namingPreferences`
   - 原始结构化输入
3. 首轮返回结果至少能支撑：
   - summaryLine
   - summaryBody
   - nameSuggestions
   - wuxingAnalysis
   - xiYongShen

### 6.2 可信度约束

文件：

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/quming-agent/quming-agent.service.ts`
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/calc-engine/naming-engine/naming-calculator.ts`

本期约束：

1. 任何降级结果都必须基于真实用户输入。
2. 不允许静默用假八字、假五行、假出生信息生成结果。
3. 当关键信息缺失时，前台必须把结果表述为“首轮方向建议”，而不是“完整定名方案”。
4. 若 `surname` 缺失，不应默认成固定姓氏后直接对用户展示而不提示。
5. 已经接入 `NamingCalculator` 的地方，展示层应优先使用真实五格结果，不应再叠加随机对比值。

### 6.3 结果结构

现有 `QumingOutput` 已包含：

```ts
{
  summaryLine;
  summaryBody;
  bazi;
  wuxingAnalysis;
  xiYongShen;
  nameSuggestions;
  risks;
  actions;
  llmFallback?;
  lowQuality?;
  qualityWarning?;
}
```

前端 V1 最少依赖这些字段：

```ts
interface NamingPreviewResult {
  summaryLine?: string;
  summaryBody?: string;
  nameSuggestions?: Array<{
    characters: string[];
    names: string[];
    reason: string;
    wuge?: {
      tiange: { num: number; wuxing: string; ji: boolean };
      renge: { num: number; wuxing: string; ji: boolean };
      dige: { num: number; wuxing: string; ji: boolean };
      waige: { num: number; wuxing: string; ji: boolean };
      zongge: { num: number; wuxing: string; ji: boolean };
      score: number;
    };
  }>;
  wuxingAnalysis?: unknown;
  xiYongShen?: unknown;
  qualityWarning?: string;
}
```

要求：

1. 前端不能假定所有候选都有 `score` 或完整 `wuge`。
2. 没有结构化评分时，前台应退回“方向 + 理由”展示，而不是显示占位高分。

---

## 7. 前后端契约

### 7.1 首轮提交 payload

建议前端统一结构：

```ts
interface NamingConsultPayload {
  routeType: 'quming';
  sourceEntry: 'naming';
  namingType: 'baby' | 'adult' | 'brand';
  surname?: string;
  originalName?: string;
  stylePreference?: string[];
  improveFocus?: string;
  industry?: string;
  targetAudience?: string;
  customDescription?: string;
  gender?: 'male' | 'female';
  birthDate?: string;
  birthTime?: string;
  avoidChars?: string[];
}
```

说明：

1. 三类场景字段不必一次性都出现。
2. 只在当前场景必要时收集并提交。
3. `namingPreferences` 可在服务端作为汇总 JSON 写入记录。

### 7.2 完整方案解锁

取名模块完整方案必须使用正确模块口径：

1. 不允许再误调用 `kline` 解锁。
2. 前端解锁必须显式走 `naming` 模块。
3. 余额、会员状态、管理员逻辑遵循现有会员服务规则。

---

## 8. 数据资产落库要求

本期至少保证以下资产进入后台：

1. 取名类型
2. 用户方向偏好
3. 结构化输入信息
4. 首轮候选摘要
5. 完整方案解锁状态
6. 再筛一次的调整动作
7. 导出/保存行为

优先复用现有记录表字段，不新增大规模表结构。

---

## 9. 埋点

建议新增或核对以下事件：

| 事件 | 触发时机 |
|---|---|
| `naming_entry_open` | 打开取名前台 |
| `naming_type_select` | 选择宝宝/成人/品牌 |
| `naming_direction_select` | 选择方向偏好 |
| `naming_first_submit` | 首轮提交 |
| `naming_preview_view` | 首轮候选展示 |
| `naming_refine_click` | 点击再筛一次 |
| `naming_full_unlock_click` | 点击完整方案 |
| `naming_pdf_export_click` | 点击导出或预览 |
| `naming_history_reopen` | 从历史重开取名事项 |

---

## 10. 测试要求

### 10.1 前端验证

1. 首页点击取名后，在统一前台内开始。
2. 用户先选类型和方向，再收必要字段。
3. 免费结果至少展示 3 个候选和简短解释。
4. 再筛一次继承前文上下文。
5. 完整方案解锁走 `naming` 模块。
6. 不展示明显随机伪数据作为正式结果。

### 10.2 后端验证

建议补充或核对：

- `quming-agent.service.ts` 相关单测
- `consult.service.ts` 中 `routeType='quming'` 的集成路径
- `NamingCalculator` 的五格验证单测

至少增加以下场景：

1. 不同 `namingType` 输入可生成不同方向结果
2. 姓氏缺失时不会静默伪装为真实用户姓氏结果
3. LLM 降级结果仍基于真实输入
4. `nameSuggestions` 缺少 `wuge` 时前端仍可安全展示
5. 取名记录写入 `sourceEntry/namingType/namingPreferences`

### 10.3 构建验证

本期至少执行：

```bash
npm run build
```

如有取名专项测试，可追加：

```bash
npm test -- quming
```

---

## 11. 风险与处理

### 风险 1：取名前台继续被写成重表单

影响：

- 用户体验和传统表单站没有差异

处理：

1. 类型和方向必须先显式出现
2. 结构化信息按场景分步收集

### 风险 2：结果可信度与前台表达脱节

影响：

- 用户会把“候选建议”误认为“完整命理验证结果”

处理：

1. 免费/完整方案表述必须分层
2. 不放大未真实计算的依据

### 风险 3：随机占位逻辑污染正式体验

事实：

- `RenameComparison.tsx` 当前存在随机生成原名分析与分数的逻辑

影响：

- 会直接伤害产品信任

处理：

1. 正式链路中去掉随机比较
2. 没有真实数据时只展示“待完整分析”或隐藏模块

---

## 12. 实施顺序

### Step 1

前台收口：

- `FrontdeskChat.tsx`
- `frontdeskConfigs.ts`
- `types.ts`

### Step 2

结果页收口：

- `ResultPage.tsx`
- `naming/*` 相关组件

### Step 3

后端可信度与记录：

- `quming-agent.service.ts`
- `consult.service.ts`
- `naming-calculator.ts`

### Step 4

测试与验证：

- 前端手测
- 后端专项测试
- 构建验证

---

## 13. 验收清单

- [ ] 首页“取名”走统一对话前台
- [ ] 先选类型和方向，再收必要字段
- [ ] 免费结果至少有 3 个候选和解释
- [ ] 继续筛选继承前文上下文
- [ ] 完整方案解锁走 `naming` 模块
- [ ] 结果不静默依赖假输入或随机对比数据
- [ ] 偏好、候选、结果摘要写入后台
- [ ] 不影响 `awkn.cn` 根主页，仅作用于 `/life`
