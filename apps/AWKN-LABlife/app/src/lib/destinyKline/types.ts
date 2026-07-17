import type { KLinePoint } from '../../types/lifekline';

export type KlineAspect = 'overall' | 'career' | 'wealth' | 'relationship';
export type PeriodType = 'life' | 'decade' | 'year' | 'quarter' | 'month' | 'xun' | 'day3';
export type CardType =
  | 'currentStage'      // 当前阶段卡
  | 'future3Year'       // 未来三年卡
  | 'careerKline'       // 事业K线卡
  | 'wealthKline'       // 财运K线卡
  | 'relationshipWave'  // 情感波动卡
  | 'keyYear'           // 关键年份卡
  | 'actionWindow';     // 近期行动窗口卡

export type KlineStageKey = 'rising' | 'steady' | 'accumulating' | 'recovery';

// ─── Bull Market Lifecycle (5-stage) ─────────────────────────────────────────

export type BullMarketStageKey = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5';

export interface BullMarketStage {
  key: BullMarketStageKey;
  name: { zh: string; en: string };
  color: string;
  scoreRange: [number, number];
}

export const BULL_MARKET_STAGES: Record<BullMarketStageKey, BullMarketStage> = {
  stage1: { key: 'stage1', name: { zh: '筑底蓄势', en: 'Accumulation' },  color: '#3b82f6', scoreRange: [0,  39] },
  stage2: { key: 'stage2', name: { zh: '估值修复', en: 'Value Recovery' }, color: '#10b981', scoreRange: [40, 54] },
  stage3: { key: 'stage3', name: { zh: '主升成长', en: 'Growth Rally' },   color: '#f59e0b', scoreRange: [55, 74] },
  stage4: { key: 'stage4', name: { zh: '情绪狂欢', en: 'Euphoria' },       color: '#ef4444', scoreRange: [75, 87] },
  stage5: { key: 'stage5', name: { zh: '见顶出局', en: 'Peak Exit' },       color: '#9333ea', scoreRange: [88, 100] },
};

export function getBullMarketStage(score: number): BullMarketStage {
  const entry = Object.values(BULL_MARKET_STAGES).find(s => score >= s.scoreRange[0] && score <= s.scoreRange[1]);
  return entry || BULL_MARKET_STAGES.stage1;
}

export interface KlineSignal {
  id:
    | 'rise_cross'
    | 'noble_volume'
    | 'wealth_breakout'
    | 'relationship_shift'
    | 'void_pullback'
    | 'conflict_breakdown'
    | 'useful_god_return';
  label: string;
  level: 'positive' | 'warning' | 'neutral';
  description: string;
  evidenceTags: string[];
}

export interface KlineFactorBreakdown {
  baseChart: number;
  daYun: number;
  yearly: number;
  shiShen: number;
  ziwei: number;
  aspect: number;
  knowledge: number;
  celebrity: number;
  riskPenalty: number;
}

export interface CelebrityReference {
  topMatches: {
    name: string;
    nameCn: string;
    wuxingSimilarity: number;
    scores: { overall: number; career: number; wealth: number; personality: number; marriage: number; health: number };
    category: string;
    tags: string[];
  }[];
  averageAspectScores: Record<KlineAspect, number>;
}

export interface DestinyKlinePoint extends KLinePoint {
  aspect?: KlineAspect;
  volume?: number;
  opportunityScore?: number;
  riskPenalty?: number;
  factorBreakdown?: KlineFactorBreakdown;
  signals?: KlineSignal[];
}

export interface DestinyKlineAspectBundle {
  points: DestinyKlinePoint[];
  primarySignal: KlineSignal;
  oneLiner: string;
  actionAdvice: string;
}

export interface ShortCycleConfig {
  period: PeriodType;
  days: number;
  label: string;
  subLabel: string;
  dataUnit: 'day';
  deriveFrom: 'liuRiData' | 'calcResult';
  color: string;
}

export const SHORT_CYCLE_CONFIGS: Record<string, ShortCycleConfig> = {
  day3: {
    period: 'day3',
    days: 3,
    label: '3日快线',
    subLabel: '近期气感',
    dataUnit: 'day',
    deriveFrom: 'calcResult',
    color: '#f59e0b',
  },
  xun: {
    period: 'xun',
    days: 11,
    label: '11日旬线',
    subLabel: '短期推进',
    dataUnit: 'day',
    deriveFrom: 'calcResult',
    color: '#06b6d4',
  },
  month: {
    period: 'month',
    days: 30,
    label: '30日月线',
    subLabel: '月度节律',
    dataUnit: 'day',
    deriveFrom: 'calcResult',
    color: '#3b82f6',
  },
  quarter: {
    period: 'quarter',
    days: 100,
    label: '100日季线',
    subLabel: '阶段趋势',
    dataUnit: 'day',
    deriveFrom: 'calcResult',
    color: '#8b5cf6',
  },
};

export interface ShortCycleKlinePoint {
  date: string;
  dayOffset: number;
  score: number;
  signalLabel: string;
  aspect?: KlineAspect;
  evidenceTags?: string[];
}

export interface ShortCycleKlineResult {
  period: PeriodType;
  config: ShortCycleConfig;
  points: ShortCycleKlinePoint[];
  summary: {
    todaySignal: string;
    overallTrend: string;
    suitable: string[];
    caution: string[];
  };
}

export interface DestinyKlineBundle {
  version: 'destiny-kline-v2';
  currentYear: number;
  currentAge: number;
  aspects: Record<KlineAspect, DestinyKlineAspectBundle>;
  currentStage: {
    aspect: KlineAspect;
    stageName: string;
    score: number;
    description: string;
    action: string;
    risk: string;
  };
  keyWindows: {
    best: DestinyKlinePoint;
    risk: DestinyKlinePoint;
    turning?: DestinyKlinePoint;
  };
  signals: KlineSignal[];
  shortCycles?: Record<string, ShortCycleKlineResult>;
  celebrityRef?: CelebrityReference;
}

export interface KlineRuleFactor {
  sourceId: string;
  title: string;
  appliesTo: KlineAspect[];
  direction: 'positive' | 'negative' | 'mixed';
  weight: number;
  volatility: number;
  confidence: number;
  evidenceTag: string;
  explanation: string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getStageName(score: number): string {
  if (score >= 75) return '上升窗口';
  if (score >= 60) return '稳步推进';
  if (score >= 45) return '蓄势调整';
  return '低谷修复';
}

export function getStageNameEn(score: number): string {
  if (score >= 75) return 'Rising Window';
  if (score >= 60) return 'Steady Progress';
  if (score >= 45) return 'Consolidation';
  return 'Recovery';
}

export function getStageKey(score: number): KlineStageKey {
  if (score >= 75) return 'rising';
  if (score >= 60) return 'steady';
  if (score >= 45) return 'accumulating';
  return 'recovery';
}