import { asyncHandler, validate } from '../../middlewares';
import { kycService } from '../../services/kyc.service';
import { logger } from '../../utils/logger';
import type { VerificationStatus } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** KYC Verification Queue — extracted from admin.route.ts (E15 split). */
const router = Router();

const kycStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/verifications/pending',
  validate(kycStatusSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as {
      status: VerificationStatus;
      page: number;
      limit: number;
    };
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
export default router;