import { BaziCalculatorWrapper } from './bazi-calculator-wrapper';

describe('BaziCalculatorWrapper', () => {
  let calculator: BaziCalculatorWrapper;

  beforeEach(() => {
    calculator = new BaziCalculatorWrapper();
  });

  it('counts wuxing by heavenly stems plus branch main qi', () => {
    expect(calculator.countMainQiWuxing(['癸亥', '己巳', '戊戌', '壬子'])).toEqual({
      wood: 0,
      fire: 1,
      earth: 3,
      metal: 0,
      water: 4,
    });
  });

  describe('calculate', () => {
    it('should calculate correct bazi for 1990-05-15 14:30 male', async () => {
      const result = await calculator.calculate({
        year: 1990,
        month: 4, // 0-indexed, so 4 = May
        day: 15,
        hour: 14,
        minute: 30,
        gender: 'male',
      });

      console.log('=== 1990-05-15 14:30 Male ===');
      console.log('yearPillar:', result.yearPillar);
      console.log('monthPillar:', result.monthPillar);
      console.log('dayPillar:', result.dayPillar);
      console.log('hourPillar:', result.hourPillar);
      console.log('naYin:', result.naYin);
      console.log('daYun count:', result.daYun.length);

      // Year 1990 = 庚年 (yearGanIndex = 6)
      // For 庚 year, wuHuDun starting = 戊 (index 4)
      // 5月15日在立夏(5/5)和芒种(6/6)之间 → 巳月
      // Note: The old formula gave 壬午 which was incorrect
      // monthZhiIndex based on solar terms: mmdd=515 → 巳月 (index 5)
      // 乙庚年戊寅起，巳月为辛巳
      expect(result.monthPillar).toBe('辛巳');
      expect(result.yearPillar).toBe('庚午');
    });

    it('should calculate 己未 month and 寅 hour for 1983-07-11 03:00', async () => {
      const result = await calculator.calculate({
        year: 1983,
        month: 6,
        day: 11,
        hour: 3,
        minute: 0,
        gender: 'male',
      });

      expect(result.yearPillar).toBe('癸亥');
      expect(result.monthPillar).toBe('己未');
      expect(result.hourPillar.endsWith('寅')).toBe(true);
    });

    it('should calculate correct bazi for 1990-05-15 14:30 female', async () => {
      const result = await calculator.calculate({
        year: 1990,
        month: 4,
        day: 15,
        hour: 14,
        minute: 30,
        gender: 'female',
      });

      console.log('=== 1990-05-15 14:30 Female ===');
      console.log('yearPillar:', result.yearPillar);
      console.log('monthPillar:', result.monthPillar);
      console.log('dayPillar:', result.dayPillar);
      console.log('hourPillar:', result.hourPillar);

      // Same birth date, different gender affects dayun direction
      expect(result.yearPillar).toBe('庚午');
    });

    it('should calculate naYin correctly for each pillar', async () => {
      const result = await calculator.calculate({
        year: 1990,
        month: 4,
        day: 15,
        hour: 14,
        minute: 30,
        gender: 'male',
      });

      console.log('naYin:', result.naYin);

      // All naYin values should be known (not '未知')
      expect(result.naYin.year).not.toBe('未知');
      expect(result.naYin.month).not.toBe('未知');
      expect(result.naYin.day).not.toBe('未知');
      expect(result.naYin.hour).not.toBe('未知');
    });

    it('should calculate correct dayun', async () => {
      const result = await calculator.calculate({
        year: 1990,
        month: 4,
        day: 15,
        hour: 14,
        minute: 30,
        gender: 'male',
      });

      console.log('daYun:', result.daYun);

      // Should have 8 dayun periods
      expect(result.daYun.length).toBe(8);

      // First dayun should start around age 3-8
      expect(result.daYun[0].startAge).toBeGreaterThanOrEqual(1);
      expect(result.daYun[0].startAge).toBeLessThanOrEqual(10);
    });
  });
});
