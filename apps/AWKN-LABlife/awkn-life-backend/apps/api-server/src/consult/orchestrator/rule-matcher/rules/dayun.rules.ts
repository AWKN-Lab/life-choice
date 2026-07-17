/**
 * R012 大运引动夫妻宫
 * 检测：当前大运地支或当前流年地支与日支相冲或相合（六合）
 * - 相冲：CHONG_PAIRS[daYunZhi] === dayZhi
 * - 相合：HE_PAIRS[daYunZhi] === dayZhi
 *
 * 说明：task 规格聚焦"当前大运"引动；但流年同样是夫妻宫引动的关键触发，
 * 故同时检测当前流年地支与日支的冲/合，evidence 中区分来源。
 */
import {
  RuleMatcherInput,
  MatchedRule,
  CHONG_PAIRS,
  HE_PAIRS,
  getCurrentDaYun,
  getCurrentLiuNian,
} from '../rule-matcher.types';
import { BaziFullResult } from '../../../../calc-engine/bazi-calculator-wrapper';

export function matchDayunRules(input: RuleMatcherInput): MatchedRule[] {
  const rules: MatchedRule[] = [];
  const { male, female } = input.chartSnapshot;
  const currentYear = input.currentYear ?? 2026;
  const maleBirthYear = input.birthInfo?.maleBirthYear;
  const femaleBirthYear = input.birthInfo?.femaleBirthYear;

  const r012 = checkDayunYinDong(male, '男', currentYear, maleBirthYear);
  if (r012) {
    rules.push(r012);
  } else if (female) {
    const r012f = checkDayunYinDong(female, '女', currentYear, femaleBirthYear);
    if (r012f) rules.push(r012f);
  }

  return rules;
}

function checkDayunYinDong(
  chart: BaziFullResult,
  label: string,
  currentYear: number,
  birthYear?: number,
): MatchedRule | null {
  const dayZhi = chart?.dayPillar?.[1] ?? '';
  if (!dayZhi) return null;

  // 1) 当前大运地支 vs 日支
  const currentDaYun = getCurrentDaYun(chart?.daYun, birthYear, currentYear);
  if (currentDaYun) {
    const daYunZhi = currentDaYun.zhi;
    if (CHONG_PAIRS[daYunZhi] === dayZhi) {
      return {
        ruleId: 'R012',
        ruleName: '大运引动夫妻宫',
        severity: 'medium',
        evidence: `${label}方当前大运${currentDaYun.full}，${daYunZhi}${dayZhi}相冲，引动夫妻宫`,
        pillar: '日柱',
        source: 'bazi',
      };
    }
    if (HE_PAIRS[daYunZhi] === dayZhi) {
      return {
        ruleId: 'R012',
        ruleName: '大运引动夫妻宫',
        severity: 'medium',
        evidence: `${label}方当前大运${currentDaYun.full}，${daYunZhi}${dayZhi}相合，引动夫妻宫`,
        pillar: '日柱',
        source: 'bazi',
      };
    }
  }

  // 2) 当前流年地支 vs 日支
  const currentLiuNian = getCurrentLiuNian(chart?.liuNian, currentYear);
  if (currentLiuNian) {
    const lnZhi = currentLiuNian.ganZhi?.[1] ?? '';
    if (lnZhi && CHONG_PAIRS[lnZhi] === dayZhi) {
      return {
        ruleId: 'R012',
        ruleName: '大运引动夫妻宫',
        severity: 'medium',
        evidence: `${label}方当前流年${currentLiuNian.ganZhi}，${lnZhi}冲${dayZhi}，引动夫妻宫`,
        pillar: '日柱',
        source: 'bazi',
      };
    }
    if (lnZhi && HE_PAIRS[lnZhi] === dayZhi) {
      return {
        ruleId: 'R012',
        ruleName: '大运引动夫妻宫',
        severity: 'medium',
        evidence: `${label}方当前流年${currentLiuNian.ganZhi}，${lnZhi}${dayZhi}相合，引动夫妻宫`,
        pillar: '日柱',
        source: 'bazi',
      };
    }
  }

  return null;
}
