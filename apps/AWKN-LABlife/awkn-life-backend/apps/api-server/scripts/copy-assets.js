/**
 * copy-assets.js — 构建后复制 assets 到 dist（P0-3 Step2）
 *
 * 职责：
 * 1. 读取 assets-manifest.json（单一权威清单）
 * 2. 将 src/ 下的 assets 复制到 dist/
 * 3. 复制 dataDirs（src 外的数据目录）到 dist/ 对应位置
 *
 * 设计原则：
 * - 本脚本是 build 阶段的"主动复制"，替代 nest build v10 不复制 assets 的问题
 * - bootstrap-production.js 的 ensureAssets() 保留作为运行时兜底
 * - preflight-check.js 做最终校验
 * - 三层防护：build 复制 → bootstrap 兜底 → preflight 校验
 *
 * 接入方式：package.json build 脚本改为 "nest build && node scripts/copy-assets.js && node scripts/verify-build.js"
 */
'use strict';

const fs = require('fs');
const path = require('path');

const apiServerRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(apiServerRoot, 'assets-manifest.json');
const srcRoot = path.join(apiServerRoot, 'src');
const distRoot = path.join(apiServerRoot, 'dist');

if (!fs.existsSync(manifestPath)) {
  console.error(`[copy-assets] FATAL: assets-manifest.json not found at ${manifestPath}`);
  process.exit(1);
}

if (!fs.existsSync(distRoot)) {
  console.error(`[copy-assets] FATAL: dist/ not found. Run "nest build" first.`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
console.log(`[copy-assets] Loaded manifest v${manifest.version}`);

let copiedDirs = 0;
let copiedFiles = 0;
let skipped = 0;
const errors = [];

function copyDir(srcPath, distPath, label) {
  if (!fs.existsSync(srcPath)) {
    console.warn(`[copy-assets] SKIP ${label}: src not found at ${srcPath}`);
    skipped++;
    return;
  }
  // P0-3 Step8 修复 (2026-06-26): 双重 BUG 修复
  // BUG1: fs.rmSync(distPath) 删除 dist 会丢失 nest build 编译的 .js 文件
  //   场景：src/knowledge-base-data/ 含 .ts 源码 + .json 数据
  //         dist/knowledge-base-data/ 含 nest build 编译的 .js 模块
  //         rmSync 删除 dist 后，cpSync 只复制 src 的 .ts/.json，丢失 .js
  //         → NestJS 启动报 Cannot find module './knowledge-base-data/knowledge-base.module'
  // BUG2: 不删除 dist 时，src 是 symlink 会导致 cpSync 报 EEXIST
  //   场景：src/knowledge-base/bazi 是 symlink → knowledge/eastern-metaphysics/.../bazi-knowledge-base
  //         cpSync 试图在 dist 创建 symlink，但 dist 已存在 → EEXIST
  //
  // 修复策略：
  //   1. 不删除 dist（保留 nest build 的 .js 文件）
  //   2. src 是 symlink 时，先解析到真实路径，再用真实路径做普通目录复制
  //      这样 cpSync 不会试图创建 symlink，而是复制实际内容
  let realSrcPath = srcPath;
  try {
    const srcLstat = fs.lstatSync(srcPath);
    if (srcLstat.isSymbolicLink()) {
      realSrcPath = fs.realpathSync(srcPath);
      console.log(`[copy-assets] symlink resolved: ${label} → ${path.relative(apiServerRoot, realSrcPath)}`);
    }
  } catch {
    // lstat 失败则用原路径
  }

  fs.mkdirSync(path.dirname(distPath), { recursive: true });
  // force:true 覆盖同名文件，保留 dist 独有的 .js 文件
  fs.cpSync(realSrcPath, distPath, { recursive: true, force: true });
  copiedDirs++;
  console.log(`[copy-assets] OK dir: ${label} → ${path.relative(apiServerRoot, distPath)}`);
}

function copyFile(srcPath, distPath, label) {
  if (!fs.existsSync(srcPath)) {
    console.warn(`[copy-assets] SKIP ${label}: src not found at ${srcPath}`);
    skipped++;
    return;
  }
  fs.mkdirSync(path.dirname(distPath), { recursive: true });
  // 覆盖已存在的文件
  fs.copyFileSync(srcPath, distPath);
  copiedFiles++;
  console.log(`[copy-assets] OK file: ${label} → ${path.relative(apiServerRoot, distPath)}`);
}

// 复制所有 dirs
for (const entry of manifest.dirs) {
  const srcPath = path.join(srcRoot, entry.src);
  const distPath = path.join(distRoot, entry.dest);
  copyDir(srcPath, distPath, entry.src);
}

// 复制所有 files
for (const entry of manifest.files) {
  const srcPath = path.join(srcRoot, entry.src);
  const distPath = path.join(distRoot, entry.dest);
  copyFile(srcPath, distPath, entry.src);
}

// 复制 dataDirs（src 外的数据目录）
for (const entry of manifest.dataDirs) {
  const srcPath = path.resolve(apiServerRoot, entry.src);
  const distPath = path.resolve(distRoot, entry.dest);
  copyDir(srcPath, distPath, entry.src);
}

console.log('---');
console.log(`[copy-assets] Copied ${copiedDirs} dirs + ${copiedFiles} files, skipped ${skipped}`);

if (errors.length > 0) {
  console.error(`[copy-assets] ERRORS (${errors.length}):`);
  errors.forEach(e => console.error(`  ${e}`));
  process.exit(1);
}

console.log(`[copy-assets] DONE`);
process.exit(0);
