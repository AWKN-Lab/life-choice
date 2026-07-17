const bcrypt = require('bcryptjs');

async function main() {
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
  console.log('\n请使用以下 SQL 语句在 SQLite 数据库中直接更新密码：');
  console.log(`
UPDATE User
SET password = '${hashedPassword}'
WHERE email = '10919669@qq.com';
  `);
  console.log('\n或者直接删除并重新创建这个用户：');
  console.log(`
DELETE FROM User WHERE email = '10919669@qq.com';
INSERT INTO User (id, email, password, nickname, isAdmin, createdAt, updatedAt)
VALUES (
  '${require('crypto').randomUUID()}',
  '10919669@qq.com',
  '${hashedPassword}',
  '管理员',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
  `);
}

main();
