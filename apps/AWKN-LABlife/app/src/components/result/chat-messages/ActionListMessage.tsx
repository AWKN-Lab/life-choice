import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';

export function ActionListMessage({ actions }: { actions: string[] }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="space-y-2 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left flex items-center gap-2 group"
      >
        <span className="material-symbols-outlined text-emerald-400 text-sm"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >checklist</span>
        <span className="text-emerald-300/80 text-xs font-medium">{actions.length} 条行动建议</span>
        <span className="material-symbols-outlined text-sm text-on-surface/30 group-hover:text-on-surface/60 ml-auto transition-colors"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>
      <AnimatePresence>
        {!collapsed && actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2.5"
          >
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center mt-0.5">
              <span className="text-[10px] text-emerald-300 font-medium">{i + 1}</span>
            </span>
            <p className="text-sm text-on-surface/80 leading-relaxed">{action}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
