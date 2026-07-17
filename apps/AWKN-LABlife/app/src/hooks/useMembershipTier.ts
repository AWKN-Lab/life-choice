import { useAuthStore } from '@/store/authStore';

export type MembershipViewTier = 'free' | 'monthly' | 'yearly';

/**
 * 获取当前用户会员等级（含 isAdmin 提权：管理员视为 yearly）
 * 统一 ResultPage / HistoryPage 的会员等级判断逻辑
 */
export function useMembershipTier(): MembershipViewTier {
  const user = useAuthStore((s) => s.user);
  if (!user) return 'free';
  const level = user.membership || user.plan || 'free';
  if (level === 'yearly' || user.isAdmin) return 'yearly';
  if (level === 'monthly') return 'monthly';
  return 'free';
}
