const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'CHANGE_ME', 10);
