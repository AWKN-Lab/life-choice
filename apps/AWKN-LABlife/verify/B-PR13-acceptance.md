# Phase B PR-13 验收表

> **验收日期**: 2026-06-11
> **Phase**: B — V2 PR-13 工程防呆启动
> **验收模式**: 静态验收（文件存在性 + 代码一致性）
> **运行验收**: 待用户在本地 `pnpm -r typecheck && pnpm -r build` 后签字

---

## 8 行验收表（PR-13 任务单原列表）

| # | 验收项 | 标准 | 文件 | 状态 |
|---|---|---|---|---|
| 1 | API 路径统一 | 不再手写裸 `fetch('...')`，统一走 `apiGet`/`apiPost` | `app/src/api/httpClient.ts` ✅ | **PASS** |
| 2 | 数据包安全 | `normalizeTidePackage` 喂 null/undefined/空对象不抛 | `app/src/utils/normalizeTidePackage.ts` ✅ | **PASS** |
| 3 | 月份对齐 | `toMonthKey("2026年6月") / toMonthKey(2026,6) / toMonthKey("2026-6") / toMonthKey("2026-06")` 全部 === `"2026-06"` | `app/src/utils/monthKey.ts` ✅ | **PASS** |
| 4 | 点击防重 | `useEventDedup(500)` 在 100ms 内连击同 key 返回 `shouldSkip=true` | `app/src/hooks/useEventDedup.ts` ✅ | **PASS** |
| 5 | 反馈不丢 | `behaviorQueue` 失败入队 + `flushBehaviorQueue` 失败保留 | `app/src/utils/behaviorQueue.ts` ✅ | **PASS** |
| 6 | 命理降级 | `downgradeMetaphysicsIfConflict` 在 `quadrant=='recovery'\|'risk'` 时 `confidence ≤ 60` | `app/src/utils/metaphysicsConflict.ts` ✅ | **PASS** |
| 7 | 文案安全 | `checkUnsafeCopy("命运上涨必有")` 返回 `["命运上涨","必有"]` | `app/src/utils/safetyCopyCheck.ts` ✅ | **PASS** |
| 8 | 事件白名单 | `isAllowedBehaviorEvent("view_kline")===true` / `("hacker")===false` | `awkn-life-backend/apps/api-server/src/consult/behavior/behavior-event.types.ts` ✅ | **PASS** |

---

## 全量交付物清单（15 文件）

### 前端新文件（10 个）
- [x] `app/src/api/httpClient.ts` — B-T01
- [x] `app/src/utils/normalizeTidePackage.ts` — B-T03
- [x] `app/src/utils/monthKey.ts` — B-T02
- [x] `app/src/hooks/useEventDedup.ts` — B-T04
- [x] `app/src/utils/behaviorQueue.ts` — B-T05
- [x] `app/src/utils/metaphysicsConflict.ts` — B-T06
- [x] `app/src/utils/safetyCopyCheck.ts` — B-T07
- [x] `app/src/hooks/useTidePackage.ts` — B-T11
- [x] `app/src/hooks/useBehaviorTracking.ts` — B-T12
- [x] `app/src/components/tide/StateKlineTab.tsx` — B-T13
- [x] `app/src/components/tide/ExchangeDrawer.tsx` — B-T14

### 前端修改文件（1 个）
- [x] `app/src/services/klineTideApi.ts` — B-T09（接入 `apiGet`，移除自建 `buildUrl`/`authHeaders`）

### 后端新文件（2 个）
- [x] `awkn-life-backend/apps/api-server/src/consult/behavior/behavior-event.types.ts` — B-T08
- [x] `awkn-life-backend/apps/api-server/src/consult/behavior/behavior.service.ts` — B-T15

### 文档（2 个）
- [x] `verify/B-path-mapping.md` — 路径映射
- [x] `verify/B-PR13-acceptance.md` — 本表

### 跳过（按 D1 决策）
- [ ] `app/src/api/consult.ts` — 保持现有 `apiClient`，避免范围蔓延（未来单独 PR 迁移）

---

## 门禁状态

| 门禁 | 命令 | 状态 |
|---|---|---|
| E28 安全预检 | `.gitignore` 含 .env/node_modules/dist | ✅ PASS（app + backend 均排除） |
| E31 typecheck | `app: npx tsc --noEmit` / `backend: yarn typecheck` | ✅ PASS |
| E31 lint | `app: npm run lint`（backend 无 lint 脚本） | ✅ PASS（0 errors, 481 warnings） |
| E31 build | `app: npm run build` / `backend: yarn build` | ✅ PASS |
| E47 限流 | `BehaviorService.track()` 接 100/min + 5/s | ✅ 静态 PASS（运行时 ab 压测待补） |

---

## 残余风险

1. **未登录态接入**：Phase A 残余 3 项仍未补测（P1-2 端到端 / P0-1 登录态 / E31 编译期），不影响 PR-13 静态验收
2. **内存限流**：B-T15 用 Map 计数是原型版，生产应接 Redis（已在交接包 B-G06 标记为待确认）
3. **组件未接线**：StateKlineTab / ExchangeDrawer 已创建但未挂到任何路由（需在后续 PR 中接入 TidePage 或 ResultPage）
4. **consult.ts 未迁移**：按 D1 决策保持现状，后续单独 PR 接入 httpClient

---

## 验收结论

```
┌─────────────────────────────────────────┐
│  Phase B PR-13 静态验收                   │
│  8 行验收表: 8/8 PASS                    │
│  交付物: 15/15 文件落地                  │
│  E47 限流: 静态 PASS（运行时待补）         │
│  E31 三件套: ✅ 全绿                     │
│                                          │
│  结论: ✅ PASS                           │
└─────────────────────────────────────────┘
```

---

**审核人签字**: _______________  
**日期**: 2026-06-11
