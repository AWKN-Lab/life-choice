const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔧 开始修复数据库问题...');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. 先检查数据库是否有问题
    console.log('📋 检查当前用户...');
    try {
      const users = await prisma.user.findMany({ select: { id: true, email: true, nickname: true, isAdmin: true }});
      console.log('✅ 当前用户列表:', users);
    } catch (e) {
      console.log('❌ 查询用户失败，说明数据损坏:', e.message);
      console.log('🗑️ 尝试修复...');
      
      // 因为可能是表结构或数据损坏，我们重建 User 表
      // 先备份旧数据
      const dbPath = path.join(__dirname, '../prisma/dev.db');
      const backupPath = dbPath + '.corrupted.backup';
      console.log('💾 备份损坏的数据库到:', backupPath);
      fs.copyFileSync(dbPath, backupPath);
      
      // 现在我们创建一个新的数据库或者直接插入新的管理员
      console.log('👤 创建新的管理员账号...');
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
      
      // 我们尝试直接插入
      try {
        await prisma.user.deleteMany({ where: { email: '10919669@qq.com' }});
      } catch (e) {
        console.log('⚠️ 删除旧账号失败，可能不存在');
      }
      
      const newAdmin = await prisma.user.create({
        data: {
          email: '10919669@qq.com',
          password: hashedPassword,
          nickname: '半山先生',
          isAdmin: true,
        },
        select: { id: true, email: true, nickname: true, isAdmin: true }
      });
      
      console.log('✅ 新管理员创建成功!');
      console.dir(newAdmin, { depth: null });
      
      console.log('');
      console.log('🎉 账号信息:');
      console.log('  邮箱: 10919669@qq.com');
      console.log('');
      console.log('现在重启服务试试!');
      return;
    }
    
    // 2. 如果数据库正常，就更新密码
    console.log('🔑 更新管理员密码...');
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
    
    const updated = await prisma.user.updateMany({
      where: { email: '10919669@qq.com' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ 更新了', updated.count, '条记录');
    
    if (updated.count === 0) {
      console.log('👤 创建新的管理员账号...');
      await prisma.user.create({
        data: {
          email: '10919669@qq.com',
          password: hashedPassword,
          nickname: '半山先生',
          isAdmin: true,
        }
      });
    }
    
    console.log('');
    console.log('🎉 完成!');
    console.log('登录信息:');
    console.log('  邮箱: 10919669@qq.com');
    console.log('');
    console.log('现在重启服务试试!');
    
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
