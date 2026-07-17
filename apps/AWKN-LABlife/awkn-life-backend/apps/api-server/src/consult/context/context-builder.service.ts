import { Injectable, Logger } from '@nestjs/common';
import { TokenCounterService } from './token-counter.service';

/**
 * 上下文消息类型
 */
export interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Token 预算分配
 */
export interface ContextBudget {
  systemPrompt: number;     // 系统提示词预算
  summary: number;          // 摘要预算
  recentTurns: number;      // 最近轮次预算
  currentUserInput: number; // 当前用户输入
  total: number;            // 总预算
}

/**
 * 对话轮次类型（与 DialogueService.DialogueTurn 对齐）
 */
export interface DialogueTurnInput {
  role: 'user' | 'zhangbanshan';
  content: string;
  timestamp: number;
}

/**
 * buildContext 入参
 */
export interface BuildContextOptions {
  systemPrompt: string;
  dialogueTurns: DialogueTurnInput[];
  summary?: string;         // 已有的对话摘要
  currentUserInput: string;
  maxTotalTokens?: number;  // 默认 4000
  keepRecentTurns?: number; // 默认 3（保留最近3轮 = 6条消息）
}

/**
 * buildContext 返回
 */
export interface BuildContextResult {
  messages: ContextMessage[];
  tokenCount: number;
  truncatedTurns: number;   // 被截断的轮次数
}

/**
 * 上下文构建器服务
 * 实现 Token-aware 滑动窗口策略：
 * 1. 优先保留 systemPrompt + currentUserInput
 * 2. 剩余预算分配给 summary + recentTurns
 * 3. 从最近轮次向前填充，直到预算耗尽
 */
@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  /** 默认总 Token 预算 */
  private static readonly DEFAULT_MAX_TOKENS = 4000;
  /** 默认保留最近轮数（每轮 = user + assistant） */
  private static readonly DEFAULT_KEEP_RECENT = 3;
  /** 每条消息的 role 开销 */
  private static readonly ROLE_OVERHEAD = 4;
  /** priming 开销 */
  private static readonly PRIMING_OVERHEAD = 2;
  /** 摘最多占剩余预算的 40% */
  private static readonly SUMMARY_BUDGET_RATIO = 0.4;

  constructor(private readonly tokenCounter: TokenCounterService) {}

  /**
   * 构建上下文消息列表（滑动窗口 + Token 预算控制）
   *
   * 构建顺序：systemPrompt → summary → recentTurns（按时间正序）→ currentUserInput
   * 截断策略：从最旧的 recentTurns 开始丢弃，直到 Token 预算满足
   */
  buildContext(options: BuildContextOptions): BuildContextResult {
    const {
      systemPrompt,
      dialogueTurns,
      summary,
      currentUserInput,
      maxTotalTokens = ContextBuilderService.DEFAULT_MAX_TOKENS,
      keepRecentTurns = ContextBuilderService.DEFAULT_KEEP_RECENT,
    } = options;

    // 1. 计算固定开销：systemPrompt + currentUserInput
    const systemTokens = this.tokenCounter.countTokens(systemPrompt) + ContextBuilderService.ROLE_OVERHEAD;
    const userInputTokens = this.tokenCounter.countTokens(currentUserInput) + ContextBuilderService.ROLE_OVERHEAD;
    const fixedCost = systemTokens + userInputTokens + ContextBuilderService.PRIMING_OVERHEAD;

    // 2. 计算剩余预算
    let remainingBudget = maxTotalTokens - fixedCost;
    if (remainingBudget < 0) {
      this.logger.warn(
        `[buildContext] 固定开销 ${fixedCost} 已超过总预算 ${maxTotalTokens}，将仅保留 system + user input`,
      );
      remainingBudget = 0;
    }

    // 3. 摘要预算分配
    let summaryTokens = 0;
    let summaryMessage: ContextMessage | null = null;
    if (summary && remainingBudget > 0) {
      const summaryContent = `【对话历史摘要】\n${summary}`;
      const rawSummaryTokens = this.tokenCounter.countTokens(summaryContent) + ContextBuilderService.ROLE_OVERHEAD;
      const summaryBudgetCap = Math.floor(remainingBudget * ContextBuilderService.SUMMARY_BUDGET_RATIO);
      summaryTokens = Math.min(rawSummaryTokens, summaryBudgetCap);
      if (rawSummaryTokens <= summaryBudgetCap) {
        // 摘要完整放入
        summaryMessage = { role: 'system', content: summaryContent };
      } else {
        // 摘要超预算，截断到预算内（按字符比例粗略截断）
        const ratio = summaryBudgetCap / rawSummaryTokens;
        const truncatedSummary = summaryContent.slice(0, Math.floor(summaryContent.length * ratio));
        summaryMessage = { role: 'system', content: truncatedSummary };
        summaryTokens = this.tokenCounter.countTokens(truncatedSummary) + ContextBuilderService.ROLE_OVERHEAD;
      }
      remainingBudget -= summaryTokens;
    }

    // 4. 滑动窗口：从最近轮次向前填充
    const turnsToKeep = dialogueTurns.slice(-keepRecentTurns * 2); // 每轮 2 条消息
    const selectedTurns: DialogueTurnInput[] = [];
    let turnsBudget = remainingBudget;

    // 从最新向前遍历，优先保留最近的
    for (let i = turnsToKeep.length - 1; i >= 0; i--) {
      const turn = turnsToKeep[i];
      const turnTokens = this.tokenCounter.countTokens(turn.content) + ContextBuilderService.ROLE_OVERHEAD;
      if (turnTokens <= turnsBudget) {
        selectedTurns.unshift(turn); // 放到头部保持时间正序
        turnsBudget -= turnTokens;
      } else {
        // 预算不足，停止填充（更早的更不可能放下）
        break;
      }
    }

    // 5. 计算被截断的轮次数
    const keptTurnCount = selectedTurns.length;
    const totalTurnCount = dialogueTurns.length;
    const truncatedTurns = totalTurnCount - keptTurnCount;

    // 6. 组装消息列表
    const messages: ContextMessage[] = [];
    messages.push({ role: 'system', content: systemPrompt });
    if (summaryMessage) {
      messages.push(summaryMessage);
    }
    for (const turn of selectedTurns) {
      messages.push({
        role: turn.role === 'user' ? 'user' : 'assistant',
        content: turn.content,
      });
    }
    messages.push({ role: 'user', content: currentUserInput });

    // 7. 计算总 Token 数
    const tokenCount = this.tokenCounter.countMessagesTokens(messages);

    this.logger.log(
      `[buildContext] turns=${totalTurnCount} kept=${keptTurnCount} truncated=${truncatedTurns} summary=${!!summaryMessage} tokens=${tokenCount}/${maxTotalTokens}`,
    );

    return { messages, tokenCount, truncatedTurns };
  }
}