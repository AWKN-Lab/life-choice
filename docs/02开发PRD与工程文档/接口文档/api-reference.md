# 人生决策宗师 API 参考文档

> **状态：DEPRECATED**（2026-07-11 标注，权威文档已替换为 *-当前生产*基线-20260707.md，本文保留为历史参考）

> **版本**：v1.1
> **原始日期**：2026-06-15
> **生产校准日期**：2026-07-07
> **当前生产接口入口**：[`API-当前生产接口基线-20260707.md`](./API-当前生产接口基线-20260707.md)
> **统一口径源**：[`_ground-truth.md`](../工程交接/_ground-truth.md)

下文保留详细接口参考。新增路由、生产状态和知识接口性能采用 2026-07-07 基线。

---

## 目录

1. [概述](#1-概述)
2. [认证](#2-认证)
3. [咨询 API（核心）](#3-咨询-api核心)
4. [会员与支付 API](#4-会员与支付-api)
5. [增长 API](#5-增长-api)
6. [反馈 API](#6-反馈-api)
7. [K线与潮汐 API](#7-k线与潮汐-api)
8. [通鉴 API](#8-通鉴-api)
9. [星图 API](#9-星图-api)
10. [枢密院 API](#10-枢密院-api)
11. [妙算 API](#11-妙算-api)
12. [管理后台 API](#12-管理后台-api)
13. [健康检查 API](#13-健康检查-api)
14. [功能开关 API](#14-功能开关-api)
15. [用户 API](#15-用户-api)
16. [分析 API](#16-分析-api)
17. [命理基准 API](#17-命理基准-api)
18. [收藏案例 API](#18-收藏案例-api)
19. [错误码参考](#19-错误码参考)

---

## 1. 概述

### 基础信息

| 属性 | 值 |
|------|-----|
| Base URL | `/api/v1` |
| 协议 | HTTPS |
| 数据格式 | JSON |
| 字符编码 | UTF-8 |
| 时区 | 请求中带 `timezone` 字段，默认 Asia/Shanghai |

### 认证方式

| 守卫 | 说明 | 标记 |
|------|------|------|
| **JwtAuthGuard** | 必须登录，请求头携带 `Authorization: Bearer <token>` | 🔒 JWT |
| **OptionalJwtAuthGuard** | 可选登录，未登录也能访问，登录后获得个性化数据 | 🔑 OptionalJWT |
| **AdminGuard** | 必须管理员，需同时通过 JWT + Admin 校验 | 🛡️ Admin |
| 无守卫 | 公开接口，无需认证 | 🌐 Public |

### 通用错误格式

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

### 通用分页格式

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### 限流

- 默认限流：每 IP 60 次/分钟
- 分析类接口（`/consult/analyze`）：每用户 10 次/分钟
- 支付回调（`/payment/webhook/*`）：无限制（由签名验证保护）

---

## 2. 认证

### 2.1 注册

```
POST /api/v1/auth/register
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✅ | 邮箱地址 |
| `phone` | string | ❌ | 手机号 |
| `password` | string | ❌ | 密码，至少 6 位 |
| `nickname` | string | ❌ | 昵称 |

**响应**：

```json
{
  "id": "clx...",
  "email": "user@example.com",
  "nickname": "张三",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

### 2.2 登录

```
POST /api/v1/auth/login
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | ✅ | 邮箱或账号 |
| `password` | string | ✅ | 密码，至少 6 位 |

**响应**：同注册响应格式。

### 2.3 微信登录

```
POST /api/v1/auth/wx-login
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `wxOpenId` | string | ✅ | 微信 OpenID |
| `nickname` | string | ❌ | 微信昵称 |
| `avatarUrl` | string | ❌ | 微信头像 URL |

**响应**：同注册响应格式。

### 2.4 刷新令牌

```
POST /api/v1/auth/refresh
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `userId` | string | ✅ | 用户 ID |
| `refreshToken` | string | ✅ | 刷新令牌 |

**响应**：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4..."
}
```

### 2.5 登出

```
POST /api/v1/auth/logout
🔒 JWT
```

**响应**：

```json
{
  "message": "登出成功"
}
```

---

## 3. 咨询 API（核心）

> 核心业务线。4 路由分类 + 4 用户状态 + 三套输出格式。

### 路由类型（RouteType）

| 值 | 含义 | 说明 |
|----|------|------|
| `ziping` | 子平八字 | 四柱八字排盘分析 |
| `liuren` | 六壬 | 大六壬断事推演 |
| `mixed` | 混合路由 | 系统自动判断最佳路由 |
| `clarify` | 澄清路由 | 问题不明确，需补充信息 |

> **DTO 扩展路由**：`quming`（取名）、`qimen`（奇门）、`liuyao`（六爻）、`ziwei`（紫微）——在 `ConsultAnalyzeDto.routeType` 中可选，由 Zhangbanshan Scheduler 调度对应 Agent。

### 用户状态分类（UserState）

| 值 | 含义 | 判定规则 |
|----|------|---------|
| `casual` | 随意型 | 默认兜底 |
| `genuine` | 真诚型 | 问题具体 + 情绪词 + 背景描述，三条件满足任意两个 |
| `repeating` | 回访型 | 30 天内问过类似问题（优先级最高） |
| `validating` | 验证型 | 问题含"之前有人说"/"别的师傅说"等验证型关键词 |

> ⚠️ 原文档 6 类（real_issue/verification/emotional_pressure/high_risk）未实现，已废弃。以 `_ground-truth.md` 为准。

### 输出格式

#### A. 张半山三段式（主路径）

| 字段 | 含义 |
|------|------|
| `judgment` | 我的判断 |
| `premise` | 前提 |
| `cost` | 代价 |
| `reasoning_trace` | 推理轨迹（可选） |
| `costWarnings` | 代价提醒（可选） |

#### B. 5 层输出（付费分层）

| 字段 | 层级 | 标记正则 | 免费可见 |
|------|------|---------|---------|
| `factLayer` | L2-1 事实层 | `【事实层】|【L2-1】|【八字排盘】|【事实】` | ✅ |
| `interpretationLayer` | L2-2 解读层 | `【解读层】|【L2-2】|【格局用神】|【解读】` | ✅ |
| `deductionLayer` | L2-3 推演层 | `【推演层】|【L2-3】|【推演路径】|【推演】` | ❌ gated |
| `adviceLayer` | L2-4 建议层 | `【建议层】|【L2-4】|【行动建议】|【建议】` | ❌ gated |
| `insightLayer` | L2-5 点睛层 | `【点睛层】|【L2-5】|【金句】|【点睛】` | ❌ gated |

#### C. 6 段 Prompt（降级路径）

| 序号 | 段标题 |
|------|--------|
| 1 | 一句话定性 |
| 2 | 判断依据 |
| 3 | 当前风险 |
| 4 | 建议动作 |
| 5 | 时间窗口 |
| 6 | 落一句最实在的话 |

> 前端消费：`llmResult` JSON 同时包含 `zhangbanshan_output`（三段式）和 `fiveLayers`（5 层）。

---

### 3.1 路由分类

```
POST /api/v1/consult/route
🌐 Public
```

**请求体**（RouteDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question` | string | ✅ | 问题内容，2-500 字符 |
| `userId` | string | ❌ | 用户 ID |
| `sessionId` | string | ❌ | 会话 ID |
| `source` | string | ❌ | 来源渠道 |
| `timezone` | string | ❌ | 时区 |
| `device` | string | ❌ | 设备信息 |

**响应**：

```json
{
  "routeType": "ziping",
  "confidence": 0.92,
  "clarifyingQuestion": null
}
```

### 3.2 澄清问题

```
POST /api/v1/consult/clarify
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question` | string | ✅ | 原始问题 |

**响应**：

```json
{
  "clarifyingQuestion": "您想了解的是事业方向还是感情问题？"
}
```

### 3.3 提交信息

```
POST /api/v1/consult/info
🌐 Public
```

**请求体**（SubmitInfoDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sessionId` | string | ✅ | 会话 ID |
| `routeType` / `route_type` | string | ❌ | 路由类型 |
| `question` | string | ✅ | 问题内容 |
| `askTime` / `ask_time` | string | ❌ | 起卦时间 |
| `askLocation` / `ask_location` | string | ❌ | 起卦地点 |
| `birthDate` / `birth_date` | string | ❌ | 出生日期（YYYY-MM-DD） |
| `birthTime` / `birth_time` | string | ❌ | 出生时间（HH:mm） |
| `birthPlace` / `birth_place` | string | ❌ | 出生地点 |
| `gender` | string | ❌ | 性别：`male` / `female` |
| `isTimeUnknown` / `is_time_unknown` / `timeUnknown` / `time_unknown` | boolean | ❌ | 出生时间未知 |

> DTO 同时支持 camelCase 和 snake_case 字段名。

**响应**：

```json
{
  "sessionId": "sess_...",
  "status": "info_collected",
  "nextStep": "analyze"
}
```

### 3.4 分析（核心接口）

```
POST /api/v1/consult/analyze?lang=zh-CN
🌐 Public
```

**请求体**（ConsultAnalyzeDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `routeType` / `route_type` | string | ❌ | 路由类型：`ziping` / `liuren` / `quming` / `qimen` / `liuyao` / `ziwei` |
| `question` | string | ✅ | 问题内容，2-500 字符 |
| `birthDate` / `birth_date` | string | ❌ | 出生日期 |
| `birthTime` / `birth_time` | string | ❌ | 出生时间 |
| `birthPlace` / `birth_place` | string | ❌ | 出生地点 |
| `gender` | string | ❌ | 性别：`male` / `female` |
| `askTime` | string | ❌ | 起卦时间 |
| `askLocation` | string | ❌ | 起卦地点 |
| `userId` | string | ❌ | 用户 ID |
| `sessionId` | string | ❌ | 会话 ID |
| `source` | string | ❌ | 来源 |
| `lang` | string | ❌ | 语言，默认 `zh-CN` |
| **取名参数** | | | |
| `surname` | string | ❌ | 姓氏（取名专用） |
| `parentWish` | string | ❌ | 家长期望（取名专用） |
| `avoidChars` | string[] | ❌ | 忌用字（取名专用） |
| `sourceEntry` / `source_entry` | string | ❌ | 来源入口 |
| `namingType` / `naming_type` | string | ❌ | 取名类型 |
| `namingPreferences` / `naming_preferences` | string | ❌ | 取名偏好 |
| `questionIntent` / `question_intent` | string | ❌ | 问题意图 |
| `unlockStatus` / `unlock_status` | string | ❌ | 解锁状态 |
| **多轮对话参数** | | | |
| `stylePreference` / `style_preference` | string | ❌ | 风格偏好 |
| `improveFocus` / `improve_focus` | string | ❌ | 改进焦点 |
| `industry` | string | ❌ | 行业 |
| `targetAudience` / `target_audience` | string | ❌ | 目标受众 |
| `originalName` / `original_name` | string | ❌ | 原名 |
| `customDescription` / `custom_description` | string | ❌ | 自定义描述 |
| `birth_hour` | string | ❌ | 出生时辰 |
| `birth_minute` | string | ❌ | 出生分钟 |

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `lang` | string | 语言，覆盖 body 中的 `lang`，默认 `zh-CN` |

**成功响应**（ConsultAnalyzeResponse）：

```json
{
  "route_type": "ziping",
  "summary_line": "事业运势稳中有升",
  "summary_body": "从八字格局来看...",
  "risks": ["注意口舌是非", "避免冲动决策"],
  "actions": ["把握贵人运", "稳健推进"],
  "time_window": "2026年7-9月为关键期",
  "evidence_fold": "四柱：甲子 丙寅 戊辰 庚午...",
  "paywall_modules": ["deep_analysis", "kline"],
  "record_id": "clx...",
  "calc_result": {
    "yearPillar": "甲子",
    "monthPillar": "丙寅",
    "dayPillar": "戊辰",
    "hourPillar": "庚午",
    "yearShishen": "偏印",
    "monthShishen": "正印",
    "dayShishen": "日主",
    "hourShishen": "食神",
    "wuxing": { "year": "木", "month": "火", "day": "土", "hour": "金" },
    "naYin": { "year": "海中金", "month": "炉中火", "day": "大林木", "hour": "路旁土" },
    "mingGong": "寅宫"
  },
  "algorithm_result": {}
}
```

**错误响应**（服务端异常兜底）：

```json
{
  "error": true,
  "status": 500,
  "message": "分析服务暂时不可用，请稍后重试",
  "route_type": "ziping",
  "record_id": ""
}
```

### 3.5 获取结果

```
GET /api/v1/consult/result/:recordId?module=ziping&lang=zh-CN
🔑 OptionalJWT
```

**路径参数**：

| 参数 | 说明 |
|------|------|
| `recordId` | 咨询记录 ID |

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `module` | string | 模块 ID |
| `lang` | string | 语言，默认 `zh-CN` |

**响应**：包含 `zhangbanshan_output` + `fiveLayers` + `rawText` 的完整结果。

### 3.6 保存记录

```
POST /api/v1/consult/save
🔒 JWT
```

**请求体**（SaveRecordDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordId` | string | ✅ | 咨询记录 ID |

**响应**：

```json
{
  "success": true,
  "recordId": "clx..."
}
```

### 3.7 获取记录列表

```
GET /api/v1/consult/records?limit=20&offset=0
🔒 JWT
```

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | number | 每页条数 |
| `offset` | number | 偏移量 |

### 3.8 删除记录（软删除）

```
POST /api/v1/consult/records/delete
🔒 JWT
```

**请求体**（DeleteRecordsDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordIds` | string[] | ✅ | 要删除的记录 ID 列表 |

**响应**：

```json
{
  "deletedCount": 3
}
```

> 仅允许删除自己的记录，执行软删除（设置 `deletedAt`）。

### 3.9 获取人物档案列表

```
GET /api/v1/consult/person-profiles
🔒 JWT
```

### 3.10 获取人物档案关联记录

```
GET /api/v1/consult/person-profiles/:profileId/records
🔒 JWT
```

### 3.11 删除人物档案

```
DELETE /api/v1/consult/person-profiles/:profileId
🔒 JWT
```

### 3.12 每日运势

```
GET /api/v1/consult/fortune/daily?birthDate=1990-01-15&birthTime=12:00&gender=male&lang=zh-CN
🌐 Public
```

**查询参数**（FortuneQueryDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `birthDate` | string | ✅ | 出生日期 |
| `birthTime` | string | ❌ | 出生时间 |
| `gender` | string | ❌ | 性别 |
| `birthPlace` | string | ❌ | 出生地点 |

### 3.13 月度运势

```
GET /api/v1/consult/fortune/monthly/:year/:month?birthDate=1990-01-15&lang=zh-CN
🌐 Public
```

### 3.14 年度运势

```
GET /api/v1/consult/fortune/yearly/:year?birthDate=1990-01-15&lang=zh-CN
🌐 Public
```

### 3.15 名人案例列表

```
GET /api/v1/consult/celebrity-cases?category=business
🌐 Public
```

### 3.16 名人案例详情

```
GET /api/v1/consult/celebrity-cases/:id
🌐 Public
```

### 3.17 名人相似度计算

```
POST /api/v1/consult/celebrity-cases/:id/similarity
🌐 Public
```

**请求体**（CelebritySimilarityDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `birthDate` | string | ✅ | 出生日期 |
| `birthTime` | string | ❌ | 出生时间 |
| `gender` | string | ❌ | 性别 |
| `birthPlace` | string | ❌ | 出生地点 |

### 3.18 保存命运快照

```
POST /api/v1/consult/records/:recordId/modules/:moduleId/destiny-snapshot
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `destinyKline` | object | ✅ | 命运 K 线数据 |

### 3.19 获取模块状态

```
GET /api/v1/consult/records/:recordId/modules/:moduleId
🌐 Public
```

**响应**：

```json
{
  "recordId": "clx...",
  "moduleId": "ziping",
  "status": "completed",
  "content": { "...": "..." },
  "followUpQuestions": ["您还想了解哪方面？"],
  "errorCode": null,
  "errorMessage": null,
  "startedAt": "2026-06-15T10:00:00.000Z",
  "finishedAt": "2026-06-15T10:00:05.000Z"
}
```

**status 可能值**：`pending` / `running` / `completed` / `failed` / `not_found`

### 3.20 保存行为

```
POST /api/v1/consult/records/:id/behavior
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | ✅ | 行为类型 |
| `name` | string | ✅ | 行为名称 |

### 3.21 重试失败模块

```
POST /api/v1/consult/records/:recordId/modules/:moduleId/retry
🌐 Public
```

**成功响应**：

```json
{
  "data": {
    "recordId": "clx...",
    "moduleId": "ziping",
    "status": "processing",
    "message": "重试任务已加入队列"
  },
  "error": null
}
```

**无可重试记录**：

```json
{
  "error": "no_retryable_module",
  "message": "该模块没有可重试的失败记录"
}
```

### 3.22 预览（实验接口）

```
POST /api/v1/consult/preview
🌐 Public
```

> ⚠️ 实验接口，主流程不使用。返回固定样例内容，仅用于开发调试。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `module` | string | ✅ | 模块：`kline` / `naming` / `question` |
| `birthDate` | string | ❌ | 出生日期 |
| `birthTime` | string | ❌ | 出生时间 |
| `gender` | string | ❌ | 性别 |
| `questionType` | string | ❌ | 问题类型 |

### 3.23 对话（多轮）

```
POST /api/v1/consult/dialogue/start
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `question` | string | ✅ | 问题内容 |

```
POST /api/v1/consult/dialogue/:dialogueId/reply
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reply` | string | ✅ | 回复内容 |

```
GET /api/v1/consult/dialogue/:dialogueId/result
🌐 Public
```

### 3.24 追问

```
POST /api/v1/consult/followup
🌐 Public
```

**请求体**（FollowupDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordId` | string | ✅ | 咨询记录 ID |
| `question` | string | ✅ | 追问内容，至少 2 字符 |
| `context` | Array<{role: string, content: string}> | ❌ | 对话上下文 |

### 3.25 管理员资产概览

```
GET /api/v1/consult/admin/asset-overview?userId=&moduleType=&startDate=&endDate=&status=&page=1&limit=20
🔒 JWT（需管理员）
```

> 虽然使用 `JwtAuthGuard`，但内部校验 `req.user.isAdmin`，非管理员返回 403。

---

## 4. 会员与支付 API

### 4.1 会员方案

#### 获取方案列表

```
GET /api/v1/membership/plans
🌐 Public
```

#### 获取方案详情

```
GET /api/v1/membership/plans/:planId
🌐 Public
```

#### 获取当前会员

```
GET /api/v1/membership/current
🔒 JWT
```

#### 激活会员

```
POST /api/v1/membership/activate
🔒 JWT
```

**请求体**（ActivateMembershipDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `planId` | string | ✅ | 方案 ID |
| `orderId` | string | ❌ | 订单 ID |

#### 解锁模块

```
POST /api/v1/membership/unlock
🔒 JWT
```

**请求体**（UnlockModuleDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `moduleId` | string | ✅ | 模块 ID |
| `recordId` | string | ❌ | 关联记录 ID |

#### 检查访问权限

```
GET /api/v1/membership/check/:moduleId
🔒 JWT
```

#### 会员历史

```
GET /api/v1/membership/history
🔒 JWT
```

#### 取消会员

```
POST /api/v1/membership/cancel/:membershipId
🔒 JWT
```

### 4.2 积分

#### 积分余额

```
GET /api/v1/membership/credit/balance
🔒 JWT
```

#### 积分历史

```
GET /api/v1/membership/credit/history?page=1&pageSize=20
🔒 JWT
```

#### 模块积分消耗

```
GET /api/v1/membership/credit/costs
🌐 Public
```

### 4.3 支付

#### 创建订单

```
POST /api/v1/payment/create
🔒 JWT
```

**请求体**（CreateOrderDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `productType` | string | ✅ | 产品类型：`membership` / `single` |
| `productId` | string | ✅ | 产品 ID |
| `paymentMethod` | string | ✅ | 支付方式：`stripe` / `wechat` / `alipay` |
| `amount` | number | ✅ | 金额（分） |
| `currency` | string | ❌ | 货币，默认 CNY |
| `metadata` | Record\<string, string\> | ❌ | 附加信息 |

#### 查询订单状态

```
GET /api/v1/payment/status/:orderId
🌐 Public
```

#### 获取订单列表

```
GET /api/v1/payment/orders
🔒 JWT
```

#### Stripe Webhook

```
POST /api/v1/payment/webhook/stripe
🌐 Public
```

> 由 Stripe 回调，通过 `stripe-signature` 请求头验证签名。

#### 退款

```
POST /api/v1/payment/refund/:orderId
🔒 JWT
```

---

## 5. 增长 API

### 5.1 获取邀请码

```
GET /api/v1/growth/invite-code
🔒 JWT
```

**响应**：

```json
{
  "code": "AWKN2026"
}
```

### 5.2 邀请统计

```
GET /api/v1/growth/invite-stats
🔒 JWT
```

**响应**：

```json
{
  "code": "AWKN2026",
  "usedCount": 5,
  "referrals": 3
}
```

### 5.3 记录回流访问

```
POST /api/v1/growth/referral/record
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `inviteCode` | string | ✅ | 邀请码 |
| `source` | string | ❌ | UTM 来源 |
| `medium` | string | ❌ | UTM 媒介 |
| `campaign` | string | ❌ | UTM 活动 |

**响应**：

```json
{
  "success": true,
  "referralId": "ref_..."
}
```

### 5.4 激活邀请关系

```
POST /api/v1/growth/referral/activate
🔒 JWT
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `referralId` | string | ✅ | 回流记录 ID |

### 5.5 获取优惠活动

```
GET /api/v1/growth/offers
🌐 Public
```

**响应**：

```json
{
  "offers": [
    {
      "id": "offer_...",
      "name": "新用户首月优惠",
      "discount": 0.5,
      "validUntil": "2026-07-31T23:59:59.000Z"
    }
  ]
}
```

---

## 6. 反馈 API

### 6.1 提交反馈

```
POST /api/v1/feedback
🔒 JWT
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordId` | string | ✅ | 咨询记录 ID |
| `rating` | number | ✅ | 总体评分（1-5） |
| `accuracy` | number | ❌ | 准确度评分（1-5） |
| `helpfulness` | number | ❌ | 有用度评分（1-5） |
| `tone` | number | ❌ | 语气评分（1-5） |
| `comment` | string | ❌ | 文字评价 |

### 6.2 列出记录反馈

```
GET /api/v1/feedback/record/:recordId
🔒 JWT
```

### 6.3 管理员 - 反馈列表

```
GET /api/v1/feedback/admin/list?page=1&limit=20&status=all&rating=all&routeType=all&hasComment=
🛡️ Admin
```

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码 |
| `limit` | number | 每页条数 |
| `status` | string | 状态：`pending` / `reviewed` / `applied` / `all` |
| `rating` | number | 评分筛选 |
| `routeType` | string | 路由类型筛选 |
| `hasComment` | string | 是否有评论：`true` / `false` |

### 6.4 管理员 - 校准反馈

```
POST /api/v1/feedback/:id/calibrate
🛡️ Admin
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `isJudgmentCorrect` | boolean | ✅ | 判断是否正确 |
| `calibrationTag` | string | ❌ | 校准标签 |
| `calibrationNote` | string | ❌ | 校准备注 |

### 6.5 管理员 - 标记单条已采纳

```
POST /api/v1/feedback/:id/apply
🛡️ Admin
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cronId` | string | ❌ | 批次 ID，默认自动生成 |

### 6.6 管理员 - 未采纳反馈

```
GET /api/v1/feedback/unapplied
🛡️ Admin
```

### 6.7 管理员 - 校准建议

```
GET /api/v1/feedback/calibrate/suggestions
🛡️ Admin
```

### 6.8 管理员 - 执行校准

```
POST /api/v1/feedback/calibrate/run
🛡️ Admin
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `cronId` | string | ❌ | 批次 ID |

**响应**：包含未采纳反馈统计 + 采纳结果 + 校准建议。

---

## 7. K线与潮汐 API

> 所有 GET 端点需 JWT 认证 + 积分/会员门控。

### 7.1 K线数据

```
GET /api/v1/kline-tide/bars?from=2025-01&to=2025-06
🔒 JWT
```

> 需 `kline` 模块权限。无权限时返回 `{ gated: true, moduleId: "kline", creditsNeeded: 3 }`。

### 7.2 月度状态快照

```
GET /api/v1/kline-tide/snapshots?from=2025-01&to=2025-06
🔒 JWT
```

> 需 `tide_radar` 模块权限。无权限时返回 `{ gated: true, moduleId: "tide_radar", creditsNeeded: 3 }`。

### 7.3 相位空间散点

```
GET /api/v1/kline-tide/phase-points?from=2025-01&to=2025-06
🔒 JWT
```

> 免费引流入口，无需额外权限。

### 7.4 完整潮汐数据包

```
GET /api/v1/kline-tide/package?from=2025-01&to=2025-06
🔒 JWT
```

**付费用户响应**：完整 K 线 + 状态快照 + 相位点。

**免费用户响应**（部分数据）：

```json
{
  "klineBars": ["...前3个节点..."],
  "stateSnapshots": ["...前3个节点..."],
  "phasePoints": ["...前3个节点..."],
  "meta": {
    "totalBars": 36,
    "totalSnapshots": 12,
    "totalPhasePoints": 36
  },
  "gated": "partial",
  "moduleId": "kline",
  "creditsNeeded": 3,
  "creditBalance": 0,
  "requiredPlan": "month",
  "message": "免费用户可查看 3 个关键节点，解锁后查看完整 K线推演"
}
```

### 7.5 重新生成模拟数据（开发用）

```
POST /api/v1/kline-tide/seed?userId=demo-user&klineMonths=36&tideMonths=12
🌐 Public
```

> ⚠️ 仅开发/测试环境使用。

---

## 8. 通鉴 API

> 所有端点需 JWT 认证。

### 8.1 创建条目

```
POST /api/v1/chronicle/entries
🔒 JWT
```

**请求体**（CreateEntryDto）：包含条目类型、内容、关联记录等字段。

### 8.2 列出条目

```
GET /api/v1/chronicle/entries?type=decision
🔒 JWT
```

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `type` | string | 条目类型筛选 |

### 8.3 待复盘列表

```
GET /api/v1/chronicle/reviews/pending
🔒 JWT
```

### 8.4 添加复盘

```
POST /api/v1/chronicle/entries/:id/review
🔒 JWT
```

**请求体**（ReviewEntryDto）：包含复盘评分、内容等字段。

### 8.5 获取洞察画像

```
GET /api/v1/chronicle/insights
🔒 JWT
```

### 8.6 生成洞察画像

```
POST /api/v1/chronicle/insights/generate
🔒 JWT
```

---

## 9. 星图 API

> 所有端点需 JWT 认证。

### 9.1 人物档案

#### 创建人物

```
POST /api/v1/star-chart/persons
🔒 JWT
```

**请求体**（CreatePersonDto）：包含姓名、出生信息、关系等字段。

#### 列出人物

```
GET /api/v1/star-chart/persons?filter=
🔒 JWT
```

#### 获取人物详情

```
GET /api/v1/star-chart/persons/:id
🔒 JWT
```

#### 更新人物

```
PATCH /api/v1/star-chart/persons/:id
🔒 JWT
```

**请求体**（UpdatePersonDto）：部分更新字段。

#### 删除人物

```
DELETE /api/v1/star-chart/persons/:id
🔒 JWT
```

### 9.2 八维看人

#### 更新维度评分

```
POST /api/v1/star-chart/persons/:id/dimensions
🔒 JWT
```

**请求体**（EightDimensionsDto）：8 个维度的评分数据。

#### 获取维度评分

```
GET /api/v1/star-chart/persons/:id/dimensions
🔒 JWT
```

### 9.3 关系网络

#### 获取网络图

```
GET /api/v1/star-chart/network
🔒 JWT
```

#### 获取网络统计

```
GET /api/v1/star-chart/network/stats
🔒 JWT
```

### 9.4 相关事项

#### 添加事项

```
POST /api/v1/star-chart/persons/:id/cases
🔒 JWT
```

**请求体**（CreateRelatedCaseDto）：事项内容、类型等字段。

#### 列出事项

```
GET /api/v1/star-chart/persons/:id/cases
🔒 JWT
```

---

## 10. 枢密院 API

> 所有端点需 JWT 认证。四步流程：说出来 → 摆开 → 底了 → 分流。

### 10.1 说出来

```
POST /api/v1/shumiyuan/speak
🔒 JWT
```

**请求体**（SpeakInputDto）：包含问题、出生信息等字段。

### 10.2 摆开 — 生成卡片

```
GET /api/v1/shumiyuan/spread/:id
🔒 JWT
```

### 10.3 摆开 — 确认卡片

```
POST /api/v1/shumiyuan/spread/:id
🔒 JWT
```

**请求体**（SpreadConfirmDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `confirmed` | boolean | ✅ | 是否确认 |

> 确认后流程状态流转至 `bottomed`。

### 10.4 这事底

```
GET /api/v1/shumiyuan/bottom/:id
🔒 JWT
```

### 10.5 分流操作

```
POST /api/v1/shumiyuan/bottom/:id/dispatch
🔒 JWT
```

**请求体**（DispatchActionDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | ✅ | 分流动作：`chronicle` / `respread` / `miaosuan` / `xingtu` |

**响应**：

| action | redirectTo | 说明 |
|--------|-----------|------|
| `chronicle` | `/tongjian` | 进入通鉴 |
| `respread` | `/shumiyuan/spread/:id` | 重新摆开 |
| `miaosuan` | `/miaosuan` | 进入妙算 |
| `xingtu` | `/xingtu` | 进入星图 |

**流程状态**（FlowState）：`speaking` → `spreading` → `bottomed` → `chronicled`

---

## 11. 妙算 API

> 所有端点需 JWT 认证。

### 11.1 创建妙算

```
POST /api/v1/miaosuan
🔒 JWT
```

**请求体**（MiaosuanInputDto）：包含问题、出生信息等字段。

### 11.2 列出妙算记录

```
GET /api/v1/miaosuan
🔒 JWT
```

---

## 12. 管理后台 API

> 所有端点需 JWT + AdminGuard 双重认证。

### 12.1 热重载场景规则

```
POST /api/v1/admin/rules/reload
🛡️ Admin
```

**响应**：

```json
{
  "success": true,
  "scenarios": 12,
  "classifications": 8,
  "tool_combos": 5
}
```

### 12.2 用户管理

#### 用户列表

```
GET /api/v1/admin/users?page=1&limit=20&userId=
🛡️ Admin
```

**响应**：用户列表 + 关联记录数/订单数 + 分页信息。

### 12.3 人物档案管理

```
GET /api/v1/admin/person-profiles?page=1&limit=20&userId=&birthDate=&sessionId=
🛡️ Admin
```

### 12.4 咨询记录管理

#### 搜索咨询记录

```
GET /api/v1/admin/consult-records?page=1&limit=20&userId=&sessionId=&routeType=&startDate=&endDate=
🛡️ Admin
```

#### 咨询记录详情

```
GET /api/v1/admin/consult-records/:id
🛡️ Admin
```

**响应**：完整记录，包含 inputData / calcResult / llmResult（均 JSON 解析）+ 关联用户 + 关联人物档案。

#### 咨询记录 Manifest

```
GET /api/v1/admin/consult-records/:id/manifest
🛡️ Admin
```

**响应**：分析摘要，包含 qualityScore / modules / 耗时 / 模型等。

#### 证据链

```
GET /api/v1/admin/consult-records/:id/evidence
🛡️ Admin
```

**响应**：

```json
{
  "recordId": "clx...",
  "packets": [
    {
      "id": "pkt_...",
      "routeType": "ziping",
      "version": 1,
      "inputHash": "sha256...",
      "packetData": {},
      "warnings": [],
      "createdAt": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

#### 生成过程

```
GET /api/v1/admin/consult-records/:id/generation-runs
🛡️ Admin
```

**响应**：所有 GenerationRun 记录，含 provider / model / qualityScore / errorCode / durationMs 等。

### 12.5 知识命中

```
GET /api/v1/admin/knowledge-hits?recordId=xxx
🛡️ Admin
```

### 12.6 互动事件

```
GET /api/v1/admin/interaction-events?recordId=xxx&limit=50
🛡️ Admin
```

### 12.7 预览记录

```
GET /api/v1/admin/consult-previews?page=1&limit=20&module=&userId=
🛡️ Admin
```

### 12.8 会员管理

```
GET /api/v1/admin/memberships?page=1&limit=20&userId=&type=&status=
🛡️ Admin
```

### 12.9 取名记录

```
GET /api/v1/admin/naming-records?page=1&limit=20
🛡️ Admin
```

> 筛选 `routeType = 'quming'` 的记录。

### 12.10 问事记录

```
GET /api/v1/admin/question-records?page=1&limit=20
🛡️ Admin
```

> 筛选 `routeType IN ('liuren', 'ziping', 'liuyao', 'qimen')` 的记录。

### 12.11 K线记录

```
GET /api/v1/admin/kline-records?page=1&limit=20
🛡️ Admin
```

> 筛选 `sourceEntry = 'kline'` 的记录。

### 12.12 解锁记录

```
GET /api/v1/admin/unlock-records?page=1&limit=20&userId=
🛡️ Admin
```

### 12.13 积分使用记录

```
GET /api/v1/admin/credit-usage?page=1&limit=20&userId=
🛡️ Admin
```

### 12.14 LLM 失败记录

```
GET /api/v1/admin/llm-failures?page=1&limit=20&errorType=
🛡️ Admin
```

### 12.15 统计概览

```
GET /api/v1/admin/stats
🛡️ Admin
```

**响应**：

```json
{
  "totalUsers": 1000,
  "totalRecords": 5000,
  "totalProfiles": 800,
  "recentActivity": ["...最近10条记录..."]
}
```

### 12.16 增强统计

```
GET /api/v1/admin/stats/enhanced
🛡️ Admin
```

**响应**：

```json
{
  "overview": {
    "totalUsers": 1000,
    "totalRecords": 5000,
    "totalProfiles": 800,
    "totalPreviews": 200,
    "activeMemberships": 150
  },
  "recordsBySource": { "kline": 500, "direct": 4500 },
  "recordsByRoute": { "ziping": 2000, "liuren": 1500, "quming": 1000, "mixed": 500 },
  "membershipsByType": { "month": 80, "year": 50, "lifetime": 20 }
}
```

---

## 13. 健康检查 API

### 13.1 基础健康检查

```
GET /api/v1/health
🌐 Public
```

**响应**：

```json
{
  "code": 0,
  "message": "ok",
  "service": "awkn-life-backend",
  "timestamp": "2026-06-15T10:00:00.000Z"
}
```

### 13.2 HEAD 健康检查

```
HEAD /api/v1/health
🌐 Public
```

> 仅返回状态码，无响应体。适合负载均衡器探测。

### 13.3 数据库健康

```
GET /api/v1/health/db
🌐 Public
```

**响应**：

```json
{
  "db": "connected",
  "provider": "sqlite",
  "nodeEnv": "production",
  "timestamp": "2026-06-15T10:00:00.000Z"
}
```

> `provider` 由 `DATABASE_URL` 推断：`file:` → sqlite，`postgresql:` → postgresql，`mysql:` → mysql。不暴露路径。

### 13.4 LLM 服务健康

```
GET /api/v1/health/llm
🌐 Public
```

**响应**：各 LLM Provider 的连通状态和延迟信息。

---

## 14. 功能开关 API

```
GET /api/v1/feature-flags
🌐 Public
```

**响应**：

```json
{
  "cost_warning_enabled": false,
  "cost_confirmation_enabled": false,
  "callback_enabled": false,
  "memory_anchor_enabled": false,
  "user_classifier_enabled": false,
  "multi_turn_enabled": false
}
```

| 开关 | 环境变量 | 说明 |
|------|---------|------|
| `cost_warning_enabled` | `COST_WARNING_ENABLED` | 代价提醒 |
| `cost_confirmation_enabled` | `COST_CONFIRMATION_ENABLED` | 代价确认 |
| `callback_enabled` | `CALLBACK_ENABLED` | 回调功能 |
| `memory_anchor_enabled` | `MEMORY_ANCHOR_ENABLED` | 记忆锚点 |
| `user_classifier_enabled` | `USER_CLASSIFIER_ENABLED` | 用户分类器 |
| `multi_turn_enabled` | `MULTI_TURN_ENABLED` | 多轮对话 |

---

## 15. 用户 API

### 15.1 获取个人资料

```
GET /api/v1/user/profile
🔒 JWT
```

### 15.2 更新个人资料

```
PATCH /api/v1/user/profile
🔒 JWT
```

**请求体**（UpdateProfileDto）：可更新的用户资料字段。

### 15.3 获取会员信息

```
GET /api/v1/user/membership
🔒 JWT
```

### 15.4 获取用户洞察

```
GET /api/v1/user/profile/insights
🔒 JWT
```

> 返回 `UserInsights` 对象，包含用户行为洞察和偏好分析。

---

## 16. 分析 API

### 16.1 管理员统计

```
GET /api/v1/analytics/admin/stats
🛡️ Admin
```

### 16.2 页面访问追踪

```
POST /api/v1/analytics/page-visit
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pageName` | string | ✅ | 页面名称 |
| `pageUrl` | string | ❌ | 页面 URL |
| `referrer` | string | ❌ | 来源页 |
| `screenSize` | string | ❌ | 屏幕尺寸 |
| `duration` | number | ❌ | 停留时长（秒） |

### 16.3 用户活动追踪

```
POST /api/v1/analytics/activity
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `activityType` | string | ✅ | 活动类型 |
| `activityData` | Record\<string, any\> | ❌ | 活动数据 |
| `duration` | number | ❌ | 持续时长 |

### 16.4 漏斗事件追踪

```
POST /api/v1/analytics/event
🌐 Public
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | string | ✅ | 事件名称 |
| `data` | Record\<string, any\> | ❌ | 事件数据 |
| `timestamp` | number | ❌ | 时间戳 |

### 16.5 保存八字档案

```
POST /api/v1/analytics/bazi-profile
🔒 JWT
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `birthYear` | number | ✅ | 出生年 |
| `birthMonth` | number | ✅ | 出生月 |
| `birthDay` | number | ✅ | 出生日 |
| `birthHour` | number | ✅ | 出生时 |
| `birthMinute` | number | ❌ | 出生分 |
| `gender` | string | ✅ | 性别 |
| `baZiData` | Record\<string, any\> | ✅ | 八字数据 |
| `wuXingDist` | Record\<string, number\> | ❌ | 五行分布 |
| `shenWang` | string | ❌ | 身旺/身弱 |
| `shenWangScore` | number | ❌ | 身旺评分 |
| `xiYongShen` | Record\<string, string[]\> | ❌ | 喜用神 |
| `shiShen` | Record\<string, string\> | ❌ | 十神 |
| `shenSha` | Record\<string, string[]\> | ❌ | 神煞 |
| `qiYunAge` | object | ❌ | 起运年龄 |
| `isShunYun` | boolean | ❌ | 是否顺运 |
| `taiYuan` | string | ❌ | 胎元 |
| `mingGong` | string | ❌ | 命宫 |
| `naYin` | Record\<string, string\> | ❌ | 纳音 |
| `city` | string | ❌ | 城市 |
| `correctedHour` | number | ❌ | 校正时辰 |

### 16.6 获取八字档案

```
GET /api/v1/analytics/bazi-profile
🔒 JWT
```

### 16.7 用户分析统计

```
GET /api/v1/analytics/stats
🔒 JWT
```

### 16.8 保存咨询分析结果

```
POST /api/v1/analytics/consult-result
🔒 JWT
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordId` | string | ✅ | 咨询记录 ID |
| `analysisData` | Record\<string, any\> | ✅ | 分析数据 |

---

## 17. 命理基准 API

> 所有端点需 JWT + AdminGuard。用于命理模型准确率评测。

### 17.1 获取评测类别

```
GET /api/v1/mingli-bench/categories
🛡️ Admin
```

### 17.2 运行评测

```
POST /api/v1/mingli-bench/run
🛡️ Admin
```

**请求体**（RunBenchmarkDto）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `year` | number | ❌ | 评测年份 |
| `sampleSize` | number | ❌ | 样本量 |
| `useCot` | boolean | ❌ | 是否使用 CoT |
| `useAstro` | boolean | ❌ | 是否使用星盘 |
| `shuffleOptions` | boolean | ❌ | 是否打乱选项 |
| `provider` | string | ❌ | LLM Provider |
| `maxWorkers` | number | ❌ | 最大并发数 |
| `rounds` | number | ❌ | 评测轮次 |
| `categories` | string[] | ❌ | 评测类别 |

### 17.3 评测历史

```
GET /api/v1/mingli-bench/history
🛡️ Admin
```

### 17.4 评测历史详情

```
GET /api/v1/mingli-bench/history/:runId
🛡️ Admin
```

### 17.5 导出评测结果

```
GET /api/v1/mingli-bench/history/:runId/export
🛡️ Admin
```

---

## 18. 收藏案例 API

> 所有端点需 JWT 认证。

### 18.1 列出收藏

```
GET /api/v1/cases
🔒 JWT
```

### 18.2 创建收藏

```
POST /api/v1/cases
🔒 JWT
```

**请求体**（CreateSavedCaseDto）：案例内容字段。

### 18.3 获取收藏详情

```
GET /api/v1/cases/:id
🔒 JWT
```

### 18.4 更新收藏

```
PATCH /api/v1/cases/:id
🔒 JWT
```

**请求体**（UpdateSavedCaseDto）：部分更新字段。

### 18.5 删除收藏

```
DELETE /api/v1/cases/:id
🔒 JWT
```

---

## 19. 错误码参考

### HTTP 状态码

| 状态码 | 含义 | 常见场景 |
|--------|------|---------|
| 200 | 成功 | GET/POST 成功 |
| 201 | 创建成功 | POST 创建资源 |
| 400 | 请求错误 | 参数校验失败 |
| 401 | 未认证 | 缺少或无效 JWT |
| 403 | 禁止访问 | 非管理员访问管理接口 |
| 404 | 资源不存在 | 记录/用户不存在 |
| 500 | 服务器错误 | LLM 服务异常 |

### 业务错误码

| 错误码 | 含义 | 触发场景 |
|--------|------|---------|
| `not_found` | 记录不存在 | 查询不存在的 recordId |
| `provider_failed` | LLM Provider 失败 | GenerationRun 状态为 failed |
| `no_retryable_module` | 无可重试模块 | 重试非 failed_retryable 状态的模块 |
| `retry_enqueue_failed` | 重试入队失败 | 重试时 Orchestrator 入队异常 |
| `gated` | 功能受限 | 免费用户访问付费模块 |
| `partial` | 部分数据 | 免费用户获取 K 线预览 |

### ConsultRecord 状态流转

```
pending → analyzing → completed
                   → failed
       → clarify → (等待用户补充信息)
```

### GenerationRun 状态

| 状态 | 含义 |
|------|------|
| `pending` | 等待执行 |
| `running` | 执行中 |
| `completed` | 执行完成 |
| `failed` | 执行失败（不可重试） |
| `failed_retryable` | 执行失败（可重试） |

### 枢密院流程状态（FlowState）

```
speaking → spreading → bottomed → chronicled
```

### 会员状态

| 状态 | 含义 |
|------|------|
| `active` | 生效中 |
| `cancelled` | 已取消 |
| `expired` | 已过期 |

### 反馈状态

| 状态 | 含义 |
|------|------|
| `pending` | 待处理 |
| `reviewed` | 已审阅 |
| `applied` | 已采纳 |

---

## 附录：Pipeline 9 步流程

```
Step 1: Intent Router（4 路由分类：ziping / liuren / mixed / clarify）
Step 2: High-Risk Detector（危机关键词 + 场景规则，命中即返回）
Step 3: User Memory（记忆加载：chartHistory / consultHistory / timelineEvents / insights）
Step 4: Classifier（4 类 UserState：casual / genuine / repeating / validating）
Step 5: Zhangbanshan Scheduler（6 Agent 调度 + 2 模式选择）
Step 6: Prompt Layers + LLM Parallel Gateway + ReAct 循环（仅 deep_consult，最大 5 轮）
Step 7: Generation Composer（5 层输出合成）
Step 8: Validator（质量验证）
Step 9: Render（三段式最终渲染）
```

**调度模式**：
- `quick_read`：主调 1-2s，快速返回
- `deep_consult`：主+佐调+工具链+仲裁+ReAct，完整分析

**超时降级**：L2 超 60s 返回 L1 快速降级结果，后台继续推演。

---

> **修订记录**

| 日期 | 版本 | 修订内容 |
|------|------|---------|
| 2026-06-15 | v1.0 | 初版，基于代码探查 + `_ground-truth.md` v2.0 |
