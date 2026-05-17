/**
 * Tiny SQL migrations runner.
 *
 * Reads .sql files from ./sql/ in alphabetical order, applies the ones
 * that haven't been recorded in the `pd_migrations` table yet.
 * Each migration runs inside its own transaction.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPool, closePool } from '../db/pool';
import { logger } from '../utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'sql');

async function ensureMigrationsTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS pd_migrations (
      id            VARCHAR(255) PRIMARY KEY,
      executed_at   TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function getApplied(): Promise<Set<string>> {
  const { rows } = await getPool().query<{ id: string }>('SELECT id FROM pd_migrations');
  return new Set(rows.map((r) => r.id));
}

async function applyMigration(file: string): Promise<void> {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO pd_migrations (id) VALUES ($1)', [file]);
    await client.query('COMMIT');
    logger.info({ migration: file }, '✓ Applied migration');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, migration: file }, '✗ Migration failed');
    throw err;
  } finally {
    client.release();
  }
}

async function run(): Promise<void> {
  logger.info({ dir: MIGRATIONS_DIR }, 'Running migrations…');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn('No migrations directory found. Nothing to do.');
    return;
  }

  await ensureMigrationsTable();
  const applied = await getApplied();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    await applyMigration(file);
    count++;
  }

  if (count === 0) {
    logger.info('Database is up to date — no migrations to apply.');
  } else {
    logger.info({ count }, `Applied ${count} migration(s).`);
  }
}

run()
  .catch((err) => {
    logger.error({ err }, 'Migration runner failed');
    process.exit(1);
  })
  .finally(() => closePool());
