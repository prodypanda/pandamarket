/**
 * Standalone entrypoint for the email worker.
 * Run: `npm run worker:email`
 */

import { startEmailWorker } from './email.worker';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

const worker = startEmailWorker();

logger.info('✉️  Email worker started');

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down email worker');
  await worker.close();
  await closeRedis();
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection in email worker');
});
