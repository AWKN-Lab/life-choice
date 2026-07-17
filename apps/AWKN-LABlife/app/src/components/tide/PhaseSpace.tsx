import {
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { PhasePoint } from '../../types/lifekline';

export interface PhaseSpaceProps {
  points: PhasePoint[];
  onPointClick?: (point: PhasePoint) => void;
  className?: string;
}

const QUADRANTS: Record<string, { zh: string; color: string; desc: string }> = {
  prosperous: { zh: '顺势', color: '#22c55e', desc: '位高心稳时顺' },
  exploration: { zh: '破局', color: '#f59e0b', desc: '位高心乱时顺' },
  recovery: { zh: '蓄势', color: '#3b82f6', desc: '位低心稳时逆' },
  risk: { zh: '危局', color: '#ef4444', desc: '位低心乱时逆' },
};

interface ScatterDatum {
  id: string;
  x: number;
  y: number;
  z: number;
  time: number;
  label: string;
  quadrant: PhasePoint['quadrant'];
  raw: PhasePoint;
}

function getPointColor(time: number) {
  if (time >= 66) return '#22c55e';
  if (time >= 45) return '#f59e0b';
  return '#3b82f6';
}

export function PhaseSpace({ points, onPointClick, className }: PhaseSpaceProps) {
  const data: ScatterDatum[] = points.map((point) => ({
    id: point.id,
    x: point.x ?? point.capacity,
    y: point.y ?? point.entropy,
    z: point.bubbleSize ?? point.size ?? 50,
    time: point.timeGroup ?? 50,
    label: point.label,
    quadrant: point.quadrant,
    raw: point,
  }));

  return (
    <div className="w-full">
      <div className={className} style={{ width: '100%', minHeight: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 18, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[20, 100]}
              tick={{ fontSize: 10, fill: '#888' }}
              stroke="#333"
              label={{ value: '位 →', position: 'insideBottom', offset: -10, fill: '#22c55e', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[20, 100]}
              tick={{ fontSize: 10, fill: '#888' }}
              stroke="#333"
              label={{ value: '← 心', angle: -90, position: 'insideLeft', fill: '#a855f7', fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[40, 200]} />
            <Tooltip
              cursor={{ strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0].payload as ScatterDatum;
                const quadrant = QUADRANTS[item.quadrant];
                return (
                  <div className="rounded-lg border border-white/10 bg-[#0f0f1a]/95 p-2 text-xs text-gray-200">
                    <div className="font-semibold">{item.label}</div>
                    <div>位 {Math.round(item.x)} / 心 {Math.round(item.y)} / 时 {Math.round(item.time)}</div>
                    <div>象限: {quadrant?.zh} ({quadrant?.desc})</div>
                  </div>
                );
              }}
            />
            <ReferenceLine x={50} stroke="rgba(255,255,255,0.18)" strokeDasharray="5 5" />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.18)" strokeDasharray="5 5" />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              payload={Object.entries(QUADRANTS).map(([key, value]) => ({
                id: key,
                value: value.zh,
                type: 'square',
                color: value.color,
              }))}
            />
            <Scatter
              data={data}
              onClick={(entry) => {
                const point = entry as ScatterDatum | undefined;
                if (point?.raw) onPointClick?.(point.raw);
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={getPointColor(entry.time)} stroke="rgba(255,255,255,0.4)" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 px-2">
        {Object.entries(QUADRANTS).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: value.color }} />
            <span style={{ color: value.color }}>{value.zh}</span>
            <span>{value.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PhaseSpace;
