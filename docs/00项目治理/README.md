# 00 项目治理

本目录维护仓库结构、目录边界、清理清单和工程治理规则。

## 当前文档

| 文档 | 用途 |
|---|---|
| `项目治理计划-v1.0-20260712.md` | 两周集中治理、长期机制、责任边界、阶段闸门和完成标准 |
| `目录治理基线-20260711.md` | 当前目录体检、目标结构、风险分级和迁移顺序 |
| `根目录清理清单-20260711.md` | 逐项记录根目录与大体量目录的处理建议 |
| `治理执行结果-20260711.md` | 已完成动作、验证结果、保护条件和后续批次 |
| `工作区变更分流-20260711.md` | 当前变更按功能线分组、风险点、收口顺序和迁移条件 |
| `历史文档迁移核验-20260711.md` | 41 个文档与规格移动项的 Blob 哈希核验与提交条件 |
| `提交批次计划-20260711.md` | 当前 217 项真实内容变更的批次顺序、范围、闸门和验收命令 |
| `后端包管理与Schema风险-20260711.md` | 锁文件、构建资产、包管理器与 Prisma Schema 风险隔离 |
| `后端边界审计结果-20260711.md` | `audit:backend` 的 5 个阻断项、证据与发布闸门 |
| `ADR-后端依赖安装与构建边界-20260711.md` | npm workspaces、单一锁文件、CI 与 PM2 边界提案 |

## 治理原则

1. 生产代码、产品文档、工程文档、知识资产、生成物分区存放。
2. 根目录只保留工程入口、规则、Monorepo 配置和一级领域目录。
3. 批量移动前先扫描引用，批量删除前先建立可验证备份。
4. 当前未提交业务改动优先保护，目录整理不得覆盖开发现场。
5. 所有治理动作都要有清单、验证结果和回滚路径。

## 只读审计

```bash
npm run audit:workspace
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
```

脚本位置：

- `scripts/maintenance/workspace-audit.ps1`：只读目录审计。
- `scripts/maintenance/workspace-change-map.ps1`：只读变更分流。
- `scripts/maintenance/verify-document-moves.ps1`：只读文档迁移核验。
- `scripts/maintenance/cleanup-verified-junk.ps1`：默认预演，只处理通过内容一致性核验的杂物。
- `scripts/maintenance/audit-backend-boundaries.ps1`：只读检查包管理、构建、资产清单和 Prisma 边界。
- `scripts/maintenance/workspace-batch-map.ps1`：只读生成提交批次地图与安全暂存命令文本。
- `scripts/maintenance/workspace-organize.ps1`：默认预演；工作区满足安全条件后才允许执行归位。
