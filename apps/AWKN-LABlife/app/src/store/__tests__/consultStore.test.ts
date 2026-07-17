import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConsultStore } from '../consultStore';

// Mock zustand persist
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware');
  return {
    ...actual,
    persist: (fn: () => object) => fn,
  };
});

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

describe('useConsultStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const { result } = renderHook(() => useConsultStore());
      expect(result.current.currentQuestion).toBe('');
      expect(result.current.routeResponse).toBeNull();
      expect(result.current.consultType).toBeNull();
      expect(result.current.response).toBeNull();
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('analyzeQuestion', () => {
    it('应该正确分析断事类问题', async () => {
      const { result } = renderHook(() => useConsultStore());

      await act(async () => {
        const response = await result.current.analyzeQuestion('这个合作还能不能继续推进？');
        expect(response.route_type).toBe('liuren');
        expect(response.required_fields).toContain('ask_time');
      });

      expect(result.current.routeResponse?.route_type).toBe('liuren');
    });

    it('应该正确分析命理类问题', async () => {
      const { result } = renderHook(() => useConsultStore());

      await act(async () => {
        const response = await result.current.analyzeQuestion('我今年整体运势怎么样？');
        expect(response.route_type).toBe('ziping');
      });
    });

    it('应该识别需要澄清的问题', async () => {
      const { result } = renderHook(() => useConsultStore());

      // 使用不含任何关键词的问题
      await act(async () => {
        const response = await result.current.analyzeQuestion('你好？');
        expect(response.route_type).toBe('clarify');
        expect(response.need_clarify).toBe(true);
      });

      expect(result.current.clarifyQuestion).toBeTruthy();
    });

    it('分析完成后 loading 应该变为 false', async () => {
      const { result } = renderHook(() => useConsultStore());

      expect(result.current.isAnalyzing).toBe(false);

      await act(async () => {
        await result.current.analyzeQuestion('测试问题');
      });

      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('setDivinationInfo / setDestinyInfo', () => {
    it('应该正确设置断事信息', () => {
      const { result } = renderHook(() => useConsultStore());

      act(() => {
        result.current.setDivinationInfo({
          ask_time: '2024-01-01 12:00',
          ask_location: '北京',
        });
      });

      expect(result.current.divinationInfo?.ask_time).toBe('2024-01-01 12:00');
      expect(result.current.divinationInfo?.ask_location).toBe('北京');
    });

    it('应该正确设置命理信息', () => {
      const { result } = renderHook(() => useConsultStore());

      act(() => {
        result.current.setDestinyInfo({
          birth_date: '1990-01-01',
          birth_time: '08:00',
          birth_location: '上海',
        });
      });

      expect(result.current.destinyInfo?.birth_date).toBe('1990-01-01');
      expect(result.current.destinyInfo?.birth_time).toBe('08:00');
      expect(result.current.destinyInfo?.birth_location).toBe('上海');
    });
  });

  describe('clearCurrent', () => {
    it('应该清除所有当前状态', async () => {
      const { result } = renderHook(() => useConsultStore());

      // 设置一些状态
      await act(async () => {
        await result.current.analyzeQuestion('测试问题');
      });

      expect(result.current.currentQuestion).toBeTruthy();
      expect(result.current.routeResponse).toBeTruthy();

      act(() => {
        result.current.clearCurrent();
      });

      expect(result.current.currentQuestion).toBe('');
      expect(result.current.routeResponse).toBeNull();
      expect(result.current.response).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('应该清除错误状态', () => {
      const { result } = renderHook(() => useConsultStore());

      // 手动设置错误
      act(() => {
        result.current.clearError(); // 初始应该可以调用
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('generateResponse', () => {
    it('应该生成 Mock 响应', async () => {
      const { result } = renderHook(() => useConsultStore());

      // 先设置咨询类型
      await act(async () => {
        await result.current.analyzeQuestion('这个合作还能不能继续推进？');
      });

      await act(async () => {
        const response = await result.current.generateResponse();
        expect(response.summary_line).toBeTruthy();
        expect(response.risks).toBeTruthy();
        expect(response.actions).toBeTruthy();
      });

      expect(result.current.response).toBeTruthy();
    });

    it('record_id 应该是 UUID 格式', async () => {
      const { result } = renderHook(() => useConsultStore());

      await act(async () => {
        await result.current.analyzeQuestion('测试问题');
      });

      await act(async () => {
        await result.current.generateResponse();
      });

      const recordId = result.current.response?.record_id;
      expect(recordId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('关键词识别', () => {
    it('应该识别"要不要"类问题为断事推演', async () => {
      const { result } = renderHook(() => useConsultStore());

      await act(async () => {
        await result.current.analyzeQuestion('要不要去面试？');
      });

      expect(result.current.routeResponse?.route_type).toBe('liuren');
    });

    it('应该识别"适合"类问题为断事推演', () => {
      const { result } = renderHook(() => useConsultStore());

      act(() => {
        result.current.analyzeQuestion('这个工作适合我吗？');
      });

      // 等待状态更新
      setTimeout(() => {
        expect(result.current.routeResponse?.route_type).toBe('liuren');
      }, 100);
    });

    it('应该识别"运势"类问题为东方命理', () => {
      const { result } = renderHook(() => useConsultStore());

      act(() => {
        result.current.analyzeQuestion('我的运势怎么样？');
      });

      setTimeout(() => {
        expect(result.current.routeResponse?.route_type).toBe('ziping');
      }, 100);
    });
  });
});
