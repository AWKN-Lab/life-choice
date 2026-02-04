import { calculateBazi } from './src/lib/bazi-engine.ts';

// 测试用例：1983年5月20日0点30分
const testBirth = {
  year: 1983,
  month: 5,
  day: 20,
  hour: 0,
  minute: 30,
  isLunar: false,
  gender: 'male' as const
};

const result = calculateBazi(testBirth);

console.log('输入：1983年5月20日0点30分');
console.log('计算结果：');
console.log(`年柱: ${result.yearPillar} (期望: 癸亥)`);
console.log(`月柱: ${result.monthPillar} (期望: 丁巳)`);
console.log(`日柱: ${result.dayPillar} (期望: 戊申)`);
console.log(`时柱: ${result.hourPillar} (期望: 壬子)`);
console.log(`日主: ${result.dayMaster} (期望: 戊)`);
console.log(`格局: ${result.pattern}`);
