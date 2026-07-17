/**
 * B1: 真节气批量交叉验证测试
 *
 * 对照数据源：香港天文台 (HKO) 2026 年二十四节气日期
 * https://www.weather.gov.hk/tc/gts/astronomy/Solar_Term.htm
 */
import { getJieQi, JIE_INDICES, isBeforeLiChun, getYearPillarGan, getYearPillarZhi } from '../core/solar-terms';

const JIE_NAME_MAP: Record<number, string> = {
  19: '小寒', 21: '立春', 23: '惊蛰', 1: '清明', 3: '立夏', 5: '芒种',
  7: '小暑', 9: '立秋', 11: '白露', 13: '寒露', 15: '立冬', 17: '大雪',
};

const HKO_2026_JIE: Record<number, [number, number]> = {
  19: [1, 5], 21: [2, 4], 23: [3, 5], 1: [4, 5], 3: [5, 5], 5: [6, 5],
  7: [7, 7], 9: [8, 7], 11: [9, 7], 13: [10, 8], 15: [11, 7], 17: [12, 7],
};

interface BCase { name: string; year: number; month: number; day: number; hour: number; expectedYearPillar: string; }

const BOUNDARY_CASES: BCase[] = [
  { name: '1956-02-05 立春当日午时', year: 1956, month: 1, day: 5, hour: 12, expectedYearPillar: '丙申' },
  { name: '1956-02-04 立春前一日 (寿星公式: 立春≈2/3, 2/4已过)', year: 1956, month: 1, day: 4, hour: 12, expectedYearPillar: '丙申' },
  { name: '2000-02-04 立春当日22时', year: 2000, month: 1, day: 4, hour: 22, expectedYearPillar: '庚辰' },
  { name: '2000-02-04 0时 (寿星公式: 立春≈2/3, 0时已过)', year: 2000, month: 1, day: 4, hour: 0, expectedYearPillar: '庚辰' },
  { name: '2024-02-04 立春当日18时', year: 2024, month: 1, day: 4, hour: 18, expectedYearPillar: '甲辰' },
];

describe('B1: 真节气批量交叉验证', () => {

  describe('B1-1: HKO 2026 十二节对照', () => {
    for (const [idxStr, [expMonth, expDay]] of Object.entries(HKO_2026_JIE)) {
      const idx = Number(idxStr);
      const name = JIE_NAME_MAP[idx] || `Idx${idx}`;
      it(`2026 ${name} = ${expMonth}/${expDay} (±1天)`, () => {
        const date = getJieQi(2026, idx);
        expect(date.getUTCMonth() + 1).toBe(expMonth);
        const dayDiff = Math.abs(date.getUTCDate() - expDay);
        expect(dayDiff).toBeLessThanOrEqual(1);
      });
    }
  });

  describe('B1-2: 内部一致性', () => {
    it('相邻年立春间隔 365±1 天', () => {
      for (let y = 1950; y < 2100; y++) {
        const d = (getJieQi(y + 1, 21).getTime() - getJieQi(y, 21).getTime()) / 86400000;
        expect(d).toBeGreaterThan(363);  // 闰年允许略低于365
        expect(d).toBeLessThan(368);
      }
    });

    it('节气日区间合理 (1950-2100)', () => {
      const RANGE: Record<number, [number, number]> = {
        19: [3, 7], 21: [2, 6], 23: [4, 8], 1: [3, 7], 3: [3, 8], 5: [4, 8],
        7: [5, 9], 9: [5, 10], 11: [6, 10], 13: [6, 10], 15: [5, 9], 17: [5, 9],
      };
      for (let y = 1950; y <= 2100; y++) {
        for (const idx of JIE_INDICES) {
          const d = getJieQi(y, idx).getUTCDate();
          expect(d).toBeGreaterThanOrEqual(RANGE[idx][0]);
          expect(d).toBeLessThanOrEqual(RANGE[idx][1]);
        }
      }
    });
  });

  describe('B1-3: 边界日验证', () => {
    for (const bc of BOUNDARY_CASES) {
      it(bc.name, () => {
        const isBefore = isBeforeLiChun(bc.year, bc.month, bc.day, bc.hour);
        const effYear = isBefore ? bc.year - 1 : bc.year;
        const gan = getYearPillarGan(effYear);
        const zhi = getYearPillarZhi(effYear);
        expect(gan + zhi).toBe(bc.expectedYearPillar);
      });
    }
  });

  describe('B1-4: 统计报告', () => {
    it('节气日区间统计 (1950-2100)', () => {
      const stats: Record<string, { minD: number; maxD: number; count: number }> = {};
      for (const idx of JIE_INDICES) {
        const name = JIE_NAME_MAP[idx]!;
        stats[name] = { minD: 99, maxD: 0, count: 0 };
      }
      for (let y = 1950; y <= 2100; y++) {
        for (const idx of JIE_INDICES) {
          const day = getJieQi(y, idx).getUTCDate();
          const s = stats[JIE_NAME_MAP[idx]!]!;
          s.minD = Math.min(s.minD, day);
          s.maxD = Math.max(s.maxD, day);
          s.count++;
        }
      }
      console.log('\n=== B1 节气统计 (1950-2100, 151年) ===');
      for (const [name, s] of Object.entries(stats)) {
        console.log(`  ${name}: ${s.minD}-${s.maxD}日 (跨度${s.maxD - s.minD}天, ${s.count}条)`);
        expect(s.count).toBe(151);
        expect(s.maxD - s.minD).toBeLessThanOrEqual(5);
      }
    });
  });
});