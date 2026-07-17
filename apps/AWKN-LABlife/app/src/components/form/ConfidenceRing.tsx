import { motion } from 'framer-motion';

interface ConfidenceRingProps {
  confidence: number; // 0-1
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ConfidenceRing({
  confidence,
  size = 64,
  strokeWidth = 4,
  label,
}: ConfidenceRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - confidence);

  const getColor = () => {
    if (confidence >= 0.85) return 'hsl(var(--shumiyuan-safe))';
    if (confidence >= 0.6) return 'hsl(var(--primary))';
    return 'hsl(var(--shumiyuan-warn))';
  };

  const getLabel = () => {
    if (confidence >= 0.85) return '高匹配';
    if (confidence >= 0.6) return '匹配';
    return '需确认';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* 背景环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--surface-container-high))"
            strokeWidth={strokeWidth}
          />
          {/* 进度环 */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              filter: `drop-shadow(0 0 4px ${getColor()}40)`,
            }}
          />
        </svg>
        {/* 中心文字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-sm font-bold"
            style={{ color: getColor() }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(confidence * 100)}%
          </motion.span>
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-xs text-on-surface-variant">{label || '匹配度'}</span>
        <span
          className="text-xs font-medium"
          style={{ color: getColor() }}
        >
          {getLabel()}
        </span>
      </div>
    </div>
  );
}
