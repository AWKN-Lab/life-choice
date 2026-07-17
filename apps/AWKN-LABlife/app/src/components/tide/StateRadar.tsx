import { useMemo } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { StateSnapshot } from '../../types/lifekline';
import { STATE_DIMENSION_LABELS } from '../../types/lifekline';

export interface StateRadarProps {
  current: StateSnapshot;
  baseline: Record<string, number>;
  className?: string;
}

const GROUP_COLORS = {
  time: '#3b82f6',
  position: '#22c55e',
  mind: '#a855f7',
} as const;

interface RadarGroup {
  key: 'time' | 'position' | 'mind';
  label: string;
  color: string;
  dims: string[];
  groupScore: number;
}

function MiniRadar({
  group,
  currentValues,
  baselineValues,
}: {
  group: RadarGroup;
  currentValues: number[];
  baselineValues: number[];
}) {
  const data = group.dims.map((dim, index) => ({
    dimension: STATE_DIMENSION_LABELS[dim as keyof typeof STATE_DIMENSION_LABELS]?.zh ?? dim,
    current: currentValues[index] ?? 50,
    baseline: baselineValues[index] ?? 50,
  }));

  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-1 text-sm font-semibold" style={{ color: group.color }}>
        {group.label}
      </div>
      <div className="w-full h-[220px] sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadar data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.10)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#b3b3b3', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#777', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15,15,26,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Radar
              name="基准"
              dataKey="baseline"
              stroke="#555"
              strokeDasharray="4 4"
              fill="#666"
              fillOpacity={0.04}
            />
            <Radar
              name="当前"
              dataKey="current"
              stroke={group.color}
              fill={group.color}
              fillOpacity={0.16}
            />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-xs text-gray-400">
        聚合分 <b style={{ color: group.color }}>{group.groupScore}</b>
      </div>
    </div>
  );
}

export function StateRadar({ current, baseline, className }: StateRadarProps) {
  const groups: RadarGroup[] = useMemo(() => [
    {
      key: 'time',
      label: '时',
      color: GROUP_COLORS.time,
      dims: ['liquidity', 'momentum', 'optionality'],
      groupScore:
        current.timeGroup ??
        Math.round(
          (['liquidity', 'momentum', 'optionality'] as const).reduce(
            (sum, dim) => sum + (current.values?.[dim] ?? 50),
            0,
          ) / 3,
        ),
    },
    {
      key: 'position',
      label: '位',
      color: GROUP_COLORS.position,
      dims: ['support', 'agency', 'order', 'growth', 'buffer'],
      groupScore:
        current.positionGroup ??
        Math.round(
          (['support', 'agency', 'order', 'growth', 'buffer'] as const).reduce(
            (sum, dim) => sum + (current.values?.[dim] ?? 50),
            0,
          ) / 5,
        ),
    },
    {
      key: 'mind',
      label: '心',
      color: GROUP_COLORS.mind,
      dims: ['energy', 'recovery', 'emotion', 'clarity'],
      groupScore:
        current.mindGroup ??
        Math.round(
          (['energy', 'recovery', 'emotion', 'clarity'] as const).reduce(
            (sum, dim) => sum + (current.values?.[dim] ?? 50),
            0,
          ) / 4,
        ),
    },
  ], [current]);

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
        {groups.map((group) => {
          const currentValues = group.dims.map((dim) => current.values?.[dim as keyof typeof current.values] ?? 50);
          const baselineValues = group.dims.map((dim) => baseline[dim] ?? 50);
          return (
            <div key={group.key} className="w-full border-b border-outline/5 pb-3 last:border-b-0 sm:border-b-0 sm:pb-0">
              <MiniRadar group={group} currentValues={currentValues} baselineValues={baselineValues} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6 pb-2 pt-2 text-xs">
        <span style={{ color: GROUP_COLORS.time }}>时 <b>{groups[0].groupScore}</b></span>
        <span style={{ color: GROUP_COLORS.position }}>位 <b>{groups[1].groupScore}</b></span>
        <span style={{ color: GROUP_COLORS.mind }}>心 <b>{groups[2].groupScore}</b></span>
      </div>
    </div>
  );
}

export default StateRadar;
