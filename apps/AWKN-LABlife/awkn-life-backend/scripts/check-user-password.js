const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const user = await p.user.findUnique({ 
    where: { email: '10919669@qq.com' },
    select: { id: true, email: true, nickname: true, isAdmin: true, password: true }
  });
  console.log('用户数据：');
  console.dir(user, { depth: null });
}
main().finally(() => p.$disconnect());
