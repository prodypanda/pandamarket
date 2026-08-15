/**
 * BullMQ queue for 15-minute sliding window smart batched notifications (Feature 20 - R2).
 */
import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface NotificationBatchJobData {
  storeId?: string;
  storeName?: string;
  type?: 'price_drop' | 'new_product' | 'daily_digest';
  productId?: string;
  productTitle?: string;
  price?: number;
  oldPrice?: number;
  discountPct?: number;
  timestamp?: number;
}

export const notificationBatchQueue = new Queue<NotificationBatchJobData>('pd_notification_batch_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

/**
 * Schedule repeatable BullMQ daily digest cron at 7:00 PM (0 19 * * *).
 */
export async function scheduleRecurringDailyDigestJob(): Promise<void> {
  await notificationBatchQueue.add(
    'daily-digest-cron',
    { type: 'daily_digest' },
    {
      repeat: { pattern: '0 19 * * *' },
      jobId: 'recurring:daily_digest_7pm',
    }
  );
}
