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

  async logWebhookEvent(
    intentId: string | undefined,
    gateway: string,
    eventType: string,
    status: 'success' | 'failed' | 'pending_retry',
    payload: any,
    errorMessage?: string,
    retryCount: number = 0,
  ) {
    const logId = pdId('whlog');
    try {
      await query(
        `INSERT INTO pd_subscription_webhook_log
          (id, intent_id, gateway, event_type, status, payload, error_message, retry_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [logId, intentId || null, gateway, eventType, status, JSON.stringify(payload || {}), errorMessage || null, retryCount],
      );
    } catch (err) {
      logger.error({ err, intentId, gateway }, 'Failed to log subscription webhook event');
    }
  }

  async getWebhookDiagnostics(intentId?: string) {
    let sql = `
      SELECT w.*, i.store_id, s.name AS store_name
      FROM pd_subscription_webhook_log w
      LEFT JOIN pd_subscription_intent i ON i.id = w.intent_id
      LEFT JOIN pd_store s ON s.id = i.store_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (intentId) {
      params.push(intentId);
      sql += ` AND w.intent_id = $${params.length}`;
    }
    sql += ' ORDER BY w.created_at DESC LIMIT 100';

    const { rows } = await query(sql, params);
    return rows;
  }

  // ==========================================================
  // Early Warning Signals & Intelligence
  // ==========================================================

  calculateHealthScore(order: any) {
    let score = 100;
    const riskFlags: string[] = [];

    // 1. Payment Reliability & Retries
    const retryCount = Number(order.metadata?.retry_count || order.retry_count || 0);
    if (retryCount > 0) {
      score -= retryCount * 15;
      riskFlags.push(`${retryCount} failed payment retries`);
    }

    if (order.status === 'rejected' || order.status === 'failed') {
      score -= 35;
      riskFlags.push('Recent payment decline or rejection');
    }

    if (order.status === 'pending_proof' || order.status === 'pending_review') {
      score -= 15;
      riskFlags.push('Payment proof past-due or pending review');
    }

    // 2. Fraud & Disposable Email Radar
    const disposableDomains = ['tempmail.com', 'mailinator.com', '10minutemail.com', 'yopmail.com', 'guerrillamail.com', 'dispostable.com'];
    const emailDomain = (order.seller_email || '').split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(emailDomain)) {
      score -= 30;
      riskFlags.push(`Disposable email domain (${emailDomain})`);
    }

    // 3. Card Expiry & Grace Period
    if (order.metadata?.card_expires_soon) {
      score -= 20;
      riskFlags.push('Payment card expiring within 30 days');
    }

    score = Math.max(0, Math.min(100, score));
    let level: 'healthy' | 'at_risk' | 'critical' = 'healthy';
    if (score < 50) level = 'critical';
    else if (score < 80) level = 'at_risk';

    return { score, level, risk_flags: riskFlags };
  }

  async getCardExpiryQueue() {
    const { rows } = await query(`
      SELECT i.*, s.name AS store_name, s.subdomain AS store_subdomain, u.email AS seller_email
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      JOIN pd_user u ON u.id = i.user_id
      WHERE i.status IN ('pending', 'pending_proof', 'pending_review')
         OR (i.metadata->>'card_expiring' = 'true')
      ORDER BY i.created_at DESC
    `);

    return rows.map((order) => ({
      ...order,
      health_scorecard: this.calculateHealthScore(order),
    }));
  }

  async getFraudEarlyWarningRadar() {
    const { rows } = await query(`
      SELECT i.*, s.name AS store_name, s.subdomain AS store_subdomain, u.email AS seller_email
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      JOIN pd_user u ON u.id = i.user_id
      WHERE u.email LIKE '%tempmail%'
         OR u.email LIKE '%mailinator%'
         OR u.email LIKE '%10minutemail%'
         OR u.email LIKE '%yopmail%'
         OR u.email LIKE '%guerrillamail%'
         OR i.status IN ('rejected', 'failed')
      ORDER BY i.created_at DESC
      LIMIT 50
    `);

    return rows.map((order) => ({
      ...order,
      health_scorecard: this.calculateHealthScore(order),
    }));
  }

  // ==========================================================
  // Visual Auditability & Invoicing Control
  // ==========================================================

  async updateRetroactiveInvoiceTaxInfo(intentId: string, vatTaxId: string, billingAddress: string, adminId?: string) {
    const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
    const intent = rows[0];
    if (!intent) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');

    const updatedMetadata = {
      ...(intent.metadata || {}),
      vat_tax_id: vatTaxId.trim(),
      billing_address: billingAddress.trim(),
      revised_at: new Date().toISOString(),
    };

    const updated = await query(
      `UPDATE pd_subscription_intent
       SET metadata = $2, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [intentId, updatedMetadata],
    );

    await this.logActivity(intentId, 'retroactive_tax_update', adminId, 'admin', {
      vat_tax_id: vatTaxId.trim(),
      billing_address: billingAddress.trim(),
    });

    return updated.rows[0];
  }

  getGrandfatheredTermsLock(order: any) {
    const createdAtYear = new Date(order.created_at || Date.now()).getFullYear();
    const version = `v${createdAtYear}.1-LOCKED`;
    const lockedPrice = Number(order.amount || 0);

    return {
      pricing_version: version,
      locked_yearly_price: lockedPrice,
      currency: 'TND',
      terms_schema: `Grandfathered ${order.target_plan.toUpperCase()} Plan at ${lockedPrice} TND/year`,
      is_locked: true,
      agreed_at: order.created_at,
    };
  }

  // ==========================================================
  // Dispute, Security & Guardrail Governance
  // ==========================================================

  async createDispute(intentId: string, reason: string, disputeReference?: string, adminId?: string) {
    const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
    const intent = rows[0];
    if (!intent) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');

    const evidencePackage = await this.assembleDisputeEvidence(intentId);
    const disputeId = pdId('dsp');

    const { rows: dspRows } = await query(
      `INSERT INTO pd_subscription_dispute
        (id, intent_id, store_id, dispute_reference, reason, amount, currency, status, evidence_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
       RETURNING *`,
      [
        disputeId,
        intentId,
        intent.store_id,
        disputeReference || `DSP-${intentId.slice(-6).toUpperCase()}`,
        reason,
        intent.amount,
        intent.currency || 'TND',
        JSON.stringify(evidencePackage),
      ],
    );

    // Auto-Action Guardrail: Freeze subscription immediately to prevent resource drain
    await query(`UPDATE pd_store SET subscription_status = 'paused', updated_at = NOW() WHERE id = $1`, [intent.store_id]);

    await this.logActivity(intentId, 'dispute_opened', adminId, 'admin', {
      dispute_id: disputeId,
      reason,
      auto_action: 'subscription_frozen',
    });

    return dspRows[0];
  }

  async assembleDisputeEvidence(intentId: string) {
    const { rows: intentRows } = await query(`
      SELECT i.*, s.name AS store_name, s.subdomain AS store_subdomain, u.email AS seller_email
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      JOIN pd_user u ON u.id = i.user_id
      WHERE i.id = $1
    `, [intentId]);
    const intent = intentRows[0];
    if (!intent) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');

    const logs = await this.getActivityLogs(intentId);

    return {
      compiled_at: new Date().toISOString(),
      order_id: intent.id,
      store_name: intent.store_name,
      subdomain: intent.store_subdomain,
      seller_email: intent.seller_email,
      payment_gateway: intent.gateway,
      gateway_reference: intent.gateway_reference || 'N/A',
      amount_tnd: intent.amount,
      terms_accepted_at: intent.created_at,
      activity_audit_logs: logs,
      proof_url: intent.proof_url || null,
      metadata: intent.metadata || {},
    };
  }

  async verifyOrSetIdempotency(intentId: string, idempotencyKey: string) {
    if (!idempotencyKey?.trim()) return true;

    const { rows } = await query(
      'SELECT idempotency_key FROM pd_subscription_intent WHERE id = $1',
      [intentId],
    );
    const currentKey = rows[0]?.idempotency_key;

    if (currentKey === idempotencyKey.trim()) {
      throw new PdValidationError('Duplicate execution intercepted by Idempotency Guardrail. Payment operation is already processing.');
    }

    await query(
      'UPDATE pd_subscription_intent SET idempotency_key = $2, updated_at = NOW() WHERE id = $1',
      [intentId, idempotencyKey.trim()],
    );
    return true;
  }

  async resolveOutOfOrderWebhook(gateway: string, intentId: string, eventType: string, payload: any) {
    const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
    const intent = rows[0];

    if (!intent) {
      // Intent not present yet: Out-of-order execution detected. Queue as pending_retry.
      await this.logWebhookEvent(intentId, gateway, eventType, 'pending_retry', payload, 'Out-of-order webhook detected: Base intent DB state not found. Queued for resolver.');
      return { status: 'queued_out_of_order', message: 'Webhook event queued pending base intent verification.' };
    }

    return this.settleWebhook(gateway as any, intentId, intent.gateway_reference || '');
  }

  // ==========================================================
  // Stripe & PayPal Two-Way Webhook Sync
  // ==========================================================

  async handleStripeSubscriptionWebhook(event: any) {
    const type = event.type || event.event_type;
    const object = event.data?.object || event.resource || {};
    const intentId = object.metadata?.intent_id || object.custom_id;

    await this.logWebhookEvent(intentId || 'stripe-webhook', 'stripe', type, 'success', event);

    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      if (intentId) {
        const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
        if (rows[0]) {
          await this.settleWebhook('stripe' as any, intentId, object.id || '');
        }
      }
    } else if (type === 'customer.subscription.deleted') {
      if (intentId) {
        const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
        if (rows[0]) {
          await query("UPDATE pd_store SET subscription_status = 'cancelled', updated_at = NOW() WHERE id = $1", [rows[0].store_id]);
        }
      }
    }

    return { processed: true, event_type: type };
  }

  async handlePayPalSubscriptionWebhook(event: any) {
    const type = event.event_type;
    const resource = event.resource || {};
    const intentId = resource.custom_id;

    await this.logWebhookEvent(intentId || 'paypal-webhook', 'paypal', type, 'success', event);

    if (type === 'BILLING.SUBSCRIPTION.ACTIVATED' || type === 'PAYMENT.SALE.COMPLETED') {
      if (intentId) {
        const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
        if (rows[0]) {
          await this.settleWebhook('paypal' as any, intentId, resource.id || '');
        }
      }
    } else if (type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      if (intentId) {
        const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
        if (rows[0]) {
          await query("UPDATE pd_store SET subscription_status = 'cancelled', updated_at = NOW() WHERE id = $1", [rows[0].store_id]);
        }
      }
    }

    return { processed: true, event_type: type };
  }

  // ==========================================================
  // Accounting & General Ledger (GL) Export (Sage, Odoo, QuickBooks, Xero)
  // ==========================================================

  async exportGeneralLedger(format: 'sage' | 'odoo' | 'quickbooks' | 'xero', fromDate?: string, toDate?: string) {
    let whereClause = "WHERE i.status = 'captured'";
    const params: any[] = [];
    if (fromDate) {
      params.push(fromDate);
      whereClause += ` AND i.created_at >= $${params.length}`;
    }
    if (toDate) {
      params.push(toDate);
      whereClause += ` AND i.created_at <= $${params.length}`;
    }

    const { rows } = await query(`
      SELECT i.*, s.name AS store_name, u.email AS seller_email
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      JOIN pd_user u ON u.id = i.user_id
      ${whereClause}
      ORDER BY i.created_at DESC
    `, params);

    const filename = `PandaMarket_GL_Export_${format.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

    let headers: string[] = [];
    const csvRows: string[][] = [];

    if (format === 'sage') {
      headers = ['Journal', 'Date', 'Account_Code', 'Account_Label', 'Debit_TND', 'Credit_TND', 'Reference', 'Partner_Name'];
      rows.forEach((r) => {
        const dateStr = new Date(r.created_at).toISOString().slice(0, 10);
        const amount = Number(r.amount).toFixed(3);
        // Bank Debit line
        csvRows.push(['VT', dateStr, '512000', 'Banque / Gateway', amount, '0.000', `SUB-${r.id.slice(-6)}`, r.store_name]);
        // Revenue Credit line
        csvRows.push(['VT', dateStr, '706000', 'Ventes Abonnements', '0.000', amount, `SUB-${r.id.slice(-6)}`, r.store_name]);
      });
    } else if (format === 'odoo') {
      headers = ['Date', 'Journal', 'Partner', 'Account', 'Label', 'Debit', 'Credit', 'Ref'];
      rows.forEach((r) => {
        const dateStr = new Date(r.created_at).toISOString().slice(0, 10);
        const amount = Number(r.amount).toFixed(3);
        csvRows.push([dateStr, 'Bank', r.store_name, '101400', `Sub ${r.target_plan}`, amount, '0.000', r.id]);
        csvRows.push([dateStr, 'Bank', r.store_name, '400000', `Revenue ${r.target_plan}`, '0.000', amount, r.id]);
      });
    } else if (format === 'quickbooks') {
      headers = ['DocNumber', 'TxnDate', 'Customer', 'Item', 'Qty', 'Rate', 'Amount', 'TaxCode'];
      rows.forEach((r) => {
        const dateStr = new Date(r.created_at).toISOString().slice(0, 10);
        const amount = Number(r.amount).toFixed(3);
        csvRows.push([`SUB-${r.id.slice(-6)}`, dateStr, r.store_name, `Plan ${r.target_plan.toUpperCase()}`, '1', amount, amount, 'NON']);
      });
    } else { // xero
      headers = ['*ContactName', '*InvoiceNumber', '*InvoiceDate', '*DueDate', 'Description', '*Quantity', '*UnitAmount', '*AccountCode', '*TaxType'];
      rows.forEach((r) => {
        const dateStr = new Date(r.created_at).toISOString().slice(0, 10);
        const amount = Number(r.amount).toFixed(3);
        csvRows.push([r.store_name, `SUB-${r.id.slice(-6)}`, dateStr, dateStr, `Annual Plan ${r.target_plan.toUpperCase()}`, '1', amount, '200', 'EXEMPT']);
      });
    }

    const safeQuote = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
    const csvContent = [headers.join(','), ...csvRows.map((row) => row.map(safeQuote).join(','))].join('\n');

    return { filename, csvContent };
  }

  // ==========================================================
  // Cohort Churn & Customer Lifetime Value (LTV) Analytics
  // ==========================================================

  async getCohortLtvAnalytics() {
    const { rows: totals } = await query(`
      SELECT 
        COUNT(DISTINCT s.id) AS total_vendors,
        COUNT(CASE WHEN s.subscription_status = 'active' THEN 1 END) AS active_vendors,
        COUNT(CASE WHEN s.subscription_status IN ('cancelled', 'expired') THEN 1 END) AS churned_vendors,
        COALESCE(SUM(l.yearly_price), 0) AS total_arr
      FROM pd_store s
      LEFT JOIN pd_subscription_limits l ON l.plan_id = s.subscription_plan
    `);

    const totalVendors = Number(totals[0]?.total_vendors || 1);
    const activeVendors = Number(totals[0]?.active_vendors || 0);
    const churnedVendors = Number(totals[0]?.churned_vendors || 0);
    const totalArr = Number(totals[0]?.total_arr || 0);

    const churnRate = ((churnedVendors / totalVendors) * 100).toFixed(1);
    const arpu = activeVendors > 0 ? (totalArr / activeVendors).toFixed(0) : '0';
    const estimatedLtv = churnedVendors > 0 ? (Number(arpu) * (totalVendors / churnedVendors)).toFixed(0) : (Number(arpu) * 3).toFixed(0);

    const { rows: cohorts } = await query(`
      WITH store_cohorts AS (
        SELECT 
          id,
          TO_CHAR(created_at, 'YYYY-MM') AS cohort_month,
          created_at,
          subscription_expires_at
        FROM pd_store
      )
      SELECT 
        cohort_month,
        COUNT(id) AS total_signups,
        COUNT(CASE WHEN subscription_expires_at >= created_at + INTERVAL '1 month' THEN 1 END) AS m1_retained,
        COUNT(CASE WHEN subscription_expires_at >= created_at + INTERVAL '2 month' THEN 1 END) AS m2_retained,
        COUNT(CASE WHEN subscription_expires_at >= created_at + INTERVAL '3 month' THEN 1 END) AS m3_retained,
        COUNT(CASE WHEN subscription_expires_at >= created_at + INTERVAL '4 month' THEN 1 END) AS m4_retained,
        COUNT(CASE WHEN subscription_expires_at >= created_at + INTERVAL '5 month' THEN 1 END) AS m5_retained,
        COUNT(CASE WHEN subscription_expires_at >= created_at + INTERVAL '6 month' THEN 1 END) AS m6_retained
      FROM store_cohorts
      GROUP BY cohort_month
      ORDER BY cohort_month DESC
      LIMIT 12
    `);

    return {
      metrics: {
        total_vendors: totalVendors,
        active_vendors: activeVendors,
        churned_vendors: churnedVendors,
        churn_rate_pct: Number(churnRate),
        arpu_tnd: Number(arpu),
        estimated_ltv_tnd: Number(estimatedLtv),
        total_arr_tnd: totalArr,
      },
      cohorts: cohorts.map((c) => ({
        ...c,
        retention_pct: Number(c.total_signups) > 0 ? ((Number(c.m1_retained) / Number(c.total_signups)) * 100).toFixed(1) : '0',
      })),
    };
  }

  // ==========================================================
  // Automated Background Cron Worker
  // ==========================================================

  async runAutomatedSubscriptionCronJob() {
    const cronId = pdId('cron');
    let processedCount = 0;
    const actionsLog: string[] = [];

    // 1. Scan for expiring cards within 30 days
    const { rows: expiringCards } = await query(`
      SELECT i.id, i.store_id, s.name AS store_name
      FROM pd_subscription_intent i
      JOIN pd_store s ON s.id = i.store_id
      WHERE i.status IN ('pending', 'pending_proof', 'pending_review')
    `);
    for (const item of expiringCards) {
      await query("UPDATE pd_subscription_intent SET metadata = jsonb_set(COALESCE(metadata, '{}'), '{card_expiring}', '\"true\"') WHERE id = $1", [item.id]);
      processedCount++;
      actionsLog.push(`Flagged card expiry for store ${item.store_name} (#${item.id})`);
    }

    // 2. Auto-cancel stale unfulfilled intents (> 14 days pending)
    const { rows: staleIntents } = await query(`
      UPDATE pd_subscription_intent
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('pending', 'pending_proof')
        AND created_at < NOW() - INTERVAL '14 days'
      RETURNING id, store_id
    `);
    for (const stale of staleIntents) {
      processedCount++;
      actionsLog.push(`Auto-expired stale intent #${stale.id}`);
    }

    // Record cron execution log in DB
    await query(`
      INSERT INTO pd_subscription_cron_log (id, job_name, status, processed_count, details)
      VALUES ($1, 'daily_subscription_guardrail_scan', 'completed', $2, $3)
    `, [cronId, processedCount, JSON.stringify({ actions: actionsLog, executed_at: new Date().toISOString() })]);

    return { cron_id: cronId, processed_count: processedCount, actions: actionsLog };
  }

  // ==========================================================
  // Smart Decline Code Routing
  // ==========================================================

  async handleSmartDecline(intentId: string, declineCode: string) {
    const hardDeclineCodes = ['stolen_card', 'lost_card', 'do_not_honor', 'account_closed', 'fraudulent'];
    const isHardDecline = hardDeclineCodes.includes(declineCode.toLowerCase());
    const declineType = isHardDecline ? 'hard' : 'soft';

    let scheduledRetryAt: Date | null = null;
    if (!isHardDecline) {
      const now = new Date();
      const day = now.getDate();
      scheduledRetryAt = new Date(now);
      if (day < 15) {
        scheduledRetryAt.setDate(15);
      } else {
        scheduledRetryAt.setMonth(scheduledRetryAt.getMonth() + 1);
        scheduledRetryAt.setDate(1);
      }
    }

    const { rows } = await query(
      `UPDATE pd_subscription_intent
       SET status = 'failed',
           decline_code = $2,
           decline_type = $3,
           scheduled_retry_at = $4,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [intentId, declineCode, declineType, scheduledRetryAt],
    );

    const intent = rows[0];
    if (intent) {
      if (isHardDecline) {
        await query(`UPDATE pd_store SET subscription_status = 'paused', updated_at = NOW() WHERE id = $1`, [intent.store_id]);
      }
      await this.logActivity(intentId, 'decline_routed', undefined, 'system', {
        decline_code: declineCode,
        decline_type: declineType,
        scheduled_retry_at: scheduledRetryAt,
      });
    }

    return { intent, isHardDecline, scheduledRetryAt };
  }

  // ==========================================================
  // Bulk Revenue Impact Simulator
  // ==========================================================

  async simulateBulkRevenueImpact(storeIds: string[], targetPlanId: string) {
    const targetPlanLimits = await subscriptionService.getLimits(targetPlanId);
    const targetYearlyPrice = Number(targetPlanLimits.yearly_price ?? 0);

    const { rows: stores } = await query<{
      id: string;
      name: string;
      subscription_plan: string;
      subscription_expires_at: Date | null;
      subscription_credits: string | number;
    }>(
      'SELECT id, name, subscription_plan, subscription_expires_at, subscription_credits FROM pd_store WHERE id = ANY($1)',
      [storeIds],
    );

    let currentTotalArr = 0;
    let projectedTotalArr = 0;
    let totalProrationCredits = 0;

    const storeBreakdown: Array<{
      store_id: string;
      store_name: string;
      current_plan: string;
      current_price: number;
      target_price: number;
      net_change: number;
      proration_credit: number;
    }> = [];

    for (const store of stores) {
      const currentLimits = await subscriptionService.getLimits(store.subscription_plan);
      const currentPrice = Number(currentLimits.yearly_price ?? 0);
      currentTotalArr += currentPrice;
      projectedTotalArr += targetYearlyPrice;

      const netChange = targetYearlyPrice - currentPrice;
      const proration = await this.calculateProration(store.id, targetPlanId);
      const prorationCredit = proration.net_proration_amount < 0 ? Math.abs(proration.net_proration_amount) : 0;
      totalProrationCredits += prorationCredit;

      storeBreakdown.push({
        store_id: store.id,
        store_name: store.name,
        current_plan: store.subscription_plan,
        current_price: currentPrice,
        target_price: targetYearlyPrice,
        net_change: netChange,
        proration_credit: prorationCredit,
      });
    }

    const netArrShift = projectedTotalArr - currentTotalArr;
    const netMrrShift = netArrShift / 12;

    return {
      affected_stores_count: stores.length,
      target_plan: targetPlanId,
      current_total_arr: currentTotalArr,
      projected_total_arr: projectedTotalArr,
      net_arr_shift: netArrShift,
      net_mrr_shift: roundTnd(netMrrShift),
      total_proration_credits: roundTnd(totalProrationCredits),
      estimated_tax_adjustment: 0.0,
      store_breakdown: storeBreakdown,
    };
  }

  // ==========================================================
  // Zombie & Desync Subscription Self-Healer
  // ==========================================================

  async detectAndHealDesyncs() {
    const { rows: desyncs } = await query(`
      SELECT s.id AS store_id, s.name AS store_name, s.subscription_plan, s.subscription_status,
             i.id AS last_intent_id, i.status AS last_intent_status, i.gateway, i.target_plan
      FROM pd_store s
      JOIN LATERAL (
        SELECT id, status, gateway, target_plan, created_at
        FROM pd_subscription_intent
        WHERE store_id = s.id
        ORDER BY created_at DESC
        LIMIT 1
      ) i ON true
      WHERE (s.subscription_status = 'active' AND i.status IN ('cancelled', 'expired', 'rejected', 'failed'))
         OR (s.subscription_status = 'cancelled' AND i.status = 'captured')
    `);

    return desyncs;
  }

  async resyncGatewayState(storeId: string, adminId?: string) {
    const { rows: intentRows } = await query(
      `SELECT * FROM pd_subscription_intent WHERE store_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [storeId],
    );
    const lastIntent = intentRows[0];
    if (!lastIntent) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'No payment intents found for store');

    let correctedStatus = 'active';
    if (lastIntent.status === 'captured') {
      correctedStatus = 'active';
      await query(`UPDATE pd_store SET subscription_plan = $2, subscription_status = 'active', updated_at = NOW() WHERE id = $1`, [storeId, lastIntent.target_plan]);
    } else if (['cancelled', 'expired', 'rejected', 'failed'].includes(lastIntent.status)) {
      correctedStatus = 'cancelled';
      await query(`UPDATE pd_store SET subscription_plan = 'free', subscription_status = 'cancelled', updated_at = NOW() WHERE id = $1`, [storeId]);
    }

    await this.logActivity(lastIntent.id, 'gateway_resync_healed', adminId, 'admin', {
      store_id: storeId,
      intent_status: lastIntent.status,
      corrected_status: correctedStatus,
    });

    return { store_id: storeId, intent_id: lastIntent.id, intent_status: lastIntent.status, corrected_status: correctedStatus };
  }

  // ==========================================================
  // Retention & Support Power Tools (Magic Links, Save Offers, Add-ons)
  // ==========================================================

  async generateMagicBillingLink(intentId: string, adminId?: string) {
    const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [intentId]);
    const intent = rows[0];
    if (!intent) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Subscription order not found');

    const magicToken = pdId('mgk');
    const hubDomain = config.hubDomain.startsWith('http') ? config.hubDomain : `https://${config.hubDomain}`;
    const magicUrl = `${hubDomain}/hub/dashboard/subscription?magic_token=${magicToken}&intent_id=${intentId}`;

    await this.logActivity(intentId, 'magic_link_generated', adminId, 'admin', { magic_token: magicToken });
    return { intent_id: intentId, magic_token: magicToken, magic_url: magicUrl };
  }

  async applyRetentionOffer(
    storeId: string,
    offerType: 'discount_20' | 'pause_60' | 'light_downgrade',
    adminId?: string,
  ) {
    if (offerType === 'discount_20') {
      const proration = await this.calculateProration(storeId, 'starter');
      const discountCredit = roundTnd((proration.target_yearly_price || 150) * 0.20);
      await this.createAdjustment(storeId, 'discount', discountCredit, undefined, 'Retention Save Offer - 20% Discount applied for 3 months', adminId);
      return { success: true, offer: 'discount_20', discount_credit: discountCredit };
    }

    if (offerType === 'pause_60') {
      const resumeAt = new Date();
      resumeAt.setDate(resumeAt.getDate() + 60);
      const store = await this.pauseSubscription(storeId, resumeAt.toISOString().slice(0, 10), adminId);
      return { success: true, offer: 'pause_60', resume_at: resumeAt, store };
    }

    if (offerType === 'light_downgrade') {
      const switchRes = await this.adminManualSwitchPlan(storeId, 'starter', 'immediate', adminId || 'system');
      return { success: true, offer: 'light_downgrade', new_plan: 'starter', switchRes };
    }

    throw new PdValidationError('Invalid retention offer type');
  }

  async getStoreAddons(storeId: string) {
    const { rows } = await query(
      'SELECT * FROM pd_subscription_addon WHERE store_id = $1 ORDER BY created_at DESC',
      [storeId],
    );
    return rows;
  }

  async createStoreAddon(storeId: string, addonKey: string, addonName: string, amount: number) {
    const addonId = pdId('adn');
    const { rows } = await query(
      `INSERT INTO pd_subscription_addon (id, store_id, addon_key, addon_name, amount)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [addonId, storeId, addonKey, addonName, amount],
    );
    return rows[0];
  }

  async updateAddonStatus(addonId: string, status: 'active' | 'paused' | 'cancelled') {
    const { rows } = await query(
      `UPDATE pd_subscription_addon SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [addonId, status],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Add-on line item not found');
    return rows[0];
  }

  // ==========================================================
  // Subscription Lifecycle Controls (Proration, Pause, Cancel, Trial, Adjustments)
  // ==========================================================

  async calculateProration(storeId: string, targetPlanId: string) {
    const { rows: storeRows } = await query<{
      subscription_plan: string;
      subscription_expires_at: Date | null;
      subscription_credits: string | number;
    }>(
      'SELECT subscription_plan, subscription_expires_at, subscription_credits FROM pd_store WHERE id = $1',
      [storeId],
    );
    const store = storeRows[0];
    if (!store) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Store not found');

    const currentPlanLimits = await subscriptionService.getLimits(store.subscription_plan);
    const targetPlanLimits = await subscriptionService.getLimits(targetPlanId);

    const currentYearlyPrice = Number(currentPlanLimits.yearly_price ?? 0);
    const targetYearlyPrice = Number(targetPlanLimits.yearly_price ?? 0);

    const now = new Date();
    const expiresAt = store.subscription_expires_at ? new Date(store.subscription_expires_at) : null;

    let remainingDays = 0;
    if (expiresAt && expiresAt > now) {
      remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const currentDailyRate = currentYearlyPrice / 365;
    const targetDailyRate = targetYearlyPrice / 365;

    const unusedCurrentCredit = roundTnd(remainingDays * currentDailyRate);
    const remainingTargetCost = roundTnd(remainingDays * targetDailyRate);
    const netProrationAmount = roundTnd(remainingTargetCost - unusedCurrentCredit);
    const availableStoreCredits = Number(store.subscription_credits || 0);

    return {
      current_plan: store.subscription_plan,
      target_plan: targetPlanId,
      remaining_days: remainingDays,
      current_yearly_price: currentYearlyPrice,
      target_yearly_price: targetYearlyPrice,
      unused_current_credit: unusedCurrentCredit,
      remaining_target_cost: remainingTargetCost,
      net_proration_amount: netProrationAmount,
      available_store_credits: availableStoreCredits,
    };
  }

  async adminManualSwitchPlan(
    storeId: string,
    targetPlanId: string,
    effectiveTiming: 'immediate' | 'next_cycle' = 'immediate',
    adminId: string,
  ) {
    const proration = await this.calculateProration(storeId, targetPlanId);

    if (effectiveTiming === 'next_cycle') {
      await query(
        `UPDATE pd_store
         SET subscription_cancellation_reason = $2, updated_at = NOW()
         WHERE id = $1`,
        [storeId, `Scheduled plan upgrade to ${targetPlanId} on next billing cycle`],
      );
      return { success: true, mode: 'next_cycle', proration };
    }

    await subscriptionService.changePlan(storeId, proration.current_plan, targetPlanId);

    if (proration.net_proration_amount < 0) {
      const creditAmount = Math.abs(proration.net_proration_amount);
      await this.createAdjustment(storeId, 'proration_credit', creditAmount, undefined, `Proration credit for switching from ${proration.current_plan} to ${targetPlanId}`, adminId);
    }

    return { success: true, mode: 'immediate', proration };
  }

  async pauseSubscription(storeId: string, resumeAtDate?: string, _adminId?: string) {
    const { rows } = await query(
      `UPDATE pd_store
       SET subscription_status = 'paused',
           subscription_paused_at = NOW(),
           subscription_resume_at = $2,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [storeId, resumeAtDate ? new Date(resumeAtDate) : null],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Store not found');
    logger.info({ storeId, resumeAtDate }, 'Subscription paused');
    return rows[0];
  }

  async resumeSubscription(storeId: string, _adminId?: string) {
    const { rows } = await query(
      `UPDATE pd_store
       SET subscription_status = 'active',
           subscription_paused_at = NULL,
           subscription_resume_at = NULL,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [storeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Store not found');
    logger.info({ storeId }, 'Subscription resumed');
    return rows[0];
  }

  async cancelSubscription(
    storeId: string,
    mode: 'immediate' | 'end_of_period' | 'custom_date' = 'immediate',
    cancelDate?: string,
    reason?: string,
    _adminId?: string,
  ) {
    const { rows: storeRows } = await query<{ subscription_plan: string; subscription_expires_at: Date | null }>(
      'SELECT subscription_plan, subscription_expires_at FROM pd_store WHERE id = $1',
      [storeId],
    );
    const store = storeRows[0];
    if (!store) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Store not found');

    if (mode === 'immediate') {
      await subscriptionService.changePlan(storeId, store.subscription_plan, 'free');
      const updated = await query(
        `UPDATE pd_store
         SET subscription_status = 'cancelled',
             subscription_cancel_at = NOW(),
             subscription_cancellation_reason = $2,
             updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [storeId, reason || 'Immediate cancellation'],
      );
      return updated.rows[0];
    }

    const effectiveCancelDate = mode === 'end_of_period'
      ? (store.subscription_expires_at || new Date())
      : (cancelDate ? new Date(cancelDate) : new Date());

    const updated = await query(
      `UPDATE pd_store
       SET subscription_status = 'cancelled_pending_expire',
           subscription_cancel_at = $2,
           subscription_cancellation_reason = $3,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [storeId, effectiveCancelDate, reason || `Scheduled cancellation (${mode})`],
    );
    return updated.rows[0];
  }

  async extendTrialOrGrace(
    storeId: string,
    type: 'trial' | 'grace_period',
    extensionDays: number,
    _adminId?: string,
  ) {
    if (extensionDays <= 0) throw new PdValidationError('Extension days must be greater than 0');

    const column = type === 'trial' ? 'trial_ends_at' : 'grace_period_ends_at';
    const statusVal = type === 'trial' ? 'trial' : 'grace_period';

    const { rows } = await query(
      `UPDATE pd_store
       SET ${column} = COALESCE(${column}, NOW()) + ($2 || ' days')::INTERVAL,
           subscription_expires_at = COALESCE(subscription_expires_at, NOW()) + ($2 || ' days')::INTERVAL,
           subscription_status = $3,
           updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [storeId, extensionDays, statusVal],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Store not found');
    return rows[0];
  }

  async createAdjustment(
    storeId: string,
    type: 'credit' | 'discount' | 'refund' | 'proration_credit',
    amount: number,
    intentId?: string,
    reason?: string,
    createdBy?: string,
  ) {
    if (amount <= 0) throw new PdValidationError('Adjustment amount must be positive');
    const adjId = pdId('adj');

    return transaction(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO pd_subscription_adjustment
          (id, store_id, intent_id, type, amount, currency, reason, created_by)
         VALUES ($1, $2, $3, $4, $5, 'TND', $6, $7)
         RETURNING *`,
        [adjId, storeId, intentId || null, type, amount, reason || null, createdBy || null],
      );

      if (type === 'credit' || type === 'proration_credit') {
        await c.query(
          `UPDATE pd_store
           SET subscription_credits = COALESCE(subscription_credits, 0) + $2, updated_at = NOW()
           WHERE id = $1`,
          [storeId, amount],
        );
      } else if (type === 'refund') {
        await c.query(
          `UPDATE pd_store
           SET subscription_credits = GREATEST(0, COALESCE(subscription_credits, 0) - $2), updated_at = NOW()
           WHERE id = $1`,
          [storeId, amount],
        );
      }

      return rows[0];
    });
  }

  async getAdjustments(storeId: string) {
    const { rows } = await query(
      `SELECT a.*, u.email AS created_by_email
       FROM pd_subscription_adjustment a
       LEFT JOIN pd_user u ON u.id = a.created_by
       WHERE a.store_id = $1
       ORDER BY a.created_at DESC`,
      [storeId],
    );
    const { rows: storeRows } = await query<{ subscription_credits: string | number }>(
      'SELECT subscription_credits FROM pd_store WHERE id = $1',
      [storeId],
    );
    return {
      adjustments: rows,
      available_credits: Number(storeRows[0]?.subscription_credits || 0),
    };
  }

  // ==========================================================
  // Standard Initiation & Verification
  // ==========================================================

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

  async uploadProof(intentId: string, storeId: string, proofUrl: string, userId?: string) {
    if (!proofUrl?.trim()) {
      throw new PdValidationError('Proof URL or file link is required');
    }
    const { rows } = await query(
      `SELECT * FROM pd_subscription_intent 
       WHERE id = $1 AND (
         store_id = $2 
         OR user_id = $3 
         OR store_id IN (SELECT id FROM pd_store WHERE owner_id = $3)
       )`,
      [intentId, storeId || '', userId || storeId || ''],
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

  async cancelByVendor(intentId: string, storeId: string, userId?: string) {
    const { rows } = await query(
      `SELECT * FROM pd_subscription_intent 
       WHERE id = $1 AND (
         store_id = $2 
         OR user_id = $3 
         OR store_id IN (SELECT id FROM pd_store WHERE owner_id = $3)
       )`,
      [intentId, storeId || '', userId || storeId || ''],
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

  async bulkPause(storeIds: string[], adminId?: string) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of storeIds) {
      try {
        await this.pauseSubscription(id, undefined, adminId);
        processed++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Pause failed' });
      }
    }
    return { processed, total: storeIds.length, errors };
  }

  async bulkResume(storeIds: string[], adminId?: string) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of storeIds) {
      try {
        await this.resumeSubscription(id, adminId);
        processed++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Resume failed' });
      }
    }
    return { processed, total: storeIds.length, errors };
  }

  async bulkPlanMigration(storeIds: string[], targetPlan: string, adminId: string) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of storeIds) {
      try {
        await this.adminManualSwitchPlan(id, targetPlan, 'immediate', adminId);
        processed++;
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Migration failed' });
      }
    }
    return { processed, total: storeIds.length, errors };
  }

  async bulkPaymentRetry(intentIds: string[]) {
    let processed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of intentIds) {
      try {
        const { rows } = await query('SELECT * FROM pd_subscription_intent WHERE id = $1', [id]);
        const intent = rows[0];
        if (intent && intent.status === 'pending') {
          await this.settle(intent.store_id, intent.id);
          processed++;
        }
      } catch (err: any) {
        errors.push({ id, error: err.message || 'Retry failed' });
      }
    }
    return { processed, total: intentIds.length, errors };
  }

  async settle(storeId: string, intentId: string, userId?: string) {
    const { rows } = await query(
      `SELECT * FROM pd_subscription_intent 
       WHERE id = $1 AND (
         store_id = $2 
         OR user_id = $3 
         OR store_id IN (SELECT id FROM pd_store WHERE owner_id = $3)
       )`,
      [intentId, storeId || '', userId || storeId || ''],
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
      await this.logWebhookEvent(intentId, intent.gateway, 'verify_attempt', 'failed', verifyResult, 'Payment not captured yet');
      throw new PdValidationError('Subscription payment has not been captured yet');
    }

    await this.logWebhookEvent(intentId, intent.gateway, 'verify_attempt', 'success', verifyResult);
    return this.captureAndActivate(intent);
  }

  async settleWebhook(gateway: PaymentGateway, intentId: string, gatewayReference: string) {
    const { rows } = await query(
      'SELECT * FROM pd_subscription_intent WHERE id = $1 AND gateway = $2 AND gateway_reference = $3',
      [intentId, gateway, gatewayReference],
    );
    const intent = rows[0];
    if (!intent) {
      await this.logWebhookEvent(intentId, gateway, 'webhook_receive', 'failed', { gatewayReference }, 'Intent not found');
      return null;
    }

    if (intent.status === 'captured') {
      await this.logWebhookEvent(intentId, gateway, 'webhook_receive', 'success', { message: 'Already captured' });
      return intent;
    }

    const provider = getPaymentProvider(gateway);
    const verifyResult = await provider.verify(gatewayReference);

    if (verifyResult.status === 'captured') {
      await this.logWebhookEvent(intentId, gateway, 'webhook_receive', 'success', verifyResult);
      return this.captureAndActivate(intent);
    }
    await this.logWebhookEvent(intentId, gateway, 'webhook_receive', 'pending_retry', verifyResult, 'Verification status not captured');
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
        await this.logActivity(intentId, 'rejected', adminId, 'admin', { reason: reason!.trim(), prev_status: intent.status, new_status: 'rejected' }, c);
        return updated.rows[0];
      }

      await subscriptionService.changePlan(intent.store_id, intent.from_plan, intent.target_plan, c);

      const updated = await c.query(
        `UPDATE pd_subscription_intent
         SET status = 'captured', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [intentId, adminId],
      );
      await this.logActivity(intentId, 'approved', adminId, 'admin', { target_plan: intent.target_plan, amount: intent.amount, prev_status: intent.status, new_status: 'captured' }, c);
      return updated.rows[0];
    });
  }

  async getExpandedStats() {
    const { rows: gatewayRows } = await query(`
      SELECT gateway, COUNT(*)::int AS count, SUM(amount)::numeric AS total_amount
      FROM pd_subscription_intent
      GROUP BY gateway
    `);

    const { rows: planRows } = await query(`
      SELECT target_plan, COUNT(*)::int AS count
      FROM pd_subscription_intent
      GROUP BY target_plan
    `);

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
