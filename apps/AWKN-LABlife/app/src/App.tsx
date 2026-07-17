import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './lib/i18n';
import { initPageTracking } from '@/lib/analytics';
import { syncFeatureFlagsFromServer } from '@/lib/feature-flag';
import { consultApi } from '@/api/consult';
import { useThemeStore } from '@/store/themeStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Icon } from '@/components/ui/Icon';
import { Toaster } from '@/components/ui/sonner';
import ConnectionIndicator from '@/components/feedback/ConnectionIndicator';
import { flushBehaviorQueue } from '@/utils/behaviorQueue';


// lazyWithRetry：lazy 加载失败时自动重试一次，避免临时性网络抖动导致永久白屏
function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      console.error('[Lazy Load Error] 首次加载失败，重试中:', error);
      return factory();
    })
  );
}

// Lazy load pages
const HomePage = lazyWithRetry(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const ConsultPage = lazyWithRetry(() => import('@/pages/ConsultPage').then(m => ({ default: m.ConsultPage })));
const InfoPage = lazyWithRetry(() => import('@/pages/InfoPage').then(m => ({ default: m.InfoPage })));
const ResultPage = lazyWithRetry(() => import('@/pages/ResultPage').then(m => ({ default: m.ResultPage })));
const MembershipPage = lazyWithRetry(() => import('@/pages/MembershipPage').then(m => ({ default: m.MembershipPage })));
const ProfilePage = lazyWithRetry(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HistoryPage = lazyWithRetry(() => import('@/pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const LibraryPage = lazyWithRetry(() => import('@/pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const GrowthPage = lazyWithRetry(() => import('@/pages/GrowthPage').then(m => ({ default: m.GrowthPage })));
const AdminPage = lazyWithRetry(() => import('@/pages/AdminPage'));
const PricePage = lazyWithRetry(() => import('@/pages/PricePage').then(m => ({ default: m.PricePage })));
const FeedbackPage = lazyWithRetry(() => import('@/pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })));
const FortunePage = lazyWithRetry(() => import('@/pages/FortunePage'));
const KlineIntroPage = lazyWithRetry(() => import('@/pages/KlineIntroPage').then(m => ({ default: m.KlineIntroPage })));
const KlinePage = lazyWithRetry(() => import('@/pages/KlinePage').then(m => ({ default: m.KlinePage })));
const KlineSharePage = lazyWithRetry(() => import('@/pages/KlineSharePage').then(m => ({ default: m.KlineSharePage })));
const KlineHistoryPage = lazyWithRetry(() => import('@/pages/KlineHistoryPage').then(m => ({ default: m.KlineHistoryPage })));
// P2-02 (2026-07-13): 潮汐已并入 K线，/tide 重定向到 /kline。TidePage 保留为 V1 兼容降级备选（未挂路由）。
const LandingPage = lazyWithRetry(() => import('@/pages/LandingPage'));
const KlineComparePage = lazyWithRetry(() => import('@/pages/KlineComparePage'));
const FrontdeskChat = lazyWithRetry(() => import('@/components/frontdesk/FrontdeskChat'));
const MiaosuanPage = lazyWithRetry(() => import('@/pages/MiaosuanPage').then(m => ({ default: m.MiaosuanPage })));
const ShumiyuanPage = lazyWithRetry(() => import('@/pages/ShumiyuanPage').then(m => ({ default: m.ShumiyuanPage })));
const TongjianPage = lazyWithRetry(() => import('@/pages/TongjianPage').then(m => ({ default: m.TongjianPage })));
const XingtuPage = lazyWithRetry(() => import('@/pages/XingtuPage').then(m => ({ default: m.XingtuPage })));
const ZiweiPage = lazyWithRetry(() => import('@/pages/ZiweiPage').then(m => ({ default: m.ZiweiPage })));
const FollowUpPage = lazyWithRetry(() => import('@/pages/FollowUpPage'));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function App() {
  const { mode, toggle } = useThemeStore();
  
  useEffect(() => {
    const flushQueuedBehavior = async () => {
      await flushBehaviorQueue(async (events) => {
        for (const event of events) {
          const eventType = String(event.body.event_type || event.body.eventType || '');
          if (!eventType) continue;
          const payload = Object.fromEntries(
            Object.entries(event.body).filter(([key]) => !['event_type', 'eventType', 'timestamp'].includes(key)),
          );
          await consultApi.saveBehaviorEvent(event.recordId, eventType, payload);
        }
      });
    };

    // 初始化页面追踪
    initPageTracking();
    // 启动时同步后端 Feature Flag
    syncFeatureFlagsFromServer();
    void flushQueuedBehavior();

    const handleOnline = () => {
      void flushQueuedBehavior();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/consult" element={<ConsultPage />} />
            <Route path="/info" element={<InfoPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/result/:recordId" element={<ResultPage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/pricing" element={<PricePage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/growth" element={<GrowthPage />} />
            <Route path="/fortune" element={<FortunePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/kline-intro" element={<KlineIntroPage />} />
            <Route path="/kline" element={<KlinePage />} />
            {/* P3-03: K线历史版本页 */}
            <Route path="/kline/history" element={<KlineHistoryPage />} />
            {/* P3-02: 公开脱敏分享页（无需登录） */}
            <Route path="/share/:token" element={<KlineSharePage />} />
            <Route path="/tide" element={<Navigate to="/kline" replace />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/kline-compare" element={<KlineComparePage />} />
            <Route path="/naming" element={<FrontdeskChat mode="naming" renderAs="page" />} />
            <Route path="/question" element={<FrontdeskChat mode="question" renderAs="page" />} />
            <Route path="/miaosuan" element={<MiaosuanPage />} />
            <Route path="/shumiyuan" element={<ShumiyuanPage />} />
            <Route path="/tongjian" element={<TongjianPage />} />
            <Route path="/xingtu" element={<XingtuPage />} />
            <Route path="/ziwei" element={<ZiweiPage />} />
            <Route path="/followup/:followUpId" element={<FollowUpPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      {/* 主题切换按钮 */}
      <button
        onClick={toggle}
        className="fixed top-4 right-4 z-[300] w-10 h-10 rounded-full flex items-center justify-center bg-surface-container/80 backdrop-blur-md border border-border/30 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        aria-label={mode === 'dark' ? '切换到白天模式' : '切换到暗夜模式'}
        title={mode === 'dark' ? '切换到白天模式' : '切换到暗夜模式'}
      >
        <Icon
          name={mode === 'dark' ? 'light_mode' : 'dark_mode'}
          size={20}
          className="text-on-surface-variant"
        />
      </button>

      {/* P1-5: 全局 Toast 通知（替代 window.alert） */}
      <Toaster />

      {/* U-P2-3: WebSocket 应用层断连重连指示器 */}
      <ConnectionIndicator />

    </BrowserRouter>
  );
}

export default App;
