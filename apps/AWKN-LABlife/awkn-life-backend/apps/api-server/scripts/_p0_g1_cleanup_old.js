// P0-G1 安全纠偏：清理之前错误创建的 test 用户 + 恢复管理员账号标记
// 不动管理员的 KlineBar/StateSnapshot/BaZiProfile（管理员无 BaZiProfile，保持原样）
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldEmails = [
    'test-a@kline-tide.test',
    'test-b@kline-tide.test',
    'test-c@kline-tide.test',
  ];

  console.log('=== P0-G1 安全纠偏：清理旧 test 用户 ===\n');
  for (const email of oldEmails) {
    const u = await prisma.user.findUnique({ where: { email } });
    if (!u) { console.log(`  ${email}: 不存在，跳过`); continue; }
    // 先删 KlineBar/StateSnapshot/Membership/BaZiProfile（级联）
    await prisma.klineBar.deleteMany({ where: { userId: u.id } });
    await prisma.stateSnapshot.deleteMany({ where: { userId: u.id } });
    await prisma.membership.deleteMany({ where: { userId: u.id } });
    await prisma.baZiProfile.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    console.log(`  ${email} (userId=${u.id}): 已删除（含关联数据）`);
  }

  // 管理员账号：只标记，不动数据
  const admin = await prisma.user.findUnique({ where: { email: '10919669@qq.com' } });
  console.log(`\n=== 管理员账号状态（不动） ===`);
  console.log(`  email: ${admin.email}`);
  console.log(`  userId: ${admin.id}`);
  console.log(`  KlineBar: ${await prisma.klineBar.count({ where: { userId: admin.id } })} 条（保留）`);
  console.log(`  StateSnapshot: ${await prisma.stateSnapshot.count({ where: { userId: admin.id } })} 条（保留）`);
  console.log(`  BaZiProfile: ${await prisma.baZiProfile.count({ where: { userId: admin.id } })} 条（保留，当前为 0）`);
  console.log(`  ⚠️  密码已被重置为 Admin123456（之前的破坏性动作，需老板手动恢复）`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
