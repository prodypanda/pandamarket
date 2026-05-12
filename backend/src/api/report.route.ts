import { Router } from 'express';
import { ReportStatus, UserRole } from '@pandamarket/types';
import { z } from 'zod';
import { asyncHandler, requireAuth, requireRole, requireStore, validate } from '../middlewares';
import { reportService } from '../services/report.service';
import { createReportMessageSchema, createReportSchema, paginationSchema } from '../validators';

const router = Router();

const reportListSchema = paginationSchema.extend({
  status: z.enum(['open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed']).optional(),
});

router.get(
  '/me',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(reportListSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query as unknown as {
      status?: ReportStatus;
      page: number;
      limit: number;
    };
    const result = await reportService.listByReporter(req.user!.id, { status, page, limit });
    res.status(200).json(result);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(createReportSchema),
  asyncHandler(async (req, res) => {
    const report = await reportService.createBuyerSellerReport({
      reporter_id: req.user!.id,
      store_id: req.body.store_id,
      order_id: req.body.order_id,
      category: req.body.category,
      reason: req.body.reason,
      evidence_urls: req.body.evidence_urls,
    });

    res.status(201).json({ report });
  }),
);

router.get(
  '/store',
  requireStore,
  validate(reportListSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query as unknown as {
      status?: ReportStatus;
      page: number;
      limit: number;
    };
    const result = await reportService.listByStore(req.user!.store_id!, { status, page, limit });
    res.status(200).json(result);
  }),
);

router.get(
  '/store/:id',
  requireStore,
  asyncHandler(async (req, res) => {
    const data = await reportService.getStoreCase(req.params.id, req.user!.store_id!);
    res.status(200).json(data);
  }),
);

router.post(
  '/store/:id/messages',
  requireStore,
  validate(createReportMessageSchema),
  asyncHandler(async (req, res) => {
    const data = await reportService.addSellerMessage(
      req.params.id,
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      req.body.body,
      req.body.attachments,
    );
    res.status(201).json(data);
  }),
);

router.get(
  '/:id',
  requireAuth,
  requireRole(UserRole.Customer),
  asyncHandler(async (req, res) => {
    const data = await reportService.getBuyerCase(req.params.id, req.user!.id);
    res.status(200).json(data);
  }),
);

router.post(
  '/:id/messages',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(createReportMessageSchema),
  asyncHandler(async (req, res) => {
    const data = await reportService.addBuyerMessage(
      req.params.id,
      req.user!.id,
      req.body.body,
      req.body.attachments,
    );
    res.status(201).json(data);
  }),
);

export default router;
