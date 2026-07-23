import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storeService, type StoreRow } from '../services/store.service';
import { categoryService } from '../services/category.service';
import { productService } from '../services/product.service';
import { fileAssetService } from '../services/file-asset.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';
import { SubscriptionPlan, SellerType, ShippingMode, IStorePaymentConfig, ProductStatus, ProductType, StoreStatus } from '@pandamarket/types';
import { config } from '../config';
import { PdValidationError } from '../errors';
import { normalizePlanId } from '../utils/plan-id';
import { pageBuilderService } from '../services/page-builder.service';
import { platformConfigService } from '../services/platform-config.service';

const router = Router();

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

const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()),
  seller_type: z.nativeEnum(SellerType).optional(),
});

const updateSellerTypeSchema = z.object({
  seller_type: z.nativeEnum(SellerType),
});

const updateThemeSchema = z.object({
  theme_id: z.string().min(1),
});

const updateDomainSchema = z.object({
  custom_domain: z.string().min(3).nullable(),
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

const storefrontCategorySchema = z.object({
  name: z.string().min(2).max(120),
  parent_id: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  short_description: z.string().max(255).nullable().optional(),
  long_description: z.string().max(5000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  position: z.number().int().optional(),
});

const updateStorefrontCategorySchema = storefrontCategorySchema.partial().extend({
  is_active: z.boolean().optional(),
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
  inventory_quantity: z.number().min(0).optional(),
  weight_grams: z.number().min(0).optional(),
  thumbnail: z.string().url().nullable().optional(),
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
});

const updateStoreProductSchema = storeProductSchema.partial();

const storeProductImageSchema = z.object({
  url: z.string().url(),
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
  };
}

function publicStorefrontStore(store: StoreRow, score?: { seller_score: string; review_count: string }) {
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
    const score = await storeService.getSellerScore(store.id);
    res.status(200).json({
      store: publicStorefrontStore(store, score),
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
    const status = req.query.status as ProductStatus | undefined;
    const result = await productService.listByStore(req.user!.store_id!, { page, limit, status });
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

router.get(
  '/me/media',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 60;
    const [productMedia, storeAssets] = await Promise.all([
      productService.listStoreMedia(req.user!.store_id!, { limit }),
      fileAssetService.listAssets({ scope: 'store', storeId: req.user!.store_id!, type: 'image', limit }),
    ]);
    const seen = new Set<string>();
    const media = [
      ...storeAssets.map((asset) => ({
        url: asset.url,
        product_id: asset.id,
        product_title: asset.filename,
        alt_text: asset.filename,
        is_thumbnail: false,
      })),
      ...productMedia,
    ].filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    }).slice(0, limit);
    res.status(200).json({ data: media });
  }),
);

router.get(
  '/me/categories',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const categories = (await categoryService.listStorefrontCategories(req.user!.store_id!)).map((category) => ({
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

router.put(
  '/me/categories/:id',
  requireStore,
  validate(updateStorefrontCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.updateStorefrontCategory(req.user!.store_id!, req.params.id, req.body);
    res.status(200).json({ category });
  }),
);

router.delete(
  '/me/categories/:id',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await categoryService.deleteStorefrontCategory(req.user!.store_id!, req.params.id);
    res.status(200).json({ success: true, ...result });
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
    const store = await storeService.getById(req.params.id);
    res.status(200).json({ store });
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
  '/me/domain',
  requireStore,
  validate(updateDomainSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateCustomDomain(req.user!.store_id!, req.body.custom_domain);
    res.status(200).json({ store });
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

export default router;
