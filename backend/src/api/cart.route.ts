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
  requireStorefrontCustomer,
  validate,
} from '../middlewares';
import { cartService } from '../services/cart.service';
import { checkoutQuoteService } from '../services/checkout-quote.service';
import { paymentCapabilityService } from '../services/payment-capability.service';

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

const quoteAddressSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(30),
  address_line_1: z.string().trim().min(1).max(200),
  address_line_2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2).default('TN'),
});

const checkoutQuoteSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().trim().min(1),
    variant_id: z.string().trim().min(1).optional(),
    quantity: z.number().int().positive(),
  })).min(1).max(200),
  shipping_address: quoteAddressSchema.nullable().optional(),
  coupon_code: z.string().trim().max(64).optional(),
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
 * POST /cart/quote — Create an authoritative Hub checkout quote.
 */
router.post(
  '/quote',
  requireAuth,
  validate(checkoutQuoteSchema),
  asyncHandler(async (req, res) => {
    const quote = await checkoutQuoteService.createQuote({
      owner_user_id: req.user!.id,
      items: req.body.items,
      shipping_address: req.body.shipping_address,
      coupon_code: req.body.coupon_code,
    });
    const paymentCapabilities = await paymentCapabilityService.getForQuote(quote);
    res.status(201).json({ data: { ...quote, payment_capabilities: paymentCapabilities } });
  }),
);

/**
 * POST /cart/storefront/quote — Create a tenant-scoped checkout quote.
 */
router.post(
  '/storefront/quote',
  requireStorefrontCustomer,
  validate(checkoutQuoteSchema),
  asyncHandler(async (req, res) => {
    const quote = await checkoutQuoteService.createQuote({
      owner_storefront_customer_id: req.storefrontCustomer!.id,
      store_id: req.storefrontCustomer!.store_id,
      items: req.body.items,
      shipping_address: req.body.shipping_address,
      coupon_code: req.body.coupon_code,
    });
    const paymentCapabilities = await paymentCapabilityService.getForQuote(quote);
    res.status(201).json({ data: { ...quote, payment_capabilities: paymentCapabilities } });
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
