/**
 * Mandat Minute event subscribers.
 */

import { eventBus } from '../events/event-bus';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';
import { query } from '../db/pool';

export function registerMandatSubscribers(): void {
  eventBus.on('pd.mandat.uploaded', async (payload: { proof_id: string; order_id: string }) => {
    try {
      // Notify admins that a new mandat proof is awaiting review
      const { rows: admins } = await query<{ id: string }>(
        `SELECT id FROM pd_user WHERE role = 'admin' OR role = 'super_admin'`,
      );
      for (const admin of admins) {
        await notificationService.create({
          user_id: admin.id,
          type: 'mandat_pending',
          title: 'Nouveau mandat à valider',
          message: `Preuve de paiement soumise pour la commande #${payload.order_id.slice(-8)}.`,
          data: { proof_id: payload.proof_id, order_id: payload.order_id },
        });
      }
    } catch (err) {
      logger.error({ err, payload }, 'mandat.uploaded subscriber failed');
    }
  });
}
