/**
 * 潮汐数据包标准化 Adapter
 * 后端返回字段一旦有空值，前端图表容易崩。
 * 所有页面只吃标准化后的数据。
 */

import type { TidePackage } from '../services/klineTideApi';
import type {
  LifeDimension,
  MonthlyKlineBar,
  PhasePoint,
  StateDimension,
  StateSnapshot,
  TideFactorScores,
  TideStateProbabilities,
  TideWindowScores,
} from '../types/lifekline';

const LIFE_DIMS: LifeDimension[] = ['career', 'wealth', 'health', 'relationship', 'growth', 'freedom', 'buffer'];
const STATE_DIMS: StateDimension[] = [
  'energy', 'recovery', 'emotion', 'clarity',
  'liquidity', 'momentum', 'support', 'agency',
  'order', 'growth', 'optionality', 'buffer',
];

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * P0-04 (2026-07-12): 禁止缺失值自动补 50
 * 如果 factorScores 的任何关键字段缺失，返回 undefined，不返回补 50 的假对象。
 * 页面应检查 undefined 并展示"暂无可验证数据"。
 */
function normalizeFactorScores(value: any): TideFactorScores | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (value.trend == null || value.pressure == null || value.liquidity == null || value.stability == null) {
    return undefined;
  }
  return {
    trend: toNumber(value.trend, 0),
    pressure: toNumber(value.pressure, 0),
    liquidity: toNumber(value.liquidity, 0),
    stability: toNumber(value.stability, 0),
  };
}

/**
 * P0-04 (2026-07-12): 禁止缺失值自动补 25
 * 缺失时返回 undefined，不返回补 25 的假概率分布。
 */
function normalizeStateProbabilities(value: any): TideStateProbabilities | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (value.prosperous == null || value.exploration == null || value.recovery == null || value.risk == null) {
    return undefined;
  }
  return {
    prosperous: toNumber(value.prosperous, 0),
    exploration: toNumber(value.exploration, 0),
    recovery: toNumber(value.recovery, 0),
    risk: toNumber(value.risk, 0),
  };
}

/**
 * P0-04 (2026-07-12): 禁止缺失值自动补 50
 * 缺失时返回 undefined，不返回补 50 的假窗口分。
 */
function normalizeWindowScores(value: any): TideWindowScores | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (value.short == null || value.mid == null || value.long == null) {
    return undefined;
  }
  return {
    short: toNumber(value.short, 0),
    mid: toNumber(value.mid, 0),
    long: toNumber(value.long, 0),
  };
}

function normalizeKlineBar(bar: any): MonthlyKlineBar {
  const dimensions = LIFE_DIMS.reduce<Record<LifeDimension, number>>((acc, dim) => {
    const legacyValue = bar?.dimensions?.[dim];
    const backendLine = bar?.[dim];
    acc[dim] = toNumber(
      typeof legacyValue === 'number'
        ? legacyValue
        : backendLine?.close,
      50,
    );
    return acc;
  }, {} as Record<LifeDimension, number>);

  const opens = LIFE_DIMS.map((dim) => toNumber(bar?.[dim]?.open, dimensions[dim]));
  const highs = LIFE_DIMS.map((dim) => toNumber(bar?.[dim]?.high, dimensions[dim]));
  const lows = LIFE_DIMS.map((dim) => toNumber(bar?.[dim]?.low, dimensions[dim]));
  const closes = LIFE_DIMS.map((dim) => toNumber(bar?.[dim]?.close, dimensions[dim]));
  const volumes = LIFE_DIMS.map((dim) => toNumber(bar?.[dim]?.volume, 50));
  const avg = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));

  return {
    year: toNumber(bar?.year, 0),
    month: toNumber(bar?.month, 1),
    monthLabel: bar?.monthLabel || `${bar?.year ?? '0000'}-${String(bar?.month ?? 1).padStart(2, '0')}`,
    open: toNumber(bar?.open, avg(opens)),
    high: toNumber(bar?.high, Math.max(...highs)),
    low: toNumber(bar?.low, Math.min(...lows)),
    close: toNumber(bar?.close, avg(closes)),
    volume: toNumber(bar?.volume, avg(volumes)),
    volatility: toNumber(bar?.volatility, 0),
    dimensions,
    compositeScore: toNumber(bar?.compositeScore ?? bar?.compositeCapital, avg(closes)),
    opportunityScore: toNumber(bar?.opportunityScore, 50),
    riskScore: toNumber(bar?.riskScore, 50),
    upsideRange: toNumber(bar?.upsideRange, Math.max(0, toNumber(bar?.high, Math.max(...highs)) - toNumber(bar?.close, avg(closes)))),
    downsideRange: toNumber(bar?.downsideRange, Math.max(0, toNumber(bar?.close, avg(closes)) - toNumber(bar?.low, Math.min(...lows)))),
    factorScores: normalizeFactorScores(bar?.factorScores),
    signalLabel: typeof bar?.signalLabel === 'string' ? bar.signalLabel : undefined,
    eventSummary: bar?.eventSummary,
  };
}

function normalizeStateSnapshot(snapshot: any): StateSnapshot {
  const values = STATE_DIMS.reduce<Record<StateDimension, number>>((acc, dim) => {
    acc[dim] = toNumber(snapshot?.values?.[dim], toNumber(snapshot?.[dim], 50));
    return acc;
  }, {} as Record<StateDimension, number>);

  return {
    date: snapshot?.date || `${snapshot?.year ?? '0000'}-${String(snapshot?.month ?? 1).padStart(2, '0')}`,
    values,
    capacity: toNumber(
      snapshot?.capacity,
      Math.round((values.energy + values.recovery + values.liquidity + values.support + values.buffer) / 5),
    ),
    entropy: toNumber(snapshot?.entropy, 0),
    quadrant: snapshot?.quadrant || 'recovery',
    labels: Array.isArray(snapshot?.labels) ? snapshot.labels : [],
    timeGroup: toNumber(snapshot?.timeGroup, Math.round((values.liquidity + values.momentum + values.optionality) / 3)),
    positionGroup: toNumber(snapshot?.positionGroup, Math.round((values.support + values.agency + values.order + values.growth + values.buffer) / 5)),
    mindGroup: toNumber(snapshot?.mindGroup, Math.round((values.energy + values.recovery + values.emotion + values.clarity) / 4)),
    factorScores: normalizeFactorScores(snapshot?.factorScores),
    tideScore: toNumber(snapshot?.tideScore, 50),
    windowScores: normalizeWindowScores(snapshot?.windowScores),
    stateProbabilities: normalizeStateProbabilities(snapshot?.stateProbabilities),
    actionBias: snapshot?.actionBias,
  };
}

function normalizePhasePoint(point: any): PhasePoint {
  const x = toNumber(point?.x ?? point?.capacity, 50);
  const y = toNumber(point?.y ?? point?.entropy, 50);
  const bubbleSize = toNumber(point?.bubbleSize ?? point?.size, 50);

  return {
    id: point?.id || `phase-${point?.date ?? 'unknown'}`,
    date: point?.date || '',
    x,
    y,
    capacity: x,
    entropy: y,
    bubbleSize,
    size: bubbleSize,
    quadrant: point?.quadrant || 'recovery',
    label: point?.label || point?.date || '',
    timeGroup: toNumber(point?.timeGroup, 50),
    actionBias: point?.actionBias,
  };
}

/**
 * 将后端返回的原始数据标准化，确保所有数组字段存在
 * @param raw 后端返回的 Partial<TidePackage>
 * @returns 完整的 TidePackage（空字段用空数组兜底）
 */
export function normalizeTidePackage(raw: Partial<TidePackage>): TidePackage {
  const rawBars = Array.isArray(raw.klineBars) ? raw.klineBars : [];
  const klineBars = rawBars.map(normalizeKlineBar);
  const stateSnapshots = (Array.isArray(raw.stateSnapshots) ? raw.stateSnapshots : []).map(normalizeStateSnapshot);
  const phasePoints = (Array.isArray(raw.phasePoints) ? raw.phasePoints : []).map(normalizePhasePoint);

  return {
    klineBars,
    stateSnapshots,
    phasePoints,
    // B-S2 (2026-07-05): 透传 tideJudgment（后端可能不返回，保持 undefined 即可）
    tideJudgment: raw.tideJudgment,
    // P0-05 (2026-07-12): 禁止客户端伪造 generatedAt
    // 如果后端未返回 meta，标记为 degraded，不使用 new Date() 伪造时间
    meta: raw.meta ?? {
      generatedAt: '',
      startYear: 0,
      startMonth: 0,
      klineMonths: 0,
      tideMonths: 0,
      note: '数据来源未知，请等待服务端生成正式快照。',
    },
  };
}
