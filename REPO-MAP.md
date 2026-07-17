# REPO-MAP｜人生决策宗师仓库地图

> 最后更新：2026-07-11
> 工程入口：`START-HERE.md`
> 目录治理：`docs/00项目治理/目录治理基线-20260711.md`
> 提交批次：`docs/00项目治理/提交批次计划-20260711.md`
> 后端风险：`docs/00项目治理/后端包管理与Schema风险-20260711.md`

## 1. 当前生产主线

| 层级 | 路径 | 职责 |
|---|---|---|
| 核心产品 | `apps/AWKN-LABlife/` | 当前可运行项目 |
| 前端 | `apps/AWKN-LABlife/app/` | React + Vite + TypeScript |
| 后端 | `apps/AWKN-LABlife/awkn-life-backend/` | NestJS + Prisma + BullMQ |
| API 入口 | `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/` | 生产 API |
| 知识服务 | `apps/AWKN-LABlife/services/knowledge-service/` | Python 检索服务 |
| 部署规则 | `apps/AWKN-LABlife/DEPLOY.md` | 部署、回滚与运行要求 |
| 当前生产基线 | `docs/02开发PRD与工程文档/工程交接/ENGINEERING-当前生产技术基线-20260707.md` | 当前工程事实第一入口 |

## 2. 顶层目录

| 目录 | 状态 | 职责 |
|---|---|---|
| `apps/` | ACTIVE | 生产应用与运行服务 |
| `docs/` | ACTIVE | 产品、商业、工程、复盘、质量和 IDE 文档 |
| `knowledge/` | ACTIVE | 知识原料、处理产物、生产索引、资产台账与冷备 |
| `references/` | REFERENCE | 旧项目和外部材料 |
| `scripts/` | ACTIVE | 部署、知识处理、OCR、维护与调试脚本 |
| `reports/` | ACTIVE | 可复现的工程检查结果 |
| `记忆系统/` | ACTIVE | 项目目标、决策、演进和会话记忆 |
| `_archive/` | LOCAL ARCHIVE | 本地归档，不提交 Git |

## 3. 文档结构

| 目录 | 职责 |
|---|---|
| `docs/00项目治理/` | 仓库结构、目录边界、清理清单、提交批次、风险隔离和治理规则 |
| `docs/01产品定位与PRD/` | 产品总 PRD、模块 PRD、功能方案和决策记录 |
| `docs/01商业计划/` | 商业目标、北极星指标、阶段路线和经营看板 |
| `docs/02开发PRD与工程文档/` | 工程交接、接口、数据库、部署、测试和技术参考 |
| `docs/03开发过程稿/` | 历史需求、过程记录、已完成计划和案例材料 |
| `docs/04复盘总结/` | 项目复盘、事故复盘和经验沉淀 |
| `docs/05审核与质量/` | 模型审核、工程检查、生产取证和发布质量 |
| `docs/06IDE配置与记忆/` | IDE 配置、会话上下文、演进规则和复盘镜像 |
| `docs/02产品需求 (PRD)/` | DEPRECATED，保留历史链接兼容 |

全量导航采用 `docs/文档索引.md`。

## 4. 知识资产结构

| 目录 | 当前职责 | 约束 |
|---|---|---|
| `knowledge/processed/` | 当前生产索引、向量和处理产物 | 约 9.3GB，禁止无计划移动 |
| `knowledge/asset-ledger/` | 资产登记、来源链与可达性记录 | 生产治理资产 |
| `knowledge/eastern-metaphysics/` | 原始术数资料 | 大文件按 Git 规则管理 |
| `knowledge/knowledge_base/` | `metaphysics.db` 恢复数据库与冷备 | 多处路径引用，暂时保持原位 |
| `knowledge/knowledge-base/` | 历史知识工程、OCR、脚本和小型数据库 | REFERENCE，后续按职责拆分 |
| `knowledge/qimen-suite/` | 奇门相关资料与代码 | REFERENCE / 专项资产 |
| `apps/knowledge/` | 小型 Chroma 数据 | 待确认运行状态 |

知识目录的后续收口顺序：生产索引清单 → 冷备定义 → 引用扫描 → 历史工程拆分。

## 5. 脚本结构

| 目录 | 职责 |
|---|---|
| `scripts/deploy/` | 部署与生产操作 |
| `scripts/git-hooks/` | Git 钩子与提交治理 |
| `scripts/maintenance/` | 工作区审计和项目维护 |
| `scripts/ocr/` | OCR 与格式转换 |
| `scripts/tools/` | 可复用调试工具 |
| `scripts/__tests__/` | 脚本测试 |

根目录仍有部分历史脚本。后续按知识处理、部署、维护、工具、归档五类收口。

## 6. 当前特殊目录

| 目录 | 当前状态 | 后续动作 |
|---|---|---|
| `_recovered_assets/` | 约 2.4GB，只读恢复资产 | 迁入仓库外部冷存储，保留台账引用 |
| `dangling-probe-analysis/` | 约 912MB 恢复分析产物 | 进入冷归档 |
| `_dangling_probe/` | 一次性恢复工具 | 进入恢复工具归档 |
| `_tmp_runtime_logs/` | 运行日志 | 进入运行时归档 |
| `backend-backups/` | 后端备份 | 进入备份归档 |
| `server-backups/` | 服务器备份 | 进入备份归档 |
| `ziwei-doushu/` | 独立 Git 仓库 | 迁入参考项目区或仓库外部 |
| `人生决策智能体/` | 研究与系统母文档 | 完成价值审查后归入参考或过程文档 |
| `人生决策宗师-体验升级/` | 设计交付资产 | 归入参考设计材料或独立设计项目 |
| `lingyang-investment-deck*` | 凌扬运动跨项目资产 | 移回凌扬运动项目 |

逐项清单见 `docs/00项目治理/根目录清理清单-20260711.md`。

## 7. 根目录契约

根目录允许保留：

- 项目入口：`README.md`、`START-HERE.md`、`ONBOARDING.md`、`REPO-MAP.md`。
- 全仓规则：`constitution.md`、`AI-ENTRY-PROTOCOL.md`、`KNOWLEDGE-MAP.md`、`SHARED_CONTEXT.md`。
- 工程配置：`package.json`、`package-lock.json`、`turbo.json`、`.gitattributes`、Git、Husky 和 Commitlint 配置。
- 一级领域目录：`apps/`、`docs/`、`knowledge/`、`references/`、`scripts/`、`reports/`、`记忆系统/`。

交付物、构建包、日志、数据库、临时脚本和跨项目资产不得长期留在根目录。

## 8. Git 与嵌套仓库

- 主仓库：`AWKN-Lab/Mr.Mont`，分支 `main`。
- `ziwei-doushu/` 当前含独立 `.git`，主仓通过 `.gitignore` 排除。
- 生产应用当前归入主仓管理。
- 构建产物、依赖、运行时、备份、数据库和恢复资产采用 Git 忽略规则。

## 9. 只读审计

```bash
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
npm run audit:workspace
npm run organize:workspace
```

脚本覆盖：工作区分流、文档迁移核验、可验证杂物、后端依赖与 Schema 闸门、提交批次地图、根目录契约、高风险文件、隔离目录和知识目录职责。整理命令默认 DRY-RUN。

## 10. 进入项目的阅读顺序

1. `START-HERE.md`
2. `docs/文档索引.md`
3. 当前模块 PRD
4. `ENGINEERING-当前生产技术基线-20260707.md`
5. `apps/AWKN-LABlife/CLAUDE.md`
6. 目标模块源码与测试
