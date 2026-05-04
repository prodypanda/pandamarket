/**
 * ProductService — CRUD on products + image management.
 * Enforces:
 *   - Quotas per plan (via SubscriptionService)
 *   - Approval flow for unverified vendors (status = pending_approval → admin reviews)
 */

import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { slugify } from '../utils/subdomain';
import {
  PdConflictError,
  PdForbiddenError,
  PdNotFoundError,
  PdValidationError,
  PdErrorCode,
} from '../errors';
import {
  ProductStatus,
  ProductType,
  SubscriptionPlan,
} from '@pandamarket/types';
import { subscriptionService } from './subscription.service';
import { logger } from '../utils/logger';

export interface ProductRow {
  id: string;
  store_id: string;
  type: ProductType;
  status: ProductStatus;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  price: string;
  inventory_quantity: number;
  weight_grams: number | null;
  thumbnail: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  rejection_reason: string | null;
  // Digital product fields
  max_downloads: number | null;
  download_count: number | null;
  download_expires_hours: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductInput {
  store_id: string;
  store_plan: SubscriptionPlan;
  store_is_verified: boolean;
  type: ProductType;
  title: string;
  description?: string;
  category?: string;
  price: number;
  inventory_quantity?: number;
  weight_grams?: number;
  tags?: string[];
}

export class ProductService {
  /**
   * Create a product. Status depends on the vendor's verification status:
   *   - verified vendor → published immediately
   *   - unverified      → pending_approval (admin must approve)
   */
  async create(input: CreateProductInput): Promise<ProductRow> {
    if (input.price < 0) {
      throw new PdValidationError('Price cannot be negative');
    }
    if (!input.title || input.title.trim().length < 2) {
      throw new PdValidationError('Title is required (min 2 chars)');
    }

    await subscriptionService.assertCanCreateProduct(input.store_id, input.store_plan);

    const id = pdId('prod');
    const baseSlug = slugify(input.title);
    const slug = await this.uniqueSlug(input.store_id, baseSlug);

    const status = input.store_is_verified
      ? ProductStatus.Published
      : ProductStatus.PendingApproval;

    const { rows } = await query<ProductRow>(
      `INSERT INTO pd_product
        (id, store_id, type, status, title, slug, description, category,
         price, inventory_quantity, weight_grams, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        input.store_id,
        input.type,
        status,
        input.title.trim(),
        slug,
        input.description ?? null,
        input.category ?? null,
        input.price,
        input.inventory_quantity ?? 0,
        input.weight_grams ?? null,
        JSON.stringify(input.tags ?? []),
      ],
    );

    logger.info({ product_id: id, store_id: input.store_id, status }, 'Product created');
    return rows[0];
  }

  async getById(id: string): Promise<ProductRow> {
    const { rows } = await query<ProductRow>('SELECT * FROM pd_product WHERE id = $1', [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return rows[0];
  }

  async update(id: string, patch: Partial<CreateProductInput> & { status?: ProductStatus }): Promise<ProductRow> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const allowed: Array<keyof typeof patch> = [
      'title',
      'description',
      'category',
      'price',
      'inventory_quantity',
      'weight_grams',
      'tags',
      'status',
    ];
    for (const k of allowed) {
      if (patch[k] !== undefined) {
        fields.push(`${k} = $${++i}`);
        values.push(k === 'tags' ? JSON.stringify(patch[k]) : patch[k]);
      }
    }
    if (fields.length === 0) return this.getById(id);
    const sql = `UPDATE pd_product SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
    const { rows } = await query<ProductRow>(sql, [id, ...values]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return rows[0];
  }

  async archive(id: string): Promise<void> {
    await query(`UPDATE pd_product SET status = 'archived' WHERE id = $1`, [id]);
  }

  async delete(id: string): Promise<void> {
    // Soft-delete via status; hard delete cascades to images/variants
    await query('DELETE FROM pd_product WHERE id = $1', [id]);
  }

  /**
   * List products for a store. Supports filtering by status.
   */
  async listByStore(
    storeId: string,
    opts: { status?: ProductStatus; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [storeId];
    let where = 'store_id = $1';
    if (opts.status) {
      params.push(opts.status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await query<ProductRow>(
      `SELECT * FROM pd_product
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_product WHERE ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * List published products across the platform (Hub homepage / category browsing).
   */
  async listPublished(opts: { page?: number; limit?: number; category?: string } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [ProductStatus.Published];
    let where = 'status = $1';
    if (opts.category) {
      params.push(opts.category);
      where += ` AND category = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await query<ProductRow>(
      `SELECT * FROM pd_product
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_product WHERE ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * Admin approves a pending product.
   */
  async approve(id: string): Promise<ProductRow> {
    const { rows } = await query<ProductRow>(
      `UPDATE pd_product SET status = 'published', rejection_reason = NULL
       WHERE id = $1 AND status = 'pending_approval' RETURNING *`,
      [id],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(
        PdErrorCode.PRODUCT_NOT_FOUND,
        'Product not found or not pending',
      );
    }
    return rows[0];
  }

  /**
   * Admin rejects a pending product.
   */
  async reject(id: string, reason: string): Promise<ProductRow> {
    if (!reason) throw new PdValidationError('Reason is required');
    const { rows } = await query<ProductRow>(
      `UPDATE pd_product SET status = 'rejected', rejection_reason = $2
       WHERE id = $1 AND status = 'pending_approval' RETURNING *`,
      [id, reason],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(
        PdErrorCode.PRODUCT_NOT_FOUND,
        'Product not found or not pending',
      );
    }
    return rows[0];
  }

  // ---------------------------------------------------------------
  // Images
  // ---------------------------------------------------------------

  /**
   * Add an image URL to a product (after it's been uploaded to S3 via presigned URL).
   */
  async addImage(
    productId: string,
    plan: SubscriptionPlan,
    opts: { url: string; alt_text?: string; is_thumbnail?: boolean },
  ): Promise<{ id: string; url: string; alt_text: string | null; position: number }> {
    await subscriptionService.assertCanAddImage(productId, plan);
    return transaction(async (c) => {
      const { rows: posRows } = await c.query<{ next_pos: number }>(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
         FROM pd_product_image WHERE product_id = $1`,
        [productId],
      );
      const id = pdId('pimg');
      if (opts.is_thumbnail) {
        await c.query(
          'UPDATE pd_product_image SET is_thumbnail = false WHERE product_id = $1',
          [productId],
        );
        await c.query('UPDATE pd_product SET thumbnail = $2 WHERE id = $1', [
          productId,
          opts.url,
        ]);
      }
      const { rows } = await c.query<{
        id: string;
        url: string;
        alt_text: string | null;
        position: number;
      }>(
        `INSERT INTO pd_product_image (id, product_id, url, alt_text, position, is_thumbnail)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, url, alt_text, position`,
        [id, productId, opts.url, opts.alt_text ?? null, posRows[0].next_pos, opts.is_thumbnail ?? false],
      );
      return rows[0];
    });
  }

  async deleteImage(productId: string, imageId: string): Promise<void> {
    const { rowCount } = await query(
      'DELETE FROM pd_product_image WHERE id = $1 AND product_id = $2',
      [imageId, productId],
    );
    if (!rowCount) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Image not found');
  }

  /**
   * Authorisation helper — assert the given user owns the product (via store).
   */
  async assertOwnership(productId: string, storeId: string): Promise<void> {
    const product = await this.getById(productId);
    if (product.store_id !== storeId) {
      throw new PdForbiddenError(
        PdErrorCode.PERM_NOT_OWNER,
        'You can only modify your own products',
      );
    }
  }

  // ---------------------------------------------------------------
  // internals
  // ---------------------------------------------------------------

  private async uniqueSlug(storeId: string, baseSlug: string): Promise<string> {
    let candidate = baseSlug || 'product';
    let attempt = 0;
    while (attempt < 50) {
      const { rowCount } = await query(
        'SELECT 1 FROM pd_product WHERE store_id = $1 AND slug = $2',
        [storeId, candidate],
      );
      if (!rowCount) return candidate;
      attempt++;
      candidate = `${baseSlug}-${attempt + 1}`;
    }
    throw new PdConflictError(
      PdErrorCode.NOT_FOUND,
      'Could not generate a unique slug after 50 tries',
    );
  }
}

export const productService = new ProductService();
