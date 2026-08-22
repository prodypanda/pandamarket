import { startShipmentReconciliationWorker } from './shipment-reconciliation.worker';
import { scheduleShipmentReconciliationSweep } from '../queues/shipment-reconciliation-queue';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

async function main() {
  const worker = startShipmentReconciliationWorker();
  await scheduleShipmentReconciliationSweep();
  logger.info('Shipment reconciliation worker started');

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down shipment reconciliation worker');
    await worker.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start shipment reconciliation worker');
  process.exit(1);
});
