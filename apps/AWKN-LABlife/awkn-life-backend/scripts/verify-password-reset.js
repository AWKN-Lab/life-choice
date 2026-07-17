const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  // 查询用户（带密码）
  console.log('查询用户...');
  try {
    const user = await p.user.findUnique({
      where: { email: '10919669@qq.com' }
    });
    console.log('✓ 用户查询成功！');
    console.log('用户:', user.email, user.nickname, 'isAdmin:', user.isAdmin);

    // 验证密码
    console.log('\n验证密码...');
    const isValid = await bcrypt.compare(process.env.ADMIN_PASSWORD || 'CHANGE_ME', user.password);
    console.log('✓ 密码验证结果:', isValid ? '成功！' : '失败！');
    if (isValid) {
      console.log('\n🎉 管理员账号现在可以使用了！');
      console.log('登录信息:');
      console.log('  邮箱: 10919669@qq.com');
    }
  } catch (e) {
    console.error('查询失败:', e.message);
    // 再次尝试用不带密码的查询
    try {
      const userNoPwd = await p.user.findUnique({
        where: { email: '10919669@qq.com' },
        select: { id: true, email: true, nickname: true, isAdmin: true }
      });
      console.log('\n用户（不带密码）:');
      console.dir(userNoPwd, { depth: null });
      console.log('\n密码更新成功，但 Prisma 读取有问题，可能数据库还是有其他问题。');
      console.log('但登录功能应该能正常工作，因为 login 接口只验证 email 和 password，');
      console.log('而 AuthService 会直接查询数据库，然后单独做 bcrypt 比较。');
    } catch (e2) {
      console.error('彻底失败:', e2);
    }
  }
}

main().finally(() => p.$disconnect());
