import { Injectable, Logger } from '@nestjs/common';
import { ZipingAgentService, ZipingInput, ZipingOutput } from '../ziping-agent/ziping-agent.service';
import { LiurenAgentService, LiurenInput, LiurenOutput } from '../liuren-agent/liuren-agent.service';
import { QumingAgentService, QumingInput, QumingOutput } from '../quming-agent/quming-agent.service';
import { QimenAgentService, QimenInput, QimenOutput } from '../qimen-agent/qimen-agent.service';
import { LiuyaoAgentService, LiuyaoInput, LiuyaoOutput } from '../liuyao-agent/liuyao-agent.service';
import { ZiweiAgentService, ZiweiInput, ZiweiOutput } from '../ziwei-agent/ziwei-agent.service';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';

export interface GatewayInput {
  routeType: 'ziping' | 'liuren' | 'clarify' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'zhangsheng';
  calcResult?: any;
  inputData?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: 'male' | 'female';
    askTime?: string;
    askLocation?: string;
    question?: string;
    // 取名专用
    surname?: string;
    parentWish?: string;
    avoidChars?: string[];
  };
  lang?: string;
}

export interface AlgorithmEvidencePacket {
  routeType: GatewayInput['routeType'];
  summary: string;
  evidenceTags: string[];
  raw?: Record<string, any>;
}

export interface ParallelGatewayInput {
  primaryRouteType: 'ziping' | 'liuren' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'zhangsheng';
  secondaryRouteType?: 'ziping' | 'liuren' | 'quming' | 'qimen' | 'liuyao' | 'ziwei' | 'zhangsheng';
  calcResult?: any;
  inputData?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: 'male' | 'female';
    askTime?: string;
    askLocation?: string;
    question?: string;
    surname?: string;
    parentWish?: string;
    avoidChars?: string[];
  };
  lang?: string;
}

export interface ParallelGatewayOutput {
  primary: GatewayOutput;
  secondary?: GatewayOutput;
  primaryFailed: boolean;
  secondaryFailed: boolean;
  consistency: 'consistent' | 'undetermined' | 'conflicting';
}

export interface GatewayOutput {
  summary_line: string;
  summary_body: string;
  one_line_conclusion?: string;
  character_portrait?: string;
  counterpart_portrait?: {
    willingness?: string;
    realConcerns?: string[];
  };
  repositioning_strategy?: string;
  three_layer_advice?: {
    layer1_goal?: string;
    layer2_phased?: string;
    layer3_breakdown?: string;
  };
  phased_calendar?: Array<{
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
  success_signals?: string[];
  failure_signals?: string[];
  action_strategy?: string;
  evidence_tags?: string[];
  proposal_versions?: Array<{
    version: string;
    when: string;
    content: string[];
  }>;
  risks: string[];
  actions: string[];
  time_window: string;
  evidence_fold: string;
  paywall_modules: string[];
  llm_fallback: boolean;
  route_type: string;
  qualityScore?: number;
  schemaValid?: boolean;
  provider?: string;
  model?: string;
  retryCount?: number;
  fallbackReason?: string;
  algorithmEvidence?: AlgorithmEvidencePacket;
  record_id?: string;
  patternType?: string;
  strengthLevel?: string;
  课体?: string;
  三传?: any;
  monthlyFortune?: any[];
  bestMonths?: string[];
  worstMonths?: string[];
  modules?: { career: string; wealth: string; relationship: string; health: string };
  modulesRating?: { career: number; wealth: number; relationship: number; health: number };
  timeRhythm?: Array<{ period: string; phase: string; advice: string }>;
  stopDoingList?: string[];
  paiPanVerification?: string;
  mingjuGuJia?: string;
  classicAnalysis?: string;
  daYunTheme?: string;
  keyYearPhenomenon?: string;
  futureYearsRhythm?: Array<{ year: string; theme: string; advice: string }>;
  decisionAudit?: {
    rightOrWrong: string;
    safetyMargin: string;
    mvpPlan: string;
  };
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
  supplementaryNotes?: string;
  coreReasoning?: string;
  keySignals?: string[];
  timeWindows?: Array<{ period?: string; ganzhiDays?: string; suitable?: string; unsuitable?: string; fallback?: string }>;
  label?: string;
  ranking?: string;
  testScenarios?: string[];
  bazi?: any;
  wuxing_analysis?: any;
  xi_yong_shen?: any;
  name_suggestions?: any[];
  agent_confidence?: string;
  agent_uncertainty_factors?: string[];
  zhangbanshan_output?: {
    judgment: string;
    cost: string;
    reasoning_trace: string;
    primary_agent: string;
    secondary_agent?: string;
    schedule_reason: string;
    agent_consistency?: 'consistent' | 'undetermined' | 'conflicting';
    arbitration_note?: string;
  };
}

@Injectable()
export class LlmGatewayService {
  private readonly logger = new Logger(LlmGatewayService.name);

  constructor(
    private readonly zipingAgent: ZipingAgentService,
    private readonly liurenAgent: LiurenAgentService,
    private readonly qumingAgent: QumingAgentService,
    private readonly qimenAgent: QimenAgentService,
    private readonly liuyaoAgent: LiuyaoAgentService,
    private readonly ziweiAgent: ZiweiAgentService,
    private readonly llmProviders: LlmProvidersService,
  ) {}

  async generate(input: GatewayInput): Promise<GatewayOutput> {
    try {
      this.logger.log(`开始生成回复，路由类型: ${input.routeType}`);

      let result: GatewayOutput;

      switch (input.routeType) {
        case 'ziping':
          result = await this.handleZiping(input);
          break;
        case 'liuren':
          result = await this.handleLiuren(input);
          break;
        case 'quming':
          result = await this.handleQuming(input);
          break;
        case 'qimen':
          result = await this.handleQimen(input);
          break;
        case 'liuyao':
          result = await this.handleLiuyao(input);
          break;
        case 'ziwei':
          result = await this.handleZiwei(input);
          break;
        default:
          result = this.handleClarify(input);
      }

      result = this.enrichWithQualityMetadata(result, input, 0);
      this.logger.log('回复生成完成');
      return result;
    } catch (error) {
      this.logger.error('LLM Gateway 处理失败', error.stack);
      return this.getFallbackResult(input);
    }
  }

  async generateParallel(input: ParallelGatewayInput): Promise<ParallelGatewayOutput> {
    const primaryInput: GatewayInput = {
      routeType: input.primaryRouteType,
      calcResult: input.calcResult,
      inputData: input.inputData,
      lang: input.lang,
    };

    const tasks: Promise<{ key: string; output: GatewayOutput | null; failed: boolean }>[] = [
      this.dispatchAgent(primaryInput, input.primaryRouteType).then(output => ({
        key: 'primary',
        output,
        failed: false,
      })).catch(error => {
        this.logger.error(`[generateParallel] primary agent ${input.primaryRouteType} failed: ${error.message}`);
        return { key: 'primary', output: null, failed: true };
      }),
    ];

    if (input.secondaryRouteType) {
      const secondaryInput: GatewayInput = {
        routeType: input.secondaryRouteType,
        calcResult: input.calcResult,
        inputData: input.inputData,
        lang: input.lang,
      };
      tasks.push(
        this.dispatchAgent(secondaryInput, input.secondaryRouteType).then(output => ({
          key: 'secondary',
          output,
          failed: false,
        })).catch(error => {
          this.logger.error(`[generateParallel] secondary agent ${input.secondaryRouteType} failed: ${error.message}`);
          return { key: 'secondary', output: null, failed: true };
        }),
      );
    }

    const results = await Promise.all(tasks);

    const primaryResult = results.find(r => r.key === 'primary')!;
    const secondaryResult = results.find(r => r.key === 'secondary');

    const primaryOutput = primaryResult.output || this.getAgentFallbackForRoute(input.primaryRouteType, input);
    const secondaryOutput = secondaryResult?.output ?? undefined;

    const consistency = this.evaluateConsistency(
      primaryOutput,
      secondaryOutput,
      primaryResult.failed,
      secondaryResult?.failed ?? false,
    );

    this.logger.log(
      `[generateParallel] primary=${input.primaryRouteType}(failed=${primaryResult.failed})` +
      (input.secondaryRouteType ? ` secondary=${input.secondaryRouteType}(failed=${secondaryResult?.failed})` : '') +
      ` consistency=${consistency}`,
    );

    return {
      primary: primaryOutput,
      secondary: secondaryOutput,
      primaryFailed: primaryResult.failed,
      secondaryFailed: secondaryResult?.failed ?? false,
      consistency,
    };
  }

  private async dispatchAgent(input: GatewayInput, routeType: string): Promise<GatewayOutput> {
    switch (routeType) {
      case 'ziping':
      case 'zhangsheng':
        return this.handleZiping(input);
      case 'liuren':
        return this.handleLiuren(input);
      case 'quming':
        return this.handleQuming(input);
      case 'qimen':
        return this.handleQimen(input);
      case 'liuyao':
        return this.handleLiuyao(input);
      case 'ziwei':
        return this.handleZiwei(input);
      default:
        return this.handleClarify(input);
    }
  }

  private getAgentFallbackForRoute(routeType: string, input: ParallelGatewayInput): GatewayOutput {
    const gatewayInput: GatewayInput = {
      routeType: routeType as GatewayInput['routeType'],
      calcResult: input.calcResult,
      inputData: input.inputData,
      lang: input.lang,
    };
    return this.getFallbackResult(gatewayInput);
  }

  private evaluateConsistency(
    primary: GatewayOutput,
    secondary: GatewayOutput | undefined,
    primaryFailed: boolean,
    secondaryFailed: boolean,
  ): 'consistent' | 'undetermined' | 'conflicting' {
    if (!secondary) return 'consistent';
    if (primaryFailed || secondaryFailed) return 'undetermined';

    const pConf = primary.agent_confidence;
    const sConf = secondary.agent_confidence;

    if (pConf === '低' || sConf === '低') return 'undetermined';

    const pDirection = this.extractDirection(primary.summary_line);
    const sDirection = this.extractDirection(secondary.summary_line);

    if (pDirection && sDirection && pDirection !== sDirection) {
      if (pConf === '高' && sConf === '高') return 'conflicting';
      return 'undetermined';
    }

    return 'consistent';
  }

  private extractDirection(summaryLine: string): string | null {
    const positive = /宜|适合|可以|能|有利|可冲|可动|能成/;
    const negative = /忌|不宜|不适合|不能|不利|要收|要守|推迟|暂缓/;

    const posMatch = positive.test(summaryLine);
    const negMatch = negative.test(summaryLine);

    if (posMatch && !negMatch) return 'positive';
    if (negMatch && !posMatch) return 'negative';
    if (posMatch && negMatch) return 'mixed';
    return null;
  }

  private async handleZiping(input: GatewayInput): Promise<GatewayOutput> {
    const zipingInput: ZipingInput = {
      birthDate: input.inputData?.birthDate || '',
      birthTime: input.inputData?.birthTime || '',
      birthPlace: input.inputData?.birthPlace || '',
      gender: input.inputData?.gender || 'male',
      question: input.inputData?.question,
      lang: input.lang,
    };

    // 如果有已计算的八字数据（来自正确的Calculator），传入给LLM使用
    // P2-1 修复: 增加 yearPillar 字段检查，避免六壬/六爻等非八字路由传入空八字数据导致下游 TypeError
    if (input.calcResult?.calcData && input.calcResult.calcData.yearPillar) {
      zipingInput.preCalculatedBazi = {
        yearPillar: input.calcResult.calcData.yearPillar,
        monthPillar: input.calcResult.calcData.monthPillar,
        dayPillar: input.calcResult.calcData.dayPillar,
        hourPillar: input.calcResult.calcData.hourPillar,
        yearShishen: input.calcResult.calcData.yearShishen,
        monthShishen: input.calcResult.calcData.monthShishen,
        dayShishen: input.calcResult.calcData.dayShishen,
        hourShishen: input.calcResult.calcData.hourShishen,
        wuxing: input.calcResult.calcData.wuxing,
        naYin: input.calcResult.calcData.naYin,
        daYun: input.calcResult.calcData.daYun,
      };
    }

    const zipingResult: ZipingOutput = await this.zipingAgent.analyze(zipingInput);

    return {
      summary_line: zipingResult.summaryLine,
      summary_body: zipingResult.summaryBody,
      one_line_conclusion: zipingResult.oneLineConclusion || '',
      character_portrait: zipingResult.characterPortrait || '',
      risks: zipingResult.risks,
      actions: zipingResult.actions,
      time_window: zipingResult.timeWindow,
      evidence_fold: zipingResult.evidenceFold,
      paywall_modules: ['breakthrough', 'morning', 'kline'],
      llm_fallback: zipingResult.llmFallback || false,
      route_type: 'ziping',
      patternType: zipingResult.pattern?.patternName,
      strengthLevel: zipingResult.pattern?.strength,
      record_id: this.generateRecordId(),
      monthlyFortune: zipingResult.monthlyFortune,
      bestMonths: zipingResult.bestMonths,
      worstMonths: zipingResult.worstMonths,
      modules: zipingResult.modules,
      modulesRating: zipingResult.modulesRating,
      timeRhythm: zipingResult.timeRhythm,
      futureYearsRhythm: zipingResult.futureYearsRhythm,
      stopDoingList: zipingResult.stopDoingList,
      paiPanVerification: zipingResult.paiPanVerification,
      mingjuGuJia: zipingResult.mingjuGuJia,
      classicAnalysis: zipingResult.classicAnalysis,
      daYunTheme: zipingResult.daYunTheme,
      keyYearPhenomenon: zipingResult.keyYearPhenomenon,
      decisionAudit: zipingResult.decisionAudit,
      partnerPortrait: zipingResult.partnerPortrait,
      mvpPlan: zipingResult.mvpPlan,
      guardianGuidance: zipingResult.guardianGuidance,
      label: zipingResult.label,
      ranking: zipingResult.ranking,
      testScenarios: zipingResult.testScenarios,
      agent_confidence: zipingResult.confidence,
      agent_uncertainty_factors: zipingResult.uncertaintyFactors,
    };
  }

  private async handleLiuren(input: GatewayInput): Promise<GatewayOutput> {
    const liurenInput: LiurenInput = {
      askTime: input.inputData?.askTime || new Date().toISOString(),
      askLocation: input.inputData?.askLocation || '',
      question: input.inputData?.question || '',
      lang: input.lang,
    };

    const liurenResult: LiurenOutput = await this.liurenAgent.analyze(liurenInput);

    return {
      summary_line: liurenResult.summaryLine,
      summary_body: liurenResult.summaryBody,
      one_line_conclusion: liurenResult.oneLineConclusion || '',
      counterpart_portrait: liurenResult.counterpartPortrait || undefined,
      repositioning_strategy: liurenResult.repositioningStrategy || '',
      three_layer_advice: liurenResult.threeLayerAdvice || undefined,
      phased_calendar: liurenResult.phasedCalendar || undefined,
      scripts: liurenResult.scripts || undefined,
      success_signals: liurenResult.successSignals || undefined,
      failure_signals: liurenResult.failureSignals || undefined,
      proposal_versions: liurenResult.proposalVersions || undefined,
      action_strategy: liurenResult.actionStrategy || '',
      evidence_tags: liurenResult.evidenceTags || [],
      risks: liurenResult.currentRisks || liurenResult.risks || [],
      actions: liurenResult.nowDoThis || liurenResult.actions || [],
      time_window: liurenResult.timeWindow || '',
      evidence_fold: liurenResult.evidenceFold || '',
      paywall_modules: ['breakthrough', 'morning', 'kline'],
      llm_fallback: liurenResult.llmFallback || false,
      route_type: 'liuren',
      课体: liurenResult.lesson?.keTi,
      三传: liurenResult.lesson?.sanChuan,
      supplementaryNotes: liurenResult.supplementaryNotes || '',
      coreReasoning: liurenResult.judgmentBasis?.coreReasoning || '',
      keySignals: liurenResult.judgmentBasis?.keySignals || [],
      timeWindows: liurenResult.timeWindows || [],
      label: liurenResult.label || '',
      ranking: liurenResult.ranking || '',
      testScenarios: liurenResult.testScenarios || [],
      stopDoingList: liurenResult.nowDoNotDo || [],
      record_id: this.generateRecordId(),
      agent_confidence: liurenResult.confidence,
      agent_uncertainty_factors: liurenResult.uncertaintyFactors,
    };
  }

  /**
   * 处理取名请求
   */
  private async handleQuming(input: GatewayInput): Promise<GatewayOutput> {
    const qumingInput: QumingInput = {
      birthDate: input.inputData?.birthDate || '',
      birthTime: input.inputData?.birthTime || '',
      gender: input.inputData?.gender || 'male',
      lang: input.lang,
      surname: input.inputData?.surname,
      parentWishWords: input.inputData?.parentWish ? input.inputData.parentWish.split(/[,，]/).map(s => s.trim()).filter(Boolean) : undefined,
      avoidChars: input.inputData?.avoidChars,
    };

    const qumingResult: QumingOutput = await this.qumingAgent.analyze(qumingInput);

    return {
      summary_line: qumingResult.summaryLine,
      summary_body: qumingResult.summaryBody,
      risks: qumingResult.risks,
      actions: qumingResult.actions,
      time_window: '取名建议在出生后30天内完成登记',
      evidence_fold: `八字：${qumingResult.bazi.yearPillar}/${qumingResult.bazi.monthPillar}/${qumingResult.bazi.dayPillar}/${qumingResult.bazi.hourPillar}`,
      paywall_modules: ['morning'],
      llm_fallback: qumingResult.llmFallback || false,
      route_type: 'quming',
      // 取名专用数据
      bazi: qumingResult.bazi,
      wuxing_analysis: qumingResult.wuxingAnalysis,
      xi_yong_shen: qumingResult.xiYongShen,
      name_suggestions: qumingResult.nameSuggestions,
      record_id: this.generateRecordId(),
      agent_confidence: qumingResult.confidence,
      agent_uncertainty_factors: qumingResult.uncertaintyFactors,
    };
  }

  private async handleQimen(input: GatewayInput): Promise<GatewayOutput> {
    const askTime = input.inputData?.askTime || new Date().toISOString();
    const dt = new Date(askTime);

    const qimenInput: QimenInput = {
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      hour: dt.getHours(),
      minute: dt.getMinutes(),
      askTime,
      askLocation: input.inputData?.askLocation,
      question: input.inputData?.question,
      lang: input.lang,
    };

    const qimenResult: QimenOutput = await this.qimenAgent.analyze(qimenInput);

    return {
      summary_line: qimenResult.summaryLine,
      summary_body: qimenResult.summaryBody,
      risks: qimenResult.risks,
      actions: qimenResult.actions,
      time_window: qimenResult.timeWindow,
      evidence_fold: qimenResult.evidenceFold,
      paywall_modules: ['breakthrough', 'morning', 'kline'],
      llm_fallback: qimenResult.llmFallback || false,
      route_type: 'qimen',
      record_id: this.generateRecordId(),
      coreReasoning: qimenResult.coreReasoning,
      keySignals: qimenResult.keySignals,
      timeWindows: qimenResult.timeWindows,
      action_strategy: qimenResult.actionStrategy,
      evidence_tags: qimenResult.evidenceTags,
      agent_confidence: qimenResult.confidence,
      agent_uncertainty_factors: qimenResult.uncertaintyFactors,
    };
  }

  private async handleLiuyao(input: GatewayInput): Promise<GatewayOutput> {
    const askTime = input.inputData?.askTime || new Date().toISOString();
    const dt = new Date(askTime);

    const liuyaoInput: LiuyaoInput = {
      askTime,
      question: input.inputData?.question,
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      hour: dt.getHours(),
      minute: dt.getMinutes(),
      lang: input.lang,
    };

    const liuyaoResult: LiuyaoOutput = await this.liuyaoAgent.analyze(liuyaoInput);

    return {
      summary_line: liuyaoResult.summaryLine,
      summary_body: liuyaoResult.summaryBody,
      risks: liuyaoResult.risks,
      actions: liuyaoResult.actions,
      time_window: liuyaoResult.timeWindow,
      evidence_fold: liuyaoResult.evidenceFold,
      paywall_modules: ['breakthrough', 'morning', 'kline'],
      llm_fallback: liuyaoResult.llmFallback || false,
      route_type: 'liuyao',
      record_id: this.generateRecordId(),
      agent_confidence: liuyaoResult.confidence,
      agent_uncertainty_factors: liuyaoResult.uncertaintyFactors,
    };
  }

  private async handleZiwei(input: GatewayInput): Promise<GatewayOutput> {
    const ziweiInput: ZiweiInput = {
      birthDate: input.inputData?.birthDate || '',
      birthTime: input.inputData?.birthTime || '',
      gender: input.inputData?.gender || 'male',
      birthPlace: input.inputData?.birthPlace,
      question: input.inputData?.question,
      lang: input.lang,
    };

    const ziweiResult: ZiweiOutput = await this.ziweiAgent.analyze(ziweiInput);

    return {
      summary_line: ziweiResult.summaryLine,
      summary_body: ziweiResult.summaryBody,
      risks: ziweiResult.risks,
      actions: ziweiResult.actions,
      time_window: ziweiResult.timeWindow,
      evidence_fold: ziweiResult.evidenceFold,
      paywall_modules: ['breakthrough', 'morning', 'kline'],
      llm_fallback: ziweiResult.llmFallback || false,
      route_type: 'ziwei',
      record_id: this.generateRecordId(),
      agent_confidence: ziweiResult.confidence,
      agent_uncertainty_factors: ziweiResult.uncertaintyFactors,
    };
  }

  private handleClarify(_input: GatewayInput): GatewayOutput {
    return {
      summary_line: '您的问题比较宽泛，能否具体说明？',
      summary_body:
        '您的问题可以从事态走向或整体运势两个角度来分析。请告诉我您更关注哪一方面？',
      risks: ['问题不够具体可能影响判断精度'],
      actions: [
        '明确是想了解某件事的走向',
        '还是想看整体运势趋势',
      ],
      time_window: '',
      evidence_fold:
        '需要更明确的问题方向才能给出精准的命理/断事推演分析。',
      paywall_modules: ['澄清追问'],
      llm_fallback: true,
      route_type: 'clarify',
      record_id: this.generateRecordId(),
    };
  }

  private getFallbackResult(input: GatewayInput): GatewayOutput {
    const evidence = this.buildAlgorithmEvidence(input);
    const routeType = input.routeType;

    return {
      summary_line: evidence.summary || '已完成算法推演，建议先看保守结论',
      summary_body: evidence.summary
        ? `后台算法已完成基础判断：${evidence.summary}。当前语义渲染不可用，本次先给出可参考的简版结论。`
        : '后台算法已完成基础推演，但语义渲染暂时不可用。本次建议先按保守策略处理，待服务恢复后再生成完整解读。',
      risks: ['语义分析未完成，细节建议需二次确认'],
      actions: ['先保存本次排盘结果', '按证据标签核对关键时间与场景', '避免把简版结论当作唯一依据'],
      time_window: this.extractTimeWindowFromEvidence(evidence),
      evidence_fold: evidence.evidenceTags.slice(0, 3).join('、') || '算法证据',
      paywall_modules: ['morning', 'kline'],
      llm_fallback: true,
      route_type: routeType,
      qualityScore: 45,
      schemaValid: true,
      provider: 'fallback',
      model: 'algorithm-template',
      retryCount: 0,
      fallbackReason: 'llm_gateway_error',
      algorithmEvidence: evidence,
      record_id: this.generateRecordId(),
    };
  }

  private enrichWithQualityMetadata(
    result: GatewayOutput,
    input: GatewayInput,
    retryCount: number,
  ): GatewayOutput {
    const evidence = this.buildAlgorithmEvidence(input);
    const schemaValid = this.validateOutputSchema(result, input.routeType);
    const qualityScore = this.scoreOutputQuality(result, evidence, schemaValid);
    const providerInfo = this.llmProviders.getDefaultProviderInfo();

    return {
      ...result,
      qualityScore,
      schemaValid,
      provider: result.provider || (result.llm_fallback ? 'fallback' : providerInfo.provider),
      model: result.model || (result.llm_fallback ? 'algorithm-template' : providerInfo.model),
      retryCount,
      fallbackReason: result.llm_fallback ? result.fallbackReason || 'agent_fallback' : undefined,
      algorithmEvidence: evidence,
      evidence_fold: result.evidence_fold || evidence.evidenceTags.slice(0, 3).join('、'),
    };
  }

  private validateOutputSchema(result: GatewayOutput, routeType: GatewayInput['routeType']): boolean {
    const requiredBase = [
      result.summary_line,
      result.summary_body,
      Array.isArray(result.risks) ? result.risks.length : 0,
      Array.isArray(result.actions) ? result.actions.length : 0,
    ];
    const baseValid = requiredBase.every(Boolean);

    if (routeType === 'liuren') {
      return baseValid
        && !!result.coreReasoning
        && Array.isArray(result.keySignals) && result.keySignals.length >= 2
        && Array.isArray(result.timeWindows) && result.timeWindows.length >= 2
        && result.timeWindows.every((window) => !!window.ganzhiDays)
        && Array.isArray(result.evidence_tags) && result.evidence_tags.length >= 3
        && !!result.action_strategy;
    }

    if (routeType === 'ziping') {
      return baseValid
        && !!result.classicAnalysis
        && !!result.daYunTheme
        && !!result.keyYearPhenomenon
        && Array.isArray(result.futureYearsRhythm) && result.futureYearsRhythm.length >= 3
        && !!result.modules
        && !!result.modulesRating
        && !!result.decisionAudit
        && !!result.mvpPlan
        && Array.isArray(result.stopDoingList) && result.stopDoingList.length >= 3
        && (result.classicAnalysis.includes('[ZP-') || result.evidence_fold.includes('ZP-'));
    }

    if (routeType === 'quming') {
      return baseValid && !!result.bazi;
    }

    return baseValid;
  }

  private scoreOutputQuality(
    result: GatewayOutput,
    evidence: AlgorithmEvidencePacket,
    schemaValid: boolean,
  ): number {
    let score = schemaValid ? 60 : 35;
    if (result.summary_line && result.summary_line.length <= 40) score += 8;
    if (result.summary_body && result.summary_body.length >= 60) score += 8;
    if (result.evidence_fold || evidence.evidenceTags.length > 0) score += 10;
    if (Array.isArray(result.risks) && result.risks.length >= 2) score += 7;
    if (Array.isArray(result.actions) && result.actions.length >= 2) score += 7;
    if (result.route_type === 'ziping') {
      if (result.classicAnalysis?.includes('[ZP-')) score += 8;
      if (result.decisionAudit && result.mvpPlan) score += 8;
      if (Array.isArray(result.futureYearsRhythm) && result.futureYearsRhythm.length >= 3) score += 5;
      if (Array.isArray(result.stopDoingList) && result.stopDoingList.length >= 3) score += 4;
    }
    if (result.route_type === 'liuren') {
      if (Array.isArray(result.keySignals) && result.keySignals.length >= 2) score += 8;
      if (Array.isArray(result.timeWindows) && result.timeWindows.length >= 2) score += 6;
      if (Array.isArray(result.evidence_tags) && result.evidence_tags.some((tag) => tag.includes('[LR-'))) score += 8;
      if (result.action_strategy) score += 4;
    }
    // 一句话总断质量检测
    if (result.summary_line) {
      const sl = result.summary_line;
      // 排比/对仗结构加分（包含顿号分隔的多个短句）
      const parallelCount = (sl.match(/、/g) || []).length;
      if (parallelCount >= 2) score += 5;
      // 长度适中加分（15-50字最佳）
      if (sl.length >= 15 && sl.length <= 50) score += 5;
      // 有行动指向加分
      if (/宜|忌|适合|不要|不能|应该|可冲|要收|要守/.test(sl)) score += 5;
      // 空泛词扣分
      const vagueWords = ['保持努力', '未来可期', '注意沟通', '相信自己', '一切顺利', '顺其自然'];
      for (const w of vagueWords) {
        if (sl.includes(w)) { score -= 15; break; }
      }
    }

    if (result.llm_fallback) score -= 20;
    return Math.max(0, Math.min(100, score));
  }

  private buildAlgorithmEvidence(input: GatewayInput): AlgorithmEvidencePacket {
    const calcData = input.calcResult?.calcData || input.calcResult?.bazi || input.calcResult;
    const tags: string[] = [];

    if (calcData?.yearPillar || calcData?.monthPillar || calcData?.dayPillar || calcData?.hourPillar) {
      tags.push(
        ...[
          calcData.yearPillar && `年柱${calcData.yearPillar}`,
          calcData.monthPillar && `月柱${calcData.monthPillar}`,
          calcData.dayPillar && `日柱${calcData.dayPillar}`,
          calcData.hourPillar && `时柱${calcData.hourPillar}`,
        ].filter(Boolean),
      );
    }

    if (calcData?.daYun?.length) {
      const current = calcData.daYun[0];
      tags.push(`大运${current.full || `${current.gan || ''}${current.zhi || ''}`}`);
    }

    if (calcData?.wuxing) {
      const wuxing = calcData.wuxing;
      tags.push(`五行木${wuxing.wood || 0}火${wuxing.fire || 0}土${wuxing.earth || 0}金${wuxing.metal || 0}水${wuxing.water || 0}`);
    }

    if (calcData?.lesson?.keTi || calcData?.keTi) tags.push(`课体${calcData.lesson?.keTi || calcData.keTi}`);
    if (calcData?.lesson?.sanChuan || calcData?.sanChuan) tags.push('三传成局');
    if (Array.isArray(input.calcResult?.evidence_tags)) tags.push(...input.calcResult.evidence_tags);

    const summary = tags.slice(0, 4).join('，');
    return {
      routeType: input.routeType,
      summary,
      evidenceTags: [...new Set(tags)].slice(0, 12),
      raw: calcData ? {
        routeType: input.routeType,
        question: input.inputData?.question,
      } : undefined,
    };
  }

  private extractTimeWindowFromEvidence(evidence: AlgorithmEvidencePacket): string {
    const dayunTag = evidence.evidenceTags.find((tag) => tag.includes('大运'));
    return dayunTag ? `${dayunTag}阶段` : '';
  }

  private generateRecordId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getAgentStatus(): Promise<{
    ziping: boolean;
    liuren: boolean;
    quming: boolean;
    timestamp: string;
  }> {
    return {
      ziping: !!this.zipingAgent,
      liuren: !!this.liurenAgent,
      quming: !!this.qumingAgent,
      timestamp: new Date().toISOString(),
    };
  }
}
