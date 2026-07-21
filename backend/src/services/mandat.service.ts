/**
 * MandatService — Mandat Minute (manual payment) workflow.
 *   1. Customer chooses Mandat Minute at checkout
 *   2. Order created in `payment_required`
 *   3. Customer/vendor uploads proof image (presigned URL → S3)
 *   4. This service records the proof in `pd_mandat_proofs` (status = pending)
 *   5. Admin approves/rejects via `review()` → triggers payment.captured
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdErrorCode,
  PdNotFoundError,
  PdValidationError,
} from '../errors';
import { MandatStatus, MandatUploader, PaymentGateway } from '@pandamarket/types';
import { logger } from '../utils/logger';
import { eventBus } from '../events/event-bus';
import { orderService } from './order.service';
import { adsService } from './ads.service';

export interface MandatProofRow {
  id: string;
  order_id: string;
  uploaded_by: MandatUploader;
  uploader_user_id: string | null;
  image_url: string;
  amount_expected: string;
  status: MandatStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export class MandatService {
  /**
   * Record a proof upload (the file is already in S3).
   */
  async uploadProof(opts: {
    order_id: string;
    uploaded_by: MandatUploader;
    uploader_user_id: string;
    image_url: string;
    amount_expected: number;
  }): Promise<MandatProofRow> {
    if (!opts.image_url) {
      throw new PdValidationError('image_url is required', {
        code: PdErrorCode.PAY_MANDAT_UPLOAD_FAILED,
      });
    }
    // Allow re-upload only if previous attempt was rejected
    const existing = await query<{ id: string; status: MandatStatus }>(
      'SELECT id, status FROM pd_mandat_proofs WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [opts.order_id],
    );
    if (existing.rowCount && existing.rows[0].status === MandatStatus.Pending) {
      throw new PdConflictError(
        PdErrorCode.PAY_MANDAT_ALREADY_REVIEWED,
        'A pending proof already exists for this order',
        { proof_id: existing.rows[0].id },
      );
    }

    const id = pdId('mandat');
    const { rows } = await query<MandatProofRow>(
      `INSERT INTO pd_mandat_proofs
        (id, order_id, uploaded_by, uploader_user_id, image_url, amount_expected)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, opts.order_id, opts.uploaded_by, opts.uploader_user_id, opts.image_url, opts.amount_expected],
    );
    logger.info({ proof_id: id, order_id: opts.order_id }, 'Mandat proof uploaded');
    eventBus.emit('pd.mandat.uploaded', { proof_id: id, order_id: opts.order_id });
    return rows[0];
  }

  /**
   * List pending mandates for the admin queue.
   */
  async listByStatus(status: MandatStatus, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const { rows } = await query<
      MandatProofRow & {
        order_total: string;
        order_currency: string;
        customer_email: string;
      }
    >(
      `SELECT m.*, o.total::text AS order_total, o.currency AS order_currency,
              u.email AS customer_email
       FROM pd_mandat_proofs m
       JOIN pd_order o ON o.id = m.order_id
       JOIN pd_user  u ON u.id = o.customer_id
       WHERE m.status = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    const { rows: cnt } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_mandat_proofs WHERE status = $1',
      [status],
    );
    return {
      data: rows,
      meta: {
        page,
        limit,
        total: parseInt(cnt[0].count, 10),
        total_pages: Math.ceil(parseInt(cnt[0].count, 10) / limit),
      },
    };
  }

  async getById(id: string): Promise<MandatProofRow> {
    const { rows } = await query<MandatProofRow>(
      'SELECT * FROM pd_mandat_proofs WHERE id = $1',
      [id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Mandat proof not found');
    return rows[0];
  }

  /**
   * Admin approves the proof → captures the payment for the order.
   */
  async approve(proofId: string, adminId: string): Promise<void> {
    const { rows } = await query<MandatProofRow>(
      `UPDATE pd_mandat_proofs
       SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [proofId, adminId],
    );
    if (!rows[0]) {
      throw new PdConflictError(
        PdErrorCode.PAY_MANDAT_ALREADY_REVIEWED,
        'Proof not found or already reviewed',
      );
    }
    const proof = rows[0];
    await orderService.markPaid(proof.order_id, PaymentGateway.ManualMandat, proofId);
    await adsService.recognizeOrderConversion(proof.order_id);
    logger.info({ proof_id: proofId, order_id: proof.order_id }, 'Mandat approved');
    eventBus.emit('pd.payment.captured', {
      order_id: proof.order_id,
      gateway: PaymentGateway.ManualMandat,
      amount: parseFloat(proof.amount_expected),
    });
  }

  async reject(proofId: string, adminId: string, reason: string): Promise<void> {
    if (!reason) throw new PdValidationError('Rejection reason is required');
    const { rowCount } = await query(
      `UPDATE pd_mandat_proofs
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3
       WHERE id = $1 AND status = 'pending'`,
      [proofId, adminId, reason],
    );
    if (!rowCount) {
      throw new PdConflictError(
        PdErrorCode.PAY_MANDAT_ALREADY_REVIEWED,
        'Proof not found or already reviewed',
      );
    }
    logger.info({ proof_id: proofId, admin_id: adminId }, 'Mandat rejected');
  }
}

export const mandatService = new MandatService();
