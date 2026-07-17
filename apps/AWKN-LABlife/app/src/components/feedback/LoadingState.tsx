import { cn } from '@/lib/utils';

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

interface LoadingStateProps {
  size?: keyof typeof SIZE_MAP;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * 统一加载态组件
 * 基于 Material Symbols progress_activity + animate-spin
 */
export function LoadingState({ size = 'md', label, fullScreen = false, className }: LoadingStateProps) {
  const spinner = (
    <span
      className="material-symbols-outlined animate-spin text-primary"
      style={{ fontSize: SIZE_MAP[size] }}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className={cn('flex flex-col items-center justify-center min-h-[60vh] gap-3', className)}>
        {spinner}
        {label && <p className="text-sm text-on-surface-variant/60">{label}</p>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {spinner}
      {label && <span className="text-sm text-on-surface-variant/60">{label}</span>}
    </div>
  );
}
