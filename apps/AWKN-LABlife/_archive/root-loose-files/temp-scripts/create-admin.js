const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 查询或创建管理员用户
  let user = await prisma.user.findUnique({
    where: { email: '10919669@qq.com' }
  });

  if (user) {
    console.log('用户已存在，更新为管理员');
    user = await prisma.user.update({
      where: { email: '10919669@qq.com' },
      data: { isAdmin: true }
    });
  } else {
    console.log('创建新管理员用户');
    user = await prisma.user.create({
      data: {
        email: '10919669@qq.com',
        nickname: '管理员',
        isAdmin: true
      }
    });
  }

  console.log('管理员信息:', JSON.stringify(user, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
