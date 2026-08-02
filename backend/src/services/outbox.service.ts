import { PoolClient } from 'pg';
import crypto from 'crypto';
import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface OutboxEventRow {
  id: string;
  event_type: string;
  aggregate_id: string;
  revision: number;
  payload: Record<string, unknown>;
  idempotency_key: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  next_attempt_at: Date | string;
  error: string | null;
  created_at: Date | string;
  processed_at: Date | string | null;
}

export const OutboxEventType = {
  STORE_PUBLISHED: 'store.published',
  STORE_UNPUBLISHED: 'store.unpublished',
  THEME_CHANGED: 'store.theme_changed',
  NAVIGATION_CHANGED: 'store.navigation_changed',
  FOOTER_CHANGED: 'store.footer_changed',
  PAGE_PUBLISHED: 'store.page_published',
  PAGE_UNPUBLISHED: 'store.page_unpublished',
  PRODUCT_PUBLISHED: 'store.product_published',
  PRODUCT_UNPUBLISHED: 'store.product_unpublished',
  DOMAIN_CHANGED: 'store.domain_changed',
  MAINTENANCE_CHANGED: 'store.maintenance_changed',
} as const;

export class OutboxService {
  /**
   * Enqueue a new transactional outbox event.
   * Can be executed within a database transaction client (`client`).
   */
  async enqueueEvent(opts: {
    client?: PoolClient;
    eventType: string;
    storeId: string;
    payload: Record<string, unknown>;
    revision?: number;
  }): Promise<OutboxEventRow> {
    const { client, eventType, storeId, payload } = opts;

    // Determine next revision for this aggregate
    const revision = opts.revision ?? (await this.getNextRevision(storeId, client));

    // Generate deterministic idempotency key
    const payloadHash = crypto
      .createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex')
      .substring(0, 12);
    const idempotencyKey = `${eventType}:${storeId}:${revision}:${payloadHash}`;

    const id = pdId('outbox');
    const sql = `
      INSERT INTO pd_outbox_event (
        id, event_type, aggregate_id, revision, payload, idempotency_key, status
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'pending')
      ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW()
      RETURNING *`;
    const params = [id, eventType, storeId, revision, JSON.stringify(payload), idempotencyKey];

    const res = client ? await client.query<OutboxEventRow>(sql, params) : await query<OutboxEventRow>(sql, params);

    logger.info(
      { outbox_id: id, event_type: eventType, store_id: storeId, revision },
      'Enqueued transactional outbox event',
    );

    return res.rows[0];
  }

  /**
   * Get next revision number for a store's outbox history.
   */
  async getNextRevision(storeId: string, client?: PoolClient): Promise<number> {
    const sql = `SELECT COALESCE(MAX(revision), 0) + 1 AS next_rev FROM pd_outbox_event WHERE aggregate_id = $1`;
    const params = [storeId];
    const res = client ? await client.query<{ next_rev: string }>(sql, params) : await query<{ next_rev: string }>(sql, params);
    return parseInt(res.rows[0]?.next_rev || '1', 10);
  }

  /**
   * Resolve all hostnames (subdomain + custom domains) associated with a store.
   */
  async getStoreHostnames(storeId: string): Promise<string[]> {
    const hostnames = new Set<string>();

    // 1. Subdomain from pd_store
    const storeRes = await query<{ subdomain: string | null; custom_domain: string | null }>(
      'SELECT subdomain, custom_domain FROM pd_store WHERE id = $1',
      [storeId],
    );
    if (storeRes.rows[0]?.subdomain) {
      const hubDomain = config.hubDomain || 'pandamarket.tn';
      hostnames.add(`${storeRes.rows[0].subdomain}.${hubDomain}`);
      hostnames.add(storeRes.rows[0].subdomain);
    }
    if (storeRes.rows[0]?.custom_domain) {
      hostnames.add(storeRes.rows[0].custom_domain);
    }

    // 2. Verified custom domains from pd_store_domain
    try {
      const domainsRes = await query<{ hostname: string }>(
        `SELECT hostname FROM pd_store_domain
         WHERE store_id = $1 AND verification_status = 'verified'`,
        [storeId],
      );
      for (const row of domainsRes.rows) {
        hostnames.add(row.hostname);
      }
    } catch {
      // pd_store_domain table might not exist in isolated test environments
    }

    return Array.from(hostnames);
  }

  /**
   * Fetch recent outbox events for store publishing status in seller dashboard.
   */
  async getRecentEventsForStore(storeId: string, limit = 20): Promise<OutboxEventRow[]> {
    const { rows } = await query<OutboxEventRow>(
      `SELECT * FROM pd_outbox_event
       WHERE aggregate_id = $1
       ORDER BY revision DESC, created_at DESC
       LIMIT $2`,
      [storeId, limit],
    );
    return rows;
  }
}

export const outboxService = new OutboxService();
