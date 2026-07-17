/**
 * 微信小程序自动上传脚本
 * 
 * 使用方式：
 *   npm run upload
 * 
 * 前置条件：
 *   1. 已安装 miniprogram-ci：npm install miniprogram-ci --save-dev
 *   2. 私钥文件在项目根目录：private.wx14a9a3210a24f504 (1).key
 *   3. 微信后台已配置 IP 白名单
 */

const ci = require('miniprogram-ci');
const path = require('path');

// ===== 配置 =====
const PROJECT_PATH = path.resolve(__dirname, './dist');
const PRIVATE_KEY_PATH = path.resolve(__dirname, process.env.WX_PRIVATE_KEY_PATH || './private.key');
const APP_ID = process.env.WX_APP_ID || 'wx14a9a3210a24f504';

// 版本号：可从参数读取，默认 1.0.0
const VERSION = process.env.npm_config_version || process.argv[2] || '1.0.0';
const DESC = process.env.npm_config_desc || process.argv[3] || '初始版本';

async function upload() {
  console.log('🚀 开始上传微信小程序...');
  console.log(`   AppID: ${APP_ID}`);
  console.log(`   版本: ${VERSION}`);
  console.log(`   描述: ${DESC}`);
  console.log(`   产物: ${PROJECT_PATH}`);
  console.log(`   私钥: ${PRIVATE_KEY_PATH}`);

  try {
    const project = new ci.Project({
      appid: APP_ID,
      type: 'miniProgram',
      projectPath: PROJECT_PATH,
      privateKeyPath: PRIVATE_KEY_PATH,
      ignores: ['node_modules/**/*'],
    });

    const uploadResult = await ci.upload({
      project,
      version: VERSION,
      desc: DESC,
      setting: {
        es6: true,
        es7: true,
        minify: true,
        autoPrefixWXSS: true,
        minifyWXML: true,
      },
      onProgressUpdate: (task) => {
        if (task._status === 'uploading') {
          const percent = Math.round((task._uploadedCount / task._totalCount) * 100);
          process.stdout.write(`\r上传进度: ${percent}% (${task._uploadedCount}/${task._totalCount})`);
        }
      },
    });

    console.log('\n✅ 上传成功！');
    console.log(`   subPackageId: ${uploadResult.subPackageId || '无'}`);
    console.log('');
    console.log('👉 请前往微信公众平台提交审核：');
    console.log('   https://mp.weixin.qq.com → 版本管理 → 提交审核');
  } catch (err) {
    console.error('\n❌ 上传失败:', err.message);
    if (err.message.includes('IP')) {
      console.error('   → 请在微信后台 → 开发管理 → 开发设置 → 代码上传 → IP白名单 中添加本机 IP');
    }
    process.exit(1);
  }
}

upload();
