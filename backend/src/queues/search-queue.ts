/**
 * BullMQ queue for search reindex jobs.
 *
 * Used for:
 * - Full bulk reindex after Meilisearch downtime
 * - Periodic consistency checks
 * - Manual admin-triggered reindex
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export const searchQueue = new Queue('pd_search_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});
