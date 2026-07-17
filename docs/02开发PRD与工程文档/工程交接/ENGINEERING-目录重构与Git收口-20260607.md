# ENGINEERING — 目录重构与 Git 收口

**日期**: 2026-06-07
**版本**: v1

---

## 变更概述

将 `人生决策宗师` 从 `AWKN-Lab` 大仓库的脏子目录，整理为独立 Git 仓库，顶层收敛为 6 类主目录。

## 迁移前后目录对照

### 顶层目录

| 迁移前 | 迁移后 | 说明 |
|--------|--------|------|
| `AWKN-LABlife/` | `apps/AWKN-LABlife/` | 主线产品 |
| `xuanxue-app/` | `references/projects/xuanxue-app/` | 旧前端 |
| `xuanxue-backend/` | `references/projects/xuanxue-backend/` | 旧后端 |
| `bazi-master/` | `references/projects/bazi-master/` | 八字算法 |
| `AW-life/` | `references/projects/AW-life/` | AW-life |
| `无法判断/` | `references/projects/legacy-unknown/` | 未分类旧项目 |
| `knowledge-base/` | `knowledge/knowledge-base/` | 知识库 |
| `东方术数/` | `knowledge/eastern-metaphysics/` | 东方术数资料 |
| `奇门遁甲/` | `knowledge/qimen-suite/` | 奇门遁甲 |
| `md_converted/` | `_archive/data-dumps/md_converted/` | 一次性转换结果 |
| `其它/` (术数部分) | `knowledge/eastern-metaphysics/` | 合并到术数资料 |
| `其它/` (非术数) | `references/materials/misc/` | 非术数参考 |
| `projects/` | `references/projects/coze-skills/` | Coze 技能 |
| `references/` (网站抓取) | `references/materials/` | 外部资料 |

### 顶层散落文件

| 迁移前 | 迁移后 |
|--------|--------|
| `batch_*.py`、`ocr_*.py`、`scan_*.py` 等 | `scripts/ocr/` |
| `auto_deploy.ps1`、`deploy_frontend.ps1`、`update.sh` | `scripts/deploy/` |
| `人生决策宗师_LLM审核报告_2026-05-11.md` | `docs/audits/` |
| `*.tar.gz`、`*.zip` | `_archive/packages/` |
| `alice-tool-web_fetch-1cae6d4d.txt`、`pdf_scan_report.json`、`nul` | `_archive/tmp/` |

## Git 边界变更

| 项目 | 变更前 | 变更后 |
|------|--------|--------|
| `人生决策宗师` | AWKN-Lab 子目录，无独立 Git | 独立 Git 仓库 |
| `AWKN-LABlife/.git` | 保留 | 保留（嵌套仓） |
| `xuanxue-app/.git` | 保留 | 保留（嵌套仓） |
| `xuanxue-backend/.git` | 保留 | 保留（嵌套仓） |
| `无法判断/.git` | 保留 | 保留为 `legacy-unknown/.git`（嵌套仓） |

## .gitignore 新增规则

- `_archive/` — 归档不提交
- `.cursor/`、`.trae/`、`.claude/` — IDE 配置
- `.mineru-env/`、`.ruff_cache/` — 工具缓存
- `.uploads/`、`.deploy/` — 运行时目录
- `references/projects/*/.git/`、`apps/*/.git/` — 嵌套仓 .git 隔离

## 新增文档

- `REPO-MAP.md` — 仓库地图
- `docs/ENGINEERING-目录重构与Git收口-20260607.md` — 本文件

## 验证结果

| 验证项 | 结果 | 证据 |
|--------|------|------|
| 6 类顶层目录结构 | PASS | apps/knowledge/references/scripts/docs/_archive 均存在 |
| 主线项目归入 apps/ | PASS | apps/AWKN-LABlife/ 存在且完整 |
| 旧项目归入 references/projects/ | PASS | 6 个旧项目均已归入 |
| 知识资产重组 | PASS | knowledge/ 下 4 个子目录 |
| 顶层散落文件清理 | PASS | 顶层无 .py/.ps1/.zip/.tar.gz |
| Git 边界独立 | PASS | git rev-parse --show-toplevel 返回自身 |
| .gitignore 规则 | PASS | 排除缓存/归档/嵌套仓/3rdparty |
| REPO-MAP.md | PASS | 含技术索引引用 |
| 损坏嵌套 .git 清理 | PASS | legacy-unknown/xuanxue-app/AWKN-LABlife/qimen-suite 等嵌套 .git 已删除 |
| Git 首次提交 | PASS | 2026-06-10 完成独立仓库初始化（commit 6811221） |

验证日期：2026-06-10
验证结论：全部 PASS，目录重构与 Git 收口完成。
