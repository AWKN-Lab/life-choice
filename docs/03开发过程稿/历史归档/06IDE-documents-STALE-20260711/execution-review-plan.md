# 执行检查 & 审核验收计划

> 日期：2026-06-10
> 状态：Plan Mode

---

## 一、完成度检查清单

### A. 部署相关（上一轮部署任务）

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 前端部署 | ✅ 已完成 | PM2 online 13h，端口 3000 监听 |
| 后端部署 | ✅ 已完成 | `/api/v1/health` 返回 `{"code":0,"message":"ok"}` |
| WARN 1 修复（Agent LLM 注入） | ✅ 已完成 | 日志无 "Agent LLM 未配置" |
| WARN 2 修复（knowledge-base assets） | ✅ 已完成 | 日志无 "加载课体知识库失败" |
| bcrypt → bcryptjs | ✅ 已完成 | package.json + 源码已同步 |
| calc-engine/data JSON 缺失 500 错误 | ✅ 已修复 | API 调用返回正常结果 |
| 预编译运行方案 | ✅ 已落地 | `script: 'apps/api-server/dist/main.js'`，不再依赖 tsx |

**备注**：服务器上 `ecosystem.config.js` 被调整为 `instances: 2, exec_mode: 'cluster', PORT: 3000`，与本地版本不同。这是合理的生产优化，不需要回退。

### B. 目录重构与 Git 收口

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 6 类顶层目录 | ✅ 已完成 | `apps/` `knowledge/` `references/` `scripts/` `docs/` `_archive/` |
| 主线项目归入 apps/ | ✅ 已完成 | `apps/AWKN-LABlife/` |
| 旧项目归入 references/projects/ | ✅ 已完成 | 6 个旧项目已归入 |
| 知识资产重组 | ✅ 已完成 | 4 个子目录 |
| 顶层散落文件清理 | ✅ 已完成 | 顶层无 .py/.ps1/.zip/.tar.gz |
| Git 边界独立 | ✅ 已完成 | `git rev-parse --show-toplevel` 返回自身 |
| .gitignore | ✅ 已完成 | 排除缓存/归档/嵌套仓 |
| REPO-MAP.md | ✅ 已完成 | 含技术索引引用 |
| nul 脏文件 | ✅ 已不存在 | Test-Path 返回 False |
| 损坏的 legacy-unknown/.git | ✅ 已删除 | 不再报 "bad object HEAD" |
| 损坏的 xuanxue-app/.git | ✅ 已删除 | 不再报 submodule 错误 |
| **Git 首次提交** | ❌ 未完成 | `git log` 报 "does not have any commits yet"，但 `git add -A` 已成功 |
| **迁移文档验证结果** | ❌ 未完成 | `ENGINEERING-目录重构与Git收口-20260607.md` 第 68 行仍为 "待 Phase 10 验证后补充" |

### C. 技术索引

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 术数计算引擎技术索引 | ✅ 已完成 | `docs/tech-index-metaphysics.md` 存在，覆盖八字/五行十神/大运/流年/紫微十二宫/神煞 |
| REPO-MAP.md 引用更新 | ✅ 已完成 | 已添加技术索引条目 |

---

## 二、未完成项（2 项）

### 未完成 1：Git 首次提交

**当前状态**：`git add -A` 已成功（文件已 staged），但从未 commit。

**执行步骤**：
```bash
cd "C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师"
git commit -m "feat: 人生决策宗师独立仓库初始化 - 目录重构与Git收口完成"
```

**验收**：`git log --oneline -1` 有输出

**风险**：低。无历史丢失（从未 commit 过）。

### 未完成 2：补全迁移文档验证结果

**当前状态**：`docs/ENGINEERING-目录重构与Git收口-20260607.md` 第 66-68 行：
```
## 验证结果

待 Phase 10 验证后补充。
```

**执行步骤**：替换为实际验证结果

**验收**：文档验证结果段落不再为空

---

## 三、执行计划

### Step 1｜执行 Git 首次提交
- 动作：`git commit`
- 验收：`git log --oneline -1`

### Step 2｜补全迁移文档验证结果
- 动作：编辑 `ENGINEERING-目录重构与Git收口-20260607.md`
- 验收：验证结果段落已填写

### Step 3｜最终确认
- 动作：`git status --short` 应为空（所有文件已 commit）
- 验收：无未提交文件
