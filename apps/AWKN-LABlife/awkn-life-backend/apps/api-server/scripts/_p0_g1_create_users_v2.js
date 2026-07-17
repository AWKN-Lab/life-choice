// P0-G1 v2：按老板新规则创建 3 个临时测试用户（B 跳过，因缺时辰无法真实建模）
// 统一标记：P0_G1_TEST_20260628
// 不动管理员账号
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const PASSWORD = 'Test123456';
const MARK = 'P0_G1_TEST_20260628';

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  console.log('=== P0-G1 v2：创建临时测试用户 ===\n');

  // ===== A: 完整资料 =====
  const userA = await prisma.user.create({
    data: {
      email: 'test-kline-a-full@example.com',
      password: hashedPassword,
      nickname: `[${MARK}] A-完整资料`,
      creditBalance: 100,
    },
  });
  await prisma.baZiProfile.create({
    data: {
      userId: userA.id,
      birthYear: 1990, birthMonth: 6, birthDay: 15,
      birthHour: 10, birthMinute: 30,
      gender: 'male',
      yearGanZhi: '庚午', monthGanZhi: '壬午', dayGanZhi: '甲子', timeGanZhi: '己巳',
      wuXingDist: '{"木":2,"火":3,"土":1,"金":2,"水":2}',
      shenWang: '身弱', shenWangScore: 40,
      xiYongShen: '{"xi":["水","木"],"yong":["水"],"ji":["火","土"]}',
      shiShen: '{"dayMaster":"甲木"}',
      shenSha: '{"yearShenSha":"将星"}',
      qiYunAge: 5, isShunYun: false,
      taiYuan: '癸酉', mingGong: '丁亥',
      naYinYear: '路旁土', naYinMonth: '杨柳木', naYinDay: '海中金', naYinTime: '大林木',
      correctedHour: 10, city: '北京',
    },
  });
  // 授予 month 会员以便 kline 模块权限通过
  const expireA = new Date(); expireA.setMonth(expireA.getMonth() + 1);
  await prisma.membership.create({
    data: { userId: userA.id, type: 'month', status: 'active', startDate: new Date(), expireDate: expireA },
  });
  console.log(`A 完整资料: userId=${userA.id}, email=test-kline-a-full@example.com, BaZiProfile=已创建(完整), Membership=month`);

  // ===== B: 缺时辰 — 跳过 =====
  console.log(`B 缺时辰: 跳过（birthHour Int 必填 + timeGanZhi String 必填，无法真实建模缺时辰）`);

  // ===== C: 缺出生地（city=null，correctedHour=null） =====
  const userC = await prisma.user.create({
    data: {
      email: 'test-kline-c-no-city@example.com',
      password: hashedPassword,
      nickname: `[${MARK}] C-缺出生地`,
      creditBalance: 100,
    },
  });
  await prisma.baZiProfile.create({
    data: {
      userId: userC.id,
      birthYear: 1990, birthMonth: 6, birthDay: 15,
      birthHour: 10, birthMinute: 30,
      gender: 'male',
      yearGanZhi: '庚午', monthGanZhi: '壬午', dayGanZhi: '甲子', timeGanZhi: '己巳',
      wuXingDist: '{"木":2,"火":3,"土":1,"金":2,"水":2}',
      shenWang: '身弱', shenWangScore: 40,
      xiYongShen: '{"xi":["水","木"],"yong":["水"],"ji":["火","土"]}',
      shiShen: '{"dayMaster":"甲木"}',
      shenSha: '{"yearShenSha":"将星"}',
      qiYunAge: 5, isShunYun: false,
      // city 不填（可空）
      // correctedHour 不填（可空）
    },
  });
  const expireC = new Date(); expireC.setMonth(expireC.getMonth() + 1);
  await prisma.membership.create({
    data: { userId: userC.id, type: 'month', status: 'active', startDate: new Date(), expireDate: expireC },
  });
  console.log(`C 缺出生地: userId=${userC.id}, email=test-kline-c-no-city@example.com, BaZiProfile=已创建(city=null,correctedHour=null), Membership=month`);

  // ===== D: 无 BaZiProfile =====
  const userD = await prisma.user.create({
    data: {
      email: 'test-kline-d-no-profile@example.com',
      password: hashedPassword,
      nickname: `[${MARK}] D-无档案`,
      creditBalance: 100,
    },
  });
  // D 不创建 BaZiProfile，不授予会员（测试无档案+无会员场景）
  console.log(`D 无档案: userId=${userD.id}, email=test-kline-d-no-profile@example.com, BaZiProfile=未创建, Membership=无`);

  // ===== D0: 管理员作为历史遗留观察样本 =====
  const admin = await prisma.user.findUnique({ where: { email: '10919669@qq.com' } });
  console.log(`\nD0 管理员(历史遗留观察样本, 不动): userId=${admin.id}, KlineBar=36, StateSnapshot=12, BaZiProfile=0`);

  console.log(`\n=== 创建完成 ===`);
  console.log(`临时用户统一标记: ${MARK}`);
  console.log(`测试结束后清理脚本: scripts/_p0_g1_cleanup_v2.js`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
