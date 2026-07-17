// P1-09 factor-registry 单元测试
import {
  FACTOR_REGISTRY_VERSION,
  FACTOR_DEFINITIONS,
  ALL_FACTOR_IDS,
  FactorDefinition,
  buildEvidenceRefs,
  getFactorDefinition,
  listFactorsByCategory,
  validateEvidenceRefs,
  sumFactorWeights,
  inputEvidence,
  EvidenceContext,
} from './factor-registry';
import { BaziFullResult } from '../calc-engine/bazi-calculator-wrapper';

/** 构造最小 BaziFullResult fixture（避免依赖完整计算） */
function makeBazi(): BaziFullResult {
  return {
    yearPillar: '甲子',
    monthPillar: '丙寅',
    dayPillar: '戊午',
    hourPillar: '丁巳',
    yearShishen: '比肩',
    monthShishen: '偏印',
    dayShishen: '日主',
    hourShishen: '正印',
    wuxing: { wood: 2, fire: 2, earth: 1, metal: 1, water: 2 },
    daYun: [
      { index: 0, gan: '丁', zhi: '卯', full: '丁卯', startAge: 5, endAge: 14 },
      { index: 1, gan: '戊', zhi: '辰', full: '戊辰', startAge: 15, endAge: 24 },
    ],
    qiYunAge: { years: 5, months: 0, days: 0, exactDate: new Date('1990-01-01') } as any,
    liuNian: [{ year: 2024, ganZhi: '甲辰', shishen: '比肩' }],
    liuNianDetail: [],
    shenSha: { year: ['文昌'], month: [], day: [], hour: [] },
    naYin: { year: '海中金', month: '炉中火', day: '天上火', hour: '沙中土' },
    kongWang: ['戌', '亥'],
    taiYuan: '丁卯',
    mingGong: '己未',
    shenGong: '辛酉',
    zangganShishen: { year: [], month: [], day: [], hour: [] },
    changsheng: { year: '长生', month: '沐浴', day: '冠带', hour: '临官' },
    xingChongHeHai: { he: [], chong: [], hai: [], xing: [] },
    selfSeat: { year: '甲', month: '丙', day: '戊', hour: '丁' },
    shenShaByPillar: { year: [], month: [], day: [], hour: [] },
  };
}

describe('P1-09: factor-registry', () => {
  // ============================================================
  // F1: 注册表基础完整性
  // ============================================================
  describe('F1: 注册表基础完整性', () => {
    it('注册表版本应为 v1', () => {
      expect(FACTOR_REGISTRY_VERSION).toBe('v1');
    });

    it('应有 16 项因子定义（15 评分 + 1 风险扣减）', () => {
      expect(ALL_FACTOR_IDS.length).toBe(16);
    });

    it('所有因子 ID 应以 rule: 或 input: 前缀（注册表内只含 rule:）', () => {
      for (const id of ALL_FACTOR_IDS) {
        expect(id.startsWith('rule:')).toBe(true);
      }
    });

    it('每项因子定义应包含完整字段', () => {
      for (const def of Object.values(FACTOR_DEFINITIONS)) {
        expect(def.id).toBeTruthy();
        expect(def.name).toBeTruthy();
        expect(def.category).toBeTruthy();
        expect(typeof def.weight).toBe('number');
        expect(def.description).toBeTruthy();
        expect(def.sinceVersion).toBe('v1');
      }
    });
  });

  // ============================================================
  // F2: 权重与 KlineCalculationEngine 一致
  // ============================================================
  describe('F2: 权重一致性', () => {
    it('15 评分因子权重总和应 = 0.94（不含风险扣减）', () => {
      // 0.20 + 0.18 + 0.10 + 0.05 + 0.08 + 0.12 + (0.02×8) + 0.05 = 0.94
      const sum = sumFactorWeights();
      expect(sum).toBeCloseTo(0.94, 2);
    });

    it('daYun 权重应为 0.2', () => {
      expect(FACTOR_DEFINITIONS['rule:da-yun'].weight).toBe(0.2);
    });

    it('liuNian 权重应为 0.18', () => {
      expect(FACTOR_DEFINITIONS['rule:liu-nian'].weight).toBe(0.18);
    });

    it('yongShen 权重应为 0.1', () => {
      expect(FACTOR_DEFINITIONS['rule:yong-shen'].weight).toBe(0.1);
    });

    it('baseChart 权重应为 0.12', () => {
      expect(FACTOR_DEFINITIONS['rule:base-chart-wuxing'].weight).toBe(0.12);
    });

    it('8 个十神权重应各为 0.02', () => {
      const shiShenIds = [
        'rule:shi-shen:bi-jian',
        'rule:shi-shen:jie-cai',
        'rule:shi-shen:shi-shen',
        'rule:shi-shen:shang-guan',
        'rule:shi-shen:pian-cai',
        'rule:shi-shen:zheng-cai',
        'rule:shi-shen:qi-sha',
        'rule:shi-shen:zheng-guan',
      ];
      for (const id of shiShenIds) {
        expect(FACTOR_DEFINITIONS[id].weight).toBe(0.02);
      }
    });

    it('risk-penalty 权重应为 -1（扣减项）', () => {
      expect(FACTOR_DEFINITIONS['rule:risk-penalty'].weight).toBe(-1);
    });
  });

  // ============================================================
  // F3: 类别分类
  // ============================================================
  describe('F3: 类别分类', () => {
    it('listFactorsByCategory("time") 应返回 2 项（da-yun + liu-nian）', () => {
      const list = listFactorsByCategory('time');
      expect(list.length).toBe(2);
      expect(list.map(f => f.id).sort()).toEqual(['rule:da-yun', 'rule:liu-nian']);
    });

    it('listFactorsByCategory("ten-gods") 应返回 8 项', () => {
      expect(listFactorsByCategory('ten-gods').length).toBe(8);
    });

    it('listFactorsByCategory("risk") 应返回 1 项', () => {
      expect(listFactorsByCategory('risk').length).toBe(1);
    });

    it('listFactorsByCategory("input") 应返回 0 项（input 类不进入注册表）', () => {
      expect(listFactorsByCategory('input').length).toBe(0);
    });
  });

  // ============================================================
  // F4: buildEvidenceRefs 构造证据
  // ============================================================
  describe('F4: buildEvidenceRefs 构造证据', () => {
    it('应返回非空数组', () => {
      const refs = buildEvidenceRefs({ baziResult: makeBazi(), year: 2024 });
      expect(Array.isArray(refs)).toBe(true);
      expect(refs.length).toBeGreaterThan(0);
    });

    it('应包含至少 1 条 rule: 规则证据', () => {
      const refs = buildEvidenceRefs({ baziResult: makeBazi(), year: 2024 });
      const ruleRefs = refs.filter(r => r.startsWith('rule:'));
      expect(ruleRefs.length).toBeGreaterThan(0);
    });

    it('应包含输入证据 input:birth-year 与 input:liu-nian-current', () => {
      const refs = buildEvidenceRefs({ baziResult: makeBazi(), year: 2024 });
      expect(refs.some(r => r.startsWith('input:birth-year='))).toBe(true);
      expect(refs.some(r => r.startsWith('input:liu-nian-current='))).toBe(true);
    });

    it('应去重', () => {
      const refs = buildEvidenceRefs({
        baziResult: makeBazi(),
        year: 2024,
        daYun: '丁卯',
        liuNian: '甲辰',
      });
      const unique = new Set(refs);
      expect(refs.length).toBe(unique.size);
    });

    it('空 ctx 也应至少返回 1 条兜底证据', () => {
      const refs = buildEvidenceRefs({} as EvidenceContext);
      expect(refs.length).toBeGreaterThan(0);
      expect(refs.some(r => r.startsWith('rule:'))).toBe(true);
    });

    it('应包含 da-yun-current 输入证据（当 daYun 提供时）', () => {
      const refs = buildEvidenceRefs({
        baziResult: makeBazi(),
        year: 2024,
        daYun: '丁卯',
      });
      expect(refs).toContain('input:da-yun-current=丁卯');
    });
  });

  // ============================================================
  // F5: validateEvidenceRefs 校验
  // ============================================================
  describe('F5: validateEvidenceRefs 校验', () => {
    it('合法 refs 应通过', () => {
      const refs = buildEvidenceRefs({ baziResult: makeBazi(), year: 2024 });
      const result = validateEvidenceRefs(refs);
      expect(result.valid).toBe(true);
    });

    it('空数组应不通过', () => {
      const result = validateEvidenceRefs([]);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('不能为空');
    });

    it('undefined 应不通过', () => {
      const result = validateEvidenceRefs(undefined);
      expect(result.valid).toBe(false);
    });

    it('仅含 input: 应不通过（缺规则证据）', () => {
      const result = validateEvidenceRefs(['input:birth-year=1990']);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('rule:');
    });

    it('含未知 rule ID 应不通过', () => {
      const result = validateEvidenceRefs(['rule:unknown-factor', 'rule:da-yun']);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('rule:unknown-factor');
    });
  });

  // ============================================================
  // F6: 查询 API
  // ============================================================
  describe('F6: 查询 API', () => {
    it('getFactorDefinition("rule:da-yun") 应返回有效定义', () => {
      const def = getFactorDefinition('rule:da-yun');
      expect(def).toBeDefined();
      expect(def?.name).toBe('大运影响');
      expect(def?.weight).toBe(0.2);
    });

    it('getFactorDefinition("unknown") 应返回 undefined', () => {
      expect(getFactorDefinition('unknown')).toBeUndefined();
    });

    it('inputEvidence("birth-year", 1990) 应返回 "input:birth-year=1990"', () => {
      expect(inputEvidence('birth-year', 1990)).toBe('input:birth-year=1990');
    });

    it('inputEvidence("birth-year", undefined) 应返回 null', () => {
      expect(inputEvidence('birth-year', undefined)).toBeNull();
    });
  });
});
