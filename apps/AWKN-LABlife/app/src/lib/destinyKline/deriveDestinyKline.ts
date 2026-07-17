import type { KLinePoint, CelebrityCase } from '../../types/lifekline';
import type {
  DestinyKlinePoint,
  DestinyKlineBundle,
  DestinyKlineAspectBundle,
  KlineAspect,
  KlineSignal,
  KlineFactorBreakdown,
  KlineStageKey,
} from './types';
import { clamp, getStageName, getStageNameEn, getStageKey, getBullMarketStage, BULL_MARKET_STAGES } from './types';
import { getFactorsByAspect } from './ruleFactors';
import { deriveAllShortCycles } from './deriveShortCycle';
import { deriveShiShenMod, SHISHEN_MAP } from './shiShenModulator';
import { deriveXCHHRisk } from './xingChongHeHaiPenalty';
import type { XCHHData } from './xingChongHeHaiPenalty';
import { deriveNaYinMod, deriveZangganMod } from './naYinZangganModulator';
import type { NaYinData, ZangganShishenData } from './naYinZangganModulator';
import { deriveZiweiMod } from './ziweiModulator';
import type { ZiweiSummary } from './ziweiModulator';
import { deriveCelebrityModSimple, deriveCelebrityMod } from './celebrityModulator';
import { estimateWuxingFromPillars } from './wuxingUtils';

function detectPointSignals(
  point: DestinyKlinePoint,
  prev: DestinyKlinePoint | undefined,
  aspect: KlineAspect,
  recentPoints: DestinyKlinePoint[]
): KlineSignal[] {
  const signals: KlineSignal[] = [];
  const tags = point.evidenceTags || [];

  if (prev && point.score > prev.score && (point.volume ?? 0) > (prev.volume ?? 0)) {
    signals.push({
      id: 'rise_cross',
      label: '启势金叉',
      level: 'positive',
      description: '短期势头向上，动能增强。',
      evidenceTags: ['短期动能增强'],
    });
  }

  const nobleTags = ['天乙贵人', '文昌贵人', '将星'];
  if (nobleTags.some((t) => tags.includes(t)) && (point.volume ?? 0) > 25) {
    signals.push({
      id: 'noble_volume',
      label: '贵人放量',
      level: 'positive',
      description: '贵人星入位，外部助力增强。',
      evidenceTags: tags.filter((t) => nobleTags.includes(t)),
    });
  }

  if (aspect === 'wealth') {
    const wealthTags = ['食伤生财', '财星透出', '财星'];
    const hasWealthSignal = wealthTags.some((t) => tags.includes(t));
    const recentMean = recentPoints.length > 0
      ? recentPoints.reduce((s, p) => s + p.score, 0) / recentPoints.length
      : 50;
    if (hasWealthSignal && point.score > recentMean) {
      signals.push({
        id: 'wealth_breakout',
        label: '财星突破',
        level: 'positive',
        description: '财运线突破近期均值，适合关注变现。',
        evidenceTags: tags.filter((t) => wealthTags.includes(t)),
      });
    }
  }

  if (aspect === 'relationship') {
    const relTags = ['桃花', '夫妻宫冲动', '红鸾天喜'];
    if (relTags.some((t) => tags.includes(t)) && (point.volume ?? 0) > 20) {
      signals.push({
        id: 'relationship_shift',
        label: '关系异动',
        level: 'warning',
        description: '情感活跃度高，适合主动推进但注意甄别。',
        evidenceTags: tags.filter((t) => relTags.includes(t)),
      });
    }
  }

  if ((tags.includes('空亡') || tags.includes('落空')) && point.high - point.low > 15) {
    signals.push({
      id: 'void_pullback',
      label: '空亡回撤',
      level: 'warning',
      description: '机会分高但落地不稳。',
      evidenceTags: ['空亡'],
    });
  }

  const conflictTags = ['冲', '刑', '害', '破'];
  if (conflictTags.some((t) => tags.some((tag) => tag.includes(t))) && (point.riskPenalty ?? 0) > 5) {
    signals.push({
      id: 'conflict_breakdown',
      label: '冲刑破位',
      level: 'warning',
      description: '冲刑集中，容易生变。',
      evidenceTags: tags.filter((t) => conflictTags.some((c) => t.includes(c))),
    });
  }

  if (tags.includes('用神回归')) {
    signals.push({
      id: 'useful_god_return',
      label: '用神回归',
      level: 'positive',
      description: '用神在运势中重新增强。',
      evidenceTags: ['用神回归'],
    });
  }

  return signals;
}

// detectSignals 复用 detectPointSignals，避免重复逻辑
function detectSignals(
  points: DestinyKlinePoint[],
  aspect: KlineAspect,
  evidenceTags: string[] | undefined
): KlineSignal[] {
  if (!points || points.length < 2) return [];
  const current = points[points.length - 1];
  const prev = points[points.length - 2];
  return detectPointSignals(current, prev, aspect, points.slice(-5));
}

/** @deprecated 本地重算已废弃，K 线以后端为唯一真源 */
function deriveAspectOHLCV(
  basePoints: KLinePoint[],
  aspect: KlineAspect,
  calcResult: any,
  birthYear: number,
  celebrityData?: CelebrityCase[],
): DestinyKlinePoint[] {
  const data = calcResult?.calcData || calcResult || {};
  const daYun = data.daYun || [];

  const shishenData = {
    yearShishen: data.yearShishen || '',
    monthShishen: data.monthShishen || '',
    dayShishen: data.dayShishen || '',
    hourShishen: data.hourShishen || '',
  }

  const naYinData = data.naYin as NaYinData | undefined
  const zangganData = data.zangganShishen as ZangganShishenData | undefined
  const xchhData = data.xingChongHeHai as XCHHData | undefined
  const ziweiData = data.ziweiSummary as ZiweiSummary | undefined
  const liuNianDetail: any[] = Array.isArray(data.liuNianDetail) ? data.liuNianDetail : []

  const shiShenScore = deriveShiShenMod(
    shishenData.yearShishen, shishenData.monthShishen,
    shishenData.dayShishen, shishenData.hourShishen, aspect,
  )

  const naYinScore = deriveNaYinMod(naYinData, aspect)
  const zangganScore = deriveZangganMod(zangganData, SHISHEN_MAP, aspect)

  const ziweiScore = deriveZiweiMod(ziweiData, aspect)

  const userWuxing = estimateWuxingFromPillars(
    data.yearPillar || '', data.monthPillar || '',
    data.dayPillar || '', data.hourPillar || '',
  )

  const celebrityScore = deriveCelebrityModSimple(
    celebrityData || null,
    userWuxing,
    aspect,
  )

  const factors = getFactorsByAspect(aspect);
  let prevClose = basePoints.length > 0 ? basePoints[0].score : 60;

  const computedPoints: DestinyKlinePoint[] = basePoints.map((base, index) => {
    const daYunItem =
      daYun.find((d: any) => base.age >= (d.startAge || 0) && base.age <= (d.endAge || 0)) ||
      daYun[0];
    const year = birthYear + base.age;

    const liuNianItem = liuNianDetail.find((ln: any) => ln.year === year);
    const liuNianGanZhi = liuNianItem?.ganZhi || '';

    const baseChart = base.score;
    const daYunScore = daYunItem ? calcDaYunScore(daYunItem, aspect) : 50;

    const yearlyMod = liuNianItem && typeof liuNianItem.score === 'number'
      ? liuNianItem.score
      : calcYearlyMod(year, base, aspect);

    const aspectMod = calcAspectMod(base, aspect, calcResult) + naYinScore * 0.4 + zangganScore * 0.3;
    const knowledgeMod = calcKnowledgeMod(base.evidenceTags, factors);
    const opportunityScore = calcOpportunityScore(base.evidenceTags, factors);

    const xchhBundle = deriveXCHHRisk(xchhData, liuNianGanZhi);
    const tagRiskPenalty = calcRiskPenalty(base.evidenceTags, factors);
    const riskPenalty = tagRiskPenalty + xchhBundle.riskPenalty;

    const close = clamp(
      baseChart * 0.12 +
        daYunScore * 0.20 +
        yearlyMod * 0.18 +
        shiShenScore * 0.12 +
        ziweiScore * 0.10 +
        aspectMod * 0.12 +
        knowledgeMod * 0.08 +
        celebrityScore * 0.08 -
        riskPenalty * 1.0,
      5,
      95
    );

    const rawVolume = calcVolume(base, daYunItem, aspect, calcResult);
    const volume = rawVolume + xchhBundle.volumeBoost;

    const high = clamp(close + opportunityScore * 0.35 + volume * 0.12, close, 100);
    const low = clamp(close - riskPenalty * 0.7 - volume * 0.08, 0, close);
    const open = Math.round(prevClose * 0.65 + close * 0.35);
    prevClose = close;

    return {
      ...base,
      aspect,
      open,
      close,
      high,
      low,
      score: Math.round(close),
      volume: Math.round(volume),
      opportunityScore: Math.round((opportunityScore + xchhBundle.opportunityBonus) * 10) / 10,
      riskPenalty: Math.round(riskPenalty * 10) / 10,
      factorBreakdown: {
        baseChart: Math.round(baseChart),
        daYun: Math.round(daYunScore),
        yearly: Math.round(yearlyMod),
        shiShen: Math.round(shiShenScore),
        ziwei: Math.round(ziweiScore),
        aspect: Math.round(aspectMod),
        knowledge: Math.round(knowledgeMod),
        celebrity: Math.round(celebrityScore),
        riskPenalty: Math.round(riskPenalty),
      },
    };
  });

  return computedPoints.map((point, index, arr) => ({
    ...point,
    signals: detectPointSignals(
      point,
      index > 0 ? arr[index - 1] : undefined,
      aspect,
      arr.slice(Math.max(0, index - 5), index)
    ),
  }));
}

function calcDaYunScore(daYunItem: any, aspect: KlineAspect): number {
  if (!daYunItem) return 50;
  let score = 50;
  const gan = daYunItem.gan || '';
  const zhi = daYunItem.zhi || '';

  const careerStems = ['甲', '庚', '辛'];
  const wealthStems = ['戊', '己'];
  const relStems = ['乙', '丁'];

  if (aspect === 'career' && careerStems.includes(gan)) score += 10;
  if (aspect === 'wealth' && wealthStems.includes(gan)) score += 10;
  if (aspect === 'relationship' && relStems.includes(gan)) score += 8;

  const careerBranches = ['寅', '申', '巳'];
  if (aspect === 'career' && careerBranches.includes(zhi)) score += 6;

  return clamp(score, 20, 85);
}

function calcYearlyMod(year: number, point: KLinePoint, aspect: KlineAspect): number {
  let mod = point.score * 0.85;
  const yearCycle = year % 12;
  if (aspect === 'career' && (yearCycle === 0 || yearCycle === 4 || yearCycle === 8)) mod += 4;
  if (aspect === 'wealth' && (yearCycle === 2 || yearCycle === 6 || yearCycle === 10)) mod += 4;
  return clamp(mod, 10, 95);
}

function calcAspectMod(point: KLinePoint, aspect: KlineAspect, calcResult: any): number {
  let mod = point.score * 0.6;
  const vol = point.volatility || 0;
  switch (aspect) {
    case 'overall':
      return clamp(point.score * 0.9, 20, 90);
    case 'career':
      mod += vol * 0.3;
      break;
    case 'wealth':
      mod -= vol * 0.2;
      mod += 5;
      break;
    case 'relationship':
      mod += vol * 0.15;
      break;
  }
  return clamp(mod, 15, 90);
}

function calcKnowledgeMod(evidenceTags: string[] | undefined, factors: any[]): number {
  if (!evidenceTags || factors.length === 0) return 5;
  let total = 0;
  for (const tag of evidenceTags) {
    for (const f of factors) {
      if (tag.includes(f.evidenceTag) || f.evidenceTag.includes(tag)) {
        total += f.weight * 0.8;
      }
    }
  }
  return clamp(total, 0, 20);
}

function calcRiskPenalty(evidenceTags: string[] | undefined, factors: any[]): number {
  if (!evidenceTags) return 0;
  let total = 0;
  const riskFactors = factors.filter((f) => f.direction === 'negative' || f.direction === 'mixed');
  for (const tag of evidenceTags) {
    for (const f of riskFactors) {
      if (tag.includes(f.evidenceTag) || f.evidenceTag.includes(tag)) {
        total += Math.abs(f.weight);
      }
    }
  }
  return clamp(total, 0, 25);
}

function calcOpportunityScore(evidenceTags: string[] | undefined, factors: any[]): number {
  if (!evidenceTags) return 5;
  let total = 5;
  for (const tag of evidenceTags) {
    for (const f of factors) {
      if ((tag.includes(f.evidenceTag) || f.evidenceTag.includes(tag)) && f.direction === 'positive') {
        total += f.weight * 0.5;
      }
    }
  }
  return clamp(total, 0, 30);
}

function calcVolume(
  point: KLinePoint,
  daYunItem: any,
  aspect: KlineAspect,
  calcResult: any
): number {
  let vol = 0;
  const evidenceTags = point.evidenceTags || [];
  const conflictTags = ['冲', '刑', '害', '破'];

  vol += evidenceTags.filter((t) => conflictTags.some((c) => t.includes(c))).length * 10;
  vol += evidenceTags.filter((t) => !conflictTags.some((c) => t.includes(c))).length * 6;
  vol += evidenceTags.filter((t) => t.includes('贵人') || t.includes('文昌') || t.includes('将星'))
    .length * 5;
  vol += 8;

  if (point.isDaYunChange) vol += 10;

  return clamp(vol, 0, 60);
}

const DEFAULT_NEUTRAL_SIGNAL: KlineSignal = {
  id: 'useful_god_return',
  label: 'destinyKline.signal.neutral',
  level: 'neutral',
  description: '',
  evidenceTags: [],
};

function buildAspectBundle(
  points: DestinyKlinePoint[],
  aspect: KlineAspect
): DestinyKlineAspectBundle {
  const signals = detectSignals(points, aspect, points[points.length - 1]?.evidenceTags);
  const primarySignal = signals.length > 0 ? signals[0] : DEFAULT_NEUTRAL_SIGNAL;
  const currentScore = points.length > 0 ? points[points.length - 1].score : 50;
  const stageKey = getStageKey(currentScore);
  const oneLiner = `destinyKline.oneLiner.${stageKey}.${aspect}`;
  const actionAdvice = `destinyKline.action.${stageKey}.${aspect}`;
  return { points, primarySignal, oneLiner, actionAdvice };
}

/**
 * @deprecated K 线以后端为唯一真源，本地重算已废弃。
 * 仅保留后端数据的渲染层加工（颜色映射/信号图标/阶段名称翻译）。
 * 后端数据缺失时返回 null，前端显示降级 UI。
 */
export function deriveDestinyKline(
  calcResult: any,
  existingChartData: KLinePoint[],
  lang?: string,
  celebrityData?: CelebrityCase[],
  backendKlineResult?: any,
): DestinyKlineBundle | null {
  // 后端数据存在：纯渲染层加工
  if (backendKlineResult) {
    return {
      version: 'destiny-kline-v2',
      currentYear: backendKlineResult.currentYear ?? new Date().getFullYear(),
      currentAge: backendKlineResult.currentAge ?? 0,
      aspects: backendKlineResult.aspects ?? {},
      currentStage: backendKlineResult.currentStage ?? null,
      keyWindows: backendKlineResult.keyWindows ?? { best: [], risk: [] },
      signals: backendKlineResult.signals ?? [],
      shortCycles: backendKlineResult.shortCycles ?? [],
      celebrityRef: backendKlineResult.celebrityRef ?? undefined,
    };
  }

  // 后端数据缺失：不再本地重算，返回 null
  return null;
}