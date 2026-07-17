import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RiskItem {
  text: string;
  index: number;
}

export function RiskListMessage({ risks, isGated, totalCount }: { risks: string[]; isGated?: boolean; totalCount?: number }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="space-y-2 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left flex items-center gap-2 group"
      >
        <span className="material-symbols-outlined text-amber-300 text-sm"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >warning</span>
        <span className="text-amber-200/80 text-xs font-medium">{risks.length} 条风险提醒</span>
        <span className="material-symbols-outlined text-sm text-on-surface/30 group-hover:text-on-surface/60 ml-auto transition-colors"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {risks.map((risk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/10 px-3 py-2.5"
              >
                <span className="flex-shrink-0 text-amber-200 text-xs font-medium mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-on-surface/70 leading-relaxed">{risk}</p>
              </motion.div>
            ))}
            {isGated && totalCount && totalCount > risks.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-outline/20 bg-surface-container-low/30 p-3 text-center"
              >
                <p className="text-on-surface/30 text-xs">还有 {totalCount - risks.length} 条风险提醒，升级会员查看全部</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
