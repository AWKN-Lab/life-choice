import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryAnchorMessageProps {
  anchorText: string;
  lastQuestion?: string;
}

/**
 * P3-2: 记忆锚点消息组件
 * 半透明卡片，不抢主内容视觉
 * 显示"上次你问的是XX，现在情况变了吗？"
 * 可点击展开查看上次判断摘要
 */
export function MemoryAnchorMessage({ anchorText, lastQuestion }: MemoryAnchorMessageProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-500/10 border border-slate-500/20 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-500/15 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span className="text-slate-400 text-sm mt-0.5 shrink-0">🔗</span>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-slate-400/60 uppercase tracking-wider">
            记忆锚点
          </span>
          <p className="text-sm text-slate-300/80 leading-relaxed mt-0.5">
            {anchorText}
          </p>
          {lastQuestion && (
            <AnimatePresence>
              {expanded && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-slate-400/60 mt-1.5 pl-2 border-l border-slate-500/20"
                >
                  上次问题：{lastQuestion}
                </motion.p>
              )}
            </AnimatePresence>
          )}
        </div>
        {lastQuestion && (
          <span className="text-slate-500/40 text-xs shrink-0">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
    </motion.div>
  );
}
