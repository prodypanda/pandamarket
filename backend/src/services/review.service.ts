/**
 * ReviewService — Product reviews & ratings.
 *
 * Customers can leave one review per product. Reviews from verified
 * purchasers (who actually bought the product) are flagged accordingly.
 * A denormalised `pd_product_rating` table is maintained for fast reads.
 */

import { query, withTransaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdForbiddenError,
  PdNotFoundError,
  PdValidationError,
} from '../errors';
import { ReviewStatus } from '@pandamarket/types';
import { logger } from '../utils/logger';

export interface ReviewRow {
  id: string;
  product_id: string;
  customer_id: string;
  store_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  admin_notes: string | null;
  helpful_count: number;
  created_at: Date;
  updated_at: Date;
  customer_name?: string;
}

export interface ProductRatingRow {
  product_id: string;
  average_rating: number;
  review_count: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

export class ReviewService {
  // ─── Create ────────────────────────────────────────────────────────

  async create(opts: {
    product_id: string;
    customer_id: string;
    rating: number;
    title?: string;
    body?: string;
    order_id?: string;
  }): Promise<ReviewRow> {
    if (opts.rating < 1 || opts.rating > 5) {
      throw new PdValidationError('Rating must be between 1 and 5');
    }

    // Resolve the store_id from the product
    const { rows: productRows } = await query<{ store_id: string }>(
      'SELECT store_id FROM pd_product WHERE id = $1',
      [opts.product_id],
    );
    if (productRows.length === 0) {
      throw new PdNotFoundError('Product not found');
    }
    const store_id = productRows[0].store_id;

    // Check if this is a verified purchase
    const { rows: purchaseRows } = await query(
      `SELECT 1 FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
       WHERE oi.product_id = $1
         AND o.customer_id = $2
         AND o.payment_status = 'captured'
       LIMIT 1`,
      [opts.product_id, opts.customer_id],
    );
    const is_verified_purchase = purchaseRows.length > 0;

    try {
      const id = pdId('review');
      const review = await withTransaction(async (client) => {
        const { rows } = await client.query<ReviewRow>(
          `INSERT INTO pd_review
            (id, product_id, customer_id, store_id, order_id, rating, title, body, is_verified_purchase)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            id,
            opts.product_id,
            opts.customer_id,
            store_id,
            opts.order_id ?? null,
            opts.rating,
            opts.title ?? null,
            opts.body ?? null,
            is_verified_purchase,
          ],
        );

        // Recalculate product rating aggregate
        await this.recalculateRating(client, opts.product_id);

        return rows[0];
      });

      logger.info(
        { review_id: id, product_id: opts.product_id, rating: opts.rating },
        'Review created',
      );
      return review;
    } catch (err: unknown) {
      // unique_violation = duplicate review
      if ((err as { code?: string }).code === '23505') {
        throw new PdConflictError('You have already reviewed this product');
      }
      throw err;
    }
  }

  // ─── Update (owner only) ──────────────────────────────────────────

  async update(opts: {
    review_id: string;
    customer_id: string;
    rating?: number;
    title?: string;
    body?: string;
  }): Promise<ReviewRow> {
    if (opts.rating !== undefined && (opts.rating < 1 || opts.rating > 5)) {
      throw new PdValidationError('Rating must be between 1 and 5');
    }

    const existing = await this.getById(opts.review_id);
    if (existing.customer_id !== opts.customer_id) {
      throw new PdForbiddenError('You can only edit your own reviews');
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (opts.rating !== undefined) {
      sets.push(`rating = $${idx++}`);
      vals.push(opts.rating);
    }
    if (opts.title !== undefined) {
      sets.push(`title = $${idx++}`);
      vals.push(opts.title);
    }
    if (opts.body !== undefined) {
      sets.push(`body = $${idx++}`);
      vals.push(opts.body);
    }

    if (sets.length === 0) return existing;

    vals.push(opts.review_id);

    const review = await withTransaction(async (client) => {
      const { rows } = await client.query<ReviewRow>(
        `UPDATE pd_review SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals,
      );

      // Recalculate if rating changed
      if (opts.rating !== undefined) {
        await this.recalculateRating(client, rows[0].product_id);
      }

      return rows[0];
    });

    logger.info({ review_id: opts.review_id }, 'Review updated');
    return review;
  }

  // ─── Delete (owner only) ──────────────────────────────────────────

  async delete(review_id: string, customer_id: string): Promise<void> {
    const existing = await this.getById(review_id);
    if (existing.customer_id !== customer_id) {
      throw new PdForbiddenError('You can only delete your own reviews');
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM pd_review WHERE id = $1', [review_id]);
      await this.recalculateRating(client, existing.product_id);
    });

    logger.info({ review_id, product_id: existing.product_id }, 'Review deleted');
  }

  // ─── Read ─────────────────────────────────────────────────────────

  async getById(review_id: string): Promise<ReviewRow> {
    const { rows } = await query<ReviewRow>(
      'SELECT * FROM pd_review WHERE id = $1',
      [review_id],
    );
    if (rows.length === 0) throw new PdNotFoundError('Review not found');
    return rows[0];
  }

  async listByProduct(
    product_id: string,
    opts: { page?: number; limit?: number; sort?: 'recent' | 'helpful' | 'highest' | 'lowest' } = {},
  ): Promise<{ reviews: ReviewRow[]; total: number }> {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    let orderBy = 'r.created_at DESC';
    if (opts.sort === 'helpful') orderBy = 'r.helpful_count DESC, r.created_at DESC';
    if (opts.sort === 'highest') orderBy = 'r.rating DESC, r.created_at DESC';
    if (opts.sort === 'lowest') orderBy = 'r.rating ASC, r.created_at DESC';

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM pd_review WHERE product_id = $1 AND status = 'published'`,
      [product_id],
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<ReviewRow>(
      `SELECT r.*,
              COALESCE(u.first_name || ' ' || LEFT(u.last_name, 1) || '.', 'Anonyme') as customer_name
       FROM pd_review r
       LEFT JOIN pd_user u ON u.id = r.customer_id
       WHERE r.product_id = $1 AND r.status = 'published'
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [product_id, limit, offset],
    );

    return { reviews: rows, total };
  }

  async getProductRating(product_id: string): Promise<ProductRatingRow | null> {
    const { rows } = await query<ProductRatingRow>(
      'SELECT * FROM pd_product_rating WHERE product_id = $1',
      [product_id],
    );
    return rows[0] ?? null;
  }

  async getProductRatings(product_ids: string[]): Promise<Map<string, ProductRatingRow>> {
    if (product_ids.length === 0) return new Map();
    const placeholders = product_ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await query<ProductRatingRow>(
      `SELECT * FROM pd_product_rating WHERE product_id IN (${placeholders})`,
      product_ids,
    );
    const map = new Map<string, ProductRatingRow>();
    for (const row of rows) map.set(row.product_id, row);
    return map;
  }

  // ─── Admin moderation ─────────────────────────────────────────────

  async adminUpdateStatus(
    review_id: string,
    status: ReviewStatus,
    admin_notes?: string,
  ): Promise<ReviewRow> {
    const { rows } = await query<ReviewRow>(
      `UPDATE pd_review SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
      [status, admin_notes ?? null, review_id],
    );
    if (rows.length === 0) throw new PdNotFoundError('Review not found');

    // Recalculate since visibility changed
    await withTransaction(async (client) => {
      await this.recalculateRating(client, rows[0].product_id);
    });

    logger.info({ review_id, status }, 'Review status updated by admin');
    return rows[0];
  }

  async adminListPending(opts: { page?: number; limit?: number } = {}): Promise<{
    reviews: ReviewRow[];
    total: number;
  }> {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM pd_review WHERE status IN ('flagged', 'pending')`,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await query<ReviewRow>(
      `SELECT r.*,
              COALESCE(u.first_name || ' ' || LEFT(u.last_name, 1) || '.', 'Anonyme') as customer_name
       FROM pd_review r
       LEFT JOIN pd_user u ON u.id = r.customer_id
       WHERE r.status IN ('flagged', 'pending')
       ORDER BY r.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return { reviews: rows, total };
  }

  // ─── Helpful vote ─────────────────────────────────────────────────

  async markHelpful(review_id: string): Promise<void> {
    const { rowCount } = await query(
      'UPDATE pd_review SET helpful_count = helpful_count + 1 WHERE id = $1',
      [review_id],
    );
    if (rowCount === 0) throw new PdNotFoundError('Review not found');
  }

  // ─── Rating recalculation (called within transactions) ────────────

  private async recalculateRating(
    client: { query: typeof query extends (...args: infer A) => infer R ? (...args: A) => R : never },
    product_id: string,
  ): Promise<void> {
    // Use the raw client.query
    await (client as any).query(
      `INSERT INTO pd_product_rating (product_id, average_rating, review_count,
        rating_1, rating_2, rating_3, rating_4, rating_5, updated_at)
       SELECT
         $1,
         COALESCE(AVG(rating)::DECIMAL(3,2), 0),
         COUNT(*),
         COUNT(*) FILTER (WHERE rating = 1),
         COUNT(*) FILTER (WHERE rating = 2),
         COUNT(*) FILTER (WHERE rating = 3),
         COUNT(*) FILTER (WHERE rating = 4),
         COUNT(*) FILTER (WHERE rating = 5),
         NOW()
       FROM pd_review
       WHERE product_id = $1 AND status = 'published'
       ON CONFLICT (product_id) DO UPDATE SET
         average_rating = EXCLUDED.average_rating,
         review_count = EXCLUDED.review_count,
         rating_1 = EXCLUDED.rating_1,
         rating_2 = EXCLUDED.rating_2,
         rating_3 = EXCLUDED.rating_3,
         rating_4 = EXCLUDED.rating_4,
         rating_5 = EXCLUDED.rating_5,
         updated_at = NOW()`,
      [product_id],
    );
  }
}

export const reviewService = new ReviewService();
