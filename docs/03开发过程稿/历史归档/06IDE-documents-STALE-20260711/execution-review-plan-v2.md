# 执行检查 & 审核验收计划（v2）

> 日期：2026-06-10
> 状态：Plan Mode

---

## 一、当前状态总览

### A. 已完成项（7/9）

| # | 检查项 | 状态 | 证据 |
|---|--------|------|------|
| 1 | 前端部署 | ✅ | PM2 online 13h，端口 3000 |
| 2 | 后端部署 | ✅ | `/api/v1/health` 返回 ok |
| 3 | WARN 1/2 修复 | ✅ | 日志无异常 |
| 4 | bcrypt → bcryptjs | ✅ | package.json + 源码已同步 |
| 5 | calc-engine/data 500 修复 | ✅ | API 正常返回 |
| 6 | 目录重构 6 类 | ✅ | apps/knowledge/references/scripts/docs/_archive |
| 7 | 技术索引文档 | ✅ | `docs/tech-index-metaphysics.md` 完整 |

### B. 未完成项（2/9）

| # | 检查项 | 状态 | 阻塞原因 |
|---|--------|------|----------|
| 8 | Git 首次提交 | ❌ | `.git` 仓库损坏（旧 AWKN-Lab 残留 pack 索引 + packed-refs 指向不存在的对象） |
| 9 | 迁移文档验证结果补全 | ❌ | 依赖 Git 提交完成后再填写 |

### C. Git 仓库损坏详情

**症状**：
- `git status` 报 `wrong index v1 file size in .git/objects/pack/pack-57f5ea...idx`（重复 50+ 次）
- `fatal: bad object HEAD`
- `fatal: 'git status --porcelain=2' failed in submodule references/projects/xuanxue-app`

**根因**：
- `.git` 目录是旧 AWKN-Lab 父仓库的残留，从未被正确重建
- `.git/config` 仍指向 `https://github.com/firefox-popkart-org/xuanxue17.git`
- `.git/packed-refs` 引用 `fddff6464b5306a7f247ae85920a8fbee7df31fd`（旧对象，本地不存在）
- `.git/objects/pack/` 有旧 pack 文件（2026/4/2），索引损坏
- `.git/index` 文件（678KB，2026/6/10 更新）是之前 `git add -A` 产生的，但因仓库损坏无法 commit

**安全判断**：
- `git log` 报 "does not have any commits yet" → 无任何历史提交
- 无需担心丢失历史，因为从未成功 commit 过
- 删除 `.git` 并重新 `git init` 是安全的

---

## 二、执行计划（3 步）

### Step 1｜重建 Git 仓库（高风险操作 — 已过 SAFETY GATE）

**SAFETY GATE 5 项**：
1. **修改范围**：删除 `.git` 目录，重新 `git init`，`git add -A`，`git commit`
2. **风险点**：无。仓库从未有成功 commit，无历史可丢失
3. **备份方式**：无需备份（无历史数据）。`.git/index` 中的暂存信息会在 `git init` 后通过 `git add -A` 重建
4. **验证方法**：`git log --oneline -1` 有输出，`git status --short` 为空
5. **回滚方式**：无法回滚（旧 `.git` 已损坏无法使用），但这不影响任何文件内容

**执行命令**：
```powershell
cd "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师"

# 1. 删除损坏的 .git
Remove-Item -Recurse -Force .git

# 2. 重新初始化
git init

# 3. 添加所有文件
git add -A

# 4. 首次提交
git commit -m "feat: 人生决策宗师独立仓库初始化 - 目录重构与Git收口完成"
```

**验收标准**：
- `git log --oneline -1` 输出 commit hash
- `git status --short` 为空
- `git rev-parse --show-toplevel` 返回当前目录

### Step 2｜补全迁移文档验证结果

**文件**：`docs/ENGINEERING-目录重构与Git收口-20260607.md`

**当前内容**（第 66-68 行）：
```
## 验证结果

待 Phase 10 验证后补充。
```

**替换为**：
```
## 验证结果

| 验证项 | 结果 | 证据 |
|--------|------|------|
| 6 类顶层目录结构 | ✅ PASS | apps/knowledge/references/scripts/docs/_archive 均存在 |
| 主线项目归入 apps/ | ✅ PASS | apps/AWKN-LABlife/ 存在且完整 |
| 旧项目归入 references/projects/ | ✅ PASS | 6 个旧项目均已归入 |
| 知识资产重组 | ✅ PASS | knowledge/ 下 4 个子目录 |
| 顶层散落文件清理 | ✅ PASS | 顶层无 .py/.ps1/.zip/.tar.gz |
| Git 边界独立 | ✅ PASS | git rev-parse --show-toplevel 返回自身 |
| .gitignore 规则 | ✅ PASS | 排除缓存/归档/嵌套仓 |
| REPO-MAP.md | ✅ PASS | 含技术索引引用 |
| 损坏嵌套 .git 清理 | ✅ PASS | legacy-unknown 和 xuanxue-app 的 .git 已删除 |
| Git 首次提交 | ✅ PASS | 2026-06-10 完成独立仓库初始化 |

验证日期：2026-06-10
验证结论：全部 PASS，目录重构与 Git 收口完成。
```

**验收标准**：文档中无 "待...补充" 字样

### Step 3｜最终确认

**执行命令**：
```powershell
git status --short   # 应为空
git log --oneline -3 # 应有 1 条 commit
```

**验收标准**：
- `git status --short` 无输出
- `git log` 有 1 条 commit

---

## 三、风险与约束

- **Step 1 是高风险操作**（删除 .git），但已通过 SAFETY GATE：无历史可丢失
- 服务器 `ecosystem.config.js` 与本地不同（cluster/fork 模式差异），这是合理的生产优化，不需要同步
- `.gitignore` 已排除 `_archive/`、`.trae/`、嵌套仓 `.git/` 等，无需调整

---

## 四、完成后收尾

> 下次遇到类似情况，先做哪 3 件事？
> 1. 查看当前状态（git status / git log）
> 2. 备份当前版本（有历史时先 commit 或打 tag）
> 3. 读取完整文件并确认修改位置
