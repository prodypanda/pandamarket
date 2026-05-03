/**
 * Webhook dispatcher worker —
 *   For each job, looks up active webhook subscriptions matching the
 *   event_type + store_id, delivers the payload via HTTP POST, signs
 *   with HMAC-SHA256, and logs the result to pd_webhook_delivery.
 */

import { Worker, Job } from 'bullmq';
import { createHmac } from 'node:crypto';
import { getRedis } from '../db/redis';
import { logger } from '../utils/logger';
import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { WebhookJobData } from '../queues/webhook-queue';

interface WebhookSubscriptionRow {
  id: string;
  store_id: string;
  url: string;
  secret: string;
  events: string[];
  consecutive_failures: number;
}

const DELIVERY_TIMEOUT_MS = 10_000;

export function startWebhookWorker(): Worker<WebhookJobData> {
  const worker = new Worker<WebhookJobData>(
    'pd_webhook_queue',
    async (job: Job<WebhookJobData>) => {
      await handleWebhookDispatch(job.data, job.attemptsMade + 1);
    },
    { connection: getRedis(), concurrency: 5 },
  );

  worker.on('completed', (job) =>
    logger.debug({ event: job.data.event_type, store: job.data.store_id }, 'Webhook job completed'),
  );
  worker.on('failed', (job, err) =>
    logger.error(
      { event: job?.data.event_type, store: job?.data.store_id, err: err.message },
      'Webhook job failed',
    ),
  );

  return worker;
}

async function handleWebhookDispatch(data: WebhookJobData, attempt: number): Promise<void> {
  const { event_type, store_id, payload } = data;

  // Find active subscriptions for this store that listen to this event
  const { rows: subscriptions } = await query<WebhookSubscriptionRow>(
    `SELECT id, store_id, url, secret, events, consecutive_failures
     FROM pd_webhook_subscription
     WHERE store_id = $1
       AND is_active = true
       AND events @> $2::jsonb`,
    [store_id, JSON.stringify([event_type])],
  );

  if (subscriptions.length === 0) {
    logger.debug({ event_type, store_id }, 'No active webhook subscriptions for event');
    return;
  }

  for (const sub of subscriptions) {
    await deliverWebhook(sub, event_type, payload, attempt);
  }
}

async function deliverWebhook(
  sub: WebhookSubscriptionRow,
  eventType: string,
  payload: Record<string, unknown>,
  attempt: number,
): Promise<void> {
  const deliveryId = pdId('whdel');
  const body = JSON.stringify({
    event: eventType,
    payload,
    delivered_at: new Date().toISOString(),
  });

  // Sign with HMAC-SHA256
  const signature = createHmac('sha256', sub.secret).update(body).digest('hex');

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PD-Signature': `sha256=${signature}`,
        'X-PD-Event': eventType,
        'X-PD-Delivery': deliveryId,
        'User-Agent': 'PandaMarket-Webhook/1.0',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    statusCode = response.status;
    responseBody = await response.text().catch(() => null);

    if (!response.ok) {
      error = `HTTP ${statusCode}`;
    }
  } catch (err) {
    error = (err as Error).message;
    logger.warn(
      { subscription_id: sub.id, url: sub.url, err: error },
      'Webhook delivery failed',
    );
  }

  // Log delivery to pd_webhook_delivery
  await query(
    `INSERT INTO pd_webhook_delivery
      (id, subscription_id, event_type, payload, attempt, status_code, response_body, error, delivered_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      deliveryId,
      sub.id,
      eventType,
      JSON.stringify(payload),
      attempt,
      statusCode,
      responseBody ? responseBody.slice(0, 2000) : null,
      error,
    ],
  );

  // Update subscription stats
  if (error) {
    await query(
      `UPDATE pd_webhook_subscription
       SET consecutive_failures = consecutive_failures + 1,
           last_delivery_at = NOW(),
           last_status_code = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [sub.id, statusCode],
    );

    // Auto-disable after 10 consecutive failures
    if (sub.consecutive_failures + 1 >= 10) {
      await query(
        `UPDATE pd_webhook_subscription SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [sub.id],
      );
      logger.warn(
        { subscription_id: sub.id, url: sub.url },
        'Webhook subscription auto-disabled after 10 consecutive failures',
      );
    }

    // Re-throw so BullMQ retries
    throw new Error(`Webhook delivery failed: ${error}`);
  } else {
    await query(
      `UPDATE pd_webhook_subscription
       SET consecutive_failures = 0,
           last_delivery_at = NOW(),
           last_status_code = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [sub.id, statusCode],
    );
    logger.info(
      { subscription_id: sub.id, event_type: eventType, status_code: statusCode },
      'Webhook delivered successfully',
    );
  }
}
