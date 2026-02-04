import { calculateBazi } from './src/lib/bazi-engine.ts';

const testBirth = {
  year: 1994,
  month: 11,
  day: 21,
  hour: 23,
  minute: 10,
  isLunar: false,
  gender: 'female' as const
};

const result = calculateBazi(testBirth);

console.log('输入：1994年11月21日23点10分（阳历）');
console.log('阴历：1994年十月十九子时（坤造）');
console.log('计算结果：');
console.log(`年柱: ${result.yearPillar}`);
console.log(`月柱: ${result.monthPillar}`);
console.log(`日柱: ${result.dayPillar}`);
console.log(`时柱: ${result.hourPillar}`);
console.log(`日主: ${result.dayMaster}`);
console.log(`格局: ${result.pattern}`);
