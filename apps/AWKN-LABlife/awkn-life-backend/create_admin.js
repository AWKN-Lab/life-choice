const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  const user = await prisma.user.upsert({
    where: { email: '10919669@qq.com' },
    update: { password: hash, isAdmin: true },
    create: {
      id: 'admin-001',
      email: '10919669@qq.com',
      password: hash,
      isAdmin: true,
    },
  });
  console.log('Created admin user:', user.email, 'isAdmin:', user.isAdmin);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
