/**
 * R001-R003 冲合刑害规则
 * - R001 夫妻宫冲（cross_ref：双方日支交叉对比）
 * - R002 子午冲（bazi：读 xingChongHeHai.chong）
 * - R003 卯酉冲（bazi：读 xingChongHeHai.chong）
 */
import {
  RuleMatcherInput,
  MatchedRule,
  CHONG_PAIRS,
} from '../rule-matcher.types';
import { BaziFullResult } from '../../../../calc-engine/bazi-calculator-wrapper';

export function matchChongheRules(input: RuleMatcherInput): MatchedRule[] {
  const rules: MatchedRule[] = [];
  const { male, female } = input.chartSnapshot;

  // R001: 夫妻宫冲——双方日支交叉对比（非 xingChongHeHai，手动对比）
  if (female) {
    const maleDayZhi = male.dayPillar?.[1] ?? '';
    const femaleDayZhi = female.dayPillar?.[1] ?? '';
    if (maleDayZhi && femaleDayZhi && CHONG_PAIRS[maleDayZhi] === femaleDayZhi) {
      rules.push({
        ruleId: 'R001',
        ruleName: '夫妻宫冲',
        severity: 'high',
        evidence: `男方日支${maleDayZhi} ↔ 女方日支${femaleDayZhi}，${maleDayZhi}${femaleDayZhi}相冲`,
        pillar: '日柱',
        source: 'cross_ref',
      });
    }
  }

  // R002: 子午冲——读原局/流年已结构化的冲
  const r002 = checkChongInChart(male, '子', '午', 'R002', '子午冲', 'high');
  if (r002) {
    rules.push(r002);
  } else if (female) {
    const r002f = checkChongInChart(female, '子', '午', 'R002', '子午冲', 'high');
    if (r002f) rules.push(r002f);
  }

  // R003: 卯酉冲
  const r003 = checkChongInChart(male, '卯', '酉', 'R003', '卯酉冲', 'medium');
  if (r003) {
    rules.push(r003);
  } else if (female) {
    const r003f = checkChongInChart(female, '卯', '酉', 'R003', '卯酉冲', 'medium');
    if (r003f) rules.push(r003f);
  }

  return rules;
}

/**
 * 在单张命盘的 xingChongHeHai.chong 中检测指定地支对相冲
 */
function checkChongInChart(
  chart: BaziFullResult,
  zhi1: string,
  zhi2: string,
  ruleId: string,
  ruleName: string,
  severity: 'high' | 'medium' | 'low',
): MatchedRule | null {
  const chongList = chart?.xingChongHeHai?.chong ?? [];
  for (const c of chongList) {
    const rel = c.relation ?? '';
    if (rel.includes(zhi1) && rel.includes(zhi2)) {
      return {
        ruleId,
        ruleName,
        severity,
        evidence: `原局${rel}（pillars: ${c.pillars?.join('+') ?? ''}）`,
        source: 'bazi',
      };
    }
  }
  return null;
}
