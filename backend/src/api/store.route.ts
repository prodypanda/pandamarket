import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storeService } from '../services/store.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';
import { SubscriptionPlan, ShippingMode } from '@pandamarket/types';
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

export default router;
