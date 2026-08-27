import { query } from '../../db/pool';
import { asyncHandler, validate } from '../../middlewares';
import { platformConfigService } from '../../services/platform-config.service';
import { walletService } from '../../services/wallet.service';
import { Request, Response, Router } from 'express';
import { PdNotFoundError, PdErrorCode } from '../../errors';
import { z } from 'zod';

/** Withdrawal / Payout Queue — extracted from admin.route.ts (E15 split). */
const router = Router();

const withdrawalListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
});

/**
 * GET /api/pd/admin/withdrawals
 * List payout transactions across all vendors.
 */
router.get(
  '/withdrawals',
  validate(withdrawalListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, type } = req.query as unknown as {
      page: number;
      limit: number;
      type?: string;
    };
    const offset = (page - 1) * limit;
    const txType = type || 'payout';

    const { rows } = await query<{
      id: string;
      wallet_id: string;
      type: string;
      amount: string;
      balance_after: string;
      description: string | null;
      created_at: Date;
      store_id: string;
      store_name: string;
    }>(
      `SELECT t.id, t.wallet_id, t.type, t.amount::text, t.balance_after::text,
              t.description, t.created_at, w.store_id, s.name AS store_name
       FROM pd_wallet_transaction t
       JOIN pd_vendor_wallet w ON w.id = t.wallet_id
       JOIN pd_store s ON s.id = w.store_id
       WHERE t.type = $1
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [txType, limit, offset],
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_wallet_transaction WHERE type = $1`,
      [txType],
    );
    const total = parseInt(countRows[0].count, 10);

    res.status(200).json({
      data: rows.map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        balance_after: parseFloat(r.balance_after),
        created_at: r.created_at.toISOString(),
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * POST /api/pd/admin/wallets/release-due
 * Manually trigger release of pending funds whose retention period has elapsed.
 * Useful when the recurring BullMQ job was not scheduled (e.g. before the fix
 * that calls scheduleRecurringPayoutJobs() on boot).
 */
router.post(
  '/wallets/release-due',
  asyncHandler(async (_req: Request, res: Response) => {
    const released = await walletService.releaseDueFunds();
    res.status(200).json({ released_count: released });
  }),
);

/**
 * POST /api/pd/admin/wallets/sync-retention
 * Bulk-update every vendor wallet's retention_days from the current platform
 * config (per payment method). Uses the mandat retention as the wallet default
 * (most conservative) — per-transaction retention is applied at credit time.
 */
router.post(
  '/wallets/sync-retention',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await platformConfigService.getSettings();
    const candidates = [
      settings.retention_days_flouci,
      settings.retention_days_konnect,
      settings.retention_days_mandat,
      settings.retention_days_cod,
    ].map((v) => (typeof v === 'number' ? v : Number(v))).filter((v) => Number.isFinite(v) && v > 0);
    const retentionDays = candidates.length ? Math.min(...candidates) : 2;
    const { rowCount } = await query(
      `UPDATE pd_vendor_wallet SET retention_days = $1 WHERE retention_days <> $1`,
      [retentionDays],
    );
    res.status(200).json({ synced_wallets: rowCount ?? 0, retention_days: retentionDays });
  }),
);

/**
 * PUT /api/pd/admin/withdrawals/:id/status
 * Mark a withdrawal payout as approved or rejected with bank transfer reference.
 */
router.put(
  '/withdrawals/:id/status',
  validate(
    z.object({
      status: z.enum(['approved', 'rejected', 'completed']),
      reference: z.string().optional(),
      reason: z.string().optional(),
    }),
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reference, reason } = req.body;

    const { rows } = await query(
      `UPDATE pd_wallet_transaction
       SET metadata = jsonb_set(
         jsonb_set(
           coalesce(metadata, '{}'::jsonb),
           '{payout_status}',
           to_jsonb($1::text)
         ),
         '{payout_review}',
         jsonb_build_object(
           'reviewed_by', $2::text,
           'reviewed_at', NOW(),
           'reference', $3::text,
           'reason', $4::text
         )
       )
       WHERE id = $5 AND type = 'payout'
       RETURNING *`,
      [status, req.user!.id, reference || '', reason || '', id],
    );

    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Withdrawal transaction not found');
    }

    res.status(200).json({ success: true, transaction: rows[0] });
  }),
);


/**
 * POST /api/pd/admin/withdrawals/:id/approve
 * Transition withdrawal status to approved.
 */
router.post(
  '/withdrawals/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tx = await walletService.approveWithdrawal(id, req.user!.id);
    res.status(200).json({ success: true, transaction: tx });
  }),
);

/**
 * POST /api/pd/admin/withdrawals/:id/reject
 * Reject withdrawal and reverse funds back to vendor wallet available balance.
 */
router.post(
  '/withdrawals/:id/reject',
  validate(z.object({ reason: z.string().optional() })),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const tx = await walletService.rejectWithdrawal(id, req.user!.id, reason);
    res.status(200).json({ success: true, transaction: tx });
  }),
);

/**
 * POST /api/pd/admin/withdrawals/:id/complete
 * Complete withdrawal payout with bank transfer slip reference.
 */
router.post(
  '/withdrawals/:id/complete',
  validate(z.object({ bank_reference: z.string().min(2) })),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { bank_reference } = req.body;
    const tx = await walletService.completeWithdrawal(id, req.user!.id, bank_reference);
    res.status(200).json({ success: true, transaction: tx });
  }),
);

export default router;