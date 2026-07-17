import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface GenderSelectorProps {
  value: 'male' | 'female';
  onChange: (g: 'male' | 'female') => void;
  variant?: 'primary' | 'secondary' | 'amber' | 'purple';
  className?: string;
}

const VARIANT_STYLES: Record<string, (active: boolean) => string> = {
  primary: (active) =>
    active
      ? 'bg-primary/20 text-primary border border-primary/50'
      : 'bg-surface-container-low/50 text-on-surface/50 border border-outline/20 hover:border-outline/40',
  secondary: (active) =>
    active
      ? 'bg-secondary/20 text-secondary border border-secondary/50'
      : 'bg-surface-container-low/50 text-on-surface/50 border border-outline/20 hover:border-outline/40',
  amber: (active) =>
    active
      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
      : 'bg-on-surface/5 text-gray-400 border border-outline/10 hover:border-amber-500/30',
  purple: (active) =>
    active
      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
      : 'bg-on-surface/5 text-gray-400 border border-outline/10 hover:border-purple-500/30',
};

export function GenderSelector({
  value,
  onChange,
  variant = 'primary',
  className,
}: GenderSelectorProps) {
  const { t } = useTranslation();
  const options: Array<{ value: 'male' | 'female'; label: string }> = [
    { value: 'male', label: t('form.male', { defaultValue: '男' }) },
    { value: 'female', label: t('form.female', { defaultValue: '女' }) },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'py-3 rounded-xl text-sm font-medium transition-all',
              VARIANT_STYLES[variant](active)
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
