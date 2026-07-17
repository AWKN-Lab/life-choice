# 人生决策宗师全项目目录重构与 Git 边界收口 Spec

## Why
当前 `人生决策宗师` 目录是 `AWKN-Lab` 大仓库的脏子目录，顶层散落脚本/压缩包/临时文件，嵌套 Git 仓混乱，知识与参考资产无统一入口，导致开发定位困难、Git 管理失控、新人上手成本高。

## What Changes
- 收口顶层为 6 类主目录：`apps/`、`knowledge/`、`references/`、`scripts/`、`docs/`、`_archive/`
- 将旧项目（xuanxue-app、xuanxue-backend、bazi-master、AW-life、无法判断）迁入 `references/projects/`
- 重组知识资产（东方术数、奇门遁甲、knowledge-base、md_converted、其它）到 `knowledge/` 统一入口
- 收口顶层散落脚本到 `scripts/`，散落文档到 `docs/`，压缩包/临时文件到 `_archive/`
- 建立独立 Git 仓库边界，处理嵌套 .git，更新 .gitignore
- 新增 REPO-MAP.md，更新 README.md 与 ONBOARDING.md
- **BREAKING**：所有引用旧路径的脚本/配置/文档需同步更新路径

## Impact
- Affected specs: 无业务 API/数据库/运行时代码变更
- Affected code: 所有引用顶层散落文件路径的脚本、README.md、ONBOARDING.md、PLAN.md、.gitignore
- Affected workflows: 开发者启动路径从 `AWKN-LABlife/app` 变为 `apps/AWKN-LABlife/app`；部署脚本路径同步变更

## ADDED Requirements

### Requirement: 顶层目录结构收口
系统 SHALL 将 `人生决策宗师` 顶层收敛为以下结构：

```
人生决策宗师/
├── apps/                    # 当前可运行项目
│   └── AWKN-LABlife/       # 主线产品
├── knowledge/               # 知识库与术数资料
│   ├── knowledge-base/      # 原知识库
│   ├── eastern-metaphysics/ # 东方术数
│   ├── qimen-suite/         # 奇门遁甲
│   └── processed/           # 有长期价值的中间资料
├── references/              # 旧项目与外部参考
│   ├── projects/            # 旧项目代码
│   └── materials/           # 外部抓取资料
├── scripts/                 # 工具脚本
│   ├── ocr/                 # OCR/转换脚本
│   └── deploy/              # 部署脚本
├── docs/                    # 项目文档
│   └── audits/              # 审核报告
├── _archive/                # 过期/临时/备份
│   ├── packages/            # 压缩包
│   ├── data-dumps/          # 一次性转换结果
│   └── tmp/                 # 临时文件
├── README.md
├── ONBOARDING.md
├── PLAN.md
├── REPO-MAP.md
├── constitution.md
└── .gitignore
```

#### Scenario: 顶层无散落文件
- **WHEN** 完成目录重构
- **THEN** 顶层目录下不存在 `.py`、`.ps1`、`.zip`、`.tar.gz`、`.txt`（非元文件）、`.json`（非配置）等散落文件

### Requirement: 主线项目迁入 apps/
系统 SHALL 将 `AWKN-LABlife/` 迁移到 `apps/AWKN-LABlife/`。

#### Scenario: 主线项目可正常运行
- **WHEN** 执行 `cd apps/AWKN-LABlife/app && npm install && npm run dev`
- **THEN** 前端正常启动

#### Scenario: 主线项目保留 Git 历史
- **WHEN** 在 `apps/AWKN-LABlife/` 下执行 `git log`
- **THEN** 可看到原有提交历史

### Requirement: 旧项目迁入 references/projects/
系统 SHALL 将以下目录迁入 `references/projects/`：
- `xuanxue-app/` → `references/projects/xuanxue-app/`
- `xuanxue-backend/` → `references/projects/xuanxue-backend/`
- `bazi-master/` → `references/projects/bazi-master/`
- `AW-life/` → `references/projects/AW-life/`
- `无法判断/` → `references/projects/legacy-unknown/`

#### Scenario: 旧项目目录完整存在
- **WHEN** 检查 `references/projects/` 目录
- **THEN** 上述 5 个目录均完整存在，内容与迁移前一致

#### Scenario: 旧项目 Git 保留
- **WHEN** 在 `references/projects/xuanxue-app/` 下执行 `git log`
- **THEN** 可看到原有提交历史

### Requirement: 知识资产重组到 knowledge/
系统 SHALL 将知识类目录统一迁入 `knowledge/`：
- `knowledge-base/` → `knowledge/knowledge-base/`
- `东方术数/` → `knowledge/eastern-metaphysics/`
- `奇门遁甲/` → `knowledge/qimen-suite/`
- `md_converted/` 中有长期价值的部分 → `knowledge/processed/`
- `md_converted/` 中一次性转换结果 → `_archive/data-dumps/`

#### Scenario: 知识资产可定位
- **WHEN** 查找八字命理资料
- **THEN** 可在 `knowledge/eastern-metaphysics/八字命理/` 下找到

### Requirement: 顶层散落文件归位
系统 SHALL 将顶层散落文件按用途迁移：

| 文件 | 目标位置 |
|------|---------|
| `batch_*.py`、`ocr_*.py`、`scan_*.py`、`convert_text_pdfs.py`、`quick_pdf_to_md.py`、`test_*.py` | `scripts/ocr/` |
| `auto_deploy.ps1`、`deploy_frontend.ps1`、`update.sh`、`batch_core.ps1` | `scripts/deploy/` |
| `人生决策宗师_LLM审核报告_2026-05-11.md` | `docs/audits/` |
| `awkn-life-backend-node_modules.tar.gz`、`awkn-life-deploy.tar.gz`、`cities15000.zip` | `_archive/packages/` |
| `alice-tool-web_fetch-1cae6d4d.txt`、`pdf_scan_report.json`、`nul` | `_archive/tmp/` |

#### Scenario: 顶层无散落脚本
- **WHEN** 检查顶层目录
- **THEN** 不存在 `batch_*.py`、`ocr_*.py` 等散落脚本文件

### Requirement: 独立 Git 仓库边界
系统 SHALL 在 `人生决策宗师` 目录下建立独立 Git 仓库。

#### Scenario: Git 根指向自身
- **WHEN** 在 `人生决策宗师` 下执行 `git rev-parse --show-toplevel`
- **THEN** 返回 `人生决策宗师` 自身路径，而非 `AWKN-Lab`

#### Scenario: 嵌套 Git 隔离
- **WHEN** 新仓库执行 `git add`
- **THEN** `references/projects/` 下的嵌套 `.git` 目录不被纳入主仓库提交

#### Scenario: 缓存与临时目录排除
- **WHEN** 执行 `git status`
- **THEN** `.cursor/`、`.trae/`、`.mineru-env/`、`.ruff_cache/`、`.uploads/`、`.deploy/`、`node_modules/` 不出现在未跟踪列表

### Requirement: .gitignore 更新
系统 SHALL 更新 `.gitignore` 以覆盖所有需排除的目录和文件模式。

#### Scenario: 压缩包与缓存排除
- **WHEN** 执行 `git add .`
- **THEN** `*.tar.gz`、`*.zip`、`.cursor/`、`.mineru-env/`、`.ruff_cache/`、`.uploads/`、`_archive/` 不被暂存

### Requirement: 文档与索引同步
系统 SHALL 新增和更新以下文档：
- 新增 `REPO-MAP.md`：明确主线项目、参考项目、知识资产、脚本目录、归档目录、不应提交 Git 的目录
- 更新 `README.md`：项目结构反映新目录，主线入口写 `apps/AWKN-LABlife`
- 更新 `ONBOARDING.md`：快速启动路径同步更新

#### Scenario: 文档描述一致
- **WHEN** 对比 README.md、ONBOARDING.md、REPO-MAP.md 的目录结构描述
- **THEN** 三者对当前目录结构的描述一致

## MODIFIED Requirements

### Requirement: 现有 references/ 和 projects/ 合并
原 `references/`（外部网站抓取资料）和 `projects/`（Coze 技能）需重新组织：
- `references/` 下现有网站抓取目录（36kr.com、baike.baidu.com 等）→ `references/materials/`
- `projects/` 下 Coze 技能目录 → `references/projects/coze-skills/`

### Requirement: 其它/ 目录分流
原 `其它/` 目录内容需分流：
- 术数相关子目录（八字、奇门、梅花、周易等）→ `knowledge/eastern-metaphysics/` 对应子目录
- 非术数内容（君主论、商君书、吸引力法则等）→ `references/materials/misc/`
- 顶层散落 PDF/EPUB → `knowledge/eastern-metaphysics/` 或 `references/materials/misc/` 按主题归类

## REMOVED Requirements

### Requirement: 顶层散落文件直接存在
**Reason**: 违反目录收口原则，散落文件导致项目根目录混乱
**Migration**: 所有散落文件按用途迁入对应子目录

### Requirement: 旧项目作为顶层目录存在
**Reason**: 旧项目不再主线开发，作为顶层目录造成认知混乱
**Migration**: 迁入 `references/projects/`，保留完整内容和 Git 历史
