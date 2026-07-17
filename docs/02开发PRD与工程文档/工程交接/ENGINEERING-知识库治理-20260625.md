# 工程文档：知识库治理与迭代治理体系

> **文档编号**：ENG-KG-001  
> **版本**：v1.0  
> **日期**：2026-06-25  
> **作者**：天火（AI 协作）  
> **状态**：待审查  
> **上游 PRD**：[PRD-知识库治理与迭代治理体系-v1-20260625.md](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/docs/02产品需求%20(PRD)/PRD-知识库治理与迭代治理体系-v1-20260625.md)  
> **下游**：awkn-审核（测试用例）→ awkn-部署（CI 集成）

---

## 1. 变更摘要

| 项 | 内容 |
|---|---|
| **变更类型** | 文档治理 + 脚本新增（无代码逻辑变更） |
| **变更范围** | 3 个知识体系层 + 2 个新增脚本 + 1 个 pre-commit hook |
| **影响半径** | 项目文档结构 + AI 协作上下文加载 + git commit 流程 |
| **回滚风险** | 低（文档变更可 git revert，脚本新增可删除） |
| **工作量** | ~20 小时（3-5 天） |

---

## 2. 项目技术约束

### 2.1 环境约束

| 约束项 | 实际值 | 来源验证 |
|--------|--------|---------|
| 操作系统 | Windows 11 + PowerShell 7+ | 工作目录 `c:\Users\10919\Desktop\AWKN-Lab\` |
| Shell | PowerShell 7+（非 cmd.exe） | TRAE IDE 默认 |
| 文件系统 | NTFS（大小写不敏感） | Windows 默认 |
| Git | 已初始化 | `.git/` 存在 |
| Node.js | 已安装（用于 husky pre-commit） | `package.json` 存在 |
| Python | 不涉及 | 本项目无 Python 脚本 |

### 2.2 文档技术约束

| 约束项 | 实际值 | 验证方法 |
|--------|--------|---------|
| 文档格式 | Markdown（.md） | Grep `*.md` |
| 编码 | UTF-8（含 BOM 可选） | VS Code 默认 |
| 链接格式 | `[text](file:///absolute/path)` 或 `[text](relative/path)` | TRAE IDE 规范 |
| 文档索引 | [docs/文档索引.md](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/docs/文档索引.md) | Read 验证 |
| 记忆系统总控 | [00_记忆系统总控盘.md](file:///c:/Users/10919/Desktop/AWKN-Lab/记忆系统/00-memory-control/00_记忆系统总控盘.md) | Read 验证 |

### 2.3 脚本技术约束

| 约束项 | 实际值 | 说明 |
|--------|--------|------|
| 脚本语言 | PowerShell（.ps1）+ Bash（.sh） | Windows 用 .ps1，跨平台用 .sh |
| 脚本位置 | `scripts/` 目录 | 现有约定 |
| 脚本命名 | kebab-case | `check-docs.sh`、`archive-sessions.ps1` |
| 退出码 | 0=成功，非 0=失败 | Unix 标准 |
| 日志 | 输出到 stdout，错误到 stderr | 禁止裸 Write-Host |

---

## 3. 技术方案

### 3.1 总体架构

```
人生决策宗师/
├── KNOWLEDGE-MAP.md           ← 新增：单一真相源地图
├── scripts/
│   ├── check-docs.sh          ← 新增：CI 文档检查
│   └── archive-sessions.ps1   ← 新增：会话归档
├── .husky/
│   └── pre-commit             ← 新增/修改：集成 check-docs.sh
├── docs/
│   ├── 文档索引.md             ← 修改：修复失效引用
│   ├── 01商业计划/
│   │   └── V1-V3阶段路线图-*.md ← 修改：追加迭代评审节奏
│   └── 02产品需求 (PRD)/
│       └── PRD-知识库治理-*.md  ← 已创建
├── 项目梳理规划方案_v1.md       ← 修改：标记已闭环
└── .trae/documents/            ← 分类标注（不移动）

记忆系统/
├── 02-evolution/
│   └── E141_*.md               ← 修改：填充空文件
├── 03-sessions/
│   └── _index.md               ← 新增：会话索引
├── 05-knowledge/               ← 新增：≥3 篇领域知识
├── 07-hindsight/               ← 新增：≥5 篇事后洞察
└── 09-templates/               ← 新增：≥3 个标准模板
```

### 3.2 模块边界

| 模块 | 输入 | 输出 | 依赖 |
|------|------|------|------|
| FR-1.1 闭环梳理方案 | 项目梳理规划方案_v1.md | 追加"执行差异"章节 | 无 |
| FR-1.2 修复失效引用 | 文档索引.md | 修复 5 处 + 标注 8 处 | 无 |
| FR-1.3 填充 E141 | 空文件 | 完整内容 | 无 |
| FR-1.4 路线图迭代评审 | V1-V3 路线图 | 追加章节 | 无 |
| FR-2.1 KNOWLEDGE-MAP | 三层体系信息 | 总入口地图 | FR-2.2 完成 |
| FR-2.2 .trae 治理 | 60+ 文档清单 | 分类表 | 无 |
| FR-2.3 记忆系统填充 | E 编号经验 | 3 目录内容 | 无 |
| FR-2.4 会话治理 | 03-sessions/ | _index + 归档脚本 | 无 |
| FR-2.5 CI 检查 | .md 文件 | check-docs.sh + hook | Node.js + husky |

### 3.3 关键实现方案

#### 3.3.1 check-docs.sh 实现方案

**功能**：扫描所有 .md 文件的内部链接，检查失效引用 + DEPRECATED 标注

**算法**：
1. `find . -name "*.md"` 列出所有 Markdown 文件
2. 对每个文件，用 `grep -oP '\[.*?\]\((?!http)(.*?)\)'` 提取内部链接
3. 检查链接目标是否存在（resolve 相对路径）
4. 检查文件首行是否含 `DEPRECATED` 标注
5. 输出失效引用列表 + 退出码

**跨平台注意**：
- Windows 环境用 Git Bash 执行（.sh 脚本）
- 或用 PowerShell 重写为 `check-docs.ps1`（备选方案）

**伪代码**：
```bash
#!/bin/bash
# check-docs.sh — 文档失效引用检查
set -euo pipefail

DOCS_ROOT="${1:-.}"
EXIT_CODE=0

echo "=== 文档失效引用检查 ==="

# 1. 扫描所有 .md 文件
find "$DOCS_ROOT" -name "*.md" -type f | while read -r file; do
  # 2. 提取内部链接（排除 http/https/file:///）
  grep -oP '\[.*?\]\(\K(?!https?://|file:///)[^)]+' "$file" | while read -r link; do
    # 3. 解析相对路径
    dir=$(dirname "$file")
    target="$dir/$link"
    # 4. 检查目标是否存在
    if [[ ! -e "$target" ]]; then
      echo "❌ 失效引用: $file → $link"
      EXIT_CODE=1
    fi
  done
done

# 5. 检查 DEPRECATED 标注
echo "=== DEPRECATED 标注检查 ==="
# （可选：检查已废弃文档是否被活跃文档引用）

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ 所有文档引用有效"
else
  echo "❌ 发现失效引用，请修复后再提交"
fi

exit $EXIT_CODE
```

#### 3.3.2 archive-sessions.ps1 实现方案

**功能**：将 03-sessions/ 中 >7 天的 session 文件移至 04-backups/

**算法**：
1. 获取 03-sessions/ 下所有 `session-*.md` 文件
2. 按文件修改时间判断是否 >7 天
3. 移动到 `04-backups/YYYY-MM/` 子目录
4. 更新 `_index.md`

**伪代码**：
```powershell
# archive-sessions.ps1 — 会话记忆归档
param(
    [string]$SessionsDir = "c:\Users\10919\Desktop\AWKN-Lab\记忆系统\03-sessions",
    [string]$BackupDir = "c:\Users\10919\Desktop\AWKN-Lab\记忆系统\04-backups",
    [int]$DaysThreshold = 7
)

$threshold = (Get-Date).AddDays(-$DaysThreshold)
$monthDir = Join-Path $BackupDir (Get-Date -Format "yyyy-MM")

if (!(Test-Path $monthDir)) {
    New-Item -ItemType Directory -Path $monthDir -Force | Out-Null
}

$archived = 0
Get-ChildItem -Path $SessionsDir -Filter "session-*.md" | Where-Object {
    $_.LastWriteTime -lt $threshold
} | ForEach-Object {
    Move-Item -Path $_.FullName -Destination $monthDir -Force
    $archived++
    Write-Host "[OK] 已归档: $($_.Name)"
}

Write-Host "=== 归档完成: $archived 个文件 ==="
```

#### 3.3.3 KNOWLEDGE-MAP.md 结构

见 PRD 附录 B 模板。关键设计：
- 三层知识体系矩阵（3 层 × 6 类信息）
- .trae/documents/ 分类表（3 类：生效/归档/废弃）
- 双向链接规则（每层引用其他层）

---

## 4. 影响范围

### 4.1 文件影响清单

| 文件 | 操作类型 | 影响程度 |
|------|---------|---------|
| `项目梳理规划方案_v1.md` | 修改（追加章节） | 低 |
| `docs/文档索引.md` | 修改（修复引用） | 低 |
| `docs/01商业计划/V1-V3阶段路线图-*.md` | 修改（追加章节） | 低 |
| `记忆系统/02-evolution/E141_*.md` | 修改（填充内容） | 低 |
| `KNOWLEDGE-MAP.md` | 新增 | 低 |
| `scripts/check-docs.sh` | 新增 | 低 |
| `scripts/archive-sessions.ps1` | 新增 | 低 |
| `.husky/pre-commit` | 新增/修改 | 中（影响 git commit） |
| `记忆系统/03-sessions/_index.md` | 新增 | 低 |
| `记忆系统/05-knowledge/*.md` | 新增（≥3 篇） | 低 |
| `记忆系统/07-hindsight/*.md` | 新增（≥5 篇） | 低 |
| `记忆系统/09-templates/*.md` | 新增（≥3 篇） | 低 |
| `.trae/documents/` 60+ 文件 | 不修改（仅分类标注） | 无 |

### 4.2 不受影响

- ❌ 不动任何 .ts/.tsx/.js 代码文件
- ❌ 不动 package.json / tsconfig.json
- ❌ 不动后端 Prisma / NestJS
- ❌ 不动 Nginx / PM2 配置
- ❌ 不动现有部署脚本 deploy-awkn-life.ps1

### 4.3 风险影响

| 风险 | 影响范围 | 缓解 |
|------|---------|------|
| pre-commit hook 阻塞开发 | 全项目 git commit | 先 dry-run，提供 `--no-verify` 绕过 |
| 会话归档误删 | 03-sessions/ | 移动不删除 + 04-backups/ 保留 |
| KNOWLEDGE-MAP 信息过时 | AI 协作上下文 | CI 检查 + 定期更新 |

---

## 5. 测试用例

### 5.1 功能测试用例

| 编号 | 测试项 | 前置条件 | 测试步骤 | 预期结果 | 验证方法 |
|------|--------|---------|---------|---------|---------|
| TC-1.1 | 梳理方案闭环 | 文件存在 | Read 文件末尾 | 含"闭环于 2026-06-25" | Grep "闭环于" |
| TC-1.2 | 失效引用清零 | 文档索引存在 | Grep "已迁移\|待跟进" | 0 处匹配 | Grep count = 0 |
| TC-1.3 | E141 填充 | 文件存在 | Read 文件 | > 0 bytes + 含三道防线 | 文件大小 > 0 |
| TC-1.4 | 路线图迭代评审 | 路线图存在 | Read 末尾 | 含"迭代评审节奏" | Grep "迭代评审" |
| TC-2.1 | KNOWLEDGE-MAP 存在 | - | Read 文件 | 含 3 层 × 6 类矩阵 | Grep "三层知识体系" |
| TC-2.2 | .trae 分类完成 | 60+ 文档 | Read KNOWLEDGE-MAP | 含分类表 | Grep "当前生效" |
| TC-2.3 | 记忆系统填充 | 3 目录 | LS 05/07/09 | 各 ≥3 篇 | LS count ≥ 3 |
| TC-2.4 | 会话索引存在 | 03-sessions/ | LS 目录 | 含 _index.md | LS |
| TC-2.4b | 归档脚本可用 | 脚本存在 | 执行 dry-run | 脚本 exit 0 | PowerShell 执行 |
| TC-2.5 | CI 检查可用 | 脚本存在 | bash check-docs.sh | exit 0 | Bash 执行 |
| TC-2.5b | pre-commit 生效 | hook 配置 | git commit 测试 | 自动运行 check | git commit 验证 |

### 5.2 非功能测试用例

| 编号 | 测试项 | 验证方法 |
|------|--------|---------|
| NTC-1 | 文档定位 ≤30 秒 | 计时测试（随机抽 5 个文档） |
| NTC-2 | 三层体系一致性 | 抽样 5 条信息交叉验证 |
| NTC-3 | 不阻塞开发 | Login/Logout 401 修复并行完成 |

### 5.3 回归测试

| 编号 | 测试项 | 验证方法 |
|------|--------|---------|
| RT-1 | 现有文档引用不破坏 | check-docs.sh exit 0 |
| RT-2 | git commit 正常工作 | git commit 测试 |
| RT-3 | 现有 .trae/documents/ 文件未被移动 | LS 对比 |
| RT-4 | 现有 docs/ 结构未变 | LS 对比 |
| RT-5 | 现有记忆系统结构未变 | LS 对比 |

---

## 6. 部署说明

### 6.1 部署前置条件

- [ ] PRD 审查通过
- [ ] 工程文档审查通过
- [ ] git 工作区干净（`git status` 无未提交变更）

### 6.2 部署步骤（按里程碑）

#### M1：P0 止血（第 1 天）

```bash
# 1. 备份当前状态
git add -A && git commit -m "WIP 备份: 知识库治理 M1 前置状态"

# 2. 执行 FR-1.1 ~ FR-1.4（Edit 工具操作）
# 3. 验证
# 4. 提交
git add -A && git commit -m "feat(knowledge): M1 P0 止血完成

Rules: E111/E95/E52"
```

#### M2：单一真相源（第 2 天）

```bash
# 1. 创建 KNOWLEDGE-MAP.md
# 2. 分类 .trae/documents/
# 3. 验证
# 4. 提交
git add -A && git commit -m "feat(knowledge): M2 KNOWLEDGE-MAP + .trae 治理

Rules: E111/E95/E52"
```

#### M3：记忆系统填充（第 3 天）

```bash
# 1. 填充 05/07/09 目录
# 2. 创建 03-sessions/_index.md
# 3. 验证
# 4. 提交
git add -A && git commit -m "feat(knowledge): M3 记忆系统填充 + 会话治理

Rules: E111/E95/E52"
```

#### M4：CI 治理（第 4 天）

```bash
# 1. 创建 scripts/check-docs.sh
# 2. 创建 scripts/archive-sessions.ps1
# 3. 配置 .husky/pre-commit
# 4. 验证
# 5. 提交
git add -A && git commit -m "feat(knowledge): M4 CI 文档检查 + 会话归档

Rules: E111/E95/E52"
```

#### M5：全量验收（第 5 天）

```bash
# 1. 执行全部 TC 测试用例
# 2. 执行全部 NTC 非功能测试
# 3. 执行全部 RT 回归测试
# 4. 生成验收报告
# 5. 提交
git add -A && git commit -m "docs(knowledge): M5 全量验收通过

Rules: E111/E95/E52"
```

### 6.3 健康检查

每个里程碑完成后执行：

```bash
# 1. 文档引用检查
bash scripts/check-docs.sh

# 2. git 状态检查
git status

# 3. 文件存在性检查（按里程碑）
# M1: 项目梳理规划方案_v1.md 含"闭环"
# M2: KNOWLEDGE-MAP.md 存在
# M3: 05/07/09 目录非空
# M4: scripts/ 下 2 个脚本存在
```

### 6.4 回滚步骤

```bash
# 回滚单个里程碑
git revert <commit-hash>

# 回滚整个治理
git reset --hard <M1-前的 commit-hash>

# 注意：回滚前先备份
git tag backup-before-rollback
```

---

## 7. 一步一验收执行计划

> **格式**：每步固定 5 件套（动作/产出/验收/验证/回滚）+ Plan B（高风险）

### Step 1：FR-1.1 关闭梳理方案 v1

- **动作**：Read [项目梳理规划方案_v1.md](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/项目梳理规划方案_v1.md) → 在末尾追加"执行差异"章节
- **产出**：方案文件含"闭环于 2026-06-25" + 10 步执行差异表
- **验收**：Read 文件末尾显示新章节
- **验证**：Grep "闭环于" 命中 1 处
- **回滚**：git checkout 项目梳理规划方案_v1.md
- **风险**：低

### Step 2：FR-1.2 修复文档索引失效引用

- **动作**：Read [文档索引.md](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/docs/文档索引.md) → 修复 5 处失效引用 + 8 处重复文档标注 DEPRECATED
- **产出**：失效引用数 = 0
- **验收**：Grep "已迁移|待跟进" = 0 处
- **验证**：Grep count = 0
- **回滚**：git checkout 文档索引.md
- **风险**：低

### Step 3：FR-1.3 填充 E141 空文件

- **动作**：Write [E141_React白屏三层防线与深路径访问防护.md](file:///c:/Users/10919/Desktop/AWKN-Lab/记忆系统/02-evolution/E141_React白屏三层防线与深路径访问防护.md) 完整内容
- **产出**：文件 > 0 bytes，含三道防线 + 深路径防护 + 案例
- **验收**：Read 文件显示完整内容
- **验证**：文件大小 > 0
- **回滚**：git checkout E141_*.md（恢复为空文件）
- **风险**：低

### Step 4：FR-1.4 路线图追加迭代评审节奏

- **动作**：Read [V1-V3阶段路线图](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/docs/01商业计划/V1-V3阶段路线图-2026-06-24.md) → 末尾追加"迭代评审节奏"章节
- **产出**：章节含评审触发条件 + 流程 + 回写规则 + 归档路径
- **验收**：Read 末尾显示新章节
- **验证**：Grep "迭代评审节奏" 命中
- **回滚**：git checkout V1-V3*.md
- **风险**：低

### Step 5：FR-2.1 建立 KNOWLEDGE-MAP.md

- **动作**：Write [KNOWLEDGE-MAP.md](file:///c:/Users/10919/Desktop/AWKN-Lab/人生决策宗师/KNOWLEDGE-MAP.md)（结构见 PRD 附录 B）
- **产出**：3 层 × 6 类信息矩阵
- **验收**：Read 文件含矩阵
- **验证**：Grep "三层知识体系" 命中
- **回滚**：删除文件
- **风险**：低
- **Plan B**：若内容不全，先写最小版本（仅矩阵 + .trae 分类），后续迭代

### Step 6：FR-2.2 治理 .trae/documents/

- **动作**：LS .trae/documents/ → 60+ 文档分类（生效/归档/废弃）→ 结果写入 KNOWLEDGE-MAP.md
- **产出**：分类表
- **验收**：KNOWLEDGE-MAP.md 含 60+ 文档分类
- **验证**：Grep "当前生效" 命中
- **回滚**：git checkout KNOWLEDGE-MAP.md
- **风险**：中（分类主观性）
- **Plan B**：3 类标准不清晰时，用"最近 30 天有引用 = 生效"作为客观标准

### Step 7：FR-2.3 填充记忆系统空目录

- **动作**：
  - 05-knowledge/：Write 3 篇（玄学算法 / LLM 工程 / React 前端）
  - 07-hindsight/：Write 5 篇（从 E86-E141 提炼）
  - 09-templates/：Write 3 篇（复盘 / PRD / 决策记录模板）
- **产出**：3 目录各 ≥3 篇
- **验收**：LS 3 目录各 ≥3 文件
- **验证**：LS count
- **回滚**：git clean -fd 05-knowledge/ 07-hindsight/ 09-templates/
- **风险**：中（内容质量）
- **Plan B**：从已有 E 编号经验提炼，不凭空创造

### Step 8：FR-2.4 会话记忆治理

- **动作**：
  - Write 03-sessions/_index.md（按日期+主题列出所有 session）
  - Write scripts/archive-sessions.ps1
- **产出**：_index.md + 归档脚本
- **验收**：LS 03-sessions/ 含 _index.md + 脚本可执行
- **验证**：PowerShell dry-run
- **回滚**：删除 _index.md + 脚本
- **风险**：低

### Step 9：FR-2.5 CI 文档检查

- **动作**：
  - Write scripts/check-docs.sh
  - 配置 .husky/pre-commit
- **产出**：脚本 + hook 配置
- **验收**：bash check-docs.sh exit 0 + git commit 自动运行
- **验证**：手动 git commit 测试
- **回滚**：删除脚本 + 移除 hook
- **风险**：中（可能阻塞开发）
- **Plan B**：先 dry-run 模式（只输出不阻塞），验证 1 周后再启用阻塞模式

### Step 10：M5 全量验收

- **动作**：执行全部 TC + NTC + RT 测试用例
- **产出**：验收报告
- **验收**：验收率 = 100%
- **验证**：测试报告
- **回滚**：N/A
- **风险**：低

---

## 8. 工程交接包

### 8.1 交接清单

| 项 | 状态 | 负责人 |
|---|---|---|
| PRD | ✅ 已完成 | 天火 |
| 工程文档（本文件） | ✅ 已完成 | 天火 |
| 一步一验收执行计划 | ✅ 已完成（Ch7） | 天火 |
| 代码实现 | ⏳ 待执行 | 天火 |
| 测试验证 | ⏳ 待执行 | 天火 |
| 部署上线 | ⏳ 待执行 | 天火 |

### 8.2 未确认项

| 项 | 说明 | 确认方 |
|---|---|---|
| pre-commit hook 是否启用阻塞模式 | 影响 git commit 流程 | 用户 |
| 记忆系统 04/08 目录是否填充 | PRD 决策不填充 | 用户 |
| .trae/documents/ 是否完全归档 | PRD 决策不移动 | 用户 |
| Diátaxis 重组是否执行 | PRD 决策不做（方案 3） | 用户 |

### 8.3 下游消费

| 下游技能 | 消费内容 | 触发条件 |
|---------|---------|---------|
| awkn-审核 | 测试用例（Ch5） | 工程文档审查通过后 |
| awkn-部署 | 部署说明（Ch6） | 测试通过后 |
| awkn-工程师 | 一步一验收计划（Ch7） | 审查通过后 |

---

## 9. 强制收尾句

> **下次遇到类似情况，先做哪 3 件事？**
> 1. 查看当前状态（LS 三层知识体系 + Read 索引文件）
> 2. 备份当前版本（git commit WIP）
> 3. 读取完整文件并确认修改位置（Read PRD + 工程文档 + 现有文件）

---

## 附录 A：验收报告模板

```markdown
# 知识库治理验收报告

## 验收日期
YYYY-MM-DD

## 验收结果
- 功能验收：X/11 PASS
- 非功能验收：X/3 PASS
- 回归验收：X/5 PASS
- 验收率：X% (要求 100%)

## 逐项验收
| 编号 | 测试项 | 结果 | 证据 |
|------|--------|------|------|
| TC-1.1 | ... | PASS/FAIL | ... |
| ... | ... | ... | ... |

## 未通过项
- （如有）

## 结论
PASS / FAIL
```

---

## 附录 B：git commit message 模板

```
feat(knowledge): M<里程碑> <描述>

<变更摘要>

Rules: E111/E95/E52
```

---

**工程文档审查请求**：

请审查本工程文档，给出"放行/打回/升级"结论：

1. **技术方案**：3 个脚本实现方案是否可行
2. **测试用例**：11 条 TC + 3 条 NTC + 5 条 RT 是否覆盖完整
3. **执行计划**：10 步一步一验收是否可执行
4. **风险**：4 个未确认项是否需要现在决策

**审查通过后，我将按 Step 1→Step 10 执行。**
