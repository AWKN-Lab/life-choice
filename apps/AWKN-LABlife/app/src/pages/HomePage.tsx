import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { trackEvent } from '@/lib/analytics';
import { trackFunnel } from '@/utils/analytics';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import { languages } from '@/lib/i18n';
import HeroBanner from '@/components/home/HeroBanner';
import MetaphysicsShowcase from '@/components/home/MetaphysicsShowcase';
import FrontdeskChat from '@/components/frontdesk/FrontdeskChat';
import { useThemeStore } from '@/store/themeStore';
import { getSocket } from '@/lib/websocket';
import { Icon } from '@/components/ui/Icon';
import { EASE_OUT_EXPO } from '@/lib/motion-variants';

export function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLanguage, setLanguage } = useLanguageStore();
  const { isAuthenticated } = useAuthStore();
  const isEnglish = currentLanguage === 'en';
  const { mode: themeMode } = useThemeStore();

  // 弹窗状态
  const [activeFrontdesk, setActiveFrontdesk] = useState<null | 'naming' | 'question'>(null);

  // P3-1 回访系统：待回访列表
  const [pendingFollowUps, setPendingFollowUps] = useState<Array<{
    followUpId: string;
    recordId: string;
    question: string;
    scheduledAt: string;
  }>>([]);

  // 页面曝光
  useEffect(() => {
    trackEvent('home_view');
  }, []);

  // P3-1 回访系统：监听 follow_up_reminder WS 事件
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();
    const handler = (data: { followUpId: string; recordId: string; question: string; scheduledAt: string }) => {
      setPendingFollowUps(prev => {
        if (prev.some(f => f.followUpId === data.followUpId)) return prev;
        return [...prev, data];
      });
    };
    socket.on('follow_up_reminder', handler);
    return () => { socket.off('follow_up_reminder', handler); };
  }, [isAuthenticated]);

  // entry 参数消费：/?entry=kline|naming|question → PersonalizedRecommendations.tsx
  useEffect(() => {
    const entryParam = searchParams.get('entry');
    if (entryParam === 'kline') {
      navigate('/kline');
    } else if (entryParam === 'naming') {
      setActiveFrontdesk('naming');
    } else if (entryParam === 'question') {
      setActiveFrontdesk('question');
    }
  }, [navigate, searchParams]);

  const handleEntryClick = (entryKey: 'kline' | 'naming' | 'question') => {
    if (entryKey === 'kline') {
      trackFunnel('funnel_home_to_kline');
      navigate('/kline');
      return;
    }
    trackFunnel('funnel_home_to_ask', { entry: entryKey });
    setActiveFrontdesk(entryKey);
  };

  const isDark = themeMode === 'dark';

  return (
    <div className="page-container relative min-h-screen overflow-hidden bg-surface-base">
      {/* 底图层：暗色主题星空背景（P1-6/P2-2：纯 CSS 替代外部图片 URL） */}
      {isDark && (
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface to-surface z-10" />
          <div
            className="w-full h-full opacity-40 mix-blend-screen"
            style={{
              background: `
                radial-gradient(1px 1px at 25% 15%, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 50% 25%, rgba(255,255,255,0.6), transparent),
                radial-gradient(2px 2px at 75% 35%, rgba(255,255,255,0.9), transparent),
                radial-gradient(1px 1px at 15% 50%, rgba(255,255,255,0.7), transparent),
                radial-gradient(1px 1px at 60% 60%, rgba(255,255,255,0.5), transparent),
                radial-gradient(2px 2px at 85% 75%, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.6), transparent),
                radial-gradient(1px 1px at 70% 90%, rgba(255,255,255,0.7), transparent),
                radial-gradient(1px 1px at 10% 20%, rgba(200,200,255,0.5), transparent),
                radial-gradient(1px 1px at 90% 10%, rgba(255,255,200,0.6), transparent),
                radial-gradient(1px 1px at 45% 45%, rgba(255,255,255,0.4), transparent),
                radial-gradient(1px 1px at 80% 55%, rgba(200,200,255,0.5), transparent)
              `,
            }}
            role="img"
            aria-label="ethereal constellation map"
          />
        </div>
      )}

      {/* 亮色主题：浅色渐变背景 */}
      {!isDark && (
        <div className="absolute inset-0 z-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,122,255,0.06) 0%, transparent 60%), linear-gradient(180deg, #fafafa 0%, #f5f5f7 100%)',
        }} />
      )}

      {/* 暗色主题渐变遮罩 */}
      {isDark && (
        <div className="absolute inset-0 z-10" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(6,6,12,0.5) 0%, rgba(6,6,12,0.75) 50%, rgba(6,6,12,0.92) 100%)',
        }} />
      )}

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 min-h-screen flex flex-col">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          className="flex items-center justify-between pt-8 pb-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-primary to-primary-fixed-dim flex items-center justify-center shadow-lg shadow-primary/20">
              <Icon name="star" size={15} className="text-on-primary" filled />
            </div>
            <span className="text-[15px] font-semibold tracking-wide text-primary">
              {isEnglish ? 'AETHERIA' : '人生决策宗师'}
            </span>
          </div>

          {/* 语言切换按钮 - 对标preview_bilingual.html */}
          <div className="lang-toggle flex items-center gap-1 bg-surface-container-low/50 border border-outline/20 rounded-lg p-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  currentLanguage === lang.code
                    ? 'bg-primary/20 text-primary'
                    : 'text-on-surface/40 hover:text-on-surface'
                }`}
              >
                {lang.code === 'zh-CN' ? '中文' : 'EN'}
              </button>
            ))}
          </div>
        </motion.header>

        {/* Hero Banner（P1-1: 已包含 AnimatedText 副标题，移除独立动画标题层） */}
        <HeroBanner />

        {/* 三个用户目标入口：恢复成熟动图，内部引擎不在首页抢层级 */}
        <MetaphysicsShowcase onEntryClick={handleEntryClick} />

        {/* P3-1 回访系统：待回访卡片 */}
        <AnimatePresence>
          {pendingFollowUps.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mt-6"
            >
              <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="notifications_active" size={18} className="text-primary" filled />
                  <span className="text-sm font-medium text-primary">
                    {isEnglish ? 'Follow-up Reminders' : '待回访'}
                  </span>
                  <span className="ml-auto text-xs text-on-surface/40">
                    {pendingFollowUps.length} 条
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingFollowUps.map(fu => (
                    <button
                      key={fu.followUpId}
                      onClick={() => navigate(`/followup/${fu.followUpId}`)}
                      className="w-full text-left rounded-xl bg-surface-container-lowest/60 border border-outline/10 px-3.5 py-3 flex items-center gap-3 hover:bg-surface-container-low/80 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon name="chat_bubble_outline" size={16} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-on-surface truncate">{fu.question}</p>
                        <p className="text-xs text-on-surface/40 mt-0.5">
                          {isEnglish ? 'Scheduled' : '回访时间'}：{new Date(fu.scheduledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Icon name="chevron_right" size={18} className="text-on-surface/30 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

      </div>

      {/* ====== 咨询表单弹窗 ====== */}
      <AnimatePresence>
        {activeFrontdesk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-on-surface/80 backdrop-blur-sm flex items-end justify-center"
            onClick={(e) => e.target === e.currentTarget && setActiveFrontdesk(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col"
            >
              <FrontdeskChat
                mode={activeFrontdesk}
                renderAs="sheet"
                onClose={() => setActiveFrontdesk(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
