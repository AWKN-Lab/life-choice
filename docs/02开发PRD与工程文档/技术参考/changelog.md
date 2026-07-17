# 变更记录（Changelog）

> **版本**：v1.1
> **生成日期**：2026-06-15
> **最后更新**：2026-07-07
> **口径源**：[_ground-truth.md](../工程交接/_ground-truth.md)

---

## 2026-07-07｜生产技术文档校准

依据生产源码、PM2、SQLite、知识索引、Nginx 和公网入口只读取证，新增：

- `工程交接/ENGINEERING-当前生产技术基线-20260707.md`
- `接口文档/API-当前生产接口基线-20260707.md`
- `数据库文档/DATABASE-当前生产Schema基线-20260707.md`
- `部署文档/DEPLOY-当前生产基线-20260707.md`
- `测试用例/TEST-当前生产烟测基线-20260707.md`

同步更新：

- `_ground-truth.md` 升级至 v3.0，增加生产覆盖层。
- `engineering-handoff-master-v3.md` 增加生产事实入口。
- `deployment-doc.md`、`api-interface-doc.md`、`database-doc.md`、`test-cases-doc.md` 增加当前基线指针。
- `docs/文档索引.md` 将 2026-07-07 基线设为当前入口。

关键修正：

```text
后端端口：30000
前端目录：/www/wwwroot/awkn.cn/life
生产 Node：22.22.2
生产代码：4bbcd7c + 521 个已跟踪变更 + 19 个未跟踪项
数据库：生产 33 models / 5 migrations；本地 35 models / 8 migrations
知识库：1,135 books / 329,577 passages
磁盘：94%，剩余约 2.5GB
```

---

## 工程交接文档 v1.0 → v2.0 变更

### 2026-06-15 | v2.0 | 代码态全面修正

**变更原因**：v1.0 文档为规划态，与实际代码存在 14 处偏差，工程师无法无歧义执行。经代码探查后全面修正为代码态。

#### 🔴 致命级修正（架构/接口/数据结构）

| 文档 | 变更项 | v1.0 值 | v2.0 值 | 代码依据 |
|------|--------|---------|---------|---------|
| L2 | Pipeline 架构 | 9 模块线性串联 | 4 路由 + 两段式漏斗 + ReAct 循环 | `orchestrator.service.ts` |
| L2 | 输出格式 | 5 段 JudgmentReport | 三套并存（三段式 + 5 层 + 6 段 Prompt） | `generation-composer.service.ts` |
| L1/L2/L3/P1/P2 | UserState | 6 类 | 4 类（casual/genuine/repeating/validating） | `user-state-classifier.service.ts:4` |
| L3 | 记忆结构 | 5 类触发（identity/preference/issue/feedback/timing） | 7 类正则 + 4 JSON 字段 | `memory-extractor.service.ts` + `schema.prisma:71-85` |
| L3 | 状态机 | XState 9 节点 | 未实现（隐含 7 节点对话逻辑） | 无 xstate 依赖 |

#### 🟠 严重级修正（配置/组件）

| 文档 | 变更项 | v1.0 值 | v2.0 值 | 代码依据 |
|------|--------|---------|---------|---------|
| L4/Overview | 颜色系统 | mbs-* 5 色 | AETHERIA 设计系统（mbs-* 为 P2-7 规划） | `tailwind.config.js` |
| Overview | PM2 配置 | cluster mode 2 实例 | 1 实例 fork 500M | `ecosystem.config.js` |
| Overview/L2/P0 | LLM Provider | 6 通道 | 7+ 通道（默认 deepseek-direct） | `.env.example` |
| L3 | 高风险拦截 | 未实现 | 已实现（high-risk-detector.service.ts） | `safety/` 目录 |
| L4/P2 | 身份层 | identity-layer.ts 待建 | 已实现（prompt-layers.ts buildIdentityLayer()） | `prompt-layers.ts` |
| L4/P2 | 关系人 | relations.config.ts | 不存在（逻辑在 atom-tools/decision/relationship.ts 硬编码） | — |

#### 🟡 中等级修正

| 文档 | 变更项 | v1.0 值 | v2.0 值 |
|------|--------|---------|---------|
| P0 | /health/db | 泄露 DATABASE_URL | 已修复，返回 `{ db: 'connected', provider }` |
| P0 | deploy.sh | 无备份 | deploy_docker 有备份，deploy_pm2 无备份（已标注） |
| P1 | 支付通道 | 未说明 | 标注"接入状态待确认" |
| P1 | 积分系统 | 未说明 | 标注"初始规则待确认" |

#### 新增文件

| 文件 | 用途 |
|------|------|
| `_ground-truth.md` | 全文档集唯一口径源（11 个口径项） |
| `docs/engineering/db-schema.md` | 数据库 Schema 参考（32 个模型） |
| `docs/engineering/api-reference.md` | API 接口参考（90+ 端点） |
| `docs/engineering/deployment.md` | 部署指南（3 种模式 + 环境变量 + 回滚） |
| `docs/engineering/test-strategy.md` | 测试策略（9 步 Pipeline + 三套输出 + 4 类 UserState） |
| `docs/engineering/changelog.md` | 本文件 |

#### 删除内容

| 文件 | 删除项 | 原因 |
|------|--------|------|
| L2 | 顶部勘误块 | 勘误已融入正文 |
| L3 | 顶部勘误块 | 勘误已融入正文 |
| L1 | §四 6 类测试集表格 | 替换为 4 类 |
| P2 | 与 L1/L3/L4 重复的详细设计 | 改为引用 + 差异说明 |

---

## 工程文档 v1.0 初始生成

### 2026-06-15 | v1.0 | 首次生成

基于修正后的工程交接文档 v2.0，生成以下工程文档：

| 文档 | 覆盖范围 |
|------|---------|
| `docs/engineering/db-schema.md` | 32 个 Prisma 模型完整说明 + ER 图 + 核心模型详解 + 迁移策略 + 索引策略 |
| `docs/engineering/api-reference.md` | 21 个 Controller、90+ 端点 + 请求/响应 Schema + 错误码 + 认证说明 |
| `docs/engineering/deployment.md` | 3 种部署模式 + 50+ 环境变量 + PM2 配置 + 健康检查 + 回滚 SOP |
| `docs/engineering/test-strategy.md` | Pipeline 9 步 + 两段式漏斗 + 三套输出 + 4 类 UserState + 高风险检测 + 记忆系统 + E2E |
| `docs/engineering/changelog.md` | 本文件 |

---

## 版本管理规则

- 每份文档头部标注版本号（v1.0 / v2.0 / ...）
- 修正已有文档 → 升小版本（v2.0 → v2.1）
- 新增文档或重大架构变更 → 升大版本（v2.0 → v3.0）
- 所有变更必须记录在本文件中
- 变更依据必须指向代码文件或决策文件
