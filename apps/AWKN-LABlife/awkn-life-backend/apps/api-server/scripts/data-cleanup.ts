/**
 * 数据治理脚本 - Q3 P4-2
 * 识别和清理：
 * 1. 匿名重复档案
 * 2. 孤儿会员数据
 * 
 * 干运行模式：DRY_RUN=true（默认）只输出建议
 * 实际执行：DRY_RUN=false
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function main() {
  console.log('======================================');
  console.log('  数据治理脚本 - Q3 P4-2');
  console.log('  模式: ' + (DRY_RUN ? '干运行（不实际删除）' : '实际执行'));
  console.log('  时间: ' + new Date().toISOString());
  console.log('======================================');
  console.log('');

  // 1. 匿名重复档案：相同 anonymousId 有多个 ConsultRecord
  console.log('[1/2] 识别匿名重复档案 ...');
  const anonymousGroups = await prisma.consultRecord.groupBy({
    by: ['anonymousId'],
    where: {
      anonymousId: { not: null },
      userId: null,
      deletedAt: null,
    },
    _count: { id: true },
    having: {
      id: { _count: { gt: 1 } },
    },
  });

  console.log('  发现 ' + anonymousGroups.length + ' 组匿名重复');
  let anonTotalCleaned = 0;
  for (const group of anonymousGroups) {
    const records = await prisma.consultRecord.findMany({
      where: { anonymousId: group.anonymousId, userId: null, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    // 保留最早一条，其余标记为软删除
    const toDelete = records.slice(1);
    if (toDelete.length > 0) {
      console.log('  - anonymousId=' + group.anonymousId + '，保留最早 1 条，软删除 ' + toDelete.length + ' 条');
      if (!DRY_RUN) {
        await prisma.consultRecord.updateMany({
          where: { id: { in: toDelete.map((r) => r.id) } },
          data: { deletedAt: new Date() },
        });
      }
      anonTotalCleaned += toDelete.length;
    }
  }
  console.log('  [PASS] 匿名重复档案处理完成，共 ' + anonTotalCleaned + ' 条');
  console.log('');

  // 2. 孤儿会员数据：Membership 没有对应 User
  console.log('[2/2] 识别孤儿会员数据 ...');
  // Prisma 5 不支持 where: { user: null }，先查所有 userId 再过滤
  const allMemberships = await prisma.membership.findMany();
  const orphanMemberships = [];
  for (const m of allMemberships) {
    const user = await prisma.user.findUnique({ where: { id: m.userId } });
    if (!user) {
      orphanMemberships.push(m);
    }
  }
  console.log('  发现 ' + orphanMemberships.length + ' 条孤儿会员');
  if (orphanMemberships.length > 0 && !DRY_RUN) {
    for (const m of orphanMemberships) {
      console.log('  - 标记孤儿会员 ID=' + m.id + ' userId=' + m.userId);
    }
    await prisma.membership.updateMany({
      where: { id: { in: orphanMemberships.map((m) => m.id) } },
      data: { status: 'orphaned' },
    });
  }
  console.log('  [PASS] 孤儿会员数据处理完成');
  console.log('');

  // 3. 摘要
  console.log('======================================');
  console.log('  数据治理摘要');
  console.log('======================================');
  console.log('  匿名重复档案: ' + anonTotalCleaned + ' 条已处理');
  console.log('  孤儿会员数据: ' + orphanMemberships.length + ' 条已处理');
  console.log('  模式: ' + (DRY_RUN ? '干运行（建议）' : '实际执行'));
  if (DRY_RUN) {
    console.log('  提示: 实际执行请设置 DRY_RUN=false');
  }
  console.log('======================================');
}

main()
  .catch((error) => {
    console.error('治理脚本异常:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
