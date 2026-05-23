import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireAdmin, requireStore, validate } from '../middlewares';
import { supportTicketService } from '../services/support-ticket.service';

const router = Router();

const listSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_seller', 'waiting_admin', 'resolved', 'closed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createSchema = z.object({
  subject: z.string().trim().min(3).max(255),
  description: z.string().trim().min(10).max(5000),
  category: z.enum(['general', 'billing', 'technical', 'kyc', 'orders', 'returns', 'custom_template']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

const replySchema = z.object({ body: z.string().trim().min(1).max(5000) });

const sellerStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
});

const adminListSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_seller', 'waiting_admin', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  category: z.enum(['general', 'billing', 'technical', 'kyc', 'orders', 'returns', 'custom_template']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_seller', 'waiting_admin', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  assigned_admin_id: z.string().trim().min(3).max(64).nullable().optional(),
});

const adminReplySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  is_internal: z.boolean().optional(),
});

const attachmentSchema = z.object({
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.string().trim().min(3).max(127),
  file_size_bytes: z.coerce.number().int().min(0).max(25 * 1024 * 1024),
  file_url: z.string().trim().url().max(2000),
  message_id: z.string().trim().min(3).max(64).optional(),
});

router.get(
  '/me',
  requireStore,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = listSchema.parse(req.query);
    const data = await supportTicketService.listForSeller({
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      status,
      page,
      limit,
    });
    res.status(200).json(data);
  }),
);

router.post(
  '/me',
  requireStore,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const data = await supportTicketService.createForSeller({
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      subject: req.body.subject,
      description: req.body.description,
      category: req.body.category,
      priority: req.body.priority,
    });
    res.status(201).json(data);
  }),
);

router.get(
  '/me/:id',
  requireStore,
  asyncHandler(async (req, res) => {
    const data = await supportTicketService.getSellerTicket(req.params.id, req.user!.store_id!, req.user!.id);
    res.status(200).json(data);
  }),
);



router.post('/me/:id/attachments', requireStore, validate(attachmentSchema), asyncHandler(async (req, res) => {
  const data = await supportTicketService.addSellerAttachment({
    ticket_id: req.params.id,
    store_id: req.user!.store_id!,
    user_id: req.user!.id,
    file_name: req.body.file_name,
    mime_type: req.body.mime_type,
    file_size_bytes: req.body.file_size_bytes,
    file_url: req.body.file_url,
    message_id: req.body.message_id,
  });
  res.status(201).json(data);
}));



router.patch('/me/:id/status', requireStore, validate(sellerStatusSchema), asyncHandler(async (req, res) => {
  const data = await supportTicketService.updateSellerTicketStatus({
    ticket_id: req.params.id,
    store_id: req.user!.store_id!,
    user_id: req.user!.id,
    status: req.body.status,
  });
  res.status(200).json(data);
}));

router.post(
  '/me/:id/messages',
  requireStore,
  validate(replySchema),
  asyncHandler(async (req, res) => {
    const data = await supportTicketService.replyAsSeller({
      ticket_id: req.params.id,
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      body: req.body.body,
    });
    res.status(201).json(data);
  }),
);


router.get('/admin', requireAdmin, validate(adminListSchema, 'query'), asyncHandler(async (req, res) => {
  const { status, priority, category, page, limit } = adminListSchema.parse(req.query);
  const data = await supportTicketService.listForAdmin({ status, priority, category, page, limit });
  res.status(200).json(data);
}));

router.get('/admin/:id', requireAdmin, asyncHandler(async (req, res) => {
  const data = await supportTicketService.getAdminTicket(req.params.id);
  res.status(200).json(data);
}));

router.post('/admin/:id/messages', requireAdmin, validate(adminReplySchema), asyncHandler(async (req, res) => {
  const data = await supportTicketService.replyAsAdmin({
    ticket_id: req.params.id,
    admin_id: req.user!.id,
    body: req.body.body,
    is_internal: req.body.is_internal,
  });
  res.status(201).json(data);
}));



router.post('/admin/:id/attachments', requireAdmin, validate(attachmentSchema), asyncHandler(async (req, res) => {
  const data = await supportTicketService.addAdminAttachment({
    ticket_id: req.params.id,
    admin_id: req.user!.id,
    file_name: req.body.file_name,
    mime_type: req.body.mime_type,
    file_size_bytes: req.body.file_size_bytes,
    file_url: req.body.file_url,
    message_id: req.body.message_id,
  });
  res.status(201).json(data);
}));

router.patch('/admin/:id', requireAdmin, validate(adminUpdateSchema), asyncHandler(async (req, res) => {
  const data = await supportTicketService.updateByAdmin({
    ticket_id: req.params.id,
    status: req.body.status,
    priority: req.body.priority,
    assigned_admin_id: req.body.assigned_admin_id,
  });
  res.status(200).json(data);
}));

export default router;
