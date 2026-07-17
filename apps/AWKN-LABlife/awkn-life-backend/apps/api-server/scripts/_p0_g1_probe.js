// P0-G1 临时探查脚本：查询数据库现状，不修改任何数据
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('===== P0-G1 数据库现状探查 =====\n');

  // 1. User 表
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nickname: true,
      isAdmin: true,
      creditBalance: true,
      createdAt: true,
    },
    take: 20,
  });
  console.log('===== User 表（前20条）=====');
  console.log(JSON.stringify(users, null, 2));

  // 2. BaZiProfile 表（字段名按真实 schema）
  const baziProfiles = await prisma.baZiProfile.findMany({
    select: {
      id: true,
      userId: true,
      birthYear: true,
      birthMonth: true,
      birthDay: true,
      birthHour: true,
      birthMinute: true,
      city: true,
      yearGanZhi: true,
      monthGanZhi: true,
      dayGanZhi: true,
      timeGanZhi: true,
      shenWang: true,
      xiYongShen: true,
    },
    take: 20,
  });
  console.log('\n===== BaZiProfile 表（前20条）=====');
  console.log(JSON.stringify(baziProfiles, null, 2));

  // 3. KlineBar 表统计
  const klineBarCount = await prisma.klineBar.count();
  const klineBarUsers = await prisma.klineBar.findMany({
    select: { userId: true, year: true, month: true, monthLabel: true },
    distinct: ['userId'],
    take: 10,
  });
  console.log('\n===== KlineBar 表 =====');
  console.log('总记录数:', klineBarCount);
  console.log('有 KlineBar 的 userId:', JSON.stringify(klineBarUsers, null, 2));

  // 4. StateSnapshot 表统计
  const snapshotCount = await prisma.stateSnapshot.count();
  const snapshotUsers = await prisma.stateSnapshot.findMany({
    select: { userId: true, year: true, month: true, date: true, quadrant: true },
    distinct: ['userId'],
    take: 10,
  });
  console.log('\n===== StateSnapshot 表 =====');
  console.log('总记录数:', snapshotCount);
  console.log('有 StateSnapshot 的 userId:', JSON.stringify(snapshotUsers, null, 2));

  // 5. 统计摘要
  console.log('\n===== 统计摘要 =====');
  console.log('User 总数:', users.length);
  console.log('BaZiProfile 总数:', baziProfiles.length);
  console.log('KlineBar 总数:', klineBarCount);
  console.log('StateSnapshot 总数:', snapshotCount);

  // 6. 分析 BaZiProfile 完整度
  console.log('\n===== BaZiProfile 完整度分析 =====');
  for (const p of baziProfiles) {
    const hasTime = p.birthHour !== null && p.birthHour !== undefined;
    const hasPlace = !!p.city;
    const hasGanZhi = !!p.yearGanZhi;
    const hasShenWang = !!p.shenWang;
    let category = 'A（完整）';
    if (!hasTime && hasPlace) category = 'B（缺时辰）';
    else if (hasTime && !hasPlace) category = 'C（缺出生地）';
    else if (!hasTime && !hasPlace) category = 'B+C（缺时辰+缺出生地）';
    console.log(`userId=${p.userId} category=${category} birth=${p.birthYear}-${p.birthMonth}-${p.birthDay} hour=${p.birthHour} city=${p.city} yearGanZhi=${hasGanZhi} shenWang=${hasShenWang}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
