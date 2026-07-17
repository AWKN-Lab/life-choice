import dayjs from 'dayjs';
import { LunarDate, BaZiPillar, SolarTerm, GAN, ZHI, WUXING } from './types';

const SOLAR_TERMS = [
  { name: '小寒', month: 0, day: 5 },
  { name: '大寒', month: 0, day: 20 },
  { name: '立春', month: 1, day: 4 },
  { name: '雨水', month: 1, day: 19 },
  { name: '惊蛰', month: 2, day: 6 },
  { name: '春分', month: 2, day: 21 },
  { name: '清明', month: 3, day: 5 },
  { name: '谷雨', month: 3, day: 20 },
  { name: '立夏', month: 4, day: 6 },
  { name: '小满', month: 4, day: 21 },
  { name: '芒种', month: 5, day: 6 },
  { name: '夏至', month: 5, day: 21 },
  { name: '小暑', month: 6, day: 7 },
  { name: '大暑', month: 6, day: 23 },
  { name: '立秋', month: 7, day: 8 },
  { name: '处暑', month: 7, day: 23 },
  { name: '白露', month: 8, day: 8 },
  { name: '秋分', month: 8, day: 23 },
  { name: '寒露', month: 9, day: 8 },
  { name: '霜降', month: 9, day: 23 },
  { name: '立冬', month: 10, day: 7 },
  { name: '小雪', month: 10, day: 22 },
  { name: '大雪', month: 11, day: 7 },
  { name: '冬至', month: 11, day: 22 },
];

const YUE_JIANG_MAP: Record<number, string> = {
  0: '子', 1: '丑', 2: '寅', 3: '卯', 4: '辰',
  5: '巳', 6: '午', 7: '未', 8: '申', 9: '酉',
  10: '戌', 11: '亥',
};

export function calculateSolarTerm(date: Date): SolarTerm {
  const month = date.getMonth();
  const day = date.getDate();

  let currentSolarTerm = SOLAR_TERMS[month * 2];
  let nextSolarTerm = SOLAR_TERMS[month * 2 + 1] || SOLAR_TERMS[0];

  if (day >= nextSolarTerm.day) {
    currentSolarTerm = nextSolarTerm;
    nextSolarTerm = SOLAR_TERMS[(month * 2 + 3) % 24];
  }

  return {
    name: currentSolarTerm.name,
    date,
    yueJiang: YUE_JIANG_MAP[(month + 2) % 12],
  };
}

export function getLunarDate(date: Date): LunarDate {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const yearGanIndex = (year - 4) % 10;
  const yearZhiIndex = (year - 4) % 12;

  const monthGanIndex = (yearGanIndex * 2 + month) % 10;
  const monthZhiIndex = (month + 2) % 12;

  const dayGanIndex = Math.floor(
    (dayjs(date).hour(0).minute(0).second(0).unix() - dayjs('1900-01-01').unix()) / 86400 + 10
  ) % 10;
  const dayZhiIndex = Math.floor(
    (dayjs(date).hour(0).minute(0).second(0).unix() - dayjs('1900-01-01').unix()) / 86400 + 6
  ) % 12;

  return {
    year,
    month,
    day,
    dayGan: (dayGanIndex + 10) % 10,
    dayZhi: (dayZhiIndex + 12) % 12,
    monthGan: (monthGanIndex + 10) % 10,
    monthZhi: (monthZhiIndex + 12) % 12,
  };
}

export function getBaZiPillars(
  birthDate: Date,
  birthTime: string,
  gender: string
): { year: BaZiPillar; month: BaZiPillar; day: BaZiPillar; hour: BaZiPillar; wuxing: any; shishen: any } {
  const d = dayjs(birthDate);
  const timeParts = birthTime.split(':');
  const hour = parseInt(timeParts[0], 10);

  const year = d.year();
  const month = d.month() + 1;
  const day = d.date();

  const yearGanIndex = (year - 4) % 10;
  const yearZhiIndex = (year - 4) % 12;

  const monthGanIndex = (yearGanIndex * 2 + month) % 10;
  const monthZhiIndex = (month + 2) % 12;

  const dayGanIndex = Math.floor(
    (dayjs(birthDate).hour(0).minute(0).second(0).unix() - dayjs('1900-01-01').unix()) / 86400 + 10
  ) % 10;
  const dayZhiIndex = Math.floor(
    (dayjs(birthDate).hour(0).minute(0).second(0).unix() - dayjs('1900-01-01').unix()) / 86400 + 6
  ) % 12;

  const hourZhiIndex = Math.floor(hour / 2) % 12;
  const hourGanIndex = (dayGanIndex * 2 + hourZhiIndex) % 10;

  const wuxingMap: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
  };

  const shishenMap: Record<string, string[]> = {
    '甲': ['比', '劫', '食', '伤', '才', '财', '官', '杀', '枭', '印'],
    '乙': ['枭', '印', '比', '劫', '食', '伤', '财', '才', '杀', '官'],
    '丙': ['印', '枭', '比', '劫', '食', '伤', '财', '才', '官', '杀'],
    '丁': ['印', '枭', '比', '劫', '食', '伤', '财', '才', '官', '杀'],
    '戊': ['杀', '官', '印', '枭', '比', '劫', '食', '伤', '财', '才'],
    '己': ['杀', '官', '印', '枭', '比', '劫', '食', '伤', '财', '才'],
    '庚': ['财', '才', '杀', '官', '印', '枭', '比', '劫', '食', '伤'],
    '辛': ['财', '才', '杀', '官', '印', '枭', '比', '劫', '食', '伤'],
    '壬': ['食', '伤', '财', '才', '印', '枭', '杀', '官', '比', '劫'],
    '癸': ['食', '伤', '财', '才', '印', '枭', '杀', '官', '比', '劫'],
  };

  const dayGan = GAN[dayGanIndex];
  const shishenList = shishenMap[dayGan] || [];

  const countWuxing = (gan: string): string => wuxingMap[gan] || '土';

  const wuxingCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  wuxingCount[countWuxing(GAN[yearGanIndex]) as keyof typeof wuxingCount]++;
  wuxingCount[countWuxing(GAN[monthGanIndex]) as keyof typeof wuxingCount]++;
  wuxingCount[countWuxing(GAN[dayGanIndex]) as keyof typeof wuxingCount]++;
  wuxingCount[countWuxing(GAN[hourGanIndex]) as keyof typeof wuxingCount]++;

  const shishen: Record<string, string> = {
    year: shishenList[0],
    month: shishenList[1],
    day: shishenList[2],
    hour: shishenList[3],
  };

  return {
    year: {
      pillar: GAN[yearGanIndex] + ZHI[yearZhiIndex],
      gan: GAN[yearGanIndex],
      zhi: ZHI[yearZhiIndex],
      wuxing: wuxingMap[GAN[yearGanIndex]],
    },
    month: {
      pillar: GAN[monthGanIndex] + ZHI[monthZhiIndex],
      gan: GAN[monthGanIndex],
      zhi: ZHI[monthZhiIndex],
      wuxing: wuxingMap[GAN[monthGanIndex]],
    },
    day: {
      pillar: GAN[dayGanIndex] + ZHI[dayZhiIndex],
      gan: GAN[dayGanIndex],
      zhi: ZHI[dayZhiIndex],
      wuxing: wuxingMap[GAN[dayGanIndex]],
    },
    hour: {
      pillar: GAN[hourGanIndex] + ZHI[hourZhiIndex],
      gan: GAN[hourGanIndex],
      zhi: ZHI[hourZhiIndex],
      wuxing: wuxingMap[GAN[hourGanIndex]],
    },
    wuxing: wuxingCount,
    shishen,
  };
}
