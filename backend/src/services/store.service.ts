/**
 * StoreService — create + manage vendor stores.
 * Also handles store resolution by hostname (for the multi-tenant frontend).
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import {
  PdConflictError,
  PdErrorCode,
  PdNotFoundError,
  PdPlanRequiredError,
  PdValidationError,
} from '../errors';
import { pdId } from '../utils/crypto';
import { isValidSubdomain } from '../utils/subdomain';
import { logger } from '../utils/logger';
import {
  IStorePaymentConfig,
  ShippingMode,
  StoreStatus,
  SubscriptionPlan,
  SubscriptionType,
  UserRole,
} from '@pandamarket/types';
import { encrypt } from '../utils/crypto';
import { walletService } from './wallet.service';
import { creditsService } from './credits.service';

export interface StoreRow {
  id: string;
  name: string;
  status: StoreStatus;
  is_verified: boolean;
  subscription_plan: SubscriptionPlan;
  subscription_type: SubscriptionType;
  subscription_expires_at: Date | null;
  subdomain: string;
  custom_domain: string | null;
  theme_id: string;
  settings: Record<string, unknown>;
  payment_config: string | null;
  shipping_mode: ShippingMode;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

export class StoreService {
  /**
   * Create a new store for a vendor user.
   * Also bootstraps wallet, credits, and updates user.role + user.store_id.
   */
  async createForUser(opts: {
    user_id: string;
    name: string;
    subdomain: string;
    plan?: SubscriptionPlan;
  }): Promise<StoreRow> {
    const subdomain = opts.subdomain.trim().toLowerCase();
    if (!isValidSubdomain(subdomain)) {
      throw new PdValidationError('Invalid subdomain', { field: 'subdomain' });
    }

    const taken = await query('SELECT 1 FROM pd_store WHERE subdomain = $1', [subdomain]);
    if (taken.rowCount && taken.rowCount > 0) {
      throw new PdConflictError(
        PdErrorCode.STORE_SUBDOMAIN_TAKEN,
        'This subdomain is already taken',
        { subdomain },
      );
    }

    return transaction(async (client) => {
      const id = pdId('store');
      const plan = opts.plan ?? SubscriptionPlan.Free;
      const subscriptionType =
        plan === SubscriptionPlan.Free ? SubscriptionType.Commission : SubscriptionType.Yearly;

      const { rows } = await client.query<StoreRow>(
        `INSERT INTO pd_store
          (id, name, subdomain, subscription_plan, subscription_type, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, opts.name, subdomain, plan, subscriptionType, opts.user_id],
      );
      const store = rows[0];

      // Promote the user to vendor and link them
      await client.query(
        'UPDATE pd_user SET role = $1, store_id = $2 WHERE id = $3',
        [UserRole.Vendor, store.id, opts.user_id],
      );

      // Bootstrap wallet & credits
      await walletService.create(store.id, client);
      await creditsService.create(store.id, plan, client);

      logger.info({ store_id: store.id, owner_id: opts.user_id, plan }, 'Store created');
      return store;
    });
  }

  async getById(id: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>('SELECT * FROM pd_store WHERE id = $1', [id]);
    const store = rows[0];
    if (!store) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found', { store_id: id });
    }
    return store;
  }

  async getBySubdomain(subdomain: string): Promise<StoreRow | null> {
    const { rows } = await query<StoreRow>(
      'SELECT * FROM pd_store WHERE subdomain = $1',
      [subdomain.toLowerCase()],
    );
    return rows[0] ?? null;
  }

  async getByCustomDomain(domain: string): Promise<StoreRow | null> {
    const { rows } = await query<StoreRow>(
      'SELECT * FROM pd_store WHERE custom_domain = $1',
      [domain.toLowerCase()],
    );
    return rows[0] ?? null;
  }

  /**
   * Resolve a store from any hostname (subdomain or custom domain).
   * Returns null if the host belongs to the central hub or admin.
   */
  async resolveByHostname(host: string, hubDomain: string): Promise<StoreRow | null> {
    const cleanHost = host.toLowerCase().split(':')[0];
    if (cleanHost === hubDomain || cleanHost === `www.${hubDomain}` || cleanHost === `admin.${hubDomain}`) {
      return null;
    }
    if (cleanHost.endsWith(`.${hubDomain}`)) {
      const subdomain = cleanHost.slice(0, -1 - hubDomain.length);
      return this.getBySubdomain(subdomain);
    }
    return this.getByCustomDomain(cleanHost);
  }

  /**
   * Update the public settings (colors, logos, social…).
   */
  async updateSettings(
    storeId: string,
    settings: Record<string, unknown>,
  ): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store SET settings = settings || $2::jsonb WHERE id = $1 RETURNING *`,
      [storeId, JSON.stringify(settings)],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async updateTheme(storeId: string, themeId: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      'UPDATE pd_store SET theme_id = $2 WHERE id = $1 RETURNING *',
      [storeId, themeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    return rows[0];
  }

  async updateCustomDomain(storeId: string, domain: string | null): Promise<StoreRow> {
    if (domain) {
      const taken = await query<{ id: string }>(
        'SELECT id FROM pd_store WHERE custom_domain = $1 AND id != $2',
        [domain.toLowerCase(), storeId],
      );
      if (taken.rowCount && taken.rowCount > 0) {
        throw new PdConflictError(
          PdErrorCode.STORE_DOMAIN_TAKEN,
          'This domain is already configured for another store',
          { domain },
        );
      }
    }
    const { rows } = await query<StoreRow>(
      'UPDATE pd_store SET custom_domain = $2 WHERE id = $1 RETURNING *',
      [storeId, domain ? domain.toLowerCase() : null],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    return rows[0];
  }

  /**
   * Update shipping mode.
   */
  async updateShippingMode(storeId: string, mode: ShippingMode): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      'UPDATE pd_store SET shipping_mode = $2 WHERE id = $1 RETURNING *',
      [storeId, mode],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    return rows[0];
  }

  /**
   * Encrypt and store vendor's own payment provider keys (Pro+ only).
   */
  async setPaymentConfig(
    storeId: string,
    plan: SubscriptionPlan,
    cfg: IStorePaymentConfig,
  ): Promise<StoreRow> {
    const allowed = [
      SubscriptionPlan.Pro,
      SubscriptionPlan.Golden,
      SubscriptionPlan.Platinum,
    ].includes(plan);
    if (!allowed) {
      throw new PdPlanRequiredError(SubscriptionPlan.Pro, plan);
    }
    const encrypted = encrypt(JSON.stringify(cfg));
    const { rows } = await query<StoreRow>(
      'UPDATE pd_store SET payment_config = $2 WHERE id = $1 RETURNING *',
      [storeId, encrypted],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    return rows[0];
  }

  /**
   * Mark a store as verified (called by KYC service after approval).
   */
  async markVerified(storeId: string, client?: PoolClient): Promise<void> {
    const sql = `UPDATE pd_store SET status = $2, is_verified = true WHERE id = $1`;
    const params = [storeId, StoreStatus.Verified];
    if (client) await client.query(sql, params);
    else await query(sql, params);
  }

  /**
   * Suspend a store (admin action — also blocks new product publication).
   */
  async suspend(storeId: string, _reason: string): Promise<void> {
    await query(
      `UPDATE pd_store SET status = $2 WHERE id = $1`,
      [storeId, StoreStatus.Suspended],
    );
    logger.warn({ store_id: storeId }, 'Store suspended');
  }

  /**
   * List all stores (paginated). Used by Hub homepage and admin panel.
   */
  async list(opts: { page?: number; limit?: number; verifiedOnly?: boolean } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const where = opts.verifiedOnly ? `WHERE status = 'verified'` : '';
    const { rows: data } = await query<StoreRow>(
      `SELECT * FROM pd_store ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_store ${where}`,
    );
    const total = parseInt(countRows[0].count, 10);
    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }
}

export const storeService = new StoreService();
