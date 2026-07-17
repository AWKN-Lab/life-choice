# PRD-C01｜用户资产中台 v0.3（代码归口版）

> **产品**：人生决策宗师
> **模块类型**：共享中台 / 核心长期资产
> **更新日期**：2026-07-10
> **状态**：FROZEN（2026-07-11 冻结，冻结凭证见 docs/05审核与质量/PRD冻结决策-20260711.md §2.3 prd.lock.yaml，待用户最终确认）
> **代码基线**：本地工作树 `a20ef465` 及当前 Prisma Schema、前后端实现
> **上游文档**：`PRD-人生决策宗师-模块化架构-v0.2-批判性重写.md` 正文 v0.3
> **关联产品**：命运K线、问事、取名
> **历史参考**：`个人智能体系统_工作计划_v0.2.md`

---

## 0. 总判断

人生决策宗师已经积累了用户、命盘、人物、咨询、对话、回访、记忆、通鉴、收藏、K线和取名等数据对象。当前这些对象分散在不同页面、接口和数据表中，用户无法清楚看见系统保存了什么，也无法把一次问事持续发展为“事项—行动—结果—复盘”的长期记录。

用户资产中台负责把三大产品产生的数据归入同一套长期档案：

```text
用户身份
→ 本人命盘
→ 相关人物
→ 具体事项
→ 分析结果
→ 对话与行动
→ 回访结果
→ 复盘洞察
```

模块完成后，用户获得五个直接结果：

1. 一次录入出生资料，三大产品持续复用。
2. 每件事拥有稳定主键，深推、追问和回访不会散落。
3. 每个相关人物拥有独立档案，可查看共同经历和关联事项。
4. 系统记住的内容可查看、纠正、删除和关闭。
5. 历史记录能够形成现实复盘，逐步提高后续判断的贴合度。

用户资产中台是复访、长期会员、命运K线真实性和个人智能体能力的共同地基。

---

## 1. 当前代码事实

## 1.1 已有前台

| 页面 | 路由 | 当前职责 | 当前缺口 |
|---|---|---|---|
| 个人中心 | `/profile` | 账号、积分、会员、邀请、订单 | 缺少命盘、记忆、隐私和资产总览 |
| 历史记录 | `/history` | 人物档案、咨询记录、筛选、对比 | 页面职责过重，人物与事项结构混合 |
| 回访 | `/followup/:followUpId` | 查看和提交回访 | 权限和事项归属需强化 |
| 通鉴 | `/tongjian` | 事件记录与复盘 | 当前属于实验区，未接入统一资产导航 |
| 结果页 | `/result/:recordId` | 查看单次分析 | 结果与后续行动、回访、人物归档连接不足 |
| 命运K线 | `/kline`、`/tide` | 长期趋势与阶段 | 缺少真实事件和回访数据的稳定反馈链 |

## 1.2 已有后端模块

```text
auth/
user/
user-profile/
consult/
consult/person-profile.service.ts
consult/dialogue/
consult/followup/
consult/memory/
chronicle/
saved-case/
kline-tide/
```

## 1.3 已有核心数据对象

| 资产域 | 当前模型 |
|---|---|
| 用户身份 | `User`、`Session` |
| 本人命盘 | `BaZiProfile` |
| 相关人物 | `PersonProfile`、`PersonProfileRecord` |
| 事项与结果 | `ConsultRecord`、`NamingResult` |
| 对话 | `ConsultDialogue`、`ConsultDialogueTurn` |
| 回访 | `ConsultFollowUp` |
| 记忆 | `UserMemory`、`MemoryEmbedding` |
| 证据与审计 | `EvidencePacket`、`GenerationRun`、`KnowledgeHit`、`InteractionEvent` |
| 长期复盘 | `ChronicleEntry`、`UserInsightProfile` |
| 收藏案例 | `SavedCase` |
| 长期趋势 | `KlineBar`、`StateSnapshot` |

## 1.4 当前已有能力

1. 用户可注册、登录、维护基础资料。
2. 系统可保存一份本人八字档案。
3. 咨询记录可关联人物档案。
4. 历史页可按人物聚合咨询记录。
5. 多轮对话、回访、通鉴和收藏均已有接口与数据模型。
6. 咨询结束后可以提取长期记忆。
7. 记忆支持关键词和简易向量混合检索。
8. 通鉴可根据复盘记录生成用户洞察。

---

## 2. 当前核心问题

## 2.1 资产入口分散

当前用户需要分别进入 Profile、History、Result、FollowUp、Tongjian、Kline 等页面寻找自己的资料。系统内部拥有较多资产，用户侧缺少一张完整地图。

影响：

- 用户看不到长期积累的价值。
- 会员权益容易停留在次数和模块解锁。
- 复访缺少稳定入口。
- 数据错误无法被用户及时纠正。

## 2.2 本人档案与相关人物边界不清

`BaZiProfile` 保存本人命盘，`PersonProfile` 保存相关人物，也可能从历史咨询自动回填本人或匿名人物。两套对象之间没有稳定映射。

当前风险：

1. 同一个人可能生成多个 PersonProfile。
2. 自动匿名名称难以让用户识别。
3. 历史记录可能按出生信息聚合，也可能按咨询记录聚合。
4. 修改本人出生资料后，旧人物档案和旧结果可能继续保留旧快照。

## 2.3 事项主键没有贯穿全链路

`ConsultRecord` 已有 `consultationId` 字段，深推、对话、回访、通鉴和命例仍主要依赖各自 ID 或 `recordId`。

影响：

- 一件事的多次分析容易形成多条孤立记录。
- 问题变化、行动变化和现实结果无法自然串联。
- 用户难以判断“这次问的是否属于上次那件事”。

## 2.4 记忆数据模型存在结构冲突

当前 `UserMemory.userId` 为唯一索引，每个用户只有一行。该行同时保存：

```text
consultHistory JSON
 timelineEvents JSON
 insights JSON
一条激活结构化记忆
```

`setActiveMemory()` 每次覆盖当前结构化记忆，无法保存多条独立记忆。

更严重的风险：`MemoryForgetService.cleanExpired()` 会删除 `expiresAt` 已过期的整个 `UserMemory` 行。该行包含咨询历史、时间线和洞察，单条激活记忆过期可能连带删除用户的全部聚合记忆。

## 2.5 记忆向量缺少可靠关系

`MemoryEmbedding.memoryId` 当前没有数据库外键。结构化记忆覆盖后，向量记录与真实记忆条目的关系容易失真。

当前向量采用 256 维哈希向量，适合轻量相似度辅助，无法承担高质量长期语义记忆的唯一依据。

## 2.6 权限和归属校验存在缺口

当前代码中发现：

1. `consult/followup` 控制器没有 JWT Guard。
2. 回访查询和提交主要依赖 `recordId`、`followUpId`，缺少统一用户归属校验。
3. Dialogue 的 reply/result 已取得 `userId`，调用 Service 时没有传入归属校验。
4. Chronicle review 接口没有把当前 `userId` 传给 Service，存在越权更新风险。
5. 资产接口的所有权规则分散在不同 Service 中。

用户资产属于高敏感数据，上述问题进入 P0。

## 2.7 删除、导出和纠正能力不完整

当前存在咨询软删除、人物删除、命例删除等局部能力，缺少：

```text
完整资产导出
记忆查看与删除
本人命盘纠正后的影响说明
一键删除账户资产
删除前依赖预览
匿名记录认领
```

## 2.8 洞察缺少证据强度

`UserInsightProfile` 主要由 LLM 从通鉴记录生成。当前没有稳定保存：

```text
洞察引用了哪些记录
生成模型与版本
用户是否确认
洞察有效期
反例和冲突记录
```

洞察容易被用户理解为确定事实，产品需要明确证据和边界。

---

## 3. 产品目标

## 3.1 核心目标

建立统一、可理解、可追溯、可控制的用户资产体系，让三大核心产品共享同一份用户上下文。

## 3.2 用户结果

用户可以随时回答：

```text
系统保存了我的哪些资料？
我问过哪些事？
每件事后来怎么样？
哪些人物和这些事有关？
系统记住了我什么？
哪些内容是我说的，哪些内容是系统推断的？
我可以修改或删除哪些内容？
```

## 3.3 业务目标

1. 提高 7 日和 30 日复访率。
2. 提高历史记录回看率。
3. 提高追问、回访和长期会员使用率。
4. 让命运K线获得现实事件与状态反馈。
5. 降低重复录入和重复咨询成本。
6. 形成可持续增长的个人决策档案。

## 3.4 工程目标

1. 建立统一资产 ID 和所有权规则。
2. 拆分聚合记忆与独立记忆条目。
3. 统一三大产品的资产写入协议。
4. 所有自动洞察保留来源、版本和置信度。
5. 删除、导出、合并和纠正具备稳定事务边界。
6. 生产 Schema 与代码 Schema 保持一致。

---

## 4. 范围边界

## 4.1 本模块负责

```text
账号身份
本人命盘
相关人物
事项主档
产品结果归档
多轮对话归档
行动与回访
长期记忆
通鉴与复盘
个人洞察
收藏与导出
隐私和数据控制
```

## 4.2 本模块不负责

1. 具体术数算法。
2. LLM 模型选择和提示词编排。
3. 支付定价和会员商品设计。
4. K线评分算法本身。
5. 管理后台经营分析。
6. 公共社区和公开案例广场。

上述能力通过标准接口使用用户资产。

---

## 5. 模块架构

```text
C01-1 身份与权限
C01-2 本人命盘档案
C01-3 人物与关系档案
C01-4 事项与结果账本
C01-5 对话、行动与回访
C01-6 长期记忆
C01-7 通鉴、复盘与洞察
C01-8 收藏、导出与隐私
```

---

## 6. C01-1｜身份与权限

### 6.1 职责

管理账号身份、登录状态、用户级权限和所有资产的归属。

### 6.2 当前代码

```text
User
Session
auth/
user/
ProfilePage
```

### 6.3 产品要求

1. 所有登录用户资产绑定 `userId`。
2. 匿名咨询绑定 `anonymousId + sessionId`，登录后允许安全认领。
3. 认领动作必须防止跨设备冒领。
4. 后端统一执行资源所有权校验。
5. 管理员读取敏感资产必须产生审计记录。
6. 用户注销后按产品规则执行删除或匿名化。

### 6.4 统一所有权规则

```text
OWNER：用户本人可读写
SHARED：用户明确授权的资产
ADMIN_AUDIT：管理员按权限只读或校准
SYSTEM：系统任务可写入限定字段
PUBLIC：用户主动发布的脱敏内容
```

默认状态为 `OWNER`。

### 6.5 验收

- [ ] 所有用户资产接口具备 JWT 或安全匿名令牌。
- [ ] 所有详情、更新、删除接口校验 `resource.userId === req.user.id`。
- [ ] 越权请求返回 403，不泄露资源是否存在。
- [ ] 管理员访问产生 InteractionEvent 或独立审计日志。

---

## 7. C01-2｜本人命盘档案

### 7.1 职责

保存本人稳定出生信息和确定性命盘快照，供问事、取名、K线复用。

### 7.2 当前代码

```text
User.birthDate / birthTime / birthPlace / gender
BaZiProfile
user/profile
user-profile/insights
userProfileStore
```

### 7.3 真源规则

```text
User：用户可读的基础资料
BaZiProfile：本人命盘计算真源
ConsultRecord.coreChartSnapshot：咨询发生时的不可变快照
```

修改 `BaZiProfile` 只影响后续计算。历史结果保留当时快照，页面明确展示“按某次资料计算”。

### 7.4 必备字段

```text
出生日期
出生时间
时辰精度：精确 / 约略 / 未知
性别
出生地点
时区
真太阳时校正状态
命盘版本
计算引擎版本
用户确认时间
```

### 7.5 关键交互

1. 首次使用三大产品时按需建立档案。
2. 用户可以查看和修改档案。
3. 修改前展示受影响范围。
4. 修改后可选择重新生成未来K线或新咨询结果。
5. 历史结果不静默重算。

### 7.6 验收

- [ ] 三大产品读取同一份本人档案。
- [ ] 时辰未知时不自动填充 `12:00`。
- [ ] 每次计算保存命盘快照和引擎版本。
- [ ] 用户可确认或纠正出生资料。

---

## 8. C01-3｜人物与关系档案

### 8.1 职责

管理与用户决策相关的人物，形成“人物—事项—互动—结果”的长期视图。

### 8.2 当前代码

```text
PersonProfile
PersonProfileRecord
PersonEightDimensions
PersonRelatedCase
person-profile.service.ts
HistoryPage
StarChart
```

### 8.3 人物类型

```text
self            本人镜像
family          家人
partner         伴侣
friend          朋友
colleague       同事
business        合作方
other           其他
```

### 8.4 目标字段

```ts
interface SubjectProfile {
  profileId: string;
  userId: string;
  subjectType: 'self' | 'related_person';
  displayName: string;
  relationType?: string;
  birthInfo?: BirthInfo;
  chartSnapshot?: ChartSnapshot;
  importance: 'critical' | 'high' | 'normal' | 'low';
  currentStatus?: string;
  userConfirmed: boolean;
  mergedFromIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 8.5 归口规则

1. 本人只允许一个主档案。
2. 同一相关人物允许多个事件，默认只有一个人物主档。
3. 自动识别人物时先创建“待确认人物”，不直接生成永久档案。
4. 人物合并保留来源和历史映射。
5. 人物删除前展示关联事项数量。
6. 删除人物不删除咨询记录，只解除关联或进行匿名化。

### 8.6 去重策略

按以下信号生成候选匹配：

```text
用户明确选择
姓名
关系类型
出生日期
出生时间
同一事项中的指代
```

系统只给出合并建议，最终由用户确认。

### 8.7 验收

- [ ] 自动回填不会静默创建大量重复人物。
- [ ] 人物可重命名、合并、解绑、删除。
- [ ] 每个人物可查看关联事项和最近互动。
- [ ] 本人档案与相关人物档案具有明确标识。

---

## 9. C01-4｜事项与结果账本

### 9.1 职责

把一次问题发展为长期事项，承载首问、深推、追问、行动、回访和复盘。

### 9.2 当前代码

```text
ConsultRecord
consultationId
sourceEntry
questionIntent
unlockStatus
EvidencePacket
GenerationRun
KnowledgeHit
InteractionEvent
NamingResult
Kline 快照
```

### 9.3 ID 体系

```text
consultationId：一件长期事项的主键
recordId：一次分析运行或结果版本
moduleId：结果中的专题模块
dialogueId：一次连续对话
followUpId：一个回访任务
chronicleEntryId：一次现实事件或复盘
```

### 9.4 事项生命周期

```text
DRAFT
→ ACTIVE
→ DECIDED
→ IN_ACTION
→ WAITING_RESULT
→ REVIEW_DUE
→ REVIEWED
→ CLOSED
```

异常状态：

```text
ARCHIVED
CANCELLED
DELETED
```

### 9.5 事项结构

```ts
interface ConsultationAsset {
  consultationId: string;
  userId: string;
  title: string;
  productType: 'question' | 'naming' | 'kline';
  subjectProfileIds: string[];
  currentState: string;
  latestRecordId: string;
  recordIds: string[];
  decision?: string;
  selectedAction?: string;
  expectedWindow?: string;
  nextReviewAt?: string;
  actualOutcome?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 9.6 写入规则

1. 首次有效提交创建 `consultationId + recordId`。
2. 同一事项深推生成新 record 版本，继续绑定原 `consultationId`。
3. 追问默认沿用原事项。
4. 用户明确提出新事项时创建新 `consultationId`。
5. 取名的一轮筛选、二轮筛选和最终选择属于同一事项。
6. K线“问此事”进入问事模块后创建事项，K线本身保留独立快照。
7. 结果审计数据和用户可见结果分层保存。

### 9.7 历史视图

历史页提供三种组织方式：

```text
按事项
按人物
按时间
```

默认采用“按事项”，人物和时间作为筛选方式。

### 9.8 验收

- [ ] 每次有效分析都有真实 consultationId 和 recordId。
- [ ] 同一事项的追问、深推、回访可连续查看。
- [ ] 用户能重命名事项和标记状态。
- [ ] 删除一次结果不会破坏整件事项。
- [ ] 事项页面可查看所有版本和现实结果。

---

## 10. C01-5｜对话、行动与回访

### 10.1 职责

记录用户围绕事项的连续对话、选定行动、关键日期和现实反馈。

### 10.2 当前代码

```text
ConsultDialogue
ConsultDialogueTurn
ConsultFollowUp
closedLoopResult
costConfirmationPrompt
costUserRestated
FollowUpPage
```

### 10.3 对话规则

1. Dialogue 必须绑定 `userId`。
2. 生成有效结果后绑定 `recordId` 和 `consultationId`。
3. Turn 使用独立表存储，JSON `turns` 仅作迁移兼容。
4. Reply 和 Result 接口校验 Dialogue 所有权。
5. 对话超时后保留历史，状态进入 COMPLETED 或 EXPIRED。

### 10.4 行动记录

用户可在结果页选择：

```text
准备执行
暂缓观察
补充信息后再定
放弃该方案
已完成
```

可选记录：

```text
行动内容
预计完成时间
实际完成时间
执行成本
结果
```

### 10.5 回访触发

```text
关键日期前
合同或考试前夕
行动窗口结束后
季度复盘
长期未回访
用户主动设置
```

### 10.6 回访输出

```text
当时判断
当时选择
后来发生的事实
看准的部分
偏差的部分
下一步提醒
```

### 10.7 P0 权限要求

1. Followup Controller 增加 JWT Guard。
2. `handleFollowup()` 校验 record 所有权。
3. `getFollowUpContext()` 校验 followUp 所有权。
4. Dialogue reply/result 将当前 userId 传入 Service 并校验。
5. 所有回访修改记录审计事件。

### 10.8 验收

- [ ] 回访链接只能由资产所有者访问。
- [ ] 回访结果写回原事项。
- [ ] 现实结果可进入通鉴和K线事实层。
- [ ] 用户可关闭某一事项的后续提醒。

---

## 11. C01-6｜长期记忆

### 11.1 职责

保存对未来服务有持续价值、且获得用户授权的稳定事实和偏好。

### 11.2 记忆类型

保留当前七类，并增加来源和确认状态：

```text
major_issue       长期重要事项
time_anchor       关键时间点
person_anchor     重要人物
bottom_line       用户底线
repeat_pattern    重复模式
mood_signal       情绪信号
feedback          用户对结果的反馈
```

### 11.3 数据模型重构

当前 `UserMemory` 一行同时承担聚合历史和独立记忆，需拆分为：

#### A. UserMemoryProfile：每用户一行

```text
用户记忆摘要
是否启用长期记忆
最近生成时间
用户偏好
旧 JSON 数据迁移状态
```

#### B. MemoryItem：每条记忆一行

```ts
interface MemoryItem {
  id: string;
  userId: string;
  consultationId?: string;
  sourceRecordId?: string;
  personProfileId?: string;
  type: string;
  content: string;
  sourceQuote?: string;
  sourceType: 'user_stated' | 'system_extracted' | 'user_confirmed';
  confidence: number;
  weight: number;
  status: 'active' | 'archived' | 'rejected' | 'expired';
  expiresAt?: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### C. MemoryEmbedding：一对一或一对多关联 MemoryItem

```text
memoryItemId 外键
embeddingModel
embeddingVersion
dim
contentHash
```

### 11.4 记忆写入规则

1. 用户明确说出的事实可进入待确认记忆。
2. 系统推断默认不直接成为永久记忆。
3. 高敏感信息必须获得用户确认。
4. 每条记忆保留来源引用。
5. 同一事实更新形成版本，不静默覆盖。
6. 记忆只用于相关场景。
7. 用户可关闭长期记忆。

### 11.5 遗忘规则

```text
过期：只更新或删除单条 MemoryItem
衰减：降低单条记忆权重
归档：停止默认召回，保留用户可见历史
用户删除：删除 MemoryItem 及其 embedding
账户删除：按政策清理全部记忆
```

严禁通过单条记忆的 `expiresAt` 删除整个用户聚合记忆。

### 11.6 用户控制台

用户可查看：

```text
系统记住的内容
来源于哪次对话
记忆类型
是否由系统推断
最近使用时间
```

用户可执行：

```text
确认
纠正
归档
删除
关闭长期记忆
```

### 11.7 验收

- [ ] 一个用户可以拥有多条独立记忆。
- [ ] 记忆过期不会删除咨询历史和时间线。
- [ ] embedding 与 MemoryItem 存在可靠关系。
- [ ] 系统推断和用户原话在界面中明确区分。
- [ ] 用户删除记忆后，后续检索不再召回。

---

## 12. C01-7｜通鉴、复盘与洞察

### 12.1 职责

把系统预测和用户现实经历连接起来，形成可验证的决策复盘。

### 12.2 当前代码

```text
ChronicleEntry
UserInsightProfile
chronicle/
TongjianPage
ConsultRecord.closedLoopResult
ConsultFeedback
```

### 12.3 通鉴条目来源

```text
用户主动记录
问事回访
取名最终选择
K线关键事件
人物互动
系统建议复盘
```

### 12.4 复盘结构

```text
当时发生了什么
当时怎么判断
当时选择了什么
后来发生了什么
判断命中了什么
判断偏差在哪里
下次如何识别
```

### 12.5 洞察生成规则

每条洞察必须包含：

```text
insightId
洞察内容
引用的 chronicleEntryIds
样本数量
置信度
生成模型
生成版本
生成时间
用户确认状态
反例数量
```

洞察展示采用概率和趋势语言，避免把少量记录写成固定人格结论。

### 12.6 权限要求

1. Chronicle review 必须校验 entry 所有权。
2. 关联 ConsultRecord 和 PersonProfile 时校验同一用户。
3. LLM 生成洞察前只读取当前用户数据。
4. 用户删除来源条目后，相关洞察标记待重算。

### 12.7 与命运K线的关系

现实事件和复盘可作为K线的“事实反馈层”：

```text
用户记录的事件
已完成行动
现实结果
状态变化
```

命理推演数据和现实反馈数据分别标记来源，前端不得混写为同一种数据。

### 12.8 验收

- [ ] 每条复盘绑定事项或人物。
- [ ] 洞察可追溯到来源记录。
- [ ] 用户可否认或纠正洞察。
- [ ] 低样本量不生成强结论。
- [ ] 通鉴可成为后续问事和K线的辅助上下文。

---

## 13. C01-8｜收藏、导出与隐私

### 13.1 收藏

`SavedCase` 用于保存具有复用价值的命盘、卦例和结果快照。

要求：

1. 收藏保存不可变快照。
2. 原咨询删除后，收藏是否保留由用户选择。
3. 默认 `private`。
4. 发布公开案例前进行脱敏和二次确认。
5. 收藏与“历史记录”分开：历史记录是发生过，收藏是用户主动保留。

### 13.2 导出

支持按范围导出：

```text
本人资料
人物档案
咨询记录
取名记录
K线记录
回访与通鉴
系统记忆
完整账户数据
```

导出格式：

```text
JSON：完整结构化数据
PDF：用户可阅读报告
CSV：部分时间线和列表
```

### 13.3 删除

删除前展示影响：

```text
关联人物
关联事项
对话轮次
回访任务
通鉴条目
收藏快照
记忆条目
```

删除分级：

```text
隐藏：仅前台不可见
软删除：保留恢复窗口
永久删除：不可恢复
匿名化：保留聚合统计，移除身份
```

### 13.4 隐私

1. 出生信息、关系人物、健康、财务和感情记录属于敏感数据。
2. 分享卡默认隐藏姓名、精确生日、地点、问题原文和人物信息。
3. 长期记忆默认提供明确开关。
4. 用户可以查看系统推断数据。
5. 数据用途变更需要重新授权。

---

## 14. 统一资产图

```text
User
├─ BaZiProfile（本人命盘）
├─ SubjectProfile[]（本人镜像 + 相关人物）
├─ ConsultationAsset[]（事项）
│  ├─ ConsultRecord[]（结果版本）
│  │  ├─ EvidencePacket
│  │  ├─ GenerationRun[]
│  │  ├─ KnowledgeHit[]
│  │  └─ NamingResult?
│  ├─ ConsultDialogue?
│  │  └─ ConsultDialogueTurn[]
│  ├─ ConsultFollowUp[]
│  ├─ ChronicleEntry[]
│  └─ SavedCase[]
├─ MemoryItem[]
│  └─ MemoryEmbedding[]
├─ KlineBar[]
├─ StateSnapshot[]
└─ UserInsightProfile?
```

---

## 15. 用户前台信息架构

## 15.1 `/profile`｜账号与数据控制

```text
账号资料
本人出生档案
会员与积分
隐私与记忆开关
数据导出
账户删除
```

当前邀请和订单模块继续保留，资产与隐私提升到同等重要位置。

## 15.2 `/history`｜我的人生档案

一级标签：

```text
事项
人物
K线
取名
回访
收藏
```

默认进入“事项”。

## 15.3 `/result/:recordId`｜单次结果与后续动作

结果页增加：

```text
所属事项
涉及人物
当前状态
选定行动
下次回看时间
继续追问
写入通鉴
```

## 15.4 `/tongjian`｜现实复盘

继续作为实验区页面，完成以下条件后进入正式导航：

1. 所有条目绑定 userId。
2. Review 全部校验所有权。
3. 可以从事项和回访一键创建。
4. 洞察具备来源和置信度。
5. 与历史页互相跳转。

---

## 16. 统一接口方向

当前接口继续兼容，新增聚合层：

```text
GET    /api/v1/user/assets/overview
GET    /api/v1/user/assets/timeline
GET    /api/v1/user/assets/export
POST   /api/v1/user/assets/claim-anonymous
DELETE /api/v1/user/assets/account

GET    /api/v1/subjects
POST   /api/v1/subjects
PATCH  /api/v1/subjects/:profileId
POST   /api/v1/subjects/merge
DELETE /api/v1/subjects/:profileId

GET    /api/v1/consultations
GET    /api/v1/consultations/:consultationId
PATCH  /api/v1/consultations/:consultationId
POST   /api/v1/consultations/:consultationId/action
POST   /api/v1/consultations/:consultationId/review

GET    /api/v1/memories
PATCH  /api/v1/memories/:memoryId
DELETE /api/v1/memories/:memoryId
POST   /api/v1/memories/:memoryId/confirm
PATCH  /api/v1/memory-settings
```

聚合接口负责产品视图，底层现有模块继续提供专业能力。

---

## 17. 三大产品写入协议

## 17.1 命运K线

写入：

```text
本人档案引用
KlineBar / StateSnapshot
数据来源
生成版本
用户点击的节点
问此事入口产生的 consultationId
```

## 17.2 问事

写入：

```text
consultationId
recordId
人物关联
输入快照
命盘快照
判断和证据
选定行动
对话和回访
现实结果
```

## 17.3 取名

写入：

```text
consultationId
recordId
namingType
输入偏好
候选版本
收藏/淘汰/入围状态
最终选择
报告与导出记录
```

所有产品写入必须携带：

```text
userId 或安全 anonymousId
sourceEntry
schemaVersion
generatorVersion
createdAt
```

---

## 18. 指标

### 18.1 使用指标

```text
档案完成率
历史页访问率
事项回看率
人物档案使用率
追问率
回访完成率
通鉴复盘率
记忆确认率
数据导出率
```

### 18.2 长期价值指标

```text
7日复访率
30日复访率
同一事项连续使用率
同一人物关联事项数
回访后再次咨询率
会员用户资产使用深度
```

### 18.3 数据质量指标

```text
无主记录率
重复人物率
孤立 record 率
回访归属错误率
记忆来源缺失率
洞察无引用率
越权访问次数
永久删除失败率
```

---

## 19. 执行优先级

## P0｜安全与数据止损

1. 暂停或关闭会删除整行 `UserMemory` 的过期清理路径。
2. Followup 全部接口增加认证和所有权校验。
3. Dialogue reply/result 增加所有权校验。
4. Chronicle review 增加所有权校验。
5. 完成 `ConsultDialogueTurn`、`MemoryEmbedding` 生产迁移前置验证。
6. 盘点匿名记录、无 userId 记录和孤立记录。
7. 建立所有资产接口统一授权守卫。
8. 所有删除操作增加影响预览和审计。

## P1｜统一事项与历史

1. 启用 `consultationId` 作为长期事项主键。
2. `/history` 默认改为事项视图。
3. 完成人物去重、合并、解绑和待确认状态。
4. 三大产品统一写入协议。
5. 结果页增加事项、人物、行动和回访入口。
6. 建立 `/user/assets/overview` 聚合接口。

## P2｜记忆重构

1. 拆分 UserMemoryProfile 与 MemoryItem。
2. 迁移旧 JSON 聚合数据。
3. MemoryEmbedding 绑定独立 MemoryItem。
4. 建立用户记忆控制台。
5. 引入记忆确认、纠正、归档和删除。
6. 检索命中后更新单条记忆的 lastAccessedAt。

## P3｜现实复盘与长期智能

1. 通鉴与事项、人物、回访互通。
2. 洞察保存来源、版本和置信度。
3. 现实事件反馈进入K线事实层。
4. 建立个人决策模式的长期趋势。
5. 根据真实复盘调整后续建议强度。

---

## 20. 验收清单

### 20.1 账户与权限

- [ ] 用户只能读取和修改自己的资产。
- [ ] Followup、Dialogue、Chronicle 越权测试全部通过。
- [ ] 匿名记录认领具备安全校验。
- [ ] 管理员访问有审计记录。

### 20.2 本人和人物

- [ ] 本人命盘只有一个真源。
- [ ] 历史结果保留当时命盘快照。
- [ ] 人物可合并、解绑和删除。
- [ ] 自动人物需要用户确认。

### 20.3 事项

- [ ] 首问创建 consultationId。
- [ ] 深推、追问、回访沿用原事项。
- [ ] 历史页按事项、人物、时间查看。
- [ ] 事项可记录行动、结果和关闭状态。

### 20.4 记忆

- [ ] 一个用户可以保存多条独立记忆。
- [ ] 过期单条记忆不会删除用户聚合历史。
- [ ] 记忆与 embedding 关系完整。
- [ ] 用户可查看、确认、纠正和删除记忆。
- [ ] 删除后检索不再召回。

### 20.5 复盘与洞察

- [ ] 回访结果进入原事项。
- [ ] 通鉴记录可追溯事项和人物。
- [ ] 洞察显示来源数量、置信度和生成时间。
- [ ] 用户可否认洞察。
- [ ] K线区分命理数据和现实反馈数据。

### 20.6 隐私

- [ ] 用户可导出全部个人资产。
- [ ] 用户可发起账户数据删除。
- [ ] 分享内容默认脱敏。
- [ ] 长期记忆有明确开关。
- [ ] 敏感数据用途清晰可见。

---

## 21. 最终产品结果

用户资产中台完成后，人生决策宗师将形成以下连续价值：

```text
第一次使用：获得一个结果
第二次使用：系统理解背景
持续使用：同一事项可以追问、行动和回访
长期使用：用户看见自己的判断、选择和现实结果
```

三大核心产品由此共享一份真实、可控、可持续积累的个人档案。命运K线获得现实反馈，问事获得连续语境，取名获得选择记录，会员获得长期回看的明确价值。
