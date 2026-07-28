import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { subscriptionService } from '../services/subscription.service';
import { subscriptionPaymentService } from '../services/subscription-payment.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { query } from '../db/pool';
import { normalizePlanId } from '../utils/plan-id';
import { PaymentGateway } from '@pandamarket/types';

const router = Router();

const changePlanSchema = z.object({
  plan: z.string().transform((value) => normalizePlanId(value)),
});

const initiateSchema = z.object({
  plan: z.string().transform((value) => normalizePlanId(value)),
  gateway: z.nativeEnum(PaymentGateway).default(PaymentGateway.Flouci),
  proof_url: z.string().optional(),
});

const settleSchema = z.object({
  intent_id: z.string(),
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

// Vendor: Initiate plan purchase or upgrade with payment
router.post(
  '/initiate',
  requireStore,
  validate(initiateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows: userRows } = await query<{ email: string }>(
      'SELECT email FROM pd_user WHERE id = $1',
      [req.user!.id],
    );
    const userEmail = userRows[0]?.email || '';

    const result = await subscriptionPaymentService.initiate({
      storeId: req.user!.store_id!,
      userId: req.user!.id,
      userEmail,
      gateway: req.body.gateway as PaymentGateway,
      targetPlan: req.body.plan,
      proofUrl: req.body.proof_url,
    });

    res.status(200).json(result);
  }),
);

// Vendor: Settle subscription payment & activate plan after checkout return
router.post(
  '/settle',
  requireStore,
  validate(settleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await subscriptionPaymentService.settle(
      req.user!.store_id!,
      req.body.intent_id,
    );
    res.status(200).json(result);
  }),
);

// Vendor: Direct change plan (for free plan or free downgrades)
router.post(
  '/change',
  requireStore,
  validate(changePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const limits = await subscriptionService.getLimits(req.body.plan);
    const yearlyPrice = Number(limits.yearly_price ?? 0);

    // Paid plans require payment initiation first
    if (yearlyPrice > 0 && req.body.plan !== 'free') {
      res.status(400).json({
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Paid subscription plans require payment before activation. Please use /initiate to purchase.',
        },
      });
      return;
    }

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
