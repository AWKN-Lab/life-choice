/**
 * verify-build.js — 构建产物完整性校验（P0-3 Step2）
 *
 * 职责：
 * 1. 读取 assets-manifest.json（单一权威清单）
 * 2. 检查 dist/ 下每个 dest 路径是否存在
 * 3. required=true 且缺失 → process.exit(1)
 * 4. required=false 且缺失 → warn 但不 fail
 * 5. 生成 dist/assets-checksum.json（记录每个文件的 md5，供部署后对比）
 *
 * 接入方式：package.json build 脚本改为 "nest build && node scripts/verify-build.js"
 *
 * 跳过方式：SKIP_VERIFY_BUILD=1 npm run build（仅紧急情况）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKIP = process.env.SKIP_VERIFY_BUILD === '1';
if (SKIP) {
  console.log('[verify-build] SKIP_VERIFY_BUILD=1, skipping');
  process.exit(0);
}

const apiServerRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(apiServerRoot, 'assets-manifest.json');
const distRoot = path.join(apiServerRoot, 'dist');

if (!fs.existsSync(manifestPath)) {
  console.error(`[verify-build] FATAL: assets-manifest.json not found at ${manifestPath}`);
  process.exit(1);
}

if (!fs.existsSync(distRoot)) {
  console.error(`[verify-build] FATAL: dist/ not found. Run "nest build" first.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
console.log(`[verify-build] Loaded manifest v${manifest.version}: ${manifest.dirs.length} dirs + ${manifest.files.length} files + ${manifest.dataDirs.length} dataDirs`);

const checksums = {};
const errors = [];
const warnings = [];
const degraded = [];

function listFilesRecursive(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result;
}

function md5OfFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function checkDirEntry(entry, category) {
  const distPath = path.join(distRoot, entry.dest);
  const srcPath = path.join(apiServerRoot, 'src', entry.src);

  if (!fs.existsSync(distPath)) {
    const msg = `[verify-build] MISSING ${category}: ${entry.dest} (expected at ${distPath})`;
    if (entry.required) {
      errors.push(msg);
    } else {
      warnings.push(msg);
      degraded.push(entry.dest);
    }
    return;
  }

  // 校验目录非空
  const files = listFilesRecursive(distPath);
  if (files.length === 0) {
    const msg = `[verify-build] EMPTY ${category}: ${entry.dest} (directory exists but no files)`;
    if (entry.required) {
      errors.push(msg);
    } else {
      warnings.push(msg);
      degraded.push(entry.dest);
    }
    return;
  }

  // 记录 checksum
  for (const f of files) {
    const relPath = path.relative(distRoot, f).replace(/\\/g, '/');
    try {
      checksums[relPath] = md5OfFile(f);
    } catch (e) {
      warnings.push(`[verify-build] CHECKSUM_FAIL: ${relPath} - ${e.message}`);
    }
  }

  console.log(`[verify-build] OK ${category}: ${entry.dest} (${files.length} files)`);
}

function checkFileEntry(entry) {
  const distPath = path.join(distRoot, entry.dest);

  if (!fs.existsSync(distPath)) {
    const msg = `[verify-build] MISSING file: ${entry.dest} (expected at ${distPath})`;
    if (entry.required) {
      errors.push(msg);
    } else {
      warnings.push(msg);
      degraded.push(entry.dest);
    }
    return;
  }

  // 记录 checksum
  const relPath = entry.dest.replace(/\\/g, '/');
  try {
    checksums[relPath] = md5OfFile(distPath);
  } catch (e) {
    warnings.push(`[verify-build] CHECKSUM_FAIL: ${relPath} - ${e.message}`);
    return;
  }

  console.log(`[verify-build] OK file: ${entry.dest}`);
}

function checkDataDirEntry(entry) {
  // dataDirs 在 src 外，dest 相对 dist 的上级（../data/...）
  // 这类目录不参与 dist 完整性校验（因为不在 dist 内），只记录是否存在的状态
  const resolvedPath = path.resolve(distRoot, entry.dest);
  if (!fs.existsSync(resolvedPath)) {
    const msg = `[verify-build] MISSING dataDir: ${entry.dest} (expected at ${resolvedPath})`;
    if (entry.required) {
      errors.push(msg);
    } else {
      warnings.push(msg);
      degraded.push(entry.dest);
    }
    return;
  }
  console.log(`[verify-build] OK dataDir: ${entry.dest}`);
}

console.log('---');
// 校验所有 dirs
for (const entry of manifest.dirs) {
  checkDirEntry(entry, 'dir');
}
// 校验所有 files
for (const entry of manifest.files) {
  checkFileEntry(entry);
}
// 校验所有 dataDirs
for (const entry of manifest.dataDirs) {
  checkDataDirEntry(entry);
}

// 写入 checksum 文件
const checksumPath = path.join(distRoot, 'assets-checksum.json');
const checksumContent = {
  generatedAt: new Date().toISOString(),
  manifestVersion: manifest.version,
  totalFiles: Object.keys(checksums).length,
  checksums,
  degraded,
};
fs.writeFileSync(checksumPath, JSON.stringify(checksumContent, null, 2));
console.log('---');
console.log(`[verify-build] Checksum written: ${checksumPath} (${Object.keys(checksums).length} files)`);

// 输出汇总
if (warnings.length > 0) {
  console.log(`[verify-build] WARNINGS (${warnings.length}):`);
  warnings.forEach(w => console.log(`  ${w}`));
}
if (degraded.length > 0) {
  console.log(`[verify-build] DEGRADED FEATURES: ${degraded.join(', ')}`);
}

if (errors.length > 0) {
  console.error(`[verify-build] ERRORS (${errors.length}):`);
  errors.forEach(e => console.error(`  ${e}`));
  console.error(`[verify-build] BUILD VERIFICATION FAILED. ${errors.length} required assets missing.`);
  process.exit(1);
}

console.log(`[verify-build] BUILD VERIFICATION PASSED. ${Object.keys(checksums).length} files checked, ${degraded.length} degraded.`);
process.exit(0);
