/**
 * Seller Loyalty & Broadcasts Router — Feature 20 (R5)
 *
 * Mounts:
 * - POST /api/pd/seller/subscribers/broadcast (enforces 2/week limit, dispatches broadcast)
 * - GET  /api/pd/seller/subscribers/analytics (returns subscriber KPIs & 24 Tunisian governorates distribution)
 * - GET  /api/pd/seller/subscribers/broadcasts (returns broadcast history)
 * - GET  /api/pd/seller/subscribers/history (alias for broadcast history)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireStore, asyncHandler } from '../middlewares';
import { sellerBroadcastService } from '../services/seller-broadcast.service';
import { orderService } from '../services/order.service';
import { pdfInvoiceService } from '../services/pdf-invoice.service';
import { PdValidationError } from '../errors';
import { query } from '../db/pool';

export const sellerRouter = Router();

/**
 * Helper to resolve store ID for authenticated seller
 */
async function resolveSellerStoreId(req: Request): Promise<string> {
  if (req.user?.store_id) {
    return req.user.store_id;
  }

  const queryStoreId = req.query.store_id as string | undefined;
  const bodyStoreId = req.body?.store_id as string | undefined;
  const headerStoreId = req.headers['x-store-id'] as string | undefined;
  const candidateId = queryStoreId || bodyStoreId || headerStoreId;

  if (candidateId) {
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
      return candidateId;
    }
    // Verify ownership
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM pd_store WHERE id = $1 AND owner_id = $2',
      [candidateId, req.user!.id]
    );
    if (rows[0]) {
      return rows[0].id;
    }
  }

  // Find first store owned by user
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM pd_store WHERE owner_id = $1 LIMIT 1',
    [req.user!.id]
  );
  if (rows[0]) {
    return rows[0].id;
  }

  throw new PdValidationError('Aucun magasin associé à ce compte vendeur.');
}

/**
 * POST /api/pd/seller/subscribers/broadcast
 * Send a private broadcast coupon/message to store subscribers (max 2/calendar week)
 */
sellerRouter.post(
  '/subscribers/broadcast',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const { title, message, coupon_code, discount_value, discount_pct, discount_type, expires_at } = req.body;

    const result = await sellerBroadcastService.sendBroadcast(storeId, {
      title,
      message,
      coupon_code,
      discount_value,
      discount_pct,
      discount_type,
      expires_at,
    });

    res.status(200).json(result);
  })
);

/**
 * GET /api/pd/seller/subscribers/analytics
 * Get subscriber growth KPIs, 24 Tunisian governorates distribution, and trust score
 */
sellerRouter.get(
  '/subscribers/analytics',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const analytics = await sellerBroadcastService.getSubscriberAnalytics(storeId);
    res.status(200).json(analytics);
  })
);

/**
 * GET /api/pd/seller/subscribers/broadcasts
 * Get broadcast history for the seller
 */
sellerRouter.get(
  '/subscribers/broadcasts',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const history = await sellerBroadcastService.getBroadcastHistory(storeId, limit, offset);
    res.status(200).json({ broadcasts: history });
  })
);

/**
 * GET /api/pd/seller/subscribers/history
 * Alias for broadcast history
 */
sellerRouter.get(
  '/subscribers/history',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const history = await sellerBroadcastService.getBroadcastHistory(storeId, limit, offset);
    res.status(200).json({ broadcasts: history });
  })
);

/**
 * GET /api/pd/seller/subscribers
 * Get paginated list of followers with search and verified filter
 */
sellerRouter.get(
  '/subscribers',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search ? String(req.query.search) : undefined;
    const verifiedOnly = req.query.verified_only === 'true' || req.query.verified === 'true';

    const result = await sellerBroadcastService.getSubscribersList(storeId, {
      page,
      limit,
      search,
      verifiedOnly,
    });
    res.status(200).json(result);
  })
);

/**
 * GET /api/pd/seller/subscribers/export
 * Export subscriber audience to CSV
 */
sellerRouter.get(
  '/subscribers/export',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const csvContent = await sellerBroadcastService.exportSubscribersCsv(storeId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers_${storeId}_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  })
);

/**
 * GET /api/pd/seller/orders
 * List paginated orders for the authenticated seller's store.
 */
sellerRouter.get(
  '/orders',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as any;
    const dateFrom = req.query.date_from as string | undefined;
    const dateTo = req.query.date_to as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await orderService.listByStore(storeId, {
      page,
      limit,
      status,
      dateFrom,
      dateTo,
      search,
    });

    res.status(200).json(result);
  })
);

/**
 * GET /api/pd/seller/orders/:id
 * Retrieve full order details including shipping address and items for the seller.
 */
sellerRouter.get(
  '/orders/:id',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const order = await orderService.getStoreOrderDetail(req.params.id, storeId);
    res.status(200).json(order);
  })
);

/**
 * PATCH /api/pd/seller/orders/:id/fulfill
 * Mark seller order fulfillment as shipped with tracking and carrier information.
 */
sellerRouter.patch(
  '/orders/:id/fulfill',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const { tracking_number, carrier_name } = req.body;

    await orderService.fulfill({
      order_id: req.params.id,
      store_id: storeId,
      tracking_number: tracking_number || undefined,
      carrier: carrier_name || undefined,
    });

    res.status(200).json({
      success: true,
      order_id: req.params.id,
      store_id: storeId,
      status: 'fulfilled',
      tracking_number: tracking_number || null,
      carrier_name: carrier_name || null,
    });
  })
);

/**
 * GET /api/pd/seller/orders/:id/invoice.pdf
 * Download Tunisian sales invoice PDF
 */
sellerRouter.get(
  '/orders/:id/invoice.pdf',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const pdfBuffer = await pdfInvoiceService.generateInvoicePdf(req.params.id, storeId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${req.params.id}.pdf"`);
    res.status(200).send(pdfBuffer);
  })
);

/**
 * GET /api/pd/seller/orders/:id/packing-slip.pdf
 * Download Tunisian delivery slip / packing slip PDF
 */
sellerRouter.get(
  '/orders/:id/packing-slip.pdf',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = await resolveSellerStoreId(req);
    const pdfBuffer = await pdfInvoiceService.generatePackingSlipPdf(req.params.id, storeId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bon-livraison-${req.params.id}.pdf"`);
    res.status(200).send(pdfBuffer);
  })
);


