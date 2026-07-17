import { Icon } from './Icon';

interface SuggestionsCardProps {
  actions?: string[];
  risks?: string[];
  timeWindow?: string;
  isGated?: boolean;
  totalRisks?: number;
}

export function SuggestionsCard({ actions = [], risks = [], timeWindow, isGated = false, totalRisks }: SuggestionsCardProps) {
  if (actions.length === 0 && risks.length === 0) return null;

  const displayRisks = isGated && totalRisks ? risks.slice(0, 1) : risks;

  return (
    <div className="rounded-xl border border-outline/10 bg-on-surface/[0.02] p-4 space-y-4">
      <h3 className="text-primary font-semibold flex items-center gap-2">
        <Icon name="lightbulb" size={18} />
        综合建议
      </h3>

      {/* 行动建议 */}
      {actions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs text-emerald-400">
            <Icon name="task_alt" size={12} />
            <span>行动建议 ({actions.length}条)</span>
          </div>
          <div className="space-y-2">
            {actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-emerald-400 font-semibold">{idx + 1}</span>
                </div>
                <p className="text-on-surface/70 text-sm leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 风险提示 */}
      {displayRisks.length > 0 && (
        <div className="border-t border-outline/5 pt-4">
          <div className="flex items-center gap-2 mb-2 text-xs text-rose-400">
            <Icon name="warning" size={12} />
            <span>风险提示 {totalRisks && totalRisks > displayRisks.length && `(${displayRisks.length}/${totalRisks})`}</span>
          </div>
          <div className="space-y-2">
            {displayRisks.map((risk, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-rose-400/5 border border-rose-400/10">
                <Icon name="error" size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-on-surface/60 text-sm leading-relaxed">{risk}</p>
              </div>
            ))}
            {isGated && totalRisks && totalRisks > 1 && (
              <div className="text-center text-xs text-on-surface/40 py-2">
                还有 {totalRisks - 1} 条风险提示
              </div>
            )}
          </div>
        </div>
      )}

      {/* 时间窗口 */}
      {timeWindow && (
        <div className="border-t border-outline/5 pt-4">
          <div className="flex items-center gap-2 mb-2 text-xs text-violet-400">
            <Icon name="schedule" size={12} />
            <span>时间窗口</span>
          </div>
          <div className="p-3 rounded-lg bg-violet-400/5 border border-violet-400/10">
            <p className="text-on-surface/60 text-sm leading-relaxed">{timeWindow}</p>
          </div>
        </div>
      )}
    </div>
  );
}