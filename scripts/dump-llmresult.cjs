const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const id = process.argv[2];
p.$queryRawUnsafe('SELECT id, status, llmResult FROM ConsultRecord WHERE id = ? LIMIT 1', id)
  .then(rows => {
    const r = rows[0];
    if (!r) { console.log('NO ROW'); p.$disconnect(); return; }
    console.log('STATUS:', r.status);
    const lr = typeof r.llmResult === 'string' ? JSON.parse(r.llmResult) : r.llmResult;
    console.log('--- top-level keys ---');
    console.log(Object.keys(lr || {}));
    console.log('--- top-level fiveLayers ---');
    console.log(JSON.stringify(lr?.fiveLayers, null, 2));
    console.log('--- zhangbanshan_output.judgment ---');
    console.log((lr?.zhangbanshan_output?.judgment || '').slice(0, 300));
    console.log('--- zhangbanshan_output.five_layers ---');
    console.log(JSON.stringify(lr?.zhangbanshan_output?.five_layers, null, 2));
    p.$disconnect();
  })
  .catch(e => { console.error('ERR_FULL:', e.message); p.$disconnect(); });
