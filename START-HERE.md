# START HERE｜人生决策宗师工程入口

> 更新日期：2026-07-12
> 适用对象：产品负责人、开发者、测试、运维、AI 编程助手

## 1. 当前主线

| 项目层 | 唯一路径 | 说明 |
|---|---|---|
| 生产代码 | `apps/AWKN-LABlife/` | 前端、后端、知识服务、部署配置 |
| 产品需求 | `docs/01产品定位与PRD/` | 产品总 PRD、模块 PRD、用户资产与闭环 |
| 工程事实 | `docs/02开发PRD与工程文档/工程交接/ENGINEERING-当前生产技术基线-20260707.md` | 代码、进程、数据库、知识库、发布风险 |
| 产品文档索引 | `docs/文档索引.md` | ACTIVE / REFERENCE / DEPRECATED 状态 |
| 知识资产 | `knowledge/` | 原始资料、处理产物、资产台账、冷备数据库 |
| 项目治理总控 | `docs/00项目治理/项目治理计划-v1.0-20260712.md` | 两周集中治理、长期机制、责任边界、阶段闸门与完成标准 |
| 项目治理 | `docs/00项目治理/` | 目录边界、清理清单、治理规则 |
| 自动审计 | `npm run audit:workspace` | 只读检查根目录、缓存、备份、嵌套仓库和大目录 |
| 变更分流 | `npm run audit:changes` | 按产品代码、工程文档、知识数据、历史迁移和治理拆分当前工作区 |
| 批次计划 | `docs/00项目治理/提交批次计划-20260711.md` | 当前变更的提交顺序、范围、验证命令和闸门 |
| 后端风险 | `docs/00项目治理/后端包管理与Schema风险-20260711.md` | 锁文件、构建资产、包管理器与 Prisma Schema 隔离清单 |
| 后端闸门 | `npm run audit:backend` | 自动检查依赖、构建资产和 Prisma 冲突 |
| 提交地图 | `npm run audit:batches` | 将真实内容变更分配到可独立提交的工程批次 |

## 2. 开始工作前

```bash
git status --short
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
npm run audit:workspace
npm run organize:workspace   # 仅预演，不移动文件
```

当前工作区存在多批尚未提交的业务代码、测试和文档改动。开始开发前先确认自己的修改范围，禁止批量覆盖、批量格式化或重置整个工作区。

2026-07-12 现场提示：`audit:changes` 与 `audit:batches` 在空暂存区场景出现兼容错误，已列入治理计划阶段 0。修复并回归通过前，禁止依据旧批次结果执行批量暂存。

## 3. 目录写入规则

| 内容 | 写入位置 |
|---|---|
| 运行代码 | `apps/AWKN-LABlife/` |
| 产品决策与 PRD | `docs/01产品定位与PRD/` |
| 工程交接、接口、数据库、部署、测试 | `docs/02开发PRD与工程文档/` |
| 过程材料与历史执行记录 | `docs/03开发过程稿/` |
| 复盘 | `docs/04复盘总结/` |
| 审核、取证、质量报告 | `docs/05审核与质量/` |
| IDE 会话与记忆镜像 | `docs/06IDE配置与记忆/` |
| 原始知识资料 | `knowledge/eastern-metaphysics/` |
| 知识处理产物 | `knowledge/processed/` |
| 知识资产台账 | `knowledge/asset-ledger/` |
| 临时恢复材料 | `_recovered_assets/`，只读，Git 忽略 |
| 一次性生成物、压缩包、日志 | `_archive/` 或项目外部，禁止放根目录 |
| 其他项目资产 | 移回对应项目目录，禁止进入本仓库根目录 |

## 4. 根目录允许保留的内容

根目录只保留以下四类：

1. 工程入口：`README.md`、`START-HERE.md`、`ONBOARDING.md`、`REPO-MAP.md`。
2. 工程规则：`constitution.md`、`AI-ENTRY-PROTOCOL.md`、`KNOWLEDGE-MAP.md`、`SHARED_CONTEXT.md`。
3. Monorepo 配置：`package.json`、`package-lock.json`、`turbo.json`、`.gitattributes`、Git/Husky 配置。
4. 一级领域目录：`apps/`、`docs/`、`knowledge/`、`references/`、`scripts/`、`reports/`、`记忆系统/`。

其他根目录文件进入治理清单，经过来源确认后再迁移或清除。

## 5. 禁止直接操作的路径

以下路径承载生产代码、用户未提交修改或大体量知识数据：

- `apps/AWKN-LABlife/`
- `knowledge/processed/`
- `knowledge/knowledge_base/metaphysics.db`
- `knowledge/asset-ledger/`
- `docs/01产品定位与PRD/`
- `docs/02开发PRD与工程文档/`

涉及移动、重命名、删除、数据库重建时，必须先建立备份、引用扫描和回滚方案。

## 6. 常用命令

```bash
# 工程审计、变更分流、迁移核验、杂物核验、后端闸门、提交地图与整理预演
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
npm run audit:workspace
npm run organize:workspace

# 全仓构建 / 测试 / 类型检查
npm run build
npm run test
npm run typecheck

# 前端
cd apps/AWKN-LABlife/app
npm run dev

# 后端
cd apps/AWKN-LABlife/awkn-life-backend
npm run dev
```

## 7. 当前治理重点

1. 清除根目录中的跨项目资产、构建包、日志和临时文件。
2. 收口 `knowledge/knowledge-base/`、`knowledge/knowledge_base/`、`knowledge/processed/` 的职责边界。
3. 将旧项目、嵌套 Git 仓库和设计交付物移出生产仓库。
4. 将一次性脚本分入 `scripts/knowledge/`、`scripts/deploy/`、`scripts/maintenance/` 和归档区。
5. 提交前保持 Git 工作区可解释：每批提交只服务一个工程目标。

详细基线见：

- `docs/00项目治理/目录治理基线-20260711.md`
- `docs/00项目治理/工作区变更分流-20260711.md`
- `docs/00项目治理/历史文档迁移核验-20260711.md`
- `docs/00项目治理/提交批次计划-20260711.md`
- `docs/00项目治理/后端包管理与Schema风险-20260711.md`
- `docs/00项目治理/后端边界审计结果-20260711.md`
- `docs/00项目治理/ADR-后端依赖安装与构建边界-20260711.md`
