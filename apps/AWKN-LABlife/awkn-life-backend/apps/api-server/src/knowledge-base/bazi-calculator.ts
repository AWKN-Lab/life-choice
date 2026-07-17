export interface BaZiPillar {
  pillar: string;
  gan: string;
  zhi: string;
  hiddenStems: string[];
}

export interface BaZiChart {
  year: BaZiPillar;
  month: BaZiPillar;
  day: BaZiPillar;
  hour: BaZiPillar;
}

export interface TenGods {
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;
}

export interface WuXingCount {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

export interface PatternAnalysis {
  patternName: string;
  subType: string;
  strength: 'strong' | 'weak' | 'neutral';
  strengthScore: number;
  favorableElements: string[];
  unfavorableElements: string[];
  usableGods: string[];
 忌神Gods: string[];
}

export interface YunAnalysis {
  decadeYun: DecadeYun[];
  currentYunIndex: number;
}

export interface DecadeYun {
  startAge: number;
  endAge: number;
  ganZhi: string;
  wuxing: string[];
  tendency: '顺利' | '平稳' | '挑战' | '调整' | '突破';
}

export interface JieQiDate {
  name: string;
  date: string;
}

export interface MonthlyFortune {
  period: string;
  liuYue: string;
  rating: number;
  judgment: string;
}

export interface TiaoHouResult {
  yongShen: string[];
  description: string;
}

export interface ShiShenInteraction {
  pattern: string;
  description: string;
  implication: string;
}

export interface LiuQinResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const WU_XING_MAP: Record<string, '木' | '火' | '土' | '金' | '水'> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

export const ZHI_WU_XING_MAP: Record<string, '木' | '火' | '土' | '金' | '水'> = {
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '辰': '土', '丑': '土', '未': '土', '戌': '土',
  '申': '金', '酉': '金',
  '子': '水', '亥': '水',
};

const ZHI_YIN_YANG_MAP: Record<string, '阳' | '阴'> = {
  '子': '阳', '丑': '阴', '寅': '阳', '卯': '阴',
  '辰': '阳', '巳': '阴', '午': '阳', '未': '阴',
  '申': '阳', '酉': '阴', '戌': '阳', '亥': '阴',
};

export const GAN_YIN_YANG_MAP: Record<string, '阳' | '阴'> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

const JI_GONG: Record<string, string> = {
  '甲': '寅', '乙': '辰', '丙': '巳', '丁': '未',
  '戊': '巳', '己': '未', '庚': '申', '辛': '戌',
  '壬': '亥', '癸': '丑',
};

const ZHI_SHENG_FU: Record<string, string[]> = {
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['乙', '戊', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['丁', '己', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['辛', '戊', '丁'],
  '亥': ['壬', '甲'],
  '子': ['癸'],
  '丑': ['己', '辛', '癸'],
};

const LIU_CHONG_MAP: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};

const LIU_HE_MAP: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午',
};

const WU_HU_DUN_MAP: Record<string, number> = {
  '甲': 2, '己': 2,
  '乙': 4, '庚': 4,
  '丙': 6, '辛': 6,
  '丁': 8, '壬': 8,
  '戊': 0, '癸': 0,
};

const JIE_QI_DATES_2026: JieQiDate[] = [
  { name: '小寒', date: '2026-01-05 23:15' },
  { name: '大寒', date: '2026-01-20 16:38' },
  { name: '立春', date: '2026-02-04 08:42' },
  { name: '雨水', date: '2026-02-18 18:44' },
  { name: '惊蛰', date: '2026-03-05 22:58' },
  { name: '春分', date: '2026-03-20 23:46' },
  { name: '清明', date: '2026-04-05 03:18' },
  { name: '谷雨', date: '2026-04-20 10:28' },
  { name: '立夏', date: '2026-05-05 19:49' },
  { name: '小满', date: '2026-05-21 08:37' },
  { name: '芒种', date: '2026-06-05 23:48' },
  { name: '小暑', date: '2026-07-07 10:14' },
  { name: '大暑', date: '2026-07-22 21:32' },
  { name: '立秋', date: '2026-08-07 14:06' },
  { name: '处暑', date: '2026-08-23 05:18' },
  { name: '白露', date: '2026-09-07 17:28' },
  { name: '秋分', date: '2026-09-23 02:52' },
  { name: '寒露', date: '2026-10-08 08:16' },
  { name: '霜降', date: '2026-10-23 11:24' },
  { name: '立冬', date: '2026-11-07 11:42' },
  { name: '小雪', date: '2026-11-22 09:16' },
  { name: '大雪', date: '2026-12-07 04:38' },
  { name: '冬至', date: '2026-12-21 22:42' },
  { name: '小寒(次年)', date: '2027-01-05 23:15' },
];

export class BaZiCalculator {
  private dayHeavenlyStemIndex: number = 0;

  static describeTrueSolarTimeCorrection(date: Date, location: string): string {
    const CITY_COORDS: Record<string, number> = {
      '北京': 116.41, '上海': 121.47, '广州': 113.26, '深圳': 114.06,
      '成都': 104.07, '杭州': 120.15, '南京': 118.80, '武汉': 114.31,
      '重庆': 106.55, '西安': 108.94, '天津': 117.36, '苏州': 120.59,
      '长沙': 112.94, '郑州': 113.63, '济南': 116.99, '沈阳': 123.43,
      '昆明': 102.83, '贵阳': 106.71, '福州': 119.30, '厦门': 118.09,
      '南昌': 115.89, '合肥': 117.28, '石家庄': 114.51, '哈尔滨': 126.63,
      '长春': 125.32, '太原': 112.55, '南宁': 108.37, '兰州': 103.83,
      '海口': 110.35, '香港': 114.17, '澳门': 113.55, '台北': 121.56,
      '樟树': 115.54, '阳江': 111.98, '大连': 121.61, '青岛': 120.38,
    };
    const lng = CITY_COORDS[location];
    if (!lng) return `${location}未在坐标库中，时辰暂按输入时间排盘，补充精确出生地可进一步校准`;

    const offsetMin = Math.round((lng - 120) * 4);
    const corrected = new Date(date.getTime() + offsetMin * 60 * 1000);
    const shiChenMap: Record<number, string> = { 23: '子', 0: '子', 1: '丑', 2: '丑', 3: '寅', 4: '寅', 5: '卯', 6: '卯', 7: '辰', 8: '辰', 9: '巳', 10: '巳', 11: '午', 12: '午', 13: '未', 14: '未', 15: '申', 16: '申', 17: '酉', 18: '酉', 19: '戌', 20: '戌', 21: '亥', 22: '亥' };
    const origShiChen = shiChenMap[date.getHours()] || '子';
    const corrShiChen = shiChenMap[corrected.getHours()] || '子';
    const direction = offsetMin > 0 ? '晚' : '早';
    const origStr = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    const corrStr = `${corrected.getHours()}:${String(corrected.getMinutes()).padStart(2, '0')}`;
    const sameShiChen = origShiChen === corrShiChen;

    return `${location}约东经${lng.toFixed(2)}°，真太阳时按"北京时间+经度差×4分钟"校正，较北京时间约${direction}${Math.abs(offsetMin)}分钟，${origStr}折真太阳时约${corrStr}，属${corrShiChen}时${sameShiChen ? '，不换时柱' : '，时柱可能需调整'}`;
  }

  calculateBaZi(birthDate: string, birthTime: string, gender: 'male' | 'female'): {
    chart: BaZiChart;
    tenGods: TenGods;
    wuxingCount: WuXingCount;
    pattern: PatternAnalysis;
    yun: YunAnalysis;
  } {
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour] = birthTime.split(':').map(Number);

    const yearGanIndex = this.getYearGanIndex(year);
    const monthGanIndex = this.getMonthGanIndex(year, month);
    this.dayHeavenlyStemIndex = this.getDayGanIndex(year, month, day);
    const hourZhiIndex = this.getHourZhiIndex(hour);
    const hourGanIndex = this.getHourGanIndex(monthGanIndex, hourZhiIndex);

    const yearGan = TIAN_GAN[yearGanIndex];
    const yearZhi = DI_ZHI[(yearGanIndex + 2) % 12];
    const monthGan = TIAN_GAN[monthGanIndex];
    const monthZhi = DI_ZHI[(monthGanIndex + 2) % 12];
    const dayGan = TIAN_GAN[this.dayHeavenlyStemIndex];
    const dayZhi = DI_ZHI[(this.dayHeavenlyStemIndex + 2) % 12];
    const hourGan = TIAN_GAN[hourGanIndex];
    const hourZhi = DI_ZHI[hourZhiIndex];

    const chart: BaZiChart = {
      year: { pillar: yearGan + yearZhi, gan: yearGan, zhi: yearZhi, hiddenStems: ZHI_SHENG_FU[yearZhi] || [] },
      month: { pillar: monthGan + monthZhi, gan: monthGan, zhi: monthZhi, hiddenStems: ZHI_SHENG_FU[monthZhi] || [] },
      day: { pillar: dayGan + dayZhi, gan: dayGan, zhi: dayZhi, hiddenStems: ZHI_SHENG_FU[dayZhi] || [] },
      hour: { pillar: hourGan + hourZhi, gan: hourGan, zhi: hourZhi, hiddenStems: ZHI_SHENG_FU[hourZhi] || [] },
    };

    const tenGods = this.calculateTenGods(chart);
    const wuxingCount = this.calculateWuXingCount(chart);
    const pattern = this.analyzePattern(chart, wuxingCount, gender);
    const yun = this.calculateYun(chart, gender);

    return { chart, tenGods, wuxingCount, pattern, yun };
  }

  private getYearGanIndex(year: number): number {
    return (year - 4) % 10;
  }

  private getMonthGanIndex(year: number, month: number): number {
    const monthStemOffset = [2, 4, 6, 8, 10, 0, 2, 4, 6, 8, 10, 0];
    const yearGanIndex = this.getYearGanIndex(year);
    return (yearGanIndex + monthStemOffset[month - 1]) % 10;
  }

  private getDayGanIndex(year: number, month: number, day: number): number {
    const baseDate = new Date(1900, 0, 1);
    const birthDate = new Date(year, month - 1, day);
    const daysDiff = Math.floor((birthDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    return (daysDiff + 6) % 10;
  }

  private getHourZhiIndex(hour: number): number {
    if (hour >= 23 || hour < 1) return 0;
    if (hour < 3) return 1;
    if (hour < 5) return 2;
    if (hour < 7) return 3;
    if (hour < 9) return 4;
    if (hour < 11) return 5;
    if (hour < 13) return 6;
    if (hour < 15) return 7;
    if (hour < 17) return 8;
    if (hour < 19) return 9;
    if (hour < 21) return 10;
    return 11;
  }

  private getHourGanIndex(monthGanIndex: number, hourZhiIndex: number): number {
    const hourStemSequence = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    return (monthGanIndex + hourStemSequence[hourZhiIndex]) % 10;
  }

  private calculateTenGods(chart: BaZiChart): TenGods {
    const dayGan = chart.day.gan;
    const dayGanIndex = TIAN_GAN.indexOf(dayGan);

    const getShiShen = (gan: string, zhi: string): string => {
      const ganIndex = TIAN_GAN.indexOf(gan);
      const zhiIndex = DI_ZHI.indexOf(zhi);
      const isSameGender = (GAN_YIN_YANG_MAP[gan] === GAN_YIN_YANG_MAP[dayGan]);

      const diff = (zhiIndex - dayGanIndex + 10) % 10;
      const relations: Record<number, string> = {
        0: '比肩', 1: '劫财',
        2: '食神', 3: '伤官',
        4: '偏财', 5: '正财',
        6: '偏官', 7: '正官',
        8: '偏印', 9: '正印',
      };
      return relations[diff] || '未知';
    };

    return {
      yearGan: getShiShen(chart.year.gan, chart.year.zhi),
      yearZhi: getShiShen(chart.day.gan, chart.year.zhi),
      monthGan: getShiShen(chart.month.gan, chart.month.zhi),
      monthZhi: getShiShen(chart.day.gan, chart.month.zhi),
      dayGan: getShiShen(chart.day.gan, chart.day.zhi),
      dayZhi: getShiShen(chart.day.gan, chart.day.zhi),
      hourGan: getShiShen(chart.hour.gan, chart.hour.zhi),
      hourZhi: getShiShen(chart.day.gan, chart.hour.zhi),
    };
  }

  private calculateWuXingCount(chart: BaZiChart): WuXingCount {
    const count: WuXingCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    const addWeighted = (char: string, weight: number) => {
      const wuXing = WU_XING_MAP[char] || ZHI_WU_XING_MAP[char];
      if (wuXing) count[wuXing as keyof WuXingCount] += weight;
    };

    [chart.year, chart.month, chart.day, chart.hour].forEach(pillar => {
      addWeighted(pillar.gan, 2);
      addWeighted(pillar.zhi, 2);
      pillar.hiddenStems.forEach((stem, i) => {
        addWeighted(stem, i === 0 ? 3 : i === 1 ? 2 : 1);
      });
    });

    return count;
  }

  private analyzePattern(chart: BaZiChart, wuxing: WuXingCount, gender: 'male' | 'female'): PatternAnalysis {
    const total = wuxing.wood + wuxing.fire + wuxing.earth + wuxing.metal + wuxing.water;
    const dayGan = chart.day.gan;
    const monthZhi = chart.month.zhi;
    const monthGan = chart.month.gan;
    const dayGanWuXing = WU_XING_MAP[dayGan];

    const getStrengthScore = (): number => {
      let score = 50;
      const monthWuXing = ZHI_WU_XING_MAP[monthZhi];
      if (monthWuXing === dayGanWuXing) score += 15;
      if (monthWuXing === this.getShengWuXing(dayGanWuXing)) score += 10;
      if (wuxing[dayGanWuXing as keyof WuXingCount] >= 3) score += 15;
      if (wuxing[dayGanWuXing as keyof WuXingCount] <= 1) score -= 15;
      const shengWX = this.getShengWuXing(dayGanWuXing);
      if (wuxing[shengWX as keyof WuXingCount] >= 2) score += 10;
      return Math.max(0, Math.min(100, score));
    };

    const score = getStrengthScore();
    const strength: 'strong' | 'weak' | 'neutral' =
      score > 60 ? 'strong' : score < 40 ? 'weak' : 'neutral';

    let patternName = '';
    let subType = '';
    let favorable: string[] = [];
    let unfavorable: string[] = [];

    // 5级格局判定
    const geju = this.determineGeju(chart, wuxing, dayGan, monthZhi, monthGan, score);
    patternName = geju.name;
    subType = geju.subType;

    if (strength === 'strong') {
      favorable = ['官杀', '食伤', '财星'];
      unfavorable = ['比劫', '印星'];
    } else if (strength === 'weak') {
      favorable = ['印星', '比劫'];
      unfavorable = ['财星', '官杀', '食伤'];
    } else {
      favorable = ['食伤', '财星'];
      unfavorable = ['枭印'];
    }

    return {
      patternName,
      subType,
      strength,
      strengthScore: score,
      favorableElements: favorable,
      unfavorableElements: unfavorable,
      usableGods: favorable,
      忌神Gods: unfavorable,
    };
  }

  private getShengWuXing(wx: string): string {
    const map: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    return map[wx] || '';
  }

  private getKeWuXing(wx: string): string {
    const map: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
    return map[wx] || '';
  }

  private determineGeju(
    chart: BaZiChart, wuxing: WuXingCount, dayGan: string,
    monthZhi: string, monthGan: string, score: number
  ): { name: string; subType: string } {
    const dayGanWuXing = WU_XING_MAP[dayGan];
    const allPillars = [chart.year, chart.month, chart.day, chart.hour];
    const allGans = allPillars.map(p => p.gan);
    const allZhis = allPillars.map(p => p.zhi);
    const allWuXings = allGans.map(g => WU_XING_MAP[g]).concat(allZhis.map(z => ZHI_WU_XING_MAP[z]));

    // 级别1：化气格
    const huaQiResult = this.checkHuaQiGe(chart, dayGan, monthGan, monthZhi, allGans, allZhis);
    if (huaQiResult) return huaQiResult;

    // 级别2：专旺格
    const zhuanWangResult = this.checkZhuanWangGe(chart, dayGan, dayGanWuXing, wuxing, allWuXings, score);
    if (zhuanWangResult) return zhuanWangResult;

    // 级别3：两气成象格
    const liangQiResult = this.checkLiangQiGe(wuxing, dayGanWuXing);
    if (liangQiResult) return liangQiResult;

    // 级别4：从格
    const congResult = this.checkCongGe(chart, dayGan, dayGanWuXing, wuxing, score);
    if (congResult) return congResult;

    // 级别5：正格8类
    const zhengGeResult = this.checkZhengGe(chart, dayGan, monthZhi, monthGan);
    if (zhengGeResult) return zhengGeResult;

    return { name: '扶抑格', subType: score > 60 ? '身强' : score < 40 ? '身弱' : '中和' };
  }

  private checkHuaQiGe(
    chart: BaZiChart, dayGan: string, monthGan: string,
    monthZhi: string, allGans: string[], allZhis: string[]
  ): { name: string; subType: string } | null {
    const heHuaMap: Record<string, { target: string; wx: string }> = {
      '甲己': { target: '土', wx: '土' }, '己甲': { target: '土', wx: '土' },
      '乙庚': { target: '金', wx: '金' }, '庚乙': { target: '金', wx: '金' },
      '丙辛': { target: '水', wx: '水' }, '辛丙': { target: '水', wx: '水' },
      '丁壬': { target: '木', wx: '木' }, '壬丁': { target: '木', wx: '木' },
      '戊癸': { target: '火', wx: '火' }, '癸戊': { target: '火', wx: '火' },
    };

    const key = dayGan + monthGan;
    const huaInfo = heHuaMap[key];
    if (!huaInfo) return null;

    const monthWuXing = ZHI_WU_XING_MAP[monthZhi];
    if (monthWuXing !== huaInfo.wx) return null;

    const keWX = this.getKeWuXing(huaInfo.wx);
    const hasKe = allGans.some(g => WU_XING_MAP[g] === keWX) || allZhis.some(z => ZHI_WU_XING_MAP[z] === keWX);
    if (hasKe) return null;

    return { name: `${huaInfo.target}化气格`, subType: `${dayGan}${monthGan}合化${huaInfo.target}` };
  }

  private checkZhuanWangGe(
    chart: BaZiChart, dayGan: string, dayGanWuXing: string,
    wuxing: WuXingCount, allWuXings: string[], score: number
  ): { name: string; subType: string } | null {
    if (score < 75) return null;

    const shengWX = this.getShengWuXing(dayGanWuXing);
    const dayCount = wuxing[dayGanWuXing as keyof WuXingCount] || 0;
    const shengCount = wuxing[shengWX as keyof WuXingCount] || 0;
    const total = (wuxing.wood || 0) + (wuxing.fire || 0) + (wuxing.earth || 0) + (wuxing.metal || 0) + (wuxing.water || 0);

    if (dayCount + shengCount >= total * 0.8) {
      const keWX = this.getKeWuXing(dayGanWuXing);
      const keCount = wuxing[keWX as keyof WuXingCount] || 0;
      if (keCount === 0) {
        return { name: `${dayGanWuXing}专旺格`, subType: `日干${dayGan}一气专旺` };
      }
    }

    return null;
  }

  private checkLiangQiGe(
    wuxing: WuXingCount, dayGanWuXing: string
  ): { name: string; subType: string } | null {
    const entries = Object.entries(wuxing).filter(([_, v]) => v > 0) as [string, number][];
    if (entries.length !== 2) return null;

    const wxNames: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
    const [wx1, count1] = entries[0];
    const [wx2, count2] = entries[1];
    const total = count1 + count2;

    if (Math.abs(count1 - count2) / total <= 0.3) {
      const name1 = wxNames[wx1] || wx1;
      const name2 = wxNames[wx2] || wx2;
      return { name: `${name1}${name2}两气成象格`, subType: `${name1}${name2}各半` };
    }

    return null;
  }

  private checkCongGe(
    chart: BaZiChart, dayGan: string, dayGanWuXing: string,
    wuxing: WuXingCount, score: number
  ): { name: string; subType: string } | null {
    if (score > 25) return null;

    const dayCount = wuxing[dayGanWuXing as keyof WuXingCount] || 0;
    const shengWX = this.getShengWuXing(dayGanWuXing);
    const shengCount = wuxing[shengWX as keyof WuXingCount] || 0;

    if (dayCount <= 1 && shengCount <= 1) {
      const keWX = this.getKeWuXing(dayGanWuXing);
      const keCount = wuxing[keWX as keyof WuXingCount] || 0;
      if (keCount >= 2) return { name: `从${keWX}格`, subType: `日干${dayGan}极弱从势` };

      const shengWX2 = this.getShengWuXing(dayGanWuXing);
      const xieWX = this.getXieWuXing(dayGanWuXing);
      const xieCount = wuxing[xieWX as keyof WuXingCount] || 0;
      if (xieCount >= 2) return { name: '从儿格', subType: `日干${dayGan}极弱从儿` };

      const caiWX = this.getCaiWuXing(dayGanWuXing);
      const caiCount = wuxing[caiWX as keyof WuXingCount] || 0;
      if (caiCount >= 2) return { name: '从财格', subType: `日干${dayGan}极弱从财` };

      return { name: '从格', subType: `日干${dayGan}极弱从势` };
    }

    return null;
  }

  private getXieWuXing(wx: string): string {
    const map: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    return map[wx] || '';
  }

  private getCaiWuXing(wx: string): string {
    const map: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
    return map[wx] || '';
  }

  private checkZhengGe(
    chart: BaZiChart, dayGan: string, monthZhi: string, monthGan: string
  ): { name: string; subType: string } | null {
    const monthShiShen = this.getShiShen(dayGan, monthGan);
    const monthZhiBenQi = this.getZhiBenQi(monthZhi);
    const monthZhiShiShen = monthZhiBenQi ? this.getShiShen(dayGan, monthZhiBenQi) : '';

    const dominantShiShen = monthShiShen || monthZhiShiShen;
    if (!dominantShiShen) return null;

    const gejuMap: Record<string, string> = {
      '正官': '正官格', '七杀': '七杀格',
      '正财': '正财格', '偏财': '偏财格',
      '正印': '正印格', '偏印': '偏印格',
      '食神': '食神格', '伤官': '伤官格',
    };

    const gejuName = gejuMap[dominantShiShen];
    if (gejuName) {
      return { name: gejuName, subType: `月令${dominantShiShen}透干` };
    }

    return null;
  }

  private getShiShen(dayGan: string, targetGan: string): string {
    const dayWX = WU_XING_MAP[dayGan];
    const targetWX = WU_XING_MAP[targetGan];
    const dayYY = GAN_YIN_YANG_MAP[dayGan];
    const targetYY = GAN_YIN_YANG_MAP[targetGan];
    const sameYY = dayYY === targetYY;

    if (targetGan === dayGan) return '比肩';
    if (dayWX === targetWX && !sameYY) return '劫财';

    const shengMap: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const keMap: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
    const shengByMap: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const keByMap: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

    if (shengMap[dayWX] === targetWX) return sameYY ? '食神' : '伤官';
    if (keMap[dayWX] === targetWX) return sameYY ? '偏财' : '正财';
    if (shengByMap[dayWX] === targetWX) return sameYY ? '偏印' : '正印';
    if (keByMap[dayWX] === targetWX) return sameYY ? '七杀' : '正官';

    return '';
  }

  private getZhiBenQi(zhi: string): string {
    const map: Record<string, string> = {
      '子': '癸', '丑': '己', '寅': '甲', '卯': '乙',
      '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
      '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬',
    };
    return map[zhi] || '';
  }

  private calculateYun(chart: BaZiChart, gender: 'male' | 'female'): YunAnalysis {
    const dayGan = chart.day.gan;
    const monthGan = chart.month.gan;
    const monthZhiIndex = DI_ZHI.indexOf(chart.month.zhi);

    let yunStartYear: number;
    if (gender === 'male') {
      yunStartYear = (TIAN_GAN.indexOf(monthGan) % 2 === 0) ? 8 : 9;
    } else {
      yunStartYear = (TIAN_GAN.indexOf(monthGan) % 2 === 0) ? 7 : 6;
    }

    const decades: DecadeYun[] = [];
    for (let i = 0; i < 8; i++) {
      const startAge = yunStartYear + i * 10;
      const ganIndex = (TIAN_GAN.indexOf(dayGan) + (gender === 'male' ? 1 : -1) * (yunStartYear - 1) + i) % 10;
      const zhiIndex = (monthZhiIndex + (gender === 'male' ? 1 : -1) * (yunStartYear - 1) + i) % 12;
      const gan = TIAN_GAN[(ganIndex + 10) % 10];
      const zhi = DI_ZHI[(zhiIndex + 12) % 12];
      const wuXing = [WU_XING_MAP[gan], ZHI_WU_XING_MAP[zhi]];

      const tendencies: ('顺利' | '平稳' | '挑战' | '调整' | '突破')[] = ['平稳', '挑战', '调整', '突破', '顺利'];
      decades.push({
        startAge,
        endAge: startAge + 9,
        ganZhi: gan + zhi,
        wuxing: wuXing,
        tendency: tendencies[i % 5],
      });
    }

    return {
      decadeYun: decades,
      currentYunIndex: 0,
    };
  }

  getWuXingOfGanZhi(gan: string, zhi: string): string[] {
    return [WU_XING_MAP[gan], ZHI_WU_XING_MAP[zhi]].filter(Boolean);
  }

  getYinYangOfZhi(zhi: string): '阳' | '阴' {
    return ZHI_YIN_YANG_MAP[zhi] || '阴';
  }

  getJieQiDates(year: number): JieQiDate[] {
    if (year === 2026) {
      return JIE_QI_DATES_2026;
    }
    return [];
  }

  calculateMonthlyFortune(chart: BaZiChart, yun: YunAnalysis, year: number): MonthlyFortune[] {
    const dayGan = chart.day.gan;
    const dayGanWX = WU_XING_MAP[dayGan];
    const yearGanIndex = (year - 4) % 10;
    const yearGan = TIAN_GAN[yearGanIndex];
    const yinGanIndex = WU_HU_DUN_MAP[yearGan];

    const monthZhis = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    const monthLabels = ['寅月', '卯月', '辰月', '巳月', '午月', '未月', '申月', '酉月', '戌月', '亥月', '子月', '丑月'];
    const solarMonths = ['2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月'];

    const wuxingCount = this.calculateWuXingCount(chart);
    const dayCount = wuxingCount[dayGanWX as keyof WuXingCount];
    const shengWX = this.getShengWuXing(dayGanWX);
    const shengCount = wuxingCount[shengWX as keyof WuXingCount];
    const isStrong = (dayCount + shengCount) >= 4;

    const chartZhis = [chart.year.zhi, chart.month.zhi, chart.day.zhi, chart.hour.zhi];

    const currentYun = yun.currentYunIndex < yun.decadeYun.length ? yun.decadeYun[yun.currentYunIndex] : null;
    const yunZhi = currentYun ? currentYun.ganZhi.charAt(1) : '';

    const results: MonthlyFortune[] = [];

    for (let i = 0; i < 12; i++) {
      const liuYueGanIndex = (yinGanIndex + i) % 10;
      const liuYueGan = TIAN_GAN[liuYueGanIndex];
      const liuYueZhi = monthZhis[i];
      const liuYueGanZhi = liuYueGan + liuYueZhi;
      const liuYueGanWX = WU_XING_MAP[liuYueGan];
      const liuYueZhiWX = ZHI_WU_XING_MAP[liuYueZhi];

      let rating = 3;

      const isShengFu = liuYueGanWX === dayGanWX || liuYueGanWX === shengWX
        || liuYueZhiWX === dayGanWX || liuYueZhiWX === shengWX;

      let hasChongWithChart = false;
      let hasHeWithChart = false;
      let chongTarget = '';

      for (const zhi of chartZhis) {
        if (LIU_CHONG_MAP[liuYueZhi] === zhi) {
          hasChongWithChart = true;
          chongTarget = zhi;
        }
        if (LIU_HE_MAP[liuYueZhi] === zhi) {
          hasHeWithChart = true;
        }
      }

      let hasChongWithYun = false;
      if (yunZhi && LIU_CHONG_MAP[liuYueZhi] === yunZhi) {
        hasChongWithYun = true;
      }

      if (isStrong) {
        if (!isShengFu) rating = 4;
        if (isShengFu) rating = 2;
      } else {
        if (isShengFu) rating = 4;
        if (!isShengFu) rating = 2;
      }

      if (hasHeWithChart) {
        rating = Math.min(5, rating + 1);
      }

      if (hasChongWithChart) {
        const chongZhiWX = ZHI_WU_XING_MAP[chongTarget];
        if (isStrong && (chongZhiWX === dayGanWX || chongZhiWX === shengWX)) {
          rating = Math.min(5, rating + 1);
        } else if (!isStrong && chongZhiWX !== dayGanWX && chongZhiWX !== shengWX) {
          rating = Math.min(5, rating + 1);
        } else {
          rating = Math.max(1, rating - 1);
        }
      }

      if (hasChongWithYun) {
        rating = Math.max(1, rating - 1);
      }

      rating = Math.max(1, Math.min(5, rating));

      const liuYueShiShen = this.getShiShen(dayGan, liuYueGan);
      const shiShenMeaning: Record<string, string> = {
        '比肩': '竞争与合作并存', '劫财': '防破财与争端', '食神': '利表达与创意',
        '伤官': '防口舌与变动', '偏财': '偏财运旺', '正财': '正财稳进',
        '七杀': '压力与权力并行', '正官': '利职位与规范', '偏印': '防思虑过度',
        '正印': '利学习与贵人',
      };

      let judgment = shiShenMeaning[liuYueShiShen] || '运势平稳';
      if (hasChongWithChart) judgment += `，${liuYueZhi}冲${chongTarget}需防变`;
      if (hasHeWithChart) judgment += `，${liuYueZhi}合命局利合作`;
      if (hasChongWithYun) judgment += '，冲大运宜守';
      if (rating >= 4) judgment += '，宜主动把握';
      else if (rating <= 2) judgment += '，宜守不宜进';

      results.push({
        period: `${year}年${monthLabels[i]}(${solarMonths[i]})`,
        liuYue: liuYueGanZhi,
        rating,
        judgment,
      });
    }

    return results;
  }

  getTiaoHouYongShen(dayGan: string, monthZhi: string): TiaoHouResult {
    const tiaoHouMap: Record<string, TiaoHouResult> = {
      '甲巳': { yongShen: ['癸', '丙'], description: '先癸后丙，癸水润木为先，丙火暖木为辅' },
      '乙巳': { yongShen: ['癸'], description: '用癸水润木' },
      '丙巳': { yongShen: ['壬'], description: '用壬水制火' },
      '丁巳': { yongShen: ['甲'], description: '用甲木生火' },
      '戊巳': { yongShen: ['甲', '丙'], description: '用甲木疏土，丙火生土' },
      '己巳': { yongShen: ['癸', '丙'], description: '用癸水润土，丙火暖土' },
      '庚巳': { yongShen: ['壬', '丁'], description: '用壬水泄金，丁火炼金' },
      '辛巳': { yongShen: ['壬', '甲'], description: '用壬水洗金，甲木为辅' },
      '壬巳': { yongShen: ['庚', '辛'], description: '用庚金发水源，辛金为辅' },
      '癸巳': { yongShen: ['庚', '辛'], description: '用庚辛金发水源' },
    };

    const key = dayGan + monthZhi;
    if (tiaoHouMap[key]) return tiaoHouMap[key];

    const dayWX = WU_XING_MAP[dayGan];
    const shengWX = this.getShengWuXing(dayWX);
    const xieWX = this.getXieWuXing(dayWX);
    const caiWX = this.getCaiWuXing(dayWX);

    const shengGans = TIAN_GAN.filter(g => WU_XING_MAP[g] === shengWX);
    const sameGans = TIAN_GAN.filter(g => WU_XING_MAP[g] === dayWX);
    const xieGans = TIAN_GAN.filter(g => WU_XING_MAP[g] === xieWX);
    const caiGans = TIAN_GAN.filter(g => WU_XING_MAP[g] === caiWX);

    const monthWX = ZHI_WU_XING_MAP[monthZhi];
    const isMonthSupportive = monthWX === dayWX || monthWX === shengWX;

    if (isMonthSupportive) {
      return {
        yongShen: [xieGans[0], caiGans[0]].filter(Boolean),
        description: `日主得令，宜用克泄五行，取${xieWX}泄之、${caiWX}耗之`,
      };
    } else {
      return {
        yongShen: [shengGans[0], sameGans[0]].filter(Boolean),
        description: `日主失令，宜用生扶五行，取${shengWX}生之、${dayWX}扶之`,
      };
    }
  }

  analyzeShiShenInteraction(tenGods: any, chart: BaZiChart): ShiShenInteraction[] {
    const results: ShiShenInteraction[] = [];
    const dayGan = chart.day.gan;

    const allShiShen: string[] = [];
    const pillars = [chart.year, chart.month, chart.day, chart.hour];
    for (const p of pillars) {
      allShiShen.push(this.getShiShen(dayGan, p.gan));
      for (const hs of p.hiddenStems) {
        allShiShen.push(this.getShiShen(dayGan, hs));
      }
    }

    const countSS = (name: string): number => allShiShen.filter(s => s === name).length;

    const qiShaCount = countSS('七杀');
    const zhengYinCount = countSS('正印');
    const zhengCaiCount = countSS('正财');
    const pianCaiCount = countSS('偏财');
    const shiShenCount = countSS('食神');
    const shangGuanCount = countSS('伤官');
    const zhengGuanCount = countSS('正官');
    const pianYinCount = countSS('偏印');

    if (qiShaCount > 0 && zhengYinCount > 0) {
      results.push({
        pattern: '杀印相生',
        description: '七杀与正印同时出现，杀印相生',
        implication: '权威、管理能力，适合领导岗位',
      });
    }

    if (zhengCaiCount + pianCaiCount >= 3) {
      const wuxingCount = this.calculateWuXingCount(chart);
      const dayWX = WU_XING_MAP[dayGan];
      const dayCount = wuxingCount[dayWX as keyof WuXingCount];
      if (dayCount <= 2) {
        results.push({
          pattern: '财多身弱',
          description: `正财${zhengCaiCount}个、偏财${pianCaiCount}个，且日主偏弱`,
          implication: '钱多压力大，宜合伙经营，不宜独担大财',
        });
      }
    }

    if ((shiShenCount > 0 || shangGuanCount > 0) && (zhengCaiCount > 0 || pianCaiCount > 0)) {
      results.push({
        pattern: '食伤生财',
        description: '食神/伤官与正财/偏财同现，食伤生财',
        implication: '技术生财，适合以专业技能获财',
      });
    }

    if (zhengGuanCount > 0 && qiShaCount > 0) {
      results.push({
        pattern: '官杀混杂',
        description: '正官与七杀同时出现，官杀混杂',
        implication: '事业方向纠结，易有是非，宜专注一途',
      });
    }

    if (zhengYinCount + pianYinCount >= 2) {
      const wuxingCount = this.calculateWuXingCount(chart);
      const dayWX = WU_XING_MAP[dayGan];
      const dayCount = wuxingCount[dayWX as keyof WuXingCount];
      if (dayCount <= 2) {
        results.push({
          pattern: '印绶护身',
          description: `正印${zhengYinCount}个、偏印${pianYinCount}个，且日主偏弱`,
          implication: '有贵人、有靠山，逢凶化吉',
        });
      }
    }

    if (shangGuanCount > 0 && zhengGuanCount > 0) {
      results.push({
        pattern: '伤官见官',
        description: '伤官与正官同时出现，伤官见官',
        implication: '易有口舌是非，需注意言行，宜从事创意行业化解',
      });
    }

    return results;
  }

  analyzeLiuQin(chart: BaZiChart): LiuQinResult {
    const dayGan = chart.day.gan;

    const shiShenDescMap: Record<string, string> = {
      '比肩': '同辈相助',
      '劫财': '竞争耗财',
      '食神': '才华显露',
      '伤官': '才思敏捷',
      '偏财': '偏门之财',
      '正财': '正当之财',
      '七杀': '压力权威',
      '正官': '正统约束',
      '偏印': '偏门学识',
      '正印': '学业贵人',
    };

    const yearGanSS = this.getShiShen(dayGan, chart.year.gan);
    const yearZhiSS = this.getShiShen(dayGan, this.getZhiBenQi(chart.year.zhi));
    const monthGanSS = this.getShiShen(dayGan, chart.month.gan);
    const monthZhiSS = this.getShiShen(dayGan, this.getZhiBenQi(chart.month.zhi));
    const dayZhiSS = this.getShiShen(dayGan, this.getZhiBenQi(chart.day.zhi));
    const hourGanSS = this.getShiShen(dayGan, chart.hour.gan);
    const hourZhiSS = this.getShiShen(dayGan, this.getZhiBenQi(chart.hour.zhi));

    return {
      yearPillar: `年柱${chart.year.pillar}：${yearGanSS}坐${yearZhiSS}，${shiShenDescMap[yearGanSS] || ''}，祖上根基`,
      monthPillar: `月柱${chart.month.pillar}：${monthGanSS}坐${monthZhiSS}，${shiShenDescMap[monthGanSS] || ''}，父母兄弟`,
      dayPillar: `日柱${chart.day.pillar}：${dayZhiSS}居配偶宫，${shiShenDescMap[dayZhiSS] || ''}`,
      hourPillar: `时柱${chart.hour.pillar}：${hourGanSS}坐${hourZhiSS}，${shiShenDescMap[hourGanSS] || ''}，子女事业`,
    };
  }
}
