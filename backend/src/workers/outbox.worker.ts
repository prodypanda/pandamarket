import { query } from '../db/pool';
import { outboxService, OutboxEventRow } from '../services/outbox.service';
import { webhookQueue } from '../queues/webhook-queue';
import { eventBus } from '../events/event-bus';
import { logger } from '../utils/logger';

const OUTBOX_POLL_INTERVAL_MS = 3_000;
const MAX_ATTEMPTS = 5;

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  start(): void {
    if (this.timer) return;
    logger.info('Outbox worker started polling');
    this.timer = setInterval(() => this.processPendingEvents(), OUTBOX_POLL_INTERVAL_MS);
    // Trigger initial run immediately
    this.processPendingEvents();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Outbox worker stopped');
    }
  }

  /**
   * Fetch and process batch of pending outbox events.
   */
  async processPendingEvents(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    let processedCount = 0;
    try {
      const { rows: pendingEvents } = await query<OutboxEventRow>(
        `SELECT * FROM pd_outbox_event
         WHERE status = 'pending' AND next_attempt_at <= NOW()
         ORDER BY created_at ASC
         LIMIT 10`,
      );

      for (const event of pendingEvents) {
        await this.processSingleEvent(event);
        processedCount++;
      }
    } catch (err) {
      logger.error({ err }, 'Error in outbox worker loop');
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  /**
   * Process a single outbox event atomically.
   */
  async processSingleEvent(event: OutboxEventRow): Promise<void> {
    // 1. Mark as processing
    await query(
      `UPDATE pd_outbox_event SET status = 'processing', attempts = attempts + 1 WHERE id = $1`,
      [event.id],
    );

    try {
      const storeId = event.aggregate_id;

      // 2. Resolve all store hostnames (subdomain + custom domains)
      const hostnames = await outboxService.getStoreHostnames(storeId);

      // 3. Trigger Next.js ISR cache revalidation across all hostnames
      if (hostnames.length > 0) {
        await this.revalidateStorefrontHosts(hostnames);
      }

      // 4. Enqueue webhooks with idempotency key
      try {
        await webhookQueue.add(
          event.event_type,
          {
            event_type: event.event_type,
            store_id: storeId,
            payload: event.payload,
          },
          { jobId: event.idempotency_key.replace(/:/g, '_') },
        );
      } catch (err) {
        logger.warn({ event_id: event.id, err }, 'Failed to enqueue webhook from outbox');
      }

      // 5. Emit in-memory eventBus event
      eventBus.emit(event.event_type, {
        store_id: storeId,
        revision: event.revision,
        ...event.payload,
      });

      // 6. Mark completed
      await query(
        `UPDATE pd_outbox_event
         SET status = 'completed', processed_at = NOW(), error = NULL
         WHERE id = $1`,
        [event.id],
      );

      logger.info(
        { outbox_id: event.id, event_type: event.event_type, store_id: storeId, revision: event.revision },
        'Outbox event processed successfully',
      );
    } catch (err) {
      const errorMsg = (err as Error).message;
      const attempts = event.attempts + 1;
      const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      const backoffSec = Math.pow(2, attempts) * 5; // exponential backoff: 10s, 20s, 40s...

      await query(
        `UPDATE pd_outbox_event
         SET status = $1, error = $2, next_attempt_at = NOW() + INTERVAL '${backoffSec} seconds'
         WHERE id = $3`,
        [status, errorMsg, event.id],
      );

      logger.error(
        { outbox_id: event.id, attempts, status, err: errorMsg },
        'Outbox event processing failed',
      );
    }
  }

  /**
   * Helper: call Next.js storefront revalidation endpoint.
   */
  private async revalidateStorefrontHosts(hostnames: string[]): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      // Audit P2-16: authenticate as machine caller. Before this header the
      // revalidate route required a user session and rejected the worker 401.
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.PD_REVALIDATE_SECRET) {
        headers['x-revalidate-secret'] = process.env.PD_REVALIDATE_SECRET;
      }
      await fetch(`${frontendUrl}/api/storefront/revalidate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ hostnames }),
      });
    } catch {
      // Revalidation endpoint might be unreachable during local tests, log debug
      logger.debug({ hostnames }, 'Storefront host revalidation request attempted');
    }
  }
}

export const outboxWorker = new OutboxWorker();
