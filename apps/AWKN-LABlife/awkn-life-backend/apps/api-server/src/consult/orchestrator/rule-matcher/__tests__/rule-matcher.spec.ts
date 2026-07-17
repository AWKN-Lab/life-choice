/**
 * RuleMatcher Lite 单元测试
 * - gc-001（单命）命中 >=3 条规则
 * - gc-012（双命）命中 >=5 条规则
 * - 每条规则至少 1 个正向 case
 * - 单命输入（无 female）不报错
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { RuleMatcherService } from '../rule-matcher.service';
import {
  RuleMatcherInput,
  MatchedRule,
} from '../rule-matcher.types';
import { BaziFullResult } from '../../../../calc-engine/bazi-calculator-wrapper';

const FIXTURES_DIR = join(__dirname, 'fixtures');

function loadFixture(name: string): any {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), 'utf-8'));
}

function buildInput(
  fixture: any,
  overrides: Partial<RuleMatcherInput> = {},
): RuleMatcherInput {
  return {
    chartSnapshot: {
      male: fixture.male as BaziFullResult,
      female: fixture.female ? (fixture.female as BaziFullResult) : undefined,
    },
    questionType: 'marriage_decision',
    userContext: { background: '', concerns: [] },
    currentYear: 2026,
    birthInfo: {
      maleBirthYear: fixture.maleBirthYear,
      femaleBirthYear: fixture.femaleBirthYear,
    },
    ...overrides,
  };
}

function findRule(rules: MatchedRule[], ruleId: string): MatchedRule | undefined {
  return rules.find(r => r.ruleId === ruleId);
}

describe('RuleMatcherService', () => {
  let service: RuleMatcherService;

  beforeEach(() => {
    service = new RuleMatcherService();
  });

  // ─── 黄金用例集成测试 ───

  describe('gc-001（单命，男方 1989-08-20 广西柳州）', () => {
    const fixture = loadFixture('gc-001-chart-snapshot.json');
    let result: ReturnType<RuleMatcherService['match']>;

    beforeEach(() => {
      result = service.match(buildInput(fixture));
    });

    it('应命中 >=3 条规则', () => {
      expect(result.matchedRules.length).toBeGreaterThanOrEqual(3);
    });

    it('应命中 R002 子午冲（原局/流年）', () => {
      expect(findRule(result.matchedRules, 'R002')).toBeDefined();
    });

    it('应命中 R008 财星引动（流年偏财）', () => {
      expect(findRule(result.matchedRules, 'R008')).toBeDefined();
    });

    it('应命中 R012 大运引动夫妻宫（流年午冲子）', () => {
      expect(findRule(result.matchedRules, 'R012')).toBeDefined();
    });

    it('单命输入不报错，summary 正常生成', () => {
      expect(result.summary).toContain('命中');
      expect(result.summary).not.toContain('undefined');
    });
  });

  describe('gc-012（双命，男方 1989 + 女方 1993）', () => {
    const fixture = loadFixture('gc-012-chart-snapshot.json');
    let result: ReturnType<RuleMatcherService['match']>;

    beforeEach(() => {
      result = service.match(buildInput(fixture));
    });

    it('应命中 >=5 条规则', () => {
      expect(result.matchedRules.length).toBeGreaterThanOrEqual(5);
    });

    it('应命中 R001 夫妻宫冲（子午交叉对比）', () => {
      const r = findRule(result.matchedRules, 'R001');
      expect(r).toBeDefined();
      expect(r!.source).toBe('cross_ref');
      expect(r!.severity).toBe('high');
    });

    it('应命中 R002 子午冲', () => {
      expect(findRule(result.matchedRules, 'R002')).toBeDefined();
    });

    it('应命中 R008 财星引动', () => {
      expect(findRule(result.matchedRules, 'R008')).toBeDefined();
    });

    it('应命中 R012 大运引动夫妻宫', () => {
      expect(findRule(result.matchedRules, 'R012')).toBeDefined();
    });

    it('应命中 R019 价值观冲突（壬水克丙火）', () => {
      const r = findRule(result.matchedRules, 'R019');
      expect(r).toBeDefined();
      expect(r!.evidence).toContain('壬');
      expect(r!.evidence).toContain('丙');
    });

    it('应命中 R020 决策方式冲突（男方正官 + 女方伤官）', () => {
      expect(findRule(result.matchedRules, 'R020')).toBeDefined();
    });
  });

  // ─── 单命容错测试 ───

  describe('单命容错', () => {
    it('无 female 时不报错且不触发 cross_ref 规则', () => {
      const fixture = loadFixture('gc-001-chart-snapshot.json');
      const input = buildInput(fixture);
      expect(input.chartSnapshot.female).toBeUndefined();

      const result = service.match(input);
      const crossRefRules = result.matchedRules.filter(r => r.source === 'cross_ref');
      expect(crossRefRules).toHaveLength(0);
    });
  });

  // ─── 每条规则的正向 case ───

  describe('单规则正向 case', () => {
    /** 构造最小化命盘用于单规则测试 */
    function makeChart(overrides: Partial<BaziFullResult> = {}): BaziFullResult {
      return {
        yearPillar: '己巳',
        monthPillar: '壬申',
        dayPillar: '壬子',
        hourPillar: '癸卯',
        yearShishen: '正官',
        monthShishen: '比肩',
        dayShishen: '日主',
        hourShishen: '劫财',
        wuxing: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
        daYun: [],
        qiYunAge: { years: 4, months: 0, days: 0 } as any,
        liuNian: [],
        liuNianDetail: [],
        shenSha: {},
        naYin: { year: '', month: '', day: '', hour: '' },
        kongWang: [],
        taiYuan: '',
        mingGong: '',
        shenGong: '',
        zangganShishen: { year: [], month: [], day: [], hour: [] },
        changsheng: { year: '', month: '', day: '', hour: '' },
        xingChongHeHai: { he: [], chong: [], hai: [], xing: [] },
        selfSeat: { year: '', month: '', day: '', hour: '' },
        shenShaByPillar: { year: [], month: [], day: [], hour: [] },
        ...overrides,
      } as BaziFullResult;
    }

    function wrapInput(male: BaziFullResult, female?: BaziFullResult): RuleMatcherInput {
      return {
        chartSnapshot: { male, female },
        questionType: 'marriage_decision',
        userContext: { background: '', concerns: [] },
        currentYear: 2026,
        birthInfo: { maleBirthYear: 1989, femaleBirthYear: 1993 },
      };
    }

    // R001 夫妻宫冲
    it('R001：男方日支子 + 女方日支午 → 夫妻宫冲', () => {
      const male = makeChart({ dayPillar: '壬子' });
      const female = makeChart({ dayPillar: '丙午' });
      const result = service.match(wrapInput(male, female));
      const r = findRule(result.matchedRules, 'R001');
      expect(r).toBeDefined();
      expect(r!.evidence).toContain('子');
      expect(r!.evidence).toContain('午');
    });

    // R002 子午冲
    it('R002：原局 chong 含子午冲 → 命中', () => {
      const male = makeChart({
        xingChongHeHai: {
          he: [],
          chong: [{ pillars: ['日柱', '月柱'], relation: '子午冲' }],
          hai: [],
          xing: [],
        },
      });
      const result = service.match(wrapInput(male));
      expect(findRule(result.matchedRules, 'R002')).toBeDefined();
    });

    // R003 卯酉冲
    it('R003：原局 chong 含卯酉冲 → 命中', () => {
      const male = makeChart({
        xingChongHeHai: {
          he: [],
          chong: [{ pillars: ['年柱', '时柱'], relation: '卯酉冲' }],
          hai: [],
          xing: [],
        },
      });
      const result = service.match(wrapInput(male));
      const r = findRule(result.matchedRules, 'R003');
      expect(r).toBeDefined();
      expect(r!.severity).toBe('medium');
    });

    // R007 伤官见官
    it('R007：四柱含伤官 + 流年正官 → 命中', () => {
      const male = makeChart({
        dayPillar: '甲子', // 日主甲木
        monthShishen: '伤官',
        daYun: [{ index: 1, gan: '庚', zhi: '午', full: '庚午', startAge: 34, endAge: 43 }],
        liuNian: [{ year: 2026, ganZhi: '辛酉', shishen: '正官' }],
      });
      const result = service.match(wrapInput(male));
      const r = findRule(result.matchedRules, 'R007');
      expect(r).toBeDefined();
      expect(r!.severity).toBe('high');
    });

    // R008 财星引动
    it('R008：流年偏财引动 → 命中', () => {
      const male = makeChart({
        dayPillar: '壬子',
        liuNian: [{ year: 2026, ganZhi: '丙午', shishen: '偏财' }],
      });
      const result = service.match(wrapInput(male));
      const r = findRule(result.matchedRules, 'R008');
      expect(r).toBeDefined();
      expect(r!.evidence).toContain('偏财');
    });

    // R012 大运引动夫妻宫
    it('R012：流年地支冲日支 → 命中', () => {
      const male = makeChart({
        dayPillar: '壬子', // 日支子
        liuNian: [{ year: 2026, ganZhi: '丙午', shishen: '偏财' }], // 午冲子
      });
      const result = service.match(wrapInput(male));
      const r = findRule(result.matchedRules, 'R012');
      expect(r).toBeDefined();
      expect(r!.evidence).toContain('引动夫妻宫');
    });

    // R019 价值观冲突
    it('R019：男方日主壬水克女方日主丙火 → 命中', () => {
      const male = makeChart({ dayPillar: '壬子' });
      const female = makeChart({ dayPillar: '丙午' });
      const result = service.match(wrapInput(male, female));
      const r = findRule(result.matchedRules, 'R019');
      expect(r).toBeDefined();
      expect(r!.evidence).toContain('水');
      expect(r!.evidence).toContain('火');
    });

    // R020 决策方式冲突（强条件：男方官杀>=2 + 女方伤官>=1）
    it('R020：男方官杀旺 + 女方伤官旺 → 命中', () => {
      const male = makeChart({
        yearShishen: '正官',
        monthShishen: '七杀',
        hourShishen: '比肩',
      });
      const female = makeChart({
        yearShishen: '伤官',
        monthShishen: '食神',
        hourShishen: '正印',
      });
      const result = service.match(wrapInput(male, female));
      const r = findRule(result.matchedRules, 'R020');
      expect(r).toBeDefined();
      expect(r!.evidence).toContain('决策方式冲突');
    });
  });
});
