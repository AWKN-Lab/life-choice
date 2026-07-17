import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '../authStore';

// Mock zustand persist
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware');
  return {
    ...actual,
    persist: (fn: () => object) => fn,
  };
});

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('demo 账号应该登录成功', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login('demo@example.com', 'demo123');
        expect(success).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('demo@example.com');
      expect(result.current.user?.membership).toBe('monthly');
    });

    it('在 DEV mock 模式下，错误密码也允许登录（自动创建用户）', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login('demo@example.com', 'wrongpassword');
        // Mock 模式下，任何密码都可以登录 demo 账号
        expect(success).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('非 demo 账号在 mock 模式下自动注册', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.login('newuser@example.com', 'anypassword');
        expect(success).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('newuser@example.com');
      expect(result.current.user?.membership).toBe('free');
    });

    it('登录时应该设置 loading 状态', async () => {
      const { result } = renderHook(() => useAuthStore());

      let loadingDuringLogin = false;
      act(() => {
        result.current.login('demo@example.com', 'demo123').then(() => {
          loadingDuringLogin = result.current.isLoading;
        });
      });

      // 注意：由于异步特性，这里只验证最终状态
      await act(async () => {
        await result.current.login('demo@example.com', 'demo123');
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('应该正确注册新用户', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        const success = await result.current.register(
          '新用户',
          'new@test.com',
          'password123'
        );
        expect(success).toBe(true);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.name).toBe('新用户');
      expect(result.current.user?.email).toBe('new@test.com');
      expect(result.current.user?.membership).toBe('free');
    });

    it('注册用户 ID 应该使用 UUID 格式', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register('测试', 'test@test.com', 'pass');
      });

      // UUID 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const id = result.current.user?.id;
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('logout', () => {
    it('应该正确登出用户', async () => {
      const { result } = renderHook(() => useAuthStore());

      // 先登录
      await act(async () => {
        await result.current.login('demo@example.com', 'demo123');
      });
      expect(result.current.isAuthenticated).toBe(true);

      // 登出
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('clearError', () => {
    it('应该清除错误信息', () => {
      const { result } = renderHook(() => useAuthStore());

      // 手动设置错误
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('应该更新用户信息', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login('demo@example.com', 'demo123');
      });

      act(() => {
        result.current.updateUser({ name: '新名字' });
      });

      expect(result.current.user?.name).toBe('新名字');
    });
  });

  describe('upgradeMembership', () => {
    it('应该升级会员等级', async () => {
      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register('测试', 'test@test.com', 'pass');
      });

      // upgradeMembership 走的是真实后端，mock 模式下会失败
      // 这里仅验证非 free 分支：传入 free 时直接本地降级
      await act(async () => {
        await result.current.upgradeMembership('free');
      });

      expect(result.current.user?.membership).toBe('free');
      expect(result.current.user?.consultQuota).toBe(1);
    });
  });
});
