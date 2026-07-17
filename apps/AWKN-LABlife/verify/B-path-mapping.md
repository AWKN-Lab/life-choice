# Phase B 路径映射表

> **生成日期**: 2026-06-10
> **用途**: PR-13 文档简化路径 → V1 实际路径 的一次性映射
> **规则**: 后续 Task 必须引用本表，不再引用 PR-13 文档原路径

---

## 映射表

| # | PR-13 文档路径 | V1 实际路径 | 处理方式 | 备注 |
|---|---|---|---|---|
| 1 | `app/src/api/httpClient.ts` | `app/src/api/httpClient.ts` | 新建 | 与现有 `apiClient.ts`（client.ts）并存，上层统一封装 |
| 2 | `app/src/utils/normalizeTidePackage.ts` | `app/src/utils/normalizeTidePackage.ts` | 新建 | 复用 `types/lifekline.ts` 中 `MonthlyKlineBar`/`StateSnapshot`/`PhasePoint` |
| 3 | `app/src/utils/monthKey.ts` | `app/src/utils/monthKey.ts` | 新建 | 独立工具函数 |
| 4 | `app/src/hooks/useEventDedup.ts` | `app/src/hooks/useEventDedup.ts` | 新建 | 独立 hook |
| 5 | `app/src/utils/behaviorQueue.ts` | `app/src/utils/behaviorQueue.ts` | 新建 | 独立工具 |
| 6 | `app/src/utils/metaphysicsConflict.ts` | `app/src/utils/metaphysicsConflict.ts` | 新建 | 复用 `types/lifekline.ts` 中 `PhasePoint` |
| 7 | `app/src/utils/safetyCopyCheck.ts` | `app/src/utils/safetyCopyCheck.ts` | 新建 | 独立工具 |
| 8 | `server/src/consult/behavior/behavior-event.types.ts` | `awkn-life-backend/apps/api-server/src/consult/behavior/behavior-event.types.ts` | 新建 | 新建 `behavior/` 子目录 |
| 9 | `app/src/services/klineTideApi.ts` | `app/src/services/klineTideApi.ts` | 修改（接入 httpClient）| 已有 `buildUrl`/`authHeaders`，改为复用 httpClient |
| 10 | `app/src/services/consultApi.ts` | `app/src/api/consult.ts` | 修改（接入 httpClient）| PR-13 路径漂移，V1 实际在 `api/consult.ts` |
| 11 | `app/src/hooks/useTidePackage.ts` | `app/src/hooks/useTidePackage.ts` | 新建 | 文件不存在 |
| 12 | `app/src/hooks/useBehaviorTracking.ts` | `app/src/hooks/useBehaviorTracking.ts` | 新建 | 文件不存在 |
| 13 | `app/src/components/tide/StateKlineTab.tsx` | `app/src/components/tide/StateKlineTab.tsx` | 新建 | 文件不存在（V1 有 `components/TidePhaseChart.tsx`）|
| 14 | `app/src/components/tide/ExchangeDrawer.tsx` | `app/src/components/tide/ExchangeDrawer.tsx` | 新建 | 文件不存在 |
| 15 | `server/src/consult/behavior/behavior.service.ts` | `awkn-life-backend/apps/api-server/src/consult/behavior/behavior.service.ts` | 新建 | 文件不存在 |

---

## 关键兼容性决策

### D1: httpClient.ts 与现有 apiClient.ts 的关系
- **现状**: `api/consult.ts` 使用 `apiClient`（来自 `./client`），`services/klineTideApi.ts` 使用裸 `fetch` + 自建 `buildUrl`/`authHeaders`
- **决策**: `httpClient.ts` 作为最底层统一封装（`apiGet`/`apiPost`），`apiClient.ts` 和 `klineTideApi.ts` 逐步迁移到 httpClient。Phase B 先让 `klineTideApi.ts` 接入 `httpClient`，`consult.ts` 保持现有 `apiClient` 不变（避免范围蔓延）

### D2: TidePackage 类型定义
- **现状**: `services/klineTideApi.ts` 已定义本地 `TidePackage` 接口
- **决策**: 保留 `klineTideApi.ts` 的 `TidePackage`（它有 `meta` 字段），`normalizeTidePackage.ts` 直接 import 它

### D3: behavior 事件后端路径
- **现状**: V1 `consult.controller.ts` 无 behavior 子目录
- **决策**: 新建 `awkn-life-backend/apps/api-server/src/consult/behavior/` 目录，放 `behavior-event.types.ts` 和 `behavior.service.ts`

---

## 截图归档

| 截图 | 原位置 | 归档位置 | 状态 |
|---|---|---|---|
| A-T01-history-page-login-required.png | 工作目录 | `verify/A-T01-history-page-login-required.png` | ✅ 已归档 |
| A-T02-tide-page-api-data.png | 工作目录 | `verify/A-T02-tide-page-api-data.png` | ✅ 已归档 |
| A-T05-naming-page-full.png | 工作目录 | `verify/A-T05-naming-page-full.png` | ✅ 已归档 |
