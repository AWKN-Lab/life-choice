# 命运K线 V1 Spec

## Why

当前 /life 首页以"开始咨询 + 多个功能卡片"为主，用户 3 秒内无法感知产品差异点。K线结果页是"图表工具"而非"可读的个人人生走势报告"，海报是信息堆叠而非传播资产。需要将产品心智从"玄学咨询工具"升级为"命运K线"，让用户一眼记住。

## What Changes

- 首页首屏改为"命运K线"主 CTA + 次入口"问一件事"
- 首页卡片重排：K线卡片第一位、跨2列、增强视觉权重
- ResultPage 新增"命运K线总览"模块（当前阶段/分数/机会窗口/风险窗口/一句话）
- ResultPage 新增"AI解盘师"本地解释面板（3个快捷问题 + 结构化答案）
- LifeKLineChart 标题/指标文案改人话、减少竖线密度、Tooltip 标题改版
- KLineImageGenerator 海报从"报告截图"改为"朋友圈传播卡"，删除敏感信息
- 三语 locale 新增/替换 key

## Impact

- Affected specs: 首页入口、K线结果页、K线图组件、海报组件、多语言
- Affected code:
  - `app/src/pages/HomePage.tsx` — 首页布局 + CTA
  - `app/src/pages/ResultPage.tsx` — K线总览 + AI解盘师 + 派生函数
  - `app/src/components/LifeKLineChart.tsx` — 标题/指标/竖线/Tooltip
  - `app/src/components/KLineImageGenerator.tsx` — 海报重做
  - `app/src/locales/zh-CN/translation.json` — 中文 key
  - `app/src/locales/en/translation.json` — 英文 key
  - `app/src/locales/th/translation.json` — 泰文 key

## ADDED Requirements

### Requirement: 命运K线首页主入口

系统 SHALL 在首页首屏展示"命运K线"主 CTA，包含标题"生成你的命运K线"、副标题"看见你的上升期、转折点和关键年份"、主按钮"生成我的命运K线"、次入口"问一件事"。

#### Scenario: 用户打开首页
- **WHEN** 用户访问 `/life/`
- **THEN** 首屏可见"生成你的命运K线"标题和主 CTA 按钮

#### Scenario: 用户点击主 CTA
- **WHEN** 用户点击"生成我的命运K线"按钮
- **THEN** 弹出咨询表单，问题字段已预填K线意图
- **AND** 触发埋点 `trackEvent('kline_hero_click')`

### Requirement: K线卡片首位增强

系统 SHALL 将 K线卡片移至首页卡片网格第一位，桌面端跨2列（`md:col-span-2`），移动端单列显示。

#### Scenario: 桌面端卡片布局
- **WHEN** 在桌面端（md 及以上）查看首页卡片
- **THEN** K线卡片位于第一行第一位，跨2列显示
- **AND** 卡片标题为"命运K线"，描述为"看见人生上升期、转折点和关键年份"

### Requirement: 命运K线总览

系统 SHALL 在 `moduleId === 'kline'` 区域顶部展示"命运K线总览"，包含当前阶段、当前分数、未来三年趋势、最佳窗口、风险窗口、一句话解读。

#### Scenario: 有K线数据时展示总览
- **WHEN** 用户查看K线结果页且 chartData 存在
- **THEN** 页面顶部显示总览卡，包含当前阶段/分数/未来三年/最佳窗口/风险窗口/一句话

#### Scenario: 无K线数据时
- **WHEN** 用户查看K线结果页但 chartData 为空
- **THEN** 显示"命运K线生成中/暂无足够数据"，不白屏

### Requirement: K线阶段派生函数

系统 SHALL 提供4个本地派生函数：
- `deriveKlineStage(chartData, currentYear)` — score>=75上升窗口，60-74稳步推进，45-59蓄势调整，<45低谷修复
- `deriveKlineWindows(chartData)` — 提取最佳窗口和风险窗口
- `deriveKlineNextThreeYears(chartData, currentYear)` — 未来三年趋势
- `buildKlineExplainAnswers(stage, windows, nextThreeYears)` — 结构化解读

#### Scenario: 当前年份定位优先级
- isCurrentYear > year===当前年份 > age最接近当前年龄 > chartData中间点

### Requirement: AI解盘师本地解释面板

系统 SHALL 在K线总览下方展示"AI解盘师"面板，3个快捷问题，点击后展示本地生成的结构化答案（一句准话+时间窗口+行动建议+风险提醒）。

#### Scenario: 用户点击快捷问题
- **WHEN** 用户点击"我现在处于什么阶段？"
- **THEN** 展示结构化答案
- **AND** 触发埋点 `trackEvent('kline_explain_click', { prompt_id, record_id })`

### Requirement: K线图组件优化

系统 SHALL 对 LifeKLineChart 做最小改动：
1. 标题"人生K线图"→"命运K线"
2. 指标文案改人话：当前年龄→当前阶段，最佳窗口→机会窗口
3. 大运竖线只显示当前+下1+下2，其余放Tooltip
4. Tooltip标题改为：这一年怎么看/适合/谨慎/依据

### Requirement: K线海报改造

系统 SHALL 将海报改为"朋友圈传播卡"，只保留：命运K线标题、当前阶段、机会窗口、风险窗口、一句话、简化K线曲线、品牌、awkn.cn/life。

#### Scenario: 海报隐私保护
- **WHEN** 用户生成海报
- **THEN** 不包含完整四柱、出生日期、过多五行比例

### Requirement: 多语言文案

系统 SHALL 在 zh-CN/en/th 三语中新增/替换 key：`home.destinyKlineTitle`、`home.destinyKlineSubtitle`、`home.destinyKlineCta`、`kline.brandName`、`kline.overview`、`kline.currentStage`、`kline.opportunityWindow`、`kline.riskWindow`、`kline.nextThreeYears`、`kline.aiInterpreter`。

## MODIFIED Requirements

### Requirement: 首页卡片顺序

原顺序：事业/感情/财运/家庭/取名/断事/择时/人生K线图
新顺序：**命运K线(跨2列)** / 看运势 / 断个事 / 取名 / 择时 / 事业 / 财运 / 感情 / 家庭

### Requirement: K线 Tab 顺序

V1 保留现有 tabs，只在图表上方增加"总览卡 + AI解盘师"。不改 tab 结构。

## REMOVED Requirements

### Requirement: 海报完整四柱和出生信息
**Reason**: 隐私风险+传播效果差
**Migration**: 海报只保留阶段+窗口+曲线

### Requirement: 海报五行详细比例
**Reason**: 非目标用户看不懂，降低传播意愿
**Migration**: 保留在结果页内，海报不展示
