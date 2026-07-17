/**
 * 通知 Store - 管理 BottomNav 角标 / 站内消息数
 *
 * 真实后端端点：可复用 GET /user/profile/insights（如该端点返回 unreadCount 字段）
 * 或后续扩展为独立 /user/notifications/unread-count
 *
 * 当前实现：轻量从 /user/profile/insights 的 data 字段中读 `unreadCount`，
 * 若后端尚未提供则回退为 0（保持向后兼容）。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationState {
  unreadCount: number;
  lastSyncedAt: string | null;
  loadUnreadCount: () => Promise<void>;
  incrementUnread: (delta?: number) => void;
  clearUnread: () => void;
}

// 动态 import apiClient 避免循环依赖
async function fetchUnreadFromBackend(): Promise<number> {
  try {
    // 未登录用户不需要请求 insights 接口（该接口需要 JWT）
    const { getAuthToken } = await import('@/lib/tokenStorage');
    if (!getAuthToken()) return 0;

    const mod = await import('@/api/consult');
    // consultApi.getUserInsights 是后端 /user/profile/insights 入口
    const fn = (mod.consultApi as any).getUserInsights;
    if (typeof fn !== 'function') return 0;
    const resp = await fn();
    // 兼容两种返回形态：{ data: { unreadCount } } 或 { unreadCount }
    const data = resp?.data ?? resp;
    const n = Number(data?.unreadCount ?? data?.unread_count ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      lastSyncedAt: null,

      loadUnreadCount: async () => {
        const n = await fetchUnreadFromBackend();
        set({ unreadCount: n, lastSyncedAt: new Date().toISOString() });
      },

      incrementUnread: (delta = 1) => {
        set((s) => ({ unreadCount: Math.max(0, s.unreadCount + delta) }));
      },

      clearUnread: () => {
        set({ unreadCount: 0 });
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({ unreadCount: state.unreadCount }),
    }
  )
);
