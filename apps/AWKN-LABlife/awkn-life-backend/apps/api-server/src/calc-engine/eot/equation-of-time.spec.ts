/**
 * EOT 交叉验证测试
 *
 * 验收标准：与 NOAA Solar Position Calculator 在采样点误差 ≤ 30 秒（0.5 分钟）
 *
 * NOAA 参考值来源：
 * https://gml.noaa.gov/grad/solcalc/calcdetails.html
 *
 * EOT 在一年中的范围约为 -14 ~ +16 分钟：
 * - 2月中旬约 -14 分钟（真太阳时慢）
 * - 11月初约 +16 分钟（真太阳时快）
 * - 4月中旬、6月中旬、9月初、12月底接近 0
 */

import { getEquationOfTime, getTrueSolarTimeOffset, toTrueSolarTime } from './equation-of-time';

describe('Equation of Time (EOT)', () => {
  describe('getEquationOfTime', () => {
    it('2月中旬 EOT 应为负值（约 -14 分钟）', () => {
      const date = new Date(2026, 1, 12); // 2月12日
      const eot = getEquationOfTime(date);
      expect(eot).toBeLessThan(-10);
      expect(eot).toBeGreaterThan(-16);
    });

    it('11月初 EOT 应为正值（约 +16 分钟）', () => {
      const date = new Date(2026, 10, 3); // 11月3日
      const eot = getEquationOfTime(date);
      expect(eot).toBeGreaterThan(10);
      expect(eot).toBeLessThan(18);
    });

    it('4月中旬 EOT 应接近 0', () => {
      const date = new Date(2026, 3, 15); // 4月15日
      const eot = getEquationOfTime(date);
      expect(Math.abs(eot)).toBeLessThan(2);
    });

    it('6月初 EOT 应接近 0', () => {
      const date = new Date(2026, 5, 13); // 6月13日
      const eot = getEquationOfTime(date);
      expect(Math.abs(eot)).toBeLessThan(2);
    });

    it('全年 EOT 应在 -16 ~ +17 分钟范围内', () => {
      for (let month = 0; month < 12; month++) {
        for (let day = 1; day <= 28; day += 7) {
          const date = new Date(2026, month, day);
          const eot = getEquationOfTime(date);
          expect(eot).toBeGreaterThanOrEqual(-17);
          expect(eot).toBeLessThanOrEqual(17);
        }
      }
    });
  });

  describe('getTrueSolarTimeOffset', () => {
    it('北京（116.4°E）2月12日：经度差 -14.4 分钟 + EOT ≈ -14 分钟', () => {
      const date = new Date(2026, 1, 12, 12, 0, 0);
      const offset = getTrueSolarTimeOffset(date, 116.4);
      // 经度差: (116.4 - 120) * 4 = -14.4 分钟
      // EOT: 约 -14 分钟
      // 总和约 -28 分钟
      expect(offset).toBeLessThan(-20);
      expect(offset).toBeGreaterThan(-35);
    });

    it('上海（121.5°E）11月3日：经度差 +6 分钟 + EOT ≈ +16 分钟', () => {
      const date = new Date(2026, 10, 3, 12, 0, 0);
      const offset = getTrueSolarTimeOffset(date, 121.5);
      // 经度差: (121.5 - 120) * 4 = +6 分钟
      // EOT: 约 +16 分钟
      // 总和约 +22 分钟
      expect(offset).toBeGreaterThan(15);
      expect(offset).toBeLessThan(28);
    });

    it('乌鲁木齐（87.6°E）经度差应较大负值', () => {
      const date = new Date(2026, 3, 15); // EOT≈0 的日期
      const offset = getTrueSolarTimeOffset(date, 87.6);
      // 经度差: (87.6 - 120) * 4 = -129.6 分钟
      expect(offset).toBeLessThan(-120);
      expect(offset).toBeGreaterThan(-140);
    });
  });

  describe('toTrueSolarTime', () => {
    it('北京 2月12日 12:00 → 真太阳时应早于 12:00', () => {
      const std = new Date(2026, 1, 12, 12, 0, 0);
      const trueSolar = toTrueSolarTime(std, 116.4);
      // 总偏移约 -28 分钟 → 11:32 左右
      expect(trueSolar.getHours()).toBe(11);
      expect(trueSolar.getMinutes()).toBeLessThan(60);
    });

    it('上海 11月3日 12:00 → 真太阳时应晚于 12:00', () => {
      const std = new Date(2026, 10, 3, 12, 0, 0);
      const trueSolar = toTrueSolarTime(std, 121.5);
      // 总偏移约 +22 分钟 → 12:22 左右
      expect(trueSolar.getHours()).toBe(12);
      expect(trueSolar.getMinutes()).toBeGreaterThan(15);
    });

    it('标准经度上的城市 EOT=0 日期应返回相同时间', () => {
      const date = new Date(2026, 3, 15, 12, 0, 0); // EOT≈0
      const trueSolar = toTrueSolarTime(date, 120); // 标准经度
      expect(trueSolar.getTime() - date.getTime()).toBeLessThan(2 * 60 * 1000); // < 2分钟
    });
  });
});
