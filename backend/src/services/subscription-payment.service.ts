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
  async logActivity(
    intentId: string,
    action: string,
    actorId?: string,
    actorType: 'vendor' | 'admin' | 'system' = 'system',
    metadata: any = {},
    dbClient?: any,
  ) {
    const actId = pdId('act');
    const runner = dbClient || { query };
    try {
      await runner.query(
        `INSERT INTO pd_subscription_intent_activity
          (id, intent_id, action, actor_id, actor_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [actId, intentId, action, actorId || null, actorType, metadata],
      );
    } catch (err) {
      logger.error({ err, intentId, action }, 'Failed to insert subscription intent activity log');
    }
  }

  async getActivityLogs(intentId: string) {
    const { rows } = await query(
      `SELECT a.*, u.email AS actor_email
       FROM pd_subscription_intent_activity a
       LEFT JOIN pd_user u ON u.id = a.actor_id
       WHERE a.intent_id = $1
       ORDER BY a.created_at ASC`,
      [intentId],
    );
    return rows;
  }

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

    if (opts.gateway === PaymentGateway.ManualMandat || opts.gateway === PaymentGateway.Cod) {
      const initialStatus = opts.proofUrl ? 'pending_review' : 'pending_proof';
      const result = await query(
        `INSERT INTO pd_subscription_intent
          (id, store_id, user_id, from_plan, target_plan, amount, currency, gateway, status, proof_url, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, 'TND', $7, $8, $9, $10)
         RETURNING *`,
        [intentId, opts.storeId, opts.userId, currentPlan, opts.targetPlan, amount, opts.gateway, initialStatus, opts.proofUrl || null, { instructions }],
      );

      await this.logActivity(intentId, 'created', opts.userId, 'vendor', {
        from_plan: currentPlan,
        target_plan: opts.targetPlan,
        amount,
        gateway: opts.gateway,
        initial_status: initialStatus,
      });

      if (opts.proofUrl) {
        await this.logActivity(intentId, 'proof_uploaded', opts.userId, 'vendor', { proof_url: opts.proofUrl });
      }

      return {
        free: false,
        intent: result.rows[0],
        pending_review: Boolean(opts.proofUrl),
        pending_proof: !opts.proofUrl,
        instructions,
      };
    }

    // Initialize online payment via selected gateway (Flouci, Konnect, PayPal)
    await query(
      `INSERT INTO pd_subscription_intent
        (id, store_id, user_id, from_plan, target_plan, amount, currency, gateway, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'TND', $7, 'pending', $8)`,
      [intentId, opts.storeId, opts.userId, currentPlan, opts.targetPlan, amount, opts.gateway, { instructions }],
    );

    await this.logActivity(intentId, 'created', opts.userId, 'vendor', {
      from_plan: currentPlan,
      target_plan: opts.targetPlan,
      amount,
      gateway: opts.gateway,
      initial_status: 'pending',
    });

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
      await this.logActivity(intentId, 'failed', opts.userId, 'system', { error: (err as Error).message });
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

    await this.logActivity(intentId, 'proof_uploaded', intent.user_id, 'vendor', { proof_url: proofUrl.trim() });
    return updated.rows[0];
  }

  async cancelByVendor(intentId: string, storeId: string) {
    const { rows } = await query(
      'SELECT * FROM pd_subscription_intent WHERE id = $1 AND store_id = $2',
      [intentId, storeId],
    );
    const intent = rows[0];
    if (!intent) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');
    }

    if (intent.status === 'captured') {
      throw new PdValidationError('Cannot cancel an activated subscription order');
    }

    const updated = await query(
      `UPDATE pd_subscription_intent SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [intentId],
    );

    await this.logActivity(intentId, 'cancelled', intent.user_id, 'vendor', { reason: 'Vendor cancelled' });
    return updated.rows[0];
  }

  async cancelByAdmin(intentId: string, adminId: string, reason?: string) {
    const { rows } = await query(
      'SELECT * FROM pd_subscription_intent WHERE id = $1',
      [intentId],
    );
    const intent = rows[0];
    if (!intent) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');
    }

    const updated = await query(
      `UPDATE pd_subscription_intent
       SET status = 'cancelled', reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [intentId, adminId, reason || 'Cancelled by Superadmin'],
    );

    await this.logActivity(intentId, 'cancelled', adminId, 'admin', { reason: reason || 'Cancelled by Superadmin' });
    return updated.rows[0];
  }

  async deleteByAdmin(intentId: string, adminId?: string) {
    await this.logActivity(intentId, 'deleted', adminId, 'admin', { deleted_at: new Date().toISOString() });
    const { rows } = await query(
      'DELETE FROM pd_subscription_intent WHERE id = $1 RETURNING *',
      [intentId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');
    }
    return rows[0];
  }

  async bulkReview(intentIds: string[], adminId: string, decision: 'approved' | 'rejected', reason?: string) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of intentIds) {
      try {
        await this.reviewManual(id, adminId, decision, reason);
        processed++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Review failed' });
      }
    }
    return { processed, total: intentIds.length, errors };
  }

  async bulkCancel(intentIds: string[], adminId: string, reason?: string) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of intentIds) {
      try {
        await this.cancelByAdmin(id, adminId, reason);
        processed++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Cancel failed' });
      }
    }
    return { processed, total: intentIds.length, errors };
  }

  async bulkDelete(intentIds: string[], adminId?: string) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of intentIds) {
      try {
        await this.deleteByAdmin(id, adminId);
        processed++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Delete failed' });
      }
    }
    return { processed, total: intentIds.length, errors };
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
        await this.logActivity(intentId, 'rejected', adminId, 'admin', { reason: reason!.trim() }, c);
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
      await this.logActivity(intentId, 'approved', adminId, 'admin', { target_plan: intent.target_plan, amount: intent.amount }, c);
      return updated.rows[0];
    });
  }

  async getExpandedStats() {
    // Gateway breakdown
    const { rows: gatewayRows } = await query(`
      SELECT gateway, COUNT(*)::int AS count, SUM(amount)::numeric AS total_amount
      FROM pd_subscription_intent
      GROUP BY gateway
    `);

    // Target plan breakdown
    const { rows: planRows } = await query(`
      SELECT target_plan, COUNT(*)::int AS count
      FROM pd_subscription_intent
      GROUP BY target_plan
    `);

    // Revenue this month vs last month
    const { rows: revRows } = await query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN amount ELSE 0 END), 0) AS rev_this_month,
        COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW()) THEN amount ELSE 0 END), 0) AS rev_last_month,
        COUNT(*)::int AS total_intents,
        COUNT(CASE WHEN status = 'captured' THEN 1 END)::int AS captured_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected_count,
        COUNT(CASE WHEN status = 'pending_proof' THEN 1 END)::int AS pending_proof_count,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END)::int AS pending_review_count,
        AVG(CASE WHEN reviewed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (reviewed_at - created_at))/3600 END) AS avg_review_hours
      FROM pd_subscription_intent
    `);

    const stats = revRows[0] || {};
    const totalIntents = Number(stats.total_intents || 0);
    const capturedCount = Number(stats.captured_count || 0);
    const rejectedCount = Number(stats.rejected_count || 0);

    return {
      gateway_breakdown: gatewayRows,
      plan_breakdown: planRows,
      revenue_this_month: Number(stats.rev_this_month || 0),
      revenue_last_month: Number(stats.rev_last_month || 0),
      captured_count: capturedCount,
      rejected_count: rejectedCount,
      pending_proof_count: Number(stats.pending_proof_count || 0),
      pending_review_count: Number(stats.pending_review_count || 0),
      avg_review_hours: stats.avg_review_hours ? Number(Number(stats.avg_review_hours).toFixed(1)) : 0,
      conversion_rate: totalIntents > 0 ? Number(((capturedCount / totalIntents) * 100).toFixed(1)) : 0,
      rejection_rate: totalIntents > 0 ? Number(((rejectedCount / totalIntents) * 100).toFixed(1)) : 0,
    };
  }

  async cleanupStaleIntents() {
    // Mark intents as expired if pending > 48 hours or past expires_at
    const { rows } = await query(`
      UPDATE pd_subscription_intent
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('pending', 'pending_proof')
        AND (expires_at < NOW() OR created_at < NOW() - INTERVAL '48 hours')
      RETURNING id, store_id, user_id, target_plan
    `);

    for (const item of rows) {
      await this.logActivity(item.id, 'expired', undefined, 'system', { reason: 'Automated 48h stale cleanup' });
    }

    if (rows.length > 0) {
      logger.info({ expired_count: rows.length }, 'Cleaned up stale subscription payment intents');
    }
    return rows;
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
      await this.logActivity(intent.id, 'approved', undefined, 'system', { target_plan: intent.target_plan, amount: intent.amount }, c);

      logger.info(
        { store_id: intent.store_id, from: intent.from_plan, to: intent.target_plan },
        'Subscription payment captured and plan activated',
      );
      return updated.rows[0];
    });
  }
}

export const subscriptionPaymentService = new SubscriptionPaymentService();
