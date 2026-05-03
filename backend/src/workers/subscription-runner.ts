/**
 * Standalone entrypoint for the subscription worker.
 * Run: `npm run worker:subscription`
 */

import { startSubscriptionWorker } from './subscription.worker';
import { scheduleRecurringSubscriptionJobs } from '../queues/subscription-queue';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

async function main() {
  const worker = startSubscriptionWorker();
  await scheduleRecurringSubscriptionJobs();
  logger.info('📋 Subscription worker started');

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down subscription worker');
    await worker.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start subscription worker');
  process.exit(1);
});
