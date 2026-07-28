import { PaymentGateway } from '@pandamarket/types';
import { getPaymentProvider } from '../plugins/payment';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { roundTnd } from '../utils/money';
import { config } from '../config';
import { PdNotFoundError, PdValidationError, PdErrorCode } from '../errors';
import { subscriptionService } from './subscription.service';
import { platformConfigService } from './platform-config.service';
import { logger } from '../utils/logger';

export class SubscriptionPaymentService {
  async initiate(opts: {
    storeId: string;
    userId: string;
    userEmail: string;
    gateway: PaymentGateway;
    targetPlan: string;
    proofUrl?: string;
  }) {
    const limits = await subscriptionService.assertPlanIsEnabled(opts.targetPlan);
    const yearlyPrice = Number(limits.yearly_price ?? 0);
    const settings = await platformConfigService.getSettings();

    const { rows: storeRows } = await query<{ subscription_plan: string }>(
      'SELECT subscription_plan FROM pd_store WHERE id = $1',
      [opts.storeId],
    );
    const currentPlan = storeRows[0]?.subscription_plan || 'free';

    if (currentPlan === opts.targetPlan) {
      throw new PdValidationError('Store is already on this plan');
    }

    // Free plan -> activate immediately without payment
    if (yearlyPrice === 0 || opts.targetPlan === 'free') {
      await subscriptionService.changePlan(opts.storeId, currentPlan, 'free');
      return { free: true, plan: 'free', message: 'Free plan activated successfully' };
    }

    const amount = roundTnd(yearlyPrice);
    const intentId = pdId('subint');
    const hubDomain = config.hubDomain.startsWith('http')
      ? config.hubDomain
      : `https://${config.hubDomain}`;

    const instructions = {
      recipient_name: (settings.mandat_recipient_name as string) || 'PandaMarket SARL',
      recipient_cin: (settings.mandat_recipient_cin as string) || '',
      recipient_city: (settings.mandat_recipient_city as string) || 'Tunis',
      bank_name: (settings.mandat_bank_name as string) || 'STB',
      bank_rib: (settings.mandat_bank_rib as string) || '',
      proof_email: (settings.mandat_proof_email as string) || 'billing@pandamarket.tn',
      amount,
      reference: `SUB-${intentId.slice(-8).toUpperCase()}`,
    };

    if (opts.gateway === PaymentGateway.ManualMandat) {
      const initialStatus = opts.proofUrl ? 'pending_review' : 'pending_proof';
      const result = await query(
        `INSERT INTO pd_subscription_intent
          (id, store_id, user_id, from_plan, target_plan, amount, currency, gateway, status, proof_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, 'TND', 'manual_mandat', $7, $8, $9)
         RETURNING *`,
        [intentId, opts.storeId, opts.userId, currentPlan, opts.targetPlan, amount, initialStatus, opts.proofUrl || null, { instructions }],
      );
      return {
        free: false,
        intent: result.rows[0],
        pending_review: Boolean(opts.proofUrl),
        pending_proof: !opts.proofUrl,
        instructions,
      };
    }

    // Initialize online payment via selected gateway (Flouci, Konnect, PayPal, COD)
    await query(
      `INSERT INTO pd_subscription_intent
        (id, store_id, user_id, from_plan, target_plan, amount, currency, gateway, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'TND', $7, 'pending', $8)`,
      [intentId, opts.storeId, opts.userId, currentPlan, opts.targetPlan, amount, opts.gateway, { instructions }],
    );

    try {
      const provider = getPaymentProvider(opts.gateway);
      const result = await provider.init({
        order_id: intentId,
        amount,
        currency: 'TND',
        customer_email: opts.userEmail,
        success_url: `${hubDomain}/hub/dashboard/subscription?success=true&intent_id=${intentId}`,
        fail_url: `${hubDomain}/hub/dashboard/subscription?error=failed&intent_id=${intentId}`,
      });

      const updated = await query(
        `UPDATE pd_subscription_intent
         SET gateway_reference = $2, checkout_url = $3, metadata = metadata || $4, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [intentId, result.gateway_reference, result.redirect_url, JSON.stringify(result.metadata || {})],
      );

      return {
        free: false,
        checkout_url: result.redirect_url,
        gateway_reference: result.gateway_reference,
        intent: updated.rows[0],
        instructions,
      };
    } catch (err) {
      await query(
        `UPDATE pd_subscription_intent SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [intentId],
      );
      throw err;
    }
  }

  async uploadProof(intentId: string, storeId: string, proofUrl: string) {
    if (!proofUrl?.trim()) {
      throw new PdValidationError('Proof URL or file link is required');
    }
    const { rows } = await query(
      'SELECT * FROM pd_subscription_intent WHERE id = $1 AND store_id = $2',
      [intentId, storeId],
    );
    const intent = rows[0];
    if (!intent) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription intent not found');
    }

    const updated = await query(
      `UPDATE pd_subscription_intent
       SET proof_url = $2, status = 'pending_review', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [intentId, proofUrl.trim()],
    );
    return updated.rows[0];
  }

  async settle(storeId: string, intentId: string) {
    const { rows } = await query(
      'SELECT * FROM pd_subscription_intent WHERE id = $1 AND store_id = $2',
      [intentId, storeId],
    );
    const intent = rows[0];
    if (!intent) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription payment intent not found');
    }

    if (intent.status === 'captured') {
      return { success: true, plan: intent.target_plan, intent };
    }

    if (intent.status !== 'pending') {
      throw new PdValidationError('Subscription intent is no longer payable');
    }

    const provider = getPaymentProvider(intent.gateway as PaymentGateway);
    const verifyResult = await provider.verify(intent.gateway_reference);

    if (verifyResult.status !== 'captured') {
      throw new PdValidationError('Subscription payment has not been captured yet');
    }

    return this.captureAndActivate(intent);
  }

  async settleWebhook(gateway: PaymentGateway, intentId: string, gatewayReference: string) {
    const { rows } = await query(
      'SELECT * FROM pd_subscription_intent WHERE id = $1 AND gateway = $2 AND gateway_reference = $3',
      [intentId, gateway, gatewayReference],
    );
    const intent = rows[0];
    if (!intent) return null;

    if (intent.status === 'captured') return intent;

    const provider = getPaymentProvider(gateway);
    const verifyResult = await provider.verify(gatewayReference);

    if (verifyResult.status === 'captured') {
      return this.captureAndActivate(intent);
    }
    return null;
  }

  async reviewManual(intentId: string, adminId: string, decision: 'approved' | 'rejected', reason?: string) {
    if (decision === 'rejected' && !reason?.trim()) {
      throw new PdValidationError('Rejection reason is required when rejecting an order');
    }

    return transaction(async (c) => {
      const { rows } = await c.query(
        'SELECT * FROM pd_subscription_intent WHERE id = $1 FOR UPDATE',
        [intentId],
      );
      const intent = rows[0];
      if (!intent) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');
      }

      if (intent.status === 'captured') {
        throw new PdValidationError('Subscription order has already been captured & activated');
      }

      if (decision === 'rejected') {
        const updated = await c.query(
          `UPDATE pd_subscription_intent
           SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [intentId, adminId, reason!.trim()],
        );
        return updated.rows[0];
      }

      // Approve -> change plan immediately
      await subscriptionService.changePlan(intent.store_id, intent.from_plan, intent.target_plan, c);

      const updated = await c.query(
        `UPDATE pd_subscription_intent
         SET status = 'captured', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [intentId, adminId],
      );
      return updated.rows[0];
    });
  }

  private async captureAndActivate(intent: any) {
    return transaction(async (c) => {
      const locked = await c.query(
        'SELECT * FROM pd_subscription_intent WHERE id = $1 FOR UPDATE',
        [intent.id],
      );
      if (locked.rows[0].status === 'captured') return locked.rows[0];

      await subscriptionService.changePlan(intent.store_id, intent.from_plan, intent.target_plan, c);

      const updated = await c.query(
        `UPDATE pd_subscription_intent SET status = 'captured', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [intent.id],
      );
      logger.info(
        { store_id: intent.store_id, from: intent.from_plan, to: intent.target_plan },
        'Subscription payment captured and plan activated',
      );
      return updated.rows[0];
    });
  }
}

export const subscriptionPaymentService = new SubscriptionPaymentService();
