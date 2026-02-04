import { calculateBazi } from './src/lib/bazi-engine.ts';

// 测试用例：1985年5月31日04:30，女，阳历
const testBirth = {
  year: 1985,
  month: 5,
  day: 31,
  hour: 4,
  minute: 30,
  isLunar: false,
  gender: 'female' as const
};

const result = calculateBazi(testBirth);

console.log('输入：1985年5月31日04:30（阳历，女）');
console.log('计算结果：');
console.log(`年柱: ${result.yearPillar}`);
console.log(`月柱: ${result.monthPillar}`);
console.log(`日柱: ${result.dayPillar}`);
console.log(`时柱: ${result.hourPillar}`);
console.log(`日主: ${result.dayMaster}`);
console.log(`格局: ${result.pattern}`);
