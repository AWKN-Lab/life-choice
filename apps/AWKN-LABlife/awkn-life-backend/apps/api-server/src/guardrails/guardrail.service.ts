/**
 * Guardrail Service - 输出层护栏（事后兜底）
 *
 * 来源：天火智能体技能迁移报告 §3
 * P-01 ~ P-04 规则的运行时检测、替换、拦截、补全。
 */

import { Injectable, Logger } from '@nestjs/common';
import { ClassicValidatorService, UNVERIFIED_CONTENT_NOTICE } from './classic-validator.service';

export type GuardrailAction = 'allow' | 'replace' | 'append' | 'block';

export interface GuardrailViolation {
  rule: 'P-01' | 'P-02' | 'P-03' | 'P-04';
  action: GuardrailAction;
  matched: string;
}

export interface GuardrailResult {
  output: string;
  violations: GuardrailViolation[];
  blocked: boolean;
}

const ABSOLUTE_PATTERN = /一定|必定|百分之百|绝对|肯定能|保证/g;
const INVESTMENT_PATTERN = /买入|卖出|加仓|减仓|抄底|止损/g;
const ADVICE_PATTERN = /建议你|你应该|你可以考虑/;
const DISCLAIMER_TEXT = '（以上为决策参考，请结合自身实际情况判断）';
const TREND_REPLACEMENT =
  '从趋势角度观察，当前市场呈现波动特征，建议咨询专业金融机构';

@Injectable()
export class GuardrailService {
  private readonly logger = new Logger(GuardrailService.name);

  constructor(private readonly classicValidator: ClassicValidatorService) {}

  apply(output: string): GuardrailResult {
    const violations: GuardrailViolation[] = [];
    let result = output;
    let blocked = false;

    // P-01 绝对化承诺 → replace
    const p01Matches = result.match(ABSOLUTE_PATTERN);
    if (p01Matches) {
      for (const m of p01Matches) {
        violations.push({ rule: 'P-01', action: 'replace', matched: m });
      }
      result = result.replace(ABSOLUTE_PATTERN, '从目前信息来看，有较大可能');
    }

    // P-04 投资建议 → block + replace
    const p04Matches = result.match(INVESTMENT_PATTERN);
    if (p04Matches) {
      for (const m of p04Matches) {
        violations.push({ rule: 'P-04', action: 'block', matched: m });
      }
      result = result.replace(INVESTMENT_PATTERN, TREND_REPLACEMENT);
      blocked = true;
    }

    // P-02 经典引用校验
    const classicCheck = this.classicValidator.validate(result);
    if (!classicCheck.ok) {
      for (const m of classicCheck.flagged) {
        violations.push({ rule: 'P-02', action: 'block', matched: m });
      }
      blocked = true;
    } else if (classicCheck.hasUnverifiedContent) {
      // 白名单通过但有引用：附加内容未验证提示（白名单只校验书名不校验内容）
      result = result.trimEnd() + '\n\n' + UNVERIFIED_CONTENT_NOTICE;
    }

    // P-03 边界声明补全
    if (ADVICE_PATTERN.test(result) && !result.includes(DISCLAIMER_TEXT)) {
      violations.push({ rule: 'P-03', action: 'append', matched: '决策建议未带边界声明' });
      result = result.trimEnd() + '\n\n' + DISCLAIMER_TEXT;
    }

    if (violations.length > 0) {
      this.logger.warn(
        `[Guardrail] 触发 ${violations.length} 条规则: ${violations.map((v) => v.rule).join(',')}`,
      );
    }

    return { output: result, violations, blocked };
  }
}
