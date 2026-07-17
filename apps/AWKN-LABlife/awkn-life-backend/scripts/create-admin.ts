/**
 * 创建管理员VIP账号脚本
 * 运行方式: cd awkn-life-backend && npx ts-node scripts/create-admin.ts
 * 环境变量: ADMIN_EMAIL, ADMIN_PASSWORD
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ 缺少环境变量: ADMIN_EMAIL, ADMIN_PASSWORD');
    console.error('   请设置环境变量后重试:');
    console.error('   set ADMIN_EMAIL=your@email.com');
    console.error('   set ADMIN_PASSWORD=your_password');
    process.exit(1);
  }

  // 检查是否已存在
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true }
  });

  if (existing) {
    console.log('✅ 用户已存在:', existing.email);
    console.log('   isAdmin:', existing.isAdmin);
    console.log('   memberships:', existing.memberships.length);

    // 更新为管理员
    if (!existing.isAdmin) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isAdmin: true }
      });
      console.log('✅ 已设置为管理员');
    }

    // 检查VIP membership
    const hasVip = existing.memberships.some(m => m.type === 'vip' && m.status === 'active');
    if (!hasVip) {
      await prisma.membership.create({
        data: {
          userId: existing.id,
          type: 'vip',
          status: 'active',
          startDate: new Date(),
          expireDate: new Date('2099-12-31') // 永久VIP
        }
      });
      console.log('✅ 已添加VIP会员');
    }

    return;
  }

  // 创建新用户
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      nickname: '管理员',
      isAdmin: true
    }
  });

  console.log('✅ 用户创建成功:', user.email);

  // 创建VIP membership
  await prisma.membership.create({
    data: {
      userId: user.id,
      type: 'vip',
      status: 'active',
      startDate: new Date(),
      expireDate: new Date('2099-12-31') // 永久VIP
    }
  });

  console.log('✅ VIP会员创建成功');
  console.log('');
  console.log('账号信息:');
  console.log('  邮箱:', email);
  console.log('  身份: 管理员 + VIP');
}

createAdminUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());