import { ForbiddenException } from '@nestjs/common';
import { KlineTideService } from './kline-tide.service';

describe('KlineTideService seed guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowSeedWrite = process.env.ALLOW_SEED_WRITE;
  const originalKlineV2Enabled = process.env.KLINE_V2_ENABLED;
  const prisma = {
    klineBar: { deleteMany: jest.fn() },
    stateSnapshot: { deleteMany: jest.fn() },
  };

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowSeedWrite === undefined) {
      delete process.env.ALLOW_SEED_WRITE;
    } else {
      process.env.ALLOW_SEED_WRITE = originalAllowSeedWrite;
    }
    if (originalKlineV2Enabled === undefined) {
      delete process.env.KLINE_V2_ENABLED;
    } else {
      process.env.KLINE_V2_ENABLED = originalKlineV2Enabled;
    }
    jest.clearAllMocks();
  });

  it('rejects seed writes in production even when the feature flag is enabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SEED_WRITE = 'true';
    delete process.env.KLINE_V2_ENABLED;
    const service = new KlineTideService(prisma as any, undefined, undefined);

    await expect(service.seed('user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.klineBar.deleteMany).not.toHaveBeenCalled();
    expect(prisma.stateSnapshot.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects seed writes when the explicit non-production flag is absent', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ALLOW_SEED_WRITE;
    delete process.env.KLINE_V2_ENABLED;
    const service = new KlineTideService(prisma as any, undefined, undefined);

    await expect(service.seed('user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.klineBar.deleteMany).not.toHaveBeenCalled();
    expect(prisma.stateSnapshot.deleteMany).not.toHaveBeenCalled();
  });

  // P1-03 (2026-07-12): V2 链路禁用 seed
  it('P1-03: rejects seed writes when V2 link is enabled (KLINE_V2_ENABLED=true)', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_SEED_WRITE = 'true';
    process.env.KLINE_V2_ENABLED = 'true';
    const service = new KlineTideService(prisma as any, undefined, undefined);

    await expect(service.seed('user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.klineBar.deleteMany).not.toHaveBeenCalled();
    expect(prisma.stateSnapshot.deleteMany).not.toHaveBeenCalled();
  });

  it('P1-03: V2 关闭时（KLINE_V2_ENABLED=false）允许 seed（向后兼容）', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_SEED_WRITE = 'true';
    process.env.KLINE_V2_ENABLED = 'false';
    const prismaWithCount = {
      klineBar: { deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      stateSnapshot: { deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new KlineTideService(prismaWithCount as any, undefined, undefined);

    // 应通过 seed guard，进入实际 seed 流程（会调用 prisma 方法）
    // 注意：由于 mock 不完整，会在后续步骤抛错；但只要不抛 ForbiddenException 就证明 V2 关闭
    try {
      await service.seed('user-1');
    } catch (e) {
      // 期望不是 ForbiddenException
      expect(e).not.toBeInstanceOf(ForbiddenException);
    }
    expect(prismaWithCount.klineBar.deleteMany).toHaveBeenCalled();
  });
});
