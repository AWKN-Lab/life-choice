# 项目整理计划：工程级代码生命周期管理

**日期**: 2026-06-12
**版本**: v1

---

## 一、现状分析

### 已完成（2026-06-07 ~ 06-10）
- 目录重构为 6 类主目录（apps/knowledge/references/scripts/docs/_archive）
- 独立 Git 仓库初始化，3 次 commit
- 嵌套 .git 已清理
- .gitignore 已配置（IDE/缓存/归档/压缩包/数据库等）
- REPO-MAP.md / constitution.md 已建立

### 当前问题清单

| # | 问题 | 风险等级 | 说明 |
|---|------|----------|------|
| P1 | **无远程仓库** | 高 | `git remote -v` 为空，本地是唯一副本，硬盘故障=全丢 |
| P2 | **未提交的修改** | 中 | 8 个 modified + 6 个 untracked 文件未 commit |
| P3 | **大量部署包残留** | 中 | `.deploy/` 下约 30 个 tgz/zip（约 80MB+），已在 .gitignore 但占磁盘 |
| P4 | **残留脚本散落** | 低 | `apps/AWKN-LABlife/app/` 下有 backup.ps1, check-array.js, fix-theme.cjs, fix-theme.js, verify.ps1, verify-title.ps1, verify-title2.ps1, upload.ps1 |
| P5 | **knowledge 下散落脚本** | 低 | knowledge/ 根目录有 ocr_test.py, online_ocr.py 等脚本，应归入 scripts/ |
| P6 | **IDE 目录残留** | 低 | .cursor/, .claude/ 存在（已在 .gitignore） |
| P7 | **缺少 reports/ 目录** | 中 | 用户要求工程检查产出提交到 reports/engineering-checks/，目前不存在 |
| P8 | **_archive/ 未完全清理** | 低 | 有旧转换数据，已在 .gitignore |
| P9 | **constitution.md 质量门禁未执行** | 中 | 门禁提到"无 .bak / fix_*.cjs / fix_*.py 残留"，但 fix-theme.cjs 仍在 |

---

## 二、整理目标（5 条铁律落地）

### 铁律1：代码唯一真相 = 中央 Git 仓库的默认分支
- **动作**：创建远程仓库并 push，确保本地不是唯一副本
- **验收**：`git remote -v` 有输出，`git push` 成功

### 铁律2：IDE 只是编辑器，不是存储
- **动作**：确认 .cursor/.claude/.trae/.vscode/.idea 均在 .gitignore
- **验收**：`git status` 不显示任何 IDE 目录

### 铁律3：工程级检查产出必须可追溯
- **动作**：创建 `reports/engineering-checks/` 目录结构
- **验收**：目录存在，含 .gitkeep 和 README

### 铁律4：备份策略 = Git 标签 + 定期清理
- **动作**：先 commit 当前修改，打 tag，清理旧部署包
- **验收**：git tag 列表有新标签，.deploy/ 下无旧包

### 铁律5：多 IDE 协同用 git worktree（暂不执行）
- 当前单人开发，暂不需要 worktree
- 预留：在 constitution.md 中补充 worktree 规范

---

## 三、分步执行计划

### Step 1｜提交当前未暂存修改
- **动作**：
  1. `git add` 当前修改的 8 个文件 + 6 个 untracked 文件
  2. `git commit -m "feat: K线/潮汐组件、积分会员方案、归档目录"`
- **产出**：工作区干净，所有修改已入库
- **验收**：`git status` 显示 nothing to commit
- **回滚**：`git reset HEAD~1`（仅回退 commit，不丢文件）

### Step 2｜创建远程仓库并推送
- **动作**：
  1. 在 GitHub/Gitee 创建远程仓库（需用户确认平台）
  2. `git remote add origin <url>`
  3. `git push -u origin main`
  4. `git push --tags`
- **产出**：远程仓库与本地同步
- **验收**：`git remote -v` 有输出，远程仓库可见代码
- **回滚**：`git remote remove origin`

### Step 3｜创建 reports/ 目录结构
- **动作**：
  1. 创建 `reports/engineering-checks/` 目录
  2. 添加 `reports/engineering-checks/.gitkeep`
  3. 添加 `reports/engineering-checks/README.md`（说明目录用途和命名规范）
- **产出**：工程检查产出有归档位置
- **验收**：目录存在，git 可跟踪
- **回滚**：删除目录

### Step 4｜清理残留脚本
- **动作**：
  1. 将 `knowledge/` 下的 Python 脚本（ocr_test.py, online_ocr.py, online_test.py, test_pdf.py, check_env.py, img2.py, img3.py, _bench.py, _chk.py, _count.py, _scan.py, _test1.py）移动到 `scripts/ocr/` 或 `scripts/tools/`
  2. 删除 `apps/AWKN-LABlife/app/` 下的残留脚本：
     - backup.ps1（部署脚本已在 scripts/deploy/）
     - check-array.js（一次性调试脚本）
     - fix-theme.cjs / fix-theme.js（一次性修复脚本，违反 constitution 门禁）
     - verify.ps1 / verify-title.ps1 / verify-title2.ps1（一次性验证脚本）
     - upload.ps1（部署脚本已在 scripts/deploy/）
  3. 保留 preview-all-pages.html（开发预览工具，有实用价值）
- **产出**：主线项目目录干净，脚本归入 scripts/
- **验收**：`apps/AWKN-LABlife/app/` 无 .ps1/.cjs/.js 修复脚本
- **回滚**：从 git 历史恢复

### Step 5｜清理旧部署包
- **动作**：
  1. 删除 `.deploy/` 下所有旧 tgz/zip（约 30 个文件，80MB+）
  2. 删除 `apps/AWKN-LABlife/.deploy/` 下所有旧包
  3. 删除 `apps/AWKN-LABlife/awkn-life-backend/` 下的 deploy-package.tar.gz, deploy-package.zip, node_modules_prod.tar.gz, backend-src.tgz
- **产出**：磁盘空间回收，部署包只靠 git tag 管理
- **验收**：`.deploy/` 目录为空或不存在
- **回滚**：不可回滚（但这些文件已在 .gitignore，不在 git 中）
- **风险标记**：中（删除前确认 .gitignore 已覆盖这些文件）

### Step 6｜打标签并提交整理结果
- **动作**：
  1. `git add -A && git commit -m "chore: 项目整理 — 清理残留脚本/部署包，创建reports目录"`
  2. `git tag -a cleanup/v1 -m "项目整理完成：铁律1-4落地"`
  3. `git push && git push --tags`
- **产出**：整理结果入库，有标签可追溯
- **验收**：`git tag` 显示新标签，远程同步
- **回滚**：`git tag -d cleanup/v1 && git push --delete origin cleanup/v1`

### Step 7｜补充 constitution.md
- **动作**：在 constitution.md 中补充：
  1. 备份策略：Git tag 替代手动文件夹复制
  2. 远程仓库：唯一真相源
  3. 残留文件门禁：禁止提交 .ps1/.cjs 修复脚本到主线
  4. worktree 规范（预留）
- **产出**：宪法更新，后续开发有据可依
- **验收**：constitution.md 包含新条款
- **回滚**：git revert

---

## 四、假设与决策

| # | 假设/决策 | 理由 |
|---|-----------|------|
| D1 | 远程仓库使用 GitHub | 用户确认选择 GitHub |
| D2 | knowledge 下 Python 脚本移入 scripts/ | 符合项目约定（scripts/ 放工具脚本） |
| D3 | .deploy/ 文件直接删除不备份 | 已在 .gitignore，git 中无记录，且部署包可重新生成 |
| D4 | preview-all-pages.html 保留 | 有实用开发价值 |
| D5 | worktree 暂不实施 | 单人开发无需，预留规范即可 |
| D6 | _archive/ 内容暂不动 | 已在 .gitignore，不影响仓库，后续按需清理 |

---

## 五、验证步骤

1. `git status` — 工作区干净
2. `git remote -v` — 远程仓库已配置
3. `git tag` — 新标签存在
4. `ls reports/engineering-checks/` — 目录存在
5. `ls apps/AWKN-LABlife/app/*.ps1` — 无残留脚本
6. `ls .deploy/` — 为空或不存在
7. `git push` — 推送成功
8. 远程仓库浏览器访问 — 代码可见

---

## 六、不做清单

- 不重构代码逻辑
- 不修改业务功能
- 不清理 references/materials/ 下的 PDF/EPUB（已在 .gitignore）
- 不清理 _archive/ 下的旧转换数据（已在 .gitignore）
- 不实施 git worktree（单人开发暂不需要）
- 不修改 .gitignore 核心规则（已覆盖大部分场景）
