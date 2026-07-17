import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  message: string;
  onClose?: () => void;
  onRetry?: () => void;
  className?: string;
}

/** 内联错误提示条（用于表单内/卡片内） */
export function ErrorBanner({ message, onClose, onRetry, className }: ErrorBannerProps) {
  return (
    <Alert variant="destructive" className={cn('flex items-start gap-2', className)}>
      <Icon name="error_outline" size={18} className="text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <AlertDescription className="text-destructive">{message}</AlertDescription>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-destructive underline shrink-0">
          重试
        </button>
      )}
      {onClose && (
        <button onClick={onClose} className="text-destructive/60 shrink-0" aria-label="关闭">
          <Icon name="close" size={16} />
        </button>
      )}
    </Alert>
  );
}

interface ErrorStateProps {
  message: string;
  detail?: string;
  onRetry?: () => void;
  onHome?: () => void;
  className?: string;
}

/** 全屏错误态（用于页面级错误） */
export function ErrorState({ message, detail, onRetry, onHome, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[60vh] text-center px-6 gap-4', className)}>
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
        <Icon name="error_outline" size={32} className="text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-on-surface font-medium">{message}</p>
        {detail && <p className="text-sm text-on-surface-variant/50">{detail}</p>}
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2 rounded-lg gold-shimmer text-sm font-semibold"
          >
            重试
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="px-5 py-2 rounded-lg border border-outline/30 text-sm text-on-surface-variant"
          >
            返回首页
          </button>
        )}
      </div>
    </div>
  );
}
