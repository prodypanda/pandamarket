/**
 * BullMQ Worker for processing delayed notification batches.
 */
import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { notificationBatchService } from '../services/notification-batch.service';
import { NotificationBatchJobData } from '../queues/notification-batch-queue';

export function startNotificationBatchWorker(): Worker<NotificationBatchJobData> {
  const worker = new Worker<NotificationBatchJobData>(
    'pd_notification_batch_queue',
    async (job: Job<NotificationBatchJobData>) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing notification batch job');
      if (job.name === 'daily-digest-cron' || job.data?.type === 'daily_digest') {
        await notificationBatchService.dispatchDailyDigest();
        return;
      }
      const { storeId, type } = job.data;
      if (storeId && (type === 'price_drop' || type === 'new_product')) {
        await notificationBatchService.processBatch(storeId, type);
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Notification batch job completed successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification batch job failed');
  });

  return worker;
}
