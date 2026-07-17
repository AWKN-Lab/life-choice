/**
 * KlineTrendChart — V2 趋势图（折线 + 面积渐变 + 节点 markPoint）
 *
 * 替代 KlineChart（OHLCV 蜡烛图）。V2 不再有 open/high/low/close，
 * 只有 score 0-100 的折线，节点用 markPoint 标注。
 *
 * Props:
 *   overall      — 主线数据（综合分 0-100）
 *   domains?     — 事业/财富/情感三条副线（权益控制）
 *   colors?      — 自定义颜色
 *   nodes?       — 节点标记数组
 *   height?      — 图表高度（默认 320）
 *   onMonthClick? — 月份点击回调
 */

import { useRef, useEffect } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { KlinePoint, KlineNode } from '@/types/kline-v2';
import { NODE_TYPE_LABELS } from '@/types/kline-v2';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

// ============================================================
// 节点标记类型
// ============================================================

export interface KlineTrendNode {
  monthLabel: string;
  nodeType: KlineNode['nodeType'];
  score: number;
  summary?: string;
}

// ============================================================
// 副线配置
// ============================================================

export interface DomainSeries {
  career?: KlinePoint[];
  wealth?: KlinePoint[];
  relationship?: KlinePoint[];
}

export interface KlineTrendChartProps {
  overall: KlinePoint[];
  domains?: DomainSeries;
  colors?: {
    overall?: string;
    career?: string;
    wealth?: string;
    relationship?: string;
  };
  nodes?: KlineTrendNode[];
  height?: number;
  onMonthClick?: (monthLabel: string) => void;
}

// 节点类型对应的 markPoint symbol
const NODE_SYMBOLS: Record<KlineNode['nodeType'], string> = {
  opportunity: 'circle',
  risk: 'diamond',
  turn: 'triangle',
};

const NODE_COLORS: Record<KlineNode['nodeType'], string> = {
  opportunity: '#10b981', // emerald-500
  risk: '#f43f5e',         // rose-500
  turn: '#f59e0b',          // amber-500
};

// ============================================================
// 组件
// ============================================================

export function KlineTrendChart({
  overall,
  domains,
  colors,
  nodes = [],
  height = 320,
  onMonthClick,
}: KlineTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, 'dark' as never);
    }
    const chart = chartRef.current;

    // X 轴：月份标签
    const categories = overall.map((p) => p.monthLabel);

    // 主线数据 + markPoint 数据
    const overallColor = colors?.overall ?? '#e0c97a';
    const overallData = overall.map((p) => p.value);

    // 构造 markPoint 数据：按 monthLabel 索引到 X 轴位置
    const monthIndexMap = new Map<string, number>();
    categories.forEach((m, i) => monthIndexMap.set(m, i));

    const markPointData = nodes
      .map((n) => {
        const idx = monthIndexMap.get(n.monthLabel);
        if (idx == null) return null;
        return {
          name: NODE_TYPE_LABELS[n.nodeType],
          coord: [idx, n.score],
          nodeType: n.nodeType,
          summary: n.summary,
          // ECharts markPoint 单点 symbol 必须设在数据项上
          symbol: NODE_SYMBOLS[n.nodeType],
          symbolSize: 14,
          itemStyle: {
            color: NODE_COLORS[n.nodeType],
            borderColor: '#fff',
            borderWidth: 1.5,
          },
          label: {
            show: false,
          },
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    // 副线 series
    const domainEntries: Array<{ name: string; data: (number | null)[]; color: string }> = [];
    if (domains?.career) {
      domainEntries.push({
        name: '事业',
        data: categories.map((m) => {
          const p = domains.career!.find((x) => x.monthLabel === m);
          return p ? p.value : null;
        }),
        color: colors?.career ?? '#22c55e',
      });
    }
    if (domains?.wealth) {
      domainEntries.push({
        name: '财富',
        data: categories.map((m) => {
          const p = domains.wealth!.find((x) => x.monthLabel === m);
          return p ? p.value : null;
        }),
        color: colors?.wealth ?? '#3b82f6',
      });
    }
    if (domains?.relationship) {
      domainEntries.push({
        name: '情感',
        data: categories.map((m) => {
          const p = domains.relationship!.find((x) => x.monthLabel === m);
          return p ? p.value : null;
        }),
        color: colors?.relationship ?? '#ec4899',
      });
    }

    const fontSize = 10;
    const left = 40;
    const right = 16;

    const option: echarts.EChartsCoreOption = {
      backgroundColor: 'transparent',
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', label: { show: false } },
        backgroundColor: 'rgba(15,15,26,0.96)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { fontSize },
        formatter: (params: unknown) => {
          const list = params as Array<{
            seriesName: string;
            data: number | { value: number };
            color: string;
            dataIndex?: number;
          }>;
          if (!Array.isArray(list) || list.length === 0) return '';
          const idx = list[0].dataIndex ?? 0;
          const month = categories[idx];
          if (!month) return '';

          let html = `<div style="font-weight:700;margin-bottom:4px;font-size:${fontSize + 1}px;color:#fff">${month}</div>`;
          for (const item of list) {
            const v = typeof item.data === 'number' ? item.data : (item.data as { value: number }).value;
            if (v == null) continue;
            html += `<div style="font-size:${fontSize}px;color:#aaa"><span style="color:${item.color}">●</span> ${item.seriesName}: <b style="color:#fff">${v.toFixed(1)}</b></div>`;
          }

          // 检查该月份是否有节点
          const monthNodes = nodes.filter((n) => n.monthLabel === month);
          if (monthNodes.length > 0) {
            html += `<div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:4px;padding-top:4px">`;
            for (const n of monthNodes) {
              const label = NODE_TYPE_LABELS[n.nodeType];
              const color = NODE_COLORS[n.nodeType];
              html += `<div style="font-size:${fontSize}px;color:#aaa"><span style="color:${color}">●</span> ${label}: <b style="color:#fff">${n.score.toFixed(0)}</b>${n.summary ? ` — ${n.summary}` : ''}</div>`;
            }
            html += `</div>`;
          }

          return html;
        },
      },
      legend: {
        data: ['综合', ...domainEntries.map((d) => d.name)],
        top: 4,
        left: 'center',
        itemGap: 10,
        textStyle: { color: '#999', fontSize: 10 },
        selectedMode: true,
      },
      grid: { left, right, top: 32, bottom: 36, containLabel: false },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: categories,
        axisLabel: {
          color: '#666',
          fontSize: 9,
          hideOverlap: true,
          interval: Math.max(0, Math.floor(categories.length / 6)),
        },
        axisLine: { lineStyle: { color: '#333' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitNumber: 4,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
        axisLabel: { color: '#777', fontSize: 9 },
      },
      dataZoom: [
        {
          type: 'inside',
          start: categories.length > 24 ? Math.max(0, 100 - (24 / categories.length) * 100) : 0,
          end: 100,
        },
      ],
      series: [
        {
          name: '综合',
          type: 'line',
          data: overallData,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2.4, color: overallColor },
          itemStyle: { color: overallColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: overallColor + '55' },
              { offset: 1, color: overallColor + '08' },
            ]),
          },
          emphasis: { focus: 'series' },
          markPoint: {
            data: markPointData,
          },
        },
        ...domainEntries.map((d) => ({
          name: d.name,
          type: 'line' as const,
          data: d.data,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.6, color: d.color },
          itemStyle: { color: d.color },
          emphasis: { focus: 'series' as const },
        })),
      ],
    };

    chart.setOption(option, true);

    if (onMonthClick) {
      const handler = (params: { componentType?: string; dataIndex?: number }) => {
        if (params.componentType !== 'series') return;
        if (params.dataIndex == null) return;
        const m = categories[params.dataIndex];
        if (m) onMonthClick(m);
      };
      chart.on('click', handler);
      return () => {
        chart.off('click', handler);
      };
    }
  }, [overall, domains, colors, nodes, onMonthClick]);

  // resize 观察
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height }}
    />
  );
}

export default KlineTrendChart;
