import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

// Creates a NEW private schema only. An existing schema causes a rollback.
if (!process.env.DATABASE_URL || !process.argv[2]) {
  throw new Error('Set DATABASE_URL securely and supply the private rows JSON path');
}
const source = JSON.parse(await readFile(process.argv[2], 'utf8'));
const schema = await readFile(new URL('../db/postgres-staging.sql', import.meta.url), 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(schema);
  await client.query('SET CONSTRAINTS ALL DEFERRED');
  const order = ['users','cities','drivers','bookings','audit','documents','notifications','payments','payouts','pins','quotes','rate_limits','tickets','replies','shares','location_requests','auth_recovery'];
  if (source.tables.length !== order.length) throw new Error('Unexpected table inventory');
  let total = 0;
  for (const name of order) {
    const table = source.tables.find(t => t.table === name);
    if (!table || !table.columns.every(c => /^[a-z_]+$/.test(c))) throw new Error('Invalid export table');
    const columns = table.columns.map(c => '"' + c + '"').join(',');
    for (const row of table.rows) {
      await client.query(`INSERT INTO "${name}" (${columns}) VALUES (${table.columns.map((_, i) => '$' + (i + 1)).join(',')})`, table.columns.map(c => row[c]));
    }
    const restored = await client.query(`SELECT ${columns} FROM "${name}"`);
    const canonical = rows => rows.map(row => JSON.stringify(table.columns.map(c => row[c] == null ? null : String(row[c])))).sort();
    if (JSON.stringify(canonical(restored.rows)) !== JSON.stringify(canonical(table.rows))) throw new Error('Row verification failed: ' + name);
    total += restored.rowCount;
  }
  await client.query('COMMIT');
  console.log(`Verified staging import: ${order.length} tables, ${total} rows. Partial export; production cutover remains blocked.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
