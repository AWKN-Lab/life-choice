import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';

interface ToolResult {
  toolName: string;
  toolOutput: string;
  llmInterpretation: string;
  confidence: number;
}

interface ToolResultMessageProps {
  tools: ToolResult[];
}

export function ToolResultMessage({ tools }: ToolResultMessageProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-2 w-full">
      {tools.map((tool, i) => {
        const isExpanded = expandedIdx === i;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-outline/10 bg-on-surface/[0.04] overflow-hidden"
          >
            <button
              onClick={() => setExpandedIdx(isExpanded ? null : i)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-on-surface/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon name="build" size={14} className="text-primary/60" />
                <span className="text-xs text-on-surface/70">{tool.toolName}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${tool.confidence >= 0.8 ? 'bg-green-500/20 text-green-400' : tool.confidence >= 0.5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                  {Math.round(tool.confidence * 100)}%
                </span>
              </div>
              <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={16} className="text-on-surface/30" />
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-2">
                    <div className="rounded-lg bg-black/20 p-2.5">
                      <div className="text-[10px] text-on-surface/40 mb-1">工具输出</div>
                      <p className="text-xs text-on-surface/60 leading-relaxed">{tool.toolOutput}</p>
                    </div>
                    <div className="rounded-lg bg-primary/5 p-2.5">
                      <div className="text-[10px] text-primary/60 mb-1">解读</div>
                      <p className="text-xs text-on-surface/70 leading-relaxed">{tool.llmInterpretation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
