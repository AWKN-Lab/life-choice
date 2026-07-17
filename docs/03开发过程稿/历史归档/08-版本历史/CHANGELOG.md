> **状态**: REFERENCE | **权威替代**: — | **最后核验**: 2026-06-05

# 人生决策宗师 版本变更记录

> 版本：v1.5 | 日期：2026-06-05 | 状态：已上线运营

---

## 版本总览

| 版本 | 日期 | 状态 | 主要变更 |
|------|------|------|----------|
| **v1.5** | 2026-06-05 | ACTIVE | 功能闭环修复 + 三栏布局 + 端口修正 |
| v1.4 | 2026-05-25 | RELEASED | MingLi-Bench 基准测试 + 推理可视化 |
| v1.3 | 2026-05-23 | RELEASED | K线功能丰富 |
| v1.2 | 2026-05-17 | RELEASED | 三入口闭环修复与资产留存 |
| v1.1 | 2026-05-16 | RELEASED | 三入口拟人化前台 + 会员分层 |
| v1.0 | 2026-05-15 | RELEASED | 正式上线运营版本 |
| v0.9 | 2026-04 | DEPRECATED | Beta版本，基础功能完善 |
| v0.8 | 2026-04 | DEPRECATED | Alpha版本，核心算法实现 |
| v0.7 | 2026-03 | DEPRECATED | 原型版本，基础架构搭建 |

---

## v1.5 — 功能闭环修复 + 三栏布局 + 端口修正（2026-06-05）

### P0 修复（关键 Bug）

- **orderStore.createOrder DTO 修正**：前端发送字段与后端 CreateOrderDto 对齐，新增 pollOrderStatusUntilPaid 轮询
- **App.tsx 混入模块路由清理**：删除 shumiyuan/xingtu/miaosuan/tongjian 四个 2.0 混入路由及死重定向
- **benchmark.ts API 路径修正**：`/benchmark/*` → `/mingli-bench/*` 对齐后端注册路径
- **consult.ts API 路径修正**：deleteRecord 路径 + body 格式修正

### P1 修复（功能闭环）

- **WebSocket 客户端封装**：新建 `lib/websocket.ts`，ResultPage 监听 progress/result 事件 + 进度条 UI
- **upgradeMembership 集成**：改为调后端 `membershipApi.activateMembership`（真实写入 Prisma Membership 表）
- **notificationStore 新建**：持久化 unreadCount + BottomNav 接入真实未读数
- **兜底文案优化**：将开发者语言（"API 返回前"、"本地兜底"）改为用户语言

### 性能优化

- **LifeKLineChart**：MACD/MA 全量数据计算 + useMemo + React.memo + SVG gradient 去重
- **ResultPage**：enrichKlineAspects 加 useCallback + useRef 缓存 map
- **deriveDestinyKline**：detectSignals 复用 detectPointSignals，删除重复逻辑
- **LLM 并行竞速**：chatWithFallback 前 2 个 Provider 并行（Promise.allSettled）

### UI 改造

- **ResultPage 三栏布局**：中间主内容 + 右侧吸顶八字排盘面板（BaziSidePanel）
- **BaziSidePanel 组件**：可折叠 / 可钉住 / 数据缺失隐藏 / lg 以下断点隐藏

### 运维修复

- **端口不匹配修正**：后端 .env 和 ecosystem.config.js PORT 从 3000 → 3002，匹配 nginx 反代
- **后端启动**：pm2 start ecosystem.config.js（2 实例 cluster 模式）
- **PM2 持久化**：pm2 save 确保重启不丢失

---

## v1.4 — MingLi-Bench 基准测试 + 推理可视化（2026-05-25）

### 新增
- **MingLi-Bench 评估模块**：接入 160 道命理选择题基准测试，支持 Cot/Astro 模式，支持多 Provider 对比
- **推理过程展示**：ResultPage 新增"查看 AI 推理过程"折叠面板，展示 LLM 思维链
- **用户画像服务**：基于 sourceEntry/namingType/questionIntent/unlockStatus 构建 UserProfile
- **个性化推荐**：HomePage 新增"为您推荐"卡片，老用户推荐高频入口、新用户推荐 K线预览
- **GenerationRun 扩展**：新增 `reasoningContent` 字段，捕获 DeepSeek/Doubao 等模型的推理过程
- **BenchmarkRun 模型**：新增评估运行记录表，支持历史对比

### 变更
- `LlmProvidersService.chat()` 返回值新增 `reasoningContent` 字段
- `ConsultRecord` 6 个资产字段（sourceEntry/namingType/namingPreferences/questionIntent/unlockStatus/shareGenerated）

---

## v1.3 — K线功能丰富（2026-05-23）

### 新增
- **K线年度回顾**（AnnualReview）：年度运势总结面板
- **K线长周期报告**（LongCycleReport）：大运周期深度分析
- **K线记录对比**（RecordComparison）：多时间点对比功能
- **K线分享卡片**（KLineShareCard）：社交分享组件
- **基准测试雷达图**（RadarChart）：12 维度命理评估可视化
- **高级报告模块**（AdvancedReportSection）：分层结构化报告输出

---

## v1.2 — 三入口闭环修复与资产留存（2026-05-17）

### 新增
- **K线免费预览**（KlineIntroPage）：未登录用户可预览 K线，点击四线触发登录
- **资产字段体系**：前端 → sessionStorage → API → DB，完整流转链路
- **DTO 双驼峰**：camelCase + snake_case 双接收，兼容前后端

### 修复
- 取名解锁 `handleVipClick('kline')` → `handleVipClick('naming')`
- membership `moduleCreditCost` 增加 `naming: 1` / `question: 1`
- membership `monthModules` 增加 `'naming'` / `'question'`

### 变更
- `ConsultAnalyzeDto` 新增 10 个资产字段（5 组 camelCase + snake_case）
- `ResultPage` 登录拦截增加 `isKlineEntry` 判断，K线入口跳过登录

---

## v1.1 — 三入口拟人化前台 + 会员分层（2026-05-16）

### 新增
- **FrontdeskChat 通用对话前台**：合并取名/问事前台，通过 `mode` prop 切换，通过 `renderAs` 切换 modal/page
- **三入口首页**：EntryCard / CompactEntryCard / EntryGrid，K线/取名/问事三大入口
- **会员分层**：monthModules 增加 naming/question，moduleCreditCost 增加 naming:1/question:1
- **i18n 全覆盖**：中文常量全迁移到翻译文件，英文/泰文同步更新

### 变更
- HomePage 重构：旧 Hero/Services 页面 → 三入口卡片首页
- App.tsx 路由合并：/naming、/question 共用 FrontdeskChat 组件

### 废弃
- NamingChat.tsx（被 FrontdeskChat 替代）
- NamingFrontdesk.tsx、QuestionFrontdesk.tsx（路由改为 FrontdeskChat）

---

## v1.0 — 正式上线版本 (2026-05)

### 发布日期
2026年5月

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 八字排盘 | 完整八字计算（年/月/日/时柱+藏干+十神+神煞） | ✅ |
| 六壬起课 | 九宗门+四课+三传+天将+毕法赋 | ✅ |
| LLM智能解读 | 多Provider降级（豆包→MiniMax→OpenAI） | ✅ |
| 会员体系 | 轻会员月卡、单次深推 | ✅ |
| 支付集成 | 微信支付、支付宝 | ✅ |
| 人生K线 | 命理走势可视化 | ✅ |
| 海报生成 | 咨询结果分享 | ✅ |

### 技术改进

| 改进项 | 说明 |
|--------|------|
| LLM Provider降级 | 三级降级链，稳定性大幅提升 |
| 真太阳时校准 | 精确到城市级别的时区校准 |
| 知识库sourceId | 每条结论可追溯到算法证据 |
| Barnum检测 | 过滤通用化语句，提升专业度 |

### 已知问题

| 问题 | 状态 | 说明 |
|------|------|------|
| Moonshot账户封禁 | 已绕过 | 自动降级到其他Provider |
| 多语言支持 | 进行中 | 中文已完善，英文/泰文进行中 |
| 奇门/六爻Agent | 进行中 | 六壬Agent已稳定，其他测试中 |

### 下一版本计划

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 知识库检索增强 | P0 | 关键词检索→向量库检索 |
| 案例库召回 | P1 | 相似案例自动推荐 |
| 质量看板 | P1 | LLM成功率、重试率监控 |

---

## v0.9 — Beta版本 (2026-04)

### 发布日期
2026年4月中旬

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 前端React+Vite | 完整SPA应用 | ✅ |
| 后端NestJS | RESTful API架构 | ✅ |
| 基础咨询流程 | 首页→咨询→补充→结果→会员 | ✅ |
| JWT认证 | 用户注册/登录/Token验证 | ✅ |

### 技术改进

| 改进项 | 说明 |
|--------|------|
| 状态管理 | Zustand替代Redux，轻量化 | ✅ |
| UI组件 | shadcn/ui + Tailwind | ✅ |
| 动画效果 | GSAP + Framer Motion | ✅ |

### 已知问题

| 问题 | 状态 |
|------|------|
| LLM调用不稳定 | 已修复（v1.0多Provider降级） |
| 国际化缺失 | 进行中 |

---

## v0.8 — Alpha版本 (2026-04)

### 发布日期
2026年4月初

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 六壬算法引擎 | TypeScript实现，11个核心方法 | ✅ |
| 八字计算引擎 | 真太阳时校准，13个JSON数据 | ✅ |
| 基础LLM集成 | 单一Provider调用 | ✅ |

### 技术改进

| 改进项 | 说明 |
|--------|------|
| 计算器架构 | 模块化设计，可扩展 | ✅ |
| 知识库JSON | 结构化数据，便于检索 | ✅ |
| Agent提示词 | 六壬系统提示词模板 | ✅ |

### 已知问题

| 问题 | 状态 |
|------|------|
| 无降级机制 | 已修复（v1.0多Provider） |
| 计算精度不足 | 已修复（持续校准） |

---

## v0.7 — 原型版本 (2026-03)

### 发布日期
2026年3月

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 基础前端页面 | 首页原型 | ✅ |
| LLM Provider集成 | 单Provider调用 | ✅ |
| 基础API接口 | REST端点 | ✅ |

### 技术说明

原型版本验证了"算法+LLM"混合架构在命理咨询领域的可行性，为后续版本奠定了技术基础。

---

## 版本迁移说明

| 从版本 | 到版本 | 迁移内容 |
|--------|--------|----------|
| v0.7→v0.8 | 核心算法引擎实现 |
| v0.8→v0.9 | 前后端架构重构 |
| v0.9→v1.0 | 多Provider降级、知识库增强、正式上线 |

---

## 历史归档

更多历史版本详情请参考各子目录下的版本文档：
- `06-可复用资产/` — 技能迁移报告
- `03-核心功能实现/` — 模块实现文档
- `05-问题解决方案库/` — 踩坑与修复记录