/**
 * WishlistService — Customer product wishlists.
 *
 * Customers can save products to their wishlist for later.
 * One entry per customer per product (toggle semantics).
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdNotFoundError } from '../errors';
import { logger } from '../utils/logger';

export interface WishlistItemRow {
  id: string;
  customer_id: string;
  product_id: string;
  created_at: Date;
  product_title?: string;
  product_price?: number;
  product_thumbnail?: string | null;
  product_status?: string;
  store_name?: string;
  store_id?: string;
}

export class WishlistService {
  // ─── Toggle (add or remove) ───────────────────────────────────────

  async toggle(
    customer_id: string,
    product_id: string,
  ): Promise<{ added: boolean }> {
    // Verify product exists
    const { rows: productRows } = await query(
      'SELECT id FROM pd_product WHERE id = $1',
      [product_id],
    );
    if (productRows.length === 0) {
      throw new PdNotFoundError('Product not found');
    }

    // Check if already in wishlist
    const { rows: existing } = await query(
      'SELECT id FROM pd_wishlist_item WHERE customer_id = $1 AND product_id = $2',
      [customer_id, product_id],
    );

    if (existing.length > 0) {
      // Remove
      await query(
        'DELETE FROM pd_wishlist_item WHERE customer_id = $1 AND product_id = $2',
        [customer_id, product_id],
      );
      logger.info({ customer_id, product_id }, 'Wishlist item removed');
      return { added: false };
    }

    // Add
    const id = pdId('wishlist');
    await query(
      'INSERT INTO pd_wishlist_item (id, customer_id, product_id) VALUES ($1, $2, $3)',
      [id, customer_id, product_id],
    );
    logger.info({ customer_id, product_id }, 'Wishlist item added');
    return { added: true };
  }

  // ─── Add ──────────────────────────────────────────────────────────

  async add(customer_id: string, product_id: string): Promise<WishlistItemRow> {
    const { rows: productRows } = await query(
      'SELECT id FROM pd_product WHERE id = $1',
      [product_id],
    );
    if (productRows.length === 0) {
      throw new PdNotFoundError('Product not found');
    }

    const id = pdId('wishlist');
    try {
      const { rows } = await query<WishlistItemRow>(
        'INSERT INTO pd_wishlist_item (id, customer_id, product_id) VALUES ($1, $2, $3) RETURNING *',
        [id, customer_id, product_id],
      );
      return rows[0];
    } catch (err: unknown) {
      if ((err as { code?: string }).code === '23505') {
        // Already exists, just return it
        const { rows } = await query<WishlistItemRow>(
          'SELECT * FROM pd_wishlist_item WHERE customer_id = $1 AND product_id = $2',
          [customer_id, product_id],
        );
        return rows[0];
      }
      throw err;
    }
  }

  // ─── Remove ───────────────────────────────────────────────────────

  async remove(customer_id: string, product_id: string): Promise<void> {
    await query(
      'DELETE FROM pd_wishlist_item WHERE customer_id = $1 AND product_id = $2',
      [customer_id, product_id],
    );
  }

  // ─── List ─────────────────────────────────────────────────────────

  async list(
    customer_id: string,
    opts: { page?: number; limit?: number } = {},
  ): Promise<{ items: WishlistItemRow[]; total: number }> {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM pd_wishlist_item WHERE customer_id = $1',
      [customer_id],
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<WishlistItemRow>(
      `SELECT w.*,
              p.title as product_title,
              p.price as product_price,
              p.thumbnail as product_thumbnail,
              p.status as product_status,
              s.name as store_name,
              s.id as store_id
       FROM pd_wishlist_item w
       JOIN pd_product p ON p.id = w.product_id
       JOIN pd_store s ON s.id = p.store_id
       WHERE w.customer_id = $1
       ORDER BY w.created_at DESC
       LIMIT $2 OFFSET $3`,
      [customer_id, limit, offset],
    );

    return { items: rows, total };
  }

  // ─── Check ────────────────────────────────────────────────────────

  async isInWishlist(customer_id: string, product_id: string): Promise<boolean> {
    const { rows } = await query(
      'SELECT 1 FROM pd_wishlist_item WHERE customer_id = $1 AND product_id = $2',
      [customer_id, product_id],
    );
    return rows.length > 0;
  }

  async getWishlistStatus(
    customer_id: string,
    product_ids: string[],
  ): Promise<Set<string>> {
    if (product_ids.length === 0) return new Set();
    const placeholders = product_ids.map((_, i) => `$${i + 2}`).join(',');
    const { rows } = await query<{ product_id: string }>(
      `SELECT product_id FROM pd_wishlist_item
       WHERE customer_id = $1 AND product_id IN (${placeholders})`,
      [customer_id, ...product_ids],
    );
    return new Set(rows.map((r) => r.product_id));
  }

  // ─── Count ────────────────────────────────────────────────────────

  async count(customer_id: string): Promise<number> {
    const { rows } = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM pd_wishlist_item WHERE customer_id = $1',
      [customer_id],
    );
    return parseInt(rows[0].count, 10);
  }
}

export const wishlistService = new WishlistService();
