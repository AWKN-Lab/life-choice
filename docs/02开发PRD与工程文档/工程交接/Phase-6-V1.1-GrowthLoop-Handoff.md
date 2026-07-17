# Phase 6｜V1.1 自然增长闭环工程交接文档

> 版本：v1.0  
> 日期：2026-06-22  
> 上游 PRD：`人生决策宗师/docs/01产品定位与PRD/需求文档/PRD-三入口拟人化前台与会员分层-20260516.md`  
> 本期目标：把“首问说中 → 3 次追问 → ¥1 单事深推破冰 → 分享卡/保存 → 7 天复访/复盘 → 会员承接”落到代码层。  
> 执行原则：优先复用现有 `ResultPage`、`paymentApi`、`membershipApi`、`FollowupService`、`ConsultRecord`、`ConsultFollowUp`、`analytics`，不先做复杂社区、公开案例池和大规模表结构重构。

---

## 0. 结论先行

Phase 6 不是新增一组零散按钮，而是补齐人生决策宗师当前缺失的商业闭环：

```text
用户带真实问题进入
→ 免费首问给“这事的底”
→ 结果页给 3 个下一步追问
→ 用户点击继续问透
→ ¥1 单事深推破冰成交
→ 深推结果继续追问/保存/分享
→ 7 天后复盘或关键日期前提醒
→ 复盘结果沉淀到 closedLoopResult
→ 高意向用户承接月卡/年卡/标准深推
```

本期 P0 只打四件事：

1. `ResultPage.tsx` 首问 5 块结构。
2. 结果页 3 个追问入口，并继承原 `recordId`。
3. `¥1 单事深推破冰版` 支付承接。
4. 11.5 自然增长埋点接入。

P1 再做：分享卡 MVP、保存此事、7 天复盘、复盘表单。

---

## 1. 当前代码事实

### 1.1 前端已有资产

| 能力 | 文件 | 现状 |
|---|---|---|
| 结果页主容器 | `app/src/pages/ResultPage.tsx` | 已有结果展示、会员解锁、付费墙、追问跳转、分享入口 |
| 会员解锁 | `app/src/api/membership.ts` | 已有 `unlockModule`、会员状态、免费试用逻辑 |
| 支付下单 | `app/src/api/payment.ts` | 已有 `createOrder`，支持 `productType: 'membership' | 'single'` |
| 支付墙组件 | `app/src/components/result/PaywallModal.tsx` | 已用于会员承接，可复用/拆出单事深推弹窗 |
| 埋点 | `app/src/lib/analytics.ts`、`app/src/utils/analytics.ts` | 已有 `trackEvent`、`trackFunnel` 和后端 `/analytics/event` |
| K 线分享能力 | `KLineShareCard.tsx`、`KLineImageGenerator.tsx`、`PosterGenerator.tsx` | 可参考生成分享卡 |

### 1.2 后端已有资产

| 能力 | 文件 | 现状 |
|---|---|---|
| 支付创建 | `payment/payment.controller.ts`、`payment/payment.service.ts` | `POST /payment/create` 已支持 `productType='single'` |
| 订单表 | `schema.prisma` 的 `Order` | 已支持 `productType`、`productId`、`amount`、`metadata` |
| 咨询记录 | `ConsultRecord` | 已有 `isSaved`、`shareGenerated`、`closedLoopResult`、`unlockStatus` 等字段 |
| 回访表 | `ConsultFollowUp` | 已有 `triggerType`、`messageTemplate`、`issueId` |
| 回访调度 | `consult/followup/followup.service.ts` | 已有 `scheduleFollowUp`、`scheduleByScenario`、`completeFollowUp` |
| 追问接口 | `consult/followup/followup.controller.ts` | 已有 `POST /consult/followup` |
| 主动回访测试 | `consult/__tests__/test-8-active-followup.spec.ts` | 已覆盖回访调度、查询、完成，但部分场景仍 skip |

### 1.3 关键约束

- `scheduleFollowUp` 受 `CALLBACK_ENABLED=true` 控制；未开启时只会跳过。
- `paymentApi.createOrder` 前端类型里没有 `metadata`，后端 `CreateOrderDto` 已支持 `metadata`，前端类型需要补齐。
- `FollowupController` 当前只暴露 `POST /consult/followup`，没有暴露“订阅 7 天复盘”“完成复盘”的 REST 入口；P1 需要补。
- `ConsultRecord.shareGenerated` 只是布尔值，V1.1 不新增 `ShareCard` 表，分享卡先以客户端生成 + 标记记录方式落地。
- 多轮追问要避免脱离原记录，必须传 `recordId`，必要时附带 `context`。

---

## 2. 产品状态与数据流

### 2.1 状态流

```text
preview_first_answer
  ↓ 用户点击追问
followup_suggestion_clicked
  ↓ 权益判断
free_followup / paywall_deep_dive
  ↓ ¥1 支付成功
single_deep_dive_unlocked
  ↓ 继续追问/保存/分享
retention_actions_visible
  ↓ 订阅复访
followup_scheduled
  ↓ 用户回来复盘
review_completed
```

### 2.2 记录状态建议

本期不新增主表字段，优先使用现有字段和 `Order.metadata`。

| 状态 | 存储位置 | 说明 |
|---|---|---|
| 免费首问 | `ConsultRecord.unlockStatus='preview'` | 若已有记录状态不同，不强制迁移 |
| ¥1 深推已解锁 | `Order.status='paid'` + `metadata.recordId` | 不先新增 `deepDiveStatus` 字段 |
| 保存此事 | `ConsultRecord.isSaved=true` | 可直接复用 |
| 分享已生成 | `ConsultRecord.shareGenerated=true` | 可直接复用 |
| 复访已订阅 | `ConsultFollowUp.status='pending'` | `triggerType='quarter_review'` 或新增约定 `seven_day_review` |
| 复盘完成 | `ConsultRecord.closedLoopResult` | 已有 JSON 字段 |

> 备注：如后续要做订单权益校验严谨闭环，再新增 `DeepDiveEntitlement` 或在 `Order.metadata` 标准化权益字段。

---

## 3. P0 任务包

## T6-01｜ResultPage 首问 5 块结构

### 目标

把当前结果页首屏从“报告展示”调整为“首问说中 + 下一步动作”。

### 前端改动

文件：`app/src/pages/ResultPage.tsx`

新增结构化组件，建议先内联，稳定后再抽组件：

```tsx
<FirstAnswerBlock
  verdict={summaryLine}
  situation={situationItems}
  risks={riskItems}
  action={minimumAction}
  followupSuggestions={suggestions}
/>
```

### 数据来源

优先从现有 `result` 结构中兜底提取：

| 展示项 | 优先字段 | 兜底 |
|---|---|---|
| 一句话断语 | `summaryLine` / `resultSummary` | `analysisData.summary` |
| 当前局势 | `bottomData.risks` / `analysisData.currentSituation` | 从 LLM 结果切片提取 |
| 关键风险 | `analysisData.risks` / `bottomData.risks` | 默认 2 条 |
| 最小行动 | `bottomData.minStep` / `analysisData.action` | 默认“先保存此事，再补充背景” |
| 下一步追问 | 新增本地生成函数 | 见 T6-02 |

### 验收

- 免费用户首屏能看到 5 块内容。
- 无结构化字段时页面不崩，使用兜底文案。
- 移动端首屏不超过 1.5 屏。
- 触发 `first_answer_view`、`first_answer_finish`。

---

## T6-02｜3 个追问入口

### 目标

每个结果页必须给出 3 个与当前事项相关的追问按钮，用户点击后进入原记录追问，不重新开单。

### 前端改动

文件：`app/src/pages/ResultPage.tsx`

新增本地生成函数：

```ts
function buildFollowupSuggestions(result): Array<{
  id: string;
  label: string;
  question: string;
  type: 'risk' | 'timing' | 'action' | 'person' | 'review';
}>;
```

生成规则：

| 场景 | 追问 |
|---|---|
| 工作/事业 | “接下来 30 天该先动哪一步？”、“这件事最容易败在哪？”、“我要不要换一种打法？” |
| 感情/关系 | “对方现在更可能是什么态度？”、“这段关系最怕哪里失衡？”、“我现在该进还是退？” |
| 合作/财务 | “这个合作最大风险在哪？”、“签之前我该确认哪三件事？”、“如果做，底线怎么设？” |
| 通用 | “这件事接下来 30 天怎么走？”、“我现在该先做哪一步？”、“最需要避开的坑是什么？” |

点击动作：

```ts
trackEvent('followup_suggestion_click', {
  record_id: result.record_id,
  suggestion_type: suggestion.type,
  suggestion_id: suggestion.id,
});

await consultFollowupApi.submit({
  recordId: result.record_id,
  question: suggestion.question,
  context: currentVisibleContext,
});
```

### 后端复用

- 当前已有：`POST /consult/followup`
- Controller：`consult/followup/followup.controller.ts`
- Service：`consult/followup/followup.service.ts`

### 验收

- 每条结果至少出现 3 个追问按钮。
- 点击追问必须传 `recordId`。
- 追问失败时提示用户，不吞错。
- 触发 `followup_suggestion_view`、`followup_suggestion_click`、`followup_submit`。

---

## T6-03｜¥1 单事深推破冰承接

### 目标

把付费点从“购买会员”改成“¥1 把这件事问透”，完成首次支付破冰。

### 前端改动

文件：

- `app/src/pages/ResultPage.tsx`
- `app/src/api/payment.ts`
- 可选新增：`app/src/components/result/SingleDeepDiveModal.tsx`

#### paymentApi 类型补齐

当前前端 `CreateOrderRequest` 无 `metadata`，后端已支持。需补：

```ts
export interface CreateOrderRequest {
  productType: 'membership' | 'single';
  productId: string;
  paymentMethod: 'stripe' | 'wechat' | 'alipay';
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}
```

#### 下单参数

```ts
paymentApi.createOrder({
  productType: 'single',
  productId: 'single_deep_dive_intro_v1',
  paymentMethod: selectedMethod,
  amount: 1,
  currency: 'cny',
  metadata: {
    recordId: result.record_id,
    source: 'result_followup',
    entitlement: 'single_deep_dive_intro_v1',
  },
});
```

#### 前台文案

主按钮：

```text
¥1 把这件事问透
```

解释文案：

```text
包含完整推演基础版、3 次追问、保存复盘。先把这一件事看清楚，再决定要不要长期使用。
```

不得使用：

```text
购买会员
充值解锁
开通套餐
```

### 后端改动

文件：`payment/payment.service.ts`

当前后端已支持 `productType='single'` 和 `metadata` 入库。P0 可不改表，只需确认：

- `amount=1` 是否允许。
- `productId='single_deep_dive_intro_v1'` 是否允许。
- 支付成功后，前端通过订单状态判断是否允许继续深推。

如需要后端强校验，可增加白名单：

```ts
const SINGLE_PRODUCTS = {
  single_deep_dive_intro_v1: { amount: 1, currency: 'cny' },
};
```

### 验收

- 用户点击“继续问透”弹出 ¥1 单事深推承接。
- 调用 `POST /payment/create`，订单 `productType='single'`、`productId='single_deep_dive_intro_v1'`、`amount=1`。
- `Order.metadata` 包含 `recordId`。
- 支付成功后回到原记录结果页。
- 触发 `deep_dive_paywall_view`、`deep_dive_pay_click`、`deep_dive_pay_success`。

---

## T6-04｜自然增长埋点接入

### 目标

让闭环每一步可量化，不再凭感觉判断是否闭环。

### 前端埋点

文件：`app/src/lib/analytics.ts`、`app/src/utils/analytics.ts`、`ResultPage.tsx`

事件清单：

| 事件 | 触发 |
|---|---|
| `first_answer_view` | 结果页首问 5 块曝光 |
| `first_answer_finish` | 结果页核心内容渲染完成 |
| `followup_suggestion_view` | 3 个追问按钮曝光 |
| `followup_suggestion_click` | 点击某个追问 |
| `followup_submit` | 追问提交成功 |
| `deep_dive_paywall_view` | ¥1 弹窗曝光 |
| `deep_dive_pay_click` | 点击 ¥1 支付 |
| `deep_dive_pay_success` | 支付成功或订单状态 paid |
| `card_generate_click` | 点击生成分享卡 |
| `callback_scheduled` | 复访订阅成功 |
| `review_complete` | 复盘完成 |

统一参数：

```ts
{
  record_id: result.record_id,
  route_type: result.route_type,
  source_entry: result.sourceEntry,
  unlock_status: result.unlockStatus,
  user_membership: user?.membership || 'free',
}
```

### 后端复用

- `/analytics/activity`
- `/analytics/event`
- `analytics/analytics.controller.ts`

### 验收

- P0 事件均能在浏览器 Network 中看到上报。
- Mock 模式不报错。
- 后端日志/活动表可查到 `deep_dive_pay_click`。

---

## 4. P1 任务包

## T6-05｜分享卡 MVP

### 目标

生成低隐私、可保存、可分享、可回流的轻资产。

### 前端建议

新增组件：

- `app/src/components/result/GrowthShareCard.tsx`
- `app/src/components/result/GrowthShareModal.tsx`

三类卡：

| cardType | 内容 |
|---|---|
| `situation_card` | 一句话断语 + 当前局势 + 最小行动 |
| `quote_card` | 张半山式提醒/断句 |
| `daily_reminder_card` | 今日提醒/行动提醒 |

隐私规则：

- 不展示出生年月日时。
- 不展示完整问题原文。
- 不展示完整命盘或卦盘。
- `recordId` 只允许 hash 或短码，不直接暴露原 ID。

### 后端建议

P1 先不建 `ShareCard` 表。生成成功后可调用一个轻接口或复用现有保存接口，把 `ConsultRecord.shareGenerated=true`。

如必须补接口：

```http
POST /consult/records/:recordId/share-generated
```

请求：

```json
{
  "cardType": "situation_card"
}
```

响应：

```json
{
  "success": true,
  "shareGenerated": true
}
```

### 验收

- 三类卡能生成至少一种。
- 卡片不暴露敏感字段。
- 生成后触发 `card_generated`。
- 可保存图片。

---

## T6-06｜保存此事

### 目标

用户可以把当前问题保存为“我的事项”，后续从历史页回来继续追问或复盘。

### 后端建议

优先复用 `ConsultRecord.isSaved`。

新增接口建议：

```http
POST /consult/records/:recordId/save
```

响应：

```json
{
  "success": true,
  "isSaved": true
}
```

### 前端验收

- 结果页显示“保存此事”。
- 点击后按钮状态变为“已保存”。
- 历史页能看到保存记录或至少不丢失。
- 触发 `first_answer_save_click`。

---

## T6-07｜7 天后复盘提醒

### 目标

用户在结果页主动订阅“7 天后提醒我复盘”，系统创建 `ConsultFollowUp` 记录。

### 后端改动

当前 `FollowupService.scheduleFollowUp(recordId, userId, 7)` 已可用，但 Controller 未暴露调度接口。

新增接口建议：

```http
POST /consult/followup/schedule
```

请求：

```json
{
  "recordId": "xxx",
  "delayDays": 7,
  "triggerType": "seven_day_review"
}
```

实现：

```ts
return this.followupService.scheduleFollowUp(recordId, req.user.id, delayDays, {
  triggerType: 'seven_day_review',
  messageTemplate: '你上次问的这件事，到了该复盘的时候。现在走到哪一步了？',
});
```

注意：当前 schema 注释里 triggerType 没列 `seven_day_review`，可以先使用已有 `quarter_review`，也可以把约定扩展到注释和测试中。建议新增 `seven_day_review`，语义更清楚。

### 验收

- `CALLBACK_ENABLED=true` 时创建 `ConsultFollowUp.status='pending'`。
- 未开启时前端提示“已保存，提醒服务稍后开启”或降级为仅保存记录。
- 触发 `callback_scheduled`。

---

## T6-08｜复盘表单

### 目标

用户回访后能提交事情实际发展，沉淀信任与闭环结果。

### 后端已有能力

`FollowupService.completeFollowUp(recordId, result)` 已更新：

- `ConsultFollowUp.status='completed'`
- `ConsultFollowUp.result`
- `ConsultRecord.closedLoopResult`

Controller 需暴露接口：

```http
POST /consult/followup/complete
```

请求：

```json
{
  "recordId": "xxx",
  "userReflection": "哪里说中/哪里没说中",
  "actualOutcome": "实际结果",
  "accuracyCheck": "准确|部分准确|不准确|尚未发生"
}
```

### 前端验收

- 复盘表单有 3 个字段：实际结果、用户感受、准确性选择。
- 提交成功后显示“继续问下一步”。
- 写入 `closedLoopResult`。
- 触发 `review_start`、`review_actual_outcome_submit`、`review_complete`。

---

## 5. 接口清单

### 5.1 现有接口

| 接口 | 方法 | 状态 | 用途 |
|---|---|---|---|
| `/consult/followup` | POST | 已有 | 追问原记录 |
| `/payment/create` | POST | 已有 | 创建订单，支持 `single` |
| `/payment/status/:orderId` | GET | 已有 | 查询订单状态 |
| `/membership/unlock...` | POST | 已有 | 会员模块解锁，具体路径以 `membership.ts` 为准 |
| `/analytics/event` | POST | 已有 | 漏斗事件 |
| `/analytics/activity` | POST | 已有 | 活动记录 |

### 5.2 新增接口建议

| 接口 | 方法 | 优先级 | 用途 |
|---|---|---|---|
| `/consult/records/:recordId/save` | POST | P1 | 保存此事 |
| `/consult/records/:recordId/share-generated` | POST | P1 | 标记分享卡已生成 |
| `/consult/followup/schedule` | POST | P1 | 订阅 7 天复盘/关键日期提醒 |
| `/consult/followup/complete` | POST | P1 | 完成复盘并写入 `closedLoopResult` |

> P0 可以先不新增接口，只做 ResultPage、支付、追问、埋点。P1 再补保存/分享/复访接口。

---

## 6. 数据库影响

### 6.1 P0 不改 Prisma schema

P0 只使用现有字段：

| 表 | 字段 | 用途 |
|---|---|---|
| `ConsultRecord` | `isSaved` | 保存此事 |
| `ConsultRecord` | `shareGenerated` | 分享卡生成标记 |
| `ConsultRecord` | `closedLoopResult` | 复盘结果 |
| `ConsultFollowUp` | `triggerType` | 复访类型 |
| `ConsultFollowUp` | `messageTemplate` | 复访消息模板 |
| `Order` | `productType` | `single` |
| `Order` | `productId` | `single_deep_dive_intro_v1` |
| `Order` | `amount` | `1` |
| `Order` | `metadata` | `recordId`、权益信息 |

### 6.2 P2 后续可新增

| 表 | 触发条件 |
|---|---|
| `DeepDiveEntitlement` | 需要严格校验某订单对应某记录的深推权益 |
| `ShareCard` | 需要保存卡片样式、短链、传播路径 |
| `ConsultDialogueTurn` | 多轮追问需要精确查询和分页 |
| `ReviewCase` | 复盘案例要进入匿名案例库 |

---

## 7. 测试用例

### 7.1 前端测试

| 用例 | 预期 |
|---|---|
| 免费结果页渲染 | 首屏出现 5 块结构 |
| 追问按钮生成 | 至少 3 个按钮，且文案非空 |
| 点击追问 | 请求包含 `recordId` |
| 点击 ¥1 深推 | 调用 `paymentApi.createOrder`，amount=1 |
| 支付成功回跳 | 回到原记录，不丢 recordId |
| 埋点 | 点击/曝光事件均调用 `trackEvent` |

### 7.2 后端测试

| 用例 | 文件建议 | 预期 |
|---|---|---|
| `payment.createOrder single_deep_dive_intro_v1` | `payment.service.spec.ts` | 创建 amount=1 的 single 订单 |
| `followup.schedule seven_day_review` | 扩展 `test-8-active-followup.spec.ts` | 创建 `ConsultFollowUp` |
| `followup.complete` | 扩展现有测试 | 写入 `closedLoopResult` |
| 分享标记 | 新增 `consult-record-growth.spec.ts` | `shareGenerated=true` |
| 保存此事 | 新增 `consult-record-growth.spec.ts` | `isSaved=true` |

### 7.3 E2E 验收流

```text
1. 用户完成一次问事
2. 进入结果页
3. 看到首问 5 块
4. 点击一个追问
5. 出现 ¥1 单事深推承接
6. 创建 single 订单 amount=1
7. 模拟订单 paid
8. 回到原记录继续追问
9. 点击保存此事
10. 订阅 7 天后复盘
11. 后台生成 ConsultFollowUp
12. 用户完成复盘，closedLoopResult 写入
```

---

## 8. 发布与回滚

### 8.1 Feature Flag 建议

| Flag | 默认 | 用途 |
|---|---|---|
| `VITE_GROWTH_LOOP_ENABLED` | false | 前端是否展示 Phase 6 闭环组件 |
| `VITE_SINGLE_DEEP_DIVE_ENABLED` | false | 是否展示 ¥1 单事深推 |
| `CALLBACK_ENABLED` | 现有 | 后端是否真正调度回访 |
| `SHARE_CARD_ENABLED` | false | 是否启用分享卡 MVP |

### 8.2 灰度顺序

1. 本地 mock 数据验证 ResultPage 结构。
2. 测试环境开启 `VITE_GROWTH_LOOP_ENABLED`。
3. 仅管理员/测试账号展示 ¥1 深推。
4. 小流量开启支付创建，但不强制真实支付。
5. 确认订单、埋点、追问都可查后再开放。

### 8.3 回滚方案

| 问题 | 回滚 |
|---|---|
| 结果页展示错乱 | 关闭 `VITE_GROWTH_LOOP_ENABLED` |
| ¥1 支付异常 | 关闭 `VITE_SINGLE_DEEP_DIVE_ENABLED`，回退会员弹窗 |
| 回访异常 | 关闭 `CALLBACK_ENABLED`，保留保存此事 |
| 分享卡隐私风险 | 关闭 `SHARE_CARD_ENABLED` |
| 埋点异常 | 只影响数据，不阻断主流程；前端 catch 后静默失败 |

---

## 9. 任务拆分清单

| ID | 任务 | 优先级 | 负责人建议 | 验收 |
|---|---|---|---|---|
| T6-01 | ResultPage 首问 5 块结构 | P0 | 前端 | 结果页首屏可见 5 块 |
| T6-02 | 3 个追问入口 | P0 | 前端+后端 | 点击追问带 recordId |
| T6-03 | ¥1 单事深推弹窗与下单 | P0 | 前端+后端 | 创建 amount=1 single 订单 |
| T6-04 | 自然增长埋点 | P0 | 前端 | 关键事件可上报 |
| T6-05 | 分享卡 MVP | P1 | 前端 | 生成低隐私卡片 |
| T6-06 | 保存此事接口与按钮 | P1 | 前后端 | `isSaved=true` |
| T6-07 | 7 天后复盘提醒接口 | P1 | 后端 | `ConsultFollowUp.pending` |
| T6-08 | 复盘表单与完成接口 | P1 | 前后端 | `closedLoopResult` 写入 |
| T6-09 | 订单权益校验 | P2 | 后端 | paid single order 才可深推 |
| T6-10 | 管理后台闭环指标 | P2 | 后端+前端 | 可看首问→支付→复访漏斗 |

---

## 10. Definition of Done

P0 完成标准：

- [ ] 免费首问结果页出现 5 块结构。
- [ ] 结果页展示 3 个追问按钮。
- [ ] 点击追问不丢 `recordId`。
- [ ] ¥1 单事深推承接文案为“把这件事问透”。
- [ ] `paymentApi.createOrder` 支持 `metadata`。
- [ ] 创建订单 `productType='single'`、`productId='single_deep_dive_intro_v1'`、`amount=1`。
- [ ] P0 埋点全部可在 Network 或后端活动表中看到。
- [ ] 关闭 Feature Flag 后恢复原结果页路径。

P1 完成标准：

- [ ] 分享卡至少一类可生成。
- [ ] 分享卡不暴露敏感信息。
- [ ] 保存此事写入 `ConsultRecord.isSaved`。
- [ ] 7 天复盘写入 `ConsultFollowUp`。
- [ ] 复盘表单写入 `ConsultRecord.closedLoopResult`。

---

## 11. 交接给工程师的一句话

先不要重构整站，也不要先做社区和复杂订单权益。第一刀只改结果页：让用户看完首问后，马上知道还能问哪 3 个问题，并能用 ¥1 把这一件事问透。然后把保存、分享、7 天复盘接上，这条链路跑通后再谈会员和长期陪跑。
