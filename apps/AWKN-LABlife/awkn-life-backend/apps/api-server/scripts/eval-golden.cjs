const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cases = JSON.parse(fs.readFileSync(path.join(root, 'evals', 'golden-cases.json'), 'utf8'));
const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : '';
const outputs = outputPath && fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : {};

const banned = [
  '注意身体健康',
  '事业有起有落',
  '保持努力',
  '未来可期',
  '把握好机会',
  '可能会遇到贵人',
  '需要谨慎行事',
];

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function readPath(obj, key) {
  return key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

let failed = 0;

for (const testCase of cases) {
  const output = outputs[testCase.id];
  if (!output) {
    console.log(`[SKIP] ${testCase.id} ${testCase.focus} - no output fixture supplied`);
    continue;
  }

  const text = JSON.stringify(output);
  const errors = [];

  for (const field of testCase.requiredFields) {
    if (!hasValue(readPath(output, field))) errors.push(`missing ${field}`);
  }

  for (const signal of testCase.requiredSignals) {
    if (!text.includes(signal)) errors.push(`missing signal ${signal}`);
  }

  for (const sourceId of testCase.requiredSourceIds) {
    if (!text.includes(sourceId)) errors.push(`missing sourceId ${sourceId}`);
  }

  const bannedHit = banned.find((phrase) => text.includes(phrase));
  if (bannedHit) errors.push(`banned Barnum phrase: ${bannedHit}`);

  if (errors.length) {
    failed += 1;
    console.error(`[FAIL] ${testCase.id} ${errors.join('; ')}`);
  } else {
    console.log(`[PASS] ${testCase.id}`);
  }
}

if (failed > 0) {
  console.error(`Golden eval failed: ${failed} case(s)`);
  process.exit(1);
}

console.log(`Golden eval completed. Cases: ${cases.length}. Provide an output fixture JSON path to score real LLM results.`);
