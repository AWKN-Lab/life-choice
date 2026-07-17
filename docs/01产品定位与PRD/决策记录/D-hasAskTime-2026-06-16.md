# D-hasAskTime：从 IntentRoutingInput 移除 hasAskTime

> **决策日期**：2026-06-16
> **状态**：已决策
> **关联经验**：E82（hasAskTime 设计缺陷）

---

## 背景

`IntentRouterService.route()` 的输入接口 `IntentRoutingInput` 定义了 `hasAskTime: boolean`，但 `route()` 方法内部完全未使用该字段。

当前路由逻辑（`intent-router.service.ts:13-44`）：

```typescript
route(input: IntentRoutingInput): RouteType {
  // ...
  if (input.hasBirthInfo && liurenScore >= 1) return 'mixed';
  if (input.hasBirthInfo && zipingScore >= 1) return 'ziping';
  if (!input.hasBirthInfo) return 'clarify';
  return 'ziping';
}
```

**全项目 `hasAskTime` 引用分布**（44 处）：

| 位置 | 用途 | 是否消费 |
|------|------|---------|
| `IntentRoutingInput` 接口定义 | 路由输入参数 | ❌ 未使用 |
| `SchedulingInput` 接口 | 调度器输入 | ✅ 实际使用 |
| `OrchestratorInput` 接口 | 编排器输入 | ✅ 实际使用（`askTime`） |
| `orchestrator.service.ts` | 传给 scheduler | ✅ 传递 |
| `zhangbanshan-scheduler.service.ts` | 调度决策 | ✅ 实际使用 |
| 前端 `intentRouter.ts` | 缺失字段检测 | ✅ 实际使用 |
| 前端 `FrontdeskChat.tsx` | 用户输入 | ✅ 传递 |
| 测试文件 | 测试断言 | ✅ 已记录 |

已有测试明确记录此行为：[intent-router.spec.ts:158](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/__tests__/routes/intent-router.spec.ts#L158) — "hasAskTime 不影响路由决策（当前实现未使用 hasAskTime）"

---

## 4 种方案评估

| 方案 | 描述 | 评估 |
|------|------|------|
| A. 保留 | 不做任何改动 | 接口定义冗余，误导开发者 |
| B. 移除 | 从 IntentRoutingInput 删除，保留在其他接口 | **推荐** |
| C. 改造 | 让 hasAskTime 影响路由（如 hasAskTime=true 时优先 liuren） | 路由逻辑已足够简洁，引入新维度会增加复杂度 |
| D. 纳入 clarify | 用于 clarify 路由的追问逻辑 | clarify 是 Scheduler 的职责，不应在 Router 做 |

---

## 决策

**方案 B：从 `IntentRoutingInput` 移除 `hasAskTime`**

### 理由

1. **职责分离**：IntentRouter 只管路由（ziping/liuren/mixed/clarify），Scheduler 管调度（是否需要 askTime）。`hasAskTime` 是 Scheduler 的输入，不是 Router 的。
2. **最小改动**：仅删除 1 个字段定义 + 更新 3 处调用方传参，不影响现有 121 tests。
3. **语义清晰**：移除后，`IntentRoutingInput` 只剩 `question` 和 `hasBirthInfo` 两个字段，路由逻辑一目了然。

### 不改什么

- `SchedulingInput.hasAskTime` 保留（Scheduler 实际使用）
- `OrchestratorInput.askTime` 保留（编排器实际使用）
- 前端 `intentRouter.ts` 中 `hasAskTime` 保留（前端缺失字段检测使用）

---

## 改动范围

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `intent-router.service.ts` | 删除 `IntentRoutingInput.hasAskTime` |
| 修改 | `orchestrator.service.ts` | 删除 2 处 `hasAskTime` 传参 |
| 修改 | `intent-router.spec.ts` | 删除所有测试用例中的 `hasAskTime` 字段 |
| 修改 | `pipeline-integration.spec.ts` | 删除 4 处 `hasAskTime` 传参 |

---

## 验收

```bash
npx jest --config jest.config.js --no-cache
# 预期：121 tests passed, 0 failed（hasAskTime 移除后无回归）
```

---

## 回滚

```bash
git checkout HEAD -- intent-router.service.ts orchestrator.service.ts
git checkout HEAD -- __tests__/routes/intent-router.spec.ts
git checkout HEAD -- __tests__/integration/pipeline-integration.spec.ts
```