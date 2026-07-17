import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProvidersService, LlmProviderType } from '../llm-providers/llm-providers.service';

export interface QualityScore {
  overall: number;
  dimensions: {
    coherence: number;      // 连贯性
    accuracy: number;       // 命理准确性
    style: number;          // 风格一致性
    empathy: number;        // 共情度
    actionability: number;  // 可操作性
  };
  issues: string[];
  suggestions: string[];
}

@Injectable()
export class QualityEvaluatorService {
  private readonly logger = new Logger(QualityEvaluatorService.name);

  constructor(
    @Optional() private readonly llmProviders?: LlmProvidersService,
  ) {}

  /**
   * 评估输出质量
   */
  async evaluate(params: {
    content: string;
    style: string;
    category?: string;
    provider?: LlmProviderType;
  }): Promise<QualityScore> {
    const { content, style, category, provider = 'deepseek' } = params;

    // 基于规则的质量评估（无需LLM）
    const ruleBasedScore = this.ruleBasedEvaluation(content, style);

    // 如果有LLM，叠加LLM评估
    if (this.llmProviders) {
      try {
        const llmScore = await this.llmBasedEvaluation(content, style, category, provider);
        // 加权融合：规则60% + LLM 40%
        return this.mergeScores(ruleBasedScore, llmScore, 0.6);
      } catch (err) {
        this.logger.debug(`LLM evaluation failed: ${(err as Error).message}`);
      }
    }

    return ruleBasedScore;
  }

  /**
   * 规则评估
   */
  private ruleBasedEvaluation(content: string, style: string): QualityScore {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 连贯性：检查是否有明显的逻辑断裂
    let coherence = 0.8;
    if (content.length < 50) {
      coherence = 0.3;
      issues.push('内容过短');
      suggestions.push('补充更多分析内容');
    }
    if (!content.includes('，') && !content.includes('。')) {
      coherence = 0.4;
      issues.push('缺少标点，可能不连贯');
    }

    // 命理准确性：检查是否包含命理关键词
    let accuracy = 0.5;
    const metaphysicsKeywords = ['五行', '日主', '用神', '十神', '大运', '流年', '命宫', '四化', '格局'];
    const keywordCount = metaphysicsKeywords.filter(k => content.includes(k)).length;
    accuracy = Math.min(1.0, 0.3 + keywordCount * 0.1);

    // 风格一致性
    let styleScore = 0.7;
    if (style === 'concise' && content.length > 400) {
      styleScore = 0.4;
      issues.push('简洁风格但内容过长');
      suggestions.push('精简内容至300字以内');
    }
    if (style === 'detailed' && content.length < 300) {
      styleScore = 0.4;
      issues.push('详细风格但内容过短');
      suggestions.push('补充更多分析细节');
    }
    if (style === 'warm' && !content.includes('您')) {
      styleScore = 0.5;
      suggestions.push('温暖风格建议使用"您"等敬语');
    }

    // 共情度
    let empathy = 0.5;
    const empathyWords = ['理解', '担心', '放心', '注意', '照顾', '建议', '希望'];
    const empathyCount = empathyWords.filter(w => content.includes(w)).length;
    empathy = Math.min(1.0, 0.3 + empathyCount * 0.15);

    // 可操作性
    let actionability = 0.5;
    const actionWords = ['建议', '可以', '注意', '避免', '适合', '不宜'];
    const actionCount = actionWords.filter(w => content.includes(w)).length;
    actionability = Math.min(1.0, 0.3 + actionCount * 0.15);

    const overall = (coherence + accuracy + styleScore + empathy + actionability) / 5;

    return {
      overall: parseFloat(overall.toFixed(2)),
      dimensions: {
        coherence: parseFloat(coherence.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        style: parseFloat(styleScore.toFixed(2)),
        empathy: parseFloat(empathy.toFixed(2)),
        actionability: parseFloat(actionability.toFixed(2)),
      },
      issues,
      suggestions,
    };
  }

  /**
   * LLM评估
   */
  private async llmBasedEvaluation(
    content: string,
    style: string,
    category?: string,
    provider: LlmProviderType = 'deepseek',
  ): Promise<QualityScore> {
    const prompt = [
      '请评估以下命理分析输出的质量，按5个维度打分（0-1）：',
      '1. 连贯性（逻辑是否连贯）',
      '2. 命理准确性（是否正确使用命理概念）',
      '3. 风格一致性（是否符合指定风格）',
      '4. 共情度（是否理解用户处境）',
      '5. 可操作性（建议是否可执行）',
      '',
      `风格：${style}`,
      category ? `分类：${category}` : '',
      `内容：${content.slice(0, 500)}`,
      '',
      '请以JSON格式返回：{"coherence":0.8,"accuracy":0.7,"style":0.9,"empathy":0.6,"actionability":0.7,"issues":["问题1"],"suggestions":["建议1"]}',
    ].join('\n');

    const response = await this.llmProviders!.chat(
      [{ role: 'user', content: prompt }],
      provider,
      { temperature: 0.2, maxTokens: 300 },
    );

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overall: (parsed.coherence + parsed.accuracy + parsed.style + parsed.empathy + parsed.actionability) / 5,
          dimensions: {
            coherence: parsed.coherence || 0.5,
            accuracy: parsed.accuracy || 0.5,
            style: parsed.style || 0.5,
            empathy: parsed.empathy || 0.5,
            actionability: parsed.actionability || 0.5,
          },
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
        };
      }
    } catch {
      this.logger.debug('Failed to parse LLM evaluation JSON');
    }

    return {
      overall: 0.5,
      dimensions: { coherence: 0.5, accuracy: 0.5, style: 0.5, empathy: 0.5, actionability: 0.5 },
      issues: [],
      suggestions: [],
    };
  }

  private mergeScores(rule: QualityScore, llm: QualityScore, ruleWeight: number): QualityScore {
    const llmWeight = 1 - ruleWeight;
    return {
      overall: parseFloat((rule.overall * ruleWeight + llm.overall * llmWeight).toFixed(2)),
      dimensions: {
        coherence: parseFloat((rule.dimensions.coherence * ruleWeight + llm.dimensions.coherence * llmWeight).toFixed(2)),
        accuracy: parseFloat((rule.dimensions.accuracy * ruleWeight + llm.dimensions.accuracy * llmWeight).toFixed(2)),
        style: parseFloat((rule.dimensions.style * ruleWeight + llm.dimensions.style * llmWeight).toFixed(2)),
        empathy: parseFloat((rule.dimensions.empathy * ruleWeight + llm.dimensions.empathy * llmWeight).toFixed(2)),
        actionability: parseFloat((rule.dimensions.actionability * ruleWeight + llm.dimensions.actionability * llmWeight).toFixed(2)),
      },
      issues: [...new Set([...rule.issues, ...llm.issues])],
      suggestions: [...new Set([...rule.suggestions, ...llm.suggestions])],
    };
  }
}
