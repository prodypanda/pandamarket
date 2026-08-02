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
import { pdId } from '../utils/crypto';
import { PdConflictError, PdErrorCode, PdValidationError } from '../errors';
import { platformConfigService, type PlatformSettings } from './platform-config.service';
import { adsService } from './ads.service';
import { toMinorUnits } from '../utils/money';

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
  ): Promise<PaymentInitResult> {
    const platformSettings = await platformConfigService.getSettings();
    this.assertGatewayEnabled(gateway, platformSettings);
    const provider = getPaymentProvider(gateway);

    // Determine if this store uses direct payment (Pro+ with own credentials)
    let vendorCredentials: Record<string, string> | undefined;
    const storeIds = await this.getStoreIdsForOrder(order.id);
    if (platformSettings.payment_vendor_direct_enabled && storeIds.length === 1) {
      // Single-vendor order — check for direct payment config
      const store = await storeService.getById(storeIds[0]);
      if (store.payment_config) {
        const decrypted = decryptVendorConfig(store.payment_config);
        if (decrypted) vendorCredentials = decrypted;
      }
    }

    if (platformSettings.payment_platform_credentials_source === 'vendor_direct_only' && !vendorCredentials) {
      throw new PdValidationError('This payment gateway requires vendor direct credentials');
    }

    const hubDomain = config.hubDomain.startsWith('http')
      ? config.hubDomain
      : `https://${config.hubDomain}`;

    const baseOrigin = returnOrigin?.trim() ? returnOrigin.trim().replace(/\/+$/, '') : null;
    const successUrl = baseOrigin
      ? `${baseOrigin}/checkout/success?order=${order.id}`
      : `${hubDomain}/hub/checkout/success?order=${order.id}`;
    const failUrl = baseOrigin
      ? `${baseOrigin}/checkout/status?status=failed&order=${order.id}`
      : `${hubDomain}/hub/checkout?order=${order.id}&status=failed`;

    const result = await provider.init({
      order_id: order.id,
      amount: parseFloat(order.total),
      currency: order.currency ?? config.defaultCurrency,
      customer_email: customerEmail,
      success_url: successUrl,
      fail_url: failUrl,
      vendor_credentials: vendorCredentials,
    });

    // Store the gateway reference on the order
    await query(
      `UPDATE pd_order SET payment_reference = $2 WHERE id = $1`,
      [order.id, result.gateway_reference],
    );

    // Record the payment attempt in pd_payment_attempt table
    const attemptId = pdId('pa');
    const currency = (order.currency ?? config.defaultCurrency).toUpperCase();
    const expectedAmountMinor = toMinorUnits(parseFloat(order.total), currency).toString();
    const merchantAccountId = vendorCredentials
      ? (vendorCredentials.flouci_app_token || vendorCredentials.konnect_receiver_wallet || vendorCredentials.paypal_client_id || null)
      : null;

    await query(
      `INSERT INTO pd_payment_attempt
        (id, order_id, gateway, gateway_reference, expected_amount_minor, expected_currency, merchant_account_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'initialized')
       ON CONFLICT (gateway_reference) DO UPDATE
       SET expected_amount_minor = EXCLUDED.expected_amount_minor,
           expected_currency = EXCLUDED.expected_currency,
           merchant_account_id = EXCLUDED.merchant_account_id,
           status = 'initialized',
           updated_at = NOW()`,
      [
        attemptId,
        order.id,
        gateway,
        result.gateway_reference,
        expectedAmountMinor,
        currency,
        merchantAccountId,
      ],
    );

    logger.info(
      { order_id: order.id, gateway, reference: result.gateway_reference },
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
    this.assertGatewayEnabled(opts.gateway, platformSettings);
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

  private assertGatewayEnabled(gateway: PaymentGateway, settings: PlatformSettings) {
    const gatewayEnabled =
      gateway === PaymentGateway.Flouci
        ? settings.payment_flouci_enabled
        : gateway === PaymentGateway.Konnect
          ? settings.payment_konnect_enabled
          : gateway === PaymentGateway.PayPal
            ? settings.payment_paypal_enabled
            : gateway === PaymentGateway.ManualMandat
              ? settings.payment_mandat_enabled
              : gateway === PaymentGateway.Cod
                ? settings.payment_cod_enabled
                : false;

    if (!gatewayEnabled) {
      throw new PdValidationError('Payment gateway is disabled', { gateway });
    }
  }
}

export const paymentService = new PaymentService();
