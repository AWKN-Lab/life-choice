/**
 * PaywallOverlay — 积分/会员门控遮罩
 *
 * 当用户积分不足且非会员时，显示解锁引导：
 * - 当前积分余额
 * - 解锁所需积分
 * - [花积分解锁] 按钮
 * - [升级会员 不限次] 链接
 */

import { useState } from 'react';
import { creditApi } from '@/api/creditApi';
import { membershipApi } from '@/api/membership';
import { useAuthStore } from '@/store/authStore';

interface PaywallOverlayProps {
  moduleId: string;
  creditsNeeded: number;
  creditBalance?: number;
  requiredPlan?: string;
  message?: string;
  onUnlocked: () => void;
}

export function PaywallOverlay({
  moduleId,
  creditsNeeded,
  creditBalance: initialBalance,
  requiredPlan,
  message,
  onUnlocked,
}: PaywallOverlayProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const balance = initialBalance ?? user?.creditBalance ?? 0;
  const canAfford = balance >= creditsNeeded;

  const handleUnlock = async () => {
    setUnlocking(true);
    setError(null);
    try {
      const result = await membershipApi.unlockModule(moduleId);
      if (result.success) {
        // 更新本地积分
        if (result.creditBalance !== undefined) {
          updateUser({ creditBalance: result.creditBalance });
        }
        onUnlocked();
      } else {
        setError(result.message || '解锁失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解锁失败，请重试');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] px-6 py-12">
      {/* 图标 */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
        <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>

      {/* 标题 */}
      <h3 className="mb-2 text-lg font-semibold text-on-surface">
        解锁完整潮汐数据
      </h3>

      {/* 积分信息 */}
      <div className="mb-6 space-y-1 text-center text-sm text-gray-400">
        <p>
          当前积分：<span className="font-medium text-blue-300">{balance}</span>
          {' / '}
          需要：<span className="font-medium text-amber-300">{creditsNeeded}</span>
        </p>
        {message && <p className="text-xs text-gray-500">{message}</p>}
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="mb-4 rounded bg-red-500/10 px-4 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {/* 操作按钮 */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        {canAfford ? (
          <button
            onClick={handleUnlock}
            disabled={unlocking}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {unlocking ? '解锁中...' : `花 ${creditsNeeded} 积分解锁`}
          </button>
        ) : (
          <p className="rounded bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-300">
            积分不足，还差 {creditsNeeded - balance} 积分
          </p>
        )}

        <a
          href="/life/membership"
          className="w-full rounded-lg border border-outline/10 px-4 py-3 text-center text-sm text-gray-300 transition-colors hover:border-outline/20 hover:text-on-surface"
        >
          升级会员 · 不限次查看
          {requiredPlan && (
            <span className="ml-1 text-xs text-gray-500">
              ({requiredPlan === 'year' ? '年卡' : '月卡'})
            </span>
          )}
        </a>
      </div>

      {/* 邀请提示 */}
      <p className="mt-6 text-xs text-gray-600">
        邀请好友注册，双方各得 3 积分
      </p>
    </div>
  );
}
