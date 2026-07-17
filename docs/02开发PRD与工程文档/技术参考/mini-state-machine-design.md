# Mini State Machine · 设计文档（M4）

> **目的**：在 P1~P3 实施前，建立最小可用对话状态机，让后续任务在真实多轮环境下开发
> **关联文档**：[DOD-开发整改计划.md §P4-2](./DOD-开发整改计划.md) · [批判性分析-开发整改计划.md](../../批判性分析-开发整改计划.md) · [privacy-framework.md §与 M4 关系](../product/privacy-framework.md) · [mini-state-machine.service.ts](../../apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/orchestrator/mini-state-machine.service.ts)
> **生成日期**：2026-06-13

---

## 一、设计动机

### 原计划的问题

整改计划 P4-2 是 6 态完整状态机：

```
IDLE → SCHEDULING → CLARIFYING → GENERATING → RESPONDING → COMPLETED
```

但 P4-2 被排在最后（10~15 天），导致：
- P1~P3 全部在"无状态机"下交付
- "已开发完成"的组件（仪式动画、高风险检测、用户分类）只能挂在单轮报告上
- "陪断者"哲学无法在多轮场景下落地

### M4 折中方案

**采用 3 态最小状态机**：

```
IDLE → GENERATING → COMPLETED
                ↓ (cancel/fail)
              IDLE
              ↑
              └── (restart) ── COMPLETED
```

**后续状态机演化**（P4-2 实施时）：

```
IDLE → SCHEDULING → CLARIFYING → GENERATING → RESPONDING → COMPLETED
                ↑                  ↓
                └─── (loop back) ──┘
```

M4 是 P4-2 的**子集**，接口设计兼容，便于平滑迁移。

---

## 二、状态定义

### IDLE

- **触发**：新咨询创建 / 用户取消 / 上一轮完成
- **持续时间**：任意（等待用户输入）
- **可执行操作**：
  - 用户输入问题 → `startGeneration`
  - 用户退出 → 状态机销毁

### GENERATING

- **触发**：`startGeneration` 成功调用
- **持续时间**：1~30 秒（视 LLM 调用时长）
- **可执行操作**：
  - 后端调用 `ZhangbanshanSchedulerService.schedule()`
  - 前端展示仪式动画（DivinationRitualLoader）
  - 用户点击"取消" → `failGeneration` → 回到 IDLE
  - LLM 完成 → 自动调用 `completeGeneration` → COMPLETED
  - LLM 失败 → 自动调用 `failGeneration` → IDLE + 错误记录

### COMPLETED

- **触发**：GENERATING 成功完成
- **持续时间**：任意（等待用户下一步）
- **可执行操作**：
  - 用户查看结果
  - 用户发起新一轮 → `restart` → 回到 IDLE
  - 7 天后回访（P3-1 系统触发）

---

## 三、状态转移图

```
        ┌────── fail/cancel ────┐
        ↓                       │
     ┌──────┐  start   ┌──────────┐  complete   ┌──────────┐
     │ IDLE │ ───────→ │GENERATING│ ─────────→ │ COMPLETED│
     └──────┘           └──────────┘            └──────────┘
        ↑                       │                    │
        │                       │ fail               │ restart
        │                       ↓                    │
        └───────────────────────┴────────────────────┘
```

### 转移规则白名单

| from \ to | IDLE | GENERATING | COMPLETED |
|-----------|------|------------|-----------|
| **IDLE**    | ❌    | ✅ start    | ❌          |
| **GENERATING** | ✅ fail/cancel | ❌ | ✅ complete |
| **COMPLETED** | ✅ restart | ❌ | ❌ |

---

## 四、实现策略：复用现有 status 字段

### 关键约束

**不引入新 schema 字段**（用户红线：数据库变更必须先确认）。

### 解决方案：状态 → ConsultRecord.status 映射

ConsultRecord 表已存在 `status` 字段，值域为：

- `pending` — 等待
- `analyzing` — 分析中
- `completed` — 完成
- `failed` — 失败

M4 服务建立映射：

```typescript
const STATE_TO_STATUS: Record<MiniState, string> = {
  IDLE: 'pending',
  GENERATING: 'analyzing',
  COMPLETED: 'completed',
};
```

**好处**：
- ✅ 零 schema 变更
- ✅ 现有 `ConsultRecord.status` 查询（管理后台、报表）自动可用
- ✅ M4 服务可独立部署

**局限**：
- ❌ 状态机细节（history、meta）**仅在内存中**，进程重启后丢失
- ❌ 多实例部署需替换为 Redis（不在 M4 范围）

---

## 五、API 接口

### 5.1 内部 Service 方法

```typescript
class MiniStateMachineService {
  // 初始化（新咨询创建时调用）
  async initialize(consultId: string, userId: string | null): Promise<MiniStateContext>;

  // 加载（重启服务或查询时调用，从内存）
  load(consultId: string): MiniStateContext | null;

  // 从 DB 重建（用于进程重启后的恢复）
  async loadOrRehydrate(consultId: string): Promise<MiniStateContext | null>;

  // 状态转移（核心方法）
  async transition(
    ctx: MiniStateContext,
    target: MiniState,
    reason: string,
  ): Promise<StateTransitionResult>;

  // 启动咨询
  async startGeneration(
    ctx: MiniStateContext,
    options: { agentType: string; memoryAnchorEnabled?: boolean },
  ): Promise<StateTransitionResult>;

  // 完成
  async completeGeneration(ctx: MiniStateContext): Promise<StateTransitionResult>;

  // 失败/取消
  async failGeneration(ctx: MiniStateContext, error: string): Promise<StateTransitionResult>;

  // 重新发起
  async restart(ctx: MiniStateContext): Promise<StateTransitionResult>;

  // 监控
  getSnapshot(): Array<{ consultId, state, stateEnteredAt, durationMs }>;
  getActiveCount(): number;
}
```

### 5.2 HTTP API（M4 阶段不直接暴露）

M4 阶段状态机由 `XuanxueOrchestratorService` 内部使用，不直接暴露 HTTP API。

P4-2 阶段将增加：
- `POST /consult/dialogue/start` → 初始化 + 启动
- `POST /consult/dialogue/:id/reply` → 多轮对话
- `GET /consult/dialogue/:id/result` → 查询结果

---

## 六、与 XuanxueOrchestratorService 的集成

### 6.1 当前调用流程

```typescript
// orchestrator.service.ts
async enqueue(input: OrchestratorInput) {
  // 1. 初始化状态机（M4 新增）
  const ctx = await this.miniStateMachine.initialize(input.recordId, input.userId);

  // 2. 切换到 GENERATING（M4 新增）
  await this.miniStateMachine.startGeneration(ctx, { agentType: input.routeType });

  // 3. 现有逻辑：推入 generation-queue
  await this.generationQueue.add('generate', { ... });

  // 4. WebSocket 推送（XuanxueOrchestratorService 已有，状态变化由 orchestrator 推）
  this.websocketGateway.sendLLMToken(input.sessionId, { ... });
}
```

### 6.2 集成点

| 集成点 | 调用方 | M4 提供 |
|--------|-------|--------|
| 新咨询创建 | orchestrator.enqueue | `initialize()` |
| LLM 开始 | orchestrator.analyze | `startGeneration()` |
| LLM 完成 | orchestrator.processResult | `completeGeneration()` |
| LLM 失败 | orchestrator error handler | `failGeneration()` |
| 用户取消 | HTTP API → service | `failGeneration()` |
| 用户重启 | HTTP API → service | `restart()` |

### 6.3 WebSocket 推送责任划分

**设计原则**：M4 service **不直接推送 WebSocket 事件**，由 `XuanxueOrchestratorService` 统一推送。

**原因**：
- M4 service 与 WebSocketGateway 解耦（避免 API 误用）
- WebSocketGateway 的房间命名（`session:` / `dialogue:`）由 orchestrator 管理
- M4 service 状态变化通过 `getSnapshot()` 暴露，orchestrator 订阅变化后决定是否推送

**实际推送**：
- M4 service 调 `transition()` → 内部持久化 + logger.log
- orchestrator 调用 M4 service 后，**自己** 调 `websocketGateway.sendLLMToken(sessionId, ...)` 推送 `state_change` 事件
- 现有 `websocket.gateway.ts:180` 已有 `state_change` 事件定义

---

## 七、与 M3 隐私框架的联动

M4 状态机在 GENERATING 阶段会**读取 consent 字段决定功能开关**：

```typescript
async startGeneration(ctx, options) {
  if (options.memoryAnchorEnabled !== undefined) {
    ctx.meta['memoryAnchorEnabled'] = options.memoryAnchorEnabled;
  }
  // 实际读取由 orchestrator 传入（避免 M4 引入 UserMemoryService 依赖）
  return this.transition(ctx, 'GENERATING', `...`);
}
```

**联动时序**：

```
M3 (隐私框架) ──┐
                ├──→ orchestrator 读取 consent
M4 (状态机) ────┘
                ↓
                ctx.meta.memoryAnchorEnabled = true/false
                ↓
                P3-2 阶段不注入历史摘要（如果 false）
```

---

## 八、可观测性

### 8.1 埋点指标

```typescript
// 在 transition 方法中 logger.log
this.logger.log(
  `Transition ${from} → ${target} for consult ${ctx.consultId}: ${reason}`,
);
```

### 8.2 监控指标

| 指标 | 来源 | 告警阈值 |
|------|------|---------|
| GENERATING 阶段超 30s | `getSnapshot()` 中 durationMs | >30000 触发 |
| GENERATING → IDLE 失败率 | `history[].reason` 含 "failed" | >5% 触发 |
| COMPLETED → IDLE 重启率 | `restart` 调用频次 | >20% 触发 |
| 状态机非法转移 | `allowed: false` 返回 | 任何都触发（说明 bug） |

### 8.3 日志格式

```
[2026-06-13T10:00:00.000Z] [MiniStateMachine] Initialized mini state machine for consult abc123
[2026-06-13T10:00:00.100Z] [MiniStateMachine] Transition IDLE → GENERATING for consult abc123: User started consultation with agent ziping
[2026-06-13T10:00:25.000Z] [MiniStateMachine] Transition GENERATING → COMPLETED for consult abc123: Generation completed
```

---

## 九、单元测试

### 9.1 必测场景

```typescript
describe('MiniStateMachineService', () => {
  // 正常流程
  it('should transition IDLE → GENERATING → COMPLETED');
  it('should persist status to ConsultRecord on each transition');

  // 异常流程
  it('should reject illegal transitions');
  it('should rollback to IDLE on failGeneration');
  it('should clear meta on restart');

  // DB 重建
  it('should rehydrate from ConsultRecord.status on loadOrRehydrate');
  it('should return null when ConsultRecord not found');

  // 持久化容错
  it('should not throw when ConsultRecord.update fails');
});
```

### 9.2 覆盖率目标

- 服务方法覆盖率 ≥90%
- 转移规则覆盖率 100%

---

## 十、P4-2 迁移路径

### 10.1 接口兼容

M4 设计的接口（`MiniStateContext`、`StateTransitionResult`、`MiniState`）将被 P4-2 继承：

```typescript
// P4-2 时
import { MiniStateContext } from './mini-state-machine.service';

interface FullStateContext extends MiniStateContext {
  state: 'IDLE' | 'SCHEDULING' | 'CLARIFYING' | 'GENERATING' | 'RESPONDING' | 'COMPLETED';
  // ... 扩展字段
}
```

### 10.2 数据兼容

- M4 写入的 `ConsultRecord.status` 值（`pending/analyzing/completed/failed`）可平滑迁移到 6 态
- 默认升级规则：
  - `pending` → `IDLE`
  - `analyzing` → `GENERATING` 或 `SCHEDULING`
  - `completed` → `COMPLETED` 或 `RESPONDING`

### 10.3 代码兼容

- `MiniStateMachineService` 将被 `FullStateMachineService` 替换
- `transition()` 方法签名不变
- 新增方法不破坏现有调用方

---

## 十一、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 进程重启后状态丢失 | 用户体验回退 | `loadOrRehydrate()` 从 DB 重建 |
| 状态机死锁 | 用户卡住 | 设置最大转移次数 + 监控告警 |
| 状态机崩溃（数据库连接断开） | 状态丢失 | 重启时从 DB 加载 + 重放 history |
| 多实例并发（如果引入分布式） | 状态冲突 | 单实例够用；多实例需 Redis 替换（不在 M4 范围） |
| meta 字段可能存敏感数据 | 合规风险 | meta 字段不进日志 / 监控 |

---

## 十二、未来扩展

- **状态超时**：GENERATING 超 60s 自动转 IDLE + 告警
- **状态机可视化**：管理后台查看实时状态流转
- **多实例同步**：Redis 共享状态（如果引入分布式）
- **回放调试**：用 history 重放用户咨询过程
- **6 态完整状态机**：P4-2 阶段实施，扩展 SCHEDULING / CLARIFYING / RESPONDING

---

*文档结束。M4 是 P4-2 的子集，2 天可完成。零 schema 变更，可立即部署。*
