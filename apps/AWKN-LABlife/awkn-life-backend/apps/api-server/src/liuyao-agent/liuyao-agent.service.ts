import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { dayan, manualQiGua, decodePan, getGuaName, getZhiGua, getMovingYaoPositions } from 'iching-shifa';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { RuleEngineService } from '../shared/rule-engine/rule-engine.service';
import { StructuredConclusion } from '../shared/rule-engine/rule-types';
import { BARNUM_PHRASES } from '../shared/constants/barnum-phrases';

export interface LiuyaoInput {
  askTime?: string;
  question?: string;
  hexagramCode?: string;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  lang?: string;
}

export interface LiuyaoYaoData {
  position: number;
  yaoValue: number;
  isMoving: boolean;
  tianGan: string;
  diZhi: string;
  naJia: string;
  wuXing: string;
  liuQin: string;
  liuShou: string;
  shiYing: string;
}

export interface LiuyaoGuaPan {
  guaName: string;
  palace: string;
  palaceWuXing: string;
  palaceLevel: string;
  wuXingStar: string;
  yaoList: LiuyaoYaoData[];
  guaCi: string;
  yaoCi: string[];
  tuanCi: string;
  shenYao?: number;
  fuShen?: Array<{
    fuLiuQin: string;
    fuNaJia: string;
    fuWuXing: string;
    hostYaoIndex: number;
    hostNaJia: string;
    feiWuXing: string;
    relation: string;
  }>;
}

export interface LiuyaoResult {
  yaoString: string;
  benGua: LiuyaoGuaPan;
  zhiGua: LiuyaoGuaPan;
  huGua: LiuyaoGuaPan;
  dongYaoCount: number;
  movingYaoPositions: number[];
  ganZhiYear: { tian: string; di: string; gz: string };
  ganZhiMonth: { tian: string; di: string; gz: string };
  ganZhiDay: { tian: string; di: string; gz: string };
  ganZhiHour: { tian: string; di: string; gz: string };
  dayKong: string;
  hourKong: string;
  monthJian: string;
  solarTerm: string;
  lunarDate: { year: number; month: number; day: number; isLeap: boolean };
}

export interface LiuyaoOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  risks: string[];
  actions: string[];
  timeWindow: string;
  evidenceFold: string;
  llmFallback?: boolean;
  ruleEngineResult?: StructuredConclusion;
  paipanData: LiuyaoResult;
}

@Injectable()
export class LiuyaoAgentService {
  private readonly logger = new Logger(LiuyaoAgentService.name);
  private systemPrompt: string = '';
  private systemPromptEn: string = '';
  private analysisPrompt: string = '';

  constructor(
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
    @Optional() private readonly ruleEngine?: RuleEngineService,
  ) {}

  onModuleInit() {
    this.loadSystemPrompt();
    this.loadAnalysisPrompt();
    if (this.llmProviders?.isConfigured()) {
      this.logger.log('✅ LiuyaoAgent LLM 已配置，可进行真实语义分析');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用模板兜底逻辑');
    }
  }

  private loadSystemPrompt(): void {
    try {
      const promptPath = join(__dirname, 'prompts', 'liuyao-system-prompt.md');
      this.systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch {
      this.systemPrompt = this.getDefaultPrompt();
    }
    try {
      const promptPathEn = join(__dirname, 'prompts', 'liuyao-system-prompt-en.md');
      this.systemPromptEn = readFileSync(promptPathEn, 'utf-8');
    } catch {
      this.systemPromptEn = 'You are a master Liu Yao (Six Lines) divination analyst. Analyze the hexagram data provided and output a structured JSON with all text in English. Be specific, avoid vague statements.';
    }
  }

  private loadAnalysisPrompt(): void {
    this.analysisPrompt = `请根据以下六爻排盘结果，进行事件决策分析。

【问事信息】
问题：{{question}}
问事时间：{{askTime}}

【卦象信息】
本卦：{{benGuaName}}（{{benGuaPalace}}宫{{benGuaLevel}}）
变卦：{{zhiGuaName}}
动爻数：{{dongYaoCount}}
旬空：{{dayKong}}

【本卦六爻】
{{benGuaYaoDetail}}

【变卦六爻】
{{zhiGuaYaoDetail}}

请按以下结构输出分析结果（严格遵守JSON格式，不要输出其他内容）：
{
  "summaryLine": "一句话定性，直接回答用户问题，控制在20字以内",
  "summaryBody": "详细分析，150字以内，涵盖用神、原神、忌神判断及吉凶定性",
  "risks": ["风险1", "风险2"],
  "actions": ["建议动作1", "建议动作2"],
  "timeWindow": "时间窗口，如：7-14天内、3个月内",
  "evidenceFold": "判断依据，简写推演过程"
}`;
  }

  private getDefaultPrompt(): string {
    return `你是"六爻决策宗师"。你的职责是根据问事时间起卦排盘，通过纳甲体系判断用神旺衰、原忌仇神关系，断定事件吉凶与应对策略。输出遵守：结论先行、清晰优先、事实→含义→建议。`;
  }

  paipan(input: LiuyaoInput): LiuyaoResult {
    const askTime = input.askTime ? new Date(input.askTime) : new Date();
    const year = input.year || askTime.getFullYear();
    const month = input.month || askTime.getMonth() + 1;
    const day = input.day || askTime.getDate();
    const hour = input.hour || askTime.getHours();
    const minute = input.minute || askTime.getMinutes();

    let yaoString: string;
    if (input.hexagramCode && /^[6-9]{6}$/.test(input.hexagramCode)) {
      yaoString = manualQiGua(input.hexagramCode);
    } else {
      yaoString = dayan();
    }

    const panResult = decodePan(yaoString, { year, month, day, hour, minute });

    const mapGuaPan = (gua: any): LiuyaoGuaPan => ({
      guaName: gua.guaName || '',
      palace: gua.palace || '',
      palaceWuXing: gua.palaceWuXing || '',
      palaceLevel: gua.palaceLevel || '',
      wuXingStar: gua.wuXingStar || '',
      yaoList: (gua.yaoList || []).map((y: any) => ({
        position: y.position,
        yaoValue: y.yaoValue,
        isMoving: y.isMoving,
        tianGan: y.tianGan || '',
        diZhi: y.diZhi || '',
        naJia: y.naJia || '',
        wuXing: y.wuXing || '',
        liuQin: y.liuQin || '',
        liuShou: y.liuShou || '',
        shiYing: y.shiYing || '',
      })),
      guaCi: gua.guaCi || '',
      yaoCi: gua.yaoCi || [],
      tuanCi: gua.tuanCi || '',
      shenYao: gua.shenYao,
      fuShen: (gua.fuShen || []).map((f: any) => ({
        fuLiuQin: f.fuLiuQin || '',
        fuNaJia: f.fuNaJia || '',
        fuWuXing: f.fuWuXing || '',
        hostYaoIndex: f.hostYaoIndex ?? 0,
        hostNaJia: f.hostNaJia || '',
        feiWuXing: f.feiWuXing || '',
        relation: f.relation || '',
      })),
    });

    const movingPositions = getMovingYaoPositions(yaoString);

    return {
      yaoString,
      benGua: mapGuaPan(panResult.benGua),
      zhiGua: mapGuaPan(panResult.zhiGua),
      huGua: mapGuaPan(panResult.huGua),
      dongYaoCount: panResult.dongYaoCount ?? movingPositions.length,
      movingYaoPositions: movingPositions,
      ganZhiYear: panResult.ganZhiYear ? { tian: panResult.ganZhiYear.tian || '', di: panResult.ganZhiYear.di || '', gz: panResult.ganZhiYear.gz || '' } : { tian: '', di: '', gz: '' },
      ganZhiMonth: panResult.ganZhiMonth ? { tian: panResult.ganZhiMonth.tian || '', di: panResult.ganZhiMonth.di || '', gz: panResult.ganZhiMonth.gz || '' } : { tian: '', di: '', gz: '' },
      ganZhiDay: panResult.ganZhiDay ? { tian: panResult.ganZhiDay.tian || '', di: panResult.ganZhiDay.di || '', gz: panResult.ganZhiDay.gz || '' } : { tian: '', di: '', gz: '' },
      ganZhiHour: panResult.ganZhiHour ? { tian: panResult.ganZhiHour.tian || '', di: panResult.ganZhiHour.di || '', gz: panResult.ganZhiHour.gz || '' } : { tian: '', di: '', gz: '' },
      dayKong: panResult.dayKong || '',
      hourKong: panResult.hourKong || '',
      monthJian: panResult.monthJian || '',
      solarTerm: panResult.solarTerm || '',
      lunarDate: panResult.lunarDate || { year, month, day, isLeap: false },
    };
  }

  async analyze(input: LiuyaoInput): Promise<LiuyaoOutput> {
    try {
      const startTime = Date.now();

      const paipanData = this.paipan(input);

      let structuredConclusion: StructuredConclusion | undefined;
      if (this.ruleEngine) {
        try {
          const facts = this.extractLiuyaoFacts(input, paipanData);
          const matchedRules = this.ruleEngine.evaluateAll(facts);
          structuredConclusion = this.ruleEngine.buildStructuredConclusion('六爻', matchedRules, facts);
          this.logger.log(`[LiuyaoAgent] 规则引擎触发: ${structuredConclusion.jixiong}，${structuredConclusion.triggeredShensha.length}神煞，${structuredConclusion.triggeredPatterns.length}格局`);
        } catch (ruleErr) {
          this.logger.warn(`[LiuyaoAgent] 规则引擎失败，降级到LLM直推: ${(ruleErr as Error).message}`);
        }
      }

      let result: Omit<LiuyaoOutput, 'paipanData'>;

      if (this.llmProviders?.isConfigured()) {
        try {
          result = await this.analyzeWithLLM(input, paipanData, structuredConclusion);
          this.logger.log(`[LiuyaoAgent] LLM分析成功，耗时${Date.now() - startTime}ms`);
        } catch (llmErr) {
          this.logger.warn(`[LiuyaoAgent] LLM失败，降级到模板: ${(llmErr as Error).message}`);
          result = this.generateAnalysis(input, paipanData);
        }
      } else {
        result = this.generateAnalysis(input, paipanData);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`六爻分析完成，耗时 ${duration}ms`);

      return {
        ...result,
        paipanData,
        ruleEngineResult: structuredConclusion,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('六爻分析失败', err.stack);
      return this.getFallbackResult(input);
    }
  }

  private readonly requiredFields = ['summaryLine', 'summaryBody', 'risks', 'actions'];

  private async analyzeWithLLM(
    input: LiuyaoInput,
    paipanData: LiuyaoResult,
    structuredConclusion?: StructuredConclusion,
  ): Promise<Omit<LiuyaoOutput, 'paipanData'>> {
    const isEn = input.lang === 'en' || input.lang?.startsWith('en');

    const formatYaoDetail = (gua: LiuyaoGuaPan): string => {
      return gua.yaoList.map((y) => {
        const parts = [`${y.position}爻：${y.naJia}（${y.liuQin}·${y.liuShou}）`];
        if (y.isMoving) parts.push('○动');
        parts.push(`五行${y.wuXing}`);
        if (y.shiYing === '世') parts.push('世');
        if (y.shiYing === '應') parts.push('应');
        return parts.join(' ');
      }).join('\n');
    };

    const benGuaYaoDetail = formatYaoDetail(paipanData.benGua);
    const zhiGuaYaoDetail = formatYaoDetail(paipanData.zhiGua);

    const userPrompt = this.analysisPrompt
      .replace('{{question}}', input.question || '')
      .replace('{{askTime}}', input.askTime || `${paipanData.ganZhiYear.gz}年${paipanData.ganZhiMonth.gz}月${paipanData.ganZhiDay.gz}日${paipanData.ganZhiHour.gz}时`)
      .replace('{{benGuaName}}', paipanData.benGua.guaName)
      .replace('{{benGuaPalace}}', paipanData.benGua.palace)
      .replace('{{benGuaLevel}}', paipanData.benGua.palaceLevel)
      .replace('{{zhiGuaName}}', paipanData.zhiGua.guaName)
      .replace('{{dongYaoCount}}', String(paipanData.dongYaoCount))
      .replace('{{dayKong}}', paipanData.dayKong)
      .replace('{{benGuaYaoDetail}}', benGuaYaoDetail)
      .replace('{{zhiGuaYaoDetail}}', zhiGuaYaoDetail);

    const systemPrompt = isEn ? this.systemPromptEn : this.systemPrompt;

    const ruleEngineBlock = structuredConclusion ? this.formatRuleEngineBlock(structuredConclusion) : '';
    const finalPrompt = ruleEngineBlock
      ? `${userPrompt}\n\n【规则引擎结构化判定（LLM请翻译为自然语言，不要自行推理规则）】\n${ruleEngineBlock}`
      : userPrompt;

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
        this.logger.warn(`[LiuyaoAgent] LLM输出含巴纳姆空泛表达（attempt ${attempt + 1}），降级到模板`);
        return this.generateAnalysis(input, paipanData);
      }

      const missingFields = this.requiredFields.filter(
        (f) => !parsed[f] || (Array.isArray(parsed[f]) && parsed[f].length === 0)
      );
      if (missingFields.length === 0) {
        lastParsed = parsed;
        break;
      }

      this.logger.warn(`[LiuyaoAgent] LLM输出缺少字段: ${missingFields.join('、')}（attempt ${attempt + 1}）`);
      lastParsed = parsed;

      if (attempt >= 2) break;
    }

    if (!lastParsed) {
      this.logger.warn('[LiuyaoAgent] LLM多次重试仍无有效输出，降级到模板');
      return this.generateAnalysis(input, paipanData);
    }

    return {
      summaryLine: lastParsed.summaryLine || '六爻分析完成',
      summaryBody: lastParsed.summaryBody || '',
      risks: Array.isArray(lastParsed.risks) ? lastParsed.risks : [],
      actions: Array.isArray(lastParsed.actions) ? lastParsed.actions : [],
      timeWindow: lastParsed.timeWindow || '',
      evidenceFold: lastParsed.evidenceFold || '',
      llmFallback: false,
    };
  }

  private extractLiuyaoFacts(
    input: LiuyaoInput,
    paipanData: LiuyaoResult,
  ): Record<string, unknown> {
    const question = input.question || '';
    const { benGua, zhiGua, dongYaoCount, movingYaoPositions, ganZhiMonth } = paipanData;

    const questionCategory = this.detectQuestionCategory(question);

    const yongShen = this.findYongShen(question, benGua);
    const yongShenYao = benGua.yaoList.find((y) => y.liuQin === yongShen);

    const monthZhi = ganZhiMonth.di;
    const monthWuXing = this.zhiWuXing(monthZhi);
    const yongShenWuXing = yongShenYao?.wuXing || '';
    const yongShenMonth = this.computeWuXingRelation(yongShenWuXing, monthWuXing);

    const shiYao = benGua.yaoList.find((y) => y.shiYing === '世');
    const shiYaoActive = shiYao && movingYaoPositions.includes(shiYao.position) ? 'true' : 'false';

    const guaType = this.detectGuaType(benGua.guaName);

    return {
      questionCategory,
      yongShen,
      yongShenMonth,
      shiYaoActive,
      guaType,
      dongYaoCount: String(dongYaoCount),
      benGuaName: benGua.guaName,
      zhiGuaName: zhiGua.guaName,
      benGuaPalace: benGua.palace,
    };
  }

  private detectQuestionCategory(question: string): string {
    if (/财|钱|投资|收益|工资|薪|利润/.test(question)) return '财运';
    if (/官|职|升|考|试|事业|工作|面试/.test(question)) return '事业';
    if (/病|医|身体|健康|疾/.test(question)) return '健康';
    if (/婚|恋|感情|对象|桃花|老公|老婆|男友|女友/.test(question)) return '感情';
    if (/子|孩|学|考试|升学/.test(question)) return '考试';
    if (/房|车|父|母|长辈|文书|合同/.test(question)) return '考试';
    if (/出行|旅行|远行|旅游/.test(question)) return '出行';
    return '一般';
  }

  private readonly WU_XING = ['木', '火', '土', '金', '水'];

  private readonly ZHI_WU_XING_MAP: Record<string, string> = {
    '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火',
    '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水', '子': '水', '丑': '土',
  };

  private zhiWuXing(zhi: string): string {
    return this.ZHI_WU_XING_MAP[zhi] || '';
  }

  private computeWuXingRelation(subjectWx: string, referenceWx: string): string {
    if (!subjectWx || !referenceWx) return '平';
    if (subjectWx === referenceWx) return '旺';
    const shengSeq: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    if (shengSeq[referenceWx] === subjectWx) return '相';
    if (shengSeq[subjectWx] === referenceWx) return '休';
    const keSeq: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
    if (keSeq[subjectWx] === referenceWx) return '囚';
    if (keSeq[referenceWx] === subjectWx) return '死';
    return '平';
  }

  private readonly LIU_HE_GUA = new Set([
    '天地否', '地天泰', '水泽节', '泽水困', '山火贲', '火山旅', '雷风恒', '风雷益',
  ]);
  private readonly LIU_CHONG_GUA = new Set([
    '乾为天', '兑为泽', '离为火', '震为雷', '巽为风', '坎为水', '艮为山', '坤为地',
    '天雷无妄', '雷天大壮',
  ]);
  private readonly YOU_HUN_GUA = new Set([
    '火地晋', '地火明夷', '风泽中孚', '泽风大过', '山雷颐', '天水讼', '水天需', '雷山小过',
  ]);
  private readonly GUI_HUN_GUA = new Set([
    '火天大有', '地水师', '风山渐', '泽雷随', '山风蛊', '天火同人', '水地比', '雷泽归妹',
  ]);

  private detectGuaType(guaName: string): string {
    if (this.LIU_HE_GUA.has(guaName)) return '六合卦';
    if (this.LIU_CHONG_GUA.has(guaName)) return '六冲卦';
    if (this.YOU_HUN_GUA.has(guaName)) return '游魂卦';
    if (this.GUI_HUN_GUA.has(guaName)) return '归魂卦';
    return '';
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
    if (!content) return {};

    let cleaned = content.trim();
    const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (mdMatch) {
      cleaned = mdMatch[1].trim();
    }

    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) return {};

    const sub = cleaned.substring(firstBrace);
    const lastBrace = sub.lastIndexOf('}');
    if (lastBrace === -1) return {};

    const jsonCandidate = sub.substring(0, lastBrace + 1);

    try {
      return JSON.parse(jsonCandidate);
    } catch {
      for (let end = sub.lastIndexOf('}'); end > 0; end = sub.lastIndexOf('}', end - 1)) {
        try {
          return JSON.parse(sub.substring(0, end + 1));
        } catch {
          continue;
        }
      }
      return {};
    }
  }

  private containsBannedBarnumText(parsed: Record<string, any>): boolean {
    const text = JSON.stringify(parsed);
    return BARNUM_PHRASES.some((phrase) => text.includes(phrase));
  }

  private generateAnalysis(
    input: LiuyaoInput,
    paipanData: LiuyaoResult,
  ): Omit<LiuyaoOutput, 'paipanData'> {
    const question = input.question || '';
    const { benGua, zhiGua, dongYaoCount, movingYaoPositions, dayKong } = paipanData;

    const shiYao = benGua.yaoList.find((y) => y.shiYing === '世');
    const yingYao = benGua.yaoList.find((y) => y.shiYing === '應');

    const yongShen = this.findYongShen(question, benGua);
    const yongShenYao = benGua.yaoList.find((y) => y.liuQin === yongShen);

    const isAuspicious = yongShenYao && !yongShenYao.isMoving;

    const dongYaoText = movingYaoPositions.length > 0
      ? `动爻在第${movingYaoPositions.join('、')}爻`
      : '无动爻';

    const summaryLine = isAuspicious
      ? `${benGua.guaName}之${zhiGua.guaName}，用神${yongShen}得位，事可成。`
      : `${benGua.guaName}之${zhiGua.guaName}，用神${yongShen}${yongShenYao?.isMoving ? '动而失势' : '不得位'}，需审慎。`;

    const summaryBody = [
      `本卦${benGua.guaName}（${benGua.palace}宫${benGua.palaceLevel}），变卦${zhiGua.guaName}。`,
      `用神取${yongShen}，${yongShenYao ? `${yongShenYao.naJia}临${yongShenYao.position}爻` : '未明'}。`,
      shiYao ? `世爻${shiYao.naJia}（${shiYao.liuQin}），` : '',
      yingYao ? `应爻${yingYao.naJia}（${yingYao.liuQin}）。` : '',
      `${dongYaoText}，旬空${dayKong}。`,
    ].filter(Boolean).join('');

    const risks: string[] = [];
    if (dayKong) risks.push(`旬空${dayKong}，空亡之爻力量减半`);
    if (yongShenYao?.isMoving) risks.push('用神动而变，事有反复');

    const jiShen = this.findJiShen(yongShen);
    const jiShenYao = benGua.yaoList.find((y) => y.liuQin === jiShen);
    if (jiShenYao) risks.push(`忌神${jiShen}临${jiShenYao.position}爻，有阻碍之象`);

    if (risks.length === 0) risks.push('需结合具体情境分析');

    const actions: string[] = [];
    if (isAuspicious) {
      actions.push('用神得力，可主动推进');
      actions.push('把握当前时机，不宜拖延');
    } else {
      actions.push('用神不力，宜缓不宜急');
      actions.push('待用神旺相之时再行推进');
    }
    if (dayKong) actions.push('出空之日为行动窗口');

    return {
      summaryLine,
      summaryBody,
      risks,
      actions,
      timeWindow: dongYaoCount > 0 ? '动爻变后7-14天内应期' : '静卦以月令旺衰判断应期',
      evidenceFold: `本卦${benGua.guaName}、变卦${zhiGua.guaName}、用神${yongShen}、${dongYaoText}、旬空${dayKong}`,
      llmFallback: true,
    };
  }

  private findYongShen(question: string, benGua: LiuyaoGuaPan): string {
    if (/财|钱|投资|收益|工资|薪|利润/.test(question)) return '妻财';
    if (/官|职|升|考|试|事业|工作|面试/.test(question)) return '官鬼';
    if (/病|医|身体|健康|疾/.test(question)) return '官鬼';
    if (/婚|恋|感情|对象|桃花|老公|老婆|男友|女友/.test(question)) return '妻财';
    if (/子|孩|学|考试|升学/.test(question)) return '子孙';
    if (/房|车|父|母|长辈|文书|合同/.test(question)) return '父母';
    const shiYao = benGua.yaoList.find((y) => y.shiYing === '世');
    return shiYao?.liuQin || '兄弟';
  }

  private findJiShen(yongShen: string): string {
    const map: Record<string, string> = {
      '父母': '子孙',
      '兄弟': '官鬼',
      '官鬼': '子孙',
      '妻财': '兄弟',
      '子孙': '父母',
    };
    return map[yongShen] || '兄弟';
  }

  private getFallbackResult(input: LiuyaoInput): LiuyaoOutput {
    return {
      summaryLine: '系统暂时无法完成详细分析，请稍后重试。',
      summaryBody: '由于数据或计算原因，当前无法给出完整的六爻排盘结果。',
      risks: ['系统暂时不可用'],
      actions: ['请稍后重试'],
      timeWindow: '',
      evidenceFold: '',
      llmFallback: true,
      paipanData: {
        yaoString: '',
        benGua: { guaName: '', palace: '', palaceWuXing: '', palaceLevel: '', wuXingStar: '', yaoList: [], guaCi: '', yaoCi: [], tuanCi: '' },
        zhiGua: { guaName: '', palace: '', palaceWuXing: '', palaceLevel: '', wuXingStar: '', yaoList: [], guaCi: '', yaoCi: [], tuanCi: '' },
        huGua: { guaName: '', palace: '', palaceWuXing: '', palaceLevel: '', wuXingStar: '', yaoList: [], guaCi: '', yaoCi: [], tuanCi: '' },
        dongYaoCount: 0,
        movingYaoPositions: [],
        ganZhiYear: { tian: '', di: '', gz: '' },
        ganZhiMonth: { tian: '', di: '', gz: '' },
        ganZhiDay: { tian: '', di: '', gz: '' },
        ganZhiHour: { tian: '', di: '', gz: '' },
        dayKong: '',
        hourKong: '',
        monthJian: '',
        solarTerm: '',
        lunarDate: { year: 0, month: 0, day: 0, isLeap: false },
      },
    };
  }
}
