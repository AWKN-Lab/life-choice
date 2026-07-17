import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProvidersService, LlmProviderType } from '../llm-providers/llm-providers.service';
import { StyleTemplateService, WritingStyle } from './style-template.service';
import { buildIdentityLayer } from '../consult/orchestrator/prompt-layers';

export interface AgentRelayInput {
  agentName: string;
  rawOutput: string;
  style?: WritingStyle;
  question?: string;
  category?: string;
  userId?: string;
}

export interface AgentRelayOutput {
  styledContent: string;
  originalContent: string;
  style: WritingStyle;
  durationMs: number;
  tokenCount?: number;
}

@Injectable()
export class AgentRelayService {
  private readonly logger = new Logger(AgentRelayService.name);

  constructor(
    private readonly styleTemplateService: StyleTemplateService,
    @Optional() private readonly llmProviders?: LlmProvidersService,
  ) {}

  /**
   * 智能体中转：将 Agent 原始输出注入风格后重新生成
   */
  async relay(input: AgentRelayInput, provider: LlmProviderType = 'deepseek'): Promise<AgentRelayOutput> {
    const startTime = Date.now();
    const style = input.style || 'warm';

    // 如果没有 LLM，直接返回原始输出
    if (!this.llmProviders) {
      return {
        styledContent: input.rawOutput,
        originalContent: input.rawOutput,
        style,
        durationMs: Date.now() - startTime,
      };
    }

    // 构建风格化系统提示词
    const basePrompt = buildIdentityLayer() + `\n\n你是${input.agentName}的输出中转层。请将以下原始分析结果，用指定风格重新组织表达，保持核心判断不变。`;
    const styledSystemPrompt = this.styleTemplateService.buildStyledSystemPrompt(style, basePrompt);

    const userPrompt = [
      `【原始分析】\n${input.rawOutput.slice(0, 1000)}`,
      input.question ? `\n【用户问题】${input.question}` : '',
      input.category ? `\n【问题分类】${input.category}` : '',
      '\n请用指定风格重新组织以上分析，保持核心判断和命理依据不变。',
    ].filter(Boolean).join('\n');

    try {
      const response = await this.llmProviders.chat(
        [
          { role: 'system', content: styledSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        provider,
        { temperature: 0.5, maxTokens: 800 },
      );

      return {
        styledContent: response.content,
        originalContent: input.rawOutput,
        style,
        durationMs: Date.now() - startTime,
        tokenCount: response.usage
          ? response.usage.promptTokens + response.usage.completionTokens
          : undefined,
      };
    } catch (error) {
      this.logger.warn(`Agent relay LLM failed: ${(error as Error).message}, returning original`);
      return {
        styledContent: input.rawOutput,
        originalContent: input.rawOutput,
        style,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 批量中转：多个 Agent 输出统一风格化
   */
  async relayBatch(inputs: AgentRelayInput[], provider: LlmProviderType = 'deepseek'): Promise<AgentRelayOutput[]> {
    const results = await Promise.allSettled(
      inputs.map(input => this.relay(input, provider)),
    );
    return results.map((r, idx) =>
      r.status === 'fulfilled' ? r.value : {
        styledContent: inputs[idx].rawOutput,
        originalContent: inputs[idx].rawOutput,
        style: inputs[idx].style || 'warm',
        durationMs: 0,
      }
    );
  }
}
