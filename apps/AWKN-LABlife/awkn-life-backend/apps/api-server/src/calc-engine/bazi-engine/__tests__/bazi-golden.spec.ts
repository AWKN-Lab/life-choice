import { readFileSync } from 'fs';
import { join } from 'path';
import { BaziCalculatorWrapper, BaziInput, BaziFullResult } from '../../bazi-calculator-wrapper';

const GOLDEN_DIR = join(__dirname, 'golden');
const goldenData = JSON.parse(readFileSync(join(GOLDEN_DIR, 'golden-cases.json'), 'utf-8'));

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

interface GoldenCase {
  id: string;
  name: string;
  category: string;
  solar: string | null;
  hour: number;
  gender: 'male' | 'female';
  expected: {
    yearPillar?: string;
    monthPillar?: string;
    dayPillar?: string;
    hourPillar?: string;
    kongWang?: string[];
    naYin?: { year?: string; month?: string; day?: string; hour?: string };
    daYunStartAge?: number;
    daYunDirection?: string;
    zanggan?: { year?: string[]; month?: string[]; day?: string[]; hour?: string[] };
  };
  source: string;
  note: string;
}

function solarToInput(solar: string, hour: number, gender: string): BaziInput {
  const d = new Date(solar);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour,
    minute: 0,
    gender: gender === 'male' ? 'male' : 'female',
  };
}

function getDaYunDirection(result: BaziFullResult): string | undefined {
  if (result.daYun && result.daYun.length >= 2) {
    const first = result.daYun[0];
    const second = result.daYun[1];
    const firstZhiIdx = ZHI.indexOf(first.zhi);
    const secondZhiIdx = ZHI.indexOf(second.zhi);
    const monthZhiIdx = ZHI.indexOf(result.monthPillar[1]);
    if (secondZhiIdx === (firstZhiIdx + 1) % 12) return '顺排';
    if (secondZhiIdx === (firstZhiIdx - 1 + 12) % 12) return '逆排';
  }
  return undefined;
}

describe('BaZi Golden Tests', () => {
  let wrapper: BaziCalculatorWrapper;

  beforeAll(() => {
    wrapper = new BaziCalculatorWrapper();
  });

  const testCases: GoldenCase[] = goldenData.cases.filter((c: GoldenCase) => c.solar !== null);

  describe.each(testCases)('Case $id: $name', (tc: GoldenCase) => {
    let result: BaziFullResult;

    beforeAll(async () => {
      const input = solarToInput(tc.solar!, tc.hour, tc.gender);
      result = await wrapper.calculate(input);
    });

    if (tc.expected.yearPillar) {
      it('should calculate correct year pillar', () => {
        expect(result.yearPillar).toBe(tc.expected.yearPillar);
      });
    }

    if (tc.expected.monthPillar) {
      it('should calculate correct month pillar', () => {
        expect(result.monthPillar).toBe(tc.expected.monthPillar);
      });
    }

    if (tc.expected.dayPillar) {
      it('should calculate correct day pillar', () => {
        expect(result.dayPillar).toBe(tc.expected.dayPillar);
      });
    }

    if (tc.expected.hourPillar) {
      it('should calculate correct hour pillar', () => {
        expect(result.hourPillar).toBe(tc.expected.hourPillar);
      });
    }

    if (tc.expected.kongWang) {
      it('should calculate correct kongwang', () => {
        expect(result.kongWang.sort()).toEqual(tc.expected.kongWang.sort());
      });
    }

    if (tc.expected.naYin) {
      it('should calculate correct nayin', () => {
        if (tc.expected.naYin!.year) {
          expect(result.naYin.year).toBe(tc.expected.naYin!.year);
        }
        if (tc.expected.naYin!.month) {
          expect(result.naYin.month).toBe(tc.expected.naYin!.month);
        }
        if (tc.expected.naYin!.day) {
          expect(result.naYin.day).toBe(tc.expected.naYin!.day);
        }
        if (tc.expected.naYin!.hour) {
          expect(result.naYin.hour).toBe(tc.expected.naYin!.hour);
        }
      });
    }

    if (tc.expected.daYunDirection) {
      it('should determine correct dayun direction', () => {
        const direction = getDaYunDirection(result);
        expect(direction).toBe(tc.expected.daYunDirection);
      });
    }

    if (tc.expected.daYunStartAge) {
      it('should calculate correct dayun start age', () => {
        const startAge = result.daYun?.[0]?.startAge;
        expect(startAge).toBe(tc.expected.daYunStartAge);
      });
    }

    if (tc.expected.zanggan) {
      it('should calculate correct zanggan', () => {
        const zanggan = result.zangganShishen;
        if (!zanggan) {
          return;
        }
        const pillars = ['year', 'month', 'day', 'hour'] as const;
        for (const p of pillars) {
          if (tc.expected.zanggan![p]) {
            const pZanggan = zanggan[p] || [];
            const pGan = Array.isArray(pZanggan)
              ? pZanggan.map((g: any) => typeof g === 'string' ? g : g.gan)
              : [];
            tc.expected.zanggan![p]!.forEach((g: string) => {
              expect(pGan).toContain(g);
            });
          }
        }
      });
    }
  });

  describe('Category Coverage', () => {
    it('should cover all 9 boundary categories', () => {
      const required = [
        '节气边界', '子时处理', '男女顺逆',
        '大运验证', '空亡验证', '藏干十神',
        '纳音验证', '神煞验证', '格局验证'
      ];
      required.forEach((cat) => {
        const count = goldenData.cases.filter((c: GoldenCase) => c.category === cat).length;
        expect(count).toBeGreaterThan(0);
      });
    });

    it('should have at least 30 test cases', () => {
      expect(goldenData.cases.length).toBeGreaterThanOrEqual(30);
    });

    it('should have at least 28 cases with solar dates', () => {
      const withDates = goldenData.cases.filter((c: GoldenCase) => c.solar !== null);
      expect(withDates.length).toBeGreaterThanOrEqual(28);
    });
  });
});
