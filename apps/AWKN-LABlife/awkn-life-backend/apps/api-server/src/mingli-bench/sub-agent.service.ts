import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProvidersService, LlmProviderType } from '../llm-providers/llm-providers.service';
import { BaziCalculatorWrapper } from '../calc-engine/bazi-calculator-wrapper';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';
import { BenchmarkQuestion } from './mingli-bench.service';

export interface SubAgentResult {
  agentName: string;
  analysis: string;
  confidence: number;
  predictedAnswer: string | null;
  durationMs: number;
}

@Injectable()
export class SubAgentService {
  private readonly logger = new Logger(SubAgentService.name);

  constructor(
    @Optional() private readonly llmProviders?: LlmProvidersService,
    @Optional() private readonly baziCalculator?: BaziCalculatorWrapper,
  ) {}

  /**
   * 八字分析子代理
   */
  async baziAnalysis(
    question: BenchmarkQuestion,
    baziPillars: string,
    provider: LlmProviderType = 'deepseek',
  ): Promise<SubAgentResult> {
    const startTime = Date.now();
    const prompt = [
      '你是一位专精八字命理的分析师。请根据以下八字排盘数据，分析命主的运势走向。',
      '',
      `命主信息：${question.birth_info.raw}`,
      `八字排盘：\n${baziPillars}`,
      '',
      `问题：${question.question}`,
      `选项：\n${question.options.map(o => `${o.letter}. ${o.text}`).join('\n')}`,
      '',
      '请从以下维度分析：',
      '1. 日主强弱与用神',
      '2. 十神关系与问题对应',
      '3. 大运流年对问题的影响',
      '4. 逐个选项的命理契合度',
      '',
      '分析完成后，给出你认为最可能的选项。格式：[ANSWER]X',
    ].join('\n');

    const analysis = await this.callLlm(prompt, provider);
    const predicted = this.extractAnswer(analysis);
    const durationMs = Date.now() - startTime;

    return {
      agentName: 'bazi-analyst',
      analysis,
      confidence: predicted ? 0.7 : 0.3,
      predictedAnswer: predicted,
      durationMs,
    };
  }

  /**
   * 紫微斗数分析子代理
   */
  async ziweiAnalysis(
    question: BenchmarkQuestion,
    ziweiChart: string,
    provider: LlmProviderType = 'deepseek',
  ): Promise<SubAgentResult> {
    const startTime = Date.now();
    const prompt = [
      '你是一位专精紫微斗数的分析师。请根据以下紫微斗数排盘数据，分析命主的运势走向。',
      '',
      `命主信息：${question.birth_info.raw}`,
      `紫微斗数排盘：\n${ziweiChart}`,
      '',
      `问题：${question.question}`,
      `选项：\n${question.options.map(o => `${o.letter}. ${o.text}`).join('\n')}`,
      '',
      '请从以下维度分析：',
      '1. 命宫主星与格局',
      '2. 四化星曜的影响',
      '3. 关键宫位的星曜组合',
      '4. 逐个选项的紫微契合度',
      '',
      '分析完成后，给出你认为最可能的选项。格式：[ANSWER]X',
    ].join('\n');

    const analysis = await this.callLlm(prompt, provider);
    const predicted = this.extractAnswer(analysis);
    const durationMs = Date.now() - startTime;

    return {
      agentName: 'ziwei-analyst',
      analysis,
      confidence: predicted ? 0.7 : 0.3,
      predictedAnswer: predicted,
      durationMs,
    };
  }

  /**
   * 综合推理子代理 — 融合八字和紫微的分析结果
   */
  async synthesizeAnalysis(
    question: BenchmarkQuestion,
    baziResult: SubAgentResult,
    ziweiResult: SubAgentResult,
    provider: LlmProviderType = 'deepseek',
  ): Promise<SubAgentResult> {
    const startTime = Date.now();
    const prompt = [
      '你是一位综合命理分析师，需要融合八字和紫微斗数两套分析体系的结论。',
      '',
      `命主信息：${question.birth_info.raw}`,
      `问题：${question.question}`,
      `选项：\n${question.options.map(o => `${o.letter}. ${o.text}`).join('\n')}`,
      '',
      '=== 八字分析结论 ===',
      baziResult.analysis.slice(-800),
      `八字分析师推荐：${baziResult.predictedAnswer || '未确定'}`,
      '',
      '=== 紫微斗数分析结论 ===',
      ziweiResult.analysis.slice(-800),
      `紫微分析师推荐：${ziweiResult.predictedAnswer || '未确定'}`,
      '',
      '请综合两套体系的结论：',
      '1. 一致性判断：两者指向是否一致',
      '2. 权重分配：不一致时如何权衡',
      '3. 最终选择：给出最可能的选项',
      '',
      '格式：[ANSWER]X',
    ].join('\n');

    const analysis = await this.callLlm(prompt, provider);
    const predicted = this.extractAnswer(analysis);
    const durationMs = Date.now() - startTime;

    // 综合置信度：两者一致时更高
    let confidence = 0.6;
    if (baziResult.predictedAnswer && ziweiResult.predictedAnswer) {
      confidence = baziResult.predictedAnswer === ziweiResult.predictedAnswer ? 0.9 : 0.5;
    }

    return {
      agentName: 'synthesis-agent',
      analysis,
      confidence,
      predictedAnswer: predicted,
      durationMs,
    };
  }

  /**
   * 完整的 Sub-Agent 管线
   */
  async runSubAgentPipeline(
    question: BenchmarkQuestion,
    baziPillars: string,
    ziweiChart: string | undefined,
    provider: LlmProviderType = 'deepseek',
  ): Promise<{
    baziResult: SubAgentResult;
    ziweiResult: SubAgentResult | null;
    synthesisResult: SubAgentResult;
    finalAnswer: string | null;
    totalDurationMs: number;
  }> {
    const startTime = Date.now();

    // Step 1: 八字分析
    const baziResult = await this.baziAnalysis(question, baziPillars, provider);

    // Step 2: 紫微分析（可选）
    let ziweiResult: SubAgentResult | null = null;
    if (ziweiChart) {
      ziweiResult = await this.ziweiAnalysis(question, ziweiChart, provider);
    }

    // Step 3: 综合推理
    const synthesisResult = ziweiResult
      ? await this.synthesizeAnalysis(question, baziResult, ziweiResult, provider)
      : baziResult; // 无紫微时直接用八字结果

    const totalDurationMs = Date.now() - startTime;

    return {
      baziResult,
      ziweiResult,
      synthesisResult,
      finalAnswer: synthesisResult.predictedAnswer,
      totalDurationMs,
    };
  }

  private async callLlm(prompt: string, provider: LlmProviderType): Promise<string> {
    if (this.llmProviders) {
      try {
        const resp = await this.llmProviders.chat(
          [
            {
              role: 'system',
              content: buildIdentityLayer() + '\n\n你是一位精通八字命理的命理师。请根据提供的命主信息和排盘数据，回答选择题。',
            },
            { role: 'user', content: prompt },
          ],
          provider,
          { temperature: 0.3, maxTokens: 512 },
        );
        return resp.content;
      } catch (err) {
        this.logger.warn(`LLM call failed: ${(err as Error).message}`);
      }
    }

    // Fallback: direct API call
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error('No LLM API key configured (DEEPSEEK_API_KEY)');
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.3,
      }),
    });
    if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return data?.choices?.[0]?.message?.content || '';
  }

  private extractAnswer(content: string): string | null {
    if (!content) return null;
    const cleaned = content.replace(/[\*_`]+/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

    const match = cleaned.match(/\[ANSWER\]\s*([A-D])\s*$/im);
    if (match) return match[1];

    const explicitMatch = cleaned.match(/答案是\s*([A-D])/i) || cleaned.match(/最终答案\s*[:：]?\s*([A-D])/i);
    if (explicitMatch) return explicitMatch[1];

    const allLetters = cleaned.match(/[A-D]/g);
    if (allLetters && allLetters.length > 0) return allLetters[allLetters.length - 1];

    return null;
  }
}
