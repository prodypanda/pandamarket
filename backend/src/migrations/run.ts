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

export function resolveMigrationsDir(): string {
  const candidates = [
    path.join(__dirname, 'sql'),
    path.join(__dirname, '..', '..', 'src', 'migrations', 'sql'),
    path.join(__dirname, '..', 'src', 'migrations', 'sql'),
    path.join(process.cwd(), 'src', 'migrations', 'sql'),
    path.join(process.cwd(), 'backend', 'src', 'migrations', 'sql'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.join(__dirname, 'sql');
}

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

async function applyMigration(file: string, migrationsDir = resolveMigrationsDir()): Promise<void> {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
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

export function getMigrationFiles(migrationsDir = resolveMigrationsDir()): string[] {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
    .sort();
}

/**
 * Audit P1-12 preflight: detect duplicate numeric prefixes (e.g. two files
 * starting with "066_") and suspiciously small placeholder files.
 *
 * Existing duplicates are reported loudly but do NOT abort: they are already
 * recorded in pd_migrations on live databases, and aborting would break every
 * deploy. The warning exists so the next contributor renumbers instead of
 * adding a third collision. New collisions only ever cause mis-ordered
 * application on FRESH databases, where alphabetical order decides.
 */
export function assertMigrationHygiene(files: string[], migrationsDir: string): void {
  const byPrefix = new Map<string, string[]>();
  for (const file of files) {
    const prefix = file.split('_')[0];
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), file]);
  }
  for (const [prefix, prefixed] of byPrefix.entries()) {
    if (prefixed.length > 1) {
      logger.warn(
        { prefix, files: prefixed },
        `Duplicate migration prefix "${prefix}" — renumber one of these files; ordering is ambiguous on fresh databases.`,
      );
    }
  }
  for (const file of files) {
    try {
      if (fs.statSync(path.join(migrationsDir, file)).size < 20) {
        logger.warn({ file }, 'Suspiciously small migration — is this a forgotten placeholder?');
      }
    } catch {
      // stat failure is handled later by readFileSync in applyMigration
    }
  }
}

export async function run(): Promise<void> {
  const dir = resolveMigrationsDir();
  logger.info({ dir }, 'Running migrations…');

  if (!fs.existsSync(dir)) {
    logger.warn({ dir }, 'No migrations directory found. Nothing to do.');
    return;
  }

  await ensureMigrationsTable();
  const applied = await getApplied();

  const files = getMigrationFiles(dir);
  assertMigrationHygiene(files, dir);

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    await applyMigration(file, dir);
    count++;
  }

  if (count === 0) {
    logger.info('Database is up to date — no migrations to apply.');
  } else {
    logger.info({ count }, `Applied ${count} migration(s).`);
  }
}

if (require.main === module) {
  run()
    .catch((err) => {
      logger.error({ err }, 'Migration runner failed');
      process.exit(1);
    })
    .finally(() => closePool());
}
