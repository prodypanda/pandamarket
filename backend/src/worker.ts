/**
 * Dedicated Background Worker Entrypoint — PLAN-M-11
 *
 * Runs background workers (BullMQ processors, outbox poller, recurring sweeps)
 * in an isolated process decoupled from the Express Web API server.
 */

import { getPool } from './db/pool';
import { getRedis } from './db/redis';
import { logger } from './utils/logger';
import { registerAllSubscribers } from './subscribers';
import { startAiWorker } from './workers/ai.worker';
import { startEmailWorker } from './workers/email.worker';
import { startPayoutWorker } from './workers/payout.worker';
import { startSearchWorker } from './workers/search.worker';
import { startSubscriptionWorker } from './workers/subscription.worker';
import { startWebhookWorker } from './workers/webhook.worker';
import { startNotificationBatchWorker } from './workers/notification-batch.worker';
import { startDailyDigestWorker, scheduleDailyDigestCron } from './workers/daily-digest.worker';
import { startPaymentReconciliationWorker } from './workers/payment-reconciliation.worker';
import { startShipmentReconciliationWorker } from './workers/shipment-reconciliation.worker';
import { outboxWorker } from './workers/outbox.worker';
import { scheduleRecurringPayoutJobs } from './queues/payout-queue';
import { scheduleRecurringSubscriptionJobs } from './queues/subscription-queue';
import { schedulePaymentReconciliationSweep } from './queues/payment-reconciliation-queue';
import { scheduleShipmentReconciliationSweep } from './queues/shipment-reconciliation-queue';

async function bootstrapWorker() {
  logger.info('🚀 Initializing PandaMarket Dedicated Background Worker process...');

  // Validate Database
  try {
    const dbPool = getPool();
    const client = await dbPool.connect();
    client.release();
    logger.info('Database connected successfully in worker process.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database in worker process.');
    process.exit(1);
  }

  // Validate Redis
  try {
    await getRedis().ping();
    logger.info('Redis connected successfully in worker process.');
  } catch (err) {
    logger.error({ err }, 'Redis connection failed in worker process.');
    process.exit(1);
  }

  // Register subscribers
  registerAllSubscribers();

  // Instantiate BullMQ Workers
  const workers = [
    startAiWorker(),
    startEmailWorker(),
    startPayoutWorker(),
    startSearchWorker(),
    startSubscriptionWorker(),
    startWebhookWorker(),
    startNotificationBatchWorker(),
    startDailyDigestWorker(),
    startPaymentReconciliationWorker(),
    startShipmentReconciliationWorker(),
  ];

  // Start Transactional Outbox Poller
  outboxWorker.start();

  logger.info('🤖 All 10 BullMQ workers + Outbox poller active in dedicated worker process.');

  // Schedule Recurring Jobs
  try {
    await Promise.all([
      scheduleRecurringPayoutJobs(),
      scheduleRecurringSubscriptionJobs(),
      scheduleDailyDigestCron(),
      schedulePaymentReconciliationSweep(),
      scheduleShipmentReconciliationSweep(),
    ]);
    logger.info('⏰ Recurring cron schedules configured.');
  } catch (err) {
    logger.error({ err }, 'Failed to configure recurring schedules.');
  }

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down background workers gracefully...');
    outboxWorker.stop();
    await Promise.all(workers.map((w) => w.close().catch(() => {})));
    logger.info('Worker process shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrapWorker().catch((err) => {
  logger.fatal({ err }, 'Fatal error in dedicated worker process.');
  process.exit(1);
});
