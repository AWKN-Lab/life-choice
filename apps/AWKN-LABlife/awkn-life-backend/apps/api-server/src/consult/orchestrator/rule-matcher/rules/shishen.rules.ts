/**
 * R007-R008 十神格局规则
 * - R007 伤官见官（bazi：四柱十神含伤官 + 大运/流年十神含正官）
 * - R008 财星引动（bazi：大运/流年十神含正财/偏财/正官，男命财星即妻星）
 *
 * 注意：daYun 结构体无 shishen 字段，需通过 computeShishen(dayGan, daYun.gan) 推算。
 * dayShishen 是"日主"，不参与十神统计。
 */
import {
  RuleMatcherInput,
  MatchedRule,
  computeShishen,
  getCurrentDaYun,
  getCurrentLiuNian,
} from '../rule-matcher.types';
import { BaziFullResult } from '../../../../calc-engine/bazi-calculator-wrapper';

export function matchShishenRules(input: RuleMatcherInput): MatchedRule[] {
  const rules: MatchedRule[] = [];
  const { male, female } = input.chartSnapshot;
  const currentYear = input.currentYear ?? 2026;
  const maleBirthYear = input.birthInfo?.maleBirthYear;
  const femaleBirthYear = input.birthInfo?.femaleBirthYear;

  // R007: 伤官见官——先查男方，未命中再查女方
  const r007 = checkShangGuanJianGuan(male, '男', currentYear, maleBirthYear);
  if (r007) {
    rules.push(r007);
  } else if (female) {
    const r007f = checkShangGuanJianGuan(female, '女', currentYear, femaleBirthYear);
    if (r007f) rules.push(r007f);
  }

  // R008: 财星引动——先查男方，未命中再查女方
  const r008 = checkCaiXingYinDong(male, '男', currentYear, maleBirthYear);
  if (r008) {
    rules.push(r008);
  } else if (female) {
    const r008f = checkCaiXingYinDong(female, '女', currentYear, femaleBirthYear);
    if (r008f) rules.push(r008f);
  }

  return rules;
}

/**
 * R007 伤官见官
 * 四柱十神（yearShishen/monthShishen/hourShishen，不含 dayShishen="日主"）含"伤官"，
 * 且当前大运或流年十神含"正官"。
 */
function checkShangGuanJianGuan(
  chart: BaziFullResult,
  label: string,
  currentYear: number,
  birthYear?: number,
): MatchedRule | null {
  const pillarShishen = [
    chart?.yearShishen,
    chart?.monthShishen,
    chart?.hourShishen,
  ].filter(Boolean);

  if (!pillarShishen.includes('伤官')) return null;

  const dayGan = chart?.dayPillar?.[0] ?? '';

  // 检查当前大运十神是否为正官
  const currentDaYun = getCurrentDaYun(chart?.daYun, birthYear, currentYear);
  if (currentDaYun && dayGan) {
    const daYunShishen = computeShishen(dayGan, currentDaYun.gan);
    if (daYunShishen === '正官') {
      return {
        ruleId: 'R007',
        ruleName: '伤官见官',
        severity: 'high',
        evidence: `${label}方四柱伤官见正官（大运${currentDaYun.full}，正官透出）`,
        source: 'bazi',
      };
    }
  }

  // 检查流年十神是否为正官
  const currentLiuNian = getCurrentLiuNian(chart?.liuNian, currentYear);
  if (currentLiuNian && currentLiuNian.shishen === '正官') {
    return {
      ruleId: 'R007',
      ruleName: '伤官见官',
      severity: 'high',
      evidence: `${label}方四柱伤官见正官（${currentLiuNian.year}年${currentLiuNian.ganZhi}，正官透出）`,
      source: 'bazi',
    };
  }

  return null;
}

/**
 * R008 财星引动
 * 当前大运或流年十神含"正财"/"偏财"/"正官"（男命财星即妻星）。
 */
function checkCaiXingYinDong(
  chart: BaziFullResult,
  label: string,
  currentYear: number,
  birthYear?: number,
): MatchedRule | null {
  const dayGan = chart?.dayPillar?.[0] ?? '';
  const CAI_PATTERN = ['正财', '偏财', '正官'];

  // 检查当前大运
  const currentDaYun = getCurrentDaYun(chart?.daYun, birthYear, currentYear);
  if (currentDaYun && dayGan) {
    const daYunShishen = computeShishen(dayGan, currentDaYun.gan);
    if (CAI_PATTERN.includes(daYunShishen)) {
      return {
        ruleId: 'R008',
        ruleName: '财星引动',
        severity: 'medium',
        evidence: `${label}方当前大运${currentDaYun.full}，${daYunShishen}引动，妻星进入强窗口`,
        source: 'bazi',
      };
    }
  }

  // 检查流年
  const currentLiuNian = getCurrentLiuNian(chart?.liuNian, currentYear);
  if (currentLiuNian && CAI_PATTERN.includes(currentLiuNian.shishen)) {
    return {
      ruleId: 'R008',
      ruleName: '财星引动',
      severity: 'medium',
      evidence: `${currentLiuNian.year}年${currentLiuNian.ganZhi}${currentLiuNian.shishen}引动，妻星进入强窗口`,
      source: 'bazi',
    };
  }

  return null;
}
