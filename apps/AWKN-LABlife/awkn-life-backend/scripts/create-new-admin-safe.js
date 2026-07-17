const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  
  console.log('\n尝试创建一个全新的管理员账号（不碰现有可能损坏的数据）...');
  try {
    let newEmail = 'admin@awkn.life';
    // 尝试几个不同的邮箱地址，直到成功
    const emails = [
      'admin@awkn.life', 
      'admin2@awkn.life', 
      'superadmin@awkn.life',
      'master@awkn.life'
    ];
    let newAdmin = null;
    for (let email of emails) {
      try {
        console.log(`尝试创建: ${email}...`);
        newAdmin = await p.user.create({
          data: {
            email: email,
            password: hashedPassword,
            nickname: '新管理员',
            isAdmin: true
          },
          select: { id: true, email: true, nickname: true, isAdmin: true }
        });
        console.log('✓ 账号创建成功！');
        break;
      } catch (e) {
        if (e.code === 'P2002') { // unique constraint violation
          console.log(`邮箱 ${email} 已存在，尝试下一个...`);
          continue;
        } else {
          console.log(`创建失败: ${e.message}，尝试下一个...`);
        }
      }
    }
    
    if (newAdmin) {
      console.log('\n✓ 新管理员创建成功！');
      console.dir(newAdmin, { depth: null });
      console.log('\n管理员登录信息:');
      console.log('邮箱：', newAdmin.email);
    } else {
      console.error('所有邮箱都无法创建！');
    }
    
  } catch (e) {
    console.error('主逻辑错误:', e);
  }
}

main().finally(() => p.$disconnect());
