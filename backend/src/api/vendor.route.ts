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
import { query } from '../db/pool';
import { pdId, randomHex } from '../utils/crypto';
import { PdEvent } from '../events/event-bus';
import {
  asyncHandler,
  requireAuth,
  requireStore,
  requireApiKey,
  validate,
} from '../middlewares';
import { ApiKeyScope } from '@pandamarket/types';

const router = Router();

const webhookEvents = [
  PdEvent.ORDER_PLACED,
  PdEvent.ORDER_FULFILLED,
  PdEvent.ORDER_CANCELLED,
  PdEvent.ORDER_DELIVERED,
  PdEvent.PAYMENT_CAPTURED,
  PdEvent.PRODUCT_CREATED,
  PdEvent.PRODUCT_PUBLISHED,
  PdEvent.STOCK_LOW,
] as const;

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const webhookCreateSchema = z.object({
  url: z.string().url().max(2048).refine(isHttpsUrl, 'Webhook URL must use HTTPS'),
  events: z.array(z.enum(webhookEvents)).min(1).max(webhookEvents.length),
});

const webhookUpdateSchema = z.object({
  url: z.string().url().max(2048).refine(isHttpsUrl, 'Webhook URL must use HTTPS').optional(),
  events: z.array(z.enum(webhookEvents)).min(1).max(webhookEvents.length).optional(),
  is_active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required');

const webhookDeliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

interface WebhookSubscriptionRow {
  id: string;
  url: string;
  events: string[] | string;
  is_active: boolean;
  consecutive_failures: number;
  last_delivery_at: Date | null;
  last_status_code: number | null;
  created_at: Date;
}

function normalizeWebhookEvents(events: string[] | string): string[] {
  if (Array.isArray(events)) return events;
  try {
    const parsed = JSON.parse(events);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeWebhookSubscription(row: WebhookSubscriptionRow) {
  return {
    ...row,
    events: normalizeWebhookEvents(row.events),
    last_delivery_at: row.last_delivery_at ? row.last_delivery_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  };
}

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
    apiKeyService.assertScope(req.apiKey!, ApiKeyScope.ReadProducts);
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
    apiKeyService.assertScope(req.apiKey!, ApiKeyScope.WriteProducts);
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
    apiKeyService.assertScope(req.apiKey!, ApiKeyScope.ReadOrders);
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

router.get(
  '/webhooks',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<WebhookSubscriptionRow>(
      `SELECT id, url, events, is_active, consecutive_failures, last_delivery_at,
              last_status_code, created_at
       FROM pd_webhook_subscription
       WHERE store_id = $1
       ORDER BY created_at DESC`,
      [req.user!.store_id!],
    );
    res.status(200).json({ data: rows.map(serializeWebhookSubscription) });
  }),
);

router.post(
  '/webhooks',
  requireAuth,
  requireStore,
  validate(webhookCreateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = pdId('webhook');
    const secret = randomHex(32);
    const { rows } = await query<WebhookSubscriptionRow>(
      `INSERT INTO pd_webhook_subscription
        (id, store_id, url, secret, events, is_active)
       VALUES ($1, $2, $3, $4, $5::jsonb, true)
       RETURNING id, url, events, is_active, consecutive_failures, last_delivery_at,
                 last_status_code, created_at`,
      [id, req.user!.store_id!, req.body.url, secret, JSON.stringify(req.body.events)],
    );

    res.status(201).json({
      webhook: serializeWebhookSubscription(rows[0]),
      secret,
    });
  }),
);

router.put(
  '/webhooks/:id',
  requireAuth,
  requireStore,
  validate(webhookUpdateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const updates: string[] = [];
    const params: unknown[] = [req.params.id, req.user!.store_id!];

    if (req.body.url !== undefined) {
      params.push(req.body.url);
      updates.push(`url = $${params.length}`);
    }
    if (req.body.events !== undefined) {
      params.push(JSON.stringify(req.body.events));
      updates.push(`events = $${params.length}::jsonb`);
    }
    if (req.body.is_active !== undefined) {
      params.push(req.body.is_active);
      updates.push(`is_active = $${params.length}`);
    }

    const { rows } = await query<WebhookSubscriptionRow>(
      `UPDATE pd_webhook_subscription
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND store_id = $2
       RETURNING id, url, events, is_active, consecutive_failures, last_delivery_at,
                 last_status_code, created_at`,
      params,
    );

    if (!rows[0]) {
      res.status(404).json({ error: { message: 'Webhook not found' } });
      return;
    }

    res.status(200).json({ webhook: serializeWebhookSubscription(rows[0]) });
  }),
);

router.delete(
  '/webhooks/:id',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const { rowCount } = await query(
      'DELETE FROM pd_webhook_subscription WHERE id = $1 AND store_id = $2',
      [req.params.id, req.user!.store_id!],
    );

    if (!rowCount) {
      res.status(404).json({ error: { message: 'Webhook not found' } });
      return;
    }

    res.status(200).json({ success: true });
  }),
);

router.get(
  '/webhooks/:id/deliveries',
  requireAuth,
  requireStore,
  validate(webhookDeliveriesQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { rows } = await query<{
      id: string;
      event_type: string;
      status_code: number | null;
      error: string | null;
      attempt: number;
      delivered_at: Date | null;
      created_at: Date;
    }>(
      `SELECT d.id, d.event_type, d.status_code, d.error, d.attempt,
              d.delivered_at, d.created_at
       FROM pd_webhook_delivery d
       JOIN pd_webhook_subscription s ON s.id = d.subscription_id
       WHERE d.subscription_id = $1 AND s.store_id = $2
       ORDER BY d.created_at DESC
       LIMIT $3`,
      [req.params.id, req.user!.store_id!, req.query.limit],
    );

    res.status(200).json({
      data: rows.map((row) => ({
        ...row,
        delivered_at: (row.delivered_at ?? row.created_at).toISOString(),
        created_at: row.created_at.toISOString(),
      })),
    });
  }),
);

export default router;
