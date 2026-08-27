import { query, transaction } from '../db/pool';
import { logger } from '../utils/logger';
import { PaymentGateway } from '@pandamarket/types';
import { getPaymentProvider, decryptVendorConfig } from '../plugins/payment';
import { PdConflictError, PdErrorCode, PdValidationError } from '../errors';
import { orderService } from './order.service';
import { toMinorUnits } from '../utils/money';
import {
  enqueuePaymentCompensation,
  enqueuePaymentReconciliation,
} from '../queues/payment-reconciliation-queue';
import { storeService } from './store.service';
import { eventBus, PdEvent } from '../events/event-bus';

type AttemptState = 'initialization_unknown' | 'initialized';

interface ReconciliationAttempt {
  id: string;
  order_id: string;
  gateway: PaymentGateway;
  gateway_reference: string;
  expected_amount_minor: string;
  expected_currency: string;
  merchant_account_id: string | null;
  status: AttemptState;
  provider_state: string;
  reconciliation_status: string;
  reconciliation_attempts: number;
  next_reconciliation_at: Date | string | null;
  provider_expected_amount_minor: string | null;
  provider_expected_currency: string | null;
}

const MAX_RECONCILIATION_ATTEMPTS = 12;
const RETRY_DELAYS_MS = [60_000, 120_000, 300_000, 600_000, 1_800_000];

function nextRetry(attempts: number): Date {
  const delay = RETRY_DELAYS_MS[Math.min(Math.max(attempts - 1, 0), RETRY_DELAYS_MS.length - 1)];
  return new Date(Date.now() + delay);
}

export class PaymentReconciliationService {
  async sweepDueAttempts(limit = 100): Promise<number> {
    const { rows: reconciliationRows } = await query<{ id: string }>(
      `SELECT id
       FROM pd_payment_attempt
       WHERE (
         reconciliation_status = 'queued'
         AND (next_reconciliation_at IS NULL OR next_reconciliation_at <= NOW())
       )
       OR (
         reconciliation_status = 'pending'
         AND last_reconciliation_at <= NOW() - INTERVAL '15 minutes'
       )
       OR (
         status = 'initialized'
         AND reconciliation_status = 'none'
         AND updated_at <= NOW() - INTERVAL '10 minutes'
       )
       ORDER BY COALESCE(next_reconciliation_at, updated_at) ASC
       LIMIT $1`,
      [limit],
    );
    for (const row of reconciliationRows) {
      await enqueuePaymentReconciliation(row.id).catch((err) => {
        logger.error({ err, attempt_id: row.id }, 'Failed to enqueue payment reconciliation');
      });
    }

    const { rows: compensationRows } = await query<{ id: string }>(
      `SELECT id
       FROM pd_payment_attempt
       WHERE status = 'initialization_failed'
         AND compensation_status = 'pending'
         AND updated_at <= NOW() - INTERVAL '1 minute'
       ORDER BY updated_at ASC
       LIMIT $1`,
      [limit],
    );
    for (const row of compensationRows) {
      await enqueuePaymentCompensation(row.id).catch((err) => {
        logger.error({ err, attempt_id: row.id }, 'Failed to enqueue payment compensation');
      });
    }
    return reconciliationRows.length + compensationRows.length;
  }

  async reconcileAttempt(attemptId: string): Promise<'captured' | 'failed' | 'pending' | 'manual_review' | 'missing'> {
    const attempt = await this.lockAttempt(attemptId);
    if (!attempt) return 'missing';
    if (attempt.status === 'initialization_unknown' && attempt.gateway_reference.startsWith('pending_')) {
      await this.markManualReview(attempt.id, 'Provider reference was not returned; automatic verification is impossible');
      return 'manual_review';
    }

    let credentials: Record<string, string> | undefined;
    try {
      credentials = await this.getVendorCredentials(
        attempt.order_id,
        attempt.gateway,
        attempt.merchant_account_id,
      );
    } catch (err) {
      await this.markManualReview(attempt.id, (err as Error).message);
      return 'manual_review';
    }
    let verification;
    try {
      verification = await getPaymentProvider(attempt.gateway).verify(
        attempt.gateway_reference,
        credentials,
      );
    } catch (err) {
      await this.scheduleRetry(attempt, (err as Error).message);
      return 'pending';
    }

    if (verification.status === 'captured') {
      const providerExpectedMinor = BigInt(
        attempt.provider_expected_amount_minor || attempt.expected_amount_minor,
      );
      const providerCurrency = attempt.provider_expected_currency || attempt.expected_currency;
      const verifiedCurrency = typeof verification.metadata?.currency === 'string'
        ? verification.metadata.currency.toUpperCase()
        : providerCurrency.toUpperCase();
      if (verifiedCurrency !== providerCurrency.toUpperCase()) {
        await this.markManualReview(
          attempt.id,
          `Reconciliation currency mismatch: expected ${providerCurrency}, got ${verifiedCurrency}`,
        );
        return 'manual_review';
      }
      const verifiedMinor = toMinorUnits(
        verification.amount ?? 0,
        providerCurrency,
      );
      if (verifiedMinor < providerExpectedMinor) {
        await this.markManualReview(
          attempt.id,
          `Reconciliation underpayment: expected ${providerExpectedMinor.toString()} ${providerCurrency}, got ${verifiedMinor.toString()}`,
        );
        return 'manual_review';
      }
      return this.markCaptured(attempt, verification.amount ?? 0);
    }

    if (verification.status === 'failed') {
      await this.markProviderFailed(attempt, 'Provider reported a failed payment session');
      const compensation = await this.compensateAttempt(attempt.id);
      if (compensation === 'manual_review') {
        return 'manual_review';
      }
      return 'failed';
    }

    await this.scheduleRetry(attempt, 'Provider payment remains pending');
    return 'pending';
  }

  private async lockAttempt(attemptId: string): Promise<ReconciliationAttempt | null> {
    return transaction(async (client) => {
      const { rows } = await client.query<ReconciliationAttempt>(
        `SELECT id, order_id, gateway, gateway_reference, expected_amount_minor,
                expected_currency, merchant_account_id, status, provider_state,
                reconciliation_status, reconciliation_attempts, next_reconciliation_at,
                provider_expected_amount_minor, provider_expected_currency
         FROM pd_payment_attempt
         WHERE id = $1
           AND status IN ('initialization_unknown', 'initialized')
           AND (
             (reconciliation_status = 'queued'
               AND (next_reconciliation_at IS NULL OR next_reconciliation_at <= NOW()))
             OR (status = 'initialized' AND reconciliation_status = 'none')
             OR (reconciliation_status = 'pending'
               AND last_reconciliation_at <= NOW() - INTERVAL '15 minutes')
           )
         FOR UPDATE`,
        [attemptId],
      );
      if (!rows[0]) return null;
      await client.query(
        `UPDATE pd_payment_attempt
         SET reconciliation_status = 'pending',
             reconciliation_attempts = reconciliation_attempts + 1,
             last_reconciliation_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [attemptId],
      );
      return { ...rows[0], reconciliation_attempts: rows[0].reconciliation_attempts + 1 };
    });
  }

  private async scheduleRetry(attempt: ReconciliationAttempt, errorMessage: string): Promise<void> {
    if (attempt.reconciliation_attempts >= MAX_RECONCILIATION_ATTEMPTS) {
      await this.markManualReview(attempt.id, errorMessage);
      return;
    }
    const next = nextRetry(attempt.reconciliation_attempts);
    await query(
      `UPDATE pd_payment_attempt
       SET reconciliation_status = 'queued',
           next_reconciliation_at = $2,
           last_reconciliation_error = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [attempt.id, next, errorMessage.slice(0, 1000)],
    );
    await enqueuePaymentReconciliation(attempt.id, next).catch((err) => {
      logger.error({ err, attempt_id: attempt.id }, 'Failed to enqueue payment reconciliation retry');
    });
  }

  private async markManualReview(attemptId: string, reason: string): Promise<void> {
    await query(
      `UPDATE pd_payment_attempt
       SET reconciliation_status = 'manual_review',
           compensation_status = CASE
             WHEN compensation_status = 'pending' THEN 'manual_review'
             ELSE compensation_status
           END,
           last_reconciliation_error = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [attemptId, reason.slice(0, 1000)],
    );
  }

  private async markProviderFailed(attempt: ReconciliationAttempt, reason: string): Promise<void> {
    await query(
      `UPDATE pd_payment_attempt
       SET status = 'initialization_failed',
           provider_state = 'created',
           reconciliation_status = 'resolved',
           compensation_status = 'pending',
           compensation_reason = $2,
           failure_code = $3,
           failure_message = $2,
           updated_at = NOW()
       WHERE id = $1 AND status != 'captured'`,
      [attempt.id, reason, PdErrorCode.PAY_INIT_FAILED],
    );
  }

  async compensateAttempt(attemptId: string): Promise<'completed' | 'manual_review' | 'missing'> {
    const attempt = await transaction(async (client) => {
      const { rows } = await client.query<{ order_id: string; compensation_status: string }>(
        `SELECT order_id, compensation_status
         FROM pd_payment_attempt
         WHERE id = $1 AND status = 'initialization_failed'
         FOR UPDATE`,
        [attemptId],
      );
      const locked = rows[0];
      if (!locked || locked.compensation_status === 'completed') return locked;
      await client.query(
        `UPDATE pd_payment_attempt
         SET compensation_status = 'pending', updated_at = NOW()
         WHERE id = $1`,
        [attemptId],
      );
      return locked;
    });
    if (!attempt) return 'missing';
    if (attempt.compensation_status === 'completed') return 'completed';
    try {
      const result = await orderService.cancelUnstartedPaymentOrder(
        attempt.order_id,
        'Payment provider confirmed that the payment session failed',
        attemptId,
      );
      if (result === 'cancelled' || result === 'already_paid' || result === 'active_attempt') {
        const completed = result === 'cancelled' || result === 'already_paid';
        await query(
          `UPDATE pd_payment_attempt
           SET compensation_status = $2,
               compensated_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE compensated_at END,
               compensation_reason = $3,
               updated_at = NOW()
           WHERE id = $1`,
          [attemptId, completed ? 'completed' : 'manual_review', `compensation:${result}`],
        );
        return completed ? 'completed' : 'manual_review';
      }
      await this.markManualReview(attemptId, `Compensation returned ${result}`);
      return 'manual_review';
    } catch (err) {
      await query(
        `UPDATE pd_payment_attempt
         SET compensation_status = 'pending',
             compensation_reason = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [attemptId, (err as Error).message],
      );
      throw err;
    }
  }

  private async markCaptured(
    attempt: ReconciliationAttempt,
    amount: number,
  ): Promise<'captured' | 'manual_review'> {
    let outcome: 'captured' | 'not_captured';
    try {
      outcome = await transaction(async (client): Promise<'captured' | 'not_captured'> => {
        await client.query(
          'SELECT id FROM pd_order WHERE id = $1 FOR UPDATE',
          [attempt.order_id],
        );
        const { rowCount } = await client.query(
          `UPDATE pd_payment_attempt
           SET status = 'captured', provider_state = 'captured',
               reconciliation_status = 'resolved',
               compensation_status = 'not_required', updated_at = NOW()
           WHERE id = $1 AND status IN ('initialization_unknown', 'initialized')`,
          [attempt.id],
        );
        if (rowCount !== 1) {
          const { rows: currentRows } = await client.query<{ status: string }>(
            'SELECT status FROM pd_payment_attempt WHERE id = $1 FOR UPDATE',
            [attempt.id],
          );
          return currentRows[0]?.status === 'captured' ? 'captured' : 'not_captured';
        }
        await orderService.markPaidInTransaction(
          client,
          attempt.order_id,
          attempt.gateway,
          attempt.gateway_reference,
        );
        return 'captured';
      });
    } catch (err) {
      if (err instanceof PdConflictError && err.code === PdErrorCode.PAY_ALREADY_CAPTURED) {
        await this.markManualReview(
          attempt.id,
          'Payment was captured by the provider, but the order already has a different captured payment',
        );
        return 'manual_review';
      }
      await this.markManualReview(attempt.id, `Payment captured but order transition failed: ${(err as Error).message}`);
      return 'manual_review';
    }
    if (outcome === 'not_captured') {
      await this.markManualReview(
        attempt.id,
        'Provider reported a capture, but the local payment attempt did not transition to captured',
      );
      return 'manual_review';
    }
    logger.info({ attempt_id: attempt.id, order_id: attempt.order_id, amount }, 'Payment reconciliation captured attempt');
    await eventBus.emit(PdEvent.PAYMENT_CAPTURED, {
      order_id: attempt.order_id,
      gateway: attempt.gateway,
      amount,
      currency: 'TND',
      source: 'reconciliation',
    });
    return 'captured';
  }

  private async getVendorCredentials(
    orderId: string,
    gateway: PaymentGateway,
    merchantAccountId: string | null,
  ): Promise<Record<string, string> | undefined> {
    if (!merchantAccountId) return undefined;
    const { rows } = await query<{ store_id: string }>(
      `SELECT DISTINCT store_id FROM pd_order_item WHERE order_id = $1`,
      [orderId],
    );
    if (rows.length !== 1) {
      throw new PdValidationError('The direct payment attempt is no longer bound to one store');
    }
    const store = await storeService.getById(rows[0].store_id);
    if (!store.payment_config) {
      throw new PdValidationError('The payment merchant credentials are no longer available');
    }
    const credentials = decryptVendorConfig(store.payment_config);
    if (!credentials) {
      throw new PdValidationError('The payment merchant credentials are no longer available');
    }
    const currentMerchantAccount = gateway === PaymentGateway.Flouci
      ? credentials.flouci_app_token
      : gateway === PaymentGateway.Konnect
        ? credentials.konnect_receiver_wallet
        : credentials.paypal_client_id;
    if (!currentMerchantAccount || currentMerchantAccount !== merchantAccountId) {
      throw new PdValidationError('Merchant account mismatch');
    }
    return credentials;
  }
}

export const paymentReconciliationService = new PaymentReconciliationService();
