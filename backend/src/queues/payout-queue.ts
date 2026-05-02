/**
 * BullMQ queue for vendor payouts.
 *
 * Two job types:
 *   - 'release_due_funds'    : runs periodically, moves pending → balance for matured tx
 *   - 'auto_payout'          : runs daily, processes vendors in payout_mode='automatic'
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface PayoutJobData {
  type: 'release_due_funds' | 'auto_payout';
  store_id?: string; // optional, only for targeted runs
}

export const payoutQueue = new Queue<PayoutJobData>('pd_payout_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 1000 },
  },
});

/**
 * Schedule the recurring jobs (idempotent — safe to call on every boot).
 */
export async function scheduleRecurringPayoutJobs(): Promise<void> {
  await payoutQueue.add(
    'release_due_funds',
    { type: 'release_due_funds' },
    {
      repeat: { pattern: '*/15 * * * *' }, // every 15 min
      jobId: 'recurring:release_due_funds',
    },
  );
  await payoutQueue.add(
    'auto_payout',
    { type: 'auto_payout' },
    {
      repeat: { pattern: '0 3 * * *' }, // daily at 03:00
      jobId: 'recurring:auto_payout',
    },
  );
}
