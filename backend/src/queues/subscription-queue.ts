/**
 * BullMQ queue for subscription lifecycle management.
 *
 * Job types:
 *   - 'check_expiry'     : runs daily, expires subscriptions past their end date
 *   - 'send_warnings'    : runs daily, sends 7-day pre-expiry warnings
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface SubscriptionJobData {
  type: 'check_expiry' | 'send_warnings';
}

export const subscriptionQueue = new Queue<SubscriptionJobData>('pd_subscription_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

/**
 * Schedule the recurring jobs (idempotent — safe to call on every boot).
 */
export async function scheduleRecurringSubscriptionJobs(): Promise<void> {
  await subscriptionQueue.add(
    'check_expiry',
    { type: 'check_expiry' },
    {
      repeat: { pattern: '0 2 * * *' }, // daily at 02:00
      jobId: 'recurring:check_expiry',
    },
  );
  await subscriptionQueue.add(
    'send_warnings',
    { type: 'send_warnings' },
    {
      repeat: { pattern: '0 9 * * *' }, // daily at 09:00
      jobId: 'recurring:send_warnings',
    },
  );
}
