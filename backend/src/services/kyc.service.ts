/**
 * KycService — vendor verification (RC + CIN + phone).
 * 100% manual approval workflow per the PRD.
 */

import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdConflictError,
  PdNotFoundError,
  PdValidationError,
  PdErrorCode,
} from '../errors';
import { storeService } from './store.service';
import { VerificationStatus } from '@pandamarket/types';
import { logger } from '../utils/logger';

interface VerificationRow {
  id: string;
  store_id: string;
  rc_document_url: string | null;
  cin_document_url: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  status: VerificationStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export class KycService {
  /**
   * Submit (or re-submit after rejection) verification documents.
   */
  async submit(opts: {
    store_id: string;
    rc_document_url: string;
    cin_document_url: string;
    phone_number: string;
  }): Promise<VerificationRow> {
    if (!opts.rc_document_url || !opts.cin_document_url || !opts.phone_number) {
      throw new PdValidationError('All documents and phone number are required');
    }

    const existing = await this.getByStore(opts.store_id);
    if (existing) {
      if (existing.status === VerificationStatus.Approved) {
        throw new PdConflictError(
          PdErrorCode.KYC_ALREADY_VERIFIED,
          'Your store is already verified',
        );
      }
      if (existing.status === VerificationStatus.Pending) {
        throw new PdConflictError(
          PdErrorCode.KYC_ALREADY_SUBMITTED,
          'Documents already submitted, awaiting review',
          { submitted_at: existing.created_at.toISOString() },
        );
      }
      // status = rejected → allow re-submission
      const { rows } = await query<VerificationRow>(
        `UPDATE pd_verification_documents
         SET rc_document_url = $2, cin_document_url = $3, phone_number = $4,
             status = 'pending', rejection_reason = NULL,
             reviewed_by = NULL, reviewed_at = NULL
         WHERE store_id = $1 RETURNING *`,
        [opts.store_id, opts.rc_document_url, opts.cin_document_url, opts.phone_number],
      );
      return rows[0];
    }

    const id = pdId('kyc');
    const { rows } = await query<VerificationRow>(
      `INSERT INTO pd_verification_documents
        (id, store_id, rc_document_url, cin_document_url, phone_number)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, opts.store_id, opts.rc_document_url, opts.cin_document_url, opts.phone_number],
    );
    logger.info({ store_id: opts.store_id }, 'KYC submitted');
    return rows[0];
  }

  async getByStore(storeId: string): Promise<VerificationRow | null> {
    const { rows } = await query<VerificationRow>(
      'SELECT * FROM pd_verification_documents WHERE store_id = $1',
      [storeId],
    );
    return rows[0] ?? null;
  }

  async getById(id: string): Promise<VerificationRow> {
    const { rows } = await query<VerificationRow>(
      'SELECT * FROM pd_verification_documents WHERE id = $1',
      [id],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Verification not found');
    return rows[0];
  }

  /**
   * List all verifications, filtered by status.
   * Used by the admin queue.
   */
  async listByStatus(status: VerificationStatus, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const { rows } = await query<VerificationRow & { store_name: string; owner_email: string }>(
      `SELECT v.*, s.name AS store_name, u.email AS owner_email
       FROM pd_verification_documents v
       JOIN pd_store s ON s.id = v.store_id
       JOIN pd_user  u ON u.id = s.owner_id
       WHERE v.status = $1
       ORDER BY v.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_verification_documents WHERE status = $1',
      [status],
    );
    const total = parseInt(countRows[0].count, 10);
    return { data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
  }

  /**
   * Admin approves a KYC submission.
   * - Mark verification.status = approved
   * - Mark store as verified (status, is_verified = true)
   */
  async approve(verificationId: string, adminId: string, notes?: string): Promise<void> {
    await transaction(async (c) => {
      const { rows } = await c.query<VerificationRow>(
        `UPDATE pd_verification_documents
         SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), notes = $3
         WHERE id = $1 AND status != 'approved'
         RETURNING *`,
        [verificationId, adminId, notes ?? null],
      );
      if (!rows[0]) {
        throw new PdNotFoundError(
          PdErrorCode.NOT_FOUND,
          'Verification not found or already approved',
        );
      }
      await storeService.markVerified(rows[0].store_id, c);
    });
    logger.info({ verification_id: verificationId, admin_id: adminId }, 'KYC approved');
  }

  /**
   * Admin rejects a KYC submission.
   */
  async reject(verificationId: string, adminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim() === '') {
      throw new PdValidationError('Rejection reason is required');
    }
    const { rows } = await query<VerificationRow>(
      `UPDATE pd_verification_documents
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), rejection_reason = $3
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [verificationId, adminId, reason],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(
        PdErrorCode.NOT_FOUND,
        'Verification not found or already reviewed',
      );
    }
    logger.info({ verification_id: verificationId, admin_id: adminId }, 'KYC rejected');
  }

  /**
   * Mark the phone as verified (called after the admin's phone call).
   */
  async markPhoneVerified(verificationId: string): Promise<void> {
    await query(
      'UPDATE pd_verification_documents SET phone_verified = true WHERE id = $1',
      [verificationId],
    );
  }
}

export const kycService = new KycService();
