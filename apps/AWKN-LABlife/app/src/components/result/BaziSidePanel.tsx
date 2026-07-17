/**
 * BaziSidePanel — 右侧吸顶八字排盘面板
 *
 * 设计目标：
 * 1. 常驻右侧（sticky top），滚动 ResultPage 主内容时排盘保持可见
 * 2. 默认折叠（仅显示触发条），点开后展开排盘详情
 * 3. 在 < lg 断点自动隐藏，避免挤压主内容
 * 4. 数据缺失时不渲染（避免空状态）
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/result/Icon';
import { BaziOverviewCard } from '@/components/result/BaziOverviewCard';

interface BaziSidePanelProps {
  calcResult: any;
  birthDate?: string;
  // 折叠/展开受控
  defaultOpen?: boolean;
}

export function BaziSidePanel({ calcResult, birthDate, defaultOpen = true }: BaziSidePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [pinned, setPinned] = useState(false);

  // 数据缺失 → 隐藏
  if (!calcResult || !calcResult.yearPillar) return null;

  return (
    <aside
      className="hidden w-[320px] flex-shrink-0 flex-col border-l border-border/40 bg-surface-container/92 backdrop-blur-sm lg:flex xl:w-[360px]"
      aria-label="八字排盘侧栏"
    >
      {/* 顶部条 — 切换/钉住 */}
      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-on-surface/70 hover:text-on-surface transition-colors"
          aria-expanded={open}
        >
          <Icon name={open ? 'chevron_right' : 'chevron_left'} size={16} />
          <span>{open ? '收起' : '八字排盘'}</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setPinned((v) => !v)}
          className={`p-1 rounded transition-colors ${
            pinned ? 'text-primary' : 'text-on-surface/40 hover:text-on-surface/70'
          }`}
          title={pinned ? '已钉住' : '钉住排盘'}
          aria-label="钉住排盘"
        >
          <Icon name={pinned ? 'push_pin' : 'push_pin'} size={14} filled={pinned} />
        </button>
      </div>

      {/* 排盘主体（滚动） */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="bazi-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3"
          >
            <BaziOverviewCard calcResult={calcResult} birthDate={birthDate} />
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
