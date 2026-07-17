import { BARNUM_PHRASES_V2 } from './barnum-phrases';

export interface QualityGuardConfig {
  moduleId: string;
  requiredFields: string[];
  barnumPhrases: readonly string[];
  minOverviewLength: number;
  minRecommendations: number;
  requireEvidenceTags: boolean;
  requireActionAdvice: boolean;
  fallbackStrategy: 'retry' | 'local' | 'partial';
}

export const MODULE_CONFIGS: Record<string, QualityGuardConfig> = {
  kline: {
    moduleId: 'kline',
    requiredFields: ['overview', 'trendSummary', 'keyDrivers', 'bestWindows', 'riskWindows', 'actionAdvice'],
    barnumPhrases: BARNUM_PHRASES_V2,
    minOverviewLength: 30,
    minRecommendations: 2,
    requireEvidenceTags: true,
    requireActionAdvice: true,
    fallbackStrategy: 'local',
  },
  liuren: {
    moduleId: 'liuren',
    requiredFields: ['judgment', 'basis', 'keyTimeWindow', 'actionAdvice', 'counterCondition'],
    barnumPhrases: BARNUM_PHRASES_V2,
    minOverviewLength: 20,
    minRecommendations: 2,
    requireEvidenceTags: true,
    requireActionAdvice: true,
    fallbackStrategy: 'retry',
  },
  quming: {
    moduleId: 'quming',
    requiredFields: ['names', 'nameAnalysis', 'wugeAnalysis', 'soundMeaningExplanation', 'usageScenarioAdvice'],
    barnumPhrases: BARNUM_PHRASES_V2,
    minOverviewLength: 15,
    minRecommendations: 1,
    requireEvidenceTags: false,
    requireActionAdvice: true,
    fallbackStrategy: 'retry',
  },
  breakthrough: {
    moduleId: 'breakthrough',
    requiredFields: ['overview', 'career_fortune', 'wealth_fortune', 'stop_doing_list'],
    barnumPhrases: BARNUM_PHRASES_V2,
    minOverviewLength: 15,
    minRecommendations: 2,
    requireEvidenceTags: true,
    requireActionAdvice: true,
    fallbackStrategy: 'retry',
  },
  morning: {
    moduleId: 'morning',
    requiredFields: ['overview', 'daily_tips', 'warnings'],
    barnumPhrases: BARNUM_PHRASES_V2,
    minOverviewLength: 10,
    minRecommendations: 1,
    requireEvidenceTags: true,
    requireActionAdvice: false,
    fallbackStrategy: 'retry',
  },
};

export interface QualityCheckResult {
  schemaValid: boolean;
  qualityScore: number;
  barnumHits: string[];
  validationFlags: string[];
  missingFields: string[];
  passed: boolean;  // qualityScore >= 60
}

/**
 * 统一 LLM 质量校验
 */
export function checkLlmQuality(
  parsed: Record<string, unknown>,
  moduleId: string,
): QualityCheckResult {
  const config = MODULE_CONFIGS[moduleId];
  if (!config) {
    // 无配置的模块，默认通过
    return {
      schemaValid: true,
      qualityScore: 80,
      barnumHits: [],
      validationFlags: [],
      missingFields: [],
      passed: true,
    };
  }

  const validationFlags: string[] = [];
  const missingFields: string[] = [];

  // 1. Schema 校验
  for (const field of config.requiredFields) {
    const value = parsed[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }
  const schemaValid = missingFields.length === 0;
  if (!schemaValid) {
    validationFlags.push(`missing_fields:${missingFields.join(',')}`);
  }

  // 2. Barnum 过滤
  const barnumHits: string[] = [];
  const allText = JSON.stringify(parsed);
  for (const phrase of config.barnumPhrases) {
    if (allText.includes(phrase)) {
      barnumHits.push(phrase);
    }
  }
  if (barnumHits.length > 0) {
    validationFlags.push(`barnum_hits:${barnumHits.length}`);
  }

  // 3. 质量分计算
  let score = schemaValid ? 60 : 30;

  // Barnum 扣分
  score -= barnumHits.length * 5;

  // overview 长度加分
  const overview = String(parsed.overview || '');
  if (overview.length >= config.minOverviewLength) score += 8;
  if (overview.length >= config.minOverviewLength * 2) score += 5;

  // recommendations 加分
  const recommendations = parsed.recommendations || parsed.actions || parsed.stop_doing_list;
  if (Array.isArray(recommendations) && recommendations.length >= config.minRecommendations) score += 7;

  // evidence_tags 加分
  if (config.requireEvidenceTags) {
    const tags = parsed.evidence_tags || parsed.evidenceTags;
    if (Array.isArray(tags) && tags.length >= 1) score += 5;
    else validationFlags.push('missing_evidence_tags');
  }

  // actionAdvice 加分
  if (config.requireActionAdvice) {
    const advice = parsed.actionAdvice || parsed.action_advice;
    if (advice) score += 5;
    else validationFlags.push('missing_action_advice');
  }

  // risk_alerts 加分
  const risks = parsed.risks || parsed.risk_alerts;
  if (Array.isArray(risks) && risks.length >= 2) score += 5;

  // clamp
  score = Math.max(0, Math.min(100, score));

  return {
    schemaValid,
    qualityScore: score,
    barnumHits,
    validationFlags,
    missingFields,
    passed: score >= 60,
  };
}
