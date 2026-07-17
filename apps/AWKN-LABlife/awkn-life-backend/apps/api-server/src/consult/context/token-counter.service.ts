import { Injectable } from '@nestjs/common';
import { encode } from 'gpt-tokenizer';

/**
 * Token 计数服务
 * 基于 gpt-tokenizer（纯 JS 实现，兼容 GPT 系列 BPE 分词）
 * 用于多轮对话上下文的 Token 预算控制
 */
@Injectable()
export class TokenCounterService {
  /**
   * 计算文本的 Token 数
   * 降级策略：gpt-tokenizer 失败时按字符数估算（中文约 1.5 字/token，英文约 4 字符/token，取中间值 /2）
   */
  countTokens(text: string): number {
    if (!text) return 0;
    try {
      return encode(text).length;
    } catch {
      return Math.ceil(text.length / 2);
    }
  }

  /**
   * 计算消息数组的 Token 数（含 role 开销）
   * 每条消息额外 +4 token 用于 role 标记与分隔符，末尾 +2 token 用于 priming
   */
  countMessagesTokens(messages: Array<{ role: string; content: string }>): number {
    let total = 0;
    for (const msg of messages) {
      total += this.countTokens(msg.content);
      total += 4; // role + delimiters 开销
    }
    total += 2; // priming 开销
    return total;
  }
}