import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

type FrontdeskRenderAs = 'page' | 'sheet';

interface FrontdeskShellProps {
  renderAs?: FrontdeskRenderAs;
  title: string;
  onBack: () => void;
  children: ReactNode;
}

export function FrontdeskShell({
  renderAs = 'page',
  title,
  onBack,
  children,
}: FrontdeskShellProps) {
  if (renderAs === 'sheet') {
    return (
      <div className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-4 py-4 border-b border-outline/10 shrink-0">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-on-surface/5 transition-colors">
            <Icon name="arrow_back" size={22} className="text-on-surface/70" />
          </button>
          <span className="text-sm text-on-surface-variant">{title}</span>
          <div className="w-10" />
        </header>
        <div className="px-4 sm:px-5 py-4 flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-surface" />
      <div className="relative z-10 max-w-lg mx-auto px-4 sm:px-6 min-h-screen flex flex-col">
        <header className="flex items-center justify-between pt-6 pb-4 shrink-0">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-on-surface/5 transition-colors">
            <Icon name="arrow_back" size={22} className="text-on-surface/70" />
          </button>
          <span className="text-sm text-on-surface-variant">{title}</span>
          <div className="w-10" />
        </header>
        <div className="flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
