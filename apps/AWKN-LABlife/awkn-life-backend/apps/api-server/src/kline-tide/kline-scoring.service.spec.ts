import { KlineScoringService, TripleLineScores, LineScore } from './kline-scoring.service';

/**
 * P1-T2.2: 三线命理算法骨架测试
 * 覆盖事业线/财富线/情感线评分 + 兜底逻辑
 */
describe('P1-T2.2: KlineScoringService 三线命理评分', () => {
  let svc: KlineScoringService;

  beforeEach(() => {
    svc = new KlineScoringService();
  });

  // ============================================================
  // 兜底评分（无八字档案）
  // ============================================================
  describe('兜底评分（无八字档案）', () => {
    it('bazi=null 应返回 fallback 评分', () => {
      const result = svc.score(null);
      expect(result.source).toBe('fallback');
      expect(result.career.score).toBe(55);
      expect(result.wealth.score).toBe(50);
      expect(result.relationship.score).toBe(55);
    });

    it('bazi 缺 yearGanZhi 应返回 fallback', () => {
      const result = svc.score({ shenWang: '旺' });
      expect(result.source).toBe('fallback');
    });

    it('bazi 缺 shenWang 应返回 fallback', () => {
      const result = svc.score({ yearGanZhi: '甲子' });
      expect(result.source).toBe('fallback');
    });

    it('兜底评分应含 scoredAt 时间戳', () => {
      const result = svc.score(null);
      expect(result.scoredAt).toBeTruthy();
      expect(new Date(result.scoredAt).toString()).not.toBe('Invalid Date');
    });
  });

  // ============================================================
  // 事业线评分
  // ============================================================
  describe('事业线评分（career）', () => {
    it('官星旺+身旺应得高分', () => {
      const bazi = {
        yearGanZhi: '甲子',
        monthGanZhi: '丙寅',
        dayGanZhi: '戊午',
        timeGanZhi: '丁巳',
        shenWang: '旺',
        shenWangScore: 75,
        shiShen: JSON.stringify({ 正官: 8, 七杀: 3 }),
        xiYongShen: JSON.stringify({ yong: ['官'], xi: ['官'], ji: [] }),
        shenSha: JSON.stringify({ 文昌: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.source).toBe('bazi');
      expect(result.career.score).toBeGreaterThanOrEqual(70);
      // 应含官星旺因子
      expect(result.career.factors.some(f => f.name.includes('官星旺'))).toBe(true);
      // 应含身旺因子
      expect(result.career.factors.some(f => f.name.includes('身旺'))).toBe(true);
      // 应含用神为官因子
      expect(result.career.factors.some(f => f.name.includes('用神为官'))).toBe(true);
      // 应含文昌因子
      expect(result.career.factors.some(f => f.name.includes('文昌'))).toBe(true);
    });

    it('无官星+身弱应得低分', () => {
      const bazi = {
        yearGanZhi: '甲子',
        monthGanZhi: '丙寅',
        dayGanZhi: '戊午',
        timeGanZhi: '丁巳',
        shenWang: '弱',
        shenWangScore: 30,
        shiShen: JSON.stringify({}),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: ['官'] }),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.career.score).toBeLessThanOrEqual(40);
      // 应含无官星因子（-5）
      expect(result.career.factors.some(f => f.name.includes('无官星'))).toBe(true);
      // 应含身弱因子（-10）
      expect(result.career.factors.some(f => f.name.includes('身弱'))).toBe(true);
      // 应含忌神为官因子（-8）
      expect(result.career.factors.some(f => f.name.includes('忌神为官'))).toBe(true);
      // 身弱官旺应有风险提示
      if (result.career.riskHint) {
        expect(result.career.riskHint).toContain('压力');
      }
    });

    it('事业线评分应在 0-100 区间', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '中和',
        shenWangScore: 50,
        shiShen: JSON.stringify({ 正官: 5 }),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: [] }),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.career.score).toBeGreaterThanOrEqual(0);
      expect(result.career.score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================
  // 财富线评分
  // ============================================================
  describe('财富线评分（wealth）', () => {
    it('财星旺+食伤生财+身旺应得高分', () => {
      const bazi = {
        yearGanZhi: '甲子',
        monthGanZhi: '丙寅',
        dayGanZhi: '戊午',
        timeGanZhi: '丁巳',
        shenWang: '旺',
        shenWangScore: 70,
        shiShen: JSON.stringify({ 正财: 8, 食神: 5, 伤官: 3 }),
        xiYongShen: JSON.stringify({ yong: ['财'], xi: ['财'], ji: [] }),
        shenSha: JSON.stringify({ 天乙: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.wealth.score).toBeGreaterThanOrEqual(70);
      // 应含财星旺因子
      expect(result.wealth.factors.some(f => f.name.includes('财星旺'))).toBe(true);
      // 应含食伤生财因子
      expect(result.wealth.factors.some(f => f.name.includes('食伤生财'))).toBe(true);
      // 应含身旺能任财因子
      expect(result.wealth.factors.some(f => f.name.includes('身旺能任财'))).toBe(true);
      // 应含天乙贵人因子
      expect(result.wealth.factors.some(f => f.name.includes('天乙'))).toBe(true);
    });

    it('身弱财多应有富屋贫人风险提示', () => {
      const bazi = {
        yearGanZhi: '甲子',
        monthGanZhi: '丙寅',
        dayGanZhi: '戊午',
        timeGanZhi: '丁巳',
        shenWang: '弱',
        shenWangScore: 35,
        shiShen: JSON.stringify({ 正财: 8 }),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: [] }),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      // 身弱财多应有风险提示（含"身弱财多"或"富屋贫人"）
      expect(result.wealth.riskHint).toBeTruthy();
      expect(result.wealth.factors.some(f => f.name.includes('富屋贫人'))).toBe(true);
    });

    it('无财星应减分', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '中和',
        shenWangScore: 50,
        shiShen: JSON.stringify({}),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: [] }),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.wealth.factors.some(f => f.name.includes('无财星'))).toBe(true);
    });
  });

  // ============================================================
  // 情感线评分
  // ============================================================
  describe('情感线评分（relationship）', () => {
    it('男命财星旺+桃花应得高分', () => {
      const bazi = {
        yearGanZhi: '甲子',
        monthGanZhi: '丙寅',
        dayGanZhi: '戊午',
        timeGanZhi: '丁巳',
        shenWang: '旺',
        shenWangScore: 65,
        shiShen: JSON.stringify({ 正财: 6 }),
        xiYongShen: JSON.stringify({ yong: ['财'], xi: ['财'], ji: [] }),
        shenSha: JSON.stringify({ 桃花: true, 红鸾: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.relationship.score).toBeGreaterThanOrEqual(65);
      // 男命以财为妻
      expect(result.relationship.factors.some(f => f.name.includes('财星旺'))).toBe(true);
      // 应含桃花因子
      expect(result.relationship.factors.some(f => f.name.includes('桃花'))).toBe(true);
    });

    it('女命官星旺应得高分', () => {
      const bazi = {
        yearGanZhi: '甲子',
        monthGanZhi: '丙寅',
        dayGanZhi: '戊午',
        timeGanZhi: '丁巳',
        shenWang: '旺',
        shenWangScore: 65,
        shiShen: JSON.stringify({ 正官: 6 }),
        xiYongShen: JSON.stringify({ yong: ['官'], xi: ['官'], ji: [] }),
        shenSha: JSON.stringify({}),
        gender: 'female',
      };
      const result = svc.score(bazi);
      // 女命以官为夫
      expect(result.relationship.factors.some(f => f.name.includes('官星旺'))).toBe(true);
    });

    it('日支逢冲应有风险提示', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '中和',
        shenWangScore: 50,
        shiShen: JSON.stringify({ 正财: 3 }),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: [] }),
        shenSha: JSON.stringify({ 冲: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result.relationship.factors.some(f => f.name.includes('日支逢冲'))).toBe(true);
      expect(result.relationship.riskHint).toContain('婚姻波动');
    });
  });

  // ============================================================
  // 命理学注释来源
  // ============================================================
  describe('命理学注释来源', () => {
    it('事业线因子应含命理学出处', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '旺',
        shenWangScore: 70,
        shiShen: JSON.stringify({ 正官: 5 }),
        xiYongShen: JSON.stringify({ yong: ['官'], xi: [], ji: [] }),
        shenSha: JSON.stringify({ 文昌: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      // 至少一个因子含命理学出处
      const hasSource = result.career.factors.some(f => f.source && f.source.length > 0);
      expect(hasSource).toBe(true);
    });

    it('财富线因子应含命理学出处', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '旺',
        shenWangScore: 70,
        shiShen: JSON.stringify({ 正财: 5, 食神: 3 }),
        xiYongShen: JSON.stringify({ yong: ['财'], xi: [], ji: [] }),
        shenSha: JSON.stringify({ 天乙: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      const hasSource = result.wealth.factors.some(f => f.source && f.source.length > 0);
      expect(hasSource).toBe(true);
    });

    it('情感线因子应含命理学出处', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '旺',
        shenWangScore: 70,
        shiShen: JSON.stringify({ 正财: 5 }),
        xiYongShen: JSON.stringify({ yong: ['财'], xi: [], ji: [] }),
        shenSha: JSON.stringify({ 桃花: true }),
        gender: 'male',
      };
      const result = svc.score(bazi);
      const hasSource = result.relationship.factors.some(f => f.source && f.source.length > 0);
      expect(hasSource).toBe(true);
    });
  });

  // ============================================================
  // 评分聚合结构
  // ============================================================
  describe('评分聚合结构', () => {
    it('应返回 career/wealth/relationship 三线', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '中和',
        shenWangScore: 50,
        shiShen: JSON.stringify({ 正官: 3, 正财: 3 }),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: [] }),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result).toHaveProperty('career');
      expect(result).toHaveProperty('wealth');
      expect(result).toHaveProperty('relationship');
      expect(result.career.dimension).toBe('career');
      expect(result.wealth.dimension).toBe('wealth');
      expect(result.relationship.dimension).toBe('relationship');
    });

    it('每个 LineScore 应含 score/reasoning/factors', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '中和',
        shenWangScore: 50,
        shiShen: JSON.stringify({ 正官: 3 }),
        xiYongShen: JSON.stringify({ yong: [], xi: [], ji: [] }),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      for (const line of [result.career, result.wealth, result.relationship]) {
        expect(typeof line.score).toBe('number');
        expect(typeof line.reasoning).toBe('string');
        expect(Array.isArray(line.factors)).toBe(true);
      }
    });

    it('source 应为 bazi 或 fallback', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '旺',
        shenWangScore: 70,
        shiShen: JSON.stringify({}),
        xiYongShen: JSON.stringify({}),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const withBazi = svc.score(bazi);
      expect(withBazi.source).toBe('bazi');

      const withoutBazi = svc.score(null);
      expect(withoutBazi.source).toBe('fallback');
    });
  });

  // ============================================================
  // 异常处理
  // ============================================================
  describe('异常处理', () => {
    it('shiShen 为非 JSON 字符串应走兜底不崩溃', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '旺',
        shenWangScore: 70,
        shiShen: 'invalid json',
        xiYongShen: 'invalid json',
        shenSha: 'invalid json',
        gender: 'male',
      };
      // 不应抛异常
      const result = svc.score(bazi);
      expect(result).toBeDefined();
      // 应该走兜底或返回有效评分
      expect(['bazi', 'fallback']).toContain(result.source);
    });

    it('shenWangScore 为非数字应不崩溃', () => {
      const bazi = {
        yearGanZhi: '甲子',
        shenWang: '旺',
        shenWangScore: 'invalid' as any,
        shiShen: JSON.stringify({ 正官: 3 }),
        xiYongShen: JSON.stringify({}),
        shenSha: JSON.stringify({}),
        gender: 'male',
      };
      const result = svc.score(bazi);
      expect(result).toBeDefined();
    });
  });
});
