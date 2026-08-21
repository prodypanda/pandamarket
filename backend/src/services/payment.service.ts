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
import {
  enqueuePaymentCompensation,
  enqueuePaymentReconciliation,
} from '../queues/payment-reconciliation-queue';

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
  provider_state?: string | null;
  reconciliation_status?: string | null;
  compensation_status?: string | null;
  provider_expected_amount_minor?: string | null;
  provider_expected_currency?: string | null;
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

function throwMissingPaymentReplay(orderId: string, gateway: PaymentGateway): never {
  throw new PdConflictError(
    PdErrorCode.PAY_RECONCILIATION_PENDING,
    'The stored payment session is missing replay data and must be reconciled',
    { order_id: orderId, gateway, retry_after_seconds: 60 },
  );
}

function nullableEqual(left: string | number | null | undefined, right: string | number | null | undefined): boolean {
  return (left ?? null) === (right ?? null);
}

/**
 * A second browser request may use a different local idempotency key while it
 * is still trying to resume the same checkout. It may reuse an already-created
 * provider session only when the immutable financial binding is identical.
 * Gateway, merchant account, quote identity, amount, and currency are all part
 * of that binding; capability versions are deliberately not compared here
 * because availability can change after a provider session has been created.
 */
function attemptMatchesPayment(
  attempt: PaymentAttemptRow,
  order: OrderRow,
  gateway: PaymentGateway,
  expectedAmountMinor: string,
  currency: string,
  merchantAccountId?: string | null,
): boolean {
  return attempt.gateway === gateway
    && attempt.expected_amount_minor === expectedAmountMinor
    && attempt.expected_currency.toUpperCase() === currency.toUpperCase()
    && nullableEqual(attempt.quote_id, order.quote_id)
    && nullableEqual(attempt.quote_version, order.quote_version)
    && (merchantAccountId === undefined
      || nullableEqual(attempt.merchant_account_id, merchantAccountId));
}

function providerPaymentBinding(
  result: PaymentInitResult,
  fallbackAmountMinor: string,
  fallbackCurrency: string,
): { amountMinor: string; currency: string } {
  const metadata = result.metadata || {};
  const currency = typeof metadata.currency === 'string'
    ? metadata.currency.toUpperCase()
    : fallbackCurrency;
  const convertedAmount = Number(metadata.converted_amount);
  const amountMinor = Number.isFinite(convertedAmount) && convertedAmount >= 0
    ? toMinorUnits(convertedAmount, currency).toString()
    : fallbackAmountMinor;
  return { amountMinor, currency };
}

function initProviderState(error: unknown): 'not_created' | 'unknown' {
  if (error instanceof PdError) {
    const state = error.details?.provider_state;
    if (state === 'unknown' || state === 'not_created') return state;
  }
  return 'unknown';
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
              provider_response, provider_state, reconciliation_status,
              compensation_status, provider_expected_amount_minor,
              provider_expected_currency, failure_code, failure_message
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
      if (stored && existing.status === 'captured') return stored;
      if (['initialized', 'captured'].includes(existing.status) && !stored) {
        throwMissingPaymentReplay(order.id, gateway);
      }
      if (existing.status === 'initializing') {
        throw new PdConflictError(
          PdErrorCode.PAY_INIT_IN_PROGRESS,
          'Payment initialization is already in progress',
          { order_id: order.id, retry_after_seconds: 10 },
        );
      }
      if (existing.status === 'initialization_unknown') {
        throw new PdConflictError(
          PdErrorCode.PAY_RECONCILIATION_PENDING,
          'Payment state is being reconciled before another attempt can start',
          { order_id: order.id, retry_after_seconds: 60 },
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
    if (order.payment_status === 'captured' || ['cancelled', 'refunded'].includes(String(order.status))) {
      throw new PdValidationError('This order is no longer payable', { order_id: order.id });
    }

    const lockKey = `${PAYMENT_INIT_LOCK_PREFIX}order:${order.id}`;
    const reservation = await transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
      const { rows: orderRows } = await client.query<OrderRow>(
        'SELECT * FROM pd_order WHERE id = $1 FOR UPDATE',
        [order.id],
      );
      const lockedOrder = orderRows[0];
      if (!lockedOrder) {
        throw new PdValidationError('Payment order was not found', { order_id: order.id });
      }
      if (
        lockedOrder.payment_status === 'captured'
        || ['cancelled', 'refunded'].includes(String(lockedOrder.status))
      ) {
        throw new PdValidationError('This order is no longer payable', { order_id: order.id });
      }
      const lockedCurrency = (lockedOrder.currency || config.defaultCurrency).toUpperCase();
      const lockedAmountMinor = toMinorUnits(parseFloat(lockedOrder.total), lockedCurrency).toString();
      if (
        lockedOrder.payment_gateway !== gateway
        || lockedCurrency !== currency
        || lockedAmountMinor !== expectedAmountMinor
        || !nullableEqual(lockedOrder.quote_id, order.quote_id)
        || !nullableEqual(lockedOrder.quote_version, order.quote_version)
      ) {
        throw new PdConflictError(
          PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
          'The order payment details changed before initialization',
          { order_id: order.id, gateway },
        );
      }
      const { rows } = await client.query<PaymentAttemptRow>(
        `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
                expected_currency, merchant_account_id, status, idempotency_key,
                request_fingerprint, capability_version, quote_id, quote_version,
                provider_response, provider_state, reconciliation_status,
                compensation_status, provider_expected_amount_minor,
                provider_expected_currency, failure_code, failure_message
         FROM pd_payment_attempt
         WHERE order_id = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [order.id, normalizedKey],
      );
      const existingReservation = rows[0];
      if (existingReservation) {
        if (existingReservation.gateway !== gateway) {
          throw new PdConflictError(
            PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
            'This payment idempotency key is bound to another gateway',
            { order_id: order.id, gateway, existing_gateway: existingReservation.gateway },
          );
        }
        const replayFingerprint = existingReservation.capability_version
          ? paymentInitFingerprint({
            order: lockedOrder,
            gateway,
            amountMinor: lockedAmountMinor,
            currency: lockedCurrency,
            capabilityVersion: existingReservation.capability_version,
            returnOrigin: normalizedReturnOrigin,
          })
          : null;
        if (
          existingReservation.request_fingerprint
          && replayFingerprint !== existingReservation.request_fingerprint
        ) {
          throw new PdConflictError(
            PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
            'This payment idempotency key is bound to different payment details',
            { order_id: order.id, gateway },
          );
        }
        const stored = parseStoredPaymentInit(existingReservation);
        if (stored && ['initialized', 'captured'].includes(existingReservation.status)) {
          return {
            attemptId: existingReservation.id,
            replay: stored,
            vendorCredentials: undefined,
            requestFingerprint: existingReservation.request_fingerprint || '',
            expectedAmountMinor: lockedAmountMinor,
            currency: lockedCurrency,
            amount: parseFloat(lockedOrder.total),
          };
        }
        if (['initialized', 'captured'].includes(existingReservation.status) && !stored) {
          throwMissingPaymentReplay(order.id, gateway);
        }
        if (existingReservation.status === 'initializing') {
          throw new PdConflictError(
            PdErrorCode.PAY_INIT_IN_PROGRESS,
            'Payment initialization is already in progress',
            { order_id: order.id, retry_after_seconds: 10 },
          );
        }
        if (existingReservation.status === 'initialization_unknown') {
          throw new PdConflictError(
            PdErrorCode.PAY_RECONCILIATION_PENDING,
            'Payment state is being reconciled before another attempt can start',
            { order_id: order.id, retry_after_seconds: 60 },
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

      const { rows: activeRows } = await client.query<PaymentAttemptRow>(
        `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
                expected_currency, merchant_account_id, status, idempotency_key,
                request_fingerprint, capability_version, quote_id, quote_version,
                provider_response, provider_state, reconciliation_status,
                compensation_status, provider_expected_amount_minor,
                provider_expected_currency, failure_code, failure_message
         FROM pd_payment_attempt
         WHERE order_id = $1
           AND status IN ('initializing', 'initialization_unknown', 'initialized', 'captured')
           AND ($2::text IS NULL OR id <> $2)
         ORDER BY created_at DESC
         FOR UPDATE`,
        [order.id, existingReservation?.id ?? null],
      );
      const active = activeRows[0];
      if (active) {
        const stored = parseStoredPaymentInit(active);
        if (
          stored
          && ['initialized', 'captured'].includes(active.status)
          && attemptMatchesPayment(
            active,
            lockedOrder,
            gateway,
            lockedAmountMinor,
            lockedCurrency,
          )
        ) {
          return {
            attemptId: active.id,
            replay: stored,
            vendorCredentials: undefined,
            requestFingerprint: active.request_fingerprint || '',
            expectedAmountMinor: lockedAmountMinor,
            currency: lockedCurrency,
            amount: parseFloat(lockedOrder.total),
          };
        }
        if (['initialized', 'captured'].includes(active.status) && !stored) {
          throwMissingPaymentReplay(order.id, gateway);
        }
        if (active.status === 'initialization_unknown') {
          throw new PdConflictError(
            PdErrorCode.PAY_RECONCILIATION_PENDING,
            'Payment state is being reconciled before another attempt can start',
            { order_id: order.id, retry_after_seconds: 60 },
          );
        }
        if (active.status === 'initializing') {
          throw new PdConflictError(
            PdErrorCode.PAY_INIT_IN_PROGRESS,
            'Another payment initialization is already in progress for this order',
            { order_id: order.id, retry_after_seconds: 10 },
          );
        }
        throw new PdConflictError(
          PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
          'This order already has a different active payment session',
          { order_id: order.id, gateway, existing_gateway: active.gateway },
        );
      }

      const paymentSelection = await paymentCapabilityService.assertOrderGatewayAvailable(
        lockedOrder,
        gateway,
        { executor: client, lock_stores: true },
      );
      const requestFingerprint = paymentInitFingerprint({
        order: lockedOrder,
        gateway,
        amountMinor: lockedAmountMinor,
        currency: lockedCurrency,
        capabilityVersion: paymentSelection.capability_version,
        returnOrigin: normalizedReturnOrigin,
      });

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
          lockedAmountMinor,
          lockedCurrency,
          paymentSelection.merchant_account_id,
          normalizedKey,
          requestFingerprint,
          paymentSelection.capability_version,
          lockedOrder.quote_id ?? null,
          lockedOrder.quote_version ?? null,
        ],
      );
      return {
        attemptId,
        replay: null as PaymentInitResult | null,
        vendorCredentials: paymentSelection.vendor_credentials,
        requestFingerprint,
        expectedAmountMinor: lockedAmountMinor,
        currency: lockedCurrency,
        amount: parseFloat(lockedOrder.total),
      };
    });

    if (reservation.replay) return reservation.replay;
    const vendorCredentials = reservation.vendorCredentials;
    const requestFingerprint = reservation.requestFingerprint;

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
        amount: reservation.amount,
        currency: reservation.currency,
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
          { gateway, provider_state: 'unknown', retryable: true },
        );
      }
    } catch (err) {
      const providerState = initProviderState(err);
      const attemptStatus = providerState === 'unknown'
        ? 'initialization_unknown'
        : 'initialization_failed';
      try {
        await query(
          `UPDATE pd_payment_attempt
           SET status = $2,
               provider_state = $3,
               reconciliation_status = CASE WHEN $3 = 'unknown' THEN 'queued' ELSE 'resolved' END,
               next_reconciliation_at = CASE WHEN $3 = 'unknown' THEN NOW() ELSE NULL END,
               compensation_status = CASE WHEN $3 = 'not_created' THEN 'pending' ELSE 'not_required' END,
               failed_at = NOW(),
               failure_code = $4,
               failure_message = $5,
               updated_at = NOW()
           WHERE id = $1 AND status = 'initializing'`,
          [
            reservation.attemptId,
            attemptStatus,
            providerState,
            (err as { code?: string }).code || PdErrorCode.PAY_INIT_FAILED,
            (err as Error).message || 'Payment provider initialization failed',
          ],
        );
      } catch (updateError) {
        logger.error(
          { err: updateError, attempt_id: reservation.attemptId },
          'Failed to persist payment initialization failure',
        );
      }
      if (providerState === 'unknown') {
        try {
          await enqueuePaymentReconciliation(reservation.attemptId);
        } catch (queueError) {
          logger.error(
            { err: queueError, attempt_id: reservation.attemptId },
            'Failed to enqueue payment initialization reconciliation',
          );
        }
      } else {
        const compensation = await this.compensateFailedInitialization(
          reservation.attemptId,
          order.id,
          'Payment provider rejected initialization',
        );
        if (err instanceof PdError) {
          throw new PdError(err.code, err.message, err.httpStatus, {
            ...err.details,
            order_released: compensation === 'cancelled',
            compensation_status: compensation,
          });
        }
      }
      throw err;
    }

    const providerBinding = providerPaymentBinding(
      result,
      reservation.expectedAmountMinor,
      reservation.currency,
    );
    try {
      await transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [lockKey]);
        const { rows: orderRows } = await client.query<{
          status: string;
          payment_status: string;
          payment_reference: string | null;
        }>(
          `SELECT status, payment_status, payment_reference
           FROM pd_order
           WHERE id = $1
           FOR UPDATE`,
          [order.id],
        );
        const currentOrder = orderRows[0];
        if (
          !currentOrder
          || currentOrder.payment_status === 'captured'
          || ['cancelled', 'refunded'].includes(currentOrder.status)
        ) {
          throw new PdConflictError(
            PdErrorCode.PAY_RECONCILIATION_PENDING,
            'The provider session was created after the order stopped being payable',
            { order_id: order.id, gateway },
          );
        }
        const { rows } = await client.query<PaymentAttemptRow>(
          `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
                  expected_currency, merchant_account_id, status, idempotency_key,
                  request_fingerprint, capability_version, quote_id, quote_version,
                  provider_response, provider_state, reconciliation_status,
                  compensation_status, provider_expected_amount_minor,
                  provider_expected_currency, failure_code, failure_message
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

        const attemptUpdate = await client.query(
          `UPDATE pd_payment_attempt
           SET gateway_reference = $2,
               status = 'initialized',
               provider_state = 'created',
               provider_response = $3::jsonb,
               provider_expected_amount_minor = $4,
               provider_expected_currency = $5,
               reconciliation_status = 'none',
               compensation_status = 'not_required',
               initialized_at = NOW(),
               failure_code = NULL,
               failure_message = NULL,
               updated_at = NOW()
           WHERE id = $1 AND status = 'initializing' AND request_fingerprint = $6`,
          [
            reservation.attemptId,
            result.gateway_reference,
            JSON.stringify(result),
            providerBinding.amountMinor,
            providerBinding.currency,
            requestFingerprint,
          ],
        );
        if (!attemptUpdate.rowCount) {
          throw new PdConflictError(
            PdErrorCode.PAY_IDEMPOTENCY_CONFLICT,
            'Payment attempt could not be finalized',
            { order_id: order.id, gateway },
          );
        }
      });
    } catch (err) {
      try {
        await query(
          `UPDATE pd_payment_attempt
           SET gateway_reference = $2,
               status = 'initialization_unknown',
               provider_state = 'unknown',
               provider_response = $3::jsonb,
               provider_expected_amount_minor = $4,
               provider_expected_currency = $5,
               reconciliation_status = 'queued',
               next_reconciliation_at = NOW(),
               last_reconciliation_error = $6,
               updated_at = NOW()
           WHERE id = $1 AND status = 'initializing'`,
          [
            reservation.attemptId,
            result.gateway_reference,
            JSON.stringify(result),
            providerBinding.amountMinor,
            providerBinding.currency,
            (err as Error).message || 'Payment attempt finalization failed',
          ],
        );
      } catch (updateError) {
        logger.error(
          { err: updateError, attempt_id: reservation.attemptId },
          'Failed to persist unknown payment initialization state',
        );
      }
      try {
        await enqueuePaymentReconciliation(reservation.attemptId);
      } catch (queueError) {
        logger.error(
          { err: queueError, attempt_id: reservation.attemptId },
          'Failed to enqueue payment finalization reconciliation',
        );
      }
      throw new PdConflictError(
        PdErrorCode.PAY_RECONCILIATION_PENDING,
        'Payment state is being reconciled after provider initialization',
        { order_id: order.id, retry_after_seconds: 60 },
      );
    }

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

  private async compensateFailedInitialization(
    attemptId: string,
    orderId: string,
    reason: string,
  ): Promise<'cancelled' | 'already_paid' | 'active_attempt' | 'not_found' | 'manual_review'> {
    try {
      const result = await orderService.cancelUnstartedPaymentOrder(orderId, reason, attemptId);
      const completed = result === 'cancelled';
      // An already-paid order needs no release. A concurrent active attempt,
      // however, is an unresolved race and must remain visible for review.
      const noReleaseRequired = result === 'already_paid';
      await query(
        `UPDATE pd_payment_attempt
         SET compensation_status = $2,
             compensated_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE compensated_at END,
             compensation_reason = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [
          attemptId,
          completed || noReleaseRequired ? 'completed' : 'manual_review',
          `${reason}: ${result}`,
        ],
      );
      return result;
    } catch (err) {
      try {
        await query(
          `UPDATE pd_payment_attempt
           SET compensation_status = 'pending',
               compensation_reason = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [attemptId, `${reason}: ${(err as Error).message}`],
        );
      } catch {
        // The reconciliation sweep will still find the original pending row.
      }
      try {
        await enqueuePaymentCompensation(attemptId);
      } catch (queueError) {
        logger.error({ err: queueError, attempt_id: attemptId }, 'Failed to enqueue payment compensation');
      }
      return 'manual_review';
    }
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
      provider_expected_amount_minor: string | null;
      provider_expected_currency: string | null;
      merchant_account_id: string | null;
      status: string;
    }>(
      `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor, expected_currency,
              provider_expected_amount_minor, provider_expected_currency, merchant_account_id, status
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
      if (attempt.merchant_account_id && platformSettings.payment_vendor_direct_enabled && storeIds.length === 1) {
        const store = await storeService.getById(storeIds[0]);
        if (store.payment_config) {
          const decrypted = decryptVendorConfig(store.payment_config);
          if (decrypted) vendorCredentials = decrypted;
        }
      }

      if (attempt.merchant_account_id && !vendorCredentials) {
        throw new PdValidationError('The payment merchant credentials are no longer available');
      }
      if (!attempt.merchant_account_id
        && platformSettings.payment_platform_credentials_source === 'vendor_direct_only') {
        throw new PdValidationError('This payment gateway requires vendor direct credentials');
      }

      if (attempt.merchant_account_id) {
        const currentMerchantAccount = opts.gateway === PaymentGateway.Flouci
          ? vendorCredentials?.flouci_app_token
          : opts.gateway === PaymentGateway.Konnect
            ? vendorCredentials?.konnect_receiver_wallet
            : vendorCredentials?.paypal_client_id;
        if (!currentMerchantAccount || currentMerchantAccount !== attempt.merchant_account_id) {
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
      const providerCurrency = attempt.provider_expected_currency || attempt.expected_currency;
      const verifiedCurrency = typeof verifyResult.metadata?.currency === 'string'
        ? verifyResult.metadata.currency.toUpperCase()
        : providerCurrency;
      if (verifiedCurrency !== providerCurrency.toUpperCase()) {
        const msg = `Payment currency mismatch: expected ${providerCurrency}, got ${verifiedCurrency}`;
        await query(
          `UPDATE pd_payment_event SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
          [eventId, msg],
        );
        throw new PdValidationError(msg);
      }
      const verifiedAmountMinor = toMinorUnits(verifyAmount, providerCurrency);
      const expectedAmountMinor = BigInt(
        attempt.provider_expected_amount_minor || attempt.expected_amount_minor,
      );

      if (verifiedAmountMinor < expectedAmountMinor) {
        const msg = `Payment amount mismatch: underpayment detected (expected ${expectedAmountMinor}, got ${verifiedAmountMinor})`;
        logger.error({ boundOrderId, expectedAmountMinor: expectedAmountMinor.toString(), verifiedAmountMinor: verifiedAmountMinor.toString() }, msg);
        await query(
          `UPDATE pd_payment_event SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
          [eventId, msg],
        );
        throw new PdValidationError(msg);
      }

      // 5. Capture the attempt and order in one transaction. A webhook retry
      // must never observe an attempt as captured while the order is unpaid.
      let isAttemptUpdated: boolean;
      try {
        isAttemptUpdated = await transaction(async (client) => {
          await client.query(
            'SELECT id FROM pd_order WHERE id = $1 FOR UPDATE',
            [boundOrderId],
          );
          const { rowCount } = await client.query(
            `UPDATE pd_payment_attempt
             SET status = 'captured', provider_state = 'captured', updated_at = NOW()
             WHERE id = $1 AND status IN ('initialized', 'initialization_unknown')`,
            [attempt.id],
          );
          if (rowCount !== 1) return false;
          await orderService.markPaidInTransaction(
            client,
            boundOrderId,
            opts.gateway,
            attempt.gateway_reference,
          );
          return true;
        });
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

      // 6. Downstream effects are retried independently after the atomic
      // payment/order state transition succeeds.
      try {
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
