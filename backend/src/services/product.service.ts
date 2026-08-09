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
import { categoryService } from './category.service';
import { logger } from '../utils/logger';
import { marketplaceAnalyticsEventService } from './marketplace-analytics-event.service';
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

export interface PublicProductVariantRow {
  id: string;
  title: string;
  price: string;
  sku: string | null;
  in_stock: boolean;
  inventory_quantity: number;
  options: Record<string, string>;
}

export interface PublicProductRow {
  id: string;
  store_id: string;
  type: ProductType;
  status: ProductStatus;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  marketplace_category_id: string | null;
  storefront_category_id: string | null;
  marketplace_category_name?: string | null;
  marketplace_category_slug?: string | null;
  storefront_category_name?: string | null;
  storefront_category_slug?: string | null;
  store_name?: string;
  store_subdomain?: string;
  store_custom_domain?: string | null;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: Date | string | null;
  store_product_count?: number | string | null;
  price: string;
  in_stock: boolean;
  stock_status: 'in_stock' | 'out_of_stock';
  weight_grams: number | null;
  thumbnail: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  attributes: ProductAttribute[];
  metadata?: Record<string, unknown> | null;
  images?: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    position: number;
    is_thumbnail: boolean;
  }>;
  variants?: PublicProductVariantRow[];
  created_at: Date;
  updated_at: Date;
}

export function formatPublicProductResponse(row: PublicProductRow) {
  return {
    id: row.id,
    store_id: row.store_id,
    type: row.type,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    currency: 'TND',
    thumbnail: row.thumbnail,
    images: row.images ?? [],
    variants: (row.variants ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      price: Number(v.price),
      sku: v.sku ?? null,
      in_stock: Boolean(v.in_stock),
      inventory_quantity: Number(v.inventory_quantity),
      options: v.options ?? {},
    })),
    availability: {
      in_stock: Boolean(row.in_stock),
      stock_status: row.stock_status ?? (row.in_stock ? 'in_stock' : 'out_of_stock'),
    },
    seo: {
      title: row.seo_title ?? null,
      description: row.seo_description ?? null,
    },
    tags: row.tags ?? [],
    attributes: row.attributes ?? [],
    metadata: row.metadata ?? {},
    wholesale_pricing: (row.metadata?.wholesale_pricing as any) ?? null,
    weight_grams: row.weight_grams ?? null,
    store_name: row.store_name,
    store_subdomain: row.store_subdomain,
    store_custom_domain: row.store_custom_domain ?? null,
    store_is_verified: row.store_is_verified ?? null,
    store_seller_type: row.store_seller_type ?? null,
    store_status: row.store_status ?? null,
    store_settings: row.store_settings ?? null,
    store_created_at: row.store_created_at ?? null,
    store_product_count: row.store_product_count !== undefined && row.store_product_count !== null ? Number(row.store_product_count) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export type BatchProductAction =
  | { type: 'set_status'; status: ProductStatus }
  | {
      type: 'adjust_price';
      mode: 'percent' | 'fixed';
      value: number;
      round_to_nearest_nine?: boolean;
    }
  | {
      type: 'set_category';
      marketplace_category_id?: string | null;
      storefront_category_id?: string | null;
    }
  | {
      type: 'adjust_inventory';
      mode: 'set' | 'delta';
      value: number;
    }
  | { type: 'delete' };

export interface BatchProductUpdateInput {
  product_ids: string[];
  action: BatchProductAction;
}

export interface BatchProductUpdateResult {
  affected_count: number;
  message: string;
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
  metadata?: Record<string, unknown>;
}

function isDownloadableType(type: ProductType): boolean {
  return type === ProductType.Digital || type === ProductType.Serial;
}

function normalizeLicenseKeys(keys?: string[]): string[] {
  return Array.from(new Set((keys ?? []).map((key) => key.trim()).filter(Boolean)));
}

export function isWholesaleCapableSeller(sellerType?: SellerType | null): boolean {
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
}, required = false): { enabled: boolean; min_quantity: number; price_tiers: WholesalePriceTier[] } | undefined {
  const hasMinQty = input.wholesale_min_quantity !== undefined && input.wholesale_min_quantity !== null;
  const hasTiers = Array.isArray(input.wholesale_price_tiers) && input.wholesale_price_tiers.length > 0;

  if (!hasMinQty && !hasTiers) {
    return undefined;
  }

  const priceTiers = normalizeWholesalePriceTiers(input.wholesale_price_tiers);
  if (priceTiers.length === 0) {
    if (required) {
      throw new PdValidationError('At least one wholesale price tier is required');
    }
    return undefined;
  }

  const rawMin = Number(input.wholesale_min_quantity);
  const minQuantity = Number.isInteger(rawMin) && rawMin >= 2 ? rawMin : (priceTiers[0]?.min_quantity ?? 2);

  return { enabled: true, min_quantity: minQuantity, price_tiers: priceTiers };
}

function publicProductOrderBy(sortBy?: string) {
  if (sortBy === 'oldest') return 'p.created_at ASC';
  if (sortBy === 'price_asc') return 'p.price ASC, p.created_at DESC';
  if (sortBy === 'price_desc') return 'p.price DESC, p.created_at DESC';
  if (sortBy === 'title_asc') return 'LOWER(p.title) ASC, p.created_at DESC';
  if (sortBy === 'title_desc') return 'LOWER(p.title) DESC, p.created_at DESC';
  if (sortBy === 'popular') return 'p.inventory_quantity DESC, p.created_at DESC';
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

    const wholesalePricing = buildWholesalePricingMetadata(input, false);
    const metadata = { ...(input.metadata || {}), ...(wholesalePricing ? { wholesale_pricing: wholesalePricing } : {}) };
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
    marketplaceAnalyticsEventService.insertMarketplaceEvent({
      event_type: 'product_created',
      store_id: input.store_id,
      product_id: id,
      category_id: input.marketplace_category_id || undefined,
      source: 'backend',
    });
    if (status === ProductStatus.Published) {
      marketplaceAnalyticsEventService.insertMarketplaceEvent({
        event_type: 'product_published',
        store_id: input.store_id,
        product_id: id,
        category_id: input.marketplace_category_id || undefined,
        source: 'backend',
      });
    }
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
        const mergedMeta = { ...(patch.metadata || {}), wholesale_pricing: wholesalePricing };
        fields.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${++i}::jsonb`);
        values.push(JSON.stringify(mergedMeta));
      } else {
        const cleanMeta = { ...(patch.metadata || {}) };
        delete (cleanMeta as any).wholesale_pricing;
        fields.push(`metadata = (COALESCE(metadata, '{}'::jsonb) - 'wholesale_pricing') || $${++i}::jsonb`);
        values.push(JSON.stringify(cleanMeta));
      }
    } else if (patch.metadata && Object.keys(patch.metadata).length > 0) {
      fields.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${++i}::jsonb`);
      values.push(JSON.stringify(patch.metadata));
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

  async getPublicById(id: string): Promise<PublicProductRow> {
    const { rows } = await query<PublicProductRow>(
      `SELECT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
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
             'title', pv.title,
             'price', pv.price,
             'sku', pv.sku,
             'in_stock', (pv.inventory_quantity > 0),
             'inventory_quantity', pv.inventory_quantity,
             'options', pv.options
           )
           ORDER BY pv.created_at ASC
         ) AS variants
         FROM pd_product_variant pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) v ON true
       WHERE p.id = $1 AND p.status = $2 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true
       LIMIT 1`,
      [id, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return rows[0];
  }

  async getPublishedByStoreSlug(storeId: string, slug: string): Promise<PublicProductRow> {
    const { rows } = await query<PublicProductRow>(
      `SELECT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
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
             'title', pv.title,
             'price', pv.price,
             'sku', pv.sku,
             'in_stock', (pv.inventory_quantity > 0),
             'inventory_quantity', pv.inventory_quantity,
             'options', pv.options
           )
           ORDER BY pv.created_at ASC
         ) AS variants
         FROM pd_product_variant pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) v ON true
       WHERE p.store_id = $1 AND p.slug = $2 AND p.status = $3 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true
       LIMIT 1`,
      [storeId, slug, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    return rows[0];
  }
  async archive(id: string): Promise<void> {
    await query(`UPDATE pd_product SET status = 'archived' WHERE id = $1`, [id]);
  }

  async batchUpdate(storeId: string, input: BatchProductUpdateInput): Promise<BatchProductUpdateResult> {
    const productIds = Array.from(new Set((input.product_ids || []).map((id) => String(id).trim()))).filter(Boolean);
    if (productIds.length === 0) {
      throw new PdValidationError('No products specified for batch operation');
    }

    // Verify ownership of all specified products
    const { rows: ownedRows } = await query<{ id: string; price: string; inventory_quantity: number }>(
      'SELECT id, price, inventory_quantity FROM pd_product WHERE store_id = $1 AND id = ANY($2::text[])',
      [storeId, productIds],
    );

    if (ownedRows.length === 0) {
      throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'None of the specified products belong to your store');
    }

    const ownedIds = ownedRows.map((r) => r.id);
    const action = input.action;

    switch (action.type) {
      case 'set_status': {
        await query(
          'UPDATE pd_product SET status = $1, updated_at = NOW() WHERE store_id = $2 AND id = ANY($3::text[])',
          [action.status, storeId, ownedIds],
        );
        return {
          affected_count: ownedIds.length,
          message: `${ownedIds.length} produit(s) mis à jour en statut "${action.status}".`,
        };
      }

      case 'adjust_price': {
        const val = Number(action.value);
        if (!Number.isFinite(val)) {
          throw new PdValidationError('Invalid price adjustment value');
        }

        await transaction(async (client) => {
          for (const row of ownedRows) {
            const oldPrice = parseFloat(row.price) || 0;
            let newPrice = oldPrice;
            if (action.mode === 'percent') {
              newPrice = oldPrice * (1 + val / 100);
            } else {
              newPrice = oldPrice + val;
            }

            newPrice = Math.max(0.001, newPrice);
            if (action.round_to_nearest_nine) {
              newPrice = Math.max(0.9, Math.floor(newPrice) + 0.9);
            }

            await client.query(
              'UPDATE pd_product SET price = $1, updated_at = NOW() WHERE id = $2',
              [newPrice.toFixed(3), row.id],
            );
          }
        });

        return {
          affected_count: ownedIds.length,
          message: `Prix ajusté pour ${ownedIds.length} produit(s).`,
        };
      }

      case 'set_category': {
        const fields: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [storeId, ownedIds];
        let i = 2;

        if (action.marketplace_category_id !== undefined) {
          fields.push(`marketplace_category_id = ${++i}`);
          values.push(action.marketplace_category_id);
        }
        if (action.storefront_category_id !== undefined) {
          fields.push(`storefront_category_id = ${++i}`);
          values.push(action.storefront_category_id);
        }

        if (fields.length > 1) {
          await query(
            `UPDATE pd_product SET ${fields.join(', ')} WHERE store_id = $1 AND id = ANY($2::text[])`,
            values,
          );
        }

        return {
          affected_count: ownedIds.length,
          message: `Catégories assignées à ${ownedIds.length} produit(s).`,
        };
      }

      case 'adjust_inventory': {
        const val = Number(action.value);
        if (!Number.isFinite(val)) {
          throw new PdValidationError('Invalid inventory value');
        }

        if (action.mode === 'set') {
          const qty = Math.max(0, Math.floor(val));
          await query(
            'UPDATE pd_product SET inventory_quantity = $1, updated_at = NOW() WHERE store_id = $2 AND id = ANY($3::text[])',
            [qty, storeId, ownedIds],
          );
        } else {
          const delta = Math.floor(val);
          await query(
            'UPDATE pd_product SET inventory_quantity = GREATEST(0, inventory_quantity + $1), updated_at = NOW() WHERE store_id = $2 AND id = ANY($3::text[])',
            [delta, storeId, ownedIds],
          );
        }

        return {
          affected_count: ownedIds.length,
          message: `Stock mis à jour pour ${ownedIds.length} produit(s).`,
        };
      }

      case 'delete': {
        await query(
          'DELETE FROM pd_product WHERE store_id = $1 AND id = ANY($2::text[])',
          [storeId, ownedIds],
        );
        return {
          affected_count: ownedIds.length,
          message: `${ownedIds.length} produit(s) supprimé(s) définitivement.`,
        };
      }

      default:
        throw new PdValidationError('Unknown batch action type');
    }
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
  async listPublished(opts: {
    page?: number;
    limit?: number;
    category?: string;
    marketplaceCategoryId?: string;
    storefrontCategoryId?: string;
    storeId?: string;
    sellerType?: SellerType;
    sortBy?: string;
    priceMin?: number;
    priceMax?: number;
    productType?: ProductType;
    inStockOnly?: boolean;
    tag?: string;
    q?: string;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [ProductStatus.Published];
    let where = "p.status = $1 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true";

    if (opts.category) {
      const subtreeIds = await categoryService.getCategorySubtreeIds(opts.category);
      params.push(subtreeIds);
      params.push(opts.category);
      where += ` AND (p.marketplace_category_id = ANY($${params.length - 1}::text[]) OR p.category = ANY($${params.length - 1}::text[]) OR mc.slug = $${params.length} OR p.storefront_category_id = $${params.length})`;
    }

    if (opts.marketplaceCategoryId) {
      params.push(opts.marketplaceCategoryId);
      where += ` AND p.marketplace_category_id = $${params.length}`;
    }

    if (opts.storefrontCategoryId) {
      params.push(opts.storefrontCategoryId);
      where += ` AND p.storefront_category_id = $${params.length}`;
    }

    if (opts.storeId) {
      params.push(opts.storeId);
      where += ` AND p.store_id = $${params.length}`;
    }

    if (opts.sellerType) {
      params.push(opts.sellerType);
      where += ` AND s.seller_type = $${params.length}`;
    }

    if (typeof opts.priceMin === 'number' && Number.isFinite(opts.priceMin)) {
      params.push(opts.priceMin);
      where += ` AND p.price >= $${params.length}`;
    }

    if (typeof opts.priceMax === 'number' && Number.isFinite(opts.priceMax)) {
      params.push(opts.priceMax);
      where += ` AND p.price <= $${params.length}`;
    }

    if (opts.productType) {
      params.push(opts.productType);
      where += ` AND p.type = $${params.length}`;
    }

    if (opts.inStockOnly) {
      where += ' AND p.inventory_quantity > 0';
    }

    if (opts.tag) {
      params.push(opts.tag);
      where += ` AND $${params.length} = ANY(p.tags)`;
    }

    if (opts.q && opts.q.trim().length > 0) {
      params.push(`%${opts.q.trim()}%`);
      where += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.tags::text ILIKE $${params.length})`;
    }

    const orderBy = publicProductOrderBy(opts.sortBy);
    params.push(limit, offset);

    const { rows } = await query<PublicProductRow>(
      `SELECT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name, parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', pv.id,
             'title', pv.title,
             'price', pv.price,
             'sku', pv.sku,
             'in_stock', (pv.inventory_quantity > 0),
             'inventory_quantity', pv.inventory_quantity,
             'options', pv.options
           )
           ORDER BY pv.created_at ASC
         ) AS variants
         FROM pd_product_variant pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) v ON true
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
    const total_pages = Math.ceil(total / limit) || 1;
    const formattedData = rows.map(formatPublicProductResponse);

    return {
      data: formattedData,
      meta: {
        page,
        limit,
        total,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    };
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
      const subtreeIds = await categoryService.getCategorySubtreeIds(opts.category);
      params.push(subtreeIds);
      params.push(opts.category);
      where += ` AND (p.marketplace_category_id = ANY($${params.length - 1}::text[]) OR p.category = ANY($${params.length - 1}::text[]) OR mc.slug = $${params.length})`;
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
    const { rows } = await query<PublicProductRow>(
      `SELECT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name, parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', pv.id,
             'title', pv.title,
             'price', pv.price,
             'sku', pv.sku,
             'in_stock', (pv.inventory_quantity > 0),
             'inventory_quantity', pv.inventory_quantity,
             'options', pv.options
           )
           ORDER BY pv.created_at ASC
         ) AS variants
         FROM pd_product_variant pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) v ON true
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
    const formattedData = rows.map(formatPublicProductResponse);
    return {
      hits: formattedData,
      data: formattedData,
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
      variantsByProduct.set(variant.product_id, [
        ...(variantsByProduct.get(variant.product_id) ?? []),
        variant,
      ]);
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


