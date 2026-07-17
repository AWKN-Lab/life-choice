import { AtomTool } from '../types';

export type ValidateDomain = 'career' | 'wealth' | 'relationship' | 'health' | 'timing' | 'general';

export interface BaziJudgment {
  domain: ValidateDomain;
  trend: 'favorable' | 'neutral' | 'unfavorable';
  confidence: 'high' | 'medium' | 'low';
  keyFactors: string[];
  summary: string;
}

export interface ZiweiJudgment {
  domain: ValidateDomain;
  trend: 'favorable' | 'neutral' | 'unfavorable';
  confidence: 'high' | 'medium' | 'low';
  keyFactors: string[];
  summary: string;
}

export interface QimenJudgment {
  domain: ValidateDomain;
  trend: 'favorable' | 'neutral' | 'unfavorable';
  confidence: 'high' | 'medium' | 'low';
  keyFactors: string[];
  summary: string;
}

export interface CrossValidateInput {
  domain: ValidateDomain;
  bazi: BaziJudgment;
  ziwei: ZiweiJudgment;
  qimen?: QimenJudgment;
  questionCategory?: string;
}

export interface CrossValidateOutput {
  consistency: 'consistent' | 'partial' | 'conflicting';
  agreedPoints: string[];
  disagreedPoints: string[];
  trustedSystem: 'bazi' | 'ziwei' | 'qimen' | 'both' | 'all';
  summary: string;
}

const DOMAIN_LABEL: Record<ValidateDomain, string> = {
  career: '事业', wealth: '财运', relationship: '感情', health: '健康', timing: '时机', general: '综合运势',
};

const DOMAIN_TRUST_WEIGHT: Record<ValidateDomain, { bazi: number; ziwei: number; qimen: number }> = {
  career: { bazi: 0.45, ziwei: 0.55, qimen: 0.3 },
  wealth: { bazi: 0.5, ziwei: 0.5, qimen: 0.3 },
  relationship: { bazi: 0.4, ziwei: 0.6, qimen: 0.2 },
  health: { bazi: 0.55, ziwei: 0.45, qimen: 0.2 },
  timing: { bazi: 0.25, ziwei: 0.2, qimen: 0.55 },
  general: { bazi: 0.5, ziwei: 0.5, qimen: 0.3 },
};

const CONFIDENCE_SCORE = { high: 3, medium: 2, low: 1 } as const;

const TREND_LABEL: Record<string, string> = {
  favorable: '有利', neutral: '平稳', unfavorable: '不利',
};

function determineTwoConsistency(
  trendA: 'favorable' | 'neutral' | 'unfavorable',
  trendB: 'favorable' | 'neutral' | 'unfavorable',
): CrossValidateOutput['consistency'] {
  if (trendA === trendB) return 'consistent';
  if (trendA === 'neutral' || trendB === 'neutral') return 'partial';
  return 'conflicting';
}

function determineThreeConsistency(
  baziTrend: BaziJudgment['trend'],
  ziweiTrend: ZiweiJudgment['trend'],
  qimenTrend: QimenJudgment['trend'],
): CrossValidateOutput['consistency'] {
  if (baziTrend === ziweiTrend && ziweiTrend === qimenTrend) return 'consistent';

  const pairs: Array<[string, string]> = [
    [baziTrend, ziweiTrend],
    [baziTrend, qimenTrend],
    [ziweiTrend, qimenTrend],
  ];
  const agreeCount = pairs.filter(([a, b]) => a === b).length;

  if (agreeCount >= 1) return 'partial';
  return 'conflicting';
}

function computeWeightedScore(
  domain: ValidateDomain,
  bazi: BaziJudgment,
  ziwei: ZiweiJudgment,
  qimen?: QimenJudgment,
): { bazi: number; ziwei: number; qimen: number } {
  const weights = DOMAIN_TRUST_WEIGHT[domain];
  const baziScore = (CONFIDENCE_SCORE[bazi.confidence] ?? 1) * weights.bazi;
  const ziweiScore = (CONFIDENCE_SCORE[ziwei.confidence] ?? 1) * weights.ziwei;
  const qimenScore = qimen
    ? (CONFIDENCE_SCORE[qimen.confidence] ?? 1) * weights.qimen
    : 0;
  return { bazi: baziScore, ziwei: ziweiScore, qimen: qimenScore };
}

function determineTrustedSystem(
  domain: ValidateDomain,
  bazi: BaziJudgment,
  ziwei: ZiweiJudgment,
  qimen?: QimenJudgment,
): CrossValidateOutput['trustedSystem'] {
  if (!qimen) {
    const weights = { bazi: DOMAIN_TRUST_WEIGHT[domain].bazi, ziwei: DOMAIN_TRUST_WEIGHT[domain].ziwei };
    const baziScore = (CONFIDENCE_SCORE[bazi.confidence] ?? 1) * weights.bazi;
    const ziweiScore = (CONFIDENCE_SCORE[ziwei.confidence] ?? 1) * weights.ziwei;
    if (Math.abs(baziScore - ziweiScore) < 0.3) return 'both';
    return baziScore > ziweiScore ? 'bazi' : 'ziwei';
  }

  const scores = computeWeightedScore(domain, bazi, ziwei, qimen);
  const max = Math.max(scores.bazi, scores.ziwei, scores.qimen);
  const topSystems: string[] = [];
  if (scores.bazi === max) topSystems.push('bazi');
  if (scores.ziwei === max) topSystems.push('ziwei');
  if (scores.qimen === max) topSystems.push('qimen');

  if (topSystems.length >= 2) return 'all';
  return topSystems[0] as CrossValidateOutput['trustedSystem'];
}

function collectFactorOverlaps(
  baziFactors: Set<string>,
  ziweiFactors: Set<string>,
  qimenFactors: Set<string>,
  agreedPoints: string[],
  disagreedPoints: string[],
): void {
  const allFactors = new Set([...baziFactors, ...ziweiFactors, ...qimenFactors]);
  for (const factor of allFactors) {
    const inBazi = baziFactors.has(factor);
    const inZiwei = ziweiFactors.has(factor);
    const inQimen = qimenFactors.has(factor);
    const count = [inBazi, inZiwei, inQimen].filter(Boolean).length;

    if (count >= 2) {
      const systems: string[] = [];
      if (inBazi) systems.push('八字');
      if (inZiwei) systems.push('紫微');
      if (inQimen) systems.push('奇门');
      agreedPoints.push(`${systems.join('与')}均提及：${factor}`);
    } else {
      if (inBazi) disagreedPoints.push(`八字独有观点：${factor}`);
      if (inZiwei) disagreedPoints.push(`紫微独有观点：${factor}`);
      if (inQimen) disagreedPoints.push(`奇门独有观点：${factor}`);
    }
  }
}

function executeTwoWay(
  domain: ValidateDomain,
  bazi: BaziJudgment,
  ziwei: ZiweiJudgment,
): CrossValidateOutput {
  const agreedPoints: string[] = [];
  const disagreedPoints: string[] = [];

  const consistency = determineTwoConsistency(bazi.trend, ziwei.trend);

  if (consistency === 'consistent') {
    agreedPoints.push(`八字与紫微均判断${DOMAIN_LABEL[domain]}${TREND_LABEL[bazi.trend]}`);
  } else if (consistency === 'partial') {
    if (bazi.trend === ziwei.trend) {
      agreedPoints.push(`两系统均判断${DOMAIN_LABEL[domain]}${TREND_LABEL[bazi.trend]}`);
    } else {
      const neutralSystem = bazi.trend === 'neutral' ? '八字' : '紫微';
      const otherSystem = bazi.trend === 'neutral' ? '紫微' : '八字';
      const otherTrend = bazi.trend === 'neutral' ? ziwei.trend : bazi.trend;
      agreedPoints.push(`${neutralSystem}判断平稳，${otherSystem}判断${TREND_LABEL[otherTrend]}，大方向不冲突`);
    }
  } else {
    disagreedPoints.push(`八字判断${DOMAIN_LABEL[domain]}${TREND_LABEL[bazi.trend]}，紫微判断${TREND_LABEL[ziwei.trend]}，方向分歧`);
  }

  const baziFactors = new Set(bazi.keyFactors);
  const ziweiFactors = new Set(ziwei.keyFactors);

  for (const factor of baziFactors) {
    if (ziweiFactors.has(factor)) {
      agreedPoints.push(`两系统均提及：${factor}`);
    }
  }
  for (const factor of baziFactors) {
    if (!ziweiFactors.has(factor)) {
      disagreedPoints.push(`八字独有观点：${factor}`);
    }
  }
  for (const factor of ziweiFactors) {
    if (!baziFactors.has(factor)) {
      disagreedPoints.push(`紫微独有观点：${factor}`);
    }
  }

  const trustedSystem = determineTrustedSystem(domain, bazi, ziwei);
  const trustLabel = trustedSystem === 'bazi' ? '八字' : trustedSystem === 'ziwei' ? '紫微' : '两系统综合';
  const consistencyLabel = consistency === 'consistent' ? '一致' : consistency === 'partial' ? '部分一致' : '分歧';

  const summaryParts: string[] = [];
  summaryParts.push(`紫微与八字判断${consistencyLabel}`);
  if (agreedPoints.length > 0) summaryParts.push(agreedPoints.join('；'));
  if (disagreedPoints.length > 0) summaryParts.push(disagreedPoints.join('；'));
  summaryParts.push(`综合建议以${trustLabel}为准`);

  return { consistency, agreedPoints, disagreedPoints, trustedSystem, summary: summaryParts.join('：') };
}

function executeThreeWay(
  domain: ValidateDomain,
  bazi: BaziJudgment,
  ziwei: ZiweiJudgment,
  qimen: QimenJudgment,
  questionCategory: string | undefined,
): CrossValidateOutput {
  const agreedPoints: string[] = [];
  const disagreedPoints: string[] = [];

  const consistency = determineThreeConsistency(bazi.trend, ziwei.trend, qimen.trend);

  if (consistency === 'consistent') {
    agreedPoints.push(`八字、紫微、奇门三方均判断${DOMAIN_LABEL[domain]}${TREND_LABEL[bazi.trend]}`);
  } else if (consistency === 'partial') {
    const trends = [
      { name: '八字', trend: bazi.trend },
      { name: '紫微', trend: ziwei.trend },
      { name: '奇门', trend: qimen.trend },
    ];

    const favorableSystems = trends.filter(t => t.trend === 'favorable').map(t => t.name);
    const neutralSystems = trends.filter(t => t.trend === 'neutral').map(t => t.name);
    const unfavorableSystems = trends.filter(t => t.trend === 'unfavorable').map(t => t.name);

    if (favorableSystems.length === 2) {
      agreedPoints.push(`${favorableSystems.join('与')}判断有利，${neutralSystems.length > 0 ? neutralSystems.join('与') + '判断平稳' : unfavorableSystems.join('与') + '判断不利'}`);
    } else if (neutralSystems.length === 2) {
      agreedPoints.push(`${neutralSystems.join('与')}判断平稳，${favorableSystems.length > 0 ? favorableSystems.join('与') + '判断有利' : unfavorableSystems.join('与') + '判断不利'}`);
    } else if (unfavorableSystems.length === 2) {
      agreedPoints.push(`${unfavorableSystems.join('与')}判断不利，${neutralSystems.length > 0 ? neutralSystems.join('与') + '判断平稳' : favorableSystems.join('与') + '判断有利'}`);
    }

    const divergent = trends.find(t =>
      (favorableSystems.length === 2 && t.trend !== 'favorable') ||
      (unfavorableSystems.length === 2 && t.trend !== 'unfavorable') ||
      (neutralSystems.length === 2 && t.trend !== 'neutral')
    );
    if (divergent) {
      disagreedPoints.push(`${divergent.name}判断${TREND_LABEL[divergent.trend]}，与其他两方分歧`);
    }
  } else {
    disagreedPoints.push(`三方判断分歧：八字${TREND_LABEL[bazi.trend]}，紫微${TREND_LABEL[ziwei.trend]}，奇门${TREND_LABEL[qimen.trend]}`);
  }

  const baziFactors = new Set(bazi.keyFactors);
  const ziweiFactors = new Set(ziwei.keyFactors);
  const qimenFactors = new Set(qimen.keyFactors);
  collectFactorOverlaps(baziFactors, ziweiFactors, qimenFactors, agreedPoints, disagreedPoints);

  const trustedSystem = determineTrustedSystem(domain, bazi, ziwei, qimen);
  const trustLabel = trustedSystem === 'bazi' ? '八字'
    : trustedSystem === 'ziwei' ? '紫微'
    : trustedSystem === 'qimen' ? '奇门'
    : trustedSystem === 'all' ? '三方综合'
    : '两系统综合';

  const consistencyLabel = consistency === 'consistent' ? '一致' : consistency === 'partial' ? '部分一致' : '分歧';

  const summaryParts: string[] = [];
  summaryParts.push(`八字、紫微、奇门三方判断${consistencyLabel}`);
  if (agreedPoints.length > 0) summaryParts.push(agreedPoints.join('；'));
  if (disagreedPoints.length > 0) summaryParts.push(disagreedPoints.join('；'));

  const isTimingQuestion = questionCategory === '时机' || domain === 'timing';
  if (isTimingQuestion && trustedSystem === 'qimen') {
    summaryParts.push('时机/方向类问题，奇门权重最高，以奇门判断为准');
  } else {
    summaryParts.push(`综合建议以${trustLabel}为准`);
  }

  return { consistency, agreedPoints, disagreedPoints, trustedSystem, summary: summaryParts.join('：') };
}

export const crossValidateTool: AtomTool<CrossValidateInput, CrossValidateOutput> = {
  name: 'cross-validate',
  description: '紫微×八字×奇门交叉验证：对比多个系统对同一问题的判断是否一致，输出一致点、分歧点和可信系统',
  category: 'decision',

  async execute(input: CrossValidateInput): Promise<CrossValidateOutput> {
    const { domain, bazi, ziwei, qimen, questionCategory } = input;

    if (qimen) {
      return executeThreeWay(domain, bazi, ziwei, qimen, questionCategory);
    }

    return executeTwoWay(domain, bazi, ziwei);
  },

  toPromptOutput(output: CrossValidateOutput): string {
    const consistencyLabel = output.consistency === 'consistent' ? '一致' : output.consistency === 'partial' ? '部分一致' : '分歧';
    const trustLabel = output.trustedSystem === 'bazi' ? '八字'
      : output.trustedSystem === 'ziwei' ? '紫微'
      : output.trustedSystem === 'qimen' ? '奇门'
      : output.trustedSystem === 'all' ? '三方综合'
      : '两系统综合';
    const agreeStr = output.agreedPoints.length > 0 ? `一致点：${output.agreedPoints.join('；')}` : '';
    const disagreeStr = output.disagreedPoints.length > 0 ? `分歧：${output.disagreedPoints.join('；')}` : '';
    return `三方交叉验证${consistencyLabel}：${[agreeStr, disagreeStr].filter(Boolean).join('，')}，综合建议以${trustLabel}为准`;
  },
};
