/**
 * Prompt Injection Guard Service - 输入层护栏（事前消毒）
 *
 * 目的：防止用户通过精心构造的输入操纵 LLM 偏离角色。
 * 覆盖场景：
 *  - 单轮注入检测（角色劫持、系统指令伪造、忽略前文、指令覆盖、标签注入、提示词泄露、指令绕过）
 *  - 输入消毒（移除注入模式、限制长度、移除控制字符）
 *  - 多轮累积检测（防止渐进式 Prompt 注入攻击）
 *
 * 风险分级：
 *  - high：检测到角色劫持 / 系统指令伪造 / 标签注入 / 指令绕过 → isSafe=false
 *  - medium：检测到忽略前文 / 指令覆盖 / 提示词泄露 → isSafe=true，sanitizedInput 移除注入模式
 *  - low：无检测到注入模式 → isSafe=true
 */

import { Injectable, Logger } from '@nestjs/common';

export interface InjectionCheckResult {
  isSafe: boolean;
  detectedPatterns: string[];
  sanitizedInput: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface PatternDef {
  name: string;
  pattern: RegExp;
  riskLevel: 'high' | 'medium';
}

const MAX_INPUT_LENGTH = 2000;
const ACCUMULATION_THRESHOLD = 3;

// 控制字符（保留 \t \n \r 常见空白）
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// 注入模式清单（按风险分级）
const INJECTION_PATTERNS: PatternDef[] = [
  // HIGH — 角色劫持
  { name: 'role_hijack_you_are_now', pattern: /\byou are now\b/i, riskLevel: 'high' },
  { name: 'role_hijack_you_are', pattern: /\byou are\b/i, riskLevel: 'high' },
  { name: 'role_hijack_act_as', pattern: /\bact as\b/i, riskLevel: 'high' },
  { name: 'role_hijack_pretend_to_be', pattern: /\bpretend to be\b/i, riskLevel: 'high' },
  // HIGH — 系统指令伪造
  { name: 'system_forgery_system_colon', pattern: /\bsystem\s*:/i, riskLevel: 'high' },
  { name: 'system_forgery_bracket', pattern: /\[system\]/i, riskLevel: 'high' },
  { name: 'system_forgery_tag_open', pattern: /<system>/i, riskLevel: 'high' },
  // HIGH — 标签注入
  { name: 'tag_injection_system_close', pattern: /<\/system>/i, riskLevel: 'high' },
  { name: 'tag_injection_assistant_close', pattern: /<\/assistant>/i, riskLevel: 'high' },
  // HIGH — 指令绕过
  { name: 'bypass_do_not_follow', pattern: /\bdo not follow\b/i, riskLevel: 'high' },
  { name: 'bypass_dont_follow', pattern: /\bdon'?t follow\b/i, riskLevel: 'high' },
  // MEDIUM — 忽略前文
  { name: 'ignore_previous', pattern: /\bignore previous\b/i, riskLevel: 'medium' },
  { name: 'ignore_above', pattern: /\bignore above\b/i, riskLevel: 'medium' },
  { name: 'forget_previous', pattern: /\bforget previous\b/i, riskLevel: 'medium' },
  // MEDIUM — 指令覆盖
  { name: 'new_instructions', pattern: /\bnew instructions?\s*:/i, riskLevel: 'medium' },
  { name: 'override', pattern: /\boverride\s*:/i, riskLevel: 'medium' },
  // MEDIUM — 提示词泄露
  { name: 'reveal_your', pattern: /\breveal your\b/i, riskLevel: 'medium' },
  { name: 'show_your', pattern: /\bshow your\b/i, riskLevel: 'medium' },
  { name: 'print_your', pattern: /\bprint your\b/i, riskLevel: 'medium' },
];

@Injectable()
export class PromptInjectionGuardService {
  private readonly logger = new Logger(PromptInjectionGuardService.name);

  /**
   * 检查单条用户输入是否包含 Prompt 注入模式
   */
  checkInput(userInput: string): InjectionCheckResult {
    const detectedPatterns: string[] = [];
    let highestRisk: 'low' | 'medium' | 'high' = 'low';

    for (const def of INJECTION_PATTERNS) {
      if (def.pattern.test(userInput)) {
        detectedPatterns.push(def.name);
        if (def.riskLevel === 'high') {
          highestRisk = 'high';
        } else if (def.riskLevel === 'medium' && highestRisk !== 'high') {
          highestRisk = 'medium';
        }
      }
    }

    const sanitizedInput = this.sanitizeInput(userInput);
    const isSafe = highestRisk !== 'high';

    if (detectedPatterns.length > 0) {
      this.logger.warn(
        `[PromptInjectionGuard] 检测到 ${detectedPatterns.length} 个注入模式: ${detectedPatterns.join(', ')}, riskLevel=${highestRisk}`,
      );
    }

    return { isSafe, detectedPatterns, sanitizedInput, riskLevel: highestRisk };
  }

  /**
   * 消毒用户输入：移除注入模式、控制字符，限制长度
   */
  sanitizeInput(userInput: string): string {
    let result = userInput;

    // 移除所有注入模式（使用全局正则替换所有出现）
    for (const def of INJECTION_PATTERNS) {
      const globalRegex = new RegExp(def.pattern.source, 'gi');
      result = result.replace(globalRegex, '');
    }

    // 移除控制字符
    result = result.replace(CONTROL_CHARS, '');

    // 限制长度
    if (result.length > MAX_INPUT_LENGTH) {
      result = result.slice(0, MAX_INPUT_LENGTH);
    }

    return result;
  }

  /**
   * 检测多轮对话中是否出现渐进式 Prompt 注入
   * 累积出现 ≥3 次注入模式时 riskLevel='high'，isSafe=false
   */
  checkMultiTurnAccumulation(
    dialogueHistory: Array<{ role: string; content: string }>,
  ): InjectionCheckResult {
    let totalDetections = 0;
    const detectedPatterns: string[] = [];

    for (const turn of dialogueHistory) {
      if (turn.role !== 'user') continue;
      for (const def of INJECTION_PATTERNS) {
        const globalRegex = new RegExp(def.pattern.source, 'gi');
        const matches = turn.content.match(globalRegex);
        if (matches) {
          totalDetections += matches.length;
          if (!detectedPatterns.includes(def.name)) {
            detectedPatterns.push(def.name);
          }
        }
      }
    }

    const isSafe = totalDetections < ACCUMULATION_THRESHOLD;
    const riskLevel: 'low' | 'medium' | 'high' =
      totalDetections >= ACCUMULATION_THRESHOLD
        ? 'high'
        : totalDetections > 0
          ? 'medium'
          : 'low';

    // 返回最后一条用户消息的消毒结果（便于调用方继续使用）
    const lastUserTurn = [...dialogueHistory]
      .reverse()
      .find((t) => t.role === 'user');
    const sanitizedInput = lastUserTurn
      ? this.sanitizeInput(lastUserTurn.content)
      : '';

    if (totalDetections > 0) {
      this.logger.warn(
        `[PromptInjectionGuard] 多轮累积检测: ${totalDetections} 次注入模式命中, riskLevel=${riskLevel}`,
      );
    }

    return { isSafe, detectedPatterns, sanitizedInput, riskLevel };
  }
}
