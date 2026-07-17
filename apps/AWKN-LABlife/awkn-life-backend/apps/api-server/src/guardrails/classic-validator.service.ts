/**
 * 经典引用白名单（P-02）
 *
 * 仅收录公认可溯源的命理 / 哲学经典原文，未在白名单的引用一律拦截。
 *
 * 安全说明：
 * - 白名单仅校验书名，不校验引用内容真实性（LLM 可引用《周易》但编造内容）
 * - 调用方应在输出中标注"经典引用仅供参考，内容真实性未验证"
 * - 检测模式覆盖常见变体：云/曰/说/记载/有云
 */

export interface ClassicEntry {
  title: string;
  pattern: RegExp;
}

export const CLASSIC_WHITELIST: ClassicEntry[] = [
  { title: '《周易》', pattern: /《周易》|《易经》|《易》/ },
  { title: '《滴天髓》', pattern: /《滴天髓》/ },
  { title: '《子平真诠》', pattern: /《子平真诠》/ },
  { title: '《穷通宝鉴》', pattern: /《穷通宝鉴》/ },
  { title: '《三命通会》', pattern: /《三命通会》/ },
  { title: '《渊海子平》', pattern: /《渊海子平》/ },
  { title: '《紫微斗数全书》', pattern: /《紫微斗数全书》/ },
  { title: '《大六壬指南》', pattern: /《大六壬指南》/ },
  { title: '《奇门遁甲》', pattern: /《奇门遁甲》/ },
];

import { Injectable, Logger } from '@nestjs/common';

// 检测模式：覆盖常见引用变体（云/曰/说/记载/有云）
const REFERENCE_PATTERN = /《([^》]+)》(?:云|曰|说|记载)|经云|古语有云|古人云|古人说|经典记载/g;

// 内容未验证提示（调用方应附加到输出）
export const UNVERIFIED_CONTENT_NOTICE = '（经典引用仅供参考，内容真实性未经验证）';

@Injectable()
export class ClassicValidatorService {
  private readonly logger = new Logger(ClassicValidatorService.name);

  /** 检测文本中的经典引用是否在白名单内 */
  validate(text: string): { ok: boolean; flagged: string[]; hasUnverifiedContent: boolean } {
    const matches = Array.from(text.matchAll(REFERENCE_PATTERN));
    if (matches.length === 0) return { ok: true, flagged: [], hasUnverifiedContent: false };

    const flagged: string[] = [];
    for (const m of matches) {
      const fullMatch = m[0];
      const isWhitelisted = CLASSIC_WHITELIST.some((c) => c.pattern.test(fullMatch));
      if (!isWhitelisted) flagged.push(fullMatch);
    }

    if (flagged.length > 0) {
      this.logger.warn(`[Guardrail P-02] 拦截疑似杜撰引用：${flagged.join(', ')}`);
    }
    // 只要有引用，就标记内容未验证（白名单只校验书名，不校验内容）
    return { ok: flagged.length === 0, flagged, hasUnverifiedContent: matches.length > 0 };
  }
}
