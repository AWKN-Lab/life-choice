/**
 * P1-3: K线加载骨架屏
 *
 * 在 K线生成轮询中（pending/processing 状态）展示的骨架屏占位，
 * 替代空白等待，提升用户感知性能。
 * U-P1-1: 增加 progress 和 stage props，展示进度条和阶段提示文案。
 */
import { motion } from 'framer-motion';
import type { KlineGenStage } from '@/hooks/useKlinePolling';

interface KlineSkeletonProps {
  /** 是否显示重试提示（timeout/failed 时） */
  showError?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
  /** U-P1-1: 进度百分比（0-100） */
  progress?: number;
  /** U-P1-1: 当前阶段 */
  stage?: KlineGenStage;
}

// U-P1-1: 阶段提示文案映射
const STAGE_LABELS: Record<KlineGenStage, string> = {
  yearly: '正在推演年线骨架...',
  monthly: '正在计算大运节点...',
  signals: '正在识别趋势信号...',
  done: '生成完成',
};

export function KlineSkeleton({ showError = false, onRetry, progress, stage }: KlineSkeletonProps) {
  if (showError) {
    return (
      <div className="rounded-xl bg-surface-container-high/30 p-6 text-center">
        <p className="text-sm text-on-surface/60 mb-3">
          K线生成超时或失败，请重试
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-full text-sm bg-primary text-on-primary active:scale-95 transition-transform"
          >
            重新生成
          </button>
        )}
      </div>
    );
  }

  // U-P1-1: 进度条和阶段文案（progress 未传时不展示）
  const hasProgress = typeof progress === 'number' && progress >= 0;
  const stageLabel = stage ? STAGE_LABELS[stage] : '正在生成 K 线...';
  const progressPct = hasProgress ? Math.max(0, Math.min(100, progress as number)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl bg-surface-container-high/30 p-4 space-y-3"
      role="status"
      aria-label="K线生成中"
    >
      {/* 标题骨架 */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 bg-on-surface/10 rounded animate-pulse" />
        {hasProgress && (
          <span className="text-xs text-primary font-medium tabular-nums">{progressPct}%</span>
        )}
      </div>

      {/* U-P1-1: 进度条 */}
      {hasProgress && (
        <div className="h-1.5 w-full bg-on-surface/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* 图表骨架 */}
      <div className="h-48 w-full bg-on-surface/5 rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-on-surface/5 to-transparent animate-pulse" />
        {/* 模拟 K线柱状图 */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-1.5 h-32">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-on-surface/10 rounded-t animate-pulse"
              style={{
                height: `${30 + Math.sin(i * 0.5) * 20 + Math.random() * 30}%`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* U-P1-1: 阶段提示文案 */}
      <div className="flex items-center gap-2 text-xs text-on-surface/60">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span>{stageLabel}</span>
      </div>

      {/* 标签骨架 */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-16 bg-on-surface/10 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* 文字骨架 */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-on-surface/10 rounded animate-pulse" />
        <div className="h-3 w-3/4 bg-on-surface/10 rounded animate-pulse" />
      </div>
    </motion.div>
  );
}
