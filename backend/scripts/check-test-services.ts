/* eslint-disable no-console -- this file is a CLI diagnostic command. */

import { Client } from 'pg';
import IORedis from 'ioredis';
import { config } from '../src/config';

const timeoutMs = Number.parseInt(process.env.PD_TEST_SERVICE_TIMEOUT_MS ?? '1500', 10);
const attempts = Number.parseInt(process.env.PD_TEST_SERVICE_ATTEMPTS ?? '5', 10);

function errorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    const messages = error.errors
      .map((nested) => errorMessage(nested))
      .filter(Boolean);
    if (messages.length > 0) return messages.join('; ');
  }
  return error instanceof Error && error.message ? error.message : String(error);
}

function describeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}:${url.port || (url.protocol === 'redis:' ? '6379' : '5432')}`;
  } catch {
    return '<invalid URL>';
  }
}

async function retry(name: string, check: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await check();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  throw new Error(`${name} unavailable after ${attempts} attempts: ${errorMessage(lastError)}`);
}

async function checkPostgres(): Promise<void> {
  const client = new Client({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
    statement_timeout: timeoutMs,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function checkRedis(): Promise<void> {
  const redis = new IORedis(config.redisUrl, {
    lazyConnect: true,
    connectTimeout: timeoutMs,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy: () => null,
  });
  // ioredis emits connection errors in addition to rejecting connect(). Keep
  // this probe quiet; the command reports one concise actionable error below.
  redis.on('error', () => undefined);
  try {
    await redis.connect();
    await redis.ping();
  } finally {
    redis.disconnect();
  }
}

async function main(): Promise<void> {
  const failures: string[] = [];

  const results = await Promise.allSettled([
    retry('PostgreSQL', checkPostgres),
    retry('Redis', checkRedis),
  ]);
  const [postgresResult, redisResult] = results;
  if (postgresResult.status === 'rejected') {
    failures.push(`${errorMessage(postgresResult.reason)} (${describeUrl(config.databaseUrl)})`);
  }
  if (redisResult.status === 'rejected') {
    failures.push(`${errorMessage(redisResult.reason)} (${describeUrl(config.redisUrl)})`);
  }

  if (failures.length > 0) {
    console.error('Backend test services are unavailable:');
    for (const failure of failures) console.error(`- ${failure}`);
    console.error('Start the development PostgreSQL and Redis services (for example, docker compose up -d postgres redis) or set PD_DATABASE_URL and PD_REDIS_URL to reachable test services.');
    process.exit(1);
  }

  console.log(
    `Backend test services: PostgreSQL ${describeUrl(config.databaseUrl)}, Redis ${describeUrl(config.redisUrl)}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
