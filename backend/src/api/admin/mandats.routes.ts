import { asyncHandler, validate } from '../../middlewares';
import { mandatService } from '../../services/mandat.service';
import { logger } from '../../utils/logger';
import type { MandatStatus } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Mandat Minute Validation Queue — extracted from admin.route.ts (E15 split). */
const router = Router();

const mandatListSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/mandats/pending',
  validate(mandatListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as {
      status: MandatStatus;
      page: number;
      limit: number;
    };
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
export default router;