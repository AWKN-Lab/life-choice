# 人生决策宗师｜模块化产品架构 PRD v0.3（代码归口版）

> **文件路径沿用**：`PRD-人生决策宗师-模块化架构-v0.2-批判性重写.md`
> **正文版本**：v0.3
> **更新日期**：2026-07-07
> **状态**：ACTIVE / 产品总 PRD
> **代码基线**：当前本地工作树 + 2026-07-07 生产只读取证
> **上游战略**：`CEO目标与北极星指标-2026-06-24.md`、`V1-V3阶段路线图-2026-06-24.md`
> **生产事实**：`docs/02开发PRD与工程文档/工程交接/ENGINEERING-当前生产技术基线-20260707.md`

---

## 0. 总判断

当前项目已经拥有较完整的前端、后端、术数引擎、知识服务、用户资产、交易和运营代码。主要问题集中在三个方面：

1. **产品结构发散**：三条核心产品线与多个实验页面同时存在，主次关系不清。
2. **平台能力重复**：知识检索、状态机、结果生成等能力存在并行实现，归口不足。
3. **产品文档失焦**：旧版总 PRD 被 RuleMatcher、EvidenceComposer 等工程能力占据，缺少完整产品模块、用户闭环和业务边界。

本版采用统一结构：

```text
3 个核心产品模块
+ 4 个共享中台
+ 1 个实验区
```

```text
核心产品：命运K线 / 问事 / 取名
共享中台：用户资产 / 决策智能 / 商业权益 / 运营治理
实验区：妙算 / 枢密院 / 星图 / 通鉴 / 紫微独立页等
```

RuleMatcher、EvidenceComposer、KnowledgeRetriever、Agent、LLM Gateway 全部归入“决策智能中台”。它们服务产品结果，不单独定义产品方向。

---

## 1. PRD 文档归口

### 1.1 三个 PRD 文件夹的形成原因

| 目录 | 实际内容 | 当前判断 |
|---|---|---|
| `docs/01产品定位与PRD/` | 产品定位、模块 PRD、功能方案、决策记录 | **唯一产品 PRD 入口** |
| `docs/02产品需求 (PRD)/` | 仅 1 份知识库治理 PRD | 历史孤立目录，停止新增 |
| `docs/02开发PRD与工程文档/` | 工程交接、接口、数据库、部署、测试、技术参考 | 工程文档目录，名称中“PRD”容易造成误解 |

三个目录源于多轮开发中分别创建“产品需求”“工程任务”“治理计划”，缺少统一文档宪法，最终形成重复入口。

### 1.2 统一规则

后续产品文档只进入：

```text
docs/01产品定位与PRD/
├─ 产品定位/      产品总 PRD、定位、模块架构
├─ 需求文档/      单模块 PRD
├─ 功能方案/      方案探索、交互与内容方案
└─ 决策记录/      已拍板决策
```

`docs/02开发PRD与工程文档/` 只承载：

```text
工程交接 / API / 数据库 / 部署 / 测试 / 技术参考 / 角色执行规范
```

`docs/02产品需求 (PRD)/` 进入冻结状态，历史引用保留，新文档不得写入。

---

## 2. 产品定义

### 2.1 一句话定位

> 以命运K线呈现长期走势，以问事承接关键选择，以取名解决高价值命名需求，并持续沉淀个人命盘、关系、问题、结果和复盘记录的现代术数决策平台。

### 2.2 用户进入前的真实状态

用户通常处于以下状态：

1. 面临一件难以判断的事，希望降低决策成本。
2. 对未来趋势缺少坐标，希望看清阶段与节点。
3. 需要给孩子、个人或品牌命名，希望获得有依据的选择。
4. 过去问过很多次，结果散落、无法回看，也无法验证。
5. 对传统术数存在兴趣，同时担心模板化、玄虚和缺乏证据。

### 2.3 产品交付结果

用户完成一次体验后，应获得：

```text
一个清晰判断
一组可追溯依据
一份可执行建议
一个可回看的事项记录
一个可继续追问和复盘的长期档案
```

### 2.4 战略主轴

```text
命运K线：差异化与传播
问事：高频使用与决策转化
取名：高价值付费与分享
用户资产：复访与长期价值
```

### 2.5 北极星指标

> 7 日内完成一次有效咨询并再次回访的用户数。

一级指标：

1. 命运K线生成率、分享率、回看率。
2. 问事首问完成率、深推率、追问率。
3. 取名完整链路完成率、付费率、分享率。
4. 历史记录可回看率、复访率。
5. 结果异常率、主流程中断率、知识检索超时率。

---

## 3. 当前代码事实

### 3.1 已存在的产品前台

| 产品/页面 | 前端路由 | 当前代码入口 |
|---|---|---|
| 首页 | `/` | `HomePage.tsx` |
| 问事 | `/question` | `FrontdeskChat mode="question"` |
| 取名 | `/naming` | `FrontdeskChat mode="naming"` |
| 命运K线 | `/kline` | `KlinePage.tsx` |
| 人生潮汐 | `/tide` | `TidePage.tsx` |
| K线对比 | `/kline-compare` | `KlineComparePage.tsx` |
| 统一结果 | `/result/:recordId` | `ResultPage.tsx` |
| 历史记录 | `/history` | `HistoryPage.tsx` |
| 用户档案 | `/profile` | `ProfilePage.tsx` |
| 会员/价格 | `/membership`、`/pricing` | `MembershipPage.tsx`、`PricePage.tsx` |
| 回访 | `/followup/:followUpId` | `FollowUpPage.tsx` |

当前首页已把 `kline / naming / question` 作为三类主要入口，产品战略与代码入口基本一致。

### 3.2 已存在的核心后端能力

| 能力 | 当前代码 |
|---|---|
| 咨询主链 | `consult/`、`POST /api/v1/consult/analyze` |
| 多轮对话 | `consult/dialogue/` |
| 回访 | `consult/followup/` |
| 张半山调度 | `consult/orchestrator/zhangbanshan-scheduler.service.ts` |
| 意图路由 | `intent-router.service.ts`、前端 `intentRouter.ts` |
| 确定性计算 | `calc-engine/` |
| 术数 Agent | `ziping / liuren / liuyao / qimen / meihua / ziwei / quming-agent` |
| 规则匹配 | `orchestrator/rule-matcher/` |
| 证据合成 | `orchestrator/evidence-composer/` |
| 知识检索 | HTTP 知识服务 + 静态规则检索两套实现 |
| LLM 路由 | `llm-gateway/`、`llm-providers/` |
| 质量与安全 | `quality-gate`、`guardrails`、`high-risk-detector` |
| K线/潮汐 | `kline-tide/`、`tide-inference/` |
| 会员交易 | `membership/`、`payment/`、`growth/` |
| 用户资产 | `user/`、`user-profile/`、`saved-case/`、`chronicle/` |
| 运营治理 | `analytics/`、`feedback/`、`feature-flags/`、`admin/`、`mingli-bench/` |

### 3.3 已存在的核心数据对象

```text
User
BaZiProfile
UserMemory
PersonProfile
PersonProfileRecord
ConsultRecord
ConsultDialogue
ConsultFollowUp
NamingResult
KlineBar
StateSnapshot
EvidencePacket
GenerationRun
KnowledgeHit
InteractionEvent
SavedCase
ChronicleEntry
Membership
CreditLedger
Order
```

### 3.4 旧版 PRD 已失效的判断

旧版文档中以下结论已经过期：

1. RuleMatcher 已存在并注册到 Orchestrator。
2. EvidenceComposer 已存在并接入张半山调度。
3. KnowledgeRetriever 已存在两套实现，当前任务是归口和性能治理。
4. 六爻、六壬、梅花、奇门、紫微、子平、取名 Agent 均已有 Service。
5. AgentRunLogger 已存在。
6. 六壬已具备确定性 Calculator 与规则资产。
7. 知识服务生产已加载 1,135 本书、329,577 条片段。

当前缺口集中在：

```text
能力归口
主链稳定
数据迁移
结果可追溯
商业闭环
实验模块治理
```

### 3.5 当前关键技术债

| 问题 | 代码事实 | 产品影响 |
|---|---|---|
| 双知识检索 | HTTP:8701 与静态 JSON 检索并存 | 结果口径、性能与维护成本不统一 |
| 多状态机 | NodeStateMachine、UnifiedStateMachine、前端 Zustand 状态并存 | 问事流程容易分叉 |
| 前端多路径 | `/consult` 与 `/question` 同时存在，Question 还包含临时草稿回退 | 数据记录和结果路径不稳定 |
| 数据库漂移 | 本地 35 models / 8 migrations，生产 33 models / 5 migrations | DialogueTurn、MemoryEmbedding 无法生产落表 |
| 审计数据空 | `GenerationRun=0`、`KnowledgeHit=0` | 结果质量无法完整复盘 |
| 知识检索慢 | 向量和混合检索约 10–15 秒 | 主咨询链超时风险高 |
| 路由过多 | 多个实验页面已进入 App Routes | 用户认知和产品主线被稀释 |

---

## 4. 模块化产品架构

### 4.1 总体结构

```text
┌─────────────────────────────────────────────┐
│                三个核心产品模块              │
│   命运K线          问事          取名         │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│                 用户资产中台                 │
│ 身份 / 命盘 / 人物 / 事项 / 历史 / 记忆 / 回访 │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│                 决策智能中台                 │
│ 路由 / 计算 / Agent / 规则 / 证据 / 知识 / LLM │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│             商业权益中台 + 运营治理中台       │
│ 会员 / 积分 / 支付 / 增长 / 埋点 / 反馈 / 后台 │
└─────────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────┐
│                    实验区                    │
│ 妙算 / 枢密院 / 星图 / 通鉴 / 紫微独立页       │
└─────────────────────────────────────────────┘
```

### 4.2 模块分组

| 分组 | 模块 | 用户可见 | 产品职责 |
|---|---|---:|---|
| 核心产品 | 命运K线、问事、取名 | 是 | 直接交付用户结果 |
| 用户资产中台 | 身份、命盘、人物、事项、历史、记忆、回访 | 部分 | 形成长期档案和复访基础 |
| 决策智能中台 | 路由、计算、Agent、规则、证据、知识、LLM、质量 | 否 | 提供统一判断能力 |
| 商业权益中台 | 会员、积分、订单、支付、权益 | 部分 | 承接付费和复购 |
| 运营治理中台 | 埋点、反馈、Feature Flag、后台、评测 | 内部 | 提升质量和经营效率 |
| 实验区 | 妙算、枢密院、星图、通鉴、紫微独立页 | 灰度 | 验证未来产品形态 |

---

## 5. 核心产品模块

## 5.1 模块 P01：命运K线 / 人生潮汐

### 模块定位

> 把抽象的长期运势转成可观看、可比较、可回看、可传播的人生趋势产品。

### 用户任务

1. 看清当前处于什么阶段。
2. 找到上升、承压、转折和窗口节点。
3. 对比事业、财富、关系、健康等维度。
4. 保存并持续回看自己的长期变化。

### 当前代码

```text
前端：/kline、/tide、/kline-compare
后端：kline-tide/、tide-inference/
数据：KlineBar、StateSnapshot
接口：bars / snapshots / phase-points / package / scores / node-explanation / current-stage
```

### 输入

```text
用户身份
出生信息
命盘数据
时间范围
历史状态数据
咨询与行为数据（后续增强）
```

### 输出

```text
阶段判断
趋势图
关键节点
多维分数
节点解释
行动建议
分享资产
```

### 当前状态

| 能力 | 状态 |
|---|---|
| K线与潮汐页面 | 已存在 |
| KlineBar / StateSnapshot | 生产已有数据 |
| 当前阶段接口 | 已映射 |
| 分数与解释接口 | 已映射 |
| 数据生成依据 | 需要建立可审计说明 |
| 用户真实行为反馈 | 尚未稳定进入计算 |
| 分享与付费承接 | 需要产品收口 |

### 下一阶段收口

1. 明确每一条线和每一个分值的数据来源。
2. 区分命理预测数据、用户真实数据、系统推断数据。
3. 统一 `/kline` 与 `/tide` 的关系：K线看走势，潮汐看阶段和行动。
4. K线结果写入统一历史和用户资产。
5. 形成免费预览、完整趋势、专题分析、长期回看四级权益。
6. 禁止生产前台调用无保护的 `seed` 写入能力。

### 核心指标

```text
生成完成率
分享率
7日回看率
付费解锁率
节点解释点击率
K线进入问事的转化率
```

---

## 5.2 模块 P02：问事

### 模块定位

> 承接用户当下最在意的一件事，给出有依据、有边界、有行动路径的判断。

### 用户任务

1. 把复杂问题说清楚。
2. 获得当前判断、前提、代价和建议。
3. 对关键疑点继续追问。
4. 保存事项，并在后续节点回看结果。

### 当前主流程

```text
/question
→ 输入问题
→ 意图识别
→ 补充出生信息 / 起念时间 / 澄清信息
→ POST /consult/analyze
→ 张半山调度
→ 计算 + Agent + 规则 + 知识 + LLM
→ /result/:recordId
→ 追问 / 深推 / 回访 / 历史
```

### 当前代码

```text
前端：FrontdeskChat(question)、ResultPage、HistoryPage、FollowUpPage
后端：consult、orchestrator、dialogue、followup、safety、classifier
能力：CalcEngine、Agent、RuleMatcher、EvidenceComposer、KnowledgeRetriever、LLM Gateway
数据：ConsultRecord、ConsultDialogue、ConsultFollowUp、EvidencePacket、InteractionEvent
```

### 输入

```text
问题文本
用户身份与命盘
人物档案
起念时间与地点
历史咨询和记忆
用户选择的术数路线（可选）
```

### 输出

```text
一句主判断
成立前提
代价与风险
证据摘要
行动建议
时间窗口
后续追问入口
复盘节点
```

### 当前状态

| 能力 | 状态 |
|---|---|
| 对话式问事入口 | 已接入 |
| 意图路由与澄清 | 已接入 |
| 多 Agent 调度 | 已接入 |
| 规则与证据链 | 已有代码，需统一审计 |
| 结果页与模块解锁 | 已接入 |
| 多轮对话 | 已有代码，生产缺少 DialogueTurn 表 |
| 记忆向量 | 已有代码，生产缺少 MemoryEmbedding 表 |
| 临时草稿回退 | 前端仍存在，需清理 |
| GenerationRun / KnowledgeHit | 生产无数据，审计闭环未形成 |

### 下一阶段收口

1. `/question` 成为唯一首问入口，`/consult` 降级为兼容路由。
2. 取消生产主链的临时 recordId 和静态草稿结果。
3. 统一前后端状态机和阶段命名。
4. 每次分析生成真实 `recordId`、`EvidencePacket`、`GenerationRun`、`KnowledgeHit`。
5. 完成 DialogueTurn 与 MemoryEmbedding 生产迁移。
6. 结果页统一采用：判断、依据、风险、行动、窗口、追问。
7. 深推、追问、回访持续挂在同一个事项主键上。

### 核心指标

```text
首问提交率
分析完成率
结果读取率
追问率
深推转化率
7日回访率
异常兜底率
知识检索超时率
```

---

## 5.3 模块 P03：取名

### 模块定位

> 面向宝宝、成人改名和品牌命名，提供有命理依据、有审美方向、有选择框架的命名服务。

### 用户任务

1. 说明命名对象和背景。
2. 明确希望改善或表达的方向。
3. 获得候选名称、依据、风险和选择建议。
4. 导出、分享、回看完整报告。

### 当前流程

```text
/naming
→ 选择宝宝 / 成人 / 品牌
→ 录入姓氏、原名或行业
→ 选择性别、目标、风格
→ QumingAgent 分析
→ 展示候选 Top 3
→ 查看完整报告 / PDF / 历史
```

### 当前代码

```text
前端：FrontdeskChat(naming)、NamingPDFExport、ResultPage
后端：quming-agent、consult
数据：NamingResult、ConsultRecord
接口：consult/analyze、consult/naming/history
```

### 输入

```text
命名类型
姓氏 / 原名 / 行业
出生信息
性别
目标方向
风格偏好
补充描述
```

### 输出

```text
候选名称
五行与喜用依据
音形义说明
生肖与禁忌提示
风格匹配
选择建议
完整报告
```

### 当前状态

| 能力 | 状态 |
|---|---|
| 三类命名分流 | 已接入 |
| 对话式信息采集 | 已接入 |
| QumingAgent | 已接入 |
| 算法与 LLM 双路径 | 已实现 |
| Top 3 与 PDF | 已接入 |
| 取名历史接口 | 已映射 |
| 专属交易产品 | 尚未形成统一商品与权益 |
| 结果质量基线 | 需要独立评测集 |

### 下一阶段收口

1. 取名全链共用统一 `recordId` 和结果数据结构。
2. 宝宝、成人、品牌保留独立输入 Schema，复用同一前台壳。
3. 候选名必须包含选择理由、适用边界和淘汰理由。
4. 完整报告进入历史、收藏和分享。
5. 建立取名专属商品、价格和交付边界。
6. 建立重名、禁忌、音韵、字义、五行和商业可用性的质量闸门。

### 核心指标

```text
信息采集完成率
结果生成率
候选收藏率
完整报告查看率
PDF导出率
付费率
分享率
```

---

## 6. 用户资产中台

### 6.1 模块组成

| 模块 | 代码/数据 | 职责 |
|---|---|---|
| 身份与认证 | `auth/`、`User`、`Session` | 用户身份和权限 |
| 基础档案 | `user/`、`BaZiProfile` | 出生信息、命盘和基础资料 |
| 人物档案 | `PersonProfile`、`PersonProfileRecord` | 关系人和关联事项 |
| 咨询资产 | `ConsultRecord`、`NamingResult`、`KlineBar` | 三大产品结果 |
| 历史与收藏 | `HistoryPage`、`SavedCase` | 回看、收藏、删除 |
| 多轮与回访 | `ConsultDialogue`、`ConsultFollowUp` | 连续对话和节点提醒 |
| 记忆 | `UserMemory`、`MemoryEmbedding` | 长期上下文 |
| 编年史 | `ChronicleEntry`、`UserInsightProfile` | 事件复盘和长期洞察 |

### 6.2 统一资产主键

```text
userId       用户
profileId    人物档案
recordId     一次咨询/命名/专题结果
moduleId     结果中的专题模块
dialogueId   连续对话
followUpId   回访任务
orderId      交易
```

### 6.3 归口规则

1. 三个核心产品必须写入统一用户资产。
2. 追问、深推、回访挂在原 `recordId`，避免生成孤立记录。
3. 人物档案只保存稳定身份信息，事项变化写入记录。
4. 记忆由明确规则写入，支持遗忘、更新和用户删除。
5. 编年史从真实记录和复盘产生，禁止直接制造“人生结论”。

### 6.4 当前优先事项

1. 完成生产数据库三份缺失迁移。
2. 历史页按“人物—事项—时间”组织。
3. 统一 Question、Naming、Kline 的记录结构和来源字段。
4. 清理只存在于前端 Store 的核心业务数据。
5. 为用户提供查看、修改、删除和导出能力。

---

## 7. 决策智能中台

### 7.1 能力链

```text
输入理解
→ 风险与缺失信息检测
→ 术数路线选择
→ 确定性计算
→ Agent 分析
→ 规则命中
→ 知识检索
→ 证据合成
→ 冲突仲裁
→ LLM 表达
→ 质量校验
→ 结构化结果
```

### 7.2 模块清单

| 模块 | 当前代码 | 目标边界 |
|---|---|---|
| 意图路由 | 前端 `intentRouter` + 后端 `IntentRouterService` | 后端成为最终路由真源 |
| 用户分类 | `UserStateClassifierService` | 只影响交互和提示词，不改命理事实 |
| 安全检测 | `HighRiskDetectorService`、Guardrails | 高风险优先拦截 |
| 确定性计算 | `CalcEngineService`、各 Calculator | 输出事实数据，不输出营销话术 |
| Agent | 七类 Agent Service | 产出术数分析和结构化结果 |
| RuleMatcher | `rule-matcher/` | 从计算结果命中结构化规则 |
| KnowledgeRetriever | HTTP + 静态检索 | 收敛为统一检索契约 |
| EvidenceComposer | `evidence-composer/` | 合成可追溯证据包 |
| Orchestrator | 张半山 Scheduler + Orchestrator | 调度、仲裁、上下文和降级 |
| LLM Gateway | `llm-gateway/`、`llm-providers/` | 模型选择、成本和降级 |
| Writing Pipeline | `writing-pipeline/` | 将证据转成稳定表达 |
| Quality Gate | QualityGate、LayerRepair、MingLi Bench | 校验完整性、事实和风格 |

### 7.3 必须收敛的重复实现

#### A. 知识检索

当前两套：

```text
旧版：Prisma + HTTP 8701
新版：EvidenceComposer 内静态 JSON
```

目标契约：

```ts
retrieve({
  systemType,
  question,
  ruleCodes,
  chartFacts,
  limit,
  retrievalMode
}) => {
  hits,
  latencyMs,
  sourceVersion,
  degraded
}
```

所有 Agent 和 Orchestrator 只调用统一接口。

#### B. 状态机

当前存在：

```text
NodeStateMachineService
UnifiedStateMachineService
前端 Zustand / Frontdesk phase
```

目标：

```text
后端管理业务状态
前端管理展示状态
同一状态字典
同一迁移规则
同一 recordId
```

#### C. 结果格式

当前三段式、五层输出、六段降级、14 段骨架并存。

目标统一为一个 ResultEnvelope：

```ts
interface ResultEnvelope {
  summary: {
    judgment: string;
    premise: string;
    cost: string;
  };
  evidence: EvidenceItem[];
  risks: RiskItem[];
  actions: ActionItem[];
  timeWindows: TimeWindow[];
  modules: ResultModule[];
  followUp: FollowUpConfig;
  audit: {
    recordId: string;
    routeType: string;
    sourceVersion: string;
    fallback: boolean;
  };
}
```

前台按模块渲染，后端只维护一份事实结构。

### 7.4 质量原则

1. 可计算事实由 Calculator 提供。
2. 规则结论必须携带 `ruleCode`。
3. 经典引用必须携带 `sourceId`。
4. LLM 负责融合、解释和行动语言。
5. 降级结果必须标记 `fallback`。
6. 每次生成应记录 GenerationRun 和 KnowledgeHit。
7. 结论强度与证据强度一致。

---

## 8. 商业权益中台

### 8.1 当前代码

```text
membership/
payment/
growth/
CreditLedger
Membership
Order
Invite
Referral
GrowthOffer
```

### 8.2 产品职责

| 能力 | 用户结果 |
|---|---|
| 免费体验 | 低门槛看见价值 |
| 单次解锁 | 解决当前一件具体问题 |
| 会员 | 获得持续使用和回看权益 |
| 积分 | 统一核算使用成本和赠送权益 |
| 支付 | 安全完成购买和退款 |
| 邀请增长 | 通过分享带来新用户和奖励 |

### 8.3 权益按产品模块定义

#### 命运K线

```text
免费：基础趋势与一个关键节点
单次：完整周期、多维走势、节点解释
会员：持续更新、回看、专题趋势
```

#### 问事

```text
免费：浅层初判
单次：完整证据、深推、行动路径
会员：追问额度、回访、长期档案
```

#### 取名

```text
免费：方向确认和少量候选
单次：完整候选、筛选逻辑、报告
会员：后续调整、对比和历史保存
```

### 8.4 当前优先事项

1. 建立统一产品 SKU 和权益字典。
2. 解锁记录必须绑定 `recordId + moduleId`。
3. 支付成功、积分扣减、权益发放形成幂等事务。
4. 前台价格表达只写用户获得的结果。
5. 管理后台可追溯订单、权益和使用记录。

---

## 9. 运营治理中台

### 9.1 模块

| 模块 | 当前代码 | 用途 |
|---|---|---|
| Analytics | `analytics/` | 页面、漏斗、留存和行为 |
| Feedback | `feedback/` | 用户反馈和校准 |
| Feature Flags | `feature-flags/` | 灰度和快速关闭 |
| Admin | `admin/` | 用户、记录、成本和异常 |
| MingLi Bench | `mingli-bench/` | 模型、Agent 和类别评测 |
| Guardrails | `guardrails/` | 安全、注入和质量边界 |

### 9.2 最小经营看板

```text
三入口访问量
三入口完成率
结果读取率
追问/深推/支付率
7日回访率
分享率
LLM失败率
知识检索耗时
主流程5xx
单次生成成本
```

### 9.3 反馈闭环

```text
用户反馈
→ 绑定 recordId
→ 识别算法 / 知识 / 表达 / 交互问题
→ 形成校准建议
→ 灰度发布
→ MingLi Bench 回归
→ 生产指标复核
```

---

## 10. 实验区治理

### 10.1 当前实验页面

| 页面 | 路由 | 后端模块 | 当前定位 |
|---|---|---|---|
| 妙算 | `/miaosuan` | `miaosuan/` | 快速单事原型 |
| 枢密院 | `/shumiyuan` | `shumiyuan/` | 复杂决策工作流原型 |
| 星图 | `/xingtu` | `star-chart/` | 人物关系网络原型 |
| 通鉴 | `/tongjian` | `chronicle/` | 长期事件复盘原型 |
| 紫微独立页 | `/ziwei` | Ziwei Agent / Engine | 独立术数入口原型 |

### 10.2 实验模块晋级条件

满足全部条件后，才可进入首页核心导航：

1. 有清晰且独立的用户任务。
2. 结果无法由三大核心模块自然承接。
3. 使用统一身份、recordId、历史和权益系统。
4. 具备生产接口、错误处理和测试。
5. 有明确的使用、复访或付费指标。
6. 连续灰度验证达到预设门槛。
7. 不新增第二套用户档案、状态机或结果页。

未达标模块保留实验入口或内部入口。

---

## 11. 路由治理

### 11.1 核心公开路由

```text
/
/question
/naming
/kline
/tide
/result/:recordId
/history
/profile
/membership
/pricing
/followup/:followUpId
```

### 11.2 兼容路由

```text
/consult
/info
/result
/kline-intro
/landing
```

处理原则：

1. 新流量统一进入核心路由。
2. 兼容路由只做重定向或旧链接承接。
3. 禁止兼容路由继续发展独立业务逻辑。

### 11.3 实验与内部路由

```text
/miaosuan
/shumiyuan
/tongjian
/xingtu
/ziwei
/admin
```

实验路由默认不占用首页核心位置。

---

## 12. 模块边界规则

### 12.1 产品模块可以拥有

```text
用户入口
专属输入 Schema
专属结果模块
专属指标
专属商品与权益
```

### 12.2 产品模块不得拥有

```text
独立用户体系
独立支付体系
独立历史体系
独立知识检索
独立 LLM Provider
独立安全规则
第二套结果主键
```

### 12.3 中台模块不得拥有

```text
首页主入口
独立产品品牌
与产品模块竞争的用户流程
无法追溯的数据写入
```

### 12.4 新模块立项五问

1. 服务哪个核心用户任务？
2. 强化命运K线、问事、取名中的哪一条？
3. 复用哪些中台能力？
4. 产出进入哪个用户资产？
5. 用什么指标判断有效？

五问无法回答完整，需求进入实验区或停止立项。

---

## 13. 当前阶段优先级

## P0：结构收口与生产一致

1. 本 PRD 成为产品总入口。
2. 产品 PRD 归口到 `docs/01产品定位与PRD/`。
3. 完成生产 Prisma 三份缺失迁移的独立验证与发布。
4. `/question` 归口首问流程，清理临时草稿回退。
5. 统一状态机字典和 ResultEnvelope。
6. 统一 KnowledgeRetriever 契约。
7. 为核心结果写入 GenerationRun 和 KnowledgeHit。
8. 明确实验路由状态，停止继续扩大首页入口。

## P1：三大产品闭环

### 命运K线

1. 数据来源说明和审计。
2. K线、潮汐、节点解释的结构统一。
3. 分享、回看、付费承接。

### 问事

1. 首问、补问、深推、追问、回访共用事项主键。
2. 证据、风险和行动结构稳定。
3. 知识检索性能进入主链门槛。

### 取名

1. 三类命名输入 Schema 稳定。
2. 候选筛选和淘汰依据完整。
3. 完整报告、历史、支付和分享闭环。

## P2：长期资产与复访

1. MemoryEmbedding 生产落地。
2. 人物—事项—时间历史视图。
3. 编年史和复盘进入真实记录链。
4. 回访提醒与阶段变化联动。
5. 用户数据删除、导出和隐私边界完善。

## P3：商业增长与实验晋级

1. 统一 SKU、会员和积分权益。
2. 邀请、分享和奖励归因。
3. 妙算、枢密院、星图、通鉴按晋级条件评估。
4. 紫微保留为能力中台，独立产品入口由真实数据决定。

---

## 14. 验收标准

### 14.1 文档验收

- [ ] 产品总 PRD 只有一个 ACTIVE 入口。
- [ ] 每个核心产品有独立模块 PRD。
- [ ] 工程文档只描述实现、接口、数据库、测试和部署。
- [ ] 历史 PRD 标注 ACTIVE / REFERENCE / DEPRECATED。
- [ ] 文档索引与 Knowledge Map 指向统一目录。

### 14.2 产品验收

- [ ] 首页清楚展示命运K线、问事、取名三条主线。
- [ ] 三条主线各自拥有完整输入、结果、历史和后续动作。
- [ ] 用户在任何核心模块中使用同一身份和档案。
- [ ] 实验模块不干扰主导航和主转化。

### 14.3 工程验收

- [ ] 核心产品无静态 Mock 结果进入生产主链。
- [ ] 每次结果拥有真实 recordId。
- [ ] 前后端状态字典一致。
- [ ] KnowledgeRetriever 只有一个公共契约。
- [ ] ResultEnvelope 只有一个公共契约。
- [ ] 生产 Schema 与代码 Schema 一致。
- [ ] 发布可由明确源码快照复现。

### 14.4 数据验收

- [ ] 咨询、取名、K线均写入用户历史。
- [ ] 追问、深推、回访挂在原事项记录。
- [ ] EvidencePacket、GenerationRun、KnowledgeHit 有真实数据。
- [ ] 用户可删除和导出自己的记录。
- [ ] 管理后台可按用户、人物、事项和产品模块查询。

### 14.5 经营验收

- [ ] 三入口漏斗可查询。
- [ ] 付费和权益绑定具体用户结果。
- [ ] 7日回访可测量。
- [ ] 分享和邀请可归因。
- [ ] 生成成本和失败率可追踪。

---

## 15. 子 PRD 体系

本总 PRD 下设以下模块 PRD：

| 编号 | 模块 PRD | 现有文档基础 |
|---|---|---|
| PRD-P01 | 命运K线 / 人生潮汐 | `PRD-命运K线V2升级-2026-06-24.md` |
| PRD-P02 | 问事 | `PRD-问事对话前台V1-2026-06-24.md` |
| PRD-P03 | 取名 | `PRD-取名对话前台V1-2026-06-24.md` |
| PRD-C01 | 用户资产中台 | `PRD-C01-用户资产中台-v0.3-20260710.md` |
| PRD-C02 | 决策智能中台 | PRD-00A / 00B / 00C、知识库与三法融合文档 |
| PRD-C03 | 商业权益中台 | `credit-membership-plan.md` |
| PRD-C04 | 运营治理中台 | Analytics / Feedback / Admin 工程文档 |
| PRD-X01 | 实验区治理 | 妙算 / 枢密院 / 星图 / 通鉴现有代码 |

模块 PRD 只负责本模块的用户任务、范围、状态、数据、指标和验收。工程拆解进入 `docs/02开发PRD与工程文档/`。

---

## 16. 最终产品结构

```text
对外：三个清晰产品
命运K线 / 问事 / 取名

对内：四个共享中台
用户资产 / 决策智能 / 商业权益 / 运营治理

未来：一个受控实验区
所有新能力先验证，再晋级
```

**最终判断：项目下一阶段的增长来自三大产品闭环和长期用户资产。现有代码已经具备主要骨架，接下来集中完成归口、稳定、审计、复访和商业承接。**
