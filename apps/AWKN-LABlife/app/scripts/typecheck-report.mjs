#!/usr/bin/env node
/**
 * 类型债务追踪脚本
 * 运行: npm run typecheck:report
 *
 * 功能:
 * 1. 运行 tsc --noEmit 统计错误数
 * 2. 按文件归类错误
 * 3. 追加到 typecheck-baseline.log 形成趋势
 * 4. 与上次基线对比，输出增减
 */

import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOG_FILE = resolve(ROOT, 'typecheck-baseline.log');

// 读取上次基线
function getLastBaseline() {
  if (!existsSync(LOG_FILE)) return null;
  const lines = readFileSync(LOG_FILE, 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  if (lines.length === 0) return null;
  const last = lines[lines.length - 1].split('|').map(s => s.trim());
  return { date: last[0], errors: parseInt(last[1], 10), files: parseInt(last[2], 10) };
}

// 运行 tsc
let tscOutput = '';
try {
  execSync('npx tsc -p tsconfig.app.json --noEmit', {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  // 0 errors
} catch (err) {
  tscOutput = err.stdout + err.stderr;
}

// 解析错误
const errorLines = tscOutput.split('\n').filter(l => l.includes('error TS'));
const totalErrors = errorLines.length;

// 按文件归类
const fileMap = new Map();
for (const line of errorLines) {
  const match = line.match(/^([^(]+)\((\d+),(\d+)\):/);
  if (match) {
    const file = match[1].replace(/\\/g, '/').split('app/src/')[1] || match[1];
    fileMap.set(file, (fileMap.get(file) || 0) + 1);
  }
}

// 输出报告
const today = new Date().toISOString().slice(0, 10);
const last = getLastBaseline();
const delta = last ? totalErrors - last.errors : 0;

console.log('\n=== TypeScript 类型债务报告 ===');
console.log(`日期: ${today}`);
console.log(`总错误数: ${totalErrors}`);
console.log(`受影响文件数: ${fileMap.size}`);

if (last) {
  const sign = delta > 0 ? '+' : '';
  console.log(`与上次对比: ${sign}${delta} (上次: ${last.errors} @ ${last.date})`);
  if (delta > 0) {
    console.log(`⚠️  类型债务增加 ${delta} 处，请检查最近提交`);
  } else if (delta < 0) {
    console.log(`✅ 类型债务减少 ${Math.abs(delta)} 处`);
  } else {
    console.log(`✓ 类型债务保持稳定`);
  }
}

if (fileMap.size > 0) {
  console.log('\n--- 错误分布 Top 10 ---');
  const sorted = [...fileMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [file, count] of sorted) {
    console.log(`  ${count.toString().padStart(3)}  ${file}`);
  }
}

// 追加到日志
const logLine = `${today} | ${totalErrors} | ${fileMap.size} | ${delta > 0 ? '增加' : delta < 0 ? '减少' : '稳定'} | ${delta > 0 ? `+${delta}` : delta}`;
appendFileSync(LOG_FILE, logLine + '\n');
console.log(`\n已追加到: ${LOG_FILE}`);

// 退出码: 有错误则非零
process.exit(totalErrors > 0 ? 1 : 0);
