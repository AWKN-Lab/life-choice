# 人生决策宗师 - 项目文档索引

> ⚠️ **DEPRECATED（2026-06-25）**：本文件已废弃，引用路径大量失效，不再维护。完整索引请查看 [docs/文档索引.md](../docs/文档索引.md)（权威）。
>
> 历史迁移目标：[docs/legacy/INDEX.md](docs/legacy/INDEX.md)（同样已废弃）
>
> 生成日期：2026-05-15 | 对标格式：凌扬健身 docs/legacy/INDEX.md
>
> 状态说明：ACTIVE=仍有效 | REFERENCE=历史参考 | DEPRECATED=已废弃 | MIGRATE_TO=已迁移

---

## 总览

| 维度 | 数值 |
|------|------|
| 前端组件 | 60+ |
| 后端模块 | 15 |
| 主要页面 | 11 |
| 知识库JSON | 21 |
| LLM Provider | 6 |
| 总文件数 | ~250 |

---

## 一、索引表

### 产品文档

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| docs/复盘报告-大宗师项目全面分析-20260422.md | 完整项目复盘 | ACTIVE | — | 技术团队 |
| docs/复盘报告-首页弹窗修改事故-20260415.md | 事故复盘 | ACTIVE | — | 技术团队 |
| docs/完整知识库检索版PRD.md | 需求文档 | ACTIVE | — | 产品团队 |
| docs/子平a案例.txt | 案例参考 | REFERENCE | — | 技术团队 |

### 技术架构

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| CLAUDE.md | 项目认知核心 | ACTIVE | — | 技术团队 |
| _archive/root-loose-files/legacy-docs/TechSpec.md | 技术规格（旧版归档） | REFERENCE | — | 技术团队 |
| _archive/root-loose-files/legacy-docs/Design_v2.md | 设计文档（旧版归档） | REFERENCE | — | 设计团队 |
| DEPLOY.md | 部署文档 | ACTIVE | — | 运维团队 |

### 前端实现 (app/)

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| app/src/pages/HomePage.tsx | 首页 | ACTIVE | — | 前端团队 |
| app/src/pages/ConsultPage.tsx | 咨询入口页 | ACTIVE | — | 前端团队 |
| app/src/pages/ResultPage.tsx | 结果展示页 | ACTIVE | — | 前端团队 |
| app/src/pages/HistoryPage.tsx | 历史记录页 | ACTIVE | — | 前端团队 |
| app/src/pages/MembershipPage.tsx | 会员中心 | ACTIVE | — | 前端团队 |
| app/src/pages/PricePage.tsx | 价格页 | ACTIVE | — | 前端团队 |
| app/src/pages/AdminPage.tsx | 管理后台 | ACTIVE | — | 前端团队 |
| app/src/pages/FortunePage.tsx | 运势查询页 | ACTIVE | — | 前端团队 |
| app/src/pages/ProfilePage.tsx | 个人中心 | ACTIVE | — | 前端团队 |
| app/src/pages/GrowthPage.tsx | 成长激励页 | ACTIVE | — | 前端团队 |
| app/src/pages/FeedbackPage.tsx | 反馈页 | ACTIVE | — | 前端团队 |
| app/src/pages/InfoPage.tsx | 信息填写页 | ACTIVE | — | 前端团队 |
| app/src/pages/demo/* | Demo演示页 | REFERENCE | — | 前端团队 |
| app/src/components/Card/CardDisplay.tsx | 卡片展示 | ACTIVE | — | 前端团队 |
| app/src/components/KLineImageGenerator.tsx | K线图生成 | ACTIVE | — | 前端团队 |
| app/src/components/LifeKLineChart.tsx | 人生K线图 | ACTIVE | — | 前端团队 |
| app/src/components/NPC/NPCFateDisplay.tsx | NPC命运 | ACTIVE | — | 前端团队 |
| app/src/components/MultiEnding/MultiEndingDisplay.tsx | 多结局 | ACTIVE | — | 前端团队 |
| app/src/components/StateMachine/ConfigDrivenStateMachine.tsx | 配置驱动状态机 | ACTIVE | — | 前端团队 |
| app/src/components/KnowledgeGraph/KnowledgeGraphViz.tsx | 知识图谱 | ACTIVE | — | 前端团队 |
| app/src/components/fortune/*.tsx | 运势组件 | ACTIVE | — | 前端团队 |
| app/src/components/conclusion/*.tsx | 结论展示组件 | ACTIVE | — | 前端团队 |
| app/src/components/ui/* | 基础UI组件库(40+) | ACTIVE | — | 前端团队 |
| app/src/store/*.ts | Zustand状态管理(9个) | ACTIVE | — | 前端团队 |
| app/src/lib/*.ts | 工具库(10个) | ACTIVE | — | 前端团队 |
| app/src/api/*.ts | API客户端(6个) | ACTIVE | — | 前端团队 |
| app/src/types/*.ts | 类型定义(7个) | ACTIVE | — | 前端团队 |
| app/src/sections/*.tsx | 页面区块(6个) | ACTIVE | — | 前端团队 |
| app/src/pages/fix_*.cjs | 临时修复脚本 | DEPRECATED | — | 前端团队 |
| app/src/pages/fix_*.py | 临时修复脚本 | DEPRECATED | — | 前端团队 |
| app/src/index.css.bak.20260408 | CSS备份 | DEPRECATED | — | 前端团队 |
| app/src/pages/HomePage.tsx.bak.20260408 | 首页备份 | DEPRECATED | — | 前端团队 |

### 后端实现 (awkn-life-backend/)

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| awkn-life-backend/apps/api-server/src/app.module.ts | 根模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/main.ts | 入口文件 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/health.controller.ts | 健康检查 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/auth/* | 认证模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/user/* | 用户模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/consult/* | 咨询核心 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/calc-engine/* | 算法引擎 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/llm-gateway/* | LLM网关 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/llm-providers/* | LLM提供商 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/liuren-agent/* | 六壬智能体 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/ziping-agent/* | 子平智能体 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/quming-agent/* | 取名智能体 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/qimen-agent/* | 奇门智能体 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/liuyao-agent/* | 六爻智能体 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/ziwei-agent/* | 紫微智能体 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/payment/* | 支付模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/membership/* | 会员模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/growth/* | 成长模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/websocket/* | WebSocket | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/analytics/* | 分析模块 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/knowledge-base/bazi-calculator.ts | 八字计算 | ACTIVE | — | 后端团队 |
| awkn-life-backend/apps/api-server/src/knowledge-base/liuren-calculator.ts | 六壬计算 | ACTIVE | — | 后端团队 |

### 知识库 JSON

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| src/knowledge-base/bazi/tiangan.json | 天干数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/dizhi.json | 地支数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/tiangandizhi.json | 天干地支组合 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/shishen.json | 十神数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/nayin.json | 纳音五行 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/shen-sha.json | 神煞数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/zhang-sheng.json | 长生数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/kong-wang.json | 空亡数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/wu-hu-dun.json | 五虎遁 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/wu-shu-dun.json | 五鼠遁 | ACTIVE | — | 知识团队 |
| src/knowledge-base/bazi/zhi-gan.json | 地支藏干 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/jieqi-yuejiang.json | 节气月将 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/tian-jiang.json | 天将数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/ke-ti.json | 课体数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/bi-fa.json | 毕法数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/shensha.json | 神煞数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/shigan-jigong.json | 十二宫数据 | ACTIVE | — | 知识团队 |
| src/knowledge-base/liuren/jiu-zong-men.json | 九宗门数据 | ACTIVE | — | 知识团队 |
| src/liuren-agent/prompts/六壬神煞总览.md | 六壬神煞 | ACTIVE | — | 知识团队 |
| src/liuren-agent/prompts/分类占断纲要.md | 占断纲要 | ACTIVE | — | 知识团队 |
| src/liuren-agent/prompts/节气月将对照表.md | 月将对照 | ACTIVE | — | 知识团队 |

### 运维部署

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| Dockerfile | Docker构建 | ACTIVE | — | 运维团队 |
| docker-compose.yml | Docker编排 | ACTIVE | — | 运维团队 |
| deploy.sh | 部署脚本 | ACTIVE | — | 运维团队 |
| .deploy/*.tgz | 部署包备份 | ARCHIVE | — | 运维团队 |
| awkn-life-backend/ecosystem.config.js | PM2配置 | ACTIVE | — | 运维团队 |
| awkn-life-backend/prisma/schema.prisma | 数据库Schema | ACTIVE | — | 后端团队 |

### 对话历史

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| docs/conversation-history/2a386964/ | 会话记录1 | ARCHIVE | — | 技术团队 |
| docs/conversation-history/b1f94abb/ | 会话记录2 | ARCHIVE | — | 技术团队 |
| docs/conversation-history/b29b135d/ | 会话记录3 | ARCHIVE | — | 技术团队 |
| docs/conversation-history/ea973d94/ | 会话记录4 | ARCHIVE | — | 技术团队 |
| docs/复盘总结/项目总结分析/* | 项目复盘 | ACTIVE | — | 技术团队 |

### 预览文件

| 文档路径 | 主题 | 状态 | 适用版本 | 责任人 |
|----------|------|------|----------|--------|
| _archive/root-loose-files/preview-html/conclusion-preview.html | 结论预览A | REFERENCE | — | 设计团队 |
| _archive/root-loose-files/preview-html/conclusion-preview-d.html | 结论预览D | REFERENCE | — | 设计团队 |
| _archive/root-loose-files/preview-html/conclusion-preview-e*.html | 结论预览E系列 | REFERENCE | — | 设计团队 |
| _archive/root-loose-files/preview-html/conclusion-preview-f.html | 结论预览F | REFERENCE | — | 设计团队 |
| _archive/root-loose-files/preview-html/conclusion-preview-g.html | 结论预览G | REFERENCE | — | 设计团队 |
| preview-all-pages.html | 全页面预览 | REFERENCE | — | 设计团队 |

---

## 二、状态统计

| 状态 | 数量 | 占比 |
|------|------|------|
| ACTIVE | ~200 | 80% |
| REFERENCE | ~30 | 12% |
| DEPRECATED | 5 | 2% |
| ARCHIVE | ~15 | 6% |

---

## 三、分类详情

### 3.1 前端组件体系

**Card 系统**：命理卡片展示，支持多种格式
- 依赖：`cardStore`, `types/card.ts`

**KLine 系统**：人生K线图可视化
- 依赖：`lib/lifeklineService.ts`, `api/consult.ts`

**NPC Fate 系统**：NPC命运展示
- 依赖：`npcFateStore.ts`, `api/consult.ts`

**MultiEnding 系统**：多结局展示
- 依赖：`multiEndingStore.ts`

**StateMachine 系统**：配置驱动状态机
- 依赖：`stateMachineStore.ts`, `types/stateMachine.ts`

**KnowledgeGraph 系统**：知识图谱可视化
- 依赖：`types/knowledgeGraph.ts`, `api/consult.ts`

### 3.2 后端算法引擎

**CalcEngine**：算法调度中心
- 依赖：各术数 Agent（liuren/ziping/quming/qimen/liuyao/ziwei）
- 功能：问题路由、服务协调

**LiurenAgent**：六壬智能体
- Prompts：`liuren-system-prompt.md`, `liuren-analysis-prompt.md`
- 知识库：`六壬神煞总览.md`, `分类占断纲要.md`, `节气月将对照表.md`
- 依赖：`LiurenCalculator`, `LlmProvidersService`

**ZipingAgent**：子平智能体（八字）
- Prompts：`ziping-system-prompt.md`
- 依赖：`BaZiCalculator`, `LlmProvidersService`

**QimenAgent**：奇门智能体
- Prompts：`qimen-system-prompt.md`
- 依赖：`LlmProvidersService`

**LiuyaoAgent**：六爻智能体
- Prompts：`liuyao-system-prompt.md`
- 依赖：`LlmProvidersService`

**ZiweiAgent**：紫微斗数智能体
- Prompts：`ziwei-system-prompt.md`
- 依赖：`LlmProvidersService`

**QumingAgent**：取名智能体
- Prompts：`quming-system-prompt.md`, `quming-user-prompt.md`
- 依赖：`BaZiCalculator`

### 3.3 LLM Provider 架构

| Provider | 说明 | 状态 |
|----------|------|------|
| doubao | 火山引擎豆包 | ACTIVE |
| moonshot | 月之暗面 Kimi | ACTIVE |
| minimax | MiniMax | ACTIVE |
| deepseek | 深度求索 | ACTIVE |
| sensenova | 商汤日日新 | ACTIVE |

### 3.4 数据库 Schema

**核心表**：
- `User` — 用户认证与档案
- `BaZiProfile` — 八字排盘结果
- `ConsultRecord` — 咨询记录
- `CreditLedger` — 积分账本
- `Membership` — 会员信息
- `Order` — 订单记录

---

## 四、架构依赖图

```
前端 (React/Vite)
    ↓ HTTP/HTTPS
后端 (NestJS)
    ├── consult/ → calc-engine/ → llm-gateway/ → llm-providers/
    ├── auth/ → prisma/ → SQLite/PostgreSQL
    ├── payment/ → prisma/
    ├── membership/ → prisma/
    ├── growth/ → prisma/
    ├── websocket/ → consult/
    └── analytics/ → prisma/
```

---

## 五、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.3 | 2026-03 | MVP 智能体教练 |
| v0.4 | 2026-03 | 架构重构 |
| v0.5 | 2026-04 | 完整功能发布 |
| v0.58 | 2026-04 | 稳定版 |

---

## 六、核心入口点

| 功能 | 入口文件 | 说明 |
|------|----------|------|
| 首页 | `pages/HomePage.tsx` | 用户主入口 |
| 咨询流程 | `pages/ConsultPage.tsx` → `InfoPage.tsx` → `ResultPage.tsx` | 标准咨询流程 |
| 运势查询 | `pages/FortunePage.tsx` | 日/月/年运势 |
| 会员管理 | `pages/MembershipPage.tsx` | 会员中心 |
| 管理后台 | `pages/AdminPage.tsx` | 数据管理 |
| API咨询 | `api/consult.ts` | 前端→后端接口 |
| 咨询核心 | `consult.service.ts` | 后端业务逻辑 |
| LLM调用 | `llm-providers.service.ts` | 多Provider调度 |
