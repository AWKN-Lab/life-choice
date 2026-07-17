# PR 审核流程

> 适用范围：本仓库所有 Pull Request。
> 目的：通过 CODEOWNERS + 分支保护 + 三结论规则，确保核心目录变更必须由对应 owner 审核后方可合并。

---

## 一、启用 Required Review（分支保护）

在 GitHub 仓库设置中启用强制审核，步骤如下：

1. 进入仓库 **Settings** → **Branches**。
2. 在 *Branch protection rules* 下点击 **Add rule**。
3. *Branch name pattern* 填入需要保护的分支，例如：
   - `main`（主干）
   - `release/*`（发布分支）
4. 勾选以下选项：
   - **Require a pull request before merging**
     - *Required approving reviews*：至少 `1`（核心模块建议 `2`）
     - 勾选 *Require review from Code Owners*（强制 CODEOWNERS 审核）
   - **Require status checks to pass before merging**
     - 勾选 CI 必过项（如 `lint` / `typecheck` / `test`）
   - **Require conversation resolution before merging**（所有讨论需解决）
   - **Do not allow bypassing the above settings**（管理员也不绕过，可选但推荐）
5. 点击 **Create** / **Save changes**。

启用后，任何对受保护分支的直推将被拒绝，必须通过 PR + owner 审核才能合并。

---

## 二、CODEOWNERS 作用与配置说明

### 2.1 作用

`.github/CODEOWNERS` 文件定义"哪些路径由谁负责"。当 PR 修改了某路径下的文件时，GitHub 会**自动把对应 owner 加为审核人**，并在分支保护启用 *Require review from Code Owners* 后，**必须由该 owner 审核通过才能合并**。

### 2.2 本仓库的 owner 分配

| 模块 | 路径 | Owner |
| --- | --- | --- |
| 后端 - consult | `/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/` | `@backend-owner` |
| 后端 - payment | `/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/payment/` | `@backend-owner` |
| 后端 - auth | `/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/auth/` | `@backend-owner` |
| 数据库 schema | `/apps/AWKN-LABlife/awkn-life-backend/apps/api-server/prisma/` | `@backend-owner` |
| 前端 | `/apps/AWKN-LABlife/app/src/` | `@frontend-owner` |
| 知识库服务 | `/apps/AWKN-LABlife/services/knowledge-service/`、`/knowledge/` | `@ai-owner` |
| 部署与运维 | `/.github/`、`/apps/AWKN-LABlife/scripts/`、`/apps/AWKN-LABlife/DEPLOY.md` | `@devops-owner` |
| 默认（未匹配） | `*` | `@owner1` |

> 注：以上 `@backend-owner` 等为占位符，接入正式仓库时需替换为真实 GitHub 用户名或 Team（如 `@org/backend-team`）。

### 2.3 修改 CODEOWNERS

- 修改 `.github/CODEOWNERS` 本身会触发 `@devops-owner` 审核（因为 `/.github/` 由 devops-owner 负责）。
- 新增模块时，按 `路径 @owner` 格式追加，路径以 `/` 开头表示仓库根，以 `/` 结尾表示目录。

---

## 三、PR 审核流程

```
提交 PR ──> 自动检查 (CI/lint/typecheck/test) ──> CODEOWNERS 自动分配审核人 ──> Owner 审核 ──> 合并
                                                          │
                                                          ├── 放行 (Approve)
                                                          ├── 打回 (Request changes)
                                                          └── 升级 (Escalate to lead)
```

### 3.1 提交 PR

1. 在功能分支上完成开发并推送。
2. 在 GitHub 上向 `main`（或目标分支）发起 Pull Request。
3. PR 模板（`.github/pull_request_template.md`）会自动填充，按模板填写：
   - 变更说明
   - 变更类型
   - 测试结果（lint / typecheck / test / 手动验证）
   - 风险
   - 验收清单

### 3.2 自动检查

- CI（`.github/workflows/ci.yml`）自动运行 lint / typecheck / test。
- 任一失败即阻塞合并，作者需修复后重新推送。
- CODEOWNERS 引擎根据改动文件自动把对应 owner 加为 *Required reviewer*。

### 3.3 Owner 审核

owner 审核时只能给出以下三种结论之一：

| 结论 | 操作 | 含义 |
| --- | --- | --- |
| **放行** | *Approve* | 代码符合规范、风险可控、可合并 |
| **打回** | *Request changes* | 存在必须修复的问题，作者修改后重新请求审核 |
| **升级** | *Escalate to lead* | 超出 owner 判断范围（如跨模块影响、架构级决策、安全/合规风险），@ 对应 lead 介入决策 |

#### 审核要点

- 是否符合 PRD / 技术冻结口径
- 是否有测试覆盖核心链路
- 是否影响向后兼容
- 是否引入未声明的依赖或环境变量
- 是否触碰安全/隐私边界（密钥、用户数据、权限）

### 3.4 合并

- 所有 required review 通过 + 所有 status check 通过 + 所有 conversation resolved → 允许合并。
- 合并方式建议 *Squash and merge*（保持主干提交历史整洁）。
- 合并后功能分支自动删除（仓库设置中开启 *Automatically delete head branches*）。

---

## 四、三结论规则（强制）

任何审核必须落到且只落到以下三种结论之一，**没有结论不得流转**：

1. **放行（Approve）**：明确点 *Approve*，可附简短说明。
2. **打回（Request changes）**：明确点 *Request changes*，并逐条列出必须修改项。
3. **升级（Escalate to lead）**：在评论中 `@` 对应 lead，说明升级原因，并暂停合并等待 lead 结论。

> 禁止"看了但不给结论"的隐性流转；禁止通过私聊/口头放行代替 PR 上的明确审核结论。

---

## 五、回滚

- 若合并后出现问题，优先通过新 PR *revert* 对应合并提交，不走 force push。
- revert PR 同样需要走完整审核流程（含 CODEOWNERS）。
- 紧急修复可走 *hotfix* 分支，但仍需 owner 在合并前 *Approve*（可走快通道，但不可跳过审核）。

---

## 六、相关文件

- `.github/CODEOWNERS`：owner 分配规则
- `.github/pull_request_template.md`：PR 模板
- `.github/workflows/ci.yml`：CI 自动检查