/**
 * KlineV2BridgeService 测试 — P1-07 桥接层契约
 */

import { Test } from '@nestjs/testing';
import { KlineV2BridgeService } from './kline-v2-bridge.service';
import { KlineSnapshotService } from '../kline-tide/kline-snapshot.service';
import { KlineProductViewModelV2 } from '../kline-tide/v2-contracts';

// ============================================================
// 测试夹具
// ============================================================

function makeViewModel(overrides?: Partial<KlineProductViewModelV2>): KlineProductViewModelV2 {
  return {
    meta: {
      snapshotId: 'snap-1',
      profileId: 'profile-1',
      generatedAt: '2026-07-12T10:00:00Z',
      dataVersion: 'v1.1',
      algorithmVersion: 'alg-v1',
      sourceSummary: ['calculated'],
      confidence: 0.8,
      degraded: false,
    },
    horizon: { from: '2026-01', to: '2030-12', granularity: 'month' },
    current: {
      stage: 'advance',
      trend: 'up',
      summary: '上升阶段',
      action: '可推进关键决策',
    },
    series: {
      overall: [
        {
          monthLabel: '2026-07',
          value: 75,
          evidenceRefs: ['rule:da-yun'],
          source: 'calculated',
          confidence: 0.75,
        },
      ],
      career: [
        {
          monthLabel: '2026-07',
          value: 70,
          evidenceRefs: ['career:rule:guan-xing'],
          source: 'calculated',
          confidence: 0.75,
        },
      ],
      wealth: [
        {
          monthLabel: '2026-07',
          value: 68,
          evidenceRefs: ['wealth:rule:cai-xing'],
          source: 'calculated',
          confidence: 0.75,
        },
      ],
      relationship: [
        {
          monthLabel: '2026-07',
          value: 72,
          evidenceRefs: ['relationship:rule:spouse-star'],
          source: 'calculated',
          confidence: 0.75,
        },
      ],
    },
    windows: {
      opportunity: [
        {
          id: 'snap-1:2026-09:opportunity',
          snapshotId: 'snap-1',
          monthLabel: '2026-09',
          nodeType: 'opportunity',
          score: 82,
          summary: '机会节点',
          evidenceRefs: ['rule:da-yun', 'rule:liu-nian'],
          confidence: 0.8,
        },
      ],
      risk: [],
    },
    entitlements: {
      canViewDomainLines: true,
      canViewAllNodes: true,
      canAskNode: true,
    },
    ...overrides,
  };
}

// ============================================================
// Mock
// ============================================================

class MockSnapshotService {
  async getLatestSnapshot(): Promise<KlineProductViewModelV2 | null> {
    return makeViewModel();
  }
  async getSnapshotById(): Promise<KlineProductViewModelV2 | null> {
    return makeViewModel();
  }
}

// ============================================================
// 测试
// ============================================================

describe('KlineV2BridgeService (P1-07)', () => {
  let service: KlineV2BridgeService;
  let snapshotService: MockSnapshotService;
  const originalEnv = process.env.KLINE_V2_ENABLED;

  beforeEach(async () => {
    snapshotService = new MockSnapshotService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        KlineV2BridgeService,
        { provide: KlineSnapshotService, useValue: snapshotService },
      ],
    }).compile();

    service = moduleRef.get(KlineV2BridgeService);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.KLINE_V2_ENABLED;
    } else {
      process.env.KLINE_V2_ENABLED = originalEnv;
    }
  });

  describe('readKlineViewModel', () => {
    it('KLINE_V2_ENABLED=false → 返回 V1 fallback', async () => {
      process.env.KLINE_V2_ENABLED = 'false';
      const r = await service.readKlineViewModel({ userId: 'u1' });
      expect(r.source).toBe('v1-fallback');
      expect(r.v2Enabled).toBe(false);
      expect(r.fallbackReason).toMatch(/KLINE_V2_ENABLED/);
    });

    it('KLINE_V2_ENABLED=true 且有快照 → 返回 V2 ViewModel', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      const r = await service.readKlineViewModel({ userId: 'u1' });
      expect(r.source).toBe('v2-snapshot');
      expect(r.viewModel?.meta.snapshotId).toBe('snap-1');
    });

    it('指定 snapshotId → 调用 getSnapshotById', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      const spy = jest.spyOn(snapshotService, 'getSnapshotById');
      const r = await service.readKlineViewModel({
        userId: 'u1',
        snapshotId: 'snap-specific',
      });
      expect(spy).toHaveBeenCalledWith('snap-specific', 'u1');
      expect(r.source).toBe('v2-snapshot');
    });

    it('无快照 → 返回 V1 fallback', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      jest.spyOn(snapshotService, 'getLatestSnapshot').mockResolvedValueOnce(null);
      const r = await service.readKlineViewModel({ userId: 'u1' });
      expect(r.source).toBe('v1-fallback');
      expect(r.fallbackReason).toMatch(/尚无.*快照/);
    });

    it('指定 nodeId → 在 windows 中查找节点', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      const r = await service.readKlineViewModel({
        userId: 'u1',
        nodeId: 'snap-1:2026-09:opportunity',
      });
      expect(r.node).toBeDefined();
      expect(r.node?.nodeType).toBe('opportunity');
      expect(r.node?.score).toBe(82);
    });

    it('nodeId 不存在 → 返回 ViewModel 但 node=undefined', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      const r = await service.readKlineViewModel({
        userId: 'u1',
        nodeId: 'nonexistent-node',
      });
      expect(r.viewModel).toBeDefined();
      expect(r.node).toBeUndefined();
    });

    it('snapshotService 未注入 → fallback', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      const standalone = new KlineV2BridgeService(null);
      const r = await standalone.readKlineViewModel({ userId: 'u1' });
      expect(r.source).toBe('v1-fallback');
      expect(r.fallbackReason).toMatch(/未注入/);
    });

    it('读取异常 → fallback 且 reason 包含错误信息', async () => {
      process.env.KLINE_V2_ENABLED = 'true';
      jest.spyOn(snapshotService, 'getLatestSnapshot').mockRejectedValueOnce(
        new Error('DB connection failed'),
      );
      const r = await service.readKlineViewModel({ userId: 'u1' });
      expect(r.source).toBe('v1-fallback');
      expect(r.fallbackReason).toMatch(/DB connection failed/);
    });
  });
});
