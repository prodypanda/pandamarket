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
import { sanitizeProductDescription } from '../utils/sanitize-html';

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductRow {
  id: string;
  store_id: string;
  type: ProductType;
  status: ProductStatus;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  product_reference: string | null;
  marketplace_category_id: string | null;
  storefront_category_id: string | null;
  marketplace_category_name?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_name?: string | null;
  storefront_category_slug?: string | null;
  storefront_parent_category_name?: string | null;
  storefront_parent_category_slug?: string | null;
  store_subdomain?: string | null;
  store_is_verified?: boolean | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: Date | null;
  store_product_count?: string | number | null;
  price: string;
  inventory_quantity: number;
  weight_grams: number | null;
  thumbnail: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  attributes: ProductAttribute[];
  images?: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    position: number;
    is_thumbnail: boolean;
  }>;
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
  slug?: string;
  description?: string;
  category?: string;
  product_reference?: string | null;
  marketplace_category_id?: string | null;
  storefront_category_id?: string | null;
  price: number;
  inventory_quantity?: number;
  weight_grams?: number;
  thumbnail?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  tags?: string[];
  attributes?: ProductAttribute[];
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
    const baseSlug = slugify(input.slug || input.title);
    const slug = await this.uniqueSlug(input.store_id, baseSlug);

    const status = input.store_is_verified
      ? ProductStatus.Published
      : ProductStatus.PendingApproval;

    const { rows } = await query<ProductRow>(
      `INSERT INTO pd_product
        (id, store_id, type, status, title, slug, description, category,
         marketplace_category_id, storefront_category_id, price, inventory_quantity,
         weight_grams, thumbnail, seo_title, seo_description, tags, product_reference, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        id,
        input.store_id,
        input.type,
        status,
        input.title.trim(),
        slug,
        sanitizeProductDescription(input.description),
        input.category ?? null,
        input.marketplace_category_id ?? null,
        input.storefront_category_id ?? null,
        input.price,
        input.inventory_quantity ?? 0,
        input.weight_grams ?? null,
        input.thumbnail ?? null,
        input.seo_title ?? null,
        input.seo_description ?? null,
        JSON.stringify(input.tags ?? []),
        input.product_reference?.trim() || null,
        JSON.stringify(input.attributes ?? []),
      ],
    );

    logger.info({ product_id: id, store_id: input.store_id, status }, 'Product created');
    return rows[0];
  }

  async getById(id: string): Promise<ProductRow> {
    const { rows } = await query<ProductRow>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              s.is_verified AS store_is_verified,
              s.status AS store_status,
              s.settings AS store_settings,
              s.created_at AS store_created_at,
              seller_stats.product_count AS store_product_count,
              mc.name AS marketplace_category_name,
              mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name,
              sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name,
              parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::text AS product_count
         FROM pd_product sp
         WHERE sp.store_id = s.id AND sp.status = $2
       ) seller_stats ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', pi.id,
             'url', pi.url,
             'alt_text', pi.alt_text,
             'position', pi.position,
             'is_thumbnail', pi.is_thumbnail
           )
           ORDER BY pi.position ASC
         ) AS images
         FROM pd_product_image pi
         WHERE pi.product_id = p.id
       ) img ON true
       WHERE p.id = $1
       LIMIT 1`,
      [id, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return rows[0];
  }

  async update(id: string, patch: Partial<CreateProductInput> & { status?: ProductStatus }): Promise<ProductRow> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    let current: ProductRow | null = null;
    const allowed: Array<keyof typeof patch> = [
      'type',
      'title',
      'description',
      'category',
      'product_reference',
      'marketplace_category_id',
      'storefront_category_id',
      'price',
      'inventory_quantity',
      'weight_grams',
      'thumbnail',
      'seo_title',
      'seo_description',
      'tags',
      'attributes',
      'status',
    ];
    if (patch.slug !== undefined) {
      current = await this.getById(id);
      fields.push(`slug = $${++i}`);
      values.push(await this.uniqueSlug(current.store_id, slugify(patch.slug || patch.title || current.title), id));
    }
    for (const k of allowed) {
      if (patch[k] !== undefined) {
        fields.push(`${k} = $${++i}`);
        values.push(k === 'tags' || k === 'attributes' ? JSON.stringify(patch[k]) : k === 'description' ? sanitizeProductDescription(patch[k] as string | null | undefined) : patch[k]);
      }
    }
    if (fields.length === 0) return this.getById(id);
    const sql = `UPDATE pd_product SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
    const { rows } = await query<ProductRow>(sql, [id, ...values]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return rows[0];
  }

  async getPublishedByStoreSlug(storeId: string, slug: string): Promise<ProductRow & { store_name: string; store_subdomain: string }> {
    const { rows } = await query<ProductRow & { store_name: string; store_subdomain: string }>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              s.is_verified AS store_is_verified,
              s.status AS store_status,
              s.settings AS store_settings,
              s.created_at AS store_created_at,
              seller_stats.product_count AS store_product_count,
              mc.name AS marketplace_category_name,
              mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name,
              sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name,
              parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::text AS product_count
         FROM pd_product sp
         WHERE sp.store_id = s.id AND sp.status = $3
       ) seller_stats ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', pi.id,
             'url', pi.url,
             'alt_text', pi.alt_text,
             'position', pi.position,
             'is_thumbnail', pi.is_thumbnail
           )
           ORDER BY pi.position ASC
         ) AS images
         FROM pd_product_image pi
         WHERE pi.product_id = p.id
       ) img ON true
       WHERE p.store_id = $1 AND p.slug = $2 AND p.status = $3
       LIMIT 1`,
      [storeId, slug, ProductStatus.Published],
    );
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
      `SELECT p.*,
              s.subdomain AS store_subdomain,
              mc.name AS marketplace_category_name,
              mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name,
              sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name,
              parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', pi.id,
             'url', pi.url,
             'alt_text', pi.alt_text,
             'position', pi.position,
             'is_thumbnail', pi.is_thumbnail
           )
           ORDER BY pi.position ASC
         ) AS images
         FROM pd_product_image pi
         WHERE pi.product_id = p.id
       ) img ON true
       WHERE ${where.replaceAll('store_id', 'p.store_id').replaceAll('status', 'p.status')}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_product p
       WHERE ${where.replaceAll('store_id', 'p.store_id').replaceAll('status', 'p.status')}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * List published products across the platform (Hub homepage / category browsing).
   */
  async listPublished(opts: { page?: number; limit?: number; category?: string; marketplaceCategoryId?: string; storeId?: string } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [ProductStatus.Published];
    let where = 'p.status = $1';
    if (opts.category) {
      params.push(opts.category);
      where += ` AND (p.category = $${params.length} OR p.marketplace_category_id = $${params.length} OR mc.slug = $${params.length})`;
    }
    if (opts.marketplaceCategoryId) {
      params.push(opts.marketplaceCategoryId);
      where += ` AND p.marketplace_category_id = $${params.length}`;
    }
    if (opts.storeId) {
      params.push(opts.storeId);
      where += ` AND p.store_id = $${params.length}`;
    }
    params.push(limit, offset);
    const { rows } = await query<ProductRow & { store_name: string; store_subdomain: string }>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              mc.name AS marketplace_category_name,
              mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name,
              sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name,
              parent_sc.slug AS storefront_parent_category_slug
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       WHERE ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  async searchPublished(
    opts: {
      query?: string;
      category?: string;
      limit?: number;
      offset?: number;
      priceMin?: number;
      priceMax?: number;
      type?: ProductType;
      verifiedOnly?: boolean;
      sortBy?: string;
    } = {},
  ) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = Math.max(0, opts.offset ?? 0);
    const params: unknown[] = [ProductStatus.Published];
    let where = 'p.status = $1';

    const term = opts.query?.trim();
    if (term) {
      params.push(`%${term}%`);
      where += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.category ILIKE $${params.length} OR p.product_reference ILIKE $${params.length} OR p.tags::text ILIKE $${params.length} OR p.attributes::text ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
    }

    if (opts.category) {
      params.push(opts.category);
      where += ` AND (p.category = $${params.length} OR p.marketplace_category_id = $${params.length} OR mc.slug = $${params.length})`;
    }

    if (typeof opts.priceMin === 'number' && Number.isFinite(opts.priceMin)) {
      params.push(opts.priceMin);
      where += ` AND p.price >= $${params.length}`;
    }

    if (typeof opts.priceMax === 'number' && Number.isFinite(opts.priceMax)) {
      params.push(opts.priceMax);
      where += ` AND p.price <= $${params.length}`;
    }

    if (opts.type) {
      params.push(opts.type);
      where += ` AND p.type = $${params.length}`;
    }

    if (opts.verifiedOnly) {
      where += ' AND s.is_verified = true';
    }

    let orderBy = 'p.created_at DESC';
    if (opts.sortBy === 'price_asc') orderBy = 'p.price ASC';
    if (opts.sortBy === 'price_desc') orderBy = 'p.price DESC';
    if (opts.sortBy === 'date') orderBy = 'p.created_at DESC';

    params.push(limit, offset);
    const { rows } = await query<ProductRow & { store_name: string; store_subdomain: string }>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              mc.name AS marketplace_category_name,
              mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name,
              sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name,
              parent_sc.slug AS storefront_parent_category_slug
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       WHERE ${where}`,
      params.slice(0, -2),
    );
    const total = parseInt(countRows[0].count, 10);
    return {
      hits: rows,
      data: rows,
      estimatedTotalHits: total,
      total,
      limit,
      offset,
    };
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

  async listStoreMedia(storeId: string, opts: { limit?: number } = {}) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 60));
    const { rows } = await query<{
      url: string;
      product_id: string;
      product_title: string;
      alt_text: string | null;
      is_thumbnail: boolean;
      created_at: Date;
    }>(
      `SELECT DISTINCT ON (media.url)
              media.url,
              media.product_id,
              media.product_title,
              media.alt_text,
              media.is_thumbnail,
              media.created_at
       FROM (
         SELECT pi.url,
                p.id AS product_id,
                p.title AS product_title,
                pi.alt_text,
                pi.is_thumbnail,
                pi.created_at
         FROM pd_product_image pi
         JOIN pd_product p ON p.id = pi.product_id
         WHERE p.store_id = $1
         UNION ALL
         SELECT p.thumbnail AS url,
                p.id AS product_id,
                p.title AS product_title,
                p.title AS alt_text,
                true AS is_thumbnail,
                p.created_at
         FROM pd_product p
         WHERE p.store_id = $1 AND p.thumbnail IS NOT NULL
       ) media
       WHERE media.url IS NOT NULL
       ORDER BY media.url, media.created_at DESC
       LIMIT $2`,
      [storeId, limit],
    );
    return rows;
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

  private async uniqueSlug(storeId: string, baseSlug: string, excludeId?: string): Promise<string> {
    const base = baseSlug || 'product';
    let candidate = base;
    let attempt = 0;
    while (attempt < 50) {
      const params: unknown[] = [storeId, candidate];
      let sql = 'SELECT 1 FROM pd_product WHERE store_id = $1 AND slug = $2';
      if (excludeId) {
        params.push(excludeId);
        sql += ` AND id != $${params.length}`;
      }
      const { rowCount } = await query(
        sql,
        params,
      );
      if (!rowCount) return candidate;
      attempt++;
      candidate = `${base}-${attempt + 1}`;
    }
    throw new PdConflictError(
      PdErrorCode.NOT_FOUND,
      'Could not generate a unique slug after 50 tries',
    );
  }
}

export const productService = new ProductService();


