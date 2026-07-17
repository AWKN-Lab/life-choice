// P0-G1 临时脚本：创建 3 个测试用户 + BaZiProfile，不改 schema，不改业务代码
// 测试用户 A：完整资料
// 测试用户 B：缺时辰（birthHour = -1）
// 测试用户 C：缺出生地（city = null）
// 测试用户 D：管理员（已有 seed 数据，无 BaZiProfile）
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const TEST_PASSWORD = 'Test123456';

async function createTestUser(email, nickname, baziData) {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  // 先查是否已存在
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // 已存在，更新 BaZiProfile
    await prisma.baZiProfile.deleteMany({ where: { userId: existing.id } }).catch(() => {});
    if (baziData) {
      await prisma.baZiProfile.create({
        data: { ...baziData, userId: existing.id },
      }).catch((e) => console.log(`  BaZiProfile 创建失败: ${e.message}`));
    }
    // 清空 KlineBar / StateSnapshot
    await prisma.klineBar.deleteMany({ where: { userId: existing.id } }).catch(() => {});
    await prisma.stateSnapshot.deleteMany({ where: { userId: existing.id } }).catch(() => {});
    console.log(`用户 ${email} 已存在，已更新 BaZiProfile 并清空 KlineBar/StateSnapshot，userId=${existing.id}`);
    return existing.id;
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nickname,
      creditBalance: 999,
      ...(baziData ? { baZiProfile: { create: baziData } } : {}),
    },
    select: { id: true, email: true },
  });
  console.log(`用户 ${email} 创建成功，userId=${user.id}`);
  return user.id;
}

async function main() {
  console.log('===== P0-G1 创建测试用户 =====\n');

  // 用户 A：完整资料（1990-06-15 10:30 男 北京）
  const baziA = {
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 10,
    birthMinute: 30,
    gender: 'male',
    yearGanZhi: '庚午',
    monthGanZhi: '壬午',
    dayGanZhi: '甲子',
    timeGanZhi: '己巳',
    wuXingDist: '{"木":2,"火":3,"土":1,"金":2,"水":2}',
    shenWang: '身弱',
    shenWangScore: 40,
    xiYongShen: '{"xi":["水","木"],"yong":["水"],"ji":["火","土"]}',
    shiShen: '{}',
    shenSha: '{}',
    qiYunAge: 8,
    isShunYun: true,
    taiYuan: '癸酉',
    mingGong: '庚午',
    naYinYear: '路旁土',
    naYinMonth: '杨柳木',
    naYinDay: '海中金',
    naYinTime: '大林木',
    correctedHour: 10,
    city: '北京',
  };
  const userIdA = await createTestUser('test-a@kline-tide.test', '测试A完整', baziA);

  // 用户 B：缺时辰（birthHour = -1 模拟缺时辰）
  const baziB = {
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: -1,  // 缺时辰
    birthMinute: 0,
    gender: 'male',
    yearGanZhi: '庚午',
    monthGanZhi: '壬午',
    dayGanZhi: '甲子',
    timeGanZhi: '',  // 缺时辰无法推算
    wuXingDist: '{"木":1,"火":2,"土":1,"金":2,"水":1}',
    shenWang: '身弱',
    shenWangScore: 45,
    xiYongShen: '{"xi":["水","木"],"yong":["水"],"ji":["火","土"]}',
    shiShen: '{}',
    shenSha: '{}',
    qiYunAge: 8,
    isShunYun: true,
    city: '北京',
  };
  const userIdB = await createTestUser('test-b@kline-tide.test', '测试B缺时辰', baziB);

  // 用户 C：缺出生地（city = null）
  const baziC = {
    birthYear: 1990,
    birthMonth: 6,
    birthDay: 15,
    birthHour: 10,
    birthMinute: 30,
    gender: 'male',
    yearGanZhi: '庚午',
    monthGanZhi: '壬午',
    dayGanZhi: '甲子',
    timeGanZhi: '己巳',
    wuXingDist: '{"木":2,"火":3,"土":1,"金":2,"水":2}',
    shenWang: '身弱',
    shenWangScore: 40,
    xiYongShen: '{"xi":["水","木"],"yong":["水"],"ji":["火","土"]}',
    shiShen: '{}',
    shenSha: '{}',
    qiYunAge: 8,
    isShunYun: true,
    city: null,  // 缺出生地
  };
  const userIdC = await createTestUser('test-c@kline-tide.test', '测试C缺出生地', baziC);

  // 用户 D：管理员（无 BaZiProfile，已有 seed 数据）
  const adminUser = await prisma.user.findUnique({ where: { email: '10919669@qq.com' } });
  const userIdD = adminUser ? adminUser.id : null;

  console.log('\n===== 测试用户清单 =====');
  console.log(JSON.stringify({
    A: { userId: userIdA, email: 'test-a@kline-tide.test', category: '完整资料', password: TEST_PASSWORD },
    B: { userId: userIdB, email: 'test-b@kline-tide.test', category: '缺时辰', password: TEST_PASSWORD },
    C: { userId: userIdC, email: 'test-c@kline-tide.test', category: '缺出生地', password: TEST_PASSWORD },
    D: { userId: userIdD, email: '10919669@qq.com', category: '无BaZiProfile（管理员）', password: '管理员密码未知' },
  }, null, 2));

  // 确认清空状态
  console.log('\n===== 清空状态确认 =====');
  for (const [label, id] of [['A', userIdA], ['B', userIdB], ['C', userIdC]]) {
    const kb = await prisma.klineBar.count({ where: { userId: id } });
    const ss = await prisma.stateSnapshot.count({ where: { userId: id } });
    console.log(`用户 ${label} (${id}): KlineBar=${kb}, StateSnapshot=${ss}`);
  }

  // 管理员 D 的现有数据
  if (userIdD) {
    const kb = await prisma.klineBar.count({ where: { userId: userIdD } });
    const ss = await prisma.stateSnapshot.count({ where: { userId: userIdD } });
    const bp = await prisma.baZiProfile.count({ where: { userId: userIdD } });
    console.log(`用户 D 管理员 (${userIdD}): KlineBar=${kb}, StateSnapshot=${ss}, BaZiProfile=${bp}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
