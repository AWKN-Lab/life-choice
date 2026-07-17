# ENGINEERING-P01｜命运K线与潮汐重构整改计划

> 日期：2026-07-12  
> 类型：开发整改工程文档  
> 对应产品文档：`PRD-命运K线V2升级-2026-06-24.md`（当前文内版本 v1.1）  
> 状态：待执行  
> 适用范围：`apps/AWKN-LABlife/app`、`apps/AWKN-LABlife/awkn-life-backend`  
> 核心原则：先修可信度和唯一真源，再改页面；不以增加图表、指标或入口代替产品闭环。

---

## 0. 执行结论

### 0.1 硬结论

当前“命运 K 线与人生潮汐”**没有完成 PRD 目标，也不具备作为项目差异化核心产品正式放量的条件**。

当前完成的是一批页面、接口、图表和局部跳转，不是完整用户价值闭环。主要问题不是视觉粗糙，而是：

1. 用户看见大量数据，却无法判断哪些来自命理算法、哪些来自模拟、哪些来自前端补值。
2. K 线和潮汐被做成两个近似产品，分别解释同一件事，增加认知负担。
3. 后端存在两套仍在运行的 K 线生成链路，前端又有一层本地判断，结论无法保证一致。
4. 首屏先展示解释卡、评分、压力支撑和内部术语，真正的趋势图反而被压到下方。
5. “问这个节点”已具备字段传递基础，但尚未形成可验证的记录、追问、结果、回看闭环。
6. 分享、历史版本、实际结果回写、七日回访等核心增长机制仍不完整。

### 0.2 当前完成度审计

以下为基于当前代码与 PRD 验收项的工程审计分，不是线上经营指标：

| 维度 | 审计完成度 | 判断 |
|---|---:|---|
| 页面与图表表面能力 | 75% | 页面丰富，但信息架构失焦 |
| 用户五秒理解 | 30% | 图表不在首屏，概念与模块过多 |
| 数据可信度与可解释性 | 25% | 模拟、补值、推断和真实来源边界不清 |
| 单一算法真源 | 20% | 两套后端 K 线 + 前端本地判断并存 |
| K 线到问事闭环 | 55% | 上下文字段已接入，真实全链路验收不足 |
| 免费到付费闭环 | 35% | 有权限结构，付费价值仍偏“看更多数据” |
| 分享与传播 | 25% | 有分享组件，但未形成公开预览与传播链路 |
| 历史、回看与个人资产 | 15% | 缺少 K 线版本、节点结果与验证回写 |
| 数据埋点与经营验证 | 25% | 仅覆盖少量动作，不能回答转化与回访问题 |
| 综合目标闭环 | 约 30% | 不可标记为 PRD 完成 |

### 0.3 必须停止的做法

在 P0、P1 通过前，暂停以下工作：

- 新增更多潮汐维度、雷达图、均线、命理因子卡。
- 把模拟数据包装为“真实数据”或“完整预测”。
- 再建一套 K 线页面、海报或独立潮汐入口。
- 用 LLM 生成数值后把它视为算法事实。
- 在没有版本、来源和证据链的情况下继续扩大付费范围。

---

## 1. 产品目标重新归口

### 1.1 用户购买的不是图表

用户真正需要的不是七条线、十二维雷达或股票术语，而是四个答案：

1. 我现在处于什么阶段？
2. 接下来一段时间整体向上、震荡还是回撤？
3. 哪个窗口值得行动，哪个窗口需要防守？
4. 我现在最小的一步是什么？

K 线的价值是把复杂术数转换成一个可见、可解释、可追问、可回看的时间坐标。任何不能服务这四个答案的内容都应降级到详情层或移除。

### 1.2 唯一产品名与概念层级

面向普通用户只保留一个产品：**命运 K 线**。

“人生潮汐”不再作为并列产品和独立心智入口，而是命运 K 线里的“当前状态层”：

- K 线：看未来 36 个月的阶段、趋势和关键节点。
- 当前潮汐：解释此刻的时、位、心是否支持行动。
- 问这个节点：把趋势节点带入问事对话，形成案例级推演。
- 历史回看：记录当时判断、用户行动和后续结果。

`/tide` 可以保留兼容路由，但消费者访问时应跳转到 `/kline?view=current`，不再维护第二套用户页面。

### 1.3 v1.1 产品边界

本轮只交付以下内容：

- 36 个月、按月粒度的命运 K 线。
- 总势、事业、财富、关系四条主线，其中首屏默认只显示总势。
- 当前阶段、一个机会窗口、一个风险窗口、一个行动建议。
- 当前潮汐三项：时机、位置、心态；没有证据时明确不输出。
- 节点解释与“问这个节点”。
- 一张统一分享卡。
- K 线版本历史和一次结果回看。

本轮明确不做：

- 0–100 岁人生全周期曲线。
- 七条主线同时首屏展示。
- 3 日、11 日、100 日股票均线。
- 未校验的 42 因子全量堆叠。
- 名人对比、紫微叠盘等扩展玩法。

月度数据不应使用“日线均线”概念。后续如需要平滑趋势，统一采用具有业务语义的时间窗：

- 3 个月短期动量。
- 12 个月年度基线。
- 36 个月阶段趋势。

---

## 2. 当前代码事实与问题归因

### 2.1 两套后端 K 线仍同时生效

链路 A：

```text
GET /api/v1/kline-tide/*
  -> KlineTideService
  -> KlineBar / StateSnapshot
  -> KlinePage / TidePage
```

链路 B：

```text
ConsultService
  -> KlineGenerator
  -> 0-100 岁年度线 + 年月细线
  -> 咨询结果模块
```

两条链路的时间范围、因子、分值和语义不同，却都叫“人生/命运 K 线”。这会导致同一用户在两个页面看到不一致结论。

### 2.2 前端承担了不该承担的业务判断

`KlinePage.tsx` 和 `TidePage.tsx` 中存在本地阶段、压力、支撑、信号、建议和综合判断函数。前端不只是渲染，而是在进行第三次业务计算。

后果：

- 后端改权重后，前端结论不一定同步。
- 同一接口在不同页面可能出现不同措辞和判断。
- 无法追踪某句话由哪个版本算法生成。
- 测试只能验证组件，不足以验证产品结论。

### 2.3 当前模拟数据制造了“伪完整”

`KlineTideService` 的模拟生成链路包含固定种子、趋势、周期波动和平滑处理；八字只参与部分均值与趋势调整。状态快照的多维值也来自类似生成逻辑。

`normalizeTidePackage.ts` 还会把缺失数值补成 50，并在缺失时间时使用客户端当前时间。结果是“未知”在页面上看起来像一组完整、刚生成的数据。

必须改为：

- 缺失就是 `null`，页面显示“暂无可验证数据”。
- 生成时间必须来自持久化记录，客户端不得伪造。
- 模拟数据只用于开发演示，不能进入正式用户历史和付费结果。
- 每个结论必须能追溯到来源、算法版本和证据项。

### 2.4 “真实数据”标签不真实

当前 UI 将 `real` 显示为“真实数据”，容易被理解为“真实命运事实”。正确语义只能是：

- `calculated`：基于已确认出生资料和确定性规则计算。
- `user_reported`：用户主动填写的真实事件或状态。
- `llm_narrative`：LLM 基于证据包生成的解释文字。
- `simulated`：开发或演示模拟，不进入正式结果。
- `unknown`：无法确认来源，禁止包装成正式结论。

### 2.5 页面先讲系统，后讲用户

当前 K 线页和潮汐页在图表前堆叠判断卡、评分、支撑压力、证据、仪表盘和维度控制。用户首先面对的是系统如何计算，而不是“我接下来怎样”。

此外页面中存在“来源：后端 TideJudgmentService”这类工程内部术语，必须从用户界面删除。

### 2.6 节点问事是“已接线，未完成验收”

当前代码已出现：

- `KlinePage` 构造 `klineQuestionContext`。
- `FrontdeskChat` 消费路由 state 并提交上下文。
- 前端 consult API 和后端 DTO 已包含 `targetDate`、`opportunityScore`、`riskScore` 等字段。
- Orchestrator 已具备 K 线阶段与潮汐状态的提示词层。

但仍缺少一条可审计的线上证据链：

```text
点击节点
-> 打开问事对话
-> 自动带入节点上下文
-> 创建真实 ConsultRecord
-> LLM 回答引用该节点证据
-> 结果页可回到原 K 线节点
-> 后台可查本次转化
```

因此只能标记为“代码接线完成，业务闭环未验收”，不能标记 PASS。

### 2.7 认证门槛与传播目标冲突

生产 `/tide` 未登录时只显示登录要求。对于承担传播和拉新作用的 K 线，完全登录墙会切断分享卡到产品体验的链路。

应调整为：

- 未登录用户可查看脱敏分享预览和示例。
- 登录后生成个人正式 K 线。
- 付费后解锁完整节点、三条领域线和历史比较。

---

## 3. 目标用户体验

### 3.1 首屏结构

首屏只保留以下内容，图表必须在第一视口内可见：

```text
命运 K 线
2026.07 - 2029.06 · 月度趋势 · 算法版本 vX

[当前阶段：蓄势 / 转折 / 推进 / 防守]
[未来 3 个月：震荡向上]

          36 个月总势趋势图

机会：2026.10-12  适合验证新方向
风险：2027.03-04  控制投入与承诺
现在：先完成一个低成本验证

[问这个机会] [分享]
```

首屏不得出现：

- 算法服务类名。
- 七条线同时展开。
- “纯算法”“calc-engine”等内部来源。
- 未经验证的支撑位、压力位、成交量。
- 大段命理术语。

### 3.2 第二层详情

按用户任务组织，不按技术模块组织：

1. 看领域：事业、财富、关系三条趋势切换。
2. 看节点：机会、风险、转折节点列表。
3. 看当下：当前潮汐的时、位、心。
4. 看依据：折叠展示大运、流年、五行、用户事实等证据。
5. 看历史：上次版本、实际发生、判断偏差。

### 3.3 免费与会员边界

| 能力 | 免费 | 会员 |
|---|---|---|
| 当前阶段 | 完整 | 完整 |
| 总势 36 个月曲线 | 完整 | 完整 |
| 机会/风险节点 | 各 1 个 | 全部节点 |
| 行动建议 | 1 条 | 分领域行动方案 |
| 事业/财富/关系 | 仅当前分值预览 | 完整曲线与解释 |
| 当前潮汐 | 三项摘要 | 完整依据与情景建议 |
| 问这个节点 | 1 次体验或积分扣除 | 按会员权益 |
| 历史比较 | 最近 1 次 | 全历史与复盘 |
| 分享卡 | 免费 | 免费，无水印增强版可后续评估 |

会员购买的是“更完整的解释、具体问题推演和长期回看”，不是更多随机线条。

---

## 4. 唯一数据与服务架构

### 4.1 目标链路

```text
出生资料 / 已确认命盘 / 大运流年
                   +
       用户真实事件与状态
                   |
                   v
       KlineCalculationEngine
       确定性规则与数值计算
                   |
                   v
       KlineSnapshotService
       版本、来源、证据、持久化
                   |
                   v
       KlineDecisionService
       阶段、窗口、节点、行动偏向
                   |
         +---------+---------+
         |                   |
         v                   v
  KlineProductViewModel   LLM Narrative
  前端唯一契约           只解释，不改数值
```

### 4.2 服务归口决策

推荐归口方式：

- 将现有 `KlineGenerator` 中可验证、确定性的时间因子抽取为 `KlineCalculationEngine`。
- 将 `KlineTideService` 收缩为持久化、查询和聚合服务，删除正式链路中的随机 seed 生成。
- `KlineDecisionService` 负责唯一产品判断，不允许页面自行计算阶段、支撑、压力和行动。
- `ConsultService` 不再独立生成另一套 0–100 岁 K 线；v1.1 统一调用同一决策包。
- 旧 0–100 岁数据只保留为 `legacy`，不与 v1.1 同屏，不写入新历史。

### 4.3 LLM 边界

LLM 可以：

- 把结构化证据转写为接近真人顾问的自然语言。
- 根据用户问题选择重点节点。
- 生成行动建议的表达和追问。

LLM 不可以：

- 修改算法分数、时间节点和来源。
- 生成没有证据的“真实状态”。
- 用自然语言掩盖缺失数据。
- 将模拟结果升级为正式结果。

### 4.4 统一返回契约

新增 `KlineProductViewModelV2`，前后端共享类型或通过 OpenAPI 生成类型：

```ts
interface KlineProductViewModelV2 {
  meta: {
    snapshotId: string;
    profileId: string;
    generatedAt: string;
    dataVersion: string;
    algorithmVersion: string;
    narrativeVersion?: string;
    sourceSummary: Array<'calculated' | 'user_reported' | 'llm_narrative'>;
    confidence: number | null;
    degraded: boolean;
  };
  horizon: {
    from: string;
    to: string;
    granularity: 'month';
  };
  current: {
    stage: 'accumulate' | 'advance' | 'turn' | 'defend' | 'unknown';
    trend: 'up' | 'sideways' | 'down' | 'unknown';
    summary: string;
    action: string;
  };
  series: {
    overall: KlinePoint[];
    career?: KlinePoint[];
    wealth?: KlinePoint[];
    relationship?: KlinePoint[];
  };
  windows: {
    opportunity: KlineNode[];
    risk: KlineNode[];
  };
  currentTide?: {
    timing: TideSignal | null;
    position: TideSignal | null;
    mindset: TideSignal | null;
  };
  entitlements: {
    canViewDomainLines: boolean;
    canViewAllNodes: boolean;
    canAskNode: boolean;
  };
  history?: {
    previousSnapshotId?: string;
    actualOutcomePending: boolean;
  };
}
```

每个 `KlinePoint` 和 `KlineNode` 必须包含 `evidenceRefs`、`source`、`confidence`，不得只返回一个无法解释的分数。

### 4.5 数据表建议

在现有 `KlineBar`、`StateSnapshot` 基础上优先做可迁移的版本层，不直接大拆表：

1. `KlineSnapshot`
   - `id`, `userId`, `profileId`, `generatedAt`
   - `dataVersion`, `algorithmVersion`, `status`
   - `sourceSummary`, `confidence`, `degradedReason`
   - `supersedesId`

2. `KlineNode`
   - `id`, `snapshotId`, `monthLabel`, `nodeType`
   - `score`, `summary`, `evidenceRefs`, `confidence`
   - `consultRecordId`, `askedAt`

3. `KlineOutcome`
   - `id`, `nodeId`, `userId`, `reportedAt`
   - `result`, `actualScore`, `notes`
   - `source = user_reported`

现有 `KlineBar`、`StateSnapshot` 增加 `snapshotId`，所有正式查询必须按 snapshot 读取，禁止仅按 userId 取“看似最新”的混合数据。

---

## 5. 分阶段执行计划

## Phase 0｜止住伪精确与文档漂移（1–2 天）

### 目标

让当前产品不再把缺失、模拟和工程信息包装成可信结论，为重构建立安全边界。

### 任务

| ID | 任务 | 文件/模块 | 验收 |
|---|---|---|---|
| P0-01 | 冻结 K 线/潮汐新增功能 | 产品与工程 | 本阶段只允许修正确性与收口 |
| P0-02 | 修正来源文案 | `TidePage.tsx`, `KlinePage.tsx` | 不再出现“真实数据=命运事实” |
| P0-03 | 删除工程内部文案 | `TidePage.tsx` | 用户界面不出现 Service、engine、source 内部名 |
| P0-04 | 禁止缺失值自动补 50 | `normalizeTidePackage.ts` | 缺失返回 `null` 并展示弱态 |
| P0-05 | 禁止客户端伪造 generatedAt | 同上 | 时间只来自服务端快照 |
| P0-06 | 模拟数据禁止进入正式历史 | `kline-tide.service.ts` | production 正式接口不返回 simulated 结果 |
| P0-07 | 高风险伪金融术语降级 | Kline 页面/服务 | 无证据时隐藏支撑、压力、成交量 |
| P0-08 | 修正文档状态 | P01、文档索引、任务 2 报告 | “组件通过”与“闭环通过”分开 |
| P0-09 | 建立功能开关 | backend env/config | 可独立关闭潮汐、节点解释、公开预览 |

### Gate P0

- 模拟数据不能被普通用户误认为正式结论。
- 空字段不会显示 50 或当前时间。
- 页面不泄露后端类名和内部来源。
- 文档不再将未验收链路标记 PASS。
- 前后端 build、类型检查通过。

## Phase 1｜统一算法真源与版本契约（3–5 天）

### 目标

同一用户、同一出生资料、同一时间范围只能生成一份可复现、可追踪的 K 线结果。

### 任务

| ID | 任务 | 文件/模块 | 验收 |
|---|---|---|---|
| P1-01 | 盘点两套算法字段与因子 | `kline.generator.ts`, `kline-tide.service.ts` | 形成字段映射与保留/删除表 |
| P1-02 | 抽取纯计算引擎 | 新 `KlineCalculationEngine` | 同输入重复运行结果一致 |
| P1-03 | 删除正式链路随机 seed | `KlineTideService` | production 无随机业务分数 |
| P1-04 | 建立 Snapshot/Node/Outcome 表 | Prisma schema + migration | 迁移可回滚，旧数据不丢 |
| P1-05 | 实现唯一 DecisionService | `kline-decision.service.ts` | 阶段、节点、行动只在后端生成 |
| P1-06 | 实现统一 ViewModel | controller/service/shared type | 页面只消费一个接口 |
| P1-07 | 咨询结果归口 | `consult.service.ts` | 不再独立生成第二套正式 K 线 |
| P1-08 | 0–100 岁链路标记 legacy | result module | v1.1 页面不再调用 |
| P1-09 | 建立证据 lineage | factor registry | 节点可追溯到规则与输入 |
| P1-10 | 建立黄金样例 | backend tests | 至少 20 例，覆盖节气/大运边界 |

### Gate P1

- 仓库中只有一个正式 K 线生成入口。
- 同一输入输出稳定，不因刷新变化。
- 每个正式节点都有 snapshotId、版本、来源、证据和置信度。
- LLM 关闭时数值与节点仍可完整生成。
- 咨询结果页与 K 线页读取同一 snapshot。
- migration、rollback、contract tests 全部通过。

## Phase 2｜重写用户首屏与节点问事（3–5 天）

### 目标

让用户五秒看懂趋势，并能从一个关键节点进入真实问事，不再面对两个重复仪表盘。

### 任务

| ID | 任务 | 文件/模块 | 验收 |
|---|---|---|---|
| P2-01 | 重构 KlinePage 信息架构 | `KlinePage.tsx` | 图表进入第一视口 |
| P2-02 | 潮汐并入 K 线 | `TidePage.tsx`, routes | `/tide` 跳到 K 线 current view |
| P2-03 | 只保留四条主线 | chart controls | 默认总势，会员展开三领域 |
| P2-04 | 统一节点卡 | Kline components | 机会、风险、转折采用同一结构 |
| P2-05 | 完成节点问事链路 | KlinePage/Frontdesk/backend | 产生真实 recordId 并绑定 nodeId |
| P2-06 | 结果返回原节点 | Result/frontdesk | 用户可从问事结果回到节点 |
| P2-07 | 重做权限弱态 | auth/entitlement | 不登录可看示例，登录生成正式结果 |
| P2-08 | 修复主题与响应式 | Kline/Tide/components | 浅色、深色、手机均可读 |
| P2-09 | 删除前端业务计算 | page helpers | 页面不再自行生成阶段和行动 |
| P2-10 | 可访问性与文案 | i18n/aria | 中英泰无内部术语和硬编码残留 |

### Gate P2

- 新用户无需解释可在五秒内说出当前阶段、趋势、机会、风险和行动。
- 375px、768px、1440px 无遮挡、横向溢出和黑白主题失真。
- 点击任一节点可以在统一对话框中完成问事，并生成真实记录。
- 一个用户在 K 线页、结果页、历史页看到的节点和分数一致。
- 未登录分享访问者有可理解的脱敏预览，不是空白登录墙。

## Phase 3｜分享、历史与经营闭环（3–5 天）

### 目标

让 K 线从一次性图表变成用户会分享、会回来验证的长期资产。

### 任务

| ID | 任务 | 文件/模块 | 验收 |
|---|---|---|---|
| P3-01 | 归并三个海报实现 | share components | 仅保留一个 KlineShareCard |
| P3-02 | 建立公开脱敏分享页 | route/API/token | 无登录可看摘要，不能泄露隐私 |
| P3-03 | 建立 K 线历史版本 | history/profile | 能比较本次与上次变化 |
| P3-04 | 建立节点结果回写 | KlineOutcome | 用户可标记发生/未发生/部分发生 |
| P3-05 | 建立回访提醒 | scheduler/message | 关键节点后触发一次回看 |
| P3-06 | 后台资产查看 | admin | 管理员可查 snapshot、节点、问事、结果 |
| P3-07 | 补全漏斗埋点 | analytics | 生成、展开、解锁、问事、分享、回访可统计 |
| P3-08 | 会员权益绑定 | membership/ledger | 权益、扣分、流水一致且可审计 |

### Gate P3

- 分享链接打开率、生成率、问事转化率可统计。
- K 线生成、节点问事、咨询结果、结果回写可通过 ID 串成一条链。
- 管理员后台可以查看所有正式资产及来源版本。
- 用户删除或导出数据时覆盖 K 线相关资产。
- 会员扣积分只有一个入口，失败不会产生半成品记录。

## Phase 4｜算法质量与案例校准（5–10 天，持续迭代）

### 目标

在不制造虚假精度的前提下，让曲线变化真正来自可解释的术数时间因子和用户事实。

### 任务

| ID | 任务 | 验收 |
|---|---|---|
| P4-01 | 建立因子字典和权重注册表 | 每个因子有定义、来源、适用范围和版本 |
| P4-02 | 接入大运、流年、流月的时间变化 | 曲线不是静态命盘分数加正弦波 |
| P4-03 | 事业/财富/关系分别定义证据 | 三条线不是同一总分换颜色 |
| P4-04 | 建立 20–50 个黄金案例 | 专家可逐节点复核 |
| P4-05 | 建立反例与边界案例 | 节气交界、出生时辰不确定、资料缺失可降级 |
| P4-06 | 接入用户实际事件 | 只作为 user_reported 层，不篡改出生算法事实 |
| P4-07 | 建立 LLM 叙事评测 | 忠于证据、自然度、行动性、禁忌项可评分 |
| P4-08 | 建立版本对比与回放 | 新算法可对旧 snapshot 回放，不静默覆盖 |

### Gate P4

- 黄金案例通过率达到约定阈值后才扩大公开流量。
- 任一结论可回答“为什么是这个月、为什么是这个方向”。
- 算法版本升级不会改写历史记录。
- LLM 输出不出现证据包 JSON、内部字段或无依据承诺。

---

## 6. 关键文件整改清单

### 前端

| 文件 | 动作 |
|---|---|
| `app/src/pages/KlinePage.tsx` | 拆分首屏、领域线、节点、依据、历史；删除本地业务判断 |
| `app/src/pages/TidePage.tsx` | 停止作为独立产品页，迁移为 K 线内当前状态组件 |
| `app/src/utils/normalizeTidePackage.ts` | 禁止补 50、补当前时间和伪完整数据 |
| `app/src/services/klineTideApi.ts` | 改为消费统一 V2 ViewModel |
| `app/src/hooks/useTidePackage.ts` | 合并到 `useKlineProduct`，统一加载/降级/权限状态 |
| `app/src/components/kline/KlineChart.tsx` | 去掉无依据 OHLC/成交量语义，保留趋势与节点表达 |
| `app/src/components/kline/KlineShareCard.tsx` | 作为唯一分享实现 |
| `app/src/components/frontdesk/FrontdeskChat.tsx` | nodeId、snapshotId、targetDate 随真实咨询提交 |
| `app/src/App.tsx` | `/tide` 兼容跳转与公开分享路由 |

### 后端

| 文件/目录 | 动作 |
|---|---|
| `src/kline-tide/kline-tide.service.ts` | 删除正式随机生成；收缩为查询、持久化、聚合 |
| `src/kline-tide/kline-decision.service.ts` | 升级为唯一产品判断服务 |
| `src/kline-tide/kline-scoring.service.ts` | 从骨架评分迁移到版本化因子计算 |
| `src/consult/generators/kline.generator.ts` | 抽取确定性计算核；停止第二套正式输出 |
| `src/consult/consult.service.ts` | 统一读取 snapshot，不再另算 0–100 岁正式线 |
| `src/consult/orchestrator/*` | 只消费结构化证据，生成解释文字 |
| `src/consult/dto/index.ts` | 增加 snapshotId、nodeId，完成白名单与校验 |
| `src/tide-inference/*` | 明确为 currentTide 推断层，不生成 K 线主数值 |
| `prisma/schema.prisma` | 增加 Snapshot、Node、Outcome 和外键 |

---

## 7. 测试与验收矩阵

### 7.1 单元测试

- 同输入同版本重复生成，结果完全一致。
- 空数据不会变成 50、当前时间或默认“恢复期”。
- simulated 数据在 production 被拒绝。
- 事业、财富、关系分别由不同因子集生成。
- LLM 不可覆盖 score、date、source、evidenceRefs。

### 7.2 契约测试

- 前后端共享 `KlineProductViewModelV2`。
- nullable 字段、枚举和版本字段严格一致。
- 老客户端读取 legacy 响应时得到明确升级提示，不静默错误。
- 权限响应区分未登录、无权益、服务降级和数据不足。

### 7.3 E2E 测试

必须覆盖：

1. 未登录打开分享链接 -> 看到脱敏摘要 -> 登录 -> 生成正式 K 线。
2. 免费用户生成 -> 看总势与一个节点 -> 点击会员内容 -> 权益提示正确。
3. 管理员余额不足 -> 自动补测试积分 -> 真实扣除 -> 打开完整内容。
4. 点击机会节点 -> 对话自动带入 -> 提交 -> 生成 ConsultRecord -> 结果引用节点。
5. 节点后回访 -> 用户填写结果 -> 后台可查。
6. LLM 超时 -> 保留算法结果 -> 允许局部重试，不刷新整页、不重复扣费。
7. 浅色/深色、手机/桌面、中英泰三语言验收。

### 7.4 生产验收

- `https://awkn.cn/` 根主页不受影响。
- `https://awkn.cn/life/` 三入口保持：命运 K 线、取名、问事。
- `/life/kline` 与 `/life/tide` 归口一致。
- API health、PM2、Nginx、SQLite integrity 正常。
- 数据迁移前后用户、咨询、积分和历史数量一致。
- 生产无 seed 写入、无模拟正式记录、无客户端伪造时间。

---

## 8. 经营指标与埋点

### 8.1 北极星关联

命运 K 线最终服务于：**完成有效咨询并在 7 天内回访的用户数**。

不能只统计页面 PV 和图表生成次数。

### 8.2 必须埋点

```text
kline_entry_viewed
kline_generation_started
kline_generation_succeeded
kline_generation_failed
kline_first_screen_understood
kline_domain_switched
kline_node_opened
kline_node_ask_clicked
kline_node_consult_created
kline_member_unlock_viewed
kline_member_unlocked
kline_share_created
kline_share_opened
kline_history_opened
kline_outcome_submitted
kline_revisit_completed
```

每个事件至少携带：`userId/anonymousId`、`snapshotId`、`algorithmVersion`、`sourceSummary`、`entitlement`、`lang`。

### 8.3 上线后观察指标

| 指标 | 含义 |
|---|---|
| 生成成功率 | 技术可用性 |
| 首屏到节点展开率 | 用户是否看懂并感兴趣 |
| 节点到问事转化率 | K 线是否带来高价值行为 |
| 免费到会员转化率 | 付费分层是否成立 |
| 分享生成率/打开率 | 是否具备传播价值 |
| 7 日回访率 | 是否成为长期产品而非一次性娱乐 |
| 结果回写率 | 是否沉淀可校准的数据资产 |

---

## 9. 发布与回滚策略

### 9.1 灰度开关

建议新增：

```text
KLINE_V2_ENABLED
KLINE_V2_PUBLIC_PREVIEW_ENABLED
KLINE_V2_NODE_ASK_ENABLED
KLINE_V2_OUTCOME_ENABLED
KLINE_SIMULATED_DATA_ALLOWED=false
```

### 9.2 灰度顺序

1. 管理员账号和内部测试用户。
2. 5% 已登录用户，只读生成。
3. 20% 用户，开放节点问事。
4. 50% 用户，开放分享与历史。
5. 全量，旧链路只读保留 14 天后下线。

### 9.3 回滚原则

- Snapshot 与旧表并行迁移，不原地覆盖历史。
- 前端可通过开关回退旧 Kline 页面。
- 新接口失败时只回退到“已有正式 snapshot”，不得回退模拟数据。
- 数据库 migration 必须提供 down/人工回滚脚本和备份验证。
- 部署只更新 `/life` 子站和对应后端，不修改 `awkn.cn/` 根主页。

---

## 10. 完成定义（Definition of Done）

只有以下条件全部满足，P01 才能标记完成：

- [ ] 普通用户五秒内理解阶段、趋势、机会、风险和行动。
- [ ] K 线与潮汐是一个产品，不再有两个重复心智入口。
- [ ] 后端只有一个正式 K 线计算入口。
- [ ] 前端不生成业务结论和默认业务数值。
- [ ] 每个节点都有版本、来源、证据、置信度和持久化 ID。
- [ ] simulated 数据不能进入生产正式结果、历史或付费链路。
- [ ] 36 个月曲线在 K 线页、咨询结果和历史页一致。
- [ ] 点击节点可生成真实问事记录，并能回到原节点。
- [ ] 未登录分享访问者能看到脱敏预览。
- [ ] 免费/会员差异围绕解释、推演和回看，不围绕随机指标数量。
- [ ] 只有一个分享实现，分享打开和后续转化可统计。
- [ ] 用户可回写实际结果，管理员可查看完整资产链。
- [ ] LLM 超时不刷新整页、不重复扣费、不破坏算法结果。
- [ ] 关键 E2E、迁移、回滚、浅深主题、移动端和多语言全部通过。
- [ ] PRD、文档索引、验收报告与当前代码状态一致。

---

## 11. 下一次开发应从哪里开始

第一轮不要重画页面。严格按以下顺序执行：

1. 完成 P0-02 至 P0-08，先消除伪真实、伪时间和文档假 PASS。
2. 输出两套 K 线字段/算法差异表，确定唯一计算核。
3. 定义并评审 `KlineProductViewModelV2`。
4. 建立 snapshot、node、outcome migration 和回滚脚本。
5. 让咨询结果与 K 线页面读取同一 snapshot。
6. 最后重构首屏，并把潮汐并入 K 线。

如果先改视觉，旧数据结构和双算法会再次迫使页面堆补丁，几天后仍会回到当前状态。

---

## 12. 本次审计证据范围

本计划基于 2026-07-12 本地工作区核验，重点检查：

- 当前 P01 PRD 与 CEO 目标。
- `KlinePage.tsx`、`TidePage.tsx`、`KlineChart.tsx`。
- `normalizeTidePackage.ts`、`klineTideApi.ts`。
- `kline-tide.service.ts`、`kline-decision.service.ts`、`kline-scoring.service.ts`。
- `consult/generators/kline.generator.ts` 与 `consult.service.ts`。
- 节点上下文的前端 API、Frontdesk、后端 DTO 与 orchestrator。
- Prisma 中现有 KlineBar、StateSnapshot 来源与版本字段。
- 生产未登录 `/tide` 的实际访问表现。

当前工作区存在大量与本计划无关的未提交修改。本轮只新增此文档，不回退、不覆盖任何既有改动。
