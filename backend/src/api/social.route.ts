/**
 * Social Media Accounts & Auto-Publishing API Routes
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { asyncHandler, requireAuth, requireStore, validate } from '../middlewares';
import { pdId } from '../utils/crypto';
import { PdNotFoundError, PdValidationError } from '../errors';
import { aiCopywriterService } from '../services/ai-copywriter.service';

const router = express.Router();

const connectAccountSchema = z.object({
  account_name: z.string().min(1).max(255),
  account_id: z.string().min(1).max(255),
  access_token: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const createPostSchema = z.object({
  product_id: z.string().optional(),
  social_account_id: z.string().min(1),
  caption: z.string().min(1).max(5000),
  media_urls: z.array(z.string()).optional(),
  scheduled_at: z.string().datetime().optional(),
});

const generateCopySchema = z.object({
  product_id: z.string().min(1),
  tone: z.enum(['catchy', 'artisan', 'promo']).optional(),
});

// 1. List connected social accounts
router.get(
  '/accounts',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { rows } = await query(
      `SELECT id, store_id, platform, account_name, account_id, is_active, created_at, updated_at
       FROM pd_social_account
       WHERE store_id = $1
       ORDER BY created_at DESC`,
      [storeId],
    );
    res.status(200).json({ accounts: rows });
  }),
);

// 2. Connect / Register a social account
router.post(
  '/connect/:platform',
  requireAuth,
  requireStore,
  validate(connectAccountSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const platform = req.params.platform.toLowerCase();
    const { account_name, account_id, access_token, metadata } = req.body;

    const newId = pdId('sacc');
    const { rows } = await query(
      `INSERT INTO pd_social_account
       (id, store_id, platform, account_name, account_id, encrypted_access_token, metadata, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, store_id, platform, account_name, account_id, is_active, created_at`,
      [newId, storeId, platform, account_name, account_id, access_token, JSON.stringify(metadata || {})],
    );

    res.status(201).json({ account: rows[0] || { id: newId, platform, account_name } });
  }),
);

// 3. Disconnect / delete social account
router.delete(
  '/accounts/:id',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { id } = req.params;

    const { rowCount } = await query(
      `DELETE FROM pd_social_account WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );

    if (!rowCount) throw new PdNotFoundError(undefined, 'Social account not found');
    res.status(200).json({ success: true });
  }),
);

// 4. Generate AI marketing copy for a product
router.post(
  '/generate-copy',
  requireAuth,
  requireStore,
  validate(generateCopySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { product_id, tone } = req.body;

    const { rows } = await query<{
      id: string;
      title: string;
      price: string;
      store_name: string;
      category_name: string | null;
    }>(
      `SELECT p.id, p.title, p.price, s.name AS store_name, c.name AS category_name
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       LEFT JOIN pd_marketplace_category c ON c.id = p.marketplace_category_id
       WHERE p.id = $1 AND p.store_id = $2`,
      [product_id, storeId],
    );

    const product = rows[0];
    if (!product) throw new PdNotFoundError(undefined, 'Product not found');

    const copy = await aiCopywriterService.generateCopy({
      productTitle: product.title,
      category: product.category_name || undefined,
      priceTnd: parseFloat(product.price) || 0,
      storeName: product.store_name,
      tone: tone || 'catchy',
    });

    res.status(200).json({ copy });
  }),
);

// 5. List social post ledger
router.get(
  '/posts',
  requireAuth,
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { rows } = await query(
      `SELECT p.id, p.store_id, p.product_id, p.social_account_id, p.caption, p.media_urls,
              p.status, p.scheduled_at, p.published_at, p.external_post_id, p.error_message,
              p.created_at, a.platform, a.account_name
       FROM pd_social_post p
       JOIN pd_social_account a ON a.id = p.social_account_id
       WHERE p.store_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [storeId],
    );

    res.status(200).json({ posts: rows });
  }),
);

// 6. Create / Publish social post
router.post(
  '/posts',
  requireAuth,
  requireStore,
  validate(createPostSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const { product_id, social_account_id, caption, media_urls, scheduled_at } = req.body;

    // Verify social account belongs to this store
    const { rows: accRows } = await query(
      `SELECT id, platform FROM pd_social_account WHERE id = $1 AND store_id = $2`,
      [social_account_id, storeId],
    );
    if (accRows.length === 0) throw new PdValidationError('Social account not found or unlinked');

    const postId = pdId('spost');
    const isScheduled = Boolean(scheduled_at);
    const status = isScheduled ? 'scheduled' : 'published';
    const externalId = isScheduled ? null : `ext_${accRows[0].platform}_${Date.now()}`;

    const { rows } = await query(
      `INSERT INTO pd_social_post
       (id, store_id, product_id, social_account_id, caption, media_urls, status, scheduled_at, published_at, external_post_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
       RETURNING *`,
      [
        postId,
        storeId,
        product_id || null,
        social_account_id,
        caption,
        JSON.stringify(media_urls || []),
        status,
        scheduled_at || null,
        isScheduled ? null : new Date(),
        externalId,
      ],
    );

    res.status(201).json({ post: rows[0] });
  }),
);

export { router as socialRouter };
