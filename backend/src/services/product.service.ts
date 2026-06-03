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
  SellerType,
} from '@pandamarket/types';
import { subscriptionService } from './subscription.service';
import { logger } from '../utils/logger';
import { sanitizeProductDescription } from '../utils/sanitize-html';
import type { PoolClient } from 'pg';

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface WholesalePriceTier {
  min_quantity: number;
  unit_price: number;
}

export interface ProductVariantInput {
  id?: string;
  sku?: string | null;
  title: string;
  price: number;
  inventory_quantity?: number;
  options?: Record<string, string>;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  title: string;
  price: string;
  inventory_quantity: number;
  options: Record<string, string>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
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
  store_custom_domain?: string | null;
  store_seller_type?: SellerType | null;
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
  variants?: ProductVariantRow[];
  metadata: Record<string, unknown>;
  rejection_reason: string | null;
  // Digital product fields
  max_downloads: number | null;
  download_count: number | null;
  download_expires_hours: number | null;
  digital_file_key: string | null;
  digital_file_name: string | null;
  digital_file_content_type: string | null;
  digital_file_size: string | number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductInput {
  store_id: string;
  store_plan: string;
  store_is_verified: boolean;
  store_seller_type?: SellerType;
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
  status?: ProductStatus;
  max_downloads?: number | null;
  download_expires_hours?: number | null;
  digital_file_key?: string | null;
  digital_file_name?: string | null;
  digital_file_content_type?: string | null;
  digital_file_size?: number | null;
  license_keys?: string[];
  wholesale_min_quantity?: number | null;
  wholesale_price_tiers?: WholesalePriceTier[];
  variants?: ProductVariantInput[];
}

function isDownloadableType(type: ProductType): boolean {
  return type === ProductType.Digital || type === ProductType.Serial;
}

function normalizeLicenseKeys(keys?: string[]): string[] {
  return Array.from(new Set((keys ?? []).map((key) => key.trim()).filter(Boolean)));
}

function isWholesaleCapableSeller(sellerType?: SellerType | null): boolean {
  return sellerType === SellerType.Wholesaler || sellerType === SellerType.Hybrid;
}

function normalizeWholesalePriceTiers(tiers?: WholesalePriceTier[]): WholesalePriceTier[] {
  const normalized = (tiers ?? [])
    .map((tier) => ({
      min_quantity: Number(tier.min_quantity),
      unit_price: Number(tier.unit_price),
    }))
    .filter((tier) => Number.isInteger(tier.min_quantity) && tier.min_quantity > 0 && Number.isFinite(tier.unit_price) && tier.unit_price >= 0)
    .sort((a, b) => a.min_quantity - b.min_quantity);

  return normalized.filter((tier, index, all) => all.findIndex((item) => item.min_quantity === tier.min_quantity) === index);
}

function normalizeProductVariants(variants?: ProductVariantInput[]): ProductVariantInput[] {
  return (variants ?? []).map((variant) => {
    const title = variant.title.trim();
    const price = Number(variant.price);
    const inventoryQuantity = Number(variant.inventory_quantity ?? 0);
    if (!title) {
      throw new PdValidationError('Variant title is required');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new PdValidationError('Variant price must be a valid positive number');
    }
    if (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0) {
      throw new PdValidationError('Variant inventory must be a non-negative integer');
    }

    const options = Object.fromEntries(
      Object.entries(variant.options ?? {})
        .map(([key, value]) => [key.trim(), String(value).trim()])
        .filter(([key, value]) => key && value),
    );

    return {
      id: variant.id,
      sku: variant.sku?.trim() || null,
      title,
      price,
      inventory_quantity: inventoryQuantity,
      options,
    };
  });
}

function buildWholesalePricingMetadata(input: {
  store_seller_type?: SellerType;
  wholesale_min_quantity?: number | null;
  wholesale_price_tiers?: WholesalePriceTier[];
}, required: boolean): { enabled: boolean; min_quantity: number; price_tiers: WholesalePriceTier[] } | undefined {
  const hasWholesalePayload = input.wholesale_min_quantity !== undefined || input.wholesale_price_tiers !== undefined;
  if (!isWholesaleCapableSeller(input.store_seller_type)) {
    if (hasWholesalePayload) {
      throw new PdValidationError('Wholesale pricing is only available for wholesaler or hybrid sellers');
    }
    return undefined;
  }
  if (!required && !hasWholesalePayload) {
    return undefined;
  }

  const minQuantity = Number(input.wholesale_min_quantity);
  if (!Number.isInteger(minQuantity) || minQuantity < 2) {
    throw new PdValidationError('Wholesale minimum quantity must be at least 2');
  }

  const priceTiers = normalizeWholesalePriceTiers(input.wholesale_price_tiers);
  if (priceTiers.length === 0) {
    throw new PdValidationError('At least one wholesale price tier is required');
  }
  if (priceTiers.some((tier) => tier.min_quantity < minQuantity)) {
    throw new PdValidationError('Wholesale price tiers must start at or above the minimum wholesale quantity');
  }

  return { enabled: true, min_quantity: minQuantity, price_tiers: priceTiers };
}

function publicProductOrderBy(sortBy?: string) {
  if (sortBy === 'oldest') return 'p.created_at ASC';
  if (sortBy === 'price_asc') return 'p.price ASC, p.created_at DESC';
  if (sortBy === 'price_desc') return 'p.price DESC, p.created_at DESC';
  if (sortBy === 'title_asc') return 'LOWER(p.title) ASC, p.created_at DESC';
  return 'p.created_at DESC';
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

    const requestedStatus = input.status ?? (input.store_is_verified
      ? ProductStatus.Published
      : ProductStatus.PendingApproval);
    const status = requestedStatus === ProductStatus.Published && !input.store_is_verified
      ? ProductStatus.PendingApproval
      : requestedStatus;
    if (
      isDownloadableType(input.type) &&
      (status === ProductStatus.Published || status === ProductStatus.PendingApproval) &&
      !input.digital_file_key
    ) {
      throw new PdValidationError('Downloadable products require a file before publishing');
    }

    const licenseKeys = normalizeLicenseKeys(input.license_keys);
    if (licenseKeys.length > 0 && input.type !== ProductType.Serial) {
      throw new PdValidationError('License keys are only supported for serial products');
    }
    if (
      input.type === ProductType.Serial &&
      (status === ProductStatus.Published || status === ProductStatus.PendingApproval) &&
      licenseKeys.length === 0
    ) {
      throw new PdValidationError('Serial products require at least one license key before publishing');
    }

    const wholesalePricing = buildWholesalePricingMetadata(input, isWholesaleCapableSeller(input.store_seller_type));
    const metadata = wholesalePricing ? { wholesale_pricing: wholesalePricing } : {};
    const variants = normalizeProductVariants(input.variants);

    const productId = await transaction(async (c) => {
      const { rows } = await c.query<ProductRow>(
        `INSERT INTO pd_product
          (id, store_id, type, status, title, slug, description, category,
           marketplace_category_id, storefront_category_id, price, inventory_quantity,
           weight_grams, thumbnail, seo_title, seo_description, tags, product_reference, attributes,
           max_downloads, download_expires_hours, digital_file_key, digital_file_name,
           digital_file_content_type, digital_file_size, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
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
          input.max_downloads ?? 5,
          input.download_expires_hours ?? 72,
          input.digital_file_key ?? null,
          input.digital_file_name ?? null,
          input.digital_file_content_type ?? null,
          input.digital_file_size ?? null,
          JSON.stringify(metadata),
        ],
      );
      await this.addLicenseKeys(c, id, input.store_id, licenseKeys);
      await this.replaceVariants(c, id, variants);
      return rows[0].id;
    });

    logger.info({ product_id: id, store_id: input.store_id, status }, 'Product created');
    return this.getById(productId);
  }

  async getById(id: string): Promise<ProductRow> {
    const { rows } = await query<ProductRow>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              s.custom_domain AS store_custom_domain,
              s.seller_type AS store_seller_type,
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
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', pv.id,
             'product_id', pv.product_id,
             'sku', pv.sku,
             'title', pv.title,
             'price', pv.price,
             'inventory_quantity', pv.inventory_quantity,
             'options', pv.options,
             'is_active', pv.is_active
           )
           ORDER BY pv.created_at ASC
         ) AS variants
         FROM pd_product_variant pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) v ON true
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
    const licenseKeys = normalizeLicenseKeys(patch.license_keys);
    const variants = patch.variants !== undefined ? normalizeProductVariants(patch.variants) : undefined;
    if (
      patch.status === ProductStatus.Published ||
      patch.status === ProductStatus.PendingApproval ||
      patch.type === ProductType.Digital ||
      patch.type === ProductType.Serial ||
      patch.digital_file_key !== undefined ||
      licenseKeys.length > 0
    ) {
      current = await this.getById(id);
      const nextType = patch.type ?? current.type;
      const nextStatus = patch.status ?? current.status;
      const nextFileKey = patch.digital_file_key !== undefined ? patch.digital_file_key : current.digital_file_key;
      if (licenseKeys.length > 0 && nextType !== ProductType.Serial) {
        throw new PdValidationError('License keys are only supported for serial products');
      }
      if (
        isDownloadableType(nextType) &&
        (nextStatus === ProductStatus.Published || nextStatus === ProductStatus.PendingApproval) &&
        !nextFileKey
      ) {
        throw new PdValidationError('Downloadable products require a file before publishing');
      }
      if (
        nextType === ProductType.Serial &&
        (nextStatus === ProductStatus.Published || nextStatus === ProductStatus.PendingApproval) &&
        licenseKeys.length === 0
      ) {
        const { rows: licenseRows } = await query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM pd_license_key
           WHERE product_id = $1`,
          [id],
        );
        if (parseInt(licenseRows[0]?.count ?? '0', 10) === 0) {
          throw new PdValidationError('Serial products require at least one license key before publishing');
        }
      }
    }
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
      'max_downloads',
      'download_expires_hours',
      'digital_file_key',
      'digital_file_name',
      'digital_file_content_type',
      'digital_file_size',
      'status',
    ];
    if (patch.wholesale_min_quantity !== undefined || patch.wholesale_price_tiers !== undefined) {
      const wholesalePricing = buildWholesalePricingMetadata(patch, false);
      if (wholesalePricing) {
        fields.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${++i}::jsonb`);
        values.push(JSON.stringify({ wholesale_pricing: wholesalePricing }));
      }
    }
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
    if (fields.length === 0 && licenseKeys.length === 0 && variants === undefined) return this.getById(id);
    const productId = await transaction(async (c) => {
      current = current ?? (await this.getById(id));
      if (fields.length > 0) {
        const sql = `UPDATE pd_product SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
        const { rows } = await c.query<ProductRow>(sql, [id, ...values]);
        if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
        current = rows[0];
      }
      await this.addLicenseKeys(c, id, current.store_id, licenseKeys);
      if (variants !== undefined) {
        await this.replaceVariants(c, id, variants);
      }
      return id;
    });
    return this.getById(productId);
  }

  async getPublishedByStoreSlug(storeId: string, slug: string): Promise<ProductRow & { store_name: string; store_subdomain: string; store_custom_domain: string | null }> {
    const { rows } = await query<ProductRow & { store_name: string; store_subdomain: string; store_custom_domain: string | null }>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              s.seller_type AS store_seller_type,
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
       WHERE p.store_id = $1 AND p.slug = $2 AND p.status = $3 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true
       LIMIT 1`,
      [storeId, slug, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return (await this.attachVariants(rows))[0];
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
    return { data: await this.attachVariants(rows), meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * List published products across the platform (Hub homepage / category browsing).
   */
  async listPublished(opts: { page?: number; limit?: number; category?: string; marketplaceCategoryId?: string; storeId?: string; sellerType?: SellerType; sortBy?: string } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const params: unknown[] = [ProductStatus.Published];
    let where = "p.status = $1 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true";
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
    if (opts.sellerType) {
      params.push(opts.sellerType);
      where += ` AND s.seller_type = $${params.length}`;
    }
    const orderBy = publicProductOrderBy(opts.sortBy);
    params.push(limit, offset);
    const { rows } = await query<ProductRow & { store_name: string; store_subdomain: string }>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              s.seller_type AS store_seller_type,
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
      sellerType?: SellerType;
      sortBy?: string;
    } = {},
  ) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = Math.max(0, opts.offset ?? 0);
    const params: unknown[] = [ProductStatus.Published];
    let where = "p.status = $1 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true";

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

    if (opts.sellerType) {
      params.push(opts.sellerType);
      where += ` AND s.seller_type = $${params.length}`;
    }

    const orderBy = publicProductOrderBy(opts.sortBy);

    params.push(limit, offset);
    const { rows } = await query<ProductRow & { store_name: string; store_subdomain: string }>(
      `SELECT p.*, s.name AS store_name, s.subdomain AS store_subdomain,
              s.seller_type AS store_seller_type,
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
    plan: string,
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

  private async attachVariants<T extends ProductRow>(products: T[]): Promise<T[]> {
    const productIds = products.map((product) => product.id);
    if (productIds.length === 0) return products;

    const { rows } = await query<ProductVariantRow>(
      `SELECT *
       FROM pd_product_variant
       WHERE product_id = ANY($1::varchar[]) AND is_active = true
       ORDER BY created_at ASC`,
      [productIds],
    );

    const variantsByProduct = new Map<string, ProductVariantRow[]>();
    for (const variant of rows) {
      // ⚡ Bolt: Replaced O(N^2) array spread with direct mutation (.push())
      // to prevent severe memory reallocation bottlenecks when mapping variants.
      const existing = variantsByProduct.get(variant.product_id);
      if (existing) {
        existing.push(variant);
      } else {
        variantsByProduct.set(variant.product_id, [variant]);
      }
    }

    return products.map((product) => ({
      ...product,
      variants: variantsByProduct.get(product.id) ?? product.variants ?? [],
    }));
  }

  private async addLicenseKeys(client: PoolClient, productId: string, storeId: string, keys: string[]): Promise<void> {
    const licenseKeys = normalizeLicenseKeys(keys);
    if (licenseKeys.length === 0) return;
    const { rows } = await client.query<{ license_key: string }>(
      `SELECT license_key FROM pd_license_key
       WHERE product_id = $1 AND license_key = ANY($2::text[])`,
      [productId, licenseKeys],
    );
    const existing = new Set(rows.map((row) => row.license_key));
    for (const licenseKey of licenseKeys.filter((key) => !existing.has(key))) {
      await client.query(
        `INSERT INTO pd_license_key (id, product_id, store_id, license_key)
         VALUES ($1, $2, $3, $4)`,
        [pdId('lic'), productId, storeId, licenseKey],
      );
    }
  }

  private async replaceVariants(client: PoolClient, productId: string, variants: ProductVariantInput[]): Promise<void> {
    const keptIds = variants.map((variant) => variant.id).filter(Boolean);
    if (keptIds.length > 0) {
      await client.query(
        `UPDATE pd_product_variant
         SET is_active = false, updated_at = NOW()
         WHERE product_id = $1 AND id != ALL($2::varchar[])`,
        [productId, keptIds],
      );
    } else {
      await client.query(
        `UPDATE pd_product_variant
         SET is_active = false, updated_at = NOW()
         WHERE product_id = $1`,
        [productId],
      );
    }

    for (const variant of variants) {
      if (variant.id) {
        const { rowCount } = await client.query(
          `UPDATE pd_product_variant
           SET sku = $3,
               title = $4,
               price = $5,
               inventory_quantity = $6,
               options = $7::jsonb,
               is_active = true,
               updated_at = NOW()
           WHERE id = $1 AND product_id = $2`,
          [
            variant.id,
            productId,
            variant.sku ?? null,
            variant.title,
            variant.price,
            variant.inventory_quantity ?? 0,
            JSON.stringify(variant.options ?? {}),
          ],
        );
        if (rowCount) continue;
      }

      await client.query(
        `INSERT INTO pd_product_variant
          (id, product_id, sku, title, price, inventory_quantity, options, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)`,
        [
          pdId('var'),
          productId,
          variant.sku ?? null,
          variant.title,
          variant.price,
          variant.inventory_quantity ?? 0,
          JSON.stringify(variant.options ?? {}),
        ],
      );
    }
  }
}

export const productService = new ProductService();


