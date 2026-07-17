/**
 * @deprecated 已被 components/kline/KlineChart.tsx（ECharts 版）替代，仅保留供测试引用。
 * 业务页面请使用 KlineChart。计划后续连同测试一并移除。
 */
// 人生K线图：7条生命线 OHLCV candlestick
// 基于 Recharts（项目已有依赖），不引入 ECharts
// 总纲 V0.3 L3 图形层 / K线归口 V0.6

import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { MonthlyKlineBar, LifeDimension } from '../types/lifekline';
import { LIFE_DIMENSIONS, LIFE_DIMENSION_LABELS } from '../types/lifekline';
import { generateMonthlyKlineBars } from '../lib/lifeMetricsService';

interface LifeKLineChartProps {
  data?: any[];
  showDimensions?: LifeDimension[];
  height?: number;
}

function isMonthlyKlineBar(data: any[]): data is MonthlyKlineBar[] {
  return data.length > 0 && 'dimensions' in data[0] && 'monthLabel' in data[0];
}

function toMonthlyKlineBars(data: any[]): MonthlyKlineBar[] {
  if (data.length === 0) return [];
  if (isMonthlyKlineBar(data)) return data;
  return data.map((item, idx) => ({
    year: item.year ?? 2000 + idx,
    month: 1 + (idx % 12),
    monthLabel: item.ganZhi ?? `${item.year ?? 2000 + idx}-${String(1 + (idx % 12)).padStart(2, '0')}`,
    open: item.open ?? 50,
    high: item.high ?? 50,
    low: item.low ?? 50,
    close: item.close ?? 50,
    volume: 50,
    volatility: 10,
    compositeScore: item.score ?? 50,
    dimensions: {
      career: item.score ?? 50,
      wealth: item.score ?? 50,
      health: item.score ?? 50,
      relationship: item.score ?? 50,
      growth: item.score ?? 50,
      freedom: item.score ?? 50,
      buffer: item.score ?? 50,
    },
    eventSummary: item.reason,
  }));
}

/** OHLCV candlestick 单月 */ 
function CandlestickBar(props: {
  x: number; y: number; width: number; height: number;
  open: number; close: number; high: number; low: number;
  yScale: (v: number) => number;
  payload: MonthlyKlineBar;
  index: number;
}) {
  const { x, width, open, close, high, low, yScale } = props;
  const isUp = close >= open;
  const color = isUp ? '#ef4444' : '#22c55e';
  const bodyTop = yScale(Math.max(open, close));
  const bodyBottom = yScale(Math.min(open, close));
  const bodyHeight = Math.max(1, bodyBottom - bodyTop);
  const wickTop = yScale(high);
  const wickBottom = yScale(low);
  const centerX = x + width / 2;

  return (
    <g>
      <line x1={centerX} y1={wickTop} x2={centerX} y2={wickBottom}
        stroke={color} strokeWidth={1} />
      <rect x={x + width * 0.25} y={bodyTop}
        width={width * 0.5} height={bodyHeight}
        fill={color} stroke={color} strokeWidth={0.5} />
    </g>
  );
}

export function LifeKLineChart({
  data: externalData,
  showDimensions = ['career', 'wealth', 'health', 'relationship', 'growth', 'freedom', 'buffer'],
  height = 500,
}: LifeKLineChartProps) {
  const { t } = useTranslation();
  const [periodMonths, setPeriodMonths] = useState(36);

  const data = useMemo<MonthlyKlineBar[]>(
    () => {
      if (externalData === null || externalData === undefined) {
        return generateMonthlyKlineBars(2023, 1, periodMonths);
      }
      if (externalData.length === 0) return [];
      const converted = toMonthlyKlineBars(externalData);
      return converted.length > 0 ? converted : generateMonthlyKlineBars(2023, 1, periodMonths);
    },
    [externalData, periodMonths],
  );

  const chartData = useMemo(() => data.map((bar) => ({
    ...bar,
    candlestick: [bar.low, bar.open, bar.close, bar.high] as [number, number, number, number],
  })), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
        暂无K线数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 周期切换 */}
      <div className="flex items-center gap-2 mb-4">
        {[12, 24, 36, 48].map((n) => (
          <button
            key={n}
            onClick={() => setPeriodMonths(n)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              periodMonths === n
                ? 'bg-primary text-on-surface border-primary'
                : 'bg-surface-container text-text-secondary border-border hover:border-primary'
            }`}
          >
            {n}个月
          </button>
        ))}
      </div>

      {/* 七线图 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-text-primary mb-2">7条人生线走势</h4>
        <ResponsiveContainer width="100%" height={height * 0.5}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--surface-container)', border: '1px solid var(--border)', borderRadius: 8 }}
              formatter={(value: number, name: string) => [
                value, LIFE_DIMENSION_LABELS[name as LifeDimension]?.zh || name,
              ]}
            />
            <Legend
              formatter={(v: string) => LIFE_DIMENSION_LABELS[v as LifeDimension]?.zh || v}
              wrapperStyle={{ fontSize: 11 }}
            />
            {showDimensions.map((dim) => (
              <Line
                key={dim}
                type="monotone"
                dataKey={`dimensions.${dim}`}
                name={dim}
                stroke={LIFE_DIMENSION_LABELS[dim].color}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* OHLCV K线 */}
      <div>
        <h4 className="text-sm font-medium text-text-primary mb-2">综合生命资本K线（OHLCV）</h4>
        <ResponsiveContainer width="100%" height={height * 0.45}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as MonthlyKlineBar;
                return (
                  <div className="bg-surface-container border border-border rounded-lg p-3 text-xs space-y-1">
                    <div className="font-medium">{d.monthLabel}</div>
                    <div>开 {d.open} 收 {d.close}</div>
                    <div>高 {d.high} 低 {d.low}</div>
                    <div className="text-text-secondary">行动量 {d.volume} 波动 {d.volatility}</div>
                    {d.eventSummary && <div className="text-primary/80">{d.eventSummary}</div>}
                  </div>
                );
              }}
            />
            {/* Volume bar */}
            <Bar dataKey="volume" fill="var(--primary)" opacity={0.15} yAxisId="volume" />
            <YAxis yAxisId="volume" orientation="right" tick={{ fontSize: 9 }} domain={[0, 100]} />
            {/* Candlestick via custom shape */}
            <Bar
              dataKey="candlestick"
              shape={(props: any) => {
                const { x, y, width, payload, index } = props;
                const yScale = (v: number) => {
                  const chartHeight = height * 0.45 - 30;
                  return y + chartHeight - (v / 100) * chartHeight;
                };
                return (
                  <CandlestickBar
                    {...payload}
                    x={x} y={y} width={width} height={0}
                    open={payload?.open ?? 50}
                    close={payload?.close ?? 50}
                    high={payload?.high ?? 50}
                    low={payload?.low ?? 50}
                    payload={payload}
                    index={index}
                  />
                );
              }}
            />
            <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="5 5" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-2 mt-4">
        {showDimensions.map((dim) => (
          <div key={dim} className="flex items-center gap-1 text-xs text-text-secondary">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: LIFE_DIMENSION_LABELS[dim].color }} />
            {LIFE_DIMENSION_LABELS[dim].zh}
          </div>
        ))}
      </div>
    </div>
  );
}