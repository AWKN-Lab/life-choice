import { calculateScore, getObservationPeriod, getRedLines, getThreeWindows } from './score-engine';

describe('ScoreEngine', () => {
  describe('calculateScore - 案例基准验证', () => {
    it('案例.docx 婚姻咨询应落在 60-70 区间（实际输出 61）', () => {
      // 案例八字：己巳 壬申 壬子 癸卯
      // 格局：壬水生于申月，申子辰水局，水旺
      // 风险：子午冲夫妻宫、伤官见官
      // 实际输出：61/100（早期文档误记为 66，2026-06-27 修正）
      const result = calculateScore({
        geJuName: '正官格',
        geJuSuccess: true,
        brokenWithoutRescue: false,
        jiShenSignals: ['子午冲', '伤官见官'],
        rescueSignals: ['卯木泄壬生丙'],
        yongShenStrong: true,
        wuXingExtreme: true,
        scenario: '婚姻',
      });

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThanOrEqual(70);
      expect(result.evidence).toHaveLength(3);
      // 案例含伤官见官（高风险信号），风险等级为 high
      expect(result.riskLevel).toBe('high');
    });

    it('高风险命局（七杀无制+羊刃逢冲）应低于 40', () => {
      const result = calculateScore({
        geJuSuccess: false,
        brokenWithoutRescue: true,
        jiShenSignals: ['七杀无制', '羊刃逢冲'],
        rescueSignals: [],
        yongShenStrong: false,
        wuXingExtreme: true,
      });

      expect(result.score).toBeLessThan(40);
      expect(result.riskLevel).toBe('high');
    });

    it('平和命局应高于 70', () => {
      const result = calculateScore({
        geJuSuccess: true,
        brokenWithoutRescue: false,
        jiShenSignals: [],
        rescueSignals: ['印星化杀'],
        yongShenStrong: true,
        wuXingExtreme: false,
      });

      expect(result.score).toBeGreaterThan(70);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('getObservationPeriod', () => {
    it('婚姻场景应为 3 个月', () => {
      const result = getObservationPeriod('婚姻');
      expect(result.months).toBe(3);
      expect(result.conditions).toHaveLength(3);
    });

    it('事业场景应为 6 个月', () => {
      const result = getObservationPeriod('事业');
      expect(result.months).toBe(6);
    });

    it('财运场景应为 12 个月', () => {
      const result = getObservationPeriod('财运');
      expect(result.months).toBe(12);
    });

    it('子女场景应为 9 个月', () => {
      const result = getObservationPeriod('子女');
      expect(result.months).toBe(9);
    });
  });

  describe('getRedLines', () => {
    it('婚姻场景应有 3 条红线', () => {
      const result = getRedLines('婚姻');
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('不共同贷款');
    });

    it('财运场景应有 3 条红线', () => {
      const result = getRedLines('财运');
      expect(result).toHaveLength(3);
      expect(result[0]).toContain('不替人担保');
    });
  });

  describe('getThreeWindows', () => {
    it('应返回近/中/远三段', () => {
      const result = getThreeWindows('婚姻');
      expect(result.near).toBeTruthy();
      expect(result.mid).toBeTruthy();
      expect(result.far).toBeTruthy();
      expect(result.near).not.toBe(result.mid);
    });
  });
});
