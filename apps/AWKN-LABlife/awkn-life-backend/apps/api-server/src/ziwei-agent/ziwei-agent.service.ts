import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { astro } from 'iztro';
import { LlmProvidersService } from '../llm-providers/llm-providers.service';
import { BARNUM_PHRASES } from '../shared/constants/barnum-phrases';

export interface ZiweiInput {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  birthPlace?: string;
  question?: string;
  focusArea?: string;
  lang?: string;
  targetYear?: number;
  targetMonth?: number;
  targetDay?: number;
  targetHour?: number;
}

export interface ZiweiPalaceData {
  index: number;
  name: string;
  isBodyPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Array<{ name: string; type: string; brightness?: string; mutagen?: string }>;
  minorStars: Array<{ name: string; type: string; brightness?: string; mutagen?: string }>;
  adjectiveStars: Array<{ name: string; type: string }>;
  decadal?: { range: [number, number]; heavenlyStem: string; earthlyBranch: string };
  ages?: number[];
}

export interface ZiweiResult {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  gender: string;
  time: string;
  timeRange: string;
  sign: string;
  zodiac: string;
  soul: string;
  body: string;
  fiveElementsClass: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  palaces: ZiweiPalaceData[];
  liupan?: {
    daxian: Array<{
      index: number;
      ming_gong_pos: number;
      tiangan: number;
      tiangan_name: string;
      dizhi: number;
      dizhi_name: string;
      age_start: number;
      age_end: number;
      sihua: any;
      gong_names: number[];
    }>;
    liunian: Array<{
      year: number;
      ming_gong_pos: number;
      tiangan: number;
      tiangan_name: string;
      dizhi: number;
      dizhi_name: string;
      sihua: any;
      liuchang_pos: number;
      liuqu_pos: number;
    }>;
    xiaoxian?: any;
    liuyue?: any;
    liuri?: any;
    liushi?: any;
  };
}

export interface ZiweiOutput {
  summaryLine: string;
  summaryBody: string;
  confidence?: '高' | '中' | '低';
  uncertaintyFactors?: string[];
  risks: string[];
  actions: string[];
  timeWindow: string;
  evidenceFold: string;
  llmFallback?: boolean;
  astrolabeData: ZiweiResult;
}

@Injectable()
export class ZiweiAgentService {
  private readonly logger = new Logger(ZiweiAgentService.name);
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
      this.logger.log('✅ ZiweiAgent LLM 已配置，可进行真实语义分析');
    } else {
      this.logger.warn('⚠️ LLM 未配置，使用模板兜底逻辑');
    }
  }

  private loadSystemPrompt(): void {
    try {
      const promptPath = join(__dirname, 'prompts', 'ziwei-system-prompt.md');
      this.systemPrompt = readFileSync(promptPath, 'utf-8');
    } catch (e) {
      // P1-2 修复: 加错误日志，原 catch 静默降级
      this.logger.error(`[ZiweiAgent] 加载中文 systemPrompt 失败，使用默认 prompt: ${(e as Error).message}`);
      this.systemPrompt = this.getDefaultPrompt();
    }
    try {
      const promptPathEn = join(__dirname, 'prompts', 'ziwei-system-prompt-en.md');
      this.systemPromptEn = readFileSync(promptPathEn, 'utf-8');
    } catch (e) {
      // P1-2 修复: 加错误日志
      this.logger.warn(`[ZiweiAgent] 加载英文 systemPrompt 失败，使用默认英文 prompt: ${(e as Error).message}`);
      this.systemPromptEn = 'You are a master Zi Wei Dou Shu (Purple Star Astrology) analyst. Analyze the astrolabe data provided and output a structured JSON with all text in English. Be specific, avoid vague statements.';
    }
  }

  private loadAnalysisPrompt(): void {
    this.analysisPrompt = `请根据以下紫微斗数排盘结果，进行命理决策分析。

【个人信息】
出生日期：{{birthDate}}
出生时间：{{birthTime}}
性别：{{gender}}
问题：{{question}}

【命盘信息】
五行局：{{fiveElementsClass}}
命宫地支：{{soulPalace}}
身宫地支：{{bodyPalace}}
命主：{{soul}}
身主：{{body}}
生肖：{{zodiac}}
星座：{{sign}}

【十二宫排盘】
{{palacesDetail}}

请按以下结构输出分析结果（严格遵守JSON格式，不要输出其他内容）：
{
  "summaryLine": "一句话定性，直接回答用户问题，控制在20字以内",
  "summaryBody": "详细分析，150字以内，涵盖命宫格局、四化飞星、大限流年",
  "risks": ["风险1", "风险2"],
  "actions": ["建议动作1", "建议动作2"],
  "timeWindow": "时间窗口，如：7-14天内、3个月内",
  "evidenceFold": "判断依据，简写推演过程"
}`;
  }

  private getDefaultPrompt(): string {
    return `你是"紫微斗数决策宗师"。你的职责是根据出生时间排盘，通过十二宫星耀格局、四化飞星、大限流年判断运势吉凶与应对策略。输出遵守：结论先行、清晰优先、事实→含义→建议。`;
  }

  /**
   * 排盘入口：优先使用 Python 逆向引擎（文墨天机算法），失败时降级到 iztro
   */
  paipan(input: ZiweiInput): ZiweiResult {
    const birthDate = new Date(input.birthDate);
    const timeParts = input.birthTime.split(':');
    const hour = parseInt(timeParts[0], 10) || 12;
    const minute = parseInt(timeParts[1], 10) || 0;
    const sex = input.gender === 'male' ? 1 : 2;
    const solarDateStr = `${birthDate.getFullYear()}-${birthDate.getMonth() + 1}-${birthDate.getDate()}`;

    // ---------- 尝试 Python 逆向引擎 ----------
    try {
      const result = this.paipanWithPythonEngine(
        birthDate.getFullYear(),
        birthDate.getMonth() + 1,
        birthDate.getDate(),
        hour,
        sex,
        input.targetYear,
        input.targetMonth,
        input.targetDay,
        input.targetHour,
      );
      if (result) {
        this.logger.log(`[ZiweiAgent] Python排盘引擎成功: ${solarDateStr} ${input.birthTime}`);
        return result;
      }
    } catch (pyErr) {
      this.logger.warn(`[ZiweiAgent] Python引擎失败，降级iztro: ${(pyErr as Error).message}`);
    }

    // ---------- 降级到 iztro ----------
    let timeIndex: number;
    if (hour === 23) {
      timeIndex = 12;
    } else if (hour === 0) {
      timeIndex = 0;
    } else {
      timeIndex = Math.floor(hour / 2) + (hour % 2 === 0 ? 0 : 1);
      if (timeIndex > 11) timeIndex = 11;
    }
    const genderStr = input.gender === 'male' ? '男' : '女';
    const astrolabe = astro.bySolar(solarDateStr, timeIndex, genderStr, true, 'zh-CN');

    const palaces: ZiweiPalaceData[] = (astrolabe.palaces || []).map((p: any) => ({
      index: p.index,
      name: p.name,
      isBodyPalace: p.isBodyPalace || false,
      heavenlyStem: p.heavenlyStem || '',
      earthlyBranch: p.earthlyBranch || '',
      majorStars: (p.majorStars || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'major',
        brightness: s.brightness || '',
        mutagen: s.mutagen || '',
      })),
      minorStars: (p.minorStars || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'soft',
        brightness: s.brightness || '',
        mutagen: s.mutagen || '',
      })),
      adjectiveStars: (p.adjectiveStars || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'adjective',
      })),
      decadal: p.decadal ? {
        range: p.decadal.range || [0, 0],
        heavenlyStem: p.decadal.heavenlyStem || '',
        earthlyBranch: p.decadal.earthlyBranch || '',
      } : undefined,
      ages: p.ages || undefined,
    }));

    return {
      solarDate: astrolabe.solarDate || solarDateStr,
      lunarDate: astrolabe.lunarDate || '',
      chineseDate: astrolabe.chineseDate || '',
      gender: astrolabe.gender || genderStr,
      time: astrolabe.time || '',
      timeRange: astrolabe.timeRange || '',
      sign: astrolabe.sign || '',
      zodiac: astrolabe.zodiac || '',
      soul: astrolabe.soul || '',
      body: astrolabe.body || '',
      fiveElementsClass: astrolabe.fiveElementsClass || '',
      earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace || '',
      earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace || '',
      palaces,
    };
  }

  /**
   * 调用 Python 逆向排盘引擎
   * 路径：C:\Users\10919\Desktop\AWKN-Lab\projects\ziwei-reverse\python-validator\paipan_cli.py
   */
  private paipanWithPythonEngine(
    year: number, month: number, day: number, hour: number, sex: number,
    targetYear?: number, targetMonth?: number, targetDay?: number, targetHour?: number,
  ): ZiweiResult | null {
    // 环境变量优先，其次尝试相对路径回退
    // P0-2 修复: 删除硬编码开发机路径，避免部署到其他机器失败
    const cliPaths = [
      process.env.ZIWEI_CLI_PATH,
      resolve(process.cwd(), '..', '..', '..', '..', '..', 'projects', 'ziwei-reverse', 'python-validator', 'paipan_cli.py'),
      resolve(process.cwd(), '..', 'ziwei-reverse', 'python-validator', 'paipan_cli.py'),
    ].filter(Boolean) as string[];

    let cliPath = cliPaths.find(p => existsSync(p));
    if (!cliPath) {
      this.logger.warn(`[ZiweiAgent] Python CLI 未找到，尝试 paths: ${cliPaths.join(', ')}`);
      return null;
    }

    const args = [cliPath, String(year), String(month), String(day), String(hour), String(sex)];
    if (targetYear) {
      args.push('--liupan-year', String(targetYear));
      if (targetMonth) args.push('--liupan-month', String(targetMonth));
      if (targetDay) args.push('--liupan-day', String(targetDay));
      if (targetHour) args.push('--liupan-hour', String(targetHour));
    }
    const pythonExe = process.platform === 'win32' ? 'python' : 'python3';

    // 同步调用 Python CLI（spawnSync 阻塞等待子进程完成）
    const result = spawnSync(pythonExe, args, {
      timeout: 8000,
      windowsHide: true,
      shell: false,
      encoding: 'utf-8',
    });

    if (result.status !== 0 || !result.stdout?.trim()) {
      this.logger.warn(`[ZiweiAgent] Python CLI status=${result.status} stderr=${(result.stderr || '').substring(0, 200)}`);
      return null;
    }

    const pyOutput = JSON.parse(result.stdout.trim());

    // Python 输出的 body="身宫卯" → 提取地支 "卯" → 与 palace.dizhi 匹配
    // Python palaces[i].earthlyBranch = "卯"（纯地支，无"宫"字）
    const shenGongDizhi = (pyOutput.body || '').replace('身宫', '');
    const palacesFixed: ZiweiPalaceData[] = (pyOutput.palaces || []).map((p: any) => ({
      index: p.index,
      name: p.name,
      // isBodyPalace: 命宫对3宫=身宫（Python 命宫地支 + 3 = 身宫地支）
      // 也可从 soul/earthlyBranchOfBodyPalace 字段推断
      isBodyPalace: (p.earthlyBranch || '') === shenGongDizhi,
      heavenlyStem: p.heavenlyStem || '',
      earthlyBranch: p.earthlyBranch || '',
      majorStars: (p.majorStars || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'major',
        brightness: s.brightness || '',
        mutagen: s.mutagen || '',
      })),
      minorStars: (p.minorStars || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'soft',
        brightness: s.brightness || '',
        mutagen: s.mutagen || '',
      })),
      adjectiveStars: (p.adjectiveStars || []).map((s: any) => ({
        name: s.name || '',
        type: s.type || 'adjective',
      })),
    }));

    return {
      solarDate: pyOutput.solarDate || `${year}-${month}-${day}`,
      lunarDate: pyOutput.lunarDate || '',
      chineseDate: pyOutput.chineseDate || '',
      gender: pyOutput.gender === 'male' ? '男' : '女',
      time: pyOutput.time || '',
      timeRange: pyOutput.timeRange || '',
      sign: pyOutput.sign || '',
      zodiac: pyOutput.zodiac || '',
      soul: pyOutput.soul || '',
      body: pyOutput.body || '',
      fiveElementsClass: pyOutput.fiveElementsClass || '',
      earthlyBranchOfSoulPalace: pyOutput.earthlyBranchOfSoulPalace || '',
      earthlyBranchOfBodyPalace: pyOutput.earthlyBranchOfBodyPalace || '',
      palaces: palacesFixed,
      liupan: pyOutput.liupan || undefined,
    };
  }

  async analyze(input: ZiweiInput): Promise<ZiweiOutput> {
    try {
      const startTime = Date.now();

      const paipanData = this.paipan(input);

      let result: Omit<ZiweiOutput, 'astrolabeData'>;

      if (this.llmProviders?.isConfigured()) {
        try {
          result = await this.analyzeWithLLM(input, paipanData);
          this.logger.log(`[ZiweiAgent] LLM分析成功，耗时${Date.now() - startTime}ms`);
        } catch (llmErr) {
          this.logger.warn(`[ZiweiAgent] LLM失败，降级到模板: ${(llmErr as Error).message}`);
          result = this.generateAnalysis(input, paipanData);
        }
      } else {
        result = this.generateAnalysis(input, paipanData);
      }

      const duration = Date.now() - startTime;
      this.logger.log(`紫微斗数分析完成，耗时 ${duration}ms`);

      return {
        ...result,
        astrolabeData: paipanData,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error('紫微斗数分析失败', err.stack);
      return this.getFallbackResult(input);
    }
  }

  private readonly requiredFields = ['summaryLine', 'summaryBody', 'risks', 'actions'];

  private async analyzeWithLLM(
    input: ZiweiInput,
    paipanData: ZiweiResult,
  ): Promise<Omit<ZiweiOutput, 'astrolabeData'>> {
    const isEn = input.lang === 'en' || input.lang?.startsWith('en');

    const palacesDetail = paipanData.palaces.map((p) => {
      const majorStarNames = p.majorStars.map((s) => {
        let name = s.name;
        if (s.mutagen) name += `(${s.mutagen})`;
        if (s.brightness) name += `[${s.brightness}]`;
        return name;
      }).join('、');
      const minorStarNames = p.minorStars.map((s) => s.name).join('、');
      const parts = [`${p.name}（${p.heavenlyStem}${p.earthlyBranch}）：`];
      if (majorStarNames) parts.push(`主星=${majorStarNames}`);
      if (minorStarNames) parts.push(`辅星=${minorStarNames}`);
      if (p.isBodyPalace) parts.push('【身宫】');
      return parts.join(' ');
    }).join('\n');

    const userPrompt = this.analysisPrompt
      .replace('{{birthDate}}', input.birthDate)
      .replace('{{birthTime}}', input.birthTime)
      .replace('{{gender}}', input.gender === 'male' ? '男' : '女')
      .replace('{{question}}', input.question || '')
      .replace('{{fiveElementsClass}}', paipanData.fiveElementsClass)
      .replace('{{soulPalace}}', paipanData.earthlyBranchOfSoulPalace)
      .replace('{{bodyPalace}}', paipanData.earthlyBranchOfBodyPalace)
      .replace('{{soul}}', paipanData.soul)
      .replace('{{body}}', paipanData.body)
      .replace('{{zodiac}}', paipanData.zodiac)
      .replace('{{sign}}', paipanData.sign)
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
        this.logger.warn(`[ZiweiAgent] LLM输出含巴纳姆空泛表达（attempt ${attempt + 1}），降级到模板`);
        return this.generateAnalysis(input, paipanData);
      }

      const missingFields = this.requiredFields.filter(
        (f) => !parsed[f] || (Array.isArray(parsed[f]) && parsed[f].length === 0)
      );
      if (missingFields.length === 0) {
        lastParsed = parsed;
        break;
      }

      this.logger.warn(`[ZiweiAgent] LLM输出缺少字段: ${missingFields.join('、')}（attempt ${attempt + 1}）`);
      lastParsed = parsed;

      if (attempt >= 2) break;
    }

    if (!lastParsed) {
      this.logger.warn('[ZiweiAgent] LLM多次重试仍无有效输出，降级到模板');
      return this.generateAnalysis(input, paipanData);
    }

    return {
      summaryLine: lastParsed.summaryLine || '紫微斗数分析完成',
      summaryBody: lastParsed.summaryBody || '',
      risks: Array.isArray(lastParsed.risks) ? lastParsed.risks : [],
      actions: Array.isArray(lastParsed.actions) ? lastParsed.actions : [],
      timeWindow: lastParsed.timeWindow || '',
      evidenceFold: lastParsed.evidenceFold || '',
      llmFallback: false,
    };
  }

  private parseJsonResponse(content: string): Record<string, any> {
    // P1-3 修复: 静默返回空对象改为带日志，便于排查 LLM 输出格式问题
    const logParseFailure = (reason: string) => {
      const preview = (content || '').substring(0, 200);
      this.logger.warn(`[ZiweiAgent] parseJsonResponse 失败: ${reason}, content 前200字: ${preview}`);
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

  private generateAnalysis(
    input: ZiweiInput,
    paipanData: ZiweiResult,
  ): Omit<ZiweiOutput, 'astrolabeData'> {
    const { fiveElementsClass, soul, body, palaces, zodiac, sign } = paipanData;

    const mingGong = palaces.find((p) => p.name === '命宫');
    const caiBoGong = palaces.find((p) => p.name === '财帛宫');
    const guanLuGong = palaces.find((p) => p.name === '官禄宫');

    const mingGongStars = mingGong?.majorStars.map((s) => s.name).join('、') || '空宫';
    const caiBoStars = caiBoGong?.majorStars.map((s) => s.name).join('、') || '空宫';
    const guanLuStars = guanLuGong?.majorStars.map((s) => s.name).join('、') || '空宫';

    const huaJiStars = palaces
      .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '忌').map((s) => ({ name: s.name, palace: p.name })));

    const huaLuStars = palaces
      .flatMap((p) => p.majorStars.filter((s) => s.mutagen === '禄').map((s) => ({ name: s.name, palace: p.name })));

    const summaryLine = `${fiveElementsClass}，命宫${mingGongStars}，${huaJiStars.length > 0 ? `${huaJiStars[0].name}化忌临${huaJiStars[0].palace}` : '无明显化忌'}。`;

    const summaryBody = [
      `五行局${fiveElementsClass}，命主${soul}，身主${body}，生肖${zodiac}。`,
      `命宫：${mingGongStars}（${mingGong?.heavenlyStem || ''}${mingGong?.earthlyBranch || ''}）。`,
      `财帛宫：${caiBoStars}。`,
      `官禄宫：${guanLuStars}。`,
      huaLuStars.length > 0 ? `化禄：${huaLuStars.map((s) => `${s.name}临${s.palace}`).join('、')}。` : '',
      huaJiStars.length > 0 ? `化忌：${huaJiStars.map((s) => `${s.name}临${s.palace}`).join('、')}。` : '',
    ].filter(Boolean).join('');

    const risks: string[] = [];
    for (const hj of huaJiStars) {
      risks.push(`${hj.name}化忌临${hj.palace}，需防此领域受阻`);
    }
    if (risks.length === 0) risks.push('命盘无明显化忌，但仍需结合大限流年判断');

    const actions: string[] = [];
    for (const hl of huaLuStars.slice(0, 2)) {
      actions.push(`${hl.name}化禄临${hl.palace}，可借力此领域`);
    }
    if (actions.length === 0) actions.push('建议结合大限流年寻找行动窗口');

    return {
      summaryLine,
      summaryBody,
      risks,
      actions,
      timeWindow: '需结合大限流年判断具体时间窗口',
      evidenceFold: `命宫${mingGongStars}、${fiveElementsClass}、化禄${huaLuStars.map((s) => s.name).join('、') || '无'}、化忌${huaJiStars.map((s) => s.name).join('、') || '无'}`,
      llmFallback: true,
    };
  }

  private getFallbackResult(input: ZiweiInput): ZiweiOutput {
    return {
      summaryLine: '系统暂时无法完成详细分析，请稍后重试。',
      summaryBody: '由于数据或计算原因，当前无法给出完整的紫微斗数排盘结果。',
      risks: ['系统暂时不可用'],
      actions: ['请稍后重试'],
      timeWindow: '',
      evidenceFold: '',
      llmFallback: true,
      astrolabeData: {
        solarDate: input.birthDate,
        lunarDate: '',
        chineseDate: '',
        gender: input.gender,
        time: '',
        timeRange: '',
        sign: '',
        zodiac: '',
        soul: '',
        body: '',
        fiveElementsClass: '',
        earthlyBranchOfSoulPalace: '',
        earthlyBranchOfBodyPalace: '',
        palaces: [],
      },
    };
  }
}
