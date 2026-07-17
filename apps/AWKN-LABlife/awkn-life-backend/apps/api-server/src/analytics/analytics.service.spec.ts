import { AnalyticsService } from './analytics.service';

describe('AnalyticsService operating dashboard', () => {
  it('calculates the 12 weekly metrics without turning missing telemetry into zero', async () => {
    const prisma = {
      consultRecord: { findMany: jest.fn().mockResolvedValue([
        { userId: 'u1', anonymousId: null, sessionId: 's1', sourceEntry: 'question', routeType: 'liuren', status: 'completed' },
        { userId: 'u2', anonymousId: null, sessionId: 's2', sourceEntry: 'question', routeType: 'liuren', status: 'failed' },
        { userId: 'u1', anonymousId: null, sessionId: 's1', sourceEntry: 'kline', routeType: 'zhangsheng', status: 'completed' },
        { userId: null, anonymousId: 'a1', sessionId: 's3', sourceEntry: 'naming', routeType: 'quming', status: 'completed' },
      ]) },
      namingResult: { findMany: jest.fn().mockResolvedValue([{ userId: 'u4', consultRecordId: 'n1' }]) },
      membership: { findMany: jest.fn().mockResolvedValue([{ userId: 'u3' }]) },
      creditLedger: { findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'u1' }]) },
      generationRun: { findMany: jest.fn().mockResolvedValue([
        { moduleId: 'breakthrough', status: 'completed', errorCode: null, errorMessage: null, qualityScore: 80 },
        { moduleId: 'breakthrough', status: 'failed_retryable', errorCode: 'TIMEOUT', errorMessage: null, qualityScore: 0 },
        { moduleId: 'naming', status: 'failed', errorCode: 'SCHEMA', errorMessage: null, qualityScore: 30 },
      ]) },
      pageVisit: { findMany: jest.fn().mockResolvedValue([
        { userId: 'u1', sessionId: 's1', pageName: 'HistoryPage', pageUrl: '/life/history' },
      ]) },
      userActivity: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AnalyticsService(prisma as any);

    const result = await service.getOperatingDashboard(7);
    const byKey = Object.fromEntries(result.metrics.map((item) => [item.key, item]));

    expect(result.metrics).toHaveLength(12);
    expect(byKey.weekly_active_consult_users.value).toBe(3);
    expect(byKey.question_completion_rate.value).toBe(50);
    expect(byKey.kline_success_rate.value).toBe(100);
    expect(byKey.naming_completion_rate.value).toBe(100);
    expect(byKey.history_reopen_rate.value).toBe(33.33);
    expect(byKey.deep_dive_timeout_rate.value).toBe(50);
    expect(byKey.llm_abnormal_output_rate.value).toBe(66.67);
    expect(byKey.api_error_rate).toMatchObject({ value: null, availability: 'unavailable' });
    expect(byKey.critical_frontend_error_count).toMatchObject({ value: null, availability: 'unavailable' });
  });

  it('derives API error rate from persisted aggregate rows', async () => {
    const empty = { findMany: jest.fn().mockResolvedValue([]) };
    const prisma = {
      consultRecord: empty,
      namingResult: empty,
      membership: empty,
      creditLedger: empty,
      generationRun: empty,
      pageVisit: empty,
      userActivity: {
        findMany: jest.fn().mockResolvedValue([
          { activityType: 'api_request_metrics', activityData: '{"total":100,"clientErrors":4,"serverErrors":1}' },
        ]),
      },
    };
    const service = new AnalyticsService(prisma as any);

    const result = await service.getOperatingDashboard(7);
    const apiMetric = result.metrics.find((item) => item.key === 'api_error_rate');

    expect(apiMetric).toMatchObject({ value: 5, numerator: 5, denominator: 100, availability: 'measured' });
  });
});
