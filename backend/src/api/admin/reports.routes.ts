import { asyncHandler, validate } from '../../middlewares';
import { reportService } from '../../services/report.service';
import { ReportSource, ReportMessageVisibility, ReportPriority, ReportStatus, ReportTargetType } from '@pandamarket/types';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Reports Management — extracted from admin.route.ts (E15 split). */
const router = Router();

const reportListSchema = z.object({
  status: z
    .enum(['open', 'investigating', 'awaiting_buyer', 'awaiting_seller', 'resolved', 'dismissed'])
    .optional(),
  target_type: z.enum(['seller', 'buyer']).optional(),
  source: z.enum(['buyer', 'admin']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  search: z.string().max(120).optional(),
  store_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/reports',
  validate(reportListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, target_type, source, priority, search, store_id, page, limit } =
      req.query as unknown as {
        status?: ReportStatus;
        target_type?: ReportTargetType;
        source?: ReportSource;
        priority?: ReportPriority;
        search?: string;
        store_id?: string;
        page: number;
        limit: number;
      };
    const result = await reportService.list({
      status,
      targetType: target_type,
      source,
      priority,
      search,
      storeId: store_id,
      page,
      limit,
    });
    res.status(200).json(result);
  }),
);

const reportTargetListSchema = z.object({
  type: z.enum(['seller', 'buyer']),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

router.get(
  '/reports/targets',
  validate(reportTargetListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, search, limit } = req.query as unknown as {
      type: ReportTargetType;
      search?: string;
      limit: number;
    };
    const data = await reportService.listTargets(type, search, limit);
    res.status(200).json({ data });
  }),
);

const createAdminReportSchema = z.object({
  target_type: z.enum(['seller', 'buyer']),
  store_id: z.string().optional(),
  target_user_id: z.string().optional(),
  order_id: z.string().optional(),
  category: z.string().max(40).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  reason: z.string().min(10).max(2000),
  evidence_urls: z.array(z.string().url()).max(10).optional(),
  admin_notes: z.string().max(2000).optional(),
});

router.post(
  '/reports',
  validate(createAdminReportSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const report = await reportService.create({
      reporter_id: req.user!.id,
      source: ReportSource.Admin,
      target_type: req.body.target_type,
      store_id: req.body.store_id,
      target_user_id: req.body.target_user_id,
      order_id: req.body.order_id,
      category: req.body.category,
      priority: req.body.priority,
      reason: req.body.reason,
      evidence_urls: req.body.evidence_urls,
      admin_notes: req.body.admin_notes,
    });
    res.status(201).json({ report });
  }),
);

const updateReportSchema = z.object({
  status: z.enum([
    'open',
    'investigating',
    'awaiting_buyer',
    'awaiting_seller',
    'resolved',
    'dismissed',
  ]),
  admin_notes: z.string().max(2000).optional(),
});

const reportAttachmentInputSchema = z
  .object({
    file_url: z.string().url().optional(),
    file_key: z.string().min(1).max(1024).optional(),
    file_name: z.string().min(1).max(255),
    content_type: z.string().min(1).max(120),
    file_size: z
      .number()
      .int()
      .min(0)
      .max(20 * 1024 * 1024)
      .optional(),
  })
  .refine((value) => value.file_url || value.file_key, {
    message: 'Either file_url or file_key is required',
  });

const createReportMessageSchema = z.object({
  visibility: z.enum(['buyer_admin', 'seller_admin', 'all_parties', 'admin_internal']),
  body: z.string().min(1).max(5000),
  attachments: z.array(reportAttachmentInputSchema).max(10).optional(),
});

router.get(
  '/reports/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.getAdminCase(req.params.id);
    res.status(200).json(data);
  }),
);

router.post(
  '/reports/:id/messages',
  validate(createReportMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.addAdminMessage(
      req.params.id,
      { id: req.user!.id, role: req.user!.role },
      req.body.body,
      req.body.visibility as ReportMessageVisibility,
      req.body.attachments,
    );
    res.status(201).json(data);
  }),
);

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

export default router;