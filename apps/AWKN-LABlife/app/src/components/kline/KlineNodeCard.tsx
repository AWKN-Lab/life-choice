/**
 * KlineNodeCard — V2 统一节点卡（机会/风险/转折）
 *
 * 替代 V1 中分散的 OpportunityCard / RiskCard / TurnCard。
 * 根据 nodeType 自动着色，gated=true 时显示模糊遮罩 + 解锁按钮。
 *
 * Props:
 *   node           — KlineNode V2 节点
 *   gated?         — 权益受限（模糊显示 + 解锁）
 *   asked?         — 已问事，按钮置灰
 *   onAsk?         — 问事回调
 *   onViewEvidence? — 查看证据回调
 */

import { useState } from 'react';
import { NODE_TYPE_LABELS } from '@/types/kline-v2';
import type { KlineNode } from '@/types/kline-v2';
import { cn } from '@/lib/utils';

type OutcomeResult = 'occurred' | 'not_occurred' | 'partial';

const OUTCOME_OPTIONS: { value: OutcomeResult; label: string; icon: string }[] = [
  { value: 'occurred', label: '已发生', icon: 'check_circle' },
  { value: 'partial', label: '部分发生', icon: 'change_circle' },
  { value: 'not_occurred', label: '未发生', icon: 'cancel' },
];

// ============================================================
// 节点类型样式
// ============================================================

interface NodeStyle {
  /** 主色 */
  color: string;
  /** 边框 class */
  borderClass: string;
  /** 背景 class */
  bgClass: string;
  /** 文字 class（标题色） */
  textClass: string;
  /** score 高亮 */
  scoreBgClass: string;
}

const NODE_STYLES: Record<KlineNode['nodeType'], NodeStyle> = {
  opportunity: {
    color: '#10b981', // emerald-500
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-500/5',
    textClass: 'text-emerald-300',
    scoreBgClass: 'bg-emerald-500/12',
  },
  risk: {
    color: '#f43f5e', // rose-500
    borderClass: 'border-rose-500/30',
    bgClass: 'bg-rose-500/5',
    textClass: 'text-rose-300',
    scoreBgClass: 'bg-rose-500/12',
  },
  turn: {
    color: '#f59e0b', // amber-500
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/5',
    textClass: 'text-amber-300',
    scoreBgClass: 'bg-amber-500/12',
  },
};

// ============================================================
// Props
// ============================================================

export interface KlineNodeCardProps {
  node: KlineNode;
  /** 权益受限：模糊 + 解锁遮罩 */
  gated?: boolean;
  /** 已问事，按钮置灰 */
  asked?: boolean;
  onAsk?: (node: KlineNode) => void;
  onViewEvidence?: (node: KlineNode) => void;
  /** P3-04: 结果回写回调 */
  onWriteOutcome?: (node: KlineNode, result: OutcomeResult) => void;
  /** P3-04: 已回写的结果 */
  writtenOutcome?: OutcomeResult | null;
  className?: string;
}

// ============================================================
// 组件
// ============================================================

export function KlineNodeCard({
  node,
  gated = false,
  asked = false,
  onAsk,
  onViewEvidence,
  onWriteOutcome,
  writtenOutcome = null,
  className,
}: KlineNodeCardProps) {
  const style = NODE_STYLES[node.nodeType];
  const typeLabel = NODE_TYPE_LABELS[node.nodeType];
  const confidencePct = Math.round(node.confidence * 100);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-4',
        style.borderClass,
        style.bgClass,
        className,
      )}
    >
      {/* 头部：节点类型 + 月份 + 分数 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                style.scoreBgClass,
                style.textClass,
              )}
            >
              {typeLabel}
            </span>
            <span className="text-xs text-gray-500">{node.monthLabel}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-300">{node.summary}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={cn('text-2xl font-bold', style.textClass)}>{node.score.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">/ 100</p>
        </div>
      </div>

      {/* 置信度 + 证据数量 */}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-500">
        <span>置信度 {confidencePct}%</span>
        <span>·</span>
        <span>{node.evidenceRefs.length} 条证据</span>
      </div>

      {/* 证据 chips（前 3 条） */}
      {!gated && node.evidenceRefs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.evidenceRefs.slice(0, 3).map((ref, i) => (
            <span
              key={`${ref}-${i}`}
              className="rounded bg-on-surface/[0.04] px-1.5 py-0.5 text-[10px] text-gray-400"
              title={ref}
            >
              {ref.length > 20 ? `${ref.slice(0, 18)}…` : ref}
            </span>
          ))}
          {node.evidenceRefs.length > 3 && (
            <span className="rounded bg-on-surface/[0.04] px-1.5 py-0.5 text-[10px] text-gray-500">
              +{node.evidenceRefs.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {!gated && (
        <div className="mt-3 flex items-center gap-2">
          {onAsk && (
            <button
              onClick={() => !asked && onAsk(node)}
              disabled={asked}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                asked
                  ? 'cursor-not-allowed bg-on-surface/[0.04] text-gray-500'
                  : 'border border-primary/40 bg-primary/10 text-primary hover:border-primary/60 hover:bg-primary/20',
              )}
            >
              <span className="material-symbols-outlined text-sm">forum</span>
              {asked ? '已问事' : '问此事'}
            </button>
          )}
          {onViewEvidence && (
            <button
              onClick={() => onViewEvidence(node)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-outline/20 px-3 py-2 text-xs text-on-surface-variant transition-colors hover:border-outline/40 hover:bg-on-surface/[0.04]"
            >
              <span className="material-symbols-outlined text-sm">fact_check</span>
              证据
            </button>
          )}
        </div>
      )}

      {/* P3-04: 结果回写区域 */}
      {!gated && onWriteOutcome && (
        <div className="mt-2">
          {writtenOutcome ? (
            <div className="flex items-center gap-1.5 rounded-lg bg-on-surface/[0.04] px-3 py-1.5 text-[11px] text-gray-400">
              <span className="material-symbols-outlined text-sm">
                {OUTCOME_OPTIONS.find((o) => o.value === writtenOutcome)?.icon ?? 'task_alt'}
              </span>
              已标记：{OUTCOME_OPTIONS.find((o) => o.value === writtenOutcome)?.label ?? writtenOutcome}
            </div>
          ) : showOutcomeForm ? (
            <div className="flex items-center gap-1.5">
              {OUTCOME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onWriteOutcome(node, opt.value);
                    setShowOutcomeForm(false);
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-outline/20 px-2 py-1.5 text-[11px] text-gray-300 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="material-symbols-outlined text-xs">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowOutcomeForm(false)}
                className="px-2 py-1.5 text-[11px] text-gray-500 hover:text-gray-300"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowOutcomeForm(true)}
              className="flex items-center gap-1 text-[11px] text-gray-500 transition-colors hover:text-gray-300"
            >
              <span className="material-symbols-outlined text-xs">edit_note</span>
              标记实际结果
            </button>
          )}
        </div>
      )}

      {/* gated 模糊遮罩 */}
      {gated && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-on-surface/60 backdrop-blur-sm">
          <span className="material-symbols-outlined text-2xl text-primary">lock</span>
          <p className="text-xs text-primary">解锁会员查看完整节点</p>
        </div>
      )}
    </div>
  );
}

export default KlineNodeCard;
