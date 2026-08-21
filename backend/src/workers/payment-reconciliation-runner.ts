import { startPaymentReconciliationWorker } from './payment-reconciliation.worker';
import { schedulePaymentReconciliationSweep } from '../queues/payment-reconciliation-queue';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

async function main() {
  const worker = startPaymentReconciliationWorker();
  await schedulePaymentReconciliationSweep();
  logger.info('Payment reconciliation worker started');

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down payment reconciliation worker');
    await worker.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start payment reconciliation worker');
  process.exit(1);
});
