#!/usr/bin/env node
// DEPRECATED: 此文件已被 .husky/pre-commit 替代，请勿使用
/**
 * 一键启用 git hooks
 * 运行: npm run setup:hooks
 *
 * 作用: 配置 git core.hooksPath 指向 scripts/git-hooks
 * 这样 pre-commit hook 会被自动调用，且脚本在仓库内可共享
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const HOOKS_DIR = resolve(REPO_ROOT, 'scripts', 'git-hooks');
const PRE_COMMIT = resolve(HOOKS_DIR, 'pre-commit');

// 检查脚本存在
if (!existsSync(PRE_COMMIT)) {
  console.error(`❌ 未找到 pre-commit 脚本: ${PRE_COMMIT}`);
  process.exit(1);
}

// 配置 git hooksPath
try {
  execSync(`git config core.hooksPath scripts/git-hooks`, {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });
  console.log('✅ Git hooks 已启用');
  console.log(`   hooksPath: scripts/git-hooks`);
  console.log(`   pre-commit: 类型检查门禁`);
  console.log('');
  console.log('下次 git commit 时会自动运行 tsc --noEmit');
  console.log('紧急情况跳过: git commit --no-verify');
  console.log('禁用: git config --unset core.hooksPath');
} catch (err) {
  console.error('❌ 配置失败:', err.message);
  process.exit(1);
}
