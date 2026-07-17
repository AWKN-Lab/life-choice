import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  animated?: boolean;
  className?: string;
}

/**
 * 统一页面头部组件
 * 包含返回按钮 + 标题 + 副标题 + 右侧操作区
 */
export function PageHeader({ title, subtitle, onBack, right, animated = true, className }: PageHeaderProps) {
  const content = (
    <header className={cn('flex items-center gap-3 px-4 pt-4 pb-2', className)}>
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors shrink-0"
          aria-label="返回"
        >
          <Icon name="arrow_back" size={20} className="text-on-surface" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {title && <h1 className="text-lg font-semibold text-on-surface truncate">{title}</h1>}
        {subtitle && <p className="text-sm text-on-surface-variant/60 truncate">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );

  if (!animated) return content;

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
      className={cn('flex items-center gap-3 px-4 pt-4 pb-2', className)}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors shrink-0"
          aria-label="返回"
        >
          <Icon name="arrow_back" size={20} className="text-on-surface" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {title && <h1 className="text-lg font-semibold text-on-surface truncate">{title}</h1>}
        {subtitle && <p className="text-sm text-on-surface-variant/60 truncate">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </motion.header>
  );
}
