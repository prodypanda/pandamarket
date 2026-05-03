/**
 * ThemeService — theme listing, purchase, and ownership checks.
 *
 * Supports:
 *   - Listing available themes (free + premium)
 *   - Checking if a store owns a premium theme
 *   - Recording theme purchases
 *   - Listing purchased themes for a store
 */

import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdNotFoundError, PdConflictError, PdErrorCode } from '../errors';
import { logger } from '../utils/logger';

export interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_url: string | null;
  preview_images: string[];
  features: string[];
  is_free: boolean;
  is_premium: boolean;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface ThemePurchaseRow {
  id: string;
  store_id: string;
  theme_id: string;
  amount_paid: number;
  currency: string;
  payment_reference: string | null;
  purchased_at: string;
}

export class ThemeService {
  /**
   * List all active themes.
   */
  async listAll(): Promise<ThemeRow[]> {
    const { rows } = await query(
      `SELECT * FROM pd_theme WHERE is_active = true ORDER BY is_free DESC, name ASC`,
    );
    return rows.map(this.mapRow);
  }

  /**
   * Get a single theme by slug.
   */
  async getBySlug(slug: string): Promise<ThemeRow> {
    const { rows } = await query(
      `SELECT * FROM pd_theme WHERE slug = $1 AND is_active = true`,
      [slug],
    );
    if (rows.length === 0) {
      throw new PdNotFoundError('Theme not found', { slug });
    }
    return this.mapRow(rows[0]);
  }

  /**
   * Get a single theme by ID.
   */
  async getById(id: string): Promise<ThemeRow> {
    const { rows } = await query(
      `SELECT * FROM pd_theme WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) {
      throw new PdNotFoundError('Theme not found', { id });
    }
    return this.mapRow(rows[0]);
  }

  /**
   * Check if a store can use a specific theme.
   * Free themes are always accessible. Premium themes require a purchase record.
   */
  async canUseTheme(storeId: string, themeSlug: string): Promise<boolean> {
    const theme = await this.getBySlug(themeSlug);
    if (theme.is_free) return true;

    const { rows } = await query(
      `SELECT 1 FROM pd_theme_purchase WHERE store_id = $1 AND theme_id = $2`,
      [storeId, theme.id],
    );
    return rows.length > 0;
  }

  /**
   * Record a theme purchase for a store.
   * Idempotent: returns existing purchase if already bought.
   */
  async purchaseTheme(
    storeId: string,
    themeId: string,
    paymentReference?: string,
  ): Promise<ThemePurchaseRow> {
    const theme = await this.getById(themeId);

    if (theme.is_free) {
      throw new PdConflictError('This theme is free and does not require purchase');
    }

    // Check if already purchased
    const { rows: existing } = await query(
      `SELECT * FROM pd_theme_purchase WHERE store_id = $1 AND theme_id = $2`,
      [storeId, themeId],
    );
    if (existing.length > 0) {
      return this.mapPurchaseRow(existing[0]);
    }

    const id = pdId('thmpurch');
    const { rows } = await query(
      `INSERT INTO pd_theme_purchase (id, store_id, theme_id, amount_paid, payment_reference)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, storeId, themeId, theme.price, paymentReference ?? null],
    );

    logger.info(
      { store_id: storeId, theme_id: themeId, amount: theme.price },
      'Theme purchased',
    );

    return this.mapPurchaseRow(rows[0]);
  }

  /**
   * List all themes purchased by a store.
   */
  async listPurchases(storeId: string): Promise<ThemePurchaseRow[]> {
    const { rows } = await query(
      `SELECT * FROM pd_theme_purchase WHERE store_id = $1 ORDER BY purchased_at DESC`,
      [storeId],
    );
    return rows.map(this.mapPurchaseRow);
  }

  // ─── Mappers ────────────────────────────────────────────────────

  private mapRow(r: any): ThemeRow {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      preview_url: r.preview_url,
      preview_images: r.preview_images ?? [],
      features: r.features ?? [],
      is_free: r.is_free,
      is_premium: r.is_premium ?? false,
      price: parseFloat(r.price ?? '0'),
      is_active: r.is_active,
      created_at: r.created_at,
    };
  }

  private mapPurchaseRow(r: any): ThemePurchaseRow {
    return {
      id: r.id,
      store_id: r.store_id,
      theme_id: r.theme_id,
      amount_paid: parseFloat(r.amount_paid ?? '0'),
      currency: r.currency,
      payment_reference: r.payment_reference,
      purchased_at: r.purchased_at,
    };
  }
}

export const themeService = new ThemeService();
