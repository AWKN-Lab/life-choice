const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  console.log('开始重置密码...');
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  
  const result = await p.user.update({
    where: { email: '10919669@qq.com' },
    data: { password: hashedPassword }
  });
  
  console.log('更新成功！');
  console.log('邮箱：10919669@qq.com');
}

main()
  .catch(e => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
