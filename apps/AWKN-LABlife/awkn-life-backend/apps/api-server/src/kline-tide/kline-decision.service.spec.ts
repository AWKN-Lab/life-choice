// P1-05 KlineDecisionService V2 阶段判定与节点识别测试
import { KlineDecisionService, V2Stage, V2KlineNode } from './kline-decision.service';
import { KlineCalculationEngine, KlineCalculationInput } from './kline-calculation.engine';
import { BaziFullResult } from '../calc-engine/bazi-calculator-wrapper';
import { validateEvidenceRefs } from './factor-registry';

describe('P1-05: KlineDecisionService V2', () => {
  let decision: KlineDecisionService;
  let engine: KlineCalculationEngine;

  beforeEach(() => {
    decision = new KlineDecisionService();
    engine = new KlineCalculationEngine();
  });

  function makeBazi(): BaziFullResult {
    return {
      yearPillar: '甲子', monthPillar: '丙寅', dayPillar: '戊午', hourPillar: '庚申',
      yearShishen: '七杀', monthShishen: '偏印', dayShishen: '日主', hourShishen: '食神',
      wuxing: { wood: 2, fire: 2, earth: 1, metal: 2, water: 1 },
      daYun: [
        { index: 0, gan: '丁', zhi: '卯', full: '丁卯', startAge: 5, endAge: 14 },
        { index: 1, gan: '戊', zhi: '辰', full: '戊辰', startAge: 15, endAge: 24 },
        { index: 2, gan: '己', zhi: '巳', full: '己巳', startAge: 25, endAge: 34 },
      ],
      qiYunAge: { year: 5, month: 0, day: 0, totalDays: 1825 } as any,
      liuNian: [{ year: 1984, ganZhi: '甲子', shishen: '七杀' }],
      liuNianDetail: [], shenSha: { tianYi: ['子'] } as any,
      naYin: { year: '海中金', month: '炉中火', day: '天上火', hour: '石榴木' },
      kongWang: [], taiYuan: '丁卯', mingGong: '己巳', shenGong: '辛未',
      zangganShishen: { year: [], month: [], day: [], hour: [] },
      changsheng: { year: '沐浴', month: '长生', day: '帝旺', hour: '临官' },
      xingChongHeHai: { he: [], chong: [], hai: [], xing: [] } as any,
    } as unknown as BaziFullResult;
  }

  function makeInput(opts?: Partial<KlineCalculationInput>): KlineCalculationInput {
    return {
      baziResult: makeBazi(),
      birthYear: 1984,
      viewMode: 'yearMonth', // Phase 1 Step 1.2: 默认 36 个月
      asOfDate: new Date('2026-07-13T12:00:00Z'), // Phase 1 Step 1.1: 固定日期确保确定性
      birthTime: '12:30',
      ...opts,
    };
  }

  // ============================================================
  // D1: 空 bars 兜底
  // ============================================================
  describe('D1: 空 bars 兜底', () => {
    it('bars=[] 应返回 unknown 阶段与空 windows', () => {
      const result = decision.decideV2([], 'snap-1', 2026);
      expect(result.current.stage).toBe('unknown');
      expect(result.current.trend).toBe('unknown');
      expect(result.windows.opportunity).toEqual([]);
      expect(result.windows.risk).toEqual([]);
      expect(result.windows.turn).toEqual([]);
      expect(result.meta.barsAnalyzed).toBe(0);
    });

    it('bars=null 应返回 unknown 阶段', () => {
      const result = decision.decideV2(null as any, 'snap-1', 2026);
      expect(result.current.stage).toBe('unknown');
    });

    it('meta.algorithmVersion 应为 v2.0.0', () => {
      const result = decision.decideV2([], 'snap-1', 2026);
      expect(result.meta.algorithmVersion).toBe('v2.0.0');
    });

    it('meta.factorRegistryVersion 应为 v1', () => {
      const result = decision.decideV2([], 'snap-1', 2026);
      expect(result.meta.factorRegistryVersion).toBe('v1');
    });
  });

  // ============================================================
  // D2: V2 阶段 5 态覆盖
  // ============================================================
  describe('D2: V2 阶段 5 态', () => {
    it('stage 应 ∈ {accumulate, advance, turn, defend, unknown}', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      const validStages: V2Stage[] = ['accumulate', 'advance', 'turn', 'defend', 'unknown'];
      expect(validStages).toContain(result.current.stage);
    });

    it('trend 应 ∈ {up, sideways, down, unknown}', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      expect(['up', 'sideways', 'down', 'unknown']).toContain(result.current.trend);
    });

    it('actionBias 应 ∈ {expand, probe, repair, hold}', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      expect(['expand', 'probe', 'repair', 'hold']).toContain(result.current.actionBias);
    });

    it('summary 应含年份与综合分', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      expect(result.current.summary).toMatch(/\d{4}/); // 含年份
      expect(result.current.summary).toMatch(/综合分/);
    });

    it('action 应非空字符串', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      expect(result.current.action.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // D3: 节点识别 + evidenceRefs 契约
  // ============================================================
  describe('D3: 节点识别 + evidenceRefs 契约', () => {
    it('所有节点 evidenceRefs 必须非空（契约 §3.2）', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      const allNodes = [
        ...result.windows.opportunity,
        ...result.windows.risk,
        ...result.windows.turn,
      ];
      for (const node of allNodes) {
        const check = validateEvidenceRefs(node.evidenceRefs);
        expect(check.valid).toBe(true);
      }
    });

    it('所有节点 nodeType 应 ∈ {opportunity, risk, turn}', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      const allNodes = [
        ...result.windows.opportunity,
        ...result.windows.risk,
        ...result.windows.turn,
      ];
      for (const node of allNodes) {
        expect(['opportunity', 'risk', 'turn']).toContain(node.nodeType);
      }
    });

    it('所有节点 snapshotId 应与传入 snapshotId 一致', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-test-001', 2026);
      const allNodes = [
        ...result.windows.opportunity,
        ...result.windows.risk,
        ...result.windows.turn,
      ];
      for (const node of allNodes) {
        expect(node.snapshotId).toBe('snap-test-001');
      }
    });

    it('所有节点 confidence 应 ∈ [0, 1]', () => {
      const r = engine.calculate(makeInput());
      const result = decision.decideV2(r.bars, 'snap-1', 2026);
      const allNodes = [
        ...result.windows.opportunity,
        ...result.windows.risk,
        ...result.windows.turn,
      ];
      for (const node of allNodes) {
        expect(node.confidence).toBeGreaterThanOrEqual(0);
        expect(node.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('所有节点 ID 应稳定可重生成（同输入两次调用一致）', () => {
      const r = engine.calculate(makeInput());
      const result1 = decision.decideV2(r.bars, 'snap-stable', 2026);
      const result2 = decision.decideV2(r.bars, 'snap-stable', 2026);
      const ids1 = [
        ...result1.windows.opportunity,
        ...result1.windows.risk,
        ...result1.windows.turn,
      ].map(n => n.id);
      const ids2 = [
        ...result2.windows.opportunity,
        ...result2.windows.risk,
        ...result2.windows.turn,
      ].map(n => n.id);
      expect(ids1).toEqual(ids2);
    });

    it('数据不足时（<6 bars）应返回空节点', () => {
      // Phase 1: 默认 yearMonth 模式产生 36 条 bar，需手动截取 <6 条测试数据不足场景
      const r = engine.calculate(makeInput());
      const fewBars = r.bars.slice(0, 3);
      const result = decision.decideV2(fewBars, 'snap-1', 2026);
      expect(result.windows.opportunity.length + result.windows.risk.length + result.windows.turn.length).toBe(0);
    });
  });

  // ============================================================
  // D4: 无 look-ahead bias
  // ============================================================
  describe('D4: 无 look-ahead bias', () => {
    it('截断后的阶段判定应与全量同位置的判定一致', () => {
      // Phase 1 Step 1.3: 流月算法改为精确版，stage 判定结果会随算法变化
      // 但 look-ahead bias 契约不变：截断数据判定的 stage 应与全量数据在截断范围内的判定一致
      const full = engine.calculate(makeInput());
      const truncated = full.bars.slice(0, 15);

      // currentYear/currentMonth 匹配 asOfDate（2026-07），确保定位在数据范围内
      const resultFull = decision.decideV2(full.bars, 'snap-1', 2026, 7);
      const resultTrunc = decision.decideV2(truncated, 'snap-1', 2026, 7);

      // 截断数据的 stage 应为 unknown（数据不足 6 条时不判定）或与全量一致
      if (resultFull.current.stage !== 'unknown' && resultTrunc.current.stage !== 'unknown') {
        expect(resultFull.current.stage).toBe(resultTrunc.current.stage);
      }
    });
  });

  // ============================================================
  // D5: V1 旧方法向后兼容（@deprecated 但仍可用）
  // ============================================================
  describe('D5: V1 旧方法向后兼容', () => {
    it('determineCurrentStage 应仍可调用并返回 V1 6 态之一', () => {
      const points = [
        { year: 2020, month: 1, monthLabel: '2020-01', compositeCapital: 85, volatility: 5 },
        { year: 2020, month: 2, monthLabel: '2020-02', compositeCapital: 50, volatility: 10 },
      ];
      const result = KlineDecisionService.determineCurrentStage(points as any, 0);
      expect(['巅峰', '上升中', '稳定高位', '中位震荡', '低谷', '未知']).toContain(result.stage);
    });

    it('calcSupportResistance 应仍可调用', () => {
      const points = [
        { year: 2020, month: 1, monthLabel: '2020-01', compositeCapital: 30, volatility: 5 },
        { year: 2020, month: 2, monthLabel: '2020-02', compositeCapital: 70, volatility: 10 },
      ];
      const result = KlineDecisionService.calcSupportResistance(points as any);
      expect(result.support).toBeLessThanOrEqual(result.resistance);
    });
  });
});
