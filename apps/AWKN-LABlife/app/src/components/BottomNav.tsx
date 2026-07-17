import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notificationStore';

/* Material Symbols — 底部导航图标映射 */
const ICON_MAP = {
  home: 'home',
  consult: 'edit',
  kline: 'candlestick_chart',
  history: 'history',
  profile: 'person',
} as const;

type NavKey = keyof typeof ICON_MAP;

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const pathname = location.pathname;
  const { unreadCount, loadUnreadCount } = useNotificationStore();

  // 挂载时拉一次未读数
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // K线为主入口：点击主图标直达 K线；K线页内可跳转潮汐
  const navItems: { path: string; label: string; iconKey: NavKey; badge?: number }[] = [
    { path: '/', label: t('nav.home'), iconKey: 'home' },
    { path: '/consult', label: t('nav.consult'), iconKey: 'consult' },
    { path: '/kline', label: t('nav.kline', 'K线'), iconKey: 'kline' },
    { path: '/history', label: t('nav.history'), iconKey: 'history' },
    { path: '/profile', label: t('nav.profile'), iconKey: 'profile', badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  const isActive = (itemPath: string) =>
    pathname === itemPath || (itemPath !== '/' && pathname.startsWith(itemPath + '/'));

  return (
    <nav className="bottom-nav" aria-label="底部导航">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.iconKey}
              to={item.path}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                {/* Material Symbols Outlined — FILL 1 when active, FILL 0 otherwise */}
                <span
                  className="material-symbols-outlined icon-md transition-all duration-300"
                  style={{
                    color: active ? 'hsl(var(--secondary))' : 'hsl(var(--outline))',
                    fontVariationSettings: active
                      ? "'FILL' 1, 'wght' 300, 'GRAD' 0, 'opsz' 24"
                      : "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24",
                  }}
                  aria-hidden="true"
                >
                  {ICON_MAP[item.iconKey]}
                </span>
                {/* 数字角标 */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-[10px] font-bold text-black flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
