import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';

interface TimelineEvent {
  date: string;
  event: string;
  dayunRange?: string;
  liunianGanZhi?: string;
  source: 'user_stated' | 'system_inferred';
}

interface TimelineMessageProps {
  events: TimelineEvent[];
}

export function TimelineMessage({ events }: TimelineMessageProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="space-y-2 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left flex items-center gap-2 group"
      >
        <span className="material-symbols-outlined text-primary text-sm"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >timeline</span>
        <span className="text-primary/80 text-xs font-medium">{events.length} 个关键节点</span>
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
          >
            <div className="text-[10px] text-on-surface/40 mb-2">人生关键节点</div>
            <div className="relative pl-4 border-l border-outline/10 space-y-3">
              {events.map((evt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary/60" />
                  <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-primary font-medium">{evt.date}</span>
                      {evt.source === 'user_stated' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">用户提及</span>
                      )}
                      {evt.source === 'system_inferred' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">系统推断</span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface/70 leading-relaxed">{evt.event}</p>
                    {(evt.dayunRange || evt.liunianGanZhi) && (
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-on-surface/40">
                        {evt.dayunRange && <span>大运：{evt.dayunRange}</span>}
                        {evt.liunianGanZhi && <span>流年：{evt.liunianGanZhi}</span>}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
