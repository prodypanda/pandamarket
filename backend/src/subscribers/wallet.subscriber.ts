/**
 * Wallet lifecycle event subscribers.
 */

import { eventBus, PdEvent } from '../events/event-bus';
import { logger } from '../utils/logger';
import { notificationService } from '../services/notification.service';
import { socketGateway } from '../realtime/socket-gateway';

export function registerWalletSubscribers(): void {
  eventBus.on(PdEvent.WALLET_PAYOUT_COMPLETED, async (payload: { store_id: string; owner_id: string; amount: number }) => {
    try {
      await notificationService.create({
        user_id: payload.owner_id,
        type: 'payout_completed',
        title: 'Virement effectué',
        message: `Votre virement de ${payload.amount} TND a été traité.`,
        data: { store_id: payload.store_id, amount: payload.amount },
      });
      socketGateway.emitToStore(payload.store_id, 'payout_completed', {
        amount: payload.amount,
      });
    } catch (err) {
      logger.error({ err, payload }, 'wallet.payout_completed subscriber failed');
    }
  });
}
