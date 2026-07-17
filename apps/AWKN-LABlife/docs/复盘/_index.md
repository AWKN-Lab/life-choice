# 复盘目录索引

> 本目录记录 P1-B+P2-B 部署复盘及关联的 E 经验、决策、PRD
> 项目：人生决策宗师 / apps/AWKN-LABlife
> 创建时间：2026-06-27

## 文档结构

```
docs/复盘/
├── _index.md                              # 本文件
├── _log.md                                # 操作日志
├── raw/
│   └── 2026-06-27-p1b-p2b-deployment-evidence.md  # 部署原始证据（raw 来源）
├── E230_npm-install中断导致node_modules不完整_部署完整性校验门.md  # 🔴 critical
├── E231_单包npm-install自动补齐缺失依赖_故障快速恢复模式.md       # 🟡 medium
├── E232_部署后必做4验_unstable_restarts判稳_部署验收门升级.md      # 🟡 medium
├── 2026-06-27_P1B-P2B部署复盘决策.md      # 部署决策（候选方案 + 最终选择）
└── 2026-06-27_P1B-P2B-PRD.md              # 产品需求文档（v0.1 已上线）
```

## E 经验沉淀（3 条）

| E 编号 | 主题 | 严重度 | 用途 |
|--------|------|--------|------|
| E230 | npm install 中断 → 部署完整性校验门 | 🔴 critical | 预防下次部署 |
| E231 | 单包 npm install → 故障快速恢复模式 | 🟡 medium | < 60s 恢复 |
| E232 | 部署后必做 4 验 + unstable_restarts → 部署验收门升级 | 🟡 medium | 5 件套验证 |

## 决策与 PRD（2 条）

| 日期 | 文档 | 状态 |
|------|------|------|
| 2026-06-27 | P1-B+P2-B 部署复盘决策 | ✅ PASS |
| 2026-06-27 | P1-B+P2-B PRD v0.1 | ✅ shipped |

## 部署结果

- **服务**: awkn-life-backend（PM2 id 48）
- **状态**: online, uptime 2m+
- **健康检查**: 3/3 通过
- **5 件套验证**: 全通过
- **EVIDENCE_PACKAGE_ENABLED**: 默认 false（灰度关闭）

## 关联文档

- `../raw/2026-06-27-p1b-p2b-deployment-evidence.md` - 原始证据
- `../../DEPLOY.md` 第 2.6 节、第六章 - 已更新
- `../../deploy.sh` - 已集成 Q3 P0-6（chmod 门）+ Q3 P0-7（5 件套验证）
- `../../scripts/verify-deploy.sh` - 新增 5 件套验证脚本

## 待用户手动同步

由于工具沙箱不允许写入 `C:\Users\10919\Desktop\AWKN-Lab\记忆系统\`，以下同步需用户手动：

1. 复制 3 个 E 文件到 `记忆系统/02-evolution/`
2. 复制决策文档到 `记忆系统/01-decisions/`
3. 更新 `记忆系统/00-memory-control/E编号索引表.md`
4. 更新 `记忆系统/01-decisions/_index.md`

详见 `_log.md` 末尾"待用户手动同步"章节。