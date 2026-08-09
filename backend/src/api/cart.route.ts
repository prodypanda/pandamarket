/**
 * Cart API routes — Server-side Cart Sync, Multi-Vendor Combined Shipping & Gamified Retention.
 *
 * GET  /api/pd/cart               — Retrieve current server-persisted cart
 * POST /api/pd/cart/sync          — Synchronize client cart, calculate combined shipping & coupons
 * POST /api/pd/cart/gamified-spin — Submit Spin-the-Wheel / Scratch lead with PDP consent & prize coupon
 * GET  /api/pd/cart/gamified-leads — List captured leads (Vendor/Admin)
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  asyncHandler,
  optionalAuth,
  requireAuth,
  validate,
} from '../middlewares';
import { cartService } from '../services/cart.service';

const router = Router();

// =====================================================
// Schemas
// =====================================================

const cartItemSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  variant_id: z.string().optional(),
  store_id: z.string(),
  store_name: z.string().default('Boutique'),
  store_subdomain: z.string().optional(),
  title: z.string(),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  image_url: z.string().optional(),
  category: z.string().optional(),
  marketplace_category_slug: z.string().optional(),
  slug: z.string().optional(),
  unit_price: z.number().optional(),
  wholesale_pricing: z
    .object({
      min_quantity: z.number(),
      price_tiers: z.array(z.object({ min_quantity: z.number(), unit_price: z.number() })),
    })
    .optional(),
});

const syncCartSchema = z.object({
  session_token: z.string().optional(),
  items: z.array(cartItemSchema).default([]),
  coupon_code: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
});

const gamifiedLeadSchema = z.object({
  store_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  consent_given: z.boolean().default(true),
  game_type: z.enum(['spin_wheel', 'scratch_card']),
  prize_won: z.string(),
  coupon_code: z.string(),
  discount_value: z.number().nonnegative().default(0),
  device_fingerprint: z.string().optional(),
});

// =====================================================
// Routes
// =====================================================

/**
 * GET /cart — Retrieve current server-persisted cart
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const sessionToken = (req.query.session_token as string) || req.cookies?.pd_cart_session;
    const cart = await cartService.getCart(req.user?.id, sessionToken);
    res.json({ data: cart });
  }),
);

/**
 * POST /cart/sync — Synchronize client cart, calculate combined shipping & coupons
 */
router.post(
  '/sync',
  optionalAuth,
  validate(syncCartSchema),
  asyncHandler(async (req, res) => {
    const sessionToken = req.body.session_token || req.cookies?.pd_cart_session;
    const cart = await cartService.syncCart({
      ...req.body,
      user_id: req.user?.id || null,
      session_token: sessionToken,
    });
    res.json({ data: cart });
  }),
);

/**
 * POST /cart/gamified-spin — Submit Spin-the-Wheel / Scratch lead with PDP consent
 */
router.post(
  '/gamified-spin',
  validate(gamifiedLeadSchema),
  asyncHandler(async (req, res) => {
    const result = await cartService.recordGamifiedLead(req.body);
    res.status(201).json({ data: result });
  }),
);

/**
 * GET /cart/gamified-leads — List captured leads (Vendor/Admin)
 */
router.get(
  '/gamified-leads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const leads = await cartService.getStoreGamifiedLeads(req.user?.store_id);
    res.json({ data: leads });
  }),
);

export default router;
