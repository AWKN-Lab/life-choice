# 目录重构与 Git 收口 — 清尾验收计划

> 日期：2026-06-09
> 状态：Plan Mode
> 目标：验收目录重构完成度，处理剩余清尾项

---

## 0. 当前状态盘点

### 已完成项（6/6 核心目录 ✅）

| 计划项 | 状态 | 证据 |
|--------|------|------|
| 1. 收口为 6 类顶层目录 | ✅ 完成 | `apps/` `knowledge/` `references/` `scripts/` `docs/` `_archive/` 均存在 |
| 2. 主线项目归入 apps/ | ✅ 完成 | `apps/AWKN-LABlife/` 存在 |
| 3. 旧项目归入 references/projects/ | ✅ 完成 | `xuanxue-app/` `xuanxue-backend/` `bazi-master/` `AW-life/` `legacy-unknown/` `coze-skills/` 均在 |
| 4. 知识资产重组 | ✅ 完成 | `knowledge/knowledge-base/` `knowledge/eastern-metaphysics/` `knowledge/qimen-suite/` `knowledge/processed/` 均存在 |
| 5. 顶层散落文件清理 | ✅ 完成 | 顶层无 .py/.ps1/.zip/.tar.gz 散落文件 |
| 6. Git 边界独立 | ✅ 完成 | `git rev-parse --show-toplevel` 返回自身 |

### 文档与索引

| 文档 | 状态 |
|------|------|
| `REPO-MAP.md` | ✅ 存在，内容完整 |
| `README.md` | ✅ 存在 |
| `ONBOARDING.md` | ✅ 存在 |
| `PLAN.md` | ✅ 存在 |
| `constitution.md` | ✅ 存在 |
| `docs/ENGINEERING-目录重构与Git收口-20260607.md` | ✅ 存在 |
| `docs/audits/` | ✅ 存在 |
| `.gitignore` | ✅ 存在，规则完整 |

### 未完成项（清尾）

| 问题 | 严重度 | 说明 |
|------|--------|------|
| `nul` 脏文件 | 中 | Windows 特殊文件名，需特殊方式删除 |
| `.cursor/` `.deploy/` `.mineru-env/` `.ruff_cache/` `.trae/` `.uploads/` 缓存目录 | 低 | 已在 .gitignore 中排除，不会进入 Git，但物理存在 |
| Git 尚无首次提交 | 高 | `git log` 报 "does not have any commits yet"，114 个文件在 staging 区但从未 commit |
| 迁移文档验证结果未补 | 低 | `ENGINEERING-目录重构与Git收口-20260607.md` 末尾 "待 Phase 10 验证后补充" |

---

## A. 目标与边界

- **目标一句话**：完成目录重构的最后一轮清尾，删除 `nul` 脏文件，执行 Git 首次提交
- **本轮做**：
  1. 删除 `nul` 脏文件
  2. 审查 git staging 区，确认无敏感文件
  3. 执行 Git 首次提交
  4. 补全迁移文档验证结果
- **本轮不做**：
  1. 不删除 `.cursor/` `.trae/` 等缓存目录（已在 .gitignore，不影响 Git）
  2. 不处理嵌套仓历史合并
  3. 不改任何业务代码

---

## B. 分步清单（4 步）

### Step 1｜删除 `nul` 脏文件

- **动作**：用 PowerShell 特殊方式删除 Windows 保留文件名 `nul`
- **命令**：`Remove-Item -Path "\\?\C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\nul" -Force`
- **验收**：`Get-ChildItem -Name -Force` 中不再出现 `nul`
- **风险**：低（只是一个空文件/脏文件）

### Step 2｜审查 Git staging 区

- **动作**：`git status --short` 检查 114 个文件，确认无 .env、密钥、大文件
- **验收**：无 `.env`、`*.key`、`*.pem`、`*.tar.gz`、`*.zip`、`*.db`（除 knowledge-base 中的 .db）
- **风险**：低

### Step 3｜执行 Git 首次提交

- **动作**：`git commit -m "feat: 人生决策宗师独立仓库初始化 — 目录重构与Git收口完成"`
- **验收**：`git log --oneline -1` 显示提交记录
- **风险**：低（首次提交，不影响任何线上服务）

### Step 4｜补全迁移文档验证结果

- **动作**：更新 `docs/ENGINEERING-目录重构与Git收口-20260607.md` 的验证结果段落
- **验收**：文档末尾验证结果已填写
- **风险**：低

---

## C. 验证清单

| 检查项 | 方法 | 期望 |
|--------|------|------|
| 顶层无散落临时文件 | `Get-ChildItem -Name -Force` | 只有 6 目录 + 元文件 + .git + .gitignore |
| nul 已删除 | `Test-Path nul` | False |
| Git 有首次提交 | `git log --oneline -1` | 有输出 |
| .gitignore 生效 | `git status --short` | 无 .cursor/.trae/_archive 等文件 |
| 无敏感文件 | `git status --short` | 无 .env/*.key/*.pem |

---

## D. 结论

**目录重构计划基本完成**，6 类目录、文档索引、Git 边界、.gitignore 规则全部到位。剩余工作仅为清尾：
1. 删除 `nul` 脏文件
2. 执行 Git 首次提交
3. 补全文档验证结果

缓存目录（.cursor/.trae/.deploy 等）已在 .gitignore 中排除，物理存在不影响 Git 仓库，本轮不处理。
