/**
 * 真节气计算（寿星公式 / 许剑伟《寿星万年历》算法）
 *
 * 24节气索引：
 * 0=春分(气) 1=清明(节) 2=谷雨  3=立夏(节) 4=小满  5=芒种(节)
 * 6=夏至(气) 7=小暑(节) 8=大暑  9=立秋(节) 10=处暑 11=白露(节)
 * 12=秋分(气) 13=寒露(节) 14=霜降 15=立冬(节) 16=小雪 17=大雪(节)
 * 18=冬至(气) 19=小寒(节) 20=大寒 21=立春(节) 22=雨水 23=惊蛰(节)
 *
 * 12节(月柱变更节点)：立春21 惊蛰23 清明1 立夏3 芒种5 小暑7 立秋9 白露11 寒露13 立冬15 大雪17 小寒19
 */

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 12节索引，按自然月排序（1月→12月）
export const JIE_INDICES = [19, 21, 23, 1, 3, 5, 7, 9, 11, 13, 15, 17];

// 对应的地支索引（注意：值必须是 ZHI 的 0-11 索引）
// 小寒→丑(1) 立春→寅(2) 惊蛰→卯(3) 清明→辰(4) 立夏→巳(5) 芒种→午(6)
// 小暑→未(7) 立秋→申(8) 白露→酉(9) 寒露→戌(10) 立冬→亥(11) 大雪→子(0)
export const JIE_TO_MONTH_ZHI: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

// 寿星公式参数
const D = 0.2422;
const C: Record<number, number[]> = {
  1:  [4.81, 5.59],     // 清明
  3:  [5.52, 5.78],     // 立夏
  5:  [5.678, 5.896],   // 芒种
  7:  [7.108, 7.22],    // 小暑
  9:  [7.5, 7.85],      // 立秋
  11: [7.646, 7.891],   // 白露
  13: [8.318, 8.591],   // 寒露
  15: [7.438, 7.718],   // 立冬
  17: [7.18, 7.46],     // 大雪
  19: [5.4055, 5.678],  // 小寒
  21: [3.87, 4.15],     // 立春
  23: [5.63, 5.89],     // 惊蛰
};

// 节气对应月份 (Date.UTC 的 month 参数, 0=Jan)
const JIEQI_MONTH: Record<number, number> = {
  1:  3,   // 清明 → Apr
  3:  4,   // 立夏 → May
  5:  5,   // 芒种 → Jun
  7:  6,   // 小暑 → Jul
  9:  7,   // 立秋 → Aug
  11: 8,   // 白露 → Sep
  13: 9,   // 寒露 → Oct
  15: 10,  // 立冬 → Nov
  17: 11,  // 大雪 → Dec
  19: 0,   // 小寒 → Jan
  21: 1,   // 立春 → Feb
  23: 2,   // 惊蛰 → Mar
};

export function getJieQi(year: number, jieQiIndex: number): Date {
  const coef = C[jieQiIndex];
  if (!coef) return new Date(Date.UTC(year, 0, 1));

  const century = Math.floor(year / 100);
  const cVal = century === 20 ? coef[0] : coef[1];

  const val = cVal + D * (year - 1900) - Math.floor((year - 1900) / 4);
  const day = Math.floor(val);
  const fractional = val - day;
  const hours = Math.floor(fractional * 24);
  const minutes = Math.floor((fractional * 24 - hours) * 60);

  const month = JIEQI_MONTH[jieQiIndex] ?? 0;
  return new Date(Date.UTC(year, month, day, hours, minutes));
}

export function getLiChun(year: number): Date {
  return getJieQi(year, 21);
}

export function getJieQiForYear(year: number): Date[] {
  return JIE_INDICES.map(idx => getJieQi(year, idx));
}

export function getYearPillarGan(year: number): string {
  const baseYear = 1984;
  const offset = year - baseYear;
  return GAN[((offset % 10) + 10) % 10];
}

export function getYearPillarZhi(year: number): string {
  const baseYear = 1984;
  const offset = year - baseYear;
  return ZHI[((offset % 12) + 12) % 12];
}

export function isBeforeLiChun(
  year: number, month: number, day: number, hour: number = 0,
): boolean {
  const liChun = getLiChun(year);
  const birthDate = new Date(Date.UTC(year, month, day, hour + 8));
  return birthDate.getTime() < liChun.getTime();
}

export function getCorrectYearPillar(
  year: number, month: number, day: number, hour: number = 0,
): string {
  const effectiveYear = isBeforeLiChun(year, month, day, hour) ? year - 1 : year;
  return getYearPillarGan(effectiveYear) + getYearPillarZhi(effectiveYear);
}

export function getMonthZhiIndex(
  year: number, month: number, day: number, hour: number = 0,
): number {
  const birthDate = new Date(Date.UTC(year, month, day, hour + 8));
  const jieQi = getJieQiForYear(year);

  let idx = -1;
  for (let i = 0; i < JIE_INDICES.length; i++) {
    if (birthDate.getTime() >= jieQi[i].getTime()) {
      idx = JIE_TO_MONTH_ZHI[i];
    }
  }

  // 出生在所有当年节气之前（1月初在小寒前），查上年节气
  if (idx < 0) {
    const prevJieQi = getJieQiForYear(year - 1);
    for (let i = 0; i < JIE_INDICES.length; i++) {
      if (birthDate.getTime() >= prevJieQi[i].getTime()) {
        idx = JIE_TO_MONTH_ZHI[i];
      }
    }
    if (idx < 0) idx = 0; // 大雪之后 = 子月
  }

  return idx;
}

export interface QiYunAge {
  years: number;
  months: number;
  days: number;
}

export function getQiYunAge(
  year: number, month: number, day: number, hour: number,
  isShun: boolean,
): QiYunAge {
  const birthDate = new Date(Date.UTC(year, month, day, hour + 8));
  const jieQi = getJieQiForYear(year);

  const diffDays = (() => {
    if (isShun) {
      for (const jq of jieQi) {
        if (jq.getTime() > birthDate.getTime()) {
          return (jq.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
        }
      }
      const nextLiChun = getLiChun(year + 1);
      return (nextLiChun.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
    } else {
      const prevJieQi = getJieQiForYear(year - 1);
      const allJieQi = [...prevJieQi, ...jieQi];
      let nearest: Date | null = null;
      for (const jq of allJieQi) {
        if (jq.getTime() < birthDate.getTime()) nearest = jq;
      }
      if (nearest) return (birthDate.getTime() - nearest.getTime()) / (1000 * 60 * 60 * 24);
      return 1095; // 3年
    }
  })();

  const qiYunDecimal = diffDays / 3;
  const years = Math.floor(qiYunDecimal);
  const frac = qiYunDecimal - years;
  const months = Math.floor(frac * 12);
  const remainingDays = Math.round((frac * 12 - months) * 30.44);
  return { years, months, days: remainingDays };
}