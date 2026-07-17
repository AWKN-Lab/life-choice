# 人生决策宗师｜工程入门

> 版本：v1.2
> 更新：2026-07-11

## 1. 先读什么

| 顺序 | 文件 | 用途 |
|---:|---|---|
| 1 | `START-HERE.md` | 当前主线、目录规则和工作前检查 |
| 2 | `docs/文档索引.md` | 产品与工程文档总导航 |
| 3 | `docs/01产品定位与PRD/` | 产品目标、模块边界和闭环 |
| 4 | `docs/02开发PRD与工程文档/工程交接/ENGINEERING-当前生产技术基线-20260707.md` | 当前生产工程事实 |
| 5 | `apps/AWKN-LABlife/CLAUDE.md` | 核心工程认知与开发约束 |
| 6 | `apps/AWKN-LABlife/DEPLOY.md` | 部署、回滚和运行规则 |

## 2. 工作前检查

```bash
git status --short
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
npm run audit:workspace
```

当前仓库可能同时存在多个开发批次的未提交改动。只修改自己负责的文件，禁止使用全仓重置、批量覆盖和无范围格式化。

## 3. 项目定位

**人生决策宗师（Mr.Mont）** 是 AWKN-Lab 的 AI 人生决策产品，当前核心能力包括：

- 问事与大六壬推演。
- 子平八字与命运 K 线。
- 取名与候选比较。
- 用户资产、人物关系、事项记忆、追问和复访。
- 算法证据、知识检索、LLM 生成和质量门禁。

## 4. 生产代码位置

```text
apps/AWKN-LABlife/
├── app/                    # React + Vite 前端
├── awkn-life-backend/      # NestJS 后端
├── services/knowledge-service/
├── scripts/                # 应用级运维脚本
├── nginx/
├── DEPLOY.md
└── CLAUDE.md
```

所有新功能先确认现有模块和数据契约，避免在根目录或旧参考项目中另建实现。

## 5. 快速启动

### 根目录安装

```bash
npm install
```

### 前端

```bash
cd apps/AWKN-LABlife/app
npm install
npm run dev
```

### 后端

```bash
cd apps/AWKN-LABlife/awkn-life-backend
npm install
npm run dev
```

### 全仓命令

```bash
npm run build
npm run test
npm run lint
npm run typecheck
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
npm run audit:workspace
```

## 6. 文档写入位置

| 内容 | 目录 |
|---|---|
| 商业目标与路线 | `docs/01商业计划/` |
| 产品 PRD | `docs/01产品定位与PRD/` |
| 工程交接与技术事实 | `docs/02开发PRD与工程文档/` |
| 历史过程与完成记录 | `docs/03开发过程稿/` |
| 复盘 | `docs/04复盘总结/` |
| 审核、取证与发布质量 | `docs/05审核与质量/` |
| IDE 配置与会话记忆 | `docs/06IDE配置与记忆/` |
| 目录治理 | `docs/00项目治理/` |

## 7. 知识资产边界

| 路径 | 用途 |
|---|---|
| `knowledge/processed/` | 当前生产索引与处理产物 |
| `knowledge/asset-ledger/` | 来源链、资产登记和可达性 |
| `knowledge/eastern-metaphysics/` | 原始术数资料 |
| `knowledge/knowledge_base/metaphysics.db` | 只读恢复数据库与冷备 |
| `knowledge/knowledge-base/` | 历史知识工程，后续拆分 |

知识路径存在广泛引用。调整目录或文件名之前必须先扫描引用并设计回滚。

## 8. 提交纪律

1. 一个提交服务一个目标。
2. 目录迁移与功能开发分开提交。
3. 构建包、日志、数据库、备份、恢复资产不提交。
4. 新接口同步更新 DTO、服务、测试和工程文档。
5. 新产品逻辑同步更新 PRD 与数据闭环。
6. 提交前运行相关测试和类型检查。

## 9. 当前工程治理

- 唯一入口：`START-HERE.md`。
- 仓库地图：`REPO-MAP.md`。
- 清理基线：`docs/00项目治理/目录治理基线-20260711.md`。
- 清理清单：`docs/00项目治理/根目录清理清单-20260711.md`。
- 提交批次：`docs/00项目治理/提交批次计划-20260711.md`。
- 后端风险：`docs/00项目治理/后端包管理与Schema风险-20260711.md`。
- 自动审计：`scripts/maintenance/workspace-audit.ps1`。
- 变更分流：`scripts/maintenance/workspace-change-map.ps1`。
- 迁移核验：`scripts/maintenance/verify-document-moves.ps1`。
- 杂物核验：`scripts/maintenance/cleanup-verified-junk.ps1`。
- 后端边界闸门：`scripts/maintenance/audit-backend-boundaries.ps1`。
- 提交批次地图：`scripts/maintenance/workspace-batch-map.ps1`。
- 后端审计结果：`docs/00项目治理/后端边界审计结果-20260711.md`。
- 后端 ADR：`docs/00项目治理/ADR-后端依赖安装与构建边界-20260711.md`。
- 换行策略：根目录 `.gitattributes`。

## 10. 遇到不确定路径时

先检查：

1. `docs/文档索引.md` 是否已标记 ACTIVE。
2. 当前生产基线是否引用该路径。
3. 源码与部署脚本是否仍在调用。
4. Git 状态是否存在未提交改动。
5. 清理清单是否已经给出归属。

确认后再改动。
