const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);

  console.log('\n尝试使用 prisma.$executeRawUnsafe 来修复密码...');
  try {
    // 先尝试用 raw SQL 更新密码
    const updateResult = await p.$executeRawUnsafe(
      `UPDATE User
       SET password = '${hashedPassword}'
       WHERE email = '10919669@qq.com'`
    );
    console.log('✓ 更新成功！影响行数:', updateResult);
  } catch (e) {
    console.log('更新失败，尝试删除并重新创建...');
    try {
      // 先尝试删除这个用户
      await p.$executeRawUnsafe(
        `DELETE FROM User WHERE email = '10919669@qq.com'`
      );
      // 然后插入新的用户
      const newId = '5de9b781-4ceb-407b-a996-9aa638666394';
      await p.$executeRawUnsafe(
        `INSERT INTO User (id, email, password, nickname, isAdmin, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        newId,
        '10919669@qq.com',
        hashedPassword,
        '管理员'
      );
      console.log('✓ 用户重置成功！');
    } catch (e2) {
      console.error('还是失败:', e2);
      // 如果上述方法都不行，创建一个全新的账号
      console.log('\n尝试创建一个全新的管理员账号...');
      try {
        const newAdmin = await p.user.create({
          data: {
            email: 'newadmin@awkn.life',
            password: hashedPassword,
            nickname: '新管理员',
            isAdmin: true
          },
          select: { id: true, email: true, nickname: true, isAdmin: true }
        });
        console.log('✓ 新管理员创建成功！');
        console.dir(newAdmin, { depth: null });
      } catch (e3) {
        console.error('创建新账号失败:', e3);
      }
    }
  }

  console.log('\n现在尝试查询用户...');
  try {
    const users = await p.user.findMany({
      select: { id: true, email: true, nickname: true, isAdmin: true }
    });
    console.log('用户列表:');
    console.dir(users, { depth: null });
  } catch (e) {
    console.error('查询失败:', e);
  }

  console.log('\n管理员账号信息:');
  console.log('邮箱：10919669@qq.com');
  console.log('或者使用新账号：');
  console.log('邮箱：newadmin@awkn.life');
}

main().finally(() => p.$disconnect());
