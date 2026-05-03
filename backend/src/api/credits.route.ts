/**
 * Credits API routes — AI token management for vendors.
 *
 * Endpoints:
 *   GET  /api/pd/credits          — Get current credit balance
 *   POST /api/pd/credits/refill   — Admin: refill tokens for a store
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { creditsService } from '../services/credits.service';
import {
  asyncHandler,
  requireAuth,
  requireAdmin,
  requireStore,
  validate,
} from '../middlewares';

const router = Router();

// ==========================================================
// Schemas
// ==========================================================

const refillSchema = z.object({
  store_id: z.string().min(1),
  amount: z.number().int().min(1).max(10000),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /api/pd/credits
 * Get the AI token balance for the authenticated vendor's store.
 */
router.get(
  '/',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const credits = await creditsService.getByStore(req.user!.store_id!);
    res.status(200).json({ credits });
  }),
);

/**
 * POST /api/pd/credits/refill
 * Admin-only: refill AI tokens for a specific store.
 * Used after a vendor purchases a token pack.
 */
router.post(
  '/refill',
  requireAuth,
  requireAdmin,
  validate(refillSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id, amount } = req.body;
    const credits = await creditsService.refill(store_id, amount);
    res.status(200).json({ credits, message: `${amount} tokens added` });
  }),
);

export default router;
