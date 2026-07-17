const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const keys = Object.keys(p).sort();
// List all keys
keys.forEach(k => console.log(k));
p.$disconnect();