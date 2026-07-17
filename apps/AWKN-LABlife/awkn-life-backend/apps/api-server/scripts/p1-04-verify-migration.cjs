// P1-04 backfill verification: verify new tables exist, snapshotId column added, existing rows have null snapshotId
// Run: node scripts/p1-04-verify-migration.cjs
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('--- P1-04 Migration Verification ---');

  // 1. Verify new tables exist
  const tables = await p.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('KlineSnapshot','KlineNode','KlineOutcome') ORDER BY name`
  );
  console.log('1. New tables found:', tables.map(t => t.name).join(', '));
  const expected = ['KlineNode', 'KlineOutcome', 'KlineSnapshot'];
  const found = tables.map(t => t.name);
  const missing = expected.filter(n => !found.includes(n));
  if (missing.length > 0) {
    throw new Error(`Missing tables: ${missing.join(', ')}`);
  }

  // 2. Verify KlineBar has snapshotId column
  const klineBarCols = await p.$queryRawUnsafe(`PRAGMA table_info('KlineBar')`);
  const klineBarColNames = klineBarCols.map(c => c.name);
  console.log('2. KlineBar columns:', klineBarColNames.join(', '));
  if (!klineBarColNames.includes('snapshotId')) {
    throw new Error('KlineBar.snapshotId column missing');
  }

  // 3. Verify StateSnapshot has snapshotId column
  const stateSnapCols = await p.$queryRawUnsafe(`PRAGMA table_info('StateSnapshot')`);
  const stateSnapColNames = stateSnapCols.map(c => c.name);
  console.log('3. StateSnapshot columns:', stateSnapColNames.join(', '));
  if (!stateSnapColNames.includes('snapshotId')) {
    throw new Error('StateSnapshot.snapshotId column missing');
  }

  // 4. Verify backfill: existing rows have null snapshotId (nullable new column → auto null)
  const barCount = await p.klineBar.count();
  const snapCount = await p.stateSnapshot.count();
  console.log(`4. Existing rows: KlineBar=${barCount}, StateSnapshot=${snapCount}`);

  if (barCount > 0) {
    const nullBar = await p.$queryRawUnsafe(
      `SELECT COUNT(*) as c FROM KlineBar WHERE snapshotId IS NULL`
    );
    console.log(`   KlineBar with null snapshotId: ${nullBar[0].c}/${barCount}`);
    if (nullBar[0].c !== barCount) {
      throw new Error(`Backfill mismatch: expected ${barCount} null, got ${nullBar[0].c}`);
    }
  }

  if (snapCount > 0) {
    const nullSnap = await p.$queryRawUnsafe(
      `SELECT COUNT(*) as c FROM StateSnapshot WHERE snapshotId IS NULL`
    );
    console.log(`   StateSnapshot with null snapshotId: ${nullSnap[0].c}/${snapCount}`);
    if (nullSnap[0].c !== snapCount) {
      throw new Error(`Backfill mismatch: expected ${snapCount} null, got ${nullSnap[0].c}`);
    }
  }

  // 5. Verify indexes
  const indexes = await p.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%snapshotId%' OR name LIKE '%nodeType%' OR name LIKE '%nodeId%' ORDER BY name`
  );
  console.log('5. New indexes:', indexes.map(i => i.name).join(', '));

  // 6. Smoke test: insert + query KlineSnapshot
  const testSnap = await p.klineSnapshot.create({
    data: {
      userId: '__p1_04_smoke_test__',
      dataVersion: 'v1.1',
      algorithmVersion: 'alg-v1',
      status: 'smoke_test',
      sourceSummary: '["calculated"]',
      payload: '{"test":true}',
    },
  });
  console.log('6. Smoke insert KlineSnapshot:', testSnap.id);
  const found2 = await p.klineSnapshot.findUnique({ where: { id: testSnap.id } });
  if (!found2 || found2.userId !== '__p1_04_smoke_test__') {
    throw new Error('Smoke test failed: cannot read back KlineSnapshot');
  }
  await p.klineSnapshot.delete({ where: { id: testSnap.id } });
  console.log('   Smoke cleanup done');

  console.log('\n--- P1-04 Migration Verification: ALL PASS ---');
  await p.$disconnect();
})().catch(e => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
