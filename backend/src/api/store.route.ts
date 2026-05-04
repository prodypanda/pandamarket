import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storeService } from '../services/store.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';
import { SubscriptionPlan, ShippingMode, IStorePaymentConfig } from '@pandamarket/types';
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
