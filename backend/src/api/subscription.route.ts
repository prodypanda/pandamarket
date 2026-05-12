import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { subscriptionService } from '../services/subscription.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { query } from '../db/pool';
import { normalizePlanId } from '../utils/plan-id';

const router = Router();

const changePlanSchema = z.object({
  plan: z.string().transform((value) => normalizePlanId(value)),
});

// Public: List all available plans
router.get(
  '/plans',
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await subscriptionService.listAll({ enabledOnly: true });
    res.status(200).json({ plans });
  }),
);

// Vendor: Get current plan and limits
router.get(
  '/current',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{
      subscription_plan: string;
      subscription_type: string;
      subscription_expires_at: Date | null;
    }>(
      'SELECT subscription_plan, subscription_type, subscription_expires_at FROM pd_store WHERE id = $1',
      [req.user!.store_id!],
    );
    const store = rows[0];
    const limits = await subscriptionService.getLimits(store.subscription_plan);
    res.status(200).json({
      plan: store.subscription_plan,
      type: store.subscription_type,
      expires_at: store.subscription_expires_at,
      limits,
    });
  }),
);

// Vendor: Change plan (upgrade or downgrade)
router.post(
  '/change',
  requireStore,
  validate(changePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{ subscription_plan: string }>(
      'SELECT subscription_plan FROM pd_store WHERE id = $1',
      [req.user!.store_id!],
    );
    const currentPlan = rows[0].subscription_plan;
    await subscriptionService.changePlan(req.user!.store_id!, currentPlan, req.body.plan);
    const newLimits = await subscriptionService.getLimits(req.body.plan);
    res.status(200).json({
      plan: req.body.plan,
      limits: newLimits,
      message: 'Plan changed successfully',
    });
  }),
);

export default router;
