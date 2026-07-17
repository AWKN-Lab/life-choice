#!/usr/bin/env node
/**
 * sync-schema.cjs
 *
 * 单向镜像 apps/api-server/prisma/schema.prisma 到根目录 prisma/schema.prisma
 *
 * 背景：
 *   项目里有两份 schema.prisma —— 一份在 apps/api-server/prisma/（被 NestJS 运行时
 *   通过 .env 的 DATABASE_URL=file:./prisma/dev.db 实际加载），一份在根目录 prisma/
 *   （历史遗留的镜像）。两份会随时间漂移，每次 schema 改动后手动同步容易漏。
 *
 * 设计决策：
 *   - apps/api-server/prisma/ 是 single source of truth（运行时实际用的）
 *   - 根目录 prisma/ 只是镜像，便于在仓库根目录快速 cat / grep
 *   - 不调用 prisma format —— 因为 format 没有 stdout-only 选项，会原地修改文件
 *     （如果两边都需要格式化，应该各自手动跑 prisma format）
 *
 * 用法：
 *   npm run sync:schema
 *
 * 退出码：0 = 同步成功或无需同步；1 = 失败
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'apps/api-server/prisma/schema.prisma');
const TARGET = path.join(ROOT, 'prisma/schema.prisma');

function log(msg) {
  console.log(`[sync:schema] ${msg}`);
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ source not found: ${SOURCE}`);
    process.exit(1);
  }

  const sourceContent = fs.readFileSync(SOURCE, 'utf8');
  const targetExists = fs.existsSync(TARGET);
  const targetContent = targetExists ? fs.readFileSync(TARGET, 'utf8') : '';

  log(`source: ${path.relative(ROOT, SOURCE)} (${sourceContent.length} bytes)`);
  log(`target: ${path.relative(ROOT, TARGET)} (${targetExists ? targetContent.length + ' bytes' : 'missing'})`);

  if (sourceContent === targetContent) {
    log('✅ schema already in sync (no changes needed)');
    return;
  }

  // 有差异 —— 备份目标
  if (targetExists) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = `${TARGET}.bak-${ts}`;
    fs.copyFileSync(TARGET, backupPath);
    log(`backup: ${path.relative(ROOT, backupPath)}`);
  }

  // 复制源到目标
  fs.copyFileSync(SOURCE, TARGET);
  log('copied source → target');

  // 校验目标语法
  try {
    log('prisma validate (target)...');
    execSync('npx prisma validate', {
      cwd: path.dirname(TARGET),
      stdio: 'inherit',
    });
  } catch {
    console.error('prisma validate failed — target schema is broken, check backup file');
    process.exit(1);
  }

  // 重新生成 client（在 source 目录跑，因为 NestJS 运行时加载的是 source 的 client）
  try {
    log('prisma generate (source)...');
    execSync('npx prisma generate', {
      cwd: path.dirname(SOURCE),
      stdio: 'inherit',
    });
  } catch {
    console.error('prisma generate failed');
    process.exit(1);
  }

  log('sync done — target updated, client regenerated');
}

main();