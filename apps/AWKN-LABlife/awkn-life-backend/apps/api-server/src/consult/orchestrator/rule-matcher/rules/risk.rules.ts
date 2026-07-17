/**
 * R019-R020 风险决策规则
 * - R019 价值观冲突（cross_ref：双方日主天干五行相克）
 * - R020 决策方式冲突（cross_ref：男方官杀旺 vs 女方伤官旺，或女方伤官见+男方官杀）
 */
import {
  RuleMatcherInput,
  MatchedRule,
  TIANGAN_WUXING,
  WUXING_KE,
} from '../rule-matcher.types';

export function matchRiskRules(input: RuleMatcherInput): MatchedRule[] {
  const rules: MatchedRule[] = [];
  const { male, female } = input.chartSnapshot;
  if (!female) return rules;

  // R019: 价值观冲突——双方日主天干五行相克
  const r019 = checkValuesConflict(male, female);
  if (r019) rules.push(r019);

  // R020: 决策方式冲突
  const r020 = checkDecisionStyleConflict(male, female);
  if (r020) rules.push(r020);

  return rules;
}

/**
 * R019 价值观冲突
 * 双方 dayPillar[0]（天干）五行相克。
 * 五行相克：木克土、土克水、水克火、火克金、金克木
 */
function checkValuesConflict(
  male: RuleMatcherInput['chartSnapshot']['male'],
  female: NonNullable<RuleMatcherInput['chartSnapshot']['female']>,
): MatchedRule | null {
  const maleGan = male?.dayPillar?.[0] ?? '';
  const femaleGan = female?.dayPillar?.[0] ?? '';
  if (!maleGan || !femaleGan) return null;

  const maleWu = TIANGAN_WUXING[maleGan];
  const femaleWu = TIANGAN_WUXING[femaleGan];
  if (!maleWu || !femaleWu) return null;

  // 男方五行克女方五行
  if (WUXING_KE[maleWu] === femaleWu) {
    return {
      ruleId: 'R019',
      ruleName: '价值观冲突',
      severity: 'medium',
      evidence: `男方日主${maleGan}${maleWu}克女方日主${femaleGan}${femaleWu}，价值观存在根本差异`,
      source: 'cross_ref',
    };
  }

  // 女方五行克男方五行
  if (WUXING_KE[femaleWu] === maleWu) {
    return {
      ruleId: 'R019',
      ruleName: '价值观冲突',
      severity: 'medium',
      evidence: `女方日主${femaleGan}${femaleWu}克男方日主${maleGan}${maleWu}，价值观存在根本差异`,
      source: 'cross_ref',
    };
  }

  return null;
}

/**
 * R020 决策方式冲突
 * 条件1：男方官杀旺（四柱十神含正官/七杀 >= 2）且 女方伤官旺（含伤官 >= 1）
 * 条件2（弱条件）：女方伤官见（含伤官 >= 1）且 男方有正官/七杀（>= 1）
 */
function checkDecisionStyleConflict(
  male: RuleMatcherInput['chartSnapshot']['male'],
  female: NonNullable<RuleMatcherInput['chartSnapshot']['female']>,
): MatchedRule | null {
  const maleShishen = [male?.yearShishen, male?.monthShishen, male?.hourShishen].filter(Boolean);
  const femaleShishen = [female?.yearShishen, female?.monthShishen, female?.hourShishen].filter(Boolean);

  const maleGuanSha = maleShishen.filter(s => s === '正官' || s === '七杀').length;
  const femaleShangGuan = femaleShishen.filter(s => s === '伤官').length;

  if (femaleShangGuan < 1) return null;

  // 条件1：男方官杀旺（>= 2）vs 女方伤官旺（>= 1）
  if (maleGuanSha >= 2) {
    return {
      ruleId: 'R020',
      ruleName: '决策方式冲突',
      severity: 'medium',
      evidence: `男方官杀重（重规则），女方伤官旺（重表达），决策方式冲突`,
      source: 'cross_ref',
    };
  }

  // 条件2：女方伤官见 + 男方有官杀（>= 1）
  if (maleGuanSha >= 1) {
    return {
      ruleId: 'R020',
      ruleName: '决策方式冲突',
      severity: 'medium',
      evidence: `女方伤官见官，男方官杀重，决策方式冲突`,
      source: 'cross_ref',
    };
  }

  return null;
}
