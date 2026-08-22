import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storeService, type StoreRow } from '../services/store.service';
import { categoryService } from '../services/category.service';
import { productService } from '../services/product.service';
import { imageVariantService } from '../services/image-variant.service';
import { asyncHandler, validate, requireAuth, requireStore, optionalAuth } from '../middlewares';
import { SubscriptionPlan, SellerType, ShippingMode, IStorePaymentConfig, ProductStatus, ProductType, StoreStatus, PdErrorCode } from '@pandamarket/types';
import { config } from '../config';
import { PdValidationError, PdForbiddenError } from '../errors';
import { normalizePlanId } from '../utils/plan-id';
import { resolveDataPath } from '../utils/data-dir';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { query } from '../db/pool';
import { pageBuilderService } from '../services/page-builder.service';
import { platformConfigService } from '../services/platform-config.service';
import { menuService, draftNavigationInputSchema, draftFooterInputSchema } from '../services/menu.service';
import { domainVerificationService } from '../services/domain-verification.service';
import { outboxService } from '../services/outbox.service';
import { storeSubscriptionService } from '../services/store-subscription.service';
import { calculateSellerTrustScore } from '../services/seller-trust.service';

const router = Router();

const renameStoreMediaSchema = z.object({
  key: z.string().min(1),
  new_filename: z.string().min(1).max(255),
});

const optimizeStoreMediaSchema = z.object({
  key: z.string().min(1),
  quality: z.number().int().min(30).max(100).optional().default(80),
  maxWidth: z.number().int().min(100).max(3840).optional().default(1600),
  format: z.enum(['webp', 'jpeg', 'png', 'original']).optional().default('webp'),
});

async function pageBuilderEnabled() {
  const settings = await platformConfigService.getSettings();
  return Boolean(settings.page_builder_enabled);
}

// ==========================================================
// Schemas
// ==========================================================

const createStoreSchema = z.object({
  name: z.string().min(1).max(100),
  subdomain: z.string().min(3).max(63),
  seller_type: z.nativeEnum(SellerType).optional(),
  plan: z.string().optional().transform((value) => (value ? normalizePlanId(value) : undefined)),
});

const selectStoreSchema = z.object({
  store_id: z.string().min(1),
});

const storefrontProductLoadingModeSchema = z.enum(['pagination', 'infinite', 'load_more']);

const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()).superRefine((settings, ctx) => {
    const value = settings.storefront_product_loading_mode;
    if (value !== undefined && !storefrontProductLoadingModeSchema.safeParse(value).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storefront_product_loading_mode'],
        message: 'Invalid storefront product loading mode',
      });
    }
  }),
  seller_type: z.nativeEnum(SellerType).optional(),
});

const updateSellerTypeSchema = z.object({
  seller_type: z.nativeEnum(SellerType),
});

const updateThemeSchema = z.object({
  theme_id: z.string().min(1),
});

const updateThemeDraftSchema = z.object({
  draft_theme_id: z.string().min(1).optional(),
  draftThemeCustomization: z.record(z.unknown()).optional(),
});

const updateDomainSchema = z.object({
  custom_domain: z.string().min(3).nullable(),
});

const addDomainSchema = z.object({
  hostname: z.string().min(3).max(255),
});

const updateShippingSchema = z.object({
  shipping_mode: z.nativeEnum(ShippingMode),
});

const updatePaymentConfigSchema = z.object({
  flouci_app_token: z.string().optional(),
  flouci_app_secret: z.string().optional(),
  konnect_api_key: z.string().optional(),
  konnect_receiver_wallet: z.string().optional(),
});

import { urlOrPathSchema } from '../validators';

const storefrontCategorySchema = z.object({
  name: z.string().min(1).max(100),
  name_fr: z.string().max(255).nullable().optional(),
  name_ar: z.string().max(255).nullable().optional(),
  name_en: z.string().max(255).nullable().optional(),
  slug: z.string().min(1).max(120).optional(),
  parent_id: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  description_fr: z.string().max(5000).nullable().optional(),
  description_ar: z.string().max(5000).nullable().optional(),
  description_en: z.string().max(5000).nullable().optional(),
  short_description: z.string().max(255).nullable().optional(),
  long_description: z.string().max(5000).nullable().optional(),
  image_url: urlOrPathSchema.nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  banner_url: urlOrPathSchema.nullable().optional(),
  seo_title: z.string().max(255).nullable().optional(),
  seo_description: z.string().max(1000).nullable().optional(),
  position: z.number().int().optional(),
  show_in_megamenu: z.boolean().optional(),
});

const updateStorefrontCategorySchema = storefrontCategorySchema.partial().extend({
  is_active: z.boolean().optional(),
});

const reorderStorefrontCategorySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      position: z.number().int(),
      parent_id: z.string().nullable().optional(),
    }),
  ),
});

const storeProductSchema = z.object({
  type: z.nativeEnum(ProductType).default(ProductType.Physical),
  title: z.string().min(2),
  slug: z.string().max(100).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  product_reference: z.string().max(100).nullable().optional(),
  marketplace_category_id: z.string().nullable().optional(),
  storefront_category_id: z.string().nullable().optional(),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).nullable().optional(),
  inventory_quantity: z.number().min(0).optional(),
  weight_grams: z.number().min(0).optional(),
  thumbnail: urlOrPathSchema.nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(300).nullable().optional(),
  tags: z.array(z.string()).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  attributes: z.array(z.object({
    name: z.string().min(1).max(80),
    value: z.string().min(1).max(300),
  })).optional(),
  max_downloads: z.number().int().min(1).max(100).nullable().optional(),
  download_expires_hours: z.number().int().min(1).max(8760).nullable().optional(),
  digital_file_key: z.string().max(1024).nullable().optional(),
  digital_file_name: z.string().max(255).nullable().optional(),
  digital_file_content_type: z.string().max(100).nullable().optional(),
  digital_file_size: z.number().int().min(0).nullable().optional(),
  license_keys: z.array(z.string().min(1).max(2000)).max(1000).optional(),
  wholesale_min_quantity: z.number().int().min(2).nullable().optional(),
  wholesale_price_tiers: z.array(z.object({
    min_quantity: z.number().int().min(2),
    unit_price: z.number().min(0),
  })).max(20).optional(),
  variants: z.array(z.object({
    id: z.string().max(64).optional(),
    sku: z.string().max(100).nullable().optional(),
    title: z.string().min(1).max(200),
    price: z.number().min(0),
    inventory_quantity: z.number().int().min(0).optional(),
    options: z.record(z.string()).optional(),
  })).max(100).optional(),
  bundle_pricing_type: z.enum(['fixed', 'percentage']).nullable().optional(),
  bundle_discount_value: z.number().min(0).max(1000000).nullable().optional(),
  bundle_items: z.array(z.object({
    product_id: z.string().min(1),
    variant_id: z.string().nullable().optional(),
    quantity: z.number().int().min(1).default(1),
    position: z.number().int().optional(),
  })).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateStoreProductSchema = storeProductSchema.partial();

const storeProductImageSchema = z.object({
  url: urlOrPathSchema,
  alt_text: z.string().max(200).optional(),
  is_thumbnail: z.boolean().optional(),
});

function assertDigitalFileOwnership(payload: { digital_file_key?: string | null }, storeId: string) {
  if (payload.digital_file_key && !payload.digital_file_key.startsWith(`digital/${storeId}/`)) {
    throw new PdValidationError('Digital file does not belong to this store');
  }
}

const SELECTED_STORE_COOKIE = 'pd_selected_store_id';

function setSelectedStoreCookie(res: Response, storeId: string) {
  res.cookie(SELECTED_STORE_COOKIE, storeId, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function publicOwnedStore(store: Awaited<ReturnType<typeof storeService.listByOwner>>[number]) {
  return {
    id: store.id,
    name: store.name,
    status: store.status,
    seller_type: store.seller_type,
    is_verified: store.is_verified,
    subscription_plan: store.subscription_plan,
    subscription_type: store.subscription_type,
    subscription_expires_at: store.subscription_expires_at,
    subdomain: store.subdomain,
    custom_domain: store.custom_domain,
    theme_id: store.theme_id,
    shipping_mode: store.shipping_mode,
    created_at: store.created_at,
    updated_at: store.updated_at,
  };
}


function publicStorefrontSettings(settings: StoreRow['settings'] | null | undefined) {
  const source = settings || {};
  return {
    colors: source.colors,
    logo_url: source.logo_url,
    logo_light_url: source.logo_light_url,
    logo_dark_url: source.logo_dark_url,
    favicon_url: source.favicon_url,
    themeCustomization: source.themeCustomization,
    store_description: source.store_description,
    description: source.description,
    contact_email: source.contact_email,
    contact_phone: source.contact_phone,
    address: source.address,
    city: source.city,
    country: source.country,
    map_embed_url: source.map_embed_url,
    social: source.social,
    maintenance_message: source.maintenance_message,
    marketplace_header_image_url: source.marketplace_header_image_url,
    shipping_policy: source.shipping_policy,
    returns_policy: source.returns_policy,
    payment_policy: source.payment_policy,
    storefront_product_loading_mode: source.storefront_product_loading_mode,
  };
}

function publicStorefrontStore(
  store: StoreRow | import('../services/store.service').PublicStoreRow,
  score?: { seller_score: string; review_count: string },
  productCount?: number,
) {
  return {
    id: store.id,
    name: store.name,
    status: store.status,
    seller_type: store.seller_type,
    is_verified: store.is_verified,
    subdomain: store.subdomain,
    custom_domain: store.custom_domain,
    theme_id: store.theme_id,
    shipping_mode: store.shipping_mode,
    created_at: store.created_at,
    settings: publicStorefrontSettings(store.settings),
    product_count: productCount ?? (store as any).product_count ?? null,
    ...(score ? {
      seller_score: score.seller_score,
      seller_review_count: score.review_count,
    } : {}),
  };
}

function canCreateFreeStore(stores: Awaited<ReturnType<typeof storeService.listByOwner>>) {
  return !stores.some((store) => store.subscription_plan === SubscriptionPlan.Free);
}

// ==========================================================
// Routes
// ==========================================================

router.post(
  '/',
  requireAuth,
  validate(createStoreSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.createForUser({
      user_id: req.user!.id,
      name: req.body.name,
      subdomain: req.body.subdomain,
      seller_type: req.body.seller_type,
      plan: req.body.plan,
    });
    const publicStore = publicOwnedStore(store);
    setSelectedStoreCookie(res, store.id);
    res.status(201).json({ store: publicStore, selected_store: publicStore });
  }),
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const stores = await storeService.listByOwner(req.user!.id);
    const selectedStoreId = (req as Request & { cookies?: Record<string, string> }).cookies
      ?.[SELECTED_STORE_COOKIE];
    const selectedStore = selectedStoreId
      ? stores.find((store) => store.id === selectedStoreId) ?? null
      : stores.length === 1
        ? stores[0]
        : null;
    const requiresSelection = stores.length > 1 && !selectedStore;
    const canCreateFree = canCreateFreeStore(stores);
    res.status(200).json({
      stores: stores.map(publicOwnedStore),
      selected_store: selectedStore ? publicOwnedStore(selectedStore) : null,
      selected_store_id: selectedStore?.id ?? null,
      can_create_free_store: canCreateFree,
      free_store_limit_reached: !canCreateFree,
      requires_selection: requiresSelection,
    });
  }),
);

router.post(
  '/select',
  requireAuth,
  validate(selectStoreSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.getOwnedById(req.body.store_id, req.user!.id);
    if (!store) {
      res.status(404).json({ error: { message: 'Store not found for this account' } });
      return;
    }
    const publicStore = publicOwnedStore(store);
    setSelectedStoreCookie(res, store.id);
    res.status(200).json({ store: publicStore, selected_store: publicStore });
  }),
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    // Public store discovery must never expose onboarding, maintenance, or unverified stores.
    const result = await storeService.list({ page, limit, verifiedOnly: true });
    res.status(200).json({
      ...result,
      data: result.data.map((store) => publicStorefrontStore(store)),
    });
  }),
);

router.get(
  '/by-host/:hostname',
  asyncHandler(async (req: Request, res: Response) => {
    // Important: resolve by host for both public and maintenance storefronts.
    // Frontend middleware + storefront routes rely on this endpoint to render
    // branded maintenance experiences for non-public stores.
    // Public product/catalog visibility is enforced in product/order services.
    const store = await storeService.resolveByHostname(req.params.hostname, config.hubDomain);
    if (!store) {
      res.status(404).json({ error: { message: 'Store not found for host' } });
      return;
    }
    const [score, productCount] = await Promise.all([
      storeService.getSellerScore(store.id),
      storeService.getProductCount(store.id),
    ]);
    res.status(200).json({
      store: publicStorefrontStore(store, score, productCount),
    });
  }),
);

router.get(
  '/me',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.getById(req.user!.store_id!);
    res.status(200).json({ store });
  }),
);

// Vendor settings update
router.put(
  '/me/settings',
  requireStore,
  validate(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const settingsStore = await storeService.updateSettings(req.user!.store_id!, req.body.settings);
    if (!req.body.seller_type) {
      res.status(200).json({ store: settingsStore });
      return;
    }
    const result = await storeService.requestSellerTypeChange(req.user!.store_id!, req.body.seller_type);
    res.status(200).json({
      store: result.store,
      auto_approved: result.autoApproved,
      pending_approval: !result.autoApproved,
    });
  }),
);

const updateMaintenanceSchema = z.object({
  enabled: z.boolean(),
  maintenance_message: z.string().max(2000).optional(),
});

router.put(
  '/me/maintenance',
  requireStore,
  validate(updateMaintenanceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const current = await storeService.getById(storeId);

    if (current.status === 'suspended') {
      res.status(403).json({ error: { message: 'Suspended stores cannot toggle maintenance mode' } });
      return;
    }
    if (!req.body.enabled && !current.is_verified) {
      res.status(403).json({ error: { message: 'Store must be verified before publishing' } });
      return;
    }

    const newStatus = req.body.enabled ? StoreStatus.Maintenance : StoreStatus.Verified;
    await storeService.updateStatus(storeId, newStatus);

    if (req.body.maintenance_message !== undefined) {
      const existingSettings = (current.settings && typeof current.settings === 'object') ? current.settings : {};
      await storeService.updateSettings(storeId, {
        ...existingSettings,
        maintenance_message: req.body.maintenance_message,
      });
    }

    const updated = await storeService.getById(storeId);
    res.status(200).json({ store: updated });
  }),
);

router.post(
  '/me/seller-type-request/cancel',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.cancelSellerTypeChange(req.user!.store_id!);
    res.status(200).json({ store, cancelled: true });
  }),
);

router.get(
  '/me/products',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const result = await productService.listByStore(req.user!.store_id!, { page, limit, status, search });
    res.status(200).json(result);
  }),
);

router.post(
  '/me/products',
  requireStore,
  validate(storeProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.getById(req.user!.store_id!);
    assertDigitalFileOwnership(req.body, req.user!.store_id!);
    const categories = await categoryService.resolveProductCategories(
      req.user!.store_id!,
      req.body.marketplace_category_id,
      req.body.storefront_category_id,
    );
    const product = await productService.create({
      store_id: req.user!.store_id!,
      store_plan: store.subscription_plan,
      store_is_verified: store.is_verified,
      store_seller_type: store.seller_type,
      ...req.body,
      marketplace_category_id: categories.marketplace.id,
      storefront_category_id: categories.storefront.id,
      category: categories.marketplace.name,
    });
    res.status(201).json({ product });
  }),
);

router.put(
  '/me/products/:id',
  requireStore,
  validate(updateStoreProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    const store = await storeService.getById(req.user!.store_id!);
    const patch = { ...req.body };
    patch.store_seller_type = store.seller_type;
    assertDigitalFileOwnership(patch, req.user!.store_id!);
    if ('marketplace_category_id' in patch || 'storefront_category_id' in patch) {
      const categories = await categoryService.resolveProductCategories(
        req.user!.store_id!,
        patch.marketplace_category_id,
        patch.storefront_category_id,
      );
      patch.marketplace_category_id = categories.marketplace.id;
      patch.storefront_category_id = categories.storefront.id;
      patch.category = categories.marketplace.name;
    }
    if (patch.status === ProductStatus.Published && !store.is_verified) {
      patch.status = ProductStatus.PendingApproval;
    }
    const product = await productService.update(req.params.id, patch);
    res.status(200).json({ product });
  }),
);

router.post(
  '/me/products/:id/images',
  requireStore,
  validate(storeProductImageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    const store = await storeService.getById(req.user!.store_id!);
    const image = await productService.addImage(req.params.id, store.subscription_plan, req.body);
    res.status(201).json({ image });
  }),
);

router.delete(
  '/me/products/:id/images/:imageId',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    await productService.deleteImage(req.params.id, req.params.imageId);
    res.status(200).json({ success: true });
  }),
);

router.delete(
  '/me/products/:id',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    await productService.delete(req.params.id);
    res.status(200).json({ success: true });
  }),
);

/**
 * GET /me/media — List store media assets with folder filtering, search, dimensions, and storage stats
 */
router.get(
  '/me/media',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const folderFilter = (req.query.folder as string) || 'all';
    const searchQuery = ((req.query.search as string) || '').trim().toLowerCase();
    const sortBy = (req.query.sort_by as string) || 'date_desc';

    // 1. Fetch file blobs related to this store from pd_file_blobs
    const blobResult = await query<{
      key: string;
      bucket: string;
      content_type: string;
      size: string;
      created_at: Date;
      data: Buffer | null;
      asset_filename: string | null;
      asset_id: string | null;
    }>(
      `SELECT b.key, b.bucket, b.content_type, OCTET_LENGTH(b.data) as size, b.created_at, b.data,
              a.filename as asset_filename, a.id as asset_id
       FROM pd_file_blobs b
       LEFT JOIN pd_file_asset a ON (a.file_key = b.key OR a.url LIKE '%' || b.key)
       WHERE (
         b.key LIKE '%' || $1 || '%'
         OR a.store_id = $1
       )
       AND b.key NOT LIKE '%_thumbnail.webp'
       AND b.key NOT LIKE '%_small.webp'
       AND b.key NOT LIKE '%_medium.webp'
       AND b.key NOT LIKE '%_large.webp'
       ORDER BY b.created_at DESC`,
      [storeId],
    );

    // 2. Fetch product images and thumbnails linked to this store
    const productMediaResult = await query<{
      url: string;
      product_id: string;
      product_title: string;
      alt_text: string | null;
      is_thumbnail: boolean;
      created_at: Date;
    }>(
      `SELECT pi.url, p.id as product_id, p.title as product_title, pi.alt_text, pi.is_thumbnail, pi.created_at
       FROM pd_product_image pi
       JOIN pd_product p ON p.id = pi.product_id
       WHERE p.store_id = $1
       UNION ALL
       SELECT p.thumbnail as url, p.id as product_id, p.title as product_title, p.title as alt_text, true as is_thumbnail, p.created_at
       FROM pd_product p
       WHERE p.store_id = $1 AND p.thumbnail IS NOT NULL`,
      [storeId],
    );

    // Build map of product association by URL and by Key
    const productMap = new Map<string, { product_id: string; product_title: string; alt_text?: string | null }>();
    for (const pm of productMediaResult.rows) {
      if (pm.url) {
        productMap.set(pm.url, { product_id: pm.product_id, product_title: pm.product_title, alt_text: pm.alt_text });
        const clean = pm.url.replace(/^\/?(pd-product-images\/)?/, '');
        productMap.set(clean, { product_id: pm.product_id, product_title: pm.product_title, alt_text: pm.alt_text });
      }
    }

    const itemsMap = new Map<string, any>();

    // Process blobs
    for (const row of blobResult.rows) {
      const rawKey = row.key;
      let cleanKey = rawKey;
      if (cleanKey.startsWith(`${row.bucket}/`)) {
        cleanKey = cleanKey.substring(row.bucket.length + 1);
      }
      const pathParts = cleanKey.split('/');

      let folder: 'products' | 'branding' | 'uncategorized' | 'general' = 'uncategorized';
      if (cleanKey.includes('/products/') || cleanKey.startsWith('products/')) {
        folder = 'products';
      } else if (cleanKey.includes('/branding/') || cleanKey.includes('logo') || cleanKey.includes('favicon') || cleanKey.includes('banner')) {
        folder = 'branding';
      } else if (cleanKey.includes('/uncategorized/')) {
        folder = 'uncategorized';
      } else if (pathParts.length >= 3 && ['products', 'branding', 'uncategorized', 'general'].includes(pathParts[2])) {
        folder = pathParts[2] as any;
      }

      const url = `/${row.bucket}/${cleanKey}`;
      const prodInfo = productMap.get(url) || productMap.get(cleanKey) || productMap.get(rawKey);

      let width: number | null = null;
      let height: number | null = null;
      if (row.data && row.content_type?.startsWith('image/')) {
        try {
          const meta = await sharp(row.data).metadata();
          width = meta.width ?? null;
          height = meta.height ?? null;
        } catch {
          // Ignore sharp metadata error
        }
      }

      const filename = row.asset_filename || prodInfo?.product_title || pathParts[pathParts.length - 1] || cleanKey;

      itemsMap.set(url, {
        key: cleanKey,
        url,
        filename,
        folder,
        content_type: row.content_type || 'image/jpeg',
        size: parseInt(row.size, 10) || 0,
        width,
        height,
        dimensions: width && height ? `${width} × ${height} px` : null,
        product_id: prodInfo?.product_id || null,
        product_title: prodInfo?.product_title || null,
        created_at: row.created_at,
      });
    }

    // Process any remaining product media not in blobs (e.g. external seeds or public assets)
    for (const pm of productMediaResult.rows) {
      if (!pm.url || itemsMap.has(pm.url)) continue;
      const pathParts = pm.url.split('/');
      const filename = pm.alt_text || pm.product_title || pathParts[pathParts.length - 1] || 'product-image.jpg';
      let key = pm.url.replace(/^\/?(pd-product-images\/)?/, '');
      itemsMap.set(pm.url, {
        key,
        url: pm.url,
        filename,
        folder: 'products',
        content_type: 'image/jpeg',
        size: 0,
        width: null,
        height: null,
        dimensions: null,
        product_id: pm.product_id,
        product_title: pm.product_title,
        created_at: pm.created_at,
      });
    }

    const allItems = Array.from(itemsMap.values());

    // Filter
    let filtered = allItems.filter((item) => {
      if (folderFilter !== 'all' && item.folder !== folderFilter) return false;
      if (searchQuery) {
        const matchesName = item.filename.toLowerCase().includes(searchQuery);
        const matchesKey = item.key.toLowerCase().includes(searchQuery);
        const matchesProduct = (item.product_title || '').toLowerCase().includes(searchQuery);
        if (!matchesName && !matchesKey && !matchesProduct) return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name_asc') return a.filename.localeCompare(b.filename);
      if (sortBy === 'name_desc') return b.filename.localeCompare(a.filename);
      if (sortBy === 'size_desc') return b.size - a.size;
      if (sortBy === 'size_asc') return a.size - b.size;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const totalStorageUsed = allItems.reduce((acc, cur) => acc + (cur.size || 0), 0);

    res.status(200).json({
      success: true,
      data: filtered,
      summary: {
        total: allItems.length,
        products: allItems.filter((i) => i.folder === 'products').length,
        branding: allItems.filter((i) => i.folder === 'branding').length,
        uncategorized: allItems.filter((i) => i.folder === 'uncategorized').length,
        general: allItems.filter((i) => i.folder === 'general').length,
        storage_used: totalStorageUsed,
      },
    });
  }),
);

/**
 * PATCH /me/media/rename — Rename a seller media asset while preserving file extension
 */
router.patch(
  '/me/media/rename',
  requireStore,
  validate(renameStoreMediaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { key, new_filename } = req.body;

    // Security check: ensure key belongs to this store
    if (!key.includes(storeId)) {
      const { rows: assetRows } = await query(
        'SELECT id FROM pd_file_asset WHERE (file_key = $1 OR url LIKE $2) AND store_id = $3 LIMIT 1',
        [key, `%${key}%`, storeId],
      );
      if (assetRows.length === 0) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'You can only rename media belonging to your store');
      }
    }

    const findResult = await query(
      'SELECT key, content_type FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1',
      [key, `pd-product-images/${key}`],
    );

    const rawKey = findResult.rows[0]?.key || key;
    const pathParts = rawKey.split('/');
    const originalFilename = pathParts[pathParts.length - 1] || rawKey;
    const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
    const originalExt = extMatch ? extMatch[1].toLowerCase() : '';

    let cleanName = new_filename.trim().replace(/[/\\]/g, '');
    if (originalExt) {
      cleanName = cleanName.replace(new RegExp(`\\.${originalExt}$`, 'i'), '');
      cleanName = cleanName.replace(/\.[a-zA-Z0-9]+$/, '');
      cleanName = `${cleanName}.${originalExt}`;
    }

    await query(
      `INSERT INTO pd_file_asset (id, scope, purpose, url, file_key, bucket, filename, content_type, file_size, store_id, owner_user_id)
       VALUES ($1, 'store', 'product_image', $2, $3, 'pd-product-images', $4, $5, 0, $6, $7)
       ON CONFLICT (file_key) DO UPDATE SET filename = EXCLUDED.filename, updated_at = NOW()`,
      [pdId('asset'), `/pd-product-images/${key}`, key, cleanName, findResult.rows[0]?.content_type || 'image/jpeg', storeId, req.user!.id],
    );

    await query(
      'UPDATE pd_product_image SET alt_text = $1 WHERE url LIKE $2',
      [cleanName, `%${key}%`],
    );

    logger.info(
      { store_id: storeId, user_id: req.user!.id, key, new_filename: cleanName },
      'Seller renamed media picture',
    );

    res.status(200).json({
      success: true,
      key,
      new_filename: cleanName,
    });
  }),
);

/**
 * DELETE /me/media — Delete a seller media asset and all size variants
 */
router.delete(
  '/me/media',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const key = (req.body.key || req.query.key || '') as string;
    if (!key) {
      throw new PdValidationError('Media key is required');
    }

    // Security check: ensure key belongs to this store
    if (!key.includes(storeId)) {
      const { rows: assetRows } = await query(
        'SELECT id FROM pd_file_asset WHERE (file_key = $1 OR url LIKE $2) AND store_id = $3 LIMIT 1',
        [key, `%${key}%`, storeId],
      );
      if (assetRows.length === 0) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'You can only delete media belonging to your store');
      }
    }

    const { baseKeyWithoutExt } = imageVariantService.getBaseKeyAndExtension(key);
    let cleanBase = baseKeyWithoutExt;
    if (cleanBase.startsWith('pd-product-images/')) {
      cleanBase = cleanBase.substring(18);
    }
    const variants = ['thumbnail', 'small', 'medium', 'large'].map((p) => `${cleanBase}_${p}.webp`);
    const allKeysToDelete = [key, cleanBase, ...variants];
    const prefixedKeys = allKeysToDelete.map((k) => `pd-product-images/${k}`);

    await query('DELETE FROM pd_file_blobs WHERE key = ANY($1) OR key = ANY($2)', [allKeysToDelete, prefixedKeys]);
    await query(
      'DELETE FROM pd_file_asset WHERE (file_key = $1 OR file_key LIKE $2 OR url LIKE $2) AND (store_id = $3 OR owner_user_id = $4)',
      [key, `%${key}%`, storeId, req.user!.id],
    );

    for (const k of [...allKeysToDelete, ...prefixedKeys]) {
      try {
        const diskPath = path.join(resolveDataPath(), k);
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch {
        // Ignore disk delete error
      }
    }

    // Also remove from pd_product_image where URL matches
    await query(
      `DELETE FROM pd_product_image
       WHERE (url = $1 OR url LIKE $2)
       AND product_id IN (SELECT id FROM pd_product WHERE store_id = $3)`,
      [`/pd-product-images/${key}`, `%${key}%`, storeId],
    );

    logger.info({ store_id: storeId, user_id: req.user!.id, key }, 'Seller deleted media asset');

    res.status(200).json({
      success: true,
      message: 'Media asset deleted successfully',
    });
  }),
);

/**
 * POST /me/media/optimize — Optimize/compress a seller media picture
 */
router.post(
  '/me/media/optimize',
  requireStore,
  validate(optimizeStoreMediaSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { key, quality, maxWidth, format } = req.body;

    // Security check: ensure key belongs to this store
    if (!key.includes(storeId)) {
      const { rows: assetRows } = await query(
        'SELECT id FROM pd_file_asset WHERE (file_key = $1 OR url LIKE $2) AND store_id = $3 LIMIT 1',
        [key, `%${key}%`, storeId],
      );
      if (assetRows.length === 0) {
        throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'You can only optimize media belonging to your store');
      }
    }

    const findResult = await query(
      'SELECT data, content_type, bucket FROM pd_file_blobs WHERE key = $1 OR key = $2 ORDER BY created_at DESC LIMIT 1',
      [key, `pd-product-images/${key}`],
    );
    if (findResult.rows.length === 0 || !findResult.rows[0].data) {
      throw new PdValidationError('Media asset not found in database');
    }

    const row = findResult.rows[0];
    const originalBuffer = row.data as Buffer;
    const originalSize = originalBuffer.length;

    let pipeline = sharp(originalBuffer);
    const metadata = await pipeline.metadata();

    if (metadata.width && metadata.width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let targetContentType = row.content_type || 'image/jpeg';
    let targetFormat = format;
    if (targetFormat === 'original') {
      if (row.content_type === 'image/png') targetFormat = 'png';
      else if (row.content_type === 'image/webp') targetFormat = 'webp';
      else targetFormat = 'jpeg';
    }

    if (targetFormat === 'webp') {
      pipeline = pipeline.webp({ quality });
      targetContentType = 'image/webp';
    } else if (targetFormat === 'jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      targetContentType = 'image/jpeg';
    } else if (targetFormat === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 8 });
      targetContentType = 'image/png';
    }

    const newBuffer = await pipeline.toBuffer();
    const newSize = newBuffer.length;

    // Update in pd_file_blobs
    const bucket = row.bucket || 'pd-product-images';
    await query(
      'UPDATE pd_file_blobs SET data = $1, content_type = $2 WHERE key = $3 OR key = $4',
      [newBuffer, targetContentType, key, `pd-product-images/${key}`],
    );

    // Update local cache
    try {
      const diskPath = path.join(resolveDataPath(), key);
      if (fs.existsSync(diskPath)) {
        fs.writeFileSync(diskPath, newBuffer);
      }
    } catch {}

    // Regenerate variants
    try {
      await imageVariantService.generateVariantsForBuffer(newBuffer, bucket, key);
    } catch {}

    // Update pd_file_asset file_size
    await query(
      'UPDATE pd_file_asset SET file_size = $1, content_type = $2, updated_at = NOW() WHERE file_key = $3 OR url LIKE $4',
      [newSize, targetContentType, key, `%${key}%`],
    );

    const savedBytes = Math.max(0, originalSize - newSize);
    const savedPercentage = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) + '%' : '0%';

    logger.info(
      { store_id: storeId, user_id: req.user!.id, key, originalSize, newSize, savedPercentage },
      'Seller optimized media picture',
    );

    res.status(200).json({
      success: true,
      key,
      original_size: originalSize,
      new_size: newSize,
      saved_bytes: savedBytes,
      saved_percentage: savedPercentage,
      format: targetFormat,
    });
  }),
);

router.get(
  '/me/categories',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const isTree = req.query.tree === 'true';
    const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
    const categories = (
      await categoryService.listStorefrontCategories(req.user!.store_id!, {
        tree: isTree,
        locale,
      })
    ).map((category) => ({
      ...category,
      product_count: parseInt(category.product_count || '0', 10),
    }));
    res.status(200).json({ data: categories });
  }),
);

router.post(
  '/me/categories',
  requireStore,
  validate(storefrontCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.createStorefrontCategory(req.user!.store_id!, req.body);
    res.status(201).json({ category });
  }),
);

router.post(
  '/me/categories/reorder',
  requireStore,
  validate(reorderStorefrontCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    await categoryService.reorderStorefrontCategories(req.user!.store_id!, req.body.items);
    res.status(200).json({ success: true });
  }),
);

router.get(
  '/me/categories/:id/delete-impact',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const impact = await categoryService.getStorefrontDeleteImpact(req.user!.store_id!, req.params.id);
    res.status(200).json({ data: impact });
  }),
);

const handleUpdateStorefrontCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateStorefrontCategory(req.user!.store_id!, req.params.id, req.body);
  res.status(200).json({ category });
});

router.put('/me/categories/:id', requireStore, validate(updateStorefrontCategorySchema), handleUpdateStorefrontCategory);
router.patch('/me/categories/:id', requireStore, validate(updateStorefrontCategorySchema), handleUpdateStorefrontCategory);

router.delete(
  '/me/categories/:id',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const confirm = req.query.confirm === 'true' || req.body?.confirm === true;
    const result = await categoryService.deleteStorefrontCategory(req.user!.store_id!, req.params.id, confirm);
    res.status(200).json({ success: true, ...result });
  }),
);

// Seller: List storefront customers (buyers who registered on this store)
router.get(
  '/me/customers',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = await import('../db/pool');
    const storeId = req.user!.store_id!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const { rows } = await query<{ id: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; created_at: string; order_count: string }>(
      `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at,
              (SELECT COUNT(*)::text FROM pd_order o WHERE o.storefront_customer_id = c.id) AS order_count
       FROM pd_storefront_customer c
       WHERE c.store_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [storeId, limit, offset],
    );
    res.status(200).json({ data: rows, page, limit });
  }),
);

router.put(
  '/me/seller-type',
  requireStore,
  validate(updateSellerTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storeService.requestSellerTypeChange(req.user!.store_id!, req.body.seller_type);
    res.status(200).json({
      store: result.store,
      auto_approved: result.autoApproved,
      pending_approval: !result.autoApproved,
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.getPublicById(req.params.id);
    const [score, productCount] = await Promise.all([
      storeService.getSellerScore(store.id),
      storeService.getProductCount(store.id),
    ]);
    res.status(200).json({ store: publicStorefrontStore(store, score, productCount) });
  }),
);

router.put(
  '/me/theme',
  requireStore,
  validate(updateThemeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateTheme(req.user!.store_id!, req.body.theme_id);
    res.status(200).json({ store });
  }),
);

router.put(
  '/me/theme/draft',
  requireStore,
  validate(updateThemeDraftSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateThemeDraft(req.user!.store_id!, {
      draft_theme_id: req.body.draft_theme_id,
      draftThemeCustomization: req.body.draftThemeCustomization,
    });
    res.status(200).json({ store });
  }),
);

router.post(
  '/me/theme/preview-token',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storeService.createThemePreviewToken(req.user!.store_id!, req.user!.id);
    res.status(200).json(result);
  }),
);

router.get(
  '/:id/theme-preview',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: { message: 'Preview token required' } });
      return;
    }
    const data = await storeService.getThemePreviewData(req.params.id, token);
    res.status(200).json(data);
  }),
);

router.get(
  '/me/publish-status',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const events = await outboxService.getRecentEventsForStore(req.user!.store_id!);
    const latestEvent = events[0] || null;
    res.status(200).json({
      latest_revision: latestEvent ? latestEvent.revision : 0,
      status: latestEvent ? latestEvent.status : 'synced',
      events,
    });
  }),
);

router.post(
  '/me/theme/publish-draft',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.publishThemeDraft(req.user!.store_id!);
    res.status(200).json({ store, message: 'Thème publié avec succès !' });
  }),
);

router.put(
  '/me/domain',
  requireAuth,
  requireStore,
  validate(updateDomainSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateCustomDomain(req.user!.store_id!, req.body.custom_domain);
    res.status(200).json({ store });
  }),
);

router.get(
  '/me/domains',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const domains = await domainVerificationService.listDomains(req.user!.store_id!);
    res.status(200).json({ domains });
  }),
);

router.post(
  '/me/domains',
  requireAuth,
  requireStore,
  validate(addDomainSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.getById(req.user!.store_id!);
    const domain = await domainVerificationService.addDomain(
      req.user!.store_id!,
      store.subscription_plan,
      req.body.hostname,
    );
    res.status(201).json({ domain });
  }),
);

router.post(
  '/me/domains/:id/verify',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const domain = await domainVerificationService.verifyDomain(
      req.user!.store_id!,
      req.params.id,
      req.body.mock_token,
    );
    res.status(200).json({ domain });
  }),
);

router.post(
  '/me/domains/:id/make-primary',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const domain = await domainVerificationService.makePrimary(
      req.user!.store_id!,
      req.params.id,
    );
    res.status(200).json({ domain });
  }),
);

router.delete(
  '/me/domains/:id',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await domainVerificationService.removeDomain(
      req.user!.store_id!,
      req.params.id,
    );
    res.status(200).json({ success: true, message: 'Domaine supprimé avec succès' });
  }),
);

router.put(
  '/me/shipping',
  requireStore,
  validate(updateShippingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateShippingMode(req.user!.store_id!, req.body.shipping_mode);
    res.status(200).json({ store });
  }),
);

/**
 * PUT /api/pd/stores/me/payment-config
 * Set vendor's own payment provider credentials (Pro+ only).
 */
router.put(
  '/me/payment-config',
  requireAuth,
  requireStore,
  validate(updatePaymentConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeData = await storeService.getById(req.user!.store_id!);
    const cfg: IStorePaymentConfig = req.body;
    const store = await storeService.setPaymentConfig(
      req.user!.store_id!,
      storeData.subscription_plan,
      cfg,
    );
    res.status(200).json({ store, message: 'Payment configuration updated' });
  }),
);

// ==========================================================
// Public Page Builder Endpoints (Storefront Rendering)
// ==========================================================

/**
 * GET /api/pd/stores/:storeId/pages
 * List published pages for a store (public, no auth required).
 */
router.get(
  '/:storeId/pages',
  asyncHandler(async (req: Request, res: Response) => {
    if (!(await pageBuilderEnabled())) {
      res.json({ data: [], count: 0 });
      return;
    }
    const pages = await pageBuilderService.listPublishedPages(req.params.storeId);
    res.json({ data: pages, count: pages.length });
  }),
);

/**
 * GET /api/pd/stores/:storeId/pages/:slug
 * Get a published page by slug (HTML/CSS only, for storefront rendering).
 */
router.get(
  '/:storeId/pages/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    if (!(await pageBuilderEnabled())) {
      return res.status(404).json({ error: { code: 'PD_NOT_FOUND', message: 'Page introuvable' } });
    }
    const page = await pageBuilderService.getPublishedPageBySlug(
      req.params.storeId,
      req.params.slug,
    );
    if (!page) {
      return res.status(404).json({ error: { code: 'PD_NOT_FOUND', message: 'Page introuvable' } });
    }
    return res.json({ page });
  }),
);

router.get(
  '/:storeId/page-builder-preview',
  asyncHandler(async (req: Request, res: Response) => {
    if (!(await pageBuilderEnabled())) {
      throw new PdValidationError('Page Builder is disabled by platform settings');
    }
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
      throw new PdValidationError('Preview token is required');
    }
    const slug = typeof req.query.slug === 'string' ? req.query.slug : undefined;
    const homepage = req.query.homepage === 'true' || req.query.homepage === '1';
    const page = await pageBuilderService.getDraftPreviewPage(
      req.params.storeId,
      token,
      { slug, homepage },
    );
    if (!page) {
      return res.status(404).json({ error: { code: 'PD_NOT_FOUND', message: 'Page introuvable' } });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ page });
  }),
);

/**
 * GET /api/pd/stores/:storeId/homepage
 * Get the homepage override for a store (if any).
 */
router.get(
  '/:storeId/homepage',
  asyncHandler(async (req: Request, res: Response) => {
    if (!(await pageBuilderEnabled())) {
      res.json({ page: null });
      return;
    }
    const page = await pageBuilderService.getHomepageOverride(req.params.storeId);
    res.json({ page }); // null if no homepage override
  }),
);

// =====================================================
// Navigation & Footer Seller/Public Endpoints (GAP-P1-013)
// =====================================================

// Seller: Get draft navigation
router.get(
  '/me/navigation/draft',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const data = await menuService.getDraftNavigation(req.user!.store_id!);
    res.status(200).json(data);
  }),
);

// Seller: Update draft navigation
router.put(
  '/me/navigation/draft',
  requireAuth,
  requireStore,
  validate(draftNavigationInputSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await menuService.updateDraftNavigation(req.user!.store_id!, req.body);
    res.status(200).json(data);
  }),
);

// Seller: Get draft footer
router.get(
  '/me/footer/draft',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const data = await menuService.getDraftFooter(req.user!.store_id!);
    res.status(200).json(data);
  }),
);

// Seller: Update draft footer
router.put(
  '/me/footer/draft',
  requireAuth,
  requireStore,
  validate(draftFooterInputSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await menuService.updateDraftFooter(req.user!.store_id!, req.body);
    res.status(200).json(data);
  }),
);

// Seller: Publish draft navigation & footer
router.post(
  '/me/content/publish',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await menuService.publishContent(req.user!.store_id!);
    res.status(200).json(result);
  }),
);

// Public Storefront: Get published navigation & footer
router.get(
  '/storefront/v1/navigation',
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.query.store_id as string | undefined;
    const host = (req.query.host as string) || req.headers.host;

    let targetStoreId = storeId;
    if (!targetStoreId && host) {
      const store = await storeService.resolveByHostname(host, config.hubDomain);
      targetStoreId = store?.id;
    }

    if (!targetStoreId) {
      res.status(400).json({ error: { code: 'PD_VALIDATION_ERROR', message: 'store_id or valid host query is required' } });
      return;
    }

    const data = await menuService.getPublicNavigation(targetStoreId);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.status(200).json({ data, navigation: data });
  }),
);

// =====================================================
// Store Subscriptions & Seller Trust Endpoints (Feature 20)
// =====================================================

/**
 * POST /api/pd/stores/:id/subscribe
 * Subscribe authenticated buyer to a store
 */
router.post(
  '/:id/subscribe',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storeSubscriptionService.subscribe(
      req.user!.id,
      req.params.id,
      req.body,
    );
    res.status(200).json(result);
  }),
);

/**
 * DELETE /api/pd/stores/:id/subscribe
 * Unsubscribe authenticated buyer from a store
 */
router.delete(
  '/:id/subscribe',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storeSubscriptionService.unsubscribe(
      req.user!.id,
      req.params.id,
    );
    res.status(200).json(result);
  }),
);

/**
 * GET /api/pd/stores/:id/subscription-status
 * Get subscription status (works for authenticated or guest visitors)
 */
router.get(
  '/:id/subscription-status',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storeSubscriptionService.getSubscriptionStatus(
      req.user?.id,
      req.params.id,
    );
    res.status(200).json(result);
  }),
);

/**
 * PUT /api/pd/stores/:id/subscription-preferences
 * Update notification preferences for a store subscription
 */
router.put(
  '/:id/subscription-preferences',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await storeSubscriptionService.updatePreferences(
      req.user!.id,
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, subscription: result });
  }),
);

/**
 * GET /api/pd/stores/:id/trust-score
 * Calculate and return seller logarithmic trust score
 */
router.get(
  '/:id/trust-score',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await calculateSellerTrustScore(req.params.id);
    res.status(200).json(result);
  }),
);

// =====================================================
// Seller Loyalty & Broadcast Endpoints (Feature 20 - R5)
// =====================================================

/**
 * POST /api/pd/stores/:id/broadcast
 * Send a private broadcast coupon/message to store subscribers (max 2/week)
 */
router.post(
  '/:id/broadcast',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.params.id;
    if (req.user!.store_id !== storeId && req.user!.role !== 'super_admin') {
      res.status(403).json({ error: { code: 'PD_FORBIDDEN', message: 'Unauthorized for this store' } });
      return;
    }

    const { message, coupon_code, discount_type, discount_value } = req.body;
    const coupon = coupon_code
      ? {
          code: coupon_code,
          discountType: discount_type || 'percentage',
          discountValue: Number(discount_value) || 0,
        }
      : undefined;

    const { sellerBroadcastService } = await import('../services/seller-broadcast.service');
    const result = await sellerBroadcastService.sendBroadcast(storeId, message, coupon);
    res.status(200).json(result);
  }),
);

/**
 * GET /api/pd/stores/:id/subscribers/analytics
 * Get subscriber growth KPIs and Tunisian governorate audience distribution
 */
router.get(
  '/:id/subscribers/analytics',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.params.id;
    if (req.user!.store_id !== storeId && req.user!.role !== 'super_admin') {
      res.status(403).json({ error: { code: 'PD_FORBIDDEN', message: 'Unauthorized for this store' } });
      return;
    }

    const { sellerBroadcastService } = await import('../services/seller-broadcast.service');
    const result = await sellerBroadcastService.getSubscriberAnalytics(storeId);
    res.status(200).json(result);
  }),
);

/**
 * GET /api/pd/stores/:id/subscribers/history
 * Get broadcast history for the seller
 */
router.get(
  '/:id/subscribers/history',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.params.id;
    if (req.user!.store_id !== storeId && req.user!.role !== 'super_admin') {
      res.status(403).json({ error: { code: 'PD_FORBIDDEN', message: 'Unauthorized for this store' } });
      return;
    }

    const { sellerBroadcastService } = await import('../services/seller-broadcast.service');
    const history = await sellerBroadcastService.getBroadcastHistory(storeId);
    res.status(200).json({ broadcasts: history });
  }),
);

export default router;

