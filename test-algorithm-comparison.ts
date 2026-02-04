// 测试两个算法的比较

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

// 测试日期1：1983年5月20日0点30分（已知正确结果：癸亥 丁巳 戊申 壬子）
console.log('=== 测试日期1：1983年5月20日0点30分 ===');
const result1_1 = calculateBazi1(1983, 5, 20, 0);
const result1_2 = calculateBazi2({ year: 1983, month: 5, day: 20, hour: 0, minute: 30, isLunar: false, gender: 'male' });
console.log('算法1结果：');
console.log(`年柱: ${result1_1.yearPillar} (期望: 癸亥)`);
console.log(`月柱: ${result1_1.monthPillar} (期望: 丁巳)`);
console.log(`日柱: ${result1_1.dayPillar} (期望: 戊申)`);
console.log(`时柱: ${result1_1.hourPillar} (期望: 壬子)`);
console.log('算法2结果：');
console.log(`年柱: ${result1_2.yearPillar} (期望: 癸亥)`);
console.log(`月柱: ${result1_2.monthPillar} (期望: 丁巳)`);
console.log(`日柱: ${result1_2.dayPillar} (期望: 戊申)`);
console.log(`时柱: ${result1_2.hourPillar} (期望: 壬子)`);

// 测试日期2：1994年11月21日23点10分（已知正确结果：甲戌 乙亥 癸亥 癸亥）
console.log('\n=== 测试日期2：1994年11月21日23点10分 ===');
const result2_1 = calculateBazi1(1994, 11, 21, 23);
const result2_2 = calculateBazi2({ year: 1994, month: 11, day: 21, hour: 23, minute: 10, isLunar: false, gender: 'female' });
console.log('算法1结果：');
console.log(`年柱: ${result2_1.yearPillar} (期望: 甲戌)`);
console.log(`月柱: ${result2_1.monthPillar} (期望: 乙亥)`);
console.log(`日柱: ${result2_1.dayPillar} (期望: 癸亥)`);
console.log(`时柱: ${result2_1.hourPillar} (期望: 癸亥)`);
console.log('算法2结果：');
console.log(`年柱: ${result2_2.yearPillar} (期望: 甲戌)`);
console.log(`月柱: ${result2_2.monthPillar} (期望: 乙亥)`);
console.log(`日柱: ${result2_2.dayPillar} (期望: 癸亥)`);
console.log(`时柱: ${result2_2.hourPillar} (期望: 癸亥)`);
