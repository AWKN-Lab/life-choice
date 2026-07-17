<!-- VERDICT: FAIL -->

# MVP-1 单事问断闭环灰度验证报告

- **验证日期**：2026-06-27
- **验证范围**：MVP-1 灰度启用 evidencePackage 链路 + 统一问事入口 + 单事深推复用方案
- **验证模式**：本地启动服务 + 真实接口调用 + 数据库写入核查 + 回退测试
- **验证执行者**：TRAE 本地 AI
- **验证结论**：`FAIL` — 主链路接口可达，但 P1-B 装甲链路因 module 注册缺失实际未生效，必须补 1 处代码改动才能进入灰度

---

## 0. TL;DR（一句话结论）

> 主链路 `/consult/analyze` 接口可达，3 条真实问事 case 全部返回 `record_id`，但**灰度开关 `EVIDENCE_PACKAGE_ENABLED=true` 实际不生效**：`orchestrator.module.ts` 的 providers 列表未注册 `RuleMatcherService` / `EvidenceComposerService` / `AgentRunLogger`，导致 `zhangbanshan-scheduler` 构造函数 4 个 `@Optional` 注入全部为 `undefined`，P1-B 分支条件永远 `false`。开关 `true` / `false` 行为完全一致。**这 1 处 module 注册缺失是当前唯一的 P0 阻塞项，补 4 行 import + 4 行 providers 即可解除**。

---

## 1. 文档更新结果（任务 1）

### 1.1 已更新文件

- [TECHNICAL_DOCUMENTATION.md](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/docs/engineering/TECHNICAL_DOCUMENTATION.md)

### 1.2 更新内容

| 位置 | 旧值 | 新值 |
|------|------|------|
| L97 | 测试套件数：35+ | 测试套件数：73（2026-06-27 实跑） |
| L98 | 测试用例数：484+ | 测试用例数：1321 passed / 4 skipped（旧值 484+ 已过时） |
| L99 | （无） | 新增 P0 装甲状态：rule-matcher / evidence-composer / agent-run 已存在并通过测试；EVIDENCE_PACKAGE_ENABLED 默认 false，待灰度启用 |
| L1251 | 总计 35 套件 484 passed | 总计 73 套件 1321 passed / 4 skipped（2026-06-27 实跑；旧值 484 passed 已过时） |

---

## 2. evidence mode=true 真实接口测试结果（任务 2）

### 2.1 测试环境

- **环境变量**：`EVIDENCE_PACKAGE_ENABLED=true`
- **服务地址**：http://localhost:30001
- **数据库**：SQLite `prisma/dev.db`（已存在 454KB）
- **LLM 配置**：KIMI / MINIMAX / DOUBAO / DEEPSEEK 四套 key 全部已配置
- **默认 Provider**：`deepseek-direct`

### 2.2 三条真实问事 case 测试结果

| Case | 问题 | routeType | questionIntent | record_id | sourceType | provider | generationStatus | zhangbanshan.mode |
|------|------|-----------|----------------|-----------|------------|----------|------------------|-------------------|
| 1 | 我和男朋友感情最近变淡了，要不要继续下去？ | liuren | love | b328cb5b-054d-4a12-acea-251c9cd77eec | algorithm | algorithm | processing_sync | quick_read |
| 2 | 我的事业什么时候能有突破？ | ziping | career | 527a922d-6a54-4659-ad3b-ab27dbc79b4b | algorithm | algorithm | processing_sync | quick_read |
| 3 | 我最近考虑换工作，新公司给的条件比现在好，但担心风险，该不该去？ | liuyao | decision | 5dd29253-2d2a-44fd-a09d-efbdff4ad09b | algorithm | algorithm | processing_sync | quick_read |

### 2.3 接口可达性

| 检查项 | 结果 |
|--------|------|
| 3 条 case 全部返回 `record_id` | ✅ |
| 3 条 case 全部返回 `summary_line`（算法排盘结果） | ✅ |
| 3 条 case 全部返回 `evidence_tags`（证据标签） | ✅ |
| 3 条 case 全部返回 `paywall_modules`（付费墙模块） | ✅ |
| 3 条 case 全部返回 `zhangbanshan_output`（调度器输出） | ✅ |
| 3 条 case 全部返回 `upgradeHint`（升级提示） | ✅ |

### 2.4 P1-B 装甲链路实际生效情况

| 检查项 | 期望 | 实际 |
|--------|------|------|
| 后端日志出现 `[P1-B] evidencePackage 注入成功` | ✅ 应出现 | ❌ **未出现** |
| 后端日志出现 `[P1-B] 命中 N 条规则` | ✅ 应出现 | ❌ **未出现** |
| 后端日志出现 `[P2-B] AgentRun log` | ✅ 应出现 | ❌ **未出现** |
| GenerationRun 表写入 | ✅ 应有 3 条 | ❌ **0 条** |
| KnowledgeHit 表写入 | ✅ 应有 N 条 | ❌ **0 条** |
| EvidencePacket 表写入 | ✅ 应有 3 条（P1-B 新链路写） | 🟡 9 条（旧版 `EvidencePacketBuilderService` 写） |

**根本原因**：`zhangbanshan-scheduler.service.ts` L100-104 的 4 个 `@Optional` 注入服务全部为 `undefined`，因为 `orchestrator.module.ts` 的 providers 列表未注册：

| 服务 | 文件路径 | module 注册状态 |
|------|---------|----------------|
| `RuleMatcherService` | `./rule-matcher/rule-matcher.service.ts` | ❌ 未注册 |
| `EvidenceComposerService` | `./evidence-composer/evidence-composer.service.ts` | ❌ 未注册 |
| `KnowledgeRetrieverService`（新版） | `./evidence-composer/knowledge-retriever/knowledge-retriever.service.ts` | ❌ 未注册（同名 class 冲突，见 §4） |
| `AgentRunLogger` | `./agent-run/agent-run-logger.ts` | ❌ 未注册 |

P1-B 分支条件（`zhangbanshan-scheduler.service.ts` L473）：
```typescript
if (process.env.EVIDENCE_PACKAGE_ENABLED === 'true' && chartSnapshot && 
    this.ruleMatcherService && this.evidenceComposerService) {
```
4 个条件中 `this.ruleMatcherService` 和 `this.evidenceComposerService` 永远为 `undefined` → 整个 P1-B 块永远不执行。

---

## 3. evidence mode=false 回退测试结果（任务 2.5）

### 3.1 回退测试 Case 4

| 检查项 | EVIDENCE_PACKAGE_ENABLED=true (Case 1) | EVIDENCE_PACKAGE_ENABLED=false (Case 4) | 一致性 |
|--------|----------------------------------------|-----------------------------------------|--------|
| 问题 | 我和男朋友感情最近变淡了… | 测试回退路径，感情问题 | 相同意图 |
| routeType | liuren | liuren | ✅ |
| record_id | b328cb5b-… | b4236780-… | ✅ 都返回 |
| sourceType | algorithm | algorithm | ✅ |
| provider | algorithm | algorithm | ✅ |
| generationStatus | processing_sync | processing_sync | ✅ |
| summary_line | 六壬排盘：一般课体… | 六壬排盘：一般课体… | ✅ |
| zhangbanshan.mode | quick_read | quick_read | ✅ |
| zhangbanshan.llm_fallback | true | true | ✅ |

### 3.2 回退测试结论

**开关 `true` / `false` 行为完全一致** — 证实 P1-B 装甲链路在当前代码状态下**根本未生效**。无论开关如何设置，都走旧路径（`EvidencePacketBuilderService` + 算法直出 + 异步 LLM 队列）。

---

## 4. /question → /consult/analyze → /result/:recordId 链路结果（任务 3）

### 4.1 前端路由核查

| 路由 | 组件 | mode prop | 调用 API |
|------|------|-----------|---------|
| `/question` | `FrontdeskChat` | `mode="question"` | `consultApi.analyze()` → `POST /consult/analyze` |
| `/naming` | `FrontdeskChat` | `mode="naming"` | 同上（取名入口） |
| `/consult` | `ConsultPage` | - | 同上 |
| `/result/:recordId` | `ResultPage` | - | `consultApi.getRecord()` → `GET /consult/result/:recordId` |

### 4.2 姻缘专属入口核查

| 检查项 | 结果 |
|--------|------|
| 是否存在 `/marriage` 路由 | ❌ 不存在 |
| 是否存在 `/love` 路由 | ❌ 不存在 |
| 是否存在 `/yinyuan` 路由 | ❌ 不存在 |
| 是否存在 `/hunyin` 路由 | ❌ 不存在 |
| consultApi 是否有 `ask` / `marriage` / `yinyuan` 方法 | ❌ 不存在 |
| `questionType='marriage_decision'` 前端是否传递 | ❌ 不传递（仅后端 RuleMatcher 内部用） |

### 4.3 链路结论

✅ **前台已统一为问事入口**：所有问事类问题（含姻缘/感情/婚姻）均从 `/question` 入口提交，通过 `intentRouter` 关键词匹配路由到 `liuren` / `ziping` 等通用引擎。`marriage_decision` 是后端 `RuleMatcher` 的内部规则分类枚举，由 `mapQuestionCategoryToType` 自动映射，前端无任何代码直接传递该值。

---

## 5. EvidencePacket / GenerationRun / KnowledgeHit 写入情况（任务 2.5）

### 5.1 数据库写入统计

| 表名 | 记录数 | 写入来源 | 是否 P1-B 新链路写入 |
|------|--------|---------|---------------------|
| `EvidencePacket` | 9 条 | 旧版 `EvidencePacketBuilderService`（`evidence-packet-builder.service.ts` L28） | ❌ 否 |
| `GenerationRun` | 0 条 | （应由 P1-B 新链路写） | ❌ 未写入 |
| `KnowledgeHit` | 0 条 | （应由 P1-B 新链路写） | ❌ 未写入 |
| `ConsultRecord` | 3 条（本次新增） | `consult.service.ts` 创建 | ✅ 主链路正常 |

### 5.2 EvidencePacket 表的 3 条本次记录

| record_id | routeType（调度后） | version | createdAt |
|-----------|---------------------|---------|-----------|
| b328cb5b-…（Case 1，请求 liuren） | meihua | 2026-05-v1 | 2026-06-27T15:37:09 |
| 527a922d-…（Case 2，请求 ziping） | liuren | 2026-05-v1 | 2026-06-27T15:37:48 |
| 5dd29253-…（Case 3，请求 liuyao） | liuren | 2026-05-v1 | 2026-06-27T15:39:00 |

**注意**：`EvidencePacket.routeType` 是调度后的真实 primary agent（不是请求的 routeType），这是张半山调度器正确行为。

### 5.3 写入缺失根因

P1-B 新链路本应在 `zhangbanshan-scheduler.service.ts` L473-541 内调用 `ruleMatcherService.match()` + `evidenceComposerService.compose()`，并将结果写入 `GenerationRun` / `KnowledgeHit` 表。但因 module 注册缺失，整段代码未执行。

---

## 6. 单事深推复用方案（任务 4）

### 6.1 现有支付闭环盘点

| 模块 | 接口 | 用途 | 可复用性 |
|------|------|------|---------|
| `PaymentModule` | `POST /payment/create` | 创建订单（productType: 'membership' \| 'single'） | ✅ 可复用 |
| `PaymentModule` | `POST /payment/webhook/stripe` | Stripe 支付回调（更新 Order.status='paid'） | ✅ 可复用 |
| `MembershipModule` | `POST /membership/unlock` | 解锁模块（moduleId + recordId?） | ✅ 可复用，但需扩展 |
| `MembershipModule` | `POST /membership/activate` | 激活会员 | ✅ 可复用 |
| `MembershipModule` | `POST /membership/free-trial/use` | 限免 | ✅ 可复用 |
| `ConsultRecord.unlockStatus` | - | `'preview' \| 'unlocked_partial' \| 'unlocked_full'` | ✅ 字段已存在 |

### 6.2 ¥1 单事深推复用方案（5 问回答）

#### Q1：¥1 单事深推应复用哪条现有链路？

**答**：复用 `PaymentModule` + `MembershipModule` 组合链路：
1. 前端调 `POST /payment/create`（productType='single', metadata.recordId=xxx）
2. 用户完成 ¥1 支付
3. Stripe webhook 回调 `POST /payment/webhook/stripe` 更新 Order.status='paid'
4. 前端调 `POST /membership/unlock`（moduleId='breakthrough', recordId=xxx）
5. 后端 unlockModule 写 `ConsultRecord.unlockStatus='unlocked_full'`

**不能**复用 `/consult/preview`（生产环境抛 404，仅 dev 调试用）。

#### Q2：recordId 如何绑定订单？

**答**：当前 `Order` 表**没有** `recordId` 字段。两种软关联方案（零 migration）：
- **方案 A（推荐）**：复用 `Order.metadata` JSON，约定写入 `{ "recordId": "xxx", "deepDive": "true", "followupQuota": "3" }`
- **方案 B**：复用 `Order.productId` 字段（productType='single' 时存 recordId）

`CreditLedger.recordId` 字段已存在，9 处写入位置均已使用，可作为辅助关联。

#### Q3：支付成功后如何解锁 fullResult？

**答**：当前 `unlockStatus` 三值枚举（`'preview' \| 'unlocked_partial' \| 'unlocked_full'`）与需求 100% 匹配，无需扩展。

**关键缺口**：Stripe webhook 处理（`payment.service.ts` L152-167）**只更新 Order.status='paid'，不调用任何 unlock 逻辑**。需要：
- **方案 A（推荐）**：webhook `checkout.session.completed` 分支内读取 `Order.metadata.recordId` → 直接写 `ConsultRecord.unlockStatus='unlocked_full'`
- **方案 B**：前端支付成功后手动调 `/membership/unlock` 兜底

前端 `ResultPage` 已根据 `unlockStatus` / `paywall_modules` / `module_content` 显示不同内容，**后端不主动裁剪**，由前端按字段自行决定 preview vs full report。

#### Q4：3 次追问额度当前是否有字段支持？

**答**：**没有专门字段**。当前实现：
- `followup.service.ts` L17 硬编码 `const MAX_FOLLOWUP_ROUNDS = 3;`
- 追问次数存 `ConsultRecord.analysisData` JSON 字段的 `followupCount` 子键（L165-169）
- `User.creditBalance` **未被复用**为追问额度

**¥1 深推"再加 3 次追问"两条可选路径**（零 migration）：
- **方案 A（推荐）**：复用 `analysisData.followupQuota` JSON 子键，`followup.service.ts` L57 比较改为 `followupCount >= (analysisData.followupQuota || MAX_FOLLOWUP_ROUNDS)`
- **方案 B**：复用 `User.creditBalance`，把"3 次追问"当作 3 积分

#### Q5：需要新增哪些最小字段或配置？

**答**：**零 migration** 即可落地。最小改动清单：

| # | 改动位置 | 改动内容 | 是否需 migration |
|---|---------|---------|-----------------|
| 1 | `Order.metadata` | 约定写入 `{ recordId, deepDive: 'true', followupQuota: '3' }` | 否（字段已存在） |
| 2 | `UnlockModuleDto` | 新增 `orderId?: string` 字段 | 否（dto 改动） |
| 3 | `unlockModule` | 新增第 5 条"订单支付校验"分支：orderId 存在时校验 `Order.status==='paid' && Order.metadata.recordId===recordId`，通过则写 `unlockStatus='unlocked_full'` | 否（逻辑改动） |
| 4 | `followup.service.ts` L57 | 比较改为 `followupCount >= (analysisData.followupQuota || MAX_FOLLOWUP_ROUNDS)` | 否（逻辑改动） |
| 5 | Stripe webhook | `checkout.session.completed` 分支内增加 unlock 触发 | 否（逻辑改动） |
| 6 | `MEMBERSHIP_PLANS` 配置 | 新增 `deep_dive` 套餐（price=1, duration=0） | 否（配置改动） |

### 6.3 风险点（7 项）

| # | 风险 | 等级 | 缓解方案 |
|---|------|------|---------|
| R1 | Order 与 ConsultRecord 无外键关联 | 高 | 短期用 metadata JSON 软关联；长期加 `Order.recordId String?` + 索引 |
| R2 | unlockModule 缺"订单支付校验"分支 | 高 | 必须给 `UnlockModuleDto` 加 `orderId` 字段 + 新增第 5 条分支 |
| R3 | Stripe webhook 不触发 unlockStatus 更新 | 高 | webhook 内增加 unlock 触发，避免依赖前端回调 |
| R4 | `Order.productType='single'` 已被 199 元"单次宗师推演"占用 | 中 | 新增 `productType='deep_dive'` 或用 metadata 内 `deepDive: 'true'` 区分 |
| R5 | 追问额度存 JSON 字段，原子性差 | 中 | 短期用 prisma 事务 + 乐观锁；长期加 `followupQuota Int?` + `followupUsed Int?` 原子字段 |
| R6 | `/consult/preview` 是 dev-only 接口 | 低 | 生产预览能力靠 `unlockStatus='preview'` + `GET /consult/result/:recordId` |
| R7 | PaymentModule 与 MembershipModule 完全解耦 | 中 | webhook 内直接用 PrismaService 写 unlockStatus，避免模块循环依赖 |

---

## 7. 当前是否满足内部 10 人灰度

### 7.1 灰度前置条件核查

| 前置条件 | 状态 | 证据 |
|---------|------|------|
| 主链路 `/consult/analyze` 接口可达 | ✅ 满足 | 3 条 case 全部返回 record_id |
| 前端 `/question` 入口已统一 | ✅ 满足 | 无姻缘专属路由 |
| 数据库表结构完整 | ✅ 满足 | EvidencePacket / GenerationRun / KnowledgeHit 表均已建 |
| 测试套件全过 | ✅ 满足 | 73 套件 1321 passed / 4 skipped |
| LLM API key 全配齐 | ✅ 满足 | KIMI / MINIMAX / DOUBAO / DEEPSEEK 四套 |
| **P1-B 装甲链路实际生效** | ❌ **不满足** | module 注册缺失，开关无效 |
| **GenerationRun / KnowledgeHit 表有写入** | ❌ **不满足** | 0 条记录 |
| **AgentRun 3 处埋点有日志** | ❌ **不满足** | 日志未出现 |
| ¥1 深推支付闭环 | 🟡 部分满足 | 现有链路可复用，但需 6 处最小改动 |
| 3 次追问额度字段 | 🟡 部分满足 | 硬编码 3 次，需改 followup.service.ts |

### 7.2 灰度结论

**❌ 当前不满足内部 10 人灰度条件**。

**唯一 P0 阻塞项**：`orchestrator.module.ts` 未注册 `RuleMatcherService` / `EvidenceComposerService` / `AgentRunLogger` 三个 provider，导致 P1-B 装甲链路完全不生效。补 4 行 import + 4 行 providers 即可解除。

---

## 8. 阻塞项清单

### 8.1 P0 阻塞项（必须修复才能灰度）

| # | 阻塞项 | 文件 | 修复方式 | 工作量 |
|---|--------|------|---------|--------|
| P0-1 | `RuleMatcherService` 未注册到 NestJS DI | `orchestrator.module.ts` | 加 `import { RuleMatcherService } from './rule-matcher/rule-matcher.service';` + 加入 providers 数组 | 2 行 |
| P0-2 | `EvidenceComposerService` 未注册到 NestJS DI | `orchestrator.module.ts` | 加 `import { EvidenceComposerService } from './evidence-composer/evidence-composer.service';` + 加入 providers 数组 | 2 行 |
| P0-3 | `AgentRunLogger` 未注册到 NestJS DI | `orchestrator.module.ts` | 加 `import { AgentRunLogger } from './agent-run/agent-run-logger';` + 加入 providers 数组 | 2 行 |
| P0-4 | `KnowledgeRetrieverService` 同名 class 冲突 | `orchestrator.module.ts` | 旧版（`./knowledge-retriever.service.ts`，用 Prisma + HTTP:8701）与新版（`./evidence-composer/knowledge-retriever/knowledge-retriever.service.ts`，用静态 JSON）同名。需明确保留哪个，或重命名其中一个 | 决策 + 2 行 |

**修复后预期效果**：
- 启动服务后 `EVIDENCE_PACKAGE_ENABLED=true` 时日志应出现 `[P1-B] evidencePackage 注入成功：命中 N 条规则`
- `GenerationRun` 表应写入记录
- `KnowledgeHit` 表应写入记录
- `AgentRunLogger` 应输出 3 处埋点日志

### 8.2 P1 改进项（灰度验证后处理）

| # | 改进项 | 说明 |
|---|--------|------|
| P1-1 | `KnowledgeRetrieverService` 占位实现 | 当前返回空片段，需接 Python `knowledge-service:8701` |
| P1-2 | `AgentRunLogger` 持久化到 `GenerationRun` 表 | 当前只写内存，无法历史回溯 |
| P1-3 | ¥1 深推 6 处最小改动 | 见 §6.2 Q5 |
| P1-4 | 追问额度从硬编码改为可配置 | `followup.service.ts` L17 |

### 8.3 P2 长期项

| # | 长期项 | 说明 |
|---|--------|------|
| P2-1 | `Order` 表加 `recordId` 外键字段 | 替代 metadata JSON 软关联 |
| P2-2 | `ConsultRecord` 加 `followupQuota Int?` + `followupUsed Int?` 原子字段 | 替代 analysisData JSON 子键 |
| P2-3 | Golden Case 扩展到 20+ | 当前 p0-armor-regression 覆盖 5 条 |

---

## 9. 审查结论

**结论**：`FAIL`

**阻塞原因**：
- P0 阻塞项 4 项（module 注册缺失）导致 P1-B 装甲链路完全不生效
- 灰度开关 `EVIDENCE_PACKAGE_ENABLED=true` 在当前代码状态下无效
- `GenerationRun` / `KnowledgeHit` 表 0 条记录，无法验证端到端写入

**放行依据**（已满足的部分）：
- ✅ 主链路 `/consult/analyze` 接口可达，3 条 case 全部返回 record_id
- ✅ 前端 `/question` 统一问事入口已就位，无姻缘专属路由
- ✅ 数据库表结构完整（EvidencePacket / GenerationRun / KnowledgeHit 表已建）
- ✅ 测试套件 73 套件 1321 passed / 4 skipped
- ✅ ¥1 深推复用方案明确（6 处最小改动，零 migration）
- ✅ 回退测试通过（开关 true/false 行为一致，旧路径稳定）

**解除阻塞的最小动作**：
1. 修改 `orchestrator.module.ts`，加 4 行 import + 4 行 providers 注册 `RuleMatcherService` / `EvidenceComposerService` / `AgentRunLogger` / `KnowledgeRetrieverService`（新版）
2. 解决 `KnowledgeRetrieverService` 同名 class 冲突（重命名或显式 token 注入）
3. 重启服务，验证日志出现 `[P1-B] evidencePackage 注入成功`
4. 验证 `GenerationRun` / `KnowledgeHit` 表有写入
5. 跑 3 条 case 复测，确认 P1-B 路径生效

**预估工作量**：代码改动 8-12 行 + 重启验证 10 分钟。

---

## 附录 A：验证执行命令清单

```bash
# 1. 启动服务（灰度开启）
$env:EVIDENCE_PACKAGE_ENABLED="true"
cd apps/api-server ; npx nest start
# → 服务启动成功，监听 http://localhost:30001

# 2. 健康检查
Invoke-RestMethod -Uri "http://localhost:30001/api/v1/health"
# → { code: 0, message: "ok", database: "connected" }

# 3. Case 1: 姻缘决策（marriage_decision 路径）
POST /api/v1/consult/analyze
body: { question: "我和男朋友感情最近变淡了...", routeType: "liuren", questionIntent: "love", ... }
# → record_id: b328cb5b-054d-4a12-acea-251c9cd77eec, sourceType: algorithm

# 4. Case 2: 事业突破
POST /api/v1/consult/analyze
body: { question: "我的事业什么时候能有突破？", routeType: "ziping", questionIntent: "career", ... }
# → record_id: 527a922d-6a54-4659-ad3b-ab27dbc79b4b, sourceType: algorithm

# 5. Case 3: 换工作决策
POST /api/v1/consult/analyze
body: { question: "我最近考虑换工作...", routeType: "liuyao", questionIntent: "decision", ... }
# → record_id: 5dd29253-2d2a-44fd-a09d-efbdff4ad09b, sourceType: algorithm

# 6. 数据库写入检查
node _check_db.js
# → EvidencePacket: 9 条（旧版写入）
# → GenerationRun: 0 条（P1-B 未写入）
# → KnowledgeHit: 0 条（P1-B 未写入）
# → ConsultRecord: 3 条（本次新增）

# 7. 关闭灰度，重启服务
$env:EVIDENCE_PACKAGE_ENABLED="false"
npx nest start

# 8. Case 4: 回退测试
POST /api/v1/consult/analyze
body: { question: "测试回退路径，感情问题", routeType: "liuren", ... }
# → record_id: b4236780-…, sourceType: algorithm
# → 行为与 Case 1 完全一致，证实开关无效

# 9. 后端日志核查
Get-Content <output-file> | Select-String "P1-B|evidencePackage|RuleMatcher|EvidenceComposer"
# → 0 命中（P1-B 未执行）
```

## 附录 B：未执行检查项

| 检查项 | 未执行原因 | 建议 |
|--------|-----------|------|
| 修复 P0 阻塞项后重跑 3 条 case | 用户指令"不修改代码" | 用户确认后单独执行 |
| 真实 LLM 输出质量对比（P1-B vs 旧路径） | P1-B 未生效，无法对比 | 修复 P0 后单独跑 |
| 线上生产环境灰度 | 需先修复 P0 阻塞项 | 修复 P0 + 本地验证通过后再上线 |
| ¥1 深推支付端到端测试 | 需先实现 6 处最小改动 | 按优先级 P1 处理 |
