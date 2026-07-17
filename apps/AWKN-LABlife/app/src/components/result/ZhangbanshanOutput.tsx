import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { ZhangbanshanAvatar } from '@/components/common/ZhangbanshanAvatar';
import { paymentApi } from '@/api/payment';
import type { UnifiedResult, LifeStageContext } from './resultTypes';

const CONSISTENCY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  consistent: { label: '一致', color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
  undetermined: { label: '待定', color: 'text-amber-300', bg: 'bg-amber-400/15' },
  conflicting: { label: '冲突', color: 'text-rose-300', bg: 'bg-rose-400/15' },
};

// 任务 2.4: 6态状态窗口配色映射
const STAGE_STYLE_MAP: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  breakthrough: { color: 'text-emerald-300', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', icon: 'rocket_launch' },
  attack: { color: 'text-sky-300', bg: 'bg-sky-400/10', border: 'border-sky-400/30', icon: 'trending_up' },
  buildup: { color: 'text-amber-300', bg: 'bg-amber-400/10', border: 'border-amber-400/30', icon: 'battery_charging_full' },
  pullback: { color: 'text-rose-300', bg: 'bg-rose-400/10', border: 'border-rose-400/30', icon: 'trending_down' },
  repair: { color: 'text-violet-300', bg: 'bg-violet-400/10', border: 'border-violet-400/30', icon: 'healing' },
  wait: { color: 'text-slate-300', bg: 'bg-slate-400/10', border: 'border-slate-400/30', icon: 'hourglass_empty' },
};

// 潮汐三组等级配色
const TIDE_LEVEL_STYLE: Record<string, { color: string; bg: string }> = {
  high: { color: 'text-emerald-300', bg: 'bg-emerald-400/15' },
  mid: { color: 'text-amber-300', bg: 'bg-amber-400/15' },
  low: { color: 'text-rose-300', bg: 'bg-rose-400/15' },
};

function getTideLevelStyle(level: string): { color: string; bg: string } {
  const l = (level || '').toLowerCase();
  if (l.includes('high') || l.includes('强') || l.includes('高')) return TIDE_LEVEL_STYLE.high;
  if (l.includes('low') || l.includes('弱') || l.includes('低')) return TIDE_LEVEL_STYLE.low;
  return TIDE_LEVEL_STYLE.mid;
}

/**
 * 任务 2.4: 此事所处状态窗口卡片
 * 展示 K线6态 + 潮汐12维三组判断 + 综合相位
 */
function LifeStageCard({ lifeStage }: { lifeStage: LifeStageContext }) {
  const { klineStage, tideStatus } = lifeStage;
  if (!klineStage && !tideStatus) return null;

  const stageStyle = klineStage ? (STAGE_STYLE_MAP[klineStage.stage] || STAGE_STYLE_MAP.wait) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/5 to-violet-500/5 p-4 mb-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon name="insights" size={18} className="text-cyan-300" />
        <span className="text-sm text-cyan-300 font-medium">此事所处状态窗口</span>
        <span className="text-[10px] text-on-surface/40 ml-auto">来自 K线/潮汐图</span>
      </div>

      <div className="space-y-3">
        {/* K线 6态状态 */}
        {klineStage && stageStyle && (
          <div className={`rounded-lg border ${stageStyle.border} ${stageStyle.bg} p-3`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name={stageStyle.icon} size={16} className={stageStyle.color} />
                <span className={`text-sm font-semibold ${stageStyle.color}`}>{klineStage.stageLabel}</span>
              </div>
              {klineStage.tideScore != null && (
                <span className="text-xs text-on-surface/50">潮汐分 {klineStage.tideScore}</span>
              )}
            </div>
            {klineStage.reason && (
              <p className="text-xs text-on-surface/70 leading-relaxed mb-2">{klineStage.reason}</p>
            )}
            {(klineStage.actionAdvice || klineStage.windowTip) && (
              <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                {klineStage.actionAdvice && (
                  <p className="text-xs text-on-surface/65 leading-relaxed">
                    <span className="text-on-surface/40">行动建议：</span>{klineStage.actionAdvice}
                  </p>
                )}
                {klineStage.windowTip && (
                  <p className="text-xs text-on-surface/65 leading-relaxed">
                    <span className="text-on-surface/40">窗口提示：</span>{klineStage.windowTip}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 潮汐 12维状态 */}
        {tideStatus && (
          <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="waves" size={16} className="text-violet-300" />
              <span className="text-sm text-violet-300 font-medium">潮汐相位</span>
              {tideStatus.quadrant && (
                <span className="text-[10px] text-on-surface/40 ml-auto">象限 {tideStatus.quadrant}</span>
              )}
            </div>
            {tideStatus.phaseJudgment && (
              <p className="text-xs text-on-surface/75 leading-relaxed mb-3 font-medium">{tideStatus.phaseJudgment}</p>
            )}

            {/* 三组判断：时/位/心 */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: '时（时机）', data: tideStatus.timeStatus },
                { label: '位（根基）', data: tideStatus.positionStatus },
                { label: '心（心能）', data: tideStatus.mindStatus },
              ].map(({ label, data }) => {
                if (!data) return null;
                const style = getTideLevelStyle(data.level || data.label || '');
                return (
                  <div key={label} className={`rounded ${style.bg} p-2 text-center`}>
                    <div className="text-[10px] text-on-surface/50 mb-0.5">{label}</div>
                    <div className={`text-xs font-medium ${style.color}`}>{data.label}</div>
                    <div className="text-[10px] text-on-surface/40 mt-0.5">{data.score}</div>
                  </div>
                );
              })}
            </div>

            {(tideStatus.shortDirective || tideStatus.actionAdvice || tideStatus.windowTip) && (
              <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                {tideStatus.shortDirective && (
                  <p className="text-xs text-on-surface/65 leading-relaxed">
                    <span className="text-on-surface/40">短指令：</span>{tideStatus.shortDirective}
                  </p>
                )}
                {tideStatus.actionAdvice && (
                  <p className="text-xs text-on-surface/65 leading-relaxed">
                    <span className="text-on-surface/40">行动建议：</span>{tideStatus.actionAdvice}
                  </p>
                )}
                {tideStatus.windowTip && (
                  <p className="text-xs text-on-surface/65 leading-relaxed">
                    <span className="text-on-surface/40">窗口提示：</span>{tideStatus.windowTip}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ZhangbanshanOutput({ result }: { result: UnifiedResult }) {
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  // 任务 3.5: ¥1 深推状态
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveMessage, setDeepDiveMessage] = useState<string | null>(null);
  const output = result.zhangbanshan_output;
  if (!output) return null;

  const consistency = output.agent_consistency ? CONSISTENCY_MAP[output.agent_consistency] : null;
  // 任务 2.4: 注入人生状态窗口卡片
  const lifeStage = output.life_stage;

  // 任务 3.5: ¥1 深推解锁完整结果 + 3 次追问额度
  const handleDeepDive = async () => {
    if (!result.record_id || deepDiveLoading) return;
    setDeepDiveLoading(true);
    setDeepDiveMessage(null);
    try {
      const res = await paymentApi.createDeepDiveOrder(result.record_id);
      if (res.alreadyPaid) {
        setDeepDiveMessage(res.message || '此记录已深推，无需重复支付');
        setDeepDiveLoading(false);
        return;
      }
      if (res.paymentUrl) {
        // 跳转到 Stripe 支付页；关闭支付页也不丢权益（webhook 兜底）
        window.location.href = res.paymentUrl;
      } else {
        setDeepDiveMessage('支付链接生成失败，请稍后重试');
        setDeepDiveLoading(false);
      }
    } catch (err) {
      setDeepDiveMessage((err as Error).message || '深推下单失败，请稍后重试');
      setDeepDiveLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card p-5 md:p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-primary text-lg md:text-xl font-semibold flex items-center gap-2">
          <Icon name="account_tree" size={20} />
          张半山 · 三段式输出
        </h2>
        {consistency && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${consistency.color} ${consistency.bg}`}>
            {consistency.label}
          </span>
        )}
      </div>

      {/* 任务 2.4: 此事所处状态窗口（K线6态 + 潮汐12维） */}
      {lifeStage && <LifeStageCard lifeStage={lifeStage} />}

      <div className="space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="gavel" size={18} className="text-primary" />
            <span className="text-sm text-primary font-medium">判语</span>
          </div>
          <p className="text-base md:text-lg text-on-surface leading-relaxed">{output.judgment}</p>
        </div>

        {/* U-P0-3: premise 字段渲染 */}
        {output.premise && (
          <div className="rounded-xl border border-slate-400/20 bg-slate-400/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="info" size={16} className="text-slate-300" />
              <span className="text-xs text-slate-300 font-medium">前提</span>
            </div>
            <p className="text-sm text-on-surface/60 leading-relaxed">{output.premise}</p>
          </div>
        )}

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="payments" size={18} className="text-amber-300" />
            <span className="text-sm text-amber-300 font-medium">代价</span>
          </div>
          {output.cost ? (
            <p className="text-sm text-on-surface/75 leading-relaxed">{output.cost}</p>
          ) : (
            <p className="text-xs text-on-surface/50 leading-relaxed animate-pulse">
              深度推演进行中，完整代价分析稍后呈现…
            </p>
          )}
        </div>

        <div className="rounded-xl border border-outline/10 bg-on-surface/[0.04] overflow-hidden">
          <button
            onClick={() => setReasoningExpanded(!reasoningExpanded)}
            className="w-full p-4 flex items-center justify-between text-sm text-on-surface/70 hover:text-primary transition-colors"
          >
            <div className="flex items-center gap-2">
              <ZhangbanshanAvatar size="md" />
              <span>推理溯源</span>
            </div>
            <Icon name={reasoningExpanded ? 'expand_less' : 'expand_more'} size={20} />
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
                <div className="px-4 pb-4">
                  <p className="text-sm text-on-surface/65 leading-relaxed">{output.reasoning_trace}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-outline/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs text-on-surface/40 mb-1">主 agent</div>
            <div className="text-sm text-on-surface font-medium">{output.primary_agent}</div>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs text-on-surface/40 mb-1">辅助 agent</div>
            <div className="text-sm text-on-surface font-medium">{output.secondary_agent || '-'}</div>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs text-on-surface/40 mb-1">调度依据</div>
            <div className="text-sm text-on-surface/70 leading-relaxed">{output.schedule_reason}</div>
          </div>
        </div>
      </div>

      {output.arbitration_note && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon name="balance" size={18} className="text-rose-300" />
            <span className="text-sm text-rose-300 font-medium">仲裁说明</span>
          </div>
          <p className="text-sm text-on-surface/70 leading-relaxed">{output.arbitration_note}</p>
        </motion.div>
      )}

      {/* 任务 3.5: ¥1 单事深推 — 解锁完整结果 + 3 次追问额度 */}
      {result.record_id && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 rounded-xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="auto_awesome" size={18} className="text-amber-300" />
                <span className="text-sm text-amber-300 font-semibold">¥1 单事深推</span>
              </div>
              <p className="text-xs text-on-surface/60 leading-relaxed">
                解锁当前这件事的完整推演结果 + 获得 3 次追问额度。支付后自动解锁，关闭页面也不丢权益。
              </p>
            </div>
            <button
              onClick={handleDeepDive}
              disabled={deepDiveLoading}
              className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm text-black font-bold transition-colors flex items-center gap-1.5"
            >
              {deepDiveLoading ? (
                <>
                  <span className="material-icons text-base animate-spin">progress_activity</span>
                  下单中…
                </>
              ) : (
                <>
                  <span className="material-icons text-base">bolt</span>
                  ¥1 立即深推
                </>
              )}
            </button>
          </div>
          {deepDiveMessage && (
            <p className="mt-2 text-xs text-amber-300/80">{deepDiveMessage}</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}