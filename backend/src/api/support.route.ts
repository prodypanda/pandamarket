import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, requireStore, validate } from '../middlewares';
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

router.get(
  '/me',
  requireStore,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query as unknown as { status?: 'open'; page: number; limit: number };
    const data = await supportTicketService.listForSeller({
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      status: status as any,
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

export default router;
