import { query, transaction } from '../../db/pool';
import { asyncHandler, validate } from '../../middlewares';
import { creditsService } from '../../services/credits.service';
import { subscriptionService } from '../../services/subscription.service';
import { logger } from '../../utils/logger';
import { normalizePlanId } from '../../utils/plan-id';
import { SubscriptionPlan, SubscriptionType } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Platform Statistics — extracted from admin.route.ts (E15 split). */
const router = Router();

router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const [stores, orders, revenue, pendingKyc, pendingMandats, openReports] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM pd_store'),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM pd_order'),
      query<{ total: string }>(
        "SELECT COALESCE(SUM(total::numeric), 0)::text AS total FROM pd_order WHERE payment_status = 'captured'",
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pd_verification_documents WHERE status = 'pending'",
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pd_mandat_proofs WHERE status = 'pending'",
      ),
      query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pd_reports WHERE status IN ('open', 'investigating')",
      ),
    ]);

    res.status(200).json({
      total_stores: parseInt(stores.rows[0].count, 10),
      total_orders: parseInt(orders.rows[0].count, 10),
      total_revenue: parseFloat(revenue.rows[0].total),
      pending_kyc: parseInt(pendingKyc.rows[0].count, 10),
      pending_mandats: parseInt(pendingMandats.rows[0].count, 10),
      open_reports: parseInt(openReports.rows[0].count, 10),
    });
  }),
);

const updatePlanSchema = z.object({
  max_products: z.coerce.number().int().min(-1),
  max_images_per_product: z.coerce.number().int().min(1),
  max_page_builder_pages: z.coerce.number().int().min(-1),
  has_ai_seo: z.boolean(),
  has_image_compression: z.boolean(),
  has_custom_domain: z.boolean(),
  has_page_builder: z.boolean(),
  has_direct_payment: z.boolean(),
  has_white_label: z.boolean(),
  has_own_ai_provider: z.boolean().optional().default(false),
  commission_rate: z.coerce.number().min(0).max(100),
  ai_tokens_included: z.coerce.number().int().min(-1),
  yearly_price: z.coerce.number().min(0),
  is_enabled: z.boolean().optional().default(true),
});

const createPlanSchema = updatePlanSchema.extend({
  plan_id: z.string().transform((value) => normalizePlanId(value)),
});

const deletePlanSchema = z.object({
  replacement_plan_id: z
    .string()
    .optional()
    .transform((value) => (value ? normalizePlanId(value) : undefined)),
});

router.get(
  '/plans',
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await query(
      `SELECT l.*,
              COUNT(s.id)::int AS stores_count,
              COUNT(s.id) FILTER (WHERE COALESCE(s.is_verified, false) = true)::int AS verified_stores_count,
              COUNT(s.id) FILTER (WHERE s.status = 'suspended')::int AS suspended_stores_count
       FROM pd_subscription_limits l
       LEFT JOIN pd_store s ON s.subscription_plan = l.plan_id
       GROUP BY l.plan_id
       ORDER BY CASE l.plan_id
         WHEN 'free' THEN 1
         WHEN 'starter' THEN 2
         WHEN 'regular' THEN 3
         WHEN 'agency' THEN 4
         WHEN 'pro' THEN 5
         WHEN 'golden' THEN 6
         WHEN 'platinum' THEN 7
         ELSE 99
       END`,
    );
    res.status(200).json({ data: rows, plans: rows });
  }),
);

router.post(
  '/plans',
  validate(createPlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const planId = req.body.plan_id;
    // Wire format is explicitly percentage (0-100), stored as fraction (0.00-1.00)
    const commissionRate = Math.max(0, Math.min(100, Number(req.body.commission_rate))) / 100;
    const { rows } = await query(
      `INSERT INTO pd_subscription_limits (
         plan_id,
         max_products,
         max_images_per_product,
         max_page_builder_pages,
         has_ai_seo,
         has_image_compression,
         has_custom_domain,
         has_page_builder,
         has_direct_payment,
         has_white_label,
         has_own_ai_provider,
         commission_rate,
         ai_tokens_included,
         yearly_price,
         is_enabled
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        planId,
        req.body.max_products,
        req.body.max_images_per_product,
        req.body.max_page_builder_pages,
        req.body.has_ai_seo,
        req.body.has_image_compression,
        req.body.has_custom_domain,
        req.body.has_page_builder,
        req.body.has_direct_payment,
        req.body.has_white_label,
        req.body.has_own_ai_provider,
        commissionRate,
        req.body.ai_tokens_included,
        req.body.yearly_price,
        req.body.is_enabled,
      ],
    );

    subscriptionService.invalidateCache();
    logger.info({ admin_id: req.user!.id, plan_id: planId }, 'Admin created subscription plan');
    res.status(201).json({ data: rows[0], plan: rows[0] });
  }),
);

router.put(
  '/plans/:planId',
  validate(updatePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const planId = normalizePlanId(req.params.planId);
    // Wire format is explicitly percentage (0-100), stored as fraction (0.00-1.00)
    const commissionRate = Math.max(0, Math.min(100, Number(req.body.commission_rate))) / 100;
    const { rows } = await query(
      `UPDATE pd_subscription_limits
       SET max_products = $2,
           max_images_per_product = $3,
           max_page_builder_pages = $4,
           has_ai_seo = $5,
           has_image_compression = $6,
           has_custom_domain = $7,
           has_page_builder = $8,
           has_direct_payment = $9,
           has_white_label = $10,
           has_own_ai_provider = $11,
           commission_rate = $12,
           ai_tokens_included = $13,
           yearly_price = $14,
           is_enabled = $15,
           updated_at = NOW()
       WHERE plan_id = $1
       RETURNING *`,
      [
        planId,
        req.body.max_products,
        req.body.max_images_per_product,
        req.body.max_page_builder_pages,
        req.body.has_ai_seo,
        req.body.has_image_compression,
        req.body.has_custom_domain,
        req.body.has_page_builder,
        req.body.has_direct_payment,
        req.body.has_white_label,
        req.body.has_own_ai_provider,
        commissionRate,
        req.body.ai_tokens_included,
        req.body.yearly_price,
        req.body.is_enabled,
      ],
    );

    if (!rows[0]) {
      res.status(404).json({ error: { message: 'Plan not found' } });
      return;
    }

    subscriptionService.invalidateCache();
    const syncedWallets = await creditsService.syncForPlan(planId, req.body.ai_tokens_included);
    logger.info(
      { admin_id: req.user!.id, plan_id: planId, synced_wallets: syncedWallets },
      'Admin updated subscription plan',
    );
    res.status(200).json({ data: rows[0], plan: rows[0] });
  }),
);

router.delete(
  '/plans/:planId',
  validate(deletePlanSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const planId = normalizePlanId(req.params.planId);
    if (planId === SubscriptionPlan.Free) {
      res.status(400).json({ error: { message: 'The free plan cannot be deleted' } });
      return;
    }

    const replacementPlanId = req.body.replacement_plan_id;
    if (replacementPlanId === planId) {
      res
        .status(400)
        .json({ error: { message: 'Replacement plan must be different from the deleted plan' } });
      return;
    }

    const result = await transaction(async (client) => {
      const existingPlan = await client.query<{ plan_id: string }>(
        'SELECT plan_id FROM pd_subscription_limits WHERE plan_id = $1 FOR UPDATE',
        [planId],
      );
      if (!existingPlan.rows[0]) {
        return { status: 'not_found' as const };
      }

      const storeCountResult = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM pd_store WHERE subscription_plan = $1',
        [planId],
      );
      const storeCount = parseInt(storeCountResult.rows[0]?.count ?? '0', 10);
      if (storeCount > 0 && !replacementPlanId) {
        return { status: 'replacement_required' as const, storeCount };
      }

      if (replacementPlanId) {
        const replacementPlan = await client.query<{ plan_id: string; ai_tokens_included: number }>(
          'SELECT plan_id, ai_tokens_included FROM pd_subscription_limits WHERE plan_id = $1',
          [replacementPlanId],
        );
        if (!replacementPlan.rows[0]) {
          return { status: 'replacement_not_found' as const };
        }
        const movedStores = await client.query<{ id: string }>(
          `UPDATE pd_store
           SET subscription_plan = $2,
               subscription_type = CASE WHEN $2 = $3 THEN $4 ELSE $5 END,
               subscription_expires_at = CASE WHEN $2 = $3 THEN NULL ELSE subscription_expires_at END,
               updated_at = NOW()
           WHERE subscription_plan = $1
           RETURNING id`,
          [
            planId,
            replacementPlanId,
            SubscriptionPlan.Free,
            SubscriptionType.Commission,
            SubscriptionType.Yearly,
          ],
        );
        if (movedStores.rows.length > 0) {
          await client.query(
            `UPDATE pd_vendor_credits
             SET ai_tokens = $2,
                 last_refill = NOW()
             WHERE store_id = ANY($1::text[])`,
            [movedStores.rows.map((store) => store.id), replacementPlan.rows[0].ai_tokens_included],
          );
        }
      }

      await client.query('DELETE FROM pd_subscription_limits WHERE plan_id = $1', [planId]);
      return { status: 'deleted' as const, storeCount, replacementPlanId };
    });

    if (result.status === 'not_found') {
      res.status(404).json({ error: { message: 'Plan not found' } });
      return;
    }
    if (result.status === 'replacement_required') {
      res.status(409).json({
        error: {
          message: 'This plan has stores attached. Select a replacement plan before deleting it.',
          details: { stores_count: result.storeCount },
        },
      });
      return;
    }
    if (result.status === 'replacement_not_found') {
      res.status(400).json({ error: { message: 'Replacement plan not found' } });
      return;
    }

    subscriptionService.invalidateCache();
    logger.warn(
      {
        admin_id: req.user!.id,
        plan_id: planId,
        replacement_plan_id: result.replacementPlanId ?? null,
        stores_count: result.storeCount,
      },
      'Admin deleted subscription plan',
    );
    res.status(200).json({ success: true, ...result });
  }),
);
export default router;