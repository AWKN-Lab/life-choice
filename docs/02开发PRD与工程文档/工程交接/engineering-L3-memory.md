# L3 记忆/回访技术参考文档

> **版本**：v1.0
> **生成日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **上位文档**：[engineering-handoff-L3-memory-v2.md](./engineering-handoff-L3-memory-v2.md)
> **语义纠偏**：不使用"9 模块 Pipeline"，使用"4 路由 + scheduler + parallel gateway + ReAct"；不使用"9 节点状态机"，使用"ConsultRecord.status 字符串"；不使用"mbs-*"，使用"CSS 变量体系"；用户状态分类器当前只有 4 类

---

## 一、Prisma Schema

### 1.1 UserMemory 模型

#### 当前字段（schema.prisma:71-85）

```prisma
model UserMemory {
  id              String   @id @default(cuid())
  userId          String   @unique
  chartHistory    String?  @default("{}")   // ⚠️ 未使用
  consultHistory  String?  @default("{}")
  timelineEvents  String?  @default("{}")
  insights        String?  @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

#### 计划新增字段（Day 1-3）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `MemoryType`（enum，8 值） | `identity` | 记忆类型分类 |
| `content` | `String` | `""` | 记忆内容文本 |
| `sourceQuote` | `String?` | — | 原始对话引用 |
| `confidence` | `Float` | `0.5` | 置信度 0-1 |
| `weight` | `Float` | `1.0` | 权重（衰减用） |
| `expiresAt` | `DateTime?` | — | 过期时间（可选） |

**MemoryType 枚举**：

```prisma
enum MemoryType {
  identity      // 身份
  family        // 家庭
  career        // 事业
  relationship  // 关系
  finance       // 财务
  health        // 健康
  decision      // 决策
  preference    // 偏好
}
```

**新增索引**：`@@index([userId, type])`

> 保留原有 4 个 JSON 字段（chartHistory / consultHistory / timelineEvents / insights），向后兼容。

### 1.2 ConsultFollowUp 模型

#### 当前字段

```prisma
model ConsultFollowUp {
  id          String   @id @default(uuid())
  recordId    String
  userId      String
  scheduledAt DateTime
  completedAt DateTime?
  result      String?    // JSON: { userReflection, actualOutcome, accuracyCheck }
  status      String     @default("pending") // pending/sent/completed/skipped
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  record ConsultRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)
  user   User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, scheduledAt])
  @@index([status, scheduledAt])
}
```

#### 计划新增字段（Day 1-3）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `triggerType` | `FollowUpTriggerType`（enum，5 值） | `key_date` | 回访触发类型 |
| `messageTemplate` | `String?` | — | 话术模板 |

**FollowUpTriggerType 枚举**：

```prisma
enum FollowUpTriggerType {
  key_date         // 关键日期
  contract_eve     // 合同/签约前
  action_window    // 行动窗口
  quarter_review   // 季度复盘
  anniversary      // 纪念日
}
```

**新增索引**：`@@index([triggerType])`

### 1.3 ConsultRecord.status 值域

#### 当前值（String 类型，非枚举）

| 值 | 使用位置 | 说明 |
|----|---------|------|
| `pending` | 多处 | 刚创建，等待处理 |
| `analyzing` | 部分文件 | 分析中（将被合并） |
| `completed` | 多处 | 完成 |
| `failed` | 多处 | 失败 |
| `clarify` | 部分文件 | 澄清（将被合并） |
| `responding` | 部分文件 | 回复中（将被合并） |

#### 计划扩展值（Day 4-6）

| 新值 | 含义 | 合并来源 |
|------|------|---------|
| `clarifying` | 澄清用户问题 | analyzing + clarify |
| `scheduling` | 调度 Agent（新增） | — |
| `generating` | LLM 生成中（新增） | responding |
| `validating` | 输出校验（新增） | — |

**合法流转**：

```
pending → clarifying → scheduling → generating → validating → completed
  │           │            │            │            │
  └───────────┴────────────┴────────────┴────────────┘ → failed
```

**向后兼容映射**：

```typescript
function mapLegacyStatus(status: string): ConsultStatus {
  const LEGACY_MAP: Record<string, ConsultStatus> = {
    'analyzing': 'clarifying',
    'clarify': 'clarifying',
    'responding': 'generating',
  };
  return LEGACY_MAP[status] ?? (status as ConsultStatus);
}
```

---

## 二、记忆系统架构

### 2.1 MemoryExtractorService

**文件**：`awkn-life-backend/apps/api-server/src/consult/memory/memory-extractor.service.ts`

**当前 7 类规则**：

| 规则类别 | 触发方式 | 存储字段 |
|---------|---------|---------|
| identity | 关键词匹配 | consultHistory |
| family | 关键词匹配 | timelineEvents |
| career | 关键词匹配 | timelineEvents |
| relationship | 关键词匹配 | timelineEvents |
| finance | 关键词匹配 | timelineEvents |
| health | 关键词匹配 | timelineEvents |
| decision | 关键词匹配 | insights |

**去重机制**：SimHash（相似度 ≥ 0.8 视为重复）

**LLM fallback**：规则未命中时，调用 LLM 提取事实

**ExtractedFact.category 类型 8 值**：上述 7 类 + `preference`

### 2.2 UserMemoryService

**文件**：`awkn-life-backend/apps/api-server/src/consult/memory/user-memory.service.ts`（305 行）

| 方法 | 功能 |
|------|------|
| 写入 | 咨询历史追加、时间线事件、认知洞察 |
| 读取 | loadUserMemory(userId) |
| 摘要 | getMemorySummary(userId) |
| 锚定 | 记忆锚定（关键事实标记） |
| 检索 | 跨会话检索 |

### 2.3 数据流

```
咨询完成
  → memory-extractor.extractAndPersist()
    → 7 类规则触发 + LLM fallback
    → SimHash 去重
    → 写入 UserMemory（consultHistory / timelineEvents / insights）
  → 下一轮咨询
    → UserMemoryService.loadUserMemory(userId)
    → getMemorySummary(userId)
    → 注入 prompt（memory section）
    → LLM 基于记忆生成回复
```

---

## 三、回访系统架构

### 3.1 ConsultFollowUp 模型

见 §1.2。当前仅基础回访（scheduledAt 到期后发送），10 场景主动出击未实现。

### 3.2 followup.processor.ts

**文件**：`awkn-life-backend/apps/api-server/src/consult/followup/followup.processor.ts`（~80 行）

**当前功能**：仅基础回访（到期发送 + 状态更新）

### 3.3 10 场景主动出击（计划）

| # | 场景 ID | 触发条件 | 频次 | 话术方向 |
|---|---------|---------|------|---------|
| 1 | `key_date_before` | 用户关键日期前 3 天 | 每事件 1 次 | "XX 日子快到了，提前提醒你注意…" |
| 2 | `contract_eve` | 合同/签约前 1 天 | 每事件 1 次 | "明天要签了，最后确认几个点…" |
| 3 | `action_window` | 建议行动窗口开启时 | 每窗口 1 次 | "你之前问的 XX，现在是个窗口期…" |
| 4 | `cash_collect` | 收款/回款节点 | 每事件 1 次 | "有笔款该回了，提醒你跟进…" |
| 5 | `quarter_review` | 季度复盘 | 每季度 1 次 | "这个季度你经历了 XX，回顾一下…" |
| 6 | `annual_review` | 年度复盘 | 每年 1 次 | "这一年你走了 XX，帮你盘一盘…" |
| 7 | `new_window` | 新机会窗口出现 | 按需 | "有个新动向可能跟你有关…" |
| 8 | `old_judgment_fix` | 旧判断需要修正 | 按需 | "之前判断的 XX 情况有变化…" |
| 9 | `silent_user` | 用户 7 天未活跃 | 每周 1 次（最多 3 次） | "好久没聊了，最近怎么样？" |
| 10 | `anniversary` | 纪念日/重要日期 | 每年 1 次 | "去年的今天你问过 XX，现在呢？" |

**场景接口**：

```typescript
interface FollowUpScenario {
  id: string;
  triggerType: FollowUpTriggerType;
  shouldTrigger(ctx: FollowUpContext): Promise<boolean>;
  buildMessage(ctx: FollowUpContext): Promise<string>;
  scheduleNext(ctx: FollowUpContext): Promise<Date | null>;
}

interface FollowUpContext {
  userId: string;
  userMemory: UserMemory;
  recentRecords: ConsultRecord[];
  now: Date;
}
```

**文件结构**：

```
src/consult/followup/scenarios/
├── index.ts
├── key-date-before.ts
├── contract-eve.ts
├── action-window.ts
├── cash-collect.ts
├── quarter-review.ts
├── annual-review.ts
├── new-window.ts
├── old-judgment-fix.ts
├── silent-user.ts
└── anniversary.ts
```

---

## 四、高风险检测与状态联动

### 4.1 HighRiskDetectorService

**文件**：`awkn-life-backend/apps/api-server/src/consult/safety/high-risk-detector.service.ts`（~150 行）

**当前 5 场景 + 危机干预**：

| 场景 | 关键词示例 | 拦截动作 |
|------|-----------|---------|
| 生命危机 | 自杀/轻生/结束生命 | 立即 lockdown + 危机干预热线 |
| 重大决策 | 离婚/辞职/卖房 | 提示慎重 |
| 情绪困扰 | 崩溃/绝望/受不了 | 先稳住情绪 |
| 诈骗风险 | 转账/汇款/密码 | 提示警惕 |
| 未成年人 | 未成年/16 岁/17 岁 | 限制服务 |

### 4.2 计划新增 3 段（Day 13-14）

| 段 | 关键词示例 | 拦截动作 | 状态锁定 |
|----|-----------|---------|---------|
| **医疗** | 病/癌/抑郁/诊断/手术 | 切 high_risk → 提示就医 + 不接 LLM | `clarifying` |
| **法律** | 起诉/坐牢/离婚/家暴/判决 | 切 high_risk → 提示咨询律师 | `clarifying` |
| **金融** | 爆仓/破产/杠杆/赌博/借贷 | 切 high_risk → 提示咨询专业人士 | `clarifying` |

### 4.3 联动：high_risk → ConsultRecord.status 锁定

```
用户输入 → High-Risk Detector
  ├─ 命中 high_risk → ConsultRecord.status 锁定 clarifying
  │                    → 返回安全提示，不调用 LLM
  │                    → 等待人工审核或用户确认
  └─ 未命中 → 正常流转 scheduling → generating → ...
```

**生命类永不自动解锁**：

```typescript
if (riskType === 'life') {
  await this.prisma.consultRecord.update({
    where: { id: record.id },
    data: {
      contentJson: JSON.stringify({
        locked: true,
        lockReason: 'life_crisis',
        hotline: '400-161-9995',
      }),
    },
  });
}
```

---

## 五、测试策略

### 5.1 记忆触发测试集（50 条）

| 类别 | 条数 | 触发规则 | 期望 category |
|------|------|---------|--------------|
| identity | 10 | 身份/自我相关关键词 | `identity` |
| family | 5 | 家庭/父母/子女关键词 | `family` |
| career | 5 | 事业/工作/跳槽关键词 | `career` |
| relationship | 5 | 感情/关系关键词 | `relationship` |
| finance | 5 | 财务/投资关键词 | `finance` |
| health | 5 | 健康/身体关键词 | `health` |
| decision | 5 | 决策/选择关键词 | `decision` |
| repeat_pattern | 5 | 3 次以上相同主题 | `repeat_pattern`（新增） |
| feedback | 5 | 提及上次建议 | `feedback`（新增） |

**测试文件**：`awkn-life-backend/apps/api-server/test/memory/trigger-50.spec.ts`

**通过标准**：
- 总准确率 ≥ 80%（40/50 正确）
- 旧 7 类规则不退化
- `repeat_pattern` 需同一用户 3 次相同主题才触发
- `feedback` 需提及"上次建议"才触发

### 5.2 高风险拦截测试集（40 条）

| 段 | 条数 | 关键词示例 | 期望拦截 |
|----|------|-----------|---------|
| 生命 | 10 | 自杀/轻生/结束生命/不想活 | 100% 拦截 |
| 医疗 | 10 | 病/癌/抑郁/诊断/手术 | 100% 拦截 |
| 法律 | 10 | 起诉/坐牢/离婚/家暴/判决 | 100% 拦截 |
| 金融 | 10 | 爆仓/破产/杠杆/赌博/借贷 | 100% 拦截 |

**测试文件**：`awkn-life-backend/apps/api-server/test/safety/high-risk-40.spec.ts`

**通过标准**：
- 40/40 全部命中 high_risk
- 命中后 ConsultRecord.status = clarifying
- 生命类永不解锁（locked=true）
- 非 high_risk 不误拦（10 条正常问题 0 误拦）

---

## 六、关键文件路径索引

| 文件 | 路径 |
|------|------|
| Prisma Schema | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma` |
| UserMemoryService | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/memory/user-memory.service.ts` |
| MemoryExtractor | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/memory/memory-extractor.service.ts` |
| FollowUpProcessor | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/followup/followup.processor.ts` |
| HighRiskDetector | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/safety/high-risk-detector.service.ts` |
| CrisisKeywords | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/safety/crisis-keywords.ts` |
| ScenarioRules | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/safety/scenario-rules.yaml` |
| Orchestrator | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/orchestrator.service.ts` |
| Scheduler | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/zhangbanshan-scheduler.service.ts` |

---

## 七、环境变量开关

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `L3_MEMORY_FIELDS_ENABLED` | `true` | Day 1-3 新字段开关 |
| `L3_NEW_STATUS_ENABLED` | `true` | Day 4-6 新状态开关（false 回退旧 6 态） |
| `L3_5TYPE_TRIGGER_ENABLED` | `true` | Day 7-9 5 类触发开关（false 回退 7 类） |
| `ACTIVE_MOVES_ENABLED` | `true` | Day 10-12 主动出击总开关 |
| `HIGH_RISK_MODE` | `lockdown` | Day 13-14 高风险模式（lockdown/warn/off） |
| `L3_CHART_HISTORY_ENABLED` | `true` | Day 17-18 chartHistory 开关 |

---

*生成日期：2026-06-15 · v1.0*
