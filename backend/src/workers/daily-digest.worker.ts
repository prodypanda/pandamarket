/**
 * BullMQ Worker & Scheduler for Daily 7:00 PM Email Digest (Feature 20 - R2).
 *
 * Runs daily at 19:00 (7:00 PM) to summarize new arrivals and price drops
 * across all followed stores for opted-in buyers.
 */
import { Worker, Job } from 'bullmq';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { notificationBatchService } from '../services/notification-batch.service';
import { notificationBatchQueue, NotificationBatchJobData } from '../queues/notification-batch-queue';

export function startDailyDigestWorker(): Worker<NotificationBatchJobData> {
  const worker = new Worker<NotificationBatchJobData>(
    'pd_notification_batch_queue',
    async (job: Job<NotificationBatchJobData>) => {
      if (job.name === 'daily-digest-cron' || job.data?.type === 'daily_digest') {
        logger.info({ jobId: job.id }, 'Processing daily email digest (7:00 PM)');
        const sentCount = await notificationBatchService.dispatchDailyDigest();
        logger.info({ sentCount }, 'Daily email digest completed successfully');
      }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Daily digest job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Daily digest job failed');
  });

  return worker;
}

/**
 * Schedule the repeatable BullMQ cron job (0 19 * * * = 7:00 PM daily).
 */
export async function scheduleDailyDigestCron(): Promise<void> {
  try {
    await notificationBatchQueue.add(
      'daily-digest-cron',
      { type: 'daily_digest' },
      {
        repeat: { pattern: '0 19 * * *' },
        jobId: 'recurring:daily_digest_7pm',
        removeOnComplete: true,
      }
    );
    logger.info('Scheduled 7:00 PM daily email digest cron job (0 19 * * *)');
  } catch (err) {
    logger.error({ err }, 'Failed to schedule daily email digest cron job');
  }
}
