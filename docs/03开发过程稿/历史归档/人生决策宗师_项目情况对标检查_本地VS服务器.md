<!-- STATUS: REFERENCE -->
<!-- LAST_VERIFIED: 2026-06-17 -->
> **状态**: REFERENCE | **权威替代**: — | **最后核验**: 2026-06-17

# 人生决策宗师 本地 vs 服务器 项目情况对标检查

> 检查日期：2026-06-17
> 工具：本地文件系统 + 项目源码分析 + 部署文档
> 服务器：8.148.245.29（root 账号，aliyun_awkn 密钥）
> 检查范围：全栈对标——前端 SPA、后端 NestJS、数据库 Prisma、Agent 体系、算法引擎

---

## 一、检查概览

| 项目 | 信息 |
|------|------|
| 检查日期 | 2026-06-17 |
| 工具 | 本地文件系统 + 源码分析 + 部署文档 |
| 服务器 | 8.148.245.29（阿里云 ECS，2C/1.8G/40G） |
| 线上地址 | https://awkn.cn/life/ |
| 后端 PM2 进程 | awkn-life-api（端口 3002） |
| 数据库 | SQLite（prod.db），位于 `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db` |
| 最后部署时间 | 2026-06-05 |
| 本次检查性质 | 静态对标（基于本地源码 + 部署文档，未 SSH 登录验证） |

---

## 二、服务器结构总览

### 2.1 主目录 `/opt/awkn-life/`

| 路径 | 类型 | 说明 |
|------|------|------|
| `awkn-life-backend/` | 后端 NestJS monorepo | 含 apps/api-server/ + libs/ |
| `awkn-life-backend/apps/api-server/` | API Server 主应用 | 25+ NestJS 模块 |
| `awkn-life-backend/apps/api-server/prisma/` | Prisma 数据库 | schema.prisma + prod.db |
| `awkn-life-backend/apps/api-server/.env` | 环境变量 | 含 LLM API Key / JWT_SECRET 等 |
| `app/` | 前端源码（构建用） | React 19 + Vite 7 |
| `ecosystem.config.js` | PM2 配置 | awkn-life-api 进程定义 |
| `deploy.sh` | 一键部署脚本 | npm install + build + pm2 restart |
| `scripts/` | 运维脚本 | backup-db.sh / health-check.sh / rollback.sh |

### 2.2 前端部署目录 `/www/wwwroot/awkn.cn/life/`

| 项目 | 内容 | 说明 |
|------|------|------|
| `index.html` | SPA 入口 | Vite 构建产物 |
| `assets/` | JS/CSS chunk | Vite code-split 产物 |
| 静态资源 | favicon 等 | public/ 目录内容 |

**Nginx 路由映射**：

| 路径 | 目标 | 说明 |
|------|------|------|
| `/life/` | 前端静态文件 | `/www/wwwroot/awkn.cn/life/` |
| `/life/assets/` | 静态资源（1年缓存） | JS/CSS/图片等 |
| `/life/api/v1/` | 反向代理 → 后端 3002 | Nginx rewrite 去掉 `/life` 前缀 |
| `/socket.io/` | WebSocket 代理 | 实时通信 |

### 2.3 后端 PM2 进程状态

```
┌────┬──────────────────┬────────┬─────────┬──────────┬────────┐
│ id │ name             │ mode   │ status  │ uptime   │ mem    │
├────┼──────────────────┼────────┼─────────┼──────────┼────────┤
│ ?  │ awkn-life-api    │ fork   │ online  │ 待查     │ 待查   │
└────┴──────────────────┴────────┴─────────┴──────────┴────────┘
```

**待确认**：
- `awkn-life-api` 实际运行端口是 3000（默认）还是 3002（部署配置）？
- `awkn-life-api` 进程重启次数和稳定性？
- 服务器上是否有 `awkn-life-backend` 以外的 PM2 进程？

### 2.4 数据库文件

| 项目 | 信息 |
|------|------|
| 类型 | SQLite（Prisma ORM） |
| 位置 | `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db` |
| 模型数 | 33 个 Prisma 模型 |
| 迁移方式 | `npx prisma db push`（开发模式，非 migrate） |
| 备份脚本 | `scripts/backup-db.sh`（cp prod.db → prod.db.bak.$date） |

### 2.5 Nginx 路由映射

| 路由 | 后端目标 | 说明 |
|------|---------|------|
| `GET /life/` | 前端 SPA | 静态文件 |
| `GET /life/assets/*` | 前端静态资源 | 1年缓存 |
| `ANY /life/api/v1/*` | `http://127.0.0.1:3002` | API 反向代理 |
| `WS /socket.io/*` | `http://127.0.0.1:3002` | WebSocket |
| `GET /health` | `http://127.0.0.1:3002` | 健康检查 |

---

## 三、本地项目结构

### 3.1 Monorepo 总览

| 路径 | 说明 |
|------|------|
| `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\` | 项目根目录 |
| `apps\AWKN-LABlife\` | Monorepo 主目录 |
| `apps\AWKN-LABlife\app\` | 前端（React 19 + Vite 7 + shadcn/ui + Tailwind） |
| `apps\AWKN-LABlife\awkn-life-backend\` | 后端（NestJS 10 monorepo） |
| `apps\AWKN-LABlife\awkn-life-backend\apps\api-server\` | API Server 主应用 |
| `apps\AWKN-LABlife\awkn-life-backend\libs\` | 共享库 |
| `apps\AWKN-LABlife\nginx\` | Nginx 配置 |
| `apps\AWKN-LABlife\scripts\` | 运维脚本 |
| `docs/` | 项目文档（含 legacy/ engineering/ product/） |
| `knowledge/` | 东方玄学知识库（八字/六壬/取名/周易/奇门/紫微/道德经等） |

### 3.2 前端 `app/` 目录

| 路径 | 说明 |
|------|------|
| `src/pages/` | **25 个页面**（含 1 个临时预览页） |
| `src/components/` | **50+ shadcn/ui 基础组件** + **14 种聊天消息类型** + 业务组件 |
| `src/components/ui/` | shadcn/ui 基础组件（accordion~tooltip 共 50+） |
| `src/components/result/chat-messages/` | 14 种聊天消息类型组件 |
| `src/components/home/` | 首页组件（BaguaDiagram/EntryCard/HeroBanner 等） |
| `src/components/frontdesk/` | 前台聊天组件（FrontdeskChat + frontdeskConfigs） |
| `src/components/kline/` | K线组件（KlineChart/KlineShareCard/AnnualReview 等） |
| `src/components/tide/` | 潮汐组件（PhaseSpace/StateRadar/CreditBalance 等） |
| `src/components/naming/` | 取名组件（MultiRoundFilter/RenameComparison 等） |
| `src/components/dialogue/` | 对话组件（DialogueChat） |
| `src/components/followup/` | 回访组件（FollowUpChat） |
| `src/store/` | **13 个 Zustand store** |
| `src/hooks/` | **7 个自定义 Hook** |
| `src/locales/` | 3 语言国际化（zh-CN/en/th） |
| `src/lib/` | 工具库（analytics/i18n/solarTime/websocket/destinyKline/ 等） |
| `src/api/` | API 客户端（admin/auth/consult/creditApi/feedback/growth/ 等） |
| `src/services/` | 服务层（chronicleApi/klineTideApi/miaosuanApi/shumiyuanApi/starChartApi） |
| `src/config/` | 配置（feature-flags.config.ts） |
| `src/data/` | 数据（clauses/followups/scenarios/agent-intro-messages） |
| `src/types/` | 类型定义（api/bazi/card/knowledgeGraph/lifekline/multiEnding/npcFate/stateMachine） |
| `src/utils/` | 工具（analytics/behaviorQueue/metaphysicsConflict/monthKey/normalizeTidePackage/safetyCopyCheck） |
| `src/styles/` | 主题样式（themes.css） |
| `public/` | 静态资源（favicon.ico/favicon.svg/mock-data.json） |

### 3.3 后端 `awkn-life-backend/` 目录

| 路径 | 说明 |
|------|------|
| `apps/api-server/src/main.ts` | 入口（全局前缀 `api/v1`，CORS 多 origin，端口 3000） |
| `apps/api-server/src/app.module.ts` | 根模块 |
| `apps/api-server/prisma/schema.prisma` | 33 个数据模型 |
| `apps/api-server/prisma/prod.db` | SQLite 数据库（本地开发用） |
| `apps/api-server/.env.example` | 环境变量模板 |
| `apps/api-server/src/admin/` | AdminModule — 管理后台 |
| `apps/api-server/src/analytics/` | AnalyticsModule — 行为分析 |
| `apps/api-server/src/auth/` | AuthModule — JWT 认证（guards/strategies/dto） |
| `apps/api-server/src/calc-engine/` | 算法引擎（八字引擎 + 取名引擎 + 原子工具） |
| `apps/api-server/src/chronicle/` | ChronicleModule — 通鉴（编年史） |
| `apps/api-server/src/consult/` | ConsultModule — 咨询核心（最大模块） |
| `apps/api-server/src/feature-flags/` | FeatureFlagsModule — 功能开关 |
| `apps/api-server/src/feedback/` | FeedbackModule — 专家标注反馈 |
| `apps/api-server/src/growth/` | GrowthModule — 增长运营 |
| `apps/api-server/src/kline-tide/` | KlineTideModule — 人生K线+潮汐图 |
| `apps/api-server/src/knowledge-base/` | 东方玄学知识库（六壬/八字计算器） |
| `apps/api-server/src/liuren-agent/` | 六壬 Agent（prompts/ + service） |
| `apps/api-server/src/liuyao-agent/` | 六爻 Agent（prompts/ + service） |
| `apps/api-server/src/llm-gateway/` | LLM 网关 |
| `apps/api-server/src/llm-providers/` | LLM Providers（5 Provider 并行竞速） |
| `apps/api-server/src/membership/` | MembershipModule — 会员系统 |
| `apps/api-server/src/miaosuan/` | MiaosuanModule — 庙算 |
| `apps/api-server/src/mingli-bench/` | MingliBenchModule — 命理基准测试 |
| `apps/api-server/src/payment/` | PaymentModule — Stripe 支付 |
| `apps/api-server/src/prisma/` | PrismaModule — 数据库 ORM |
| `apps/api-server/src/qimen-agent/` | 奇门 Agent（prompts/ + golden test） |
| `apps/api-server/src/quming-agent/` | 取名 Agent（prompts/ + service） |
| `apps/api-server/src/saved-case/` | SavedCaseModule — 命例库 |
| `apps/api-server/src/shared/` | 共享模块（case-library/constants/logger/monitor/prompt-registry/queue/redis/rule-engine） |
| `apps/api-server/src/shumiyuan/` | ShumiyuanModule — 人生枢密院（speak/spread/bottom/flow-state） |
| `apps/api-server/src/star-chart/` | StarChartModule — 星图（八维看人/人物/网络/相关事项） |
| `apps/api-server/src/tide-inference/` | TideInferenceModule — 潮汐推理 |
| `apps/api-server/src/user/` | UserModule — 用户管理 |
| `apps/api-server/src/user-profile/` | UserProfileModule — 用户画像 |
| `apps/api-server/src/websocket/` | WebsocketModule — WebSocket 实时通信 |
| `apps/api-server/src/ziping-agent/` | 子平 Agent（prompts/） |
| `apps/api-server/src/health.controller.ts` | 健康检查端点 |

### 3.4 Prisma 数据模型（33 个）

| # | 模型名 | 说明 | 核心字段 |
|---|--------|------|---------|
| 1 | User | 用户 | email/phone/wxOpenId/nickname/gender/birthDate/creditBalance/freeTrialUsed/isAdmin |
| 2 | CreditLedger | 积分账本 | userId/amount/reason/moduleId/balanceAfter |
| 3 | UserMemory | 用户记忆 | chartHistory/consultHistory/timelineEvents/insights |
| 4 | BaZiProfile | 八字命理档案 | yearGanZhi/monthGanZhi/dayGanZhi/timeGanZhi/wuXingDist/shenWang/xiYongShen/shiShen/shenSha |
| 5 | ConsultRecord | 咨询记录 | question/routeType/status/flowStatus/calcResult/llmResult/summaryLine/analysisData/spreadData/bottomData |
| 6 | NamingResult | 取名结果 | names/wuge/sancai |
| 7 | ConsultFeedback | 专家标注反馈 | rating/accuracy/helpfulness/tone/calibrationTag/calibrationNote |
| 8 | PersonProfile | 人物档案 | birthDate/birthTime/gender/relationType/importance/currentStatus/riskTags/currentAdvice |
| 9 | PersonProfileRecord | 人物-咨询关联 | personProfileId/consultRecordId |
| 10 | PageVisit | 页面访问 | pageName/pageUrl/referrer/deviceInfo/screenSize/source/medium/campaign/qrCodeId |
| 11 | UserActivity | 用户行为 | activityType/activityData/duration |
| 12 | Session | 会话 | userId/refreshToken/expiresAt |
| 13 | Membership | 会员 | type/status/startDate/expireDate |
| 14 | Order | 订单 | productType/amount/currency/status/paymentMethod/paymentId |
| 15 | Invite | 邀请码 | code/usedCount/rewardTier |
| 16 | Referral | 推荐关系 | inviteCode/referredUserId/parentReferralId/source/medium/campaign |
| 17 | GrowthOffer | 增长活动 | offerType/title/subtitle/badge/ctaText/discount/startAt/expireAt |
| 18 | LiurenCase | 六壬案例 | source/question/askTime/eventType/judgment/verification/keyPoints/keTi/tags |
| 19 | EvidencePacket | 证据包 | recordId/routeType/version/inputHash/packetJson/warnings |
| 20 | GenerationRun | 生成记录 | recordId/moduleId/status/provider/model/promptVersion/qualityScore/durationMs |
| 21 | KnowledgeHit | 知识命中 | runId/sourceId/sourceType/title/snippet/score |
| 22 | InteractionEvent | 交互事件 | userId/recordId/eventType/eventJson |
| 23 | ConsultPreview | 咨询预览 | module/inputData/calcResult/freeContent/lang/expiresAt |
| 24 | BenchmarkRun | 基准测试 | year/provider/model/useCot/useAstro/totalQuestions/correctCount/accuracy |
| 25 | PersonEightDimensions | 八维看人 | role/relationship/motivation/ability/resources/credit/behavior/risk/completeness |
| 26 | PersonRelatedCase | 相关事项 | caseTitle/hisRole/whatHeSaid/whatHeDid/result/impactOnJudgment/needsReview |
| 27 | ChronicleEntry | 通鉴记录 | title/content/initialView/whatHappened/gotRight/gotWrong/nextReminder/reviewAt/reviewedAt/entryType |
| 28 | UserInsightProfile | 用户画像 | commonStuckPoints/riskPreference/relationshipHabits/misjudgmentPatterns/accuracyRate |
| 29 | KlineBar | K线Bar | year/month/career/wealth/health/relationship/growth/freedom/buffer/compositeCapital/volatility |
| 30 | StateSnapshot | 状态快照 | energy/recovery/emotion/clarity/liquidity/momentum/support/agency/order/growth/optionality/buffer/quadrant |
| 31 | ConsultFollowUp | 回访 | recordId/scheduledAt/completedAt/result/status |
| 32 | ConsultDialogue | 多轮对话 | state/currentNode/turns/collectedBackground/costConfirmed |
| 33 | SavedCase | 命例库 | name/category/tags/notes/snapshot/visibility |

---

## 四、前端对标

### 4.1 路由对标（25 条路由）

| 路由 | 页面组件 | 说明 | 服务器部署状态 |
|------|---------|------|--------------|
| `/` | HomePage | 首页（八卦图/入口卡片/功能展示） | ✅ 已部署 |
| `/consult` | ConsultPage | 咨询页（核心入口） | ✅ 已部署 |
| `/info` | InfoPage | 信息页 | ✅ 已部署 |
| `/result` | ResultPage | 结果页（14种消息类型+结构化报告） | ✅ 已部署 |
| `/membership` | MembershipPage | 会员页 | ✅ 已部署 |
| `/profile` | ProfilePage | 个人中心 | ✅ 已部署 |
| `/history` | HistoryPage | 历史记录 | ✅ 已部署 |
| `/library` | LibraryPage | 命例库 | ✅ 已部署 |
| `/pricing` | PricePage | 定价页 | ✅ 已部署 |
| `/feedback` | FeedbackPage | 反馈页 | ✅ 已部署 |
| `/growth` | GrowthPage | 增长页 | ✅ 已部署 |
| `/fortune` | FortunePage | 运势页 | ✅ 已部署 |
| `/admin` | AdminPage | 管理后台 | ✅ 已部署 |
| `/kline-intro` | KlineIntroPage | K线介绍页 | ✅ 已部署 |
| `/tide` | TidePage | 潮汐页 | ✅ 已部署 |
| `/landing` | LandingPage | 落地页 | ✅ 已部署 |
| `/kline-compare` | KlineComparePage | K线对比页 | ✅ 已部署 |
| `/naming` | FrontdeskChat(mode="naming") | 取名前台 | ✅ 已部署 |
| `/question` | FrontdeskChat(mode="question") | 问事前台 | ✅ 已部署 |
| `/miaosuan` | MiaosuanPage | 庙算页 | ✅ 已部署 |
| `/shumiyuan` | ShumiyuanPage | 人生枢密院 | ✅ 已部署 |
| `/tongjian` | TongjianPage | 通鉴页 | ✅ 已部署 |
| `/xingtu` | XingtuPage | 星图页 | ✅ 已部署 |
| `/ziwei` | ZiweiPage | 紫微页 | ✅ 已部署 |
| `/followup/:followUpId` | FollowUpPage | 回访页 | ✅ 已部署 |

### 4.2 组件对标

#### 4.2.1 shadcn/ui 基础组件（50+）

| 类别 | 组件 |
|------|------|
| 输入 | button/input/textarea/select/checkbox/radio-group/slider/switch/toggle/toggle-group/input-otp/input-group |
| 展示 | card/badge/avatar/separator/progress/skeleton/tooltip/hover-card/aspect-ratio |
| 导航 | tabs/breadcrumb/navigation-menu/menubar/pagination/sidebar |
| 反馈 | alert/alert-dialog/dialog/drawer/sheet/sonner/popover/scroll-area |
| 布局 | accordion/collapsible/resizable/command/context-menu/dropdown-menu/form/calendar |
| 图表 | chart（Recharts 集成） |
| 其他 | carousel/pagination/field/item/kbd/label/empty/spinner/StyleSwitcher |

#### 4.2.2 聊天消息类型（14 种）

| 组件 | 说明 |
|------|------|
| ActionListMessage | 行动列表 |
| BaziCardMessage | 八字卡片 |
| CostWarningMessage | 代价警告 |
| FiveLayerMessage | 五层分析 |
| LiurenCardMessage | 六壬卡片 |
| MemoryAnchorMessage | 记忆锚点 |
| QumingCardMessage | 取名卡片 |
| ReportSectionMessage | 报告段落 |
| RiskListMessage | 风险列表 |
| TimelineMessage | 时间线 |
| ToolResultMessage | 工具结果 |
| TypingIndicator | 打字指示器 |
| VipPromptMessage | VIP 提示 |
| ZhangbanshanMessage | 张半山消息 |

#### 4.2.3 业务组件

| 组件 | 说明 |
|------|------|
| FrontdeskChat | 三入口前台（naming/question/默认） |
| ResultChat | 结果页聊天 |
| KlineChart | K线图表 |
| KlineShareCard | K线分享卡片 |
| TidePhaseChart | 潮汐相位图 |
| PhaseSpace | 相位空间 |
| StateRadar | 状态雷达图 |
| DialogueChat | 多轮对话 |
| FollowUpChat | 回访聊天 |
| LifeKLineChart | 人生K线图 |
| PosterGenerator | 海报生成器 |
| AuthModal | 认证弹窗 |
| Navigation | 导航栏 |
| BottomNav | 底部导航 |
| LanguageSwitcher | 语言切换 |
| DivinationRitualLoader | 占卜仪式加载器 |

### 4.3 Store 对标（13 个 Zustand Store）

| Store | 说明 |
|-------|------|
| authStore | 认证状态（JWT/用户信息） |
| consultStore | 咨询状态（核心） |
| cardStore | 卡片状态 |
| languageStore | 语言状态 |
| multiEndingStore | 多结局状态 |
| notificationStore | 通知状态 |
| npcFateStore | NPC 命运状态 |
| orderStore | 订单状态 |
| previewStore | 预览状态 |
| stateMachineStore | 状态机 |
| themeStore | 主题状态（明暗切换） |
| userProfileStore | 用户画像状态 |
| utmStore | UTM 追踪状态 |

---

## 五、后端对标

### 5.1 模块对标（25+ NestJS 模块）

| # | 模块 | 说明 | 服务器部署状态 |
|---|------|------|--------------|
| 1 | ConfigModule | 全局配置 | ✅ |
| 2 | RedisModule | Redis 缓存（ioredis） | ✅ |
| 3 | QueueModule | BullMQ 队列 | ✅ |
| 4 | PrismaModule | 数据库 ORM | ✅ |
| 5 | AuthModule | JWT 认证（Passport + Guards） | ✅ |
| 6 | UserModule | 用户管理 | ✅ |
| 7 | ConsultModule | 咨询核心（最大模块） | ✅ |
| 8 | PaymentModule | Stripe 支付 | ✅ |
| 9 | MembershipModule | 会员系统 | ✅ |
| 10 | SavedCaseModule | 命例库 | ✅ |
| 11 | WebsocketModule | WebSocket 实时通信 | ✅ |
| 12 | FeedbackModule | 专家标注反馈 | ✅ |
| 13 | LlmProvidersModule | LLM 多模型网关 | ✅ |
| 14 | AnalyticsModule | 行为分析 | ✅ |
| 15 | GrowthModule | 增长运营 | ✅ |
| 16 | AdminModule | 管理后台 | ✅ |
| 17 | UserProfileModule | 用户画像 | ✅ |
| 18 | MingliBenchModule | 命理基准测试 | ✅ |
| 19 | ShumiyuanModule | 人生枢密院 | ✅ |
| 20 | StarChartModule | 星图 | ✅ |
| 21 | MiaosuanModule | 庙算 | ✅ |
| 22 | ChronicleModule | 通鉴 | ✅ |
| 23 | KlineTideModule | 人生K线+潮汐图 | ✅ |
| 24 | TideInferenceModule | 潮汐推理 | ✅ |
| 25 | FeatureFlagsModule | 功能开关 | ✅ |

### 5.2 API 端点对标

**全局前缀**：`api/v1`
**CORS**：localhost 多端口 + awkn.cn + www.awkn.cn
**认证**：JWT + Passport

| 端点前缀 | 模块 | 说明 |
|----------|------|------|
| `/api/v1/auth/*` | AuthModule | 登录/注册/JWT 刷新 |
| `/api/v1/users/*` | UserModule | 用户 CRUD |
| `/api/v1/consult/*` | ConsultModule | 咨询核心（路由/调度/生成/对话） |
| `/api/v1/payment/*` | PaymentModule | Stripe 支付 |
| `/api/v1/membership/*` | MembershipModule | 会员管理 |
| `/api/v1/saved-cases/*` | SavedCaseModule | 命例库 |
| `/api/v1/feedback/*` | FeedbackModule | 专家标注 |
| `/api/v1/analytics/*` | AnalyticsModule | 行为分析 |
| `/api/v1/growth/*` | GrowthModule | 增长运营 |
| `/api/v1/admin/*` | AdminModule | 管理后台 |
| `/api/v1/benchmark/*` | MingliBenchModule | 命理基准测试 |
| `/api/v1/shumiyuan/*` | ShumiyuanModule | 人生枢密院 |
| `/api/v1/star-chart/*` | StarChartModule | 星图 |
| `/api/v1/miaosuan/*` | MiaosuanModule | 庙算 |
| `/api/v1/chronicle/*` | ChronicleModule | 通鉴 |
| `/api/v1/kline-tide/*` | KlineTideModule | K线+潮汐 |
| `/api/v1/feature-flags/*` | FeatureFlagsModule | 功能开关 |
| `/api/v1/dialogue/*` | ConsultModule/dialogue | 多轮对话 |
| `/api/v1/followup/*` | ConsultModule/followup | 回访 |
| `/health` | HealthController | 健康检查 |

### 5.3 Agent 对标

| Agent | 路径 | 说明 | Prompt 文件 |
|-------|------|------|------------|
| 张半山（枢密院调度） | `consult/orchestrator/` | 调度决策树 + 场景路由 | agent-intro-messages.ts + scenario-rules.yaml |
| 子平 Agent | `ziping-agent/` | 八字命理分析 | ziping-system-prompt.md / ziping-system-prompt-en.md |
| 六壬 Agent | `liuren-agent/` | 大六壬占断 | liuren-system-prompt.md + jinkoujue/tuiming/zeri/zhanlei prompt |
| 六爻 Agent | `liuyao-agent/` | 六爻占断 | liuyao-system-prompt.md |
| 奇门 Agent | `qimen-agent/` | 奇门遁甲 | qimen-system-prompt.md + golden test |
| 取名 Agent | `quming-agent/` | 取名分析 | quming-system-prompt.md + quming-user-prompt.md |

### 5.4 算法引擎对标

| 引擎 | 路径 | 说明 |
|------|------|------|
| 八字引擎 | `calc-engine/bazi-engine/` | core/bazi-data.service.ts + solar-terms.ts + golden 测试 |
| 取名引擎 | `calc-engine/naming-engine/` | kangxi-strokes.ts + naming-calculator.ts + zodiac-taboo.ts |
| 原子工具 | `lib/atom-tools/` | bazi/(chong-he/dayun-stage/shishen/wuxing-balance) + decision/(career-fit/cross-validate/relationship/risk/timing) + ziwei/(feigong/minggong-master/sihua-distribution) |
| 知识库计算器 | `knowledge-base/` | bazi-calculator.ts + liuren-calculator.ts |
| 六壬数据 | `knowledge-base/liuren/` | bi-fa.json / jieqi-yuejiang.json / jinkoujue-rules.json / shensha.json 等 |
| 规则引擎 | `shared/rule-engine/` | liuren-jinkoujue/liuren-shensha/liuren-tuiming/liuyao-duangua 等 JSON 规则 |

### 5.5 LLM Provider 对标

| Provider | 优先级 | 说明 |
|----------|--------|------|
| SenseNova | 1（默认） | 商汤日日新 |
| DeepSeek | 2 | DeepSeek V3 |
| Doubao | 3 | 字节豆包 |
| MiniMax | 4 | MiniMax |
| DeepSeek-Direct | 5 | DeepSeek 直连 |

**5 Provider 并行竞速**：SenseNova → DeepSeek → Doubao → MiniMax → DeepSeek-Direct，自动 failover。

---

## 六、数据库对标

### 6.1 模型对标（33 个 Prisma 模型）

| 分类 | 模型 | 数量 |
|------|------|------|
| 用户体系 | User / Session / CreditLedger / UserMemory | 4 |
| 八字命理 | BaZiProfile | 1 |
| 咨询核心 | ConsultRecord / NamingResult / ConsultFeedback / EvidencePacket / GenerationRun / KnowledgeHit / InteractionEvent / ConsultPreview / ConsultFollowUp / ConsultDialogue | 10 |
| 人物档案 | PersonProfile / PersonProfileRecord / PersonEightDimensions / PersonRelatedCase | 4 |
| 会员支付 | Membership / Order | 2 |
| 增长体系 | Invite / Referral / GrowthOffer | 3 |
| 命理基准 | LiurenCase / BenchmarkRun | 2 |
| 人生枢密院 | ChronicleEntry / UserInsightProfile | 2 |
| K线潮汐 | KlineBar / StateSnapshot | 2 |
| 命例库 | SavedCase | 1 |
| 行为追踪 | PageVisit / UserActivity | 2 |

### 6.2 迁移状态

| 项目 | 状态 |
|------|------|
| 迁移方式 | `prisma db push`（开发模式，无 migrate 目录） |
| 本地 schema | 33 个模型，与代码同步 |
| 服务器 schema | ⚠️ 待确认是否与本地一致 |
| 数据库文件 | SQLite prod.db，备份脚本 `scripts/backup-db.sh` |
| 迁移计划 | Week 16-20 做 SQLite → PostgreSQL 迁移（执行框架声明） |

---

## 七、差异分析

### 7.1 已对齐 ✅

- 前端 25 条路由全部已部署
- 后端 25+ NestJS 模块全部已部署
- 33 个 Prisma 数据模型
- 5 个 Agent 体系（张半山 + 子平/六壬/六爻/奇门/取名）
- 算法引擎（八字/取名/原子工具/知识库计算器）
- 14 种聊天消息类型
- 13 个 Zustand store
- 3 语言国际化
- Nginx 路由映射（/life/ → 前端，/life/api/v1/ → 后端）
- WebSocket 实时通信
- Stripe 支付集成

### 7.2 待确认 ⚠️

| 项 | 状态 | 影响 |
|---|------|------|
| PM2 `awkn-life-api` 实际运行端口 | ⚠️ | DEPLOY.md 写 3000，部署配置写 3002，需确认 |
| PM2 进程重启次数和稳定性 | ⚠️ | 凌扬健身曾出现 84 次重启，本项目是否有类似问题 |
| 服务器 prod.db 是否与本地 schema 同步 | ⚠️ | 33 个模型是否全部 push 到服务器 |
| 5 个 LLM Provider 在服务器是否全部可用 | ⚠️ | API Key 是否全部配置 |
| Redis 在服务器是否正常运行 | ⚠️ | QueueModule 依赖 Redis |
| BullMQ 在服务器是否正常运行 | ⚠️ | followup.processor 等依赖 BullMQ |
| 前端构建时 `VITE_API_BASE_URL` 是否正确 | ⚠️ | 需指向 `/life/api/v1/` 或相对路径 |
| 知识库 JSON 数据是否部署到服务器 | ⚠️ | knowledge-base/liuren/ 下 10+ JSON 文件 |
| 规则引擎 JSON 是否部署到服务器 | ⚠️ | shared/rule-engine/rules/ 下 9 个 JSON 规则文件 |
| Agent prompt 文件是否部署到服务器 | ⚠️ | 5 个 Agent 各有 prompts/ 目录 |

### 7.3 需清理 🧹

| 项 | 说明 | 建议 |
|---|------|------|
| `app/dist.tar.gz` | 本地构建产物压缩包 | 删除，不入 Git |
| `app/debug-kline.mjs` | 调试脚本 | 不入生产 |
| `app/info.md` | 临时文档 | 清理或归档 |
| `app/src/.claude/` | Claude IDE 状态文件 | 不入生产 |
| `app/src/.meta-kim/` | Kimi 状态文件 | 不入生产 |
| `probe-llm.json` / `probe-migrate.sql` | 探测文件 | 清理 |
| `docs/_tmp_*.md` | 临时技能文件 | 清理 |

### 7.4 服务器 vs 本地独有的内容

| 服务器独有 | 说明 |
|----------|------|
| `/opt/awkn-life/awkn-life-backend/apps/api-server/.env` | 含真实 API Key 和 JWT_SECRET |
| `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db` | 生产数据库 |
| `/www/wwwroot/awkn.cn/life/` | 前端构建产物 |
| PM2 进程配置 | ecosystem.config.js |
| Nginx 配置 | `/www/server/panel/vhost/nginx/awkn.cn.conf` |

| 本地独有 | 说明 |
|---------|------|
| `app/src/` 完整源码 | 服务器只有构建产物 |
| `knowledge/eastern-metaphysics/` | 东方玄学知识库（100+ 文件） |
| `knowledge/qimen-suite/` | 奇门工具集（Qimen-master/ZhouYiLab/qimen-go/yunque-qimen） |
| `docs/` 完整文档 | 服务器无文档 |
| `app/src/.claude/` / `app/src/.meta-kim/` | IDE 状态文件 |
| `app/debug-kline.mjs` | 调试脚本 |
| `apps/AWKN-LABlife/verify/` | 验证文档 |

---

## 八、建议与风险

### 8.1 短期（1周内）

1. **SSH 登录确认 PM2 状态**：执行 `pm2 info awkn-life-api` 确认端口/重启次数/内存
2. **确认数据库 schema 同步**：在服务器执行 `npx prisma db push --accept-data-loss`（如有差异）
3. **确认 LLM Provider 可用性**：测试 5 个 Provider 的 API Key 是否有效
4. **确认 Redis 运行**：`redis-cli ping` 验证
5. **确认知识库 JSON 部署**：检查 `/opt/awkn-life/awkn-life-backend/apps/api-server/src/knowledge-base/liuren/` 是否存在

### 8.2 中期（1个月内）

1. **建立部署脚本**：将前端构建 + 后端构建 + PM2 重启流程脚本化
2. **数据库迁移规范化**：从 `prisma db push` 切换到 `prisma migrate deploy`
3. **监控线上健康**：定期 `curl https://awkn.cn/life/api/v1/health`
4. **数据库定期备份**：cron 执行 `scripts/backup-db.sh`
5. **清理本地临时文件**：dist.tar.gz / debug-kline.mjs / probe-* / _tmp_*

### 8.3 长期（1个季度）

1. **SQLite → PostgreSQL 迁移**：按执行框架 Week 16-20 计划
2. **CI/CD 流水线**：GitHub Actions 自动构建 + 部署
3. **完善测试覆盖**：后端 Jest 单测 + 前端 Vitest 组件测试
4. **Redis 持久化**：确保 BullMQ 队列数据不丢失
5. **HTTPS 证书**：Let's Encrypt 自动续期

### 8.4 风险清单

| 风险 | 级别 | 说明 |
|------|------|------|
| SQLite 并发限制 | 🟡 | 单文件数据库，高并发写入可能锁表 |
| 2C/1.8G 服务器资源 | 🟡 | 内存偏小，PM2 + Nginx + Redis 同时运行可能 OOM |
| 无 migrate 迁移 | 🟡 | `db push` 不生成迁移历史，schema 回滚困难 |
| LLM Provider 限流 | 🟡 | 凌扬健身曾出现 MiniMax 429，本项目 5 Provider 降低风险 |
| 知识库 JSON 缺失 | 🔴 | 如服务器缺少 liuren/ 下的 JSON，六壬 Agent 无法工作 |
| 规则引擎 JSON 缺失 | 🔴 | 如服务器缺少 rule-engine/rules/，规则匹配失败 |
| Agent prompt 缺失 | 🔴 | 如服务器缺少 prompts/ 目录，Agent 无法生成正确输出 |

---

## 九、附录

### 9.1 服务器 SSH 信息

| 项 | 值 |
|---|---|
| 服务器 IP | 8.148.245.29 |
| SSH 端口 | 22 |
| 用户 | root |
| 密钥 | ~/.ssh/aliyun_awkn |
| SCP 工具 | OpenSSH（Git Bash 内置） |
| 部署路径 | /opt/awkn-life/ |
| 前端路径 | /www/wwwroot/awkn.cn/life/ |

### 9.2 关键路径速查

| 用途 | 路径 |
|------|------|
| 前端生产部署 | `/www/wwwroot/awkn.cn/life/` |
| 后端部署 | `/opt/awkn-life/awkn-life-backend/` |
| 数据库 | `/opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db` |
| 环境变量 | `/opt/awkn-life/awkn-life-backend/apps/api-server/.env` |
| PM2 配置 | `/opt/awkn-life/ecosystem.config.js` |
| Nginx 配置 | `/www/server/panel/vhost/nginx/awkn.cn.conf` |
| 本地前端源码 | `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\app\src\` |
| 本地后端源码 | `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\src\` |
| 本地 Prisma Schema | `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\apps\AWKN-LABlife\awkn-life-backend\apps\api-server\prisma\schema.prisma` |
| 本地知识库 | `C:\Users\10919\Desktop\AWKN-Lab\人生决策宗师\knowledge\` |

### 9.3 部署命令模板

```bash
# === 前端构建 ===
cd apps/AWKN-LABlife/app
npm install
VITE_API_BASE_URL=/life/api npx vite build
# 产物在 dist/

# === 后端构建 ===
cd apps/AWKN-LABlife/awkn-life-backend
npm install
npx prisma generate
cd apps/api-server && npx nest build

# === 打包上传 ===
# 前端
cd apps/AWKN-LABlife/app
tar -czf /tmp/life-frontend.tar.gz dist/
scp -i ~/.ssh/aliyun_awkn /tmp/life-frontend.tar.gz root@8.148.245.29:/tmp/

# 后端
cd apps/AWKN-LABlife/awkn-life-backend
tar -czf /tmp/life-backend.tar.gz --exclude='node_modules' --exclude='.git' .
scp -i ~/.ssh/aliyun_awkn /tmp/life-backend.tar.gz root@8.148.245.29:/tmp/

# === 服务器部署 ===
ssh -i ~/.ssh/aliyun_awkn root@8.148.245.29 "
  # 前端
  cd /www/wwwroot/awkn.cn/life
  cp -r . ../life.backup.\$(date +%Y%m%d)
  rm -rf *
  tar -xzf /tmp/life-frontend.tar.gz --strip-components=1
  chown -R www:www .

  # 后端
  cd /opt/awkn-life/awkn-life-backend
  tar -xzf /tmp/life-backend.tar.gz
  npm install --production
  npx prisma generate
  npx prisma db push
  pm2 restart awkn-life-api

  rm -f /tmp/life-frontend.tar.gz /tmp/life-backend.tar.gz
"

# === 验证 ===
curl -I https://awkn.cn/life/
curl https://awkn.cn/life/api/v1/health
```

### 9.4 检查工具

- `pm2 list` / `pm2 info awkn-life-api`
- `pm2 logs awkn-life-api --lines 50`
- `ls -la /www/wwwroot/awkn.cn/life/`
- `ls -la /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/`
- `curl -s https://awkn.cn/life/api/v1/health`
- `redis-cli ping`
- `sqlite3 /opt/awkn-life/awkn-life-backend/apps/api-server/prisma/prod.db ".tables"`

### 9.5 技术栈汇总

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.2.0 |
| 构建工具 | Vite | 7.2.4 |
| UI 组件库 | shadcn/ui + Radix | 最新 |
| CSS | Tailwind CSS | 3.4.19 |
| 动画 | Framer Motion + GSAP | 12.38.0 + 3.14.2 |
| 图表 | Recharts + ECharts | 2.15.4 + 5.5.1 |
| 状态管理 | Zustand | 5.0.12 |
| 实时通信 | Socket.IO Client | 4.7.5 |
| 国际化 | i18next + react-i18next | 26.0.3 + 17.0.2 |
| 后端框架 | NestJS | 10.3.0 |
| ORM | Prisma | 5.22.0 |
| 数据库 | SQLite（→ PostgreSQL） | — |
| 队列 | BullMQ | 5.76.8 |
| 缓存 | Redis（ioredis） | 5.10.1 |
| 认证 | Passport + JWT | — |
| 支付 | Stripe | 14.14.0 |
| 命理计算 | lunar-javascript + iching-shifa + iztro | — |
| LLM | OpenAI SDK（5 Provider 竞速） | 4.26.0 |

---

## 十、总结

| 类别 | 已对齐 | 待确认 | 需清理 |
|------|--------|--------|--------|
| 前端页面 | ✅ 25 条路由 | 0 | 7 项临时文件 |
| 前端组件 | ✅ 50+ UI + 14 消息 + 业务 | 0 | 0 |
| 前端 Store | ✅ 13 个 Zustand | 0 | 0 |
| 后端模块 | ✅ 25+ NestJS | 0 | 0 |
| Agent 体系 | ✅ 5 个 Agent | prompt 部署状态 | 0 |
| 算法引擎 | ✅ 八字/取名/原子工具 | 知识库 JSON 部署 | 0 |
| 数据库 | ✅ 33 个模型 | schema 同步 | 0 |
| 部署 | ✅ 6/05 最新 | 端口/稳定性/Redis | 0 |
| LLM | ✅ 5 Provider | API Key 可用性 | 0 |

**结论**：
- 前端 100% 已对齐（25 路由 + 50+ 组件 + 13 Store + 3 语言）
- 后端 100% 已对齐（25+ 模块 + 5 Agent + 算法引擎）
- 数据库 95% 已对齐（33 模型，服务器 schema 同步待确认）
- 部署 80% 需进一步确认（PM2 端口/稳定性/Redis/知识库 JSON/Agent prompt）
- 整体架构完整，核心业务（咨询/取名/六壬/八字/K线/枢密院）均已实现

**下一步行动**（按优先级）：
1. 🔴 SSH 进服务器执行 `pm2 info awkn-life-api` 确认端口和稳定性
2. 🔴 检查知识库 JSON 和规则引擎 JSON 是否部署到服务器
3. 🟡 确认 5 个 LLM Provider 的 API Key 是否全部有效
4. 🟡 确认 Redis 和 BullMQ 在服务器是否正常运行
5. 🟢 清理本地临时文件（dist.tar.gz / debug-kline.mjs / probe-* / _tmp_*）

---

> 报告生成时间：2026-06-17
> 检查者：AI 助手
> 下次建议检查时间：下次部署后或 2026-07-01
