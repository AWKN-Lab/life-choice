# 命运K线 V1 最小改动工程文档



命运K线 V1.1 工程执行文档



一、目标



把当前 /life 从“开始咨询 + 多个功能卡片”升级为：





生成你的命运K线：看见上升期、转折点和关键年份。





本轮不改底层八字算法、不做数据库迁移、不新增后端主接口。优先用现有前端能力完成产品心智升级。



核心收益：





首页 3 秒内让用户知道差异点是“命运K线”。



K线结果页从“图表工具”变成“可读的个人人生走势报告”。



海报从信息堆叠变成传播资产。



AI解盘先做本地结构化解读，避免 LLM 超时影响体验。







二、涉及文件



主要改这 5 类：





首页入口：HomePage.tsx



结果页 K线模块：ResultPage.tsx



K线图组件：LifeKLineChart.tsx



K线海报：KLineImageGenerator.tsx



多语言文案：



zh-CN/translation.json



en/translation.json



th/translation.json













三、首页改造



当前首页已有事业、感情、财运、家庭、取名、断事、择时、人生K线图入口。方向是对的，本轮只调权重。



首页首屏改为：



text







人生决策宗师

生成你的命运K线

看见你的上升期、转折点和关键年份



主按钮：生成我的命运K线

次入口：问一件事







主 CTA 行为：



ts







setQuestion('我想生成命运K线，看看人生阶段、关键年份和未来走势');

handleOpenForm();

trackEvent('kline\_hero\_click');







英文：



text







Generate My Destiny K-Line

See your rising phases, turning points, and key years.







泰文先做基础翻译，不能留空 fallback。



首页卡片调整：



text







第一位：命运K线，大卡，跨 2 列

第二行：看运势 / 断个事 / 取名 / 择时

第三行：事业 / 财运 / 感情 / 家庭







最低可接受实现：不大改布局，只把 K线卡片移动到第一位，并让它在桌面 md:col-span-2、移动端正常单卡显示。



K线卡片文案：



text







标题：命运K线

描述：看见人生上升期、转折点和关键年份

按钮暗示：生成









四、K线结果页改造



在 moduleId === 'kline' 区域顶部新增“命运K线总览”。



数据来源优先级：



text







1\. moduleContent.chartData

2\. result.calc\_result 派生出来的 K线数据

3\. 当前已有 fallback K线数据

4\. 无数据状态







新增本地派生函数，建议放在 ResultPage.tsx 顶部工具函数区：



ts







deriveKlineStage(chartData, currentYear)

deriveKlineWindows(chartData)

deriveKlineNextThreeYears(chartData, currentYear)

buildKlineExplainAnswers(stage, windows, nextThreeYears)







阶段规则 V1：



text







score >= 75：上升窗口

score 60-74：稳步推进

score 45-59：蓄势调整

score < 45：低谷修复







如果找不到当前年份：



text







优先找 isCurrentYear

其次找 year === 当前年份

再次找 age 最接近当前年龄

最后取 chartData 中间点







总览 UI 内容：



text







命运K线总览



当前阶段：蓄势调整

当前分数：62

未来三年：先稳后升，适合积累筹码

最佳窗口：2029 / 88

风险窗口：2027 / 42



一句话：

你现在不是猛冲年，更像换轨前的准备期。适合先试探新机会，不适合孤注一掷。







K线 tabs 顺序：



text







总览

未来十年

月度节律

五行依据

名人对照







如果改 tabs 成本偏高，V1 可保留现有 tabs，只把“总览卡 + AI解盘师”放在图表上方。





五、AI解盘师 V1



不接新 LLM，不新建聊天接口。



做一个轻量解释面板，解决“用户看不懂图”的问题。



UI 位置：K线总览下方、图表上方。



标题：



text







AI解盘师







说明：



text







根据你的命运K线，解释当前阶段和未来窗口。







快捷问题：



text







我现在处于什么阶段？

未来三年怎么走？

今年适合主动变化吗？







点击后展示本地生成答案。



答案结构固定：



text







一句准话

时间窗口

行动建议

风险提醒







示例：



text







一句准话：你现在更像蓄势调整期，不适合一把梭，但适合准备换轨。

时间窗口：未来三年里，2026 适合试探，2027 注意回撤，2028 开始转强。

行动建议：先做低成本验证，保留现金流和主线资源。

风险提醒：不要因为短期焦虑做高杠杆决定。







埋点：



ts







trackEvent('kline\_explain\_click', { prompt\_id, record\_id });









六、K线图组件优化



LifeKLineChart.tsx 保留现有 Recharts，不重写。



本轮只改：



标题从“人生K线图”改“命运K线”。

图上方指标文案改成人话：



当前年龄 → 当前阶段



最佳窗口 → 机会窗口



风险窗口 → 风险窗口







减少竖线密度：



大运线只显示当前大运、下一个大运、后两个大运。



其他大运变化放 tooltip 里。







Tooltip 中 reason/advice/evidenceTags 保留，但标题改成：



这一年怎么看



适合



谨慎



依据









不改 MA5、MA10、MACD，避免图表逻辑大动。





七、海报改造



KLineImageGenerator.tsx 当前是 1080x1920 长图，保留 Canvas 方案。



海报目标从“报告截图”改为“朋友圈传播卡”。



内容只保留：



text







命运K线

当前阶段：蓄势调整期

机会窗口：2029-2031

风险窗口：2027

一句话：你不是没有机会，而是在换轨前的蓄势段

简化K线曲线

品牌：人生决策宗师

二维码/访问提示：awkn.cn/life







明确删除或弱化：



text







完整四柱

出生日期

过多五行比例

过密竖线

大段说明文字







海报文件名：



text







命运K线.png

mingyun-kline.png







中英文适配：



text







Destiny K-Line

Current Phase

Opportunity Window

Risk Window









八、会员与权限



本轮不改后端会员逻辑。继续使用现有：



text







moduleId = kline

membershipApi.unlockModule('kline', recordId)







免费/会员展示建议：



text







未解锁：

展示当前阶段 + 模糊化未来走势 + 1 个机会窗口



解锁后：

展示完整 0-100 岁 K线 + 未来十年 + 月度节律 + 海报







如果实现成本高，V1 可以不做模糊化，只保留现有 paywall。



管理员逻辑不动，继续真实扣积分。





九、多语言文案



新增或替换 key 建议：



json







{

&#x20; "home": {

&#x20;   "destinyKlineTitle": "生成你的命运K线",

&#x20;   "destinyKlineSubtitle": "看见你的上升期、转折点和关键年份",

&#x20;   "destinyKlineCta": "生成我的命运K线"

&#x20; },

&#x20; "kline": {

&#x20;   "brandName": "命运K线",

&#x20;   "overview": "命运K线总览",

&#x20;   "currentStage": "当前阶段",

&#x20;   "opportunityWindow": "机会窗口",

&#x20;   "riskWindow": "风险窗口",

&#x20;   "nextThreeYears": "未来三年",

&#x20;   "aiInterpreter": "AI解盘师"

&#x20; }

}







英文：



json







{

&#x20; "brandName": "Destiny K-Line",

&#x20; "currentStage": "Current Phase",

&#x20; "opportunityWindow": "Opportunity Window",

&#x20; "riskWindow": "Risk Window",

&#x20; "aiInterpreter": "AI Interpreter"

}







泰文先保证基础可读，不追求文学化。





十、验收标准



首页：





打开 /life/，首屏必须看到“命运K线”。



主 CTA 点击后弹窗中问题已预填 K线意图。



原有事业、取名、断事入口仍可用。





结果页：





module=kline 页面顶部必须出现：



当前阶段



当前分数



机会窗口



风险窗口



AI解盘师









没有 K线数据时不能白屏，显示“命运K线生成中/暂无足够数据”。





图表：





竖线不能密到影响阅读。



当前年份/当前年龄明确可见。



Tooltip 文案能让普通用户看懂。





海报：





海报不出现错误四柱、错误时柱。



不展示完整出生信息。



视觉重点是“当前阶段 + 机会窗口 + 曲线”。





构建：



bash







cd C:\\Users\\10919\\Desktop\\AWKN-Lab\\人生决策宗师\\AWKN-LABlife\\app

npm run build







如后端未改，不强制后端 build；如果触碰共享类型，再跑：



bash







cd C:\\Users\\10919\\Desktop\\AWKN-Lab\\人生决策宗师\\AWKN-LABlife\\awkn-life-backend

npm run build









十一、推荐实施顺序



改首页文案和 K线主 CTA。

调整 K线卡片到第一位并增强视觉权重。

在 ResultPage 增加 K线派生函数。

增加“命运K线总览”。

增加“AI解盘师”本地解释面板。

简化 K线图竖线和 tooltip 文案。

重做海报文案和布局。

补齐中英泰 locale。

跑前端 build。

本地浏览器检查桌面和移动端。





十二、明确不做



本轮不做：





不重写八字计算器。



不新增 Prisma 表。



不新增 /kline 后端接口。



不接新 LLM 对话接口。



不改 awkn.cn 根主页。



不重构会员系统。



不做人生枢密院式通用真人顾问。





做完“命运K线 V1”后，下一步不要急着继续堆功能。应该先进入 验证 + 放大 + 资产化 三步。



第一步：验证它能不能出圈

先看 7 天数据，不靠感觉判断。



核心指标：



首页 → 点击生成命运K线比例

生成命运K线 → 完成出生信息比例

完成生成 → 查看海报比例

查看海报 → 保存/分享比例

普通用户 → 解锁K线比例

用户是否回来二次查看

如果分享率低，说明海报不够强。

如果点击率低，说明首页卖点不够刺。

如果解锁率低，说明免费内容和付费内容的边界没打准。



第二步：做命运K线 V2

V2 不再只是“图”，而是让它变成可反复看的个人资产。



优先做这几个：



关键年份解读

用户点击 2027、2029、2031，可以看到：



这一年为什么高/低

适合做什么

不适合做什么

事业/财富/感情分别怎么看

未来十年报告

从 0-100 岁大图里切出用户最关心的未来 10 年，做成更实用的付费内容。



命运K线海报 2.0

做三种传播图：



当前阶段卡

未来十年卡

关键年份卡

AI解盘师接后端

V1 是本地结构化解读，V2 再接 LLM，但必须基于 K线数据和证据包，不让它自由发挥。



第三步：做“我的命运档案”

这是长期价值。



历史页不要只是咨询记录，而是：



我的命运档案

├─ 命运K线

├─ 当前阶段

├─ 未来十年

├─ 年度运势

├─ 问过的事

├─ 取名记录

├─ 分享海报

└─ 回看验证

这样用户不是“测完就走”，而是觉得自己有一个长期档案。



第四步：接回看验证

这是你和普通玄学产品拉开差距的关键。



每次判断后给一个回看点：



30天后回看

这件事是否推进？

是否出现新机会？

是否有明显阻力？

判断准不准？

用户反馈进入后台，形成案例库。

长期看，这是你最值钱的数据资产。



推荐顺序



V1：命运K线首页主打 + 结果页总览 + 分享图

↓

V1.5：看数据，优化转化和海报

↓

V2：关键年份解读 + 未来十年报告

↓

V3：我的命运档案 + 回看验证

↓

V4：AI解盘师接知识库/案例库

一句话：



V1 做出第一眼记忆点，V2 做出付费深度，V3 做出长期留存，V4 做出数据护城河。

