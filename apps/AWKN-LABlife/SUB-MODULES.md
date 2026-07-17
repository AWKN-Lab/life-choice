# 人生决策宗师 - 关键子模块详细索引

> 最后更新：2026-05-06 | 责任人：技术团队

---

## 一、六壬算法引擎

### 1.1 架构概览

```
六壬算法引擎
├── TypeScript 实现 (AWKN-LABlife 后端)
│   ├── knowledge-base/liuren-calculator.ts    ← 核心计算器
│   ├── knowledge-base/bazi/tianjiang.json    ← 天将数据
│   ├── knowledge-base/bazi/jieqi-yuejiang.json ← 节气月将
│   └── liuren-agent/prompts/*.md              ← 规则提示词
│
├── Python 实现 (knowledge-base 后端)
│   ├── tools/da_liu_ren/dlr_*.py             ← 独立算法模块
│   └── tools/lunar_tools/*.py                 ← 基础工具
│
└── 参考知识 (md_converted/东方术数/六壬/_processed_md/)
    ├── 六壬断案详解.md                        ← 案例参考
    ├── 六壬指南例题解.md                      ← 例题参考
    └── 大六壬高级预测学.md                    ← 理论参考
```

### 1.2 TypeScript 六壬计算器

**文件**：`awkn-life-backend/apps/api-server/src/knowledge-base/liuren-calculator.ts`

| 方法 | 功能 | 规则数 | 状态 |
|------|------|--------|------|
| getJieQi() | 节气计算 | 24节气 | ACTIVE |
| getYueJiang() | 月将计算 | 12月将 | ACTIVE |
| getDiPan() | 地盘排布 | 12宫 | ACTIVE |
| getTianPan() | 天盘排布 | 12宫 | ACTIVE |
| getSiKe() | 四课排布 | 干支阴阳 | ACTIVE |
| getSanChuan() | 三传计算 | 九宗门 | ACTIVE |
| getTianJiang() | 天将系统 | 12天将 | ACTIVE |
| getBiFa() | 毕法赋 | 40+条 | ACTIVE |
| getShenSha() | 神煞系统 | 5层150+条 | ACTIVE |
| classifyEvent() | 事件分类 | 8类 | ACTIVE |
| getZhanLeiDetail() | 占类详情 | 8类 | ACTIVE |

**增强功能**（对比参考实现）：
- `getBiFa()`: 14条 → 40+条（覆盖三传结构/生克流转/四课结构/空亡/财官格局等）
- `getShenSha()`: 2层 → 5层（岁煞/月煞/旬空/干煞日德/支煞冲害）
- `classifyEvent()`: 简单 → 8类完整编码
- `getBiFaWithBusinessContext()`: 9条 → 22条业务映射

### 1.3 Python 大六壬模块

**文件**：`knowledge-base/tools/da_liu_ren/`

| 文件 | 功能 | 依赖 | 状态 |
|------|------|------|------|
| dlr_core.py | 核心引擎（十二宫/神将/遁干/类神系统） | lunar_tools | ACTIVE |
| dlr_basic.py | 基础数据（十二宫/神将/类神定义） | - | ACTIVE |
| dlr_bifa.py | 毕法赋（100条核心歌诀） | - | ACTIVE |
| dlr_keti.py | 课体系统（贼克/比用/涉害等） | - | ACTIVE |
| dlr_sanchuan.py | 三传系统（贼克发用/三传演变） | - | ACTIVE |
| dlr_sike.py | 四课系统（阴阳/日干/寄宫） | - | ACTIVE |
| dlr_shensha.py | 神煞系统（十二神将/驿马/劫煞） | - | ACTIVE |
| dlr_tiandi.py | 天地盘系统（月将/加临） | - | ACTIVE |
| dlr_yuejiang.py | 月将系统（子丑寅卯等十二将） | - | ACTIVE |
| dlr_zhanduan.py | 占断系统（用神/类神/吉凶判断） | - | ACTIVE |

### 1.4 六壬知识库文件

| 文件 | 内容 | 来源 | 状态 |
|------|------|------|------|
| jieqi-yuejiang.json | 节气月将对照（24节气→12将） | 已集成到TS | ACTIVE |
| tian-jiang.json | 天将数据（12天将/五行/类神） | 已集成到TS | ACTIVE |
| ke-ti.json | 课体数据（九宗门/课体分类） | 已集成到TS | ACTIVE |
| bi-fa.json | 毕法数据（100条毕法歌诀） | 已集成到TS | ACTIVE |
| shensha.json | 神煞数据（五层神煞体系） | 已集成到TS | ACTIVE |
| shigan-jigong.json | 十二宫数据 | 已集成到TS | ACTIVE |
| jiu-zong-men.json | 九宗门数据 | 已集成到TS | ACTIVE |

### 1.5 已转换 MD 参考文件

| 文件 | 内容 | 大小 | 状态 |
|------|------|------|------|
| 六壬断案详解.md | 案例详解（385页） | 已转换 | ACTIVE |
| 六壬指南例题解.md | 例题详解 | 已转换 | ACTIVE |
| 大六壬高级预测学.md | 理论预测学 | 已转换 | ACTIVE |
| 大六壬择日精要.pdf | 择日精要 | 待转换 | PENDING |
| 六壬大全.pdf | 大全 | 待转换 | PENDING |
| 韦千里大六壬全集.pdf | 全集 | 待转换 | PENDING |

### 1.6 六壬 Agent 提示词

**文件**：`awkn-life-backend/apps/api-server/src/liuren-agent/prompts/`

| 文件 | 功能 | 状态 |
|------|------|------|
| liuren-system-prompt.md | 六壬系统提示词 | ACTIVE |
| liuren-system-prompt-en.md | 英文系统提示词 | ACTIVE |
| liuren-analysis-prompt.md | 分析提示词模板 | ACTIVE |
| 六壬神煞总览.md | 神煞知识（岁煞/月煞/旬煞/干煞/支煞） | ACTIVE |
| 分类占断纲要.md | 占断纲要（事件类型/颗粒度/占类汇总） | ACTIVE |
| 节气月将对照表.md | 月将对照表 | ACTIVE |

---

## 二、前端组件体系

### 2.1 组件分类

```
组件层
├── 业务组件 (Business Components)
│   ├── Card/CardDisplay.tsx           ← 命理卡片展示
│   ├── KLineImageGenerator.tsx        ← K线图生成
│   ├── LifeKLineChart.tsx             ← 人生K线图
│   ├── NPC/NPCFateDisplay.tsx        ← NPC命运
│   ├── MultiEnding/MultiEndingDisplay.tsx ← 多结局
│   └── StateMachine/ConfigDrivenStateMachine.tsx ← 配置驱动状态机
│
├── 分析结果组件 (Analysis Components)
│   ├── BaZiTable.tsx                 ← 八字表格
│   ├── BaZiDetail.tsx                ← 八字详情
│   ├── AnalysisResult.tsx             ← 分析结果
│   ├── ConclusionPreview.tsx          ← 结论预览
│   ├── ChineseConclusionC.tsx         ← 中文结论
│   ├── ModernConclusionB.tsx          ← 现代结论
│   └── TraditionalConclusionA.tsx     ← 传统结论
│
├── 运势组件 (Fortune Components)
│   ├── DailyFortune.tsx              ← 每日运势
│   ├── MonthlyFortune.tsx            ← 每月运势
│   └── YearlyFortune.tsx             ← 年度运势
│
├── 页面区块 (Sections)
│   ├── HeroSection.tsx               ← 首屏
│   ├── ServicesSection.tsx           ← 服务
│   ├── ProcessSection.tsx            ← 流程
│   ├── AboutSection.tsx              ← 关于
│   ├── TestimonialsSection.tsx       ← 评价
│   └── FooterSection.tsx             ← 页脚
│
└── 基础UI组件库 (shadcn/ui, 40+ 组件)
    ├── button/input/textarea/select/checkbox/radio...
    ├── dialog/popover/dropdown/tooltip/sheet...
    ├── navigation/sidebar/tabs/breadcrumb...
    └── alert/progress/spinner/skeleton...
```

### 2.2 核心组件依赖关系

**Card 系统**
```
CardDisplay.tsx
├── cardStore.ts (状态管理)
├── api/consult.ts (数据获取)
└── types/card.ts (类型定义)
```

**KLine 系统**
```
LifeKLineChart.tsx ← KLineImageGenerator.tsx
├── lib/lifeklineService.ts (K线服务)
├── lib/utils.ts (工具函数)
├── types/lifekline.ts (类型定义)
└── api/consult.ts (数据获取)
```

**NPC Fate 系统**
```
NPCFateDisplay.tsx
├── npcFateStore.ts (状态管理)
├── api/consult.ts (数据获取)
└── types/npcFate.ts (类型定义)
```

**StateMachine 系统**
```
ConfigDrivenStateMachine.tsx
├── stateMachineStore.ts (状态管理)
├── types/stateMachine.ts (类型定义)
└── StateMachine.module.css (样式)
```

### 2.3 页面路由

| 页面 | 文件 | 功能 | 状态 |
|------|------|------|------|
| 首页 | HomePage.tsx | 主入口/英雄区 | ACTIVE |
| 咨询 | ConsultPage.tsx | 咨询入口 | ACTIVE |
| 信息 | InfoPage.tsx | 用户信息填写 | ACTIVE |
| 结果 | ResultPage.tsx | 咨询结果展示 | ACTIVE |
| 历史 | HistoryPage.tsx | 历史记录 | ACTIVE |
| 运势 | FortunePage.tsx | 日/月/年运势 | ACTIVE |
| 会员 | MembershipPage.tsx | 会员中心 | ACTIVE |
| 价格 | PricePage.tsx | 定价页 | ACTIVE |
| 个人 | ProfilePage.tsx | 个人中心 | ACTIVE |
| 成长 | GrowthPage.tsx | 成长激励 | ACTIVE |
| 反馈 | FeedbackPage.tsx | 反馈页 | ACTIVE |
| 管理 | AdminPage.tsx | 管理后台 | ACTIVE |

---

## 三、后端术数 Agent 架构

### 3.1 Agent 总览

```
LLM 网关 (llm-gateway)
    ↓
┌─────────────────────────────────────────────────────┐
│                 术数 Agent 层                        │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ Liuren   │ Ziping   │ Qimen    │ Liuyao   │ Ziwei    │
│ 六壬     │ 八字子平  │ 奇门遁甲  │ 六爻     │ 紫微斗数  │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│              Quming (取名智能体)                      │
└─────────────────────────────────────────────────────┘
    ↓
计算引擎 (calc-engine)
    ↓
算法知识库 (knowledge-base)
    ├── bazi-calculator.ts    ← 八字排盘
    ├── liuren-calculator.ts  ← 六壬起课
    └── bazi/*.json           ← 知识数据
    ↓
LLM Provider 层
    ├── doubao    (火山引擎)
    ├── moonshot  (Kimi)
    ├── minimax   (MiniMax)
    ├── deepseek  (深度求索)
    └── sensenova (日日新)
```

### 3.2 Agent 详细配置

**LiurenAgent（六壬智能体）**
- 入口：`liuren-agent.service.ts`
- Prompts：`liuren-system-prompt.md`, `liuren-analysis-prompt.md`
- 知识库：`六壬神煞总览.md`, `分类占断纲要.md`, `节气月将对照表.md`
- 计算器：`LiurenCalculator` → `knowledge-base/liuren-calculator.ts`
- Provider：`LlmProvidersService`

**ZipingAgent（子平智能体/八字）**
- 入口：`ziping-agent.service.ts`
- Prompts：`ziping-system-prompt.md`
- 计算器：`BaZiCalculator` → `knowledge-base/bazi-calculator.ts`
- Provider：`LlmProvidersService`

**QimenAgent（奇门智能体）**
- 入口：`qimen-agent.service.ts`
- Prompts：`qimen-system-prompt.md`
- Provider：`LlmProvidersService`

**LiuyaoAgent（六爻智能体）**
- 入口：`liuyao-agent.service.ts`
- Prompts：`liuyao-system-prompt.md`
- Provider：`LlmProvidersService`

**ZiweiAgent（紫微智能体）**
- 入口：`ziwei-agent.service.ts`
- Prompts：`ziwei-system-prompt.md`
- Provider：`LlmProvidersService`

**QumingAgent（取名智能体）**
- 入口：`quming-agent.service.ts`
- Prompts：`quming-system-prompt.md`, `quming-user-prompt.md`
- 计算器：`BaZiCalculator`

### 3.3 LLM Provider 对比

| Provider | 模型 | 特点 | 适用场景 |
|----------|------|------|----------|
| doubao | doubao-lite | 低延迟/低成本 | 快速响应 |
| moonshot | moonshot-v1-8k | 长上下文 | 复杂分析 |
| minimax | abyss | 多语言 | 国际用户 |
| deepseek | deepseek-chat | 推理能力强 | 深度分析 |
| sensenova | - | 中文优化 | 中文场景 |

---

## 四、数据库 Schema

### 4.1 核心表

**User 表**
```sql
CREATE TABLE User (
  id            String @id @default(uuid())
  email         String?
  phone         String?
  wxOpenId      String?
  password      String?
  nickname      String?
  gender        String?
  birthDate     DateTime?
  birthTime     String?
  birthPlace    String?
  timezone      String?
  isAdmin       Boolean @default(false)
  creditBalance Int @default(0)
)
```

**BaZiProfile 表**
```sql
CREATE TABLE BaZiProfile (
  userId          String  @unique
  yearGanZhi      String
  monthGanZhi     String
  dayGanZhi       String
  timeGanZhi      String
  wuXingDist      String  // JSON: {木: x, 火: y, 土: z, 金: w, 水: v}
  shenWang        String  // 身旺/身弱
  xiYongShen      String  // JSON: 喜神/忌神/用神
  shiShen         String  // JSON: 十神列表
  shenSha         String  // JSON: 神煞列表
  qiYunAge        Int     // 起运年龄
  taiYuan         String? // 胎元
  mingGong        String? // 命宫
  naYinYear/Month/Day/Time String? // 纳音五行
)
```

**ConsultRecord 表**
```sql
CREATE TABLE ConsultRecord (
  id            String @id @default(uuid())
  userId        String?
  sessionId     String?
  question      String
  routeType     String  // liuren/ziping/qimen/liuyao/ziwei
  status        String  // pending/processing/completed/failed
  inputData     String  // JSON: 用户输入
  calcResult    String? // JSON: 计算结果
  llmResult     String? // JSON: LLM分析结果
  summaryScore  Int?    // 总结评分
  summaryLine   String? // 一句话总结
  analysisData  String? // JSON: 详细分析
  calcDuration  Int?    // 计算耗时(ms)
  llmDuration   Int?    // LLM耗时(ms)
  modelUsed     String? // 使用模型
  isSaved       Boolean @default(false)
  createdAt     DateTime @default(now())
)
```

### 4.2 关系图

```
User (1) ─────────┬───────── (N) BaZiProfile
                   │
                   └───────── (N) ConsultRecord
                                    │
                                    ├───────── CreditLedger
                                    ├───────── PageVisit
                                    └───────── UserActivity

User (1) ─────────┬───────── (N) Membership
                   │
                   └───────── (N) Order
                                    │
                                    ├───────── Referral
                                    └───────── Invite
```

---

## 五、部署架构

### 5.1 Docker Compose

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx.conf:/etc/nginx/nginx.conf]

  backend:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - LLM_PROVIDER=${LLM_PROVIDER}
    depends_on: [backend-db]

  backend-db:
    image: postgres:15
    volumes: [pgdata:/var/lib/postgresql/data]
```

### 5.2 PM2 配置

```javascript
module.exports = {
  apps: [{
    name: 'life-backend',
    script: 'dist/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

---

## 六、状态标记说明

| 标记 | 说明 |
|------|------|
| ACTIVE | 活跃使用，正在维护 |
| REFERENCE | 参考/示例文件 |
| DEPRECATED | 已废弃，不建议使用 |
| ARCHIVE | 已归档，仅作历史记录 |
| PENDING | 待处理 |

---

**索引生成完成** | 文件路径：
- `AWKN-LABlife/INDEX.md` — 主索引
- `knowledge-base/INDEX.md` — 知识库索引
- `AWKN-LABlife/SUB-MODULES.md` — 子模块详细索引