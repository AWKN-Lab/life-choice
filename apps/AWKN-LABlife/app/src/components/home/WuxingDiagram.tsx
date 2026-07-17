import { useState } from 'react';
import { polarToCartesian } from '@/lib/svg-utils';

const WUXING = [
  { name: '金', color: '#e8e8e8', angle: 270, desc: '收敛、肃杀、决断' },
  { name: '木', color: '#4a9b5e', angle: 342, desc: '生长、条达、舒畅' },
  { name: '水', color: '#5b8db8', angle: 54, desc: '润下、寒凉、闭藏' },
  { name: '火', color: '#c0392b', angle: 126, desc: '炎上、温热、升腾' },
  { name: '土', color: '#d4a843', angle: 198, desc: '承载、生化、受纳' },
];

// 生克关系：生 = 滋养，克 = 制约
const SHENG = [
  [0, 3], // 金生水
  [1, 0], // 木生火
  [2, 1], // 水生木
  [3, 4], // 火生土
  [4, 2], // 土生金
];

const KE = [
  [0, 1], // 金克木
  [1, 4], // 木克土
  [2, 0], // 水克火
  [3, 2], // 火克金
  [4, 3], // 土克水
];


export default function WuxingDiagram() {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;

  const nodes = WUXING.map((w, i) => {
    const pos = polarToCartesian(cx, cy, r, w.angle);
    return { ...w, ...pos, index: i };
  });

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 20px rgba(218,207,152,0.1))' }}
      >
        <defs>
          {/* 发光滤镜 */}
          <filter id="wuxing-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* 流动渐变 */}
          <linearGradient id="sheng-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,234,178,0.6)" />
            <stop offset="100%" stopColor="rgba(0,234,178,0.1)" />
          </linearGradient>
          <linearGradient id="ke-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,100,100,0.5)" />
            <stop offset="100%" stopColor="rgba(255,100,100,0.05)" />
          </linearGradient>
        </defs>

        {/* 外围虚线圆环 */}
        <circle
          cx={cx} cy={cy} r={r + 35}
          fill="none"
          stroke="hsl(var(--outline))"
          strokeWidth="1"
          strokeDasharray="4 6"
          opacity="0.3"
          className="animate-[spin_60s_linear_infinite]"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* 天干地支标记（简化） */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = i * 30 - 90;
          const pos = polarToCartesian(cx, cy, r + 35, angle);
          const ganZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][i];
          return (
            <text
              key={i}
              x={pos.x} y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="hsl(var(--outline))"
              fontSize="10"
              opacity="0.5"
            >
              {ganZhi}
            </text>
          );
        })}

        {/* 生关系连线（绿色，虚线） */}
        {SHENG.map(([from, to], i) => {
          const a = nodes[from];
          const b = nodes[to];
          const isActive = hovered === null || hovered === from || hovered === to;
          return (
            <line
              key={`sheng-${i}`}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="url(#sheng-gradient)"
              strokeWidth={isActive ? 2 : 0.5}
              strokeDasharray="6 4"
              opacity={isActive ? 0.8 : 0.15}
              className={isActive ? 'animate-[flow-line_2s_linear_infinite]' : ''}
            />
          );
        })}

        {/* 克关系连线（红色，实线） */}
        {KE.map(([from, to], i) => {
          const a = nodes[from];
          const b = nodes[to];
          const isActive = hovered === null || hovered === from || hovered === to;
          return (
            <line
              key={`ke-${i}`}
              x1={a.x} y1={a.y}
              x2={b.x} y2={b.y}
              stroke="url(#ke-gradient)"
              strokeWidth={isActive ? 2 : 0.5}
              opacity={isActive ? 0.7 : 0.1}
            />
          );
        })}

        {/* 五行节点 */}
        {nodes.map((node, i) => {
          const isHovered = hovered === i;
          const isDimmed = hovered !== null && hovered !== i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
              style={{
                transformOrigin: `${node.x}px ${node.y}px`,
                animation: `wuxing-breathe 3s ease-in-out ${i * 0.6}s infinite`,
              }}
            >
              {/* 外圈光晕 */}
              <circle
                cx={node.x} cy={node.y}
                r={isHovered ? 32 : 24}
                fill={node.color}
                opacity={isDimmed ? 0.2 : isHovered ? 0.15 : 0.1}
                filter="url(#wuxing-glow)"
                className="transition-all duration-300"
              />
              {/* 主圆 */}
              <circle
                cx={node.x} cy={node.y}
                r={22}
                fill={node.color}
                opacity={isDimmed ? 0.3 : 0.85}
                stroke={isHovered ? 'hsl(var(--primary))' : 'none'}
                strokeWidth={isHovered ? 2 : 0}
                className="transition-all duration-300"
              />
              {/* 文字 */}
              <text
                x={node.x} y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#0a0e14"
                fontSize="14"
                fontWeight="bold"
                opacity={isDimmed ? 0.3 : 1}
              >
                {node.name}
              </text>
            </g>
          );
        })}

        {/* 中心太极简化 */}
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'bagua-rotate 20s linear infinite' }}>
          <circle cx={cx} cy={cy} r={18} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4" />
          <path
            d={`M ${cx} ${cy - 18} A 9 9 0 0 1 ${cx} ${cy} A 9 9 0 0 0 ${cx} ${cy + 18} A 18 18 0 0 1 ${cx} ${cy - 18} Z`}
            fill="hsl(var(--on-surface))"
            opacity="0.6"
          />
          <path
            d={`M ${cx} ${cy + 18} A 9 9 0 0 1 ${cx} ${cy} A 9 9 0 0 0 ${cx} ${cy - 18} A 18 18 0 0 1 ${cx} ${cy + 18} Z`}
            fill="hsl(var(--surface-base))"
            opacity="0.8"
          />
          <circle cx={cx} cy={cy - 9} r={3} fill="hsl(var(--surface-base))" />
          <circle cx={cx} cy={cy + 9} r={3} fill="hsl(var(--on-surface))" />
        </g>
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant whitespace-nowrap z-10">
          {WUXING[hovered].name}：{WUXING[hovered].desc}
        </div>
      )}
    </div>
  );
}
