import { Injectable, Logger, Inject } from '@nestjs/common';
import { LlmProvidersService, LlmMessage } from '../../llm-providers/llm-providers.service';
import { TokenCounterService } from './token-counter.service';
import { DialogueTurnInput } from './context-builder.service';

/**
 * 压缩入参
 */
export interface CompressOptions {
  turns: DialogueTurnInput[];
  maxSummaryTokens?: number;  // 默认 500
}

/**
 * 压缩结果
 */
export interface CompressResult {
  summary: string;
  compressedTurnCount: number;
}

/**
 * 对话摘要压缩服务
 * 当对话轮数 > 3（turns.length > 6）时，将较早的轮次压缩为摘要
 * 调用经济模型（chatCheap）生成摘要，失败时降级为简单拼接
 */
@Injectable()
export class SummaryCompressorService {
  private readonly logger = new Logger(SummaryCompressorService.name);

  /** 默认摘要最大 Token 数 */
  private static readonly DEFAULT_MAX_SUMMARY_TOKENS = 500;
  /** 触发压缩的轮次阈值（超过 3 轮 = 6 条消息） */
  private static readonly COMPRESS_THRESHOLD = 6;
  /** 保留最近轮数 */
  private static readonly KEEP_RECENT_ROUNDS = 3;
  /** 降级拼接时每轮取前 N 字符 */
  private static readonly FALLBACK_TRUNCATE_CHARS = 50;

  constructor(
    @Inject(LlmProvidersService)
    private readonly llmProviders: LlmProvidersService,
    private readonly tokenCounter: TokenCounterService,
  ) {}

  /**
   * 压缩对话轮次为摘要
   *
   * 触发条件：turns.length > 6（即超过 3 轮）
   * 压缩范围：turns[0] 到 turns[turns.length - 7]（保留最后 6 条 = 3 轮）
   * 摘要内容：用户核心诉求 + 已提供的关键信息 + 张半山已给出的判断要点
   *
   * @returns summary 为空字符串表示无需压缩；compressedTurnCount 为被压缩的轮次数
   */
  async compressTurns(options: CompressOptions): Promise<CompressResult> {
    const { turns, maxSummaryTokens = SummaryCompressorService.DEFAULT_MAX_SUMMARY_TOKENS } = options;

    // 未超过阈值，无需压缩
    if (turns.length <= SummaryCompressorService.COMPRESS_THRESHOLD) {
      return { summary: '', compressedTurnCount: 0 };
    }

    // 需要压缩的轮次：保留最后 6 条（3 轮），其余压缩
    const keepCount = SummaryCompressorService.KEEP_RECENT_ROUNDS * 2;
    const turnsToCompress = turns.slice(0, turns.length - keepCount);
    const compressedTurnCount = turnsToCompress.length;

    if (compressedTurnCount === 0) {
      return { summary: '', compressedTurnCount: 0 };
    }

    this.logger.log(
      `[compressTurns] 压缩 ${compressedTurnCount} 条轮次，保留最近 ${keepCount} 条`,
    );

    // 格式化对话文本
    const turnsText = this.formatTurns(turnsToCompress);

    // 构建摘要 prompt
    const summaryPrompt = this.buildSummaryPrompt(turnsText);

    const messages: LlmMessage[] = [
      { role: 'system', content: '你是一个对话摘要助手，擅长将多轮对话压缩为简洁的摘要。' },
      { role: 'user', content: summaryPrompt },
    ];

    try {
      // 调用经济模型生成摘要
      const response = await this.llmProviders.chatCheap(
        messages,
        {
          temperature: 0.3,
          maxTokens: maxSummaryTokens,
          timeout: 15000,
        },
        'summary-compress',
      );

      const summary = response.content.trim();

      // 校验摘要 Token 数
      const summaryTokens = this.tokenCounter.countTokens(summary);
      if (summaryTokens > maxSummaryTokens) {
        this.logger.warn(
          `[compressTurns] 摘要 ${summaryTokens} tokens 超过预算 ${maxSummaryTokens}，将截断`,
        );
        // 按 Token 比例截断
        const ratio = maxSummaryTokens / summaryTokens;
        const truncated = summary.slice(0, Math.floor(summary.length * ratio));
        return { summary: truncated, compressedTurnCount };
      }

      this.logger.log(
        `[compressTurns] 摘要生成成功，${summaryTokens} tokens，${summary.length} 字符`,
      );

      return { summary, compressedTurnCount };
    } catch (error) {
      const err = error as Error;
      this.logger.warn(
        `[compressTurns] LLM 摘要生成失败: ${err.message}，降级为简单拼接`,
      );
      // 降级：取每轮前 50 字符拼接
      const fallbackSummary = this.buildFallbackSummary(turnsToCompress);
      return { summary: fallbackSummary, compressedTurnCount };
    }
  }

  /**
   * 格式化轮次为文本
   */
  private formatTurns(turns: DialogueTurnInput[]): string {
    return turns
      .map((turn) => {
        const roleLabel = turn.role === 'user' ? '用户' : '张半山';
        return `${roleLabel}: ${turn.content}`;
      })
      .join('\n');
  }

  /**
   * 构建摘要 prompt
   */
  private buildSummaryPrompt(turnsText: string): string {
    return `你是一个对话摘要助手。请将以下多轮对话压缩为一段不超过 500 token 的摘要。

要求：
1. 保留用户的核心诉求和已提供的关键信息（如生辰、具体困境）
2. 保留张半山已给出的核心判断要点
3. 丢弃寒暄和重复内容
4. 用第三人称客观描述

对话内容：
${turnsText}`;
  }

  /**
   * 降级摘要：每轮取前 50 字符拼接
   */
  private buildFallbackSummary(turns: DialogueTurnInput[]): string {
    const parts = turns.map((turn) => {
      const roleLabel = turn.role === 'user' ? '用户' : '张半山';
      const truncated = turn.content.slice(0, SummaryCompressorService.FALLBACK_TRUNCATE_CHARS);
      return `${roleLabel}: ${truncated}`;
    });
    return `【对话历史摘要（降级版）】\n${parts.join('\n')}`;
  }
}