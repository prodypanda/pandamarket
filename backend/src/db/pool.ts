/**
 * PostgreSQL connection pool wrapper.
 * Uses `pg` directly (not TypeORM/Prisma) for transparent SQL control,
 * matching the schema documented in `ai instructions/database-schema.md`.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: config.databasePoolSize,
      ssl: config.databaseSsl
        ? {
            rejectUnauthorized: config.databaseSslRejectUnauthorized,
            ...(config.databaseCaCert ? { ca: config.databaseCaCert } : {}),
          }
        : false,
      // TCP keepalive detects half-open connections that the Supabase pooler / NAT
      // silently drops; without it, reusing such a connection hangs the query forever.
      keepAlive: true,
      // Drop idle clients quickly so we don't hand out connections the pooler already closed.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      // Hard cap on any single query so a wedged connection can't hang a request forever.
      statement_timeout: 30_000,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected PostgreSQL pool error');
    });

    logger.info('PostgreSQL pool initialised');
  }
  return pool;
}

/**
 * Execute a parameterised query.
 *
 * @example
 *   const { rows } = await query<IUser>('SELECT * FROM "user" WHERE id = $1', [id]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await getPool().query<T>(text, params as never);
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn({ duration_ms: duration, sql: text.slice(0, 120) }, 'Slow query');
    }
    return result;
  } catch (err) {
    logger.error({ err, sql: text.slice(0, 200) }, 'Query failed');
    throw err;
  }
}

/**
 * Run a callback inside a transaction.
 * The callback receives a client; commit/rollback is automatic.
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL pool closed');
  }
}
