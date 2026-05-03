/**
 * BullMQ queue for outgoing webhook dispatching.
 *
 * When a subscribed event fires (e.g. pd.order.placed), a job is enqueued
 * here. The webhook worker picks it up, delivers the payload to the
 * vendor's URL, signs it with HMAC-SHA256, and logs the result.
 */

import { Queue } from 'bullmq';
import { getRedis } from '../db/redis';

export interface WebhookJobData {
  event_type: string;
  store_id: string;
  payload: Record<string, unknown>;
}

export const webhookQueue = new Queue<WebhookJobData>('pd_webhook_queue', {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 2000 },
  },
});
