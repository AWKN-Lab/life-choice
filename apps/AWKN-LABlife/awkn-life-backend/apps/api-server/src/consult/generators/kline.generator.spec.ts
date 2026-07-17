import { KlineGenerator } from './kline.generator';
import { BaziFullResult } from '../../calc-engine/bazi-calculator-wrapper';

const baziFixture: BaziFullResult = {
  yearPillar: '庚午',
  monthPillar: '己丑',
  dayPillar: '丙寅',
  hourPillar: '甲午',
  yearShishen: '偏财',
  monthShishen: '伤官',
  dayShishen: '日主',
  hourShishen: '偏印',
  wuxing: { wood: 2, fire: 3, earth: 2, metal: 1, water: 0 },
  daYun: [
    { index: 0, gan: '庚', zhi: '寅', full: '庚寅', startAge: 3, endAge: 12 },
    { index: 1, gan: '辛', zhi: '卯', full: '辛卯', startAge: 13, endAge: 22 },
    { index: 2, gan: '壬', zhi: '辰', full: '壬辰', startAge: 23, endAge: 32 },
    { index: 3, gan: '癸', zhi: '巳', full: '癸巳', startAge: 33, endAge: 42 },
  ],
  liuNian: [
    { year: 2024, ganZhi: '甲辰', shishen: '偏印' },
    { year: 2025, ganZhi: '乙巳', shishen: '正印' },
    { year: 2026, ganZhi: '丙午', shishen: '比肩' },
  ],
  shenSha: {
    tianYi: ['亥', '酉'],
    taiJi: ['午'],
    wenChang: ['申'],
    yangRen: ['午'],
    taoHua: ['卯'],
  },
  naYin: {
    year: '路旁土',
    month: '霹雳火',
    day: '炉中火',
    hour: '沙中金',
  },
  kongWang: [],
  taiYuan: '庚辰',
  mingGong: '甲申',
  shenGong: '丙申',
  qiYunAge: { years: 4, months: 0, days: 0 },
  zangganShishen: {
    year: [],
    month: [],
    day: [],
    hour: [],
  },
  changsheng: {
    year: '胎',
    month: '养',
    day: '长生',
    hour: '帝旺',
  },
  selfSeat: {
    year: '午中丁己',
    month: '丑中己辛癸',
    day: '寅中甲丙戊',
    hour: '午中丁己',
  },
  shenShaByPillar: {
    year: ['天乙贵人', '太极贵人'],
    month: [],
    day: ['文昌'],
    hour: ['天乙贵人', '太极贵人'],
  },
  xingChongHeHai: {
    he: [],
    chong: [],
    hai: [],
    xing: [],
  },
  liuNianDetail: [],
};

describe('KlineGenerator', () => {
  const generator = new KlineGenerator();

  it('generates deterministic life chart data for the same input', () => {
    const first = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
    });
    const second = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
    });

    expect(second).toEqual(first);
  });

  it('returns 101 yearly points for the default 0-100 life chart', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
    });

    expect(data).toHaveLength(101);
    expect(data[0].age).toBe(0);
    expect(data[data.length - 1].age).toBe(100);
  });

  it('returns 81 yearly points when the 80-year range is requested', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
      rangeYears: 80,
    });

    expect(data).toHaveLength(81);
    expect(data[data.length - 1].age).toBe(80);
  });

  it('returns year-month detail points without changing monthlyData semantics', () => {
    const detail = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
      viewMode: 'yearMonth',
      rangeYears: 80,
    });
    const monthly = generator.generateMonthlyData(baziFixture, 1990, '12:00', 2026);

    expect(detail).toHaveLength(81 * 12);
    expect(detail[0]).toEqual(expect.objectContaining({
      month: 1,
      granularity: 'month',
      viewMode: 'yearMonth',
    }));
    expect(monthly).toHaveLength(12);
    expect(monthly[0].viewMode).toBe('monthly');
  });

  it('adds the public K-line metadata fields to every point', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
    });

    expect(data[0]).toEqual(expect.objectContaining({
      volatility: expect.any(Number),
      evidenceTags: expect.any(Array),
      confidence: expect.any(Number),
      viewMode: 'life',
      liuNian: expect.any(String),
    }));
  });

  it('lowers confidence when birth time is missing', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '',
      currentYear: 2026,
    });

    expect(data[0].confidence).toBeLessThan(80);
  });

  it('returns current decade data when requested', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      viewMode: 'decade',
      currentYear: 2026,
    });

    expect(data.every((point) => point.age >= 33 && point.age <= 42)).toBe(true);
  });

  it('returns future 12-month data when requested', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      viewMode: 'monthly',
      currentYear: 2026,
    }) as any[];

    expect(data).toHaveLength(12);
    expect(data[0]).toEqual(expect.objectContaining({
      month: expect.any(Number),
      monthName: expect.any(String),
      viewMode: 'monthly',
      evidenceTags: expect.any(Array),
    }));
  });

  it('marks the current year and da-yun boundary in life view', () => {
    const data = generator.generateKLineData(baziFixture, 1990, {
      birthTime: '12:00',
      currentYear: 2026,
    });

    expect(data.some((point) => point.isCurrentYear && point.year === 2026)).toBe(true);
    expect(data.some((point) => point.isDaYunChange && point.age === 33)).toBe(true);
  });
});
