# Phase C 工程交接包 — V2 第三层工程总包规划

> **类型**: 工程交接包（规划性质）
> **阶段**: C — V2 第三层总包规划
> **对应计划**: `noble-greeting-sparkle.md` Phase C
> **生成日期**: 2026-06-10
> **生成方式**: awkn-工程文档 v2.5.1
> **handoff JSON**: 见文末 §11

---

## 1. 一屏摘要

- **项目/模块**: 人生智能系统 V2 — 第三层工程执行总包（V0.2）
- **本次目标**: 把 V0.2 母文档（DDL/API/算法/事件流/前端/SOP）从 docx 推进到可建表/可写接口/可联调/可测试/可灰度的落地执行层
- **变更范围**: 1 个 prisma-v2 schema + 1 份 OpenAPI 3.1 契约 + 1 份 runbook + 1 份 PR 候选清单（PR-14…PR-N）+ 1 份 V0.3 交接包
- **交付物**: 15+ 个文件（详见 §11 artifacts）
- **验证状态**: Phase B 必须先签字，否则不进 C
- **发布建议**: 暂缓发布 → 12 Task 全部 DONE + E54 五维审计全绿

---

## 2. 事实来源

| 来源 | 路径/链接 | 用途 | 证据等级 |
|---|---|---|---|
| V0.1 总包入口 | `人生决策宗师/人生决策智能体/人生智能系统_第三层工程执行总包_V0.1/` | 7 份 docx（对象/状态/处境/证据/接口/测试/修订说明）| E0（V2 战略）|
| V0.2 总包入口 | `人生决策宗师/人生决策智能体/人生智能系统_第三层工程执行总包_V0.1/` 内 V0.2 子包 | 6 份 docx（DDL/API/算法/事件流/前端/SOP）| E0（V2 战略）|
| 总纲 V0.3 | `人生决策宗师/人生决策智能体/人生智能系统_总纲归口修订包_V0.3/` | 6 份总纲/执行/归口修订 | E0（V2 战略）|
| PR-13 任务单 | `人生决策智能体/新建文件夹/新建 文本文档.txt` | V2 上线可靠性代码 | E0（与 Phase B 衔接）|
| 母文档 S-000 | `人生决策智能体/人生智能系统母文档_V0.2_内核闭环修订版.docx` | V2 内核闭环 | E0（V2 战略）|
| V1 已落地资产 | `apps/AWKN-LABlife/` | 复用技术栈、klineTide 接口、llm-gateway | E2（已存在代码）|

---

## 3. 变更说明

### 3.1 用户可见变化

> 本阶段不直接产生用户可见变化（属于"建设前置规划"）。最终上线后用户将看到：
- V2 完整的人生 K 线（持久化、可回溯）
- 状态机驱动的多模块流转（问事/取名/K线/反馈统一事件账本）
- 证据置信图谱（决策不再"单线推理"）
- 灰度发布 + 一键回滚

### 3.2 技术变化（V0.2 6 份 docx 转化）

| V0.2 docx | 转代码产物 | 文件路径 |
|---|---|---|
| `01_数据模型与DDL落地包_V0.2.docx` | Prisma schema | `server/prisma-v2/schema.prisma` |
| `02_API接口与状态机_V0.2.docx` | OpenAPI 3.1 + 状态机校验器 | `docs/api-v2/openapi.yaml` + `server/src/common/state-machine.ts` |
| `03_算法伪代码_V0.2.docx` | TS 接口 | `server/src/algorithms/evidence-graph.ts` + `feedback-correction.ts` |
| `04_事件流与任务编排_V0.2.docx` | BullMQ 队列 + 事件账本 | `server/src/events/ledger.ts` + `queueDefinitions.ts` |
| `05_前端组件与埋点_V0.2.docx` | 组件清单 + 埋点字典 | `docs/frontend/component-inventory.md` + `events-dict.json` |
| `06_上线运行SOP_V0.2.docx` | runbook | `docs/runbook/V2-rollout.md` |

### 3.3 影响范围

| 范围 | 影响 | 风险 | 处理 |
|---|---|---|---|
| 数据 | 新增 prisma-v2 schema（独立目录）| 🔴 高（与 V1 schema 冲突风险）| 双 schema 隔离，prod 切流前双库共存 |
| 后端 | 5 个新模块（state-machine / algorithms / events / 限流升级）| 🔴 高 | 与 V1 `llm-gateway` 串联测试 |
| 前端 | 12 个新组件 | 🟡 中 | 组件清单 + 埋点字典 100% 覆盖 |
| 部署 | runbook + 灰度开关 | 🟡 中 | 含回滚脚本 |
| 战略 | PR 候选清单（PR-14…PR-N）| 🟢 低 | V0.3 交接包签字 |

---

## 4. 接口文档（OpenAPI 3.1 草稿冻结目标）

> 本阶段不立即实现全部接口，而是把契约冻结到 `openapi-v2.yaml` 草稿，作为 PR-14 起的开发基准。

| 接口组 | 接口数（预估） | 鉴权 | 备注 |
|---|---|---|---|
| `/api/v2/records/*` | 6 | JWT | V1 `/consult/records/*` 的 V2 升级版（+ 事件账本关联）|
| `/api/v2/state-machine/*` | 3 | JWT | 状态机驱动：claim/transition/rollback |
| `/api/v2/evidence/*` | 4 | JWT | 证据图谱查询/补全/反馈 |
| `/api/v2/feedback/*` | 3 | JWT | 用户反馈（claim_confirmed/partial/rejected）|
| `/api/v2/admin/*` | 5 | Admin | 灰度开关/限流配置/审计 |

### 状态机（8 个核心状态）

```
[init] → [submitted] → [analyzing] → [evidencing]
   ↓           ↓             ↓              ↓
[cancelled] [failed]    [needs_more]   [ready_for_claim]
                                              ↓
                                         [claimed] → [executed] → [archived]
                                              ↓
                                         [partial]/[rejected]
```

> 完整 Mermaid 图写入 `docs/api-v2/state-machine.md`。

---

## 5. 数据库文档

### 5.1 V2 新增表（prisma-v2/schema.prisma 草稿）

| 表/集合 | 变更类型 | 字段（核心）| 索引 | 迁移方式 | 回滚方式 | 数据风险 |
|---|---|---|---|---|---|---|
| `v2_records` | 新增 | `id, type, userId, state, payload JSON, createdAt, updatedAt` | `userId+state`, `type+createdAt` | `prisma migrate dev` | `prisma migrate resolve --rolled-back` | 🟢 低（独立库）|
| `v2_state_transitions` | 新增 | `id, recordId, fromState, toState, reason, actor, createdAt` | `recordId+createdAt` | 同上 | 同上 | 🟢 低 |
| `v2_evidence_nodes` | 新增 | `id, recordId, nodeType, confidence, payload JSON` | `recordId`, `nodeType+confidence` | 同上 | 同上 | 🟢 低 |
| `v2_evidence_edges` | 新增 | `id, fromNode, toNode, relation, weight` | `fromNode`, `toNode` | 同上 | 同上 | 🟢 低 |
| `v2_claim_actions` | 新增 | `id, recordId, claimType, result, executedAt` | `recordId`, `claimType+executedAt` | 同上 | 同上 | 🟢 低 |
| `v2_behavior_events` | 新增（V2 升级版）| `id, recordId, eventType, payload JSON, eventId UUID UNIQUE` | `eventId UNIQUE`（幂等）| 同上 | 同上 | 🟢 低 |

> **幂等性**: `eventId` 唯一索引保证同事件重发只 1 次副作用（D-C3 决策）。

### 5.2 V1 → V2 字段映射表

| V1 字段 | V2 字段 | 迁移策略 |
|---|---|---|
| `ConsultRecord.userId` | `v2_records.userId` | 直接复制（userId 字典不变）|
| `ConsultRecord.profileId` | `v2_records.payload.profileId` | 嵌套到 JSON |
| `behavior_events.event_type` | `v2_behavior_events.eventType` | enum 升级（含 13 个 V1 事件 + V2 新增）|

---

## 6. 测试用例

| 用例 | 类型 | 前置条件 | 操作 | 期望结果 | 状态 |
|---|---|---|---|---|---|
| TC-C01 | 正常流 | prisma-v2 schema 已落 | `prisma migrate dev --schema=prisma-v2/schema.prisma` | 6 张表全部建成功 | 待测 |
| TC-C02 | 正常流 | 状态机校验器已实现 | 合法跃迁 `init→submitted` | 200 | 待测 |
| TC-C03 | 异常流 | 同上 | 非法跃迁 `init→executed` | 400 + 错误码 `INVALID_TRANSITION` | 待测 |
| TC-C04 | 正常流 | 证据图谱算法已实现 | 创建 record → 自动建 3 个 evidence_node | 节点数 = 3 | 待测 |
| TC-C05 | 异常流 | 事件账本已实现 | 同 `eventId` 重发 2 次 | 数据库副作用 = 1 次 | 待测 |
| TC-C06 | 正常流 | 组件清单已落 | 12 个核心组件全部对应 V0.2 第 5 份 docx | 100% 覆盖 | 待测 |
| TC-C07 | 正常流 | 埋点字典已落 | 字典与 `ALLOWED_BEHAVIOR_EVENTS` 差集 | 0 | 待测 |
| TC-C08 | 正常流 | runbook 已落 | 含 灰度开关 + 回滚脚本 + 监控项 + on-call | 4/4 存在 | 待测 |
| TC-C09 | 异常流 | E54 五维孤岛审计 | 数据/接口/事件/前端/SOP 五维 | 5/5 闭环 | 待测 |
| TC-C10 | 正常流 | PR 候选清单 | PR-14…PR-N 每项含 scope/DoD/验收命令/风险 | N/4 字段齐 | 待测 |

---

## 7. 部署说明

### 7.1 环境变量

| 名称 | 用途 | 是否必需 | 示例/来源 |
|---|---|---|---|
| `DATABASE_URL_V2` | V2 Prisma 数据源 | 是 | `postgresql://v2user:***@host:5432/v2db`（独立库）|
| `REDIS_URL_V2` | V2 BullMQ 队列 | 是 | `redis://...:6379/1`（db 1 区分 V1）|
| `V2_ROLLOUT_PERCENTAGE` | 灰度比例 | 是 | `0`（初始 0%，逐步到 100）|
| `V2_KILL_SWITCH` | 一键回滚开关 | 是 | `false`（紧急时改 true）|

### 7.2 构建与发布（V2 runbook 骨架）

```bash
# 1. 数据库迁移（独立库）
cd 人生决策宗师
DATABASE_URL_V2=... npx prisma migrate dev --schema=server/prisma-v2/schema.prisma

# 2. 构建
cd apps/AWKN-LABlife
pnpm -r typecheck && pnpm -r build

# 3. 灰度发布
V2_ROLLOUT_PERCENTAGE=5  ./scripts/v2-rollout.sh start
# 监控 5 分钟 → OK → 25% → OK → 50% → 100%

# 4. 一键回滚
V2_KILL_SWITCH=true  ./scripts/v2-rollout.sh rollback
```

### 7.3 健康检查

```bash
# V2 主链路
curl -s "http://8.148.245.29/api/v2/health" | jq '.ok'
# 期望：true

# 灰度比例确认
curl -s "http://8.148.245.29/api/v2/admin/rollout" | jq '.percentage'
# 期望：当前比例
```

---

## 8. 回滚方案

| 回滚对象 | 回滚步骤 | 验证方式 | 负责人 |
|---|---|---|---|
| V2 schema | `prisma migrate resolve --rolled-back <migration>` | `prisma-v2` 6 表回到迁移前 | 工程师 |
| V2 后端 | `pm2 restart v2-backend --update-env` + `V2_KILL_SWITCH=true` | `/api/v2/health` 返 503 | 部署者 |
| V2 前端 | Nginx 切回 V1 入口 `/api/v1` | 浏览器无 404 | 部署者 |
| V2 数据 | 无（V2 独立库，不影响 V1）| — | — |

---

## 9. 未确认项

| # | 项目 | 影响 | 是否阻断 | 建议负责人 |
|---|---|---|---|---|
| 1 | V0.2 docx 字段细节（DDL/API/算法伪代码）未全部提取 | C-T01/C-T03/C-T05 实施延迟 | 🟡 阻断 | 工程师 |
| 2 | V2 与 V1 是否共享 BullMQ/Redis 命名空间 | 决定 DDL `eventId` UNIQUE 索引设计 | 🟡 中 | 工程师 |
| 3 | 12 个核心组件清单是否已与 V2 UI 设计师对齐 | 决定 C-T07 工作量 | 🟢 低 | 设计师 |
| 4 | 灰度策略（按 userId hash / 按 IP / 按时间窗）| 决定 runbook 配置 | 🟡 中 | 产品+工程师 |
| 5 | on-call 联系人清单 | 决定 runbook 完整性 | 🟢 低 | 运维 |

---

## 10. 交接清单

- [x] 需求范围已确认（V0.2 6 份 docx 转化）
- [x] 接口/字段无编造项（草稿状态，PR-14 起冻结）
- [x] 数据库迁移和回滚已说明（独立 prisma-v2 目录）
- [ ] 测试证据已列出（E3 待跑）
- [x] 部署路径、服务名、端口已确认（V2 独立栈）
- [x] 未确认项已分级（5 项）

---

## 11. handoff JSON

```json
{
  "stage": "V2-ThirdLayer-Engineering",
  "phase": "C",
  "goal": "把第三层从 docx 推进到可建表/可写接口/可联调/可测试/可灰度的落地执行层",
  "constraints": [
    "V0.2 是 PR 候选母本,V0.1 仅作历史对照不写代码",
    "DDL 与 V1 schema 双 schema 隔离(独立 prisma 目录)",
    "API 状态机用 TS 编码而非文档口述",
    "E54 五维孤岛审计必须每维都闭环"
  ],
  "artifacts": [
    "server/prisma-v2/schema.prisma",
    "server/prisma-v2/migrations/0001_init/*",
    "docs/api-v2/openapi.yaml",
    "docs/api-v2/state-machine.md",
    "server/src/common/state-machine.ts",
    "server/src/algorithms/evidence-graph.ts",
    "server/src/algorithms/feedback-correction.ts",
    "server/src/events/ledger.ts",
    "server/src/events/queueDefinitions.ts",
    "docs/frontend/component-inventory.md",
    "docs/frontend/events-dict.json",
    "docs/runbook/V2-rollout.md",
    "verify/C-E54-island-audit.md",
    "docs/PR-roadmap.md",
    "人生决策智能体/人生智能系统_第三层工程执行总包_V0.3_交接包/handoff.json"
  ],
  "decisions": [
    "D-C1: DDL 落地用独立 prisma-v2/ 目录,不污染 V1 schema",
    "D-C2: API 契约用 OpenAPI 3.1 + Spectral lint 双签",
    "D-C3: 事件流幂等性用 eventId 唯一索引而非应用层去重",
    "D-C4: SOP runbook 化用 docs/runbook/ 目录,版本化"
  ],
  "definition_of_done": [
    "12 Task 全部 DONE",
    "E54 五维孤岛审计全绿",
    "PR-roadmap.md 列清 PR-14…PR-N 范围",
    "V0.3 交接包签字归档"
  ],
  "status": "pending",
  "next_stage": "V2-Backlog-Implementation"
}
```
