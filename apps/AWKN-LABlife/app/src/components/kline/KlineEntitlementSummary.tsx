/**
 * KlineEntitlementSummary — 权益绑定说明（P3-08）
 *
 * 展示当前用户在 K线 V2 系统中的权益状态：
 *   - canViewDomainLines：能否查看副线（事业/财富/情感）
 *   - canViewAllNodes：能否查看全部节点
 *   - canAskNode：能否进行节点问事
 *
 * 设计：
 *   - 纯展示组件，直接消费 ViewModel.entitlements
 *   - 用于透明化权益边界，避免用户对"为什么看不到 X"产生疑惑
 *   - 配套 CTA：未解锁时跳转到 /price
 */

import { useNavigate } from 'react-router-dom';
import type { KlineProductViewModelV2 } from '@/types/kline-v2';
import { trackFunnel } from '@/utils/analytics';

export interface KlineEntitlementSummaryProps {
  viewModel: KlineProductViewModelV2;
}

interface EntitlementItem {
  key: keyof KlineProductViewModelV2['entitlements'];
  label: string;
  description: string;
  lockedHint: string;
}

const ENTITLEMENT_ITEMS: EntitlementItem[] = [
  {
    key: 'canViewDomainLines',
    label: '副线（事业/财富/情感）',
    description: '查看事业、财富、情感三条副线的趋势变化',
    lockedHint: '免费版仅显示主线趋势',
  },
  {
    key: 'canViewAllNodes',
    label: '全部节点',
    description: '查看全部机会/风险/转折节点（完整列表）',
    lockedHint: '免费版仅显示前 1 个机会 + 1 个风险节点',
  },
  {
    key: 'canAskNode',
    label: '节点问事',
    description: '就特定节点向 AI 提问，获取更深入的分析建议',
    lockedHint: '免费版不支持节点问事',
  },
];

export function KlineEntitlementSummary({ viewModel }: KlineEntitlementSummaryProps) {
  const navigate = useNavigate();
  const entitlements = viewModel.entitlements;

  // 是否所有权益都已解锁
  const allUnlocked = ENTITLEMENT_ITEMS.every((item) => entitlements[item.key]);

  const handleUpgrade = () => {
    trackFunnel('kline_v2_entitlement_upgrade_clicked', {
      allUnlocked,
      canViewDomainLines: entitlements.canViewDomainLines,
      canViewAllNodes: entitlements.canViewAllNodes,
      canAskNode: entitlements.canAskNode,
    });
    navigate('/price');
  };

  return (
    <div className="space-y-3">
      {/* ── 状态汇总 ── */}
      <div
        className={`rounded-xl border p-3 ${
          allUnlocked
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-outlined text-sm ${
              allUnlocked ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {allUnlocked ? 'verified' : 'workspace_premium'}
          </span>
          <p
            className={`text-xs font-medium ${
              allUnlocked ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {allUnlocked ? '已解锁全部权益' : '当前为免费版权益'}
          </p>
        </div>
        {!allUnlocked && (
          <p className="mt-1.5 text-[11px] text-amber-200/70">
            升级会员可解锁副线、全部节点与节点问事功能
          </p>
        )}
      </div>

      {/* ── 权益清单 ── */}
      <ul className="space-y-2">
        {ENTITLEMENT_ITEMS.map((item) => {
          const unlocked = entitlements[item.key];
          return (
            <li
              key={item.key}
              className="rounded-lg border border-outline/10 bg-on-surface/[0.02] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        unlocked ? 'text-emerald-300' : 'text-gray-500'
                      }`}
                    >
                      {unlocked ? 'check_circle' : 'lock'}
                    </span>
                    <p className="text-xs font-medium text-on-surface">{item.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">{item.description}</p>
                  {!unlocked && (
                    <p className="mt-1 text-[10px] text-amber-300/80">
                      ⚠ {item.lockedHint}
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    unlocked
                      ? 'bg-emerald-500/12 text-emerald-300'
                      : 'bg-on-surface/[0.06] text-gray-400'
                  }`}
                >
                  {unlocked ? '已解锁' : '未解锁'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── 升级 CTA ── */}
      {!allUnlocked && (
        <button
          onClick={handleUpgrade}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-sm">workspace_premium</span>
          升级会员解锁全部权益
        </button>
      )}
    </div>
  );
}

export default KlineEntitlementSummary;
