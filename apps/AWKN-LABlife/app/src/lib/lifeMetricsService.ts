// 7维人生K线 + 12维状态向量 模拟数据生成器
// 阶段一：纯前端 mock，不做后端 API
// 阶段二：平移到人生枢密院后接真实数据

import type {
  MonthlyKlineBar, LifeDimension,
  StateSnapshot, StateDimension,
  PhasePoint,
} from '../types/lifekline';
import { LIFE_DIMENSIONS, STATE_DIMENSIONS } from '../types/lifekline';

// ==================== 生成器配置 ====================

const SEED_BASE: Record<LifeDimension, { mean: number; amplitude: number; trend: number }> = {
  career:       { mean: 55, amplitude: 12, trend: 0.15 },
  wealth:       { mean: 50, amplitude: 15, trend: 0.2 },
  health:       { mean: 65, amplitude: 8, trend: -0.05 },
  relationship: { mean: 55, amplitude: 14, trend: 0.05 },
  growth:       { mean: 50, amplitude: 10, trend: 0.25 },
  freedom:      { mean: 45, amplitude: 13, trend: 0.1 },
  buffer:       { mean: 40, amplitude: 16, trend: 0.3 },
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

// ==================== 7维月度K线生成 ====================

export function generateMonthlyKlineBars(
  startYear: number,
  startMonth: number,
  numMonths: number = 36,
): MonthlyKlineBar[] {
  const bars: MonthlyKlineBar[] = [];
  let seed = startYear * 100 + startMonth;

  for (let i = 0; i < numMonths; i++) {
    const year = startYear + Math.floor((startMonth + i - 1) / 12);
    const month = ((startMonth + i - 1) % 12) + 1;
    const monthLabel = `${year}-${String(month).padStart(2, '0')}`;

    const dimensions = {} as Record<LifeDimension, number>;
    const dims = ['career', 'wealth', 'health', 'relationship', 'growth', 'freedom', 'buffer'] as LifeDimension[];

    for (const dim of dims) {
      const cfg = SEED_BASE[dim];
      seed++;
      const noise = (seededRandom(seed) - 0.5) * 2 * cfg.amplitude;
      const trendEffect = cfg.trend * i;
      const seasonalEffect = Math.sin((month / 12) * Math.PI * 2) * cfg.amplitude * 0.3;
      const raw = cfg.mean + trendEffect + noise + seasonalEffect;
      // Add some auto-correlation from previous month
      if (i > 0 && bars[i - 1]) {
        const prev = bars[i - 1].dimensions[dim];
        dimensions[dim] = clamp(Math.round((raw * 0.4 + prev * 0.6) * 10) / 10);
      } else {
        dimensions[dim] = clamp(Math.round(raw * 10) / 10);
      }
    }

    // Composite score: weighted average of 7 dimensions
    const weights: Record<LifeDimension, number> = {
      career: 0.18, wealth: 0.16, health: 0.18, relationship: 0.14,
      growth: 0.14, freedom: 0.1, buffer: 0.1,
    };
    const compositeScore = clamp(Math.round(
      dims.reduce((sum, d) => sum + dimensions[d] * weights[d], 0) * 10
    ) / 10);

    // OHLCV for composite
    if (i === 0) {
      bars.push({
        year, month, monthLabel,
        open: compositeScore,
        high: compositeScore,
        low: compositeScore,
        close: compositeScore,
        volume: Math.round(50 + seededRandom(seed + 1000) * 50),
        volatility: Math.round(seededRandom(seed + 2000) * 10 * 10) / 10,
        dimensions,
        compositeScore,
      });
    } else {
      const prev = bars[i - 1];
      seed++;
      const range = 3 + seededRandom(seed) * 6;
      const close = compositeScore;
      const open = prev.close;
      const high = clamp(Math.max(open, close) + seededRandom(seed + 1) * range);
      const low = clamp(Math.min(open, close) - seededRandom(seed + 2) * range);
      const volume = Math.round(40 + seededRandom(seed + 3) * 60);
      const volatility = Math.round(Math.abs(close - open) * 10 + seededRandom(seed + 4) * 5 * 10) / 10;

      bars.push({
        year, month, monthLabel,
        open: Math.round(open * 10) / 10,
        high: Math.round(high * 10) / 10,
        low: Math.round(low * 10) / 10,
        close: Math.round(close * 10) / 10,
        volume,
        volatility,
        dimensions,
        compositeScore,
        eventSummary: getRandomEvent(seededRandom(seed + 5)),
      });
    }
  }

  return bars;
}

function getRandomEvent(rand: number): string | undefined {
  const events = [
    '季度复盘完成', '新项目启动', '关键人脉拓展', '财务结构调整',
    '健康检查通过', '学习计划达标', '家庭重要事件', '副业取得进展',
    '换工作', '搬家', '完成重要里程碑', undefined,
  ];
  return rand > 0.6 ? events[Math.floor(rand * events.length)] : undefined;
}

// ==================== 12维状态快照生成 ====================

export function generateStateSnapshots(
  startYear: number,
  startMonth: number,
  numMonths: number = 12,
): StateSnapshot[] {
  const snapshots: StateSnapshot[] = [];
  let seed = (startYear * 100 + startMonth) * 7;

  for (let i = 0; i < numMonths; i++) {
    const year = startYear + Math.floor((startMonth + i - 1) / 12);
    const month = ((startMonth + i - 1) % 12) + 1;
    const date = `${year}-${String(month).padStart(2, '0')}`;

    const values = {} as Record<StateDimension, number>;
    const dims = STATE_DIMENSIONS;

    for (const dim of dims) {
      seed++;
      const baseMean = 50 + (seededRandom(seed * 13) - 0.5) * 30;
      const noise = (seededRandom(seed) - 0.5) * 20;
      const seasonal = Math.sin((month / 12) * Math.PI * 2) * 10;
      if (i > 0 && snapshots[i - 1]) {
        const prev = snapshots[i - 1].values[dim];
        values[dim] = clamp(Math.round((baseMean + noise + seasonal) * 0.3 + prev * 0.7));
      } else {
        values[dim] = clamp(Math.round(baseMean + noise + seasonal));
      }
    }

    // capacity: mean of energy, recovery, emotion, clarity, liquidity, support
    const capacityDims: StateDimension[] = ['energy', 'recovery', 'emotion', 'clarity', 'liquidity', 'support'];
    const capacity = Math.round(
      capacityDims.reduce((s, d) => s + values[d], 0) / capacityDims.length
    );

    // entropy: std of all dims / mean
    const allVals = dims.map(d => values[d]);
    const mean = allVals.reduce((s, v) => s + v, 0) / allVals.length;
    const variance = allVals.reduce((s, v) => s + (v - mean) ** 2, 0) / allVals.length;
    const entropy = mean > 0 ? Math.round(Math.sqrt(variance) / mean * 100 * 10) / 10 : 0;

    // quadrant
    const capacityThreshold = 50;
    const entropyThreshold = 30;
    let quadrant: StateSnapshot['quadrant'];
    if (capacity >= capacityThreshold && entropy < entropyThreshold) quadrant = 'prosperous';
    else if (capacity >= capacityThreshold) quadrant = 'exploration';
    else if (entropy < entropyThreshold) quadrant = 'recovery';
    else quadrant = 'risk';

    snapshots.push({ date, values, capacity, entropy, quadrant, labels: [] });
  }

  return snapshots;
}

// ==================== 相位空间点生成 ====================

export function generatePhasePoints(snapshots: StateSnapshot[]): PhasePoint[] {
  return snapshots.map((s, i) => ({
    id: `phase-${i}`,
    date: s.date,
    capacity: s.capacity,
    entropy: s.entropy,
    bubbleSize: Math.round(30 + s.capacity * 0.5),
    quadrant: s.quadrant,
    label: `${s.date} ${({ prosperous: '扩张', exploration: '探索', recovery: '修复', risk: '风险' })[s.quadrant]}`,
  }));
}