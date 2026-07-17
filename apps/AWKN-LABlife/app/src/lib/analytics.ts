/**
 * Analytics API - 用户行为追踪
 */
import { apiClient } from '@/api/client';
import { getAuthToken } from '@/lib/tokenStorage';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// 生成或获取 sessionId
export function getSessionId(): string {
  let sessionId = sessionStorage.getItem('awkn_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('awkn_session_id', sessionId);
  }
  return sessionId;
}

// 解析 User-Agent 获取设备信息
function parseDeviceInfo(): { browser: string; os: string; device: string } {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  if (/edge|edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  return { browser, os, device };
}

export interface PageVisitData {
  pageName: string;
  pageUrl?: string;
  referrer?: string;
  screenSize?: string;
  duration?: number;
  userAgent?: string;
}

export interface ActivityData {
  activityType: string;
  activityData?: Record<string, unknown>;
  duration?: number;
  userAgent?: string;
}

/**
 * 记录页面访问
 */
export async function trackPageVisit(data: PageVisitData): Promise<{ success: boolean; visitId?: string }> {
  // Mock 模式下跳过 analytics 上报
  if (USE_MOCK) {
    return { success: true, visitId: 'mock_visit_' + Date.now() };
  }

  try {
    const token = getAuthToken();
    const userId = token ? undefined : undefined; // 从 token 解析用户 ID

    const payload = {
      pageName: data.pageName,
      pageUrl: data.pageUrl || window.location.pathname,
      referrer: data.referrer || document.referrer,
      screenSize: data.screenSize || `${window.screen.width}x${window.screen.height}`,
      duration: data.duration || 0,
      userAgent: data.userAgent || navigator.userAgent,
      sessionId: getSessionId(),
    };

    const response = await apiClient.post<{ success: boolean; visitId: string }>(
      '/analytics/page-visit',
      payload
    );

    return response;
  } catch (error) {
    console.warn('[Analytics] Failed to track page visit:', error);
    return { success: false };
  }
}

/**
 * 记录用户活动
 */
export async function trackActivity(data: ActivityData): Promise<{ success: boolean; activityId?: string }> {
  // Mock 模式下跳过 analytics 上报
  if (USE_MOCK) {
    return { success: true, activityId: 'mock_activity_' + Date.now() };
  }

  try {
    const payload = {
      activityType: data.activityType,
      activityData: data.activityData || {},
      duration: data.duration,
      userAgent: data.userAgent || navigator.userAgent,
      sessionId: getSessionId(),
    };

    const response = await apiClient.post<{ success: boolean; activityId: string }>(
      '/analytics/activity',
      payload
    );

    return response;
  } catch (error) {
    console.warn('[Analytics] Failed to track activity:', error);
    return { success: false };
  }
}

/**
 * 埋点统一入口 - 同时调用页面访问和活动追踪
 */
export function track(event: string, payload?: Record<string, unknown>) {

  // 根据事件类型自动选择追踪方式
  if (event.startsWith('page_') || event === 'page_view') {
    trackPageVisit({
      pageName: (payload?.page as string) || event,
      pageUrl: payload?.url as string,
    });
  } else {
    trackActivity({
      activityType: event,
      activityData: payload,
    });
  }
}

const ERROR_DEDUP_WINDOW_MS = 60_000;
const MAX_ERROR_REPORTS_PER_SESSION = 20;

/**
 * 统一采集关键前端异常。只上报经过节流去重后的摘要，不采集用户输入和页面正文。
 */
export function initFrontendErrorTracking() {
  const recent = new Map<string, number>();
  let reportCount = 0;

  if (sessionStorage.getItem('awkn_error_tracking_ready') !== '1') {
    sessionStorage.setItem('awkn_error_tracking_ready', '1');
    void trackActivity({ activityType: 'frontend_error_tracking_ready' });
  }

  const report = (activityType: 'frontend_error' | 'resource_error' | 'white_screen', details: Record<string, unknown>) => {
    if (reportCount >= MAX_ERROR_REPORTS_PER_SESSION) return;
    const signature = `${activityType}:${String(details.message || details.url || details.reason || '')}`.slice(0, 500);
    const now = Date.now();
    const lastAt = recent.get(signature) || 0;
    if (now - lastAt < ERROR_DEDUP_WINDOW_MS) return;
    recent.set(signature, now);
    reportCount += 1;
    void trackActivity({
      activityType,
      activityData: {
        ...details,
        path: window.location.pathname,
        release: import.meta.env.VITE_APP_VERSION || 'unknown',
      },
    });
  };

  const onError = (event: ErrorEvent | Event) => {
    if (event instanceof ErrorEvent) {
      report('frontend_error', {
        message: event.message || 'script_error',
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
      return;
    }

    const target = event.target as HTMLScriptElement | HTMLLinkElement | HTMLImageElement | null;
    const url = target && ('src' in target ? target.src : target.href);
    if (!url || url.includes('/analytics/activity')) return;
    report('resource_error', { url, tag: target?.tagName || 'unknown' });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason || 'unhandled_rejection');
    report('frontend_error', { message: 'unhandled_rejection', reason: reason.slice(0, 500) });
  };

  window.addEventListener('error', onError, true);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.setTimeout(() => {
    const root = document.getElementById('root');
    if (!root || root.childElementCount === 0) {
      report('white_screen', { message: 'root_empty_after_boot' });
    }
  }, 5_000);

  return () => {
    window.removeEventListener('error', onError, true);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}

/** track 的别名导出，兼容新代码中使用的 trackEvent 命名 */
export { track as trackEvent };

/**
 * 解析当前 URL 中的 UTM 参数
 * @returns UTM 参数对象
 */
export function parseUTM(): { source: string | null; medium: string | null; campaign: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  };
}

/**
 * 追踪着陆页访问事件
 * 在 LandingPage 组件 mount 时调用
 */
export async function trackLandingView(): Promise<void> {
  const utm = parseUTM();
  await trackActivity({
    activityType: 'landing_view',
    activityData: {
      utm_source: utm.source || 'direct',
      utm_medium: utm.medium || 'none',
      utm_campaign: utm.campaign || 'none',
      pageName: 'landing',
    },
  });
}

/**
 * 追踪 QR 扫码回流事件
 * 当用户通过海报 QR 码访问时调用
 * @param source QR 来源（如 kline_poster / naming_poster）
 * @param inviteCode 邀请码（如有）
 */
export async function trackQRScanBack(source: string, inviteCode?: string): Promise<void> {
  await trackActivity({
    activityType: 'qr_scan_back',
    activityData: {
      source,
      inviteCode: inviteCode || 'none',
    },
  });
}

/**
 * 初始化页面访问追踪
 * 在应用启动时调用一次
 */
export function initPageTracking() {
  // 记录首次访问
  trackPageVisit({
    pageName: 'init',
    pageUrl: window.location.pathname,
    referrer: document.referrer,
  });

  // 监听页面卸载前，记录访问时长
  window.addEventListener('beforeunload', () => {
    const duration = Math.round((Date.now() - (window as any).__pageStartTime || Date.now()) / 1000);
    if (duration > 0) {
      trackPageVisit({
        pageName: 'exit',
        duration,
      });
    }
  });

  // 记录页面开始时间
  (window as any).__pageStartTime = Date.now();

  // 监听路由变化
  if (typeof window !== 'undefined') {
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      trackPageVisit({
        pageName: 'route_change',
        pageUrl: window.location.pathname,
      });
    };
  }
}
