# L3 记忆/回访 天级执行手册 v2

> **版本**：v2.0
> **生成日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
> **优先级**：🟠 **P2**（依赖 L1+L2，第 8-20 周）
> **工期**：20 天（4 周）
> **目标读者**：天火（架构 Lead）、后端 Lead、程序员
> **依赖阻塞**：L1（4 类用户状态）+ L2（三套输出 + Pipeline 修稳）

---

## 〇、阅读路径

```
本文档 §零  ←  代码现状基线（30% 完成度）   ← 先看
        §一  ←  Day 1-3: Prisma Schema 对齐   ← 数据层
        §二  ←  Day 4-6: ConsultRecord.status 扩展 ← 状态层
        §三  ←  Day 7-9: 5 类记忆触发增强     ← 业务逻辑
        §四  ←  Day 10-12: 10 场景主动出击     ← 回访机制
        §五  ←  Day 13-14: 4 段高风险联动      ← 安全层
        §六  ←  Day 15-16: 记忆回流验证        ← 端到端
        §七  ←  Day 17-18: chartHistory 激活   ← 闲置字段
        §八  ←  Day 19-20: 集成测试 + 回归     ← 收口
        §九  ←  验收总清单                     ← 验收
        §十   ←  回滚总方案                    ← 应急
```

---

## 零、代码现状基线

> ⚠️ 以下为 2026-06-15 实际代码态，不是规划态。所有 Day 任务均基于此基线增量推进。

### 0.1 完成度

| 模块 | 完成度 | 说明 |
|------|--------|------|
| Prisma Schema | 60% | UserMemory / ConsultFollowUp 模型存在，但字段不完整 |
| ConsultRecord.status | 40% | 6 态字符串，缺精细流转 |
| 记忆触发 | 50% | 7 类规则存在，但与 docx 5 类未对齐 |
| 主动出击 | 20% | 仅基础回访，10 场景未实现 |
| 高风险联动 | 50% | 5 场景 + 危机干预已有，缺医疗/法律/金融 3 段与状态联动 |
| 记忆回流 | 30% | 写入链路存在，端到端验证缺失 |
| chartHistory | 0% | 字段存在但未使用 |
| 测试 | 0% | 0 个记忆相关测试 |

**总体完成度：30%**

### 0.2 现有 Prisma Schema

```prisma
// UserMemory（schema.prisma:71-85）
model UserMemory {
  id              String   @id @default(cuid())
  userId          String   @unique
  chartHistory    String?  @default("{}")   // ⚠️ 未使用
  consultHistory  String?  @default("{}")
  timelineEvents  String?  @default("{}")
  insights        String?  @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ConsultFollowUp
model ConsultFollowUp {
  id            String   @id @default(cuid())
  recordId      String
  userId        String
  scheduledAt   DateTime
  completedAt   DateTime?
  result        String?
  status        String   // scheduled/completed/skipped
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 0.3 ConsultRecord.status 现状

- **类型**：`String`（非枚举）
- **代码中使用的值**：`pending` / `analyzing` / `completed` / `failed` / `clarify`
- **代码中还用了**：`responding`（部分文件）
- **缺**：精细流转（clarifying / scheduling / generating / validating）

### 0.4 记忆触发现状

- **文件**：`memory-extractor.service.ts`
- **7 类规则**：identity / family / career / relationship / finance / health / decision
- **ExtractedFact.category 类型 8 值**：上述 7 类 + `preference`
- **存储字段**：4 JSON 字段（chartHistory / consultHistory / timelineEvents / insights）
- **与 docx 5 类未对齐**：docx 定义 major_issue / time_anchor / bottom_line / repeat_pattern / feedback

### 0.5 关键服务文件

| 文件 | 行数 | 功能 |
|------|------|------|
| `user-memory.service.ts` | 305 | 咨询历史追加 / 时间线事件 / 认知洞察 / 跨会话检索 / 记忆摘要 / 记忆锚定 |
| `memory-extractor.service.ts` | ~200 | 7 类规则触发 + SimHash 去重 |
| `followup.processor.ts` | ~80 | 仅基础回访 |
| `high-risk-detector.service.ts` | ~150 | 5 场景 + 危机干预 |
| `zhangbanshan-scheduler.service.ts` | ~400 | synthesizeByNode（Node 0-6），内嵌调度逻辑 |

### 0.6 测试现状

- **记忆相关测试**：0 个
- **高风险拦截测试**：0 个
- **状态流转测试**：0 个

---

## 一、Day 1-3: Prisma Schema 对齐

### 1.1 目标

UserMemory 新增结构化记忆字段，ConsultFollowUp 新增触发类型，使数据模型支撑 5 类记忆 + 10 场景回访。

### 1.2 变更清单

#### UserMemory 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | `MemoryType`（enum，8 值） | identity / family / career / relationship / finance / health / decision / preference |
| `content` | `String` | 记忆内容文本 |
| `sourceQuote` | `String?` | 原始对话引用 |
| `confidence` | `Float @default(0.5)` | 置信度 0-1 |
| `weight` | `Float @default(1.0)` | 权重（衰减用） |
| `expiresAt` | `DateTime?` | 过期时间（可选） |

**Prisma enum 定义**：

```prisma
enum MemoryType {
  identity
  family
  career
  relationship
  finance
  health
  decision
  preference
}
```

**Schema 变更**：

```prisma
model UserMemory {
  id              String     @id @default(cuid())
  userId          String     @unique
  type            MemoryType @default(identity)
  content         String     @default("")
  sourceQuote     String?
  confidence      Float      @default(0.5)
  weight          Float      @default(1.0)
  expiresAt       DateTime?

  // 保留原有 JSON 字段（向后兼容）
  chartHistory    String?    @default("{}")
  consultHistory  String?    @default("{}")
  timelineEvents  String?    @default("{}")
  insights        String?    @default("{}")

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  @@index([userId, type])
  @@map("UserMemory")
}
```

#### ConsultFollowUp 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `triggerType` | `FollowUpTriggerType`（enum，5 值） | key_date / contract_eve / action_window / quarter_review / anniversary |
| `messageTemplate` | `String?` | 话术模板 |

**Prisma enum 定义**：

```prisma
enum FollowUpTriggerType {
  key_date
  contract_eve
  action_window
  quarter_review
  anniversary
}
```

**Schema 变更**：

```prisma
model ConsultFollowUp {
  id              String              @id @default(cuid())
  recordId        String
  userId          String
  scheduledAt     DateTime
  completedAt     DateTime?
  result          String?
  status          String              // scheduled/completed/skipped
  triggerType     FollowUpTriggerType @default(key_date)
  messageTemplate String?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([userId, scheduledAt])
  @@index([triggerType])
  @@map("ConsultFollowUp")
}
```

### 1.3 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 修改 `schema.prisma`，新增 MemoryType / FollowUpTriggerType enum + 字段 | Schema 文件 |
| 2 | `npx prisma migrate dev --name add_l3_memory_fields` | Migration 文件 |
| 3 | 编写软迁移脚本 `scripts/backfill-l3-fields.ts`：为老数据填充默认值（type=identity, confidence=0.5, weight=1.0, triggerType=key_date） | 迁移脚本 |
| 4 | `npx prisma generate` 同步 client | Prisma Client |
| 5 | 验证 | 见下方 |

### 1.4 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V1-1 | `npx prisma migrate deploy` 成功 | 0 error |
| V1-2 | 老数据无丢失 | 查询已有 UserMemory / ConsultFollowUp 记录，字段完整 |
| V1-3 | 新字段默认值正确 | 老记录 type=identity, confidence=0.5, weight=1.0 |
| V1-4 | `npx prisma generate` 成功 | TypeScript 类型包含新字段 |

### 1.5 回滚

```bash
# 回滚 migration
npx prisma migrate resolve --rolled-back add_l3_memory_fields
# 恢复 schema.prisma 到变更前
git checkout -- prisma/schema.prisma
npx prisma generate
```

---

## 二、Day 4-6: ConsultRecord.status 扩展

### 2.1 目标

将 ConsultRecord.status 从粗粒度 6 态扩展为精细 7 态流转，支撑更准确的咨询进度追踪。

### 2.2 现状 → 目标

| 现状 | 目标 |
|------|------|
| `pending` | `pending`（保持） |
| `analyzing` | `clarifying`（澄清阶段） |
| — | `scheduling`（调度阶段，新增） |
| — | `generating`（生成阶段，新增） |
| — | `validating`（校验阶段，新增） |
| `completed` | `completed`（保持） |
| `failed` | `failed`（保持） |
| `clarify` | 合并到 `clarifying` |
| `responding` | 合并到 `generating` |

**新状态枚举**：

```typescript
type ConsultStatus =
  | 'pending'      // 刚创建，等待处理
  | 'clarifying'   // 澄清用户问题（原 analyzing + clarify）
  | 'scheduling'   // 调度 Agent（新增）
  | 'generating'   // LLM 生成中（原 responding）
  | 'validating'   // 输出校验（新增）
  | 'completed'    // 完成
  | 'failed';      // 失败
```

### 2.3 状态流转图

```
pending → clarifying → scheduling → generating → validating → completed
  │           │            │            │            │
  └───────────┴────────────┴────────────┴────────────┘ → failed
```

**合法流转**：

```typescript
const VALID_TRANSITIONS: Record<ConsultStatus, ConsultStatus[]> = {
  pending:     ['clarifying', 'failed'],
  clarifying:  ['scheduling', 'failed'],
  scheduling:  ['generating', 'failed'],
  generating:  ['validating', 'failed'],
  validating:  ['completed', 'failed'],
  completed:   [],  // 终态
  failed:      [],  // 终态
};
```

### 2.4 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 在 `orchestrator.service.ts` 中更新状态流转逻辑 | 代码变更 |
| 2 | 编写向后兼容映射函数 | 兼容层 |
| 3 | 更新 `ConsultRecord` 的 status 写入点（约 5 处） | 代码变更 |
| 4 | 验证 | 见下方 |

### 2.5 向后兼容

```typescript
// 兼容旧状态值的读取映射
function mapLegacyStatus(status: string): ConsultStatus {
  const LEGACY_MAP: Record<string, ConsultStatus> = {
    'analyzing': 'clarifying',
    'clarify': 'clarifying',
    'responding': 'generating',
  };
  return LEGACY_MAP[status] ?? (status as ConsultStatus);
}
```

- **读**：通过 `mapLegacyStatus` 兼容旧值
- **写**：只写新值，不再写入 analyzing / clarify / responding
- **数据库**：不修改老记录的 status 值，靠映射函数兼容

### 2.6 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V2-1 | 新状态流转完整 | pending→clarifying→scheduling→generating→validating→completed 全链路 |
| V2-2 | 旧数据兼容 | 读取 analyzing/clarify/responding 映射到新值，无报错 |
| V2-3 | 非法流转拒绝 | pending→completed 抛出 Error |
| V2-4 | failed 可从任意状态进入 | 5 个非终态均可转 failed |

---

## 三、Day 7-9: 5 类记忆触发增强

### 3.1 目标

将现有 7 类规则对齐 docx 定义的 5 类记忆触发，新增 feedback 类，提升触发准确率。

### 3.2 对齐映射

| docx 5 类 | 含义 | 现有 7 类映射 | 存储字段 |
|-----------|------|---------------|---------|
| **major_issue** | 重大议题（身份/核心问题） | identity | `consultHistory` |
| **time_anchor** | 时间锚点（家庭/事业/关系/财务/健康事件） | family / career / relationship / finance / health | `timelineEvents` |
| **bottom_line** | 底线（决策/不可退让） | decision | `insights` |
| **repeat_pattern** | 重复模式（反复出现的行为） | repeating（当前代码中无独立规则，需新增） | `insights` |
| **feedback** | 反馈（用户对上次建议的回应） | **无**（需新增） | `consultHistory` |

### 3.3 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 在 `memory-extractor.service.ts` 中新增 `repeat_pattern` 规则（检测 3 次以上相同主题） | 规则代码 |
| 2 | 在 `memory-extractor.service.ts` 中新增 `feedback` 规则（检测用户对上次建议的回应关键词） | 规则代码 |
| 3 | 更新 `ExtractedFact.category` 类型，增加 `repeat_pattern` / `feedback` | 类型定义 |
| 4 | 创建 50 条测试集（每类 10 条） | 测试文件 |
| 5 | 验证 | 见下方 |

### 3.4 新增规则示例

```typescript
// repeat_pattern：3 次以上相同主题
{
  category: 'repeat_pattern',
  pattern: /又.*了|还是.*一样|每次都|反复|一直/,
  description: '检测重复出现的行为模式',
  minOccurrences: 3,  // 同一用户同一主题出现 ≥3 次
}

// feedback：用户对上次建议的回应
{
  category: 'feedback',
  pattern: /上次.*建议|你说的.*我试了|按你说的|没按你说的|上次.*效果/,
  description: '检测用户对上次建议的反馈',
}
```

### 3.5 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V3-1 | 5 类触发准确率 ≥ 80% | 50 条测试集中 ≥ 40 条正确分类 |
| V3-2 | repeat_pattern 检测 | 同一用户 3 次相同主题触发 |
| V3-3 | feedback 检测 | 用户提及"上次建议"时触发 |
| V3-4 | 旧 7 类规则不退化 | identity/family/career 等原有规则仍正常 |

---

## 四、Day 10-12: 10 场景主动出击

### 4.1 目标

实现 10 个主动回访场景，每个场景独立文件 + 话术模板，通过 Bull/Agenda 调度。

### 4.2 10 场景清单

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

### 4.3 文件结构

```
src/consult/followup/scenarios/
├── index.ts                    ← 场景注册表
├── key-date-before.ts          ← 场景 1
├── contract-eve.ts             ← 场景 2
├── action-window.ts            ← 场景 3
├── cash-collect.ts             ← 场景 4
├── quarter-review.ts           ← 场景 5
├── annual-review.ts            ← 场景 6
├── new-window.ts               ← 场景 7
├── old-judgment-fix.ts         ← 场景 8
├── silent-user.ts              ← 场景 9
└── anniversary.ts              ← 场景 10
```

### 4.4 场景接口

```typescript
interface FollowUpScenario {
  id: string;                              // 场景 ID
  triggerType: FollowUpTriggerType;        // 对应 enum
  shouldTrigger(ctx: FollowUpContext): Promise<boolean>;  // 是否触发
  buildMessage(ctx: FollowUpContext): Promise<string>;    // 生成话术
  scheduleNext(ctx: FollowUpContext): Promise<Date | null>; // 下次触发时间
}

interface FollowUpContext {
  userId: string;
  userMemory: UserMemory;
  recentRecords: ConsultRecord[];
  now: Date;
}
```

### 4.5 调度集成

```typescript
// followup.scheduler.service.ts
// BullMQ 队列：followup-queue
// Agenda job：followup-{scenarioId}

// 每小时扫描一次，检查是否有场景需要触发
@Cron('0 * * * *')
async scanScenarios() {
  const users = await this.getActiveUsers();
  for (const user of users) {
    for (const scenario of this.scenarios) {
      const ctx = await this.buildContext(user.id);
      if (await scenario.shouldTrigger(ctx)) {
        await this.scheduleFollowUp(user.id, scenario, ctx);
      }
    }
  }
}
```

### 4.6 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 创建 `scenarios/` 目录 + 接口定义 | 目录结构 |
| 2 | 实现 10 个场景文件（每场景 1 文件） | 10 个文件 |
| 3 | 编写话术模板（每场景 2-3 个模板） | 模板 |
| 4 | 集成 Bull/Agenda 调度 | 调度器 |
| 5 | 验证 | 见下方 |

### 4.7 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V4-1 | 10 场景调度跑通 | 每个场景的 shouldTrigger + buildMessage 不抛错 |
| V4-2 | Bull 队列消费正常 | followup-queue 消费无堆积 |
| V4-3 | 话术模板渲染正确 | 输出文本无 `undefined` / 空白 |
| V4-4 | silent_user 最多 3 次 | 连续 3 周后不再触发 |

---

## 五、Day 13-14: 4 段高风险联动

### 5.1 目标

L2 已补医疗/法律/金融 3 段高风险检测，L3 需与 ConsultRecord.status 联动：高风险检测命中时，锁定状态为 `clarifying`，不进入 `generating`。

### 5.2 联动逻辑

```
用户输入 → High-Risk Detector
  ├─ 命中 high_risk → ConsultRecord.status 锁定 clarifying
  │                    → 返回安全提示，不调用 LLM
  │                    → 等待人工审核或用户确认
  └─ 未命中 → 正常流转 scheduling → generating → ...
```

### 5.3 4 段拦截详情

| 段 | 关键词示例 | 拦截动作 | 状态锁定 |
|----|-----------|---------|---------|
| **医疗** | 病/癌/抑郁/诊断/手术 | 切 high_risk → 提示就医 + 不接 LLM | `clarifying` |
| **法律** | 起诉/坐牢/离婚/家暴/判决 | 切 high_risk → 提示咨询律师 | `clarifying` |
| **金融** | 爆仓/破产/杠杆/赌博/借贷 | 切 high_risk → 提示咨询专业人士 | `clarifying` |
| **生命** | 自杀/轻生/结束生命/不想活 | **立即 lockdown** + 危机干预热线 | `clarifying`（永不解锁） |

### 5.4 代码变更

```typescript
// orchestrator.service.ts 中高风险检测后的状态联动
async handleHighRisk(record: ConsultRecord, riskType: string): Promise<void> {
  // 锁定状态为 clarifying，不进入 generating
  await this.prisma.consultRecord.update({
    where: { id: record.id },
    data: { status: 'clarifying' },
  });

  // 生命类永不自动解锁
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
}
```

### 5.5 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 在 `orchestrator.service.ts` 中添加高风险 → clarifying 联动 | 代码变更 |
| 2 | 在 `high-risk-detector.service.ts` 中补充医疗/法律/金融关键词 | 关键词补充 |
| 3 | 创建 40 条测试集（每段 10 条） | 测试文件 |
| 4 | 验证 | 见下方 |

### 5.6 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V5-1 | 40/40 拦截通过 | 每段 10 条全部命中 high_risk |
| V5-2 | 状态锁定正确 | 命中后 ConsultRecord.status = clarifying |
| V5-3 | 生命类永不解锁 | life 类记录 locked=true |
| V5-4 | 非 high_risk 不误拦 | 10 条正常问题 0 误拦 |

---

## 六、Day 15-16: 记忆回流验证

### 6.1 目标

验证 UserMemoryService 的完整链路：写入 → 下一轮读取 → 注入 prompt。

### 6.2 回流链路

```
用户咨询 → memory-extractor 提取记忆
         → UserMemoryService 写入（consultHistory / timelineEvents / insights）
         → 下次咨询 → UserMemoryService.loadUserMemory(userId)
         → 注入 prompt（memory section）
         → LLM 基于记忆生成回复
```

### 6.3 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 编写 10 条端到端记忆回流测试 | 测试文件 |
| 2 | 验证写入链路 | 写入后 DB 可查 |
| 3 | 验证读取链路 | 读取内容与写入一致 |
| 4 | 验证 prompt 注入 | prompt 中包含记忆 section |
| 5 | 验证 | 见下方 |

### 6.4 测试用例

```typescript
// test/memory-roundtrip.spec.ts

describe('记忆回流端到端', () => {
  // 1. 写入 identity 类记忆 → 下次读取到
  // 2. 写入 family 类记忆 → 下次读取到
  // 3. 写入 career 类记忆 → 下次读取到
  // 4. 写入 decision 类记忆 → 下次读取到
  // 5. 写入 repeat_pattern → 下次读取到
  // 6. 写入 feedback → 下次读取到
  // 7. 记忆注入 prompt → prompt 包含 memory section
  // 8. 跨会话记忆 → session 2 能读到 session 1 的记忆
  // 9. 记忆去重 → 相同内容不重复写入
  // 10. 记忆衰减 → 过期记忆不注入 prompt
});
```

### 6.5 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V6-1 | 10/10 记忆回流成功 | 写入 → 读取 → 注入 prompt 全链路 |
| V6-2 | 跨会话记忆持久化 | session 2 能读到 session 1 的记忆 |
| V6-3 | 记忆去重 | SimHash ≥ 0.8 时不重复写入 |
| V6-4 | 过期记忆不注入 | expiresAt < now 的记忆不出现在 prompt |

---

## 七、Day 17-18: chartHistory 字段激活

### 7.1 目标

激活 UserMemory.chartHistory 字段，每次咨询后写入命盘快照。

### 7.2 现状

- `chartHistory` 字段存在于 Prisma Schema（`String? @default("{}")`）
- 代码中未使用（0 处写入）

### 7.3 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 在 `UserMemoryService` 中新增 `updateChartHistory` 方法 | 方法 |
| 2 | 在 `orchestrator.service.ts` 的咨询完成后调用 | 调用点 |
| 3 | 定义 chartHistory JSON 结构 | 类型定义 |
| 4 | 验证 | 见下方 |

### 7.4 chartHistory JSON 结构

```typescript
interface ChartSnapshot {
  date: string;           // 咨询日期 ISO
  type: string;           // 排盘类型（ziping/liuren/qimen/ziwei/liuyao）
  result: string;         // 排盘结果摘要
  question: string;       // 原始问题
  recordId: string;       // ConsultRecord ID
}

// chartHistory 字段存储：ChartSnapshot[]
```

### 7.5 代码变更

```typescript
// user-memory.service.ts 新增方法
async updateChartHistory(userId: string, snapshot: ChartSnapshot): Promise<void> {
  const memory = await this.prisma.userMemory.findUnique({ where: { userId } });
  const history: ChartSnapshot[] = memory?.chartHistory
    ? JSON.parse(memory.chartHistory)
    : [];

  // 追加，上限 50 条
  history.push(snapshot);
  if (history.length > 50) history.shift();

  await this.prisma.userMemory.update({
    where: { userId },
    data: { chartHistory: JSON.stringify(history) },
  });
}
```

### 7.6 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V7-1 | chartHistory 写入成功 | 咨询后 DB 中 chartHistory 非空 |
| V7-2 | chartHistory 读取可用 | `loadUserMemory` 返回 chartHistory |
| V7-3 | 上限 50 条 | 第 51 条写入时，最早 1 条被移除 |
| V7-4 | JSON 格式正确 | 解析无报错，结构符合 ChartSnapshot |

---

## 八、Day 19-20: 集成测试 + 回归

### 8.1 目标

全量测试通过，记忆触发 + 状态流转 + 高风险拦截回归无退化。

### 8.2 执行步骤

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 运行 `npm run test` | 测试报告 |
| 2 | 记忆触发回归（50 条测试集） | 准确率报告 |
| 3 | 状态流转回归（7 态流转） | 流转报告 |
| 4 | 高风险拦截回归（40 条测试集） | 拦截率报告 |
| 5 | 修复失败用例 | 代码修复 |

### 8.3 验证标准

| # | 验证项 | 通过标准 |
|---|--------|---------|
| V8-1 | 全量 `npm run test` 通过 | 0 个失败 |
| V8-2 | 记忆触发准确率 ≥ 80% | 50 条中 ≥ 40 条正确 |
| V8-3 | 状态流转完整 | 7 态流转无死锁 |
| V8-4 | 高风险拦截率 100% | 40/40 拦截通过 |
| V8-5 | 记忆回流 10/10 | 端到端链路无断裂 |

---

## 九、验收总清单

| # | 验收项 | 对应 Day | 通过标准 | 状态 |
|---|--------|---------|---------|------|
| A1 | Prisma migration 成功 | Day 1-3 | 0 error | ☐ |
| A2 | 老数据无丢失 | Day 1-3 | 查询已有记录字段完整 | ☐ |
| A3 | 新字段默认值正确 | Day 1-3 | type/confidence/weight 默认值 | ☐ |
| A4 | ConsultRecord.status 新流转完整 | Day 4-6 | 7 态全链路 | ☐ |
| A5 | 旧状态值兼容 | Day 4-6 | analyzing/clarify/responding 映射正确 | ☐ |
| A6 | 5 类记忆触发准确率 ≥ 80% | Day 7-9 | 50 条测试集 | ☐ |
| A7 | 10 场景调度跑通 | Day 10-12 | 每场景不抛错 | ☐ |
| A8 | 4 段高风险拦截 40/40 | Day 13-14 | 100% 拦截率 | ☐ |
| A9 | 记忆回流 10/10 | Day 15-16 | 端到端链路 | ☐ |
| A10 | chartHistory 写入 + 读取可用 | Day 17-18 | 非空 + 格式正确 | ☐ |
| A11 | 全量测试 0 失败 | Day 19-20 | npm run test | ☐ |

**总验收标准**：A1-A11 全部 ☑ → L3 记忆/回访 交付完成

---

## 十、回滚总方案

### 10.1 回滚策略总览

| Day 范围 | 回滚范围 | 回滚方式 |
|---------|---------|---------|
| Day 1-3 | Prisma Schema | `prisma migrate resolve --rolled-back` + schema revert |
| Day 4-6 | ConsultRecord.status | 移除新状态映射，恢复旧 6 态 |
| Day 7-9 | 记忆触发规则 | 删除新增规则，恢复 7 类 |
| Day 10-12 | 10 场景 | 删除 scenarios/ 目录 + 调度器 |
| Day 13-14 | 高风险联动 | 移除 clarifying 锁定逻辑 |
| Day 15-16 | 记忆回流 | 无结构变更，仅删测试 |
| Day 17-18 | chartHistory | 移除 updateChartHistory 调用 |
| Day 19-20 | 集成测试 | 无需回滚 |

### 10.2 全量回滚 SOP

```bash
# 1. 停止服务
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 stop api-server'

# 2. 备份当前 PG
ssh root@8.148.245.29 'pg_dump awkn_life > /backup/pg-l3-rollback-$(date +%Y%m%d).sql'

# 3. 回滚代码
cd /opt/awkn-life/awkn-life-backend/apps/api-server
git revert HEAD~20   # 回滚 L3 全部变更

# 4. 回滚 schema
npx prisma migrate resolve --rolled-back add_l3_memory_fields
npx prisma generate

# 5. 重启
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 start api-server'

# 6. 健康检查
curl http://8.148.245.29:3000/health

# 7. 验证老功能
curl -X POST http://8.148.245.29:3000/api/v1/consult \
  -H 'Content-Type: application/json' \
  -d '{"question":"测试问题"}'
```

### 10.3 分段回滚（推荐）

> 优先使用分段回滚，仅回滚出问题的 Day 范围，不影响已完成的部分。

| 故障信号 | 回滚范围 | 回滚命令 |
|---------|---------|---------|
| migration 失败 | Day 1-3 | `npx prisma migrate resolve --rolled-back add_l3_memory_fields` |
| 状态流转死锁 | Day 4-6 | `git revert` status 相关 commit |
| 记忆触发退化 | Day 7-9 | 删除新增规则文件，恢复 7 类 |
| 场景调度堆积 | Day 10-12 | `ACTIVE_MOVES_ENABLED=false` + 清空队列 |
| 高风险误拦 | Day 13-14 | `HIGH_RISK_MODE=warn`（降级为告警，不锁定） |
| 记忆回流断裂 | Day 15-16 | 无结构变更，修复代码即可 |
| chartHistory 写入异常 | Day 17-18 | 移除 updateChartHistory 调用 |

### 10.4 环境变量开关

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `L3_MEMORY_FIELDS_ENABLED` | `true` | Day 1-3 新字段开关 |
| `L3_NEW_STATUS_ENABLED` | `true` | Day 4-6 新状态开关（false 回退旧 6 态） |
| `L3_5TYPE_TRIGGER_ENABLED` | `true` | Day 7-9 5 类触发开关（false 回退 7 类） |
| `ACTIVE_MOVES_ENABLED` | `true` | Day 10-12 主动出击总开关 |
| `HIGH_RISK_MODE` | `lockdown` | Day 13-14 高风险模式（lockdown/warn/off） |
| `L3_CHART_HISTORY_ENABLED` | `true` | Day 17-18 chartHistory 开关 |

---

## 附录 A：关键文件路径

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
| 拍板文件 | `docs/dev/execution/00-decisions-confirmed.md` |
| 计划详情 | `docs/dev/execution/line-03-memory.md` |
| 口径源 | `docs/engineering-handoffs/_ground-truth.md` |
| L1 依赖 | `docs/engineering-handoffs/engineering-handoff-L1-content.md` |
| L2 依赖 | `docs/engineering-handoffs/engineering-handoff-L2-pipeline.md` |
| L3 v1 | `docs/engineering-handoffs/engineering-handoff-L3-memory.md` |

---

## 附录 B：术语对照

| 本文档用语 | 不使用 | 原因 |
|-----------|--------|------|
| ConsultRecord.status 字符串 | 9 节点状态机 | 当前实现为字符串字段，非独立状态机服务 |
| Pipeline 9 步流程 | 9 模块 Pipeline | 实际是流程步骤，非独立模块 |
| 服务名直接引用 | mbs-* | 无 mbs 前缀命名约定 |

---

*生成日期：2026-06-15 · v2.0*
*下次更新：Day 3 Schema 对齐完成后*
