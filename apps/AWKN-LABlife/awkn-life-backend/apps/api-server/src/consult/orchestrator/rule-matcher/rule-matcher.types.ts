/**
 * RuleMatcher Lite 类型定义 + 共享常量与辅助函数
 * 输入 BaziFullResult，输出 matchedRules[]
 */
import { BaziFullResult } from '../../../calc-engine/bazi-calculator-wrapper';

export interface RuleMatcherInput {
  chartSnapshot: {
    male: BaziFullResult;
    female?: BaziFullResult;
  };
  questionType:
    | 'marriage_decision'
    | 'career_decision'
    | 'wealth_decision'
    | 'health_decision';
  userContext: {
    background: string;
    concerns: string[];
  };
  /** 当前年份，默认 2026，用于定位当前大运/流年 */
  currentYear?: number;
  /** 出生年份，用于根据 startAge/endAge 定位当前大运 */
  birthInfo?: {
    maleBirthYear?: number;
    femaleBirthYear?: number;
  };
}

export interface MatchedRule {
  ruleId: string;
  ruleName: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  pillar?: string;
  source: 'bazi' | 'user_context' | 'cross_ref';
}

export interface RuleMatcherOutput {
  matchedRules: MatchedRule[];
  summary: string;
}

// ─── 地支相冲对照表（R001 / R012 用） ───
export const CHONG_PAIRS: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

// ─── 地支六合对照表（R012 用） ───
export const HE_PAIRS: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午',
};

// ─── 天干五行映射（R019 用） ───
export const TIANGAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// ─── 五行相克映射（R019 用） ───
export const WUXING_KE: Record<string, string> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

// ─── 天干阴阳映射（十神推算用） ───
const TIANGAN_YINYANG: Record<string, 'yang' | 'yin'> = {
  '甲': 'yang', '乙': 'yin', '丙': 'yang', '丁': 'yin', '戊': 'yang',
  '己': 'yin', '庚': 'yang', '辛': 'yin', '壬': 'yang', '癸': 'yin',
};

// ─── 五行相生映射（十神推算用） ───
const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

/**
 * 根据日主天干与目标天干推算十神
 * 用于从 daYun.gan 推算十神（daYun 结构体无 shishen 字段）
 */
export function computeShishen(dayGan: string, targetGan: string): string {
  const dayWu = TIANGAN_WUXING[dayGan];
  const targetWu = TIANGAN_WUXING[targetGan];
  if (!dayWu || !targetWu) return '';
  const sameYin = TIANGAN_YINYANG[dayGan] === TIANGAN_YINYANG[targetGan];

  if (dayWu === targetWu) return sameYin ? '比肩' : '劫财';
  if (SHENG[dayWu] === targetWu) return sameYin ? '食神' : '伤官';
  if (SHENG[targetWu] === dayWu) return sameYin ? '偏印' : '正印';
  if (WUXING_KE[dayWu] === targetWu) return sameYin ? '偏财' : '正财';
  if (WUXING_KE[targetWu] === dayWu) return sameYin ? '七杀' : '正官';
  return '';
}

/**
 * 定位当前大运
 * 优先根据 birthYear + currentYear 计算年龄匹配 startAge/endAge；
 * 无 birthYear 时回退取最后一条大运。
 */
export function getCurrentDaYun(
  daYun: BaziFullResult['daYun'],
  birthYear?: number,
  currentYear: number = 2026,
): BaziFullResult['daYun'][number] | undefined {
  if (!daYun || daYun.length === 0) return undefined;
  if (birthYear) {
    const age = currentYear - birthYear;
    const matched = daYun.find(d => age >= d.startAge && age <= d.endAge);
    if (matched) return matched;
  }
  return daYun[daYun.length - 1];
}

/**
 * 定位当前流年
 * 优先精确匹配 year === currentYear；回退取第一条。
 */
export function getCurrentLiuNian(
  liuNian: BaziFullResult['liuNian'],
  currentYear: number = 2026,
): BaziFullResult['liuNian'][number] | undefined {
  if (!liuNian || liuNian.length === 0) return undefined;
  return liuNian.find(ln => ln.year === currentYear) || liuNian[0];
}
