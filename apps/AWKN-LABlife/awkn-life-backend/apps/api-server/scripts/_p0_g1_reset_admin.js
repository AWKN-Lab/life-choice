// P0-G1 临时脚本：重置管理员密码以便测试 D 账号登录
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = '10919669@qq.com';
  const newPassword = 'Admin123456';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
    select: { id: true, email: true, isAdmin: true },
  });

  console.log(JSON.stringify({
    ok: true,
    message: '管理员密码已重置（仅本地 dev 测试用）',
    user,
    newPassword,
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
