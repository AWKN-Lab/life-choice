import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReportSectionData {
  title: string;
  content: string;
  score?: number;
  scoreLabel?: string;
}

export function ReportSectionMessage({ data }: { data: ReportSectionData }) {
  const [collapsed, setCollapsed] = useState(true);
  const summary = data.content.length > 80
    ? data.content.slice(0, 80) + '...'
    : data.content;

  return (
    <div className="space-y-1 w-full">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left flex items-center gap-2 group"
      >
        <span className="w-1 h-1 rounded-full bg-primary/60 flex-shrink-0" />
        <h3 className="text-primary/90 text-sm font-medium flex-1">{data.title}</h3>
        <span className="material-symbols-outlined text-sm text-on-surface/30 group-hover:text-on-surface/60 transition-colors"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
        >
          {collapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>
      <AnimatePresence>
        {collapsed ? (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-on-surface/40 text-xs leading-relaxed pl-3"
          >
            {summary}
          </motion.p>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-on-surface/65 text-sm leading-relaxed whitespace-pre-line pl-3">{data.content}</p>
            {data.score !== undefined && (
              <div className="flex items-center gap-2 mt-1 pl-3">
                <span className="text-xs text-on-surface/40">{data.scoreLabel || '评分'}</span>
                <span className="text-primary text-sm font-semibold">{data.score}/10</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
