/**
 * KlineReminderBanner — 回访提醒横幅（P3-05）
 *
 * 触发条件：
 *   - 当 ViewModel 中存在月份已过、但用户尚未回写实际结果的节点
 *   - 显示"待回写"提示横幅，CTA 滚动到节点区
 *
 * 设计：
 *   - 纯前端实现（基于 ViewModel 与 writtenOutcomes Map 计算）
 *   - 不打扰已结案/无待回写节点的用户
 *   - 可关闭（sessionStorage 记忆关闭状态，刷新页内不重复出现）
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import type { KlineProductViewModelV2, KlineNode } from '@/types/kline-v2';
import { trackFunnel } from '@/utils/analytics';

export interface KlineReminderBannerProps {
  viewModel: KlineProductViewModelV2;
  /** 已回写的节点结果（nodeId → result） */
  writtenOutcomes: Map<string, 'occurred' | 'not_occurred' | 'partial'>;
  /** 滚动到节点区的回调 */
  onScrollToNodes?: () => void;
}

// ── 当前月份（YYYY-MM） ──
function currentMonthLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ── sessionStorage key（页内关闭状态） ──
const DISMISS_KEY = 'kline_reminder_dismissed_at';

export function KlineReminderBanner({
  viewModel,
  writtenOutcomes,
  onScrollToNodes,
}: KlineReminderBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const dismissedRef = useRef<string | null>(null);

  // ── 挂载时读取 sessionStorage 关闭状态 ──
  useEffect(() => {
    try {
      dismissedRef.current = sessionStorage.getItem(DISMISS_KEY);
      if (dismissedRef.current) {
        setDismissed(true);
      }
    } catch {
      // sessionStorage 不可用时静默降级
    }
  }, []);

  // ── 计算待回写节点 ──
  const pendingNodes = useMemo<KlineNode[]>(() => {
    const nowMonth = currentMonthLabel();
    const all = [
      ...viewModel.windows.opportunity,
      ...viewModel.windows.risk,
    ];
    return all.filter((n) => {
      // 月份已过
      if (n.monthLabel >= nowMonth) return false;
      // 尚未回写
      if (writtenOutcomes.has(n.id)) return false;
      return true;
    });
  }, [viewModel, writtenOutcomes]);

  const pendingCount = pendingNodes.length;

  // ── 关闭（sessionStorage 记忆，避免页内重复打扰） ──
  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      // sessionStorage 不可用时静默降级
    }
    trackFunnel('kline_v2_reminder_dismissed', { pendingCount });
  };

  // ── 点击 CTA ──
  const handleReview = () => {
    trackFunnel('kline_v2_reminder_review_clicked', { pendingCount });
    onScrollToNodes?.();
  };

  // ── 无待回写节点 → 不显示 ──
  if (pendingCount === 0) return null;

  // ── 已关闭 → 不显示 ──
  if (dismissed) return null;

  return (
    <div className="mx-4 my-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined mt-0.5 text-amber-300">
          notifications_active
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-200">
            您有 {pendingCount} 个待回写的结果
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-200/70">
            标记过往节点的实际发生情况，可帮助系统提升未来预测的准确度
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleReview}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/30"
            >
              立即回写
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-3 py-1.5 text-xs text-amber-200/60 transition-colors hover:text-amber-200"
            >
              稍后
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KlineReminderBanner;
