import { CircuitBreaker, LlmHealthService, CircuitState } from './llm-health.service';

describe('P0-T1.3: CircuitBreaker 熔断器状态机', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    // 用最小冷却间隔构造，便于测试
    cb = new CircuitBreaker();
  });

  describe('初始状态', () => {
    it('新建熔断器应为 closed 状态', () => {
      expect(cb.getState()).toBe('closed');
    });

    it('closed 状态应允许调用（canCall=true）', () => {
      expect(cb.canCall()).toBe(true);
    });

    it('初始 consecutiveFailures=0', () => {
      const stats = cb.getStats();
      expect(stats.consecutiveFailures).toBe(0);
      expect(stats.openedAt).toBeNull();
    });
  });

  describe('Closed → Open（连续失败≥5次触发熔断）', () => {
    it('连续失败 4 次不应熔断', () => {
      for (let i = 0; i < 4; i++) {
        cb.recordFailure();
      }
      expect(cb.getState()).toBe('closed');
      expect(cb.canCall()).toBe(true);
    });

    it('连续失败 5 次应触发熔断（Open 状态）', () => {
      for (let i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      expect(cb.getState()).toBe('open');
      expect(cb.canCall()).toBe(false);
    });

    it('熔断后 consecutiveFailures 应保留，openedAt 应记录时间戳', () => {
      for (let i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      const stats = cb.getStats();
      expect(stats.consecutiveFailures).toBeGreaterThanOrEqual(5);
      expect(stats.openedAt).not.toBeNull();
      expect(stats.cooldownRemainSec).toBeGreaterThan(0);
    });

    it('失败后成功应重置 consecutiveFailures（不熔断）', () => {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess();
      expect(cb.getState()).toBe('closed');
      expect(cb.getStats().consecutiveFailures).toBe(0);
    });
  });

  describe('Open → HalfOpen（冷却60s后自动迁移）', () => {
    it('Open 状态冷却未过应保持 Open', () => {
      for (let i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      // 立即查询，冷却未过
      expect(cb.getState()).toBe('open');
      expect(cb.canCall()).toBe(false);
    });

    it('Open 状态冷却过后应自动迁移到 HalfOpen', () => {
      for (let i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      expect(cb.getState()).toBe('open');

      // 模拟时间前进 61 秒（超过 60s 冷却）
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 61 * 1000);
      expect(cb.getState()).toBe('half-open');
      expect(cb.canCall()).toBe(true); // HalfOpen 放行探测请求
    });
  });

  describe('HalfOpen → Closed（探测成功）', () => {
    it('HalfOpen 状态探测成功应回到 Closed', () => {
      for (let i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      // 推进时间到 HalfOpen
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 61 * 1000);
      expect(cb.getState()).toBe('half-open');

      // 探测成功
      cb.recordSuccess();
      expect(cb.getState()).toBe('closed');
      expect(cb.getStats().consecutiveFailures).toBe(0);
    });
  });

  describe('HalfOpen → Open（探测失败）', () => {
    it('HalfOpen 状态探测失败应重新 Open', () => {
      for (let i = 0; i < 5; i++) {
        cb.recordFailure();
      }
      jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 61 * 1000);
      expect(cb.getState()).toBe('half-open');

      // 探测失败
      cb.recordFailure();
      expect(cb.getState()).toBe('open');
      expect(cb.canCall()).toBe(false);
    });
  });
});

describe('P0-T1.3: LlmHealthService 熔断器集成', () => {
  let svc: LlmHealthService;

  beforeEach(() => {
    svc = new LlmHealthService();
  });

  it('isCircuitOpen 初始返回 false（未熔断）', () => {
    expect(svc.isCircuitOpen('minimax')).toBe(false);
    expect(svc.isCircuitOpen('deepseek-direct')).toBe(false);
  });

  it('连续失败 5 次后 isCircuitOpen 返回 true', () => {
    for (let i = 0; i < 5; i++) {
      svc.recordCall('minimax', 'failed');
    }
    expect(svc.isCircuitOpen('minimax')).toBe(true);
    expect(svc.getCircuitState('minimax')).toBe('open');
  });

  it('不同 provider 熔断器相互独立', () => {
    // minimax 熔断
    for (let i = 0; i < 5; i++) {
      svc.recordCall('minimax', 'failed');
    }
    expect(svc.isCircuitOpen('minimax')).toBe(true);
    // deepseek-direct 未受影响
    expect(svc.isCircuitOpen('deepseek-direct')).toBe(false);
    expect(svc.getCircuitState('deepseek-direct')).toBe('closed');
  });

  it('成功调用应重置熔断器（HalfOpen 探测成功场景）', () => {
    // 触发熔断
    for (let i = 0; i < 5; i++) {
      svc.recordCall('minimax', 'failed');
    }
    expect(svc.isCircuitOpen('minimax')).toBe(true);

    // 推进时间到 HalfOpen
    jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 61 * 1000);
    expect(svc.getCircuitState('minimax')).toBe('half-open');

    // 成功调用
    svc.recordCall('minimax', 'success');
    expect(svc.isCircuitOpen('minimax')).toBe(false);
    expect(svc.getCircuitState('minimax')).toBe('closed');
  });

  it('getHealth 应暴露 circuits 字段', () => {
    svc.recordCall('minimax', 'success');
    svc.recordCall('deepseek-direct', 'failed');
    const health = svc.getHealth();
    expect(health).toHaveProperty('circuits');
    const circuits = health.circuits as Record<string, { state: CircuitState }>;
    expect(circuits).toHaveProperty('minimax');
    expect(circuits).toHaveProperty('deepseek-direct');
    expect(circuits.minimax.state).toBe('closed');
  });
});
