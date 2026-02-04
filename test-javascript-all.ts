import { calculateBazi } from './src/lib/bazi-engine.ts';

// 测试用例1: 1983年5月20日0点30分
console.log('=== 测试用例1: 1983年5月20日0点30分 ===');
const testBirth1 = {
  year: 1983,
  month: 5,
  day: 20,
  hour: 0,
  minute: 30,
  isLunar: false,
  gender: 'male' as const
};
const result1 = calculateBazi(testBirth1);
console.log(`年柱: ${result1.yearPillar} (期望: 癸亥)`);
console.log(`月柱: ${result1.monthPillar} (期望: 丁巳)`);
console.log(`日柱: ${result1.dayPillar} (期望: 戊申)`);
console.log(`时柱: ${result1.hourPillar} (期望: 壬子)`);
console.log(`日主: ${result1.dayMaster} (期望: 戊)`);
console.log(`格局: ${result1.pattern}`);

// 测试用例2: 1994年11月21日23点10分
console.log('\n=== 测试用例2: 1994年11月21日23点10分 ===');
const testBirth2 = {
  year: 1994,
  month: 11,
  day: 21,
  hour: 23,
  minute: 10,
  isLunar: false,
  gender: 'female' as const
};
const result2 = calculateBazi(testBirth2);
console.log(`年柱: ${result2.yearPillar} (期望: 甲戌)`);
console.log(`月柱: ${result2.monthPillar} (期望: 乙亥)`);
console.log(`日柱: ${result2.dayPillar} (期望: 辛亥)`);
console.log(`时柱: ${result2.hourPillar} (期望: 庚子)`);
console.log(`日主: ${result2.dayMaster} (期望: 辛)`);
console.log(`格局: ${result2.pattern}`);

// 测试用例3: 2011年3月20日7点30分
console.log('\n=== 测试用例3: 2011年3月20日7点30分 ===');
const testBirth3 = {
  year: 2011,
  month: 3,
  day: 20,
  hour: 7,
  minute: 30,
  isLunar: false,
  gender: 'male' as const
};
const result3 = calculateBazi(testBirth3);
console.log(`年柱: ${result3.yearPillar} (期望: 辛卯)`);
console.log(`月柱: ${result3.monthPillar} (期望: 辛卯)`);
console.log(`日柱: ${result3.dayPillar} (期望: 甲戌)`);
console.log(`时柱: ${result3.hourPillar} (期望: 戊辰)`);
console.log(`日主: ${result3.dayMaster} (期望: 甲)`);
console.log(`格局: ${result3.pattern}`);
