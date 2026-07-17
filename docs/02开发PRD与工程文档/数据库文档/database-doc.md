# AWKN-LABlife 数据库文档

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）

> **版本**：v1.1
> **原始扫描日期**：2026-06-16
> **生产校准日期**：2026-07-07
> **当前生产入口**：[`DATABASE-当前生产Schema基线-20260707.md`](./DATABASE-当前生产Schema基线-20260707.md)

当前生产 Schema 有 33 个模型、5 份迁移；本地当前 Schema 有 35 个模型、8 份迁移。生产数据库缺少 `ConsultDialogueTurn` 和 `MemoryEmbedding`。下文保留原字段说明；生产表结构和迁移状态采用 2026-07-07 基线。

---

## 1. 全局信息

| 项目 | 值 |
|------|-----|
| ORM | Prisma |
| 当前数据库 | SQLite（`file:` 协议） |
| Schema 文件 | `apps/api-server/prisma/schema.prisma` |
| 迁移计划 | Week 16-20 迁移至 PostgreSQL |
| ID 策略 | `uuid()`（多数模型）/ `cuid()`（UserMemory） |
| 软删除 | ConsultRecord 使用 `deletedAt` 字段 |

---

## 2. ER 关系图（文本描述）

```
User ─┬── 1:1 ── BaZiProfile
      ├── 1:1 ── UserMemory
      ├── 1:1 ── UserInsightProfile
      ├── 1:N ── ConsultRecord
      ├── 1:N ── PersonProfile
      ├── 1:N ── Order
      ├── 1:N ── Membership
      ├── 1:N ── CreditLedger
      ├── 1:N ── Session
      ├── 1:N ── Invite
      ├── 1:N ── PageVisit
      ├── 1:N ── UserActivity
      ├── 1:N ── ChronicleEntry
      ├── 1:N ── ConsultFollowUp
      ├── 1:N ── ConsultDialogue
      └── 1:N ── SavedCase

ConsultRecord ─┬── 1:N ── PersonProfileRecord
               ├── 1:N ── ChronicleEntry
               ├── 1:N ── ConsultFeedback
               ├── 1:N ── ConsultFollowUp
               ├── 1:1 ── ConsultDialogue
               ├── 1:N ── SavedCase
               └── (间接) 1:N ── EvidencePacket / GenerationRun / InteractionEvent

PersonProfile ─┬── 1:N ── PersonProfileRecord
               ├── 1:1 ── PersonEightDimensions
               ├── 1:N ── PersonRelatedCase
               └── 1:N ── ChronicleEntry

Invite ─── 1:N ── Referral

KlineBar ─── 独立（按 userId 关联，无外键）
StateSnapshot ─── 独立（按 userId 关联，无外键）
EvidencePacket ─── 独立（按 recordId 关联，无外键）
GenerationRun ─── 独立（按 recordId 关联，无外键）
KnowledgeHit ─── 独立（按 runId 关联，无外键）
InteractionEvent ─── 独立（按 userId/recordId 关联，无外键）
ConsultPreview ─── 独立（按 userId 关联，无外键）
BenchmarkRun ─── 独立（无外键）
LiurenCase ─── 独立（无外键）
GrowthOffer ─── 独立（无外键）
```

---

## 3. 模型详细说明

### 3.1 User — 用户

**用途**: 系统核心用户表，存储基本信息、管理员标识和积分余额。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `email` | String | 是 | — | 邮箱（唯一） |
| `phone` | String | 是 | — | 手机号（唯一） |
| `wxOpenId` | String | 是 | — | 微信 OpenID（唯一） |
| `password` | String | 是 | — | 密码哈希 |
| `nickname` | String | 是 | — | 昵称 |
| `gender` | String | 是 | — | 性别 |
| `birthDate` | DateTime | 是 | — | 出生日期 |
| `birthTime` | String | 是 | — | 出生时辰 |
| `birthPlace` | String | 是 | — | 出生地 |
| `timezone` | String | 是 | — | 时区 |
| `isAdmin` | Boolean | 否 | `false` | 管理员标识 |
| `creditBalance` | Int | 否 | `0` | 积分余额 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `email`, `phone`, `wxOpenId`

**关联**: BaZiProfile (1:1), ConsultRecord (1:N), PersonProfile (1:N), Order (1:N), Membership (1:N), CreditLedger (1:N), Session (1:N), Invite (1:N), PageVisit (1:N), UserActivity (1:N), ChronicleEntry (1:N), UserInsightProfile (1:1), UserMemory (1:1), ConsultFollowUp (1:N), ConsultDialogue (1:N), SavedCase (1:N)

---

### 3.2 BaZiProfile — 八字命理档案

**用途**: 存储用户八字四柱、五行分布、身旺判断、喜忌用神、十神、神煞、大运、胎元命宫、纳音、真太阳时校正等完整命理数据。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID（唯一） |
| `birthYear` | Int | 否 | — | 出生年 |
| `birthMonth` | Int | 否 | — | 出生月 |
| `birthDay` | Int | 否 | — | 出生日 |
| `birthHour` | Int | 否 | — | 出生时 |
| `birthMinute` | Int | 否 | `0` | 出生分 |
| `gender` | String | 否 | — | 性别（male/female） |
| `yearGanZhi` | String | 否 | — | 年柱干支 |
| `monthGanZhi` | String | 否 | — | 月柱干支 |
| `dayGanZhi` | String | 否 | — | 日柱干支 |
| `timeGanZhi` | String | 否 | — | 时柱干支 |
| `wuXingDist` | String | 否 | `"{}"` | 五行分布 JSON |
| `shenWang` | String | 否 | — | 身旺判断（身旺/身弱/中和） |
| `shenWangScore` | Int | 否 | `50` | 身旺分数 |
| `xiYongShen` | String | 否 | `"{}"` | 喜忌用神 JSON |
| `shiShen` | String | 否 | `"{}"` | 十神 JSON |
| `shenSha` | String | 否 | `"{}"` | 神煞 JSON |
| `qiYunAge` | Int | 否 | `0` | 起运年龄 |
| `isShunYun` | Boolean | 否 | `true` | 是否顺运 |
| `taiYuan` | String | 是 | — | 胎元 |
| `mingGong` | String | 是 | — | 命宫 |
| `naYinYear` | String | 是 | — | 年柱纳音 |
| `naYinMonth` | String | 是 | — | 月柱纳音 |
| `naYinDay` | String | 是 | — | 日柱纳音 |
| `naYinTime` | String | 是 | — | 时柱纳音 |
| `correctedHour` | Int | 是 | — | 真太阳时校正后时辰 |
| `city` | String | 是 | — | 城市 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `userId`

**关联**: User (1:1, onDelete: Cascade)

---

### 3.3 UserMemory — 用户长期记忆

**用途**: 存储用户的长期记忆数据，包含图表历史、咨询历史、时间线事件和洞察。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (CUID) | 否 | `cuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID（唯一） |
| `chartHistory` | String | 是 | `"{}"` | 图表历史 JSON |
| `consultHistory` | String | 是 | `"{}"` | 咨询历史 JSON |
| `timelineEvents` | String | 是 | `"{}"` | 时间线事件 JSON |
| `insights` | String | 是 | `"{}"` | 洞察 JSON |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `userId`

**索引**: `userId`

**关联**: User (1:1, onDelete: Cascade)

---

### 3.4 ConsultRecord — 咨询记录

**用途**: 系统核心业务表，存储每次咨询的完整生命周期数据：输入、路由、算法结果、LLM 结果、分析数据、枢密院流程数据、解锁状态、情绪快照、代价确认、闭环结果等。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 是 | — | 用户 ID（匿名时为空） |
| `sessionId` | String | 是 | `uuid()` | 会话 ID（唯一） |
| `question` | String | 否 | — | 用户问题 |
| `routeType` | String | 否 | — | 路由类型（liuren/ziping/liuyao/qimen/shumiyuan） |
| `status` | String | 否 | `"pending"` | 状态（pending/analyzing/completed/failed） |
| `flowStatus` | String | 是 | — | 枢密院流程状态（speaking/spreading/bottomed/chronicled/reviewed） |
| `inputData` | String | 否 | `"{}"` | 用户输入原始数据 JSON |
| `calcResult` | String | 是 | — | 八字计算结果 JSON |
| `llmResult` | String | 是 | — | LLM 返回原始 JSON |
| `summaryScore` | Int | 是 | `0` | 摘要评分 |
| `summaryLine` | String | 是 | — | 一句话总结 |
| `analysisData` | String | 是 | `"{}"` | 完整分析结果 JSON |
| `spreadData` | String | 是 | — | 枢密院摆开数据 JSON |
| `bottomData` | String | 是 | — | 枢密院这事底结果 JSON |
| `calcDuration` | Int | 是 | — | 计算耗时（ms） |
| `llmDuration` | Int | 是 | — | LLM 调用耗时（ms） |
| `modelUsed` | String | 是 | — | 使用的模型 |
| `isSaved` | Boolean | 否 | `false` | 是否已保存 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |
| `anonymousId` | String | 是 | — | 匿名用户标识 |
| `structuredInput` | String | 是 | `"{}"` | 结构化输入快照 JSON |
| `coreChartSnapshot` | String | 是 | — | 核心命盘快照 JSON |
| `resultSummary` | String | 是 | — | 结果摘要 |
| `lastViewedAt` | DateTime | 是 | — | 最后查看时间 |
| `deletedAt` | DateTime | 是 | — | 软删除时间 |
| `sourceEntry` | String | 是 | — | 来源入口（kline/naming/question） |
| `namingType` | String | 是 | — | 起名类型（baby/adult/brand） |
| `namingPreferences` | String | 是 | — | 起名偏好 JSON |
| `questionIntent` | String | 是 | — | 问事意图分类 |
| `unlockStatus` | String | 是 | — | 解锁状态（preview/unlocked_partial/unlocked_full） |
| `shareGenerated` | Boolean | 否 | `false` | 是否已生成分享 |
| `emotionSnapshot` | String | 是 | — | 情绪快照 JSON（gravity/warmth/caution） |
| `extractedFacts` | String | 是 | — | 提取的事实 JSON |
| `isHighRisk` | Boolean | 否 | `false` | 高风险标记 |
| `costConfirmationPrompt` | String | 是 | — | 代价确认提示语 |
| `costUserRestated` | String | 是 | — | 用户复述的代价 |
| `costConfirmedAt` | DateTime | 是 | — | 代价确认时间 |
| `closedLoopResult` | String | 是 | — | 闭环结果 JSON |

**唯一约束**: `sessionId`

**关联**: User (1:N, 可空), PersonProfileRecord (1:N), ChronicleEntry (1:N), ConsultFeedback (1:N), ConsultFollowUp (1:N), ConsultDialogue (1:1), SavedCase (1:N)

---

### 3.5 ConsultFeedback — 专家标注反馈

**用途**: P2-2 反馈闭环，用户对咨询结果评价 + 专家校准 + 定期复盘。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `recordId` | String | 否 | — | 咨询记录 ID |
| `userId` | String | 是 | — | 用户 ID |
| `reviewerId` | String | 是 | — | 专家用户 ID |
| `rating` | Int | 否 | — | 总评分（1-5） |
| `accuracy` | Int | 是 | — | 准确性（1-5） |
| `helpfulness` | Int | 是 | — | 有用性（1-5） |
| `tone` | Int | 是 | — | 语气（1-5） |
| `comment` | String | 是 | — | 文字评价 |
| `isJudgmentCorrect` | Boolean | 是 | — | 结论是否正确 |
| `calibrationTag` | String | 是 | — | 校准标签 |
| `calibrationNote` | String | 是 | — | 校准说明 |
| `appliedAt` | DateTime | 是 | — | 复盘采纳时间 |
| `appliedByCronId` | String | 是 | — | 复盘 cron 任务 ID |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**索引**: `recordId`, `userId`, `appliedAt`

**关联**: ConsultRecord (1:N, onDelete: Cascade)

---

### 3.6 PersonProfile — 人物档案

**用途**: 存储与用户相关的他人信息，用于星图（人物关系）功能。包含出生信息、八字聚合、枢密院扩展字段（关系类型、重要程度、风险标签等）。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 是 | — | 用户 ID |
| `sessionId` | String | 是 | — | 会话 ID |
| `birthDate` | String | 是 | — | 出生日期（YYYY-MM-DD） |
| `birthTime` | String | 是 | — | 出生时辰（HH:mm） |
| `gender` | String | 是 | — | 性别 |
| `birthPlace` | String | 是 | — | 出生地 |
| `name` | String | 是 | — | 姓名 |
| `yearPillar` | String | 是 | — | 年柱 |
| `monthPillar` | String | 是 | — | 月柱 |
| `dayPillar` | String | 是 | — | 日柱 |
| `hourPillar` | String | 是 | — | 时柱 |
| `naYin` | String | 是 | — | 纳音 JSON |
| `kongWang` | String | 是 | — | 空亡 JSON |
| `relationType` | String | 是 | — | 关系类型 |
| `importance` | String | 是 | `"normal"` | 重要程度 |
| `currentStatus` | String | 是 | — | 当前状态 |
| `riskTags` | String | 是 | `"[]"` | 风险标签 JSON |
| `recentInteraction` | String | 是 | — | 最近互动记录 |
| `currentAdvice` | String | 是 | — | 当前建议 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**关联**: User (1:N, onDelete: SetNull), PersonProfileRecord (1:N), PersonEightDimensions (1:1), PersonRelatedCase (1:N), ChronicleEntry (1:N)

---

### 3.7 PersonProfileRecord — 人物-咨询关联

**用途**: 多对多关联表，连接 PersonProfile 和 ConsultRecord。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `personProfileId` | String | 否 | — | 人物档案 ID |
| `consultRecordId` | String | 否 | — | 咨询记录 ID |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**唯一约束**: `[personProfileId, consultRecordId]`（复合唯一）

**关联**: PersonProfile (1:N, onDelete: Cascade), ConsultRecord (1:N, onDelete: Cascade)

---

### 3.8 PersonEightDimensions — 八维看人

**用途**: 人物多维度评估数据，8 个维度（角色/关系/动机/能力/资源/信用/行为/风险）。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `personId` | String | 否 | — | 人物 ID（唯一） |
| `role` | String | 是 | — | 角色维度 |
| `relationship` | String | 是 | — | 关系维度 |
| `motivation` | String | 是 | — | 动机维度 |
| `ability` | String | 是 | — | 能力维度 |
| `resources` | String | 是 | — | 资源维度 |
| `credit` | String | 是 | — | 信用维度 |
| `behavior` | String | 是 | — | 行为维度 |
| `risk` | String | 是 | — | 风险维度 |
| `completeness` | Float | 否 | `0` | 完整度（已填维度数/8） |
| `pendingObservations` | String | 是 | `"[]"` | 待观察项 JSON |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `personId`

**关联**: PersonProfile (1:1, onDelete: Cascade)

---

### 3.9 PersonRelatedCase — 相关事项

**用途**: 人物参与过的事项记录，追踪承诺与实际行动对比。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `personId` | String | 否 | — | 人物 ID |
| `caseTitle` | String | 否 | — | 事项标题 |
| `hisRole` | String | 是 | — | 他的角色 |
| `whatHeSaid` | String | 是 | — | 他说过什么 |
| `whatHeDid` | String | 是 | — | 他做了什么 |
| `result` | String | 是 | — | 结果 |
| `impactOnJudgment` | String | 是 | — | 对判断的影响 |
| `needsReview` | Boolean | 否 | `false` | 是否待回看 |
| `consultRecordId` | String | 是 | — | 关联咨询记录 |
| `chronicleEntryId` | String | 是 | — | 关联通鉴记录 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**索引**: `[personId, createdAt]`

**关联**: PersonProfile (1:N, onDelete: Cascade)

---

### 3.10 ChronicleEntry — 通鉴记录

**用途**: 人生决策编年史，记录判断与实际结果的对比，支持回看和洞察生成。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 是 | — | 用户 ID |
| `consultRecordId` | String | 是 | — | 关联咨询记录 |
| `personId` | String | 是 | — | 关联人物 |
| `title` | String | 否 | — | 记录标题 |
| `content` | String | 否 | — | 记录内容 |
| `initialView` | String | 是 | — | 当时怎么看 |
| `whatHappened` | String | 是 | — | 后来发生什么 |
| `gotRight` | String | 是 | — | 看准了什么 |
| `gotWrong` | String | 是 | — | 看错了什么 |
| `nextReminder` | String | 是 | — | 下次提醒 |
| `reviewAt` | DateTime | 是 | — | 计划回看时间 |
| `reviewedAt` | DateTime | 是 | — | 实际回看时间 |
| `entryType` | String | 否 | `"case"` | 记录类型（case/person/review） |
| `miaoSuanId` | String | 是 | — | 关联庙算记录 |
| `isSaved` | Boolean | 否 | `false` | 是否已保存 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**索引**: `[userId, createdAt]`, `[entryType, createdAt]`, `[reviewAt]`

**关联**: User (1:N, onDelete: SetNull), ConsultRecord (1:1, onDelete: SetNull), PersonProfile (1:N, onDelete: SetNull)

---

### 3.11 UserInsightProfile — 用户洞察画像

**用途**: 基于通鉴回看生成的个人洞察，包含常见卡点、风险偏好、误判模式等。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID（唯一） |
| `commonStuckPoints` | String | 是 | `"[]"` | 常见卡点 JSON |
| `riskPreference` | String | 是 | — | 风险偏好 |
| `relationshipHabits` | String | 是 | `"[]"` | 关系判断习惯 JSON |
| `misjudgmentPatterns` | String | 是 | `"[]"` | 误判模式 JSON |
| `commonTriggers` | String | 是 | `"[]"` | 常见上头场景 JSON |
| `longTermTrend` | String | 是 | — | 长期变化趋势 |
| `totalEntries` | Int | 否 | `0` | 总记录数 |
| `totalReviews` | Int | 否 | `0` | 总回看数 |
| `accuracyRate` | Float | 是 | — | 看准率 |
| `autoGenerated` | Boolean | 否 | `false` | 是否自动生成 |
| `generatedAt` | DateTime | 是 | — | 生成时间 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `userId`

**关联**: User (1:1, onDelete: Cascade)

---

### 3.12 KlineBar — 月度K线

**用途**: 人生K线数据，七条人生线的月度 OHLCV 数据。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `year` | Int | 否 | — | 年 |
| `month` | Int | 否 | — | 月 |
| `monthLabel` | String | 否 | — | 月标签（如 "2023-01"） |
| `career` | String | 否 | `"{}"` | 事业线 OHLCV JSON |
| `wealth` | String | 否 | `"{}"` | 财富线 OHLCV JSON |
| `health` | String | 否 | `"{}"` | 健康线 OHLCV JSON |
| `relationship` | String | 否 | `"{}"` | 关系线 OHLCV JSON |
| `growth` | String | 否 | `"{}"` | 成长线 OHLCV JSON |
| `freedom` | String | 否 | `"{}"` | 自由线 OHLCV JSON |
| `buffer` | String | 否 | `"{}"` | 缓冲线 OHLCV JSON |
| `compositeCapital` | Float | 否 | `0` | 综合生命资本分 |
| `volatility` | Float | 否 | `0` | 波动率 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**唯一约束**: `[userId, year, month]`（复合唯一）

**索引**: `[userId, year]`

---

### 3.13 StateSnapshot — 月度状态快照

**用途**: 潮汐图数据，12 维状态向量 + 时·位·心三组聚合 + 衍生指标。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `year` | Int | 否 | — | 年 |
| `month` | Int | 否 | — | 月 |
| `date` | String | 否 | — | 日期标签（如 "2025-01"） |
| `energy` | Float | 否 | `50` | 精力 |
| `recovery` | Float | 否 | `50` | 恢复力 |
| `emotion` | Float | 否 | `50` | 情绪 |
| `clarity` | Float | 否 | `50` | 清晰度 |
| `liquidity` | Float | 否 | `50` | 流动性 |
| `momentum` | Float | 否 | `50` | 动量 |
| `support` | Float | 否 | `50` | 支撑 |
| `agency` | Float | 否 | `50` | 主体性 |
| `order` | Float | 否 | `50` | 秩序 |
| `growth` | Float | 否 | `50` | 增长 |
| `optionality` | Float | 否 | `50` | 可选性 |
| `buffer` | Float | 否 | `50` | 缓冲 |
| `timeGroup` | Float | 是 | — | 时组聚合 |
| `positionGroup` | Float | 是 | — | 位组聚合 |
| `mindGroup` | Float | 是 | — | 心组聚合 |
| `capacity` | Float | 否 | `50` | 容量 |
| `entropy` | Float | 否 | `50` | 熵 |
| `quadrant` | String | 否 | `"prosperous"` | 相位象限 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**唯一约束**: `[userId, year, month]`（复合唯一）

**索引**: `[userId, year]`, `[quadrant, createdAt]`

---

### 3.14 CreditLedger — 积分流水

**用途**: 记录积分变动明细。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `amount` | Int | 否 | — | 变动数量（正/负） |
| `reason` | String | 否 | — | 变动原因 |
| `moduleId` | String | 是 | — | 关联模块 |
| `recordId` | String | 是 | — | 关联记录 |
| `balanceAfter` | Int | 否 | — | 变动后余额 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**关联**: User (1:N, onDelete: Cascade)

---

### 3.15 Session — 会话

**用途**: JWT 刷新令牌存储。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `refreshToken` | String | 否 | — | 刷新令牌（唯一） |
| `expiresAt` | DateTime | 否 | — | 过期时间 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**唯一约束**: `refreshToken`

**关联**: User (1:N, onDelete: Cascade)

---

### 3.16 Membership — 会员

**用途**: 用户会员状态记录。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `type` | String | 否 | — | 会员类型 |
| `status` | String | 否 | `"active"` | 状态 |
| `startDate` | DateTime | 否 | `now()` | 开始日期 |
| `expireDate` | DateTime | 是 | — | 过期日期 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**关联**: User (1:N, onDelete: Cascade)

---

### 3.17 Order — 订单

**用途**: 支付订单记录。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `productType` | String | 否 | — | 产品类型 |
| `productId` | String | 否 | — | 产品 ID |
| `amount` | Int | 否 | — | 金额（分） |
| `currency` | String | 否 | `"usd"` | 币种 |
| `status` | String | 否 | `"pending"` | 订单状态 |
| `paymentMethod` | String | 是 | — | 支付方式 |
| `paymentId` | String | 是 | — | 支付 ID |
| `metadata` | String | 是 | — | 元数据 JSON |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**关联**: User (1:N, onDelete: Cascade)

---

### 3.18 Invite — 邀请码

**用途**: 用户邀请码管理。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `code` | String | 否 | — | 邀请码（唯一） |
| `userId` | String | 否 | — | 用户 ID |
| `usedCount` | Int | 否 | `0` | 已使用次数 |
| `rewardTier` | String | 否 | `"newbie"` | 奖励等级 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `code`

**关联**: User (1:N, onDelete: Cascade), Referral (1:N)

---

### 3.19 Referral — 邀请记录

**用途**: 记录每次邀请回流。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `inviteId` | String | 否 | — | 邀请 ID |
| `inviteCode` | String | 否 | — | 邀请码 |
| `referredUserId` | String | 是 | — | 被邀请用户 ID |
| `source` | String | 是 | — | 来源 |
| `medium` | String | 是 | — | 渠道 |
| `campaign` | String | 是 | — | 活动 |
| `status` | String | 否 | `"pending"` | 状态 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**关联**: Invite (1:N, onDelete: Cascade)

---

### 3.20 GrowthOffer — 优惠活动

**用途**: 增长运营的优惠活动配置。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `offerType` | String | 否 | — | 活动类型（唯一） |
| `title` | String | 否 | — | 标题 |
| `subtitle` | String | 否 | — | 副标题 |
| `description` | String | 否 | — | 描述 |
| `badge` | String | 否 | — | 徽章文本 |
| `badgeColor` | String | 否 | `"red"` | 徽章颜色 |
| `ctaText` | String | 否 | — | CTA 文本 |
| `action` | String | 否 | — | 动作 |
| `discount` | String | 是 | — | 折扣 |
| `startAt` | DateTime | 否 | — | 开始时间 |
| `expireAt` | DateTime | 否 | — | 过期时间 |
| `isActive` | Boolean | 否 | `true` | 是否激活 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `offerType`

---

### 3.21 PageVisit — 页面访问

**用途**: 用户页面访问追踪。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 是 | — | 用户 ID |
| `sessionId` | String | 是 | — | 会话 ID |
| `pageName` | String | 否 | — | 页面名称 |
| `pageUrl` | String | 是 | — | 页面 URL |
| `referrer` | String | 是 | — | 来源 |
| `deviceInfo` | String | 是 | — | 设备信息 |
| `screenSize` | String | 是 | — | 屏幕分辨率 |
| `ipCountry` | String | 是 | — | IP 国家 |
| `ipCity` | String | 是 | — | IP 城市 |
| `entryTime` | DateTime | 否 | `now()` | 进入时间 |
| `exitTime` | DateTime | 是 | — | 离开时间 |
| `duration` | Int | 是 | `0` | 停留时长（秒） |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**关联**: User (1:N, onDelete: SetNull)

---

### 3.22 UserActivity — 用户活动

**用途**: 用户行为追踪（点击、咨询、搜索、分享等）。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 是 | — | 用户 ID |
| `sessionId` | String | 是 | — | 会话 ID |
| `activityType` | String | 否 | — | 活动类型 |
| `activityData` | String | 否 | `"{}"` | 活动数据 JSON |
| `duration` | Int | 是 | — | 活动耗时（ms） |
| `timestamp` | DateTime | 否 | `now()` | 时间戳 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**关联**: User (1:N, onDelete: SetNull)

---

### 3.23 EvidencePacket — 证据包

**用途**: 咨询过程中的证据链记录，用于审计和可追溯性。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `recordId` | String | 否 | — | 咨询记录 ID |
| `routeType` | String | 否 | — | 路由类型 |
| `version` | String | 否 | — | 版本 |
| `inputHash` | String | 否 | — | 输入哈希 |
| `packetJson` | String | 否 | `"{}"` | 证据包数据 JSON |
| `warnings` | String | 否 | `"[]"` | 警告 JSON |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**索引**: `recordId`, `[routeType, createdAt]`

---

### 3.24 GenerationRun — 生成运行

**用途**: LLM 调用的完整记录，含 provider、model、prompt 版本、质量评分、错误信息等。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `recordId` | String | 否 | — | 咨询记录 ID |
| `moduleId` | String | 否 | — | 模块 ID |
| `status` | String | 否 | `"pending"` | 状态（pending/completed/failed/failed_retryable） |
| `provider` | String | 是 | — | LLM 提供商 |
| `model` | String | 是 | — | 模型名 |
| `promptVersion` | String | 否 | — | Prompt 版本 |
| `evidenceId` | String | 是 | — | 证据包 ID |
| `rawOutput` | String | 是 | — | 原始输出 |
| `finalJson` | String | 是 | — | 最终 JSON |
| `qualityScore` | Int | 否 | `0` | 质量评分 |
| `errorCode` | String | 是 | — | 错误码 |
| `errorMessage` | String | 是 | — | 错误信息 |
| `durationMs` | Int | 是 | — | 耗时（ms） |
| `reasoningContent` | String | 是 | — | 推理内容 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**索引**: `[recordId, moduleId]`, `[status, createdAt]`

---

### 3.25 KnowledgeHit — 知识命中

**用途**: RAG 检索命中记录。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `runId` | String | 否 | — | 生成运行 ID |
| `sourceId` | String | 否 | — | 知识源 ID |
| `sourceType` | String | 否 | — | 知识源类型 |
| `title` | String | 是 | — | 标题 |
| `snippet` | String | 否 | — | 摘要 |
| `score` | Int | 否 | — | 相关度评分 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**索引**: `runId`, `sourceId`

---

### 3.26 InteractionEvent — 互动事件

**用途**: 用户与咨询结果交互的事件记录（展开/收起/追问/分享等）。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 是 | — | 用户 ID |
| `sessionId` | String | 是 | — | 会话 ID |
| `recordId` | String | 是 | — | 咨询记录 ID |
| `eventType` | String | 否 | — | 事件类型 |
| `eventJson` | String | 否 | `"{}"` | 事件数据 JSON |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**索引**: `[userId, createdAt]`, `[recordId, createdAt]`

---

### 3.27 ConsultPreview — 咨询预览

**用途**: 免费预览数据缓存，含过期时间。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `module` | String | 否 | — | 模块名 |
| `inputData` | String | 是 | — | 输入数据 JSON |
| `calcResult` | String | 是 | — | 计算结果 JSON |
| `freeContent` | String | 否 | — | 免费内容 JSON |
| `lang` | String | 否 | `"zh-CN"` | 语言 |
| `userId` | String | 是 | — | 用户 ID |
| `expiresAt` | DateTime | 否 | — | 过期时间 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**索引**: `[module, createdAt]`, `[userId, createdAt]`

---

### 3.28 BenchmarkRun — 基准测试运行

**用途**: 命理基准测试结果记录。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `year` | Int | 否 | — | 测试年份 |
| `provider` | String | 否 | — | LLM 提供商 |
| `model` | String | 否 | — | 模型名 |
| `useCot` | Boolean | 否 | `false` | 是否使用 CoT |
| `useAstro` | Boolean | 否 | `false` | 是否使用星象数据 |
| `shuffleOptions` | Boolean | 否 | `false` | 是否打乱选项 |
| `maxWorkers` | Int | 否 | `1` | 最大并发数 |
| `totalQuestions` | Int | 否 | — | 总题数 |
| `correctCount` | Int | 否 | — | 正确数 |
| `accuracy` | Float | 否 | — | 准确率 |
| `avgDurationMs` | Int | 否 | — | 平均耗时（ms） |
| `resultsJson` | String | 否 | — | 结果 JSON |
| `categoryStats` | String | 是 | — | 分类统计 JSON |
| `detailedResults` | String | 是 | — | 详细结果 JSON |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

**索引**: `[provider, createdAt]`, `[year, createdAt]`

---

### 3.29 LiurenCase — 六壬案例

**用途**: 大六壬知识库案例。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `source` | String | 否 | — | 来源 |
| `question` | String | 否 | — | 问题 |
| `askTime` | String | 否 | — | 占时 |
| `eventType` | String | 否 | — | 事件类型 |
| `lessonData` | String | 否 | — | 课式数据 |
| `judgment` | String | 否 | — | 断语 |
| `verification` | String | 是 | — | 验证 |
| `keyPoints` | String | 否 | — | 要点 |
| `keTi` | String | 是 | — | 课题 |
| `tags` | String | 否 | — | 标签 |
| `shenshaList` | String | 否 | — | 神煞列表 |
| `biFaList` | String | 否 | — | 笔法列表 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |

---

### 3.30 ConsultFollowUp — 回访记录

**用途**: P3-1 回访系统，咨询完成 7 天后自动回访。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `recordId` | String | 否 | — | 咨询记录 ID |
| `userId` | String | 否 | — | 用户 ID |
| `scheduledAt` | DateTime | 否 | — | 计划回访时间 |
| `completedAt` | DateTime | 是 | — | 完成时间 |
| `result` | String | 是 | — | 回访结果 JSON |
| `status` | String | 否 | `"pending"` | 状态（pending/sent/completed/skipped） |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**索引**: `[userId, scheduledAt]`, `[status, scheduledAt]`

**关联**: ConsultRecord (1:N, onDelete: Cascade), User (1:N, onDelete: Cascade)

---

### 3.31 ConsultDialogue — 多轮对话

**用途**: P4-1 张半山反问-观察-判断闭环，6 态状态机。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `recordId` | String | 是 | — | 咨询记录 ID（唯一） |
| `state` | String | 否 | `"IDLE"` | 状态机状态（IDLE/SCHEDULING/CLARIFYING/GENERATING/RESPONDING/COMPLETED） |
| `currentNode` | Int | 否 | `0` | 对话节点编号（0-6） |
| `turns` | String | 否 | `"[]"` | 对话轮次 JSON |
| `collectedBackground` | String | 是 | — | 背景收集结果 JSON |
| `costConfirmed` | Boolean | 否 | `false` | 代价是否确认 |
| `costUserRestated` | String | 是 | — | 用户复述的代价 |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**唯一约束**: `recordId`

**索引**: `[userId, createdAt]`, `[state, createdAt]`

**关联**: User (1:N, onDelete: Cascade), ConsultRecord (1:1, onDelete: SetNull)

---

### 3.32 SavedCase — 命例库

**用途**: 用户收藏的命盘/卦例/案例，快照字段固化结果避免原记录修改后失真。

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | String (UUID) | 否 | `uuid()` | 主键 |
| `userId` | String | 否 | — | 用户 ID |
| `recordId` | String | 是 | — | 关联咨询记录 ID |
| `name` | String | 否 | — | 命例名称 |
| `category` | String | 是 | — | 分类（八字/六壬/奇门/六爻/易隐） |
| `tags` | String | 否 | `"[]"` | 标签 JSON |
| `notes` | String | 是 | — | 自由备注 |
| `snapshot` | String | 否 | `"{}"` | 命盘快照 JSON |
| `visibility` | String | 否 | `"private"` | 可见性（private/public） |
| `createdAt` | DateTime | 否 | `now()` | 创建时间 |
| `updatedAt` | DateTime | 否 | `@updatedAt` | 更新时间 |

**索引**: `[userId, createdAt]`, `[userId, category]`, `[visibility]`, `[userId, visibility]`

**关联**: User (1:N, onDelete: Cascade), ConsultRecord (1:N, onDelete: SetNull)

---

## 4. SQLite 特有注意事项

### 4.1 JSON 字段

SQLite 无原生 JSON 类型，所有 JSON 字段存储为 `String`。Prisma 层不做 JSON 解析验证，应用层需自行处理：

- **写入前**：`JSON.stringify(data)`
- **读取后**：`JSON.parse(field)`
- **查询**：无法使用 JSON 路径查询（如 `$.name`），需全量读取后在应用层过滤

### 4.2 DateTime 精度

SQLite 的 DateTime 存储为文本（ISO 8601），无时区信息。Prisma 在查询时自动转换。

### 4.3 并发写入

SQLite 不支持并发写入，写操作会加库级锁。高并发场景下需启用 WAL 模式：

```sql
PRAGMA journal_mode=WAL;
```

### 4.4 无外键强制

SQLite 默认不强制外键约束，需手动启用：

```sql
PRAGMA foreign_keys=ON;
```

Prisma 在连接时会自动处理。

### 4.5 字符串长度

SQLite 无字符串长度限制，应用层需自行校验（`ValidationPipe` 已部分覆盖）。

---

## 5. SQLite → PostgreSQL 迁移注意事项

### 5.1 Schema 变更

| 项目 | SQLite | PostgreSQL |
|------|--------|------------|
| JSON 字段 | `String` | 改为 `Json` 类型，可使用 JSONB 路径查询 |
| Boolean | 存为 0/1 | 原生 `Boolean` |
| DateTime | 文本 | 原生 `timestamptz`（带时区） |
| UUID | `String` | 可改为原生 `UUID` 类型 |
| 外键 | 默认不强制 | 默认强制 |
| 并发 | 库级锁 | 行级锁，支持高并发 |

### 5.2 迁移步骤

1. 修改 `schema.prisma` 中 `provider` 为 `"postgresql"`，`url` 改为 PostgreSQL 连接串
2. 将 JSON `String` 字段改为 `Json` 类型
3. 运行 `npx prisma migrate dev --name sqlite-to-pg` 生成迁移
4. 编写数据迁移脚本（SQLite → PostgreSQL 数据导出/导入）
5. 验证外键约束和索引

### 5.3 数据迁移风险

- **JSON 字段**：需逐条 `JSON.parse` + `JSON.stringify` 验证合法性
- **DateTime**：SQLite 文本格式需统一转为 `timestamptz`
- **空字符串 vs NULL**：SQLite 允许空字符串，PostgreSQL 中需确认语义

---

## 6. 关键查询模式

### 6.1 用户咨询记录查询

```typescript
// 按用户查询 + 分页 + 排除软删除
prisma.consultRecord.findMany({
  where: { userId, deletedAt: null },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
});
```

### 6.2 模块状态推断

```typescript
// 无 GenerationRun 时，从 ConsultRecord.status 推断模块状态
// pending → pending, processing/analyzing → running, completed → completed, failed → failed
```

### 6.3 会员权限检查

```typescript
// 检查用户是否有权访问某模块
const membership = await prisma.membership.findFirst({
  where: { userId, status: 'active', expireDate: { gte: new Date() } },
});
// 或检查积分余额
const user = await prisma.user.findUnique({ where: { id: userId } });
// creditBalance >= moduleCost
```

### 6.4 K线数据查询

```typescript
// 按用户 + 时间范围查询 K线
prisma.klineBar.findMany({
  where: { userId, year: { gte: fromYear }, month: { gte: fromMonth } },
  orderBy: [{ year: 'asc' }, { month: 'asc' }],
});
```

### 6.5 管理员统计

```typescript
// 按 routeType 分组统计
prisma.consultRecord.groupBy({
  by: ['routeType'],
  _count: { id: true },
});
```

---

## 7. 索引汇总

| 模型 | 索引 | 类型 | 说明 |
|------|------|------|------|
| UserMemory | `userId` | 普通 | 用户记忆查询 |
| ConsultFeedback | `recordId` | 普通 | 按记录查反馈 |
| ConsultFeedback | `userId` | 普通 | 按用户查反馈 |
| ConsultFeedback | `appliedAt` | 普通 | 查未采纳反馈 |
| PersonProfileRecord | `[personProfileId, consultRecordId]` | 唯一 | 防重复关联 |
| PersonRelatedCase | `[personId, createdAt]` | 普通 | 人物事项按时间 |
| ChronicleEntry | `[userId, createdAt]` | 普通 | 用户通鉴按时间 |
| ChronicleEntry | `[entryType, createdAt]` | 普通 | 按类型筛选 |
| ChronicleEntry | `[reviewAt]` | 普通 | 待回看查询 |
| KlineBar | `[userId, year, month]` | 唯一 | 防重复月度数据 |
| KlineBar | `[userId, year]` | 普通 | 按年查询 |
| StateSnapshot | `[userId, year, month]` | 唯一 | 防重复月度数据 |
| StateSnapshot | `[userId, year]` | 普通 | 按年查询 |
| StateSnapshot | `[quadrant, createdAt]` | 普通 | 按象限查询 |
| EvidencePacket | `recordId` | 普通 | 按记录查证据 |
| EvidencePacket | `[routeType, createdAt]` | 普通 | 按路由+时间 |
| GenerationRun | `[recordId, moduleId]` | 普通 | 按记录+模块 |
| GenerationRun | `[status, createdAt]` | 普通 | 按状态+时间 |
| KnowledgeHit | `runId` | 普通 | 按运行查命中 |
| KnowledgeHit | `sourceId` | 普通 | 按知识源查 |
| InteractionEvent | `[userId, createdAt]` | 普通 | 用户事件按时间 |
| InteractionEvent | `[recordId, createdAt]` | 普通 | 记录事件按时间 |
| ConsultPreview | `[module, createdAt]` | 普通 | 按模块+时间 |
| ConsultPreview | `[userId, createdAt]` | 普通 | 用户预览按时间 |
| BenchmarkRun | `[provider, createdAt]` | 普通 | 按提供商+时间 |
| BenchmarkRun | `[year, createdAt]` | 普通 | 按年份+时间 |
| ConsultFollowUp | `[userId, scheduledAt]` | 普通 | 用户回访按时间 |
| ConsultFollowUp | `[status, scheduledAt]` | 普通 | 按状态+时间 |
| ConsultDialogue | `[userId, createdAt]` | 普通 | 用户对话按时间 |
| ConsultDialogue | `[state, createdAt]` | 普通 | 按状态+时间 |
| SavedCase | `[userId, createdAt]` | 普通 | 个人列表按时间 |
| SavedCase | `[userId, category]` | 普通 | 按分类筛选 |
| SavedCase | `[visibility]` | 普通 | 公开案例池 |
| SavedCase | `[userId, visibility]` | 普通 | 我的+可见范围 |

---

## 8. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-16 | v1.0 | 初始版本，基于 Prisma Schema 扫描生成（32 个模型） |
