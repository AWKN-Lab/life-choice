import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { BaZiCalculator, BaZiChart, PatternAnalysis, YunAnalysis, DecadeYun, WU_XING_MAP, JieQiDate, MonthlyFortune, TiaoHouResult, ShiShenInteraction, LiuQinResult } from '../knowledge-base/bazi-calculator';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { BARNUM_PHRASES } from '../shared/constants/barnum-phrases';

export interface ZipingInput {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  birthPlace?: string;
  question?: string;
  focusAreas?: string[];
  targetPeriod?: string;
  // 已计算的八字数据（传入则使用，不重新计算）
  preCalculatedBazi?: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    yearShishen: string;
    monthShishen: string;
    dayShishen: string;
    hourShishen: string;
    wuxing: { wood: number; fire: number; earth: number; metal: number; water: number };
    naYin: { year: string; month: string; day: string; hour: string };
    daYun: Array<{ full: string; startAge: number; endAge: number; gan: string; zhi: string }>;
  };
  lang?: string;
}

export interface ZipingOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  oneLineConclusion?: string;
  characterPortrait?: string;
  chart: BaZiChart;
  tenGods: any;
  wuxingCount: any;
  pattern: PatternAnalysis;
  yun: YunAnalysis;
  monthlyFortune: MonthlyFortune[];
  bestMonths: string[];
  worstMonths: string[];
  modules: { career: string; wealth: string; relationship: string; health: string };
  modulesRating?: { career: number; wealth: number; relationship: number; health: number };
  testScenarios: string[];
  timeRhythm: Array<{ period: string; phase: string; advice: string }>;
  stopDoingList: string[];
  closingLine?: string;
  paiPanVerification: string;
  mingjuGuJia: string;
  label: string;
  ranking: string;
  risks: string[];
  actions: string[];
  timeWindow: string;
  evidenceFold: string;
  decisionAudit?: {
    rightOrWrong: string;
    safetyMargin: string;
    mvpPlan: string;
  };
  classicAnalysis?: string;
  daYunTheme?: string;
  keyYearPhenomenon?: string;
  futureYearsRhythm?: Array<{ year: string; theme: string; advice: string }>;
  partnerPortrait?: {
    personality: string;
    relationshipPattern: string;
    keyIssues: string[];
  };
  mvpPlan?: {
    coreAction: string;
    steps: string[];
    timeline: string;
  };
  guardianGuidance?: {
    approach: string;
    rules: string[];
    doNotDo: string[];
  };
  llmFallback?: boolean;
}

@Injectable()
export class ZipingAgentService {
  private readonly logger = new Logger(ZipingAgentService.name);
  private readonly calculator: BaZiCalculator;
  private systemPrompt: string = '';
  private systemPromptEn: string = '';
  private readonly caseLevelRequiredFields = [
    'summaryLine',
    'summaryBody',
    'classicAnalysis',
    'daYunTheme',
    'keyYearPhenomenon',
    'futureYearsRhythm',
    'modules',
    'modulesRating',
    'decisionAudit',
    'partnerPortrait',
    'mvpPlan',
    'guardianGuidance',
    'risks',
    'actions',
    'stopDoingList',
    'evidenceFold',
  ];
  private readonly classicCitationIds = ['[ZP-NA-01]', '[ZP-CAI-01]', '[ZP-TH-01]', '[ZP-GJ-01]', '[ZP-CH-01]'];

  // LLM分析专用提示词（从prompt文件加载）
  private analysisPrompt: string = '';

  constructor(
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
  ) {
    this.calculator = new BaZiCalculator();
  }

  onModuleInit() {
    this.loadSystemPrompt();
    this.loadAnalysisPrompt();
    if (this.llmProviders?.isConfigured()) {
      this.logger.log('✅ ZipingAgent LLM 已配置，可进行真实语义分析');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用模板兜底逻辑');
    }
  }

  private loadSystemPrompt(): void {
    try {
      const promptPath = join(__dirname, 'prompts', 'ziping-system-prompt.md');
      this.systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch (e) {
      // P1-2 修复: 加错误日志，原 catch 静默降级
      this.logger.error(`[ZipingAgent] 加载中文 systemPrompt 失败，使用默认 prompt: ${(e as Error).message}`);
      this.systemPrompt = this.getDefaultSystemPrompt();
    }
    try {
      const promptPathEn = join(__dirname, 'prompts', 'ziping-system-prompt-en.md');
      this.systemPromptEn = readFileSync(promptPathEn, 'utf-8');
    } catch (e) {
      // P1-2 修复: 加错误日志
      this.logger.warn(`[ZipingAgent] 加载英文 systemPrompt 失败，使用默认英文 prompt: ${(e as Error).message}`);
      this.systemPromptEn = 'You are a master Bazi (Four Pillars of Destiny) analyst. Analyze the chart data provided and output a structured JSON with all text in English. Use standard English metaphysics terminology. Be specific, avoid vague statements.';
    }
  }

  private loadAnalysisPrompt(): void {
    this.analysisPrompt = `请根据以下后台算法已完成的八字排盘结果，进行自然语言分析。

【基本信息】
性别：{{gender}}
出生日期：{{birthDate}}
出生时间：{{birthTime}}
出生地点：{{birthPlace}}
真太阳时校正：{{trueSolarTimeInfo}}

【四柱详排】
年柱：{{yearPillar}}（纳音{{nayin}}，天干十神={{yearShishen}}，藏干={{yearHiddenStems}}）
月柱：{{monthPillar}}（纳音{{monthNayin}}，天干十神={{monthShishen}}，藏干={{monthHiddenStems}}）
日柱：{{dayPillar}}（纳音{{dayNayin}}，日主{{dayGan}}，藏干={{dayHiddenStems}}）
时柱：{{hourPillar}}（纳音{{hourNayin}}，天干十神={{hourShishen}}，藏干={{hourHiddenStems}}）

【命局骨架】
日主{{dayGan}}{{dayGanWuXing}}，生于{{monthZhi}}{{monthZhiWuXing}}月，{{mingjuGJ}}

【五行统计】木{{wood}} 火{{fire}} 土{{earth}} 金{{metal}} 水{{water}}

【格局判定】
格局：{{patternName}}（{{patternSubType}}）
强弱：{{strength}}（评分{{strengthScore}}分）
喜用神：{{favorableElements}}
忌神：{{unfavorableElements}}
调候用神：{{tiaoHou}}
病药：{{bingYao}}

【十神交互】
{{shiShenInteraction}}

【六亲宫位】
{{liuQin}}

【大运序列】
起运年龄：{{startAge}}岁，方向：{{yunDirection}}
{{daYunList}}

【当前大运】{{currentDaYun}}（{{currentDaYunAge}}岁-{{currentDaYunEndAge}}岁）
当前大运主题：{{currentDaYunTheme}}

【流年流月】
流年：{{liuNian}}
流月：{{liuYue}}

【冲合刑害关系】
{{chongHeXingHai}}

【节气日期】
{{jieQiDates}}

【月度运势表】
{{monthlyFortune}}

【神煞】
天乙贵人：{{tianYi}}
文昌贵人：{{wenChang}}
羊刃：{{yangRen}}
桃花：{{taoHua}}
空亡：{{kongWang}}

【用户问题】{{question}}

---

【知识库参考——分析时必须引用以下内容】

### 十神关系速查（以日干为基准）
| 关系 | 同性 | 异性 | 含义 |
|------|------|------|------|
| 同我 | 比肩 | 劫财 | 比肩=自主独立，劫财=争财夺利 |
| 我生 | 食神 | 伤官 | 食神=才华福禄，伤官=叛逆创新 |
| 生我 | 偏印 | 正印 | 偏印=偏门学问，正印=学历庇护 |
| 我克 | 偏财 | 正财 | 偏财=横财投资，正财=稳定收入 |
| 克我 | 七杀 | 正官 | 七杀=压力风险，正官=规矩地位 |

### 经典/知识库引用白名单（classicAnalysis只能引用这些sourceId，不得自造古文原句）
- [ZP-NA-01] 纳音批命：上克下为财，富贵命；下生上为印，大富大贵；合化刑冲会影响财路承载。
- [ZP-CAI-01] 财运实战：身强财旺遇食伤财才可发大财；身弱财旺遇印枭比劫才有承载。
- [ZP-TH-01] 调候法则：日干配月令取调候用神，先看寒暖燥湿，再看格局成败。
- [ZP-GJ-01] 格局判断：正官纯正为贵，七杀有制为权，食神为福，伤官宜配印或生财。
- [ZP-CH-01] 冲合刑害：冲主动荡与迁移，合主牵连与绑定，需落到宫位和十神场景解释。

### 纳音批命法则（只能作为[ZP-NA-01]的白名单释义使用）
- 上生下为盗泄，贫贱人：年柱生月柱、月柱生日柱、日柱生时柱，从上而下依次相生，命主大多为贫贱之人
- 上克下为财，富贵命：年克月、月克日、日克时，自上而下顺次相克，多为富贵之命
- 下克上为官杀，破败命：由下而上依次相克，多主家门破财、一生起伏波折大
- 下生上为印，大富大贵：时生日、日生月、月生年，四柱纳音顺次相生，大多为大富大贵之命
- 年柱纳音被日柱纳音克+年支被它支刑，多为短寿夭折之命

### 财运实战断法（财运分析必须参考）
- 身强财旺，遇大运流年见食伤财才→发大财
- 身强财弱，遇大运流年见食伤财才→发中财
- 身弱财旺，遇大运流年见印枭比劫→发大财（求财不易）
- 身弱财弱，遇大运流年见印枭比劫→发中财
- 四柱无财又身弱→一生不好发财，俗称和尚命
- 四柱无财身强，遇大运流年见财→有钱进账，但财不长久
- 不管身强身弱，遇库则发
- 正财有持续性，偏财来一次就没了
- 合化刑冲：财被合化掉则财路受阻

### 十二长生表（日干查地支，判断旺衰必须参考）
| 日干 | 长生 | 沐浴 | 冠带 | 临官 | 帝旺 | 衰 | 病 | 死 | 墓 | 绝 | 胎 | 养 |
|------|------|------|------|------|------|----|----|----|----|----|----|----|
| 甲 | 亥 | 子 | 丑 | 寅 | 卯 | 辰 | 巳 | 午 | 未 | 申 | 酉 | 戌 |
| 丙戊 | 寅 | 卯 | 辰 | 巳 | 午 | 未 | 申 | 酉 | 戌 | 亥 | 子 | 丑 |
| 庚 | 巳 | 午 | 未 | 申 | 酉 | 戌 | 亥 | 子 | 丑 | 寅 | 卯 | 辰 |
| 壬 | 申 | 酉 | 戌 | 亥 | 子 | 丑 | 寅 | 卯 | 辰 | 巳 | 午 | 未 |

### 名人八字格局参考（格局判断可对照）
- 周恩来 戊戌甲寅丁卯丙辰——正印格，身弱用印，一生以印（学识+组织）立身
- 彭德怀 戊戌壬戌庚申戊寅——七杀格，身强杀旺，武将之命
- 梅兰芳 甲午甲戌丁酉癸卯——食神生财格，艺术成名
- 康有为 戊午乙卯壬子庚子——劫财格，身强劫旺，变法维新
- 乔布斯 乙未戊寅丙辰戊戌——偏财格，丑未冲开库，1985被开除后1997回归苹果V型反转
- 马斯克 辛亥甲午壬寅癸卯——食神制杀格，2008濒临破产，随后十年事业指数级拉升
- 科比 戊午庚申丁巳——七杀攻身，2020庚子年子午冲，天克地冲，意外陨落
- 张国荣 丙申丁酉戊寅乙卯——伤官见官，2003癸未年情绪K线跌破安全线

### 天干地支意象（人物画像可参考）
天干：甲=大树/领导 乙=花草/柔韧 丙=太阳/光明 丁=灯火/文雅 戊=山岳/厚重 己=田园/包容 庚=刀剑/刚烈 辛=珠宝/精致 壬=大海/奔放 癸=雨露=智慧
地支：子=水/暗 丑=土/藏 寅=木/生 卯=木/旺 辰=土/库 巳=火/明 午=火/烈 未=土/燥 申=金/动 酉=金/收 戌=土/燥 亥=水/流

### 八字格局判断表（格局分析必须参考）
| 格局 | 类型 | 成格条件 | 性格特征 | 喜 | 忌 | 判断要点 |
|------|------|----------|----------|-----|-----|----------|
| 正官格 | 正格 | 月令正官透干或本气正官 | 端正、循规蹈矩、有责任感 | 印绶、食神 | 伤官、七杀 | 正官纯正为贵 |
| 七杀格 | 正格 | 月令七杀透干或本气七杀 | 刚毅、有魄力、有威权 | 食神制杀、印绶化杀 | 财星生杀 | 有制为贵，无制为祸 |
| 正财格 | 正格 | 月令正财透干或本气正财 | 勤俭、务实、善于理财 | 官星、食神 | 劫财、比肩 | 正财有根为富 |
| 偏财格 | 正格 | 月令偏财透干或本气偏财 | 慷慨、豪爽、善于交际 | 身旺、官星 | 比劫重重 | 偏财身旺为富 |
| 食神格 | 正格 | 月令食神透干或本气食神 | 温和、有福气、多才艺 | 财星、印绶 | 枭神、偏印 | 食神为福星 |
| 伤官格 | 正格 | 月令伤官透干或本气伤官 | 聪明、有才华、但傲慢 | 财星、印绶 | 正官 | 伤官佩印为贵 |
| 正印格 | 正格 | 月令正印透干或本气正印 | 仁慈、好学、有涵养 | 官星生印 | 财星破印 | 正印为学术贵星 |
| 偏印格 | 正格 | 月令偏印透干或本气偏印 | 精明、多谋、但多疑 | 身旺 | 夺食神 | 偏印为枭神需制 |
| 从官格 | 变格 | 日主极弱，官杀极旺，无根无印 | 善于依附权贵 | 官杀、财星 | 比劫、印绶 | 从官格主贵 |
| 从财格 | 变格 | 日主极弱，财星极旺，无根无助 | 善于经商理财 | 财星、食伤 | 比劫 | 从财格主富 |
| 从杀格 | 变格 | 日主极弱，七杀极旺，无根无印 | 刚毅有魄力 | 财星生杀 | 印绶 | 从杀格主威权 |
| 建禄格 | 变格 | 月令为日干之禄位 | 自立自强 | 财官 | 冲破 | 建禄格主自立 |
| 月刃格 | 变格 | 月令为日干之羊刃 | 刚烈果断 | 官杀制刃 | 冲破 | 月刃格主刚强 |

### 调候用神表——穷通宝鉴（调候分析必须参考）
| 日干 | 春 | 夏 | 秋 | 冬 |
|------|-----|-----|-----|-----|
| 甲 | 丙火照暖+癸水润泽 | 癸水润泽 | 丁火制金暖木 | 丁火暖局+庚金劈甲引丁 |
| 乙 | 丙火照暖方荣 | 癸水滋润 | 丙癸并用 | 丙火解冻 |
| 丙 | 壬水为用 | 壬水既济+庚金发水之源 | 壬水为用 | 甲木为用 |
| 丁 | 甲木为用 | 壬水为用 | 甲木引丁 | 甲木引丁+庚金劈甲 |
| 戊 | 丙火照暖+甲木疏土 | 壬水+丙火 | 甲木疏土+丙火照暖 | 甲木疏土+丙火照暖 |
| 己 | 丙火照暖+甲木疏土 | 癸水润泽 | 丙火照暖 | 丙火照暖+甲木疏土 |
| 庚 | 丙火炼金+甲木引丁 | 壬水泄金+丁火炼金 | 甲木劈引+丁火炼金 | 丙火暖局+丁火炼金 |
| 辛 | 壬水洗淘+甲木引丁 | 壬水洗淘+己土助辛 | 壬水洗淘 | 丙火暖局+壬水洗淘 |
| 壬 | 甲木泄秀+庚金发水源 | 癸水助壬+辛金发水 | 甲木泄秀 | 戊土制水+丙火暖局 |
| 癸 | 辛金发水+甲木泄秀 | 庚金发水+辛金助癸 | 辛金发水+甲木泄秀 | 丙火暖局+辛金发水 |

### 冲合刑害效应表（冲合刑害分析必须参考）
| 类型 | 组合 | 效应 | 宫位影响 |
|------|------|------|----------|
| 子午冲 | 水火相战 | 变动、分离、心神不宁 | 年柱=祖业变动，日柱=婚姻不稳 |
| 丑未冲 | 土气相冲 | 破败、争执 | 月柱=兄弟不和，日柱=夫妻争执 |
| 寅申冲 | 金木相战 | 道路、出行、伤灾 | 年柱=远行，日柱=奔波 |
| 卯酉冲 | 金木相战 | 门户、婚姻、色情 | 日柱=婚姻破裂 |
| 辰戌冲 | 土气相冲 | 田宅、争斗 | 年柱=祖业变迁 |
| 巳亥冲 | 水火相战 | 变动、出行、口舌 | 日柱=夫妻分离 |
| 子丑合 | 合土 | 和合、亲密 | 日柱=夫妻恩爱 |
| 寅亥合 | 合木 | 和合、亲密 | 日柱=夫妻恩爱 |
| 卯戌合 | 合火 | 和合、亲密 | 日柱=夫妻恩爱 |
| 辰酉合 | 合金 | 和合、亲密 | 日柱=夫妻恩爱 |
| 巳申合 | 合水 | 和合、亲密 | 日柱=夫妻恩爱 |
| 午未合 | 合土 | 和合、亲密 | 日柱=夫妻恩爱 |

---

【分析规则】

### 一、你不需要重新计算排盘
所有排盘数据已由后台算法完成，你只需要：
1. 基于已给出的四柱、十神、藏干、格局、大运、流年流月、冲合刑害关系进行分析
2. 将术数结论翻译成用户能理解的自然语言
3. 给出具体、可执行的建议

### 二、分析框架（必须按此顺序输出）
1. **排盘校验**：用叙述方式说明真太阳时校正过程（经度、时间差、校正后时刻、时辰判定），如果校正后时辰变了，必须说明这对盘面的影响
2. **四柱表格**：以表格形式呈现四柱+十神简义
3. **命局核心定位**：不是简单"身强身弱"，而是说清这个命局的核心矛盾（如"不是有没有财，而是能不能承载财与责任"），80-120字
4. **人物画像**：精确描述这个人适合做什么类型的事（如"更适合借平台、借规则、借品牌做事，不适合只靠创意打动人"），必须结合当前大运阶段
5. **格局+强弱+喜忌**：含推导逻辑，只能引用【经典/知识库引用白名单】中的sourceId
6. **古籍深度解盘**：独立章节，必须引用2-3个白名单sourceId，每句必须含：sourceId→白话翻译→当前命局映射；不得编造《子平真诠》《渊海子平》《穷通宝鉴》等原文，100-150字
7. **大运主题叙述**：当前这十年大运的主题是什么（如"这十年主题就是：钱、资产、家庭责任、现金流"），40-60字
8. **流年关键象**：当前流年最重要的一个冲合关系+具体映射（如"丙午冲壬子之财根→今年财路有变动，但变动中藏机会"），40-60字
9. **月度运势表**：基于已给出的月度运势数据，按节气分段，给出每月判断。每月判断必须包含：①冲合关系（如"午火冲子水财根"）②十神含义（如"癸水正财透出"）③具体建议（如"利回款、谈客户"）
10. **最好/最差月份**：高亮3个最好月份和3个最差月份
11. **分模块分析+评分**：事业、财运、人际/合作、健康（根据用户问题聚焦，至少覆盖2个模块）。每个模块必须包含：①评分（1-10）②1个具体场景（如"有人会拿利益诱导你突破规则"）③1个具体动作（如"先收款，后交付"）④1个禁忌（如"不要先垫钱"）
12. **分阶段时间节奏**：按节气分段，每阶段必须嵌入节气日期（如"5月5日立夏后—5月21日小满前"），给出1个具体动作+1个禁忌
13. **未来几年节奏**：给出当前流年+未来3-4年的主题和关键建议（如"2026守→2027攻→2028稳→2029变"）
14. **决策审计**：必须包含三个维度——①是非观（这件事该不该做的根本判断）②安全边际（最坏情况下怎么保底）③MVP方案（3-6个月内最小可行动作）
15. **Stop-doing List**：明确列出4-5条不能做的事，每条必须写明：具体动作+为什么不能做+做了会怎样
16. **对象/伴侣画像**（仅当用户问题涉及感情/婚姻时）：性格特征+相处模式+2-3个关键问题
17. **家长/监护人指导**（仅当命主为未成年人时）：沟通方式+3条规则+3条禁忌

### 三、输出要求
- 结论先行，不要铺垫，一句话定性要有记忆点（如"清醒型精算派"）
- 用"你"称呼，不用"您"，语气像老朋友直接说
- 术数术语必须紧跟白话解释（如"正印格——靠学历、靠上级庇护"）
- 建议必须具体到动作，不要"注意安全"这种空话
- 风险必须具体到场景，不要"小心谨慎"这种废话

**【严格禁止巴纳姆效应——以下表述绝对不能出现】**
❌ "有时候果断，有时候犹豫" —— 适用于所有人
❌ "事业有起有落" —— 废话
❌ "注意身体健康" —— 没有信息量
❌ "适合多种行业" —— 没有价值
❌ "可能会遇到贵人" —— 过于模糊
❌ "性格复杂多变" —— 没有具体内容

**【必须给出具体结论，例如】**
✅ "日主甲木生于寅月得令，比劫旺盛，性格上会过于自信甚至固执"
✅ "正财星被克，35岁前换工作概率高于常人"
✅ "肝胆系统为用神所伤，建议定期检查肝功能指标"
✅ "最适合木火相关行业：教育、文化、互联网、新能源"
- 时间节奏必须精确到节气日期（如"5月5日立夏后—5月21日小满前"）
- 月度运势必须用★标级（★到★★★★★）
- 必须给出一个标签（label），如"清醒型精算派""先守后攻型"
- 必须给出核心要素排序（ranking），如"利益感 > 控制感 > 面子 > 酒"
- 必须给出3个验证场景（testScenarios），如"买单时""分利时""担责时"
- 一句定论必须独立成段，格式为"你是X型人，当前阶段适合Y"
- 人物画像必须精确到"适合做什么类型的事"，不能只说"身强身弱"，可参考【知识库参考】中的天干地支意象和名人八字格局
- 命局核心定位必须说清核心矛盾，不能只列格局名称
- 古籍深度解盘必须引用2-3个白名单sourceId，每句必须含sourceId→白话→命局映射；禁止编造任何未在白名单出现的经典原文
- 大运主题必须用一句话概括这十年的核心主题
- 流年关键象必须指出最重要的冲合关系+具体映射
- 每个模块必须给出评分（1-10），评分要有依据，财运分析必须参考【知识库参考】中的财运实战断法
- 决策审计必须包含是非观+安全边际+MVP方案三个维度
- 别做清单每条必须写明：具体动作+为什么不能做+做了会怎样
- 如果用户问题涉及感情/婚姻，必须给出对象/伴侣画像
- 如果命主为未成年人，必须给出家长/监护人指导
- 每个模块的分析要像在跟用户当面说话，不要写成报告

---

请严格按以下JSON结构输出分析结果（不许输出任何JSON以外的内容）：

{
  "summaryLine": "一句准话，25字以内，要有记忆点，如'清醒型精算派，利字当头'",
  "summaryBody": "总纲，80-120字，先说核心趋势，再说适合做的事，最后提醒该避的坑",
  "oneLineConclusion": "一句定论，30字以内，格式如'你是借势型选手，当前阶段适合借平台做事'或'你是守成型，当前不宜冒进'",
  "label": "给这个人/这个阶段一个标签，3-8字，如'清醒型精算派''先守后攻型''稳中求财型'",
  "ranking": "核心要素排序，用>连接，如'利益感 > 控制感 > 面子 > 酒'或'守 > 稳 > 进 > 冒'",
  "paiPanVerification": "排盘校验叙述，含真太阳时校正过程、经度、时辰判定，50-80字",
  "mingjuGuJia": "命局核心定位，80-120字，必须说清核心矛盾（如'不是有没有财，而是能不能承载财与责任'），含日主、月令、格局、核心矛盾",
  "characterPortrait": "人物画像，40-60字，精确描述这个人适合做什么类型的事，结合当前大运阶段，如'更适合借平台、借规则、借品牌做事，不适合只靠创意打动人。当前大运已走到适合借势做局的阶段'",
  "classicAnalysis": "古籍深度解盘，100-150字，必须引用2-3个白名单sourceId，如[ZP-TH-01]→白话翻译→当前命局映射；禁止编造经典原文",
  "daYunTheme": "当前大运十年主题，40-60字，如'这十年主题就是：钱、资产、家庭责任、现金流'",
  "keyYearPhenomenon": "流年关键象，40-60字，最重要的冲合关系+具体映射，如'丙午冲壬子之财根→今年财路有变动，但变动中藏机会'",
  "gejuAnalysis": {
    "geju": "格局名称+判定依据",
    "qiangruo": "强弱判定+依据",
    "xiyong": "喜用神+推导逻辑",
    "tiaoHou": "调候用神+说明",
    "bingYao": "病药+说明"
  },
  "monthlyFortune": [
    {"period": "日期范围（如2月4日—3月5日）", "liuYue": "流月干支", "rating": 3, "judgment": "当月判断，必须含冲合关系+十神含义+具体建议，30字以内"}
  ],
  "bestMonths": ["月份1（如4月壬辰）", "月份2", "月份3"],
  "worstMonths": ["月份1（如6月甲午）", "月份2", "月份3"],
  "modules": {
    "career": "事业分析，60-80字，必须包含1个具体场景+1个动作+1个禁忌",
    "wealth": "财运分析，60-80字，必须包含1个具体场景+1个动作+1个禁忌",
    "relationship": "人际/合作分析，60-80字，必须包含1个具体场景+1个动作+1个禁忌",
    "health": "健康分析，40-60字，必须包含具体注意点+1个禁忌"
  },
  "modulesRating": {
    "career": 7,
    "wealth": 6,
    "relationship": 7,
    "health": 6
  },
  "testScenarios": ["验证场景1：如'买单时看谁最真实'", "验证场景2：如'分利时看让不让'", "验证场景3：如'担责时看缩不缩'"],
  "timeRhythm": [
    {"period": "时间段（必须嵌入节气日期，如5月5日立夏后—5月21日小满前）", "phase": "阶段名（如收尾期/财动期/风险放大期）", "advice": "1个具体动作+1个禁忌，30字以内"}
  ],
  "futureYearsRhythm": [
    {"year": "2026", "theme": "守：稳住基本盘，不冒进", "advice": "具体建议"},
    {"year": "2027", "theme": "攻：主动出击，抓住机会", "advice": "具体建议"},
    {"year": "2028", "theme": "稳：巩固成果，防回撤", "advice": "具体建议"},
    {"year": "2029", "theme": "变：转型或调整方向", "advice": "具体建议"}
  ],
  "decisionAudit": {
    "rightOrWrong": "是非观：这件事该不该做的根本判断，如'今年适合守成，不适合冒进，因为财根被冲'",
    "safetyMargin": "安全边际：最坏情况下怎么保底，如'即使项目失败，也要确保现金流不断'",
    "mvpPlan": "3-6个月MVP方案：最小可行动作，如'先做1个试点，验证模型再放大'"
  },
  "partnerPortrait": {
    "personality": "对象性格特征，如'务实型，看重结果和安全感'",
    "relationshipPattern": "相处模式，如'你需要给对方确定性，不要给想象力'",
    "keyIssues": ["关键问题1：如'对方在意你能不能给结果'", "关键问题2：如'边界感容易模糊'"]
  },
  "mvpPlan": {
    "coreAction": "核心动作，如'先做1城1店90天试点'",
    "steps": ["步骤1", "步骤2", "步骤3"],
    "timeline": "时间线，如'3个月内完成试点验证'"
  },
  "guardianGuidance": {
    "approach": "沟通方式，如'多鼓励少施压，用目标引导而非恐惧驱动'",
    "rules": ["规则1：如'每周固定1次学业复盘'", "规则2：如'考试前1周不安排额外活动'", "规则3：如'成绩波动时先找原因再定对策'"],
    "doNotDo": ["禁忌1：如'不要在公开场合批评'", "禁忌2：如'不要拿别人家孩子比较'", "禁忌3：如'不要只看分数不看状态'"]
  },
  "stopDoingList": ["禁忌1：具体动作+为什么不能做+做了会怎样", "禁忌2：具体动作+为什么不能做+做了会怎样", "禁忌3：具体动作+为什么不能做+做了会怎样", "禁忌4：具体动作+为什么不能做+做了会怎样"],
  "closingLine": "落一句最实在的话，30字以内，像朋友直接跟你说，如'守正财，不逐偏财；做熟人熟事，不碰陌生大局；现金流优先，面子放后。'或'这项目能做，也有钱路；但长期要做成事业，靠的是自己控盘，不是一直靠别人合着做。'",
  "risks": ["风险1：具体场景+可能后果", "风险2：具体场景+可能后果", "风险3：具体场景+可能后果"],
  "actions": ["建议1：现在该做的动作", "建议2：现在该做的动作", "建议3：现在不要做的动作"],
  "timeWindow": "时间窗口总结，精确到月份",
  "evidenceFold": "判断依据简写，15字以内"
}`;
  }

  private getDefaultSystemPrompt(): string {
    return `你是"八字命理枢机（东方命理宗师）"。你的职责是接收排盘结果，建立/读取命局主档案，判断人生底盘、阶段节律、岁运重点。输出遵守：结论先行、清晰优先、事实→含义→建议。`;
  }

  async analyze(input: ZipingInput): Promise<ZipingOutput> {
    try {
      const startTime = Date.now();

      // Step 1: 排盘计算（算法层，不调LLM）
      // 如果传入已计算的八字数据，直接使用；否则重新计算
      let chart: any, tenGods: any, wuxingCount: any, pattern: any, yun: any;

      if (input.preCalculatedBazi && input.preCalculatedBazi.yearPillar && input.preCalculatedBazi.dayPillar) {
        // 使用已计算的八字数据（来自正确的Calculator）
        // P2-1 修复: 防御性检查字段完整性，避免六壬/六爻等非八字路由传入空八字导致 TypeError
        const bazi = input.preCalculatedBazi;
        chart = {
          year: { gan: bazi.yearPillar[0], zhi: bazi.yearPillar[1], pillar: bazi.yearPillar, hiddenStems: [] },
          month: { gan: bazi.monthPillar[0], zhi: bazi.monthPillar[1], pillar: bazi.monthPillar, hiddenStems: [] },
          day: { gan: bazi.dayPillar[0], zhi: bazi.dayPillar[1], pillar: bazi.dayPillar, hiddenStems: [] },
          hour: { gan: bazi.hourPillar[0], zhi: bazi.hourPillar[1], pillar: bazi.hourPillar, hiddenStems: [] },
        };
        tenGods = {
          year: bazi.yearShishen,
          month: bazi.monthShishen,
          day: bazi.dayShishen,
          hour: bazi.hourShishen,
        };
        wuxingCount = bazi.wuxing;
        // 将 daYun 数组转换为 decadeYun 格式（YunAnalysis 接口需要 decadeYun）
        yun = {
          decadeYun: (bazi.daYun || []).map((d: any, idx: number) => ({
            startAge: d.startAge || d.age || idx * 10 + 3,
            endAge: d.endAge || d.age + 10 || (idx + 1) * 10 + 3,
            ganZhi: d.full || d.gan + d.zhi,
            wuxing: [],
            tendency: '平稳' as const,
          })),
          currentYunIndex: 0,
        };
        // 根据八字判断强弱
        const dayGan = bazi.dayPillar[0];
        const wuxing = bazi.wuxing;
        const totalWuxing = (wuxing.wood || 0) + (wuxing.fire || 0) + (wuxing.earth || 0) + (wuxing.metal || 0) + (wuxing.water || 0);
        const dayWuxing = WU_XING_MAP[dayGan] || '土';
        const dayWuxingCount = wuxing[dayWuxing.toLowerCase() as keyof typeof wuxing] || 0;
        const strength = totalWuxing >= 3 && dayWuxingCount >= 2 ? 'strong' : totalWuxing <= 1 ? 'weak' : 'neutral';
        pattern = {
          patternName: '命局',
          subType: '综合',
          strength: strength as 'strong' | 'weak' | 'neutral',
          strengthScore: totalWuxing * 10,
          favorableElements: [],
          unfavorableElements: [],
          usableGods: [],
          忌神Gods: [],
        };
      } else {
        // 重新计算（使用旧版计算器，可能有bug）
        const calcResult = this.calculator.calculateBaZi(
          input.birthDate,
          input.birthTime,
          input.gender,
        );
        chart = calcResult.chart;
        tenGods = calcResult.tenGods;
        wuxingCount = calcResult.wuxingCount;
        pattern = calcResult.pattern;
        yun = calcResult.yun;
      }

      // Step 2: 尝试LLM分析，失败则用模板
      let result: Omit<ZipingOutput, 'chart' | 'tenGods' | 'wuxingCount' | 'pattern' | 'yun'>;

      if (this.llmProviders?.isConfigured()) {
        try {
          result = await this.analyzeWithLLM(input, chart, tenGods, wuxingCount, pattern, yun);
          this.logger.log(`[ZipingAgent] LLM分析成功，耗时${Date.now() - startTime}ms`);
        } catch (llmErr) {
          this.logger.warn(`[ZipingAgent] LLM失败，降级到模板: ${(llmErr as Error).message}`);
          result = this.generateAnalysis(input, chart, tenGods, wuxingCount, pattern, yun);
        }
      } else {
        result = this.generateAnalysis(input, chart, tenGods, wuxingCount, pattern, yun);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`八字分析完成，耗时 ${duration}ms`);

      return {
        ...result,
        chart,
        tenGods,
        wuxingCount,
        pattern,
        yun,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('八字分析失败', err.stack);
      return this.getFallbackResult(input);
    }
  }

  private async analyzeWithLLM(
    input: ZipingInput,
    chart: BaZiChart,
    tenGods: any,
    wuxingCount: any,
    pattern: PatternAnalysis,
    yun: YunAnalysis,
  ): Promise<Omit<ZipingOutput, 'chart' | 'tenGods' | 'wuxingCount' | 'pattern' | 'yun'>> {
    const birthDateObj = new Date(input.birthDate);
    const genderStr = input.gender === 'male' ? '男（乾造）' : '女（坤造）';

    const nayin = this.getNaYin(chart.year.pillar) || '';
    const monthNayin = this.getNaYin(chart.month.pillar) || '';
    const dayNayin = this.getNaYin(chart.day.pillar) || '';
    const hourNayin = this.getNaYin(chart.hour.pillar) || '';

    const dayGan = chart.day.gan;
    const dayGanWuXing = WU_XING_MAP[dayGan] || '土';
    const monthZhi = chart.month.zhi;
    const monthZhiWuXing = { '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水' }[monthZhi] || '土';

    const yearHiddenStems = (chart.year.hiddenStems || []).join('');
    const monthHiddenStems = (chart.month.hiddenStems || []).join('');
    const dayHiddenStems = (chart.day.hiddenStems || []).join('');
    const hourHiddenStems = (chart.hour.hiddenStems || []).join('');

    const mingjuGJ = this.buildMingjuGuJia(chart, pattern, wuxingCount, tenGods);

    const currentYunIdx = yun.currentYunIndex || 0;
    const currentDecade = yun.decadeYun[currentYunIdx] || yun.decadeYun[0];
    const startAge = yun.decadeYun[0]?.startAge || 0;
    const yunDirection = this.isYunShun(input.gender === 'male', chart.year.pillar) ? '顺行' : '逆行';

    const daYunList = yun.decadeYun.map((d, i) =>
      `${d.ganZhi}（${d.startAge}-${d.endAge}岁，${d.tendency}）${i === currentYunIdx ? ' ←当前' : ''}`
    ).join('\n');

    const currentDaYun = currentDecade?.ganZhi || '';
    const currentDaYunAge = currentDecade?.startAge || 0;
    const currentDaYunEndAge = currentDecade?.endAge || 0;
    const currentDaYunTheme = this.getDaYunTheme(currentDecade, pattern);

    const now = new Date();
    const liuNianGanZhi = this.getLiuNian(now.getFullYear());
    const liuYueGanZhi = this.getLiuYue(now.getFullYear(), now.getMonth() + 1);

    const chongHeXingHai = this.analyzeChongHeXingHai(chart, currentDecade, liuNianGanZhi, liuYueGanZhi);

    const jieQiDates = this.calculator.getJieQiDates(now.getFullYear());
    const jieQiDatesStr = jieQiDates.map(jq => `${jq.name}：${jq.date}`).join('\n');

    const monthlyFortuneData = this.calculator.calculateMonthlyFortune(chart, yun, now.getFullYear());
    const monthlyFortuneStr = monthlyFortuneData.map(mf =>
      `${mf.period} | ${mf.liuYue} | ${'★'.repeat(mf.rating)}${'☆'.repeat(5 - mf.rating)} | ${mf.judgment}`
    ).join('\n');

    const tiaoHou = this.calculator.getTiaoHouYongShen(dayGan, monthZhi);
    const tiaoHouStr = `${tiaoHou.yongShen.join('、')}（${tiaoHou.description}）`;

    const shiShenInteraction = this.calculator.analyzeShiShenInteraction(tenGods, chart);
    const shiShenInteractionStr = shiShenInteraction.map(si =>
      `${si.pattern}：${si.description}→${si.implication}`
    ).join('\n');

    const liuQin = this.calculator.analyzeLiuQin(chart);
    const liuQinStr = `年柱：${liuQin.yearPillar}\n月柱：${liuQin.monthPillar}\n日支：${liuQin.dayPillar}\n时柱：${liuQin.hourPillar}`;

    const bingYaoStr = tiaoHou.description;

    const birthDateTime = input.birthDate && input.birthTime ? new Date(`${input.birthDate}T${input.birthTime}:00`) : null;
    const trueSolarTimeInfo = birthDateTime && input.birthPlace
      ? BaZiCalculator.describeTrueSolarTimeCorrection(birthDateTime, input.birthPlace)
      : input.birthTime ? '已按出生时间排盘，如需精确校正请提供出生地' : '未提供出生时间，时辰暂按输入时间排盘';

    const yearShishenFull = tenGods.year ? `${tenGods.year}坐${yearHiddenStems || '无藏干'}` : '无';
    const monthShishenFull = tenGods.month ? `${tenGods.month}当令` : '无';
    const dayShishenFull = '日主';
    const hourShishenFull = tenGods.hour ? `${tenGods.hour}透${hourHiddenStems ? '，有根' : ''}` : '无';

    const tianYi = tenGods.tianYi?.join('、') || '无';
    const wenChang = tenGods.wenChang?.join('、') || '无';
    const yangRen = tenGods.yangRen?.join('、') || '无';
    const taoHua = tenGods.taoHua?.join('、') || '无';
    const kongWang = tenGods.kongWang?.join('、') || '无';

    const userPrompt = this.analysisPrompt
      .replace('{{gender}}', genderStr)
      .replace('{{birthDate}}', input.birthDate)
      .replace('{{birthTime}}', input.birthTime)
      .replace('{{trueSolarTimeInfo}}', trueSolarTimeInfo)
      .replace('{{yearPillar}}', chart.year.pillar)
      .replace('{{nayin}}', nayin)
      .replace('{{yearShishen}}', yearShishenFull)
      .replace('{{yearHiddenStems}}', yearHiddenStems || '无')
      .replace('{{monthPillar}}', chart.month.pillar)
      .replace('{{monthNayin}}', monthNayin)
      .replace('{{monthShishen}}', monthShishenFull)
      .replace('{{monthHiddenStems}}', monthHiddenStems || '无')
      .replace('{{dayPillar}}', chart.day.pillar)
      .replace('{{dayNayin}}', dayNayin)
      .replace('{{dayGan}}', dayGan)
      .replace('{{dayHiddenStems}}', dayHiddenStems || '无')
      .replace('{{hourPillar}}', chart.hour.pillar)
      .replace('{{hourNayin}}', hourNayin)
      .replace('{{hourShishen}}', hourShishenFull)
      .replace('{{hourHiddenStems}}', hourHiddenStems || '无')
      .replace('{{dayGan}}', dayGan)
      .replace('{{dayGanWuXing}}', dayGanWuXing)
      .replace('{{monthZhi}}', monthZhi)
      .replace('{{monthZhiWuXing}}', monthZhiWuXing)
      .replace('{{mingjuGJ}}', mingjuGJ)
      .replace('{{wood}}', String(wuxingCount.wood || 0))
      .replace('{{fire}}', String(wuxingCount.fire || 0))
      .replace('{{earth}}', String(wuxingCount.earth || 0))
      .replace('{{metal}}', String(wuxingCount.metal || 0))
      .replace('{{water}}', String(wuxingCount.water || 0))
      .replace('{{patternName}}', pattern.patternName || '待定')
      .replace('{{patternSubType}}', pattern.subType || '')
      .replace('{{strength}}', pattern.strength === 'strong' ? '身强' : pattern.strength === 'weak' ? '身弱' : '中和')
      .replace('{{strengthScore}}', String(pattern.strengthScore || 0))
      .replace('{{favorableElements}}', (pattern.favorableElements || []).join('、'))
      .replace('{{unfavorableElements}}', (pattern.unfavorableElements || []).join('、'))
      .replace('{{startAge}}', String(startAge))
      .replace('{{yunDirection}}', yunDirection)
      .replace('{{daYunList}}', daYunList)
      .replace('{{currentDaYun}}', currentDaYun)
      .replace('{{currentDaYunAge}}', String(currentDaYunAge))
      .replace('{{currentDaYunEndAge}}', String(currentDaYunEndAge))
      .replace('{{currentDaYunTheme}}', currentDaYunTheme)
      .replace('{{liuNian}}', liuNianGanZhi)
      .replace('{{liuYue}}', liuYueGanZhi)
      .replace('{{chongHeXingHai}}', chongHeXingHai)
      .replace('{{tianYi}}', tianYi)
      .replace('{{wenChang}}', wenChang)
      .replace('{{yangRen}}', yangRen)
      .replace('{{taoHua}}', taoHua)
      .replace('{{kongWang}}', kongWang)
      .replace('{{birthPlace}}', input.birthPlace || '未提供')
      .replace('{{tiaoHou}}', tiaoHouStr)
      .replace('{{bingYao}}', bingYaoStr)
      .replace('{{shiShenInteraction}}', shiShenInteractionStr)
      .replace('{{liuQin}}', liuQinStr)
      .replace('{{jieQiDates}}', jieQiDatesStr)
      .replace('{{monthlyFortune}}', monthlyFortuneStr)
      .replace('{{question}}', input.question || '请分析整体命局和运势');

    const isEn = input.lang === 'en';
    const enSuffix = isEn ? '\n\nIMPORTANT: Output ALL text fields in English. Use standard English terminology for Chinese metaphysics (e.g., Heavenly Stems, Earthly Branches, Ten Gods, Five Elements, Major Luck Cycles, Annual Luck, Useful God, Unfavorable God). All summary, analysis, advice, risks, actions, and free-text fields must be in English.' : '';
    const finalPrompt = userPrompt + enSuffix;

    const parsed = await this.generateValidatedJson(finalPrompt, this.caseLevelRequiredFields, isEn, input.question, input.birthDate);
    const rendered = this.renderAnalysisToNaturalLanguage(parsed);

    return {
      summaryLine: rendered.summaryLine,
      summaryBody: rendered.summaryBody,
      oneLineConclusion: parsed.oneLineConclusion || '',
      characterPortrait: parsed.characterPortrait || '',
      classicAnalysis: parsed.classicAnalysis || '',
      daYunTheme: parsed.daYunTheme || '',
      keyYearPhenomenon: parsed.keyYearPhenomenon || '',
      monthlyFortune: Array.isArray(parsed.monthlyFortune) ? parsed.monthlyFortune : [],
      bestMonths: Array.isArray(parsed.bestMonths) ? parsed.bestMonths : [],
      worstMonths: Array.isArray(parsed.worstMonths) ? parsed.worstMonths : [],
      modules: parsed.modules || { career: '', wealth: '', relationship: '', health: '' },
      modulesRating: parsed.modulesRating ? {
        career: Number(parsed.modulesRating.career) || 0,
        wealth: Number(parsed.modulesRating.wealth) || 0,
        relationship: Number(parsed.modulesRating.relationship) || 0,
        health: Number(parsed.modulesRating.health) || 0,
      } : undefined,
      timeRhythm: Array.isArray(parsed.timeRhythm) ? parsed.timeRhythm : [],
      futureYearsRhythm: Array.isArray(parsed.futureYearsRhythm) ? parsed.futureYearsRhythm.map((y: any) => ({
        year: y.year || '',
        theme: y.theme || '',
        advice: y.advice || '',
      })) : undefined,
      decisionAudit: parsed.decisionAudit ? {
        rightOrWrong: parsed.decisionAudit.rightOrWrong || '',
        safetyMargin: parsed.decisionAudit.safetyMargin || '',
        mvpPlan: parsed.decisionAudit.mvpPlan || '',
      } : undefined,
      partnerPortrait: parsed.partnerPortrait ? {
        personality: parsed.partnerPortrait.personality || '',
        relationshipPattern: parsed.partnerPortrait.relationshipPattern || '',
        keyIssues: Array.isArray(parsed.partnerPortrait.keyIssues) ? parsed.partnerPortrait.keyIssues : [],
      } : undefined,
      mvpPlan: parsed.mvpPlan ? {
        coreAction: parsed.mvpPlan.coreAction || '',
        steps: Array.isArray(parsed.mvpPlan.steps) ? parsed.mvpPlan.steps : [],
        timeline: parsed.mvpPlan.timeline || '',
      } : undefined,
      guardianGuidance: parsed.guardianGuidance ? {
        approach: parsed.guardianGuidance.approach || '',
        rules: Array.isArray(parsed.guardianGuidance.rules) ? parsed.guardianGuidance.rules : [],
        doNotDo: Array.isArray(parsed.guardianGuidance.doNotDo) ? parsed.guardianGuidance.doNotDo : [],
      } : undefined,
      stopDoingList: Array.isArray(parsed.stopDoingList) ? parsed.stopDoingList : [],
      closingLine: parsed.closingLine || '',
      paiPanVerification: parsed.paiPanVerification || '',
      mingjuGuJia: parsed.mingjuGuJia || '',
      label: parsed.label || '',
      ranking: parsed.ranking || '',
      testScenarios: Array.isArray(parsed.testScenarios) ? parsed.testScenarios : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      timeWindow: parsed.timeWindow || '',
      evidenceFold: parsed.evidenceFold || '',
      llmFallback: false,
    };
  }

  private async generateValidatedJson(userPrompt: string, requiredFields: string[], isEn: boolean = false, question?: string, birthDate?: string): Promise<Record<string, any>> {
    let lastError: Error | undefined;

    const systemPrompt = isEn
      ? this.systemPromptEn
      : this.systemPrompt;

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await this.llmProviders!.chatWithUser(
        attempt === 0 ? userPrompt : `${userPrompt}\n\n${isEn ? 'Previous output failed JSON field validation. Output only valid JSON with all required fields:' : '上一次输出未通过JSON字段校验。请只输出合法JSON，并补齐字段：'}${requiredFields.join(isEn ? ', ' : '、')}.`,
        systemPrompt,
        undefined,
        { temperature: 0.35, maxTokens: 6000, timeout: 180000, jsonMode: true },
      );

      const parsed = this.parseJsonResponse(response.content);
      const validation = this.validateCaseLevelOutput(parsed, requiredFields, question, birthDate);

      if (validation.valid) return parsed;
      lastError = new Error(`LLM JSON schema invalid on attempt ${attempt + 1}: ${validation.errors.join('；')}`);
      this.logger.warn(`[ZipingAgent] ${lastError.message}`);
    }

    throw lastError || new Error('LLM JSON schema invalid');
  }

  private validateCaseLevelOutput(parsed: Record<string, any>, requiredFields: string[], question?: string, birthDate?: string): { valid: boolean; errors: string[]; qualityScore: number } {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!this.hasMeaningfulValue(parsed[field])) errors.push(`缺少${field}`);
    }

    if (!parsed.modulesRating || ['career', 'wealth', 'relationship', 'health'].some((key) => !Number(parsed.modulesRating[key]))) {
      errors.push('modulesRating四项评分不完整');
    }

    if (!parsed.decisionAudit?.rightOrWrong || !parsed.decisionAudit?.safetyMargin || !parsed.decisionAudit?.mvpPlan) {
      errors.push('decisionAudit三项不完整');
    }

    if (!parsed.mvpPlan?.coreAction || !Array.isArray(parsed.mvpPlan?.steps) || parsed.mvpPlan.steps.length < 2) {
      errors.push('mvpPlan缺少核心动作或步骤');
    }

    const relationshipKeywords = ['感情', '婚姻', '恋爱', '对象', '另一半', '伴侣', '桃花', '姻缘', '老公', '老婆', '男友', '女友', '结婚', '离婚', '脱单', '相亲', '爱人', '配偶', '分手', '复合', '暧昧', '出轨', '夫妻', '找对象', '催婚'];
    const isRelationshipQuestion = question && relationshipKeywords.some(kw => question.includes(kw));
    if (isRelationshipQuestion && (!parsed.partnerPortrait?.personality || !Array.isArray(parsed.partnerPortrait?.keyIssues))) {
      errors.push('partnerPortrait不完整（感情相关问题必填）');
    }

    const birthYear = birthDate ? parseInt(birthDate.substring(0, 4)) : 0;
    const currentYear = new Date().getFullYear();
    const isMinor = birthYear > 1900 && (currentYear - birthYear) < 18;
    if (isMinor && (!parsed.guardianGuidance?.approach || !Array.isArray(parsed.guardianGuidance?.rules) || !Array.isArray(parsed.guardianGuidance?.doNotDo))) {
      errors.push('guardianGuidance不完整（未成年命主必填）');
    }

    if (!this.classicCitationIds.some((id) => String(parsed.classicAnalysis || '').includes(id))) {
      errors.push('classicAnalysis缺少白名单sourceId');
    }

    if (this.containsBannedBarnumText(parsed)) {
      errors.push('存在巴纳姆式空泛表达');
    }

    const qualityScore = this.scoreCaseLevelOutput(parsed, errors);
    if (qualityScore < 75) errors.push(`质量分低于75：${qualityScore}`);

    return { valid: errors.length === 0, errors, qualityScore };
  }

  private hasMeaningfulValue(value: any): boolean {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return typeof value === 'string' ? value.trim().length > 0 : !!value;
  }

  private scoreCaseLevelOutput(parsed: Record<string, any>, errors: string[]): number {
    let score = Math.max(20, 100 - errors.length * 8);
    if (String(parsed.summaryBody || '').length >= 80) score += 4;
    if (Array.isArray(parsed.timeRhythm) && parsed.timeRhythm.length >= 2) score += 4;
    if (Array.isArray(parsed.futureYearsRhythm) && parsed.futureYearsRhythm.length >= 3) score += 4;
    if (Array.isArray(parsed.stopDoingList) && parsed.stopDoingList.length >= 3) score += 4;
    if (typeof parsed.closingLine === 'string' && parsed.closingLine.length >= 10) score += 4;
    if (Array.isArray(parsed.testScenarios) && parsed.testScenarios.length >= 3) score += 4;
    return Math.max(0, Math.min(100, score));
  }

  private containsBannedBarnumText(parsed: Record<string, any>): boolean {
    const text = JSON.stringify(parsed);
    return BARNUM_PHRASES.some((phrase) => text.includes(phrase));
  }

  private buildMingjuGuJia(chart: BaZiChart, pattern: PatternAnalysis, wuxing: any, tenGods: any): string {
    const dayGan = chart.day.gan;
    const dayWX = WU_XING_MAP[dayGan] || '土';
    const monthZhi = chart.month.zhi;
    const parts: string[] = [];

    parts.push(`${dayGan}${dayWX}日主，生于${monthZhi}月`);

    if (pattern.strength === 'strong') {
      parts.push('身强有根');
    } else if (pattern.strength === 'weak') {
      parts.push('身弱');
    } else {
      parts.push('中和');
    }

    const wxEntries = Object.entries(wuxing).filter(([_, v]) => (v as number) >= 3);
    const wxNames: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
    if (wxEntries.length > 0) {
      const dominant = wxEntries.map(([k]) => wxNames[k] || k).join('');
      parts.push(`地支${dominant}旺`);
    }

    if (tenGods.year && tenGods.year.includes('财')) parts.push('财星透出');
    if (tenGods.month && tenGods.month.includes('印')) parts.push('印星当令');
    if (tenGods.hour && tenGods.hour.includes('官')) parts.push('官星得位');

    const gejuWarning = this.getGejuWarning(pattern.patternName);
    if (gejuWarning) parts.push(gejuWarning);

    return parts.join('，');
  }

  private getGejuWarning(geju: string): string {
    const warnings: Record<string, string> = {
      '正印格': '正印格最怕贪财坏印',
      '偏印格': '偏印格见食神为忌',
      '正官格': '正官格忌伤官见官',
      '七杀格': '七杀格喜印化杀',
      '正财格': '正财格忌比劫争财',
      '偏财格': '偏财格忌比劫争财',
      '食神格': '食神格忌偏印夺食',
      '伤官格': '伤官格宜配印或生财',
    };
    return warnings[geju] || '';
  }

  private getDaYunTheme(decade: DecadeYun | undefined, pattern: PatternAnalysis): string {
    if (!decade) return '未知';
    const ganZhi = decade.ganZhi;
    const tendency = decade.tendency;
    const strength = pattern.strength;

    if (strength === 'strong') {
      if (tendency === '顺利') return '身强遇好运，事业可进';
      if (tendency === '挑战') return '身强遇压力，需防过刚';
      return '稳中求进';
    } else {
      if (tendency === '顺利') return '身弱遇帮扶，渐入佳境';
      if (tendency === '挑战') return '身弱遇克泄，需蓄势待发';
      return '守成为主';
    }
  }

  private getLiuNian(year: number): string {
    const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const diZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const ganIdx = (year - 4) % 10;
    const zhiIdx = (year - 4) % 12;
    return `${tianGan[ganIdx]}${diZhi[zhiIdx]}年`;
  }

  private getLiuYue(year: number, month: number): string {
    const monthGanBase = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const monthZhiList = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const yearGanIdx = year % 10;
    const monthGanStart = (yearGanIdx % 5) * 2;
    const zhiIdx = (month + 1) % 12;
    const ganIdx = (monthGanStart + zhiIdx) % 10;
    return `${monthGanBase[ganIdx]}${monthZhiList[zhiIdx]}月`;
  }

  private analyzeChongHeXingHai(
    chart: BaZiChart, currentDaYun: DecadeYun | undefined,
    liuNian: string, liuYue: string
  ): string {
    const lines: string[] = [];
    const allZhis = [chart.year.zhi, chart.month.zhi, chart.day.zhi, chart.hour.zhi];

    const liuChong: Record<string, string> = {
      '子': '午', '午': '子', '丑': '未', '未': '丑',
      '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
      '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
    };
    const liuHe: Record<string, string> = {
      '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
      '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
      '巳': '申', '申': '巳', '午': '未', '未': '午',
    };

    const liuNianZhi = liuNian?.[1] || '';
    if (liuNianZhi) {
      for (const zhi of allZhis) {
        if (liuChong[zhi] === liuNianZhi) {
          lines.push(`流年${liuNian}冲命局${zhi}（六冲，变动明显）`);
        }
        if (liuHe[zhi] === liuNianZhi) {
          lines.push(`流年${liuNian}合命局${zhi}（六合，有合好）`);
        }
      }
    }

    const daYunZhi = currentDaYun?.ganZhi?.[1] || '';
    if (daYunZhi) {
      for (const zhi of allZhis) {
        if (liuChong[zhi] === daYunZhi) {
          lines.push(`大运${currentDaYun.ganZhi}冲命局${zhi}（大运冲局，十年主题）`);
        }
      }
    }

    const liuYueZhi = liuYue?.[1] || '';
    if (liuYueZhi) {
      for (const zhi of allZhis) {
        if (liuChong[zhi] === liuYueZhi) {
          lines.push(`流月${liuYue}冲命局${zhi}（月内冲动）`);
        }
      }
    }

    if (lines.length === 0) {
      lines.push('当前无明显冲合刑害');
    }

    return lines.join('\n');
  }

  /**
   * 将结构化分析结果渲染为有对话感的自然语言
   */
  private renderAnalysisToNaturalLanguage(parsed: Record<string, any>): { summaryLine: string; summaryBody: string } {
    const summaryLine = parsed.summaryLine || '';
    const summaryBody = parsed.summaryBody || '';

    // 如果 LLM 返回的 summaryBody 已经有一定对话感，直接使用
    if (summaryBody.includes('，') && summaryBody.length > 30) {
      // 添加自然的开头语
      const hasOpening = /^(好|您|这个|整体|从|根据|先|接着)/.test(summaryBody);
      if (!hasOpening && summaryBody.length < 100) {
        // 短回复加承接语
        return {
          summaryLine,
          summaryBody: `您的命局来看，${summaryBody}`,
        };
      }
    }

    return { summaryLine, summaryBody };
  }

  private parseJsonResponse(content: string): Record<string, any> {
    // P1-3 修复: 静默返回空对象改为带日志，便于排查 LLM 输出格式问题
    const logParseFailure = (reason: string) => {
      const preview = (content || '').substring(0, 200);
      this.logger.warn(`[ZipingAgent] parseJsonResponse 失败: ${reason}, content 前200字: ${preview}`);
    };
    if (!content) { logParseFailure('content 为空'); return {}; }

    let cleaned = content.trim();
    const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (mdMatch) {
      cleaned = mdMatch[1].trim();
    }

    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) { logParseFailure('未找到 { 起始符'); return {}; }

    const sub = cleaned.substring(firstBrace);
    const lastBrace = sub.lastIndexOf('}');
    if (lastBrace === -1) { logParseFailure('未找到 } 结束符'); return {}; }

    const jsonCandidate = sub.substring(0, lastBrace + 1);

    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      for (let end = sub.lastIndexOf('}'); end > 0; end = sub.lastIndexOf('}', end - 1)) {
        try {
          return JSON.parse(sub.substring(0, end + 1));
        } catch {
          continue;
        }
      }
      logParseFailure(`JSON.parse 全部失败: ${(e as Error).message}`);
      return {};
    }
  }

  private isYunShun(isMale: boolean, yearPillar: string): boolean {
    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    const isYangYear = yangStems.includes(yearPillar[0]);
    return isMale ? isYangYear : !isYangYear;
  }

  private getNaYin(pillar: string): string {
    if (!pillar) return '';
    const nayinMap: Record<string, string> = {
      '甲子': '海中金', '乙丑': '海中金', '丙寅': '炉中火', '丁卯': '炉中火',
      '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
      '壬申': '剑锋金', '癸酉': '剑锋金', '甲戌': '山头火', '乙亥': '山头火',
      '丙子': '涧下水', '丁丑': '涧下水', '戊寅': '城头土', '己卯': '城头土',
      '庚辰': '白蜡金', '辛巳': '白蜡金', '壬午': '杨柳木', '癸未': '杨柳木',
      '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
      '戊子': '霹雳火', '己丑': '霹雳火', '庚寅': '松柏木', '辛卯': '松柏木',
      '壬辰': '长流水', '癸巳': '长流水', '甲午': '沙中金', '乙未': '沙中金',
      '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
      '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
      '甲辰': '覆灯火', '乙巳': '覆灯火', '丙午': '天河水', '丁未': '天河水',
      '戊申': '大驿土', '己酉': '大驿土', '庚戌': '钗钏金', '辛亥': '钗钏金',
      '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
      '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
      '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
    };
    return nayinMap[pillar] || '';
  }

  // ===== 以下为模板兜底逻辑（原有） =====
  private generateAnalysis(
    input: ZipingInput,
    chart: BaZiChart,
    tenGods: any,
    wuxing: any,
    pattern: PatternAnalysis,
    yun: YunAnalysis,
  ): Omit<ZipingOutput, 'chart' | 'tenGods' | 'wuxingCount' | 'pattern' | 'yun'> {
    const question = input.question || '';
    const isDestinyQuestion = /运势|今年|本周|最近|整体|趋势|运程|命理/.test(question);

    if (isDestinyQuestion) {
      return this.analyzeDestinyTrend(chart, pattern, yun, input);
    }
    return this.analyzeGeneralQuestion(chart, pattern, tenGods, input);
  }

  private analyzeDestinyTrend(
    chart: BaZiChart,
    pattern: PatternAnalysis,
    yun: YunAnalysis,
    input: ZipingInput,
  ): Omit<ZipingOutput, 'chart' | 'tenGods' | 'wuxingCount' | 'pattern' | 'yun'> {
    const currentYunIdx = yun.currentYunIndex || 0;
    const currentDecade = yun.decadeYun[currentYunIdx] || yun.decadeYun[0];
    const patternDesc = `${pattern.patternName}（${pattern.subType}），格局评分${pattern.strengthScore}分`;
    // 构建四柱信息用于初步结论
    const baziInfo = `四柱：${chart.year.pillar}/${chart.month.pillar}/${chart.day.pillar}/${chart.hour.pillar}`;

    let summaryLine = '';
    let summaryBody = '';
    const risks: string[] = [];
    const actions: string[] = [];

    if (pattern.strength === 'strong') {
      summaryLine = `${baziInfo}，日主${chart.day.gan}身强${pattern.patternName}格，${currentDecade?.ganZhi || '本命'}大运宜泄不宜克。`;
      summaryBody = `日主${chart.day.gan}得${chart.month.gan}月令之助，成${pattern.patternName}格（${pattern.subType}），格局评分${pattern.strengthScore}分。当前大运${currentDecade?.ganZhi || ''}，${currentDecade?.tendency || '运势待判'}。身强宜食伤泄秀或财星耗身，忌印比再助。`;
      risks.push(`身强忌印比，${chart.month.pillar}月柱若再见印比则过刚易折`);
      risks.push(`大运${currentDecade?.ganZhi || ''}若逢比劫年，竞争加剧需防破财`);
      actions.push(`${chart.day.gan}身强宜泄，食伤方向（创造、表达、技术）为首选路径`);
      actions.push(`大运${currentDecade?.ganZhi || ''}期间，逢财星流年（${chart.day.gan}克之五行）可主动出击`);
    } else if (pattern.strength === 'weak') {
      summaryLine = `${baziInfo}，日主${chart.day.gan}身弱${pattern.patternName}格，${currentDecade?.ganZhi || '本命'}大运宜扶不宜泄。`;
      summaryBody = `日主${chart.day.gan}失${chart.month.gan}月令之助，成${pattern.patternName}格（${pattern.subType}），格局评分${pattern.strengthScore}分。当前大运${currentDecade?.ganZhi || ''}，${currentDecade?.tendency || '运势待判'}。身弱宜印比扶身，忌食伤财星再泄。`;
      risks.push(`身弱忌食伤财星，${chart.month.pillar}月柱若再见财星则力不从心`);
      risks.push(`大运${currentDecade?.ganZhi || ''}若逢食伤年，精力分散需防过劳`);
      actions.push(`${chart.day.gan}身弱宜扶，印星方向（学习、贵人、长辈）为首要依托`);
      actions.push(`大运${currentDecade?.ganZhi || ''}期间，逢印比流年（生助${chart.day.gan}之五行）可把握机遇`);
    } else {
      summaryLine = `${baziInfo}，日主${chart.day.gan}中和${pattern.patternName}格，${currentDecade?.ganZhi || '本命'}大运看流年喜忌。`;
      summaryBody = `日主${chart.day.gan}与${chart.month.gan}月令力量相当，成${pattern.patternName}格（${pattern.subType}），格局评分${pattern.strengthScore}分。当前大运${currentDecade?.ganZhi || ''}，${currentDecade?.tendency || '运势待判'}。中和之命看流年喜忌，逢喜则进，逢忌则守。`;
      risks.push(`中和命局对流年敏感，${chart.day.gan}逢冲克之年（如${chart.day.gan}被克之天干年）波动大`);
      risks.push(`大运${currentDecade?.ganZhi || ''}交接年份，气场转换期需防判断失误`);
      actions.push(`日主中和，关键看流年天干地支与命局的生克关系，喜用年进取、忌神年守成`);
      actions.push(`大运${currentDecade?.ganZhi || ''}期间，每年立春后重算流年喜忌再定策略`);
    }

    return {
      summaryLine,
      summaryBody,
      monthlyFortune: [],
      bestMonths: [],
      worstMonths: [],
      modules: { career: '', wealth: '', relationship: '', health: '' },
      timeRhythm: [],
      stopDoingList: [],
      closingLine: '',
      paiPanVerification: '',
      mingjuGuJia: '',
      label: '',
      ranking: '',
      testScenarios: [],
      risks,
      actions,
      timeWindow: currentDecade ? `${currentDecade.startAge}-${currentDecade.endAge}岁：${currentDecade.tendency}期` : '近期',
      evidenceFold: `推演依据：年柱${chart.year.pillar}、月柱${chart.month.pillar}、日柱${chart.day.pillar}、大运${currentDecade?.ganZhi || ''}`,
      llmFallback: true,
    };
  }

  private analyzeGeneralQuestion(
    chart: BaZiChart,
    pattern: PatternAnalysis,
    tenGods: any,
    input: ZipingInput,
  ): Omit<ZipingOutput, 'chart' | 'tenGods' | 'wuxingCount' | 'pattern' | 'yun'> {
    const dayGan = chart.day.gan;
    const patternDesc = `${pattern.patternName}（${pattern.subType}），格局评分${pattern.strengthScore}分`;
    const baziInfo = `四柱：${chart.year.pillar}/${chart.month.pillar}/${chart.day.pillar}/${chart.hour.pillar}`;

    let summaryLine = '';
    let summaryBody = '';
    const risks: string[] = [];
    const actions: string[] = [];

    if (pattern.strength === 'strong') {
      summaryLine = `${baziInfo}，日主${dayGan}身强，事情有能力把握。`;
      summaryBody = `日主${dayGan}身强，配合命局${patternDesc}，您具备解决问题的能力。但过于强势可能适得其反，建议柔和处理。`;
      risks.push('过于强势可能激化矛盾');
      risks.push('方法不当可能事倍功半');
      actions.push('注意处理方式，柔和一些');
      actions.push('借助他人力量，共同解决');
    } else {
      summaryLine = `${baziInfo}，日主${dayGan}身弱，事情需更多准备。`;
      summaryBody = `日主${dayGan}身弱，命局${patternDesc}，当前需要更多积累和准备。建议多听取意见，做好充分准备后再行动。`;
      risks.push('准备不足容易出问题');
      risks.push('时机未到强行推进不利');
      actions.push('多学习，多了解情况');
      actions.push('寻找可靠的人支持和帮助');
    }

    return {
      summaryLine,
      summaryBody,
      monthlyFortune: [],
      bestMonths: [],
      worstMonths: [],
      modules: { career: '', wealth: '', relationship: '', health: '' },
      testScenarios: [],
      timeRhythm: [],
      stopDoingList: [],
      closingLine: '',
      paiPanVerification: '',
      mingjuGuJia: '',
      label: '',
      ranking: '',
      risks,
      actions,
      timeWindow: '近期宜稳，不宜冒进',
      evidenceFold: `推演依据：年柱${chart.year.pillar}、月柱${chart.month.pillar}、日柱${chart.day.pillar}、时柱${chart.hour.pillar}`,
      llmFallback: true,
    };
  }

  private getFallbackResult(input: ZipingInput): ZipingOutput {
    return {
      summaryLine: '系统暂时无法完成详细分析，请稍后重试。',
      summaryBody: '由于数据或计算原因，当前无法给出完整的命理分析结果。',
      chart: {
        year: { pillar: '', gan: '', zhi: '', hiddenStems: [] },
        month: { pillar: '', gan: '', zhi: '', hiddenStems: [] },
        day: { pillar: '', gan: '', zhi: '', hiddenStems: [] },
        hour: { pillar: '', gan: '', zhi: '', hiddenStems: [] },
      },
      tenGods: {},
      wuxingCount: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      pattern: {
        patternName: '未知', subType: '', strength: 'neutral',
        strengthScore: 0, favorableElements: [], unfavorableElements: [], usableGods: [], 忌神Gods: [],
      },
      yun: { decadeYun: [], currentYunIndex: 0 },
      monthlyFortune: [],
      bestMonths: [],
      worstMonths: [],
      modules: { career: '', wealth: '', relationship: '', health: '' },
      testScenarios: [],
      timeRhythm: [],
      stopDoingList: [],
      closingLine: '',
      paiPanVerification: '',
      mingjuGuJia: '',
      label: '',
      ranking: '',
      risks: ['系统暂时不可用'],
      actions: ['请稍后重试'],
      timeWindow: '',
      evidenceFold: '',
      llmFallback: true,
    };
  }

  async getPatternAnalysis(baziData: any): Promise<PatternAnalysis> {
    return baziData.pattern || {
      patternName: '待计算', subType: '', strength: 'neutral',
      strengthScore: 0, favorableElements: [], unfavorableElements: [], usableGods: [], 忌神Gods: [],
    };
  }

  async getFortuneTrend(baziData: any, year?: number): Promise<any> {
    const yun = baziData.yun || { decadeYun: [], currentYunIndex: 0 };
    return {
      year: year || new Date().getFullYear(),
      overallTrend: yun.decadeYun[yun.currentYunIndex || 0]?.tendency || '平稳',
      monthlyBreakdown: [],
    };
  }
}
