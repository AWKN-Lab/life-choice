# Tasks

## Phase 0: 备份与安全检查
- [x] Task 0: 创建当前状态备份点
  - [x] 执行 `git status` 确认当前工作区状态
  - [x] 在 AWKN-LABlife 下执行 `git add -A && git commit -m "WIP 备份: 目录重构前快照"`
  - [x] 确认备份成功：`git log -1`

## Phase 1: 创建目标目录结构
- [x] Task 1: 创建 6 类主目录及子目录
  - [x] 创建 `apps/`、`knowledge/`、`references/projects/`、`references/materials/`、`scripts/ocr/`、`scripts/deploy/`、`docs/audits/`、`_archive/packages/`、`_archive/data-dumps/`、`_archive/tmp/`、`knowledge/processed/`

## Phase 2: 迁移主线项目
- [x] Task 2: 迁移 AWKN-LABlife 到 apps/
  - [x] 移动 `AWKN-LABlife/` → `apps/AWKN-LABlife/`（保留 .git）
  - [x] 验证 `apps/AWKN-LABlife/.git` 存在且 `git log` 正常
  - [x] 验证前端可启动：`cd apps/AWKN-LABlife/app`（路径可达）

## Phase 3: 迁移旧项目到 references/projects/
- [x] Task 3: 迁移旧项目
  - [x] 移动 `xuanxue-app/` → `references/projects/xuanxue-app/`
  - [x] 移动 `xuanxue-backend/` → `references/projects/xuanxue-backend/`
  - [x] 移动 `bazi-master/` → `references/projects/bazi-master/`
  - [x] 移动 `AW-life/` → `references/projects/AW-life/`
  - [x] 移动 `无法判断/` → `references/projects/legacy-unknown/`
  - [x] 验证各目录下 .git 保留（xuanxue-app、xuanxue-backend、legacy-unknown）

## Phase 4: 重组知识资产到 knowledge/
- [x] Task 4: 迁移知识库目录
  - [x] 移动 `knowledge-base/` → `knowledge/knowledge-base/`
  - [x] 移动 `东方术数/` → `knowledge/eastern-metaphysics/`
  - [x] 移动 `奇门遁甲/` → `knowledge/qimen-suite/`
  - [x] 移动 `md_converted/` → `_archive/data-dumps/md_converted/`（一次性转换结果归档）

## Phase 5: 重组 references/ 和 projects/
- [x] Task 5: 合并现有 references/ 和 projects/ 内容
  - [x] 移动原 `references/` 下网站抓取目录（36kr.com 等 8 个）→ `references/materials/`
  - [x] 移动原 `projects/` 下 Coze 技能内容 → `references/projects/coze-skills/`
  - [x] 清理原 `projects/` 空目录

## Phase 6: 分流 其它/ 目录
- [x] Task 6: 分流 其它/ 目录内容
  - [x] 移动术数相关子目录（八字、奇门、梅花、周易、风水、六壬、紫薇等）→ `knowledge/eastern-metaphysics/` 对应子目录（若与已有目录同名则合并）
  - [x] 移动非术数内容（君主论、商君书、吸引力法则、塔罗、占星等）→ `references/materials/misc/`
  - [x] 移动顶层散落 PDF/EPUB → 按主题归入 `knowledge/eastern-metaphysics/` 或 `references/materials/misc/`

## Phase 7: 收口顶层散落文件
- [x] Task 7: 迁移散落脚本到 scripts/
  - [x] 移动 `batch_core.py`、`batch_mineru_v2.py`、`batch_mineru.py`、`batch_ocr_mineru.py`、`batch_rapidocr.py`、`ocr_liuren.py`、`scan_pdfs.py`、`convert_text_pdfs.py`、`quick_pdf_to_md.py`、`test_rapidocr.py`、`test_tesseract.py` → `scripts/ocr/`
  - [x] 移动 `auto_deploy.ps1`、`deploy_frontend.ps1`、`update.sh`、`batch_core.ps1` → `scripts/deploy/`
  - [x] 移动已有 `scripts/deploy-awkn-life.ps1` → `scripts/deploy/`

- [x] Task 8: 迁移散落文档与临时文件
  - [x] 移动 `人生决策宗师_LLM审核报告_2026-05-11.md` → `docs/audits/`
  - [x] 移动 `awkn-life-backend-node_modules.tar.gz`、`awkn-life-deploy.tar.gz`、`cities15000.zip` → `_archive/packages/`
  - [x] 移动 `alice-tool-web_fetch-1cae6d4d.txt`、`pdf_scan_report.json` → `_archive/tmp/`

## Phase 8: Git 边界收口
- [x] Task 9: 建立独立 Git 仓库
  - [x] 在 `人生决策宗师` 下执行 `git init`
  - [x] 确认 `git rev-parse --show-toplevel` 返回 `人生决策宗师` 自身路径
  - [x] 处理嵌套 Git：确认 `references/projects/` 下旧仓 .git 存在且不被主仓库追踪

- [x] Task 10: 更新 .gitignore
  - [x] 添加排除规则：`.cursor/`、`.trae/`、`.mineru-env/`、`.ruff_cache/`、`.uploads/`、`.deploy/`、`_archive/`、`*.tar.gz`、`*.zip`、`node_modules/`
  - [x] 添加排除规则：`references/projects/*/.git/`（嵌套仓 .git 不纳入主仓）
  - [x] 保留原有排除规则（node_modules、dist、.env 等）

## Phase 9: 文档同步
- [x] Task 11: 新增 REPO-MAP.md
  - [x] 写入主线项目、参考项目、知识资产、脚本目录、归档目录的索引
  - [x] 标注哪些目录不应提交 Git

- [x] Task 12: 更新 README.md
  - [x] 项目结构反映新目录布局
  - [x] 主线入口改为 `apps/AWKN-LABlife`
  - [x] 快速启动路径同步更新
  - [x] 关键文档路径同步更新

- [x] Task 13: 更新 ONBOARDING.md
  - [x] 快速入口路径同步更新
  - [x] 后端配置路径改为 `apps/AWKN-LABlife/CLAUDE.md`

- [x] Task 14: 新增迁移记录文档
  - [x] 在 `docs/` 下创建 `ENGINEERING-目录重构与Git收口-20260607.md`
  - [x] 记录迁移前后目录对照表、迁移操作清单、验证结果

## Phase 10: 验证
- [x] Task 15: 全面验证
  - [x] 顶层无散落 .py/.ps1/.zip/.tar.gz/.txt/.json 临时文件
  - [x] 顶层只剩元文件与 6 类主目录
  - [x] `apps/AWKN-LABlife` 路径可达
  - [x] `git rev-parse --show-toplevel` 指向自身
  - [x] `.gitignore` 排除缓存、压缩包、node_modules、IDE 文件
  - [x] `references/projects/` 下旧项目完整
  - [x] `knowledge/` 下知识库可定位
  - [x] README.md、ONBOARDING.md、REPO-MAP.md 三者描述一致

# Task Dependencies
- [Task 0] 无依赖，必须最先执行
- [Task 1] depends on [Task 0]
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 1]
- [Task 6] depends on [Task 1]
- [Task 7] depends on [Task 1]
- [Task 8] depends on [Task 1]
- [Task 9] depends on [Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8]
- [Task 10] depends on [Task 9]
- [Task 11] depends on [Task 9]
- [Task 12] depends on [Task 9]
- [Task 13] depends on [Task 9]
- [Task 14] depends on [Task 9]
- [Task 15] depends on [Task 10, Task 11, Task 12, Task 13, Task 14]
