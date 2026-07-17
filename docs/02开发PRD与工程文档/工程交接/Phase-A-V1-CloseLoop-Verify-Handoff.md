# Phase A 工程交接包 — V1 收口验证

> **类型**: 工程交接包（验证性质）
> **阶段**: A — V1 收口验证
> **对应计划**: `noble-greeting-sparkle.md` Phase A
> **生成日期**: 2026-06-10
> **生成方式**: awkn-工程文档 v2.5.1
> **handoff JSON**: 见文末 §11

---

## 1. 一屏摘要

- **项目/模块**: 人生决策宗师 V1 — `apps/AWKN-LABlife/`（NestJS 10 + React 19 + Prisma 5）
- **本次目标**: 用 E-A15 三态独立验证 V1 spec `close-life-decision-loops/` 中 5 个被标 `[x]` 的闭环 Task 是否真已完成
- **变更范围**: 只读验证，不修改任何 V1 业务代码
- **交付物**: 5 张验证截图 + 1 份单元测试报告 + 1 份收口报告（`V1-CloseLoop-Verify-Report.md`）
- **验证状态**: 6 个 grep 预检已完成（详见 §3.2），8 个 Task 待执行验证
- **发布建议**: 暂缓发布 → Phase A 收口报告签字后才推进到 Phase B

---

## 2. 事实来源

| 来源 | 路径/链接 | 用途 | 证据等级 |
|---|---|---|---|
| V1 闭环 spec | `C:\Users\10919\Desktop\AWKN-Lab\.trae\specs\close-life-decision-loops\spec.md` | 5 Task 验收标准 | E0（规范）|
| V1 闭环 tasks | `...close-life-decision-loops\tasks.md` | 16 个 SubTask 清单 | E0（规范）|
| V1 闭环 checklist | `...close-life-decision-loops\checklist.md` | 16 项验收勾选 | E0（规范）|
| 代码事实（grep）| HistoryPage.tsx / ResultPage.tsx / consultStore.ts / FrontdeskChat.tsx / deriveDestinyKline.ts / quming-agent.service.ts | 代码与声明一致性 | E2（代码层证据，已采集）|
| V1 项目宪法 | `人生决策宗师/constitution.md` | 架构与边界 | E0 |
| V1 部署信息 | 阿里云 ECS 8.148.245.29 + PM2 + Nginx | 生产基线 | E1（部署文档）|

> E0=规范层 / E1=配置层 / E2=代码层 / E3=运行时层。本交接包目前仅到 E2；运行时验证（E3）需在 Phase A 执行期间采集。

---

## 3. 变更说明

### 3.1 用户可见变化

- **历史页（/history）**：原只展示"有人物档案的记录"，改为展示"所有咨询记录（含问事/取名/K线/未成档）"，人物档案降级为子视图/筛选条件
- **K线（/result）**：移除"后端数据缺失时本地重算"的兜底逻辑，改为统一显示"数据生成中"降级提示
- **取名（/quming）**：LLM 输出质量不达标时，自动重试 1 次；仍不达标则返回降级结果（前端可见 `lowQuality=true` 标记）
- **对话模式（取名/问事）**：移除 modal 分支，统一为全页模式（page only）

### 3.2 技术变化（基于 E2 grep 验证）

| Task | spec 声明 | 代码事实（grep 验证）| 一致性 |
|---|---|---|---|
| A-T01 P0-1 历史页改数据源 | 已改 `getPersonProfiles → getRecords` | `HistoryPage.tsx:473` 调用 `consultApi.getRecords(50, 0)` ✓ | ✅ 一致 |
| A-T02 P0-2 K 线去本地重算 | `ResultPage.tsx` 不再调用本地重算 | `grep "deriveDestinyKline\|@deprecated\|localRecalc"` 在 ResultPage.tsx 无匹配 ✓ | ✅ 一致 |
| A-T02 P0-2 文件标记 | `deriveDestinyKline.ts` 标 `@deprecated` | `deriveDestinyKline.ts:130` 有 `@deprecated` 注释 ✓ | ✅ 一致 |
| A-T03 P1-1 consultStore userId | 去除 `'anonymous'` 占位符 | `consultStore.ts:17` 导入 `getUserId`，`564` 行使用 `getUserId() \|\| responseToSave?.userId \|\| ''` ✓ | ✅ 一致（未发现 'anonymous' 字面量）|
| A-T03 P1-1 partialize | 不再持久化 records | `consultStore.ts:630-631` partialize 已注释"不再持久化 records，完全从后端获取" ✓ | ✅ 一致 |
| A-T04 P1-2 取名质量守卫 | 接入 `checkLlmQuality` + 重试 1 次 | `quming-agent.service.ts:5` 导入 `checkLlmQuality`，`489-491` 重试逻辑，`211` 行 `lowQuality` 标记 ✓ | ✅ 一致 |
| A-T05 P2-1 FrontdeskChat | 移除 `renderAs`/`Modal`/`isOpen` | `FrontdeskChat.tsx` 无任何匹配 ✓ | ✅ 一致 |

> **代码事实 vs spec 声明 = 7/7 一致**。但 E3 运行时验证（构建跑通 + 业务链路跑通）必须由 8 个 Task 执行后才能签字。

### 3.3 影响范围

| 范围 | 影响 | 风险 | 处理 |
|---|---|---|---|
| 前端 | HistoryPage 4 卡片渲染改造 / ResultPage 降级 UI / consultStore partialize | 🟡 中 | 5 截图 + Playwright 回归 |
| 后端 | consult.controller 分页元数据 / quming-agent.service 重试 | 🟢 低 | 单测覆盖 3 个 case |
| 数据 | 无 schema 变更 | 🟢 低 | 无需迁移 |
| 部署 | 无环境变量变化 | 🟢 低 | 无需重新部署 |

---

## 4. 接口文档

| 接口 | 方法 | 鉴权 | 请求参数 | 响应 | 错误码 | 调用方 |
|---|---|---|---|---|---|---|
| `/api/v1/consult/records` | GET | JWT | `limit=20, offset=0` | `{ records: ConsultRecord[], total, hasMore }` | 401/500 | HistoryPage |
| `/api/v1/consult/person-profiles` | GET | JWT | — | `{ profiles: PersonProfile[] }` | 401/500 | HistoryPage 人物 Tab |
| `/api/v1/consult/records/:id` | DELETE | JWT | — | `{ ok: true }` | 404/500 | HistoryPage 批量删除 |
| `/api/v1/quming/generate` | POST | JWT | `{ surname, bazi }` | `{ names: NameSuggestion[], lowQuality?: bool }` | 400/401/500 | QumingPage |
| `/api/v1/kline/result/:recordId` | GET | JWT | — | `{ klineResult?: KlineResult }` | 404/500 | ResultPage |

> 注：`lowQuality` 字段是 P1-2 闭环新增，spec 已说明。`klineResult` 可为空（旧记录兼容），前端走降级 UI。

### 示例请求

```http
GET /api/v1/consult/records?limit=50&offset=0
Authorization: Bearer <jwt>
```

### 示例响应

```json
{
  "records": [
    { "id": "r-001", "type": "liuren", "profileId": "p-001", "createdAt": "2026-06-08T..." },
    { "id": "r-002", "type": "quming", "profileId": null,  "createdAt": "2026-06-09T..." },
    { "id": "r-003", "type": "kline",  "profileId": "p-001", "klineResult": null }
  ],
  "total": 17,
  "hasMore": false
}
```

---

## 5. 数据库文档

> **本阶段无 schema 变更**。仅说明现有 V1 schema 与本交接包相关的部分。

| 表/集合 | 变更类型 | 字段/索引 | 迁移方式 | 回滚方式 | 数据风险 |
|---|---|---|---|---|---|
| `consult_records` | 无 | `type` 字段已有 enum(liuren/quming/kline) | — | — | 无 |
| `consult_records` | 无 | `klineResult` JSON 字段 | — | — | 旧记录可空 |
| `person_profiles` | 无 | — | — | — | 无 |

---

## 6. 测试用例

| 用例 | 类型 | 前置条件 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|
| TC-A01 | 正常流 | 用户已有 5 条混合记录 | 进入 /history | 列表展示 5 条（quming/liuren/kline/未成档混合），按时间倒序 | 待测 |
| TC-A02 | 正常流 | 同上 | 点击某条 liuren 记录关联的 PersonProfile | 过滤只显示该 profile 的记录 | 待测 |
| TC-A03 | 正常流 | 用户有 1 条 kline 旧记录（klineResult=null） | 进入该条结果页 | 显示"数据生成中"降级 UI，不回退本地重算 | 待测 |
| TC-A04 | 正常流 | 同上，refresh 页面 | 重新进入历史页 | 历史记录从后端正常加载，localStorage 不含 records | 待测 |
| TC-A05 | 异常流 | LLM 返回非法 JSON | 触发取名 | 走重试 1 次 → 仍失败 → 返回 `lowQuality=true` + 重试提示 | 待测 |
| TC-A06 | 异常流 | LLM 返回合法 JSON 但 quality 失败 | 触发取名 | 走重试 1 次 → 重试成功则正常返回 → 仍失败则 `lowQuality=true` | 待测 |
| TC-A07 | 正常流 | 用户进入取名/问事流程 | 与张半山对话 | 对话以全页模式渲染，无 modal 遮罩 | 待测 |
| TC-A08 | 回归流 | 全量回归 | 跑通 问事→取名→K线→历史 4 条主链路 | 无 console error / 无 401/403 | 待测 |

---

## 7. 部署说明

### 7.1 环境变量

> **本阶段无新增环境变量**。仅复述 V1 已有的关键变量。

| 名称 | 用途 | 是否必需 | 示例/来源 |
|---|---|---|---|
| `DATABASE_URL` | Prisma 数据源（dev=SQLite / prod=PostgreSQL）| 是 | `file:./prisma/dev.db`（dev）/ `postgresql://...`（prod）|
| `REDIS_URL` | BullMQ 队列 | 是 | `redis://localhost:6379` |
| `JWT_SECRET` | JWT 签名密钥 | 是 | （从 .env 读，不入库）|
| `LLM_PROVIDER` | LLM 提供商（kimi/doubao/MiniMax） | 是 | `kimi`（优先）|
| `KIMI_API_KEY` | Kimi API 密钥 | 是 | （从 .env 读）|

### 7.2 构建与发布

```bash
# 前端
cd 人生决策宗师/apps/AWKN-LABlife
pnpm --filter awkn-life-frontend typecheck
pnpm --filter awkn-life-frontend lint:biome
pnpm --filter awkn-life-frontend build

# 后端
pnpm --filter awkn-life-backend typecheck
pnpm --filter awkn-life-backend lint:biome
pnpm --filter awkn-life-backend build
```

### 7.3 健康检查

```bash
# 本次 Phase A 不重新部署，仅回归验证
curl -s "http://8.148.245.29/api/v1/consult/records?limit=5" \
  -H "Authorization: Bearer <test-jwt>" | jq '.total'
# 期望：返回数字（非 401/500）
```

---

## 8. 回滚方案

> **本阶段无代码变更**，回滚不适用。但若 E3 验证发现 spec 标 [x] 与代码不一致，必须回退勾选。

| 回滚对象 | 回滚步骤 | 验证方式 | 负责人 |
|---|---|---|---|
| spec/tasks.md | 把 [x] 改回 [ ]，加 PARTIAL/MISSING 标注 | grep 二次确认 | （待用户审批）|
| spec/checklist.md | 同上 | grep 二次确认 | （待用户审批）|
| 代码 | 若代码实际未改 → git revert 到上个 commit | typecheck + build | （仅在代码真未改时）|

---

## 9. 未确认项（来自 plan Clarify Gate）

| # | 项目 | 影响 | 是否阻断 | 建议负责人 |
|---|---|---|---|---|
| 1 | V1 spec 中 5 个 [x] Task 是否真已部署到生产？ | 决定 Phase A 是"回归验证"还是"实际补做" | 🟡 阻断 | 用户 |
| 2 | V2 仓库定位：V1 之上叠加 vs 独立仓库？ | 决定 Phase B 文件落地路径 | 🟡 阻断 | 用户 |
| 3 | V1 spec 缺 git 锚点（commit sha）| 回滚时缺锚点 | 🟡 中 | 维护者 |
| 4 | Playwright 截图（E3 验证）当前未跑 | E-A15 PARTIAL 风险 | 🟢 低 | Phase A 执行时补 |
| 5 | `pnpm typecheck`/`build` 当前未跑 | 缺运行时证据 | 🟡 中 | Phase A A-T06 补 |

---

## 10. 交接清单

- [x] 需求范围已确认（V1 5 Task 收口）
- [x] 接口/字段无编造项（仅复述 spec 已确认的字段）
- [x] 数据库迁移和回滚已说明（无迁移）
- [ ] 测试证据已列出（E3 部分待跑）
- [x] 部署路径、服务名、端口已确认（无重新部署）
- [x] 未确认项已分级（9 项）

---

## 11. handoff JSON

```json
{
  "stage": "V1-CloseLoop-Verify",
  "phase": "A",
  "goal": "用 E-A15 三态独立验证 5 个被标 [x] 的 V1 闭环 Task,产出可下载证据并触发 E31/E28 门禁",
  "constraints": [
    "只读验证,不修改 V1 业务代码",
    "每个 Task 必须有 git anchor (commit sha 或 file-diff 摘要)",
    "E31 三件套必须 0 错",
    "E28 禁止 .env / node_modules 入库"
  ],
  "artifacts": [
    "verify/A-T01-history-page.png",
    "verify/A-T02-kline-degrade.png",
    "verify/A-T03-store-no-records.png",
    "verify/A-T04-quming-quality.spec.log",
    "verify/A-T05-page-only.png",
    "verify/A-T07-security-precheck.txt",
    "verify/V1-CloseLoop-Verify-Report.md"
  ],
  "decisions": [
    "D-A1: 验证产物采用 verify/ 子目录而非修改 .trae/specs/",
    "D-A2: P0-1 必须先于 P0-2(后者依赖历史页能展示 K线记录)",
    "D-A3: 取名质量守卫的'重试+降级'通过 service 单测断言而非端到端"
  ],
  "definition_of_done": [
    "8 个 Task 全部 DONE",
    "E31 / E28 / E-A15 三栏全绿",
    "V1-CloseLoop-Verify-Report.md 经审核人签字"
  ],
  "status": "pending",
  "next_stage": "B-V2-PR13-Engineering-Guards"
}
```
