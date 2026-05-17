/**
 * StoreService — create + manage vendor stores.
 * Also handles store resolution by hostname (for the multi-tenant frontend).
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import {
  PdConflictError,
  PdErrorCode,
  PdForbiddenError,
  PdNotFoundError,
  PdPlanRequiredError,
  PdValidationError,
} from '../errors';
import { pdId } from '../utils/crypto';
import { isValidSubdomain } from '../utils/subdomain';
import { logger } from '../utils/logger';
import {
  IStorePaymentConfig,
  SellerType,
  ShippingMode,
  StoreStatus,
  SubscriptionPlan,
  SubscriptionType,
  UserRole,
} from '@pandamarket/types';
import { encrypt } from '../utils/crypto';
import { walletService } from './wallet.service';
import { creditsService } from './credits.service';
import { subscriptionService } from './subscription.service';
import { platformConfigService, type PlatformSettings } from './platform-config.service';

export interface StoreRow {
  id: string;
  name: string;
  status: StoreStatus;
  seller_type: SellerType;
  is_verified: boolean;
  subscription_plan: string;
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
  updated_at?: Date;
}

function normalizeCustomDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}

function suffixList(value: PlatformSettings[keyof PlatformSettings]) {
  return String(value || '')
    .split(',')
    .map((suffix) => suffix.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean);
}

function matchesSuffix(domain: string, suffix: string) {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

function assertCustomDomainPolicy(domain: string, settings: PlatformSettings) {
  if (!settings.security_custom_domains_enabled) {
    throw new PdValidationError('Custom domains are disabled by platform settings');
  }

  const allowedSuffixes = suffixList(settings.security_custom_domain_allowed_suffixes);
  if (allowedSuffixes.length > 0 && !allowedSuffixes.some((suffix) => matchesSuffix(domain, suffix))) {
    throw new PdValidationError('Custom domain is not allowed by platform settings', { domain });
  }

  const blockedSuffixes = suffixList(settings.security_custom_domain_blocked_suffixes);
  if (blockedSuffixes.some((suffix) => matchesSuffix(domain, suffix))) {
    throw new PdValidationError('Custom domain is blocked by platform settings', { domain });
  }
}

const SELLER_TYPE_CHANGE_CANCEL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SELLER_TYPE_CHANGE_MONTHLY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000;

interface SellerTypeChangeRequest {
  requested_type?: unknown;
  status?: unknown;
  requested_at?: unknown;
  reviewed_at?: unknown;
  cancelled_at?: unknown;
}

export interface AdminVendorRow extends StoreRow {
  owner_email: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_phone: string | null;
  owner_last_login_at: Date | null;
  owner_is_active: boolean | null;
  owner_two_factor_enabled: boolean | null;
  payment_config_set: boolean;
  product_count: string;
  published_product_count: string;
  order_count: string;
  pending_order_count: string;
  captured_revenue: string;
  open_report_count: string;
  owner_store_count: string;
  owner_free_store_count: string;
  owner_paid_store_count: string;
  kyc_status: string | null;
  kyc_created_at: Date | null;
  kyc_reviewed_at: Date | null;
}

export interface AdminVendorSummary {
  total: number;
  verified: number;
  unverified: number;
  suspended: number;
  pending_seller_type_requests: number;
  pending_kyc: number;
}

export interface AdminVendorAccountRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean | null;
  two_factor_enabled: boolean | null;
  last_login_at: Date | null;
  created_at: Date;
  store_count: string;
  free_store_count: string;
  paid_store_count: string;
  verified_store_count: string;
  suspended_store_count: string;
  product_count: string;
  order_count: string;
  captured_revenue: string;
  open_report_count: string;
}

export interface AdminVendorAccountSummary {
  total: number;
  active: number;
  inactive: number;
  multi_store_accounts: number;
  free_store_slots_available: number;
  total_stores: number;
}

export interface AdminBuyerRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean | null;
  is_active: boolean | null;
  two_factor_enabled: boolean | null;
  last_login_at: Date | null;
  created_at: Date;
  order_count: string;
  open_order_count: string;
  captured_order_count: string;
  total_spent: string;
  last_order_at: Date | null;
  wishlist_count: string;
  review_count: string;
  address_count: string;
  open_report_count: string;
  chat_count: string;
}

export interface AdminBuyerSummary {
  total: number;
  active: number;
  inactive: number;
  email_verified: number;
  with_orders: number;
  total_orders: number;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
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
    seller_type?: SellerType;
    plan?: string;
  }): Promise<StoreRow> {
    const subdomain = opts.subdomain.trim().toLowerCase();
    if (!isValidSubdomain(subdomain)) {
      throw new PdValidationError('Invalid subdomain', { field: 'subdomain' });
    }
    const plan = opts.plan ?? SubscriptionPlan.Free;
    await subscriptionService.assertPlanIsEnabled(plan);
    if (plan === SubscriptionPlan.Free) {
      const existingFreeStore = await query<{ id: string }>(
        'SELECT id FROM pd_store WHERE owner_id = $1 AND subscription_plan = $2 LIMIT 1',
        [opts.user_id, SubscriptionPlan.Free],
      );
      if (existingFreeStore.rows[0]) {
        throw new PdValidationError('Each account can only create one free store', {
          field: 'plan',
          limit: 1,
        });
      }
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
      const sellerType = opts.seller_type ?? SellerType.Retailer;
      const subscriptionType =
        plan === SubscriptionPlan.Free ? SubscriptionType.Commission : SubscriptionType.Yearly;

      const { rows } = await client.query<StoreRow>(
        `INSERT INTO pd_store
          (id, name, status, subdomain, seller_type, subscription_plan, subscription_type, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          opts.name,
          StoreStatus.Maintenance,
          subdomain,
          sellerType,
          plan,
          subscriptionType,
          opts.user_id,
        ],
      );
      const store = rows[0];

      // Promote the user to vendor and link them
      await client.query(
        'UPDATE pd_user SET role = $1, store_id = COALESCE(store_id, $2) WHERE id = $3',
        [UserRole.Vendor, store.id, opts.user_id],
      );

      // Bootstrap wallet & credits
      await walletService.create(store.id, client);
      await creditsService.create(store.id, plan, client);

      logger.info({ store_id: store.id, owner_id: opts.user_id, plan, seller_type: sellerType }, 'Store created');
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

  async getOwnedById(storeId: string, ownerId: string): Promise<StoreRow | null> {
    const { rows } = await query<StoreRow>(
      'SELECT * FROM pd_store WHERE id = $1 AND owner_id = $2',
      [storeId, ownerId],
    );
    return rows[0] ?? null;
  }

  async listByOwner(ownerId: string): Promise<StoreRow[]> {
    const { rows } = await query<StoreRow>(
      `SELECT *
       FROM pd_store
       WHERE owner_id = $1
       ORDER BY created_at ASC`,
      [ownerId],
    );
    return rows;
  }

  async getSellerScore(storeId: string): Promise<{ seller_score: string; review_count: string }> {
    const { rows } = await query<{ seller_score: string; review_count: string }>(
      `SELECT
         ROUND(COALESCE(AVG(rating), 0)::numeric, 1)::text AS seller_score,
         COUNT(*)::text AS review_count
       FROM pd_review
       WHERE store_id = $1
         AND status = 'published'`,
      [storeId],
    );
    return rows[0] ?? { seller_score: '0', review_count: '0' };
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

    if (!cleanHost.includes('.')) {
      return this.getBySubdomain(cleanHost);
    }

    if (cleanHost.endsWith(`.${hubDomain}`)) {
      const subdomain = cleanHost.slice(0, -1 - hubDomain.length);
      return this.getBySubdomain(subdomain);
    }

    if (cleanHost.endsWith('.localhost')) {
      const subdomain = cleanHost.slice(0, -'.localhost'.length);
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
    const nextSettings: Record<string, unknown> = { ...settings };
    const storeName =
      typeof nextSettings.name === 'string' && nextSettings.name.trim().length > 0
        ? nextSettings.name.trim()
        : null;

    delete nextSettings.name;

    if (typeof nextSettings.description === 'string') {
      nextSettings.store_description = nextSettings.description;
      delete nextSettings.description;
    }

    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET name = COALESCE($2, name),
           settings = settings || $3::jsonb
       WHERE id = $1
       RETURNING *`,
      [storeId, storeName, JSON.stringify(nextSettings)],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async updateSellerType(storeId: string, sellerType: SellerType): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET seller_type = $2,
           settings = COALESCE(settings, '{}'::jsonb) - 'seller_type_change_request',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, sellerType],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async verify(storeId: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET status = CASE WHEN status IN ($2, $3) THEN $3 ELSE status END,
           is_verified = true,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, StoreStatus.Unverified, StoreStatus.Maintenance],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async reactivate(storeId: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, StoreStatus.Maintenance],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async updateSubscription(
    storeId: string,
    plan: string,
    type: SubscriptionType,
    expiresAt?: string | null,
  ): Promise<StoreRow> {
    const normalizedExpiresAt = expiresAt ? new Date(expiresAt) : null;
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET subscription_plan = $2,
           subscription_type = $3,
           subscription_expires_at = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, plan, type, normalizedExpiresAt],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async clearPaymentConfig(storeId: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET payment_config = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async clearCustomDomain(storeId: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET custom_domain = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async requestSellerTypeChange(storeId: string, sellerType: SellerType): Promise<{ store: StoreRow; autoApproved: boolean }> {
    const currentStore = await this.getById(storeId);
    const request = currentStore.settings?.seller_type_change_request as SellerTypeChangeRequest | undefined;
    const lastApprovedAt =
      parseTimestamp(currentStore.settings?.seller_type_change_last_approved_at) ??
      (request?.status === 'approved' ? parseTimestamp(request.reviewed_at) ?? parseTimestamp(request.requested_at) : null);
    const lastCancelledAt = parseTimestamp(currentStore.settings?.seller_type_change_last_cancelled_at) ?? parseTimestamp(request?.cancelled_at);
    const nowMs = Date.now();
    if (request?.status === 'pending') {
      throw new PdValidationError('You already have a pending seller type change request. Please wait for superadmin approval or cancel it first.');
    }
    if (currentStore.seller_type === sellerType) {
      return { store: currentStore, autoApproved: true };
    }
    if (lastCancelledAt && nowMs - lastCancelledAt < SELLER_TYPE_CHANGE_CANCEL_COOLDOWN_MS) {
      throw new PdValidationError('Please wait 24 hours after cancelling a seller type change request before requesting again.');
    }
    if (lastApprovedAt && nowMs - lastApprovedAt < SELLER_TYPE_CHANGE_MONTHLY_LIMIT_MS) {
      throw new PdValidationError('Seller type changes are limited to once every 30 days.');
    }
    const now = new Date(nowMs).toISOString();
    const requestPayload = {
      seller_type_change_request: {
        requested_type: sellerType,
        status: 'pending',
        requested_at: now,
        reviewed_at: null,
      },
      seller_type_change_last_requested_at: now,
    };
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, JSON.stringify(requestPayload)],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return { store: rows[0], autoApproved: false };
  }

  async cancelSellerTypeChange(storeId: string): Promise<StoreRow> {
    const store = await this.getById(storeId);
    const request = store.settings?.seller_type_change_request as SellerTypeChangeRequest | undefined;
    if (request?.status !== 'pending') {
      throw new PdValidationError('No pending seller type change request to cancel');
    }
    const cancelledAt = new Date().toISOString();
    const requestPayload = {
      seller_type_change_request: {
        ...request,
        status: 'cancelled',
        reviewed_at: null,
        cancelled_at: cancelledAt,
      },
      seller_type_change_last_cancelled_at: cancelledAt,
    };
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, JSON.stringify(requestPayload)],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async approveSellerTypeChange(storeId: string): Promise<StoreRow> {
    const store = await this.getById(storeId);
    const request = store.settings?.seller_type_change_request as { requested_type?: unknown; status?: unknown } | undefined;
    const requestedType = typeof request?.requested_type === 'string' ? request.requested_type : null;
    if (request?.status !== 'pending' || !Object.values(SellerType).includes(requestedType as SellerType)) {
      throw new PdValidationError('No pending seller type change request');
    }
    const reviewedAt = new Date().toISOString();
    const requestPayload = {
      seller_type_change_request: {
        ...request,
        requested_type: requestedType,
        status: 'approved',
        reviewed_at: reviewedAt,
      },
      seller_type_change_last_approved_at: reviewedAt,
    };
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET seller_type = $2,
           settings = COALESCE(settings, '{}'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, requestedType, JSON.stringify(requestPayload)],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  async rejectSellerTypeChange(storeId: string, reason?: string): Promise<StoreRow> {
    const store = await this.getById(storeId);
    const request = store.settings?.seller_type_change_request as SellerTypeChangeRequest | undefined;
    if (request?.status !== 'pending') {
      throw new PdValidationError('No pending seller type change request');
    }
    const reviewedAt = new Date().toISOString();
    const requestPayload = {
      seller_type_change_request: {
        ...request,
        status: 'rejected',
        reviewed_at: reviewedAt,
        rejection_reason: reason ?? null,
      },
    };
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET settings = COALESCE(settings, '{}'::jsonb) || $2::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, JSON.stringify(requestPayload)],
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
    const normalizedDomain = domain ? normalizeCustomDomain(domain) : null;
    if (normalizedDomain) {
      const settings = await platformConfigService.getSettings();
      assertCustomDomainPolicy(normalizedDomain, settings);
      const taken = await query<{ id: string }>(
        'SELECT id FROM pd_store WHERE custom_domain = $1 AND id != $2',
        [normalizedDomain, storeId],
      );
      if (taken.rowCount && taken.rowCount > 0) {
        throw new PdConflictError(
          PdErrorCode.STORE_DOMAIN_TAKEN,
          'This domain is already configured for another store',
          { domain: normalizedDomain },
        );
      }
    }
    const { rows } = await query<StoreRow>(
      'UPDATE pd_store SET custom_domain = $2 WHERE id = $1 RETURNING *',
      [storeId, normalizedDomain],
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
    plan: string,
    cfg: IStorePaymentConfig,
  ): Promise<StoreRow> {
    const limits = await subscriptionService.getLimits(plan);
    if (!limits.has_direct_payment) {
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
    const sql = `UPDATE pd_store
      SET status = CASE WHEN status IN ($2, $3) THEN $3 ELSE status END,
          is_verified = true
      WHERE id = $1`;
    const params = [storeId, StoreStatus.Unverified, StoreStatus.Maintenance];
    if (client) await client.query(sql, params);
    else await query(sql, params);
  }

  /**
   * Suspend a store (admin action — also blocks new product publication).
   */
  async suspend(storeId: string, _reason: string): Promise<StoreRow> {
    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, StoreStatus.Suspended],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    logger.warn({ store_id: storeId }, 'Store suspended');
    return rows[0];
  }

  async updateStatus(storeId: string, status: StoreStatus): Promise<StoreRow> {
    if (!Object.values(StoreStatus).includes(status)) {
      throw new PdValidationError('Invalid store status', { status });
    }

    const current = await this.getById(storeId);
    if (status === StoreStatus.Verified && !current.is_verified) {
      throw new PdForbiddenError(
        PdErrorCode.PERM_FORBIDDEN,
        'Store must be verified before publishing',
        { store_id: storeId },
      );
    }

    const { rows } = await query<StoreRow>(
      `UPDATE pd_store
       SET status = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [storeId, status],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    }
    return rows[0];
  }

  /**
   * List all stores (paginated). Used by Hub homepage and admin panel.
   */
  async list(opts: { page?: number; limit?: number; verifiedOnly?: boolean; sellerType?: SellerType } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (opts.verifiedOnly) {
      conditions.push("status = 'verified' AND COALESCE(is_verified, false) = true");
    }
    if (opts.sellerType) {
      params.push(opts.sellerType);
      conditions.push(`seller_type = $${params.length}`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows: data } = await query<StoreRow>(
      `SELECT * FROM pd_store ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_store ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async listForAdmin(opts: {
    page?: number;
    limit?: number;
    search?: string;
    ownerId?: string;
    status?: StoreStatus;
    verifiedOnly?: boolean;
    sellerType?: SellerType;
    pendingSellerTypeRequest?: boolean;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts.verifiedOnly) {
      conditions.push('s.is_verified = true');
    }
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (opts.sellerType) {
      params.push(opts.sellerType);
      conditions.push(`s.seller_type = $${params.length}`);
    }
    if (opts.ownerId?.trim()) {
      params.push(opts.ownerId.trim());
      conditions.push(`s.owner_id = $${params.length}`);
    }
    if (opts.pendingSellerTypeRequest) {
      conditions.push("s.settings->'seller_type_change_request'->>'status' = 'pending'");
    }
    if (opts.search?.trim()) {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(
        s.name ILIKE $${params.length}
        OR s.subdomain ILIKE $${params.length}
        OR COALESCE(s.custom_domain, '') ILIKE $${params.length}
        OR COALESCE(u.email, '') ILIKE $${params.length}
        OR COALESCE(u.first_name, '') ILIKE $${params.length}
        OR COALESCE(u.last_name, '') ILIKE $${params.length}
      )`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows: data } = await query<AdminVendorRow>(
      `SELECT
         s.*,
         u.email AS owner_email,
         u.first_name AS owner_first_name,
         u.last_name AS owner_last_name,
         u.phone AS owner_phone,
         u.last_login_at AS owner_last_login_at,
         u.is_active AS owner_is_active,
         u.two_factor_enabled AS owner_two_factor_enabled,
         (s.payment_config IS NOT NULL) AS payment_config_set,
         COALESCE(pm.product_count, 0)::text AS product_count,
         COALESCE(pm.published_product_count, 0)::text AS published_product_count,
         COALESCE(om.order_count, 0)::text AS order_count,
         COALESCE(om.pending_order_count, 0)::text AS pending_order_count,
         COALESCE(om.captured_revenue, 0)::text AS captured_revenue,
         COALESCE(rm.open_report_count, 0)::text AS open_report_count,
         COALESCE(osm.owner_store_count, 0)::text AS owner_store_count,
         COALESCE(osm.owner_free_store_count, 0)::text AS owner_free_store_count,
         COALESCE(osm.owner_paid_store_count, 0)::text AS owner_paid_store_count,
         kyc.status AS kyc_status,
         kyc.created_at AS kyc_created_at,
         kyc.reviewed_at AS kyc_reviewed_at
       FROM pd_store s
       LEFT JOIN pd_user u ON u.id = s.owner_id
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS product_count,
           COUNT(*) FILTER (WHERE status = 'published') AS published_product_count
         FROM pd_product p
         WHERE p.store_id = s.id
       ) pm ON true
       LEFT JOIN LATERAL (
         SELECT
           COUNT(DISTINCT o.id) AS order_count,
           COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('pending', 'processing')) AS pending_order_count,
           COALESCE(SUM(CASE WHEN o.payment_status = 'captured' THEN oi.subtotal::numeric ELSE 0 END), 0) AS captured_revenue
         FROM pd_order_item oi
         JOIN pd_order o ON o.id = oi.order_id
         WHERE oi.store_id = s.id
       ) om ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS open_report_count
         FROM pd_reports r
         WHERE r.store_id = s.id
           AND r.status IN ('open', 'investigating')
       ) rm ON true
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*) AS owner_store_count,
           COUNT(*) FILTER (WHERE subscription_plan = 'free') AS owner_free_store_count,
           COUNT(*) FILTER (WHERE subscription_plan != 'free') AS owner_paid_store_count
         FROM pd_store os
         WHERE os.owner_id = s.owner_id
       ) osm ON true
       LEFT JOIN pd_verification_documents kyc ON kyc.store_id = s.id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_store s
       LEFT JOIN pd_user u ON u.id = s.owner_id
       ${where}`,
      params.slice(0, -2),
    );
    const { rows: summaryRows } = await query<{
      total: string;
      verified: string;
      unverified: string;
      suspended: string;
      pending_seller_type_requests: string;
      pending_kyc: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE COALESCE(s.is_verified, false) = true)::text AS verified,
         COUNT(*) FILTER (WHERE COALESCE(s.is_verified, false) = false)::text AS unverified,
         COUNT(*) FILTER (WHERE s.status = 'suspended')::text AS suspended,
         COUNT(*) FILTER (WHERE s.settings->'seller_type_change_request'->>'status' = 'pending')::text AS pending_seller_type_requests,
         COUNT(*) FILTER (WHERE kyc.status = 'pending')::text AS pending_kyc
       FROM pd_store s
       LEFT JOIN pd_verification_documents kyc ON kyc.store_id = s.id`,
    );
    const total = parseInt(countRows[0].count, 10);
    const summaryRow = summaryRows[0];
    const summary: AdminVendorSummary = {
      total: parseInt(summaryRow.total, 10),
      verified: parseInt(summaryRow.verified, 10),
      unverified: parseInt(summaryRow.unverified, 10),
      suspended: parseInt(summaryRow.suspended, 10),
      pending_seller_type_requests: parseInt(summaryRow.pending_seller_type_requests, 10),
      pending_kyc: parseInt(summaryRow.pending_kyc, 10),
    };

    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit), summary } };
  }

  async listVendorAccountsForAdmin(opts: {
    page?: number;
    limit?: number;
    search?: string;
    multiStoreOnly?: boolean;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const conditions = ['(u.role = $1 OR COALESCE(sm.store_count, 0) > 0)'];
    const params: unknown[] = [UserRole.Vendor];

    if (opts.search?.trim()) {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(
        COALESCE(u.email, '') ILIKE $${params.length}
        OR COALESCE(u.first_name, '') ILIKE $${params.length}
        OR COALESCE(u.last_name, '') ILIKE $${params.length}
        OR COALESCE(u.phone, '') ILIKE $${params.length}
      )`);
    }
    if (opts.multiStoreOnly) {
      conditions.push('COALESCE(sm.store_count, 0) > 1');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const fromSql = `
      FROM pd_user u
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS store_count,
          COUNT(*) FILTER (WHERE s.subscription_plan = 'free') AS free_store_count,
          COUNT(*) FILTER (WHERE s.subscription_plan != 'free') AS paid_store_count,
          COUNT(*) FILTER (WHERE COALESCE(s.is_verified, false) = true) AS verified_store_count,
          COUNT(*) FILTER (WHERE s.status = 'suspended') AS suspended_store_count,
          COALESCE(SUM(ps.product_count), 0) AS product_count,
          COALESCE(SUM(os.order_count), 0) AS order_count,
          COALESCE(SUM(os.captured_revenue), 0) AS captured_revenue,
          COALESCE(SUM(rs.open_report_count), 0) AS open_report_count
        FROM pd_store s
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS product_count
          FROM pd_product p
          WHERE p.store_id = s.id
        ) ps ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(DISTINCT o.id) AS order_count,
            COALESCE(SUM(CASE WHEN o.payment_status = 'captured' THEN oi.subtotal::numeric ELSE 0 END), 0) AS captured_revenue
          FROM pd_order_item oi
          JOIN pd_order o ON o.id = oi.order_id
          WHERE oi.store_id = s.id
        ) os ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS open_report_count
          FROM pd_reports r
          WHERE r.store_id = s.id
            AND r.status IN ('open', 'investigating')
        ) rs ON true
        WHERE s.owner_id = u.id
      ) sm ON true`;

    params.push(limit, offset);
    const { rows: data } = await query<AdminVendorAccountRow>(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.is_active,
         u.two_factor_enabled,
         u.last_login_at,
         u.created_at,
         COALESCE(sm.store_count, 0)::text AS store_count,
         COALESCE(sm.free_store_count, 0)::text AS free_store_count,
         COALESCE(sm.paid_store_count, 0)::text AS paid_store_count,
         COALESCE(sm.verified_store_count, 0)::text AS verified_store_count,
         COALESCE(sm.suspended_store_count, 0)::text AS suspended_store_count,
         COALESCE(sm.product_count, 0)::text AS product_count,
         COALESCE(sm.order_count, 0)::text AS order_count,
         COALESCE(sm.captured_revenue, 0)::text AS captured_revenue,
         COALESCE(sm.open_report_count, 0)::text AS open_report_count
       ${fromSql}
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${fromSql} ${where}`,
      params.slice(0, -2),
    );
    const { rows: summaryRows } = await query<{
      total: string;
      active: string;
      inactive: string;
      multi_store_accounts: string;
      free_store_slots_available: string;
      total_stores: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE u.is_active = true)::text AS active,
         COUNT(*) FILTER (WHERE u.is_active = false)::text AS inactive,
         COUNT(*) FILTER (WHERE COALESCE(sm.store_count, 0) > 1)::text AS multi_store_accounts,
         COUNT(*) FILTER (WHERE COALESCE(sm.free_store_count, 0) = 0)::text AS free_store_slots_available,
         COALESCE(SUM(sm.store_count), 0)::text AS total_stores
       ${fromSql}
       WHERE u.role = $1 OR COALESCE(sm.store_count, 0) > 0`,
      [UserRole.Vendor],
    );
    const total = parseInt(countRows[0].count, 10);
    const summaryRow = summaryRows[0];
    const summary: AdminVendorAccountSummary = {
      total: parseInt(summaryRow.total, 10),
      active: parseInt(summaryRow.active, 10),
      inactive: parseInt(summaryRow.inactive, 10),
      multi_store_accounts: parseInt(summaryRow.multi_store_accounts, 10),
      free_store_slots_available: parseInt(summaryRow.free_store_slots_available, 10),
      total_stores: parseInt(summaryRow.total_stores, 10),
    };

    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit), summary } };
  }

  async listBuyersForAdmin(opts: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
    emailVerified?: boolean;
    hasOrders?: boolean;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const conditions = ['u.role = $1'];
    const params: unknown[] = [UserRole.Customer];

    if (opts.search?.trim()) {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(
        COALESCE(u.email, '') ILIKE $${params.length}
        OR COALESCE(u.first_name, '') ILIKE $${params.length}
        OR COALESCE(u.last_name, '') ILIKE $${params.length}
        OR COALESCE(u.phone, '') ILIKE $${params.length}
      )`);
    }
    if (opts.status === 'active') conditions.push('u.is_active = true');
    if (opts.status === 'inactive') conditions.push('u.is_active = false');
    if (typeof opts.emailVerified === 'boolean') {
      params.push(opts.emailVerified);
      conditions.push(`u.email_verified = $${params.length}`);
    }
    if (typeof opts.hasOrders === 'boolean') {
      conditions.push(opts.hasOrders ? 'COALESCE(om.order_count, 0) > 0' : 'COALESCE(om.order_count, 0) = 0');
    }

    const fromSql = `
      FROM pd_user u
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS order_count,
          COUNT(*) FILTER (WHERE o.status IN ('pending', 'processing')) AS open_order_count,
          COUNT(*) FILTER (WHERE o.payment_status = 'captured') AS captured_order_count,
          COALESCE(SUM(CASE WHEN o.payment_status = 'captured' THEN o.total::numeric ELSE 0 END), 0) AS total_spent,
          MAX(o.created_at) AS last_order_at
        FROM pd_order o
        WHERE o.customer_id = u.id
      ) om ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS wishlist_count
        FROM pd_wishlist_item wi
        WHERE wi.customer_id = u.id
      ) wm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS review_count
        FROM pd_review r
        WHERE r.customer_id = u.id
      ) rv ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS address_count
        FROM pd_customer_address ca
        WHERE ca.customer_id = u.id
      ) am ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS open_report_count
        FROM pd_reports rp
        WHERE rp.target_type = 'buyer'
          AND rp.target_user_id = u.id
          AND rp.status IN ('open', 'investigating')
      ) rm ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS chat_count
        FROM pd_chat_conversation cc
        WHERE cc.buyer_id = u.id
      ) cm ON true`;
    const where = `WHERE ${conditions.join(' AND ')}`;

    params.push(limit, offset);
    const { rows: data } = await query<AdminBuyerRow>(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.email_verified,
         u.is_active,
         u.two_factor_enabled,
         u.last_login_at,
         u.created_at,
         COALESCE(om.order_count, 0)::text AS order_count,
         COALESCE(om.open_order_count, 0)::text AS open_order_count,
         COALESCE(om.captured_order_count, 0)::text AS captured_order_count,
         COALESCE(om.total_spent, 0)::text AS total_spent,
         om.last_order_at AS last_order_at,
         COALESCE(wm.wishlist_count, 0)::text AS wishlist_count,
         COALESCE(rv.review_count, 0)::text AS review_count,
         COALESCE(am.address_count, 0)::text AS address_count,
         COALESCE(rm.open_report_count, 0)::text AS open_report_count,
         COALESCE(cm.chat_count, 0)::text AS chat_count
       ${fromSql}
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${fromSql} ${where}`,
      params.slice(0, -2),
    );
    const { rows: summaryRows } = await query<{
      total: string;
      active: string;
      inactive: string;
      email_verified: string;
      with_orders: string;
      total_orders: string;
    }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE u.is_active = true)::text AS active,
         COUNT(*) FILTER (WHERE u.is_active = false)::text AS inactive,
         COUNT(*) FILTER (WHERE u.email_verified = true)::text AS email_verified,
         COUNT(*) FILTER (WHERE COALESCE(om.order_count, 0) > 0)::text AS with_orders,
         COALESCE(SUM(om.order_count), 0)::text AS total_orders
       ${fromSql}
       WHERE u.role = $1`,
      [UserRole.Customer],
    );
    const total = parseInt(countRows[0].count, 10);
    const summaryRow = summaryRows[0];
    const summary: AdminBuyerSummary = {
      total: parseInt(summaryRow.total, 10),
      active: parseInt(summaryRow.active, 10),
      inactive: parseInt(summaryRow.inactive, 10),
      email_verified: parseInt(summaryRow.email_verified, 10),
      with_orders: parseInt(summaryRow.with_orders, 10),
      total_orders: parseInt(summaryRow.total_orders, 10),
    };

    return { data, meta: { page, limit, total, total_pages: Math.ceil(total / limit), summary } };
  }
}

export const storeService = new StoreService();
