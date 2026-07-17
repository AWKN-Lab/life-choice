import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { LlmProvidersService, LlmProviderType } from '../llm-providers/llm-providers.service';
import { BaziCalculatorWrapper } from '../calc-engine/bazi-calculator-wrapper';
import { PrismaService } from '../prisma/prisma.service';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';
import { SubAgentService } from './sub-agent.service';

export interface BenchmarkQuestion {
  id: string;
  question_number: number;
  original_number: number;
  case_id: string;
  birth_info: {
    raw: string;
    gender: string;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    country: string;
    location: string;
    calendar_type: string;
  };
  question: string;
  options: Array<{ letter: string; text: string }>;
  answer: string;
  category: string;
  has_answer: boolean;
}

export interface BenchmarkResultItem {
  id: string;
  question: string;
  category: string;
  correctAnswer: string;
  predictedAnswer: string | null;
  isCorrect: boolean;
  llmContent: string;
  llmReasoning?: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  baziPillars?: string;
  ziweiChart?: string;
  optionMap?: Record<string, string>;
}

export interface BenchmarkRunResult {
  runId: string;
  timestamp: string;
  config: {
    year?: number;
    sampleSize: number;
    useCot: boolean;
    useAstro: boolean;
    shuffleOptions: boolean;
    provider: LlmProviderType;
    maxWorkers?: number;
    rounds?: number;
  };
  summary: {
    total: number;
    correct: number;
    accuracy: number;
    trimmedAccuracy?: number;
    avgDurationMs: number;
    totalTokens?: number;
  };
  categoryBreakdown: Record<string, { total: number; correct: number; accuracy: number }>;
  results: BenchmarkResultItem[];
}

const DEFAULT_DATASET_PATH = path.resolve('data/mingli-bench/data.json');
const DEFAULT_FORTUNE_PATH = path.resolve('data/mingli-bench/fortune_api_results.json');

const QUESTION_CATEGORIES: Record<string, string[]> = {
  '意外': ['发生何事', '交通意外', '意外', '灾劫'],
  '事业': ['事业', '工作', '升职', '生意'],
  '婚姻': ['结婚', '婚姻', '离异', '出轨', '感情'],
  '学业': ['学历', '毕业', '升学', '学业'],
  '财运': ['得财', '输', '赚', '财', '工资'],
  '家庭': ['父母', '兄弟姐妹', '家庭', '孩子', '子女'],
  '性格': ['性格', '自私', '付出', '为人'],
  '健康': ['健康', '疾病', '身体', '残疾'],
  '外貌': ['外貌', '长相', '身高', '体型'],
  '官非': ['官非', '诉讼', '牢狱', '官司'],
  '灾劫': ['灾劫', '灾难', '劫难', '凶灾'],
  '运势': ['运势', '运气', '流年', '大运'],
};

@Injectable()
export class MingliBenchService {
  private readonly logger = new Logger(MingliBenchService.name);
  private readonly history: BenchmarkRunResult[] = [];
  private questions: BenchmarkQuestion[] | null = null;
  private fortuneData: Record<string, any> | null = null;
  private readonly datasetPath: string;
  private baziCalculator: BaziCalculatorWrapper | null;
  private prisma: PrismaService | null;
  private readonly fortunePath: string;
  private _llmProviders: LlmProvidersService | null = null;

  private get llmProviders(): LlmProvidersService | null {
    if (!this._llmProviders) {
      try {
        this._llmProviders = new LlmProvidersService();
      } catch (e) {
        this.logger.warn(`Failed to create LlmProvidersService: ${(e as Error).message}`);
      }
    }
    return this._llmProviders;
  }

  private async callLlmDirect(prompt: string, model?: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.MINIMAX_API_KEY;
    if (!apiKey) throw new Error('No LLM API key configured (DEEPSEEK_API_KEY or MINIMAX_API_KEY)');
    const baseUrl = model === 'minimax'
      ? (process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1')
      : (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1');
    const m = model || 'deepseek-chat';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: m, messages: [{ role: 'user', content: prompt }], max_tokens: 256, temperature: 0.3 }),
    });
    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { choices?: { message?: { content?: string }[] } | null };
    return (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  }

  private subAgentService: SubAgentService | null;

  constructor(
    private readonly configService: ConfigService,
    @Optional() baziCalculator: BaziCalculatorWrapper | null,
    @Optional() prisma: PrismaService | null,
    @Optional() subAgentService: SubAgentService | null,
  ) {
    this.baziCalculator = baziCalculator;
    this.prisma = prisma;
    this.subAgentService = subAgentService;
    this.datasetPath = this.configService.get<string>('MINGLI_BENCH_DATA_PATH') || DEFAULT_DATASET_PATH;
    this.fortunePath = this.configService.get<string>('MINGLI_BENCH_FORTUNE_PATH') || DEFAULT_FORTUNE_PATH;
    this.logger.log(`[DI-DEBUG] MingliBenchService constructed | baziCalculator=${!!baziCalculator} llmProviders=${!!this._llmProviders} prisma=${!!prisma} | datasetPath=${this.datasetPath} fortunePath=${this.fortunePath}`);
  }

  private async loadDataset(): Promise<BenchmarkQuestion[]> {
    if (this.questions) return this.questions;

    try {
      const raw = await fs.promises.readFile(this.datasetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      this.questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
      this.logger.log(`Loaded ${this.questions.length} questions from dataset`);
      return this.questions;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to load dataset: ${err.message}`);
      throw new Error(`无法加载数据集: ${err.message}`);
    }
  }

  private async loadFortuneData(): Promise<Record<string, any>> {
    if (this.fortuneData) return this.fortuneData;

    try {
      const raw = await fs.promises.readFile(this.fortunePath, 'utf-8');
      this.fortuneData = JSON.parse(raw);
      this.logger.log(`Loaded fortune data for ${Object.keys(this.fortuneData).length} cases`);
      return this.fortuneData;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to load fortune data: ${err.message}`);
      this.fortuneData = {};
      return this.fortuneData;
    }
  }

  getCategories(): string[] {
    return Object.keys(QUESTION_CATEGORIES);
  }

  private selectQuestions(
    all: BenchmarkQuestion[],
    year?: number,
    sampleSize?: number,
    categories?: string[],
  ): BenchmarkQuestion[] {
    let filtered = all;

    if (year !== undefined) {
      filtered = filtered.filter((q) => q.birth_info?.year === year);
    }

    if (categories && categories.length > 0) {
      filtered = filtered.filter((q) => categories.includes(q.category));
    }

    if (sampleSize !== undefined && sampleSize > 0) {
      filtered = filtered.slice(0, sampleSize);
    }

    return filtered;
  }

  private shuffleOptions(
    question: BenchmarkQuestion,
    seed?: string,
  ): { shuffled: BenchmarkQuestion; optionMap: Record<string, string> } {
    const n = question.options.length;
    if (n <= 1) {
      return {
        shuffled: { ...question },
        optionMap: question.options.reduce(
          (acc, o) => ({ ...acc, [o.letter]: o.letter }),
          {},
        ),
      };
    }

    const letters = question.options.map((o) => o.letter);
    let indices: number[];
    let attempts = 0;

    do {
      indices = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      attempts++;
    } while (
      indices.some((origIdx, newIdx) => origIdx === newIdx) &&
      attempts < 100
    );

    const optionMap: Record<string, string> = {};
    const newOptions = indices.map((origIdx, newIdx) => {
      const newLetter = String.fromCharCode(65 + newIdx);
      optionMap[newLetter] = letters[origIdx];
      return { letter: newLetter, text: question.options[origIdx].text };
    });

    const shuffled = {
      ...question,
      options: newOptions,
    };

    return { shuffled, optionMap };
  }

  private async buildBaziPillars(question: BenchmarkQuestion): Promise<string> {
    if (!this.baziCalculator) {
      this.logger.warn('BaziCalculator not available (DI missing)');
      return '（八字排盘服务不可用）';
    }
    const { birth_info } = question;
    const gender = birth_info.gender === '女' ? 'female' : 'male';

    try {
      const result = await this.baziCalculator.calculate({
        year: birth_info.year,
        month: birth_info.month - 1,
        day: birth_info.day,
        hour: birth_info.hour,
        minute: birth_info.minute,
        gender: gender as 'male' | 'female',
      });

      const daYunStr = result.daYun
        .slice(0, 3)
        .map((d) => `${d.full}(${d.startAge}-${d.endAge}岁)`)
        .join('、');

      return [
        `年柱: ${result.yearPillar} (${result.yearShishen})`,
        `月柱: ${result.monthPillar} (${result.monthShishen})`,
        `日柱: ${result.dayPillar} (${result.dayShishen})`,
        `时柱: ${result.hourPillar} (${result.hourShishen})`,
        `大运: ${daYunStr}`,
        `空亡: ${result.kongWang.join('、')}`,
        `纳音: ${result.naYin.year}`,
      ].join('\n');
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Bazi calculation failed for ${question.id}: ${err.message}`);
      return '（八字排盘失败）';
    }
  }

  private async buildZiweiChart(question: BenchmarkQuestion): Promise<string | undefined> {
    const fortuneData = await this.loadFortuneData();
    const caseId = question.case_id;
    const caseData = fortuneData[caseId];
    if (!caseData?.ziwei) return undefined;

    try {
      const zw = caseData.ziwei;
      const lines: string[] = [];

      if (zw.ming_gong) lines.push(`命宫主星: ${zw.ming_gong}`);
      if (zw.body_gong) lines.push(`身宫: ${zw.body_gong}`);

      if (zw.stars) {
        const palaceMap: Record<string, string> = {
          '命宫': 'MINGGONG',
          '兄弟宫': 'XIONGDI',
          '夫妻宫': 'FUQI',
          '子女宫': 'ZINU',
          '财帛宫': 'CAIBO',
          '疾厄宫': 'JIYI',
          '迁移宫': 'QIAN_YI',
          '仆役宫': 'PUYI',
          '官禄宫': 'GUANLU',
          '田宅宫': 'TIANZHAI',
          '福德宫': 'FUDE',
          '父母宫': 'FUMU',
        };

        const keyPalaces = ['命宫', '夫妻宫', '财帛宫', '官禄宫', '迁移宫', '福德宫'];
        for (const [gong, starList] of Object.entries(zw.stars)) {
          if (Array.isArray(starList) && starList.length > 0) {
            const enKey = palaceMap[gong] || gong;
            lines.push(`【${gong}】${(starList as string[]).join('、')}`);
          }
        }
      }

      if (zw.sihua) {
        const sihua = zw.sihua;
        lines.push('\n=== 四化星曜分析 ===');
        if (sihua.lu) {
          lines.push(`化禄星: ${sihua.lu}（财禄、福气）`);
        }
        if (sihua.quan) {
          lines.push(`化权星: ${sihua.quan}（权力、事业）`);
        }
        if (sihua.ke) {
          lines.push(`化科星: ${sihua.ke}（名声、科举）`);
        }
        if (sihua.ji) {
          lines.push(`化忌星: ${sihua.ji}（变动、忌讳）`);
        }
      }

      lines.push('\n=== 紫微斗数分析要点 ===');
      lines.push('1. 命宫主星强弱：判断命宫主星的庙旺程度');
      lines.push('2. 四化星分布：化禄、化权、化科、化忌各落在哪个宫位');
      lines.push('3. 星曜组合：重点宫位是否有紫微、天机、太阳等主要星曜');
      lines.push('4. 宫位联动：财帛宫与官禄宫的星曜关系');

      return lines.length > 0 ? lines.join('\n') : undefined;
    } catch {
      return undefined;
    }
  }

  private buildPrompt(
    question: BenchmarkQuestion,
    useCot: boolean,
    useAstro: boolean,
    baziPillars?: string,
    ziweiChart?: string,
  ): string {
    const optionsText = question.options
      .map((opt) => `${opt.letter}. ${opt.text}`)
      .join('\n');

    const parts: string[] = [];

    parts.push(`命主信息：${question.birth_info.raw}`);

    if (useAstro && baziPillars) {
      parts.push(`八字排盘：\n${baziPillars}`);
    }

    if (useAstro && ziweiChart) {
      parts.push(`紫微斗数排盘：\n${ziweiChart}`);
    }

    parts.push(`问题：${question.question}`);
    parts.push(`选项：\n${optionsText}`);

    if (useCot) {
      const multiStepPrompt = this.buildMultiStepPrompt(question, useAstro, baziPillars, ziweiChart);
      parts.push(multiStepPrompt);
    } else {
      parts.push('请直接回答选项字母（A/B/C/D），无需解释。');
    }

    return parts.join('\n\n');
  }

  private buildMultiStepPrompt(
    question: BenchmarkQuestion,
    useAstro: boolean,
    baziPillars?: string,
    ziweiChart?: string,
  ): string {
    const steps: string[] = [];

    steps.push('## 【第一阶段：八字分析子代理】');
    steps.push('请从以下维度分析八字结构：');
    steps.push('1. 日主强弱：判断日主（出生日天干）的旺衰程度');
    steps.push('2. 五行分布：统计年柱、月柱、日柱、时柱的五行比重');
    steps.push('3. 用神选取：根据日主强弱确定用神和忌神');
    steps.push('4. 十神关系：分析代表事业、财运、婚姻的关键十神');
    steps.push('5. 大运走向：结合大运分析当前运势');
    if (baziPillars) {
      steps.push(`\n【八字排盘数据】\n${baziPillars}`);
    }

    if (useAstro && ziweiChart) {
      steps.push('\n\n## 【第二阶段：紫微斗数分析子代理】');
      steps.push('请从以下维度分析紫微斗数结构：');
      steps.push('1. 命宫主星：判断命宫的主星组合和性质');
      steps.push('2. 四化星曜：分析化禄、化权、化科、化忌的影响');
      steps.push('3. 宫位组合：重点分析事业宫、财帛宫、夫妻宫、迁移宫');
      steps.push('4. 星曜互动：判断关键星曜之间的生克关系');
      steps.push('5. 整体格局：评估命盘的整体格局高低');
      steps.push(`\n【紫微斗数排盘数据】\n${ziweiChart}`);
    }

    steps.push('\n\n## 【第三阶段：综合推理】');
    steps.push('请综合八字和紫微斗数的分析结果：');
    steps.push('1. 一致性判断：八字和紫微给出的吉凶指向是否一致');
    steps.push('2. 权重分配：如果两者指向不同，如何权衡');
    steps.push('3. 选项对比：逐个分析A/B/C/D选项与命理的契合度');
    steps.push('4. 核心依据：给出判断的核心命理依据');

    steps.push('\n\n## 【最终答案】');
    steps.push('请在最后一行只输出选项字母（A/B/C/D），格式：[ANSWER]X');

    return steps.join('\n');
  }

  private parseAnswer(content: string): string | null {
    if (!content) return null;

    const cleaned = content
      .replace(/[\*_`]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    // 优先级1：[ANSWER]X 格式（最可靠）
    const answerTagMatch = cleaned.match(/\[ANSWER\]\s*([A-D])\s*$/im);
    if (answerTagMatch) return answerTagMatch[1];

    // 优先级2：明确的中文答案表述
    const explicitPatterns: RegExp[] = [
      /答案是\s*([A-D])/i,
      /答案\s*是?\s*[:：]?\s*([A-D])/i,
      /选择\s*是?\s*[:：]?\s*([A-D])/i,
      /正确答案\s*[:：]?\s*([A-D])/i,
      /我选择\s*([A-D])/i,
      /最终答案\s*[:：]?\s*([A-D])/i,
      /综合.*?选\s*([A-D])/i,
    ];

    for (const pattern of explicitPatterns) {
      const match = cleaned.match(pattern);
      if (match) return match[1];
    }

    // 优先级3：选项字母在句首/句尾
    const positionalPatterns: RegExp[] = [
      /^([A-D])[\.\s、，]/,
      /[\.、，]\s*([A-D])\s*$/,
      /\n\s*([A-D])\s*\n/,
      /选项\s*([A-D])/i,
      /选\s*([A-D])/i,
    ];

    for (const pattern of positionalPatterns) {
      const match = cleaned.match(pattern);
      if (match) return match[1];
    }

    // 优先级4：最后一个出现的选项字母（fallback）
    const allLetters = cleaned.match(/[A-D]/g);
    if (allLetters && allLetters.length > 0) {
      return allLetters[allLetters.length - 1];
    }

    return null;
  }

  private async evaluateQuestion(
    question: BenchmarkQuestion,
    useCot: boolean,
    useAstro: boolean,
    shuffleOptions: boolean,
    provider: LlmProviderType,
    rounds: number = 1,
  ): Promise<BenchmarkResultItem> {
    let baziPillars: string | undefined;
    if (useAstro) {
      baziPillars = await this.buildBaziPillars(question);
    }

    let ziweiChart: string | undefined;
    if (useAstro) {
      ziweiChart = await this.buildZiweiChart(question);
    }

    let effectiveQuestion = question;
    let optionMap: Record<string, string> | undefined;
    if (shuffleOptions) {
      const shuffled = this.shuffleOptions(question);
      effectiveQuestion = shuffled.shuffled;
      optionMap = shuffled.optionMap;
    }

    const prompt = this.buildPrompt(effectiveQuestion, useCot, useAstro, baziPillars, ziweiChart);

    if (!this.llmProviders) {
      return {
        id: question.id,
        question: question.question,
        category: question.category,
        correctAnswer: question.answer.toUpperCase(),
        predictedAnswer: null,
        isCorrect: false,
        llmContent: 'ERROR: LLM service not available (DI missing)',
        durationMs: 0,
        baziPillars: useAstro ? baziPillars : undefined,
        ziweiChart: useAstro ? ziweiChart : undefined,
        optionMap,
      };
    }

    try {
      let llmContent = '';
      if (rounds <= 1) {
        if (this.llmProviders) {
          try {
            const llmResp = await this.llmProviders.chat(
              [
                {
                  role: 'system',
                  content: buildIdentityLayer() + '\n\n你是一位精通八字命理的命理师。请根据提供的命主信息和八字排盘，回答选择题。只输出选项字母。',
                },
                { role: 'user', content: prompt },
              ],
              provider,
              { temperature: 0.3, maxTokens: 512 },
            );
            llmContent = llmResp.content;
          } catch (llmErr) {
            this.logger.warn(`LlmProviders.chat failed, falling back to direct: ${(llmErr as Error).message}`);
            llmContent = await this.callLlmDirect(prompt, provider);
          }
        } else {
          llmContent = await this.callLlmDirect(prompt, provider);
        }

        const predicted = this.parseAnswer(llmContent);
        const mappedAnswer = optionMap && predicted
          ? optionMap[predicted]
          : predicted;
        const isCorrect = mappedAnswer === question.answer.toUpperCase();

        return {
          id: question.id,
          question: question.question,
          category: question.category,
          correctAnswer: question.answer.toUpperCase(),
          predictedAnswer: predicted,
          isCorrect,
          llmContent: llmContent,
          llmReasoning: undefined,
          durationMs: 0,
          promptTokens: undefined,
          completionTokens: undefined,
          baziPillars: useAstro ? baziPillars : undefined,
          optionMap,
        };
      } else {
        const votes: string[] = [];
        let combinedContent = '';
        let totalDurationMs = 0;

        for (let r = 0; r < rounds; r++) {
          let roundContent = '';
          if (this.llmProviders) {
            try {
              const llmResp = await this.llmProviders.chat(
                [
                  {
                    role: 'system',
                    content:
                      '你是一位精通八字命理的命理师。请根据提供的命主信息和八字排盘，回答选择题。只输出选项字母。',
                  },
                  { role: 'user', content: prompt },
                ],
                provider,
                { temperature: 0.3, maxTokens: 512 },
              );
              roundContent = llmResp.content;
              totalDurationMs += llmResp.durationMs;
            } catch (llmErr) {
              this.logger.warn(`Round ${r+1} LlmProviders.chat failed, using direct fetch: ${(llmErr as Error).message}`);
              roundContent = await this.callLlmDirect(prompt, provider);
            }
          } else {
            roundContent = await this.callLlmDirect(prompt, provider);
          }

          const predicted = this.parseAnswer(roundContent);
          const mappedAnswer = optionMap && predicted ? optionMap[predicted] : predicted;
          if (mappedAnswer) votes.push(mappedAnswer);
          combinedContent += `[Round ${r + 1}] ${roundContent}\n`;
        }

        const voteCounts: Record<string, number> = {};
        for (const v of votes) voteCounts[v] = (voteCounts[v] || 0) + 1;
        const majorityAnswer = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const isCorrect = majorityAnswer === question.answer.toUpperCase();

        return {
          id: question.id,
          question: question.question,
          category: question.category,
          correctAnswer: question.answer.toUpperCase(),
          predictedAnswer: majorityAnswer,
          isCorrect,
          llmContent: combinedContent.trim(),
          durationMs: totalDurationMs,
          promptTokens: undefined,
          completionTokens: undefined,
          baziPillars: useAstro ? baziPillars : undefined,
          ziweiChart: useAstro ? ziweiChart : undefined,
          optionMap,
        };
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`LLM failed for ${question.id}: ${err.message}`);
      return {
        id: question.id,
        question: question.question,
        category: question.category,
        correctAnswer: question.answer.toUpperCase(),
        predictedAnswer: null,
        isCorrect: false,
        llmContent: `ERROR: ${err.message}`,
        durationMs: 0,
        baziPillars: useAstro ? baziPillars : undefined,
        ziweiChart: useAstro ? ziweiChart : undefined,
        optionMap,
      };
    }
  }

  async runBenchmark(params: {
    year?: number;
    sampleSize?: number;
    useCot?: boolean;
    useAstro?: boolean;
    shuffleOptions?: boolean;
    provider?: LlmProviderType;
    maxWorkers?: number;
    rounds?: number;
    categories?: string[];
  }): Promise<BenchmarkRunResult> {
    const {
      year,
      sampleSize = 10,
      useCot = false,
      useAstro = false,
      shuffleOptions = false,
      provider = 'deepseek',
      maxWorkers = 1,
      rounds = 1,
      categories,
    } = params;

    const allQuestions = await this.loadDataset();
    const selected = this.selectQuestions(allQuestions, year, sampleSize, categories);

    if (selected.length === 0) {
      throw new Error('没有符合条件的题目');
    }

    this.logger.log(
      `Starting benchmark | questions: ${selected.length} | CoT: ${useCot} | Astro: ${useAstro} | shuffle: ${shuffleOptions} | provider: ${provider} | workers: ${maxWorkers}`,
    );

    const results: BenchmarkResultItem[] = [];
    let totalTokens = 0;
    let totalDuration = 0;

    if (maxWorkers <= 1) {
      for (const question of selected) {
        const item = await this.evaluateQuestion(question, useCot, useAstro, shuffleOptions, provider, rounds);
        results.push(item);
        if (item.promptTokens !== undefined && item.completionTokens !== undefined) {
          totalTokens += (item.promptTokens || 0) + (item.completionTokens || 0);
        }
        totalDuration += item.durationMs;
      }
    } else {
      const batches: BenchmarkQuestion[][] = [];
      for (let i = 0; i < selected.length; i += maxWorkers) {
        batches.push(selected.slice(i, i + maxWorkers));
      }

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map((q) => this.evaluateQuestion(q, useCot, useAstro, shuffleOptions, provider, rounds)),
        );

        for (const settled of batchResults) {
          if (settled.status === 'fulfilled') {
            const item = settled.value;
            results.push(item);
            if (item.promptTokens !== undefined && item.completionTokens !== undefined) {
              totalTokens += (item.promptTokens || 0) + (item.completionTokens || 0);
            }
            totalDuration += item.durationMs;
          }
        }
      }
    }

    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = results.length > 0 ? correctCount / results.length : 0;
    const avgDuration = results.length > 0 ? totalDuration / results.length : 0;

    const perQuestionScores = results.map(r => r.isCorrect ? 1 : 0).sort((a, b) => a - b);
    let trimmedAccuracy = accuracy;
    if (perQuestionScores.length >= 4) {
      const trimmed = perQuestionScores.slice(1, -1);
      trimmedAccuracy = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
    }

    const categoryBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const cat of Object.keys(QUESTION_CATEGORIES)) {
      categoryBreakdown[cat] = { total: 0, correct: 0, accuracy: 0 };
    }
    for (const r of results) {
      if (!categoryBreakdown[r.category]) {
        categoryBreakdown[r.category] = { total: 0, correct: 0, accuracy: 0 };
      }
      categoryBreakdown[r.category].total += 1;
      if (r.isCorrect) categoryBreakdown[r.category].correct += 1;
    }
    for (const cat of Object.keys(categoryBreakdown)) {
      const c = categoryBreakdown[cat];
      c.accuracy = c.total > 0 ? c.correct / c.total : 0;
    }

    const runResult: BenchmarkRunResult = {
      runId: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      config: {
        year,
        sampleSize: selected.length,
        useCot,
        useAstro,
        shuffleOptions,
        provider,
        maxWorkers,
        rounds,
      },
      summary: {
        total: selected.length,
        correct: correctCount,
        accuracy: parseFloat(accuracy.toFixed(4)),
        trimmedAccuracy: parseFloat(trimmedAccuracy.toFixed(4)),
        avgDurationMs: Math.round(avgDuration),
        totalTokens: totalTokens > 0 ? totalTokens : undefined,
      },
      categoryBreakdown,
      results,
    };

    this.history.push(runResult);

    if (this.prisma) {
      try {
        await this.prisma.benchmarkRun.create({
        data: {
          year: year || 0,
          provider,
          model: provider,
          useCot,
          useAstro,
          shuffleOptions,
          maxWorkers,
          totalQuestions: selected.length,
          correctCount,
          accuracy: parseFloat(accuracy.toFixed(4)),
          avgDurationMs: Math.round(avgDuration),
          resultsJson: JSON.stringify(results),
          categoryStats: JSON.stringify(categoryBreakdown),
          detailedResults: JSON.stringify(results.map((r) => ({
            id: r.id,
            question: r.question,
            category: r.category,
            correctAnswer: r.correctAnswer,
            predictedAnswer: r.predictedAnswer,
            isCorrect: r.isCorrect,
            optionMap: r.optionMap,
            baziPillars: r.baziPillars,
            llmContent: r.llmContent,
            llmReasoning: r.llmReasoning,
            durationMs: r.durationMs,
            promptTokens: r.promptTokens,
            completionTokens: r.completionTokens,
          }))),
        },
      });
    } catch (dbError) {
      this.logger.warn(`Failed to persist benchmark run: ${(dbError as Error).message}`);
    }
    }

    this.logger.log(
      `Benchmark completed | accuracy: ${(accuracy * 100).toFixed(2)}% | ${correctCount}/${selected.length}`,
    );

    return runResult;
  }

  async getHistory(): Promise<BenchmarkRunResult[]> {
    if (this.prisma) {
      try {
        const dbRuns = await this.prisma.benchmarkRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      if (dbRuns.length > 0) {
        return dbRuns.map(run => ({
          runId: run.id,
          timestamp: run.createdAt.toISOString(),
          config: {
            year: run.year || undefined,
            sampleSize: run.totalQuestions,
            useCot: run.useCot,
            useAstro: run.useAstro,
            shuffleOptions: run.shuffleOptions,
            provider: run.provider as LlmProviderType,
            maxWorkers: run.maxWorkers,
          },
          summary: {
            total: run.totalQuestions,
            correct: run.correctCount,
            accuracy: run.accuracy,
            avgDurationMs: run.avgDurationMs,
          },
          categoryBreakdown: {},
          results: JSON.parse(run.resultsJson),
        }));
      }
    } catch (dbErr) {
      this.logger.warn(`getHistory DB fallback: ${(dbErr as Error).message}`);
    }
    }
    return this.history;
  }

  async getHistoryById(runId: string): Promise<BenchmarkRunResult | undefined> {
    if (this.prisma) {
      try {
        const dbRun = await this.prisma.benchmarkRun.findUnique({ where: { id: runId } });
      if (dbRun) {
        return {
          runId: dbRun.id,
          timestamp: dbRun.createdAt.toISOString(),
          config: {
            year: dbRun.year || undefined,
            sampleSize: dbRun.totalQuestions,
            useCot: dbRun.useCot,
            useAstro: dbRun.useAstro,
            shuffleOptions: dbRun.shuffleOptions,
            provider: dbRun.provider as LlmProviderType,
            maxWorkers: dbRun.maxWorkers,
          },
          summary: {
            total: dbRun.totalQuestions,
            correct: dbRun.correctCount,
            accuracy: dbRun.accuracy,
            avgDurationMs: dbRun.avgDurationMs,
          },
          categoryBreakdown: {},
          results: JSON.parse(dbRun.resultsJson),
        };
      }
    } catch (dbErr) {
      this.logger.warn(`getHistoryById DB fallback: ${(dbErr as Error).message}`);
    }
    }
    return this.history.find((h) => h.runId === runId);
  }

  /**
   * P0: 对比测试 — 基准（无CoT）vs 增强（有CoT+紫微）
   * 返回两次运行的对比结果
   */
  async runComparisonTest(params: {
    sampleSize?: number;
    categories?: string[];
    provider?: LlmProviderType;
    rounds?: number;
  }): Promise<{
    baseline: BenchmarkRunResult;
    enhanced: BenchmarkRunResult;
    comparison: {
      accuracyDelta: number;
      trimmedAccuracyDelta: number;
      categoryDeltas: Record<string, number>;
    };
  }> {
    const { sampleSize = 30, categories, provider = 'deepseek', rounds = 1 } = params;

    // 基准测试：无CoT、无紫微
    const baseline = await this.runBenchmark({
      sampleSize,
      categories,
      provider,
      useCot: false,
      useAstro: false,
      shuffleOptions: false,
      rounds,
    });

    // 增强测试：有CoT、有紫微
    const enhanced = await this.runBenchmark({
      sampleSize,
      categories,
      provider,
      useCot: true,
      useAstro: true,
      shuffleOptions: false,
      rounds,
    });

    // 计算差异
    const accuracyDelta = enhanced.summary.accuracy - baseline.summary.accuracy;
    const trimmedAccuracyDelta = (enhanced.summary.trimmedAccuracy || 0) - (baseline.summary.trimmedAccuracy || 0);

    const categoryDeltas: Record<string, number> = {};
    const allCategories = new Set([
      ...Object.keys(baseline.categoryBreakdown),
      ...Object.keys(enhanced.categoryBreakdown),
    ]);
    for (const cat of allCategories) {
      const baseAcc = baseline.categoryBreakdown[cat]?.accuracy || 0;
      const enhAcc = enhanced.categoryBreakdown[cat]?.accuracy || 0;
      categoryDeltas[cat] = enhAcc - baseAcc;
    }

    return { baseline, enhanced, comparison: { accuracyDelta, trimmedAccuracyDelta, categoryDeltas } };
  }

  /**
   * P0: 5轮投票完整测试 — 验证多数投票降低方差
   */
  async runVotingTest(params: {
    sampleSize?: number;
    categories?: string[];
    provider?: LlmProviderType;
  }): Promise<{
    singleRound: BenchmarkRunResult;
    fiveRound: BenchmarkRunResult;
    votingAnalysis: {
      varianceReduction: number;
      agreementRate: number;
      perQuestionVariance: Array<{ id: string; category: string; variance: number }>;
    };
  }> {
    const { sampleSize = 30, categories, provider = 'deepseek' } = params;

    // 单轮测试
    const singleRound = await this.runBenchmark({
      sampleSize,
      categories,
      provider,
      useCot: true,
      useAstro: true,
      shuffleOptions: false,
      rounds: 1,
    });

    // 5轮投票测试
    const fiveRound = await this.runBenchmark({
      sampleSize,
      categories,
      provider,
      useCot: true,
      useAstro: true,
      shuffleOptions: false,
      rounds: 5,
    });

    // 计算投票分析
    const agreementRate = fiveRound.results.filter(r => r.isCorrect).length / fiveRound.results.length;

    const perQuestionVariance = fiveRound.results.map(r => ({
      id: r.id,
      category: r.category,
      variance: r.isCorrect ? 0 : 1,
    }));

    const singleAcc = singleRound.summary.accuracy;
    const fiveAcc = fiveRound.summary.accuracy;
    const varianceReduction = singleAcc > 0 ? (fiveAcc - singleAcc) / singleAcc : 0;

    return {
      singleRound,
      fiveRound,
      votingAnalysis: {
        varianceReduction: parseFloat(varianceReduction.toFixed(4)),
        agreementRate: parseFloat(agreementRate.toFixed(4)),
        perQuestionVariance,
      },
    };
  }

  /**
   * P1: Sub-Agent 管线测试 — 八字Agent→紫微Agent→综合Agent
   */
  async runSubAgentBenchmark(params: {
    sampleSize?: number;
    categories?: string[];
    provider?: LlmProviderType;
  }): Promise<BenchmarkRunResult> {
    const { sampleSize = 10, categories, provider = 'deepseek' } = params;
    const allQuestions = await this.loadDataset();
    const selected = this.selectQuestions(allQuestions, undefined, sampleSize, categories);

    if (selected.length === 0) throw new Error('没有符合条件的题目');

    this.logger.log(`[SubAgent] Starting benchmark with ${selected.length} questions`);

    const results: BenchmarkResultItem[] = [];
    let totalDuration = 0;

    for (const question of selected) {
      const startTime = Date.now();

      try {
        const baziPillars = await this.buildBaziPillars(question);
        const ziweiChart = await this.buildZiweiChart(question);

        let finalAnswer: string | null = null;
        let llmContent = '';

        if (this.subAgentService) {
          const pipelineResult = await this.subAgentService.runSubAgentPipeline(
            question, baziPillars, ziweiChart, provider,
          );
          finalAnswer = pipelineResult.finalAnswer;
          llmContent = `[八字Agent] ${pipelineResult.baziResult.analysis.slice(0, 300)}\n` +
            (pipelineResult.ziweiResult ? `[紫微Agent] ${pipelineResult.ziweiResult.analysis.slice(0, 300)}\n` : '') +
            `[综合Agent] ${pipelineResult.synthesisResult.analysis.slice(0, 300)}`;
        } else {
          // Fallback: 用原有 buildPrompt 方法
          const prompt = this.buildPrompt(question, true, true, baziPillars, ziweiChart);
          llmContent = await this.callLlmDirect(prompt, provider);
          finalAnswer = this.parseAnswer(llmContent);
        }

        const durationMs = Date.now() - startTime;
        totalDuration += durationMs;
        const isCorrect = finalAnswer === question.answer.toUpperCase();

        results.push({
          id: question.id,
          question: question.question,
          category: question.category,
          correctAnswer: question.answer.toUpperCase(),
          predictedAnswer: finalAnswer,
          isCorrect,
          llmContent,
          durationMs,
          baziPillars,
          ziweiChart,
        });
      } catch (error) {
        const err = error as Error;
        this.logger.error(`SubAgent failed for ${question.id}: ${err.message}`);
        results.push({
          id: question.id,
          question: question.question,
          category: question.category,
          correctAnswer: question.answer.toUpperCase(),
          predictedAnswer: null,
          isCorrect: false,
          llmContent: `ERROR: ${err.message}`,
          durationMs: Date.now() - startTime,
        });
      }
    }

    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = results.length > 0 ? correctCount / results.length : 0;
    const perQuestionScores = results.map(r => r.isCorrect ? 1 : 0).sort((a, b) => a - b);
    let trimmedAccuracy = accuracy;
    if (perQuestionScores.length >= 4) {
      const trimmed = perQuestionScores.slice(1, -1);
      trimmedAccuracy = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
    }

    const categoryBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const r of results) {
      if (!categoryBreakdown[r.category]) categoryBreakdown[r.category] = { total: 0, correct: 0, accuracy: 0 };
      categoryBreakdown[r.category].total += 1;
      if (r.isCorrect) categoryBreakdown[r.category].correct += 1;
    }
    for (const cat of Object.keys(categoryBreakdown)) {
      const c = categoryBreakdown[cat];
      c.accuracy = c.total > 0 ? c.correct / c.total : 0;
    }

    const runResult: BenchmarkRunResult = {
      runId: `subagent_${Date.now()}`,
      timestamp: new Date().toISOString(),
      config: { sampleSize: selected.length, useCot: true, useAstro: true, shuffleOptions: false, provider, rounds: 1 },
      summary: {
        total: selected.length,
        correct: correctCount,
        accuracy: parseFloat(accuracy.toFixed(4)),
        trimmedAccuracy: parseFloat(trimmedAccuracy.toFixed(4)),
        avgDurationMs: results.length > 0 ? Math.round(totalDuration / results.length) : 0,
      },
      categoryBreakdown,
      results,
    };

    this.history.push(runResult);
    this.logger.log(`[SubAgent] completed | accuracy: ${(accuracy * 100).toFixed(2)}% | ${correctCount}/${selected.length}`);
    return runResult;
  }

  /**
   * P1: 分类维度分析 — 按12分类统计准确率，找出弱项
   */
  async analyzeCategoryPerformance(params: {
    sampleSize?: number;
    provider?: LlmProviderType;
    useCot?: boolean;
    useAstro?: boolean;
  }): Promise<{
    categoryStats: Record<string, { total: number; correct: number; accuracy: number; weakness: boolean }>;
    weakCategories: string[];
    strongCategories: string[];
    overallAccuracy: number;
  }> {
    const { sampleSize = 5, provider = 'deepseek', useCot = true, useAstro = true } = params;
    const allQuestions = await this.loadDataset();
    const categories = Object.keys(QUESTION_CATEGORIES);

    const categoryStats: Record<string, { total: number; correct: number; accuracy: number; weakness: boolean }> = {};

    for (const category of categories) {
      const catQuestions = allQuestions.filter(q => q.category === category).slice(0, sampleSize);
      if (catQuestions.length === 0) continue;

      let correct = 0;
      for (const q of catQuestions) {
        const baziPillars = useAstro ? await this.buildBaziPillars(q) : undefined;
        const ziweiChart = useAstro ? await this.buildZiweiChart(q) : undefined;
        const prompt = this.buildPrompt(q, useCot, useAstro, baziPillars, ziweiChart);

        let content = '';
        try {
          content = await this.callLlmDirect(prompt, provider);
        } catch {
          content = '';
        }

        const predicted = this.parseAnswer(content);
        if (predicted === q.answer.toUpperCase()) correct++;
      }

      const accuracy = catQuestions.length > 0 ? correct / catQuestions.length : 0;
      categoryStats[category] = {
        total: catQuestions.length,
        correct,
        accuracy: parseFloat(accuracy.toFixed(4)),
        weakness: accuracy < 0.25,
      };
    }

    const weakCategories = Object.entries(categoryStats)
      .filter(([, s]) => s.weakness)
      .map(([c]) => c);

    const strongCategories = Object.entries(categoryStats)
      .filter(([, s]) => s.accuracy >= 0.4)
      .map(([c]) => c);

    const totalCorrect = Object.values(categoryStats).reduce((s, v) => s + v.correct, 0);
    const totalQuestions = Object.values(categoryStats).reduce((s, v) => s + v.total, 0);
    const overallAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

    return {
      categoryStats,
      weakCategories,
      strongCategories,
      overallAccuracy: parseFloat(overallAccuracy.toFixed(4)),
    };
  }
}
