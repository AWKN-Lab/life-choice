# Checklist — 审核/CICD/部署 卡点修复验收

> 每个检查点必须基于实际代码/配置/运行结果验证，不可凭文档声明。

---

## P0 阻断级验收（上线前必须全部 ✓）

### 安全扫描
- [ ] `apps/AWKN-LABlife/app/eslint.config.js` 已接入 eslint-security 插件
- [ ] `.github/workflows/ci.yml` 存在 `security` job
- [ ] security job 运行 `npm audit --audit-level=high`
- [ ] security job 失败时阻断流水线（PR 无法合并）
- [ ] security job 在 PR 评论中列出漏洞详情

### 部署门禁与回滚
- [ ] `apps/AWKN-LABlife/scripts/smoke-test.sh` 存在且可执行
- [ ] smoke-test.sh 覆盖 5 个核心链路（首页/咨询/支付/健康/静态资源）
- [ ] `ci.yml` deploy job 在部署前执行 smoke-test
- [ ] smoke-test 失败时部署被阻断（不执行 pm2 reload）
- [ ] 部署后 5 分钟内连续 3 次 `/health` 失败时自动执行 rollback.sh
- [ ] 部署失败时触发告警（邮件/webhook）

### 密钥管理
- [ ] `.env.prod.example` 存在，列出所有生产环境变量（无真实值）
- [ ] `docs/05审核与质量/密钥管理SOP.md` 存在
- [ ] `docker-compose.yml` 不再引用不存在的 `.env.prod`
- [ ] SOP 文档说明轮换频率、存储位置、访问权限

### 日志聚合
- [ ] 后端 `package.json` 含 `winston` + `winston-daily-rotate-file` 依赖
- [ ] `apps/api-server/src/logger.ts` 存在（winston 实例 + 每日轮转）
- [ ] 后端代码无 `console.log/error` 残留（grep 验证）
- [ ] 日志文件写入 `logs/backend-*.log`，每日轮转
- [ ] 日志保留 30 天（旧日志自动删除）

### 错误监控
- [ ] 后端 `package.json` 含 `@sentry/node` 依赖
- [ ] 前端 `package.json` 含 `@sentry/react` 依赖
- [ ] 后端 `main.ts` 集成 Sentry（捕获未捕获异常）
- [ ] 前端 `main.tsx` 集成 Sentry（React 错误边界）
- [ ] `.env.example` 含 `SENTRY_DSN`
- [ ] 手动触发异常后 Sentry 控制台能看到事件

### HTTPS 证书续期
- [ ] `apps/AWKN-LABlife/scripts/cert-renew.sh` 存在且可执行
- [ ] cert-renew.sh 执行 `certbot renew` + `nginx -s reload`
- [ ] `DEPLOY.md` 说明 cron 配置（每周一 03:00）
- [ ] 提供服务器端 cron 安装命令

### 健康检查
- [ ] `/health` 实际执行 `prisma.$queryRaw('SELECT 1')`
- [ ] DB 异常时 `/health` 返回 503
- [ ] `/health/db` 返回真实 DB 连接状态 + 响应时间
- [ ] `/health/ready` 就绪探针存在（检查 DB + 关键依赖）

### 数据库备份
- [ ] `apps/AWKN-LABlife/scripts/cron-backup.sh` 存在且可执行
- [ ] cron-backup.sh 备份 SQLite 到 `/opt/awkn-life-backups/`
- [ ] cron-backup.sh 保留最近 30 份
- [ ] `DEPLOY.md` 说明 cron 配置（每日 02:00）
- [ ] `deploy.sh` 部署前自动创建备份点

---

## P1 重要级验收（上线后 1 周内完成）

### Git Hooks 三件套
- [ ] 根 `package.json` 含 husky + lint-staged + @commitlint/cli 依赖
- [ ] `.husky/pre-commit` 存在（运行 lint-staged）
- [ ] `.husky/commit-msg` 存在（运行 commitlint）
- [ ] `commitlint.config.js` 存在（Conventional Commits 规范）
- [ ] `.lintstagedrc.json` 存在
- [ ] 克隆项目后 `npm install` 自动启用 hooks
- [ ] 非规范 commit（如 `update code`）被拒绝
- [ ] 旧 `scripts/git-hooks/pre-commit` 已移除或标注 deprecated

### CODEOWNERS + PR 模板
- [ ] `.github/CODEOWNERS` 存在（按模块分配 owner）
- [ ] `.github/pull_request_template.md` 存在
- [ ] PR 模板含变更说明 + 测试 + 风险 + 验收四项
- [ ] 修改核心目录时自动请求 owner 审核

### 测试覆盖率门禁
- [ ] `apps/AWKN-LABlife/app/vitest.config.ts` 含 coverage thresholds
- [ ] thresholds 设置为 lines 60% / functions 50% / branches 40%
- [ ] `ci.yml` 后端测试不再有 `--no-coverage`
- [ ] CI 生成 coverage 报告
- [ ] 覆盖率低于阈值时流水线失败

### pre-commit 完整门禁
- [ ] `.husky/pre-commit` 运行 typecheck（前端 + 后端）
- [ ] pre-commit 同时运行 lint + typecheck

### 移除 forceExit + Flaky 检测
- [ ] `ci.yml` 后端测试不再有 `--forceExit`
- [ ] 未清理的 setTimeout/handle 已修复
- [ ] CI 测试增加 `--retry 2` 处理 Flaky

### 环境变量统一
- [ ] `ecosystem.config.js` 无硬编码 env（DOUBAO_BASE_URL、模型名等）
- [ ] PM2 自动加载 `.env`
- [ ] `schema.prisma` (sqlite) vs 根 `.env` (postgresql) 不一致已修复

### docker-compose 清理
- [ ] `docker-compose.yml` 无 `backend-db` 伪数据库容器
- [ ] `DEPLOY.md` 明确"SQLite 单实例，不支持水平扩展"

### 回滚脚本修复
- [ ] `deploy.sh` 部署前自动创建 `/opt/awkn-life-backup-{timestamp}` 备份点
- [ ] `rollback.sh` 确认备份点存在后才执行回滚
- [ ] 根目录 `scripts/` 与 `apps/AWKN-LABlife/scripts/` 的重复脚本已合并

### 审核 SOP
- [ ] `.trae/rules/review-sop.md` 存在
- [ ] `docs/05审核与质量/审核SOP.md` 存在
- [ ] 审核 SOP 含 PR 审核清单 + 必填检查项 + 三结论规则（放行/打回/升级）

---

## P2 改进级验收（迭代优化）

### staging 环境
- [ ] `ci.yml` 含 `staging-deploy` job
- [ ] main 分支自动部署到 staging
- [ ] prod 部署需手动触发
- [ ] `docs/05审核与质量/环境晋级流程.md` 存在

### Pipeline 可观测性
- [ ] README 含 build status badge
- [ ] CI 失败时发送通知

### dependabot
- [ ] `.github/dependabot.yml` 存在
- [ ] dependabot 每周检查 npm 依赖更新

### turbo 启用
- [ ] `ci.yml` 后端构建使用 `npx turbo run build test`
- [ ] 二次构建命中 turbo 缓存

### bundle analyzer
- [ ] 前端 `package.json` 含 `rollup-plugin-visualizer`
- [ ] `npm run build` 后生成 `stats.html`

### 清理 it.skip
- [ ] 无 `it.skip` 残留（grep 验证）
- [ ] test-7-memory-trigger 已修复或重新评估
- [ ] test-8-active-followup 已修复或重新评估
- [ ] test-2-wealth 已修复或重新评估
- [ ] test-1-big-word 已修复或重新评估

### 文档对齐
- [ ] `test-strategy.md` 标注"9 步 Pipeline 测试规划"为"未落地"
- [ ] `execution-framework.md` 明确 SQLite→PostgreSQL 迁移真实状态
- [ ] SSH 别名统一（DEPLOY.md 与 fix-404 文档一致）

### 验收报告
- [ ] `docs/05审核与质量/上线前卡点修复验收报告.md` 存在
- [ ] 报告覆盖所有 P0 项的修复状态
- [ ] 报告覆盖所有 P1 项的修复状态
- [ ] 报告含未完成项的说明与后续计划

---

## 最终验收（DoD）

### 用户可见体验
- [ ] 生产环境 5xx 错误率 < 1%（Sentry 监控验证）
- [ ] 部署失败时自动回滚（手动触发验证）
- [ ] 证书到期前自动续期（certbot dry-run 验证）
- [ ] 数据库每日自动备份（手动触发 cron-backup.sh 验证）

### 系统可观测性
- [ ] Sentry 控制台能看到后端 + 前端异常
- [ ] 日志文件按日轮转，保留 30 天
- [ ] `/health` 返回真实 DB 状态
- [ ] CI 失败时收到通知

### 稳定性
- [ ] CI 流水线 9 段全部通过
- [ ] 安全扫描无 high/critical 漏洞
- [ ] 测试覆盖率达标（lines 60% / functions 50% / branches 40%）
- [ ] 无 `--forceExit` 测试也能正常退出

### 回归清单
- [ ] 现有 39 个后端 spec 测试全部通过
- [ ] 现有 5 个前端 test 全部通过
- [ ] 部署流程未破坏（手动部署一次验证）
- [ ] 回滚流程未破坏（手动回滚一次验证）
