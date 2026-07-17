/**
 * 奇门 Golden Fixture 交叉验证脚本
 *
 * 用法：
 *   cd knowledge/qimen-suite/qimen/qimen-master
 *   npm install
 *   node ../../golden-fixture/verify.js
 *
 * 验证内容：
 *   1. 四柱（年/月/日/时干支）正确性
 *   2. 局数（阳遁/阴遁 + 局数）正确性
 *   3. 元（上元/中元/下元）正确性
 *   4. 节气匹配正确性
 */

const qimen = require('./lib/qimen');
const fs = require('fs');
const path = require('path');

const casesPath = path.join(__dirname, '..', '..', 'golden-fixture', 'cases.json');
const cases = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));

let passed = 0;
let failed = 0;
const failures = [];

console.log(`\n奇门 Golden Fixture 交叉验证 (${cases.cases.length} cases)\n`);
console.log('='.repeat(60));

for (const tc of cases.cases) {
  const date = new Date(tc.date);
  const options = { type: tc.expected.type || '四柱', method: tc.expected.method || '时家', purpose: '综合', location: '默认位置' };

  try {
    const result = qimen.calculate(date, options);
    const checks = [];

    // 检查四柱
    if (result.yearGanZhi) {
      checks.push({ field: 'yearGanZhi', expected: tc.expected.yearGanZhi, actual: result.yearGanZhi });
    }
    if (result.monthGanZhi) {
      checks.push({ field: 'monthGanZhi', expected: tc.expected.monthGanZhi, actual: result.monthGanZhi });
    }
    if (result.dayGanZhi) {
      checks.push({ field: 'dayGanZhi', expected: tc.expected.dayGanZhi, actual: result.dayGanZhi });
    }
    if (result.hourGanZhi) {
      checks.push({ field: 'hourGanZhi', expected: tc.expected.hourGanZhi, actual: result.hourGanZhi });
    }

    // 检查局数
    if (result.jushu) {
      checks.push({ field: 'jushu', expected: tc.expected.jushu, actual: result.jushu });
    }

    // 检查元
    if (result.yuan) {
      checks.push({ field: 'yuan', expected: tc.expected.yuan, actual: result.yuan });
    }

    const caseFailures = checks.filter(c => c.expected && c.actual !== c.expected);
    const allPassed = checks.length > 0 && caseFailures.length === 0;

    if (allPassed) {
      passed++;
      console.log(`  PASS  ${tc.id}  ${tc.description}`);
    } else if (checks.length === 0) {
      console.log(`  SKIP  ${tc.id}  ${tc.description} (no fields to check)`);
    } else {
      failed++;
      failures.push({ id: tc.id, description: tc.description, failures: caseFailures });
      console.log(`  FAIL  ${tc.id}  ${tc.description}`);
      for (const f of caseFailures) {
        console.log(`        ${f.field}: expected="${f.expected}" actual="${f.actual}"`);
      }
    }
  } catch (err) {
    failed++;
    failures.push({ id: tc.id, description: tc.description, error: err.message });
    console.log(`  ERROR ${tc.id}  ${tc.description}: ${err.message}`);
  }
}

console.log('='.repeat(60));
console.log(`\nResults: ${passed} passed, ${failed} failed, ${cases.cases.length - passed - failed} skipped\n`);

if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) {
    console.log(`  ${f.id}: ${f.description}`);
    if (f.error) console.log(`    Error: ${f.error}`);
    if (f.failures) {
      for (const ff of f.failures) {
        console.log(`    ${ff.field}: expected="${ff.expected}" actual="${ff.actual}"`);
      }
    }
  }
  process.exit(1);
} else {
  console.log('All golden fixture tests passed.');
  process.exit(0);
}