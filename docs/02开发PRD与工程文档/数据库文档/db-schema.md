# 人生决策宗师 — 数据库 Schema 参考手册

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）

> **版本**：v1.1
> **原始日期**：2026-06-15
> **生产校准日期**：2026-07-07
> **当前生产数据库入口**：[`DATABASE-当前生产Schema基线-20260707.md`](./DATABASE-当前生产Schema基线-20260707.md)
> **统一口径源**：[`_ground-truth.md`](../工程交接/_ground-truth.md)

下文保留模型参考。生产当前有 33 个 Schema 模型、5 份迁移，且缺少 `ConsultDialogueTurn`、`MemoryEmbedding` 两张本地新增表。

---

## 一、概览

| 属性 | 值 |
|------|-----|
| 数据库 | 开发环境 SQLite / 生产环境 PostgreSQL 16 |
| ORM | Prisma 5.x（`prisma-client-js`） |
| 表命名 | PascalCase 单数（如 `User`、`ConsultRecord`） |
| 字符集 | UTF-8 |
| 时区 | 存储 UTC，展示 Asia/Shanghai |
| ID 策略 | `uuid()` 为主，`cuid()` 仅 `UserMemory` |
| 软删除 | `ConsultRecord.deletedAt`（唯一使用软删除的模型） |
| 迁移计划 | Week 16-20 做 SQLite → PostgreSQL 迁移，不提前迁移 |

### 模型总览（30 个）

| 分类 | 模型 | 说明 |
|------|------|------|
| 用户体系 | User, Session, CreditLedger | 用户认证、会话、积分流水 |
| 会员与订单 | Membership, Order | 会员订阅、支付订单 |
| 邀请与增长 | Invite, Referral, GrowthOffer | 邀请码、推荐关系、增长活动 |
| 咨询核心 | ConsultRecord, ConsultFeedback, ConsultFollowUp, ConsultDialogue | 咨询全流程（含回访、多轮对话） |
| 命理档案 | BaZiProfile, UserMemory | 八字排盘、用户长期记忆 |
| 人物体系 | PersonProfile, PersonProfileRecord, PersonEightDimensions, PersonRelatedCase | 人物档案、八维看人、相关事项 |
| 枢密院 | ChronicleEntry, UserInsightProfile | 通鉴记录、用户画像 |
| K线与潮汐 | KlineBar, StateSnapshot | 人生K线、12维状态快照 |
| 生成追踪 | GenerationRun, EvidencePacket, KnowledgeHit | LLM 生成、证据链、知识命中 |
| 行为追踪 | PageVisit, UserActivity, InteractionEvent | 页面访问、用户活动、交互事件 |
| 命例与预览 | SavedCase, ConsultPreview | 命例库、咨询预览 |
| 基准测试 | BenchmarkRun, LiurenCase | 大六壬基准、命例数据 |

---

## 二、ER 图（ASCII）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User (用户)                                   │
│  1 ──── 1  BaZiProfile          1 ──── 1  UserMemory                   │
│  1 ──── *  ConsultRecord        1 ──── 1  UserInsightProfile           │
│  1 ──── *  PersonProfile        1 ──── *  Session                      │
│  1 ──── *  Order                1 ──── *  Membership                   │
│  1 ──── *  CreditLedger         1 ──── *  Invite                       │
│  1 ──── *  PageVisit            1 ──── *  UserActivity                 │
│  1 ──── *  ChronicleEntry       1 ──── *  ConsultFollowUp              │
│  1 ──── *  ConsultDialogue      1 ──── *  SavedCase                    │
└─────────────────────────────────────────────────────────────────────────┘
        │                    │                      │
        │ 1                  │ *                    │ 1
        ▼                    ▼                      ▼
┌──────────────┐   ┌──────────────────┐    ┌──────────────┐
│  BaZiProfile │   │  ConsultRecord   │    │   Invite     │
│  (八字档案)   │   │   (咨询记录)      │    │  (邀请码)     │
└──────────────┘   │                  │    └──────┬───────┘
                   │ 1 ──── * ConsultFeedback    │ *
┌──────────────┐   │ 1 ──── * ConsultFollowUp    ▼
│  UserMemory  │   │ 1 ──── 1 ConsultDialogue  ┌──────────┐
│  (用户记忆)   │   │ 1 ──── * SavedCase        │ Referral │
└──────────────┘   │ 1 ──── * PersonProfileRecord│(推荐记录)│
                   │ 1 ──── * ChronicleEntry    └──────────┘
┌──────────────┐   │ 1 ──── * EvidencePacket
│UserInsight   │   │ 1 ──── * GenerationRun
│Profile(画像) │   │ 1 ──── * InteractionEvent
└──────────────┘   └────────┬─────────┘
                            │ *
┌──────────────┐            │ 1
│ PersonProfile│◄───────────┘
│ (人物档案)    │──── 1:1 ──── PersonEightDimensions
│              │──── 1:* ──── PersonRelatedCase
│              │──── *:* ──── ConsultRecord (via PersonProfileRecord)
└──────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   KlineBar   │   │StateSnapshot │   │ BenchmarkRun │
│  (月度K线)    │   │ (状态快照)    │   │  (基准测试)   │
└──────────────┘   └──────────────┘   └──────────────┘

┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ GenerationRun│   │EvidencePacket│   │ KnowledgeHit │
│ (生成追踪)    │───│ (证据链)      │   │ (知识命中)    │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## 三、模型参考

### 3.1 User — 用户

**说明**：系统核心用户模型，承载认证、积分、关联所有业务实体。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 用户唯一标识 |
| email | String? | UNIQUE | — | 邮箱登录 |
| phone | String? | UNIQUE | — | 手机登录 |
| wxOpenId | String? | UNIQUE | — | 微信 OpenID 登录 |
| password | String? | — | — | 密码哈希 |
| nickname | String? | — | — | 昵称 |
| gender | String? | — | — | 性别 |
| birthDate | DateTime? | — | — | 出生日期 |
| birthTime | String? | — | — | 出生时间（HH:mm） |
| birthPlace | String? | — | — | 出生地 |
| timezone | String? | — | — | 时区 |
| isAdmin | Boolean | — | false | 管理员标识 |
| creditBalance | Int | — | 0 | 体验积分余额 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**关系**：
- 1:1 → BaZiProfile（八字档案）
- 1:1 → UserMemory（长期记忆）
- 1:1 → UserInsightProfile（用户画像）
- 1:* → ConsultRecord, PersonProfile, Order, Membership, CreditLedger, Session, Invite, PageVisit, UserActivity, ChronicleEntry, ConsultFollowUp, ConsultDialogue, SavedCase

---

### 3.2 CreditLedger — 积分流水

**说明**：积分变动的审计流水，每次积分增减必须写入一条记录。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 流水 ID |
| userId | String | FK → User | — | 用户 ID |
| amount | Int | — | — | 变动量（正=充值，负=消费） |
| reason | String | — | — | 变动原因 |
| moduleId | String? | — | — | 关联模块（如 ziping/liuren） |
| recordId | String? | — | — | 关联咨询记录 ID |
| balanceAfter | Int | — | — | 变动后余额 |
| createdAt | DateTime | — | now() | 创建时间 |

**关系**：*:1 → User（onDelete: Cascade）

---

### 3.3 UserMemory — 用户长期记忆

**说明**：用户跨会话持久化记忆，4 个 JSON 字段存储不同维度的记忆数据。与 User 是 1:1 关系。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | cuid() | 记忆 ID |
| userId | String | UNIQUE, FK → User | — | 用户 ID |
| chartHistory | String? | — | "{}" | 命盘历史（JSON） |
| consultHistory | String? | — | "{}" | 咨询历史（JSON） |
| timelineEvents | String? | — | "{}" | 时间线事件（JSON） |
| insights | String? | — | "{}" | 洞察记录（JSON） |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`userId`

**关系**：1:1 → User（onDelete: Cascade）

**JSON 字段结构**（详见第五节展开）：
- `chartHistory`：命盘历史，上限 50 条
- `consultHistory`：咨询历史，上限 50 条
- `timelineEvents`：时间线事件，上限 100 条
- `insights`：高置信度洞察，上限 30 条

---

### 3.4 BaZiProfile — 八字命理档案

**说明**：用户八字排盘结果，与 User 1:1 关系。包含四柱、五行、十神、神煞、大运等完整命理数据。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 档案 ID |
| userId | String | UNIQUE, FK → User | — | 用户 ID |
| birthYear | Int | — | — | 农历年 |
| birthMonth | Int | — | — | 农历月 |
| birthDay | Int | — | — | 农历日 |
| birthHour | Int | — | — | 出生时辰（0-23） |
| birthMinute | Int | — | 0 | 出生分钟 |
| gender | String | — | — | male/female |
| yearGanZhi | String | — | — | 年柱干支（如"甲子"） |
| monthGanZhi | String | — | — | 月柱干支 |
| dayGanZhi | String | — | — | 日柱干支 |
| timeGanZhi | String | — | — | 时柱干支 |
| wuXingDist | String | — | "{}" | 五行分布 JSON |
| shenWang | String | — | — | 身旺判断：身旺/身弱/中和 |
| shenWangScore | Int | — | 50 | 身旺评分（0-100） |
| xiYongShen | String | — | "{}" | 喜忌用神 JSON |
| shiShen | String | — | "{}" | 十神 JSON |
| shenSha | String | — | "{}" | 神煞 JSON |
| qiYunAge | Int | — | 0 | 起运年龄 |
| isShunYun | Boolean | — | true | 顺运/逆运 |
| taiYuan | String? | — | — | 胎元 |
| mingGong | String? | — | — | 命宫 |
| naYinYear | String? | — | — | 年柱纳音 |
| naYinMonth | String? | — | — | 月柱纳音 |
| naYinDay | String? | — | — | 日柱纳音 |
| naYinTime | String? | — | — | 时柱纳音 |
| correctedHour | Int? | — | — | 真太阳时校正后时辰 |
| city | String? | — | — | 出生城市（用于真太阳时） |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**关系**：1:1 → User（onDelete: Cascade）

---

### 3.5 ConsultRecord — 咨询记录

**说明**：核心业务模型，记录每次咨询的全流程数据。支持传统命理和人生枢密院两条路径。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 记录 ID |
| userId | String? | FK → User | — | 用户 ID（匿名时为 null） |
| sessionId | String? | UNIQUE | uuid() | 会话 ID |
| question | String | — | — | 用户问题 |
| routeType | String | — | — | 路由类型 |
| status | String | — | "pending" | 咨询状态 |
| flowStatus | String? | — | — | 枢密院流程状态 |
| inputData | String | — | "{}" | 用户输入原始数据 JSON |
| calcResult | String? | — | — | 八字计算结果 JSON |
| llmResult | String? | — | — | LLM 返回原始 JSON |
| summaryScore | Int? | — | 0 | 摘要评分 |
| summaryLine | String? | — | — | 一句话总结 |
| analysisData | String? | — | "{}" | 完整分析结果 JSON |
| spreadData | String? | — | — | 枢密院摆开数据 JSON |
| bottomData | String? | — | — | 枢密院这事底数据 JSON |
| calcDuration | Int? | — | — | 计算耗时（ms） |
| llmDuration | Int? | — | — | LLM 调用耗时（ms） |
| modelUsed | String? | — | — | 使用的模型 |
| isSaved | Boolean | — | false | 是否已收藏 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |
| anonymousId | String? | — | — | 匿名用户标识 |
| structuredInput | String? | — | "{}" | 结构化输入快照 JSON |
| coreChartSnapshot | String? | — | — | 核心命盘快照 JSON |
| resultSummary | String? | — | — | 结果摘要 |
| lastViewedAt | DateTime? | — | — | 最后查看时间 |
| deletedAt | DateTime? | — | — | 软删除时间 |
| sourceEntry | String? | — | — | 来源入口：kline/naming/question |
| namingType | String? | — | — | 取名类型：baby/adult/brand |
| namingPreferences | String? | — | — | 取名偏好 JSON |
| questionIntent | String? | — | — | 问事意图分类结果 |
| unlockStatus | String? | — | — | 解锁状态：preview/unlocked_partial/unlocked_full |
| shareGenerated | Boolean | — | false | 是否已生成分享 |
| emotionSnapshot | String? | — | — | 情绪快照 JSON（3维：gravity/warmth/caution） |
| extractedFacts | String? | — | — | 提取的事实 JSON |
| isHighRisk | Boolean | — | false | 高风险标记 |
| costConfirmationPrompt | String? | — | — | 代价确认提示语 |
| costUserRestated | String? | — | — | 用户复述的代价 |
| costConfirmedAt | DateTime? | — | — | 代价确认时间 |
| closedLoopResult | String? | — | — | 闭环结果 JSON |

**关系**：
- *:1 → User（onDelete: SetNull，匿名用户可为 null）
- 1:* → PersonProfileRecord, ChronicleEntry, ConsultFeedback, ConsultFollowUp, SavedCase
- 1:1 → ConsultDialogue

**状态枚举**（详见第五节展开）：
- `status`：pending / analyzing / clarify / completed / failed
- `flowStatus`：speaking / spreading / bottomed / chronicled / reviewed
- `routeType`：liuren / ziping / liuyao / qimen / shumiyuan

---

### 3.6 ConsultFeedback — 专家标注闭环

**说明**：用户对咨询结果的评价 + 专家校准，用于复盘和模型调优。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 反馈 ID |
| recordId | String | FK → ConsultRecord | — | 咨询记录 ID |
| userId | String? | — | — | 评价用户 ID |
| reviewerId | String? | — | — | 专家用户 ID |
| rating | Int | — | — | 总评分 1-5 |
| accuracy | Int? | — | — | 准确性 1-5 |
| helpfulness | Int? | — | — | 有用性 1-5 |
| tone | Int? | — | — | 语气 1-5 |
| comment | String? | — | — | 文字评价 |
| isJudgmentCorrect | Boolean? | — | — | 结论是否正确 |
| calibrationTag | String? | — | — | 校准标签 |
| calibrationNote | String? | — | — | 校准说明 |
| appliedAt | DateTime? | — | — | 复盘采纳时间 |
| appliedByCronId | String? | — | — | 复盘 cron 任务 ID |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`recordId`、`userId`、`appliedAt`

**calibrationTag 枚举**：`scenario_misclass` / `agent_unfit` / `tone_off` / `evidence_insufficient` / `cost_missing` / `other`

---

### 3.7 PersonProfile — 人物档案

**说明**：用户关系人的档案，支持聚合八字信息和枢密院星图扩展。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 档案 ID |
| userId | String? | FK → User | — | 所属用户 |
| sessionId | String? | — | — | 会话 ID |
| birthDate | String? | — | — | 出生日期 YYYY-MM-DD |
| birthTime | String? | — | — | 出生时间 HH:mm |
| gender | String? | — | — | male/female |
| birthPlace | String? | — | — | 出生地 |
| name | String? | — | — | 姓名 |
| yearPillar | String? | — | — | 年柱（如"甲子"） |
| monthPillar | String? | — | — | 月柱 |
| dayPillar | String? | — | — | 日柱 |
| hourPillar | String? | — | — | 时柱 |
| naYin | String? | — | — | 纳音 JSON |
| kongWang | String? | — | — | 空亡 JSON string[] |
| relationType | String? | — | — | 关系类型 |
| importance | String? | — | "normal" | 重要程度 |
| currentStatus | String? | — | — | 当前状态 |
| riskTags | String? | — | "[]" | 风险标签 JSON |
| recentInteraction | String? | — | — | 最近互动记录 |
| currentAdvice | String? | — | — | 当前建议 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**关系**：
- *:1 → User（onDelete: SetNull）
- 1:* → PersonProfileRecord
- 1:1 → PersonEightDimensions
- 1:* → PersonRelatedCase, ChronicleEntry

**枚举值**：
- `relationType`：家人/朋友/同事/合作伙伴/陌生人/其他
- `importance`：critical/high/normal/low
- `currentStatus`：活跃/疏远/冲突/观察中
- `currentAdvice`：推进/观察/试探/设边界/暂缓/止损

---

### 3.8 PersonProfileRecord — 人物-咨询关联

**说明**：多对多关联表，连接 PersonProfile 和 ConsultRecord。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 关联 ID |
| personProfileId | String | FK → PersonProfile | — | 人物档案 ID |
| consultRecordId | String | FK → ConsultRecord | — | 咨询记录 ID |
| createdAt | DateTime | — | now() | 创建时间 |

**唯一约束**：`[personProfileId, consultRecordId]`

---

### 3.9 PersonEightDimensions — 八维看人

**说明**：人物多维度评估，与 PersonProfile 1:1 关系。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 评估 ID |
| personId | String | UNIQUE, FK → PersonProfile | — | 人物 ID |
| role | String? | — | — | 角色维度 |
| relationship | String? | — | — | 关系维度 |
| motivation | String? | — | — | 动机维度 |
| ability | String? | — | — | 能力维度 |
| resources | String? | — | — | 资源维度 |
| credit | String? | — | — | 信用维度 |
| behavior | String? | — | — | 行为维度 |
| risk | String? | — | — | 风险维度 |
| completeness | Float | — | 0 | 完整度（已填维度数/8） |
| pendingObservations | String? | — | "[]" | 待观察项 JSON |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

---

### 3.10 PersonRelatedCase — 相关事项

**说明**：人物参与过的事项记录，用于行为模式追踪。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 事项 ID |
| personId | String | FK → PersonProfile | — | 人物 ID |
| caseTitle | String | — | — | 事项标题 |
| hisRole | String? | — | — | 他在事项中的角色 |
| whatHeSaid | String? | — | — | 他说过什么 |
| whatHeDid | String? | — | — | 后来做了什么 |
| result | String? | — | — | 结果如何 |
| impactOnJudgment | String? | — | — | 对判断的影响 |
| needsReview | Boolean | — | false | 是否待回看 |
| consultRecordId | String? | — | — | 关联咨询记录 |
| chronicleEntryId | String? | — | — | 关联通鉴记录 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`[personId, createdAt]`

---

### 3.11 ChronicleEntry — 通鉴记录

**说明**：人生决策编年史，支持回看和复盘。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 记录 ID |
| userId | String? | FK → User | — | 用户 ID |
| consultRecordId | String? | FK → ConsultRecord | — | 关联咨询记录 |
| personId | String? | FK → PersonProfile | — | 关联人物 |
| title | String | — | — | 记录标题 |
| content | String | — | — | 记录内容 |
| initialView | String? | — | — | 当时怎么看 |
| whatHappened | String? | — | — | 后来发生什么 |
| gotRight | String? | — | — | 看准了什么 |
| gotWrong | String? | — | — | 看错了什么 |
| nextReminder | String? | — | — | 下次提醒 |
| reviewAt | DateTime? | — | — | 计划回看时间 |
| reviewedAt | DateTime? | — | — | 实际回看时间 |
| entryType | String | — | "case" | 记录类型 |
| miaoSuanId | String? | — | — | 关联庙算记录 |
| isSaved | Boolean | — | false | 是否已收藏 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`[userId, createdAt]`、`[entryType, createdAt]`、`[reviewAt]`

**entryType 枚举**：`case`（事项）/ `person`（人物）/ `review`（回看）

---

### 3.12 UserInsightProfile — 用户画像

**说明**：基于通鉴回看生成的个人洞察，与 User 1:1 关系。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 画像 ID |
| userId | String | UNIQUE, FK → User | — | 用户 ID |
| commonStuckPoints | String? | — | "[]" | 常见卡点 JSON |
| riskPreference | String? | — | — | 风险偏好 |
| relationshipHabits | String? | — | "[]" | 关系判断习惯 JSON |
| misjudgmentPatterns | String? | — | "[]" | 误判模式 JSON |
| commonTriggers | String? | — | "[]" | 常见上头场景 JSON |
| longTermTrend | String? | — | — | 长期变化趋势 |
| totalEntries | Int | — | 0 | 总记录数 |
| totalReviews | Int | — | 0 | 总回看数 |
| accuracyRate | Float? | — | — | 看准率 |
| autoGenerated | Boolean | — | false | 是否自动生成 |
| generatedAt | DateTime? | — | — | 生成时间 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

---

### 3.13 Session — 会话

**说明**：用户登录会话，存储 refreshToken。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 会话 ID |
| userId | String | FK → User | — | 用户 ID |
| refreshToken | String | UNIQUE | — | 刷新令牌 |
| expiresAt | DateTime | — | — | 过期时间 |
| createdAt | DateTime | — | now() | 创建时间 |

---

### 3.14 Membership — 会员

**说明**：用户会员订阅记录。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 会员 ID |
| userId | String | FK → User | — | 用户 ID |
| type | String | — | — | 会员类型 |
| status | String | — | "active" | 状态 |
| startDate | DateTime | — | now() | 开始日期 |
| expireDate | DateTime? | — | — | 过期日期 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

---

### 3.15 Order — 订单

**说明**：支付订单记录。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 订单 ID |
| userId | String | FK → User | — | 用户 ID |
| productType | String | — | — | 产品类型 |
| productId | String | — | — | 产品 ID |
| amount | Int | — | — | 金额（分） |
| currency | String | — | "usd" | 币种 |
| status | String | — | "pending" | 订单状态 |
| paymentMethod | String? | — | — | 支付方式 |
| paymentId | String? | — | — | 第三方支付 ID |
| metadata | String? | — | — | 元数据 JSON |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

---

### 3.16 Invite — 邀请码

**说明**：用户邀请码，用于增长裂变。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 邀请 ID |
| code | String | UNIQUE | — | 邀请码 |
| userId | String | FK → User | — | 邀请人 ID |
| usedCount | Int | — | 0 | 已使用次数 |
| rewardTier | String | — | "newbie" | 奖励等级 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**关系**：1:* → Referral

---

### 3.17 Referral — 推荐记录

**说明**：通过邀请码产生的推荐记录。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 推荐 ID |
| inviteId | String | FK → Invite | — | 邀请 ID |
| inviteCode | String | — | — | 邀请码 |
| referredUserId | String? | — | — | 被推荐人 ID |
| source | String? | — | — | 来源 |
| medium | String? | — | — | 渠道 |
| campaign | String? | — | — | 活动 |
| status | String | — | "pending" | 状态 |
| createdAt | DateTime | — | now() | 创建时间 |

---

### 3.18 GrowthOffer — 增长活动

**说明**：增长运营活动配置。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 活动 ID |
| offerType | String | UNIQUE | — | 活动类型 |
| title | String | — | — | 标题 |
| subtitle | String | — | — | 副标题 |
| description | String | — | — | 描述 |
| badge | String | — | — | 角标文字 |
| badgeColor | String | — | "red" | 角标颜色 |
| ctaText | String | — | — | CTA 文案 |
| action | String | — | — | 动作 |
| discount | String? | — | — | 折扣 |
| startAt | DateTime | — | — | 开始时间 |
| expireAt | DateTime | — | — | 过期时间 |
| isActive | Boolean | — | true | 是否启用 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

---

### 3.19 LiurenCase — 大六壬命例

**说明**：大六壬案例数据，用于知识库和基准测试。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 命例 ID |
| source | String | — | — | 来源 |
| question | String | — | — | 问题 |
| askTime | String | — | — | 占问时间 |
| eventType | String | — | — | 事件类型 |
| lessonData | String | — | — | 课式数据 |
| judgment | String | — | — | 断语 |
| verification | String? | — | — | 验证结果 |
| keyPoints | String | — | — | 要点 |
| keTi | String? | — | — | 课体 |
| tags | String | — | — | 标签 |
| shenshaList | String | — | — | 神煞列表 |
| biFaList | String | — | — | 比法列表 |
| createdAt | DateTime | — | now() | 创建时间 |

---

### 3.20 EvidencePacket — 证据链

**说明**：咨询过程的证据包，记录输入哈希和完整证据数据，用于可追溯性。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 证据包 ID |
| recordId | String | — | — | 咨询记录 ID |
| routeType | String | — | — | 路由类型 |
| version | String | — | — | 证据包版本 |
| inputHash | String | — | — | 输入数据哈希 |
| packetJson | String | — | "{}" | 证据数据 JSON |
| warnings | String | — | "[]" | 警告列表 JSON |
| createdAt | DateTime | — | now() | 创建时间 |

**索引**：`recordId`、`[routeType, createdAt]`

---

### 3.21 GenerationRun — LLM 生成追踪

**说明**：每次 LLM 调用的完整追踪记录，用于质量监控和成本分析。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 运行 ID |
| recordId | String | — | — | 咨询记录 ID |
| moduleId | String | — | — | 模块 ID |
| status | String | — | "pending" | 运行状态 |
| provider | String? | — | — | LLM 提供商 |
| model | String? | — | — | 模型名称 |
| promptVersion | String | — | — | Prompt 版本 |
| evidenceId | String? | — | — | 证据包 ID |
| rawOutput | String? | — | — | LLM 原始输出 |
| finalJson | String? | — | — | 最终 JSON 输出 |
| qualityScore | Int | — | 0 | 质量评分 |
| errorCode | String? | — | — | 错误码 |
| errorMessage | String? | — | — | 错误信息 |
| durationMs | Int? | — | — | 耗时（ms） |
| reasoningContent | String? | — | — | 推理过程（CoT） |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`[recordId, moduleId]`、`[status, createdAt]`

**status 枚举**：`pending` / `running` / `completed` / `failed`

---

### 3.22 KnowledgeHit — 知识命中

**说明**：GenerationRun 过程中的知识库命中记录。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 命中 ID |
| runId | String | — | — | 生成运行 ID |
| sourceId | String | — | — | 知识源 ID |
| sourceType | String | — | — | 知识源类型 |
| title | String? | — | — | 标题 |
| snippet | String | — | — | 摘要片段 |
| score | Int | — | — | 相关性评分 |
| createdAt | DateTime | — | now() | 创建时间 |

**索引**：`runId`、`sourceId`

---

### 3.23 InteractionEvent — 交互事件

**说明**：用户交互行为事件记录，用于行为分析。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 事件 ID |
| userId | String? | — | — | 用户 ID |
| sessionId | String? | — | — | 会话 ID |
| recordId | String? | — | — | 咨询记录 ID |
| eventType | String | — | — | 事件类型 |
| eventJson | String | — | "{}" | 事件数据 JSON |
| createdAt | DateTime | — | now() | 创建时间 |

**索引**：`[userId, createdAt]`、`[recordId, createdAt]`

---

### 3.24 PageVisit — 页面访问

**说明**：页面访问追踪，记录停留时长和设备信息。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 访问 ID |
| userId | String? | FK → User | — | 用户 ID |
| sessionId | String? | — | — | 会话 ID |
| pageName | String | — | — | 页面名称 |
| pageUrl | String? | — | — | 页面 URL |
| referrer | String? | — | — | 来源页 |
| deviceInfo | String? | — | — | User-Agent 解析结果 |
| screenSize | String? | — | — | 屏幕分辨率 |
| ipCountry | String? | — | — | IP 国家 |
| ipCity | String? | — | — | IP 城市 |
| entryTime | DateTime | — | now() | 进入时间 |
| exitTime | DateTime? | — | — | 离开时间 |
| duration | Int? | — | 0 | 停留时长（秒） |
| createdAt | DateTime | — | now() | 创建时间 |

**pageName 枚举**：home / consult / result / history / profile / membership / info / growth

---

### 3.25 UserActivity — 用户活动

**说明**：用户细粒度活动追踪（点击、提交、搜索等）。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 活动 ID |
| userId | String? | FK → User | — | 用户 ID |
| sessionId | String? | — | — | 会话 ID |
| activityType | String | — | — | 活动类型 |
| activityData | String | — | "{}" | 活动数据 JSON |
| duration | Int? | — | — | 活动耗时（ms） |
| timestamp | DateTime | — | now() | 活动时间 |
| createdAt | DateTime | — | now() | 创建时间 |

**activityType 枚举**：page_view / click / consult / submit / search / share

---

### 3.26 ConsultPreview — 咨询预览

**说明**：免费用户咨询前的预览内容，含过期时间。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 预览 ID |
| module | String | — | — | 模块名称 |
| inputData | String? | — | — | 输入数据 JSON |
| calcResult | String? | — | — | 计算结果 JSON |
| freeContent | String | — | — | 免费内容 JSON |
| lang | String | — | "zh-CN" | 语言 |
| userId | String? | — | — | 用户 ID |
| expiresAt | DateTime | — | — | 过期时间 |
| createdAt | DateTime | — | now() | 创建时间 |

**索引**：`[module, createdAt]`、`[userId, createdAt]`

**freeContent JSON 结构**：`{ title, summary, chartUrl?, snippet }`

---

### 3.27 BenchmarkRun — 基准测试

**说明**：命理模型基准测试运行记录。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 测试 ID |
| year | Int | — | — | 测试年份 |
| provider | String | — | — | LLM 提供商 |
| model | String | — | — | 模型名称 |
| useCot | Boolean | — | false | 是否使用 CoT |
| useAstro | Boolean | — | false | 是否使用天文计算 |
| shuffleOptions | Boolean | — | false | 是否打乱选项 |
| maxWorkers | Int | — | 1 | 最大并发数 |
| totalQuestions | Int | — | — | 总题数 |
| correctCount | Int | — | — | 正确数 |
| accuracy | Float | — | — | 准确率 |
| avgDurationMs | Int | — | — | 平均耗时（ms） |
| resultsJson | String | — | — | 完整结果 JSON |
| categoryStats | String? | — | — | 分类统计 JSON |
| detailedResults | String? | — | — | 详细结果 JSON |
| createdAt | DateTime | — | now() | 创建时间 |

**索引**：`[provider, createdAt]`、`[year, createdAt]`

---

### 3.28 KlineBar — 月度K线

**说明**：人生K线的月度数据，七条人生线 + OHLCV。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | K线 ID |
| userId | String | — | — | 用户 ID |
| year | Int | — | — | 年份 |
| month | Int | — | — | 月份 |
| monthLabel | String | — | — | 月份标签（如"2023-01"） |
| career | String | — | "{}" | 事业线 OHLCV JSON |
| wealth | String | — | "{}" | 财富线 OHLCV JSON |
| health | String | — | "{}" | 健康线 OHLCV JSON |
| relationship | String | — | "{}" | 关系线 OHLCV JSON |
| growth | String | — | "{}" | 成长线 OHLCV JSON |
| freedom | String | — | "{}" | 自由线 OHLCV JSON |
| buffer | String | — | "{}" | 缓冲线 OHLCV JSON |
| compositeCapital | Float | — | 0 | 综合生命资本分 |
| volatility | Float | — | 0 | 波动率 |
| createdAt | DateTime | — | now() | 创建时间 |

**唯一约束**：`[userId, year, month]`

**索引**：`[userId, year]`

**OHLCV JSON 结构**：`{ open: number, high: number, low: number, close: number, volume: number }`

---

### 3.29 StateSnapshot — 状态快照

**说明**：12维状态向量 + 相位象限，对应人生潮汐图。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 快照 ID |
| userId | String | — | — | 用户 ID |
| year | Int | — | — | 年份 |
| month | Int | — | — | 月份 |
| date | String | — | — | 日期标签（如"2025-01"） |
| energy | Float | — | 50 | 精力 |
| recovery | Float | — | 50 | 恢复力 |
| emotion | Float | — | 50 | 情绪 |
| clarity | Float | — | 50 | 清晰度 |
| liquidity | Float | — | 50 | 流动性 |
| momentum | Float | — | 50 | 动量 |
| support | Float | — | 50 | 支撑 |
| agency | Float | — | 50 | 行动力 |
| order | Float | — | 50 | 秩序 |
| growth | Float | — | 50 | 成长 |
| optionality | Float | — | 50 | 选择权 |
| buffer | Float | — | 50 | 缓冲 |
| timeGroup | Float? | — | — | 时组：avg(liquidity, momentum, optionality) |
| positionGroup | Float? | — | — | 位组：avg(support, agency, order, growth, buffer) |
| mindGroup | Float? | — | — | 心组：avg(energy, recovery, emotion, clarity) |
| capacity | Float | — | 50 | 容量 |
| entropy | Float | — | 50 | 熵值 |
| quadrant | String | — | "prosperous" | 相位象限 |
| createdAt | DateTime | — | now() | 创建时间 |

**唯一约束**：`[userId, year, month]`

**索引**：`[userId, year]`、`[quadrant, createdAt]`

**quadrant 枚举**：`prosperous`（旺）/ `declining`（衰）/ `transforming`（变）/ `dormant`（伏）

---

### 3.30 ConsultFollowUp — 回访记录

**说明**：咨询完成 7 天后自动回访，记录实际结果与原始判断对比。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 回访 ID |
| recordId | String | FK → ConsultRecord | — | 咨询记录 ID |
| userId | String | FK → User | — | 用户 ID |
| scheduledAt | DateTime | — | — | 计划回访时间 |
| completedAt | DateTime? | — | — | 实际完成时间 |
| result | String? | — | — | 回访结果 JSON |
| status | String | — | "pending" | 回访状态 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`[userId, scheduledAt]`、`[status, scheduledAt]`

**status 枚举**：`pending` / `sent` / `completed` / `skipped`

**result JSON 结构**：`{ userReflection: string, actualOutcome: string, accuracyCheck: string }`

---

### 3.31 ConsultDialogue — 多轮对话

**说明**：张半山反问-观察-判断闭环，6 态状态机。与 ConsultRecord 1:1 关系。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 对话 ID |
| userId | String | FK → User | — | 用户 ID |
| recordId | String? | UNIQUE, FK → ConsultRecord | — | 咨询记录 ID |
| state | String | — | "IDLE" | 状态机当前状态 |
| currentNode | Int | — | 0 | 对话节点编号 0-6 |
| turns | String | — | "[]" | 对话轮次 JSON |
| collectedBackground | String? | — | — | 背景收集结果 JSON |
| costConfirmed | Boolean | — | false | 代价是否已确认 |
| costUserRestated | String? | — | — | 用户复述的代价 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`[userId, createdAt]`、`[state, createdAt]`

**state 枚举**：`IDLE` → `SCHEDULING` → `CLARIFYING`/`GENERATING` → `RESPONDING` → `COMPLETED`

---

### 3.32 SavedCase — 命例库

**说明**：用户收藏的命盘/卦例/案例，快照字段固化结果避免原记录修改后失真。

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | String | PK | uuid() | 命例 ID |
| userId | String | FK → User | — | 用户 ID |
| recordId | String? | FK → ConsultRecord | — | 关联咨询记录（可选） |
| name | String | — | — | 命例名称（用户自命名） |
| category | String? | — | — | 分类：八字/六壬/奇门/六爻/易隐 |
| tags | String | — | "[]" | 标签 JSON |
| notes | String? | — | — | 自由备注 |
| snapshot | String | — | "{}" | 命盘快照 JSON |
| visibility | String | — | "private" | 可见性 |
| createdAt | DateTime | — | now() | 创建时间 |
| updatedAt | DateTime | — | updatedAt | 更新时间 |

**索引**：`[userId, createdAt]`、`[userId, category]`、`[visibility]`、`[userId, visibility]`

**visibility 枚举**：`private` / `public`

---

## 四、核心模型详解

### 4.1 User — 认证流程与积分体系

**认证流程**：
1. 用户可通过 `email`+`password`、`phone`、`wxOpenId` 三种方式注册/登录
2. 三种方式互斥唯一（`@unique`），一个用户只能绑定一种
3. 登录后创建 `Session`，存储 `refreshToken` 和 `expiresAt`

**积分体系**：
- `creditBalance`：体验积分余额，初始为 0
- 每次积分变动必须写入 `CreditLedger`，记录 `amount`（正/负）、`reason`、`balanceAfter`
- `CreditLedger` 是审计流水，不可删除（`onDelete: Cascade` 仅在用户删除时级联）

**管理员**：`isAdmin = true` 的用户可执行专家标注（`ConsultFeedback.reviewerId`）

---

### 4.2 ConsultRecord — 状态机与路由

**status 状态机（传统命理路径）**：

```
pending ──→ analyzing ──→ completed
   │              │
   │              └──→ failed
   └──→ clarify ──→ analyzing
```

| 状态 | 含义 |
|------|------|
| pending | 刚创建，等待处理 |
| analyzing | 正在分析中 |
| clarify | 需要用户补充信息 |
| completed | 分析完成 |
| failed | 分析失败 |

**flowStatus 状态机（人生枢密院路径）**：

```
speaking ──→ spreading ──→ bottomed ──→ chronicled ──→ reviewed
```

| 状态 | 含义 |
|------|------|
| speaking | 用户在说（收集信息） |
| spreading | 摆开（展开分析） |
| bottomed | 这事底（核心结论） |
| chronicled | 已入通鉴（记录完成） |
| reviewed | 已回看（复盘完成） |

**routeType 路由类型**：

| 路由 | 含义 | Agent |
|------|------|-------|
| liuren | 大六壬 | liuren agent |
| ziping | 子平八字 | ziping agent |
| liuyao | 六爻 | liuyao agent |
| qimen | 奇门遁甲 | qimen agent |
| shumiyuan | 人生枢密院 | zhangbanshan scheduler |

**关键 JSON 字段**：

| 字段 | 结构 |
|------|------|
| spreadData | `{ stuckPoint, people, fearedResult, desiredResult, regretPoint }` |
| bottomData | `{ stuckPoint, people, risks, threeWays, minStep, reviewPoint }` |
| emotionSnapshot | `{ gravity: number, warmth: number, caution: number }` |
| closedLoopResult | `{ userReflection, actualOutcome, accuracyCheck }` |
| extractedFacts | `ExtractedFact[]` |

---

### 4.3 UserMemory — 4 个 JSON 字段结构

**chartHistory（命盘历史，上限 50 条）**：
```json
{
  "entries": [
    {
      "id": "cuid_xxx",
      "date": "2026-06-15",
      "type": "bazi",
      "summary": "甲子日柱，身旺用金水",
      "pillarData": { "yearGanZhi": "甲子", "monthGanZhi": "丙寅", "dayGanZhi": "甲子", "timeGanZhi": "甲子" }
    }
  ]
}
```

**consultHistory（咨询历史，上限 50 条）**：
```json
{
  "entries": [
    {
      "id": "uuid_xxx",
      "date": "2026-06-15",
      "question": "今年事业运势如何？",
      "routeType": "ziping",
      "summaryLine": "事业有贵人，但需防口舌",
      "category": "career"
    }
  ]
}
```

**timelineEvents（时间线事件，上限 100 条）**：
```json
{
  "events": [
    {
      "id": "cuid_xxx",
      "date": "2026-06-15",
      "type": "consult",
      "title": "首次八字咨询",
      "tags": ["career", "wealth"]
    }
  ]
}
```

**insights（高置信度洞察，上限 30 条，置信度 ≥ 0.7）**：
```json
{
  "items": [
    {
      "id": "cuid_xxx",
      "date": "2026-06-15",
      "category": "career",
      "content": "用户连续三次问事业，可能处于职业转型期",
      "confidence": 0.85,
      "source": "consult_history"
    }
  ]
}
```

**记忆提取规则**（代码来源：`memory-extractor.service.ts`）：
- 7 类规则：identity / family / career / relationship / finance / health / decision
- 去重：SimHash（bigram Jaccard ≥ 0.8 视为重复）
- 双写：consultHistory（检索可达）+ insights（高置信度 ≥ 0.7）

---

### 4.4 BaZiProfile — 八字排盘字段详解

**四柱干支**：
- `yearGanZhi`：年柱，如"甲子"，由 `birthYear` 推算
- `monthGanZhi`：月柱，由 `birthYear` + `birthMonth` 推算
- `dayGanZhi`：日柱，由 `birthYear` + `birthMonth` + `birthDay` 推算
- `timeGanZhi`：时柱，由 `dayGanZhi` + `birthHour` 推算

**五行分布**（wuXingDist JSON）：
```json
{ "木": 3, "火": 2, "土": 1, "金": 1, "水": 1 }
```

**身旺判断**：
- `shenWang`：身旺/身弱/中和
- `shenWangScore`：0-100，50 为中和，>50 偏旺，<50 偏弱

**喜忌用神**（xiYongShen JSON）：
```json
{ "xi": ["金", "水"], "yong": ["水"], "ji": ["木", "火"] }
```

**十神**（shiShen JSON）：日干对照其他七字的十神关系

**神煞**（shenSha JSON）：天乙贵人、驿马、桃花等神煞列表

**大运**：
- `qiYunAge`：起运年龄
- `isShunYun`：顺运（阳男阴女）或逆运

**纳音五行**：`naYinYear`/`naYinMonth`/`naYinDay`/`naYinTime`，如"海中金"

**真太阳时校正**：
- `city`：出生城市
- `correctedHour`：校正后的时辰（根据经度调整）

---

### 4.5 GenerationRun — LLM 生成追踪

**追踪链路**：
```
ConsultRecord → EvidencePacket → GenerationRun → KnowledgeHit
```

1. 用户发起咨询 → 创建 `ConsultRecord`
2. 构建证据包 → 创建 `EvidencePacket`（记录输入哈希、版本、警告）
3. 调用 LLM → 创建 `GenerationRun`（记录 provider、model、promptVersion）
4. 知识检索 → 创建 `KnowledgeHit`（记录命中的知识片段和评分）

**质量监控**：
- `qualityScore`：0-100，由 Validator 自动评分
- `durationMs`：LLM 调用耗时，用于成本分析
- `reasoningContent`：CoT 推理过程，用于可解释性

**错误追踪**：
- `errorCode` + `errorMessage`：失败时记录错误详情
- `status`：pending → running → completed/failed

---

### 4.6 EvidencePacket — 证据链

**设计目的**：确保每次咨询的输入可追溯、可复现。

| 字段 | 说明 |
|------|------|
| inputHash | 输入数据的哈希值，用于快速比对是否重复输入 |
| version | 证据包格式版本，支持向后兼容 |
| packetJson | 完整证据数据，包含所有输入参数 |
| warnings | 构建证据时的警告列表（如"出生时间不精确"） |

**packetJson 结构**（按 routeType 不同）：
```json
{
  "routeType": "ziping",
  "birthData": { "year": 1990, "month": 6, "day": 15, "hour": 14, "gender": "male" },
  "questionData": { "question": "...", "intent": "career" },
  "memoryContext": { "consultCount": 5, "lastConsultDate": "2026-06-01" },
  "userState": "genuine",
  "emotionState": { "gravity": 0.6, "warmth": 0.3, "caution": 0.7 }
}
```

---

## 五、迁移策略

### 开发环境（SQLite）

```bash
# 生成迁移文件
npx prisma migrate dev --name <migration_name>

# 重置数据库（危险，仅开发用）
npx prisma migrate reset

# 推送 schema 变更（无迁移文件，原型阶段用）
npx prisma db push
```

### 生产环境（PostgreSQL 16）

```bash
# 生成迁移 SQL（不执行）
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script

# 执行迁移
npx prisma migrate deploy

# 查看迁移状态
npx prisma migrate status
```

### SQLite → PostgreSQL 迁移计划

| 阶段 | 时间 | 内容 |
|------|------|------|
| 准备 | Week 14-15 | 搭建 PostgreSQL 实例，验证 schema 兼容性 |
| 数据迁移 | Week 16-18 | 编写迁移脚本，处理 JSON 字段差异 |
| 双写验证 | Week 18-19 | 新数据同时写入 SQLite 和 PostgreSQL，对比一致性 |
| 切换 | Week 19-20 | 切换 DATABASE_URL，下线 SQLite |

**注意事项**：
- SQLite 的 JSON 字段是字符串存储，PostgreSQL 可使用原生 JSONB
- SQLite 不支持数组类型，迁移时需处理 `"[]"` 默认值
- `DateTime` 在 SQLite 是字符串，PostgreSQL 是原生 timestamp

---

## 六、索引策略

### 索引总览

| 模型 | 索引 | 类型 | 用途 |
|------|------|------|------|
| UserMemory | `[userId]` | 单列 | 用户记忆查询 |
| ConsultFeedback | `[recordId]` | 单列 | 按咨询记录查反馈 |
| ConsultFeedback | `[userId]` | 单列 | 按用户查反馈 |
| ConsultFeedback | `[appliedAt]` | 单列 | 查询已采纳的反馈 |
| EvidencePacket | `[recordId]` | 单列 | 按咨询记录查证据包 |
| EvidencePacket | `[routeType, createdAt]` | 复合 | 按路由类型+时间查证据 |
| GenerationRun | `[recordId, moduleId]` | 复合 | 按记录+模块查生成运行 |
| GenerationRun | `[status, createdAt]` | 复合 | 按状态+时间查运行 |
| KnowledgeHit | `[runId]` | 单列 | 按生成运行查命中 |
| KnowledgeHit | `[sourceId]` | 单列 | 按知识源查命中 |
| InteractionEvent | `[userId, createdAt]` | 复合 | 按用户+时间查事件 |
| InteractionEvent | `[recordId, createdAt]` | 复合 | 按记录+时间查事件 |
| ConsultPreview | `[module, createdAt]` | 复合 | 按模块+时间查预览 |
| ConsultPreview | `[userId, createdAt]` | 复合 | 按用户+时间查预览 |
| BenchmarkRun | `[provider, createdAt]` | 复合 | 按提供商+时间查测试 |
| BenchmarkRun | `[year, createdAt]` | 复合 | 按年份+时间查测试 |
| PersonRelatedCase | `[personId, createdAt]` | 复合 | 按人物+时间查事项 |
| ChronicleEntry | `[userId, createdAt]` | 复合 | 按用户+时间查通鉴 |
| ChronicleEntry | `[entryType, createdAt]` | 复合 | 按类型+时间查通鉴 |
| ChronicleEntry | `[reviewAt]` | 单列 | 查询待回看记录 |
| KlineBar | `[userId, year, month]` | 唯一 | 防止重复月度K线 |
| KlineBar | `[userId, year]` | 复合 | 按用户+年份查K线 |
| StateSnapshot | `[userId, year, month]` | 唯一 | 防止重复月度快照 |
| StateSnapshot | `[userId, year]` | 复合 | 按用户+年份查快照 |
| StateSnapshot | `[quadrant, createdAt]` | 复合 | 按象限+时间查快照 |
| ConsultFollowUp | `[userId, scheduledAt]` | 复合 | 按用户+计划时间查回访 |
| ConsultFollowUp | `[status, scheduledAt]` | 复合 | 按状态+计划时间查回访 |
| ConsultDialogue | `[userId, createdAt]` | 复合 | 按用户+时间查对话 |
| ConsultDialogue | `[state, createdAt]` | 复合 | 按状态+时间查对话 |
| SavedCase | `[userId, createdAt]` | 复合 | 个人列表按时间倒序 |
| SavedCase | `[userId, category]` | 复合 | 按分类筛选 |
| SavedCase | `[visibility]` | 单列 | 公开/会员可见案例池 |
| SavedCase | `[userId, visibility]` | 复合 | 我的+可见范围 |

### 索引设计原则

1. **唯一约束优先**：`KlineBar` 和 `StateSnapshot` 的 `[userId, year, month]` 唯一约束防止重复数据
2. **时间范围查询**：所有复合索引都包含 `createdAt`，支持时间范围扫描
3. **状态过滤**：`GenerationRun`、`ConsultFollowUp`、`ConsultDialogue` 的 `[status, createdAt]` 支持按状态过滤+排序
4. **关联查询**：`[recordId, moduleId]`、`[userId, createdAt]` 等支持常见关联查询模式
5. **未加索引的 UNIQUE**：`User.email`、`User.phone`、`User.wxOpenId`、`BaZiProfile.userId`、`Invite.code` 等 UNIQUE 约束自动创建索引

---

## 附录：Prisma Schema 与数据库类型映射

| Prisma 类型 | SQLite | PostgreSQL 16 |
|-------------|--------|---------------|
| String | TEXT | TEXT / VARCHAR |
| Int | INTEGER | INTEGER |
| Float | REAL | DOUBLE PRECISION |
| Boolean | INTEGER (0/1) | BOOLEAN |
| DateTime | TEXT (ISO 8601) | TIMESTAMP |
| @default(uuid()) | TEXT | UUID (生成) |
| @default(cuid()) | TEXT | TEXT (生成) |
| @default(now()) | TEXT (当前时间) | TIMESTAMP (当前时间) |
| @updatedAt | TEXT (当前时间) | TIMESTAMP (当前时间) |

**JSON 字段说明**：Prisma 不支持原生 JSON 类型，所有 JSON 字段在 SQLite 中以 TEXT 存储，在 PostgreSQL 中建议迁移为 JSONB 以获得索引和查询能力。
