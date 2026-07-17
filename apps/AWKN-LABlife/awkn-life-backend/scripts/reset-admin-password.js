const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  await p.user.update({
    where: { email: '10919669@qq.com' },
    data: { password: hashedPassword }
  });
  console.log('密码重置成功！');
  console.log('邮箱：10919669@qq.com');
}

main().finally(() => p.$disconnect());
