import { motion } from 'framer-motion';
import { Icon } from '../Icon';
import type { FiveLayerOutput } from '../resultTypes';
import { FIVE_LAYER_META, MISSING_LAYER_PLACEHOLDER } from '../resultTypes';

interface FiveLayerMessageProps {
  layers: FiveLayerOutput;
  /** P1-6: 被锁定的层 key 列表 */
  gatedLayers?: string[];
  /** P1-6: 解锁回调 */
  onUnlock?: () => void;
}

const LAYER_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  clause: { border: 'border-blue-400/30', bg: 'bg-blue-400/10', text: 'text-blue-300' },
  halfMountain: { border: 'border-purple-400/30', bg: 'bg-purple-400/10', text: 'text-purple-300' },
  detail: { border: 'border-amber-400/30', bg: 'bg-amber-400/10', text: 'text-amber-300' },
  cost: { border: 'border-emerald-400/30', bg: 'bg-emerald-400/10', text: 'text-emerald-300' },
  nextAction: { border: 'border-rose-400/30', bg: 'bg-rose-400/10', text: 'text-rose-300' },
};

export function FiveLayerMessage({ layers, gatedLayers = [], onUnlock }: FiveLayerMessageProps) {
  const hasGatedLayers = gatedLayers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card p-5 md:p-6 mb-4"
    >
      <h2 className="text-primary text-lg md:text-xl font-semibold flex items-center gap-2 mb-4">
        <Icon name="layers" size={20} />
        五层推演
      </h2>

      <div className="space-y-3">
        {FIVE_LAYER_META.map((meta, idx) => {
          const content = layers[meta.key];
          const isMissing = !content || content === MISSING_LAYER_PLACEHOLDER;
          const isGated = gatedLayers.includes(meta.key);
          const colors = LAYER_COLORS[meta.key];

          // P1-6: 付费锁定层 — 模糊显示 + 升级提示
          if (isGated) {
            return (
              <motion.div
                key={meta.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
                className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-3.5 relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon name={meta.icon} size={16} className="text-on-surface/30" />
                  <span className="text-sm font-medium text-on-surface/40">
                    {meta.label}
                  </span>
                  <span className="ml-auto text-xs text-primary/60 bg-primary/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Icon name="lock" size={12} />
                    VIP
                  </span>
                </div>
                {/* 模糊占位内容 */}
                <div className="text-sm leading-relaxed text-on-surface/15 select-none blur-[3px]">
                  此内容为深度推演分析，包含三条推演路径与概率评估、对应行动建议、以及一句话金句点睛。升级VIP即可解锁完整内容。
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={meta.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.08 }}
              className={`rounded-xl border ${isMissing ? 'border-outline/10 bg-on-surface/[0.02]' : `${colors.border} ${colors.bg}`} p-3.5`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon name={meta.icon} size={16} className={isMissing ? 'text-on-surface/30' : colors.text} />
                <span className={`text-sm font-medium ${isMissing ? 'text-on-surface/40' : colors.text}`}>
                  {meta.label}
                </span>
                {isMissing && (
                  <span className="ml-auto text-xs text-on-surface/25 bg-on-surface/5 rounded-full px-2 py-0.5">
                    待补充
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${isMissing ? 'text-on-surface/30 italic' : 'text-on-surface/75'}`}>
                {content || MISSING_LAYER_PLACEHOLDER}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* P1-6: 付费升级提示 — 在推演层截断处显示 */}
      {hasGatedLayers && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Icon name="auto_awesome" size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">解锁完整推演</h3>
              <p className="text-xs text-on-surface-variant/60">升级VIP，获取深度分析</p>
            </div>
          </div>

          <div className="space-y-1.5 mb-4">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Icon name="check_circle" size={14} className="text-primary" />
              3条推演路径 + 概率评估
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Icon name="check_circle" size={14} className="text-primary" />
              每条路径对应行动建议
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Icon name="check_circle" size={14} className="text-primary" />
              一句话金句点睛 + 追问引导
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Icon name="check_circle" size={14} className="text-primary" />
              无限追问 + 多体系交叉验证
            </div>
          </div>

          <button
            onClick={onUnlock}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            升级 VIP 解锁完整推演
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
