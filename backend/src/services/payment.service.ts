/**
 * PaymentService — orchestrates payment initialization and verification
 * using the real payment provider registry.
 *
 * Supports:
 *   - Escrow mode (platform credentials) — default for Free/Starter/Regular/Agency
 *   - Direct mode (vendor credentials) — Pro/Golden/Platinum with own API keys
 *
 * Idempotency:
 *   - Uses `pd_payment_event` table with UNIQUE(gateway, gateway_event_id)
 *   - Duplicate webhook deliveries are detected and skipped
 */

import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { config } from '../config';
import { orderService, OrderRow } from './order.service';
import { storeService } from './store.service';
import { PaymentGateway } from '@pandamarket/types';
import { getPaymentProvider, decryptVendorConfig } from '../plugins/payment';
import { PaymentInitResult, PaymentVerifyResult } from '../plugins/payment/payment-provider.interface';
import { pdId } from '../utils/crypto';
import { PdConflictError, PdErrorCode } from '../errors';

export class PaymentService {
  /**
   * Initialize a payment session for any supported gateway.
   * Returns the redirect URL and gateway reference.
   */
  async initPayment(
    order: OrderRow,
    gateway: PaymentGateway,
    customerEmail: string,
  ): Promise<PaymentInitResult> {
    const provider = getPaymentProvider(gateway);

    // Determine if this store uses direct payment (Pro+ with own credentials)
    let vendorCredentials: Record<string, string> | undefined;
    const storeIds = await this.getStoreIdsForOrder(order.id);
    if (storeIds.length === 1) {
      // Single-vendor order — check for direct payment config
      const store = await storeService.getById(storeIds[0]);
      if (store.payment_config) {
        const decrypted = decryptVendorConfig(store.payment_config);
        if (decrypted) vendorCredentials = decrypted;
      }
    }

    const hubDomain = config.hubDomain.startsWith('http')
      ? config.hubDomain
      : `https://${config.hubDomain}`;

    const result = await provider.init({
      order_id: order.id,
      amount: parseFloat(order.total),
      currency: order.currency ?? config.defaultCurrency,
      customer_email: customerEmail,
      success_url: `${hubDomain}/hub/checkout/success?order=${order.id}`,
      fail_url: `${hubDomain}/hub/checkout?order=${order.id}&status=failed`,
      vendor_credentials: vendorCredentials,
    });

    // Store the gateway reference on the order
    await query(
      `UPDATE pd_order SET payment_reference = $2 WHERE id = $1`,
      [order.id, result.gateway_reference],
    );

    logger.info(
      { order_id: order.id, gateway, reference: result.gateway_reference },
      'Payment initialized',
    );

    return result;
  }

  /**
   * Process an inbound payment webhook/verification.
   * Idempotent: uses pd_payment_event to prevent double-processing.
   *
   * @returns true if the payment was newly captured, false if it was a duplicate
   */
  async processPaymentWebhook(opts: {
    gateway: PaymentGateway;
    gatewayEventId: string;
    orderId: string;
    rawPayload?: Record<string, unknown>;
    sourceIp?: string;
    signatureValid?: boolean;
  }): Promise<boolean> {
    const eventId = pdId('pevt');

    // Idempotency check: try to INSERT into pd_payment_event
    // If UNIQUE(gateway, gateway_event_id) is violated, this is a duplicate
    try {
      await query(
        `INSERT INTO pd_payment_event
          (id, gateway, gateway_event_id, order_id, status, raw_payload, source_ip, signature_valid)
         VALUES ($1, $2, $3, $4, 'received', $5, $6::inet, $7)`,
        [
          eventId,
          opts.gateway,
          opts.gatewayEventId,
          opts.orderId,
          opts.rawPayload ? JSON.stringify(opts.rawPayload) : null,
          opts.sourceIp ?? null,
          opts.signatureValid ?? null,
        ],
      );
    } catch (err) {
      // Check for unique_violation (23505) — this is a duplicate event
      if ((err as { code?: string }).code === '23505') {
        logger.warn(
          { gateway: opts.gateway, event_id: opts.gatewayEventId },
          'Duplicate payment webhook — skipping',
        );
        // Mark as duplicate in the existing row
        await query(
          `UPDATE pd_payment_event SET status = 'duplicate' WHERE gateway = $1 AND gateway_event_id = $2 AND status = 'received'`,
          [opts.gateway, opts.gatewayEventId],
        ).catch(() => {}); // best-effort
        return false;
      }
      throw err;
    }

    // Verify the payment with the provider
    const provider = getPaymentProvider(opts.gateway);
    let verifyResult: PaymentVerifyResult;

    try {
      // For direct payment mode, get vendor credentials
      const order = await orderService.getById(opts.orderId);
      const storeIds = await this.getStoreIdsForOrder(order.id);
      let vendorCredentials: Record<string, string> | undefined;
      if (storeIds.length === 1) {
        const store = await storeService.getById(storeIds[0]);
        if (store.payment_config) {
          const decrypted = decryptVendorConfig(store.payment_config);
          if (decrypted) vendorCredentials = decrypted;
        }
      }

      verifyResult = await provider.verify(opts.gatewayEventId, vendorCredentials);
    } catch (err) {
      // Mark event as failed
      await query(
        `UPDATE pd_payment_event SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
        [eventId, (err as Error).message],
      );
      throw err;
    }

    if (verifyResult.status === 'captured') {
      // Mark order as paid (this also guards against double-capture at the order level)
      try {
        await orderService.markPaid(opts.orderId, opts.gateway, opts.gatewayEventId);
        await query(
          `UPDATE pd_payment_event SET status = 'processed', amount = $2, processed_at = NOW() WHERE id = $1`,
          [eventId, verifyResult.amount ?? null],
        );
        logger.info(
          { order_id: opts.orderId, gateway: opts.gateway, amount: verifyResult.amount },
          'Payment captured successfully',
        );
        return true;
      } catch (err) {
        if (err instanceof PdConflictError && err.code === PdErrorCode.PAY_ALREADY_CAPTURED) {
          // Order was already paid — mark event as duplicate
          await query(
            `UPDATE pd_payment_event SET status = 'duplicate', processed_at = NOW() WHERE id = $1`,
            [eventId],
          );
          return false;
        }
        await query(
          `UPDATE pd_payment_event SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
          [eventId, (err as Error).message],
        );
        throw err;
      }
    }

    // Payment not yet captured (pending or failed)
    await query(
      `UPDATE pd_payment_event SET status = $2, processed_at = NOW() WHERE id = $1`,
      [eventId, verifyResult.status === 'pending' ? 'received' : 'failed'],
    );
    return false;
  }

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------

  private async getStoreIdsForOrder(orderId: string): Promise<string[]> {
    const { rows } = await query<{ store_id: string }>(
      `SELECT DISTINCT store_id FROM pd_order_item WHERE order_id = $1`,
      [orderId],
    );
    return rows.map((r) => r.store_id);
  }
}

export const paymentService = new PaymentService();
