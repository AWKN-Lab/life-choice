import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { LiurenCalculator, LiurenLesson } from '../knowledge-base/liuren-calculator';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { RuleEngineService } from '../shared/rule-engine/rule-engine.service';
import { StructuredConclusion } from '../shared/rule-engine/rule-types';
import { BARNUM_PHRASES } from '../shared/constants/barnum-phrases';
import { PrismaService } from '../prisma/prisma.service';

export interface LiurenInput {
  askTime: string;
  askLocation: string;
  question: string;
  eventType?: string;
  lang?: string;
}

export interface LiurenOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  oneLineConclusion?: string;
  label?: string;
  ranking?: string;
  coreReasoning?: string;
  keySignals?: string[];
  evidenceTags?: string[];
  actionStrategy?: string;
  zhanleiMap?: string;
  counterpartPortrait?: {
    willingness?: string;
    realConcerns?: string[];
  };
  repositioningStrategy?: string;
  currentRisks?: string[];
  threeLayerAdvice?: {
    layer1_goal?: string;
    layer2_phased?: string;
    layer3_breakdown?: string;
  };
  nowDoThis?: string[];
  nowDoNotDo?: string[];
  testScenarios?: string[];
  phasedCalendar?: Array<{
    period: string;
    goal: string;
    doThis: string[];
    doNotDo: string[];
  }>;
  scripts?: {
    openingLine?: string;
    keyPhrases?: string[];
    forbiddenPhrases?: string[];
  };
  successSignals?: string[];
  failureSignals?: string[];
  proposalVersions?: Array<{
    version: string;
    when: string;
    content: string[];
  }>;
  timeWindows?: Array<{
    period: string;
    ganzhiDays: string;
    suitable: string;
    unsuitable: string;
    fallback: string;
  }>;
  supplementaryNotes?: string;
  judgmentBasis?: {
    coreReasoning?: string;
    keySignals?: string[];
  };
  lesson: LiurenLesson;
  classification: {
    eventType: string;
    judgment: string;
    favorableFactors: string[];
    unfavorableFactors: string[];
    keyPoints: string[];
    timing: string;
  };
  risks: string[];
  actions: string[];
  timeWindow: string;
  evidenceFold: string;
  closingLine?: string;
  llmFallback?: boolean;
  ruleEngineResult?: StructuredConclusion;
}

@Injectable()
export class LiurenAgentService {
  private readonly logger = new Logger(LiurenAgentService.name);
  private systemPrompt: string = '';
  private systemPromptEn: string = '';

  // LLM分析专用提示词
  private analysisPrompt: string = '';

  constructor(
    private readonly calculator: LiurenCalculator,
    @Optional() @Inject('RULE_ENGINE_SERVICE') private readonly ruleEngine?: RuleEngineService,
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
  }

  onModuleInit() {
    this.loadSystemPrompt();
    this.loadAnalysisPrompt();
    if (this.llmProviders?.isConfigured()) {
      this.logger.log('✅ LiurenAgent LLM 已配置，可进行真实语义分析');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用模板兜底逻辑');
    }
  }

  private loadSystemPrompt(): void {
    try {
      const promptPath = join(__dirname, 'prompts', 'liuren-system-prompt.md');
      let enhanced = readFileSync(promptPath, 'utf-8');
      try {
        const keTiKnowledge = readFileSync(
          join(__dirname, '../knowledge-base/liuren/ke-ti.json'), 'utf-8'
        );
        const keTiData = JSON.parse(keTiKnowledge);
        if (keTiData.ke_ti) {
          const keTiEntries = Object.entries(keTiData.ke_ti as Record<string, any>);
          enhanced += `\n\n【课体知识库】（共${keTiEntries.length}种课体）\n`;
          enhanced += keTiEntries
            .map(([name, kt]) => `- ${name}：${kt.吉凶}。${kt.描述?.substring(0, 80)}`)
            .join('\n');
        }
      } catch (e) {
        this.logger.warn('[LiurenAgent] 加载课体知识库失败');
      }
      this.systemPrompt = enhanced;
    } catch (e) {
      // P1-2 修复: 加错误日志，原 catch 静默降级
      this.logger.error(`[LiurenAgent] 加载中文 systemPrompt 失败，使用默认 prompt: ${(e as Error).message}`);
      this.systemPrompt = this.getDefaultPrompt();
    }
    try {
      const promptPathEn = join(__dirname, 'prompts', 'liuren-system-prompt-en.md');
      this.systemPromptEn = readFileSync(promptPathEn, 'utf-8');
    } catch (e) {
      // P1-2 修复: 加错误日志
      this.logger.warn(`[LiurenAgent] 加载英文 systemPrompt 失败，使用默认英文 prompt: ${(e as Error).message}`);
      this.systemPromptEn = 'You are a master Da Liu Ren (Six Ren Divination) analyst. Analyze the divination chart data provided and output a structured JSON with all text in English. Use standard English metaphysics terminology. Be specific, avoid vague statements.';
    }
  }

  private loadAnalysisPrompt(): void {
    this.analysisPrompt = `请根据以下断事推演起课结果，进行断事推演断事分析。

【问事信息】
问题：{{question}}
问事时间：{{askTime}}
问事地点：{{askLocation}}
真太阳时校正后：{{trueSolarTime}}

【课盘结构】
月将：{{jiangjiang}}
十二时辰：{{zhoushi}}

【天地盘】
天盘：{{tianpan}}
地盘：{{dipan}}

【四课】
{{siKe0}}
{{siKe1}}
{{siKe2}}
{{siKe3}}

【三传】
初传（第一传）：{{sanChuan0}}
中传（第二传）：{{sanChuan1}}
末传（第三传）：{{sanChuan2}}

【课体】
{{keTi}}

【神煞】
{{shenSha}}

【毕法】
{{biFa}}

请按以下结构输出分析结果（严格遵守JSON格式，不要输出其他内容）：
{
  "summaryLine": "一句话定性，直接回答用户问题，控制在20字以内",
  "summaryBody": "详细分析，150字以内，涵盖核心判断、原因、时机",
  "risks": ["风险1", "风险2"],
  "actions": ["建议动作1", "建议动作2"],
  "timeWindow": "时间窗口，如：7-14天内、3个月内",
  "evidenceFold": "判断依据，简写推演过程"
}`;
  }

  private getDefaultPrompt(): string {
    return `你是"断事推演断事宗师"。你的职责是根据问事时间起课，判断事件吉凶、时机与应对策略。输出遵守：结论先行、清晰优先、事实→含义→建议。`;
  }

  async analyze(input: LiurenInput): Promise<LiurenOutput> {
    const isEn = input.lang === 'en' || input.lang?.startsWith('en');
    try {
      const startTime = Date.now();

      const askDateTime = new Date(input.askTime);
      const lesson = this.calculator.setUpLesson(askDateTime, input.askLocation);
      const eventType = input.eventType || this.detectEventType(input.question);
      const classification = this.calculator.classifyEvent(lesson, eventType);

      let similarCases: any[] = [];
      try {
        if (this.prisma) {
          similarCases = await this.findSimilarCases(lesson, eventType);
        }
      } catch (err) {
        this.logger.warn(`[LiurenAgent] 案例检索失败: ${(err as Error).message}`);
      }

      let structuredConclusion: StructuredConclusion | undefined;
      if (this.ruleEngine) {
        try {
          const facts = this.extractLiurenFacts(input, lesson, eventType);
          const matchedRules = this.ruleEngine.evaluateAll(facts);
          structuredConclusion = this.ruleEngine.buildStructuredConclusion('大六壬', matchedRules, facts);
          this.logger.log(`[LiurenAgent] 规则引擎触发: ${structuredConclusion.jixiong}，${structuredConclusion.triggeredShensha.length}神煞，${structuredConclusion.triggeredPatterns.length}格局`);
        } catch (ruleErr) {
          this.logger.warn(`[LiurenAgent] 规则引擎失败，降级到LLM直推: ${(ruleErr as Error).message}`);
        }
      }

      let result: Omit<LiurenOutput, 'lesson' | 'classification'>;

      if (this.llmProviders?.isConfigured()) {
        try {
          result = await this.analyzeWithLLM(input, lesson, classification, structuredConclusion, similarCases);
          this.logger.log(`[LiurenAgent] LLM分析成功，耗时${Date.now() - startTime}ms`);
        } catch (llmErr) {
          this.logger.warn(`[LiurenAgent] LLM失败，降级到模板: ${(llmErr as Error).message}`);
          result = this.generateAnalysis(input, lesson, classification);
        }
      } else {
        result = this.generateAnalysis(input, lesson, classification);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`断事推演分析完成，耗时 ${duration}ms`);

      return {
        ...result,
        lesson,
        classification,
        ruleEngineResult: structuredConclusion,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('断事推演分析失败', err.stack);
      return this.getFallbackResult(input);
    }
  }

  private readonly requiredFields = ['summaryLine', 'summaryBody', 'risks', 'actions'];

  private async analyzeWithLLM(
    input: LiurenInput,
    lesson: LiurenLesson,
    classification: any,
    structuredConclusion?: StructuredConclusion,
    similarCases: any[] = [],
  ): Promise<Omit<LiurenOutput, 'lesson' | 'classification'>> {
    const isEn = input.lang === 'en' || input.lang?.startsWith('en');
    const tianpanStr = lesson.tianpan.map((t) => `${t.gan}${t.zhi}`).join('、');
    const dipanStr = lesson.dipan.map((d) => `${d.gan}${d.zhi}`).join('、');

    const siKeLines = lesson.siKe.map((sk: any, idx: number) =>
      `第${idx + 1}课：${sk.gan}${sk.zhi}`
    ).join('\n');

    const sanChuanLines = lesson.sanChuan.map((sc: any, idx: number) =>
      `${idx === 0 ? '初' : idx === 1 ? '中' : '末'}传：${sc.gan}${sc.zhi}`
    ).join('\n');

    const shenShaStr = Array.isArray(lesson.shenSha)
      ? lesson.shenSha.join('、')
      : (lesson.shenSha || '无');

    const biFaStr = Array.isArray(lesson.biFa)
      ? lesson.biFa.join('、')
      : (lesson.biFa || '无');

    const userPrompt = this.analysisPrompt
      .replace('{{question}}', input.question || '')
      .replace('{{askTime}}', input.askTime)
      .replace('{{askLocation}}', input.askLocation || '未提供')
      .replace('{{trueSolarTime}}', lesson.trueSolarTime || '未校正')
      .replace('{{jiangjiang}}', lesson.jiangjiang || '')
      .replace('{{zhoushi}}', lesson.zhoushi || '')
      .replace('{{tianpan}}', tianpanStr)
      .replace('{{dipan}}', dipanStr)
      .replace('{{siKe0}}', siKeLines.split('\n')[0] || '')
      .replace('{{siKe1}}', siKeLines.split('\n')[1] || '')
      .replace('{{siKe2}}', siKeLines.split('\n')[2] || '')
      .replace('{{siKe3}}', siKeLines.split('\n')[3] || '')
      .replace('{{sanChuan0}}', sanChuanLines.split('\n')[0] || '')
      .replace('{{sanChuan1}}', sanChuanLines.split('\n')[1] || '')
      .replace('{{sanChuan2}}', sanChuanLines.split('\n')[2] || '')
      .replace('{{keTi}}', lesson.keTi || '')
      .replace('{{shenSha}}', shenShaStr)
      .replace('{{biFa}}', biFaStr);

    const systemPrompt = isEn ? this.systemPromptEn : this.systemPrompt;

    const ruleEngineBlock = structuredConclusion ? this.formatRuleEngineBlock(structuredConclusion) : '';
    let finalPrompt = ruleEngineBlock
      ? `${userPrompt}\n\n【规则引擎结构化判定（LLM请翻译为自然语言，不要自行推理规则）】\n${ruleEngineBlock}`
      : userPrompt;

    if (similarCases.length > 0) {
      finalPrompt += `\n\n【相似历史案例】（共${similarCases.length}条，供参考，请勿直接复制断语）\n${this.formatCasesForPrompt(similarCases)}`;
    }

    let lastParsed: Record<string, any> | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const prompt = attempt === 0
        ? finalPrompt
        : `${finalPrompt}\n\n${isEn ? 'Previous output was missing required fields. Output only valid JSON with all required fields:' : '上一次输出缺少必填字段。请只输出合法JSON，并补齐字段：'}${this.requiredFields.join(isEn ? ', ' : '、')}`;

      const response = await this.llmProviders!.chatWithUser(
        prompt,
        systemPrompt,
        undefined,
        { temperature: 0.35, maxTokens: 6000, timeout: 180000, jsonMode: true },
      );

      const parsed = this.parseJsonResponse(response.content);

      if (this.containsBannedBarnumText(parsed)) {
        this.logger.warn(`[LiurenAgent] LLM输出含巴纳姆空泛表达（attempt ${attempt + 1}），降级到模板`);
        return this.generateAnalysis(input, lesson, classification);
      }

      const missingFields = this.requiredFields.filter(
        (f) => !parsed[f] || (Array.isArray(parsed[f]) && parsed[f].length === 0)
      );
      if (missingFields.length === 0) {
        lastParsed = parsed;
        break;
      }

      this.logger.warn(`[LiurenAgent] LLM输出缺少字段: ${missingFields.join('、')}（attempt ${attempt + 1}）`);
      lastParsed = parsed;

      if (attempt >= 2) break;
    }

    if (!lastParsed) {
      this.logger.warn('[LiurenAgent] LLM多次重试仍无有效输出，降级到模板');
      return this.generateAnalysis(input, lesson, classification);
    }

    return {
      summaryLine: lastParsed.summaryLine || '断事推演分析完成',
      summaryBody: lastParsed.summaryBody || '',
      risks: Array.isArray(lastParsed.risks) ? lastParsed.risks : [],
      actions: Array.isArray(lastParsed.actions) ? lastParsed.actions : [],
      timeWindow: lastParsed.timeWindow || '',
      evidenceFold: lastParsed.evidenceFold || '',
      closingLine: lastParsed.closingLine || '',
      llmFallback: false,
    };
  }

  private extractLiurenFacts(
    input: LiurenInput,
    lesson: LiurenLesson,
    eventType: string,
  ): Record<string, unknown> {
    const askDate = new Date(input.askTime);
    const year = askDate.getFullYear();
    const month = askDate.getMonth() + 1;
    const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const yearZhi = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'][year % 12];
    const monthZhi = DI_ZHI[(month - 1) % 12];
    const dayZhi = lesson.siKe[2]?.zhi || '';

    return {
      yearZhi,
      monthZhi,
      dayZhi,
      questionCategory: eventType,
      keTi: lesson.keTi || '',
      jiangjiang: lesson.jiangjiang || '',
    };
  }

  private formatRuleEngineBlock(sc: StructuredConclusion): string {
    const lines: string[] = [];
    lines.push(`吉凶判定：${sc.jixiong}（风险等级：${sc.riskLevel}）`);
    lines.push(`风险描述：${sc.riskDescription}`);

    if (sc.triggeredShensha.length > 0) {
      lines.push(`触发神煞：`);
      for (const s of sc.triggeredShensha) {
        lines.push(`  - ${s.name}（${s.level}）：${s.judgment}`);
      }
    }

    if (sc.triggeredPatterns.length > 0) {
      lines.push(`触发格局：`);
      for (const p of sc.triggeredPatterns) {
        lines.push(`  - ${p.name}：${p.judgment}`);
      }
    }

    if (sc.doList.length > 0) {
      lines.push(`建议做：${sc.doList.join('；')}`);
    }
    if (sc.dontList.length > 0) {
      lines.push(`建议不做：${sc.dontList.join('；')}`);
    }
    if (sc.timeWindows.length > 0) {
      lines.push(`时间窗口：`);
      for (const tw of sc.timeWindows) {
        lines.push(`  - ${tw.period}：${tw.theme}（${tw.advice}）`);
      }
    }

    lines.push(`判断依据标签：${sc.evidenceTags.join('、')}`);
    return lines.join('\n');
  }

  private parseJsonResponse(content: string): Record<string, any> {
    // P1-3 修复: 静默返回空对象改为带日志，便于排查 LLM 输出格式问题
    const logParseFailure = (reason: string) => {
      const preview = (content || '').substring(0, 200);
      this.logger.warn(`[LiurenAgent] parseJsonResponse 失败: ${reason}, content 前200字: ${preview}`);
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

  private containsBannedBarnumText(parsed: Record<string, any>): boolean {
    const text = JSON.stringify(parsed);
    return BARNUM_PHRASES.some((phrase) => text.includes(phrase));
  }

  private detectEventType(question: string): string {
    if (/合作|合伙|签约|共同/.test(question)) return '合作';
    if (/能不能|可否|是否能够/.test(question)) return '决策';
    if (/要不要|该不该|是否应该/.test(question)) return '决策';
    if (/财运|求财|赚钱|投资/.test(question)) return '求财';
    if (/官职|事业|工作|升职/.test(question)) return '事业';
    if (/婚姻|感情|恋爱|姻缘/.test(question)) return '婚姻';
    if (/出行|远行|旅游|搬迁/.test(question)) return '出行';
    if (/疾病|健康|病痛/.test(question)) return '健康';
    if (/官非|诉讼|纠纷/.test(question)) return '官司';
    return '一般占断';
  }

  private generateAnalysis(
    input: LiurenInput,
    lesson: LiurenLesson,
    classification: any,
  ): Omit<LiurenOutput, 'lesson' | 'classification'> {
    const question = input.question || '';
    const isCooperationQuestion = /合作|合伙|签约|能不能|要不要|适合/.test(question);
    const isDestinyQuestion = /运势|今年|最近|整体|趋势/.test(question);

    if (isDestinyQuestion) {
      return this.analyzeDestinyTrend(lesson, classification);
    }
    if (isCooperationQuestion) {
      return this.analyzeCooperation(lesson, classification, input);
    }
    return this.analyzeGeneral(lesson, classification, input);
  }

  private analyzeDestinyTrend(
    lesson: LiurenLesson,
    classification: any,
  ): Omit<LiurenOutput, 'lesson' | 'classification'> {
    const keTi = lesson.keTi;
    const sanChuan = lesson.sanChuan;
    const judgment = classification.judgment || '';

    let summaryLine = '';
    let summaryBody = '';
    const risks: string[] = [];
    const actions: string[] = [];

    if (judgment === '吉利') {
      summaryLine = `课体${keTi}三传吉，${sanChuan[0]?.gan || ''}${sanChuan[0]?.zhi || ''}初传得力，可进。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}显示能量流转较为顺畅。初传${sanChuan[0]?.tianjiang || ''}临${sanChuan[0]?.zhi || ''}位，贵人得力，中传${sanChuan[1]?.tianjiang || ''}、末传${sanChuan[2]?.tianjiang || ''}依次承接，事有实据可依。`;
      actions.push(`初传${sanChuan[0]?.gan || ''}${sanChuan[0]?.zhi || ''}当令，宜在${sanChuan[0]?.zhi || ''}位方向先行试探`);
      actions.push(`末传${sanChuan[2]?.tianjiang || ''}归位，${sanChuan[2]?.zhi || ''}日前后可收定论`);
    } else if (judgment === '谨慎') {
      summaryLine = `课体${keTi}三传有阻，${sanChuan[1]?.gan || ''}${sanChuan[1]?.zhi || ''}中传受克，宜缓。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}显示局势较为复杂。中传${sanChuan[1]?.tianjiang || ''}临${sanChuan[1]?.zhi || ''}位受克，事有反复之象，不宜强攻。`;
      risks.push(`中传${sanChuan[1]?.zhi || ''}位受克，${sanChuan[1]?.tianjiang || ''}不力，对方或环境有变`);
      risks.push(`末传${sanChuan[2]?.zhi || ''}位空亡或落空，最终结果可能不及预期`);
      actions.push(`中传受克期（${sanChuan[1]?.zhi || ''}日前后）不做关键决策`);
      actions.push(`待末传${sanChuan[2]?.zhi || ''}位应期再行动`);
    } else {
      summaryLine = `课体${keTi}三传平，${sanChuan[0]?.gan || ''}${sanChuan[0]?.zhi || ''}初传无冲无合，待机。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}显示能量场相对平衡，无冲无合。初传${sanChuan[0]?.tianjiang || ''}安静，时机未到，需待冲合之期。`;
      actions.push(`当前无明确信号，${sanChuan[0]?.zhi || ''}日前后观察初传动静`);
      actions.push(`若${sanChuan[1]?.zhi || ''}位出现冲合，即为行动窗口`);
    }

    return {
      summaryLine,
      summaryBody,
      risks,
      actions,
      timeWindow: '详见具体事件分析',
      evidenceFold: `推演依据：${keTi}、三传${sanChuan.map((c: any) => c.tianjiang).join('、')}`,
      closingLine: '运势如水，顺势而为。具体决策请结合实际情况判断。',
      llmFallback: true,
    };
  }

  private analyzeCooperation(
    lesson: LiurenLesson,
    classification: any,
    input: LiurenInput,
  ): Omit<LiurenOutput, 'lesson' | 'classification'> {
    const keTi = lesson.keTi;
    const sanChuan = lesson.sanChuan;
    const sc0: any = sanChuan[0] || {};
    const sc1: any = sanChuan[1] || {};
    const sc2: any = sanChuan[2] || {};
    const hasHelper = sanChuan.some((c: any) => ['贵人', '六合', '太阴'].includes(c.tianjiang));
    const hasObstacle = sanChuan.some((c: any) => ['白虎', '玄武', '勾陈'].includes(c.tianjiang));

    let summaryLine = '';
    let summaryBody = '';
    const risks: string[] = [];
    const actions: string[] = [];

    if (hasHelper && !hasObstacle) {
      summaryLine = `课体${keTi}，初传${sc0.gan || ''}${sc0.zhi || ''}${sc0.tianjiang || ''}临位，可进。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}，初传${sc0.tianjiang || ''}临${sc0.zhi || ''}位得力，中传${sc1.tianjiang || ''}承接，末传${sc2.tianjiang || ''}归${sc2.zhi || ''}位。合作方有诚意，${sc0.tianjiang || '贵人'}入传为实据。`;
      actions.push(`初传${sc0.gan || ''}${sc0.zhi || ''}当令，${sc0.zhi || ''}日前后可正式签约`);
      actions.push(`末传${sc2.tianjiang || ''}归位，${sc2.zhi || ''}日前后确认最终条款`);
    } else if (hasObstacle && !hasHelper) {
      summaryLine = `课体${keTi}，中传${sc1.gan || ''}${sc1.zhi || ''}${sc1.tianjiang || ''}受克，宜缓。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}，中传${sc1.tianjiang || ''}临${sc1.zhi || ''}位受克，对方${sc1.tianjiang === '白虎' ? '态度强硬' : sc1.tianjiang === '玄武' ? '暗藏变数' : '纠缠不清'}。`;
      risks.push(`中传${sc1.tianjiang || ''}临${sc1.zhi || ''}位受克，${sc1.zhi || ''}日前后对方可能变卦`);
      risks.push(`末传${sc2.zhi || ''}位${sc2.tianjiang || ''}，最终结果不及预期`);
      actions.push(`中传受克期（${sc1.zhi || ''}日前后）不做关键决策`);
      actions.push(`待末传${sc2.zhi || ''}位应期再行动`);
    } else {
      summaryLine = `课体${keTi}，初传${sc0.tianjiang || ''}与中传${sc1.tianjiang || ''}吉凶交织，看末传定夺。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}，初传${sc0.tianjiang || ''}临${sc0.zhi || ''}有助力，中传${sc1.tianjiang || ''}临${sc1.zhi || ''}有阻碍，末传${sc2.tianjiang || ''}归${sc2.zhi || ''}位决定走向。`;
      risks.push(`中传${sc1.tianjiang || ''}临${sc1.zhi || ''}位，${sc1.zhi || ''}日前后需防对方反悔`);
      risks.push(`初传${sc0.tianjiang || ''}虽吉但被中传牵制，合作条款需留退出条款`);
      actions.push(`先签框架协议，${sc0.zhi || ''}日前后试探对方诚意`);
      actions.push(`末传${sc2.zhi || ''}位应期再做最终承诺`);
    }

    return {
      summaryLine,
      summaryBody,
      risks,
      actions,
      timeWindow: `初传${sc0.zhi || ''}日—末传${sc2.zhi || ''}日：关键观察期`,
      evidenceFold: `推演依据：${keTi}、三传${sanChuan.map((c: any) => c.tianjiang).join('→')}`,
      closingLine: '合作如舟，合则两利，分则两伤。关键条款留余地，长期信任靠实绩。',
      llmFallback: true,
    };
  }

  private analyzeGeneral(
    lesson: LiurenLesson,
    classification: any,
    input: LiurenInput,
  ): Omit<LiurenOutput, 'lesson' | 'classification'> {
    const keTi = lesson.keTi;
    const sanChuan = lesson.sanChuan;
    const sc0: any = sanChuan[0] || {};
    const sc1: any = sanChuan[1] || {};
    const sc2: any = sanChuan[2] || {};
    const judgment = classification.judgment || '';

    let summaryLine = '';
    let summaryBody = '';
    const risks: string[] = [];
    const actions: string[] = [];

    if (judgment === '吉利') {
      summaryLine = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}吉，初传${sc0.tianjiang || ''}得力。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}，初传${sc0.tianjiang || ''}临${sc0.zhi || ''}位得力，中传${sc1.tianjiang || ''}承接顺畅，末传${sc2.tianjiang || ''}归${sc2.zhi || ''}位。`;
      if (classification.favorableFactors?.length > 0) {
        summaryBody += `有利因素：${classification.favorableFactors.join('、')}。`;
      }
      actions.push(`初传${sc0.gan || ''}${sc0.zhi || ''}当令，${sc0.zhi || ''}日前后可主动推进`);
      actions.push(`末传${sc2.tianjiang || ''}归位，${sc2.zhi || ''}日前后可收定论`);
    } else if (judgment === '谨慎') {
      summaryLine = `课体${keTi}，中传${sc1.tianjiang || ''}临${sc1.zhi || ''}受克，宜缓。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}，中传${sc1.tianjiang || ''}临${sc1.zhi || ''}位受克，事有反复。`;
      if (classification.unfavorableFactors?.length > 0) {
        summaryBody += `不利因素：${classification.unfavorableFactors.join('、')}。`;
      }
      risks.push(`中传${sc1.zhi || ''}位受克，${sc1.tianjiang || ''}不力，${sc1.zhi || ''}日前后需防变故`);
      risks.push(`末传${sc2.zhi || ''}位空亡或落空，最终结果可能不及预期`);
      actions.push(`中传受克期（${sc1.zhi || ''}日前后）不做关键决策`);
      actions.push(`待末传${sc2.zhi || ''}位应期再行动`);
    } else {
      summaryLine = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}平，待机。`;
      summaryBody = `课体${keTi}，三传${sanChuan.map((c: any) => c.gan + c.zhi).join('→')}，初传${sc0.tianjiang || ''}安静，无冲无合，时机未到。`;
      actions.push(`当前无明确信号，${sc0.zhi || ''}日前后观察初传动静`);
      actions.push(`若${sc1.zhi || ''}位出现冲合，即为行动窗口`);
    }

    return {
      summaryLine,
      summaryBody,
      risks,
      actions,
      timeWindow: `初传${sc0.zhi || ''}日—末传${sc2.zhi || ''}日：观察期`,
      evidenceFold: `推演依据：${keTi}、三传${sanChuan.map((c: any) => c.tianjiang).join('→')}`,
      closingLine: '课有吉凶，事在人为。以上推演供参考，最终决策请结合自身判断。',
      llmFallback: true,
    };
  }

  private getFallbackResult(input: LiurenInput): LiurenOutput {
    return {
      summaryLine: '系统暂时无法完成详细分析，请稍后重试。',
      summaryBody: '由于数据或计算原因，当前无法给出完整的断事推演断事结果。',
      lesson: this.createEmptyLesson(),
      classification: {
        eventType: '',
        judgment: '未知',
        favorableFactors: [],
        unfavorableFactors: [],
        keyPoints: [],
        timing: '',
      },
      risks: ['系统暂时不可用'],
      actions: ['请稍后重试'],
      timeWindow: '',
      evidenceFold: '',
      closingLine: '系统暂不可用，请稍后重试。',
      llmFallback: true,
    };
  }

  private createEmptyLesson(): LiurenLesson {
    return {
      askTime: '',
      askDate: '',
      askLocation: '',
      trueSolarTime: '',
      jiangjiang: '',
      zhoushi: '',
      tianpan: [],
      dipan: [],
      siKe: [],
      sanChuan: [],
      tiTi: '',
      keTi: '',
      shenSha: [],
      biFa: [],
    };
  }

  async setUpLesson(askTime: string, location?: string): Promise<LiurenLesson> {
    const askDateTime = new Date(askTime);
    return this.calculator.setUpLesson(askDateTime, location);
  }

  async getClassification(lessonData: any, eventType: string): Promise<any> {
    return this.calculator.classifyEvent(lessonData, eventType);
  }

  async analyzeJinKouJue(input: {
    askTime: string;
    question: string;
    diFen?: string;
  }): Promise<{
    lesson: any;
    judgment: string;
    risks: string[];
    actions: string[];
    ruleResults: any[];
  }> {
    const askDateTime = new Date(input.askTime);
    const lesson = this.calculator.setUpJinKouJue(askDateTime, input.diFen);

    let ruleResults: any[] = [];
    try {
      if (this.ruleEngine) {
        ruleResults = await this.ruleEngine.evaluate('liuren-jinkoujue', {
          lesson,
          question: input.question,
          eventType: '金口诀',
        });
      }
    } catch (e) {
      this.logger.warn(`[LiurenAgent] 金口诀规则引擎评估失败: ${(e as Error).message}`);
    }

    let judgment = '';
    let risks: string[] = [];
    let actions: string[] = [];

    if (this.llmProviders) {
      try {
        const systemPrompt = readFileSync(
          join(__dirname, '../liuren-agent/prompts/jinkoujue-prompt.md'), 'utf-8'
        );
        const userPrompt = `占问时间：${input.askTime}\n问题：${input.question}\n\n【金口诀课盘】\n地分：${lesson.diFen}\n月将：${lesson.yueJiang}\n贵神：${lesson.guiShen}\n人元：${lesson.renYuan}\n课体：${lesson.keTi}\n生克关系：\n- 干（人元）对将（月将）：${lesson.shengKe.ganShengKeJiang}\n- 神（贵神）对将（月将）：${lesson.shengKe.shenShengKeJiang}\n- 方（地分）对将（月将）：${lesson.shengKe.fangShengKeJiang}\n\n请按金口诀体系进行分析，输出JSON格式。`;

        const response = await this.llmProviders.chatWithUser(
          userPrompt, systemPrompt, undefined,
          { temperature: 0.35, maxTokens: 3000, timeout: 120000, jsonMode: true }
        );

        const parsed = this.parseJsonResponse(response.content);
        judgment = parsed.judgment || '分析完成';
        risks = parsed.risks || [];
        actions = parsed.actions || [];
      } catch (e) {
        this.logger.warn(`[LiurenAgent] 金口诀LLM分析失败: ${(e as Error).message}`);
      }
    }

    if (!judgment) {
      const keTiMap: Record<string, string> = {
        '神生将': '贵神生月将，贵人相助之象，所谋可成。',
        '将生干': '月将生人元，财来找人之象，所求可得。',
        '神将同宫': '贵神与月将同宫，事归一也，专注可成。',
        '干克神': '人元克贵神，主动出击可胜，但需谨慎。',
        '神克将': '贵神克月将，贵人不助，宜暂缓。',
        '将克方': '月将克地分，根基不稳，需加固基础。',
        '四位纯阳': '四位纯阳，明朗通达，事可速成。',
        '四位纯阴': '四位纯阴，隐晦不明，需耐心等待。',
      };
      judgment = keTiMap[lesson.keTi] || `课体${lesson.keTi}，请结合具体问题分析。`;
      risks = ['金口诀分析仅供参考'];
      actions = ['建议结合实际情况判断'];
    }

    return { lesson, judgment, risks, actions, ruleResults };
  }

  async analyzeTuiMing(input: {
    birthDate: string;
    birthTime: string;
    gender: '男' | '女';
  }): Promise<{
    mingGong: string;
    shenGong: string;
    lifetimeLesson: any;
    daYun: Array<{ period: string; lesson: any }>;
    judgment: string;
  }> {
    const birthDateTime = new Date(`${input.birthDate}T${input.birthTime}:00`);
    const lifetimeLesson = this.calculator.setUpLesson(birthDateTime);

    const birthMonth = birthDateTime.getMonth() + 1;
    const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    const mingGongZhi = DI_ZHI[(birthMonth - 1) % 12];
    const shenGongZhi = DI_ZHI[(birthMonth + 6) % 12];
    
    const mingGongTianJiang = lifetimeLesson.tianpan.find((t: any) => t.zhi === mingGongZhi)?.tianjiang || '';
    const shenGongTianJiang = lifetimeLesson.tianpan.find((t: any) => t.zhi === shenGongZhi)?.tianjiang || '';
    
    const mingGong = `${mingGongZhi}（${mingGongTianJiang}）`;
    const shenGong = `${shenGongZhi}（${shenGongTianJiang}）`;

    const daYun: Array<{ period: string; lesson: any }> = [];
    for (let i = 0; i < 8; i++) {
      const ageStart = i * 10;
      const ageEnd = ageStart + 9;
      const yunDate = new Date(birthDateTime);
      yunDate.setFullYear(yunDate.getFullYear() + ageStart);
      daYun.push({
        period: `${ageStart}-${ageEnd}岁`,
        lesson: this.calculator.setUpLesson(yunDate),
      });
    }

    let judgment = '';
    if (this.llmProviders) {
      try {
        const systemPrompt = readFileSync(
          join(__dirname, '../liuren-agent/prompts/tuiming-prompt.md'), 'utf-8'
        );
        const userPrompt = `出生时间：${input.birthDate} ${input.birthTime}\n性别：${input.gender}\n命宫：${mingGong}\n身宫：${shenGong}\n终身课盘：${JSON.stringify(lifetimeLesson)}\n大运：${JSON.stringify(daYun.map(d => ({ period: d.period, keTi: d.lesson.keTi })))}\n\n请按六壬推命体系进行分析，输出JSON格式。`;

        const response = await this.llmProviders.chatWithUser(
          userPrompt, systemPrompt, undefined,
          { temperature: 0.35, maxTokens: 4000, timeout: 180000, jsonMode: true }
        );

        const parsed = this.parseJsonResponse(response.content);
        judgment = parsed.judgment || '推命分析完成';
      } catch (e) {
        this.logger.warn(`[LiurenAgent] 推命LLM分析失败: ${(e as Error).message}`);
      }
    }

    if (!judgment) {
      judgment = `命宫${mingGong}，身宫${shenGong}。终身课体${lifetimeLesson.keTi}。命宫主一生格局，身宫主后天发展。大运每十年一换，宜结合流年参看。`;
    }

    return { mingGong, shenGong, lifetimeLesson, daYun, judgment };
  }

  async analyzeZeRi(input: {
    eventType: '嫁娶' | '入宅' | '开业' | '出行';
    dateRange: { start: string; end: string };
  }): Promise<{
    suitableDates: Array<{ date: string; score: number; reason: string }>;
    unsuitableDates: string[];
  }> {
    const start = new Date(input.dateRange.start);
    const end = new Date(input.dateRange.end);
    const suitableDates: Array<{ date: string; score: number; reason: string }> = [];
    const unsuitableDates: string[] = [];

    const current = new Date(start);
    while (current <= end) {
      try {
        const lesson = this.calculator.setUpLesson(current);
        const classification = this.calculator.classifyEvent(lesson, input.eventType);
        
        let score = 0;
        const reasons: string[] = [];

        if (classification.judgment === '吉利') {
          score += 40;
          reasons.push('课体吉利');
        } else if (classification.judgment === '谨慎') {
          score += 20;
          reasons.push('课体尚可');
        }

        const goodShensha = ['贵人', '青龙', '六合', '天后', '太常', '驿马'];
        const badShensha = ['白虎', '玄武', '勾陈', '天空', '螣蛇'];
        
        const shenshaInSanChuan = lesson.sanChuan.map((s: any) => s.tianjiang);
        for (const s of shenshaInSanChuan) {
          if (goodShensha.includes(s)) { score += 10; reasons.push(`${s}入传`); }
          if (badShensha.includes(s)) { score -= 15; reasons.push(`${s}入传（不利）`); }
        }

        if (score >= 60) {
          suitableDates.push({
            date: current.toISOString().split('T')[0],
            score: Math.min(100, score),
            reason: reasons.join('；'),
          });
        } else {
          unsuitableDates.push(current.toISOString().split('T')[0]);
        }
      } catch (e) {
        this.logger.warn(`[LiurenAgent] 择日计算失败 ${current.toISOString()}: ${(e as Error).message}`);
      }
      current.setDate(current.getDate() + 1);
    }

    suitableDates.sort((a, b) => b.score - a.score);

    return { suitableDates: suitableDates.slice(0, 10), unsuitableDates };
  }

  private async findSimilarCases(lesson: LiurenLesson, eventType: string): Promise<any[]> {
    if (!this.prisma) return [];

    const keTi = lesson.keTi || '';
    const shenshaNames = (lesson.shenSha || []).map((s: any) => s.name || s).filter(Boolean);

    try {
      const cases = await (this.prisma as any).liurenCase.findMany({
        where: {
          OR: [
            { keTi: keTi },
            { eventType: eventType },
            ...(shenshaNames.length > 0 ? shenshaNames.map((name: string) => ({
              shenshaList: { contains: name }
            })) : []),
          ],
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });

      return cases;
    } catch (e) {
      this.logger.warn(`[LiurenAgent] 案例查询失败: ${(e as Error).message}`);
      return [];
    }
  }

  private formatCasesForPrompt(cases: any[]): string {
    if (!cases || cases.length === 0) return '';
    
    return cases.map((c, i) => {
      let text = `案例${i + 1}：${c.question}\n`;
      text += `占时：${c.askTime}\n`;
      text += `课体：${c.keTi || '未知'}\n`;
      text += `断语：${c.judgment}\n`;
      if (c.verification) text += `应验：${c.verification}\n`;
      if (c.keyPoints) {
        try {
          const points = JSON.parse(c.keyPoints);
          text += `关键点：${points.join('、')}\n`;
        } catch {}
      }
      return text;
    }).join('\n');
  }
}
