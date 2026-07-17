import { KlineCalculationEngine, KlineCalculationInput, KlineBarV2 } from './kline-calculation.engine';
import { BaziFullResult } from '../calc-engine/bazi-calculator-wrapper';

/**
 * P1-02: KlineCalculationEngine 确定性 + 因子完整性测试
 *
 * 核心契约（必须通过）：
 *   C1: 同输入两次调用 → bars 完全一致（确定性）
 *   C2: 同输入两次调用 → factorsHash 完全一致
 *   C3: 所有 bar.source === 'calculated'（V2 链路，Phase 1 Step 1.6 修正）
 *   C4: meta.engineVersion === 'v2.0.0'
 *   C5: 15 因子均出现于 meta.factorBreakdowns
 *   C6: close 落在 [20, 95] 区间
 *   C7: trend ∈ {'上升','调整','蓄势','转折'}
 *   C8: 不同 baziResult → 不同 factorsHash
 */
describe('P1-02: KlineCalculationEngine', () => {
  let engine: KlineCalculationEngine;

  beforeEach(() => {
    engine = new KlineCalculationEngine();
  });

  // ============================================================
  // 测试夹具：构造一个最小可用的 BaziFullResult
  // ============================================================
  function makeBaziFixture(opts?: Partial<BaziFullResult>): BaziFullResult {
    const base: BaziFullResult = {
      yearPillar: '甲子',
      monthPillar: '丙寅',
      dayPillar: '戊午',
      hourPillar: '庚申',
      yearShishen: '七杀',
      monthShishen: '偏印',
      dayShishen: '日主',
      hourShishen: '食神',
      wuxing: { wood: 2, fire: 2, earth: 1, metal: 2, water: 1 },
      daYun: [
        { index: 0, gan: '丁', zhi: '卯', full: '丁卯', startAge: 5, endAge: 14 },
        { index: 1, gan: '戊', zhi: '辰', full: '戊辰', startAge: 15, endAge: 24 },
        { index: 2, gan: '己', zhi: '巳', full: '己巳', startAge: 25, endAge: 34 },
        { index: 3, gan: '庚', zhi: '午', full: '庚午', startAge: 35, endAge: 44 },
        { index: 4, gan: '辛', zhi: '未', full: '辛未', startAge: 45, endAge: 54 },
      ],
      qiYunAge: { year: 5, month: 0, day: 0, totalDays: 1825 } as any,
      liuNian: [
        { year: 1984, ganZhi: '甲子', shishen: '七杀' },
        { year: 1985, ganZhi: '乙丑', shishen: '正官' },
        { year: 1986, ganZhi: '丙寅', shishen: '偏印' },
      ],
      liuNianDetail: [],
      shenSha: { tianYi: ['子'], wenChang: ['寅'], taiJi: [], yangRen: [] },
      naYin: { year: '海中金', month: '炉中火', day: '天上火', hour: '石榴木' },
      kongWang: [],
      taiYuan: '丁卯',
      mingGong: '己巳',
      shenGong: '辛未',
      zangganShishen: {
        year: [], month: [], day: [], hour: [],
      },
      changsheng: { year: '沐浴', month: '长生', day: '帝旺', hour: '临官' },
      xingChongHeHai: { year: [], month: [], day: [], hour: [] } as any,
      ...opts,
    } as unknown as BaziFullResult;
    return base;
  }

  function makeInput(opts?: Partial<KlineCalculationInput>): KlineCalculationInput {
    return {
      baziResult: makeBaziFixture(),
      birthYear: 1984,
      viewMode: 'yearMonth', // Phase 1 Step 1.2: 默认 36 个月
      asOfDate: new Date('2026-07-13T12:00:00Z'), // Phase 1 Step 1.1: 固定日期确保确定性
      birthTime: '12:30',
      ...opts,
    };
  }

  // ============================================================
  // C1 + C2: 确定性验证
  // ============================================================
  describe('确定性验证（C1 + C2）', () => {
    it('同输入两次调用 → bars 完全一致', () => {
      const input = makeInput();
      const r1 = engine.calculate(input);
      const r2 = engine.calculate(input);
      expect(r1.bars).toEqual(r2.bars);
    });

    it('同输入两次调用 → meta.factorsHash 完全一致', () => {
      const input = makeInput();
      const r1 = engine.calculate(input);
      const r2 = engine.calculate(input);
      expect(r1.meta.factorsHash).toBe(r2.meta.factorsHash);
      expect(r1.meta.factorsHash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('每条 bar 的 factorsHash 稳定且唯一（同批不重复）', () => {
      const input = makeInput({ viewMode: 'life' });
      const r = engine.calculate(input);
      const hashes = r.bars.map((b) => b.factorsHash);
      const unique = new Set(hashes);
      // 至少 95% 的 bar 应有唯一 hash（允许相邻年巧合相同）
      expect(unique.size).toBeGreaterThanOrEqual(Math.floor(hashes.length * 0.95));
    });

    it('相同 asOfDate → 相同 calculatedAt 和 factorsHash（确定性验证）', () => {
      // Phase 1: asOfDate 是固定输入，calculatedAt = asOfDate.toISOString()
      // 相同 asOfDate → 相同 calculatedAt 和 factorsHash
      const input = makeInput();
      const r1 = engine.calculate(input);
      const r2 = engine.calculate(input);
      expect(r1.meta.calculatedAt).toBe(r2.meta.calculatedAt);
      expect(r1.meta.factorsHash).toBe(r2.meta.factorsHash);
    });
  });

  // ============================================================
  // C3 + C4: V2 链路标识
  // ============================================================
  describe('V2 链路标识（C3 + C4）', () => {
    it('所有 bar.source === "calculated"', () => {
      const r = engine.calculate(makeInput());
      expect(r.bars.every((b) => b.source === 'calculated')).toBe(true);
    });

    it('meta.engineVersion === "v2.0.0"', () => {
      const r = engine.calculate(makeInput());
      expect(r.meta.engineVersion).toBe('v2.0.0');
    });
  });

  // ============================================================
  // C5: 因子完整性
  // ============================================================
  describe('15 因子完整性（C5）', () => {
    it('每条 breakdown 含全部 15 因子', () => {
      const r = engine.calculate(makeInput());
      expect(r.meta.factorBreakdowns.length).toBe(r.bars.length);
      for (const bd of r.meta.factorBreakdowns) {
        expect(bd).toHaveProperty('daYun');
        expect(bd).toHaveProperty('liuNian');
        expect(bd).toHaveProperty('yongShen');
        expect(bd).toHaveProperty('relation');
        expect(bd).toHaveProperty('shenSha');
        expect(bd).toHaveProperty('baseChart');
        expect(bd).toHaveProperty('shiShen');
        expect(bd).toHaveProperty('xingChongHeHai');
        expect(bd).toHaveProperty('riskPenalty');
        // 八十神子字段
        expect(bd.shiShen).toHaveProperty('biJian');
        expect(bd.shiShen).toHaveProperty('jieCai');
        expect(bd.shiShen).toHaveProperty('shiShen');
        expect(bd.shiShen).toHaveProperty('shangGuan');
        expect(bd.shiShen).toHaveProperty('pianCai');
        expect(bd.shiShen).toHaveProperty('zhengCai');
        expect(bd.shiShen).toHaveProperty('qiSha');
        expect(bd.shiShen).toHaveProperty('zhengGuan');
      }
    });
  });

  // ============================================================
  // C6 + C7: 数据区间合法
  // ============================================================
  describe('数据区间合法（C6 + C7）', () => {
    it('close 落在 [20, 95]', () => {
      const r = engine.calculate(makeInput());
      for (const b of r.bars) {
        expect(b.close).toBeGreaterThanOrEqual(20);
        expect(b.close).toBeLessThanOrEqual(95);
        // open/high/low 同区间
        expect(b.open).toBeGreaterThanOrEqual(10);
        expect(b.open).toBeLessThanOrEqual(100);
        expect(b.high).toBeGreaterThanOrEqual(10);
        expect(b.high).toBeLessThanOrEqual(100);
        expect(b.low).toBeGreaterThanOrEqual(10);
        expect(b.low).toBeLessThanOrEqual(100);
      }
    });

    it('trend ∈ 4 态', () => {
      const r = engine.calculate(makeInput());
      const validTrends = ['上升', '调整', '蓄势', '转折'];
      for (const b of r.bars) {
        expect(validTrends).toContain(b.trend);
      }
    });

    it('high >= max(open, close) 且 low <= min(open, close)', () => {
      const r = engine.calculate(makeInput());
      for (const b of r.bars) {
        expect(b.high).toBeGreaterThanOrEqual(Math.max(b.open, b.close));
        expect(b.low).toBeLessThanOrEqual(Math.min(b.open, b.close));
      }
    });
  });

  // ============================================================
  // C8: 不同输入 → 不同 hash
  // ============================================================
  describe('输入敏感性（C8）', () => {
    it('不同 birthYear → 不同 factorsHash', () => {
      const r1 = engine.calculate(makeInput({ birthYear: 1984 }));
      const r2 = engine.calculate(makeInput({ birthYear: 1990 }));
      expect(r1.meta.factorsHash).not.toBe(r2.meta.factorsHash);
    });

    it('不同 viewMode → 不同 factorsHash', () => {
      const r1 = engine.calculate(makeInput({ viewMode: 'life' }));
      const r2 = engine.calculate(makeInput({ viewMode: 'decade' }));
      expect(r1.meta.factorsHash).not.toBe(r2.meta.factorsHash);
    });

    it('不同大运 → 不同 factorsHash', () => {
      const bazi1 = makeBaziFixture();
      const bazi2 = makeBaziFixture({
        daYun: [
          { index: 0, gan: '壬', zhi: '戌', full: '壬戌', startAge: 5, endAge: 14 },
        ],
      });
      const r1 = engine.calculate({ baziResult: bazi1, birthYear: 1984, asOfDate: new Date('2026-07-13T12:00:00Z') });
      const r2 = engine.calculate({ baziResult: bazi2, birthYear: 1984, asOfDate: new Date('2026-07-13T12:00:00Z') });
      expect(r1.meta.factorsHash).not.toBe(r2.meta.factorsHash);
    });
  });

  // ============================================================
  // 视图模式行为
  // ============================================================
  describe('视图模式', () => {
    it('life 模式：固定 101 条 bar（0-100 岁）', () => {
      const r = engine.calculate(makeInput({ viewMode: 'life' }));
      expect(r.bars.length).toBe(101);
      expect(r.bars[0].age).toBe(0);
      expect(r.bars[100].age).toBe(100);
    });

    it('yearMonth 模式：固定 36 条 bar（从 asOfDate 当前月起 36 个月）', () => {
      const r = engine.calculate(makeInput({ viewMode: 'yearMonth' }));
      // Phase 1: yearMonth 固定 36 个月，从 asOfDate 当前月起
      expect(r.bars.length).toBe(36);
      expect(r.bars[0].month).toBe(7); // asOfDate 2026-07
      expect(r.bars[0].age).toBe(42); // 2026-1984=42
    });

    it('decade 模式：返回当前大运范围内的 bar', () => {
      const r = engine.calculate(makeInput({ viewMode: 'decade', birthYear: 1984 }));
      // asOfDate 2026-07, 2026 - 1984 = 42 岁 → 落在 35-44 大运
      expect(r.bars.length).toBe(10); // 35-44 共 10 年
      for (const b of r.bars) {
        expect(b.age).toBeGreaterThanOrEqual(35);
        expect(b.age).toBeLessThanOrEqual(44);
      }
    });
  });

  // ============================================================
  // 边界条件
  // ============================================================
  describe('边界条件', () => {
    it('birthTime 缺省时仍能正常计算', () => {
      const r = engine.calculate(makeInput({ birthTime: undefined }));
      expect(r.bars.length).toBe(36); // 默认 yearMonth 模式 36 个月
    });

    it('八字缺 shenSha 字段时仍能正常计算', () => {
      const bazi = makeBaziFixture({ shenSha: undefined as any });
      const r = engine.calculate({ baziResult: bazi, birthYear: 1984, asOfDate: new Date('2026-07-13T12:00:00Z') });
      expect(r.bars.length).toBe(36); // 默认 yearMonth 模式 36 个月
      // 应触发 scoreShenSha 的 try-catch，返回 50（中性）
      const bd = r.meta.factorBreakdowns[0];
      expect(bd.shenSha).toBe(50);
    });

    it('大运不存在时仍能计算（daYun 因子取默认 55）', () => {
      const bazi = makeBaziFixture({ daYun: [] });
      const r = engine.calculate({ baziResult: bazi, birthYear: 1984, asOfDate: new Date('2026-07-13T12:00:00Z') });
      expect(r.bars.length).toBe(36); // 默认 yearMonth 模式 36 个月
      const bd = r.meta.factorBreakdowns[0];
      expect(bd.daYun).toBe(55);
    });
  });
});
