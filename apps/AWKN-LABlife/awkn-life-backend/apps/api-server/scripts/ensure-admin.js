const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '10919669@qq.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const nickname = process.env.ADMIN_NICKNAME || '管理员';

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nickname: true,
      isAdmin: true,
      creditBalance: true,
    },
  });

  if (!existing && !password) {
    console.error('⚠️ ADMIN_PASSWORD not set. Admin account not created.');
    console.error('   Set ADMIN_PASSWORD env var and re-run, or manually create admin via API.');
    // P0-4: 不再 exit(1)，避免阻塞部署流程
    console.log(JSON.stringify({
      ok: false,
      mode: 'skipped',
      reason: 'ADMIN_PASSWORD not set',
      message: 'Set ADMIN_PASSWORD env var and re-run this script to create admin account.',
    }, null, 2));
    return;
  }

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const user = existing
    ? await prisma.user.update({
        where: { email },
        data: {
          isAdmin: true,
          nickname: existing.nickname || nickname,
          creditBalance: Math.max(existing.creditBalance || 0, 999),
          ...(hashedPassword ? { password: hashedPassword } : {}),
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          isAdmin: true,
          creditBalance: true,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          nickname,
          isAdmin: true,
          creditBalance: 999,
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          isAdmin: true,
          creditBalance: true,
        },
      });

  console.log(JSON.stringify({
    ok: true,
    mode: existing ? 'updated' : 'created',
    user,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
