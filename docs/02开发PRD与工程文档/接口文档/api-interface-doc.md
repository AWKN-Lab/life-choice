# AWKN-LABlife API 接口文档

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）

> **版本**：v1.1
> **原始扫描日期**：2026-06-16
> **生产校准日期**：2026-07-07
> **当前生产入口**：[`API-当前生产接口基线-20260707.md`](./API-当前生产接口基线-20260707.md)

当前生产已新增或确认多轮对话、回访、K线阶段、成本看板、LLM 路由、MingLi Bench、枢密院、星图、编年史和写作管线等路由。下文保留原接口详解；冲突和缺项采用 2026-07-07 生产接口基线。

---

## 1. 全局约定

### 1.1 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `http://{host}:{port}/api/v1` |
| 全局前缀 | `/api/v1`（在 `main.ts` 中通过 `setGlobalPrefix` 设置） |
| 协议 | HTTP/HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |

### 1.2 认证方式

**JWT Bearer Token**

- 在需要认证的接口中，请求头需携带：
  ```
  Authorization: Bearer <token>
  ```
- Token 通过 `/api/v1/auth/login` 或 `/api/v1/auth/register` 获取
- Guard 类型：
  - `JwtAuthGuard` — 强制认证，未携带 Token 返回 401
  - `OptionalJwtAuthGuard` — 可选认证，未携带 Token 仍可访问但部分数据受限
  - `AdminGuard` — 管理员权限，需 `isAdmin=true`，否则返回 403

### 1.3 错误响应格式

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

常见状态码：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 无效 |
| 403 | 权限不足（非管理员访问管理接口） |
| 404 | 资源不存在 |
| 500 | 服务端内部错误 |

### 1.4 限流

当前未配置全局限流（未引入 `ThrottlerModule`）。

### 1.5 全局校验管道

- `ValidationPipe` 启用 `whitelist: true`（自动剥离非白名单字段）
- `transform: true`（自动类型转换）
- `forbidNonWhitelisted: true`（拒绝非白名单字段，返回 400）

---

## 2. 接口清单

### 2.1 健康检查 — `/api/v1/health`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/health` | 无 | 服务健康检查，返回 `{ code, message, service, timestamp }` |
| GET | `/health/llm` | 无 | LLM 提供商健康状态 |
| GET | `/health/db` | 无 | 数据库连接状态（推断 provider 类型，不暴露路径） |
| HEAD | `/health` | 无 | 轻量存活探针 |

---

### 2.2 特性开关 — `/api/v1/feature-flags`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/feature-flags` | 无 | 获取当前特性开关状态 |

**响应字段**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `cost_warning_enabled` | boolean | 代价警告开关 |
| `cost_confirmation_enabled` | boolean | 代价确认开关 |
| `callback_enabled` | boolean | 回调开关 |
| `memory_anchor_enabled` | boolean | 记忆锚点开关 |
| `user_classifier_enabled` | boolean | 用户分类器开关 |
| `multi_turn_enabled` | boolean | 多轮对话开关 |

---

### 2.3 认证 — `/api/v1/auth`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/auth/register` | 无 | Body: `RegisterDto` | 注册新用户 |
| POST | `/auth/login` | 无 | Body: `LoginDto` | 邮箱/手机号登录 |
| POST | `/auth/wx-login` | 无 | Body: `WxLoginDto` | 微信登录 |
| POST | `/auth/refresh` | 无 | Body: `{ userId, refreshToken }` | 刷新 Token |
| POST | `/auth/logout` | JWT | — | 登出（使当前 Session 失效） |

---

### 2.4 用户 — `/api/v1/user`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/user/profile` | JWT | — | 获取当前用户资料 |
| PATCH | `/user/profile` | JWT | Body: `UpdateProfileDto` | 更新用户资料 |
| GET | `/user/membership` | JWT | — | 获取当前用户会员信息 |

---

### 2.5 用户画像 — `/api/v1/user/profile`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/user/profile/insights` | JWT | — | 获取用户洞察画像 |

**响应类型**: `UserInsights`

---

### 2.6 咨询主流程 — `/api/v1/consult`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/consult/preview` | 无 | Body: `{ module, birthDate?, birthTime?, gender?, questionType? }` | 实验接口：免费预览（固定样例） |
| POST | `/consult/analyze` | 无 | Body: `ConsultAnalyzeDto`, Query: `lang?` | 核心分析接口（含路由+算法+LLM） |
| POST | `/consult/route` | 无 | Body: `RouteDto` | 路由分发 |
| POST | `/consult/clarify` | 无 | Body: `{ question: string }` | 生成澄清问题 |
| POST | `/consult/info` | 无 | Body: `SubmitInfoDto` | 提交补充信息 |
| GET | `/consult/result/:recordId` | OptionalJwt | Param: `recordId`, Query: `module?`, `lang?` | 获取分析结果 |
| POST | `/consult/save` | JWT | Body: `SaveRecordDto { recordId }` | 保存咨询记录 |
| GET | `/consult/records` | JWT | Query: `limit?`, `offset?` | 获取用户咨询记录列表 |
| POST | `/consult/records/delete` | JWT | Body: `DeleteRecordsDto { recordIds: string[] }` | 软删除记录（仅允许删除自己的） |
| GET | `/consult/person-profiles` | JWT | — | 获取用户人物档案列表 |
| GET | `/consult/person-profiles/:profileId/records` | JWT | Param: `profileId` | 获取某人物档案关联的咨询记录 |
| DELETE | `/consult/person-profiles/:profileId` | JWT | Param: `profileId` | 删除人物档案 |
| GET | `/consult/fortune/daily` | 无 | Query: `FortuneQueryDto`, `lang?` | 每日运势 |
| GET | `/consult/fortune/monthly/:year/:month` | 无 | Param: `year`, `month`, Query: `FortuneQueryDto`, `lang?` | 月度运势 |
| GET | `/consult/fortune/yearly/:year` | 无 | Param: `year`, Query: `FortuneQueryDto`, `lang?` | 年度运势 |
| GET | `/consult/celebrity-cases` | 无 | Query: `category?` | 名人案例列表 |
| GET | `/consult/celebrity-cases/:id` | 无 | Param: `id` | 名人案例详情 |
| POST | `/consult/celebrity-cases/:id/similarity` | 无 | Param: `id`, Body: `CelebritySimilarityDto` | 计算与名人的相似度 |
| POST | `/consult/records/:recordId/modules/:moduleId/destiny-snapshot` | 无 | Param: `recordId`, `moduleId`, Body: `{ destinyKline }` | 保存命运快照 |
| GET | `/consult/records/:recordId/modules/:moduleId` | 无 | Param: `recordId`, `moduleId` | 获取模块状态与内容 |
| POST | `/consult/records/:recordId/modules/:moduleId/retry` | 无 | Param: `recordId`, `moduleId` | 重试失败的模块 |
| POST | `/consult/records/:id/behavior` | 无 | Param: `id`, Body: `{ action, name }` | 记录用户行为 |
| GET | `/consult/admin/asset-overview` | JWT+Admin | Query: `userId?`, `moduleType?`, `startDate?`, `endDate?`, `status?`, `page?`, `limit?` | 管理员资产总览 |

---

### 2.7 多轮对话 — `/api/v1/consult/dialogue`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/consult/dialogue/start` | 无（TODO: 待加 Guard） | Body: `{ question: string }` | 开始对话 |
| POST | `/consult/dialogue/:dialogueId/reply` | 无（TODO: 待加 Guard） | Param: `dialogueId`, Body: `{ reply: string }` | 回复对话 |
| GET | `/consult/dialogue/:dialogueId/result` | 无（TODO: 待加 Guard） | Param: `dialogueId` | 获取对话结果 |

> **注意**: 当前未加 `JwtAuthGuard`，代码中有 TODO 注释。

---

### 2.8 追问 — `/api/v1/consult/followup`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/consult/followup` | 无 | Body: `{ recordId, question, context? }` | 追问（recordId 必填，question 至少 2 字符） |

---

### 2.9 人生K线 + 潮汐图 — `/api/v1/kline-tide`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/kline-tide/bars` | JWT | Query: `from?`, `to?` | K线数据（七线 OHLCV），需 kline 模块权限 |
| GET | `/kline-tide/snapshots` | JWT | Query: `from?`, `to?` | 月度状态快照（12维向量），需 tide_radar 模块权限 |
| GET | `/kline-tide/phase-points` | JWT | Query: `from?`, `to?` | 相位空间散点（免费引流入口） |
| GET | `/kline-tide/package` | JWT | Query: `from?`, `to?` | 完整潮汐数据包；免费用户返回 3 个预览节点 + `gated: "partial"` |
| POST | `/kline-tide/seed` | 无 | Query: `userId?`, `klineMonths?`, `tideMonths?` | 重新生成模拟数据（仅开发/测试） |

**权限门控逻辑**：
- `bars` / `package`：需 `checkAccess(userId, 'kline')` 通过（会员或积分）
- `snapshots`：需 `checkAccess(userId, 'tide_radar')` 通过
- `phase-points`：免费开放（引流入口）
- 免费用户访问 `package` 时返回前 3 个节点 + `gated: "partial"` + `creditsNeeded: 3`

---

### 2.10 会员与积分 — `/api/v1/membership`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/membership/plans` | 无 | — | 获取会员方案列表 |
| GET | `/membership/plans/:planId` | 无 | Param: `planId` | 获取单个会员方案详情 |
| GET | `/membership/current` | JWT | — | 获取当前用户会员状态 |
| POST | `/membership/activate` | JWT | Body: `ActivateMembershipDto { planId, orderId }` | 激活会员 |
| POST | `/membership/unlock` | JWT | Body: `UnlockModuleDto { moduleId, recordId? }` | 解锁模块（积分消耗） |
| GET | `/membership/check/:moduleId` | JWT | Param: `moduleId` | 检查模块访问权限详情 |
| GET | `/membership/history` | JWT | — | 获取会员历史 |
| POST | `/membership/cancel/:membershipId` | JWT | Param: `membershipId` | 取消会员 |
| GET | `/membership/credit/balance` | JWT | — | 获取积分余额 |
| GET | `/membership/credit/history` | JWT | Query: `page?`, `pageSize?` | 获取积分变动历史 |
| GET | `/membership/credit/costs` | 无 | — | 获取各模块积分消耗表 |

---

### 2.11 支付 — `/api/v1/payment`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/payment/create` | JWT | Body: `CreateOrderDto` | 创建订单 |
| GET | `/payment/status/:orderId` | 无 | Param: `orderId` | 查询订单状态 |
| GET | `/payment/orders` | JWT | — | 获取用户订单列表 |
| POST | `/payment/webhook/stripe` | 无 | Body: Stripe Event, Header: `stripe-signature` | Stripe Webhook 回调 |
| POST | `/payment/refund/:orderId` | JWT | Param: `orderId` | 申请退款 |

---

### 2.12 命例库 — `/api/v1/cases`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/cases` | JWT | Query: `ListSavedCasesQueryDto` | 列出命例 |
| POST | `/cases` | JWT | Body: `CreateSavedCaseDto` | 创建命例 |
| GET | `/cases/:id` | JWT | Param: `id` | 获取命例详情 |
| PATCH | `/cases/:id` | JWT | Param: `id`, Body: `UpdateSavedCaseDto` | 更新命例 |
| DELETE | `/cases/:id` | JWT | Param: `id` | 删除命例 |

---

### 2.13 反馈与校准 — `/api/v1/feedback`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/feedback` | JWT | Body: `{ recordId, rating, accuracy?, helpfulness?, tone?, comment? }` | 提交反馈 |
| GET | `/feedback/record/:recordId` | JWT | Param: `recordId` | 列出某条记录的所有反馈 |
| GET | `/feedback/admin/list` | JWT+Admin | Query: `page?`, `limit?`, `status?`, `rating?`, `routeType?`, `hasComment?` | 管理员反馈列表 |
| POST | `/feedback/:id/calibrate` | JWT+Admin | Param: `id`, Body: `{ isJudgmentCorrect, calibrationTag?, calibrationNote? }` | 专家校准 |
| POST | `/feedback/:id/apply` | JWT+Admin | Param: `id`, Body: `{ cronId? }` | 标记单条反馈为已采纳 |
| GET | `/feedback/unapplied` | JWT+Admin | — | 获取未采纳的反馈 |
| GET | `/feedback/calibrate/suggestions` | JWT+Admin | — | 生成校准建议 |
| POST | `/feedback/calibrate/run` | JWT+Admin | Body: `{ cronId? }` | 手动触发复盘（批量标记已采纳） |

---

### 2.14 命理基准测试 — `/api/v1/mingli-bench`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard, AdminGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/mingli-bench/categories` | JWT+Admin | — | 获取测试分类 |
| POST | `/mingli-bench/run` | JWT+Admin | Body: `RunBenchmarkDto` | 执行基准测试 |
| GET | `/mingli-bench/history` | JWT+Admin | — | 获取测试历史 |
| GET | `/mingli-bench/history/:runId` | JWT+Admin | Param: `runId` | 获取单次测试详情 |
| GET | `/mingli-bench/history/:runId/export` | JWT+Admin | Param: `runId` | 导出单次测试结果 |

---

### 2.15 星图（人物关系） — `/api/v1/star-chart`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/star-chart/persons` | JWT | Body: `CreatePersonDto` | 创建人物档案 |
| GET | `/star-chart/persons` | JWT | Query: `filter?` | 列出人物档案 |
| GET | `/star-chart/persons/:id` | JWT | Param: `id` | 获取人物详情 |
| PATCH | `/star-chart/persons/:id` | JWT | Param: `id`, Body: `UpdatePersonDto` | 更新人物档案 |
| DELETE | `/star-chart/persons/:id` | JWT | Param: `id` | 删除人物档案 |
| POST | `/star-chart/persons/:id/dimensions` | JWT | Param: `id`, Body: `EightDimensionsDto` | 更新八维看人数据 |
| GET | `/star-chart/persons/:id/dimensions` | JWT | Param: `id` | 获取八维看人数据 |
| GET | `/star-chart/network` | JWT | — | 获取关系网络 |
| GET | `/star-chart/network/stats` | JWT | — | 获取关系网络统计 |
| POST | `/star-chart/persons/:id/cases` | JWT | Param: `id`, Body: `CreateRelatedCaseDto` | 添加相关事项 |
| GET | `/star-chart/persons/:id/cases` | JWT | Param: `id` | 列出相关事项 |

---

### 2.16 人生枢密院 — `/api/v1/shumiyuan`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/shumiyuan/speak` | JWT | Body: `SpeakInputDto` | 第一步：说出来 |
| GET | `/shumiyuan/spread/:id` | JWT | Param: `id`（recordId） | 第二步：摆开（生成卡片） |
| POST | `/shumiyuan/spread/:id` | JWT | Param: `id`, Body: `SpreadConfirmDto` | 第二步：确认卡片 |
| GET | `/shumiyuan/bottom/:id` | JWT | Param: `id`（recordId） | 第三步：这事底 |
| POST | `/shumiyuan/bottom/:id/dispatch` | JWT | Param: `id`, Body: `DispatchActionDto { action }` | 分流操作（chronicle/respread/miaosuan/xingtu） |

---

### 2.17 庙算 — `/api/v1/miaosuan`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/miaosuan` | JWT | Body: `MiaosuanInputDto` | 创建庙算记录 |
| GET | `/miaosuan` | JWT | — | 列出用户的庙算记录 |

---

### 2.18 通鉴 — `/api/v1/chronicle`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/chronicle/entries` | JWT | Body: `CreateEntryDto` | 创建通鉴记录 |
| GET | `/chronicle/entries` | JWT | Query: `type?` | 列出通鉴记录（可按类型筛选） |
| GET | `/chronicle/reviews/pending` | JWT | — | 获取待回看的记录 |
| POST | `/chronicle/entries/:id/review` | JWT | Param: `id`, Body: `ReviewEntryDto` | 添加回看 |
| GET | `/chronicle/insights` | JWT | — | 获取洞察画像 |
| POST | `/chronicle/insights/generate` | JWT | — | 生成洞察画像 |

---

### 2.19 增长 — `/api/v1/growth`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/growth/invite-code` | JWT | — | 获取当前用户邀请码 |
| GET | `/growth/invite-stats` | JWT | — | 获取邀请统计 |
| POST | `/growth/referral/record` | 无 | Body: `{ inviteCode, source?, medium?, campaign? }` | 记录回流访问 |
| POST | `/growth/referral/activate` | JWT | Body: `{ referralId }` | 激活邀请关系 |
| GET | `/growth/offers` | 无 | — | 获取当前有效优惠活动 |

---

### 2.20 数据分析 — `/api/v1/analytics`

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| GET | `/analytics/admin/stats` | JWT+Admin | — | 管理后台统计数据 |
| POST | `/analytics/page-visit` | 无 | Body: `{ pageName, pageUrl?, referrer?, screenSize?, duration? }`, Header: `user-agent` | 记录页面访问 |
| POST | `/analytics/activity` | 无 | Body: `{ activityType, activityData?, duration? }` | 记录用户活动 |
| POST | `/analytics/event` | 无 | Body: `{ event, data?, timestamp? }` | 记录漏斗事件 |
| POST | `/analytics/bazi-profile` | JWT | Body: 八字档案数据 | 保存八字档案 |
| GET | `/analytics/bazi-profile` | JWT | — | 获取用户八字档案 |
| GET | `/analytics/stats` | JWT | — | 获取用户分析统计 |
| POST | `/analytics/consult-result` | JWT | Body: `{ recordId, analysisData }` | 批量保存分析结果 |

---

### 2.21 管理后台 — `/api/v1/admin`

整个 Controller 级别使用 `@UseGuards(JwtAuthGuard, AdminGuard)`。

| 方法 | 路径 | 认证 | 参数 | 说明 |
|------|------|------|------|------|
| POST | `/admin/rules/reload` | JWT+Admin | — | 热重载场景调度规则 |
| GET | `/admin/users` | JWT+Admin | Query: `page?`, `limit?`, `userId?` | 用户列表 |
| GET | `/admin/person-profiles` | JWT+Admin | Query: `page?`, `limit?`, `userId?`, `birthDate?`, `sessionId?` | 人物档案列表 |
| GET | `/admin/consult-records` | JWT+Admin | Query: `page?`, `limit?`, `userId?`, `sessionId?`, `routeType?`, `startDate?`, `endDate?` | 搜索咨询记录 |
| GET | `/admin/consult-records/:id` | JWT+Admin | Param: `id` | 咨询记录详情 |
| GET | `/admin/consult-records/:id/manifest` | JWT+Admin | Param: `id` | 咨询记录分析摘要 |
| GET | `/admin/consult-records/:id/evidence` | JWT+Admin | Param: `id` | 证据链 |
| GET | `/admin/consult-records/:id/generation-runs` | JWT+Admin | Param: `id` | 生成过程 |
| GET | `/admin/knowledge-hits` | JWT+Admin | Query: `recordId` | 知识命中记录 |
| GET | `/admin/interaction-events` | JWT+Admin | Query: `recordId?`, `limit?` | 用户互动事件 |
| GET | `/admin/consult-previews` | JWT+Admin | Query: `page?`, `limit?`, `module?`, `userId?` | 预览记录列表 |
| GET | `/admin/memberships` | JWT+Admin | Query: `page?`, `limit?`, `userId?`, `type?`, `status?` | 会员列表 |
| GET | `/admin/naming-records` | JWT+Admin | Query: `page?`, `limit?` | 起名记录 |
| GET | `/admin/question-records` | JWT+Admin | Query: `page?`, `limit?` | 问事记录 |
| GET | `/admin/kline-records` | JWT+Admin | Query: `page?`, `limit?` | K线记录 |
| GET | `/admin/unlock-records` | JWT+Admin | Query: `page?`, `limit?`, `userId?` | 解锁记录 |
| GET | `/admin/credit-usage` | JWT+Admin | Query: `page?`, `limit?`, `userId?` | 积分使用记录 |
| GET | `/admin/llm-failures` | JWT+Admin | Query: `page?`, `limit?`, `errorType?` | LLM 失败记录 |
| GET | `/admin/stats` | JWT+Admin | — | 基础统计概览 |
| GET | `/admin/stats/enhanced` | JWT+Admin | — | 增强版统计（含按来源/路由/会员类型分组） |

---

## 3. 分页约定

管理端列表接口统一使用分页参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码（≥1） |
| `limit` | number | 20 | 每页条数（1-100） |

响应格式：

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## 4. 路由类型枚举

咨询记录的 `routeType` 字段取值：

| 值 | 说明 |
|-----|------|
| `ziping` | 子平八字 |
| `liuren` | 大六壬 |
| `liuyao` | 六爻 |
| `qimen` | 奇门遁甲 |
| `quming` | 起名 |
| `shumiyuan` | 人生枢密院 |

---

## 5. 模块 ID 枚举

会员/积分系统中的 `moduleId` 取值：

| 值 | 说明 |
|-----|------|
| `kline` | 人生K线 |
| `tide_radar` | 潮汐雷达 |
| `naming` | 起名 |

---

## 6. 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-06-16 | v1.0 | 初始版本，基于代码库 21 个 Controller 扫描生成 |
