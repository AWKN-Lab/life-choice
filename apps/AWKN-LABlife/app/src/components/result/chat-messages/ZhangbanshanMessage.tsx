import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';

interface ZhangbanshanData {
  judgment: string;
  premise?: string;
  cost: string;
  reasoning_trace: string;
  primary_agent: string;
  secondary_agent?: string;
  schedule_reason: string;
  agent_consistency?: 'consistent' | 'undetermined' | 'conflicting';
  arbitration_note?: string;
}

const CONSISTENCY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  consistent: { label: '一致', color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
  undetermined: { label: '待定', color: 'text-amber-300', bg: 'bg-amber-400/15' },
  conflicting: { label: '冲突', color: 'text-rose-300', bg: 'bg-rose-400/15' },
};

export function ZhangbanshanMessage({ data }: { data: ZhangbanshanData }) {
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const consistency = data.agent_consistency ? CONSISTENCY_MAP[data.agent_consistency] : null;

  return (
    <div className="space-y-3 w-full">
      {/* 判语 */}
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="gavel" size={16} className="text-primary" />
          <span className="text-xs text-primary font-medium">判语</span>
          {consistency && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${consistency.color} ${consistency.bg}`}>
              {consistency.label}
            </span>
          )}
        </div>
        <p className="text-sm text-on-surface leading-relaxed">{data.judgment}</p>
      </div>

      {/* 前提（U-P0-3: premise 字段渲染） */}
      {data.premise && (
        <div className="rounded-xl border border-slate-400/20 bg-slate-400/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="info" size={14} className="text-slate-300" />
            <span className="text-[10px] text-slate-300 font-medium">前提</span>
          </div>
          <p className="text-xs text-on-surface/60 leading-relaxed">{data.premise}</p>
        </div>
      )}

      {/* 代价（U-P0-1: cost 为空时展示"深度推演进行中"） */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="payments" size={16} className="text-amber-300" />
          <span className="text-xs text-amber-300 font-medium">代价</span>
        </div>
        {data.cost ? (
          <p className="text-sm text-on-surface/75 leading-relaxed">{data.cost}</p>
        ) : (
          <p className="text-xs text-on-surface/50 leading-relaxed animate-pulse">
            深度推演进行中，完整代价分析稍后呈现…
          </p>
        )}
      </div>

      {/* 推理溯源 */}
      <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] overflow-hidden">
        <button
          onClick={() => setReasoningExpanded(!reasoningExpanded)}
          className="w-full p-3 flex items-center justify-between text-sm text-on-surface/70 hover:text-primary transition-colors"
        >
          <div className="flex items-center gap-2">
            <ZhangbanshanAvatar size="sm" />
            <span className="text-xs">推理溯源</span>
          </div>
          <Icon name={reasoningExpanded ? 'expand_less' : 'expand_more'} size={18} />
        </button>
        <AnimatePresence initial={false}>
          {reasoningExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <p className="text-xs text-on-surface/60 leading-relaxed">{data.reasoning_trace}</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded bg-black/20 p-2">
                    <div className="text-[10px] text-on-surface/40 mb-0.5">主 agent</div>
                    <div className="text-xs text-on-surface font-medium">{data.primary_agent}</div>
                  </div>
                  <div className="rounded bg-black/20 p-2">
                    <div className="text-[10px] text-on-surface/40 mb-0.5">辅助 agent</div>
                    <div className="text-xs text-on-surface font-medium">{data.secondary_agent || '-'}</div>
                  </div>
                  <div className="rounded bg-black/20 p-2">
                    <div className="text-[10px] text-on-surface/40 mb-0.5">调度依据</div>
                    <div className="text-xs text-on-surface/70 leading-relaxed truncate">{data.schedule_reason}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 仲裁说明 */}
      {data.arbitration_note && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="balance" size={16} className="text-rose-300" />
            <span className="text-xs text-rose-300 font-medium">仲裁说明</span>
          </div>
          <p className="text-xs text-on-surface/70 leading-relaxed">{data.arbitration_note}</p>
        </motion.div>
      )}
    </div>
  );
}
