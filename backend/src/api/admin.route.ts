/**
 * Admin API routes — Super Admin only.
 * Handles KYC verification queue, mandat validation, reports management,
 * vendor management, and platform statistics.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  asyncHandler,
  requireAuth,
  requireAdmin,
  validate,
} from '../middlewares';
import { kycService } from '../services/kyc.service';
import { mandatService } from '../services/mandat.service';
import { reportService } from '../services/report.service';
import { storeService } from '../services/store.service';
import { query } from '../db/pool';
import { VerificationStatus, MandatStatus, ReportStatus } from '@pandamarket/types';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// =====================================================
// KYC Verification Queue
// =====================================================

const kycStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/verifications/pending',
  validate(kycStatusSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as { status: VerificationStatus; page: number; limit: number };
    const result = await kycService.listByStatus(status, { page, limit });
    res.status(200).json(result);
  }),
);

const approveKycSchema = z.object({
  notes: z.string().max(1000).optional(),
});

router.put(
  '/verifications/:id/approve',
  validate(approveKycSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await kycService.approve(req.params.id, req.user!.id, req.body.notes);
    logger.info({ verification_id: req.params.id, admin_id: req.user!.id }, 'Admin approved KYC');
    res.status(200).json({ success: true, message: 'Verification approved' });
  }),
);

const rejectKycSchema = z.object({
  rejection_reason: z.string().min(1).max(500),
});

router.put(
  '/verifications/:id/reject',
  validate(rejectKycSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await kycService.reject(req.params.id, req.user!.id, req.body.rejection_reason);
    logger.info({ verification_id: req.params.id, admin_id: req.user!.id }, 'Admin rejected KYC');
    res.status(200).json({ success: true, message: 'Verification rejected' });
  }),
);

// =====================================================
// Mandat Minute Validation Queue
// =====================================================

const mandatListSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/mandats/pending',
  validate(mandatListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as { status: MandatStatus; page: number; limit: number };
    const result = await mandatService.listByStatus(status, { page, limit });
    res.status(200).json(result);
  }),
);

router.put(
  '/mandats/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    await mandatService.approve(req.params.id, req.user!.id);
    logger.info({ proof_id: req.params.id, admin_id: req.user!.id }, 'Admin approved mandat');
    res.status(200).json({ success: true, message: 'Mandat approved' });
  }),
);

const rejectMandatSchema = z.object({
  rejection_reason: z.string().min(1).max(500),
});

router.put(
  '/mandats/:id/reject',
  validate(rejectMandatSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await mandatService.reject(req.params.id, req.user!.id, req.body.rejection_reason);
    logger.info({ proof_id: req.params.id, admin_id: req.user!.id }, 'Admin rejected mandat');
    res.status(200).json({ success: true, message: 'Mandat rejected' });
  }),
);

// =====================================================
// Reports Management
// =====================================================

const reportListSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/reports',
  validate(reportListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as { status?: ReportStatus; page: number; limit: number };
    const result = await reportService.list({ status, page, limit });
    res.status(200).json(result);
  }),
);

const updateReportSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
  admin_notes: z.string().max(2000).optional(),
});

router.put(
  '/reports/:id/status',
  validate(updateReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.updateStatus(
      req.params.id,
      req.body.status,
      req.user!.id,
      req.body.admin_notes,
    );
    res.status(200).json({ report });
  }),
);

// =====================================================
// Vendor Management
// =====================================================

const vendorListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  verified_only: z.coerce.boolean().optional(),
});

router.get(
  '/vendors',
  validate(vendorListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, verified_only } = req.query as unknown as { page: number; limit: number; verified_only?: boolean };
    const result = await storeService.list({ page, limit, verifiedOnly: verified_only });
    res.status(200).json(result);
  }),
);

router.put(
  '/vendors/:id/suspend',
  asyncHandler(async (req: Request, res: Response) => {
    const reason = req.body.reason || 'Suspended by admin';
    await storeService.suspend(req.params.id, reason);
    logger.info({ store_id: req.params.id, admin_id: req.user!.id }, 'Admin suspended store');
    res.status(200).json({ success: true, message: 'Store suspended' });
  }),
);

// =====================================================
// Platform Statistics
// =====================================================

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

export default router;
