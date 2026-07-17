import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StateSnapshot, TideFactorKey } from '../../types/lifekline';
import { QUADRANT_LABELS, TIDE_FACTOR_LABELS } from '../../types/lifekline';

type TimelineMode = 'factors' | 'windows' | 'probabilities';

export interface TideTimelineProps {
  snapshots: StateSnapshot[];
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  className?: string;
}

interface TideTimelineRow {
  date: string;
  trend: number;
  pressure: number;
  liquidity: number;
  stability: number;
  tideScore: number;
  shortWindow: number;
  midWindow: number;
  longWindow: number;
  prosperousProb: number;
  explorationProb: number;
  recoveryProb: number;
  riskProb: number;
  quadrant: StateSnapshot['quadrant'];
  actionBias?: StateSnapshot['actionBias'];
}

const MODES: Array<{ key: TimelineMode; label: string; desc: string }> = [
  { key: 'factors', label: '因子线', desc: '趋势、压力、流动性、稳定度分开看' },
  { key: 'windows', label: '时间窗', desc: '短中长三个时间窗，判断节律是否共振' },
  { key: 'probabilities', label: '状态概率', desc: '四类状态的代理概率，不是确定性预言' },
];

function rollingMean(values: number[], endIndex: number, length: number) {
  const start = Math.max(0, endIndex - length + 1);
  const window = values.slice(start, endIndex + 1);
  return Math.round(window.reduce((sum, value) => sum + value, 0) / Math.max(window.length, 1));
}

function normalizeProbabilities(raw: Record<string, number>) {
  const entries = Object.entries(raw).map(([key, value]) => [key, Math.max(value, 1)] as const);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  return Object.fromEntries(entries.map(([key, value]) => [key, Math.round((value / total) * 100)])) as Record<string, number>;
}

function deriveRows(snapshots: StateSnapshot[]): TideTimelineRow[] {
  const baseRows = snapshots.map((snapshot, index) => {
    const factors = snapshot.factorScores ?? {
      trend: snapshot.timeGroup ?? 50,
      pressure: Math.round(Math.min(100, Math.max(0, snapshot.entropy * 100))),
      liquidity: snapshot.values?.liquidity ?? 50,
      stability: snapshot.mindGroup ?? 50,
    };
    const time = snapshot.timeGroup ?? 50;
    const position = snapshot.positionGroup ?? 50;
    const mind = snapshot.mindGroup ?? 50;
    const tideScore = Math.round(snapshot.tideScore ?? ((factors.trend + factors.liquidity + factors.stability + (100 - factors.pressure)) / 4));

    const normalized = snapshot.stateProbabilities ?? normalizeProbabilities({
      prosperous: (position + mind + time + factors.trend + factors.stability) / 5,
      exploration: (position + (100 - mind) + time + factors.trend + factors.pressure) / 5,
      recovery: ((100 - position) + mind + (100 - factors.pressure) + factors.stability + (100 - time)) / 5,
      risk: ((100 - position) + (100 - mind) + (100 - time) + factors.pressure + (100 - factors.stability)) / 5,
    });

    return {
      date: snapshot.date,
      trend: factors.trend,
      pressure: factors.pressure,
      liquidity: factors.liquidity,
      stability: factors.stability,
      tideScore,
      shortWindow: Math.round(snapshot.windowScores?.short ?? tideScore),
      midWindow: Math.round(snapshot.windowScores?.mid ?? tideScore),
      longWindow: Math.round(snapshot.windowScores?.long ?? tideScore),
      prosperousProb: normalized.prosperous,
      explorationProb: normalized.exploration,
      recoveryProb: normalized.recovery,
      riskProb: normalized.risk,
      quadrant: snapshot.quadrant,
      actionBias: snapshot.actionBias,
    };
  });

  const tideScores = baseRows.map((row) => row.tideScore);
  return baseRows.map((row, index) => ({
    ...row,
    shortWindow: row.shortWindow || rollingMean(tideScores, index, 1),
    midWindow: row.midWindow || rollingMean(tideScores, index, 3),
    longWindow: row.longWindow || rollingMean(tideScores, index, 6),
  }));
}

function actionLabel(actionBias?: StateSnapshot['actionBias']) {
  if (actionBias === 'expand') return '扩张';
  if (actionBias === 'probe') return '试探';
  if (actionBias === 'repair') return '修复';
  if (actionBias === 'shrink') return '收缩';
  return '观察';
}

export function TideTimeline({ snapshots, selectedDate, onSelectDate, className }: TideTimelineProps) {
  const [mode, setMode] = useState<TimelineMode>('factors');

  const rows = useMemo(() => deriveRows(snapshots), [snapshots]);
  const activeRow = useMemo(
    () => rows.find((row) => row.date === selectedDate) ?? rows[rows.length - 1] ?? null,
    [rows, selectedDate],
  );

  const factorKeys = Object.keys(TIDE_FACTOR_LABELS) as TideFactorKey[];

  return (
    <section className={`rounded-2xl border border-white/10 bg-[#10131d] p-4 ${className ?? ''}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#c9a84c]">潮汐时间轴</p>
          <h3 className="mt-1 text-base font-semibold text-white">不是只看一个月，而是看节律有没有持续、背离或转向</h3>
          <p className="mt-1 text-xs leading-5 text-gray-400">
            因子线看结构，时间窗看共振，状态概率看当前更像哪一类阶段。
          </p>
        </div>
        {activeRow && (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
            <div className="text-white">{activeRow.date}</div>
            <div className="mt-1">动作建议: <span className="font-medium text-[#e0c97a]">{actionLabel(activeRow.actionBias)}</span></div>
            <div className="mt-1">当前相位: <span style={{ color: QUADRANT_LABELS[activeRow.quadrant].color }}>{QUADRANT_LABELS[activeRow.quadrant].zh}</span></div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMode(item.key)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              mode === item.key
                ? 'border-[#c9a84c]/60 bg-[#c9a84c]/10 text-[#f3d98f]'
                : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">{MODES.find((item) => item.key === mode)?.desc}</p>

      <div className="mt-4 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 12, right: 20, bottom: 10, left: 0 }}
            onClick={(state) => {
              const row = state?.activePayload?.[0]?.payload as TideTimelineRow | undefined;
              if (row?.date) onSelectDate?.(row.date);
            }}
          >
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#8b93a7', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
            <YAxis domain={[0, 100]} tick={{ fill: '#8b93a7', fontSize: 11 }} stroke="rgba(255,255,255,0.12)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 14, 24, 0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                color: '#f8fafc',
              }}
              formatter={(value: number, name: string) => [`${Math.round(value)}`, name]}
              labelFormatter={(label) => `月份 ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }} />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 4" />

            {mode === 'factors' && factorKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={TIDE_FACTOR_LABELS[key].zh}
                stroke={TIDE_FACTOR_LABELS[key].color}
                strokeWidth={key === 'pressure' ? 1.8 : 2.4}
                strokeDasharray={key === 'pressure' ? '5 4' : undefined}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}

            {mode === 'windows' && (
              <>
                <Line type="monotone" dataKey="shortWindow" name="短窗(1M)" stroke="#60a5fa" strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="midWindow" name="中窗(3M)" stroke="#22c55e" strokeWidth={2.4} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="longWindow" name="长窗(6M)" stroke="#f59e0b" strokeWidth={2.6} dot={false} activeDot={{ r: 5 }} />
              </>
            )}

            {mode === 'probabilities' && (
              <>
                <Line type="monotone" dataKey="prosperousProb" name="扩张概率" stroke={QUADRANT_LABELS.prosperous.color} strokeWidth={2.4} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="explorationProb" name="试探概率" stroke={QUADRANT_LABELS.exploration.color} strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="recoveryProb" name="修复概率" stroke={QUADRANT_LABELS.recovery.color} strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="riskProb" name="收缩概率" stroke={QUADRANT_LABELS.risk.color} strokeWidth={2.2} dot={false} activeDot={{ r: 5 }} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {activeRow && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs text-gray-500">综合潮汐分</p>
            <p className="mt-1 text-lg font-semibold text-white">{activeRow.tideScore}</p>
            <p className="mt-1 text-[11px] text-gray-400">趋势 + 流动性 + 稳定度 - 压力 的合成摘要</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs text-gray-500">短中长共振</p>
            <p className="mt-1 text-lg font-semibold text-white">{activeRow.shortWindow}/{activeRow.midWindow}/{activeRow.longWindow}</p>
            <p className="mt-1 text-[11px] text-gray-400">短窗冲高但长窗不动，通常不该重仓推进</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs text-gray-500">最高状态概率</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: QUADRANT_LABELS[activeRow.quadrant].color }}>
              {QUADRANT_LABELS[activeRow.quadrant].zh}
            </p>
            <p className="mt-1 text-[11px] text-gray-400">这里只是代理概率，作用是辅助判断，不是结论本身</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs text-gray-500">当月动作</p>
            <p className="mt-1 text-lg font-semibold text-[#f3d98f]">{actionLabel(activeRow.actionBias)}</p>
            <p className="mt-1 text-[11px] text-gray-400">和相位、因子一起看，不单看一根线</p>
          </div>
        </div>
      )}
    </section>
  );
}

export default TideTimeline;
