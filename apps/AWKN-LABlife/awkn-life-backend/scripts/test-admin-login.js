const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findUnique({ where: { email: '10919669@qq.com' } });
  
  if (user.password) {
    const isValid = await bcrypt.compare(process.env.ADMIN_PASSWORD || 'CHANGE_ME', user.password);
    console.log('验证结果:', isValid ? '✓ 密码正确' : '✗ 密码错误');
  } else {
    console.log('用户没有设置密码');
  }
  
  console.log('\n尝试创建一个新的测试管理员账号...');
  try {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
    const testUser = await p.user.create({
      data: {
        email: 'admin@awkn.life',
        password: hashedPassword,
        nickname: '测试管理员',
        isAdmin: true
      }
    });
    console.log('✓ 新管理员创建成功！');
    console.log('邮箱：admin@awkn.life');
  } catch (e) {
    console.log('新管理员可能已存在:', e.message);
  }
}

main().finally(() => p.$disconnect());
