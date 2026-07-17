// 12维状态雷达图 + 相位空间散点图
// 基于 Recharts
// 总纲 V0.3 L3 图形层 / 潮汐路线 V0.2

import React, { useState, useMemo } from 'react';
import {
  Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, ScatterChart, Scatter, XAxis, YAxis,
  ZAxis, CartesianGrid, ReferenceLine, Legend, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { StateSnapshot, PhasePoint, StateDimension } from '../types/lifekline';
import {
  STATE_DIMENSIONS, STATE_DIMENSION_LABELS, QUADRANT_LABELS,
} from '../types/lifekline';
import { generateStateSnapshots, generatePhasePoints } from '../lib/lifeMetricsService';

// ==================== 12维状态雷达 ====================

interface StateRadarChartProps {
  snapshots?: StateSnapshot[];
  selectedMonth?: number; // 选第几个月（0-based）
  height?: number;
}

export function StateRadarChart({
  snapshots: externalSnapshots,
  selectedMonth: externalMonth,
  height = 360,
}: StateRadarChartProps) {
  const { t } = useTranslation();
  const snapshots = useMemo(() => externalSnapshots || generateStateSnapshots(2025, 1, 12), [externalSnapshots]);
  const [selectedMonth, setSelectedMonth] = useState(externalMonth ?? snapshots.length - 1);

  const current = snapshots[Math.min(selectedMonth, snapshots.length - 1)];
  if (!current) {
    return <div className="flex items-center justify-center h-64 text-text-secondary text-sm">暂无状态数据</div>;
  }

  const radarData = STATE_DIMENSIONS.map((dim) => ({
    dimension: STATE_DIMENSION_LABELS[dim].zh,
    value: current.values[dim],
    baseline: 50,
    color: STATE_DIMENSION_LABELS[dim].color,
  }));

  return (
    <div className="w-full">
      {/* Month selector */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {snapshots.map((s, i) => (
          <button
            key={s.date}
            onClick={() => setSelectedMonth(i)}
            className={`px-2 py-0.5 text-xs rounded border transition-colors ${
              i === selectedMonth
                ? 'bg-primary text-on-surface border-primary'
                : 'bg-surface-container text-text-secondary border-border'
            }`}
          >
            {s.date}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="text-xs text-text-secondary space-x-3">
          <span>容量: <b className="text-primary">{current.capacity}</b></span>
          <span>熵: <b className="text-accent">{current.entropy}</b></span>
          <span>象限: <b style={{ color: QUADRANT_LABELS[current.quadrant].color }}>
            {QUADRANT_LABELS[current.quadrant].zh}
          </b></span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="var(--border)" opacity={0.3} />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--surface-container)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          />
          {/* Baseline */}
          <Radar name="基准线" dataKey="baseline"
            stroke="var(--border)" fill="var(--border)" fillOpacity={0.05} strokeDasharray="3 3" />
          {/* Current */}
          <Radar name="当前状态" dataKey="value"
            stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
        </RechartsRadar>
      </ResponsiveContainer>

      <div className="mt-2 text-xs text-text-secondary text-center">
        {QUADRANT_LABELS[current.quadrant].desc}
      </div>
    </div>
  );
}

// ==================== 相位空间散点图 ====================

interface TidePhaseChartProps {
  snapshots?: StateSnapshot[];
  height?: number;
}

export function TidePhaseChart({
  snapshots: externalSnapshots,
  height = 360,
}: TidePhaseChartProps) {
  const { t } = useTranslation();
  const snapshots = useMemo(() => externalSnapshots || generateStateSnapshots(2025, 1, 12), [externalSnapshots]);
  const points = useMemo(() => generatePhasePoints(snapshots), [snapshots]);

  const quadrantData = useMemo(() => {
    const groups: Record<PhasePoint['quadrant'], PhasePoint[]> = {
      prosperous: [],
      exploration: [],
      recovery: [],
      risk: [],
    };
    for (const p of points) {
      groups[p.quadrant].push(p);
    }
    return (Object.entries(groups) as [PhasePoint['quadrant'], PhasePoint[]][])
      .filter(([_, pts]) => pts.length > 0)
      .map(([quadrant, pts]) => ({
        quadrant,
        data: pts.map((p) => ({ x: p.capacity, y: p.entropy, z: p.bubbleSize, label: p.label })),
        color: QUADRANT_LABELS[quadrant].color,
      }));
  }, [points]);

  return (
    <div className="w-full">
      {/* Quadrant legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {(Object.entries(QUADRANT_LABELS) as [PhasePoint['quadrant'], typeof QUADRANT_LABELS['prosperous']][]).map(
          ([key, info]) => (
            <div key={key} className="flex items-center gap-1 text-xs text-text-secondary">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: info.color }} />
              {info.zh}
            </div>
          ),
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="var(--border)" opacity={0.3} />
          <XAxis
            type="number" dataKey="x" name="容量"
            domain={[0, 100]} tick={{ fontSize: 10 }}
            label={{ value: '容量 →', position: 'insideBottom', offset: -5, fontSize: 11 }}
          />
          <YAxis
            type="number" dataKey="y" name="熵"
            domain={[0, 100]} tick={{ fontSize: 10 }}
            label={{ value: '熵 →', angle: -90, position: 'insideLeft', fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[30, 200]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload as { x: number; y: number; z: number; label: string };
              return (
                <div className="bg-surface-container border border-border rounded-lg p-2 text-xs space-y-1">
                  <div className="font-medium">{p.label}</div>
                  <div>容量 {p.x} / 熵 {p.y}</div>
                  <div>机会大小 {p.z}</div>
                </div>
              );
            }}
          />
          {/* Quadrant dividers */}
          <ReferenceLine x={50} stroke="var(--border)" strokeDasharray="5 5" opacity={0.4} />
          <ReferenceLine y={30} stroke="var(--border)" strokeDasharray="5 5" opacity={0.4} />

          {quadrantData.map(({ quadrant, data, color }) => (
            <Scatter key={quadrant} name={QUADRANT_LABELS[quadrant].zh} data={data} fill={color} />
          ))}

          <Legend
            wrapperStyle={{ fontSize: 11, marginTop: 8 }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}