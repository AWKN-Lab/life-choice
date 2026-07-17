import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { BARNUM_PHRASES } from '../shared/constants/barnum-phrases';

let TimeDunjia: any;
try {
  TimeDunjia = require('@yhjs/dunjia').TimeDunjia;
} catch {
  const stub = require('../lib/dunjia-stub');
  TimeDunjia = stub.TimeDunjia;
}

export interface QimenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  askTime?: string;
  askLocation?: string;
  question?: string;
  lang?: string;
}

export interface QimenPalaceData {
  index: number;
  position: number;
  name: string;
  groundGan: string;
  groundExtraGan: string | null;
  skyGan: string;
  skyExtraGan: string | null;
  star: { name: string; shortName: string; wuxing: string; originPalace: number } | null;
  door: { name: string; shortName: string; wuxing: string; originPalace: number } | null;
  god: { name: string; shortName: string; wuxing: string } | null;
  outGan: string | null;
  outExtraGan: string | null;
}

export interface QimenResult {
  yinyang: string;
  juNumber: number;
  xunHead: string;
  xunHeadGan: string;
  ganZhi: string;
  solarTerm: string;
  type: string;
  palaces: QimenPalaceData[];
  geJu: string;
}

export interface QimenOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  oneLineConclusion?: string;
  coreReasoning?: string;
  keySignals?: string[];
  evidenceTags?: string[];
  actionStrategy?: string;
  timeWindows?: Array<{
    period: string;
    suitable: string;
    unsuitable: string;
  }>;
  nowDoThis?: string[];
  nowDoNotDo?: string[];
  risks: string[];
  actions: string[];
  timeWindow: string;
  evidenceFold: string;
  llmFallback?: boolean;
  paipanData: QimenResult;
}

@Injectable()
export class QimenAgentService {
  private readonly logger = new Logger(QimenAgentService.name);
  private systemPrompt: string = '';
  private systemPromptEn: string = '';
  private analysisPrompt: string = '';

  constructor(
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
  ) {}

  onModuleInit() {
    this.loadSystemPrompt();
    this.loadAnalysisPrompt();
    if (this.llmProviders?.isConfigured()) {
      this.logger.log('✅ QimenAgent LLM 已配置，可进行真实语义分析');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用模板兜底逻辑');
    }
  }

  private loadSystemPrompt(): void {
    try {
      const promptPath = join(__dirname, 'prompts', 'qimen-system-prompt.md');
      this.systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch {
      this.systemPrompt = this.getDefaultPrompt();
    }
    try {
      const promptPathEn = join(__dirname, 'prompts', 'qimen-system-prompt-en.md');
      this.systemPromptEn = readFileSync(promptPathEn, 'utf-8');
    } catch {
      this.systemPromptEn = 'You are a master Qi Men Dun Jia (Mystical Door Escaping Technique) analyst. Analyze the divination chart data provided and output a structured JSON with all text in English. Use standard English metaphysics terminology. Be specific, avoid vague statements.';
    }
  }

  private loadAnalysisPrompt(): void {
    this.analysisPrompt = `请根据以下奇门遁甲排盘结果，进行事件决策分析。

【问事信息】
问题：{{question}}
问事时间：{{askTime}}
问事地点：{{askLocation}}

【盘面信息】
局数：{{geJu}}
阴阳遁：{{yinyang}}
旬首：{{xunHead}}
节气：{{solarTerm}}
干支：{{ganZhi}}

【九宫排盘】
{{palacesDetail}}

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
    return `你是"奇门遁甲决策宗师"。你的职责是根据问事时间起局排盘，判断事件吉凶、方位利弊、时机与应对策略。输出遵守：结论先行、清晰优先、事实→含义→建议。`;
  }

  paipan(input: QimenInput): QimenResult {
    const datetime = new Date(input.year, input.month - 1, input.day, input.hour, input.minute || 0);

    const board = TimeDunjia.create({ datetime });

    const meta = board.meta;
    const palaces: QimenPalaceData[] = [];

    for (let i = 0; i < 9; i++) {
      const palace = board.palace(i);
      palaces.push({
        index: palace.index,
        position: palace.position,
        name: palace.name,
        groundGan: palace.groundGan,
        groundExtraGan: palace.groundExtraGan,
        skyGan: palace.skyGan,
        skyExtraGan: palace.skyExtraGan,
        star: palace.star ? {
          name: palace.star.name,
          shortName: palace.star.shortName,
          wuxing: palace.star.wuxing as unknown as string,
          originPalace: palace.star.originPalace,
        } : null,
        door: palace.door ? {
          name: palace.door.name,
          shortName: palace.door.shortName,
          wuxing: palace.door.wuxing as unknown as string,
          originPalace: palace.door.originPalace,
        } : null,
        god: palace.god ? {
          name: palace.god.name,
          shortName: palace.god.shortName,
          wuxing: palace.god.wuxing as unknown as string,
        } : null,
        outGan: palace.outGan,
        outExtraGan: palace.outExtraGan,
      });
    }

    const yinyangStr = String(meta.yinyang);
    const geJu = `${yinyangStr}${meta.juNumber}局`;

    return {
      yinyang: yinyangStr,
      juNumber: meta.juNumber,
      xunHead: meta.xunHead,
      xunHeadGan: meta.xunHeadGan,
      ganZhi: meta.ganZhi,
      solarTerm: meta.solarTerm,
      type: meta.type,
      palaces,
      geJu,
    };
  }

  async analyze(input: QimenInput): Promise<QimenOutput> {
    try {
      const startTime = Date.now();

      const paipanData = this.paipan(input);

      let result: Omit<QimenOutput, 'paipanData'>;

      if (this.llmProviders?.isConfigured()) {
        try {
          result = await this.analyzeWithLLM(input, paipanData);
          this.logger.log(`[QimenAgent] LLM分析成功，耗时${Date.now() - startTime}ms`);
        } catch (llmErr) {
          this.logger.warn(`[QimenAgent] LLM失败，降级到模板: ${(llmErr as Error).message}`);
          result = this.generateAnalysis(input, paipanData);
        }
      } else {
        result = this.generateAnalysis(input, paipanData);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`奇门遁甲分析完成，耗时 ${duration}ms`);

      return {
        ...result,
        paipanData,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('奇门遁甲分析失败', err.stack);
      return this.getFallbackResult(input);
    }
  }

  private readonly requiredFields = ['summaryLine', 'summaryBody', 'risks', 'actions'];

  private async analyzeWithLLM(
    input: QimenInput,
    paipanData: QimenResult,
  ): Promise<Omit<QimenOutput, 'paipanData'>> {
    const isEn = input.lang === 'en' || input.lang?.startsWith('en');

    const palacesDetail = paipanData.palaces.map((p) => {
      const parts = [`${p.name}宫(${p.position}宫)：`];
      if (p.star) parts.push(`九星=${p.star.name}`);
      if (p.door) parts.push(`八门=${p.door.name}`);
      if (p.god) parts.push(`八神=${p.god.name}`);
      parts.push(`天盘干=${p.skyGan} 地盘干=${p.groundGan}`);
      return parts.join(' ');
    }).join('\n');

    const userPrompt = this.analysisPrompt
      .replace('{{question}}', input.question || '')
      .replace('{{askTime}}', input.askTime || `${input.year}-${input.month}-${input.day} ${input.hour}:${String(input.minute || 0).padStart(2, '0')}`)
      .replace('{{askLocation}}', input.askLocation || '未提供')
      .replace('{{geJu}}', paipanData.geJu)
      .replace('{{yinyang}}', paipanData.yinyang)
      .replace('{{xunHead}}', paipanData.xunHead)
      .replace('{{solarTerm}}', paipanData.solarTerm)
      .replace('{{ganZhi}}', paipanData.ganZhi)
      .replace('{{palacesDetail}}', palacesDetail);

    const systemPrompt = isEn ? this.systemPromptEn : this.systemPrompt;
    let lastParsed: Record<string, any> | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const prompt = attempt === 0
        ? userPrompt
        : `${userPrompt}\n\n${isEn ? 'Previous output was missing required fields. Output only valid JSON with all required fields:' : '上一次输出缺少必填字段。请只输出合法JSON，并补齐字段：'}${this.requiredFields.join(isEn ? ', ' : '、')}`;

      const response = await this.llmProviders!.chatWithUser(
        prompt,
        systemPrompt,
        undefined,
        { temperature: 0.35, maxTokens: 6000, timeout: 180000, jsonMode: true },
      );

      const parsed = this.parseJsonResponse(response.content);

      if (this.containsBannedBarnumText(parsed)) {
        this.logger.warn(`[QimenAgent] LLM输出含巴纳姆空泛表达（attempt ${attempt + 1}），降级到模板`);
        return this.generateAnalysis(input, paipanData);
      }

      const missingFields = this.requiredFields.filter(
        (f) => !parsed[f] || (Array.isArray(parsed[f]) && parsed[f].length === 0)
      );
      if (missingFields.length === 0) {
        lastParsed = parsed;
        break;
      }

      this.logger.warn(`[QimenAgent] LLM输出缺少字段: ${missingFields.join('、')}（attempt ${attempt + 1}）`);
      lastParsed = parsed;

      if (attempt >= 2) break;
    }

    if (!lastParsed) {
      this.logger.warn('[QimenAgent] LLM多次重试仍无有效输出，降级到模板');
      return this.generateAnalysis(input, paipanData);
    }

    return {
      summaryLine: lastParsed.summaryLine || '奇门遁甲分析完成',
      summaryBody: lastParsed.summaryBody || '',
      risks: Array.isArray(lastParsed.risks) ? lastParsed.risks : [],
      actions: Array.isArray(lastParsed.actions) ? lastParsed.actions : [],
      timeWindow: lastParsed.timeWindow || '',
      evidenceFold: lastParsed.evidenceFold || '',
      llmFallback: false,
    };
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
    input: QimenInput,
    paipanData: QimenResult,
  ): Omit<QimenOutput, 'paipanData'> {
    const question = input.question || '';
    const isDirectionQuestion = /方位|方向|出行|搬家|开业/.test(question);
    const isTimingQuestion = /择日|择时|何时|时间|日子/.test(question);
    const isDecisionQuestion = /能不能|要不要|可不可以|适不适合|该不该/.test(question);

    if (isDirectionQuestion) {
      return this.analyzeDirection(paipanData);
    }
    if (isTimingQuestion) {
      return this.analyzeTiming(paipanData);
    }
    if (isDecisionQuestion) {
      return this.analyzeDecision(paipanData, input);
    }
    return this.analyzeGeneral(paipanData, input);
  }

  private analyzeDirection(paipanData: QimenResult): Omit<QimenOutput, 'paipanData'> {
    const { geJu, palaces } = paipanData;

    const auspiciousPalaces = palaces.filter((p) => {
      const isAuspiciousDoor = p.door && ['开门', '休门', '生门'].includes(p.door.name);
      const isAuspiciousStar = p.star && ['天任', '天心', '天辅'].includes(p.star.name);
      return isAuspiciousDoor || isAuspiciousStar;
    });

    const bestPalace = auspiciousPalaces[0];
    const directionNames: Record<number, string> = {
      1: '北方', 2: '西南', 3: '东方', 4: '东南',
      5: '中宫', 6: '西北', 7: '西方', 8: '东北', 9: '南方',
    };

    const bestDirection = bestPalace ? directionNames[bestPalace.position] || `${bestPalace.position}宫` : '需综合判断';

    return {
      summaryLine: `${geJu}，${bestDirection}方位最吉，宜向此方行事。`,
      summaryBody: `${geJu}排盘，${auspiciousPalaces.length}宫得吉门吉星。${bestPalace ? `${bestPalace.name}宫(${bestPalace.position}宫)${bestPalace.door?.name || ''}临${bestPalace.star?.name || ''}，为最佳方位。` : '各宫吉凶参半，需结合具体事项判断。'}`,
      risks: [`避开${this.getInauspiciousDirection(palaces)}`],
      actions: [`宜向${bestDirection}行事`, '避开凶门凶星所在方位'],
      timeWindow: '当前局数有效期内',
      evidenceFold: `推演依据：${geJu}、${auspiciousPalaces.map((p) => `${p.name}宫${p.door?.name || ''}`).join('、')}`,
      llmFallback: true,
    };
  }

  private analyzeTiming(paipanData: QimenResult): Omit<QimenOutput, 'paipanData'> {
    const { geJu, palaces, xunHead } = paipanData;

    const kaiMenPalace = palaces.find((p) => p.door?.name === '开门');
    const shengMenPalace = palaces.find((p) => p.door?.name === '生门');

    return {
      summaryLine: `${geJu}，${kaiMenPalace ? `开门落${kaiMenPalace.name}宫` : '开门隐匿'}，${shengMenPalace ? `生门落${shengMenPalace.name}宫` : '生门隐匿'}。`,
      summaryBody: `${geJu}排盘，旬首${xunHead}。${kaiMenPalace ? `开门临${kaiMenPalace.name}宫，主事业公开、贵人相助` : '开门隐匿，不宜大动'}。${shengMenPalace ? `生门临${shengMenPalace.name}宫，主财源、生机` : '生门隐匿，求财需缓'}。`,
      risks: ['值使所在宫位需防阻滞', '空亡宫位不宜作为行动时机'],
      actions: [
        kaiMenPalace ? `开门所落${kaiMenPalace.name}宫方位为有利时机窗口` : '待开门显露再行大事',
        shengMenPalace ? `生门所落${shengMenPalace.name}宫方位利求财` : '求财需待生门显露',
      ],
      timeWindow: '本时辰内有效，过时需重新起局',
      evidenceFold: `推演依据：${geJu}、旬首${xunHead}、开门${kaiMenPalace?.name || '隐'}、生门${shengMenPalace?.name || '隐'}`,
      llmFallback: true,
    };
  }

  private analyzeDecision(paipanData: QimenResult, input: QimenInput): Omit<QimenOutput, 'paipanData'> {
    const { geJu, palaces } = paipanData;

    const hasAuspiciousSign = palaces.some((p) =>
      (p.door && ['开门', '休门', '生门'].includes(p.door.name)) &&
      (p.star && ['天任', '天心', '天辅'].includes(p.star.name))
    );

    const hasInauspiciousSign = palaces.some((p) =>
      (p.door && ['死门', '惊门', '伤门'].includes(p.door.name)) &&
      (p.star && ['天蓬', '天芮', '天柱'].includes(p.star.name))
    );

    if (hasAuspiciousSign && !hasInauspiciousSign) {
      return {
        summaryLine: `${geJu}，吉门吉星同宫，宜进。`,
        summaryBody: `${geJu}排盘，得吉门吉星会聚，事有实据可依，可主动推进。`,
        risks: ['虽吉但需防过刚则折'],
        actions: ['可主动推进', '选择吉门所在方位行事'],
        timeWindow: '本时辰内有利',
        evidenceFold: `推演依据：${geJu}、吉门吉星同宫`,
        llmFallback: true,
      };
    }

    if (hasInauspiciousSign && !hasAuspiciousSign) {
      return {
        summaryLine: `${geJu}，凶门凶星临位，宜缓。`,
        summaryBody: `${geJu}排盘，凶门凶星会聚，事有阻碍之象，不宜强攻。`,
        risks: ['凶门临位，强行推进恐有不利', '需防对方或环境变故'],
        actions: ['暂缓行动', '待凶门转吉再推进'],
        timeWindow: '当前不宜，待下一局数转换',
        evidenceFold: `推演依据：${geJu}、凶门凶星临位`,
        llmFallback: true,
      };
    }

    return {
      summaryLine: `${geJu}，吉凶交织，需审时度势。`,
      summaryBody: `${geJu}排盘，吉门凶星并存，局势复杂。需结合具体事项与方位综合判断。`,
      risks: ['吉凶参半，需防暗藏变数'],
      actions: ['先试探后决策', '选择吉门方位行事，避开凶门方位'],
      timeWindow: '需结合具体事项判断',
      evidenceFold: `推演依据：${geJu}、吉凶交织`,
      llmFallback: true,
    };
  }

  private analyzeGeneral(paipanData: QimenResult, input: QimenInput): Omit<QimenOutput, 'paipanData'> {
    const { geJu, palaces, xunHead } = paipanData;

    const kaiMenPalace = palaces.find((p) => p.door?.name === '开门');
    const shengMenPalace = palaces.find((p) => p.door?.name === '生门');
    const siMenPalace = palaces.find((p) => p.door?.name === '死门');
    const jingMenPalace = palaces.find((p) => p.door?.name === '惊门');

    const auspiciousDoors = [kaiMenPalace, shengMenPalace].filter(Boolean);
    const inauspiciousDoors = [siMenPalace, jingMenPalace].filter(Boolean);

    return {
      summaryLine: `${geJu}，${auspiciousDoors.length > 0 ? `${auspiciousDoors.map((p) => p!.door!.name).join('、')}得位` : '吉门隐匿'}，${inauspiciousDoors.length > 0 ? `${inauspiciousDoors.map((p) => p!.door!.name).join('、')}临宫` : '凶门不显'}。`,
      summaryBody: `${geJu}排盘，旬首${xunHead}。${kaiMenPalace ? `开门临${kaiMenPalace.name}宫，主事业公开` : '开门隐匿'}。${shengMenPalace ? `生门临${shengMenPalace.name}宫，主财源` : '生门隐匿'}。${siMenPalace ? `死门临${siMenPalace.name}宫，需避此方` : ''}${jingMenPalace ? `惊门临${jingMenPalace.name}宫，需防惊扰` : ''}。`,
      risks: inauspiciousDoors.map((p) => `${p!.door!.name}临${p!.name}宫，需避此方行事`),
      actions: auspiciousDoors.map((p) => `${p!.door!.name}临${p!.name}宫，宜向此方行事`),
      timeWindow: '本时辰内有效',
      evidenceFold: `推演依据：${geJu}、旬首${xunHead}`,
      llmFallback: true,
    };
  }

  private getInauspiciousDirection(palaces: QimenPalaceData[]): string {
    const inauspicious = palaces.find((p) =>
      p.door && ['死门', '惊门', '伤门'].includes(p.door.name)
    );
    if (!inauspicious) return '无明显凶方';
    const directionNames: Record<number, string> = {
      1: '北方', 2: '西南', 3: '东方', 4: '东南',
      5: '中宫', 6: '西北', 7: '西方', 8: '东北', 9: '南方',
    };
    return `${directionNames[inauspicious.position] || `${inauspicious.position}宫`}（${inauspicious.door?.name}临宫）`;
  }

  private getFallbackResult(input: QimenInput): QimenOutput {
    return {
      summaryLine: '系统暂时无法完成详细分析，请稍后重试。',
      summaryBody: '由于数据或计算原因，当前无法给出完整的奇门遁甲排盘结果。',
      risks: ['系统暂时不可用'],
      actions: ['请稍后重试'],
      timeWindow: '',
      evidenceFold: '',
      llmFallback: true,
      paipanData: {
        yinyang: '',
        juNumber: 0,
        xunHead: '',
        xunHeadGan: '',
        ganZhi: '',
        solarTerm: '',
        type: 'hour',
        palaces: [],
        geJu: '',
      },
    };
  }
}
