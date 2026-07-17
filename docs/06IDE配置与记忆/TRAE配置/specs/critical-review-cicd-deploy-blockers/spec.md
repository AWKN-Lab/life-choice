# 审核/CICD/部署 卡点批判性分析与修复 Spec

> change-id: `critical-review-cicd-deploy-blockers`
> 版本：v1.0 | 创建日期：2026-06-18 | 状态：待用户批准
> 范围：审核（Review/QA/Security）+ CICD（流水线/质量门禁）+ 部署（运维/监控/回滚）

---

## Why

项目即将上线，但批判性深度分析发现**审核/CICD/部署三领域存在 9 个 P0 阻断级卡点**：

1. **审核侧**：零安全扫描（涉及 Stripe 支付 + JWT + Supabase 的项目却无 npm audit / eslint-security / snyk）
2. **CICD 侧**：main 分支 push 直连 SSH 部署生产，无回滚、无金丝雀、无健康门禁、无密钥管理
3. **部署侧**：零日志聚合、零监控告警、HTTPS 证书无自动续期、备份无定时调度

当前状态是"能部署但不能运维、有 CI 无安全、有测试无审核"的半成品。任何事故都将变成"用户先发现、无法定位、无法回滚"的灾难。**必须在上线前补齐 P0 项**。

---

## What Changes

### A. 审核领域修复（5 项）

- **新增** eslint-security 插件 + npm audit 自动化（CI 中新增 security job）
- **新增** CODEOWNERS + PR 模板 + 审核 SOP 文档
- **新增** 测试覆盖率 thresholds（lines 60% / functions 50% / branches 40%）
- **修改** CI 关闭 `--no-coverage`，启用覆盖率报告与门禁
- **修改** `_tmp_review_skill.md` 正式化为 `.trae/rules/review-sop.md`

### B. CICD 领域修复（7 项）

- **新增** husky + lint-staged + commitlint 三件套（Git Hooks 自动启用）
- **新增** pre-commit 完整门禁（typecheck + lint + test，非仅 tsc）
- **新增** `.env.prod.example` + 密钥管理 SOP（统一权威来源）
- **新增** staging 环境与晋级流程（main → staging → prod）
- **新增** 部署前置健康门禁 + 回滚脚本自动化
- **修改** `ci.yml` deploy job：增加冒烟测试、健康检查、失败自动回滚
- **修改** 移除 `--forceExit`，引入 Flaky 检测与重试

### C. 部署领域修复（8 项）

- **新增** 日志聚合（winston + 文件轮转 + 错误上报）
- **新增** 监控告警（Sentry 错误监控 + 简单 uptime 告警）
- **新增** HTTPS 证书自动续期（certbot + cron/systemd timer）
- **新增** 备份定时调度（cron 每日 02:00 + 保留 30 份）
- **修改** 健康检查端点：`/health` 实际 ping DB + Redis + 关键依赖
- **修改** `docker-compose.yml`：移除伪数据库容器，明确 SQLite 单实例约束
- **修改** `ecosystem.config.js`：移除硬编码环境变量，统一走 `.env`
- **新增** 部署后冒烟测试脚本（5 个核心链路自动验证）

### D. 文档与流程对齐（3 项）

- **修改** `test-strategy.md`：将"9 步 Pipeline 测试规划"标注为"未落地"，重新评估优先级
- **修改** `execution-framework.md`：明确 SQLite→PostgreSQL 迁移的真实状态（计划与执行矛盾）
- **新增** `docs/05审核与质量/上线前卡点修复验收报告.md`

---

## Impact

### 受影响的代码

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `.github/workflows/ci.yml` | 修改 | 新增 security/staging job，deploy job 加门禁 |
| `apps/AWKN-LABlife/app/eslint.config.js` | 修改 | 接入 eslint-security |
| `apps/AWKN-LABlife/app/package.json` | 修改 | 新增 husky/lint-staged/commitlint/sentry 依赖 |
| `apps/AWKN-LABlife/awkn-life-backend/package.json` | 修改 | 新增 winston/sentry 依赖 |
| `apps/AWKN-LABlife/awkn-life-backend/ecosystem.config.js` | 修改 | 移除硬编码 env |
| `apps/AWKN-LABlife/docker-compose.yml` | 修改 | 移除伪数据库容器 |
| `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/health.controller.ts` | 修改 | 实际 ping DB |
| `apps/AWKN-LABlife/app/vitest.config.ts` | 修改 | 增加 coverage thresholds |
| `.github/CODEOWNERS` | 新增 | 强制审核 |
| `.github/pull_request_template.md` | 新增 | PR 模板 |
| `.env.prod.example` | 新增 | 密钥管理 SOP |
| `apps/AWKN-LABlife/scripts/smoke-test.sh` | 新增 | 部署后冒烟 |
| `apps/AWKN-LABlife/scripts/cron-backup.sh` | 新增 | 定时备份 |
| `.husky/pre-commit` | 新增 | 自动启用门禁 |
| `commitlint.config.js` | 新增 | commit 规范 |

### 受影响的系统

- **CI/CD 流水线**：从 6 段扩展到 9 段（+security +staging +smoke-gate）
- **生产环境**：新增日志聚合 + 监控告警 + 自动备份 + 证书续期
- **开发流程**：所有 PR 强制审核 + commit 规范 + 覆盖率门禁

### 受影响的现有 spec

- `code-deploy-and-backend-warn-fix`（部署修复类，本 spec 是其延伸与升级）
- `zhangbanshan-benchmark-upgrade`（张半山基准升级，依赖本 spec 的测试基建）

---

## ADDED Requirements

### Requirement: 安全扫描自动化

系统 SHALL 在每次 CI 运行时执行 `npm audit` + `eslint-security` 扫描，发现 high/critical 漏洞时阻断流水线。

#### Scenario: 发现 critical 漏洞
- **WHEN** CI security job 运行 `npm audit --audit-level=high`
- **AND** 发现 1 个 critical 漏洞
- **THEN** 流水线失败，PR 无法合并
- **AND** 在 PR 评论中列出漏洞详情与修复建议

#### Scenario: 无漏洞
- **WHEN** CI security job 运行
- **AND** 无 high/critical 漏洞
- **THEN** 流水线继续，security job 标记为 pass

### Requirement: 部署前置健康门禁

系统 SHALL 在生产部署前执行冒烟测试，全部通过后才允许 `pm2 reload`。

#### Scenario: 冒烟测试通过
- **WHEN** deploy job 执行 `smoke-test.sh`
- **AND** 5 个核心链路（首页/咨询/支付/健康/静态资源）全部返回 200
- **THEN** 继续执行 `pm2 reload`
- **AND** 部署后再次执行冒烟，确认服务可用

#### Scenario: 冒烟测试失败
- **WHEN** deploy job 执行 `smoke-test.sh`
- **AND** 任一链路返回非 200 或超时
- **THEN** 阻断部署，不执行 `pm2 reload`
- **AND** 触发告警，通知运维人员

### Requirement: 自动回滚

系统 SHALL 在部署后 5 分钟内检测到服务异常时，自动回滚到上一个稳定版本。

#### Scenario: 部署后服务异常
- **WHEN** 部署完成
- **AND** 5 分钟内 `/health` 连续 3 次返回非 200
- **THEN** 自动执行 `rollback.sh` 回滚到上一个备份
- **AND** 发送告警通知

### Requirement: 日志聚合与错误监控

系统 SHALL 集成 winston 日志（带文件轮转）+ Sentry 错误监控，所有未捕获异常自动上报。

#### Scenario: 后端抛出未捕获异常
- **WHEN** API 处理请求时抛出未捕获异常
- **THEN** winston 写入 `logs/backend-error-YYYY-MM-DD.log`（每日轮转，保留 30 天）
- **AND** Sentry 上报异常堆栈 + 请求上下文
- **AND** 运维收到 Sentry 邮件告警

### Requirement: 监控告警

系统 SHALL 对核心指标（API 可用性 / 响应时间 / 错误率）进行监控，超阈值时告警。

#### Scenario: API 错误率超阈值
- **WHEN** 最近 5 分钟 API 5xx 错误率 > 5%
- **THEN** 触发告警（邮件/钉钉/微信）
- **AND** 告警包含错误率、影响请求数、top3 错误码

### Requirement: HTTPS 证书自动续期

系统 SHALL 配置 certbot + cron，在证书到期前 30 天自动续期。

#### Scenario: 证书即将到期
- **WHEN** 证书剩余有效期 < 30 天
- **AND** cron 每周一 03:00 执行 `certbot renew`
- **THEN** 证书自动续期
- **AND** nginx 自动 reload

### Requirement: 数据库定时备份

系统 SHALL 每日 02:00 自动备份数据库，保留最近 30 份。

#### Scenario: 日常备份
- **WHEN** cron 每日 02:00 触发 `cron-backup.sh`
- **THEN** 执行 SQLite 备份到 `/opt/awkn-life-backups/`
- **AND** 保留最近 30 份，删除更旧的
- **AND** 备份成功后写入日志

### Requirement: 强制代码审核

系统 SHALL 通过 CODEOWNERS 强制核心目录的 PR 必须由 owner 审核。

#### Scenario: 修改核心目录
- **WHEN** PR 修改 `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/src/consult/`
- **THEN** 必须由 consult 模块 owner 审核
- **AND** owner 审核通过前 PR 无法合并

### Requirement: Commit 规范

系统 SHALL 通过 commitlint 强制 commit message 符合 Conventional Commits 规范。

#### Scenario: 非规范 commit
- **WHEN** 开发者提交 `update code`
- **THEN** commit 被 husky pre-commit hook 拒绝
- **AND** 提示正确格式 `feat(scope): description`

### Requirement: 测试覆盖率门禁

系统 SHALL 在 CI 中强制测试覆盖率达标（lines ≥ 60% / functions ≥ 50% / branches ≥ 40%）。

#### Scenario: 覆盖率达标
- **WHEN** CI 运行测试并生成 coverage 报告
- **AND** lines 65% / functions 55% / branches 45%
- **THEN** 流水线继续

#### Scenario: 覆盖率不达标
- **WHEN** CI 运行测试
- **AND** lines 55%（低于 60%）
- **THEN** 流水线失败
- **AND** 报告显示未覆盖的关键文件

---

## MODIFIED Requirements

### Requirement: CI 流水线

**修改前**：6 段（lint/typecheck/test/build/docker-check/deploy），deploy 直连生产无门禁。

**修改后**：9 段（lint/typecheck/test/coverage/security/build/docker-check/staging-deploy/prod-deploy-with-gate）。
- prod-deploy 前置冒烟门禁
- 失败自动回滚
- staging 环境先行验证

### Requirement: 健康检查端点

**修改前**：`/health` 仅返回固定 JSON，不实际检测依赖。`/health/db` 返回固定 `db: 'connected'`。

**修改后**：
- `/health` 实际 ping DB（执行 `SELECT 1`）+ 检测关键依赖
- `/health/db` 返回真实 DB 连接状态 + 响应时间
- `/health/ready` 新增就绪探针（部署时使用）

### Requirement: Git Hooks

**修改前**：`scripts/git-hooks/pre-commit` 需手动 `npm run setup:hooks` 启用，仅运行 tsc。

**修改后**：husky 自动启用，pre-commit 运行 typecheck + lint-staged（lint + format），commit-msg 运行 commitlint。

### Requirement: 环境变量管理

**修改前**：`ecosystem.config.js` 硬编码 `DOUBAO_BASE_URL`、模型名等，与 `.env` 职责重叠。

**修改后**：`ecosystem.config.js` 仅保留进程管理配置，所有环境变量统一走 `.env`（PM2 自动加载 `dotenv`）。

---

## REMOVED Requirements

### Requirement: 伪数据库容器

**Reason**：`docker-compose.yml` 的 `backend-db` 用 alpine + `tail -f /dev/null` 占位，无实际数据库服务，误导且浪费资源。

**Migration**：移除该 service，明确 SQLite 单实例约束（在 `DEPLOY.md` 中标注"SQLite 单实例，不支持水平扩展，PostgreSQL 迁移见 Week 16-20 计划"）。

### Requirement: `--forceExit` 测试选项

**Reason**：`ci.yml:49` 后端测试用 `--forceExit` 掩盖未清理的句柄，潜在 Flaky 隐患。

**Migration**：移除 `--forceExit`，修复未清理的 setTimeout/handle，引入 `--retry` 机制处理 Flaky。

### Requirement: `--no-coverage` CI 选项

**Reason**：`ci.yml:49` 显式关闭覆盖率，导致测试覆盖率长期不可见。

**Migration**：移除 `--no-coverage`，启用 v8 coverage + thresholds 门禁。

---

## 假设与约束

### 假设
1. 假设项目有 Sentry 免费额度（或可接受自建 GlitchTip）
2. 假设服务器有 cron 可用（Linux 环境）
3. 假设运维人员能配置 certbot（已有 DEPLOY.md 提及）
4. 假设团队接受 commitlint 规范（Conventional Commits）

### 约束
- 不引入新的 SaaS 依赖（Sentry 免费版除外）
- 不改变现有 SQLite 数据库（PostgreSQL 迁移是独立项目）
- 不破坏现有 CI 流水线（增量升级，每步可回滚）
- 所有改动必须可回滚（Git commit 节点）
- 上线前必须完成所有 P0 项

### 不做
- 不做 PostgreSQL 迁移（独立项目，Week 16-20）
- 不做 K8s 化部署（当前 PM2 单实例足够）
- 不做 APM 全链路追踪（Sentry 错误监控足够）
- 不做负载均衡（单实例 + SQLite 约束）
- 不重构 ResultPage.tsx 1539 行巨石（独立重构任务）
