/**
 * FateHourWheel — 时辰双环旋转选择器
 *
 * 交互模型：
 *   - 外圈金色环：12 时辰（子丑寅卯… + 数字 1-12）
 *   - 内圈蓝色环：24 小时（00-23）
 *   - 拖动外圈时，内圈视觉上不跟随旋转；释放后小时跳到该时辰起始值，内圈瞬切
 *   - 拖动内圈时，外圈视觉上不跟随旋转；释放后时辰按小时反查，外圈瞬切
 *   - 顶部固定指针指示当前选中
 *   - 中心显示：时辰名 + 生肖 + 五行 + 小时:分钟
 *
 * Props:
 *   hour: number (0-23)
 *   minute: number (0-59)
 *   onHourChange: (h: number) => void
 *   onMinuteChange: (m: number) => void
 *   label?: string
 */

import { useState, useMemo, useRef, useCallback, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface FateHourWheelProps {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  label?: string;
  /** 精简模式：只显示圆盘，隐藏分钟按钮行和说明文字 */
  minimal?: boolean;
}

const SHICHEN = [
  { start: 23, end: 1, name: '子', branch: '鼠', element: '水', number: 12 },
  { start: 1, end: 3, name: '丑', branch: '牛', element: '土', number: 1 },
  { start: 3, end: 5, name: '寅', branch: '虎', element: '木', number: 2 },
  { start: 5, end: 7, name: '卯', branch: '兔', element: '木', number: 3 },
  { start: 7, end: 9, name: '辰', branch: '龙', element: '土', number: 4 },
  { start: 9, end: 11, name: '巳', branch: '蛇', element: '火', number: 5 },
  { start: 11, end: 13, name: '午', branch: '马', element: '火', number: 6 },
  { start: 13, end: 15, name: '未', branch: '羊', element: '土', number: 7 },
  { start: 15, end: 17, name: '申', branch: '猴', element: '金', number: 8 },
  { start: 17, end: 19, name: '酉', branch: '鸡', element: '金', number: 9 },
  { start: 19, end: 21, name: '戌', branch: '狗', element: '土', number: 10 },
  { start: 21, end: 23, name: '亥', branch: '猪', element: '水', number: 11 },
] as const;

const ELEMENT_COLOR: Record<string, string> = {
  木: 'hsl(140 70% 60%)',
  火: 'hsl(5 90% 68%)',
  土: 'hsl(40 80% 68%)',
  金: 'hsl(48 85% 72%)',
  水: 'hsl(210 80% 72%)',
};

const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// 颜色配置
const COLOR_OUTER = '#e0c97a';      // 时辰金色
const COLOR_OUTER_BG = 'rgba(224,201,122,0.12)';
const COLOR_OUTER_DIM = 'rgba(224,201,122,0.35)';
const COLOR_INNER = '#60a5fa';      // 小时蓝色
const COLOR_INNER_BG = 'rgba(96,165,250,0.12)';
const COLOR_INNER_DIM = 'rgba(96,165,250,0.35)';
const COLOR_ACTIVE = '#ffffff';

const normalizeAngle = (angle: number) => {
  let next = angle;
  if (next < 0) next += 360;
  return next % 360;
};

const signedDelta = (a: number, b: number) => {
  const d = normalizeAngle(b - a + 180) - 180;
  return d;
};

const findShichenByHour = (h: number) => {
  return SHICHEN.find((s) => {
    if (s.start > s.end) return h >= s.start || h < s.end;
    return h >= s.start && h < s.end;
  }) ?? SHICHEN[0];
};

export function FateHourWheel({ hour, minute, onHourChange, onMinuteChange, label, minimal = false }: FateHourWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const shichen = useMemo(() => findShichenByHour(hour), [hour]);
  const shichenIndex = useMemo(() => SHICHEN.findIndex((s) => s.name === shichen.name), [shichen.name]);
  const elementColor = ELEMENT_COLOR[shichen.element];

  // 目标角度：0° 表示 12 点钟方向为选中位置
  const targetOuterAngle = -(shichenIndex * 30);
  const targetInnerAngle = -(hour * 15);

  const [outerAngle, setOuterAngle] = useState(targetOuterAngle);
  const [innerAngle, setInnerAngle] = useState(targetInnerAngle);
  const [dragState, setDragState] = useState<{
    mode: 'outer' | 'inner';
    startPointerAngle: number;
    startOuterAngle: number;
    startInnerAngle: number;
  } | null>(null);

  // 当外部 hour 变化时，把环瞬切到目标角度
  useEffect(() => {
    if (!dragState) {
      setOuterAngle(targetOuterAngle);
      setInnerAngle(targetInnerAngle);
    }
  }, [targetOuterAngle, targetInnerAngle, dragState]);

  const pointToPolar = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const svgX = ((clientX - rect.left) / rect.width) * 200;
    const svgY = ((clientY - rect.top) / rect.height) * 200;
    const dx = svgX - 100;
    const dy = svgY - 100;
    const radius = Math.sqrt(dx * dx + dy * dy);
    const angle = normalizeAngle(Math.atan2(dy, dx) * (180 / Math.PI) + 90);
    return { radius, angle };
  }, []);

  const detectMode = useCallback((radius: number): 'outer' | 'inner' | null => {
    if (radius >= 55) return 'outer';
    if (radius >= 25 && radius < 55) return 'inner';
    return null;
  }, []);

  const handlePointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const polar = pointToPolar(e.clientX, e.clientY);
    if (!polar) return;
    const mode = detectMode(polar.radius);
    if (!mode) return;

    setDragState({
      mode,
      startPointerAngle: polar.angle,
      startOuterAngle: outerAngle,
      startInnerAngle: innerAngle,
    });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState) return;
    const polar = pointToPolar(e.clientX, e.clientY);
    if (!polar) return;

    const delta = signedDelta(dragState.startPointerAngle, polar.angle);
    if (dragState.mode === 'outer') {
      setOuterAngle(dragState.startOuterAngle + delta);
    } else {
      setInnerAngle(dragState.startInnerAngle + delta);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragState) return;

    if (dragState.mode === 'outer') {
      // 外圈 12 等分，每格 30°
      const index = Math.round(-outerAngle / 30) % 12;
      const normalizedIndex = (index + 12) % 12;
      const selected = SHICHEN[normalizedIndex];
      onHourChange(selected.start % 24);
    } else {
      // 内圈 24 等分，每格 15°
      const h = Math.round(-innerAngle / 15) % 24;
      const normalizedHour = (h + 24) % 24;
      onHourChange(normalizedHour);
    }

    setDragState(null);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const isDraggingOuter = dragState?.mode === 'outer';
  const isDraggingInner = dragState?.mode === 'inner';

  return (
    <div className="relative flex flex-col items-center select-none">
      {label && (
        <div className="flex items-center gap-2 mb-3 text-sm text-on-surface/60">
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: COLOR_OUTER }}>schedule</span>
          <span>{label}</span>
        </div>
      )}

      <div className="relative w-full max-w-[320px] aspect-square">
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none', cursor: dragState ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <filter id="glow-wheel">
              <feGaussianBlur stdDeviation="1.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="outerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor={COLOR_OUTER_BG} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="innerGrad" cx="50%" cy="50%" r="50%">
              <stop offset="50%" stopColor={COLOR_INNER_BG} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* 外圈静态装饰环 */}
          <circle cx="100" cy="100" r="96" fill="none" stroke={COLOR_OUTER_DIM} strokeWidth="0.6" />
          <circle cx="100" cy="100" r="58" fill="none" stroke={COLOR_OUTER_DIM} strokeWidth="0.6" />

          {/* 内圈静态装饰环 */}
          <circle cx="100" cy="100" r="54" fill="none" stroke={COLOR_INNER_DIM} strokeWidth="0.6" />
          <circle cx="100" cy="100" r="26" fill="none" stroke={COLOR_INNER_DIM} strokeWidth="0.6" />

          {/* 外圈：可旋转的金色环 */}
          <g transform={`rotate(${outerAngle} 100 100)`} style={{ cursor: isDraggingOuter ? 'grabbing' : 'grab' }}>
            <circle cx="100" cy="100" r="77" fill="url(#outerGrad)" opacity="0.6" />
            {SHICHEN.map((item, index) => {
              const angleDeg = index * 30;
              const angle = (angleDeg - 90) * (Math.PI / 180);
              const active = shichen.name === item.name;
              const nx = 100 + Math.cos(angle) * 77;
              const ny = 100 + Math.sin(angle) * 77;
              const tx = 100 + Math.cos(angle) * 90;
              const ty = 100 + Math.sin(angle) * 90;

              return (
                <g key={item.name}>
                  <line
                    x1={100 + Math.cos(angle) * 60} y1={100 + Math.sin(angle) * 60}
                    x2={100 + Math.cos(angle) * 96} y2={100 + Math.sin(angle) * 96}
                    stroke={active ? COLOR_OUTER : COLOR_OUTER_DIM}
                    strokeWidth={active ? 1.6 : 0.6}
                  />
                  <text
                    x={nx} y={ny}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={active ? 12 : 10}
                    fontWeight={active ? 800 : 600}
                    fill={active ? COLOR_ACTIVE : COLOR_OUTER}
                    fontFamily="ui-monospace, monospace"
                  >
                    {item.number}
                  </text>
                  <text
                    x={tx} y={ty}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={active ? 9 : 7.5}
                    fontWeight={active ? 700 : 500}
                    fill={active ? COLOR_ACTIVE : COLOR_OUTER_DIM}
                    fontFamily="'Noto Serif SC', serif"
                  >
                    {item.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 内圈：可旋转的蓝色环 */}
          <g transform={`rotate(${innerAngle} 100 100)`} style={{ cursor: isDraggingInner ? 'grabbing' : 'grab' }}>
            <circle cx="100" cy="100" r="40" fill="url(#innerGrad)" opacity="0.6" />
            {Array.from({ length: 24 }).map((_, i) => {
              const angleDeg = i * 15;
              const angle = (angleDeg - 90) * (Math.PI / 180);
              const active = i === hour;
              const isMajor = i % 6 === 0;
              const nx = 100 + Math.cos(angle) * 40;
              const ny = 100 + Math.sin(angle) * 40;

              return (
                <g key={`h${i}`}>
                  <line
                    x1={100 + Math.cos(angle) * 26} y1={100 + Math.sin(angle) * 26}
                    x2={100 + Math.cos(angle) * (isMajor ? 52 : 46)} y2={100 + Math.sin(angle) * (isMajor ? 52 : 46)}
                    stroke={active ? COLOR_INNER : isMajor ? COLOR_INNER_DIM : `${COLOR_INNER_DIM}80`}
                    strokeWidth={active ? 1.4 : isMajor ? 0.7 : 0.35}
                  />
                  <text
                    x={nx} y={ny}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={active ? 8 : isMajor ? 6.5 : 5.5}
                    fontWeight={active ? 700 : isMajor ? 600 : 500}
                    fill={active ? COLOR_ACTIVE : COLOR_INNER}
                    fontFamily="ui-monospace, monospace"
                  >
                    {String(i).padStart(2, '0')}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 顶部固定指针 */}
          <g>
            <polygon points="100,6 96,18 104,18" fill={COLOR_OUTER} filter="url(#glow-wheel)" />
            <circle cx="100" cy="18" r="1.5" fill={COLOR_ACTIVE} />
          </g>

          {/* 中心圆点 */}
          <circle cx="100" cy="100" r="5" fill={elementColor} filter="url(#glow-wheel)" />
          <circle cx="100" cy="100" r="2.2" fill="hsl(var(--surface))" />
        </svg>

        {/* 中心信息卡 — 收纳在内环圆内 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            key={`${shichen.name}-${hour}-${minute}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="text-center pointer-events-auto flex flex-col items-center justify-center"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'hsl(var(--surface-container-low) / 0.92)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${elementColor}55`,
              boxShadow: `0 0 12px ${elementColor}22`,
            }}
          >
            <span
              className="text-lg font-bold leading-none"
              style={{ color: COLOR_OUTER, fontFamily: "'Noto Serif SC', serif" }}
            >
              {shichen.name}
            </span>
            <span className="text-[9px] font-mono leading-none mt-0.5" style={{ color: elementColor }}>
              {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
            </span>
          </motion.div>
        </div>
      </div>

      {/* 分钟选择按钮行 */}
      {!minimal && (
        <div className="w-full max-w-[320px] mt-3">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[10px] text-on-surface/40">分钟</span>
            <span className="text-xs font-mono font-semibold" style={{ color: COLOR_INNER }}>
              {String(minute).padStart(2, '0')}
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
            {MINUTE_STEPS.map((m) => {
              const active = minute === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMinuteChange(m)}
                  className="flex-shrink-0 w-9 h-8 rounded-lg text-[11px] font-mono font-medium transition-all"
                  style={active ? {
                    background: `linear-gradient(135deg, ${COLOR_INNER} 0%, #3b82f6 100%)`,
                    color: '#fff',
                    boxShadow: `0 0 8px ${COLOR_INNER}66`,
                  } : {
                    background: 'hsl(var(--surface-container-low))',
                    color: 'hsl(var(--on-surface) / 0.5)',
                  }}
                >
                  {String(m).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!minimal && (
        <p className="mt-2 text-[10px] text-on-surface/30 text-center">
          金色外圈=时辰 · 蓝色内圈=小时 · 拖动外环/内环独立旋转
        </p>
      )}
    </div>
  );
}

export default FateHourWheel;
