/**
 * CreditBalance — 积分余额指示器
 *
 * 显示在 TidePage header 右侧，点击展开积分面板：
 * - 当前余额
 * - 最近消费记录
 * - [邀请好友 +3] 按钮
 * - [升级会员 不限次] 链接
 */

import { useState, useEffect, useRef } from 'react';
import { creditApi, CREDIT_REASON_LABELS } from '@/api/creditApi';
import type { CreditTransaction } from '@/api/creditApi';
import { useAuthStore } from '@/store/authStore';

export function CreditBalance() {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const user = useAuthStore((s) => s.user);
  const panelRef = useRef<HTMLDivElement>(null);

  const balance = user?.creditBalance ?? 0;

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 展开时加载流水
  useEffect(() => {
    if (!open) return;
    setLoadingTx(true);
    creditApi.getBalance()
      .then((res) => setTransactions(res.recentTransactions ?? []))
      .catch(() => {})
      .finally(() => setLoadingTx(false));
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full bg-on-surface/5 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-on-surface/10"
      >
        <span className="text-blue-400">&#x1F48E;</span>
        <span>{balance}</span>
      </button>

      {/* 展开面板 */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-outline/10 bg-[#1a1a2e] p-4 shadow-xl">
          {/* 余额 */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">积分余额</span>
            <span className="text-lg font-semibold text-blue-400">{balance}</span>
          </div>

          {/* 快捷操作 */}
          <div className="mb-3 flex gap-2">
            <a
              href="/life/membership"
              className="flex-1 rounded-lg bg-blue-600/20 px-3 py-2 text-center text-xs text-blue-300 transition-colors hover:bg-blue-600/30"
            >
              升级会员
            </a>
            <button
              onClick={() => {
                // TODO: 触发邀请流程
                navigator.clipboard.writeText(window.location.origin + '/life/register?invite=' + (user?.id ?? ''));
              }}
              className="flex-1 rounded-lg bg-on-surface/5 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-on-surface/10"
            >
              邀请好友 +3
            </button>
          </div>

          {/* 最近流水 */}
          <div className="border-t border-outline/5 pt-3">
            <p className="mb-2 text-xs text-gray-500">最近记录</p>
            {loadingTx ? (
              <p className="text-xs text-gray-600">加载中...</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-gray-600">暂无记录</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {CREDIT_REASON_LABELS[tx.reason] ?? tx.reason}
                    </span>
                    <span className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
