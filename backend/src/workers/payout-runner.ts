/**
 * Standalone entrypoint for the payout worker.
 * Run: `npm run worker:payout`
 */

import { startPayoutWorker } from './payout.worker';
import { scheduleRecurringPayoutJobs } from '../queues/payout-queue';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

async function main() {
  const worker = startPayoutWorker();
  await scheduleRecurringPayoutJobs();
  logger.info('💰 Payout worker started');

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down payout worker');
    await worker.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start payout worker');
  process.exit(1);
});
