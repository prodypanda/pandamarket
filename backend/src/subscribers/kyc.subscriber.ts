/**
 * KYC verification event subscribers.
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';

export function registerKycSubscribers(): void {
  eventBus.on(PdEvent.KYC_APPROVED, async (payload: { store_id: string; user_id: string }) => {
    try {
      await notificationService.create({
        user_id: payload.user_id,
        type: 'kyc_approved',
        title: 'Vérification approuvée',
        message: 'Votre boutique est maintenant vérifiée.',
        data: { store_id: payload.store_id },
      });
    } catch (err) {
      logger.error({ err, payload }, 'kyc.approved subscriber failed');
    }
  });

  eventBus.on(PdEvent.KYC_REJECTED, async (payload: { store_id: string; user_id: string; reason: string }) => {
    try {
      await notificationService.create({
        user_id: payload.user_id,
        type: 'kyc_rejected',
        title: 'Vérification refusée',
        message: `Raison : ${payload.reason}`,
        data: { store_id: payload.store_id },
      });
    } catch (err) {
      logger.error({ err, payload }, 'kyc.rejected subscriber failed');
    }
  });
}
