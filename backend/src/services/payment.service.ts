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

import { query, transaction } from '../db/pool';
import { logger } from '../utils/logger';
import { config } from '../config';
import { orderService, OrderRow } from './order.service';
import { storeService } from './store.service';
import { PaymentGateway } from '@pandamarket/types';
import { getPaymentProvider, decryptVendorConfig } from '../plugins/payment';
import { PaymentInitResult, PaymentVerifyResult } from '../plugins/payment/payment-provider.interface';
import { pdId, sha256 } from '../utils/crypto';
import { PdConflictError, PdError, PdErrorCode, PdValidationError } from '../errors';
import { platformConfigService } from './platform-config.service';
import { adsService } from './ads.service';
import { toMinorUnits } from '../utils/money';
import { paymentCapabilityService } from './payment-capability.service';

interface PaymentAttemptRow {
  id: string;
  order_id: string;
  gateway: PaymentGateway;
  gateway_reference: string;
  expected_amount_minor: string;
  expected_currency: string;
  merchant_account_id: string | null;
  status: string;
  idempotency_key: string | null;
  request_fingerprint: string | null;
  capability_version: string | null;
  quote_id: string | null;
  quote_version: number | null;
  provider_response: PaymentInitResult | null;
  failure_code: string | null;
  failure_message: string | null;
}

const PAYMENT_INIT_LOCK_PREFIX = 'pd_payment_init:';
const PENDING_REFERENCE_PREFIX = 'pending_';

function normalizeReturnOrigin(returnOrigin?: string): string | null {
  const value = returnOrigin?.trim().replace(/\/+$/, '');
  return value || null;
}

function paymentInitFingerprint(params: {
  order: OrderRow;
  gateway: PaymentGateway;
  amountMinor: string;
  currency: string;
  capabilityVersion: string;
  returnOrigin: string | null;
}): string {
  return sha256(JSON.stringify({
    order_id: params.order.id,
    gateway: params.gateway,
    expected_amount_minor: params.amountMinor,
    expected_currency: params.currency,
    quote_id: params.order.quote_id ?? null,
    quote_version: params.order.quote_version ?? null,
    capability_version: params.capabilityVersion,
    return_origin: params.returnOrigin,
  }));
}

function parseStoredPaymentInit(row: PaymentAttemptRow): PaymentInitResult | null {
  if (!row.provider_response || typeof row.provider_response !== 'object') return null;
  if (!row.provider_response.redirect_url || !row.provider_response.gateway_reference) return null;
  return row.provider_response;
}

export class PaymentService {
  /**
   * Initialize a payment session for any supported gateway.
   * Returns the redirect URL and gateway reference.
   */
  async initPayment(
    order: OrderRow,
    gateway: PaymentGateway,
    customerEmail: string,
    returnOrigin?: string,
    idempotencyKey?: string,
  ): Promise<PaymentInitResult> {
    const provider = getPaymentProvider(gateway);
    const normalizedKey = idempotencyKey?.trim() || `legacy_${order.id}_${gateway}`;
    if (normalizedKey.length < 8 || normalizedKey.length > 128) {
      throw new PdValidationError('Payment idempotency key must be between 8 and 128 characters');
    }

    const currency = (order.currency ?? config.defaultCurrency).toUpperCase();
    const expectedAmountMinor = toMinorUnits(parseFloat(order.total), currency).toString();
    const normalizedReturnOrigin = normalizeReturnOrigin(returnOrigin);
    const existingAttempt = await query<PaymentAttemptRow>(
      `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
              expected_currency, merchant_account_id, status, idempotency_key,
              request_fingerprint, capability_version, quote_id, quote_version,
              provider_response,
              failure_code, failure_message
       FROM pd_payment_attempt
       WHERE order_id = $1 AND idempotency_key = $2`,
      [order.id, normalizedKey],
    );
    const existing = existingAttempt.rows[0];
    if (existing) {
      if (existing.gateway !== gateway) {
        throw new PdConflictError(
          PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
          'This payment idempotency key is bound to another gateway',
          { order_id: order.id, gateway, existing_gateway: existing.gateway },
        );
      }
      if (existing.request_fingerprint && existing.capability_version) {
        const replayFingerprint = paymentInitFingerprint({
          order,
          gateway,
          amountMinor: expectedAmountMinor,
          currency,
          capabilityVersion: existing.capability_version,
          returnOrigin: normalizedReturnOrigin,
        });
        if (replayFingerprint !== existing.request_fingerprint) {
          throw new PdConflictError(
            PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
            'This payment idempotency key is bound to different payment details',
            { order_id: order.id, gateway },
          );
        }
      }
      const stored = parseStoredPaymentInit(existing);
      if (stored && ['initialized', 'captured'].includes(existing.status)) return stored;
      if (existing.status === 'initializing') {
        throw new PdConflictError(
          PdErrorCode.PAY_INIT_IN_PROGRESS,
          'Payment initialization is already in progress',
          { order_id: order.id, retry_after_seconds: 10 },
        );
      }
      if (existing.failure_code || existing.failure_message) {
        throw new PdError(
          existing.failure_code || PdErrorCode.PAY_INIT_FAILED,
          existing.failure_message || 'Payment initialization previously failed',
          502,
          { gateway, order_id: order.id, idempotency_key: normalizedKey },
        );
      }
    }

    const paymentSelection = await paymentCapabilityService.assertOrderGatewayAvailable(
      order,
      gateway,
    );
    const vendorCredentials = paymentSelection.vendor_credentials;
    const requestFingerprint = paymentInitFingerprint({
      order,
      gateway,
      amountMinor: expectedAmountMinor,
      currency,
      capabilityVersion: paymentSelection.capability_version,
      returnOrigin: normalizedReturnOrigin,
    });
    const lockKey = `${PAYMENT_INIT_LOCK_PREFIX}${order.id}:${normalizedKey}`;

    const reservation = await transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
      const { rows } = await client.query<PaymentAttemptRow>(
        `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
                expected_currency, merchant_account_id, status, idempotency_key,
                request_fingerprint, capability_version, quote_id, quote_version,
                provider_response,
                failure_code, failure_message
         FROM pd_payment_attempt
         WHERE order_id = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [order.id, normalizedKey],
      );
      const existingReservation = rows[0];
      if (existingReservation) {
        if (
          existingReservation.request_fingerprint
          && existingReservation.request_fingerprint !== requestFingerprint
        ) {
          throw new PdConflictError(
            PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
            'This payment idempotency key is bound to different payment details',
            { order_id: order.id, gateway },
          );
        }
        const stored = parseStoredPaymentInit(existingReservation);
        if (stored && ['initialized', 'captured'].includes(existingReservation.status)) {
          return { attemptId: existingReservation.id, replay: stored };
        }
        if (existingReservation.status === 'initializing') {
          throw new PdConflictError(
            PdErrorCode.PAY_INIT_IN_PROGRESS,
            'Payment initialization is already in progress',
            { order_id: order.id, retry_after_seconds: 10 },
          );
        }
        if (existingReservation.failure_code || existingReservation.failure_message) {
          throw new PdError(
            existingReservation.failure_code || PdErrorCode.PAY_INIT_FAILED,
            existingReservation.failure_message || 'Payment initialization previously failed',
            502,
            { gateway, order_id: order.id, idempotency_key: normalizedKey },
          );
        }
      }

      const attemptId = pdId('pa');
      const pendingReference = `${PENDING_REFERENCE_PREFIX}${attemptId}`;
      await client.query(
        `INSERT INTO pd_payment_attempt
          (id, order_id, gateway, gateway_reference, expected_amount_minor,
           expected_currency, merchant_account_id, status, idempotency_key,
           request_fingerprint, capability_version, quote_id, quote_version,
           initializing_started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'initializing', $8, $9, $10, $11, $12, NOW())`,
        [
          attemptId,
          order.id,
          gateway,
          pendingReference,
          expectedAmountMinor,
          currency,
          paymentSelection.merchant_account_id,
          normalizedKey,
          requestFingerprint,
          paymentSelection.capability_version,
          order.quote_id ?? null,
          order.quote_version ?? null,
        ],
      );
      return { attemptId, replay: null as PaymentInitResult | null };
    });

    if (reservation.replay) return reservation.replay;

    const hubDomain = config.hubDomain.startsWith('http')
      ? config.hubDomain
      : `https://${config.hubDomain}`;

    const baseOrigin = normalizedReturnOrigin;
    const successUrl = baseOrigin
      ? `${baseOrigin}/checkout/success?order=${order.id}`
      : `${hubDomain}/hub/checkout/success?order=${order.id}`;
    const failUrl = baseOrigin
      ? `${baseOrigin}/checkout/status?status=failed&order=${order.id}`
      : `${hubDomain}/hub/checkout?order=${order.id}&status=failed`;

    let result: PaymentInitResult;
    try {
      result = await provider.init({
        order_id: order.id,
        amount: parseFloat(order.total),
        currency,
        customer_email: customerEmail,
        idempotency_key: normalizedKey,
        success_url: successUrl,
        fail_url: failUrl,
        vendor_credentials: vendorCredentials,
      });
      if (!result.redirect_url?.trim() || !result.gateway_reference?.trim()) {
        throw new PdError(
          PdErrorCode.PAY_INIT_FAILED,
          'Payment provider returned an incomplete initialization response',
          502,
          { gateway },
        );
      }
    } catch (err) {
      await query(
        `UPDATE pd_payment_attempt
         SET status = 'initialization_failed',
             failed_at = NOW(),
             failure_code = $2,
             failure_message = $3,
             updated_at = NOW()
         WHERE id = $1 AND status = 'initializing'`,
        [
          reservation.attemptId,
          (err as { code?: string }).code || PdErrorCode.PAY_INIT_FAILED,
          (err as Error).message || 'Payment provider initialization failed',
        ],
      ).catch((updateError) => {
        logger.error(
          { err: updateError, attempt_id: reservation.attemptId },
          'Failed to persist payment initialization failure',
        );
      });
      throw err;
    }

    await transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
      const { rows } = await client.query<PaymentAttemptRow>(
        `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
                expected_currency, merchant_account_id, status, idempotency_key,
                request_fingerprint, capability_version, quote_id, quote_version,
                provider_response,
                failure_code, failure_message
         FROM pd_payment_attempt
         WHERE id = $1
         FOR UPDATE`,
        [reservation.attemptId],
      );
      const attempt = rows[0];
      if (!attempt) throw new PdValidationError('Payment attempt reservation disappeared');
      if (attempt.request_fingerprint !== requestFingerprint) {
        throw new PdConflictError(
          PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
          'Payment attempt binding changed while initializing',
          { order_id: order.id, gateway },
        );
      }
      if (attempt.status === 'initialized' || attempt.status === 'captured') return;
      if (attempt.status !== 'initializing') {
        throw new PdError(
          PdErrorCode.PAY_INIT_FAILED,
          attempt.failure_message || 'Payment attempt is no longer initializable',
          502,
          { gateway, order_id: order.id },
        );
      }

      const orderUpdate = await client.query(
        `UPDATE pd_order
         SET payment_reference = $2
         WHERE id = $1 AND (payment_reference IS NULL OR payment_reference = $2)
         RETURNING id`,
        [order.id, result.gateway_reference],
      );
      if (!orderUpdate.rowCount) {
        throw new PdConflictError(
          PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
          'The order already has a different payment reference',
          { order_id: order.id, gateway },
        );
      }

      await client.query(
        `UPDATE pd_payment_attempt
         SET gateway_reference = $2,
             status = 'initialized',
             provider_response = $3::jsonb,
             initialized_at = NOW(),
             failure_code = NULL,
             failure_message = NULL,
             updated_at = NOW()
         WHERE id = $1 AND status = 'initializing' AND request_fingerprint = $4`,
        [reservation.attemptId, result.gateway_reference, JSON.stringify(result), requestFingerprint],
      );
    });

    logger.info(
      {
        order_id: order.id,
        gateway,
        reference: result.gateway_reference,
        idempotency_key: normalizedKey,
        attempt_id: reservation.attemptId,
      },
      'Payment initialized and attempt recorded',
    );

    return result;
  }

  /**
   * Process an inbound payment webhook/verification.
   * Idempotent: uses pd_payment_event and pd_payment_attempt to prevent double-processing.
   *
   * @returns true if the payment was newly captured, false if it was a duplicate
   */
  async processPaymentWebhook(opts: {
    gateway: PaymentGateway;
    gatewayEventId: string;
    orderId?: string;
    rawPayload?: Record<string, unknown>;
    sourceIp?: string;
    signatureValid?: boolean;
  }): Promise<boolean> {
    if (opts.signatureValid === false) {
      logger.warn(
        { gateway: opts.gateway, event_id: opts.gatewayEventId },
        'Payment webhook signature invalid — rejecting',
      );
      throw new PdValidationError('Invalid payment webhook signature');
    }

    // 1. Resolve payment attempt strictly by (gateway, gateway_reference)
    const { rows: attemptRows } = await query<{
      id: string;
      order_id: string;
      gateway: string;
      gateway_reference: string;
      expected_amount_minor: string;
      expected_currency: string;
      merchant_account_id: string | null;
      status: string;
    }>(
      `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor, expected_currency, merchant_account_id, status
       FROM pd_payment_attempt
       WHERE gateway = $1 AND gateway_reference = $2`,
      [opts.gateway, opts.gatewayEventId],
    );

    const attempt = attemptRows[0];
    if (!attempt) {
      logger.error(
        { gateway: opts.gateway, reference: opts.gatewayEventId },
        'Payment attempt not found for gateway reference',
      );
      throw new PdValidationError('Payment attempt not found for reference', {
        gateway: opts.gateway,
        reference: opts.gatewayEventId,
      });
    }

    const boundOrderId = attempt.order_id;
    const eventId = pdId('pevt');

    // 2. Idempotency check: insert into pd_payment_event with bound order_id
    try {
      await query(
        `INSERT INTO pd_payment_event
          (id, gateway, gateway_event_id, order_id, status, raw_payload, source_ip, signature_valid)
         VALUES ($1, $2, $3, $4, 'received', $5, $6::inet, $7)`,
        [
          eventId,
          opts.gateway,
          opts.gatewayEventId,
          boundOrderId,
          opts.rawPayload ? JSON.stringify(opts.rawPayload) : null,
          opts.sourceIp ?? null,
          opts.signatureValid ?? null,
        ],
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        logger.warn(
          { gateway: opts.gateway, event_id: opts.gatewayEventId },
          'Duplicate payment webhook — skipping',
        );
        await query(
          `UPDATE pd_payment_event SET status = 'duplicate' WHERE gateway = $1 AND gateway_event_id = $2 AND status = 'received'`,
          [opts.gateway, opts.gatewayEventId],
        ).catch(() => {});
        return false;
      }
      throw err;
    }

    // 3. Verify payment with payment provider
    const provider = getPaymentProvider(opts.gateway);
    const platformSettings = await platformConfigService.getSettings();
    let verifyResult: PaymentVerifyResult;

    try {
      const order = await orderService.getById(boundOrderId);
      const storeIds = await this.getStoreIdsForOrder(order.id);
      let vendorCredentials: Record<string, string> | undefined;
      if (platformSettings.payment_vendor_direct_enabled && storeIds.length === 1) {
        const store = await storeService.getById(storeIds[0]);
        if (store.payment_config) {
          const decrypted = decryptVendorConfig(store.payment_config);
          if (decrypted) vendorCredentials = decrypted;
        }
      }

      if (platformSettings.payment_platform_credentials_source === 'vendor_direct_only' && !vendorCredentials) {
        throw new PdValidationError('This payment gateway requires vendor direct credentials');
      }

      if (attempt.merchant_account_id) {
        const currentMerchantAccount = vendorCredentials
          ? (vendorCredentials.flouci_app_token || vendorCredentials.konnect_receiver_wallet || vendorCredentials.paypal_client_id)
          : null;
        if (currentMerchantAccount && currentMerchantAccount !== attempt.merchant_account_id) {
          throw new PdValidationError('Merchant account mismatch');
        }
      }

      verifyResult = await provider.verify(attempt.gateway_reference, vendorCredentials);
    } catch (err) {
      await query(
        `UPDATE pd_payment_event SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
        [eventId, (err as Error).message],
      );
      throw err;
    }

    if (verifyResult.status === 'captured') {
      // 4. Validate currency and amount (minor units match)
      const verifyAmount = verifyResult.amount ?? 0;
      const verifiedAmountMinor = toMinorUnits(verifyAmount, attempt.expected_currency);
      const expectedAmountMinor = BigInt(attempt.expected_amount_minor);

      if (verifiedAmountMinor < expectedAmountMinor) {
        const msg = `Payment amount mismatch: underpayment detected (expected ${expectedAmountMinor}, got ${verifiedAmountMinor})`;
        logger.error({ boundOrderId, expectedAmountMinor: expectedAmountMinor.toString(), verifiedAmountMinor: verifiedAmountMinor.toString() }, msg);
        await query(
          `UPDATE pd_payment_event SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
          [eventId, msg],
        );
        throw new PdValidationError(msg);
      }

      // 5. Transactional Compare-and-Set from initialized -> captured on pd_payment_attempt
      const isAttemptUpdated = await transaction(async (client) => {
        const { rowCount } = await client.query(
          `UPDATE pd_payment_attempt
           SET status = 'captured', updated_at = NOW()
           WHERE id = $1 AND status = 'initialized'`,
          [attempt.id],
        );
        return rowCount === 1;
      });

      if (!isAttemptUpdated) {
        logger.warn(
          { boundOrderId, attemptId: attempt.id },
          'Payment attempt already captured or not in initialized state',
        );
        await query(
          `UPDATE pd_payment_event SET status = 'duplicate', processed_at = NOW() WHERE id = $1`,
          [eventId],
        );
        return false;
      }

      // 6. Mark order as paid
      try {
        await orderService.markPaid(boundOrderId, opts.gateway, attempt.gateway_reference);
        await adsService.recognizeOrderConversion(boundOrderId);
        await query(
          `UPDATE pd_payment_event SET status = 'processed', amount = $2, processed_at = NOW() WHERE id = $1`,
          [eventId, verifyResult.amount ?? null],
        );
        logger.info(
          { order_id: boundOrderId, gateway: opts.gateway, amount: verifyResult.amount },
          'Payment captured successfully and attempt bound',
        );
        return true;
      } catch (err) {
        if (err instanceof PdConflictError && err.code === PdErrorCode.PAY_ALREADY_CAPTURED) {
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
