import { LlmCostDashboardService } from './llm-cost-dashboard.service';
import { LlmCallRecord } from '../shared/logger/llm-call-logger';

describe('LlmCostDashboardService', () => {
  let service: LlmCostDashboardService;

  beforeEach(() => {
    service = new LlmCostDashboardService();
  });

  const makeRecord = (overrides: Partial<LlmCallRecord> = {}): LlmCallRecord => ({
    timestamp: '2026-07-03T10:00:00.000Z',
    provider: 'sensenova',
    model: 'deepseek-v4-flash',
    routeType: 'ziping',
    durationMs: 1000,
    status: 'success',
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
    retryCount: 0,
    ...overrides,
  });

  describe('estimateCost', () => {
    it('应按 sensenova 单价估算成本', () => {
      const cost = service.estimateCost(makeRecord({
        provider: 'sensenova',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      }));
      // sensenova: input 0.8 / output 2.0
      expect(cost).toBeCloseTo(2.8, 4);
    });

    it('应按 minimax 单价估算成本', () => {
      const cost = service.estimateCost(makeRecord({
        provider: 'minimax',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      }));
      // minimax: input 10 / output 30
      expect(cost).toBeCloseTo(40, 4);
    });

    it('未知 provider 应使用默认单价', () => {
      const cost = service.estimateCost(makeRecord({
        provider: 'unknown-provider',
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      }));
      // default: input 2 / output 6
      expect(cost).toBeCloseTo(8, 4);
    });

    it('缺失 token 时成本为 0', () => {
      const cost = service.estimateCost(makeRecord({
        promptTokens: 0,
        completionTokens: 0,
      }));
      expect(cost).toBe(0);
    });
  });

  describe('getDashboard', () => {
    it('应返回结构完整的看板（不依赖具体日志内容）', async () => {
      const dashboard = await service.getDashboard(7);
      // 结构断言（不依赖环境是否有日志）
      expect(dashboard).toHaveProperty('generatedAt');
      expect(dashboard).toHaveProperty('range');
      expect(dashboard).toHaveProperty('overall');
      expect(dashboard).toHaveProperty('byProvider');
      expect(dashboard).toHaveProperty('byRouteType');
      expect(dashboard).toHaveProperty('byDate');
      expect(dashboard).toHaveProperty('multiVsSingleTurn');
      expect(dashboard.overall).toHaveProperty('totalCalls');
      expect(dashboard.overall).toHaveProperty('estimatedCostCNY');
      expect(dashboard.multiVsSingleTurn).toHaveProperty('singleTurn');
      expect(dashboard.multiVsSingleTurn).toHaveProperty('multiTurn');
      expect(dashboard.multiVsSingleTurn).toHaveProperty('costMultiplier');
      // overall 的字段一致性：totalCalls = successCalls + failedCalls
      expect(dashboard.overall.successCalls + dashboard.overall.failedCalls)
        .toBe(dashboard.overall.totalCalls);
    });
  });
});
