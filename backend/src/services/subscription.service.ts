/**
 * SubscriptionService — quota checks and plan management.
 * Source of truth for plan limits is the `pd_subscription_limits` table.
 */

import { PoolClient } from 'pg';
import { query } from '../db/pool';
import {
  PdNotFoundError,
  PdQuotaExceededError,
  PdValidationError,
  PdConflictError,
  PdErrorCode,
} from '../errors';
import { ISubscriptionLimits, SubscriptionPlan, SubscriptionType } from '@pandamarket/types';
import { creditsService } from './credits.service';
import { isUnlimited } from '../utils/plans';
import { logger } from '../utils/logger';

export interface SubscriptionLimitsRow {
  plan_id: string;
  max_products: number;
  max_images_per_product: number;
  has_ai_seo: boolean;
  has_image_compression: boolean;
  has_custom_domain: boolean;
  has_page_builder: boolean;
  has_direct_payment: boolean;
  has_white_label: boolean;
  commission_rate: string; // numeric → string in pg by default
  ai_tokens_included: number;
  yearly_price: string;
  is_enabled?: boolean;
}

export class SubscriptionService {
  private cache: Map<string, ISubscriptionLimits> = new Map();

  async getLimits(plan: string): Promise<ISubscriptionLimits> {
    if (this.cache.has(plan)) return this.cache.get(plan)!;

    const { rows } = await query<SubscriptionLimitsRow>(
      'SELECT * FROM pd_subscription_limits WHERE plan_id = $1',
      [plan],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, `Plan ${plan} not found`);
    }
    const limits: ISubscriptionLimits = {
      ...rows[0],
      commission_rate: parseFloat(rows[0].commission_rate),
      yearly_price: parseFloat(rows[0].yearly_price),
      is_enabled: rows[0].is_enabled !== false,
    };
    this.cache.set(plan, limits);
    return limits;
  }

  async listAll(options: { enabledOnly?: boolean } = {}): Promise<ISubscriptionLimits[]> {
    const { rows } = await query<SubscriptionLimitsRow>(
      `SELECT * FROM pd_subscription_limits
       ${options.enabledOnly ? 'WHERE is_enabled = true' : ''}
       ORDER BY yearly_price ASC`,
    );
    return rows.map((r) => ({
      ...r,
      commission_rate: parseFloat(r.commission_rate),
      yearly_price: parseFloat(r.yearly_price),
      is_enabled: r.is_enabled !== false,
    }));
  }

  async assertPlanIsEnabled(plan: string): Promise<ISubscriptionLimits> {
    const limits = await this.getLimits(plan);
    if (!limits.is_enabled) {
      throw new PdValidationError('This plan is not available for selection', {
        field: 'plan',
        plan,
      });
    }
    return limits;
  }

  /**
   * Check whether the store can create a new product.
   * @throws PdQuotaExceededError if the limit is reached.
   */
  async assertCanCreateProduct(storeId: string, plan: string): Promise<void> {
    const limits = await this.getLimits(plan);
    if (isUnlimited(limits.max_products)) return;
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_product
       WHERE store_id = $1 AND status != 'archived'`,
      [storeId],
    );
    const current = parseInt(rows[0].count, 10);
    if (current >= limits.max_products) {
      throw new PdQuotaExceededError(
        `You have reached the limit of ${limits.max_products} products for the ${plan} plan`,
        { current, limit: limits.max_products, plan },
      );
    }
  }

  /**
   * Check whether the product can have one more image.
   */
  async assertCanAddImage(productId: string, plan: string): Promise<void> {
    const limits = await this.getLimits(plan);
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_product_image WHERE product_id = $1`,
      [productId],
    );
    const current = parseInt(rows[0].count, 10);
    if (current >= limits.max_images_per_product) {
      throw new PdQuotaExceededError(
        `Image limit reached for this product (${limits.max_images_per_product})`,
        { current, limit: limits.max_images_per_product, plan, product_id: productId },
      );
    }
  }

  /**
   * Upgrade or downgrade. Downgrade is blocked if it would put the store
   * over the new plan's product limit.
   */
  async changePlan(storeId: string, currentPlan: string, newPlan: string, client?: PoolClient): Promise<void> {
    if (currentPlan === newPlan) {
      throw new PdConflictError(PdErrorCode.SUB_ALREADY_ACTIVE, 'Already on this plan', {
        current_plan: currentPlan,
      });
    }

    const [currentLimits, newLimits] = await Promise.all([
      this.getLimits(currentPlan),
      this.assertPlanIsEnabled(newPlan),
    ]);
    const isDowngrade = Number(newLimits.yearly_price) < Number(currentLimits.yearly_price);
    if (isDowngrade) {
      if (!isUnlimited(newLimits.max_products)) {
        const { rows } = await query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM pd_product
           WHERE store_id = $1 AND status != 'archived'`,
          [storeId],
        );
        const productCount = parseInt(rows[0].count, 10);
        if (productCount > newLimits.max_products) {
          throw new PdValidationError(
            'Cannot downgrade — you exceed the product limit of the lower plan',
            {
              code: PdErrorCode.SUB_DOWNGRADE_BLOCKED,
              products_count: productCount,
              new_limit: newLimits.max_products,
            },
          );
        }
      }
    }

    const sub_type = newPlan === SubscriptionPlan.Free ? SubscriptionType.Commission : SubscriptionType.Yearly;
    const expiresAt =
      newPlan === SubscriptionPlan.Free
        ? null
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const sql = `
      UPDATE pd_store
      SET subscription_plan = $2,
          subscription_type = $3,
          subscription_expires_at = $4
      WHERE id = $1`;
    const params = [storeId, newPlan, sub_type, expiresAt];

    if (client) await client.query(sql, params);
    else await query(sql, params);
    await creditsService.setForPlan(storeId, newPlan, client);

    logger.info({ store_id: storeId, from: currentPlan, to: newPlan }, 'Subscription plan changed');
  }

  /**
   * Clear the in-memory cache (call after seed/migration).
   */
  invalidateCache(): void {
    this.cache.clear();
  }
}

export const subscriptionService = new SubscriptionService();
