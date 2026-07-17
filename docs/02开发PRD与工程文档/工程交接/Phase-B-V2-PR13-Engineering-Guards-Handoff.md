# Phase B 工程交接包 — V2 PR-13 工程防呆启动

> **类型**: 工程交接包（建设性质）
> **阶段**: B — V2 PR-13 启动
> **对应计划**: `noble-greeting-sparkle.md` Phase B
> **生成日期**: 2026-06-10
> **生成方式**: awkn-工程文档 v2.5.1
> **handoff JSON**: 见文末 §11

---

## 1. 一屏摘要

- **项目/模块**: 人生智能系统 V2 — V1 之上叠加（**待 Clarify Gate 确认**）
- **本次目标**: 落地 PR-13 任务单（"工程防呆代码"），补齐 8 类上线可靠性代码，避免月份错位、事件重复、接口路径错、空数据报错、命理副证抢主图、反馈丢失
- **变更范围**: 8 个新文件 + 7 个修改/新建文件（PR-13 scope 内）
- **交付物**: 8 个新 .ts/.tsx 文件 + 7 处接口改造 + 1 份验收表（`B-PR13-acceptance.md`）+ 1 份 E47 限流测试报告
- **验证状态**: Phase A 必须先签字，否则不进 B
- **发布建议**: 条件发布 → 8 行验收表全绿 + E28/E31/E47 全绿

---

## 2. 事实来源

| 来源 | 路径/链接 | 用途 | 证据等级 |
|---|---|---|---|
| V2 PR-13 任务单 | `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\人生决策智能体\新建文件夹\新建 文本文档.txt` | 8 类代码完整实现 | E0（需求+实现）|
| V1 代码基线 | `apps/AWKN-LABlife/app/src/**` + `awkn-life-backend/apps/api-server/src/**` | V1 实际路径 | E2（已存在代码）|
| 类型定义 | `app/src/types/lifekline.ts` | TidePackage / PhasePoint 等 | E2 |
| 后端栈 | `awkn-life-backend/apps/api-server/src/consult/llm-quality-guard.ts` | quality guard 模式 | E2 |
| V2 PR-13 任务单 docx | `新建文件夹/人生智能系统 第一阶段 PR任务单.docx` | PR 候选清单 | E0（V2 战略）|
| V2 总纲 V0.2 | `新建文件夹/人生智能系统总纲 V0.2.docx` | 母文档 | E0（V2 战略）|

---

## 3. 变更说明

### 3.1 用户可见变化

- **月份对齐**：K线 `monthLabel`、状态图 `date`、查询参数 `month` 全部统一为 `YYYY-MM` 格式（解决"2026年6月 / 2026-06 / 2026-6"格式不统一问题）
- **行为埋点去重**：快速连击 K线柱子不会重复触发事件
- **行为埋点失败兜底**：网络失败时事件入本地队列，下次成功时 flush
- **命理副证降级**：当主状态图显示"调整区"时，命理副证提示自动降级（confidence ≤ 60 + 替换提示文案）
- **文案安全**：上线前自动扫"命运上涨/必有机会/注定"等禁词

### 3.2 技术变化（PR-13 任务单 8 类代码）

| # | 新文件 | 关键 API | 修改/接入 |
|---|---|---|---|
| 1 | `app/src/api/httpClient.ts` | `apiGet<T>()` / `apiPost<T>()` | 改 `services/klineTideApi.ts`、改 `api/consult.ts` |
| 2 | `app/src/utils/normalizeTidePackage.ts` | `normalizeTidePackage(raw)` | 改 `hooks/useTidePackage.ts` |
| 3 | `app/src/utils/monthKey.ts` | `toMonthKey(input, month?)` | 改 `components/tide/StateKlineTab.tsx` |
| 4 | `app/src/hooks/useEventDedup.ts` | `useEventDedup(delay=500)` | 改 `components/tide/StateKlineTab.tsx` |
| 5 | `app/src/utils/behaviorQueue.ts` | `enqueueBehavior / getBehaviorQueue / clearBehaviorQueue` | 改 `hooks/useBehaviorTracking.ts` |
| 6 | `app/src/utils/metaphysicsConflict.ts` | `downgradeMetaphysicsIfConflict(hint, phasePoint)` | 改 `components/tide/ExchangeDrawer.tsx` |
| 7 | `app/src/utils/safetyCopyCheck.ts` | `checkUnsafeCopy(text): string[]` | 改 `components/tide/ExchangeDrawer.tsx` |
| 8 | `server/src/consult/behavior/behavior-event.types.ts` | `ALLOWED_BEHAVIOR_EVENTS` + `isAllowedBehaviorEvent()` | 改 `consult/behavior/behavior.service.ts` |

### 3.3 路径漂移修正（PR-13 文档 vs V1 实际）

> 重要：PR-13 文档使用简化路径，实际 V1 路径是详细路径。下表是路径映射，启动后写入 `verify/B-path-mapping.md`。

| PR-13 文档路径 | V1 实际路径 | 处理 |
|---|---|---|
| `server/src/consult/behavior/` | `awkn-life-backend/apps/api-server/src/consult/behavior/` | 新建子目录（V1 实际无此目录）|
| `app/src/types/tideClosedLoop` | `app/src/types/lifekline.ts`（含 KLineBar/PhasePoint）| 新建 `types/tideClosedLoop.ts`（扩展 lifekline 范围）或合并到 lifekline |
| `app/src/services/consultApi.ts` | `app/src/api/consult.ts` | 沿用 V1 实际路径 `api/consult.ts` |
| `app/src/hooks/useTidePackage.ts` | （不存在）| 从零创建 |
| `app/src/hooks/useBehaviorTracking.ts` | （不存在）| 从零创建 |
| `app/src/components/tide/StateKlineTab.tsx` | （不存在；现有 `components/TidePhaseChart.tsx`）| 从零创建 |
| `app/src/components/tide/ExchangeDrawer.tsx` | （不存在）| 从零创建 |

### 3.4 影响范围

| 范围 | 影响 | 风险 | 处理 |
|---|---|---|---|
| 前端 | 8 新文件 + 4 处修改 | 🟡 中（路径漂移）| B-path-mapping.md + 双 typecheck |
| 后端 | 1 新类型 + 1 新 service + E47 限流 | 🟡 中（BullMQ/Redis 栈）| ab 100 RPS 压测 |
| 数据 | 无 schema 变更 | 🟢 低 | — |
| 部署 | 行为埋点需 Redis 限流键 | 🟡 中 | 部署前 health check |

---

## 4. 接口文档

> PR-13 不新增业务接口，仅改造调用层 + 1 个后端守卫。

| 接口 | 改动 | 说明 |
|---|---|---|
| 所有 `fetch('/xxx')` 调用 | 改走 `apiGet/apiPost` | 路径前缀统一 `/api/v1` 或 `VITE_API_BASE_URL` |
| `POST /api/v1/consult/records/:id/behavior` | body `event_type` 强制白名单 | 13 个合法值，见 `ALLOWED_BEHAVIOR_EVENTS` |
| 同上 | 加 E47 双维度限流 | per-user 100/min + per-record 5/s（参考值）|

### ALLOWED_BEHAVIOR_EVENTS（13 个）

```ts
view_kline, click_kline_month, view_state_radar, view_phase_chart,
click_tide_from_result, claim_confirmed, claim_partial, claim_rejected,
action_executed, action_partial, action_skipped,
view_metaphysics_hint, hide_metaphysics_hint
```

### 错误码（行为埋点新增）

| 状态 | 含义 | 触发 |
|---|---|---|
| 400 | `event_type` 不在白名单 | 客户端传入未知事件 |
| 429 | 限流命中 | per-user 或 per-record 超阈值 |
| 401 | 鉴权失败 | 复用 V1 JWT 守卫 |

### 示例请求

```http
POST /api/v1/consult/records/r-001/behavior
Authorization: Bearer <jwt>
Content-Type: application/json

{ "event_type": "click_kline_month", "month": "2026-06" }
```

### 示例响应

```json
{ "ok": true, "eventId": "evt-uuid-..." }
```

---

## 5. 数据库文档

> **本阶段无 schema 变更**。仅在 `behavior_events` 表新增白名单相关注释（如已有该表）。

| 表/集合 | 变更类型 | 字段/索引 | 迁移方式 | 回滚方式 | 数据风险 |
|---|---|---|---|---|---|
| `behavior_events` | 注释 | `event_type` 字段增加 ENUM 约束（可选，运行时守卫已足）| — | — | 无 |

> **建议**: 不在数据库层加 ENUM 约束，运行时 `isAllowedBehaviorEvent` 守卫已足够，避免阻塞灵活扩展。

---

## 6. 测试用例

| 用例 | 类型 | 前置条件 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|
| TC-B01 | 正常流 | `httpClient.ts` 已部署 | `apiGet('/foo', { bar: undefined })` | URL 不含 `?bar=undefined`，仅合法 key 出现 | 待测 |
| TC-B02 | 边界 | 同上 | `apiGet('/foo', { bar: null, baz: '' })` | URL 不含 `bar` 和 `baz` | 待测 |
| TC-B03 | 正常流 | `monthKey.ts` 已部署 | `toMonthKey("2026年6月")` / `toMonthKey(2026,6)` / `toMonthKey("2026-6")` | 全部 === `"2026-06"` | 待测 |
| TC-B04 | 异常流 | `normalizeTidePackage` 已部署 | 喂 `null` / `undefined` / `{}` | 返回 `{klineBars:[], stateSnapshots:[], phasePoints:[]}` 不抛 | 待测 |
| TC-B05 | 正常流 | `useEventDedup` 已部署 | 100ms 内连点同一 key | 第二击 `shouldSkip=true` | 待测 |
| TC-B06 | 异常流 | `behaviorQueue` 已部署 | localStorage 抛错 | 降级 `console.warn` 不崩，事件不丢入内存但接受丢失 | 待测 |
| TC-B07 | 正常流 | `metaphysicsConflict` 已部署 | `phasePoint.quadrant==='adjusting'` + `hint.show=true` | `confidence ≤ 60` 且 hintText 替换 | 待测 |
| TC-B08 | 异常流 | `safetyCopyCheck` 已部署 | `checkUnsafeCopy("命运上涨必有")` | 返回 `["命运上涨","必有"]` | 待测 |
| TC-B09 | 正常流 | `behavior-event.types` 已部署 | `isAllowedBehaviorEvent("view_kline")` | `true` | 待测 |
| TC-B10 | 异常流 | 同上 | `isAllowedBehaviorEvent("hacker")` | `false` | 待测 |
| TC-B11 | 异常流 | `behavior.service` 已部署 | ab 100 RPS 同 recordId 重复发 | 429 + 队列缓存后续 flush | 待测 |
| TC-B12 | 异常流 | 同上 | body `event_type="unknown"` | 400 `Unsupported behavior event` | 待测 |

---

## 7. 部署说明

### 7.1 环境变量

> 新增 2 个环境变量（限流配置）。

| 名称 | 用途 | 是否必需 | 示例/来源 |
|---|---|---|---|
| `BEHAVIOR_RATE_PER_USER_PER_MIN` | per-user 行为埋点限流阈值 | 是 | `100`（默认）|
| `BEHAVIOR_RATE_PER_RECORD_PER_SEC` | per-record 行为埋点限流阈值 | 是 | `5`（默认）|

### 7.2 构建与发布

```bash
# 1. 路径映射落地（启动前必做）
cd 人生决策宗师/apps/AWKN-LABlife
mkdir -p verify && cat > verify/B-path-mapping.md << 'EOF'
# 路径漂移映射表
| PR-13 文档 | V1 实际 |
|---|---|
| server/src/consult/behavior/ | awkn-life-backend/apps/api-server/src/consult/behavior/ |
| ... (其余 6 项) |
EOF

# 2. 8 个新文件 + 7 处接入
# （详见 plan §Phase B Task 列表）

# 3. 三件套硬门禁
pnpm -r typecheck
pnpm -r lint:biome
pnpm -r build

# 4. 验收表
cat > verify/B-PR13-acceptance.md << 'EOF'
# PR-13 验收表
| 验收项 | 标准 | 证据 |
|---|---|---|
| API 路径统一 | 不再手写裸路径 | grep -r "fetch('/" app/src/ 期望空 |
| 数据包安全 | 空数组不崩 | TC-B04 |
| 月份对齐 | 3 种格式 → YYYY-MM | TC-B03 |
| 点击防重 | 100ms 连点只触发 1 次 | TC-B05 |
| 反馈不丢 | 接口失败入本地队列 | TC-B06 |
| 命理降级 | 调整相位 confidence ≤ 60 | TC-B07 |
| 文案安全 | 禁词测试通过 | TC-B08 |
| 事件白名单 | 后端拒绝未知 event_type | TC-B12 |
EOF
```

### 7.3 健康检查

```bash
# 1. 类型定义可导入
cd 人生决策宗师/apps/AWKN-LABlife
node -e "require('./app/src/api/httpClient')" || echo "FAIL: httpClient"
node -e "require('./app/src/utils/monthKey')" || echo "FAIL: monthKey"

# 2. 8 行验收表全 PASS
cat verify/B-PR13-acceptance.md
```

---

## 8. 回滚方案

| 回滚对象 | 回滚步骤 | 验证方式 | 负责人 |
|---|---|---|---|
| 8 个新文件 | `git rm` 8 个文件 + commit | typecheck + build | 工程师 |
| 7 处接入 | `git revert <commit-hash>` | typecheck + build | 工程师 |
| 环境变量 | 从 .env 删除 BEHAVIOR_RATE_* | 启动后行为埋点不报"配置缺失" | 部署者 |
| 数据 | 无（无 schema 变更）| — | — |

---

## 9. 未确认项

| # | 项目 | 影响 | 是否阻断 | 建议负责人 |
|---|---|---|---|---|
| 1 | V2 仓库定位（V1 之上 vs 独立）| 决定所有新文件落地路径 | 🟡 阻断 | 用户 |
| 2 | `types/tideClosedLoop` 命名（新建文件 vs 合并到 `types/lifekline.ts`）| 决定 PR-13 #2/#6 的 import 路径 | 🟢 低 | 工程师 |
| 3 | E47 限流栈（BullMQ/Redis 已就绪 vs 需新建）| 决定 B-T15 实施方式 | 🟡 中 | 工程师 |
| 4 | `behavior_events` 表是否已存在 | 决定 B-T15 是否需新建表 | 🟡 中 | 工程师 |
| 5 | 5 个"PR-13 修改文件"实际不存在 → 从零创建还是老组件迁移 | 决定 B-T11~B-T15 工作量 | 🟡 阻断 | 用户 |

---

## 10. 交接清单

- [x] 需求范围已确认（PR-13 8 类代码）
- [x] 接口/字段无编造项（仅复述 PR-13 任务单）
- [x] 数据库迁移和回滚已说明（无迁移）
- [ ] 测试证据已列出（E3 待跑）
- [x] 部署路径、服务名、端口已确认（V1 之上叠加）
- [x] 未确认项已分级（5 项）

---

## 11. handoff JSON

```json
{
  "stage": "V2-PR13-Engineering-Guards",
  "phase": "B",
  "goal": "在 V2 仓库落地 8 个工程防呆新文件 + 7 个修改/新建文件,完成验收表 8 行全绿",
  "constraints": [
    "8 个新文件代码在交接包文档中已给完整实现,严禁漂移",
    "改动严格收敛在 PR-13 scope,不动 PR 候选清单外的文件",
    "E47 rate limit 接 BullMQ/Redis 限流而非自造轮子",
    "E28 安全预检必须通过"
  ],
  "artifacts": [
    "app/src/api/httpClient.ts",
    "app/src/utils/normalizeTidePackage.ts",
    "app/src/utils/monthKey.ts",
    "app/src/hooks/useEventDedup.ts",
    "app/src/utils/behaviorQueue.ts",
    "app/src/utils/metaphysicsConflict.ts",
    "app/src/utils/safetyCopyCheck.ts",
    "awkn-life-backend/apps/api-server/src/consult/behavior/behavior-event.types.ts",
    "app/src/services/klineTideApi.ts (改)",
    "app/src/api/consult.ts (改,路径按 V1 实际)",
    "app/src/hooks/useTidePackage.ts (新建)",
    "app/src/hooks/useBehaviorTracking.ts (新建)",
    "app/src/components/tide/StateKlineTab.tsx (新建)",
    "app/src/components/tide/ExchangeDrawer.tsx (新建)",
    "awkn-life-backend/apps/api-server/src/consult/behavior/behavior.service.ts (新建)",
    "verify/B-path-mapping.md",
    "verify/B-PR13-acceptance.md",
    "verify/B-E47-ratelimit.log"
  ],
  "decisions": [
    "D-B1: 8 个新文件按依赖图写入,httpClient 优先(被其它 5 文件引用)",
    "D-B2: monthKey 优先于 normalizeTidePackage(图表对齐是前置)",
    "D-B3: 后端白名单先于 service 改造(service 改造需引用类型)",
    "D-B4: behaviorQueue 先于 useBehaviorTracking(track 调用方依赖)",
    "D-B5: 沿用 V1 实际路径 (api/consult.ts + awkn-life-backend/apps/api-server/src/...) 而非 PR-13 文档的简化路径"
  ],
  "definition_of_done": [
    "8 新文件 + 7 改/建文件全部落地",
    "8 行验收表全 PASS",
    "E28 / E31 / E47 全绿",
    "verify/B-PR13-acceptance.md 经审核签字"
  ],
  "status": "pending",
  "next_stage": "C-V2-ThirdLayer-Engineering"
}
```
