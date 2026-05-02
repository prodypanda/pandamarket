/**
 * AI job event subscribers.
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

export function registerAiSubscribers(): void {
  eventBus.on(PdEvent.AI_JOB_COMPLETED, async (payload: { job_id: string; store_id: string; type: string }) => {
    try {
      // Fetch the store owner to notify
      const { query: dbQuery } = await import('../db/pool');
      const { rows } = await dbQuery<{ owner_id: string }>(
        'SELECT owner_id FROM pd_store WHERE id = $1',
        [payload.store_id],
      );
      if (rows[0]) {
        await notificationService.create({
          user_id: rows[0].owner_id,
          type: 'ai_job_completed',
          title: 'Tâche IA terminée',
          message: `Votre tâche ${payload.type} a été complétée avec succès.`,
          data: { job_id: payload.job_id },
        });
      }
    } catch (err) {
      logger.error({ err, payload }, 'ai.job.completed subscriber failed');
    }
  });
}
