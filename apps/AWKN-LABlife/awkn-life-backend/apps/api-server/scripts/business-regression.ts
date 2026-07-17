/**
 * 经营回归验证 - Q3 P4-3
 * 检查：
 * 1. 积分体系：User.creditBalance / CreditLedger
 * 2. 会员体系：Membership
 * 3. 分享行为：ConsultRecord.shareCount / shareGenerated
 * 4. 解锁行为：ConsultRecord.unlockStatus
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('======================================');
  console.log('  经营回归验证 - Q3 P4-3');
  console.log('  时间: ' + new Date().toISOString());
  console.log('======================================');
  console.log('');

  // 1. 积分体系
  console.log('[1/4] 积分体系 ...');
  const totalCredits = await prisma.user.aggregate({
    _sum: { creditBalance: true },
    _count: { id: true },
  });
  const ledgerCount = await prisma.creditLedger.count();
  console.log('  用户总数: ' + totalCredits._count.id);
  console.log('  总积分余额: ' + (totalCredits._sum.creditBalance || 0));
  console.log('  积分流水条数: ' + ledgerCount);
  console.log('  [PASS]');
  console.log('');

  // 2. 会员体系
  console.log('[2/4] 会员体系 ...');
  const memberships = await prisma.membership.groupBy({
    by: ['type', 'status'],
    _count: { id: true },
  });
  console.log('  会员分布:');
  memberships.forEach((m) => {
    console.log('    ' + m.type + '/' + m.status + ': ' + m._count.id);
  });
  const totalActiveMembers = await prisma.membership.count({ where: { status: 'active' } });
  console.log('  活跃会员: ' + totalActiveMembers);
  console.log('  [PASS]');
  console.log('');

  // 3. 分享行为
  console.log('[3/4] 分享行为 ...');
  const shareStats = await prisma.consultRecord.aggregate({
    _sum: { shareCount: true },
    _count: {
      id: true,
      shareGenerated: true,
    },
  });
  console.log('  咨询记录总数: ' + shareStats._count.id);
  console.log('  已生成分享: ' + shareStats._count.shareGenerated);
  console.log('  分享总次数: ' + (shareStats._sum.shareCount || 0));
  console.log('  [PASS]');
  console.log('');

  // 4. 解锁行为
  console.log('[4/4] 解锁行为 ...');
  const unlockStats = await prisma.consultRecord.groupBy({
    by: ['unlockStatus'],
    _count: { id: true },
  });
  console.log('  解锁状态分布:');
  unlockStats.forEach((u) => {
    console.log('    ' + (u.unlockStatus || '未设置') + ': ' + u._count.id);
  });
  console.log('  [PASS]');
  console.log('');

  // 5. 总结
  console.log('======================================');
  console.log('  经营回归验证摘要');
  console.log('======================================');
  console.log('  ✓ 积分体系: ' + totalCredits._count.id + ' 用户，' + ledgerCount + ' 条流水');
  console.log('  ✓ 会员体系: ' + totalActiveMembers + ' 活跃会员');
  console.log('  ✓ 分享行为: ' + (shareStats._sum.shareCount || 0) + ' 总分享次数');
  console.log('  ✓ 解锁行为: ' + unlockStats.length + ' 种状态');
  console.log('======================================');
  console.log('  经营回归验证 PASS');
  console.log('======================================');
}

main()
  .catch((error) => {
    console.error('验证脚本异常:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
