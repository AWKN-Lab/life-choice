# 人生决策宗师 — 工程交接包总索引

> **原始生成日期**：2026-06-10
> **生产校准日期**：2026-07-07
> **当前事实入口**：[`ENGINEERING-当前生产技术基线-20260707.md`](./ENGINEERING-当前生产技术基线-20260707.md)

当前生产相关文档：

- [当前生产技术基线](./ENGINEERING-当前生产技术基线-20260707.md)
- [当前生产 API 基线](../接口文档/API-当前生产接口基线-20260707.md)
- [当前生产数据库基线](../数据库文档/DATABASE-当前生产Schema基线-20260707.md)
- [当前生产部署基线](../部署文档/DEPLOY-当前生产基线-20260707.md)
- [当前生产烟测基线](../测试用例/TEST-当前生产烟测基线-20260707.md)

以下 Phase、战线和历史交接包保留其原有规划与验收语境；当前运行状态采用上述生产基线。

| **统一前台底座** | [Q3-统一对话前台工程作战图-2026-06-24.md](Q3-统一对话前台工程作战图-2026-06-24.md) | 规划（Q3 统一对话前台底座）| pending | （待用户审批）|
| **数据资产底座** | [Q3-数据资产留存与后台视图作战图-2026-06-24.md](Q3-数据资产留存与后台视图作战图-2026-06-24.md) | 规划（Q3 数据资产与后台视图底座）| pending | （待用户审批）|
| **统一前台任务单** | [TASKLIST-统一前台状态机与组件拆分-2026-06-24.md](TASKLIST-统一前台状态机与组件拆分-2026-06-24.md) | 任务单（可派工）| pending | （待用户审批）|
| **数据资产任务单** | [TASKLIST-资产字段映射与历史后台视图-2026-06-24.md](TASKLIST-资产字段映射与历史后台视图-2026-06-24.md) | 任务单（可派工）| pending | （待用户审批）|

---

## 入口文档

| Phase | 交接包 | 类型 | 状态 | 签字 |
|---|---|---|---|---|
| **A** | [Phase-A-V1-CloseLoop-Verify-Handoff.md](Phase-A-V1-CloseLoop-Verify-Handoff.md) | 验证（只读）| ✅ 验证完成 | （待用户审批）|
| **A-报告** | [V1-CloseLoop-Verify-Report.md](V1-CloseLoop-Verify-Report.md) | E-A15 三态验证报告 | ✅ 5/5 PASS | （附截图证据）|
| **B** | [Phase-B-V2-PR13-Engineering-Guards-Handoff.md](Phase-B-V2-PR13-Engineering-Guards-Handoff.md) | 建设（8+7 文件）| pending | （待 Phase A 签字）|
| **C** | [Phase-C-V2-ThirdLayer-Engineering-Handoff.md](Phase-C-V2-ThirdLayer-Engineering-Handoff.md) | 规划（V0.2 落地）| pending | （待 Phase B 签字）|
| **6** | [Phase-6-V1.1-GrowthLoop-Handoff.md](Phase-6-V1.1-GrowthLoop-Handoff.md) | 建设（自然增长闭环）| pending | （待用户审批）|
| **知识库抢救** | [KNOWLEDGE-RECOVERY-SCAN-20260622.md](KNOWLEDGE-RECOVERY-SCAN-20260622.md) | 扫描（术数知识库资产）| ✅ 第一轮完成 | （待恢复执行）|
| **问事前台** | [ENGINEERING-问事对话前台V1-2026-06-24.md](ENGINEERING-问事对话前台V1-2026-06-24.md) | 建设（问事对话前台 V1）| pending | （待用户审批）|
| **取名前台** | [ENGINEERING-取名对话前台V1-2026-06-24.md](ENGINEERING-取名对话前台V1-2026-06-24.md) | 建设（取名对话前台 V1）| pending | （待用户审批）|
| **命运K线** | [ENGINEERING-命运K线V2升级-2026-06-24.md](ENGINEERING-命运K线V2升级-2026-06-24.md) | 建设（命运K线 V2 升级）| pending | （待用户审批）|

---

## 上游文档（输入）

| 文档 | 路径 | 用途 |
|---|---|---|
| 三合一执行计划 | `C:\Users\10919\.claude\plans\noble-greeting-sparkle.md` | 主计划（Phase Roadmap + Task 列表 + handoff JSON）|
| V1 闭环 spec | `C:\Users\10919\Desktop\AWKN-Lab\.trae\specs\close-life-decision-loops\` | Phase A 输入 |
| V2 PR-13 任务单 | `人生决策宗师/人生决策智能体/新建文件夹\新建 文本文档.txt` | Phase B 输入 |
| V2 第三层 V0.1 总包 | `人生决策宗师/人生决策智能体/人生智能系统_第三层工程执行总包_V0.1\` | Phase C 输入 |
| V2 总纲 V0.3 | `人生决策宗师/人生决策智能体/人生智能系统_总纲归口修订包_V0.3\` | Phase C 输入 |

---

## 下游消费

| 交接包 | 消费方 | 消费方式 |
|---|---|---|
| Phase A | `awkn-审核` 技能 | 5 截图 + 1 报告 + E31/E28 命令输出 → 审核签字 |
| Phase A | `awkn-部署` 技能 | V1 收口报告 → 是否重新部署的判定依据 |
| Phase B | `awkn-工程师` 技能 | 8 新文件 + 7 接入 → 直接派工 |
| Phase B | `awkn-审核` 技能 | 8 行验收表 + E47 限流测试 → 审核签字 |
| Phase C | `awkn-prd` 技能 | PR 候选清单 → 后续 PR 需求 |
| Phase C | `awkn-部署` 技能 | runbook → 灰度发布 |

---

## 阶段互锁

```
Phase A 签字 ──► Phase B 启动 ──► Phase B 签字 ──► Phase C 启动 ──► Phase C 签字 ──► V2 backlog
```

| 门禁 | 上游必须产出 | 否则不通过 |
|---|---|---|
| A→B | `verify/V1-CloseLoop-Verify-Report.md` 签字 + E31/E28 全绿 | Phase B 不启动 |
| B→C | `verify/B-PR13-acceptance.md` 8 行全绿 + E47 限流接入 | Phase C 不启动 |
| C→后续 | `openapi-v2.yaml` + DDL Prisma schema 双签 | 不开后续 PR |

---

## 风险与回滚（汇总）

| 风险 | 概率 | 影响 | 回滚 |
|---|---|---|---|
| V1 spec 标 [x] 但缺独立证据 | 高 | 中 | E-A15 PARTIAL → 补证据 |
| V2 路径漂移（PR-13 vs V1 实际）| 高 | 高 | `verify/B-path-mapping.md` 启动前必做 |
| V2 仓库定位未定 | 中 | 高 | 用户 Clarify Gate 必须先答 |
| PR-13 修改文件超出 scope | 中 | 中 | git diff 限定路径白名单 |
| V2 DDL 与 V1 库冲突 | 中 | 高 | `prisma-v2/` 独立目录，prod 双 schema 共存 |
| E47 限流误伤 | 低 | 中 | 白名单 VIP + 监控 429 比例 |
| 行为埋点丢事件 | 中 | 中 | `behaviorQueue` 本地兜底 + flush 重试 |

---

## 验证截图位置

| 截图 | 文件路径 | 用途 |
|---|---|---|
| A-T01 历史页 | `A-T01-history-page-login-required.png` | P0-1 历史页"请先登录"截图 |
| A-T02 K线页 | `A-T02-tide-page-api-data.png` | P0-2 Tide 页"API 数据"标识截图 |
| A-T05 取名页 | `A-T05-naming-page-full.png` | P2-1 取名全页模式截图 |

> 截图当前位于工作目录（Playwright MCP 默认输出路径），建议移至 `verify/` 子目录归档。

---

## 4 线并行工程交接包（v2 纠偏版，2026-06-15）

> 基于代码实际探查 + 语义纠偏，L2 完成度从 70% 下调至 35%
> 所有术语对齐代码实际结构（4 路由/FiveLayerOutput/ConsultRecord.status/CSS 变量体系）

### 工程交接文档（天级执行手册）

| 线 | 交接包 | 类型 | 工期 | 状态 |
|---|---|---|---|---|
| **L2** | [engineering-handoff-L2-pipeline-v2.md](engineering-handoff-L2-pipeline-v2.md) | 天级执行手册 | 4 周 | pending |
| **L1** | [engineering-handoff-L1-content-v2.md](engineering-handoff-L1-content-v2.md) | 天级执行手册 | 3 周 | pending |
| **L3** | [engineering-handoff-L3-memory-v2.md](engineering-handoff-L3-memory-v2.md) | 天级执行手册 | 4 周 | pending |
| **L4** | [engineering-handoff-L4-character-v2.md](engineering-handoff-L4-character-v2.md) | 天级执行手册 | 3 周 | pending |

### 工程文档（技术参考）

| 线 | 文档 | 类型 | 状态 |
|---|---|---|---|
| **L2** | [engineering-L2-pipeline.md](engineering-L2-pipeline.md) | 技术参考 | pending |
| **L1** | [engineering-L1-content.md](engineering-L1-content.md) | 技术参考 | pending |
| **L3** | [engineering-L3-memory.md](engineering-L3-memory.md) | 技术参考 | pending |
| **L4** | [engineering-L4-character.md](engineering-L4-character.md) | 技术参考 | pending |

### 语义纠偏声明

| 术语 | 旧文档说 | 代码实际 | 本包统一用语 |
|------|---------|---------|------------|
| Pipeline | 9 模块 | 4 路由 + scheduler + parallel gateway + ReAct | 4 路由架构 |
| 输出格式 | 5 段 | FiveLayerOutput 5 层接口 | FiveLayerOutput |
| 状态管理 | 9 节点状态机 | ConsultRecord.status 字符串 | ConsultRecord.status |
| 视觉体系 | mbs-* 5 色 token | CSS 变量体系 | CSS 变量体系 |

---

## 索引修订记录

| 日期 | 修订 | 修订人 |
|---|---|---|
| 2026-06-10 | v0.1 首次生成（3 份交接包 + 1 份 INDEX）| Claude (awkn-工程文档) |
| 2026-06-10 | v0.2 添加 V1 验证报告 + 截图位置 + Phase A 状态更新 | Claude (Playwright MCP 实测) |
| 2026-06-15 | v1.0 新增 4 线并行 v2 纠偏版工程交接包（8 份文档）+ 语义纠偏声明 | Claude (awkn-执行检查 + awkn-工程文档) |
| 2026-06-22 | v1.1 新增 Phase 6 V1.1 自然增长闭环工程交接包（首问 5 块、3 追问、¥1 单事深推、埋点、复访） | GPT-5.5 Thinking (awkn-工程文档) |
| 2026-06-22 | v1.2 新增术数知识库资产第一轮扫描报告（八字、六壬、六爻、梅花、太乙、奇门、紫微等） | GPT-5.5 Thinking (awkn-工程文档) |
