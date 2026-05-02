/**
 * Lightweight in-process event bus.
 * Subscribers in `src/subscribers/*.ts` register listeners on import.
 * For cross-process messaging we use BullMQ (workers) and Redis pub/sub
 * (WebSockets), not this bus.
 */

import { EventEmitter } from 'node:events';
import { logger } from '../utils/logger';

class TypedEventBus extends EventEmitter {
  emit(event: string, payload?: unknown): boolean {
    logger.debug({ event, payload }, 'Event emitted');
    return super.emit(event, payload);
  }
}

export const eventBus = new TypedEventBus();
eventBus.setMaxListeners(50);

/**
 * Standard event names — keep in sync with the documentation.
 */
export const PdEvent = {
  // Auth
  USER_REGISTERED: 'pd.user.registered',

  // Store
  STORE_CREATED: 'pd.store.created',
  STORE_VERIFIED: 'pd.store.verified',
  STORE_SUSPENDED: 'pd.store.suspended',

  // Product
  PRODUCT_CREATED: 'pd.product.created',
  PRODUCT_PUBLISHED: 'pd.product.published',
  PRODUCT_PENDING_APPROVAL: 'pd.product.pending_approval',
  PRODUCT_APPROVED: 'pd.product.approved',
  PRODUCT_REJECTED: 'pd.product.rejected',

  // Order
  ORDER_PLACED: 'pd.order.placed',
  ORDER_FULFILLED: 'pd.order.fulfilled',
  ORDER_CANCELLED: 'pd.order.cancelled',
  ORDER_DELIVERED: 'pd.order.delivered',

  // Payment
  PAYMENT_CAPTURED: 'pd.payment.captured',
  PAYMENT_FAILED: 'pd.payment.failed',
  PAYMENT_REFUNDED: 'pd.payment.refunded',
  MANDAT_UPLOADED: 'pd.mandat.uploaded',

  // KYC
  KYC_SUBMITTED: 'pd.verification.submitted',
  KYC_APPROVED: 'pd.verification.approved',
  KYC_REJECTED: 'pd.verification.rejected',

  // AI
  AI_JOB_QUEUED: 'pd.ai.job.queued',
  AI_JOB_COMPLETED: 'pd.ai.job.completed',
  AI_JOB_FAILED: 'pd.ai.job.failed',

  // Wallet
  WALLET_CREDITED: 'pd.wallet.credited',
  WALLET_FUNDS_AVAILABLE: 'pd.wallet.funds_available',
  WALLET_PAYOUT_COMPLETED: 'pd.wallet.payout_completed',

  // Reports
  REPORT_CREATED: 'pd.report.created',

  // Stock
  STOCK_LOW: 'pd.stock.low',
} as const;

export type PdEventName = (typeof PdEvent)[keyof typeof PdEvent];
