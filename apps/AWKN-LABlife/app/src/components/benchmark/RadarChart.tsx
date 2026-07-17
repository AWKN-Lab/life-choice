import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarChartProps {
  data: Record<string, { total: number; correct: number; accuracy: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  '意外': '#ef4444',
  '事业': '#3b82f6',
  '婚姻': '#f59e0b',
  '学业': '#10b981',
  '财运': '#8b5cf6',
  '家庭': '#ec4899',
  '性格': '#06b6d4',
  '健康': '#84cc16',
};

export function BenchmarkRadarChart({ data }: RadarChartProps) {
  const chartData = Object.entries(data).map(([key, val]) => ({
    category: key,
    accuracy: Math.round(val.accuracy * 100),
    total: val.total,
    correct: val.correct,
    fill: CATEGORY_COLORS[key] || '#6b7280',
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-sm">
        暂无数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsRadar data={chartData}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 13 }} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string) => {
            if (name === 'accuracy') return [`${value}%`, '准确率'];
            return [value, name];
          }}
        />
        <Radar
          name="accuracy"
          dataKey="accuracy"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}