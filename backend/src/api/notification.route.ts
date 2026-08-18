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
import { query } from '../db/pool';
import { UserRole } from '@pandamarket/types';

const router = Router();
const SELECTED_STORE_COOKIE = 'pd_selected_store_id';

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

async function getSelectedNotificationStoreId(req: Request): Promise<string | null> {
  const user = req.user;
  if (!user || user.role !== UserRole.Vendor) return null;

  const selectedStoreId = (req as Request & { cookies?: Record<string, string> }).cookies
    ?.[SELECTED_STORE_COOKIE];
  if (selectedStoreId) {
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2',
      [selectedStoreId, user.id],
    );
    if (rows[0]) return rows[0].id;
  }

  if (user.store_id) {
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2',
      [user.store_id, user.id],
    );
    if (rows[0]) return rows[0].id;
  }

  const { rows } = await query<{ id: string }>(
    `SELECT id
     FROM pd_store
     WHERE owner_id = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [user.id],
  );
  return rows[0]?.id ?? null;
}

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
    const result = await notificationService.list(req.user!.id, {
      page,
      limit,
      unread,
      storeId: await getSelectedNotificationStoreId(req),
    });
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
    const count = await notificationService.unreadCount(
      req.user!.id,
      await getSelectedNotificationStoreId(req),
    );
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
    await notificationService.markAllRead(req.user!.id, await getSelectedNotificationStoreId(req));
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
    await notificationService.markRead(
      req.params.id,
      req.user!.id,
      await getSelectedNotificationStoreId(req),
    );
    res.status(200).json({ success: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await notificationService.delete(
      req.params.id,
      req.user!.id,
      await getSelectedNotificationStoreId(req),
    );
    res.status(200).json({ success: true });
  }),
);

/**
 * POST /api/pd/notifications/flush-batch
 * Manually flush pending price drop and new product notification batches for a store (for testing or instant push).
 */
router.post(
  '/flush-batch',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { notificationBatchService } = await import('../services/notification-batch.service');
    const storeId = (req.body.store_id as string) || req.user?.store_id || (await getSelectedNotificationStoreId(req));
    if (!storeId) {
      res.status(400).json({ success: false, message: 'store_id is required' });
      return;
    }

    // Verify ownership if not super_admin or admin
    if (req.user?.role !== UserRole.SuperAdmin && req.user?.role !== UserRole.Admin) {
      const { rows } = await query<{ id: string }>(
        'SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2',
        [storeId, req.user!.id]
      );
      if (rows.length === 0 && req.user?.store_id !== storeId) {
        res.status(403).json({ success: false, message: 'Forbidden: You do not own this store' });
        return;
      }
    }

    const result = await notificationBatchService.flushStoreBatches(storeId);
    res.status(200).json({ success: true, ...result });
  }),
);

export default router;
