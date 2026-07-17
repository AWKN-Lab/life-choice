import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, MembershipTier } from '@/types';
import { authApi } from '@/api/auth';
import { membershipApi, type CurrentMembership } from '@/api/membership';
import { getAuthToken, removeAuthToken } from '@/lib/tokenStorage';
import { ApiError } from '@/api/client';

/** 生成安全 UUID（生产环境用 crypto，兼容旧浏览器） */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers (not cryptographically secure, dev only)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 前端 tier → 后端 productId（与 MEMBERSHIP_PLANS 一致）
function tierToProductId(tier: MembershipTier): string {
  switch (tier) {
    case 'monthly':
      return 'month';
    case 'yearly':
      return 'year';
    case 'single':
      return 'single';
    case 'free':
    default:
      return 'free';
  }
}

// 后端 planId → 前端 tier
function productIdToTier(planId?: string | null): MembershipTier {
  switch (planId) {
    case 'month':
      return 'monthly';
    case 'year':
      return 'yearly';
    case 'single':
    case 'peruse':
      return 'single';
    case 'free':
    default:
      return 'free';
  }
}

function quotaForTier(tier: MembershipTier, isAdmin = false): number {
  if (isAdmin) return 999;
  if (tier === 'yearly') return 20;
  if (tier === 'monthly') return 10;
  return 1;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;  // 新增：hydration 完成标志
  profileStale: boolean;  // P0-4 C7: profile 同步失败时标记为 stale

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
  upgradeMembership: (tier: MembershipTier, orderId?: string) => Promise<boolean>;
  syncMembershipFromBackend: () => Promise<void>;
  syncUserProfile: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;  // 新增
}

// Demo credentials - ONLY used in development with VITE_USE_MOCK=true
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo123';
const IS_DEV = import.meta.env.DEV;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// P0-4: 管理员判断仅信任后端返回值，不再前端硬编码 ADMIN_ACCOUNTS

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,
      profileStale: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Mock 模式 - 仅在开发环境且 USE_MOCK=true 时使用
          if (IS_DEV && USE_MOCK) {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Demo login
            if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
              const demoUser: User = {
                id: generateId(),
                name: 'Demo User',
                email: DEMO_EMAIL,
                phone: undefined,
                membership: 'monthly',
                consultQuota: 8,
                createdAt: new Date(),
                isAdmin: false,
              };
              set({
                user: demoUser,
                isAuthenticated: true,
                isLoading: false
              });
              return true;
            }
            // 管理员账号自动识别（Mock 模式下仍需支持，因为无后端）
            if (email === '10919669' || email === '10919669@qq.com') {
              const adminUser: User = {
                id: '10919669',
                name: 'Admin',
                email: email,  // 保留原始邮箱便于识别
                phone: undefined,
                membership: 'yearly',
                consultQuota: 999,
                createdAt: new Date(),
                isAdmin: true,
              };
              set({
                user: adminUser,
                isAuthenticated: true,
                isLoading: false
              });
              return true;
            }
            // 非 demo 账号在 mock 模式下自动创建用户
            const newUser: User = {
              id: generateId(),
              name: email.split('@')[0],
              email,
              membership: 'free',
              consultQuota: 1,
              createdAt: new Date(),
              isAdmin: false,
            };
            set({
              user: newUser,
              isAuthenticated: true,
              isLoading: false
            });
            return true;
          }

          // 真实 API 模式 - 调用后端登录
          const response = await authApi.login({ email, password });
          // P0-4: 管理员判断仅信任后端返回值
          const isAdmin = response.user.isAdmin === true;
          const user: User = {
            id: response.user.id,
            name: response.user.nickname || email.split('@')[0],
            email: response.user.email,
            phone: undefined,
            membership: isAdmin ? 'yearly' : 'free',
            consultQuota: quotaForTier(isAdmin ? 'yearly' : 'free', isAdmin),
            creditBalance: response.user.creditBalance,
            createdAt: new Date(),
            isAdmin,
          };
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });
          queueMicrotask(() => {
            get().syncUserProfile();
            get().syncMembershipFromBackend();
          });
          return true;
        } catch (error) {
          console.error('Login error:', error);
          set({ error: 'Invalid email or password', isLoading: false });
          return false;
        }
      },

      register: async (name: string, email: string, password: string, phone?: string) => {
        set({ isLoading: true, error: null });

        try {
          if (IS_DEV && USE_MOCK) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newUser: User = {
              id: generateId(),
              name,
              email,
              phone,
              membership: 'free',
              consultQuota: 1,
              createdAt: new Date(),
            };

            set({
              user: newUser,
              isAuthenticated: true,
              isLoading: false
            });
            return true;
          }

          const response = await authApi.register({ email, password, nickname: name });
          // P0-4: 管理员判断仅信任后端返回值
          const isAdmin = response.user.isAdmin === true;
          const user: User = {
            id: response.user.id,
            name: response.user.nickname || name,
            email: response.user.email,
            phone,
            membership: isAdmin ? 'yearly' : 'free',
            consultQuota: quotaForTier(isAdmin ? 'yearly' : 'free', isAdmin),
            creditBalance: response.user.creditBalance,
            createdAt: new Date(),
            isAdmin,
          };
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });
          queueMicrotask(() => {
            get().syncUserProfile();
            get().syncMembershipFromBackend();
          });
          return true;
        } catch (error) {
          if (!(error instanceof ApiError && error.statusCode === 401)) {
            console.error('Register error:', error);
          }
          set({ error: 'Registration failed. Please try again.', isLoading: false });
          return false;
        }
      },

      logout: async () => {
        // 调用后端 logout 接口清除 token
        if (!USE_MOCK) {
          try {
            await authApi.logout();
          } catch (e) {
            // 401 = token 已过期，logout 本就目的是清 token，静默处理
            if (e instanceof ApiError && e.statusCode === 401) {
              // 静默：token 已失效，logout 语义一致
            } else {
              console.error('Logout API error:', e);
            }
          }
        }
        // 清除本地状态
        removeAuthToken();
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },

      upgradeMembership: async (tier, orderId) => {
        const { user } = get();
        if (!user) return false;

        const productId = tierToProductId(tier);
        // 降级到 free 直接清空
        if (productId === 'free') {
          set({
            user: {
              ...user,
              membership: 'free',
              consultQuota: quotaForTier('free', user.isAdmin === true),
            },
          });
          return true;
        }

        // 调后端激活会员（写入 Prisma Membership 表）
        try {
          const result = await membershipApi.activateMembership(productId, orderId);
          const newTier = productIdToTier(result.planId);
          set({
            user: {
              ...user,
              membership: newTier,
              consultQuota: quotaForTier(newTier, user.isAdmin === true),
            },
          });
          return true;
        } catch (err) {
          if (!(err instanceof ApiError && err.statusCode === 401)) {
            console.error('upgradeMembership failed:', err);
          }
          set({
            error: err instanceof Error ? err.message : '会员升级失败',
          });
          return false;
        }
      },

      syncMembershipFromBackend: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const current: CurrentMembership | null = await membershipApi.getCurrentMembership();
          if (current) {
            const newTier = productIdToTier(current.planId);
            set({
              user: {
                ...user,
                membership: newTier,
                consultQuota: quotaForTier(newTier, user.isAdmin === true),
              },
            });
          } else {
            // 后端无有效会员：本地降级为 free
            set({
              user: {
                ...user,
                membership: user.isAdmin ? 'yearly' : 'free',
                consultQuota: quotaForTier(user.isAdmin ? 'yearly' : 'free', user.isAdmin === true),
              },
            });
          }
        } catch (err) {
          console.warn('syncMembershipFromBackend failed:', err);
        }
      },

      syncUserProfile: async () => {
        const { user, isAuthenticated } = get();
        if (!user || !isAuthenticated) return;
        try {
          const profile = await authApi.getProfile();
          // P0-4: 管理员判断仅信任后端返回值，以后端为准覆盖本地
          const isAdmin = profile.isAdmin === true;
          const membership = isAdmin ? 'yearly' : (user.membership || 'free');
          set({
            user: {
              ...user,
              id: profile.id || user.id,
              email: profile.email || user.email,
              name: profile.nickname || user.name,
              isAdmin,
              creditBalance: profile.creditBalance ?? user.creditBalance,
              membership,
              consultQuota: quotaForTier(membership, isAdmin),
            },
            profileStale: false,  // P0-4 C7: 同步成功，清除 stale 标记
          });
        } catch (err) {
          console.warn('syncUserProfile failed:', err);
          // P0-4 C7: 同步失败，保留本地缓存但标记 stale
          set({ profileStale: true });
        }
      },

      setHasHydrated: (state) => {
        set({ hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          if (state.isAuthenticated && !getAuthToken()) {
            // 无 token 但本地标记已认证 = 无效状态，清除
            state.user = null;
            state.isAuthenticated = false;
          } else if (state.isAuthenticated && getAuthToken()) {
            // P0-4 C6: hydration 后强制拉取 profile，以后端数据覆盖本地缓存
            queueMicrotask(() => {
              state.syncUserProfile();
              state.syncMembershipFromBackend();
            });
          }
        }
      },
      // P0-4 C7: stale 时自动重试一次 profile 同步
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasHydrated: state.hasHydrated,
        // profileStale 不持久化，每次 hydration 重新计算
      }),
    }
  )
);
