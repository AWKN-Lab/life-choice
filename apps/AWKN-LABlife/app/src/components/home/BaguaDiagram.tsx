import { useState } from 'react';
import { polarToCartesian } from '@/lib/svg-utils';

const BAGUA = [
  { symbol: '☰', name: '乾', nature: '天', pos: 0 },
  { symbol: '☱', name: '兑', nature: '泽', pos: 1 },
  { symbol: '☲', name: '离', nature: '火', pos: 2 },
  { symbol: '☳', name: '震', nature: '雷', pos: 3 },
  { symbol: '☴', name: '巽', nature: '风', pos: 4 },
  { symbol: '☵', name: '坎', nature: '水', pos: 5 },
  { symbol: '☶', name: '艮', nature: '山', pos: 6 },
  { symbol: '☷', name: '坤', nature: '地', pos: 7 },
];

// 洛书九宫格数字位置（从中心开始螺旋）
const LUOSHU = [
  { num: 4, x: -1, y: -1 }, { num: 9, x: 0, y: -1 }, { num: 2, x: 1, y: -1 },
  { num: 3, x: -1, y: 0 }, { num: 5, x: 0, y: 0 }, { num: 7, x: 1, y: 0 },
  { num: 8, x: -1, y: 1 }, { num: 1, x: 0, y: 1 }, { num: 6, x: 1, y: 1 },
];


export default function BaguaDiagram() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 0 20px rgba(218,207,152,0.1))' }}
      >
        <defs>
          <filter id="bagua-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* 太极渐变 */}
          <linearGradient id="taiji-yin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--on-surface))" />
            <stop offset="100%" stopColor="hsl(var(--on-surface-variant))" />
          </linearGradient>
          <linearGradient id="taiji-yang" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--surface-base))" />
            <stop offset="100%" stopColor="hsl(var(--surface-container))" />
          </linearGradient>
        </defs>

        {/* 外圈虚线（反向旋转） */}
        <circle
          cx={cx} cy={cy} r={160}
          fill="none"
          stroke="hsl(var(--outline))"
          strokeWidth="1"
          strokeDasharray="3 5"
          opacity="0.25"
          className={isPaused ? '' : 'animate-[spin_40s_linear_infinite_reverse]'}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* 八卦符号外圈 */}
        {BAGUA.map((gua, i) => {
          const angle = i * 45 - 90;
          const pos = polarToCartesian(cx, cy, 140, angle);
          const isHovered = hovered === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              {/* 背景圆 */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isHovered ? 28 : 22}
                fill="hsl(var(--surface-container))"
                stroke={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--outline-variant))'}
                strokeWidth={isHovered ? 2 : 1}
                opacity={isHovered ? 0.9 : 0.6}
                className="transition-all duration-300"
                style={{
                  animation: isPaused ? '' : `bagua-breathe 4s ease-in-out ${i * 0.5}s infinite`,
                }}
              />
              {/* 八卦符号 */}
              <text
                x={pos.x} y={pos.y - 4}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--on-surface-variant))'}
                fontSize="16"
                className="transition-colors duration-300"
              >
                {gua.symbol}
              </text>
              {/* 卦名 */}
              <text
                x={pos.x} y={pos.y + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isHovered ? 'hsl(var(--primary))' : 'hsl(var(--outline))'}
                fontSize="10"
                className="transition-colors duration-300"
              >
                {gua.name}
              </text>
            </g>
          );
        })}

        {/* 洛书九宫格 */}
        <g transform={`translate(${cx}, ${cy})`}>
          {/* 九宫格外框 */}
          <rect
            x={-60} y={-60}
            width={120} height={120}
            fill="none"
            stroke="hsl(var(--outline))"
            strokeWidth="1"
            opacity="0.3"
            rx="4"
          />
          {/* 九宫格线 */}
          <line x1={-20} y1={-60} x2={-20} y2={60} stroke="hsl(var(--outline))" strokeWidth="0.5" opacity="0.2" />
          <line x1={20} y1={-60} x2={20} y2={60} stroke="hsl(var(--outline))" strokeWidth="0.5" opacity="0.2" />
          <line x1={-60} y1={-20} x2={60} y2={-20} stroke="hsl(var(--outline))" strokeWidth="0.5" opacity="0.2" />
          <line x1={-60} y1={20} x2={60} y2={20} stroke="hsl(var(--outline))" strokeWidth="0.5" opacity="0.2" />
          {/* 数字 */}
          {LUOSHU.map((cell, i) => (
            <text
              key={i}
              x={cell.x * 40} y={cell.y * 40}
              textAnchor="middle"
              dominantBaseline="central"
              fill={cell.num === 5 ? 'hsl(var(--primary))' : 'hsl(var(--on-surface-variant))'}
              fontSize={cell.num === 5 ? '18' : '14'}
              fontWeight={cell.num === 5 ? 'bold' : 'normal'}
              opacity={cell.num === 5 ? 1 : 0.6}
              className={isPaused ? '' : 'animate-[luoshu-glow_2s_ease-in-out_infinite]'}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {cell.num}
            </text>
          ))}
        </g>

        {/* 中心太极（可点击暂停） */}
        <g
          onClick={() => setIsPaused(!isPaused)}
          className="cursor-pointer"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: isPaused ? '' : 'bagua-rotate 20s linear infinite',
          }}
        >
          {/* 太极外圈 */}
          <circle
            cx={cx} cy={cy}
            r={45}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            opacity="0.5"
            filter="url(#bagua-glow)"
          />
          {/* 阴鱼（白色/亮色） */}
          <path
            d={`M ${cx} ${cy - 45}
               A 22.5 22.5 0 0 1 ${cx} ${cy}
               A 22.5 22.5 0 0 0 ${cx} ${cy + 45}
               A 45 45 0 0 1 ${cx} ${cy - 45} Z`}
            fill="url(#taiji-yin)"
            opacity="0.9"
          />
          {/* 阳鱼（黑色/暗色） */}
          <path
            d={`M ${cx} ${cy + 45}
               A 22.5 22.5 0 0 1 ${cx} ${cy}
               A 22.5 22.5 0 0 0 ${cx} ${cy - 45}
               A 45 45 0 0 1 ${cx} ${cy + 45} Z`}
            fill="url(#taiji-yang)"
            opacity="0.95"
          />
          {/* 阴眼 */}
          <circle cx={cx} cy={cy - 22.5} r={7} fill="url(#taiji-yang)" />
          {/* 阳眼 */}
          <circle cx={cx} cy={cy + 22.5} r={7} fill="url(#taiji-yin)" />
        </g>

        {/* 点击提示 */}
        <text
          x={cx} y={cy + 65}
          textAnchor="middle"
          fill="hsl(var(--outline))"
          fontSize="9"
          opacity="0.4"
        >
          {isPaused ? '点击恢复旋转' : '点击暂停旋转'}
        </text>
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-2 px-3 py-2 rounded-lg bg-surface-container border border-outline/20 text-xs text-on-surface-variant whitespace-nowrap z-10">
          {BAGUA[hovered].name}卦（{BAGUA[hovered].nature}）
        </div>
      )}
    </div>
  );
}
