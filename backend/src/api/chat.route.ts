import { Router } from 'express';
import { UserRole } from '@pandamarket/types';
import { z } from 'zod';
import { asyncHandler, requireAdmin, requireAuth, requireRole, requireStore, validate } from '../middlewares';
import { chatService } from '../services/chat.service';

const router = Router();

const attachmentSchema = z.object({
  file_url: z.string().url().nullable().optional(),
  file_key: z.string().max(500).nullable().optional(),
  file_name: z.string().trim().min(1).max(255),
  content_type: z.string().trim().min(1).max(120),
  file_size: z.number().int().min(0).nullable().optional(),
});

const createConversationSchema = z.object({
  store_id: z.string().max(64).nullable().optional(),
  buyer_id: z.string().max(64).nullable().optional(),
  product_id: z.string().max(64).nullable().optional(),
  order_id: z.string().max(64).nullable().optional(),
  subject: z.string().trim().min(2).max(200).nullable().optional(),
  body: z.string().trim().max(5000).nullable().optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  check_existing: z.boolean().optional(),
  force_new: z.boolean().optional(),
});

const messageSchema = z.object({
  body: z.string().trim().max(5000).nullable().optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
});

const statusSchema = z.object({
  status: z.enum(['open', 'closed']),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'closed']).optional(),
  type: z.enum(['buyer_seller', 'seller_admin', 'buyer_admin', 'seller_seller']).optional(),
  search: z.string().trim().max(100).optional(),
});

const targetSearchSchema = z.object({
  kind: z.enum(['seller', 'buyer']),
  search: z.string().trim().max(100).default(''),
});

router.get(
  '/limits',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const limits = await chatService.getChatLimits();
    res.status(200).json({
      data: {
        message_rate_limit_per_minute: limits.messageRateLimitPerMinute,
        max_images_per_message: limits.maxImagesPerMessage,
        max_image_size_bytes: limits.maxImageSizeBytes,
        max_message_length: limits.maxMessageLength,
      },
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await chatService.listBuyerConversations(req.user!.id, req.query as unknown as { page: number; limit: number; status?: 'open' | 'closed'; search?: string });
    res.status(200).json(result);
  }),
);

router.post(
  '/buyer-seller',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createBuyerSellerConversation(req.user!.id, req.body);
    res.status(201).json(data);
  }),
);

router.post(
  '/buyer-admin',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createBuyerAdminConversation(req.user!.id, req.body);
    res.status(201).json(data);
  }),
);

router.get(
  '/store',
  requireStore,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await chatService.listStoreConversations(
      req.user!.store_id!,
      req.user!.id,
      req.query as unknown as { page: number; limit: number; status?: 'open' | 'closed'; type?: 'buyer_seller' | 'seller_admin' | 'buyer_admin' | 'seller_seller'; search?: string },
    );
    res.status(200).json(result);
  }),
);

router.post(
  '/store/buyer-seller',
  requireStore,
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createStoreBuyerConversation(
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      req.body,
    );
    res.status(201).json(data);
  }),
);

router.post(
  '/store/admin',
  requireStore,
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createSellerAdminConversation(
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      req.body,
    );
    res.status(201).json(data);
  }),
);

router.post(
  '/store/seller',
  requireStore,
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createSellerSellerConversation(
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      req.body,
    );
    res.status(201).json(data);
  }),
);

router.get(
  '/admin',
  requireAuth,
  requireAdmin,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await chatService.listAdminConversations(req.user!.id, req.query as unknown as { page: number; limit: number; status?: 'open' | 'closed'; type?: 'buyer_seller' | 'seller_admin' | 'buyer_admin' | 'seller_seller'; search?: string });
    res.status(200).json(result);
  }),
);

router.post(
  '/admin/seller',
  requireAuth,
  requireAdmin,
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createAdminSellerConversation(
      { id: req.user!.id, role: req.user!.role },
      req.body,
    );
    res.status(201).json(data);
  }),
);

router.post(
  '/admin/buyer',
  requireAuth,
  requireAdmin,
  validate(createConversationSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.createAdminBuyerConversation(
      { id: req.user!.id, role: req.user!.role },
      req.body,
    );
    res.status(201).json(data);
  }),
);

router.get(
  '/admin/targets/search',
  requireAuth,
  requireAdmin,
  validate(targetSearchSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await chatService.searchAdminChatTargets(
      req.query.kind as 'seller' | 'buyer',
      String(req.query.search || ''),
    );
    res.status(200).json({ data: result });
  }),
);

router.get(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = await chatService.getAdminConversation(req.params.id);
    res.status(200).json(data);
  }),
);

router.post(
  '/admin/:id/messages',
  requireAuth,
  requireAdmin,
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.addAdminMessage(
      req.params.id,
      { id: req.user!.id, role: req.user!.role },
      req.body.body,
      req.body.attachments,
    );
    res.status(201).json(data);
  }),
);

router.post(
  '/admin/:id/read',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await chatService.markAdminRead(req.params.id, { id: req.user!.id, role: req.user!.role });
    res.status(200).json(result);
  }),
);

router.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const conversation = await chatService.updateStatusForAdmin(req.params.id, req.body.status);
    res.status(200).json({ conversation });
  }),
);

router.get(
  '/store/:id',
  requireStore,
  asyncHandler(async (req, res) => {
    const data = await chatService.getStoreConversation(req.params.id, req.user!.store_id!, req.user!.id);
    res.status(200).json(data);
  }),
);

router.post(
  '/store/:id/messages',
  requireStore,
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.addStoreMessage(
      req.params.id,
      { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id },
      req.body.body,
      req.body.attachments,
    );
    res.status(201).json(data);
  }),
);

router.post(
  '/store/:id/read',
  requireStore,
  asyncHandler(async (req, res) => {
    const result = await chatService.markStoreRead(req.params.id, { id: req.user!.id, role: req.user!.role, store_id: req.user!.store_id });
    res.status(200).json(result);
  }),
);

router.patch(
  '/store/:id/status',
  requireStore,
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const conversation = await chatService.updateStatusForStore(req.params.id, req.user!.store_id!, req.body.status, req.user!.id);
    res.status(200).json({ conversation });
  }),
);

router.get(
  '/:id',
  requireAuth,
  requireRole(UserRole.Customer),
  asyncHandler(async (req, res) => {
    const data = await chatService.getBuyerConversation(req.params.id, req.user!.id);
    res.status(200).json(data);
  }),
);

router.post(
  '/:id/messages',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(messageSchema),
  asyncHandler(async (req, res) => {
    const data = await chatService.addBuyerMessage(req.params.id, req.user!.id, req.body.body, req.body.attachments);
    res.status(201).json(data);
  }),
);

router.post(
  '/:id/read',
  requireAuth,
  requireRole(UserRole.Customer),
  asyncHandler(async (req, res) => {
    const result = await chatService.markBuyerRead(req.params.id, req.user!.id);
    res.status(200).json(result);
  }),
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(UserRole.Customer),
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const conversation = await chatService.updateStatusForBuyer(req.params.id, req.user!.id, req.body.status);
    res.status(200).json({ conversation });
  }),
);

export default router;
