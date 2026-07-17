// 紧急恢复管理员密码为 79104003
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('79104003', 10);
  const u = await prisma.user.update({
    where: { email: '10919669@qq.com' },
    data: { password: hashed },
    select: { id: true, email: true },
  });
  console.log(JSON.stringify({ ok: true, restored: true, user: u }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());