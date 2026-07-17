# L3 记忆/回访/状态机工程交接

> ⚠️ **DEPRECATED（2026-06-25）**：本文件已被 [`engineering-handoff-L3-memory-v2.md`](./engineering-handoff-L3-memory-v2.md) 取代。本文件仅作历史参考，不再维护。权威版本请查阅 -v2.md。

> **版本**：v2.0
> **修订日期**：2026-06-15
> **口径源**：[_ground-truth.md](./_ground-truth.md)
> **生成日期**：2026-06-14
> **拍板依据**：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md` §一 D3/D4 + §三 战略
> **优先级**：🟠 **P2**（依赖 L1+L2，第 8-20 周）
> **工期**：13 周（P2 阶段）+ 9 周灰度放量（P4 阶段）
> **目标读者**：天火（架构 Lead）、后端 Lead、程序员
> **依赖阻塞**：L1（4 类用户状态）+ L2（三套输出）

---

## 〇、阅读路径

```
本文档 §一  ←  D3 修正（灰度方向）+ D4 修正（RELATIONS_TIER）← 关键
        §二  ←  9 节点状态机（⚠️ 当前未实现，P2-5 规划目标）← 核心架构
        §三  ←  7 类记忆触发 + 高风险拦截（已实现）← 业务逻辑
        §四  ←  主动出击（Bull/Agenda）       ← 回访机制
        §五  ←  数据迁移（SQLite → PG）       ← 上线前
        §六  ←  RACI + 技术约束              ← 责任到人
```

---

## 一、关键修正（D3 / D4）

### 1.1 D3 拍板：9 节点状态机替代 mini 3 态

> ⚠️ **当前未实现**。后端仅有隐含 7 节点对话逻辑（`zhangbanshan-scheduler.service.ts` Node 0-6）+ `EmotionState` 3 维情绪（gravity/warmth/caution）。9 节点状态机作为 **P2-5 规划目标**，XState 依赖不存在，`mini-state-machine.service.ts` 不存在。
>
> ⚠️ **灰度方向修正**（CEO 原话）：原推荐"mini 灰度 10%"方向反了。应该是：
>
> **新 9 节点从 1% 起**，48h 无 crash → 10% → 50% → 100%
> **mini 3 态保持 90%+ 兜底**

**为什么从 1% 起**（不是 10%）：
- multi_turn_enabled 当前才 3%，说明多轮对话本身没验证过
- 9 节点状态机依赖 multi_turn，1% 灰度能给 48h 观察窗口

**灰度开关**：

| 环境变量 | 默认值 | 用途 |
|---------|--------|------|
| `USE_9_NODE_MACHINE` | `false` | 9 节点开关 |
| `USE_9_NODE_MACHINE_PCT` | `0` | 灰度百分比（0/1/10/50/100） |
| `MINI_3_STATE_FALLBACK` | `true` | mini 3 态兜底（必开） |

**灰度顺序**：
```
Week 1: 9 节点 1%（mini 99%）
  ↓ 48h 无 crash
Week 2-3: 9 节点 10%（mini 90%）
  ↓ 无 e2e 失败 > 5%
Week 4-8: 9 节点 50%（mini 50%）
  ↓ 无投诉率 > 1%
Week 9-13: 9 节点 100%（mini 兜底仅故障时）
```

### 1.2 D4 拍板：核心 4 关系人 + RELATIONS_TIER 写死 core_only

> ⚠️ **"可选 2"永远不打开**（CEO 原话）
>
> ⚠️ 无独立 `relations.config.ts`，关系逻辑在 `atom-tools/decision/relationship.ts` 硬编码

**理由**：
- 每次请求多注入 2 个关系人 → token 成本涨 30-50%
- "可选关系人"质量没有验证手段
- 先用核心 4 跑 3 个月，看用户反馈再决定

**RELATIONS_TIER 默认值**：

```typescript
// ⚠️ 无独立 relations.config.ts，关系逻辑在 atom-tools/decision/relationship.ts 硬编码
// 以下为规划态设计

export const RELATIONS_TIER_DEFAULT: 'core_only' = 'core_only';
// 写死为 core_only，3 个月后再评估

export const RELATIONS = {
  core: [
    '父',      // 张半山的父亲
    '母',      // 张半山的母亲
    '旧上级',  // 张半山的旧领导
    '旧同事',  // 张半山的旧同事
  ],
  optional: [
    '系统伙伴',  // 永远不打开
    '茶档',      // 永远不打开
  ],
};
```

**回滚开关**：
| 开关 | 默认 | 用途 |
|------|------|------|
| `RELATIONS_TIER=core_only` | ✅ 写死 | 只注入核心 4 |
| `RELATIONS_TIER=disabled` | ❌ 不用 | 关闭关系人（应急） |

---

## 二、9 节点状态机

> ⚠️ **当前未实现**。后端仅有隐含 7 节点对话逻辑（`zhangbanshan-scheduler.service.ts` Node 0-6）+ `EmotionState` 3 维情绪（gravity/warmth/caution）。9 节点状态机作为 **P2-5 规划目标**。XState 依赖不存在，`mini-state-machine.service.ts` 不存在。以下为规划态设计。

### 2.1 状态流转图

```
[新用户]
  ↓
cold_start (冷启动)
  ↓ 首次提问
first_issue (首次问题)
  ↓ 进入对话
context_collecting (上下文收集)
  ↓ 信息够
chart_ready (起卦就绪)
  ↓ 起卦完成
first_judgment (首次判断)
  ↓ 三套输出
action_confirm (行动确认)
  ↓ 用户确认
followup_due (回访到期)
  ↓ 时间到（3-7 天）
feedback_received (收到反馈)
  ↓ 用户回复
long_memory_update (长期记忆更新)
  ↓ 写入 UserMemory
  ↓ 回到 first_issue（下一个 issue）
```

### 2.2 状态枚举

```typescript
type NodeState =
  | 'cold_start'
  | 'first_issue'
  | 'context_collecting'
  | 'chart_ready'
  | 'first_judgment'
  | 'action_confirm'
  | 'followup_due'
  | 'feedback_received'
  | 'long_memory_update';

interface StateMachineContext {
  userId: string;
  currentState: NodeState;
  stateEnteredAt: Date;
  // 状态相关数据
  issueId?: string;
  chartData?: any;
  reportId?: string;
  followupScheduledAt?: Date;
  lastFeedbackAt?: Date;
}
```

### 2.2b 用户状态分类（UserState）

> 统一为 4 类（对齐 L1 实际实现）

```typescript
type UserState =
  | 'casual'     // 随意浏览，无明确问题
  | 'genuine'    // 认真咨询，有明确问题
  | 'repeating'  // 重复来访，已有历史
  | 'validating'; // 验证反馈，回访确认
```

### 2.3 状态机实现

```typescript
// apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/state-machine/consult-state-machine.ts

@Injectable()
export class ConsultStateMachine {
  private readonly transitions: Record<NodeState, NodeState[]> = {
    cold_start: ['first_issue'],
    first_issue: ['context_collecting'],
    context_collecting: ['chart_ready'],
    chart_ready: ['first_judgment'],
    first_judgment: ['action_confirm'],
    action_confirm: ['followup_due', 'first_issue'], // 行动确认后等回访，或下一个问题
    followup_due: ['feedback_received'],
    feedback_received: ['long_memory_update'],
    long_memory_update: ['first_issue'],
  };
  
  canTransition(from: NodeState, to: NodeState): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }
  
  transition(ctx: StateMachineContext, to: NodeState): StateMachineContext {
    if (!this.canTransition(ctx.currentState, to)) {
      throw new Error(`Invalid transition: ${ctx.currentState} → ${to}`);
    }
    return { ...ctx, currentState: to, stateEnteredAt: new Date() };
  }
}
```

---

## 三、7 类记忆触发 + 高风险拦截

### 3.1 7 类记忆触发

> 存储字段为 4 JSON 字段：`chartHistory` / `consultHistory` / `timelineEvents` / `insights`

| 类别 | 触发条件（正则规则） | 存储字段 | 触发准确率 |
|------|---------|---------|-----------|
| **identity** | 用户名/性别/年龄/职业 | `UserMemory.chartHistory` | ≥80% |
| **family** | 家庭/父母/子女/婚姻/亲属 | `UserMemory.consultHistory` | ≥80% |
| **career** | 工作/跳槽/升职/创业/职业 | `UserMemory.consultHistory` | ≥80% |
| **relationship** | 感情/恋爱/伴侣/分手/复合 | `UserMemory.consultHistory` | ≥80% |
| **finance** | 投资/理财/收入/债务/房产 | `UserMemory.insights` | ≥80% |
| **health** | 健康/身体/疾病/睡眠/情绪 | `UserMemory.insights` | ≥80% |
| **decision** | 决策/选择/犹豫/两难/纠结 | `UserMemory.timelineEvents` | ≥80% |

**记忆提取策略**：规则优先 + LLM 降级。去重机制为 SimHash（bigram Jaccard ≥ 0.8）。高置信度（≥ 0.7）时双写 `consultHistory` + `insights`。

**测试集**：70 条，每类 10 条，验收准确率 ≥80%（56/70 正确）

### 3.2 高风险拦截（D3 强约束）

> ✅ **已实现**（`high-risk-detector.service.ts` + `crisis-keywords.ts` + `scenario-rules.yaml`），无需 P2-2 重复建设。

| 类别 | 关键词 | 拦截动作 |
|------|--------|---------|
| **医疗** | 病/癌/抑郁/自杀/死 | 切 high_risk → 提示就医 + 不接 LLM |
| **法律** | 起诉/坐牢/离婚/家暴 | 切 high_risk → 提示咨询律师 |
| **金融** | 爆仓/破产/杠杆/赌博 | 切 high_risk → 提示咨询专业人士 |
| **生命** | 自杀/轻生/结束生命 | **立即 lockdown** + 危机干预热线 |

**测试集**：40 条（每类 10 条），验收拦截率 100%（40/40 拦截）

**回滚开关**：
| 开关 | 默认 | 用途 |
|------|------|------|
| `HIGH_RISK_MODE=lockdown` | ✅ 必开 | 高风险时停止 LLM |
| `HIGH_RISK_BLOCKLIST` | 默认全开 | 4 类全开 |

---

## 四、主动出击（Bull/Agenda）

### 4.1 主动出击类型

| 类型 | 触发 | 频次 | 黑名单 |
|------|------|------|--------|
| **运势提醒** | 用户生日 / 季节交替 | 每月 1 次 | 用户可关闭 |
| **加油鼓励** | 用户 3 天未活跃 | 每周 1 次 | 用户可关闭 |
| **早安问候** | 每天早 8 点 | 每天 1 次 | 必关（投诉率高） |

### 4.2 投诉率监控

| 指标 | 阈值 | 降级动作 |
|------|------|---------|
| 投诉率 | > 1% | 禁发"运势/加油/早安"3 类 |

**回滚开关**：
| 开关 | 默认 | 用途 |
|------|------|------|
| `ACTIVE_MOVES_TYPE_BLOCKLIST` | 空 | 列入黑名单的类型 |
| `ACTIVE_MOVES_ENABLED` | true | 总开关 |

---

## 五、数据迁移（SQLite → PostgreSQL）

### 5.1 迁移时间线

| 阶段 | 周次 | 任务 | 验收 |
|------|------|------|------|
| 1 | Week 16 | 写迁移脚本（SQLite → PG） | 干跑成功 |
| 2 | Week 17 | 备份 SQLite 全量数据 | 备份验证 |
| 3 | Week 18 | 灰度 1% 用户走 PG | 无数据丢失 |
| 4 | Week 19 | 灰度 50% 用户走 PG | 无数据丢失 |
| 5 | Week 20 | 全量切到 PG | 旧 SQLite 只读 |

### 5.2 关键表

```prisma
// L3 新增（与 L2 共用 schema）

model UserMemory {
  id              String   @id @default(cuid())
  userId          String
  chartHistory    Json?    // 排盘历史 [{ date, type, result }]
  consultHistory  Json?    // 咨询历史（上限 50 条）[{ id, category, summary, at }]
  timelineEvents  Json?    // 时间线事件（上限 100 条）[{ date, event, category }]
  insights        Json?    // 洞察记录（上限 30 条）[{ id, content, confidence, at }]

  // 9 节点状态机（⚠️ 当前未实现，P2-5 规划目标）
  state           String   @default("cold_start")
  stateData       Json?    // StateMachineContext
  stateEnteredAt  DateTime @default(now())

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@map("UserMemory")
}

model ConsultFollowUp {
  id            String   @id @default(cuid())
  userId        String
  issueId       String
  scheduledAt   DateTime
  sentAt        DateTime?
  feedbackAt    DateTime?
  feedbackJson  Json?
  status        String   // scheduled/sent/feedback_received/skipped
  
  @@index([userId, scheduledAt])
  @@map("ConsultFollowUp")
}
```

### 5.3 回滚 SOP

```bash
# 1. 停止写入
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 stop api-server'

# 2. 备份当前 PG
ssh root@8.148.245.29 'pg_dump awkn_life > /backup/pg-$(date +%Y%m%d).sql'

# 3. 回滚 schema
cd /opt/awkn-life/awkn-life-backend/apps/api-server
npx prisma migrate resolve --rolled-back add_l3_tables

# 4. 恢复 SQLite（如果 PG 数据损坏）
cp /backup/sqlite-latest.db prisma/prod.db

# 5. 重启
ssh root@8.148.245.29 'cd /opt/awkn-life && pm2 start api-server'

# 6. 健康检查
curl http://8.148.245.29:3000/health
```

---

## 六、RACI + 技术约束

### 6.1 RACI

| 任务 | R | A | C | I |
|------|---|---|---|---|
| 9 节点状态机 | 天火 | CEO | 后端 Lead | 全部 |
| 7 类记忆触发 | 后端 Lead | CEO | 程序员 | 全部 |
| 高风险拦截 | 后端 Lead | CEO | 程序员 / CEO | 全部（✅ 已实现） |
| 主动出击 Bull/Agenda | 后端 Lead | 产品 Lead | 程序员 | 全部 |
| 数据迁移 | 后端 Lead | CEO | 天火 | 全部 |
| RELATIONS_TIER 写死 | 天火 | CEO | 程序员 | 全部 |

### 6.2 技术约束

| 约束 | 值 |
|------|-----|
| 状态机库 | XState 5.x 或自研（轻量）⚠️ 当前 XState 依赖不存在，P2-5 规划 |
| 关系人注入 | core_only（写死）⚠️ 无独立 relations.config.ts，关系逻辑在 atom-tools/decision/relationship.ts 硬编码 |
| LLM Token 上限 | 2000/次（开启 core_only 后） |
| 数据库 | PostgreSQL 16（生产）/ SQLite（开发） |
| ORM | Prisma 5.x |
| 监控 | Pino + Prometheus |

---

## 附录 A：关键文件路径

- 状态机：⚠️ `consult-state-machine.ts` 不存在，当前为 `zhangbanshan-scheduler.service.ts`（Node 0-6 隐含逻辑）
- 关系人配置：⚠️ `relations.config.ts` 不存在，关系逻辑在 `atom-tools/decision/relationship.ts` 硬编码
- 7 类记忆：`memory-extractor.service.ts`（规则优先 + LLM 降级，SimHash 去重，双写 consultHistory + insights）
- 高风险拦截：✅ `high-risk-detector.service.ts` + `crisis-keywords.ts` + `scenario-rules.yaml`（已实现）
- 主动出击：`bull-agenda.service.ts`
- Prisma schema：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\prisma\schema.prisma`
- mini 状态机（兜底）：⚠️ `mini-state-machine.service.ts` 不存在
- 拍板文件：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\00-decisions-confirmed.md`
- 计划详情：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\dev\execution\line-03-memory.md`
- 总览：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-overview.md`
- L2 依赖：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L2-pipeline.md`
- L1 依赖：`C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\docs\engineering-handoffs\engineering-handoff-L1-content.md`

---

*生成日期：2026-06-14 · v2.0 修订：2026-06-15*
*下次更新：Week 8 L3 启动时*
