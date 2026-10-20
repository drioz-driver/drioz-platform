import { readFile } from 'node:fs/promises';
import { db } from './db.js';
const client = await db.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(813901)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = await client.query('SELECT 1 FROM schema_migrations WHERE version=$1', ['001']);
  if (!done.rowCount) {
    await client.query(await readFile(new URL('../migrations/001.sql', import.meta.url), 'utf8'));
    await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', ['001']);
  }
  await client.query('COMMIT');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await db.end(); }
