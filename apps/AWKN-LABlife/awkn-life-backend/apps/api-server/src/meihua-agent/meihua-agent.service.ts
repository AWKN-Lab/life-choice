import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';

// U-P2-1: 梅花易数 Agent（MVP 版，只实现时间起卦）

export interface MeihuaInput {
  askTime?: string;
  question?: string;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  lang?: string;
}

export interface MeihuaGua {
  guaName: string;       // 卦名（如"天火同人"）
  upperGua: string;      // 上卦名（如"乾"）
  lowerGua: string;      // 下卦名（如"离"）
  upperNum: number;      // 上卦先天数（1-8）
  lowerNum: number;      // 下卦先天数（1-8）
  wuxing: string;        // 卦五行
}

export interface MeihuaResult {
  benGua: MeihuaGua;     // 本卦
  huGua: MeihuaGua;      // 互卦
  bianGua: MeihuaGua;    // 变卦
  movingYaoPos: number;  // 动爻位置（1-6，从下往上数）
  tiGua: MeihuaGua;      // 体卦（不动的一方）
  yongGua: MeihuaGua;    // 用卦（动爻所在的一方）
  tiYongRelation: string;// 体用关系（用生体/体生用/体克用/用克体/比和）
  jixiong: '吉' | '凶' | '平';
  lunarDate: { year: number; month: number; day: number; hour: number };
}

export interface MeihuaOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  risks: string[];
  actions: string[];
  timeWindow: string;
  evidenceFold: string;
  llmFallback?: boolean;
  paipanData: MeihuaResult;
}

// 先天八卦数映射
const BAGUA_BY_NUM: Record<number, { name: string; wuxing: string }> = {
  1: { name: '乾', wuxing: '金' },
  2: { name: '兑', wuxing: '金' },
  3: { name: '离', wuxing: '火' },
  4: { name: '震', wuxing: '木' },
  5: { name: '巽', wuxing: '木' },
  6: { name: '坎', wuxing: '水' },
  7: { name: '艮', wuxing: '土' },
  8: { name: '坤', wuxing: '土' },
};

// 八卦符号映射（用于卦名）
const BAGUA_SYMBOL: Record<string, string> = {
  '乾': '天', '兑': '泽', '离': '火', '震': '雷',
  '巽': '风', '坎': '水', '艮': '山', '坤': '地',
};

// 五行生克关系
const WUXING_SHENG: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const WUXING_KE: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

// 地支对应时辰数（子1...亥12）
const ZHI_TO_HOUR: Record<string, number> = {
  '子': 1, '丑': 2, '寅': 3, '卯': 4, '辰': 5, '巳': 6,
  '午': 7, '未': 8, '申': 9, '酉': 10, '戌': 11, '亥': 12,
};

const ZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

@Injectable()
export class MeihuaAgentService {
  private readonly logger = new Logger(MeihuaAgentService.name);
  private systemPrompt: string = '';

  constructor(
    @Optional() @Inject(LlmProvidersService) private readonly llmProviders?: LlmProvidersService,
  ) {}

  onModuleInit() {
    this.loadSystemPrompt();
    if (this.llmProviders?.isConfigured()) {
      this.logger.log('✅ MeihuaAgent LLM 已配置，可进行真实语义分析');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用模板兜底逻辑');
    }
  }

  private loadSystemPrompt(): void {
    try {
      const promptPath = join(__dirname, 'prompts', 'meihua-system-prompt.md');
      this.systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch {
      this.systemPrompt = this.getDefaultPrompt();
    }
  }

  private getDefaultPrompt(): string {
    return `你是"梅花易数决策宗师"。你的职责是根据时间起卦，通过体用生克关系判断事件吉凶与应对策略。核心原则：体卦代表自己，用卦代表对方或事；用生体为吉，体生用为泄；体克用为得控，用克体为受克；体用比和为助。输出遵守：结论先行、清晰优先、事实→含义→建议。`;
  }

  // U-P2-1: 梅花易数时间起卦
  paipan(input: MeihuaInput): MeihuaResult {
    const askTime = input.askTime ? new Date(input.askTime) : new Date();
    const year = input.year || askTime.getFullYear();
    const month = input.month || askTime.getMonth() + 1;
    const day = input.day || askTime.getDate();
    const hour = input.hour ?? askTime.getHours();

    // 地支年数（子1...亥12）
    const yearZhiIndex = ((year - 4) % 12 + 12) % 12;
    const yearNum = yearZhiIndex + 1;

    // 时辰数（23-1点为子时1，1-3点为丑时2...）
    const zhiHour = Math.floor((hour + 1) / 2) % 12;
    const hourNum = zhiHour + 1;

    // 上卦 = (年数 + 月数 + 日数) ÷ 8 取余（0 取 8）
    const upperSum = yearNum + month + day;
    const upperNum = upperSum % 8 || 8;

    // 下卦 = (年数 + 月数 + 日数 + 时数) ÷ 8 取余（0 取 8）
    const lowerSum = upperSum + hourNum;
    const lowerNum = lowerSum % 8 || 8;

    // 动爻 = (年数 + 月数 + 日数 + 时数) ÷ 6 取余（0 取 6）
    const movingYaoPos = lowerSum % 6 || 6;

    const benGua = this.buildGua(upperNum, lowerNum);
    const huGua = this.buildHuGua(benGua);
    const bianGua = this.buildBianGua(benGua, movingYaoPos);

    // 体用分析：动爻所在的一方为用，另一方为体
    const isMovingInUpper = movingYaoPos > 3; // 4,5,6 爻在上卦
    const tiGua = isMovingInUpper ? { ...benGua, guaName: benGua.lowerGua + benGua.lowerGua } : { ...benGua, guaName: benGua.upperGua + benGua.upperGua };
    const yongGua = isMovingInUpper ? { ...benGua, guaName: benGua.upperGua + benGua.upperGua } : { ...benGua, guaName: benGua.lowerGua + benGua.lowerGua };

    // 体用五行取动爻所在卦的五行
    const tiWuxing = isMovingInUpper ? benGua.lowerGua : benGua.upperGua;
    const yongWuxing = isMovingInUpper ? benGua.upperGua : benGua.lowerGua;
    const tiGuaFull = { ...tiGua, wuxing: this.getGuaWuxing(tiWuxing) };
    const yongGuaFull = { ...yongGua, wuxing: this.getGuaWuxing(yongWuxing) };

    const tiYongRelation = this.computeTiYongRelation(tiGuaFull.wuxing, yongGuaFull.wuxing);
    const jixiong = this.computeJixiong(tiYongRelation);

    return {
      benGua,
      huGua,
      bianGua,
      movingYaoPos,
      tiGua: tiGuaFull,
      yongGua: yongGuaFull,
      tiYongRelation,
      jixiong,
      lunarDate: { year, month, day, hour: hourNum },
    };
  }

  // 构建卦象
  private buildGua(upperNum: number, lowerNum: number): MeihuaGua {
    const upper = BAGUA_BY_NUM[upperNum];
    const lower = BAGUA_BY_NUM[lowerNum];
    const upperSym = BAGUA_SYMBOL[upper.name];
    const lowerSym = BAGUA_SYMBOL[lower.name];
    // 卦名：上卦符号 + 下卦符号 + 组合名（简化为"上卦下卦"）
    const guaName = `${upperSym}${lowerSym}`;
    return {
      guaName,
      upperGua: upper.name,
      lowerGua: lower.name,
      upperNum,
      lowerNum,
      wuxing: upper.wuxing, // 取上卦五行（简化）
    };
  }

  // 构建互卦（取本卦 2,3,4 爻为下互，3,4,5 爻为上互）
  private buildHuGua(benGua: MeihuaGua): MeihuaGua {
    // 简化：互卦取本卦中间四爻重组（MVP 用随机映射近似）
    const huUpperNum = ((benGua.upperNum + benGua.lowerNum) % 8) || 8;
    const huLowerNum = ((benGua.lowerNum + 2) % 8) || 8;
    return this.buildGua(huUpperNum, huLowerNum);
  }

  // 构建变卦（动爻阴阳互变）
  private buildBianGua(benGua: MeihuaGua, movingYaoPos: number): MeihuaGua {
    // 简化：动爻变导致对应卦变化（MVP 用映射近似）
    const isMovingInUpper = movingYaoPos > 3;
    const newUpperNum = isMovingInUpper ? ((benGua.upperNum % 8) + 1) : benGua.upperNum;
    const newLowerNum = isMovingInUpper ? benGua.lowerNum : ((benGua.lowerNum % 8) + 1);
    return this.buildGua(newUpperNum, newLowerNum);
  }

  // 获取卦五行
  private getGuaWuxing(guaName: string): string {
    for (const num of Object.keys(BAGUA_BY_NUM)) {
      if (BAGUA_BY_NUM[+num].name === guaName) return BAGUA_BY_NUM[+num].wuxing;
    }
    return '土';
  }

  // 计算体用关系
  private computeTiYongRelation(tiWuxing: string, yongWuxing: string): string {
    if (tiWuxing === yongWuxing) return '比和';
    if (WUXING_SHENG[tiWuxing] === yongWuxing) return '体生用';
    if (WUXING_SHENG[yongWuxing] === tiWuxing) return '用生体';
    if (WUXING_KE[tiWuxing] === yongWuxing) return '体克用';
    if (WUXING_KE[yongWuxing] === tiWuxing) return '用克体';
    return '比和';
  }

  // 计算吉凶
  private computeJixiong(relation: string): '吉' | '凶' | '平' {
    if (relation === '用生体' || relation === '体克用' || relation === '比和') return '吉';
    if (relation === '体生用' || relation === '用克体') return '凶';
    return '平';
  }

  // 主入口：排盘 + LLM 分析
  async analyze(input: MeihuaInput): Promise<MeihuaOutput> {
    try {
      const paipanData = this.paipan(input);

      // 尝试 LLM 分析
      if (this.llmProviders?.isConfigured()) {
        try {
          const result = await this.analyzeWithLLM(input, paipanData);
          return { ...result, paipanData };
        } catch (llmErr) {
          this.logger.warn(`[MeihuaAgent] LLM 分析失败，降级到模板: ${(llmErr as Error).message}`);
        }
      }

      // 模板兜底
      const fallback = this.generateAnalysis(input, paipanData);
      return { ...fallback, paipanData, llmFallback: true };
    } catch (err) {
      this.logger.error(`[MeihuaAgent] analyze 失败: ${(err as Error).message}`);
      return this.getFallbackResult(input);
    }
  }

  // LLM 分析
  private async analyzeWithLLM(input: MeihuaInput, paipanData: MeihuaResult): Promise<Omit<MeihuaOutput, 'paipanData'>> {
    const prompt = this.buildAnalysisPrompt(input, paipanData);
    const systemPrompt = this.systemPrompt || this.getDefaultPrompt();

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.llmProviders!.chatWithUser(
          prompt,
          systemPrompt,
          undefined,
          { temperature: 0.35, maxTokens: 4000, timeout: 120000, jsonMode: true },
        );

        const parsed = this.parseJsonResponse(response.content || '');
        if (parsed.summaryLine) {
          return {
            summaryLine: String(parsed.summaryLine).slice(0, 120),
            summaryBody: String(parsed.summaryBody || ''),
            confidence: parsed.confidence || '中',
            uncertaintyFactors: Array.isArray(parsed.uncertaintyFactors) ? parsed.uncertaintyFactors : [],
            risks: Array.isArray(parsed.risks) ? parsed.risks : [],
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            timeWindow: String(parsed.timeWindow || ''),
            evidenceFold: String(parsed.evidenceFold || ''),
          };
        }
      } catch (err) {
        this.logger.warn(`[MeihuaAgent] LLM 第 ${attempt} 次失败: ${(err as Error).message}`);
        if (attempt === 3) throw err;
      }
    }

    throw new Error('LLM 3 次重试均失败');
  }

  // 构建分析提示词
  private buildAnalysisPrompt(input: MeihuaInput, paipanData: MeihuaResult): string {
    return `请根据以下梅花易数排盘结果，进行事件决策分析。

【问事信息】
问题：${input.question || '未提供'}
问事时间：${input.askTime || new Date().toISOString()}

【卦象信息】
本卦：${paipanData.benGua.guaName}（上${paipanData.benGua.upperGua}下${paipanData.benGua.lowerGua}）
互卦：${paipanData.huGua.guaName}
变卦：${paipanData.bianGua.guaName}
动爻：第${paipanData.movingYaoPos}爻

【体用分析】
体卦：${paipanData.tiGua.upperGua}（五行：${paipanData.tiGua.wuxing}）
用卦：${paipanData.yongGua.upperGua}（五行：${paipanData.yongGua.wuxing}）
体用关系：${paipanData.tiYongRelation}
吉凶定性：${paipanData.jixiong}

请按以下结构输出分析结果（严格遵守JSON格式，不要输出其他内容）：
{
  "summaryLine": "一句话定性，直接回答用户问题，控制在20字以内",
  "summaryBody": "详细分析，150字以内，涵盖体用生克、互卦内因、变卦走向",
  "risks": ["风险1", "风险2"],
  "actions": ["建议动作1", "建议动作2"],
  "timeWindow": "时间窗口，如：7-14天内、3个月内",
  "evidenceFold": "判断依据，简写推演过程"
}`;
  }

  // 解析 JSON 响应（参考六爻 agent）
  private parseJsonResponse(content: string): Record<string, any> {
    if (!content) return {};
    let cleaned = content.trim();
    const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (mdMatch) cleaned = mdMatch[1].trim();
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace === -1) return {};
    const sub = cleaned.substring(firstBrace);
    const lastBrace = sub.lastIndexOf('}');
    if (lastBrace === -1) return {};
    try {
      return JSON.parse(sub.substring(0, lastBrace + 1));
    } catch {
      return {};
    }
  }

  // 模板兜底（无 LLM 时）
  private generateAnalysis(input: MeihuaInput, paipanData: MeihuaResult): Omit<MeihuaOutput, 'paipanData'> {
    const relationMap: Record<string, string> = {
      '用生体': '对方主动助你，事可成',
      '体生用': '你付出较多，需量力而行',
      '体克用': '你可掌控局面，主动推进',
      '用克体': '外部阻力大，宜守不宜攻',
      '比和': '双方势均，顺其自然',
    };
    const summary = relationMap[paipanData.tiYongRelation] || '事态平稳';
    return {
      summaryLine: `${paipanData.benGua.guaName}·${paipanData.tiYongRelation}——${paipanData.jixiong}`,
      summaryBody: `本卦${paipanData.benGua.guaName}，体用${paipanData.tiYongRelation}，${summary}。互卦${paipanData.huGua.guaName}看内在趋势，变卦${paipanData.bianGua.guaName}看走向。`,
      confidence: '中',
      risks: paipanData.jixiong === '凶' ? ['外部阻力较大', '时机未到'] : [],
      actions: paipanData.jixiong === '吉' ? ['主动推进', '把握当下'] : ['观望为主', '积蓄力量'],
      timeWindow: '7-30天内见端倪',
      evidenceFold: `体${paipanData.tiGua.wuxing}·用${paipanData.yongGua.wuxing}·${paipanData.tiYongRelation}`,
    };
  }

  // 错误兜底
  private getFallbackResult(input: MeihuaInput): MeihuaOutput {
    return {
      summaryLine: '梅花起卦异常，请稍后重试',
      summaryBody: '排盘过程中出现错误，无法生成完整分析。',
      confidence: '低',
      risks: ['系统异常'],
      actions: ['请稍后重试'],
      timeWindow: '',
      evidenceFold: '',
      llmFallback: true,
      paipanData: {
        benGua: { guaName: '', upperGua: '', lowerGua: '', upperNum: 0, lowerNum: 0, wuxing: '' },
        huGua: { guaName: '', upperGua: '', lowerGua: '', upperNum: 0, lowerNum: 0, wuxing: '' },
        bianGua: { guaName: '', upperGua: '', lowerGua: '', upperNum: 0, lowerNum: 0, wuxing: '' },
        movingYaoPos: 0,
        tiGua: { guaName: '', upperGua: '', lowerGua: '', upperNum: 0, lowerNum: 0, wuxing: '' },
        yongGua: { guaName: '', upperGua: '', lowerGua: '', upperNum: 0, lowerNum: 0, wuxing: '' },
        tiYongRelation: '',
        jixiong: '平',
        lunarDate: { year: 0, month: 0, day: 0, hour: 0 },
      },
    };
  }
}
