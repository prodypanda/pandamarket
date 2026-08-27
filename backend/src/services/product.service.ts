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
import { imageVariantService } from './image-variant.service';
import { fileAssetService } from './file-asset.service';
import { aiProductTaggerService } from './ai-product-tagger.service';
import { notificationBatchService } from './notification-batch.service';
import { backInStockService } from './back-in-stock.service';
import { eventBus, PdEvent } from '../events/event-bus';
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
  compare_at_price?: number | null;
  inventory_quantity?: number;
  options?: Record<string, string>;
}

export interface ProductBundleItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  position?: number;
}

export interface ProductBundleItemRow {
  id: string;
  bundle_product_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  position: number;
  created_at: Date;
  updated_at: Date;
  product_title?: string;
  product_slug?: string;
  product_price?: string | number;
  product_compare_at_price?: string | number | null;
  product_thumbnail?: string | null;
  product_inventory_quantity?: number;
  product_type?: ProductType;
  variant_title?: string | null;
  variant_price?: string | number | null;
  variant_compare_at_price?: string | number | null;
  variant_inventory_quantity?: number;
  variant_sku?: string | null;
  variant_options?: Record<string, string>;
  available_stock?: number;
}

export function usesInventory(type: ProductType | string): boolean {
  return type === ProductType.Physical || type === ProductType.Serial || type === 'physical' || type === 'serial';
}

export function computeBundleAvailableStock(bundleItems?: ProductBundleItemRow[]): number {
  if (!bundleItems || bundleItems.length === 0) return 0;
  let minStock = Infinity;
  for (const item of bundleItems) {
    if (item.product_type && !usesInventory(item.product_type)) {
      continue;
    }
    const qty = Number(item.quantity) || 1;
    const itemStock = item.variant_inventory_quantity !== undefined && item.variant_inventory_quantity !== null
      ? Number(item.variant_inventory_quantity)
      : Number(item.product_inventory_quantity || 0);
    const possiblePacks = Math.floor(Math.max(0, itemStock) / qty);
    if (possiblePacks < minStock) {
      minStock = possiblePacks;
    }
  }
  return Number.isFinite(minStock) ? minStock : 0;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  title: string;
  price: string;
  compare_at_price?: string | number | null;
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
  store_name?: string | null;
  store_subdomain?: string | null;
  store_custom_domain?: string | null;
  store_seller_type?: SellerType | null;
  store_is_verified?: boolean | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: Date | null;
  store_product_count?: string | number | null;
  price: string;
  compare_at_price?: string | number | null;
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
  bundle_pricing_type?: 'fixed' | 'percentage' | null;
  bundle_discount_value?: number | null;
  bundle_items?: ProductBundleItemRow[];
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
  compare_at_price?: string | number | null;
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
  storefront_parent_category_name?: string | null;
  storefront_parent_category_slug?: string | null;
  store_name?: string;
  store_subdomain?: string;
  store_custom_domain?: string | null;
  store_is_verified?: boolean | null;
  store_seller_type?: string | null;
  store_status?: string | null;
  store_settings?: Record<string, unknown> | null;
  store_created_at?: Date | string | null;
  store_product_count?: number | string | null;
  average_rating?: number | null;
  review_count?: number | null;
  price: string;
  compare_at_price?: string | number | null;
  inventory_quantity?: number | string | null;
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
  bundle_pricing_type?: 'fixed' | 'percentage' | null;
  bundle_discount_value?: number | null;
  bundle_items?: ProductBundleItemRow[];
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
    compare_at_price: row.compare_at_price ? Number(row.compare_at_price) : null,
    ...(row.inventory_quantity !== undefined && row.inventory_quantity !== null ? { inventory_quantity: Number(row.inventory_quantity) } : {}),
    currency: 'TND',
    thumbnail: row.thumbnail,
    images: row.images ?? [],
    variants: (row.variants ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      price: Number(v.price),
      compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
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
    average_rating: row.average_rating !== undefined && row.average_rating !== null ? Number(row.average_rating) : 0,
    review_count: row.review_count !== undefined && row.review_count !== null ? Number(row.review_count) : 0,
    marketplace_category_slug: row.marketplace_category_slug ?? null,
    marketplace_category_name: row.marketplace_category_name ?? null,
    storefront_category_slug: row.storefront_category_slug ?? null,
    storefront_category_name: row.storefront_category_name ?? null,
    storefront_parent_category_slug: row.storefront_parent_category_slug ?? null,
    storefront_parent_category_name: row.storefront_parent_category_name ?? null,
    bundle_pricing_type: row.bundle_pricing_type ?? null,
    bundle_discount_value: row.bundle_discount_value !== undefined && row.bundle_discount_value !== null ? Number(row.bundle_discount_value) : null,
    bundle_items: (row.bundle_items ?? []).map((bi) => ({
      id: bi.id,
      bundle_product_id: bi.bundle_product_id,
      product_id: bi.product_id,
      variant_id: bi.variant_id ?? null,
      quantity: Number(bi.quantity || 1),
      position: Number(bi.position || 0),
      product_title: bi.product_title,
      product_slug: bi.product_slug,
      product_price: Number(bi.product_price || 0),
      product_compare_at_price: bi.product_compare_at_price ? Number(bi.product_compare_at_price) : null,
      product_thumbnail: bi.product_thumbnail || null,
      product_inventory_quantity: Number(bi.product_inventory_quantity || 0),
      product_type: bi.product_type,
      variant_title: bi.variant_title ?? null,
      variant_price: bi.variant_price ? Number(bi.variant_price) : null,
      variant_compare_at_price: bi.variant_compare_at_price ? Number(bi.variant_compare_at_price) : null,
      variant_inventory_quantity: bi.variant_inventory_quantity !== undefined ? Number(bi.variant_inventory_quantity) : undefined,
      variant_sku: bi.variant_sku ?? null,
      variant_options: bi.variant_options ?? {},
      available_stock: bi.variant_inventory_quantity !== undefined ? Number(bi.variant_inventory_quantity) : Number(bi.product_inventory_quantity || 0),
    })),
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
      type: 'apply_discount';
      mode: 'percent' | 'fixed';
      value: number;
    }
  | { type: 'clear_discount' }
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
  compare_at_price?: number | null;
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
  bundle_pricing_type?: 'fixed' | 'percentage' | null;
  bundle_discount_value?: number | null;
  bundle_items?: ProductBundleItemInput[];
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
    const compareAtPrice = variant.compare_at_price !== undefined && variant.compare_at_price !== null ? Number(variant.compare_at_price) : null;
    const inventoryQuantity = Number(variant.inventory_quantity ?? 0);
    if (!title) {
      throw new PdValidationError('Variant title is required');
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new PdValidationError('Variant price must be a valid positive number');
    }
    if (compareAtPrice !== null) {
      if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
        throw new PdValidationError('Variant old price must be a valid positive number');
      }
      if (compareAtPrice <= price) {
        throw new PdValidationError('Variant old price must be strictly greater than variant price');
      }
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
      compare_at_price: compareAtPrice,
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
  if (sortBy === 'oldest') return 'p.created_at ASC, p.id ASC';
  if (sortBy === 'price_asc') return 'p.price ASC, p.created_at DESC, p.id ASC';
  if (sortBy === 'price_desc') return 'p.price DESC, p.created_at DESC, p.id ASC';
  if (sortBy === 'title_asc' || sortBy === 'alphabetical') return 'LOWER(p.title) ASC, p.created_at DESC, p.id ASC';
  if (sortBy === 'title_desc') return 'LOWER(p.title) DESC, p.created_at DESC, p.id ASC';
  if (sortBy === 'popular') return 'p.inventory_quantity DESC, p.created_at DESC, p.id ASC';
  if (sortBy === 'best_sellers') return 'COALESCE(s.subscribers_count, 0) DESC, p.created_at DESC, p.id ASC';
  if (sortBy === 'random') return 'RANDOM()';
  return 'p.created_at DESC, p.id ASC';
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
    const compareAtPrice = input.compare_at_price !== undefined && input.compare_at_price !== null ? Number(input.compare_at_price) : null;
    if (compareAtPrice !== null) {
      if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
        throw new PdValidationError('Old price (compare-at price) must be a positive number');
      }
      if (compareAtPrice <= input.price) {
        throw new PdValidationError('Old price (compare-at price) must be strictly greater than selling price');
      }
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

    if (input.thumbnail) {
      input.thumbnail = await this.duplicateImageToProductFolder(input.store_id, input.thumbnail);
    }

    const productId = await transaction(async (c) => {
      const { rows } = await c.query<ProductRow>(
        `INSERT INTO pd_product
          (id, store_id, type, status, title, slug, description, category,
           marketplace_category_id, storefront_category_id, price, compare_at_price, inventory_quantity,
           weight_grams, thumbnail, seo_title, seo_description, tags, product_reference, attributes,
           max_downloads, download_expires_hours, digital_file_key, digital_file_name,
           digital_file_content_type, digital_file_size, metadata,
           bundle_pricing_type, bundle_discount_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
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
          compareAtPrice,
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
          input.bundle_pricing_type ?? null,
          input.bundle_discount_value ?? null,
        ],
      );
      await this.addLicenseKeys(c, id, input.store_id, licenseKeys);
      await this.replaceVariants(c, id, variants);
      if (input.bundle_items !== undefined) {
        await this.replaceBundleItems(c, id, input.store_id, input.bundle_items);
      }
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
      eventBus.emit(PdEvent.PRODUCT_PUBLISHED, { product_id: id, store_id: input.store_id });
      aiProductTaggerService.queueProductTagging(id, input.store_id).catch(() => {});
    }

    const createdProduct = await this.getById(productId);

    if (status === ProductStatus.Published) {
      notificationBatchService.ingestEvent({
        storeId: input.store_id,
        storeName: createdProduct.store_name || 'Boutique',
        type: 'new_product',
        productId: id,
        productTitle: input.title,
        price: Number(input.price),
      }).catch((err) => {
        logger.warn({ err, productId: id }, 'Failed to ingest new product notification batch event');
      });
    }

    return createdProduct;
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
              COALESCE(v.variants, '[]'::json) AS variants,
              COALESCE(b_items.bundle_items, '[]'::json) AS bundle_items
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
             'compare_at_price', pv.compare_at_price,
             'inventory_quantity', pv.inventory_quantity,
             'options', pv.options,
             'is_active', pv.is_active
           )
           ORDER BY pv.created_at ASC
         ) AS variants
         FROM pd_product_variant pv
         WHERE pv.product_id = p.id AND pv.is_active = true
       ) v ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', bi.id,
             'bundle_product_id', bi.bundle_product_id,
             'product_id', bi.product_id,
             'variant_id', bi.variant_id,
             'quantity', bi.quantity,
             'position', bi.position,
             'product_title', bp.title,
             'product_slug', bp.slug,
             'product_price', bp.price,
             'product_compare_at_price', bp.compare_at_price,
             'product_thumbnail', bp.thumbnail,
             'product_inventory_quantity', bp.inventory_quantity,
             'product_type', bp.type,
             'variant_title', bpv.title,
             'variant_price', bpv.price,
             'variant_compare_at_price', bpv.compare_at_price,
             'variant_inventory_quantity', bpv.inventory_quantity,
             'variant_sku', bpv.sku,
             'variant_options', bpv.options
           )
           ORDER BY bi.position ASC
         ) AS bundle_items
         FROM pd_product_bundle_item bi
         JOIN pd_product bp ON bp.id = bi.product_id
         LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
         WHERE bi.bundle_product_id = p.id
       ) b_items ON true
       WHERE p.id = $1
       LIMIT 1`,
      [id, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    const product = rows[0];
    if (product.type === ProductType.Bundle) {
      product.inventory_quantity = computeBundleAvailableStock(product.bundle_items);
    }
    return product;
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
      licenseKeys.length > 0 ||
      patch.thumbnail
    ) {
      current = await this.getById(id);
      if (patch.thumbnail) {
        patch.thumbnail = await this.duplicateImageToProductFolder(current.store_id, patch.thumbnail);
      }
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
    const previousProduct = await this.getById(id);
    const effectivePrice = patch.price !== undefined ? Number(patch.price) : Number(previousProduct.price);
    const effectiveCompareAt = patch.compare_at_price !== undefined
      ? (patch.compare_at_price !== null ? Number(patch.compare_at_price) : null)
      : (previousProduct.compare_at_price !== null && previousProduct.compare_at_price !== undefined ? Number(previousProduct.compare_at_price) : null);

    if (effectiveCompareAt !== null) {
      if (!Number.isFinite(effectiveCompareAt) || effectiveCompareAt < 0) {
        throw new PdValidationError('Old price (compare-at price) must be a positive number');
      }
      if (effectiveCompareAt <= effectivePrice) {
        throw new PdValidationError('Old price (compare-at price) must be strictly greater than selling price');
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
      'compare_at_price',
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
      'bundle_pricing_type',
      'bundle_discount_value',
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
    if (fields.length === 0 && licenseKeys.length === 0 && variants === undefined && patch.bundle_items === undefined) return previousProduct;
    const productId = await transaction(async (c) => {
      current = current ?? previousProduct;
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
      if (patch.bundle_items !== undefined) {
        await this.replaceBundleItems(c, id, current.store_id, patch.bundle_items);
      }
      return id;
    });

    const updatedProduct = await this.getById(productId);

    if (patch.title !== undefined || patch.description !== undefined || patch.category !== undefined) {
      if (updatedProduct?.status === ProductStatus.Published) {
        aiProductTaggerService.queueProductTagging(id, updatedProduct.store_id).catch(() => {});
      }
    }

    // Price drop detection for published products
    const prevPriceNum = parseFloat(String(previousProduct?.price ?? '0'));
    const currentPriceNum = parseFloat(String(updatedProduct?.price ?? '0'));
    const currentCompareAtNum = updatedProduct?.compare_at_price ? parseFloat(String(updatedProduct.compare_at_price)) : null;

    const isPriceReduced = !isNaN(currentPriceNum) && !isNaN(prevPriceNum) && currentPriceNum < prevPriceNum;
    const isNewDiscountAdded = currentCompareAtNum !== null && currentCompareAtNum > currentPriceNum && (!previousProduct.compare_at_price || parseFloat(String(previousProduct.compare_at_price)) <= prevPriceNum);

    if ((isPriceReduced || isNewDiscountAdded) && updatedProduct.status === ProductStatus.Published) {
      notificationBatchService.ingestEvent({
        storeId: updatedProduct.store_id,
        storeName: updatedProduct.store_name || 'Boutique',
        type: 'price_drop',
        productId: id,
        productTitle: updatedProduct.title,
        price: currentPriceNum,
        oldPrice: isPriceReduced ? prevPriceNum : (currentCompareAtNum || prevPriceNum),
      }).catch((err) => {
        logger.warn({ err, productId: id }, 'Failed to ingest price drop notification batch event');
      });
    };

    const isNewlyPublished = previousProduct?.status !== ProductStatus.Published && updatedProduct.status === ProductStatus.Published;
    if (isNewlyPublished) {
      const publishPriceNum = parseFloat(String(updatedProduct.price));
      notificationBatchService.ingestEvent({
        storeId: updatedProduct.store_id,
        storeName: updatedProduct.store_name || 'Boutique',
        type: 'new_product',
        productId: id,
        productTitle: updatedProduct.title,
        price: !isNaN(publishPriceNum) ? publishPriceNum : 0,
      }).catch((err) => {
        logger.warn({ err, productId: id }, 'Failed to ingest new product notification batch event');
      });
    }

    // Back in stock detection (inventory transitioning from 0 to > 0)
    const prevStock = Number(previousProduct?.inventory_quantity) || 0;
    const currentStock = Number(updatedProduct?.inventory_quantity) || 0;
    if (prevStock <= 0 && currentStock > 0 && updatedProduct?.status === ProductStatus.Published) {
      backInStockService.notifySubscribersOnRestock(id, currentStock).catch((err) => {
        logger.warn({ err, productId: id }, 'Failed to trigger back in stock notification dispatch');
      });
    }

    return updatedProduct;
  }

  async getPublicById(id: string): Promise<PublicProductRow> {
    const { rows } = await query<PublicProductRow>(
      `SELECT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price, p.compare_at_price,
              p.inventory_quantity,
              p.bundle_pricing_type, p.bundle_discount_value,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              COALESCE(pr.average_rating, 0)::real AS average_rating, COALESCE(pr.review_count, 0)::int AS review_count,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              s.seller_type AS store_seller_type,
              s.is_verified AS store_is_verified,
              s.status AS store_status,
              s.settings AS store_settings,
              s.created_at AS store_created_at,
              seller_stats.product_count AS store_product_count,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants,
              COALESCE(b_items.bundle_items, '[]'::json) AS bundle_items
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_product_rating pr ON pr.product_id = p.id
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
             'compare_at_price', pv.compare_at_price,
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', bi.id,
             'bundle_product_id', bi.bundle_product_id,
             'product_id', bi.product_id,
             'variant_id', bi.variant_id,
             'quantity', bi.quantity,
             'position', bi.position,
             'product_title', bp.title,
             'product_slug', bp.slug,
             'product_price', bp.price,
             'product_compare_at_price', bp.compare_at_price,
             'product_thumbnail', bp.thumbnail,
             'product_inventory_quantity', bp.inventory_quantity,
             'product_type', bp.type,
             'variant_title', bpv.title,
             'variant_price', bpv.price,
             'variant_compare_at_price', bpv.compare_at_price,
             'variant_inventory_quantity', bpv.inventory_quantity,
             'variant_sku', bpv.sku,
             'variant_options', bpv.options
           )
           ORDER BY bi.position ASC
         ) AS bundle_items
         FROM pd_product_bundle_item bi
         JOIN pd_product bp ON bp.id = bi.product_id
         LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
         WHERE bi.bundle_product_id = p.id
       ) b_items ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::text AS product_count
         FROM pd_product sp
         WHERE sp.store_id = s.id AND sp.status = $2
       ) seller_stats ON true
       WHERE p.id = $1 AND p.status = $2 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true
       LIMIT 1`,
      [id, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    const product = rows[0];
    if (product.type === ProductType.Bundle) {
      const bundleStock = computeBundleAvailableStock(product.bundle_items);
      product.in_stock = bundleStock > 0;
      product.stock_status = bundleStock > 0 ? 'in_stock' : 'out_of_stock';
    }
    return product;
  }

  async getPublishedByStoreSlug(storeId: string, slug: string): Promise<PublicProductRow> {
    const { rows } = await query<PublicProductRow>(
      `SELECT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price, p.compare_at_price,
              p.inventory_quantity,
              p.bundle_pricing_type, p.bundle_discount_value,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              COALESCE(pr.average_rating, 0)::real AS average_rating, COALESCE(pr.review_count, 0)::int AS review_count,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              s.seller_type AS store_seller_type,
              s.is_verified AS store_is_verified,
              s.status AS store_status,
              s.settings AS store_settings,
              s.created_at AS store_created_at,
              seller_stats.product_count AS store_product_count,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name, parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants,
              COALESCE(b_items.bundle_items, '[]'::json) AS bundle_items
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       LEFT JOIN pd_product_rating pr ON pr.product_id = p.id
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
             'compare_at_price', pv.compare_at_price,
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', bi.id,
             'bundle_product_id', bi.bundle_product_id,
             'product_id', bi.product_id,
             'variant_id', bi.variant_id,
             'quantity', bi.quantity,
             'position', bi.position,
             'product_title', bp.title,
             'product_slug', bp.slug,
             'product_price', bp.price,
             'product_compare_at_price', bp.compare_at_price,
             'product_thumbnail', bp.thumbnail,
             'product_inventory_quantity', bp.inventory_quantity,
             'product_type', bp.type,
             'variant_title', bpv.title,
             'variant_price', bpv.price,
             'variant_compare_at_price', bpv.compare_at_price,
             'variant_inventory_quantity', bpv.inventory_quantity,
             'variant_sku', bpv.sku,
             'variant_options', bpv.options
           )
           ORDER BY bi.position ASC
         ) AS bundle_items
         FROM pd_product_bundle_item bi
         JOIN pd_product bp ON bp.id = bi.product_id
         LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
         WHERE bi.bundle_product_id = p.id
       ) b_items ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::text AS product_count
         FROM pd_product sp
         WHERE sp.store_id = s.id AND sp.status = $3
       ) seller_stats ON true
        WHERE p.store_id = $1
          AND (
            p.slug = $2
            OR p.id = $2
            OR TRIM(BOTH '-' FROM p.slug) = TRIM(BOTH '-' FROM $2)
            OR p.slug LIKE $2 || '%'
            OR $2 LIKE p.slug || '%'
          )
          AND p.status = $3 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true
        ORDER BY
          CASE
            WHEN p.slug = $2 THEN 1
            WHEN TRIM(BOTH '-' FROM p.slug) = TRIM(BOTH '-' FROM $2) THEN 2
            WHEN p.id = $2 THEN 3
            ELSE 4
          END ASC
        LIMIT 1`,
      [storeId, slug, ProductStatus.Published],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    const product = rows[0];
    if (product.type === ProductType.Bundle) {
      const bundleStock = computeBundleAvailableStock(product.bundle_items);
      product.in_stock = bundleStock > 0;
      product.stock_status = bundleStock > 0 ? 'in_stock' : 'out_of_stock';
    }
    return product;
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

      case 'apply_discount': {
        const val = Number(action.value);
        if (!Number.isFinite(val) || val <= 0) {
          throw new PdValidationError('Invalid discount value: must be greater than 0');
        }

        const { rows: fullOwnedRows } = await query<{ id: string; price: string; compare_at_price: string | null }>(
          'SELECT id, price, compare_at_price FROM pd_product WHERE store_id = $1 AND id = ANY($2::text[])',
          [storeId, ownedIds],
        );

        await transaction(async (client) => {
          for (const row of fullOwnedRows) {
            const currentPrice = parseFloat(row.price) || 0;
            const originalBase = row.compare_at_price ? parseFloat(row.compare_at_price) : currentPrice;
            let discountedPrice = currentPrice;

            if (action.mode === 'percent') {
              if (val >= 100) throw new PdValidationError('Discount percent must be less than 100%');
              discountedPrice = originalBase * (1 - val / 100);
            } else {
              discountedPrice = originalBase - val;
            }

            discountedPrice = Math.max(0.001, discountedPrice);
            if (discountedPrice >= originalBase) {
              continue;
            }

            await client.query(
              'UPDATE pd_product SET price = $1, compare_at_price = $2, updated_at = NOW() WHERE id = $3',
              [discountedPrice.toFixed(3), originalBase.toFixed(3), row.id],
            );
          }
        });

        return {
          affected_count: ownedIds.length,
          message: `Remise appliquée sur ${ownedIds.length} produit(s).`,
        };
      }

      case 'clear_discount': {
        await query(
          'UPDATE pd_product SET compare_at_price = NULL, updated_at = NOW() WHERE store_id = $1 AND id = ANY($2::text[])',
          [storeId, ownedIds],
        );
        return {
          affected_count: ownedIds.length,
          message: `Remises supprimées pour ${ownedIds.length} produit(s).`,
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
   * List products for a store. Supports filtering by status, search query, and returns store-wide KPI counts.
   */
  async listByStore(
    storeId: string,
    opts: { status?: ProductStatus | string; search?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [storeId];
    let where = 'p.store_id = $1';

    if (opts.status && (opts.status as string) !== 'all') {
      if ((opts.status as string) === 'low_stock') {
        where += ` AND p.inventory_quantity <= 5`;
      } else {
        params.push(opts.status);
        where += ` AND p.status = $${params.length}`;
      }
    }

    if (opts.search && opts.search.trim()) {
      params.push(`%${opts.search.trim()}%`);
      where += ` AND (p.title ILIKE $${params.length} OR p.product_reference ILIKE $${params.length} OR mc.name ILIKE $${params.length} OR sc.name ILIKE $${params.length})`;
    }

    const { rows: storeCountsRows } = await query<{
      total: string;
      published: string;
      draft: string;
      low_stock: string;
    }>(
      `SELECT 
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE p.status = 'published')::text AS published,
        COUNT(*) FILTER (WHERE p.status = 'draft' OR p.status = 'pending_approval')::text AS draft,
        COUNT(*) FILTER (WHERE p.inventory_quantity <= 5)::text AS low_stock
       FROM pd_product p
       WHERE p.store_id = $1`,
      [storeId],
    );

    const counts = {
      total: parseInt(storeCountsRows[0]?.total || '0', 10),
      published: parseInt(storeCountsRows[0]?.published || '0', 10),
      draft: parseInt(storeCountsRows[0]?.draft || '0', 10),
      low_stock: parseInt(storeCountsRows[0]?.low_stock || '0', 10),
    };

    const countParams = [...params];
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
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_product p
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       WHERE ${where}`,
      countParams,
    );
    const total = parseInt(countRows[0]?.count || '0', 10);

    return {
      data: await this.attachVariants(rows),
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
        counts,
      },
    };
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
    hasDiscount?: boolean;
  } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [ProductStatus.Published];
    let where = "p.status = $1 AND s.status = 'verified' AND COALESCE(s.is_verified, false) = true";

    if (opts.hasDiscount) {
      where += ' AND (p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price)';
    }

    if (opts.category) {
      if (opts.storeId) {
        const [mpSubtreeIds, sfSubtreeIds] = await Promise.all([
          categoryService.getCategorySubtreeIds(opts.category),
          categoryService.getStorefrontCategorySubtreeIds(opts.storeId, opts.category),
        ]);
        params.push(mpSubtreeIds);
        params.push(sfSubtreeIds);
        params.push(opts.category);
        where += ` AND (p.marketplace_category_id = ANY($${params.length - 2}::text[]) OR p.category = ANY($${params.length - 2}::text[]) OR mc.slug = $${params.length} OR p.storefront_category_id = ANY($${params.length - 1}::text[]) OR sc.slug = $${params.length})`;
      } else {
        const subtreeIds = await categoryService.getCategorySubtreeIds(opts.category);
        params.push(subtreeIds);
        params.push(opts.category);
        where += ` AND (p.marketplace_category_id = ANY($${params.length - 1}::text[]) OR p.category = ANY($${params.length - 1}::text[]) OR mc.slug = $${params.length} OR p.storefront_category_id = $${params.length})`;
      }
    }

    if (opts.marketplaceCategoryId) {
      params.push(opts.marketplaceCategoryId);
      where += ` AND p.marketplace_category_id = $${params.length}`;
    }

    if (opts.storefrontCategoryId) {
      if (opts.storeId) {
        const sfSubtreeIds = await categoryService.getStorefrontCategorySubtreeIds(opts.storeId, opts.storefrontCategoryId);
        params.push(sfSubtreeIds);
        where += ` AND p.storefront_category_id = ANY($${params.length}::text[])`;
      } else {
        params.push(opts.storefrontCategoryId);
        where += ` AND p.storefront_category_id = $${params.length}`;
      }
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
              p.marketplace_category_id, p.storefront_category_id, p.price, p.compare_at_price,
              p.bundle_pricing_type, p.bundle_discount_value,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              s.seller_type AS store_seller_type,
              COALESCE(s.is_verified, false) AS store_is_verified,
              COALESCE(pr.average_rating, 0)::real AS store_score,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name, parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants,
              COALESCE(b_items.bundle_items, '[]'::json) AS bundle_items
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       LEFT JOIN pd_product_rating pr ON pr.product_id = p.id
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
             'compare_at_price', pv.compare_at_price,
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', bi.id,
             'bundle_product_id', bi.bundle_product_id,
             'product_id', bi.product_id,
             'variant_id', bi.variant_id,
             'quantity', bi.quantity,
             'position', bi.position,
             'product_title', bp.title,
             'product_slug', bp.slug,
             'product_price', bp.price,
             'product_compare_at_price', bp.compare_at_price,
             'product_thumbnail', bp.thumbnail,
             'product_inventory_quantity', bp.inventory_quantity,
             'product_type', bp.type,
             'variant_title', bpv.title,
             'variant_price', bpv.price,
             'variant_compare_at_price', bpv.compare_at_price,
             'variant_inventory_quantity', bpv.inventory_quantity,
             'variant_sku', bpv.sku,
             'variant_options', bpv.options
           )
           ORDER BY bi.position ASC
         ) AS bundle_items
         FROM pd_product_bundle_item bi
         JOIN pd_product bp ON bp.id = bi.product_id
         LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
         WHERE bi.bundle_product_id = p.id
       ) b_items ON true
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
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       WHERE ${where}`,
      params.slice(0, -2),
    );

    const total = parseInt(countRows[0].count, 10);
    const total_pages = Math.ceil(total / limit);
    const has_next = total_pages > 0 && page < total_pages;
    const has_prev = total_pages > 0 && page > 1;
    const from = rows.length > 0 ? offset + 1 : 0;
    const to = rows.length > 0 ? Math.min(offset + rows.length, total) : 0;
    const formattedData = rows.map(formatPublicProductResponse);

    return {
      data: formattedData,
      meta: {
        page,
        limit,
        total,
        total_pages,
        from,
        to,
        has_next,
        has_prev,
        next_page: has_next ? page + 1 : null,
        prev_page: has_prev ? page - 1 : null,
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
              p.marketplace_category_id, p.storefront_category_id, p.price, p.compare_at_price,
              p.inventory_quantity,
              p.bundle_pricing_type, p.bundle_discount_value,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain, s.custom_domain AS store_custom_domain,
              s.seller_type AS store_seller_type,
              COALESCE(s.is_verified, false) AS store_is_verified,
              COALESCE(pr.average_rating, 0)::real AS store_score,
              mc.name AS marketplace_category_name, mc.slug AS marketplace_category_slug,
              sc.name AS storefront_category_name, sc.slug AS storefront_category_slug,
              parent_sc.name AS storefront_parent_category_name, parent_sc.slug AS storefront_parent_category_slug,
              COALESCE(img.images, '[]'::json) AS images,
              COALESCE(v.variants, '[]'::json) AS variants,
              COALESCE(b_items.bundle_items, '[]'::json) AS bundle_items
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
       LEFT JOIN pd_storefront_category parent_sc ON parent_sc.id = sc.parent_id
       LEFT JOIN pd_product_rating pr ON pr.product_id = p.id
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
             'compare_at_price', pv.compare_at_price,
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
       LEFT JOIN LATERAL (
         SELECT json_agg(
           json_build_object(
             'id', bi.id,
             'bundle_product_id', bi.bundle_product_id,
             'product_id', bi.product_id,
             'variant_id', bi.variant_id,
             'quantity', bi.quantity,
             'position', bi.position,
             'product_title', bp.title,
             'product_slug', bp.slug,
             'product_price', bp.price,
             'product_compare_at_price', bp.compare_at_price,
             'product_thumbnail', bp.thumbnail,
             'product_inventory_quantity', bp.inventory_quantity,
             'product_type', bp.type,
             'variant_title', bpv.title,
             'variant_price', bpv.price,
             'variant_compare_at_price', bpv.compare_at_price,
             'variant_inventory_quantity', bpv.inventory_quantity,
             'variant_sku', bpv.sku,
             'variant_options', bpv.options
           )
           ORDER BY bi.position ASC
         ) AS bundle_items
         FROM pd_product_bundle_item bi
         JOIN pd_product bp ON bp.id = bi.product_id
         LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
         WHERE bi.bundle_product_id = p.id
       ) b_items ON true
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
       LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
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
    const product = rows[0];
    eventBus.emit(PdEvent.PRODUCT_PUBLISHED, { product_id: id, store_id: product.store_id });
    aiProductTaggerService.queueProductTagging(id, product.store_id).catch(() => {});
    return product;
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
   * Duplicates an image from another store folder (e.g. uncategorized or branding)
   * into the dedicated products folder (products/${storeId}/) so all product assets
   * originate from a single unified folder.
   */
  async duplicateImageToProductFolder(storeId: string, sourceUrl: string): Promise<string> {
    if (!sourceUrl || !storeId) return sourceUrl;
    if (sourceUrl.includes(`/products/${storeId}/`) || sourceUrl.startsWith(`products/${storeId}/`)) {
      return sourceUrl;
    }

    const match = sourceUrl.match(/\/pd-product-images\/(.+)$/) || sourceUrl.match(/^pd-product-images\/(.+)$/);
    const keyCandidate = match ? match[1] : (sourceUrl.startsWith('/') ? sourceUrl.substring(1) : sourceUrl);
    const cleanKey = keyCandidate.startsWith('pd-product-images/') ? keyCandidate.substring(18) : keyCandidate;

    try {
      const { rows } = await query<{ data: Buffer; content_type: string; bucket: string }>(
        `SELECT data, content_type, bucket FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1`,
        [cleanKey, `pd-product-images/${cleanKey}`],
      );

      if (rows.length === 0 || !rows[0].data) {
        return sourceUrl;
      }

      const ext = cleanKey.split('.').pop()?.toLowerCase() || 'jpeg';
      const newFileId = pdId('file');
      const newKey = `products/${storeId}/${newFileId}.${ext}`;
      const bucket = rows[0].bucket || 'pd-product-images';

      await query(
        `INSERT INTO pd_file_blobs (bucket, key, content_type, data, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [bucket, newKey, rows[0].content_type || 'image/jpeg', rows[0].data],
      );

      const newUrl = `/${bucket}/${newKey}`;

      await fileAssetService.registerAsset({
        scope: 'store',
        purpose: 'product_image',
        url: newUrl,
        file_key: newKey,
        bucket,
        filename: `${newFileId}.${ext}`,
        content_type: rows[0].content_type || 'image/jpeg',
        file_size: rows[0].data.length,
        owner_user_id: storeId,
        store_id: storeId,
      }).catch(() => null);

      try {
        await imageVariantService.generateVariantsForBuffer(rows[0].data, bucket, newKey);
      } catch {
        // Variant generation fallback
      }

      return newUrl;
    } catch {
      return sourceUrl;
    }
  }

  /**
   * Add an image URL to a product (after it's been uploaded to S3 via presigned URL).
   */
  async addImage(
    productId: string,
    plan: string,
    opts: { url: string; alt_text?: string; is_thumbnail?: boolean },
  ): Promise<{ id: string; url: string; alt_text: string | null; position: number }> {
    await subscriptionService.assertCanAddImage(productId, plan);

    const { rows: pRows } = await query<{ store_id: string }>(
      'SELECT store_id FROM pd_product WHERE id = $1',
      [productId],
    );
    const storeId = pRows[0]?.store_id;
    const finalUrl = storeId ? await this.duplicateImageToProductFolder(storeId, opts.url) : opts.url;

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
          finalUrl,
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
        [id, productId, finalUrl, opts.alt_text ?? null, posRows[0].next_pos, opts.is_thumbnail ?? false],
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

    const [variantsRes, bundleItemsRes] = await Promise.all([
      query<ProductVariantRow>(
        `SELECT *
         FROM pd_product_variant
         WHERE product_id = ANY($1::varchar[]) AND is_active = true
         ORDER BY created_at ASC`,
        [productIds],
      ),
      query<ProductBundleItemRow>(
        `SELECT bi.*,
                bp.title AS product_title, bp.slug AS product_slug, bp.price AS product_price,
                bp.compare_at_price AS product_compare_at_price, bp.thumbnail AS product_thumbnail,
                bp.inventory_quantity AS product_inventory_quantity, bp.type AS product_type,
                bpv.title AS variant_title, bpv.price AS variant_price,
                bpv.compare_at_price AS variant_compare_at_price, bpv.inventory_quantity AS variant_inventory_quantity,
                bpv.sku AS variant_sku, bpv.options AS variant_options
         FROM pd_product_bundle_item bi
         JOIN pd_product bp ON bp.id = bi.product_id
         LEFT JOIN pd_product_variant bpv ON bpv.id = bi.variant_id
         WHERE bi.bundle_product_id = ANY($1::varchar[])
         ORDER BY bi.position ASC`,
        [productIds],
      ),
    ]);

    const variantsByProduct = new Map<string, ProductVariantRow[]>();
    for (const variant of variantsRes.rows) {
      variantsByProduct.set(variant.product_id, [
        ...(variantsByProduct.get(variant.product_id) ?? []),
        variant,
      ]);
    }

    const bundleItemsByProduct = new Map<string, ProductBundleItemRow[]>();
    for (const item of bundleItemsRes.rows) {
      bundleItemsByProduct.set(item.bundle_product_id, [
        ...(bundleItemsByProduct.get(item.bundle_product_id) ?? []),
        item,
      ]);
    }

    return products.map((product) => {
      const bundleItems = bundleItemsByProduct.get(product.id) ?? product.bundle_items ?? [];
      let inventoryQuantity = product.inventory_quantity;
      if (product.type === ProductType.Bundle) {
        inventoryQuantity = computeBundleAvailableStock(bundleItems);
      }
      return {
        ...product,
        inventory_quantity: inventoryQuantity,
        variants: variantsByProduct.get(product.id) ?? product.variants ?? [],
        bundle_items: bundleItems,
      };
    });
  }

  private async replaceBundleItems(
    client: PoolClient,
    bundleProductId: string,
    storeId: string,
    bundleItems?: ProductBundleItemInput[],
  ): Promise<void> {
    if (bundleItems === undefined) return;

    await client.query('DELETE FROM pd_product_bundle_item WHERE bundle_product_id = $1', [bundleProductId]);

    if (bundleItems.length === 0) return;

    const productIds = Array.from(new Set(bundleItems.map((bi) => bi.product_id)));
    if (productIds.includes(bundleProductId)) {
      throw new PdValidationError('A pack cannot contain itself');
    }

    const { rows: componentProducts } = await client.query<{ id: string; store_id: string; type: ProductType; price: string; title: string }>(
      'SELECT id, store_id, type, price, title FROM pd_product WHERE id = ANY($1)',
      [productIds],
    );

    const compMap = new Map(componentProducts.map((p) => [p.id, p]));
    for (const bi of bundleItems) {
      const comp = compMap.get(bi.product_id);
      if (!comp) {
        throw new PdValidationError(`Component product ${bi.product_id} does not exist`);
      }
      if (comp.store_id !== storeId) {
        throw new PdValidationError(`Component product "${comp.title}" belongs to another store`);
      }
      if (comp.type === ProductType.Bundle) {
        throw new PdValidationError(`Component product "${comp.title}" is already a pack. Nested packs are not allowed.`);
      }
      if (bi.quantity <= 0) {
        throw new PdValidationError('Quantity for each item in a pack must be at least 1');
      }
    }

    for (let pos = 0; pos < bundleItems.length; pos++) {
      const bi = bundleItems[pos];
      const id = pdId('bitem');
      await client.query(
        `INSERT INTO pd_product_bundle_item (id, bundle_product_id, product_id, variant_id, quantity, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [id, bundleProductId, bi.product_id, bi.variant_id || null, bi.quantity || 1, bi.position ?? pos],
      );
    }
  }

  async getBundlesContainingProduct(productId: string, storeId?: string): Promise<PublicProductRow[]> {
    const params: unknown[] = [productId, ProductStatus.Published, ProductType.Bundle];
    let where = 'bi.product_id = $1 AND p.status = $2 AND p.type = $3 AND s.status = \'verified\' AND COALESCE(s.is_verified, false) = true';
    if (storeId) {
      params.push(storeId);
      where += ` AND p.store_id = $${params.length}`;
    }

    const { rows } = await query<PublicProductRow>(
      `SELECT DISTINCT p.id, p.store_id, p.type, p.status, p.title, p.slug, p.description, p.category,
              p.marketplace_category_id, p.storefront_category_id, p.price, p.compare_at_price,
              p.bundle_pricing_type, p.bundle_discount_value,
              (p.inventory_quantity > 0) AS in_stock,
              CASE WHEN p.inventory_quantity > 0 THEN 'in_stock' ELSE 'out_of_stock' END AS stock_status,
              p.weight_grams, p.thumbnail, p.seo_title, p.seo_description, p.tags, p.attributes,
              p.metadata, p.created_at, p.updated_at,
              s.name AS store_name, s.subdomain AS store_subdomain,
              s.custom_domain AS store_custom_domain, s.seller_type AS store_seller_type,
              COALESCE(s.is_verified, false) AS store_is_verified,
              COALESCE(img.images, '[]'::jsonb) AS images
       FROM pd_product p
       JOIN pd_product_bundle_item bi ON bi.bundle_product_id = p.id
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(
           jsonb_build_object(
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
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT 10`,
      params,
    );

    return this.attachVariants(rows as any) as any;
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
               compare_at_price = $6,
               inventory_quantity = $7,
               options = $8::jsonb,
               is_active = true,
               updated_at = NOW()
           WHERE id = $1 AND product_id = $2`,
          [
            variant.id,
            productId,
            variant.sku ?? null,
            variant.title,
            variant.price,
            variant.compare_at_price !== undefined && variant.compare_at_price !== null ? variant.compare_at_price : null,
            variant.inventory_quantity ?? 0,
            JSON.stringify(variant.options ?? {}),
          ],
        );
        if (rowCount) continue;
      }

      await client.query(
        `INSERT INTO pd_product_variant
          (id, product_id, sku, title, price, compare_at_price, inventory_quantity, options, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true)`,
        [
          pdId('var'),
          productId,
          variant.sku ?? null,
          variant.title,
          variant.price,
          variant.compare_at_price !== undefined && variant.compare_at_price !== null ? variant.compare_at_price : null,
          variant.inventory_quantity ?? 0,
          JSON.stringify(variant.options ?? {}),
        ],
      );
    }
  }
}

export const productService = new ProductService();



