// 测试2011年3月20日7:30的八字

// 算法1：用户提供的简化算法
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getYearPillar1(year: number): string {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

function getMonthPillar1(year: number, month: number): string {
  const yearGanIndex = (year - 4) % 10;
  const monthGanStart = (yearGanIndex % 5) * 2;
  const monthGanIndex = (monthGanStart + month - 1) % 10;
  const monthZhiIndex = (month + 1) % 12;
  return TIAN_GAN[monthGanIndex] + DI_ZHI[monthZhiIndex];
}

function getDayPillar1(year: number, month: number, day: number): string {
  const baseDate = new Date(1900, 0, 31);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const ganIndex = (diffDays + 10) % 10;
  const zhiIndex = (diffDays + 12) % 12;
  return TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex];
}

function getHourPillar1(dayGan: string, hour: number): string {
  const dayGanIndex = TIAN_GAN.indexOf(dayGan);
  const hourZhiIndex = Math.floor((hour + 1) / 2) % 12;
  const hourGanStart = (dayGanIndex % 5) * 2;
  const hourGanIndex = (hourGanStart + hourZhiIndex) % 10;
  return TIAN_GAN[hourGanIndex] + DI_ZHI[hourZhiIndex];
}

function calculateBazi1(year: number, month: number, day: number, hour: number): any {
  const yearPillar = getYearPillar1(year);
  const monthPillar = getMonthPillar1(year, month);
  const dayPillar = getDayPillar1(year, month, day);
  const hourPillar = getHourPillar1(dayPillar[0], hour);
  return { yearPillar, monthPillar, dayPillar, hourPillar, dayMaster: dayPillar[0] };
}

// 算法2：我的修复版算法
import { calculateBazi as calculateBazi2 } from './src/lib/bazi-engine.ts';

// 测试日期：2011年3月20日7点30分（阴历：2011年二月十六辰时，乾造）
console.log('=== 测试日期：2011年3月20日7点30分 ===');
console.log('阴历：2011年二月十六辰时（乾造）');
const result1 = calculateBazi1(2011, 3, 20, 7);
const result2 = calculateBazi2({ year: 2011, month: 3, day: 20, hour: 7, minute: 30, isLunar: false, gender: 'male' });
console.log('算法1结果：');
console.log(`年柱: ${result1.yearPillar}`);
console.log(`月柱: ${result1.monthPillar}`);
console.log(`日柱: ${result1.dayPillar}`);
console.log(`时柱: ${result1.hourPillar}`);
console.log(`日主: ${result1.dayMaster}`);
console.log('算法2结果：');
console.log(`年柱: ${result2.yearPillar}`);
console.log(`月柱: ${result2.monthPillar}`);
console.log(`日柱: ${result2.dayPillar}`);
console.log(`时柱: ${result2.hourPillar}`);
console.log(`日主: ${result2.dayMaster}`);
console.log(`格局: ${result2.pattern}`);
