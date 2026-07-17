# 天辅智能深度对标分析 & 人生决策宗师提升计划

> 分析日期：2026-05-23
> 对标站点：https://tianfuagent.com/
> 目标项目：人生决策宗师 (AWKN-LABlife)

---

## 一、天辅智能首页深度拆解

### 1.1 信息架构（自上而下）

```
Hero Section（品牌定位）
  ├── Logo + 口号 "The Metaphysics Agent"
  ├── 核心标签 "Ziwei · BaZi · QiMen · All in Tianfu"
  └── 核心理念 "Chart. Reason. Insight." + 数据背书 (250+ tools)

Critical Moment（场景切入）
  ├── Exploring Possibilities（职业/人生方向）
  ├── Relationship Insight（人际关系）
  └── Risk and Opportunity（风险与机遇）

Product Section（产品能力）
  ├── 核心理念 "Think like a master. Deliver like an engineer."
  ├── Multi-agent AI 分析系统
  ├── 三大系统交叉验证
  └── 各系统介绍卡片（紫微/八字/奇门）

Engine Capabilities（引擎能力详解）
  ├── Unified Agent Architecture（统一 Agent 架构）
  ├── Visual Reasoning（可视化推理链）
  ├── Curated Knowledge Base（精选知识库）
  ├── Progressive Reasoning（渐进式推理）
  ├── Long-term Memory（长期记忆）
  └── Timeline Anchoring（时间线锚定）

Q&A（常见问题）
  ├── 如何解读命理分析结果
  ├── 与免费算命 App 的区别
  ├── 不懂命理术语能看懂吗
  ├── AI 真的能理解主观命运问题吗
  ├── 隐私数据安全
  └── 支持的命理学派

Closing CTA（行动号召）
  └── "Ready to explore your destiny chart?"

Footer
```

### 1.2 视觉设计特征

| 特征 | 实现方式 |
|------|---------|
| **色彩体系** | 深黑底色 + 琥珀金色点缀 + 紫微紫色辅助 |
| **字体层级** | 英文为主，大号标题 + 细体正文 |
| **图标系统** | Emoji + 自定义图标混合 |
| **卡片设计** | 毛玻璃圆角卡片，hover 微动效 |
| **间距节奏** | 大段落留白，每屏一个核心信息 |
| **动效** | 淡入上移（fade-in-up），克制不花哨 |
| **插图** | 占位图为灰色圆形/方形，保持整体整洁 |

### 1.3 互动方式

| 互动 | 说明 |
|------|------|
| **CTA 按钮** | 每屏底部有引导按钮 |
| **卡片 Hover** | 轻微上浮 + 阴影增强 |
| **FAQ 折叠** | 点击展开/收起 |
| **系统展示** | 标签切换（紫微/八字/奇门） |

### 1.4 文案策略

- **品牌口号**："Chart. Reason. Insight." — 三词定义核心价值
- **产品理念**："Think like a master. Deliver like an engineer." — 大师思维 + 工程师交付
- **场景化提问**：以用户内心独白形式 ("Should I stay the course, or seek a new horizon?")
- **信任建设**：250+ tools、multi-agent、cross-validation、transparent reasoning
- **FAQ 详细**：8 个常见问题，覆盖方法论、隐私、可读性等

---

## 二、我们项目现状对照

### 2.1 当前首页结构

```
Header（Logo + 语言切换）
  └── "人生决策宗师" + 中/英/泰切换

Hero（标题 + 输入框）
  ├── 标题："张半山人格"
  ├── 副标题 + 一句话
  └── 快捷输入框 + 提交按钮

PersonalizedRecommendations（登录后显示）
  └── 推荐卡片（仅登录用户可见）

EntryGrid（3 个入口卡片）
  ├── 命运K线
  ├── 取名
  └── 问事占卜

BottomNav（底部导航）
  ├── 枢密院（说出来→摆开→这事底→分流）
  ├── 星图
  ├── 庙算（通知点）
  └── 通鉴
```

### 2.2 已有组件（可直接复用）

| 组件 | 文件 | 状态 |
|------|------|------|
| HourWheel | `form/HourWheel.tsx` | ✅ 含公用组件库 |
| WaitingSpinner | `form/WaitingSpinner.tsx` | ✅ 含公用组件库 |
| DivinationRitualLoader | `DivinationRitualLoader.tsx` | ✅ 含公用组件库 |
| BottomNav | `BottomNav.tsx` | ✅ 含公用组件库 |
| EntryCard | `home/EntryCard.tsx` | ✅ 仅 app 内 |
| ConfidenceRing | `result/ConfidenceRing.tsx` | ✅ 仅 app 内 |
| ResultReveal | `result/ResultReveal.tsx` | ✅ 仅 app 内 |

### 2.3 已有页面

| 页面 | 路由 | 状态 |
|------|------|------|
| HomePage | `/` | ✅ |
| ShumiyuanPage | `/shumiyuan` | ✅ 说出来→摆开→这事底→分流 |
| XingtuPage | `/xingtu` | ⚠️ 占位 |
| MiaosuanPage | `/miaosuan` | ⚠️ 占位 |
| TongjianPage | `/tongjian` | ⚠️ 占位 |
| ResultPage | `/result` | ✅ |
| ConsultPage | `/consult` | ✅ |
| ComponentPreview | `/preview` | ✅ 开发预览 |

---

## 三、对标差距分析

### 3.1 首页定位差距（🔴 高优先级）

| 天辅 | 我们 | 差距 |
|------|------|------|
| 品牌宣言 "The Metaphysics Agent" | "人生决策宗师" 仅作 Logo | 缺少品牌价值主张 |
| 核心标签 "Ziwei · BaZi · QiMen" | 无 | 用户不知道我们支持哪些系统 |
| 理念 "Chart. Reason. Insight." | 无 | 没有一句话说清产品做什么 |
| 数据背书 "250+ tools" | 无 | 缺少信任建设 |
| 完整 Landing Page | 功能型首页 | 缺少营销/品牌页面 |

### 3.2 场景化入口差距（🔴 高优先级）

| 天辅 | 我们 | 差距 |
|------|------|------|
| "Exploring Possibilities" | EntryGrid 3 个卡片 | 缺少场景故事 |
| "Relationship Insight" | 无 | 缺少关系分析入口 |
| "Risk and Opportunity" | 无 | 缺少风险预警入口 |
| 每个场景有详细文案 | 仅卡片标题+描述 | 缺少情感共鸣 |

### 3.3 产品能力展示差距（🟡 中优先级）

| 天辅 | 我们 | 差距 |
|------|------|------|
| Multi-agent 架构说明 | 无 | 用户不知道技术实力 |
| Visual Reasoning 可视化 | 部分（K线图表） | 缺少推理链可视化 |
| Curated Knowledge Base | knowledge-base 项目 | 未在首页展示 |
| Progressive Reasoning | 无 | 缺少反幻觉机制说明 |
| Long-term Memory | 用户档案系统 | 未在首页展示 |
| Timeline Anchoring | 无 | 缺少人生命运时间线概念 |

### 3.4 信任建设差距（🟡 中优先级）

| 天辅 | 我们 | 差距 |
|------|------|------|
| 8 个 FAQ | 无 | 缺少常见问题解答 |
| 隐私安全说明 | 无 | 缺少数据安全保障说明 |
| 方法论说明 | 无 | 缺少命理学解释 |
| 与免费 App 的区别 | 无 | 缺少差异化说明 |

### 3.5 互动体验差距（🟢 低优先级）

| 天辅 | 我们 | 差距 |
|------|------|------|
| 单页滚动叙事 | 多页面路由 | 缺少故事化体验 |
| CTA 引导清晰 | 输入框直接提交 | 缺少引导流程 |
| FAQ 交互折叠 | 无 | ✅ 容易实现 |

---

## 四、提升方案

### Phase 1：首页重构（🔴 高优先级，1-2天）

#### 4.1.1 新增 Hero Banner 区域

**目标**：在现有 Header 和输入框之间，插入品牌宣言区

**改动文件**：`HomePage.tsx`

**内容**：
- Logo 下方：品牌宣言 "命理 Agent · 紫微 · 八字 · 奇门"
- 核心理念大标题："Chart. Reason. Insight." → 中文 "排盘 · 推演 · 洞察"
- 数据背书："3 大命理系统 · 250+ 专用工具 · 每一步推理可见"
- 当前输入框下移

**参考**：天辅 Hero Section 的极简风格

#### 4.1.2 新增 Critical Moments 场景区

**目标**：用真实用户场景引导，替代当前 3 卡片

**改动文件**：`HomePage.tsx` + 新建 `components/home/CriticalMoments.tsx`

**内容**（3 个场景卡片）：
1. **探索可能** — "我该坚守，还是寻找新方向？" → 命运K线
2. **关系洞察** — "灵魂伴侣，还是命中注定的考验？" → 合盘/关系分析
3. **风险机遇** — "前方的暗礁，我该如何避开？" → 流年/运势预警

每个卡片：场景提问 + 功能介绍 + CTA 按钮

#### 4.1.3 新增 Product Feature 展示区

**目标**：展示引擎能力，建立信任

**改动文件**：新建 `components/home/EngineFeatures.tsx`

**内容**（6 个能力卡片，可横向滚动或网格）：
1. **统一 Agent 架构** — 多 Agent 协同，命理洞察 + 行业趋势并行输出
2. **可视化推理** — 每一步推理完全可见，可追溯可审计
3. **精选知识库** — 源自经典古籍，过滤低质网络内容
4. **渐进式推理** — 反幻觉机制，基于证据累积而非随机输出
5. **长期记忆** — 持续累积命盘上下文，每次分析都建立在完整背景上
6. **时间线锚定** — 记录人生重要经历，让分析真正反映独特生命轨迹

#### 4.1.4 新增 FAQ 区域

**目标**：解答用户常见疑虑

**改动文件**：新建 `components/home/HomeFAQ.tsx`

**内容**（6-8 个折叠问答）：
1. 如何解读命理分析结果？
2. 与免费算命 App 有什么区别？
3. 不懂命理术语能看懂吗？
4. AI 真的能理解主观命运问题吗？
5. 我的生辰数据安全吗？
6. 什么是紫微斗数和八字？
7. 支持的命理学派有哪些？
8. 分析报告包含哪些内容？

### Phase 2：新页面开发（🟡 中优先级，3-4天）

#### 4.2.1 完善 XingtuPage（星图）

**目标**：对标天辅的 "Relationship Insight" 场景

**内容**：
- 关系分析入口（合盘/对比/互动）
- 命盘可视化（借鉴天辅的图形化展示）
- 关系能量匹配 + 沟通窗口

#### 4.2.2 完善 MiaosuanPage（庙算）

**目标**：对标天辅的 "Risk and Opportunity" 场景

**内容**：
- 风险预警 + 机遇捕捉
- 运势周期感知
- 决策辅助工具

#### 4.2.3 完善 TongjianPage（通鉴）

**目标**：对标天辅的 "Timeline Anchoring" 概念

**内容**：
- 人生时间线展示
- 历史咨询回顾
- 命盘演化轨迹

### Phase 3：公用组件提取（🟢 低优先级，1天）

#### 4.3.1 提取更多组件到公用组件库

| 组件 | 来源 | 用途 |
|------|------|------|
| EntryCard | `home/EntryCard.tsx` | 通用入口卡片 |
| CriticalMomentCard | 新建 | 场景化入口卡片 |
| FAQAccordion | 新建 | 折叠问答组件 |
| FeatureCard | 新建 | 能力展示卡片 |
| HeroBanner | 新建 | 品牌宣言组件 |

---

## 五、具体实施步骤

### Step 1：创建 HeroBanner 组件
- 文件：`components/home/HeroBanner.tsx`
- 内容：品牌宣言 + 核心理念 + 数据背书
- 验收：首页 Hero 区域从输入框变为完整品牌宣言

### Step 2：创建 CriticalMoments 组件
- 文件：`components/home/CriticalMoments.tsx`
- 内容：3 个场景卡片（探索可能/关系洞察/风险机遇）
- 验收：场景区替换或补充 EntryGrid

### Step 3：创建 EngineFeatures 组件
- 文件：`components/home/EngineFeatures.tsx`
- 内容：6 个能力展示卡片
- 验收：能力展示区位于场景区下方

### Step 4：创建 HomeFAQ 组件
- 文件：`components/home/HomeFAQ.tsx`
- 内容：折叠式 FAQ
- 验收：FAQ 区位于能力展示区下方

### Step 5：整合到 HomePage
- 修改：`HomePage.tsx`
- 内容：按 Hero → CriticalMoments → EngineFeatures → FAQ 顺序组装
- 保留：输入框 + EntryGrid + BottomNav
- 验收：首页滚动查看完整 Landing Page

### Step 6：提取到公用组件库
- 将新增组件提取到 `公用组件库/packages/react-ritual-ui/`
- 更新 `index.ts` 导出

### Step 7：TypeScript 编译验证
- 运行 `tsc --noEmit`

---

## 六、验收标准

| 项 | 标准 |
|----|------|
| 首页 Hero | 显示品牌宣言 + 核心理念 + 数据背书 |
| 场景区 | 3 个场景卡片，hover 动效，点击跳转 |
| 能力展示 | 6 个能力卡片，网格布局 |
| FAQ | 6+ 折叠问答，点击展开/收起 |
| 代码质量 | `tsc --noEmit` 零错误 |
| 组件复用 | 新增组件提取到公用组件库 |

---

## 七、风险与注意事项

| 风险 | 应对 |
|------|------|
| 首页变长影响加载速度 | 使用懒加载（lazy + Suspense）分段加载 |
| 场景入口功能未实现（合盘/关系分析） | 先做入口，功能标注 "即将上线" |
| 英文文案质量 | 参考天辅英文风格，使用 i18n 管理 |
| 移动端适配 | 使用 `useIsMobile` hook，卡片网格自适应列数 |

---

## 八、不做事项

1. 不修改现有路由结构
2. 不删除现有 EntryGrid（保留功能入口）
3. 不修改 BottomNav 和 ShumiyuanPage
4. 不引入新的第三方依赖
5. 不修改后端 API
6. 不重构 HomePage 表单逻辑（仅新增展示区）
7. 不实现合盘/关系分析的完整后端（仅前端入口）