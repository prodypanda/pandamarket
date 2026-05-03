/**
 * Notification API routes — in-app notifications for authenticated users.
 *
 * Endpoints:
 *   GET    /api/pd/notifications          — List user notifications (paginated)
 *   GET    /api/pd/notifications/unread-count — Get unread count
 *   PATCH  /api/pd/notifications/:id/read — Mark a single notification as read
 *   PATCH  /api/pd/notifications/read-all — Mark all notifications as read
 *   DELETE /api/pd/notifications/:id      — Delete a notification
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { notificationService } from '../services/notification.service';
import { asyncHandler, requireAuth, validate } from '../middlewares';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

// ==========================================================
// Schemas
// ==========================================================

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unread: z.coerce.boolean().optional(),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /api/pd/notifications
 * List notifications for the authenticated user.
 */
router.get(
  '/',
  validate(listSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, unread } = req.query as unknown as {
      page: number;
      limit: number;
      unread?: boolean;
    };
    const result = await notificationService.list(req.user!.id, { page, limit, unread });
    res.status(200).json(result);
  }),
);

/**
 * GET /api/pd/notifications/unread-count
 * Get the count of unread notifications.
 */
router.get(
  '/unread-count',
  asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.unreadCount(req.user!.id);
    res.status(200).json({ unread_count: count });
  }),
);

/**
 * PATCH /api/pd/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 * NOTE: This route must be defined BEFORE /:id/read to avoid route conflicts.
 */
router.patch(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllRead(req.user!.id);
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  }),
);

/**
 * PATCH /api/pd/notifications/:id/read
 * Mark a single notification as read.
 */
router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markRead(req.params.id, req.user!.id);
    res.status(200).json({ success: true });
  }),
);

export default router;
