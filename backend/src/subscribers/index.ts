/**
 * Subscriber registration — call `registerAllSubscribers()` once at boot.
 *
 * Subscribers listen to events on the in-process event bus and trigger
 * side effects: in-app notifications, email queue jobs, search index sync,
 * and WebSocket push.
 */

import { registerOrderSubscribers } from './order.subscriber';
import { registerKycSubscribers } from './kyc.subscriber';
import { registerProductSubscribers } from './product.subscriber';
import { registerWalletSubscribers } from './wallet.subscriber';
import { registerAiSubscribers } from './ai.subscriber';
import { registerMandatSubscribers } from './mandat.subscriber';
import { logger } from '../utils/logger';

export function registerAllSubscribers(): void {
  registerOrderSubscribers();
  registerKycSubscribers();
  registerProductSubscribers();
  registerWalletSubscribers();
  registerAiSubscribers();
  registerMandatSubscribers();
  logger.info('Subscribers registered');
}
