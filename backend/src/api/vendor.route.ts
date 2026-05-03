/**
 * Vendor API routes — external ERP/POS integration + API key management.
 *
 * Two authentication modes:
 *   1. API-Key auth (X-PD-API-Key header) — for external systems (ERP, POS)
 *   2. JWT auth — for vendor dashboard key management
 *
 * Endpoints:
 *   GET    /api/pd/vendor/products           — List store products (API Key)
 *   PUT    /api/pd/vendor/products/:id/stock — Update product stock (API Key)
 *   GET    /api/pd/vendor/orders             — List store orders (API Key)
 *   POST   /api/pd/vendor/api-keys           — Create a new API key (JWT)
 *   GET    /api/pd/vendor/api-keys           — List API keys (JWT)
 *   DELETE /api/pd/vendor/api-keys/:id       — Revoke an API key (JWT)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiKeyService } from '../services/api-key.service';
import { productService } from '../services/product.service';
import { orderService } from '../services/order.service';
import {
  asyncHandler,
  requireAuth,
  requireStore,
  requireApiKey,
  validate,
} from '../middlewares';
import { ApiKeyScope } from '@pandamarket/types';

const router = Router();

// =====================================================
// API-Key authenticated routes (external ERP/POS)
// =====================================================

/**
 * GET /api/pd/vendor/products
 * List products for the store associated with the API key.
 */
router.get(
  '/products',
  requireApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    apiKeyService.assertScope(req.apiKey! as any, ApiKeyScope.ReadProducts);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await productService.listByStore(req.apiKey!.store_id, { page, limit });
    res.status(200).json(result);
  }),
);

/**
 * PUT /api/pd/vendor/products/:id/stock
 * Update inventory quantity for a specific product.
 */
const updateStockSchema = z.object({
  inventory_quantity: z.number().int().min(0),
});

router.put(
  '/products/:id/stock',
  requireApiKey,
  validate(updateStockSchema),
  asyncHandler(async (req: Request, res: Response) => {
    apiKeyService.assertScope(req.apiKey! as any, ApiKeyScope.WriteProducts);
    await productService.assertOwnership(req.params.id, req.apiKey!.store_id);
    const product = await productService.update(req.params.id, {
      inventory_quantity: req.body.inventory_quantity,
    });
    res.status(200).json({ product });
  }),
);

/**
 * GET /api/pd/vendor/orders
 * List orders for the store associated with the API key.
 */
router.get(
  '/orders',
  requireApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    apiKeyService.assertScope(req.apiKey! as any, ApiKeyScope.ReadOrders);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await orderService.listByStore(req.apiKey!.store_id, { page, limit });
    res.status(200).json(result);
  }),
);

// =====================================================
// JWT-authenticated routes (key management)
// =====================================================

/**
 * POST /api/pd/vendor/api-keys
 * Create a new API key for the vendor's store.
 * The full key is returned ONCE — the caller must store it securely.
 */
const createKeySchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z.array(z.nativeEnum(ApiKeyScope)).min(1),
  expires_at: z.string().datetime().optional(),
});

router.post(
  '/api-keys',
  requireAuth,
  requireStore,
  validate(createKeySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, record } = await apiKeyService.create({
      store_id: req.user!.store_id!,
      label: req.body.label,
      scopes: req.body.scopes,
      expires_at: req.body.expires_at,
    });
    res.status(201).json({ key, api_key: record });
  }),
);

/**
 * GET /api/pd/vendor/api-keys
 * List all API keys for the vendor's store (keys are masked).
 */
router.get(
  '/api-keys',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const keys = await apiKeyService.listByStore(req.user!.store_id!);
    res.status(200).json({ data: keys });
  }),
);

/**
 * DELETE /api/pd/vendor/api-keys/:id
 * Revoke (deactivate) an API key.
 */
router.delete(
  '/api-keys/:id',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await apiKeyService.revoke(req.params.id, req.user!.store_id!);
    res.status(200).json({ success: true, message: 'API key revoked' });
  }),
);

export default router;
