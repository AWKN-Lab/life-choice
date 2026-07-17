const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');

console.log('当前数据库路径:', process.env.DATABASE_URL);

const p = new PrismaClient({
  log: ['info', 'warn', 'error']
});

async function main() {
  console.log('\n尝试用 findMany 列出所有用户（不选密码字段）...');
  try {
    const users = await p.user.findMany({
      select: { id: true, email: true, nickname: true, isAdmin: true }
    });
    console.log('用户列表（无密码）:');
    console.dir(users, { depth: null });

    console.log('\n创建一个新的管理员账号（避免修改现有损坏的数据）...');
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
    const newAdmin = await p.user.create({
      data: {
        email: 'superadmin@awkn.life',
        password: hashedPassword,
        nickname: '超级管理员',
        isAdmin: true
      }
    });

    console.log('✓ 新管理员创建成功！');
    console.log('邮箱：superadmin@awkn.life');

  } catch (e) {
    console.error('错误详情:', e);
    process.exit(1);
  }
}

main().finally(() => p.$disconnect());
