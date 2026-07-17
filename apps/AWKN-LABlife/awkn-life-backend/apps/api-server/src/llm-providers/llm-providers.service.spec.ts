import { LlmError, TokenBucket, LlmProviderType } from './llm-providers.service';
// P0-4: finishReason 字段类型
import type { LlmResponse } from './llm-providers.service';

/**
 * P0 LLM 稳定性测试套件
 * 覆盖 T1.1（LlmError 类型）/ T1.4（TokenBucket 限流）/ T1.5（日志字段）
 * T1.2 retryWithBackoff 为 private 方法，通过 chatWithFallback 间接测试（依赖 fetch mock，留后续）
 * T1.3 CircuitBreaker 测试见 llm-health.service.spec.ts
 */
describe('P0-T1.1: LlmError 结构化错误类型', () => {
  const provider: LlmProviderType = 'minimax';

  describe('错误分类与可重试性', () => {
    it('403 鉴权错误：isAuthError=true, isRetryable=false', () => {
      const err = new LlmError(provider, 'Forbidden', { httpStatus: 403 });
      expect(err.isAuthError).toBe(true);
      expect(err.isRetryable).toBe(false);
      expect(err.isRateLimit).toBe(false);
      expect(err.isTimeout).toBe(false);
      expect(err.httpStatus).toBe(403);
    });

    it('401 鉴权错误：isAuthError=true, isRetryable=false', () => {
      const err = new LlmError(provider, 'Unauthorized', { httpStatus: 401 });
      expect(err.isAuthError).toBe(true);
      expect(err.isRetryable).toBe(false);
    });

    it('429 限流错误：isRateLimit=true, isRetryable=true', () => {
      const err = new LlmError(provider, 'Too Many Requests', {
        httpStatus: 429,
        retryAfterMs: 5000,
      });
      expect(err.isRateLimit).toBe(true);
      expect(err.isRetryable).toBe(true);
      expect(err.isAuthError).toBe(false);
      expect(err.retryAfterMs).toBe(5000);
    });

    it('429 无 Retry-After：isRetryable=true, retryAfterMs=undefined', () => {
      const err = new LlmError(provider, 'Too Many Requests', { httpStatus: 429 });
      expect(err.isRetryable).toBe(true);
      expect(err.retryAfterMs).toBeUndefined();
    });

    it('500 服务端错误：isRetryable=true', () => {
      const err = new LlmError(provider, 'Internal Server Error', { httpStatus: 500 });
      expect(err.isRetryable).toBe(true);
      expect(err.isAuthError).toBe(false);
      expect(err.isRateLimit).toBe(false);
    });

    it('503 服务不可用：isRetryable=true', () => {
      const err = new LlmError(provider, 'Service Unavailable', { httpStatus: 503 });
      expect(err.isRetryable).toBe(true);
    });

    it('400 参数错误：isRetryable=false（客户端错误非 4xx 限流/鉴权）', () => {
      const err = new LlmError(provider, 'Bad Request', { httpStatus: 400 });
      expect(err.isRetryable).toBe(false);
      expect(err.isAuthError).toBe(false);
      expect(err.isRateLimit).toBe(false);
    });

    it('超时错误：isTimeout=true, isRetryable=true', () => {
      const err = new LlmError(provider, 'request timeout after 60000ms', { isTimeout: true });
      expect(err.isTimeout).toBe(true);
      expect(err.isRetryable).toBe(true);
      expect(err.httpStatus).toBeUndefined();
    });

    it('未知错误（无 httpStatus, 非超时）：isRetryable=false', () => {
      const err = new LlmError(provider, 'Network error');
      expect(err.isRetryable).toBe(false);
      expect(err.isTimeout).toBe(false);
      expect(err.isAuthError).toBe(false);
      expect(err.isRateLimit).toBe(false);
    });
  });

  describe('结构化字段保留', () => {
    it('应保留 provider 字段', () => {
      const err = new LlmError('deepseek-direct', 'test');
      expect(err.provider).toBe('deepseek-direct');
    });

    it('应保留 errorCode 字段', () => {
      const err = new LlmError(provider, 'test', { errorCode: 'insufficient_balance' });
      expect(err.errorCode).toBe('insufficient_balance');
    });

    it('应保留 raw 原始错误', () => {
      const rawErr = new Error('original');
      const err = new LlmError(provider, 'wrapped', { raw: rawErr });
      expect(err.raw).toBe(rawErr);
    });

    it('未提供 raw 时应自动构造', () => {
      const err = new LlmError(provider, 'auto raw');
      expect(err.raw).toBeInstanceOf(Error);
      expect(err.raw.message).toBe('auto raw');
    });

    it('name 应为 LlmError', () => {
      const err = new LlmError(provider, 'test');
      expect(err.name).toBe('LlmError');
    });

    it('应为 Error 子类', () => {
      const err = new LlmError(provider, 'test');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('retryAfterMs 上限保护', () => {
    it('retryAfterMs 由调用方传入，应原样保留（chat 方法已做 60s 上限）', () => {
      const err = new LlmError(provider, 'rate limit', {
        httpStatus: 429,
        retryAfterMs: 5000,
      });
      expect(err.retryAfterMs).toBe(5000);
    });
  });
});

describe('P0-T1.4: TokenBucket 令牌桶限流', () => {
  describe('初始状态', () => {
    it('新建令牌桶应满载（tokens=capacity）', () => {
      const bucket = new TokenBucket(60, 60);
      const stats = bucket.getStats();
      expect(stats.tokens).toBe(60);
      expect(stats.capacity).toBe(60);
      expect(stats.rpm).toBe(60);
    });
  });

  describe('acquire 获取 token', () => {
    it('满载时 acquire 应成功（返回 true）', () => {
      const bucket = new TokenBucket(10, 60);
      expect(bucket.acquire()).toBe(true);
    });

    it('acquire 后 tokens 应递减', () => {
      const bucket = new TokenBucket(10, 60);
      bucket.acquire();
      bucket.acquire();
      const stats = bucket.getStats();
      expect(stats.tokens).toBe(8);
    });

    it('耗尽 token 后 acquire 应失败（返回 false）', () => {
      const bucket = new TokenBucket(2, 60);
      expect(bucket.acquire()).toBe(true);
      expect(bucket.acquire()).toBe(true);
      expect(bucket.acquire()).toBe(false);
    });

    it('acquire 失败后 getRetryAfterMs 应返回正数', () => {
      const bucket = new TokenBucket(1, 60);
      bucket.acquire();
      expect(bucket.acquire()).toBe(false);
      const retryAfter = bucket.getRetryAfterMs();
      expect(retryAfter).toBeGreaterThan(0);
      // 60 RPM → 每个token约 1000ms
      expect(retryAfter).toBeLessThanOrEqual(1000);
    });
  });

  describe('token 补充（按时间线性）', () => {
    it('经过一段时间后 tokens 应按 RPM 补充', () => {
      // 用 fake timers 确保时间可控（mockReturnValueOnce 只生效一次，不适用于多次 acquire）
      jest.useFakeTimers();
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      const bucket = new TokenBucket(60, 60); // 60 RPM = 1 token/sec
      // 耗尽所有 token
      for (let i = 0; i < 60; i++) {
        bucket.acquire();
      }
      expect(bucket.acquire()).toBe(false);

      // 时间前进 2 秒（应补充 2 个 token）
      jest.setSystemTime(baseTime + 2000);
      expect(bucket.acquire()).toBe(true);
      expect(bucket.acquire()).toBe(true);
      // 第 3 个应该不够（只补充了 2 个）
      expect(bucket.acquire()).toBe(false);

      jest.useRealTimers();
    });

    it('tokens 不应超过 capacity（上限保护）', () => {
      jest.useFakeTimers();
      const baseTime = Date.now();
      jest.setSystemTime(baseTime);

      const bucket = new TokenBucket(10, 60);
      // 耗尽
      for (let i = 0; i < 10; i++) {
        bucket.acquire();
      }
      // 时间前进 1 小时（远超补充到满的时间）
      jest.setSystemTime(baseTime + 3600 * 1000);
      const stats = bucket.getStats();
      expect(stats.tokens).toBeLessThanOrEqual(10);

      jest.useRealTimers();
    });
  });

  describe('不同 RPM 配置', () => {
    it('低 RPM（10/min）应更容易触发限流', () => {
      const bucket = new TokenBucket(10, 10);
      for (let i = 0; i < 10; i++) {
        expect(bucket.acquire()).toBe(true);
      }
      expect(bucket.acquire()).toBe(false);
    });

    it('高 RPM（600/min）应允许更多并发', () => {
      const bucket = new TokenBucket(600, 600);
      for (let i = 0; i < 100; i++) {
        expect(bucket.acquire()).toBe(true);
      }
      const stats = bucket.getStats();
      expect(stats.tokens).toBe(500);
    });
  });
});

/**
 * P0-T1.5: 日志字段补齐验证
 * 通过 LlmError 结构化字段间接验证日志字段完整性
 * （实际日志写入由 callLogger.logCall 负责，这里验证字段传递链路）
 */
describe('P0-T1.5: 日志字段补齐（字段传递链路）', () => {
  it('LlmError 应能传递 httpStatus/errorCode/retryAfterMs 给日志层', () => {
    const err = new LlmError('minimax', 'rate limited', {
      httpStatus: 429,
      errorCode: 'rate_limit_exceeded',
      retryAfterMs: 3000,
    });
    // 模拟 logFailure 中的字段提取逻辑
    const logFields = {
      httpStatus: err.httpStatus,
      errorCode: err.errorCode,
      isAuthError: err.isAuthError,
      isRateLimit: err.isRateLimit,
      isTimeout: err.isTimeout,
    };
    expect(logFields.httpStatus).toBe(429);
    expect(logFields.errorCode).toBe('rate_limit_exceeded');
    expect(logFields.isAuthError).toBe(false);
    expect(logFields.isRateLimit).toBe(true);
    expect(logFields.isTimeout).toBe(false);
  });

  it('超时错误应能传递 isTimeout 字段', () => {
    const err = new LlmError('deepseek-direct', 'timeout', { isTimeout: true });
    const logFields = {
      httpStatus: err.httpStatus,
      isTimeout: err.isTimeout,
    };
    expect(logFields.httpStatus).toBeUndefined();
    expect(logFields.isTimeout).toBe(true);
  });

  it('鉴权错误应能传递 isAuthError 字段', () => {
    const err = new LlmError('doubao', 'forbidden', { httpStatus: 403 });
    const logFields = {
      httpStatus: err.httpStatus,
      isAuthError: err.isAuthError,
    };
    expect(logFields.httpStatus).toBe(403);
    expect(logFields.isAuthError).toBe(true);
  });
});

// P0-4: LlmResponse.finishReason 字段测试
describe('P0-4: LlmResponse.finishReason 截断检测字段', () => {
  it('LlmResponse.finishReason 字段类型为 string | null | undefined（向后兼容）', () => {
    // 类型断言验证
    const r1: LlmResponse = {
      content: '...',
      provider: 'minimax',
      model: 'minimax-text-01',
      durationMs: 100,
    };
    expect(r1.finishReason).toBeUndefined();

    const r2: LlmResponse = {
      content: '...',
      provider: 'minimax',
      model: 'minimax-text-01',
      durationMs: 100,
      finishReason: 'stop',
    };
    expect(r2.finishReason).toBe('stop');

    const r3: LlmResponse = {
      content: '...',
      provider: 'minimax',
      model: 'minimax-text-01',
      durationMs: 100,
      finishReason: 'length',
    };
    expect(r3.finishReason).toBe('length');
  });

  it('finishReason 取值约定：stop/length/content_filter/tool_calls', () => {
    const validValues: (string | null | undefined)[] = [
      'stop',
      'length',
      'content_filter',
      'tool_calls',
      null,
      undefined,
    ];
    validValues.forEach((v) => {
      const r: LlmResponse = {
        content: '...',
        provider: 'minimax',
        model: 'minimax-text-01',
        durationMs: 100,
        finishReason: v,
      };
      // null 和 undefined 不在 toContain 范围内是预期的（向后兼容）
      if (r.finishReason === null || r.finishReason === undefined) {
        expect(r.finishReason).toBeFalsy();
      } else {
        expect(['stop', 'length', 'content_filter', 'tool_calls']).toContain(
          r.finishReason,
        );
      }
    });
  });
});
