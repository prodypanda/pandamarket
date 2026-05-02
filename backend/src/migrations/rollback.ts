/**
 * Rollback the last applied migration.
 *
 * Convention: each `NNN_xxx.sql` migration may have a paired
 * `NNN_xxx.down.sql` for rollback. If absent, rollback is refused.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPool, closePool } from '../db/pool';
import { logger } from '../utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, 'sql');

async function rollback(): Promise<void> {
  const { rows } = await getPool().query<{ id: string }>(
    'SELECT id FROM pd_migrations ORDER BY executed_at DESC LIMIT 1',
  );
  if (rows.length === 0) {
    logger.info('No migrations to rollback.');
    return;
  }
  const last = rows[0].id;
  const downFile = last.replace(/\.sql$/, '.down.sql');
  const fullPath = path.join(MIGRATIONS_DIR, downFile);

  if (!fs.existsSync(fullPath)) {
    logger.error(
      { migration: last, expected: downFile },
      'No down migration found — rollback refused.',
    );
    process.exit(1);
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('DELETE FROM pd_migrations WHERE id = $1', [last]);
    await client.query('COMMIT');
    logger.info({ migration: last }, '✓ Rolled back');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err, migration: last }, '✗ Rollback failed');
    throw err;
  } finally {
    client.release();
  }
}

rollback()
  .catch((err) => {
    logger.error({ err }, 'Rollback failed');
    process.exit(1);
  })
  .finally(() => closePool());
