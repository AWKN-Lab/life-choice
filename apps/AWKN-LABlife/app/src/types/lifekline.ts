// LifeKLine 类型定义

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export interface UserInput {
  name?: string;
  gender: Gender;
  birthYear: string;
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  startAge: string;
  firstDaYun: string;
  modelName: string;
  apiBaseUrl: string;
  apiKey: string;
}

export interface KLinePoint {
  age: number;
  year: number;
  month?: number;
  monthName?: string;
  ganZhi: string;
  daYun?: string;
  liuNian?: string;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  volatility?: number;
  reason: string;
  evidenceTags?: string[];
  confidence?: number;
  viewMode?: 'life' | 'decade' | 'monthly' | 'yearMonth';
  granularity?: 'year' | 'month';
  trend?: '上升' | '调整' | '蓄势' | '转折';
  advice?: string;
  isCurrentYear?: boolean;
  isDaYunChange?: boolean;
  movingAverages?: {
    ma3?: number;
    ma11?: number;
    ma30?: number;
    ma100?: number;
  };
}

export interface AnalysisData {
  bazi: string[];
  summary: string;
  summaryScore: number;
  personality: string;
  personalityScore: number;
  industry: string;
  industryScore: number;
  fengShui: string;
  fengShuiScore: number;
  wealth: string;
  wealthScore: number;
  marriage: string;
  marriageScore: number;
  health: string;
  healthScore: number;
  family: string;
  familyScore: number;
  crypto: string;
  cryptoScore: number;
  cryptoYear: string;
  cryptoStyle: string;
}

export interface LifeDestinyResult {
  chartData: KLinePoint[];
  analysis: AnalysisData;
}

// ==================== 八字详细分析类型 ====================

/** 八字分析完整结果类型（兼容 bazi-calculator.ts） */
export interface BaZiAnalysis {
  /** 四柱信息 */
  bazi: {
    year: { gan: string; zhi: string; full?: string };
    month: { gan: string; zhi: string; full?: string };
    day: { gan: string; zhi: string; full?: string };
    time: { gan: string; zhi: string; full?: string; name?: string };
    baZi: string[];
    fullBaZi: string;
    info: { originalDate: string; calculatedDate: string; shiChen?: string };
  };
  /** 十神 */
  shiShen: { year: string; month: string; day: string; time: string };
  /** 地支藏干十神 */
  zhiShiShen: {
    year: Array<{ gan: string; shishen: string }>;
    month: Array<{ gan: string; shishen: string }>;
    day: Array<{ gan: string; shishen: string }>;
    time: Array<{ gan: string; shishen: string }>;
  };
  /** 五行 */
  wuXing: {
    year: { gan: string; zhi: string };
    month: { gan: string; zhi: string };
    day: { gan: string; zhi: string };
    time: { gan: string; zhi: string };
  };
  /** 纳音五行 */
  naYin: { year: string; month: string; day: string; time: string };
  /** 十二长生 */
  changSheng: { year: string; month: string; day: string; time: string };
  /** 大运 */
  daYun: {
    qiYunSui: number;
    isShun: boolean;
    isYangYear: boolean;
    daYun: Array<{
      index: number;
      gan: string;
      zhi: string;
      full: string;
      startAge: number;
      endAge: number;
    }>;
  };
  /** 神煞 */
  shenSha: {
    tianYiGuiRen: string[];
    taiJiGuiRen: string[];
    wenChangGuiRen: string[];
    yangRen: string[];
    taoHua: string[];
    jiangXing: string[];
    huaGai: string[];
    yiMa: string[];
  };
  /** 空亡 */
  kongWang: string[];
  /** 日干 */
  dayGan: string;
  /** 胎元 */
  taiYuan: { gan: string; zhi: string; full: string; naYin: string };
  /** 命宫 */
  mingGong: { gan: string; zhi: string; full: string; naYin: string };
  /** 小运 */
  xiaoYun: Array<{ age: number; gan: string; zhi: string; full: string }>;
  /** 交运时间 */
  jiaoYunTime: { years: number; months: number; days: number; date: Date; dateStr: string };
}

// ==================== 运势类型 ====================

export interface FortuneAspect {
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  advice: string;
}

export interface DailyFortune {
  date: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  lucky_numbers: number[];
  lucky_colors: string[];
  advice: string[];
  auspicious_hours: string[];
  warnings: string[];
}

export interface MonthlyFortune {
  year: number;
  month: number;
  month_name: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  lucky_days: number[];
  advice: string[];
  warnings: string[];
}

export interface YearlyFortune {
  year: number;
  gan_zhi: string;
  overall_score: number;
  career: FortuneAspect;
  wealth: FortuneAspect;
  relationship: FortuneAspect;
  health: FortuneAspect;
  key_moments: Array<{ month: number; description: string }>;
  crisis_periods: Array<{ start_month: number; end_month: number; description: string }>;
  opportunities: Array<{ month: number; type: string; description: string }>;
  best_months: number[];
  worst_months: number[];
  zodiac_compatibility: Array<{ zodiac: string; score: number }>;
  advice: string[];
}

// ==================== 名人案例类型 ====================

export interface CelebrityCase {
  id: string;
  name: string;
  name_cn: string;
  category: string;
  category_cn: string;
  birth_date: string;
  birth_location: { city: string; lat: number; lng: number };
  description: string;
  tags: string[];
  year_pillar: string;
  month_pillar: string;
  day_pillar: string;
  hour_pillar: string;
  scores?: CelebrityScores;
}

export interface CelebrityScores {
  overall: number;
  personality: number;
  career: number;
  wealth: number;
  marriage: number;
  health: number;
}

export interface BaziSimilarity {
  overall_score: number;
  year_pillar_score: number;
  month_pillar_score: number;
  day_pillar_score: number;
  hour_pillar_score: number;
  wuxing_balance_score: number;
  day_master_relation: string;
  insights: string[];
}

export interface CelebrityComparison {
  celebrity: CelebrityCase;
  similarity: BaziSimilarity;
}

// ==================== 均线类型 ====================

export interface MAData {
  ma5: (number | null)[];
  ma10: (number | null)[];
  trend_status: Array<{
    status: 'bullish' | 'bearish' | 'neutral';
    signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  }>;
  cross_points: Array<{
    index: number;
    type: 'golden_cross' | 'death_cross';
    age: number;
    year: number;
  }>;
}

// ==================== 7维人生线类型（总纲V0.3 L3 图形层） ====================

/** 7条人生维度 */
export type LifeDimension = 'career' | 'wealth' | 'health' | 'relationship' | 'growth' | 'freedom' | 'buffer';

export const LIFE_DIMENSIONS: LifeDimension[] = ['career', 'wealth', 'health', 'relationship', 'growth', 'freedom', 'buffer'];

export const LIFE_DIMENSION_LABELS: Record<LifeDimension, { zh: string; color: string }> = {
  career:       { zh: '事业', color: '#3b82f6' },
  wealth:       { zh: '财富', color: '#f59e0b' },
  health:       { zh: '健康', color: '#10b981' },
  relationship: { zh: '关系', color: '#ec4899' },
  growth:       { zh: '成长', color: '#8b5cf6' },
  freedom:      { zh: '自由', color: '#06b6d4' },
  buffer:       { zh: '缓冲', color: '#84cc16' },
};

export type TideFactorKey = 'trend' | 'pressure' | 'liquidity' | 'stability';

export const TIDE_FACTOR_LABELS: Record<TideFactorKey, { zh: string; color: string; desc: string }> = {
  trend:     { zh: '趋势', color: '#3b82f6', desc: '是否具备持续上行的推进力' },
  pressure:  { zh: '压力', color: '#ef4444', desc: '是否处于高消耗与高脆弱区' },
  liquidity: { zh: '流动性', color: '#06b6d4', desc: '是否还有选择权与回旋余地' },
  stability: { zh: '稳定度', color: '#22c55e', desc: '底盘是否足够稳，可以承接变化' },
};

export interface TideFactorScores {
  trend: number;
  pressure: number;
  liquidity: number;
  stability: number;
}

export interface TideStateProbabilities {
  prosperous: number;
  exploration: number;
  recovery: number;
  risk: number;
}

export interface TideWindowScores {
  short: number;
  mid: number;
  long: number;
}

/** 月度K线柱 */
export interface MonthlyKlineBar {
  year: number;
  month: number;
  monthLabel: string; // "2025-01"
  /** OHLCV for composite score */
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // 行动量
  volatility: number; // 波动率
  /** 7条线当月收盘值 */
  dimensions: Record<LifeDimension, number>;
  /** 综合生命资本分 */
  compositeScore: number;
  /** 上行机会分，决定上影线与窗口判断 */
  opportunityScore?: number;
  /** 下行风险分，决定下影线与防守判断 */
  riskScore?: number;
  /** 机会影线长度 */
  upsideRange?: number;
  /** 风险影线长度 */
  downsideRange?: number;
  /** 金融语义下的主因子 */
  factorScores?: TideFactorScores;
  /** 阶段标签：主升/蓄势/修复/承压 */
  signalLabel?: string;
  /** 当月关键事件摘要 */
  eventSummary?: string;
}

// ==================== 12维状态向量（母文档V0.2 §5.2） ====================

export type StateDimension =
  | 'energy' | 'recovery' | 'emotion' | 'clarity'
  | 'liquidity' | 'momentum' | 'support' | 'agency'
  | 'order' | 'growth' | 'optionality' | 'buffer';

export const STATE_DIMENSIONS: StateDimension[] = [
  'energy', 'recovery', 'emotion', 'clarity',
  'liquidity', 'momentum', 'support', 'agency',
  'order', 'growth', 'optionality', 'buffer',
];

export const STATE_DIMENSION_LABELS: Record<StateDimension, { zh: string; color: string }> = {
  energy:      { zh: '精力', color: '#ef4444' },
  recovery:    { zh: '恢复力', color: '#f97316' },
  emotion:     { zh: '情绪', color: '#f59e0b' },
  clarity:     { zh: '清晰度', color: '#eab308' },
  liquidity:   { zh: '流动性', color: '#84cc16' },
  momentum:    { zh: '动量', color: '#22c55e' },
  support:     { zh: '支持度', color: '#10b981' },
  agency:      { zh: '掌控感', color: '#06b6d4' },
  order:       { zh: '秩序', color: '#3b82f6' },
  growth:      { zh: '成长', color: '#8b5cf6' },
  optionality: { zh: '可选项', color: '#a855f7' },
  buffer:      { zh: '缓冲', color: '#ec4899' },
};

/** 状态快照 */
export interface StateSnapshot {
  date: string; // "2025-06"
  values: Record<StateDimension, number>; // 0-100
  capacity: number; // 容量 = mean(energy,recovery,emotion,clarity,liquidity,support)
  entropy: number; // 熵 = std(所有维度) / mean
  quadrant: 'prosperous' | 'exploration' | 'recovery' | 'risk';
  labels: string[];
  // V0.7 时·位·心 三组聚合
  timeGroup?: number;      // 时：avg(liquidity, momentum, optionality)
  positionGroup?: number;  // 位：avg(support, agency, order, growth, buffer)
  mindGroup?: number;      // 心：avg(energy, recovery, emotion, clarity)
  /** 潮汐四主因子 */
  factorScores?: TideFactorScores;
  /** 综合潮汐分 */
  tideScore?: number;
  /** 短中长时间窗分数 */
  windowScores?: TideWindowScores;
  /** 四类状态代理概率 */
  stateProbabilities?: TideStateProbabilities;
  /** 当前更适合的动作偏向 */
  actionBias?: 'expand' | 'probe' | 'repair' | 'shrink';
}

// ==================== 相位空间 ====================

export interface PhasePoint {
  id: string;
  date: string;
  capacity: number;
  entropy: number;
  x?: number;
  y?: number;
  bubbleSize: number; // 机会大小
  size?: number;      // 兼容字段
  quadrant: 'prosperous' | 'exploration' | 'recovery' | 'risk';
  label: string;
  // V0.7 时·位·心
  timeGroup?: number; // 颜色映射
  actionBias?: 'expand' | 'probe' | 'repair' | 'shrink';
}

export const QUADRANT_LABELS: Record<PhasePoint['quadrant'], { zh: string; color: string; desc: string }> = {
  prosperous:  { zh: '稳健扩张', color: '#22c55e', desc: '高容量、低熵——顺势而为' },
  exploration:  { zh: '高压探索', color: '#f59e0b', desc: '高容量、高熵——谨慎突破' },
  recovery:     { zh: '收敛修复', color: '#3b82f6', desc: '低容量、低熵——休养生息' },
  risk:         { zh: '风险暴露', color: '#ef4444', desc: '低容量、高熵——止损收缩' },
};
