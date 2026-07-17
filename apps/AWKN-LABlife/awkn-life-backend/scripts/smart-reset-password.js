const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  
  // 先查询用户ID（不带密码字段）
  console.log('\n查询用户信息（不带密码）...');
  const userInfo = await p.user.findUnique({
    where: { email: '10919669@qq.com' },
    select: { id: true }
  });
  console.log('用户ID:', userInfo?.id);

  // 现在只更新密码，用 raw SQL，并且只更新这一个字段，避免其他字段的问题
  console.log('\n使用 raw SQL 只更新密码字段...');
  try {
    const result = await p.$executeRaw`
      UPDATE User
      SET password = ${hashedPassword}
      WHERE id = ${userInfo.id}
    `;
    console.log('✓ 更新成功！影响行数:', result);
  } catch (e) {
    console.log('第一个方法失败，尝试另一个 SQL 语法...');
    // 尝试另一种 raw SQL 方式
    try {
      const result = await p.$executeRawUnsafe(
        `UPDATE User SET password = '${hashedPassword}' WHERE id = '${userInfo.id}'`
      );
      console.log('✓ 第二个方法成功！影响行数:', result);
    } catch (e2) {
      console.error('都失败了:', e2.message);
      console.log('\n尝试另一个策略：创建一个全新的用户...');
      const newEmail = 'new.admin@awkn.life';
      const newAdmin = await p.user.create({
        data: {
          email: newEmail,
          password: hashedPassword,
          nickname: '新超级管理员',
          isAdmin: true
        },
        select: { id: true, email: true, nickname: true, isAdmin: true }
      });
      console.log('✓ 新管理员创建成功！');
      console.dir(newAdmin, { depth: null });
      console.log('\n新登录信息:');
      console.log('邮箱:', newEmail);
    }
  }

  console.log('\n可以尝试用以下账号登录：');
  console.log('邮箱: 10919669@qq.com');
  console.log('或者用新账号: new.admin@awkn.life');
}

main().finally(() => p.$disconnect());
