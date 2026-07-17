import { ApiMetricsCollectorService } from './api-metrics-collector.service';

describe('ApiMetricsCollectorService', () => {
  it('persists one aggregate row instead of one row per request', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'metric-1' });
    const service = new ApiMetricsCollectorService({ userActivity: { create } } as any);

    service.record(200);
    service.record(404);
    service.record(503);
    await service.flush();

    expect(create).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(create.mock.calls[0][0].data.activityData);
    expect(payload).toMatchObject({ total: 3, clientErrors: 1, serverErrors: 1 });

    await service.flush();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('restores counters when persistence fails so the next flush can retry', async () => {
    const create = jest.fn()
      .mockRejectedValueOnce(new Error('db busy'))
      .mockResolvedValueOnce({ id: 'metric-2' });
    const service = new ApiMetricsCollectorService({ userActivity: { create } } as any);

    service.record(500);
    await service.flush();
    await service.flush();

    expect(create).toHaveBeenCalledTimes(2);
    const retried = JSON.parse(create.mock.calls[1][0].data.activityData);
    expect(retried).toMatchObject({ total: 1, clientErrors: 0, serverErrors: 1 });
  });
});
