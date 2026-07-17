import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * 统一空状态组件
 * 基于 shadcn/ui Empty 二次封装，集成 Material Symbols 图标
 */
export function EmptyState({ icon = 'inbox', title, description, actionText, onAction, className }: EmptyStateProps) {
  return (
    <Empty className={cn('py-12', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon name={icon} size={24} className="text-on-surface-variant/40" />
        </EmptyMedia>
        <EmptyTitle className="text-on-surface">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {actionText && onAction && (
        <EmptyContent>
          <button
            onClick={onAction}
            className="px-5 py-2 rounded-lg gold-shimmer text-sm font-semibold"
          >
            {actionText}
          </button>
        </EmptyContent>
      )}
    </Empty>
  );
}
