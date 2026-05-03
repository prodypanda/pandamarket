/**
 * Theme API routes — listing, purchasing, and ownership.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { themeService } from '../services/theme.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';

const router = Router();

// Public: List all active themes
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const themes = await themeService.listAll();
    res.status(200).json({ data: themes });
  }),
);

// Public: Get theme by slug
router.get(
  '/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const theme = await themeService.getBySlug(req.params.slug);
    res.status(200).json({ theme });
  }),
);

// Vendor: Check if store can use a theme
router.get(
  '/:slug/access',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const canUse = await themeService.canUseTheme(req.user!.store_id!, req.params.slug);
    res.status(200).json({ can_use: canUse });
  }),
);

// Vendor: Purchase a premium theme
const purchaseSchema = z.object({
  payment_reference: z.string().optional(),
});

router.post(
  '/:id/purchase',
  requireAuth,
  requireStore,
  validate(purchaseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const purchase = await themeService.purchaseTheme(
      req.user!.store_id!,
      req.params.id,
      req.body.payment_reference,
    );
    res.status(201).json({ purchase });
  }),
);

// Vendor: List my purchased themes
router.get(
  '/purchases/mine',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const purchases = await themeService.listPurchases(req.user!.store_id!);
    res.status(200).json({ data: purchases });
  }),
);

export default router;
