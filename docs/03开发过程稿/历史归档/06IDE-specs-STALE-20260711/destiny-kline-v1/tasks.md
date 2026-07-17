# Tasks

- [x] Task 1: 首页文案和K线主CTA改造
  - [x] 1.1: HomePage.tsx 首屏 hero 区域改为"生成你的命运K线"标题+副标题+主CTA按钮+次入口"问一件事"
  - [x] 1.2: 主CTA点击预填问题 `我想生成命运K线，看看人生阶段、关键年份和未来走势` + `trackEvent('kline_hero_click')`
  - [x] 1.3: 次入口"问一件事"点击打开空问题的咨询表单

- [x] Task 2: 首页K线卡片首位增强
  - [x] 2.1: K线卡片移至卡片网格第一位
  - [x] 2.2: 桌面端 `md:col-span-2`，移动端单列
  - [x] 2.3: 卡片标题改为"命运K线"，描述改为"看见人生上升期、转折点和关键年份"，按钮暗示"生成"
  - [x] 2.4: 其余卡片顺序调整为：看运势/断个事/取名/择时/事业/财运/感情/家庭

- [x] Task 3: K线派生函数
  - [x] 3.1: 在 ResultPage.tsx 顶部工具函数区新增 `deriveKlineStage(chartData, currentYear)`，阶段规则：score>=75上升窗口，60-74稳步推进，45-59蓄势调整，<45低谷修复
  - [x] 3.2: 新增 `deriveKlineWindows(chartData)`，提取最佳窗口和风险窗口
  - [x] 3.3: 新增 `deriveKlineNextThreeYears(chartData, currentYear)`，未来三年趋势描述
  - [x] 3.4: 新增 `buildKlineExplainAnswers(stage, windows, nextThreeYears)`，生成结构化解读
  - [x] 3.5: 当前年份定位优先级：isCurrentYear > year===当前年份 > age最接近 > 中间点

- [x] Task 4: 命运K线总览模块
  - [x] 4.1: 在 ResultPage 的 `moduleId === 'kline'` 区域顶部新增"命运K线总览"卡片
  - [x] 4.2: 总览内容：当前阶段+当前分数+未来三年趋势+最佳窗口+风险窗口+一句话解读
  - [x] 4.3: 无数据时显示"命运K线生成中/暂无足够数据"，不白屏

- [x] Task 5: AI解盘师本地解释面板
  - [x] 5.1: 在K线总览下方新增"AI解盘师"面板，标题+说明+3个快捷问题
  - [x] 5.2: 3个快捷问题："我现在处于什么阶段？"/"未来三年怎么走？"/"今年适合主动变化吗？"
  - [x] 5.3: 点击后展示本地生成答案：一句准话+时间窗口+行动建议+风险提醒
  - [x] 5.4: 埋点 `trackEvent('kline_explain_click', { prompt_id, record_id })`

- [x] Task 6: K线图组件优化
  - [x] 6.1: LifeKLineChart 标题从"人生K线图"改为"命运K线"
  - [x] 6.2: 指标文案改人话：当前年龄→当前阶段，最佳窗口→机会窗口
  - [x] 6.3: 大运竖线只显示当前大运+下一个大运+后两个大运，其余放Tooltip
  - [x] 6.4: Tooltip标题改为：这一年怎么看/适合/谨慎/依据

- [x] Task 7: K线海报改造
  - [x] 7.1: KLineImageGenerator 海报内容精简为：命运K线标题+当前阶段+机会窗口+风险窗口+一句话+简化K线曲线+品牌+awkn.cn/life
  - [x] 7.2: 删除完整四柱、出生日期、过多五行比例、过密竖线、大段说明文字
  - [x] 7.3: 海报文件名改为"命运K线.png" / "mingyun-kline.png"

- [x] Task 8: 多语言文案补齐
  - [x] 8.1: zh-CN/translation.json 新增 key：home.destinyKlineTitle/Subtitle/Cta + kline.brandName/overview/currentStage/opportunityWindow/riskWindow/nextThreeYears/aiInterpreter/generating
  - [x] 8.2: en/translation.json 新增对应英文 key
  - [x] 8.3: th/translation.json 新增对应泰文 key（基础可读，不追求文学化）

- [x] Task 9: 前端构建验证
  - [x] 9.1: `cd app && npm run build` 零错误 ✅
  - [ ] 9.2: 本地浏览器检查桌面端和移动端首页+结果页

# Task Dependencies

- Task 3 (派生函数) → Task 4 (总览模块) → Task 5 (AI解盘师)
- Task 1 (首页CTA) 和 Task 2 (卡片重排) 可并行
- Task 6 (图表优化) 和 Task 7 (海报改造) 可并行
- Task 8 (多语言) 依赖 Task 1-7 中新增的所有 i18n key
- Task 9 (构建验证) 依赖 Task 1-8 全部完成
