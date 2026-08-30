import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, validate } from '../../middlewares';
import { orderService } from '../../services/order.service';

/** Superadmin refund review queue — refund approval gate (audit P1-5). */
const router = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const decisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.decision === 'approve' || Boolean(v.note), {
    message: 'A note is required when rejecting a refund',
    path: ['note'],
  });

/**
 * GET /api/pd/admin/refunds/review-queue
 * Refunds held by the approval gate, oldest first.
 */
router.get(
  '/refunds/review-queue',
  validate(listSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await orderService.listAwaitingAdminRefunds({
      page: (req.query as unknown as { page: number }).page,
      limit: (req.query as unknown as { limit: number }).limit,
    });
    res.status(200).json(result);
  }),
);

/**
 * POST /api/pd/admin/refunds/:refundId/decision
 * Approve (seller may then process it) or reject a gated refund.
 * The decision, reviewer and note are written to pd_audit_log by the service.
 */
router.post(
  '/refunds/:refundId/decision',
  validate(decisionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const refund = await orderService.decideRefund({
      refund_id: req.params.refundId,
      decision: req.body.decision,
      admin_id: req.user!.id,
      note: req.body.note,
    });
    res.status(200).json({ refund });
  }),
);

export default router;
