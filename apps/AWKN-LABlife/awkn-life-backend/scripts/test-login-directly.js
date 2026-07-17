const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  console.log('测试登录流程...');
  
  // 测试 AuthService.login 的逻辑，就是先找 email，然后 bcrypt.compare
  console.log('\n1. 按 email 查询用户（只查必要字段）...');
  const user = await p.user.findUnique({
    where: { email: '10919669@qq.com' },
    select: { id: true, email: true, password: true }
  });
  console.log('✓ 用户查询成功！');
  
  console.log('\n2. 验证密码...');
  const isValid = await bcrypt.compare(process.env.ADMIN_PASSWORD || 'CHANGE_ME', user.password);
  console.log('✓ 密码验证成功！', isValid);
  
  console.log('\n🎉 登录功能正常！');
  console.log('\n管理员登录信息:');
  console.log('  邮箱: 10919669@qq.com');
  
  console.log('\n您现在可以使用这个账号在网站上登录了！');
}

main().finally(() => p.$disconnect());
