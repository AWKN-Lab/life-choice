// 构建脚本 - 在 Taro 项目目录运行
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const prjRoot = __dirname;
process.chdir(prjRoot);
try {
  console.log('Building mini program...');
  execSync('npx @tarojs/cli build --type weapp', { stdio: 'inherit' });
} catch(e) {
  console.error('Build failed:', e.message);
  process.exit(1);
}
