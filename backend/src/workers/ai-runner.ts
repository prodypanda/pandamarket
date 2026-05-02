/**
 * Standalone entrypoint for the AI worker.
 * Run: `npm run worker:ai`
 */

import { startAiWorker } from './ai.worker';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

const worker = startAiWorker();

logger.info('🤖 AI worker started');

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down AI worker');
  await worker.close();
  await closeRedis();
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection in AI worker');
});
