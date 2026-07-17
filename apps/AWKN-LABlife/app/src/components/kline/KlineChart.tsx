/**
 * KlineChart — 人生K线（股市风格但保留业务语义）
 *
 * 设计原则：
 *   - 主图：蜡烛图（综合生命资本分 OHLC）— 纯K线，无均线干扰
 *   - 副图：7条人生维度线（7线7色，按"时·位·心"分组标签）
 *   - 周期：月（原生）/ 年（真实聚合），不伪造日/周数据
 *   - S2：砍掉 MA3/MA11/MA30/MA100 — 股市均线指标对人生月度数据无业务含义
 *   - 无 VOL / MACD：人生数据不是高频交易数据，成交量/动量指标无业务含义
 *
 * Props:
 *   bars: MonthlyKlineBar[]
 *   onMonthClick?: (monthKey) => void
 *   className?: string
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import * as echarts from 'echarts/core';
import { CandlestickChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { MonthlyKlineBar, LifeDimension, TideFactorKey } from '../../types/lifekline';
import { LIFE_DIMENSIONS, LIFE_DIMENSION_LABELS, TIDE_FACTOR_LABELS } from '../../types/lifekline';

// 时·位·心 分组（仅用于图例分组展示，颜色统一用 LIFE_DIMENSION_LABELS 7色规范）
// S1 视觉止血：恢复 7线7色，同组不用同色，避免 3 条线重叠不可辨
const DIM_GROUP: Record<string, { group: string; label: string }> = {
  career:       { group: 'position', label: '事业' },
  wealth:       { group: 'position', label: '财富' },
  growth:       { group: 'position', label: '成长' },
  freedom:      { group: 'time',     label: '自由' },
  buffer:       { group: 'time',     label: '缓冲' },
  health:       { group: 'mind',     label: '健康' },
  relationship: { group: 'mind',     label: '关系' },
};

const UP_COLOR = '#ef4444';    // 红涨
const DOWN_COLOR = '#22c55e';  // 绿跌

type Period = 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  month: '月',
  year: '年',
};

interface AggregatedBar {
  key: string;
  label: string;
  year: number;
  month?: number;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
  compositeScore: number;
  dimensions: Record<string, number>;
  factorScores?: MonthlyKlineBar['factorScores'];
  opportunityScore?: number;
  riskScore?: number;
  signalLabel?: string;
}

type EvidenceMode = 'factors' | 'dimensions';

function aggregateByYear(bars: MonthlyKlineBar[]): AggregatedBar[] {
  const groups = new Map<number, MonthlyKlineBar[]>();
  for (const b of bars) {
    const list = groups.get(b.year) ?? [];
    list.push(b);
    groups.set(b.year, list);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, list]) => ({
      key: `${year}`,
      label: `${year}`,
      year,
      open: list[0].open,
      close: list[list.length - 1].close,
      low: Math.min(...list.map((b) => b.low)),
      high: Math.max(...list.map((b) => b.high)),
      volume: list.reduce((s, b) => s + (b.volume ?? 0), 0),
      compositeScore: Math.round(list.reduce((s, b) => s + (b.compositeScore ?? 0), 0) / list.length),
      dimensions: Object.fromEntries(
        LIFE_DIMENSIONS.map((dim) => [
          dim,
          Math.round(list.reduce((s, b) => s + (b.dimensions?.[dim] ?? 50), 0) / list.length),
        ])
      ),
      factorScores: {
        trend: Math.round(list.reduce((s, b) => s + (b.factorScores?.trend ?? 50), 0) / list.length),
        pressure: Math.round(list.reduce((s, b) => s + (b.factorScores?.pressure ?? 50), 0) / list.length),
        liquidity: Math.round(list.reduce((s, b) => s + (b.factorScores?.liquidity ?? 50), 0) / list.length),
        stability: Math.round(list.reduce((s, b) => s + (b.factorScores?.stability ?? 50), 0) / list.length),
      },
      opportunityScore: Math.round(list.reduce((s, b) => s + (b.opportunityScore ?? 50), 0) / list.length),
      riskScore: Math.round(list.reduce((s, b) => s + (b.riskScore ?? 50), 0) / list.length),
      signalLabel: list[list.length - 1].signalLabel,
    }));
}

function buildData(bars: MonthlyKlineBar[], period: Period): AggregatedBar[] {
  if (period === 'year') return aggregateByYear(bars);
  return bars.map((b) => ({
    key: b.monthLabel || `${b.year}-${String(b.month).padStart(2, '0')}`,
    label: b.monthLabel || `${b.year}-${String(b.month).padStart(2, '0')}`,
    year: b.year,
    month: b.month,
    open: b.open,
    close: b.close,
    low: b.low,
    high: b.high,
    volume: b.volume ?? 0,
    compositeScore: b.compositeScore ?? 0,
    dimensions: b.dimensions ?? {},
    factorScores: b.factorScores,
    opportunityScore: b.opportunityScore,
    riskScore: b.riskScore,
    signalLabel: b.signalLabel,
  }));
}

echarts.use([
  CandlestickChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export interface KlineChartProps {
  bars: MonthlyKlineBar[];
  onMonthClick?: (monthKey: string) => void;
  onDimensionClick?: (dimension: LifeDimension) => void;
  activeDimension?: LifeDimension | null;
  className?: string;
}

export function KlineChart({ bars, onMonthClick, onDimensionClick, activeDimension, className }: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>('factors');
  const [isNarrow, setIsNarrow] = useState(false);

  const data = useMemo(() => buildData(bars, period), [bars, period]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setIsNarrow(entries[0].contentRect.width < 640);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleClick = useCallback(
    (params: { dataIndex?: number; seriesName?: string }) => {
      // 维度线点击 → 触发 onDimensionClick
      if (params.seriesName && onDimensionClick) {
        for (const dim of LIFE_DIMENSIONS) {
          const info = DIM_GROUP[dim] ?? { group: 'position', label: dim };
          const name = `${info.group === 'time' ? '时' : info.group === 'position' ? '位' : '心'}·${info.label}`;
          if (params.seriesName === name) {
            onDimensionClick(dim);
            return;
          }
        }
      }
      // K线点击 → 触发 onMonthClick
      if (params.dataIndex != null && data[params.dataIndex]) {
        onMonthClick?.(data[params.dataIndex].key);
      }
    },
    [data, onMonthClick, onDimensionClick],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, 'dark' as any);
    }
    const chart = chartRef.current;

    const categories = data.map((d) => d.label);
    const candleData = data.map((d) => [d.open, d.close, d.low, d.high]);

    const dimensionSeries = LIFE_DIMENSIONS.map((dim) => {
      const info = DIM_GROUP[dim] ?? { group: 'position', label: dim };
      const color = LIFE_DIMENSION_LABELS[dim].color;
      const isActive = activeDimension === dim;
      const isDimmed = activeDimension && !isActive;
      return {
        name: `${info.group === 'time' ? '时' : info.group === 'position' ? '位' : '心'}·${info.label}`,
        type: 'line' as const,
        data: data.map((d) => d.dimensions?.[dim] ?? null),
        smooth: true,
        symbol: isActive ? 'circle' : 'none',
        symbolSize: isActive ? 6 : 0,
        lineStyle: {
          width: isActive ? 2.5 : 1.5,
          color,
          opacity: isDimmed ? 0.2 : 1,
        },
        itemStyle: { color },
        emphasis: { focus: 'series' as const, lineStyle: { width: 2.5 } },
        xAxisIndex: 1,
        yAxisIndex: 1,
      };
    });

    const factorKeys = Object.keys(TIDE_FACTOR_LABELS) as TideFactorKey[];
    const factorSeries = factorKeys.map((key) => ({
      name: `因子·${TIDE_FACTOR_LABELS[key].zh}`,
      type: 'line' as const,
      data: data.map((d) => d.factorScores?.[key] ?? 50),
      smooth: true,
      symbol: 'none',
      lineStyle: {
        width: key === 'pressure' ? 1.5 : 2.2,
        type: key === 'pressure' ? 'dashed' : 'solid',
        color: TIDE_FACTOR_LABELS[key].color,
        opacity: 0.95,
      },
      itemStyle: { color: TIDE_FACTOR_LABELS[key].color },
      emphasis: { focus: 'series' as const },
      xAxisIndex: 1,
      yAxisIndex: 1,
    }));

    const lowerSeries = evidenceMode === 'factors' ? factorSeries : dimensionSeries;
    const legendItems = evidenceMode === 'factors'
      ? ['K线', ...factorKeys.map((key) => `因子·${TIDE_FACTOR_LABELS[key].zh}`)]
      : ['K线', ...LIFE_DIMENSIONS.map((d) => {
          const info = DIM_GROUP[d];
          return `${info?.group === 'time' ? '时' : info?.group === 'position' ? '位' : '心'}·${info?.label ?? d}`;
        })];

    const left = isNarrow ? 40 : 56;
    const right = isNarrow ? 8 : 20;
    const fontSize = isNarrow ? 9 : 10;

    const option: echarts.EChartsCoreOption = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { show: false } },
        backgroundColor: 'rgba(15,15,26,0.96)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { fontSize },
        formatter: (params: unknown) => {
          const list = params as Array<{ seriesName: string; data: number | number[] | { value: number }; color: string; dataIndex?: number }>;
          if (!Array.isArray(list) || list.length === 0) return '';
          const idx = list[0].dataIndex ?? 0;
          const bar = data[idx];
          if (!bar) return '';

          const up = bar.close >= bar.open;
          let html = `<div style="font-weight:700;margin-bottom:4px;font-size:${fontSize + 1}px;color:${up ? UP_COLOR : DOWN_COLOR}">${bar.label}</div>`;
          html += `<div style="font-size:${fontSize}px;color:#aaa">综合分: <b style="color:#fff">${bar.compositeScore}</b></div>`;
          html += `<div style="font-size:${fontSize}px;color:#aaa;margin-bottom:4px">开 <b>${bar.open}</b> 高 <b>${bar.high}</b> 低 <b>${bar.low}</b> 收 <b>${bar.close}</b></div>`;
          html += `<div style="font-size:${fontSize}px;color:#aaa;margin-bottom:4px">机会 <b>${bar.opportunityScore ?? '-'}</b> / 风险 <b>${bar.riskScore ?? '-'}</b> / 阶段 <b>${bar.signalLabel ?? '未定义'}</b></div>`;

          if (bar.factorScores) {
            html += `<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;margin-bottom:4px;display:grid;grid-template-columns:repeat(2,auto);gap:3px 10px">`;
            for (const key of factorKeys) {
              const factor = TIDE_FACTOR_LABELS[key];
              html += `<span style="font-size:${fontSize - 1}px;color:#bbb"><span style="color:${factor.color}">●</span> ${factor.zh}: <b style="color:#fff">${bar.factorScores[key]}</b></span>`;
            }
            html += `</div>`;
          }

          // 维度
          html += `<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:4px;display:grid;grid-template-columns:repeat(2,auto);gap:3px 10px">`;
          for (const dim of LIFE_DIMENSIONS) {
            const val = bar.dimensions?.[dim];
            const info = DIM_GROUP[dim];
            if (val != null && info) {
              const tag = info.group === 'time' ? '时' : info.group === 'position' ? '位' : '心';
              const color = LIFE_DIMENSION_LABELS[dim].color;
              html += `<span style="font-size:${fontSize - 1}px;color:#bbb"><span style="color:${color}">●</span> ${tag}·${info.label}: <b style="color:#fff">${val}</b></span>`;
            }
          }
          html += `</div>`;

          return html;
        },
      },
      legend: {
        data: legendItems,
        top: 34,
        left: 'center',
        itemGap: isNarrow ? 4 : 10,
        textStyle: { color: '#999', fontSize: isNarrow ? 8 : 10 },
        selectedMode: true,
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left, right, top: 72, height: isNarrow ? '46%' : '48%' },
        { left, right, top: isNarrow ? '62%' : '64%', height: isNarrow ? '28%' : '26%' },
      ],
      xAxis: [
        {
          type: 'category',
          data: categories,
          gridIndex: 0,
          axisLabel: {
            color: '#666',
            fontSize: isNarrow ? 8 : 9,
            hideOverlap: true,
            interval: Math.floor(data.length / (isNarrow ? 4 : 6)) || 0,
          },
          axisLine: { lineStyle: { color: '#333' } },
          axisTick: { show: false },
        },
        {
          type: 'category',
          data: categories,
          gridIndex: 1,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: '#333' } },
          axisTick: { show: false },
        },
      ],
      yAxis: [
        {
          scale: true,
          gridIndex: 0,
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
          axisLabel: { color: '#777', fontSize },
        },
        {
          gridIndex: 1,
          min: 0,
          max: 100,
          splitNumber: 2,
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
          axisLabel: { color: '#777', fontSize: isNarrow ? 8 : 9 },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: data.length > 24 ? Math.max(0, 100 - (24 / data.length) * 100) : 0,
          end: 100,
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          show: !isNarrow,
          bottom: 0,
          height: 14,
          borderColor: 'transparent',
          backgroundColor: 'rgba(255,255,255,0.03)',
          fillerColor: 'rgba(96,165,250,0.2)',
          handleStyle: { color: '#60a5fa' },
          textStyle: { color: '#777', fontSize: 9 },
        },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: candleData,
          xAxisIndex: 0,
          yAxisIndex: 0,
          itemStyle: { color: UP_COLOR, color0: DOWN_COLOR, borderColor: UP_COLOR, borderColor0: DOWN_COLOR },
        },
        ...lowerSeries,
      ],
    };

    chart.setOption(option, true);
    chart.on('click', 'series', handleClick);

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);

    return () => {
      chart.off('click', handleClick as any);
      ro.disconnect();
    };
  }, [data, handleClick, isNarrow, period, activeDimension, evidenceMode]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-1 left-0 right-0 z-10 flex justify-center gap-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              period === p
                ? 'bg-[#e0c97a] text-[#0f0f1a]'
                : 'bg-on-surface/[0.05] text-gray-400 hover:bg-on-surface/[0.08]'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <button
          onClick={() => setEvidenceMode((prev) => (prev === 'factors' ? 'dimensions' : 'factors'))}
          className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#1f2937]/85 text-[#cbd5e1] border border-white/10"
        >
          {evidenceMode === 'factors' ? '主因子' : '维度线'}
        </button>
      </div>
      <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', minHeight: 360 }} />
    </div>
  );
}

export default KlineChart;
