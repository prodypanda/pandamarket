/**
 * Standalone entrypoint for the webhook dispatcher worker.
 * Run: `npm run worker:webhook`
 */

import { startWebhookWorker } from './webhook.worker';
import { logger } from '../utils/logger';
import { closeRedis } from '../db/redis';
import { closePool } from '../db/pool';

async function main() {
  const worker = startWebhookWorker();
  logger.info('🔔 Webhook dispatcher worker started');

  async function shutdown(signal: string) {
    logger.info({ signal }, 'Shutting down webhook worker');
    await worker.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start webhook worker');
  process.exit(1);
});
