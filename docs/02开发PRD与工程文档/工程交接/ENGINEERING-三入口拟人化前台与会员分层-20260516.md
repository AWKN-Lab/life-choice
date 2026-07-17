# 三入口拟人化前台与会员分层 — 工程落地文档

> 依据 PRD：`PRD-三入口拟人化前台与会员分层-20260516.md`
> 生成日期：2026-05-16
> 范围：前端组件、API 接口、数据库变更、测试用例、任务拆解

---

## 1. 接口设计

### 1.1 免费预览接口（新增）

```
POST /api/v1/consult/preview
```

**请求体**
```ts
{
  module: 'kline' | 'naming' | 'question',
  // kline 场景
  birthDate?: string,
  birthTime?: string,
  gender?: string,
  // naming 场景
  namingType?: 'baby' | 'adult' | 'brand',
  surname?: string,
  stylePreference?: string,
  // question 场景
  question?: string,
  // 通用
  lang?: string,        // 'zh-CN' | 'en'
}
```

**响应体**
```ts
{
  previewId: string,           // 临时预览 ID，有效期 30 分钟
  module: string,
  freeContent: {
    // kline
    chartData?: KLinePoint[],  // 仅 overall 线，3-5 年数据点
    stageName?: string,
    score?: number,
    // naming
    candidates?: Array<{name: string, meaning: string, wuxing: string}>,
    // question
    intent?: string,
    answer?: { conclusion: string, risk: string, action: string },
  },
  lockedContent: {
    preview: string,           // 锁定内容的预览文案
    unlockAction: string,      // CTA 文案
    requiredPlan: 'monthly' | 'annual',
  },
  meta: {
    recordId?: string,         // 已登录时关联到用户记录
  },
}
```

### 1.2 现有复用接口（不改签名）

```
GET  /api/v1/consult/result/:recordId?module=kline&lang=zh-CN
GET  /api/v1/consult/result/:recordId?module=naming&lang=zh-CN
GET  /api/v1/consult/result/:recordId?module=breakthrough&lang=zh-CN
```

会员鉴权在 `ResultService` 中通过 `MembershipService.checkAccess(userId, module)` 完成。

### 1.3 会员检查接口（新增）

```
GET /api/v1/membership/check?module=kline&feature=fullFourLines
```

**响应**
```ts
{
  hasAccess: boolean,
  plan: 'free' | 'monthly' | 'annual' | 'admin',
  requiredPlan?: 'monthly' | 'annual',
  lockedFeatures: string[],
}
```

### 1.4 埋点上报接口（新增）

```
POST /api/v1/analytics/track
```

**请求体**
```ts
{
  event: string,       // 如 'entry_kline_click'
  userId?: string,
  sessionId?: string,
  properties?: Record<string, string>,
}
```

---

## 2. 数据库变更

### 2.1 consultRecord 表补充字段

```prisma
model ConsultRecord {
  // ... 现有字段保留 ...

  // 新增
  previewId     String?          // 免费预览关联 ID
  sourceEntry   String?          // 'kline' | 'naming' | 'question'
  namingType   String?          // 'baby' | 'adult' | 'brand'
  namingPreferences String?     // JSON: { surname, style, avoidChars }
  questionIntent String?        // 问事意图分类结果
  unlockStatus  String?         // 'preview' | 'unlocked_partial' | 'unlocked_full'
  shareGenerated Boolean @default(false)
}
```

### 2.2 新增 preview 表（临时预览）

```prisma
model ConsultPreview {
  id          String   @id @default(uuid())
  module      String
  inputData   String?          // JSON: 用户输入
  calcResult  String?          // JSON: 计算结果快照
  freeContent String           // JSON: 免费内容
  lang        String   @default("zh-CN")
  userId      String?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```

### 2.3 analytics_events 表（可选，Phase 2）

```prisma
model AnalyticsEvent {
  id          String   @id @default(uuid())
  event       String
  userId      String?
  sessionId   String?
  properties  String?          // JSON
  createdAt   DateTime @default(now())
}
```

---

## 3. 前端组件设计

### 3.1 组件树变更

```
HomePage.tsx
├── HeroSection           (品牌标题 + 价值说明)
├── EntryGrid             (三入口等宽卡片)
│   ├── EntryCard[kline]      → 点击 → KlineIntroPage
│   ├── EntryCard[naming]     → 点击 → NamingFrontdesk
│   └── EntryCard[question]   → 点击 → QuestionFrontdesk
├── ExampleSection        (命运K线示例图 / 取名方案示例 / 问事结果示例)
├── HistoryEntry          (用户历史记录入口)
└── MemberEntry           (会员权益入口)
```

### 3.2 新增组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `EntryGrid` | `components/home/EntryGrid.tsx` | 三入口卡片网格 |
| `EntryCard` | `components/home/EntryCard.tsx` | 单个入口卡片（图+标题+副标题+点击） |
| `NamingFrontdesk` | `components/naming/NamingFrontdesk.tsx` | 取名拟人化前台（2-3步收集需求） |
| `QuestionFrontdesk` | `components/question/QuestionFrontdesk.tsx` | 问事拟人化前台（自然语言输入+意图展示） |
| `FreePreviewGate` | `components/membership/FreePreviewGate.tsx` | 免费预览→会员解锁承接层 |
| `LockedContent` | `components/membership/LockedContent.tsx` | 锁定内容遮罩+CTA按钮 |
| `KlineIntroPage` | `pages/KlineIntroPage.tsx` | 命运K线引导页（出生信息表单） |

### 3.3 改造现有组件

| 组件 | 改造点 |
|------|--------|
| `HomePage.tsx` | 替换旧版 hero/services 为 EntryGrid + ExampleSection |
| `ResultPage.tsx` | 新增 `isPreview` 模式；会员内容用 LockedContent 包裹 |
| `LifeKLineChart.tsx` | 支持 `truncated` prop（仅显示 3-5 年数据点） |

### 3.4 状态管理

```ts
// stores/previewStore.ts (新增)
interface PreviewState {
  previewId: string | null;
  module: 'kline' | 'naming' | 'question' | null;
  freeContent: unknown;
  lockedContent: unknown;
  expiresAt: number | null;
}

// stores/entryStore.ts (新增)
interface EntryState {
  activeEntry: 'kline' | 'naming' | 'question' | null;
  namingType: 'baby' | 'adult' | 'brand' | null;
  namingPreferences: Record<string, string>;
  questionIntent: string | null;
}
```

---

## 4. 数据流

### 4.1 命运K线免费预览流程

```
HomePage
  → [点击 命运K线]
  → KlineIntroPage
    → 填写出生信息
    → POST /consult/preview (module=kline)
    → 返回 previewId + freeContent (total势线)
    → FreePreviewGate 展示免费内容
    → [点击 查看完整四线] → 检查会员
      → 已有会员 → GET /consult/result/:recordId?module=kline → 完整内容
      → 无会员   → LockedContent 遮罩 → 引导充值
```

### 4.2 取名拟人化前台流程

```
HomePage
  → [点击 取名]
  → NamingFrontdesk
    → Step 1: 选择类型 (宝宝/成人/品牌)
    → Step 2: 补充偏好 (姓氏/风格/避讳字)
    → Step 3: 填写出生信息 (宝宝/成人取名)
    → POST /consult/preview (module=naming)
    → 返回 3 个候选 + 简短解释
    → [点击 看完整方案] → 会员检查 → 解锁/充值
```

### 4.3 问事拟人化前台流程

```
HomePage
  → [点击 问事]
  → QuestionFrontdesk
    → 用户输入自然语言问题
    → POST /consult/preview (module=question)
    → 后端 intentRouter 分流 → liuren/liuyao/ziping/qimen
    → 返回初判 (结论+风险+行动)
    → [点击 深度推演] → 会员检查 → 解锁/充值
```

---

## 5. 测试用例

### 5.1 首页三入口

| 编号 | 场景 | 预期 |
|------|------|------|
| HOME-001 | 桌面端首页渲染 | 三个入口卡片等宽排列 |
| HOME-002 | 移动端首页渲染 | 三个入口卡片垂直堆叠 |
| HOME-003 | 点击命运K线 | 进入 KlineIntroPage |
| HOME-004 | 点击取名 | 进入 NamingFrontdesk |
| HOME-005 | 点击问事 | 进入 QuestionFrontdesk |
| HOME-006 | 英文模式 | 三个入口文案切换为英文 |
| HOME-007 | 底部导航 | 不影响现有标签页切换 |

### 5.2 命运K线预览

| 编号 | 场景 | 预期 |
|------|------|------|
| KLINE-011 | 免费用户生成预览 | 显示 total 线 3-5 年数据点 |
| KLINE-012 | 点击完整四线 | 出现会员承接 |
| KLINE-013 | 月会员查看 | 显示完整四线 |
| KLINE-014 | 管理员查看 | 不出现会员承接 |
| KLINE-015 | 空数据 | 显示空状态提示 |
| KLINE-016 | 英文模式 | 四线文案无中文残留 |

### 5.3 取名前台

| 编号 | 场景 | 预期 |
|------|------|------|
| NAME-001 | 选择宝宝取名 | 追问姓氏+出生时间+风格 |
| NAME-002 | 选择成人改名 | 追问原名+改善方向 |
| NAME-003 | 选择品牌取名 | 追问行业+人群+风格 |
| NAME-004 | 免费预览 | 显示 3 个候选名字 |
| NAME-005 | 会员解锁 | 显示 10-20 个候选+评分 |

### 5.4 问事前台

| 编号 | 场景 | 预期 |
|------|------|------|
| Q-001 | 输入"要不要换工作" | 意图识别为"事业工作" |
| Q-002 | 输入"这段关系还要不要继续" | 意图识别为"感情关系" |
| Q-003 | 免费预览 | 显示结论+风险+行动 |
| Q-004 | 会员解锁 | 显示深度推演+证据链 |

### 5.5 会员分层

| 编号 | 场景 | 预期 |
|------|------|------|
| MEM-001 | 免费用户查看 kline 四线 | 返回 locked，提示充值 |
| MEM-002 | 月会员查看 kline 四线 | hasAccess=true |
| MEM-003 | 年会员查看所有功能 | hasAccess=true |
| MEM-004 | 管理员用户 | 所有功能 hasAccess=true |
| MEM-005 | 会员过期后访问 | hasAccess=false |

---

## 6. 任务拆解

### Phase 1: 首页三入口 (P0，预计前端 3d)

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 1.1 | EntryCard 组件 | `components/home/EntryCard.tsx` | 可渲染图文卡片 |
| 1.2 | EntryGrid 组件 | `components/home/EntryGrid.tsx` | 三卡片响应式布局 |
| 1.3 | 替换 HomePage hero | `pages/HomePage.tsx` | 桌面+移动端正常 |
| 1.4 | 三入口 i18n | `locales/{zh-CN,en,th}/translation.json` | 中英文无混杂 |
| 1.5 | 入口埋点 hook | `lib/useAnalytics.ts` | 点击事件上报 |

### Phase 2: 命运K线预览 (P0，预计 2d)

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 2.1 | KlineIntroPage | `pages/KlineIntroPage.tsx` | 出生信息表单 |
| 2.2 | /consult/preview API | `consult/preview.service.ts` + controller | 返回免费预览数据 |
| 2.3 | FreePreviewGate | `components/membership/FreePreviewGate.tsx` | 免费→会员承接 |
| 2.4 | LockedContent | `components/membership/LockedContent.tsx` | 锁定遮罩+CTA |
| 2.5 | LifeKLineChart truncated | `components/LifeKLineChart.tsx` | 仅显示3-5年数据点 |

### Phase 3: 取名前台 (P1，预计 3d)

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 3.1 | NamingFrontdesk | `components/naming/NamingFrontdesk.tsx` | 2-3步收集需求 |
| 3.2 | naming preview API | 复用 /consult/preview | 返回候选名字 |
| 3.3 | 前→后台数据桥接 | `NamingFrontdesk → ConsultPage` | 前台答案填入表单默认值 |
| 3.4 | 取名预览结果 | `ResultPage.tsx` naming 模式 | 免费3个候选 |

### Phase 4: 问事前台 (P1，预计 3d)

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 4.1 | QuestionFrontdesk | `components/question/QuestionFrontdesk.tsx` | 自然语言输入 |
| 4.2 | question preview API | 复用 /consult/preview | 返回初判 |
| 4.3 | 意图展示 | QuestionFrontdesk 结果区 | 显示"已识别为事业问题" |
| 4.4 | 问事预览结果 | `ResultPage.tsx` question 模式 | 结论+风险+行动 |

### Phase 5: 会员检查+数据留存 (P1，预计 2d)

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 5.1 | /membership/check API | `membership/membership.controller.ts` | 返回 hasAccess |
| 5.2 | previewStore | `stores/previewStore.ts` | 临时预览状态管理 |
| 5.3 | DB migrate (preview表+新字段) | `prisma/schema.prisma` | migrate 成功 |
| 5.4 | 管理员后台查看 | `admin/admin.controller.ts` | 可查看用户记录 |

### Phase 6: 埋点+终验 (P2，预计 1d)

| # | 任务 | 文件 | 验收 |
|---|------|------|------|
| 6.1 | 埋点接入 | 全页面 | 15 个埋点事件上报 |
| 6.2 | 全流程回归 | — | 三入口→预览→解锁 链路畅通 |
| 6.3 | i18n 终审 | — | 中英泰三语无混杂 |
| 6.4 | 构建验证 | `npm run build` | 零错误 |

---

## 7. 不做清单（明确排除）

- 不重构会员支付体系（复用现有 `MembershipService`）
- 不新增 HATwin 整站迁移
- 不重写底部导航
- 不新增 Redis 缓存层（本期用内存+DB）
- 不改 `awkn.cn` 根主页
- 不新增完整事件回看资产库（Phase 2+）

---

## 8. 类型定义汇总

```ts
// types/preview.ts (新增)
export interface PreviewRequest {
  module: 'kline' | 'naming' | 'question';
  birthDate?: string;
  birthTime?: string;
  gender?: string;
  namingType?: 'baby' | 'adult' | 'brand';
  surname?: string;
  stylePreference?: string;
  question?: string;
  lang?: string;
}

export interface PreviewResponse {
  previewId: string;
  module: string;
  freeContent: Record<string, unknown>;
  lockedContent: {
    preview: string;
    unlockAction: string;
    requiredPlan: 'monthly' | 'annual';
  };
  meta: {
    recordId?: string;
  };
}

export interface MembershipCheckResponse {
  hasAccess: boolean;
  plan: 'free' | 'monthly' | 'annual' | 'admin';
  requiredPlan?: 'monthly' | 'annual';
  lockedFeatures: string[];
}

// types/naming.ts (新增)
export type NamingType = 'baby' | 'adult' | 'brand';
export interface NamingPreferences {
  type: NamingType;
  surname?: string;
  originalName?: string;
  improveDirection?: string;
  industry?: string;
  targetAudience?: string;
  style?: 'steady' | 'lively' | 'scholarly' | 'modern' | 'premium' | 'friendly' | 'oriental' | 'commercial';
  birthDate?: string;
  birthTime?: string;
  gender?: string;
}
```