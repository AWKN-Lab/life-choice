const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = '10919669@qq.com';
  const password = 'Lay780618';
  const nickname = '管理员';

  // 生成密码哈希
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Generated bcrypt hash for password');

  // 查找或创建用户
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    console.log('用户已存在，更新密码和管理员状态');
    user = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        isAdmin: true,
        nickname: nickname
      }
    });
    console.log('用户更新成功:', user.id);
  } else {
    console.log('创建新管理员用户');
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        isAdmin: true
      }
    });
    console.log('用户创建成功:', user.id);
  }

  // 验证密码
  const verifyUser = await prisma.user.findUnique({
    where: { email }
  });

  const isValid = await bcrypt.compare(password, verifyUser.password);
  console.log('密码验证:', isValid ? '成功' : '失败');
  console.log('用户信息:', {
    id: verifyUser.id,
    email: verifyUser.email,
    nickname: verifyUser.nickname,
    isAdmin: verifyUser.isAdmin
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
