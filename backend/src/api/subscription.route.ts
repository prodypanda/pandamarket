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

const uploadProofSchema = z.object({
  intent_id: z.string(),
  proof_url: z.string().min(1),
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

    // Also get any active/pending subscription intents for this store
    const { rows: intentRows } = await query(
      `SELECT * FROM pd_subscription_intent
       WHERE store_id = $1 AND status IN ('pending', 'pending_proof', 'pending_review')
       ORDER BY created_at DESC LIMIT 10`,
      [req.user!.store_id!],
    );

    res.status(200).json({
      plan: store.subscription_plan,
      type: store.subscription_type,
      expires_at: store.subscription_expires_at,
      limits,
      pending_intents: intentRows,
    });
  }),
);

// Vendor: List all platform subscription & billing orders
router.get(
  '/orders',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';

    const conditions: string[] = ['store_id = $1'];
    const sqlParams: unknown[] = [storeId];
    let pIdx = 2;

    if (status && status !== 'all') {
      conditions.push(`status = $${pIdx++}`);
      sqlParams.push(status);
    }

    if (search.trim()) {
      conditions.push(`(id ILIKE $${pIdx} OR target_plan ILIKE $${pIdx} OR gateway ILIKE $${pIdx})`);
      sqlParams.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    // Total matching records count
    const countRes = await query<{ total: string }>(
      `SELECT COUNT(*)::int AS total FROM pd_subscription_intent WHERE ${whereClause}`,
      sqlParams,
    );
    const total = Number(countRes.rows[0]?.total || 0);

    // Paginated dataset
    const dataRes = await query(
      `SELECT * FROM pd_subscription_intent
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...sqlParams, limit, offset],
    );

    // Summary statistics for vendor billing overview
    const statsRes = await query<{
      total_spent_tnd: string;
      paid_count: string;
      pending_count: string;
    }>(
      `SELECT 
         COALESCE(SUM(CASE WHEN status IN ('captured', 'paid') THEN amount ELSE 0 END), 0) AS total_spent_tnd,
         COUNT(CASE WHEN status IN ('captured', 'paid') THEN 1 END)::int AS paid_count,
         COUNT(CASE WHEN status IN ('pending', 'pending_proof', 'pending_review') THEN 1 END)::int AS pending_count
       FROM pd_subscription_intent
       WHERE store_id = $1`,
      [storeId],
    );

    const stats = statsRes.rows[0] || { total_spent_tnd: '0', paid_count: '0', pending_count: '0' };

    res.status(200).json({
      orders: dataRes.rows,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
      summary: {
        total_spent_tnd: Number(stats.total_spent_tnd || 0),
        paid_count: Number(stats.paid_count || 0),
        pending_count: Number(stats.pending_count || 0),
      },
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

// Vendor: Upload/Attach mandat payment proof for a pending order
router.post(
  '/upload-proof',
  requireStore,
  validate(uploadProofSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await subscriptionPaymentService.uploadProof(
      req.body.intent_id,
      req.user!.store_id!,
      req.body.proof_url,
    );
    res.status(200).json({ success: true, intent: result });
  }),
);

// Vendor: Cancel unpaid subscription order
router.post(
  '/cancel',
  requireStore,
  validate(settleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await subscriptionPaymentService.cancelByVendor(
      req.body.intent_id,
      req.user!.store_id!,
    );
    res.status(200).json({ success: true, intent: result });
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
