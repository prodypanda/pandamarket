/**
 * Retention routes — gamified rewards lead capture (audit A12 / M4 v1).
 *
 * Server-authoritative by design: the client may only identify itself;
 * the prize, coupon code and discount value are drawn server-side from the
 * same catalog as /cart/gamified-spin (CartService.recordGamifiedLead).
 * The storefront widget posts fire-and-forget; response is informational.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../middlewares';
import { cartService } from '../services/cart.service';

const router = Router();

const rewardsLeadSchema = z
  .object({
    phone: z.string().trim().min(6).max(30).optional().nullable(),
    email: z.string().trim().email().max(254).optional().nullable(),
    game_type: z.enum(['spin_wheel', 'scratch_card']).default('scratch_card'),
    type: z.string().optional(),
    store_id: z.string().trim().min(1).max(64).optional().nullable(),
    device_fingerprint: z.string().trim().min(8).max(128).optional(),
    prize_code: z.string().optional(),
    prize_label: z.string().optional(),
  })
  .refine((data) => Boolean(data.phone || data.email), {
    message: 'A phone number or email is required to claim a reward.',
  });

/**
 * POST /api/pd/retention/rewards-lead
 */
router.post(
  '/rewards-lead',
  validate(rewardsLeadSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const rawGameType = req.body.game_type || req.body.type;
    const gameType = rawGameType === 'spin_wheel' ? 'spin_wheel' : 'scratch_card';
    const result = await cartService.recordGamifiedLead({
      store_id: req.body.store_id || undefined,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
      game_type: gameType,
      device_fingerprint: req.body.device_fingerprint || undefined,
    });
    res.status(201).json({ data: result });
  }),
);

export default router;
