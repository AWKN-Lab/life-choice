/**
 * 管理员保底校验脚本 - Q3 P0-4
 * 在 ensure-admin.js 之后运行，校验：
 * 1. 管理员账号存在
 * 2. isAdmin 状态正确
 * 3. 密码可登录（bcrypt.compare）
 *
 * 用法：
 *   ADMIN_PASSWORD=xxx node scripts/verify-admin.js
 *
 * 退出码：
 *   0 = 校验通过
 *   1 = 校验失败
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '10919669@qq.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  console.log('======================================');
  console.log('  管理员保底校验');
  console.log('  时间: ' + new Date().toISOString());
  console.log('======================================');

  // 1. 查询管理员账号
  console.log('\n[1/3] 查询管理员账号 ...');
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nickname: true,
      isAdmin: true,
      password: true,
      creditBalance: true,
    },
  });

  if (!user) {
    console.error('  [FAIL] 管理员账号不存在: ' + email);
    console.error('  请先运行: ADMIN_PASSWORD=xxx node scripts/ensure-admin.js');
    process.exitCode = 1;
    return;
  }
  console.log('  [PASS] 管理员账号存在: ' + email);
  console.log('         ID: ' + user.id);
  console.log('         昵称: ' + (user.nickname || '(未设置)'));

  // 2. 校验 isAdmin 状态
  console.log('\n[2/3] 校验 isAdmin 状态 ...');
  if (user.isAdmin !== true) {
    console.error('  [FAIL] isAdmin 状态错误: ' + user.isAdmin);
    console.error('  请运行: ADMIN_PASSWORD=xxx node scripts/ensure-admin.js');
    process.exitCode = 1;
    return;
  }
  console.log('  [PASS] isAdmin = true');

  // 3. 校验密码可登录
  console.log('\n[3/3] 校验密码可登录 ...');
  if (!user.password) {
    console.error('  [FAIL] 密码字段为空');
    console.error('  请运行: ADMIN_PASSWORD=xxx node scripts/ensure-admin.js');
    process.exitCode = 1;
    return;
  }

  if (!password) {
    console.warn('  [WARN] ADMIN_PASSWORD 未设置，跳过密码登录校验');
    console.warn('  建议设置 ADMIN_PASSWORD 环境变量以完成完整校验');
  } else {
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.error('  [FAIL] 密码不匹配');
      console.error('  请运行: ADMIN_PASSWORD=xxx node scripts/ensure-admin.js');
      process.exitCode = 1;
      return;
    }
    console.log('  [PASS] 密码验证通过');
  }

  // 汇总
  console.log('\n======================================');
  if (process.exitCode === 1) {
    console.error('  结果: ❌ 管理员保底校验失败');
    console.error('======================================');
  } else {
    console.log('  结果: ✅ 管理员保底校验通过');
    console.log('  账号: ' + email);
    console.log('  isAdmin: ' + user.isAdmin);
    console.log('  积分余额: ' + user.creditBalance);
    console.log('======================================');
  }

  console.log(JSON.stringify({
    ok: process.exitCode !== 1,
    email: user.email,
    isAdmin: user.isAdmin,
    passwordVerified: !!password,
    creditBalance: user.creditBalance,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('校验脚本异常:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
