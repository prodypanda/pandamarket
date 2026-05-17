/**
 * Shipping API routes.
 *
 * POST /api/pd/shipping/rates       — Calculate shipping rates
 * POST /api/pd/shipping/shipments   — Create a shipment (generate AWB)
 * GET  /api/pd/shipping/track/:trackingNumber — Track a shipment
 * POST /api/pd/shipping/pickup      — Request a pickup
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  asyncHandler,
  requireAuth,
  requireVendor,
  requireStore,
  validate,
} from '../middlewares';
import { shippingService } from '../services/shipping.service';

const router = Router();

// =====================================================
// Schemas
// =====================================================

const addressSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {
    address_line_1: input.address_line_1 ?? input.line1,
    address_line_2: input.address_line_2 ?? input.line2,
    city: input.city,
    state: input.state,
    postal_code: input.postal_code,
    country: input.country ?? 'TN',
  };
}, z.object({
  address_line_1: z.string().min(1),
  address_line_2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default('TN'),
}));

const calculateRatesSchema = z.object({
  origin_city: z.string().min(1),
  origin_country: z.string().default('TN'),
  destination: addressSchema,
  weight_kg: z.number().positive().max(100),
  dimensions: z
    .object({
      length_cm: z.number().positive(),
      width_cm: z.number().positive(),
      height_cm: z.number().positive(),
    })
    .optional(),
  provider: z.enum(['aramex', 'laposte', 'platform', 'auto']).default('auto'),
});

const createShipmentSchema = z.object({
  order_id: z.string().min(1),
  fulfillment_id: z.string().min(1),
  sender: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    address: addressSchema,
  }),
  recipient: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional(),
    address: addressSchema,
  }),
  parcels: z
    .array(
      z.object({
        weight_kg: z.number().positive(),
        description: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .min(1),
  provider: z.enum(['aramex', 'laposte']).optional(),
  cod_amount: z.number().nonnegative().optional(),
});

const pickupSchema = z.object({
  shipment_ids: z.array(z.string()).min(1),
  pickup_date: z.string().min(1),
  pickup_address: addressSchema,
  contact_name: z.string().min(1),
  contact_phone: z.string().min(1),
});

// =====================================================
// Routes
// =====================================================

/**
 * POST /shipping/rates — Calculate shipping rates
 */
router.post(
  '/rates',
  requireAuth,
  validate(calculateRatesSchema),
  asyncHandler(async (req, res) => {
    const rates = await shippingService.calculateRates(req.body);
    res.json({ data: rates });
  }),
);

/**
 * POST /shipping/shipments — Create a shipment (AWB)
 */
router.post(
  '/shipments',
  requireAuth,
  requireVendor,
  requireStore,
  validate(createShipmentSchema),
  asyncHandler(async (req, res) => {
    const result = await shippingService.createShipment({
      ...req.body,
      store_id: req.user!.store_id!,
    });
    res.status(201).json({ data: result });
  }),
);

/**
 * GET /shipping/track/:trackingNumber — Track a shipment
 */
router.get(
  '/track/:trackingNumber',
  requireAuth,
  asyncHandler(async (req, res) => {
    const info = await shippingService.track(req.params.trackingNumber);
    res.json({ data: info });
  }),
);

/**
 * POST /shipping/pickup — Request a pickup
 */
router.post(
  '/pickup',
  requireAuth,
  requireVendor,
  requireStore,
  validate(pickupSchema),
  asyncHandler(async (req, res) => {
    const result = await shippingService.requestPickup({
      ...req.body,
      store_id: req.user!.store_id!,
    });
    res.status(201).json({ data: result });
  }),
);

export default router;
