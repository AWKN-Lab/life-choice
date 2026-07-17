const fs = require('fs');
const path = require('path');
const { Database } = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../prisma/dev.db');
console.log('数据库文件:', dbPath);
console.log('文件存在:', fs.existsSync(dbPath));

if (!fs.existsSync(dbPath)) {
  console.error('找不到数据库文件！');
  process.exit(1);
}

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  
  const db = new Database(dbPath);
  
  console.log('\n尝试列出所有用户（排除密码）...');
  try {
    const stmt = db.prepare('SELECT id, email, nickname, isAdmin FROM User');
    const users = stmt.all();
    console.log('用户列表:');
    console.dir(users, { depth: null });
  } catch (e) {
    console.error('列出用户失败:', e.message);
  }
  
  console.log('\n尝试更新密码...');
  try {
    const updateStmt = db.prepare(
      `UPDATE User SET password = ? WHERE email = '10919669@qq.com'`
    );
    const result = updateStmt.run(hashedPassword);
    console.log('✓ 密码更新成功！影响行数:', result.changes);
  } catch (e) {
    console.error('更新密码失败:', e.message);
    console.log('\n尝试删除并重新创建用户...');
    try {
      db.prepare('DELETE FROM User WHERE email = ?').run('10919669@qq.com');
      const newId = '5de9b781-4ceb-407b-a996-9aa638666394';
      const insertStmt = db.prepare(`
        INSERT INTO User (id, email, password, nickname, isAdmin, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `);
      const result = insertStmt.run(
        newId,
        '10919669@qq.com',
        hashedPassword,
        '管理员'
      );
      console.log('✓ 用户重建成功！影响行数:', result.changes);
    } catch (e2) {
      console.error('重建用户失败:', e2.message);
    }
  }
  
  console.log('\n再次验证修复...');
  try {
    const stmt = db.prepare('SELECT id, email, nickname, isAdmin FROM User WHERE email = ?');
    const user = stmt.get('10919669@qq.com');
    if (user) {
      console.log('✓ 用户找到:', user);
    } else {
      console.log('用户不存在，尝试创建一个新的...');
      try {
        const newId = '5de9b781-4ceb-407b-a996-9aa638666394';
        const insertStmt = db.prepare(`
          INSERT INTO User (id, email, password, nickname, isAdmin, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `);
        insertStmt.run(
          newId,
          '10919669@qq.com',
          hashedPassword,
          '管理员'
        );
        console.log('✓ 创建成功！');
      } catch (e3) {
        console.error('创建新用户也失败:', e3.message);
      }
    }
  } catch (e) {
    console.error('验证失败:', e.message);
  }

  db.close();
  console.log('\n管理员登录信息:');
  console.log('邮箱：10919669@qq.com');
}

main().catch(e => {
  console.error('主程序错误:', e);
  process.exit(1);
});
