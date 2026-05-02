/**
 * BullMQ queue for AI jobs (image compression, SEO).
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export const aiQueue = new Queue('pd_ai_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
