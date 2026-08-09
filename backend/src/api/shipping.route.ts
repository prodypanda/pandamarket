/**
 * Shipping API routes — Unified Local Tunisian Logistics Aggregator.
 *
 * GET  /api/pd/shipping/carriers       — List active Tunisian carriers & 24 governorates
 * POST /api/pd/shipping/smart-quotes   — Smart multi-carrier routing (Best Rate & Fastest)
 * POST /api/pd/shipping/rates          — Calculate shipping rates (compatibility)
 * POST /api/pd/shipping/shipments      — Create a shipment (generate unified AWB)
 * GET  /api/pd/shipping/track/:trackingNumber — Track a shipment
 * POST /api/pd/shipping/pickup         — Request courier pickup
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

const smartQuotesSchema = z.object({
  origin_city: z.string().default('Tunis'),
  destination: addressSchema,
  weight_kg: z.number().positive().max(100).default(1),
  cod_amount: z.number().nonnegative().optional(),
});

const calculateRatesSchema = z.object({
  origin_city: z.string().min(1).default('Tunis'),
  origin_country: z.string().default('TN'),
  destination: addressSchema,
  weight_kg: z.number().positive().max(100),
  cod_amount: z.number().nonnegative().optional(),
  provider: z.enum(['aramex', 'laposte_rapid', 'first_delivery', 'runex', 'fleex', 'own_fleet', 'platform', 'auto'] as any).default('auto'),
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
  provider: z.enum(['aramex', 'laposte_rapid', 'first_delivery', 'runex', 'fleex', 'own_fleet'] as any).optional(),
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
 * GET /shipping/carriers — List active Tunisian carriers & 24 governorates
 */
router.get(
  '/carriers',
  asyncHandler(async (_req, res) => {
    const data = shippingService.getCarriersAndGovernorates();
    res.json({ data });
  }),
);

/**
 * GET /shipping/smart-quotes — Calculate quotes via GET query params (stateless, safe for browser & SSR)
 */
router.get(
  '/smart-quotes',
  asyncHandler(async (req, res) => {
    const origin_city = (req.query.origin_city as string) || 'Tunis';
    const destination_city = (req.query.destination_city as string) || (req.query.city as string) || 'Tunis';
    const destination_state = (req.query.destination_state as string) || (req.query.state as string) || destination_city;
    const weight_kg = parseFloat(req.query.weight_kg as string) || 1;
    const cod_amount = parseFloat(req.query.cod_amount as string) || 0;

    const data = await shippingService.calculateSmartQuotes({
      origin_city,
      destination: {
        address_line_1: 'Adresse Client',
        city: destination_city,
        country: 'TN',
        ...({ state: destination_state } as any),
      },
      weight_kg,
      cod_amount,
    });
    res.json({ data });
  }),
);

/**
 * POST /shipping/smart-quotes — Smart multi-carrier comparison (Best Rate & Fastest)
 */
router.post(
  '/smart-quotes',
  validate(smartQuotesSchema),
  asyncHandler(async (req, res) => {
    const data = await shippingService.calculateSmartQuotes(req.body);
    res.json({ data });
  }),
);

/**
 * POST /shipping/rates — Calculate shipping rates (compatibility)
 */
router.post(
  '/rates',
  validate(calculateRatesSchema),
  asyncHandler(async (req, res) => {
    const rates = await shippingService.calculateRates(req.body);
    res.json({ data: rates });
  }),
);

/**
 * POST /shipping/shipments — Create a unified shipment (AWB)
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
 * GET /shipping/track/:trackingNumber — Track a shipment with checkpoints
 */
router.get(
  '/track/:trackingNumber',
  asyncHandler(async (req, res) => {
    const info = await shippingService.track(req.params.trackingNumber);
    res.json({ data: info });
  }),
);

/**
 * POST /shipping/pickup — Request a courier pickup
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
