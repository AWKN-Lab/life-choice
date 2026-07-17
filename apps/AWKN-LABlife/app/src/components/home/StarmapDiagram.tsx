import { useState, useMemo } from 'react';
import { polarToCartesian } from '@/lib/svg-utils';

interface Star {
  name: string;
  r: number;
  angle: number;
  size: number;
  color: string;
  type: 'ziwei' | 'lucky' | 'unlucky' | 'aux';
  connections: number[];
}

const STARS: Star[] = [
  // 紫微垣（中心区域）
  { name: '紫微', r: 0, angle: 0, size: 8, color: '#dacf98', type: 'ziwei', connections: [1, 2, 3] },
  { name: '天机', r: 35, angle: 45, size: 5, color: '#7ec8e3', type: 'lucky', connections: [0, 4] },
  { name: '太阳', r: 35, angle: 135, size: 6, color: '#f0d78c', type: 'lucky', connections: [0, 5] },
  { name: '武曲', r: 35, angle: 225, size: 5, color: '#c0c0c0', type: 'lucky', connections: [0, 6] },
  { name: '天同', r: 35, angle: 315, size: 5, color: '#a8d5ba', type: 'lucky', connections: [1, 7] },
  // 太微垣（中层）
  { name: '廉贞', r: 70, angle: 30, size: 4, color: '#e8a87c', type: 'unlucky', connections: [2, 8] },
  { name: '天府', r: 70, angle: 90, size: 5, color: '#d4a843', type: 'lucky', connections: [3, 9] },
  { name: '太阴', r: 70, angle: 150, size: 5, color: '#b8c5d6', type: 'lucky', connections: [4, 10] },
  { name: '贪狼', r: 70, angle: 210, size: 4, color: '#c0392b', type: 'unlucky', connections: [5, 11] },
  { name: '巨门', r: 70, angle: 270, size: 4, color: '#8b7355', type: 'unlucky', connections: [6, 12] },
  { name: '天相', r: 70, angle: 330, size: 4, color: '#7ec8e3', type: 'aux', connections: [7, 13] },
  // 天市垣（外层）
  { name: '七杀', r: 110, angle: 20, size: 4, color: '#c0392b', type: 'unlucky', connections: [8] },
  { name: '破军', r: 110, angle: 60, size: 4, color: '#c0392b', type: 'unlucky', connections: [9] },
  { name: '文昌', r: 110, angle: 100, size: 3, color: '#f0d78c', type: 'lucky', connections: [10] },
  { name: '文曲', r: 110, angle: 140, size: 3, color: '#f0d78c', type: 'lucky', connections: [11] },
  { name: '左辅', r: 110, angle: 180, size: 3, color: '#a8d5ba', type: 'aux', connections: [12] },
  { name: '右弼', r: 110, angle: 220, size: 3, color: '#a8d5ba', type: 'aux', connections: [13] },
  { name: '天魁', r: 110, angle: 260, size: 3, color: '#7ec8e3', type: 'lucky', connections: [8] },
  { name: '天钺', r: 110, angle: 300, size: 3, color: '#7ec8e3', type: 'lucky', connections: [9] },
  { name: '禄存', r: 110, angle: 340, size: 3, color: '#d4a843', type: 'lucky', connections: [10] },
];

// 生成随机闪烁的辅星
function generateAuxStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 360;
    const r = 20 + Math.random() * 120;
    stars.push({
      name: '',
      r,
      angle,
      size: 1.5 + Math.random() * 2,
      color: '#99907c',
      type: 'aux',
      connections: [],
    });
  }
  return stars;
}


export default function StarmapDiagram() {
  const [hovered, setHovered] = useState<number | null>(null);
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;

  const allStars = useMemo(() => {
    const aux = generateAuxStars(30);
    return [...STARS, ...aux];
  }, []);

  const starPositions = allStars.map((star, i) => {
    const pos = polarToCartesian(cx, cy, star.r, star.angle);
    return { ...star, ...pos, index: i };
  });

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 20px rgba(218,207,152,0.1))' }}
      >
        <defs>
          <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* 紫微星特殊发光 */}
          <radialGradient id="ziwei-glow">
            <stop offset="0%" stopColor="#dacf98" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#dacf98" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#dacf98" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 三层同心圆轨道 */}
        {[35, 70, 110].map((r, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="hsl(var(--outline))"
            strokeWidth="0.5"
            opacity="0.15"
            strokeDasharray={i === 2 ? '3 5' : '1 3'}
          />
        ))}

        {/* 星曜连线 */}
        {STARS.map((star, i) => {
          if (i >= starPositions.length) return null;
          const a = starPositions[i];
          return star.connections.map((targetIdx) => {
            if (targetIdx >= starPositions.length) return null;
            const b = starPositions[targetIdx];
            const isActive = hovered === null || hovered === i || hovered === targetIdx;
            return (
              <line
                key={`${i}-${targetIdx}`}
                x1={a.x} y1={a.y}
                x2={b.x} y2={b.y}
                stroke={isActive ? 'hsl(var(--primary))' : 'hsl(var(--outline))'}
                strokeWidth={isActive ? 1 : 0.3}
                opacity={isActive ? 0.4 : 0.08}
                className={isActive ? 'animate-[flow-line_3s_linear_infinite]' : ''}
              />
            );
          });
        })}

        {/* 星点 */}
        {starPositions.map((star, i) => {
          const isMain = i < STARS.length;
          const isHovered = hovered === i;
          const isDimmed = hovered !== null && hovered !== i && isMain;

          return (
            <g
              key={i}
              onMouseEnter={() => isMain && setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={isMain ? 'cursor-pointer' : ''}
            >
              {/* 主星光晕 */}
              {isMain && (
                <circle
                  cx={star.x} cy={star.y}
                  r={star.size * 3}
                  fill={star.type === 'ziwei' ? 'url(#ziwei-glow)' : star.color}
                  opacity={isDimmed ? 0.1 : isHovered ? 0.3 : 0.15}
                  filter="url(#star-glow)"
                  className="transition-opacity duration-300"
                />
              )}
              {/* 星点本体 */}
              <circle
                cx={star.x} cy={star.y}
                r={isHovered ? star.size * 1.3 : star.size}
                fill={star.color}
                opacity={isDimmed ? 0.3 : isMain ? 0.9 : 0.5}
                stroke={isHovered ? 'hsl(var(--primary))' : 'none'}
                strokeWidth={isHovered ? 1.5 : 0}
                className="transition-all duration-300"
              />
              {/* 主星名称 */}
              {isMain && (
                <text
                  x={star.x}
                  y={star.y + star.size + 12}
                  textAnchor="middle"
                  fill={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--on-surface-variant))'}
                  fontSize={star.type === 'ziwei' ? '12' : '10'}
                  fontWeight={star.type === 'ziwei' ? 'bold' : 'normal'}
                  opacity={isDimmed ? 0.3 : 0.7}
                  className="transition-colors duration-300"
                >
                  {star.name}
                </text>
              )}
            </g>
          );
        })}

        {/* 中心紫微星特殊标记 */}
        <g>
          <circle
            cx={cx} cy={cy}
            r={15}
            fill="none"
            stroke="#dacf98"
            strokeWidth="1"
            opacity="0.3"
            className="animate-[wuxing-breathe_3s_ease-in-out_infinite]"
          />
          <text
            x={cx} y={cy - 20}
            textAnchor="middle"
            fill="#dacf98"
            fontSize="11"
            fontWeight="bold"
            opacity="0.8"
          >
            紫微星
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {hovered !== null && hovered < STARS.length && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant whitespace-nowrap z-10">
          <span className="text-primary font-medium">{STARS[hovered].name}</span>
          <span className="mx-1">·</span>
          <span>
            {STARS[hovered].type === 'ziwei' ? '帝星' :
             STARS[hovered].type === 'lucky' ? '吉星' :
             STARS[hovered].type === 'unlucky' ? '煞星' : '辅星'}
          </span>
        </div>
      )}
    </div>
  );
}
