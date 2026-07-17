import { Injectable, Logger, Optional } from '@nestjs/common';
import { LlmProvidersService, LlmProviderType } from '../../llm-providers/llm-providers.service';

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ContextWindowResult {
  messages: ContextMessage[];
  totalTokens: number;
  wasTruncated: boolean;
  summaryGenerated: boolean;
}

@Injectable()
export class ContextWindowService {
  private readonly logger = new Logger(ContextWindowService.name);

  // 默认Token限制
  private readonly MAX_CONTEXT_TOKENS = 4000;
  private readonly SUMMARY_RESERVE_TOKENS = 500;
  private readonly CHARS_PER_TOKEN = 2; // 中文约2字符/token

  constructor(
    @Optional() private readonly llmProviders?: LlmProvidersService,
  ) {}

  /**
   * 滑动窗口：截断过长的上下文
   */
  applySlidingWindow(
    messages: ContextMessage[],
    maxTokens: number = this.MAX_CONTEXT_TOKENS,
  ): ContextWindowResult {
    const totalTokens = this.estimateTokens(messages);
    const wasTruncated = totalTokens > maxTokens;

    if (!wasTruncated) {
      return { messages, totalTokens, wasTruncated: false, summaryGenerated: false };
    }

    // 保留system消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const systemTokens = this.estimateTokens(systemMessages);
    const availableTokens = maxTokens - systemTokens - this.SUMMARY_RESERVE_TOKENS;

    // 从最新的消息开始保留
    const keptMessages: ContextMessage[] = [];
    let usedTokens = 0;

    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens([conversationMessages[i]]);
      if (usedTokens + msgTokens > availableTokens) break;
      keptMessages.unshift(conversationMessages[i]);
      usedTokens += msgTokens;
    }

    return {
      messages: [...systemMessages, ...keptMessages],
      totalTokens: systemTokens + usedTokens,
      wasTruncated: true,
      summaryGenerated: false,
    };
  }

  /**
   * 摘要压缩：将早期对话压缩为摘要
   */
  async compressWithSummary(
    messages: ContextMessage[],
    maxTokens: number = this.MAX_CONTEXT_TOKENS,
    provider: LlmProviderType = 'deepseek',
  ): Promise<ContextWindowResult> {
    const totalTokens = this.estimateTokens(messages);

    if (totalTokens <= maxTokens) {
      return { messages, totalTokens, wasTruncated: false, summaryGenerated: false };
    }

    // 分离system消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // 找到需要压缩的早期消息
    const systemTokens = this.estimateTokens(systemMessages);
    const availableTokens = maxTokens - systemTokens - this.SUMMARY_RESERVE_TOKENS;

    // 从后往前保留
    let keptFromEnd = 0;
    let usedTokens = 0;
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msgTokens = this.estimateTokens([conversationMessages[i]]);
      if (usedTokens + msgTokens > availableTokens * 0.7) break; // 70%给最近对话
      keptFromEnd++;
      usedTokens += msgTokens;
    }

    const messagesToCompress = conversationMessages.slice(0, conversationMessages.length - keptFromEnd);
    const recentMessages = conversationMessages.slice(conversationMessages.length - keptFromEnd);

    // 生成摘要
    let summary = '';
    if (this.llmProviders && messagesToCompress.length > 0) {
      try {
        const conversationText = messagesToCompress
          .map(m => `${m.role === 'user' ? '用户' : '张半山'}：${m.content}`)
          .join('\n');

        const response = await this.llmProviders.chat(
          [
            {
              role: 'system',
              content: '请将以下对话历史压缩为一段简洁的摘要，保留关键信息（出生时间、地点、问题、已给出的判断）。不超过200字。',
            },
            { role: 'user', content: conversationText },
          ],
          provider,
          { temperature: 0.3, maxTokens: 300 },
        );
        summary = response.content || '';
      } catch (err) {
        this.logger.warn(`Summary compression failed: ${(err as Error).message}`);
        summary = messagesToCompress
          .map(m => `${m.role}：${m.content.slice(0, 50)}...`)
          .join('\n');
      }
    }

    const summaryMessage: ContextMessage = {
      role: 'system',
      content: `【对话历史摘要】\n${summary}`,
    };

    const result = [
      ...systemMessages,
      summaryMessage,
      ...recentMessages,
    ];

    return {
      messages: result,
      totalTokens: this.estimateTokens(result),
      wasTruncated: true,
      summaryGenerated: true,
    };
  }

  /**
   * 估算Token数
   */
  private estimateTokens(messages: ContextMessage[]): number {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / this.CHARS_PER_TOKEN);
  }
}
