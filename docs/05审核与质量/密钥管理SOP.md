# 密钥管理 SOP（Standard Operating Procedure）

> **版本**：v1.0
> **生效日期**：2026-06-19
> **适用范围**：人生决策宗师项目所有生产环境密钥
> **维护人**：DevOps 工程师 + CTO
> **关联文档**：`.env.prod.example`、`constitution.md`、`docs/06IDE配置与记忆/TRAE配置/specs/critical-review-cicd-deploy-blockers/`

---

## 1. 目的

统一规范人生决策宗师项目所有生产密钥的**分类、存储、轮换、访问、泄露应急**流程，防止：
- 密钥泄露导致生产事故
- 密钥散落在多处难以管理
- 人员变动后密钥失控
- 密钥长期不轮换被破解

---

## 2. 密钥分类

| 分类 | 环境变量 | 风险等级 | 说明 |
|------|----------|----------|------|
| **数据库** | `DATABASE_URL` | 高 | SQLite 路径或 PostgreSQL 连接串（含密码） |
| **JWT 鉴权** | `JWT_SECRET` | 极高 | 一旦泄露，攻击者可伪造任意用户 token |
| **支付密钥** | `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`WECHAT_API_KEY`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY` | 极高 | 涉及资金流转，泄露直接经济损失 |
| **LLM API Key** | `DOUBAO_API_KEY`、`KIMI_API_KEY`、`MINIMAX_API_KEY`、`DEEPSEEK_*_API_KEY`、`SENSENOVA_API_KEY`、`SPARK_API_KEY`、`OPENAI_API_KEY`、`VOLCENGINE_API_KEY`、`ARK_API_KEY` | 高 | 泄露导致 API 账单被刷 |
| **第三方 BaaS** | `SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` | 高 | Service Role Key 拥有数据库完全权限 |
| **错误监控** | `SENTRY_DSN` | 中 | 泄露可上报虚假事件，无数据读取权限 |
| **管理员账号** | `ADMIN_EMAIL`、`ADMIN_PASSWORD`、`ADMIN_NICKNAME` | 极高 | 拥有后台完全权限 |
| **Webhook 密钥** | `STRIPE_WEBHOOK_SECRET` | 高 | 用于验证支付回调真实性 |

---

## 3. 存储位置

### 3.1 生产服务器（唯一权威来源）

| 项 | 路径 / 位置 |
|----|-------------|
| **生产 env 文件** | `/opt/awkn-life/awkn-life-backend/apps/api-server/.env.prod` |
| **文件权限** | `600`（仅 owner 可读写） |
| **owner** | `root:root` |
| **加载方式** | PM2 `ecosystem.config.js` 启动时通过 `dotenv` 自动加载 |
| **备份位置** | `/tmp/.env.prod-{timestamp}`（回滚时临时使用，部署后清理） |

### 3.2 访问权限

| 角色 | 访问级别 | 说明 |
|------|----------|------|
| **CTO** | 完全访问 | 可读取、修改、轮换所有密钥 |
| **DevOps 工程师** | 完全访问 | 可读取、修改、轮换所有密钥 |
| **后端开发** | 间接访问 | 通过运维申请，不得直接登录服务器读取 |
| **前端开发** | 无访问 | 前端密钥（VITE_*）由运维注入构建环境 |
| **其他人员** | 无访问 | 任何场景不得接触生产密钥 |

### 3.3 严禁存储位置

- ❌ Git 仓库（`.env.prod` 已在 `.gitignore`）
- ❌ 前端代码（`VITE_*` 变量会被打包进客户端，仅限公开密钥）
- ❌ 日志文件（winston 配置必须过滤敏感字段）
- ❌ 即时通讯工具（微信、钉钉、飞书聊天记录）
- ❌ 邮件正文
- ❌ 截图
- ❌ CI/CD 构建日志

---

## 4. 轮换频率

| 密钥类型 | 轮换周期 | 触发条件 | 责任人 |
|----------|----------|----------|--------|
| **JWT_SECRET** | 90 天 | 定期 / 人员变动 / 疑似泄露 | DevOps |
| **支付密钥（Stripe / 微信 / 支付宝）** | 180 天 | 定期 / 商户变更 / 疑似泄露 | DevOps + CTO |
| **LLM API Key（所有 Provider）** | 90 天 | 定期 / 用量异常 / 疑似泄露 | DevOps |
| **SUPABASE_SERVICE_ROLE_KEY** | 90 天 | 定期 / 项目变更 / 疑似泄露 | DevOps |
| **ADMIN_PASSWORD** | 90 天 | 定期 / 人员变动 / 疑似泄露 | CTO |
| **SENTRY_DSN** | 180 天 | 定期 / 项目迁移 | DevOps |
| **DATABASE_URL（含密码）** | 180 天 | 定期 / 迁移数据库 / 疑似泄露 | DevOps + CTO |

### 4.1 轮换流程

1. **申请**：运维在内部工单系统提交轮换申请，注明密钥类型、原因、计划时间
2. **审批**：CTO 审批（支付密钥 + 管理员密码必须 CTO 审批）
3. **生成新密钥**：使用强随机生成器（`openssl rand -hex 32`）
4. **更新 `.env.prod`**：在服务器上直接编辑，不经过本地
5. **重启服务**：`pm2 restart awkn-life-backend`
6. **验证**：执行冒烟测试（`scripts/smoke-test.sh`），确认服务正常
7. **归档**：在密钥管理台账记录轮换时间、执行人、旧密钥作废时间
8. **监控**：轮换后 24 小时内密切关注错误率与异常请求

### 4.2 轮换台账

> 维护位置：内部密钥管理台账（不在此文档记录具体值）

| 密钥 | 上次轮换日期 | 下次轮换截止 | 执行人 | 备注 |
|------|-------------|-------------|--------|------|
| JWT_SECRET | _待填写_ | _待填写_ | _待填写_ | |
| STRIPE_SECRET_KEY | _待填写_ | _待填写_ | _待填写_ | |
| DOUBAO_API_KEY | _待填写_ | _待填写_ | _待填写_ | |
| ... | | | | |

---

## 5. 泄露应急流程

### 5.1 发现泄露后的 1 小时内（黄金时间）

| 时间 | 动作 | 责任人 |
|------|------|--------|
| T+0 min | 确认泄露范围（哪些密钥、泄露渠道、已暴露时长） | 发现人 → DevOps |
| T+5 min | 通知 CTO + 运维负责人（电话 + 即时通讯） | DevOps |
| T+15 min | **立即轮换泄露密钥**（不等审批，先轮换后补流程） | DevOps |
| T+30 min | 重启受影响服务，验证新密钥生效 | DevOps |
| T+45 min | 排查泄露源（git 历史 / 日志 / 聊天记录 / 截图） | DevOps + CTO |
| T+60 min | 编写泄露事件初步报告（时间线、影响范围、根因、后续动作） | DevOps |

### 5.2 24 小时内

- [ ] 全量轮换同级别密钥（如泄露 JWT_SECRET，则所有鉴权相关密钥全部轮换）
- [ ] 检查 git 历史，使用 `git log -p` 搜索泄露的密钥值，确认是否已提交
- [ ] 如已提交到 git，使用 `git filter-branch` 或 BFG 清理历史（需 CTO 批准）
- [ ] 检查服务器访问日志，确认是否有异常 IP 访问
- [ ] 检查 LLM API 用量，确认是否有异常调用
- [ ] 检查支付记录，确认是否有异常交易
- [ ] 编写完整事件复盘报告，归档至 `docs/05审核与质量/`

### 5.3 泄露后的密钥作废

- 旧密钥立即作废，不得保留任何副本
- 在对应平台（Stripe / 火山引擎 / Moonshot 等）后台删除旧 Key
- 服务器上的 `/tmp/.env.prod-*` 备份文件立即删除

---

## 6. 严禁事项（红线）

> 以下行为一经发现，立即上报 CTO，并按公司安全制度处理。

1. **严禁**将 `.env.prod` 提交到 git 仓库
2. **严禁**在前端代码中硬编码后端密钥（`VITE_*` 变量仅限公开密钥）
3. **严禁**在日志中打印任何密钥值（winston 必须配置 `redact` 过滤）
4. **严禁**在即时通讯工具、邮件、截图中传输密钥明文
5. **严禁**将生产密钥用于开发 / 测试环境
6. **严禁**将开发 / 测试密钥用于生产环境
7. **严禁**在公开仓库（GitHub Issue / PR / Discussion）中提及密钥
8. **严禁**将密钥写入 Docker 镜像（必须通过 env_file 或 PM2 env 注入）
9. **严禁**在 CI/CD 构建日志中输出密钥值
10. **严禁**多人共用同一套密钥（每人应有独立的开发环境密钥）

---

## 7. 环境隔离原则

| 环境 | 密钥来源 | 隔离要求 |
|------|----------|----------|
| **开发环境** | `apps/AWKN-LABlife/.env`（本地） | 使用测试密钥，不得使用生产密钥 |
| **测试环境** | CI Secrets | 使用测试密钥，不得使用生产密钥 |
| **Staging 环境** | 服务器 `.env.staging` | 使用独立密钥，可与生产同级别但不得复用 |
| **生产环境** | 服务器 `.env.prod` | 唯一权威来源，仅运维 + CTO 可访问 |

---

## 8. 审计与检查

### 8.1 定期审计（每月一次）

- [ ] 检查 `.gitignore` 是否包含 `.env.prod`、`.env.production`、`.env.local`
- [ ] 执行 `git log --all -p -- '*.env*'` 确认无密钥提交历史
- [ ] 检查服务器 `.env.prod` 文件权限是否为 `600`
- [ ] 检查 PM2 日志是否泄露密钥（`pm2 logs awkn-life-backend --lines 1000 | grep -i key`）
- [ ] 核对密钥轮换台账，确认无逾期未轮换的密钥
- [ ] 检查离职人员是否已交接密钥访问权限

### 8.2 自动化检查（CI 集成）

- [ ] `eslint-plugin-security` 扫描代码中的硬编码密钥
- [ ] `git-secrets` 或 `truffleHog` 扫描提交内容
- [ ] CI 流水线失败时不得在日志中打印 `process.env` 全量

---

## 9. 相关文档

- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/.env.prod.example` — 生产环境配置模板
- `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/.env.example` — 开发环境配置模板
- `apps/AWKN-LABlife/app/.env.example` — 前端开发环境配置模板
- `apps/AWKN-LABlife/app/.env.production` — 前端生产构建配置（仅公开变量）
- `constitution.md` — 项目宪法（含密钥管理红线）
- `apps/AWKN-LABlife/ecosystem.config.js` — PM2 生产环境启动配置
- `docs/06IDE配置与记忆/TRAE配置/specs/critical-review-cicd-deploy-blockers/` — 卡点修复 spec

---

## 10. 变更记录

| 版本 | 日期 | 变更内容 | 变更人 |
|------|------|----------|--------|
| v1.0 | 2026-06-19 | 初始版本，建立密钥管理 SOP | DevOps |

---

## 11. 强制收尾句

> 下次遇到密钥相关变更，先做哪 3 件事？
> 1. 查看当前 `.env.prod` 状态与权限
> 2. 备份当前 `.env.prod` 到 `/tmp/.env.prod-{timestamp}`
> 3. 读取完整 `.env.prod.example` 确认所有变量与修改位置
