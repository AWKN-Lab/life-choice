/**
 * @deprecated 已被 FateHourWheel 替代，仅 ComponentPreview 引用。
 * 业务代码请使用 FateHourWheel。
 */
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface HourWheelProps {
  value: number;
  onChange: (hour: number) => void;
}

const SHICHEN = [
  { hour: 0,  label: '子时', range: '23:00-01:00', desc: '夜半' },
  { hour: 1,  label: '丑时', range: '01:00-03:00', desc: '鸡鸣' },
  { hour: 2,  label: '寅时', range: '03:00-05:00', desc: '平旦' },
  { hour: 3,  label: '卯时', range: '05:00-07:00', desc: '日出' },
  { hour: 4,  label: '辰时', range: '07:00-09:00', desc: '食时' },
  { hour: 5,  label: '巳时', range: '09:00-11:00', desc: '隅中' },
  { hour: 6,  label: '午时', range: '11:00-13:00', desc: '日中' },
  { hour: 7,  label: '未时', range: '13:00-15:00', desc: '日昳' },
  { hour: 8,  label: '申时', range: '15:00-17:00', desc: '晡时' },
  { hour: 9,  label: '酉时', range: '17:00-19:00', desc: '日入' },
  { hour: 10, label: '戌时', range: '19:00-21:00', desc: '黄昏' },
  { hour: 11, label: '亥时', range: '21:00-23:00', desc: '人定' },
];

export default function HourWheel({ value, onChange }: HourWheelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const centerX = 140;
  const centerY = 140;
  const outerR = 120;
  const innerR = 72;
  const labelR = 96;

  const selectedShichen = SHICHEN.find(s => s.hour === Math.floor(value / 2)) || SHICHEN[0];

  const getArcPath = (index: number) => {
    const startAngle = (index * 30 - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * 30 - 90) * (Math.PI / 180);
    const x1 = centerX + outerR * Math.cos(startAngle);
    const y1 = centerY + outerR * Math.sin(startAngle);
    const x2 = centerX + outerR * Math.cos(endAngle);
    const y2 = centerY + outerR * Math.sin(endAngle);
    const x3 = centerX + innerR * Math.cos(endAngle);
    const y3 = centerY + innerR * Math.sin(endAngle);
    const x4 = centerX + innerR * Math.cos(startAngle);
    const y4 = centerY + innerR * Math.sin(startAngle);
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} Z`;
  };

  const getLabelPos = (index: number) => {
    const angle = (index * 30 + 15 - 90) * (Math.PI / 180);
    return {
      x: centerX + labelR * Math.cos(angle),
      y: centerY + labelR * Math.sin(angle),
    };
  };

  const isSelected = (index: number) => {
    const hour = value;
    return hour >= index * 2 && hour < (index + 1) * 2;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          ref={svgRef}
          width="280"
          height="280"
          viewBox="0 0 280 280"
          className="cursor-pointer select-none"
        >
          {/* 外圈装饰 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={outerR + 4}
            fill="none"
            stroke="hsl(var(--primary) / 0.15)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          {/* 内圈装饰 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerR - 8}
            fill="none"
            stroke="hsl(var(--primary) / 0.1)"
            strokeWidth="1"
          />
          {/* 中心发光 */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerR - 16}
            fill="hsl(var(--primary) / 0.05)"
          />

          {SHICHEN.map((s, i) => {
            const selected = isSelected(i);
            const hover = hovered === i;
            return (
              <g key={s.label}>
                <motion.path
                  d={getArcPath(i)}
                  fill={selected
                    ? 'hsl(var(--primary) / 0.25)'
                    : hover
                      ? 'hsl(var(--primary) / 0.12)'
                      : 'hsl(var(--surface-container) / 0.5)'
                  }
                  stroke={selected
                    ? 'hsl(var(--primary) / 0.6)'
                    : 'hsl(var(--primary) / 0.1)'
                  }
                  strokeWidth={selected ? 1.5 : 0.5}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onChange(i * 2)}
                  whileHover={{ scale: 1.02 }}
                  style={{ transformOrigin: `${centerX}px ${centerY}px` }}
                />
                <text
                  x={getLabelPos(i).x}
                  y={getLabelPos(i).y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={selected ? 'hsl(var(--primary))' : 'hsl(var(--on-surface-variant))'}
                  fontSize="13"
                  fontWeight={selected ? 600 : 400}
                  style={{ pointerEvents: 'none' }}
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* 中心显示 */}
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="hsl(var(--primary))"
            fontSize="18"
            fontWeight={700}
          >
            {selectedShichen.label}
          </text>
          <text
            x={centerX}
            y={centerY + 14}
            textAnchor="middle"
            dominantBaseline="central"
            fill="hsl(var(--on-surface-variant))"
            fontSize="11"
          >
            {selectedShichen.desc}
          </text>
        </svg>

        {/* 选中时辰详情 */}
        <motion.div
          key={selectedShichen.label}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-2"
        >
          <div className="text-sm text-on-surface-variant">
            {selectedShichen.range}
          </div>
        </motion.div>
      </div>

      {/* 24小时快速选择 */}
      <div className="flex flex-wrap justify-center gap-1.5 max-w-[260px]">
        {Array.from({ length: 24 }, (_, h) => (
          <button
            key={h}
            onClick={() => onChange(h)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
              value === h
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-on-surface/[0.04] text-on-surface/40 border border-outline/[0.06] hover:text-on-surface/60'
            }`}
          >
            {String(h).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
