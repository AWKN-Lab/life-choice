const ci = require('miniprogram-ci');
const path = require('path');

const project = new ci.Project({
  appid: 'wx14a9a3210a24f504',
  type: 'miniProgram',
  projectPath: path.join(__dirname, 'dist'),
  privateKeyPath: path.join(__dirname, 'private.wx14a9a3210a24f504 (1).key'),
});

console.log('🚀 Starting upload...');
console.log('   AppID:', project.appid);
console.log('   Version: 1.0.0');
console.log('   IP check: should be 8.148.245.29');

ci.upload({
  project,
  version: '1.0.0',
  desc: '初始版本发布',
}).then((result) => {
  console.log('\n✅ UPLOAD SUCCESS!');
  console.log(JSON.stringify(result, null, 2));
}).catch((err) => {
  console.log('\n❌ UPLOAD FAILED!');
  console.log(err.message);
  process.exit(1);
});
