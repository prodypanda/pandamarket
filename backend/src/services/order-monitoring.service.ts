/**
 * Order-domain monitoring sweep (audit doc 09 §C, owner decision 2026-08-30).
 *
 * Runs as a repeatable BullMQ job in the worker process. Detects regressions
 * of the fixed order-pipeline bugs, writes findings to pd_system_log and
 * notifies superadmins in-app. Alerts are deduplicated per (check, day) via a
 * Redis key so a persistent condition notifies once per day, not every sweep.
 */

import { query } from '../db/pool';
import { getRedis } from '../db/redis';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';

interface CheckResult {
  key: string;
  message: string;
  rows: Array<Record<string, unknown>>;
  severity: 'warn' | 'error';
}

const SWEEP_INTERVAL_MINUTES = 15;
const ALERT_DEDUP_HOURS = 24;

export class OrderMonitoringService {
  async sweep(): Promise<void> {
    const results = await Promise.allSettled([
      this.checkDeliveredDesync(),
      this.checkCodCaptureLeak(),
      this.checkRefundSpike(),
      this.checkRefundDebitAsymmetry(),
    ]);

    const fired: CheckResult[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) fired.push(r.value);
    }
    if (fired.length === 0) return;

    for (const check of fired) {
      await this.recordAndNotify(check);
    }
    logger.warn(
      { checks: fired.map((c) => ({ key: c.key, count: c.rows.length })) },
      'Order monitoring sweep fired alerts',
    );
  }

  /**
   * Alert 1: fulfillments delivered while the order never reached a terminal
   * status — propagation regression (P0-1 class) or a genuinely stuck order.
   */
  private async checkDeliveredDesync(): Promise<CheckResult | null> {
    const { rows } = await query<{ id: string; status: string; delivered_at: Date }>(
      `SELECT o.id, o.status, f.delivered_at
       FROM pd_order o
       JOIN pd_fulfillment f ON f.order_id = o.id
       WHERE f.status = 'delivered'
         AND o.status NOT IN ('delivered', 'refunded', 'cancelled')
         AND f.delivered_at < NOW() - INTERVAL '24 hours'`,
    );
    if (rows.length === 0) return null;
    return {
      key: 'delivered_desync',
      severity: 'error',
      message: `${rows.length} delivered fulfillment(s) whose order is still non-terminal after 24h`,
      rows: rows.map((r) => ({ order: r.id, status: r.status, delivered_at: r.delivered_at })),
    };
  }

  /**
   * Alert 2: COD orders fully delivered without a wallet credit — missed COD
   * capture (P0-1 money class).
   */
  private async checkCodCaptureLeak(): Promise<CheckResult | null> {
    const { rows } = await query<{ id: string; payment_status: string }>(
      `SELECT o.id, o.payment_status
       FROM pd_order o
       WHERE o.payment_gateway = 'cod'
         AND o.payment_status <> 'captured'
         AND o.status NOT IN ('cancelled', 'refunded')
         AND NOT EXISTS (
           SELECT 1 FROM pd_fulfillment f
           WHERE f.order_id = o.id AND f.status IN ('pending', 'preparing', 'shipped')
         )
         AND EXISTS (
           SELECT 1 FROM pd_fulfillment f
           WHERE f.order_id = o.id AND f.status = 'delivered'
         )
         AND o.updated_at < NOW() - INTERVAL '2 hours'`,
    );
    if (rows.length === 0) return null;
    return {
      key: 'cod_capture_leak',
      severity: 'error',
      message: `${rows.length} fully-delivered COD order(s) with payment never captured`,
      rows: rows.map((r) => ({ order: r.id, payment_status: r.payment_status })),
    };
  }

  /**
   * Alert 3: refund-processing spike per store per day — flags abuse while
   * permanent controls settle (F-5/F-6 class).
   */
  private async checkRefundSpike(): Promise<CheckResult | null> {
    const { rows } = await query<{ store_id: string; count: string; total: string }>(
      `SELECT store_id, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total
       FROM pd_store_order_refund
       WHERE status = 'processed'
         AND updated_at >= NOW() - INTERVAL '24 hours'
       GROUP BY store_id
       HAVING COUNT(*) >= 5 OR COALESCE(SUM(amount), 0) >= 500`,
    );
    if (rows.length === 0) return null;
    return {
      key: 'refund_spike',
      severity: 'warn',
      message: `${rows.length} store(s) with unusual refund activity in 24h`,
      rows: rows.map((r) => ({ store: r.store_id, refunds: r.count, total_tnd: r.total })),
    };
  }

  /**
   * Alert 4: refunds that debited more than the net credited for the same
   * order — commission-aware debit regression (P0-5 class).
   */
  private async checkRefundDebitAsymmetry(): Promise<CheckResult | null> {
    const { rows } = await query<{ order_id: string; store_id: string; debited: string; credited: string }>(
      `SELECT r.order_id, r.store_id,
              COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'refund'), 0)::text AS debited,
              COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'sale'), 0)::text AS credited
       FROM pd_store_order_refund r
       JOIN pd_wallet_transaction w ON w.order_id = r.order_id AND w.type IN ('sale', 'refund')
       WHERE r.status = 'processed'
         AND r.updated_at >= NOW() - INTERVAL '7 days'
       GROUP BY r.order_id, r.store_id
       HAVING COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'refund'), 0)
              > COALESCE(SUM(w.amount) FILTER (WHERE w.type = 'sale'), 0) + 0.01`,
    );
    if (rows.length === 0) return null;
    return {
      key: 'refund_debit_asymmetry',
      severity: 'error',
      message: `${rows.length} refund(s) debiting more than the wallet was credited for the same order`,
      rows: rows.map((r) => ({ order: r.order_id, store: r.store_id, debited: r.debited, credited: r.credited })),
    };
  }

  private async recordAndNotify(check: CheckResult): Promise<void> {
    // Once per 24h per check
    try {
      const redis = getRedis();
      const dedupKey = `pd:monitor:${check.key}:${new Date().toISOString().slice(0, 13)}`;
      const seen = await redis.get(dedupKey).catch(() => null);
      if (seen) return;
      await redis.setex(dedupKey, ALERT_DEDUP_HOURS * 3600, '1').catch(() => {});
    } catch {
      // Redis unavailable: proceed un-deduplicated rather than dropping alerts
    }

    // System log entry
    try {
      await query(
        `INSERT INTO pd_system_log (id, level, source, event_type, message, metadata)
         VALUES ($1, $2, 'order-monitoring', $3, $4, $5::jsonb)`,
        [
          pdId('syslog'),
          check.severity,
          `order_monitoring.${check.key}`,
          check.message,
          JSON.stringify({ findings: check.rows.slice(0, 50), check: check.key }),
        ],
      );
    } catch (err) {
      logger.error({ err, check: check.key }, 'Monitoring system-log write failed');
    }

    // In-app notification to admins
    try {
      const { rows: admins } = await query<{ id: string }>(
        `SELECT id FROM pd_user WHERE role IN ('admin', 'super_admin')`,
      );
      for (const admin of admins) {
        await notificationService.create({
          user_id: admin.id,
          type: 'monitoring_alert',
          title: 'Alerte commande',
          message: check.message,
          data: { check: check.key, sample: check.rows.slice(0, 10) },
        });
      }
    } catch (err) {
      logger.warn({ err, check: check.key }, 'Monitoring admin notification failed');
    }
  }
}

export const orderMonitoringService = new OrderMonitoringService();
export const ORDER_MONITORING_SWEEP_INTERVAL_MINUTES = SWEEP_INTERVAL_MINUTES;
