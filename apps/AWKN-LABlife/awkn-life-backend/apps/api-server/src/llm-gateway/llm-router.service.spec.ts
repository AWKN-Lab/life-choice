import { LlmRouterService } from './llm-router.service';

describe('LlmRouterService', () => {
  const defaults = {
    defaultProvider: 'sensenova' as const,
    cheapProvider: 'sensenova' as const,
  };

  afterEach(() => {
    delete process.env.LLM_ROUTER_ENABLED;
    delete process.env.LLM_ROUTER_TABLE;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.SENSENOVA_API_KEY;
  });

  describe('未启用智能路由（默认）', () => {
    it('LLM_ROUTER_ENABLED 未设置时返回 defaultProvider', () => {
      const svc = new LlmRouterService();
      expect(svc.isEnabled()).toBe(false);
      const decision = svc.selectProvider(
        { routeType: 'quming' },
        defaults,
      );
      expect(decision.provider).toBe('sensenova');
      expect(decision.reason).toBe('router_disabled_use_default');
    });
  });

  describe('启用智能路由', () => {
    beforeEach(() => {
      process.env.LLM_ROUTER_ENABLED = '1';
      process.env.MINIMAX_API_KEY = 'test-key';
      process.env.SENSENOVA_API_KEY = 'test-key';
    });

    it('高复杂度任务路由到 minimax', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'quming', isHighComplexity: true },
        defaults,
      );
      expect(decision.provider).toBe('minimax');
      expect(decision.reason).toContain('high_complexity_route_quming');
      expect(decision.fallback).toBe('sensenova');
    });

    it('VIP 用户推理型任务路由到 minimax', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'ziping', membershipTier: 'vip' },
        defaults,
      );
      expect(decision.provider).toBe('minimax');
      expect(decision.reason).toContain('vip_reasoning_route_ziping');
    });

    it('clarify 类型按路由表使用 sensenova', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'clarify' },
        defaults,
      );
      expect(decision.provider).toBe('sensenova');
      expect(decision.reason).toBe('route_table_clarify');
    });

    it('quming 按路由表使用 minimax', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'quming' },
        defaults,
      );
      expect(decision.provider).toBe('minimax');
      expect(decision.reason).toBe('route_table_quming');
    });

    it('未知 routeType 短问题使用 cheap provider', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'unknown_route', questionLength: 10 },
        defaults,
      );
      expect(decision.provider).toBe('sensenova');
      expect(decision.reason).toBe('short_question_use_cheap');
    });

    it('未知 routeType 长问题使用 default provider', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'unknown_route', questionLength: 100 },
        defaults,
      );
      expect(decision.provider).toBe('sensenova');
      expect(decision.reason).toBe('fallback_default');
    });

    it('minimax 不可用时降级到 default provider', () => {
      delete process.env.MINIMAX_API_KEY;
      const svc = new LlmRouterService();
      const decision = svc.selectProvider(
        { routeType: 'quming', isHighComplexity: true },
        defaults,
      );
      // minimax 不可用，跳过路由表，落到 default
      expect(decision.provider).toBe('sensenova');
    });
  });

  describe('env LLM_ROUTER_TABLE 覆盖', () => {
    beforeEach(() => {
      process.env.LLM_ROUTER_ENABLED = '1';
      process.env.SENSENOVA_API_KEY = 'test-key';
      process.env.MINIMAX_API_KEY = 'test-key';
      process.env.LLM_ROUTER_TABLE = JSON.stringify({ quming: 'sensenova' });
    });

    it('env 覆盖 quming 路由到 sensenova', () => {
      const svc = new LlmRouterService();
      const decision = svc.selectProvider({ routeType: 'quming' }, defaults);
      expect(decision.provider).toBe('sensenova');
      expect(svc.getRouteTable().quming).toBe('sensenova');
    });

    it('未覆盖的 routeType 保留默认值', () => {
      const svc = new LlmRouterService();
      expect(svc.getRouteTable().clarify).toBe('sensenova');
      expect(svc.getRouteTable().zhangsheng).toBe('minimax');
    });
  });

  describe('LLM_ROUTER_TABLE 解析失败', () => {
    beforeEach(() => {
      process.env.LLM_ROUTER_ENABLED = '1';
      process.env.SENSENOVA_API_KEY = 'test-key';
      process.env.MINIMAX_API_KEY = 'test-key';
      process.env.LLM_ROUTER_TABLE = 'not-a-valid-json';
    });

    it('解析失败时使用默认路由表', () => {
      const svc = new LlmRouterService();
      // 默认表中 quming 是 minimax
      const decision = svc.selectProvider({ routeType: 'quming' }, defaults);
      expect(decision.provider).toBe('minimax');
    });
  });
});
