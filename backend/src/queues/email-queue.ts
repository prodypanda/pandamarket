/**
 * BullMQ queue for outgoing emails (Brevo / Resend in prod).
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface EmailJobData {
  to: string;
  template: string;          // template id (see notifications-system.md)
  variables: Record<string, unknown>;
  subject?: string;          // optional override
}

export const emailQueue = new Queue<EmailJobData>('pd_email_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
