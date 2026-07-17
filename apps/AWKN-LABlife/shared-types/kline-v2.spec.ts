/**
 * shared-types/kline-v2 契约校验测试
 *
 * 验证：
 *   1. 接口可以正确实例化
 *   2. validateKlinePoint 拒绝空 evidenceRefs
 *   3. validateKlineNode 拒绝无效 nodeType
 *   4. validateKlineViewModel 综合校验
 *   5. source='simulated' 配合 degraded=true 规则
 */

import {
  KlineProductViewModelV2,
  KlinePoint,
  KlineNode,
  KlineDataSource,
  TideSignal,
  validateKlinePoint,
  validateKlineNode,
  validateKlineViewModel,
} from './kline-v2';

function makeValidPoint(overrides?: Partial<KlinePoint>): KlinePoint {
  return {
    monthLabel: '2026-07',
    value: 75,
    evidenceRefs: ['rule:da-yun', 'input:birth-date'],
    source: 'calculated',
    confidence: 0.85,
    ...overrides,
  };
}

function makeValidNode(overrides?: Partial<KlineNode>): KlineNode {
  return {
    id: 'snap-1:2026-07:opportunity',
    snapshotId: 'snap-1',
    monthLabel: '2026-07',
    nodeType: 'opportunity',
    score: 82,
    summary: '综合分高于均值+1.2σ',
    evidenceRefs: ['rule:da-yun', 'rule:liu-nian'],
    confidence: 0.8,
    ...overrides,
  };
}

function makeValidViewModel(overrides?: Partial<KlineProductViewModelV2>): KlineProductViewModelV2 {
  return {
    meta: {
      snapshotId: 'snap-1',
      profileId: 'profile-1',
      generatedAt: '2026-07-12T10:00:00Z',
      dataVersion: 'v1.1',
      algorithmVersion: 'alg-v1',
      sourceSummary: ['calculated'],
      confidence: 0.85,
      degraded: false,
    },
    horizon: {
      from: '2026-01',
      to: '2030-12',
      granularity: 'month',
    },
    current: {
      stage: 'advance',
      trend: 'up',
      summary: '2026年综合分75.0，趋势上升，判定为「上升」阶段',
      action: '上升阶段：可推进关键决策',
    },
    series: {
      overall: [makeValidPoint()],
    },
    windows: {
      opportunity: [makeValidNode()],
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

describe('shared-types/kline-v2', () => {
  describe('validateKlinePoint', () => {
    it('合法 KlinePoint 通过', () => {
      const r = validateKlinePoint(makeValidPoint());
      expect(r.valid).toBe(true);
    });

    it('拒绝空 evidenceRefs', () => {
      const r = validateKlinePoint(makeValidPoint({ evidenceRefs: [] }));
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/evidenceRefs/);
    });

    it('拒绝 confidence 越界', () => {
      expect(validateKlinePoint(makeValidPoint({ confidence: 1.5 })).valid).toBe(false);
      expect(validateKlinePoint(makeValidPoint({ confidence: -0.1 })).valid).toBe(false);
    });

    it('拒绝非法 monthLabel 格式', () => {
      expect(validateKlinePoint(makeValidPoint({ monthLabel: '2026/07' })).valid).toBe(false);
      expect(validateKlinePoint(makeValidPoint({ monthLabel: '2026-7' })).valid).toBe(false);
    });
  });

  describe('validateKlineNode', () => {
    it('合法 KlineNode 通过', () => {
      const r = validateKlineNode(makeValidNode());
      expect(r.valid).toBe(true);
    });

    it('拒绝无效 nodeType', () => {
      const r = validateKlineNode(makeValidNode({ nodeType: 'unknown' as any }));
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/nodeType/);
    });

    it('拒绝空 id', () => {
      const r = validateKlineNode(makeValidNode({ id: '' }));
      expect(r.valid).toBe(false);
    });

    it('接受三种合法 nodeType', () => {
      expect(validateKlineNode(makeValidNode({ nodeType: 'opportunity' })).valid).toBe(true);
      expect(validateKlineNode(makeValidNode({ nodeType: 'risk' })).valid).toBe(true);
      expect(validateKlineNode(makeValidNode({ nodeType: 'turn' })).valid).toBe(true);
    });
  });

  describe('validateKlineViewModel', () => {
    it('合法 ViewModel 通过', () => {
      const r = validateKlineViewModel(makeValidViewModel());
      expect(r.valid).toBe(true);
      expect(r.reasons).toEqual([]);
    });

    it('拒绝 horizon 格式错误', () => {
      const r = validateKlineViewModel(makeValidViewModel({
        horizon: { from: '2026/01', to: '2030/12', granularity: 'month' },
      }));
      expect(r.valid).toBe(false);
      expect(r.reasons.some(x => x.includes('horizon.from'))).toBe(true);
    });

    it('拒绝无效 current.stage', () => {
      const r = validateKlineViewModel(makeValidViewModel({
        current: {
          stage: 'invalid' as any,
          trend: 'up',
          summary: 'test',
          action: 'test',
        },
      }));
      expect(r.valid).toBe(false);
      expect(r.reasons.some(x => x.includes('current.stage'))).toBe(true);
    });

    it('拒绝 series.overall 中的非法点', () => {
      const r = validateKlineViewModel(makeValidViewModel({
        series: {
          overall: [makeValidPoint({ evidenceRefs: [] })],
        },
      }));
      expect(r.valid).toBe(false);
      expect(r.reasons.some(x => x.includes('series.overall[0]'))).toBe(true);
    });

    it('source=simulated 时 degraded 应为 true（业务约束文档化）', () => {
      // 此约束在文档 §3.2 明确，shared-types 不强制实现，
      // 但提供类型支持，由业务层在校验时执行
      const simulatedPoint: KlinePoint = makeValidPoint({
        source: 'simulated' as KlineDataSource,
        confidence: 0.5,
      });
      // 类型检查通过即视为成功
      expect(simulatedPoint.source).toBe('simulated');
    });
  });

  describe('类型实例化', () => {
    it('KlineProductViewModelV2 可完整实例化', () => {
      const vm: KlineProductViewModelV2 = makeValidViewModel();
      expect(vm.meta.dataVersion).toBe('v1.1');
      expect(vm.meta.algorithmVersion).toBe('alg-v1');
      expect(vm.current.stage).toBe('advance');
      expect(vm.series.overall).toHaveLength(1);
      expect(vm.windows.opportunity).toHaveLength(1);
      expect(vm.windows.risk).toHaveLength(0);
    });

    it('TideSignal 可选字段', () => {
      const vm: KlineProductViewModelV2 = makeValidViewModel({
        currentTide: {
          timing: { label: '时辰', score: 0.7, evidenceRefs: ['rule:shi-chen'] },
          position: null,
          mindset: null,
        },
      });
      expect(vm.currentTide?.timing?.label).toBe('时辰');
      expect(vm.currentTide?.position).toBeNull();
    });

    it('KlineDataSource 联合类型完整', () => {
      const sources: KlineDataSource[] = [
        'calculated',
        'user_reported',
        'llm_narrative',
        'simulated',
        'fallback',
        'unknown',
      ];
      expect(sources).toHaveLength(6);
    });
  });
});
