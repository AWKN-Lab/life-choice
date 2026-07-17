// P0-G1 临时脚本：为 A/B/C 测试用户授予 month 会员，以便测试 kline 模块权限
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emails = ['test-a@kline-tide.test', 'test-b@kline-tide.test', 'test-c@kline-tide.test'];
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + 1);

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log(`${email} 不存在`); continue; }

    // 清除旧 membership
    await prisma.membership.deleteMany({ where: { userId: user.id } });

    const m = await prisma.membership.create({
      data: {
        userId: user.id,
        type: 'month',
        status: 'active',
        startDate: new Date(),
        expireDate,
      },
    });
    console.log(`${email} userId=${user.id} 已授予 month 会员，expire=${expireDate.toISOString()}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
