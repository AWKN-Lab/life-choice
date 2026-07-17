/**
 * RuleMatcher Lite 主入口
 * 输入 BaziFullResult，聚合 8 条姻缘核心规则，输出 matchedRules[]
 */
import { Injectable } from '@nestjs/common';
import { RuleMatcherInput, RuleMatcherOutput, MatchedRule } from './rule-matcher.types';
import { matchChongheRules } from './rules/chonghe.rules';
import { matchShishenRules } from './rules/shishen.rules';
import { matchDayunRules } from './rules/dayun.rules';
import { matchRiskRules } from './rules/risk.rules';

@Injectable()
export class RuleMatcherService {
  match(input: RuleMatcherInput): RuleMatcherOutput {
    const rules: MatchedRule[] = [];
    rules.push(...matchChongheRules(input));
    rules.push(...matchShishenRules(input));
    rules.push(...matchDayunRules(input));
    rules.push(...matchRiskRules(input));

    const summary =
      `命中 ${rules.length} 条规则：` + rules.map(r => r.ruleId).join('、');

    return { matchedRules: rules, summary };
  }
}
