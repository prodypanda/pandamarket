import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storeService } from '../services/store.service';
import { categoryService } from '../services/category.service';
import { productService } from '../services/product.service';
import { fileAssetService } from '../services/file-asset.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';
import { SubscriptionPlan, ShippingMode, IStorePaymentConfig, ProductStatus, ProductType } from '@pandamarket/types';
import { config } from '../config';

const router = Router();

// ==========================================================
// Schemas
// ==========================================================

const createStoreSchema = z.object({
  name: z.string().min(1).max(100),
  subdomain: z.string().min(3).max(63),
  plan: z.nativeEnum(SubscriptionPlan).optional(),
});

const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()),
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
  description: z.string().max(1000).optional(),
  short_description: z.string().max(255).optional(),
  long_description: z.string().max(5000).optional(),
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
  attributes: z.array(z.object({
    name: z.string().min(1).max(80),
    value: z.string().min(1).max(300),
  })).optional(),
});

const updateStoreProductSchema = storeProductSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
});

const storeProductImageSchema = z.object({
  url: z.string().url(),
  alt_text: z.string().max(200).optional(),
  is_thumbnail: z.boolean().optional(),
});

// ==========================================================
// Routes
// ==========================================================

router.post(
  '/',
  requireAuth,
  validate(createStoreSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Only users without a store can create one
    if (req.user!.store_id) {
      res.status(400).json({ error: { message: 'You already own a store' } });
      return;
    }
    const store = await storeService.createForUser({
      user_id: req.user!.id,
      name: req.body.name,
      subdomain: req.body.subdomain,
      plan: req.body.plan,
    });
    res.status(201).json({ store });
  }),
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const verifiedOnly = req.query.verifiedOnly === 'true';
    const result = await storeService.list({ page, limit, verifiedOnly });
    res.status(200).json(result);
  }),
);

router.get(
  '/by-host/:hostname',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.resolveByHostname(req.params.hostname, config.hubDomain);
    if (!store) {
      res.status(404).json({ error: { message: 'Store not found for host' } });
      return;
    }
    res.status(200).json({ store });
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
    const categories = await categoryService.resolveProductCategories(
      req.user!.store_id!,
      req.body.marketplace_category_id,
      req.body.storefront_category_id,
    );
    const product = await productService.create({
      store_id: req.user!.store_id!,
      store_plan: store.subscription_plan,
      store_is_verified: store.is_verified,
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

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.getById(req.params.id);
    res.status(200).json({ store });
  }),
);

// Vendor settings update
router.put(
  '/me/settings',
  requireStore,
  validate(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const store = await storeService.updateSettings(req.user!.store_id!, req.body.settings);
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

import { pageBuilderService } from '../services/page-builder.service';

/**
 * GET /api/pd/stores/:storeId/pages
 * List published pages for a store (public, no auth required).
 */
router.get(
  '/:storeId/pages',
  asyncHandler(async (req: Request, res: Response) => {
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

/**
 * GET /api/pd/stores/:storeId/homepage
 * Get the homepage override for a store (if any).
 */
router.get(
  '/:storeId/homepage',
  asyncHandler(async (req: Request, res: Response) => {
    const page = await pageBuilderService.getHomepageOverride(req.params.storeId);
    res.json({ page }); // null if no homepage override
  }),
);

export default router;

