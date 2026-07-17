import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { creditApi } from '@/api/creditApi';
import { growthApi } from '@/api/growth';
import type { InviteStats, ReferralRewards } from '@/api/growth';
import { AuthModal } from '@/components/AuthModal';
import { MagneticButton } from '@/components/MagneticButton';
import { BottomNav } from '@/components/BottomNav';
import '@/lib/i18n';

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  // P2-3: 邀请相关
  const [inviteStats, setInviteStats] = useState<InviteStats | null>(null);
  const [referralRewards, setReferralRewards] = useState<ReferralRewards | null>(null);

  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const { orders, loadOrders } = useOrderStore();

  const MEMBERSHIP_LABELS: Record<string, { name: string; color: string }> = {
    admin: { name: '管理员', color: 'text-red-400' },
    free: { name: t('profilePage.membership.free'), color: 'text-on-surface-variant/60' },
    monthly: { name: t('profilePage.membership.monthly'), color: 'text-primary' },
    yearly: { name: t('profilePage.membership.yearly'), color: 'text-purple-400' },
  };
  const currentIdentity = user?.isAdmin ? 'admin' : (user?.membership || 'free');

  // 监听登录状态变化
  const prevAuthRef = useRef(isAuthenticated);

  const locationState = location.state as { triggerLogin?: boolean } | null;
  const triggerLogin = locationState?.triggerLogin;

  useEffect(() => {
    if (triggerLogin && !isAuthenticated) {
      setShowAuth(true);
      setAuthTab('login');
    }
  }, [triggerLogin, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      creditApi.getBalance()
        .then((res) => updateUser({ creditBalance: res.balance }))
        .catch(() => {});
      // P2-3: 加载邀请统计和返利
      growthApi.getInviteStats()
        .then(setInviteStats)
        .catch(() => {});
      growthApi.getReferralRewards()
        .then(setReferralRewards)
        .catch(() => {});
    }
  }, [isAuthenticated, loadOrders, updateUser]);

  // 监听登录状态变化，显示成功提示
  useEffect(() => {
    if (!prevAuthRef.current && isAuthenticated) {
      // 从未登录变为登录
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2000);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-lg mx-auto px-4 py-8 mobile-safe-top">

        <h1 className="text-xl font-bold text-on-surface mb-6">{t('profilePage.title')}</h1>

        {!isAuthenticated ? (

          <div className="space-y-4">
            <div className="bg-gradient-to-br from-surface-container-low/50 to-surface-container-lowest/50 border border-outline/20 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary-dim/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-on-surface-variant/80 mb-1">{t('profilePage.loginHint')}</p>

              <MagneticButton
                onClick={() => { setShowAuth(true); setAuthTab('login'); }}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary-dim text-on-primary rounded-xl font-medium hover:from-primary-light hover:to-primary transition-all shadow-lg shadow-primary/20"
              >
                {t('profilePage.loginNow')}
              </MagneticButton>

              <button
                onClick={() => { setShowAuth(true); setAuthTab('register'); }}
                className="w-full mt-3 py-2.5 text-sm text-on-surface-variant/60 hover:text-on-surface transition-colors"
              >
                {t('profilePage.noAccount')} {t('profilePage.registerOne')}
              </button>
            </div>
          </div>
        ) : (

          <div className="space-y-4">

            <div className="bg-gradient-to-br from-primary/20 to-primary-dim/10 border border-primary/20 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center text-on-primary font-bold text-lg">
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-on-surface">{user?.name || t('profilePage.userFallback')}</p>
                  <p className="text-xs text-on-surface-variant/60">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                <span className="text-xs text-on-surface-variant/60">{t('profilePage.currentIdentity')}</span>
                <span className={`text-sm font-medium ${MEMBERSHIP_LABELS[currentIdentity]?.color}`}>
                  {MEMBERSHIP_LABELS[currentIdentity]?.name}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low/30 border border-outline/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-on-surface">积分余额</h3>
                <span className="text-lg font-semibold text-primary">{user?.creditBalance ?? 0}</span>
              </div>
              <p className="text-xs text-on-surface-variant/60 mb-3">
                注册赠送积分，解锁潮汐、突破分析等深度模块。
              </p>
              <MagneticButton
                onClick={() => navigate('/membership')}
                className="w-full py-2 bg-surface-container-low/50 border border-outline/30 rounded-lg text-sm text-on-surface-variant/80 hover:text-on-surface hover:border-primary/30 transition-all"
              >
                查看积分 / 会员
              </MagneticButton>
            </div>

            {/* P2-3: 我的邀请 */}
            <div className="bg-surface-container-low/30 border border-outline/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-on-surface">我的邀请</h3>
                {inviteStats?.code && (
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {inviteStats.code}
                  </span>
                )}
              </div>

              {inviteStats ? (
                <div className="space-y-2">
                  {/* 3级裂变统计 */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-primary/5">
                      <p className="text-lg font-bold text-primary">{inviteStats.level1Count}</p>
                      <p className="text-[10px] text-on-surface-variant/50">直接邀请</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-primary/5">
                      <p className="text-lg font-bold text-primary">{inviteStats.level2Count}</p>
                      <p className="text-[10px] text-on-surface-variant/50">间接邀请</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-purple-500/5">
                      <p className="text-lg font-bold text-purple-400">{inviteStats.level3Count}</p>
                      <p className="text-[10px] text-on-surface-variant/50">再间接</p>
                    </div>
                  </div>

                  {/* 返利统计 */}
                  {referralRewards && referralRewards.totalReward > 0 && (
                    <div className="flex items-center justify-between py-1.5 border-t border-outline/10">
                      <span className="text-xs text-on-surface-variant/60">累计返利积分</span>
                      <span className="text-sm font-bold text-primary">+{referralRewards.totalReward}</span>
                    </div>
                  )}

                  {/* 下一档奖励 */}
                  {inviteStats.nextReward && (
                    <p className="text-[10px] text-on-surface-variant/40 text-center">
                      再邀请 {Math.max(0, (inviteStats.nextThreshold ?? 0) - inviteStats.usedCount)} 人可获 {inviteStats.nextReward}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant/40 text-center py-3">加载中...</p>
              )}

              <button
                onClick={() => {
                  if (inviteStats?.code) {
                    navigator.clipboard.writeText(`${import.meta.env.VITE_INVITE_DOMAIN}/life/?invite_code=${inviteStats.code}&utm_source=profile&utm_medium=share`);
                  }
                }}
                className="w-full mt-3 py-2 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20 rounded-lg text-xs text-primary/70 hover:from-primary/30 hover:to-primary/20 transition-all"
              >
                复制邀请链接
              </button>
            </div>

            <div className="bg-surface-container-low/30 border border-outline/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-on-surface">{t('profilePage.orders.title')}</h3>
                <span className="text-xs text-on-surface-variant/50">{t('profilePage.orders.count', { count: orders?.length ?? 0 })}</span>
              </div>

              {!orders || orders.length === 0 ? (
                <p className="text-xs text-on-surface-variant/50 text-center py-3">{t('profilePage.orders.empty')}</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order.orderId} className="flex items-center justify-between py-2 border-b border-outline/15 last:border-0">
                      <div>
                        <p className="text-xs text-on-surface-variant/80">{order.productId}</p>
                        <p className="text-[10px] text-on-surface-variant/50">¥{order.amount}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        order.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                        order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-gray-500/10 text-on-surface-variant/60'
                      }`}>
                        {order.status === 'paid' ? t('profilePage.orderStatus.paid') :
                         order.status === 'pending' ? t('profilePage.orderStatus.pending') : order.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <MagneticButton
                onClick={() => navigate('/membership')}
                className="w-full mt-3 py-2 bg-surface-container-low/50 border border-outline/30 rounded-lg text-sm text-on-surface-variant/80 hover:text-on-surface hover:border-primary/30 transition-all"
              >
                {t('profilePage.viewPlans')}
              </MagneticButton>
            </div>

            <div className="bg-surface-container-low/30 border border-outline/20 rounded-xl p-4">
              <h3 className="text-sm font-medium text-on-surface mb-3">{t('profilePage.myInfo')}</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant/60">{t('profilePage.email')}</span>
                  <span className="text-xs text-on-surface-variant/90">{user?.email || t('profilePage.notBound')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant/60">{t('profilePage.phone')}</span>
                  <span className="text-xs text-on-surface-variant/90">{user?.phone || t('profilePage.notBound')}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {[
                { icon: '📜', label: t('profilePage.menu.history'), route: '/history' },
                { icon: '📚', label: t('profilePage.menu.library'), route: '/library' },
                { icon: '💰', label: t('profilePage.menu.pricing'), route: '/pricing' },
                { icon: '🎫', label: t('profilePage.menu.feedback'), route: '/feedback' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.route !== '#' && navigate(item.route)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface-container-low/30 transition-colors text-left"
                >
                  <span>{item.icon}</span>
                  <span className="text-sm text-on-surface-variant/80 flex-1">{item.label}</span>
                  <svg className="w-4 h-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}

              {/* 切换账号按钮 */}
              <button
                onClick={() => {
                  logout();
                  setShowAuth(true);
                  setAuthTab('login');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {t('profilePage.switchAccount')}
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('profilePage.logout')}
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultTab={authTab}
        onLoginSuccess={() => setShowAuth(false)}
      />

      {/* 登录成功提示 */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary-dim text-on-primary font-medium shadow-lg shadow-primary/30 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t('profilePage.loginSuccess')}
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
