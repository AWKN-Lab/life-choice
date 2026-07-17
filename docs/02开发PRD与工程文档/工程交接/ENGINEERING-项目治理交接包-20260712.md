# 项目治理工程交接包

> **文档类型**：Handoff（交接包，面向接手者 @程序员 快速上手）
> **创建日期**：2026-07-12
> **状态**：PLANNED（计划态，待阶段 0-4 执行）
> **编制人**：天火（项目负责人 / 治理编制者）
> **接手人**：@程序员（工程师 / 执行者）
> **上游依据**：
> - `docs/00项目治理/项目治理计划-v1.0-20260712.md`（治理 PRD）
> - `docs/00项目治理/项目治理计划-v1.0-批判性分析-20260712.md`（审核结果单：打回，4 P0 + 7 P1 + 9 P2）
> - `docs/00项目治理/提交批次计划-20260711.md`（执行计划）
> - `docs/00项目治理/后端边界审计结果-20260711.md`（5 BLOCK 详情）
> - `docs/00项目治理/ADR-后端依赖安装与构建边界-20260711.md`（技术决策 PROPOSED）
> - `docs/02开发PRD与工程文档/工程交接/_ground-truth.md`（技术真相 v3.0）
> **下游消费**：
> - `@程序员` 按阶段 0-4 派工执行
> - `awkn-审核` 按验证清单做阶段审查门禁
> - `awkn-部署` 按部署节奏做发布
> - `awkn-工程文档` 按本包生成长期工程文档（技术参考）
> **权威源约束**：本包是 2026-07-07 生产基线的治理增量，不替代权威源；冲突时以生产基线为准，本包标注"治理增量"。

---

## 0. 交接包总览

### 0.1 一句话摘要

执行两周集中治理（2026-07-12—2026-07-26），通过 5 阶段（0-4）、11 批次（G0/D1/K1/K2/P1/P2/P3/Q1/B0/G1/R1），清零 5 个后端 BLOCK、收口 217 项工作区变更、统一包管理与构建入口、建立长期治理机制，让 git HEAD 重新可代表代码事实、生产发布重新可执行。

### 0.2 关键事实（接手者必读）

| 项 | 值 | 与 2026-07-07 生产基线差异 |
|----|----|----------------------|
| 生产 HEAD（2026-07-07 基线） | `4bbcd7c5` | — |
| 本地 HEAD（2026-07-12 实测） | 待 Phase 0 取证确认 | 已前进（差 N commits 未 push） |
| 工作区状态 | 169 status 行 / 111 跟踪差异 / 115 未跟踪 / 49 删除 | 较 2026-07-07 基线"521 已跟踪变更"已大幅收口 |
| 后端 BLOCK | 5（治理计划 v1.0 第 21 行）/ 3（治理计划 v1.0 第 42 行） | **数据矛盾，见 P0-1** |
| 后端 WARN | 4 | 包管理、构建与备份规则 |
| 已核验历史迁移 | 41 项（audit:moves 全部纯移动） | — |
| 待核验删除 | 8 项（49 删除中 41 已核验为迁移） | 需逐一说明目的 |
| 工具状态 | `audit:changes` 与 `audit:batches` 空暂存区报错 | **阶段 0 必须先修复** |
| 生产 PM2 | online，4 端点 401 | 与 2026-07-07 基线一致 |
| 生产 DB | SQLite dev.db 1.1M, 18 User | 与 2026-07-07 基线一致 |
| 磁盘空间 | 90%（3.9G 剩余） | **发布阻断项，需 >6G** |

> **H5 修复注**：本表工作区快照为 2026-07-12 治理编制时实测，与 `P0-P1修复工程交接包-20260712.md` §0.2 的 "125 files changed" 快照不同步（两者针对不同治理范围、不同时间点）；阶段 0 重新取证后以本包数据为准。

### 0.3 接手者第一个动作

1. 读 `docs/00项目治理/项目治理计划-v1.0-20260712.md` 了解两周治理全景
2. 读 `docs/00项目治理/项目治理计划-v1.0-批判性分析-20260712.md` 了解 4 个 P0 缺陷（必须先修复）
3. 读本交接包 §1-§12 了解执行边界
4. 从 **阶段 0｜冻结边界与保护现场** 开始执行（修复工具 + 核对 49 删除 + 记录 HEAD）
5. **禁止**：在阶段 0 完成前执行批量暂存、全仓格式化、Schema 合并、根目录物理迁移

### 0.4 治理计划 v1.0 的 4 个 P0 缺陷（必须先修复）

> 来源：`项目治理计划-v1.0-批判性分析-20260712.md`，结论：**打回（Request Changes）**

| P0 编号 | 缺陷 | 修复动作 | 修复时机 |
|---------|------|---------|---------|
| P0-1 | BLOCK 数量不一致（第 21 行"5"vs第 42 行"3"） | 统一为最新值，列出 BLOCK 具体名称 | 立即（v1.0.1 修订） |
| P0-2 | `audit:changes`/`audit:batches` 工具失效无 Plan B | 阶段 0 增加人工批次清单降级路径 | v1.1 发布前 |
| P0-3 | 回滚点未强制（批次标准缺 commit hash 字段） | 批次标准增加"回滚点 commit hash"强制字段 | v1.1 发布前 |
| P0-4 | 批判性审查环节缺失（违反 RULE CRITIQUE-BEFORE-COMPLETE） | 本交接包 + 工程文档附带批判性审查章节 | v1.1 发布前 |

**执行约束**：在治理计划升 v1.1 并修复上述 P0 前，本交接包作为临时执行依据；v1.1 发布后以 v1.1 为准。

---

## 1. 变更摘要

### 1.1 变更范围矩阵

| 阶段 | 批次 | 变更类型 | 影响模块 | 文件数（预估） | 风险 |
|------|------|---------|---------|--------------|------|
| 0 | 工具修复+冻结 | 工具+取证 | scripts/maintenance/ | 2-3 | 低 |
| 1 | G0 可验证杂物 | 清理 | 根目录 | 5-10 | 低 |
| 1 | D1 历史文档迁移 | 移动 | docs/03/、docs/06/ | 41 | 低（已核验） |
| 1 | K1 知识导入与索引 | 知识 | knowledge/processed/、scripts/ | 5 | 中（幂等性） |
| 2 | K2 向量检索 v3 | 知识服务 | services/knowledge-service/ | 4-5 | 高（生产切换） |
| 2 | P1 经营看板+前端错误 | 前后端 | app/src/lib/、admin-metrics/ | 7-10 | 中（新接口） |
| 2 | P2 统一前台联动 | 前后端 | FrontdeskChat.tsx、i18n、consult | 12-15 | 高（共享热点） |
| 2 | P3 产品与工程文档 | 文档 | docs/01/、docs/02/ | 6-8 | 低 |
| 3 | B0 后端边界修复 | 后端 | schema.prisma、锁文件、构建链 | 8-10 | **最高（生产阻断）** |
| 4 | Q1 质量治理 | 文档 | docs/05/ | 5-7 | 低 |
| 4 | G1 项目治理 | 文档+脚本 | START-HERE、REPO-MAP、scripts/ | 8-10 | 低 |
| 4 | R1 根目录归位 | 文件移动 | 根目录 → scripts/、_archive/ | 10-15 | 中（条件触发） |

### 1.2 后端 BLOCK 清单（必须清零才能发布）

> 来源：`后端边界审计结果-20260711.md`，5 个 BLOCK 详情

| BLOCK 编号 | 现象 | 修复动作 | 验收 |
|------------|------|---------|------|
| BLOCK-01 | `ConsultDialogueTurn` 迁移存在但 schema.prisma 缺模型 | 恢复模型；或正式下线决策+反向迁移+代码删除 | schema 与代码、迁移、生产四方对齐 |
| BLOCK-02 | `lastAccessedAt` 代码引用但 schema 缺字段 | 恢复字段与索引；或移除 memory-forget.service.ts 全部引用 | 生产日志不再出现 Unknown argument |
| BLOCK-03 | `MemoryEmbedding` 代码引用但 schema 缺模型 | 恢复模型；或删除服务、模块注册、调用链、迁移 | orchestrator.module.ts 与 schema 一致 |
| BLOCK-04 | 三份锁文件并存（根 package-lock + api package-lock + yarn.lock） | 按 ADR-BACKEND-001 切换 npm workspaces，重建单一锁文件 | 后端仅一份 package-lock.json |
| BLOCK-05 | `rule-knowledge-bindings.json` 被移出 assets-manifest.json | 恢复 required 清单项；清空 dist 重建；verify-build.js 通过 | 缺失资产时构建失败 |

### 1.3 治理目标验收值（2026-07-26）

| 目标 | 验收值 | 当前值 |
|------|--------|--------|
| 待人工归类变更 | 0 | 0（已分流） |
| 后端 BLOCK | 0 | 5（矛盾，见 P0-1） |
| 未核验删除项 | 0 | 8 |
| 单次活动批次有效变更 | ≤25 | 217（待分批提交） |
| 混合目标提交 | 0 | 待 Phase 0 工具修复后核验 |
| 生产发布缺少回滚记录 | 0 | 待 Phase 4 Q1 收口 |
| ACTIVE 文档缺少索引 | 0 | 待 Phase 4 G1 收口 |
| 根目录违规资产 | 0 | 待 Phase 4 R1 收口 |
| 包管理器口径 | 1 套 | 3 套（npm + pnpm 文档 + yarn.lock） |
| 后端权威构建入口 | 1 个 | 2 个（根 build 绕过 api 完整 build） |
| 磁盘可用空间 | ≥6G | 3.9G（90%） |

---

## 2. 影响范围

### 2.1 代码影响

| 文件/目录 | 批次 | 变更性质 |
|-----------|------|---------|
| `scripts/maintenance/workspace-change-map.ps1` | 阶段0 | 修复空暂存区 bug |
| `scripts/maintenance/workspace-batch-map.ps1` | 阶段0 | 修复空暂存区 bug |
| `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/schema.prisma` | B0 | 恢复 ConsultDialogueTurn/MemoryEmbedding/lastAccessedAt |
| `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/assets-manifest.json` | B0 | 恢复 rule-knowledge-bindings.json |
| `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/package-lock.json` | B0 | 删除（改用根锁文件） |
| `apps/AWKN-LABlife/awkn-life-backend/yarn.lock` | B0 | 删除 |
| `apps/AWKN-LABlife/awkn-life-backend/package.json` | B0 | 增加 workspaces + packageManager |
| `.github/workflows/ci.yml` | B0 | 工作目录改后端根 |
| `apps/AWKN-LABlife/DEPLOY.md` | B0 | 统一 npm 命令 |
| `apps/AWKN-LABlife/services/knowledge-service/main.py` | K2 | v2/v3 切换 |
| `apps/AWKN-LABlife/app/src/components/frontdesk/FrontdeskChat.tsx` | P2 | K线节点问事+取名候选（共享热点，整体提交） |
| `apps/AWKN-LABlife/app/src/locales/{en,th,zh-CN}/translation.json` | P2 | 三语言文案同步 |
| `apps/AWKN-LABlife/app/src/lib/analytics.ts` | P1 | 前端错误采集 |
| `apps/AWKN-LABlife/app/src/pages/AdminPage.tsx` | P1 | 经营看板 |
| `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/analytics/` | P1 | API 指标采集 |

### 2.2 数据库影响

| 表 | 批次 | 变更 | 风险 |
|----|------|------|------|
| ConsultDialogueTurn | B0 | 恢复模型（或正式下线+反向迁移） | 中（生产数据处置） |
| UserMemory | B0 | 恢复 lastAccessedAt 字段+索引 | 低（字段恢复，不丢数据） |
| MemoryEmbedding | B0 | 恢复模型（或删除服务链） | 中（向量数据处置） |
| KlineBar | （P0-P1修复包 Phase 6） | 加 source/dataVersion/generatedAt | 已在 P0-P1 交接包定义 |
| NamingProject/Candidate/Iteration | （P0-P1修复包 Phase 7） | 新建三表 | 已在 P0-P1 交接包定义 |

**约束**：B0 批次禁止直接 `db push` 覆盖生产结构；必须在生产数据库副本执行迁移验证；记录迁移前后表结构、数据量和回滚 SQL。

### 2.3 接口影响

| 接口 | 批次 | 变更 |
|------|------|------|
| 无新增接口（治理项目本身） | — | 治理是工程行为，不改 API |
| `/api/v1/admin/metrics` | （P0-P1修复包 Phase 9） | 新增 12 指标接口（已在 P0-P1 交接包定义） |
| `/api/v1/kline-tide/seed` | （P0-P1修复包 Phase 1） | 加 Guard（已在 P0-P1 交接包定义） |

**说明**：本治理交接包不引入新接口；接口变更由 `P0-P1修复工程交接包-20260712.md` 承载。治理批次主要影响代码结构、文档、构建链、锁文件。

### 2.4 文档影响

| 文档 | 批次 | 变更 |
|------|------|------|
| `START-HERE.md` | G1 | 更新工程入口 |
| `REPO-MAP.md` | G1 | 更新仓库地图 |
| `ONBOARDING.md` | G1 | 更新入门文档 |
| `docs/文档索引.md` | G1 | 更新全量导航 |
| `docs/00项目治理/项目治理计划-v1.1-20260712.md` | 阶段0 | 升版本，修复 4 P0 |
| `docs/00项目治理/治理执行结果-20260726.md` | Q1 | 新建，治理完成取证 |
| `docs/05审核与质量/Release-Checklist-v1.4.md` | Q1 | 更新发布清单 |
| `docs/02开发PRD与工程文档/接口文档/README.md` | P3 | 标注权威源 |
| `docs/02开发PRD与工程文档/数据库文档/README.md` | P3 | 标注权威源 |
| `docs/02开发PRD与工程文档/测试用例/README.md` | P3 | 标注权威源 |
| `apps/AWKN-LABlife/awkn-life-backend/README.md` | B0 | 统一 npm 命令（移除 pnpm） |

### 2.5 部署影响

| 部署批次 | 包含阶段/批次 | 部署方式 | 是否需服务器 DB 变更 |
|---------|-----------|---------|-------------------|
| 部署 1（治理工具） | 阶段 0-1 | 仅 scripts/，无需部署 | 否 |
| 部署 2（B0 修复） | B0 | scp dist + schema 迁移 + pm2 reload | **是**（恢复模型/字段） |
| 部署 3（K2 切换） | K2 | scp knowledge-service + 切换环境变量 | 否（仅索引切换） |
| 部署 4（P1/P2 功能） | P1, P2 | scp dist + pm2 reload | 否 |
| 部署 5（治理收口） | Q1, G1, R1 | 文档无需部署 | 否 |

**发布冻结**：B0 清零前，生产发布继续冻结。阶段 2 代码完成 ≠ 功能交付，发布等 B0 解冻后统一进行。

---

## 3. 批次执行详情

### 3.1 阶段 0｜冻结边界与保护现场（2026-07-12，1 天 → 建议 3 天）

> **P0-2 修复**：增加 Plan B/C 降级路径

#### 动作

1. 修复 `workspace-change-map.ps1` 与 `workspace-batch-map.ps1` 的空暂存区兼容问题
2. 为"暂存区为空、只有未跟踪文件、只有删除项、跟踪与未跟踪混合"补充回归验证
3. 重新运行 `audit:changes` 与 `audit:batches -Strict`，生成 2026-07-12 新基线
4. 核对 49 个删除状态，其中 41 项已验证为历史迁移，剩余 8 项逐一说明目的
5. 保持根目录物理迁移暂停
6. 保持全仓批量格式化暂停
7. 保持 Schema、锁文件和资产清单合并暂停
8. 记录当前 HEAD、分支、暂存区和工作区状态
9. **新增**：升治理计划 v1.0 → v1.1，修复批判性分析指出的 4 个 P0

#### Plan B（工具修复失败降级）

- **触发条件**：2026-07-12 18:00 前工具未修复
- **降级动作**：启用人工批次清单（Git status + 文件分类表），由项目负责人签字确认每批次边界
- **回填**：工具修复后回填审计结果

#### Plan C（工具修复持续失败）

- **触发条件**：2026-07-13 仍无法修复
- **降级动作**：暂停所有开发提交，仅允许阶段 0 工具修复本身推进

#### 验收

- [ ] `audit:changes` 正常运行
- [ ] `audit:batches -Strict` 返回 0
- [ ] 空暂存区不会触发脚本异常
- [ ] 待人工归类为 0
- [ ] 49 个删除状态全部拥有核验或处置记录
- [ ] 当前 5 个后端 BLOCK 已公开记录（统一数值，修复 P0-1）
- [ ] 没有执行全仓重置、批量覆盖或无范围格式化
- [ ] 治理计划 v1.1 发布，4 个 P0 修复
- [ ] **新增**：记录当前 HEAD commit hash 作为阶段 0 回滚点

### 3.2 阶段 1｜低风险收口（2026-07-12—2026-07-14）

#### G0｜可验证杂物

**范围**：
- 三个乱码文件名的六壬 Prompt 副本
- Office `~$` 临时锁文件
- `bootstrap-production.js.bak_20260626_221436` 时间戳备份

**验证命令**：
```bash
npm run audit:junk
```

**验收**：
- [ ] 三个乱码副本通过正文一致性检查
- [ ] Office 锁文件仅匹配 `~$` 前缀且小于 1MB
- [ ] 时间戳备份进入 `_archive/backups/`，不进入源码提交

#### D1｜历史文档迁移

**范围**：41 个文档和规格文件独立提交，保持内容完全一致

**验证命令**：
```bash
npm run audit:moves
git diff --summary --find-renames=50%
```

**验收**：
- [ ] 历史迁移提交完成
- [ ] 41 项纯移动，Blob 哈希一致
- [ ] 归档索引与旧路径引用更新

#### K1｜知识导入与索引

**范围**：核对当前已暂存的 5 项
```text
knowledge/processed/classics_index.jsonl
scripts/__tests__/test_knowledge_ingest.py
scripts/_fix_null_bytes_first2.py
scripts/ingest_md_converted.py
scripts/knowledge_ingest.py
```

**验收**：
- [ ] 空字节修复、重复记录、索引行数和幂等性验证通过
- [ ] 生产索引与脚本分开说明变化规模

### 3.3 阶段 2｜产品功能收口（2026-07-15—2026-07-19，建议延至 7-21）

#### K2｜向量检索 v3

**目标**：完成 v2/v3 可切换、可回退、可部署的检索路径

**强制验证**：
- [ ] v2 默认路径回归
- [ ] v3 缺文件错误处理
- [ ] embedding 行数与索引行数一致
- [ ] 服务器内存测试
- [ ] 离线模型部署路径
- [ ] v3 评估结果达到预设阈值后才允许切换默认版本

#### P1｜经营看板与前端错误采集

**目标**：让产品经营和线上异常拥有稳定数据入口

**强制验证**：
- [ ] 经营指标口径固定
- [ ] 未接入指标显示"未接入"
- [ ] 前端异常去重、限流和隐私边界通过测试
- [ ] 后端指标服务测试和类型检查通过
- [ ] 看板数据可追溯到原始事件

#### P2｜统一前台联动

**目标**：完成 K 线节点进入问事、取名候选状态保存和统一行为事件

**强制验证**：
- [ ] K 线证据完整带入问事
- [ ] 取名候选拥有稳定 `candidateId`
- [ ] 收藏、取消、淘汰、恢复、对比、最终选择可以重放状态
- [ ] 三语言 key 完整
- [ ] `FrontdeskChat.tsx` 作为整体功能链验收（共享热点，禁止手工拆 hunk）

#### P3｜产品与工程文档

**要求**：产品代码批次验证通过后再更新 PRD、API 基线、数据库基线、部署基线、测试基线、工程交接

### 3.4 阶段 3｜后端硬阻断修复（2026-07-18—2026-07-23，建议 7-20—7-26）

> B0 独立执行，允许与产品文档工作并行。**生产发布继续冻结。**

#### 任务 1｜Schema 一致性（BLOCK-01/02/03）

**处理对象**：ConsultDialogueTurn、MemoryEmbedding、UserMemory.lastAccessedAt

**要求**：
1. 代码引用、Prisma Schema、迁移文件和生产数据库状态四方对齐
2. 在生产数据库副本执行迁移验证
3. 记录迁移前后表结构、数据量和回滚 SQL
4. **禁止**直接使用 `db push` 覆盖生产结构
5. **P0-3 修复**：迁移前必须 `cp dev.db dev.db.bak.<日期>.b0`，快照路径记录在批次单

#### 任务 2｜构建资产一致性（BLOCK-05）

**处理对象**：assets-manifest.json、rule-knowledge-bindings.json、copy-assets.js、verify-build.js、preflight-check.js

**要求**：
- 运行时读取的必需资产全部进入权威清单
- 构建完成后自动复制并校验
- 缺失必需资产时构建失败
- 启动前再次校验关键资产

#### 任务 3｜包管理与安装边界（BLOCK-04）

**按 ADR-BACKEND-001 执行**：
- npm 作为唯一包管理器
- 后端根目录作为 workspace 根
- API Server 作为业务 workspace
- 保留一份权威锁文件
- CI、生产、Staging、本地使用同一安装和构建口径
- PM2 启动路径与依赖安装路径匹配

#### B0 验收

```bash
powershell -NoProfile -ExecutionPolicy Bypass \
  -File scripts/maintenance/audit-backend-boundaries.ps1 -Strict
```

验收值：
- [ ] BLOCK = 0
- [ ] WARN 有明确接受记录或清零
- [ ] Prisma 验证通过
- [ ] API Server 完整构建通过
- [ ] 生产数据库副本迁移与回滚演练通过
- [ ] **P0-3 修复**：批次开始前回滚点 commit hash 已记录

### 3.5 阶段 4｜质量、治理与目录收口（2026-07-23—2026-07-26，建议延至 7-31）

#### Q1｜质量治理

- [ ] 更新 Release Checklist
- [ ] 固化 P0/P1/P2 验收报告
- [ ] 保存生产取证命令、时间、环境和输出
- [ ] 更新 v3 切换结论
- [ ] 更新 PRD 冻结决策

#### G1｜项目治理

- [ ] 更新 `START-HERE.md`
- [ ] 更新 `REPO-MAP.md`
- [ ] 更新 `ONBOARDING.md`
- [ ] 更新 `docs/文档索引.md`
- [ ] 固化最终批次和审计脚本
- [ ] 检查所有治理命令默认只读

#### R1｜根目录归位

**执行条件**（全部满足才执行）：
- 有效内容变更降到 25 项以内
- 产品代码和知识数据批次完成
- 后端 BLOCK 清零
- 当前批次有明确回滚点
- 整理预演与清理清单一致

**执行结果**：
- 部署脚本归入 `scripts/deploy/`
- 一次性脚本归档或移入明确工具目录
- 构建包与日志进入 `_archive/`
- 跨项目资产迁回所属项目
- 恢复产物进入仓库外部冷存储

#### 集中治理出口

- [ ] `audit:backend -Strict` 通过
- [ ] `audit:batches -Strict` 通过
- [ ] 根目录违规项为 0
- [ ] 当前活动批次有效变更 ≤25
- [ ] 文档索引完整
- [ ] 发布、回滚和取证链可执行
- [ ] 磁盘可用空间 ≥6G（P1-7 修复）

---

## 4. 测试用例

### 4.1 阶段 0 工具修复测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-S0-01 | 空暂存区运行 audit:changes | 正常返回，不报空对象错误 |
| TC-S0-02 | 只有未跟踪文件运行 audit:batches | 正常分类 |
| TC-S0-03 | 只有删除项运行 audit:changes | 正常分类 |
| TC-S0-04 | 跟踪+未跟踪混合运行 audit:batches -Strict | 返回 0 |
| TC-S0-05 | 49 个删除状态核对 | 41 项标为迁移，8 项有处置记录 |

### 4.2 G0 杂物清理测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-G0-01 | audit:junk 检查三个乱码文件 | 与基准文件逐字符一致 |
| TC-G0-02 | Office 锁文件匹配 | 仅 `~$` 前缀且 <1MB |
| TC-G0-03 | 时间戳备份归档 | 进入 `_archive/backups/` |

### 4.3 D1 历史迁移测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-D1-01 | audit:moves 核验 41 项 | 全部纯移动，Blob 哈希一致 |
| TC-D1-02 | git diff --summary --find-renames=50% | 重命名检出一致 |

### 4.4 B0 后端边界修复测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-B0-01 | prisma validate | 通过 |
| TC-B0-02 | prisma generate | 通过 |
| TC-B0-03 | npm run typecheck | 通过 |
| TC-B0-04 | npm test | 通过 |
| TC-B0-05 | rm -rf dist && npm run build | 通过 |
| TC-B0-06 | node scripts/verify-build.js | 通过（含 rule-knowledge-bindings.json） |
| TC-B0-07 | audit:backend -Strict | 返回 0 |
| TC-B0-08 | 后端仅一份 package-lock.json | grep -r yarn.lock 无结果 |
| TC-B0-09 | 全新克隆 + npm ci | 一次安装成功 |
| TC-B0-10 | 生产 DB 副本迁移 | 表结构一致，回滚 SQL 可执行 |

### 4.5 K2 向量检索 v3 测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-K2-01 | v2 默认路径回归 | 检索结果与基线一致 |
| TC-K2-02 | v3 缺文件错误 | 错误信息明确 |
| TC-K2-03 | embedding 行数 = 索引行数 | 一致 |
| TC-K2-04 | 服务器内存占用 | 符合生产约束 |
| TC-K2-05 | v3 评估达标后切换 | 评估报告通过 |

### 4.6 P1 经营看板测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-P1-01 | 前端异常上报 | 去重、限流、隐私边界通过 |
| TC-P1-02 | API 指标采集 | 30 秒聚合持久化 |
| TC-P1-03 | 未接入指标显示 | 显示"未接入" |
| TC-P1-04 | 看板数据追溯 | 可追溯到原始事件 |

### 4.7 P2 统一前台联动测试

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| TC-P2-01 | K线节点带入问事 | 证据完整 |
| TC-P2-02 | 取名候选收藏 | status='favorited' |
| TC-P2-03 | 取名候选淘汰 | status='eliminated' |
| TC-P2-04 | 取名候选恢复 | status='pending' |
| TC-P2-05 | 取名候选最终选择 | status='selected' |
| TC-P2-06 | 三语言 key 完整 | en/th/zh-CN 一致 |

---

## 5. 部署说明

### 5.1 部署闸门（发布前必跑）

```bash
npm run audit:batches
npm run audit:backend
npm run audit:workspace
npm run typecheck
npm run test
npm run build
```

**P1-5 修复**：若 `audit:batches` 不可用，启用人工批次清单审核（项目负责人签字）+ `audit:backend` 双重确认。

### 5.2 部署 2｜B0 修复（schema 迁移）

**前置条件**：
- B0 批次本地验证全绿
- 生产 DB 已备份（`dev.db.bak.20260712.b0`）
- 磁盘空间 ≥6G

**部署步骤**：
```bash
# 服务器 DB 备份
ssh user@server
cd /opt/awkn-life/awkn-life-backend/apps/api-server/prisma
cp dev.db dev.db.bak.20260712.b0

# 执行迁移（按 schema 变更手动 ALTER，禁止 db push）
sqlite3 dev.db <<EOF
-- 恢复 ConsultDialogueTurn（或反向迁移）
-- 恢复 UserMemory.lastAccessedAt
-- 恢复 MemoryEmbedding（或删除服务链）
EOF

# 验证
sqlite3 dev.db "PRAGMA table_info(UserMemory);" | grep lastAccessedAt
sqlite3 dev.db ".tables" | grep -E "ConsultDialogueTurn|MemoryEmbedding"

# 切换锁文件
cd /opt/awkn-life/awkn-life-backend
rm -f apps/api-server/package-lock.json yarn.lock
npm ci
npm run build --workspace=api-server

# pm2 reload
pm2 reload awkn-life-backend --update-env
pm2 status
```

**健康检查**：
```bash
curl -s https://awkn.cn/life/api/v1/health/db | jq .
# 期望 { db: "connected", provider: "sqlite" }
```

### 5.3 部署 3｜K2 切换

**前置条件**：
- 部署 2 已成功
- v3 评估报告通过
- 离线模型已上传服务器

**部署步骤**：
```bash
# scp 知识服务
scp -r services/knowledge-service user@server:/opt/awkn-life/services/

# 切换环境变量
ssh user@server
cd /opt/awkn-life
# 编辑 .env，KNOWLEDGE_EMBED_VERSION=v3
pm2 reload knowledge-service --update-env
```

---

## 6. 回滚方案

### 6.1 代码回滚

> **P0-3 修复**：每个批次开始前必须记录回滚点 commit hash

| 部署批次 | 回滚命令 |
|---------|---------|
| 部署 1（治理工具） | `git reset --soft <阶段0回滚点hash>`（需用户授权） |
| 部署 2（B0 修复） | `cd /opt/awkn-life/awkn-life-backend/apps/api-server && rm -rf dist && cp -r dist.bak.20260712.b0 dist && cp prisma/dev.db.bak.20260712.b0 prisma/dev.db && pm2 reload awkn-life-backend --update-env` |
| 部署 3（K2 切换） | 编辑 .env 改回 `KNOWLEDGE_EMBED_VERSION=v2` + `pm2 reload knowledge-service` |
| 部署 4（P1/P2 功能） | `git revert <commit-sha>` + 重新部署 |

### 6.2 git 回滚

```bash
git revert <commit-sha>  # 单个 commit 回滚（首选）
# 或
git reset --soft HEAD~N  # 退回最近 N 个 commit（保留工作区，需用户授权）
```

**禁止**：`git reset --hard` 作用于整个工作区（治理计划 §9 禁止操作）。

### 6.3 DB 回滚

```bash
cd /opt/awkn-life/awkn-life-backend/apps/api-server/prisma
cp dev.db.bak.20260712.b0 dev.db
pm2 reload awkn-life-backend --update-env
```

### 6.4 回滚触发条件（P1-6 修复：量化阈值）

> 满足任一条件立即回滚

| 条件 | 阈值 | 回滚方式 |
|------|------|---------|
| 核心接口不可用 | 连续失败 ≥3 次（每次间隔 10s） | 自动回滚 |
| Prisma 字段/表错误 | 持续出现 ≥30s | 自动回滚 |
| 必需知识资产缺失 | 启动校验失败 | 自动回滚 |
| 用户咨询记录无法落库 | 连续 ≥5 条失败 | 人工评估 |
| 新版本错误率 | >发布前基线 ×1.5 | 人工评估 |
| 新版本错误率 | >发布前基线 ×2 | 自动回滚 |
| 数据迁移不可解释差异 | 任何 | 立即回滚 |

---

## 7. 验证清单

### 7.1 阶段 0 验证

- [ ] 工具修复：`audit:changes` 与 `audit:batches` 正常运行
- [ ] 空暂存区回归：4 场景全过
- [ ] 新基线生成：2026-07-12 audit 结果
- [ ] 49 删除核验：41 迁移 + 8 处置记录
- [ ] HEAD 记录：commit hash 已写入批次单
- [ ] 治理计划 v1.1：4 个 P0 修复

### 7.2 阶段 1 验证

- [ ] G0：三个乱码副本清理
- [ ] D1：41 项迁移提交完成
- [ ] K1：5 项知识导入测试通过

### 7.3 阶段 2 验证

- [ ] K2：v2/v3 切换测试通过
- [ ] P1：经营看板 12 指标可见
- [ ] P2：FrontdeskChat 整体功能链通过
- [ ] P3：文档与代码状态一致

### 7.4 阶段 3 验证（B0）

- [ ] BLOCK-01：ConsultDialogueTurn 恢复（或正式下线）
- [ ] BLOCK-02：lastAccessedAt 恢复（或服务移除）
- [ ] BLOCK-03：MemoryEmbedding 恢复（或服务链删除）
- [ ] BLOCK-04：单一锁文件 + npm workspaces
- [ ] BLOCK-05：assets-manifest 完整
- [ ] audit:backend -Strict 返回 0

### 7.5 阶段 4 验证

- [ ] Q1：Release Checklist 更新
- [ ] G1：START-HERE/REPO-MAP/ONBOARDING/文档索引 更新
- [ ] R1：根目录违规项为 0（条件触发）
- [ ] 磁盘空间 ≥6G

### 7.6 部署后验证（生产）

- [ ] PM2 online
- [ ] /health/db 返回 connected
- [ ] 核心接口（问事/取名/K线/用户资产）可用
- [ ] 日志无新增高频异常
- [ ] 前端错误采集正常
- [ ] 经营指标能够记录新版本数据

---

## 8. 风险与未确认项

### 8.1 高风险

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 阶段 0 工具修复失败 | 中 | 高 | Plan B 人工清单 + Plan C 暂停开发 |
| B0 Schema 迁移破坏生产数据 | 低 | 最高 | 副本验证 + 备份 + 回滚 SQL |
| P2 FrontdeskChat 拆 hunk 失配 | 中 | 高 | 整体提交，禁止手工拆分 |
| K2 v3 评估不达标 | 中 | 中 | 保留 v2 默认，v3 待评估 |
| 磁盘空间不足（3.9G） | 高 | 高 | R1 前清理 _archive + 日志 |
| 时间排期无 Buffer | 高 | 中 | 建议 v1.1 延长阶段 0 至 7-14，治理周期延至 7-31 |

### 8.2 未确认项

| 项 | 说明 | 确认方 | 确认时机 |
|----|------|--------|---------|
| BLOCK 数量 5 vs 3 | 治理计划 v1.0 第 21 行 vs 第 42 行 | 天火 | 阶段 0 升 v1.1 |
| ConsultDialogueTurn 处置策略 | 恢复 vs 正式下线 | 天火 + 产品 | B0 启动前 |
| MemoryEmbedding 处置策略 | 恢复 vs 删除服务链 | 天火 + 工程 | B0 启动前 |
| ADR-BACKEND-001 状态 | PROPOSED → ACCEPTED | 天火 | B0 启动前 |
| 8 项未核验删除目的 | 逐一说明 | 天火 | 阶段 0 |
| 磁盘清理策略 | _archive + 日志 + 跨项目资产 | 天火 + 运维 | R1 前 |
| 质量审核人独立性问题 | P1-2：质量审核人 ≠ 工程负责人 | 天火 | v1.1 发布前 |

---

## 9. 批次执行标准模板

> **P0-3 修复**：增加"回滚点 commit hash"强制字段

每个批次开始前必须填写：

```text
批次编号：
业务目标：
用户结果：
文件范围：
禁止混入：
数据影响：
生产影响：
验证命令：
回滚方式：
回滚点 commit hash：____（必填，= 批次开始前的工作区 HEAD hash；未记录则禁止开始批次）
数据库快照路径：____（涉及 DB 变更时必填）
前端 dist.prev 路径：____（涉及前端构建时必填）
负责人：
审核人：____（P1-2 修复：审核人 ≠ 负责人）
```

每个批次结束时必须提供：
1. 文件清单
2. 代码或文档差异摘要
3. 测试与审计结果
4. 未完成项
5. 风险接受记录
6. 回滚命令
7. 下一批依赖

---

## 10. 下游消费

| 消费方 | 消费方式 | 触发时机 |
|--------|---------|---------|
| `@程序员` | 按本包 §3 派工执行阶段 0-4 | 用户授权后立即 |
| `awkn-审核` | 按本包 §4 测试用例 + §7 验证清单做阶段审查门禁 | 每个阶段完成时 |
| `awkn-部署` | 按本包 §5 部署说明做 5 批次部署 | 阶段 1/3/2/2/4 完成时 |
| `awkn-工程文档` | 按本包生成长期工程文档（技术参考） | 本包完成后立即 |
| `天火` | 按本包 §8 未确认项做决策 | 各阶段启动前 |

---

## 11. 交接签字

| 角色 | 签字 | 日期 |
|------|------|------|
| 编制（天火） | AI 生成 | 2026-07-12 |
| 审查（awkn-审核） | 待签 | — |
| 执行（@程序员） | 待签 | — |
| 部署（awkn-部署） | 待签 | — |
| 用户拍板 | 待签 | — |

> **P0-4 修复**：本交接包需经独立审核人批判性审查后方可生效（见 §12）。

---

## 12. 批判性审查记录（P0-4 修复）

> 依据 RULE CRITIQUE-BEFORE-COMPLETE：闭环交付前必须经过批判性审查环节（假设前序有 3 项隐藏缺陷主动证伪）

### 12.1 假设的 3 项隐藏缺陷及证伪

| 编号 | 假设的隐藏缺陷 | 证伪结果 | 状态 |
|------|--------------|---------|------|
| H1 | 批次执行标准仍缺"审核人 ≠ 负责人"强制约束 | §9 已增加"审核人 ≠ 负责人"字段 | 已修复 |
| H2 | 部署闸门降级路径未覆盖 K2 切换场景 | §5.1 仅覆盖 audit:batches 不可用，K2 切换降级未定义 | **待 v1.1 补充** |
| H3 | 回滚触发条件未区分"自动"与"人工" | §6.4 已区分自动回滚（错误率 ×2）与人工评估（×1.5） | 已修复 |

### 12.2 审查结论

**结论**：**有条件放行**

**条件**：
1. H2（K2 切换降级路径）在 v1.1 补充
2. 治理计划 v1.1 发布后，本交接包同步升 v1.1
3. 独立审核人签字（非天火）

**残余风险**：
- 时间排期仍偏紧（v1.1 建议延长）
- 磁盘空间 3.9G 可能不足（R1 前必须清理）

---

## 13. 修订记录

| 日期 | 版本 | 修订 | 修订人 |
|------|------|------|--------|
| 2026-07-12 | v0.1 | 首次生成（基于治理计划 v1.0 + 批判性分析 + 批次计划 + 后端审计 + ADR + ground-truth） | 天火 + awkn-工程文档 |
