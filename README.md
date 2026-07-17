<div align="center">

<!-- ═══ Typing Animation ═══ -->
<img src="https://readme-typing-svg.demolab.com?font=Noto+Sans+SC&weight=700&size=28&duration=3000&pause=800&color=6366F1&center=true&vCenter=true&multiline=false&width=700&lines=%E4%BA%BA%E7%94%9F%E5%86%B3%E7%AD%96%E5%AE%97%E5%B8%88+%C2%B7+Mr.Mont;AI+%E5%91%BD%E7%90%86%E5%92%A8%E8%AF%A2%E5%85%A8%E6%A0%88%E5%BA%94%E7%94%A8;%E5%AD%90%E5%B9%B3%E5%85%AB%E5%AD%97+%2B+%E5%A4%A7%E5%85%AD%E5%A3%AC%EF%BC%8C%E7%AE%97%E6%B3%95%E8%AF%81%E6%8D%AE%E9%A9%B1%E5%8A%A8%EF%BC%8CLLM+%E7%94%9F%E6%88%90%E7%9C%9F%E4%BA%BA%E8%AF%9D" alt="Typing SVG" />

<!-- ═══ Badges ═══ -->
<p>
  <a href="https://awkn.cn/life/"><img src="https://img.shields.io/badge/🌐_awkn.cn/life-人生决策宗师-18181b?style=flat-square" alt="Website" /></a>
  <a href="https://github.com/AWKN-Lab/Mr.Mont"><img src="https://img.shields.io/badge/GitHub-AWKN_Lab/Mr.Mont-18181b?style=flat-square&logo=github" alt="GitHub" /></a>
  <img src="https://img.shields.io/badge/Status-Production-success?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Version-v1.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=flat-square" alt="License" />
  <img src="https://komarev.com/ghpvc/?username=AWKN-Lab&label=Visitors&color=6366f1&style=flat-square" alt="Visitors" />
</p>

<!-- ═══ Tech Stack Badges ═══ -->
<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-Latest-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NestJS-Latest-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-Latest-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-Latest-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/DeepSeek-LLM-4D6BFE?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/PM2-Production-2B037A?style=flat-square&logo=pm2&logoColor=white" alt="PM2" />
  <img src="https://img.shields.io/badge/Nginx-Production-009639?style=flat-square&logo=nginx&logoColor=white" alt="Nginx" />
</p>

---

</div>

## 🧭 工程入口

进入本地仓库后先阅读 [`START-HERE.md`](START-HERE.md)。该文档提供当前生产主线、目录写入规则、工作前检查和工程治理入口。

```bash
git status --short
npm run audit:changes
npm run audit:moves
npm run audit:junk
npm run audit:backend
npm run audit:batches
npm run audit:workspace
```

## 🧬 项目简介

**人生决策宗师（Mr.Mont）** 是 AWKN-Lab 旗下的 AI 命理咨询全栈应用，融合**子平八字 + 大六壬**两大东方术数体系，以**算法证据驱动 + LLM 生成真人话**为核心架构。

| 特性 | 说明 |
|------|------|
| 🎯 **算法证据驱动** | BaziCalculatorWrapper / LiurenAgentService 生成结构化证据包，LLM 基于证据生成话术 |
| 🔍 **知识检索增强** | 内置东方玄学知识库 + Knowledge Service（Python 服务） |
| 🛡️ **质量门禁** | QualityGate 自动去 AI 味 / 去 JSON / 去空话 |
| 💎 **多 LLM Provider** | DeepSeek + Doubao + Kimi + MiniMax + SenseNova + OpenAI，自动 failover |
| 📊 **人生 K 线 + 潮汐图** | 独创的命理可视化体系（KlineDataSource: real/simulated/llm_inferred/fallback） |
| 🔐 **会员体系 + 支付** | Stripe + 微信支付 + 支付宝三通道 |

---

## 🏗️ 核心架构

```
用户输入 → IntentRouter → EvidencePacketBuilder → KnowledgeRetriever
         → GenerationComposer → QualityGate → 前台输出
```

| 层级 | 职责 | 核心组件 |
|------|------|---------|
| 算法证据层 | 生成八字/六壬证据包 | BaziCalculatorWrapper / LiurenAgentService |
| 知识检索层 | 检索知识库增强上下文 | Knowledge Service（127.0.0.1:8701） |
| 生成层 | LLM 生成真人话术 | LLM Providers + Prompt & Style Pack |
| 质检层 | 去 AI 味 / 去 JSON / 去空话 | QualityGate |
| 治理层 | P0 装甲（规则匹配+证据组装+知识检索） | RuleMatcher + EvidenceComposer + KnowledgeRetriever |

---

## 📦 技术栈

| 模块 | 技术 |
|------|------|
| 前端 | React 19 + Vite + Tailwind + shadcn/ui + Zustand + i18next |
| 后端 | NestJS + Prisma + BullMQ + Redis |
| 数据库 | SQLite (dev) / PostgreSQL (prod) |
| LLM | DeepSeek（默认）+ Doubao + Kimi + MiniMax + SenseNova + OpenAI（多 Provider 自动 failover） |
| 部署 | 阿里云 ECS + PM2 + Nginx（可选 Docker Compose） |

---

## 🚀 快速启动

### 前端

```bash
cd apps/AWKN-LABlife/app
npm install
npm run dev          # 开发模式（Vite）
```

### 后端

```bash
cd apps/AWKN-LABlife/awkn-life-backend
npm install          # postinstall 会自动 npx prisma generate
npm run dev          # 等价于 cd apps/api-server && npx nest start --watch
```

> 后端为 monorepo 结构，入口在 `apps/api-server`，`npm run dev` 会自动切换目录。
> 首次运行前需配置 `apps/AWKN-LABlife/awkn-life-backend/apps/api-server/.env`（从 `.env.example` 复制）。

### 常用脚本

| 命令 | 位置 | 说明 |
|------|------|------|
| `npm run dev` | app / awkn-life-backend | 启动开发服务 |
| `npm run build` | app / awkn-life-backend | 构建生产产物 |
| `npm run lint` | app | ESLint 检查 |
| `npm run typecheck` | app / awkn-life-backend | TypeScript 类型检查 |
| `npm test` | app / awkn-life-backend | 运行测试（watch 模式） |
| `npm run test:run` | app | 运行测试（单次，vitest run） |
| `npm run test:coverage` | app | 测试覆盖率 |
| `npm run test:cov` | awkn-life-backend | 测试覆盖率（jest） |
| `npm run db:generate` | awkn-life-backend | 生成 Prisma Client |
| `npm run db:push` | awkn-life-backend | 同步 schema 到数据库 |
| `npm run admin:ensure` | awkn-life-backend | 确保管理员账号存在 |

---

## 📂 项目结构

<details>
<summary>点击展开完整目录树</summary>

```
人生决策宗师/
├── apps/                        # 当前可运行项目
│   └── AWKN-LABlife/           # 核心产品（前端 + 后端 + 算法 + 部署）
│       ├── app/                # React + Vite 前端
│       ├── awkn-life-backend/  # NestJS 后端（monorepo，apps/api-server 为入口）
│       ├── awkn-life-frontend-update/  # 前端增量更新包
│       ├── nginx/              # Nginx 配置
│       ├── scripts/            # 运维脚本（备份/续期/健康检查/回滚/冒烟）
│       ├── services/knowledge-service/  # 知识检索服务（Python）
│       ├── skills/             # 技能包
│       ├── tasks/              # 任务进度
│       ├── verify/             # 验收文档
│       ├── xuanxue-algorithms/ # 术数算法（Ruby：cdate/goleph/qimen/ziwei）
│       ├── CLAUDE.md           # 后端项目认知
│       ├── DEPLOY.md           # 部署指南
│       ├── Dockerfile          # 容器镜像
│       ├── docker-compose.yml  # 容器编排
│       ├── ecosystem.config.js # PM2 配置
│       └── deploy.sh           # 一键部署脚本
├── knowledge/                   # 知识库与术数资料
│   ├── knowledge-base/         # 东方玄学知识库
│   ├── eastern-metaphysics/    # 东方术数原始资料
│   ├── qimen-suite/            # 奇门遁甲
│   └── processed/              # 有长期价值的中间资料
├── references/                  # 旧项目与外部参考
│   ├── projects/               # 旧项目代码
│   └── materials/              # 外部参考与抓取资料
├── scripts/                     # 工具脚本
│   ├── ocr/                    # OCR/转换脚本
│   ├── deploy/                 # 部署脚本（PowerShell）
│   ├── tools/                  # 调试与巡检工具
│   ├── git-hooks/              # Git 钩子
│   └── *.sh / *.cjs / *.py     # 备份/健康检查/查询/校验脚本
├── docs/                        # 项目文档（按世界先进项目管理标准分类）
│   ├── 01产品定位与PRD/         # 产品定位、需求文档、功能方案、决策记录
│   ├── 02开发PRD与工程文档/     # 当前生效的工程交接、接口、数据库、部署、测试
│   ├── 03开发过程稿/            # 已开发或过期文档、历史归档、对话历史
│   ├── 04复盘总结/              # 项目复盘、事故复盘、经验整合
│   ├── 05审核与质量/            # 模型审核、工程检查
│   ├── 06IDE配置与记忆/          # 多IDE配置与上下文统一管理
│   └── 文档索引.md              # 全量文档索引
├── constitution.md              # 项目宪法
├── PLAN.md                      # 工程文档
├── ONBOARDING.md                # 入职手册
├── REPO-MAP.md                  # 仓库地图
└── SHARED_CONTEXT.md            # 共享上下文
```

</details>

---

## 🔧 环境变量

<details>
<summary>点击展开环境变量配置</summary>

### 前端（`apps/AWKN-LABlife/app/.env.example`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | `http://localhost:30001/api/v1` |
| `VITE_USE_MOCK` | 是否使用 Mock 数据 | `false` |
| `VITE_INVITE_DOMAIN` | 邀请分享域名（不带尾斜杠） | `https://awkn.cn` |
| `VITE_SENTRY_DSN` | Sentry 错误监控 DSN（可选） | 空 |

### 后端（`apps/AWKN-LABlife/awkn-life-backend/apps/api-server/.env.example`）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接串 | `file:./dev.db` |
| `JWT_SECRET` | JWT 签名密钥（生产必须修改） | 占位符 |
| `JWT_EXPIRES_IN` | Access Token 过期 | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh Token 过期 | `7d` |
| `DEFAULT_LLM_PROVIDER` | 默认 LLM Provider | `deepseek-direct` |
| `CHEAP_LLM_PROVIDER` | 辅助任务 Provider | `sensenova` |
| `DEEPSEEK_DIRECT_API_KEY` | DeepSeek API Key | — |
| `DOUBAO_API_KEY` | 豆包 API Key | — |
| `KIMI_API_KEY` | Kimi API Key | — |
| `MINIMAX_API_KEY` | MiniMax API Key | — |
| `OPENAI_API_KEY` | OpenAI API Key（备用） | — |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | — |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 微信支付 | — |
| `ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY` | 支付宝支付 | — |
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | 后端端口 | `3000` |

> 完整字段见 `.env.example`，生产部署配置见 [DEPLOY.md](apps/AWKN-LABlife/DEPLOY.md)。

</details>

---

## 🌐 部署

### 生产环境

| 项 | 值 |
|----|-----|
| 域名 | https://awkn.cn/life/ |
| 前端目录 | `/www/wwwroot/awkn.cn/life/` |
| 后端 PM2 | `awkn-life-backend` |
| 后端端口 | `30000` |
| API 路由 | `/life/api/` → `http://127.0.0.1:30000/api/` |
| 健康检查 | `curl -s https://awkn.cn/life/api/v1/health` |

### 部署模式

详见 [`apps/AWKN-LABlife/DEPLOY.md`](apps/AWKN-LABlife/DEPLOY.md)，支持两种模式：

- **Docker Compose**（推荐）：`docker-compose up -d`
- **PM2 + Nginx**：`./deploy.sh` 或按 DEPLOY.md 手动执行

包含 Staging 环境隔离、HTTPS 证书自动续期、SQLite 定时备份、冒烟测试与回滚 SOP。

### 备份策略（E-A24）

- **回滚基线**：Git commit（不依赖服务器 cp -r）
- **服务器临时回滚**：仅保留 1 份 `dist.old` 做秒级回滚
- **历史回滚**：`git reset` → 重新部署

---

## 🧪 测试

```bash
# 前端（Vitest）
cd apps/AWKN-LABlife/app
npm test              # watch 模式
npm run test:run      # 单次运行（CI 用）
npm run test:coverage # 覆盖率

# 后端（Jest）
cd apps/AWKN-LABlife/awkn-life-backend
npm test              # watch 模式
npm run test:cov      # 覆盖率
```

测试策略与用例见 [`docs/02开发PRD与工程文档/测试用例/`](docs/02开发PRD与工程文档/测试用例/)。

---

## 📚 关键文档

| 文档 | 路径 |
|------|------|
| 项目宪法 | `constitution.md` |
| 工程文档 | `PLAN.md` |
| 入职手册 | `ONBOARDING.md` |
| 仓库地图 | `REPO-MAP.md` |
| 共享上下文 | `SHARED_CONTEXT.md` |
| 后端项目认知 | `apps/AWKN-LABlife/CLAUDE.md` |
| 部署指南 | `apps/AWKN-LABlife/DEPLOY.md` |
| 子模块说明 | `apps/AWKN-LABlife/SUB-MODULES.md` |
| 文档索引 | `docs/文档索引.md` |

---

## 🗂️ 文档分类规范

<details>
<summary>点击展开文档分类规范</summary>

本项目文档按世界先进项目管理标准（Diátaxis + Atlassian Confluence Space 模型）分类：

| 目录 | 用途 | 何时放这里 |
|------|------|------------|
| `docs/01产品定位与PRD/` | 产品定位、需求文档、功能方案、决策记录 | 产品定义阶段、需求评审、ADR 决策 |
| `docs/02开发PRD与工程文档/` | 当前生效的工程交接、接口、数据库、部署、测试、角色设计、技术参考 | 开发阶段、当前生效的工程文档 |
| `docs/03开发过程稿/` | 已开发或过期文档、历史归档、对话历史、案例素材 | 已完成的需求、过期文档、历史版本 |
| `docs/04复盘总结/` | 项目复盘、事故复盘、经验整合、项目总结分析 | 阶段收口、事故分析、经验沉淀 |
| `docs/05审核与质量/` | 模型审核、工程检查 | LLM 审核、工程审查、质量门禁 |
| `docs/06IDE配置与记忆/` | TRAE配置、上下文、演进规则、复盘记录 | 多IDE配置统一管理、会话上下文、学习规则 |

**跨项目资产沉淀路径**：
- 值得保留的记忆经验 → `C:\Users\10919\Desktop\AWKN-Lab\记忆系统\L1\项目复盘\`
- 可复用组件（会员/UI/反馈等） → `C:\Users\10919\Desktop\AWKN-Lab\公用组件库\前端组件\`
- 可迁徙的经验 → 更新到各自技能包

</details>

---

## 🎯 V1 范围

- ✅ **子平八字** + **大六壬**
- ❌ 不做：六爻、梅花、紫微、奇门前台入口

---

## 📊 活跃度

<div align="center">

![AWKN-Lab GitHub Stats](https://github-readme-stats.vercel.app/api?username=AWKN-Lab&show_icons=true&theme=tokyonight&hide_border=true&count_private=true)
![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username=AWKN-Lab&layout=compact&theme=tokyonight&hide_border=true)

</div>

---

<div align="center">

<p>
  <a href="https://awkn.cn/life/">🌐 在线体验</a> ·
  <a href="https://github.com/AWKN-Lab">📦 AWKN-Lab 组织</a> ·
  <a href="mailto:contact@awkn.cn">📧 联系我们</a>
</p>

<p>
  <sub>Made with ❤️ and AI by AWKN Lab · 一个人 + AI = 一支完整团队</sub>
</p>

</div>
