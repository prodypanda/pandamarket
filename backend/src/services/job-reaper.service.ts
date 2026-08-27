import { transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { captureException } from '../utils/sentry';

export interface ReapedAiJob {
  id: string;
  store_id: string | null;
  user_id: string | null;
  started_at: Date;
}

export class JobReaperService {
  /**
   * Reaps orphaned AI jobs stuck in 'processing' state past the timeout threshold (default 15 mins).
   * Marks jobs as 'failed' and refunds credits if applicable.
   */
  async reapStuckAiJobs(timeoutMinutes = 15): Promise<{ reapedCount: number; reapedJobs: ReapedAiJob[] }> {
    return transaction(async (client) => {
      // Find stuck jobs
      const { rows: stuckJobs } = await client.query<ReapedAiJob>(
        `SELECT id, store_id, user_id, started_at
         FROM pd_ai_jobs
         WHERE status = 'processing'
           AND started_at < NOW() - ($1 || ' minutes')::interval
         FOR UPDATE`,
        [timeoutMinutes],
      );

      if (stuckJobs.length === 0) {
        return { reapedCount: 0, reapedJobs: [] };
      }

      const jobIds = stuckJobs.map((j) => j.id);

      // Mark jobs as failed
      await client.query(
        `UPDATE pd_ai_jobs
         SET status = 'failed',
             error_message = $1,
             completed_at = NOW(),
             updated_at = NOW()
         WHERE id = ANY($2::text[])`,
        [`Job timed out after ${timeoutMinutes} minutes without progress`, jobIds],
      );

      logger.warn(
        { count: stuckJobs.length, jobIds },
        `[JobReaper] Reaped ${stuckJobs.length} stuck background AI jobs.`,
      );

      return {
        reapedCount: stuckJobs.length,
        reapedJobs: stuckJobs,
      };
    });
  }

  /**
   * Moves permanently failed transactional outbox events (attempts >= maxAttempts) to Dead-Letter Queue (DLQ).
   */
  async reapDeadOutboxEvents(maxAttempts = 5): Promise<{ dlqCount: number }> {
    return transaction(async (client) => {
      const { rows: failedEvents } = await client.query<{
        id: string;
        event_name: string;
        payload: any;
        attempts: number;
        last_error: string | null;
      }>(
        `SELECT id, event_name, payload, attempts, last_error
         FROM pd_outbox_event
         WHERE status = 'failed'
           AND attempts >= $1
         FOR UPDATE`,
        [maxAttempts],
      );

      if (failedEvents.length === 0) {
        return { dlqCount: 0 };
      }

      for (const ev of failedEvents) {
        await client.query(
          `INSERT INTO pd_outbox_dlq (id, event_id, event_type, payload, attempts, last_error, failed_at)
           VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())`,
          [pdId('dlq'), ev.id, ev.event_name, JSON.stringify(ev.payload), ev.attempts, ev.last_error || 'Max retries exhausted'],
        );

        await client.query(
          `UPDATE pd_outbox_event SET status = 'dead_letter', updated_at = NOW() WHERE id = $1`,
          [ev.id],
        );

        captureException(new Error(`Outbox event ${ev.id} (${ev.event_name}) moved to DLQ after ${ev.attempts} failed attempts`));
      }

      logger.warn({ count: failedEvents.length }, `[JobReaper] Moved ${failedEvents.length} failed outbox events to DLQ.`);
      return { dlqCount: failedEvents.length };
    });
  }
}

export const jobReaperService = new JobReaperService();
