import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/order.service';
import { asyncHandler, validate, requireAuth, requireStore, requireStorefrontCustomer } from '../middlewares';
import { OrderStatus, PaymentGateway, PaymentStatus } from '@pandamarket/types';

const router = Router();

const shippingAddressSchema = z.preprocess((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const fullName = typeof input.full_name === 'string' ? input.full_name.trim() : '';
  const [firstName = '', ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);
  const inferredLastName = lastNameParts.join(' ') || firstName;
  return {
    first_name: input.first_name ?? firstName,
    last_name: input.last_name ?? inferredLastName,
    phone: input.phone,
    address_line_1: input.address_line_1 ?? input.address_line,
    address_line_2: input.address_line_2,
    city: input.city,
    postal_code: input.postal_code,
    country: input.country ?? 'TN',
  };
}, z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(30),
  address_line_1: z.string().trim().min(1).max(200),
  address_line_2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().min(1).max(20),
  country: z.string().length(2).default('TN'),
}));

const checkoutSchema = z.object({
  store_id: z.string().min(1).optional(),
  items: z.array(
    z.object({
      product_id: z.string(),
      variant_id: z.string().optional(),
      quantity: z.number().min(1),
    })
  ).min(1),
  shipping_address: shippingAddressSchema.nullable().optional(),
  payment_gateway: z.nativeEnum(PaymentGateway),
  ads_attribution: z.object({
    campaign_id: z.string().min(8).max(100),
    creative_id: z.string().min(8).max(100),
    event_key: z.string().min(12).max(160),
  }).optional(),
});

const fulfillSchema = z.object({
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
});

const storeOrderNoteSchema = z.object({
  body: z.string().trim().max(5000).default(''),
});

const cancelStoreFulfillmentSchema = z.object({
  reason: z.string().trim().min(1, 'Cancellation reason is required').max(500),
});

const storeRefundSchema = z.object({
  amount: z.coerce.number().positive().max(999999),
  reason_code: z.enum(['customer_request', 'out_of_stock', 'damaged_item', 'late_delivery', 'duplicate_order', 'goodwill', 'other']),
  reason: z.string().trim().max(1000).optional(),
});

const storeShipmentSchema = z.object({
  provider: z.enum(['aramex', 'laposte']).optional(),
}).default({});

const deliveryProofSchema = z.object({
  proof_url: z.string().trim().max(2000).optional(),
  received_by: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
}).default({});

const storeOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  payment_gateway: z.nativeEnum(PaymentGateway).optional(),
  payment_status: z.nativeEnum(PaymentStatus).optional(),
  fulfillment_status: z.enum(['pending', 'shipped', 'delivered', 'cancelled']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customer: z.string().trim().max(100).optional(),
  product: z.string().trim().max(100).optional(),
  country: z.string().trim().max(2).optional(),
  channel: z.enum(['marketplace', 'storefront']).optional(),
  has_dispute: z.coerce.boolean().optional(),
  search: z.string().trim().max(100).optional(),
});

// Customer: Create order (checkout)
router.post(
  '/checkout',
  requireAuth,
  validate(checkoutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.checkout({
      customer_id: req.user!.id,
      ...req.body,
    });
    res.status(201).json({ order });
  }),
);

// Customer: list my orders
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as OrderStatus | undefined;
    const result = await orderService.listByCustomer(req.user!.id, { page, limit, status });
    res.status(200).json(result);
  }),
);

router.post(
  '/storefront/checkout',
  requireStorefrontCustomer,
  validate(checkoutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.checkout({
      storefront_customer_id: req.storefrontCustomer!.id,
      ...req.body,
    });
    res.status(201).json({ order });
  }),
);

router.get(
  '/storefront/me',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as OrderStatus | undefined;
    const result = await orderService.listByStorefrontCustomer(req.storefrontCustomer!.id, req.storefrontCustomer!.store_id, { page, limit, status });
    res.status(200).json(result);
  }),
);

router.get(
  '/storefront/:id',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getById(req.params.id);
    const isCustomer = order.storefront_customer_id === req.storefrontCustomer!.id;
    const isStoreOrder = await orderService.hasStoreItems(req.params.id, req.storefrontCustomer!.store_id);
    if (!isCustomer || !isStoreOrder) {
      res.status(404).json({ error: { message: 'Order not found' } });
      return;
    }
    res.status(200).json({ order });
  }),
);
// Vendor: list orders containing their products
router.get(
  '/store',
  requireStore,
  validate(storeOrdersQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, payment_gateway, payment_status, fulfillment_status, date_from, date_to, customer, product, country, channel, has_dispute, search } = req.query as unknown as {
      page: number;
      limit: number;
      status?: OrderStatus;
      payment_gateway?: PaymentGateway;
      payment_status?: PaymentStatus;
      fulfillment_status?: 'pending' | 'shipped' | 'delivered' | 'cancelled';
      date_from?: string;
      date_to?: string;
      customer?: string;
      product?: string;
      country?: string;
      channel?: 'marketplace' | 'storefront';
      has_dispute?: boolean;
      search?: string;
    };
    const result = await orderService.listByStore(req.user!.store_id!, {
      page,
      limit,
      status,
      paymentGateway: payment_gateway,
      paymentStatus: payment_status,
      fulfillmentStatus: fulfillment_status,
      dateFrom: date_from,
      dateTo: date_to,
      customer,
      product,
      country,
      channel,
      hasDispute: has_dispute,
      search,
    });
    res.status(200).json(result);
  }),
);

router.get(
  '/store/:id',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getStoreOrderDetail(req.params.id, req.user!.store_id!);
    res.status(200).json({ order });
  }),
);

router.put(
  '/store/:id/note',
  requireStore,
  validate(storeOrderNoteSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const note = await orderService.upsertStoreOrderNote({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      body: req.body.body,
    });
    res.status(200).json({ note });
  }),
);

router.post(
  '/store/:id/refunds',
  requireStore,
  validate(storeRefundSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const refund = await orderService.requestStoreRefund({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      requested_by: req.user!.id,
      amount: req.body.amount,
      reason_code: req.body.reason_code,
      reason: req.body.reason,
    });
    res.status(201).json({ refund });
  }),
);

router.post(
  '/store/:id/shipments',
  requireStore,
  validate(storeShipmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const shipment = await orderService.createStoreShipment({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      provider: req.body.provider,
    });
    res.status(201).json({ shipment });
  }),
);

// Get single order (tenant-isolated: customer sees own orders, vendor sees store orders)
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getById(req.params.id);
    // Tenant isolation: customer can only see their own orders,
    // vendor can only see orders containing their store's products
    const isCustomer = order.customer_id === req.user!.id;
    const isVendor = req.user!.store_id
      ? await orderService.hasStoreItems(req.params.id, req.user!.store_id)
      : false;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    if (!isCustomer && !isVendor && !isAdmin) {
      res.status(404).json({ error: { message: 'Order not found' } });
      return;
    }
    res.status(200).json({ order });
  }),
);

// Vendor: fulfill their portion of the order
router.post(
  '/:id/fulfill',
  requireStore,
  validate(fulfillSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await orderService.fulfill({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      ...req.body,
    });
    res.status(200).json({ success: true });
  }),
);

router.post(
  '/:id/deliver',
  requireStore,
  validate(deliveryProofSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await orderService.markStoreFulfillmentDelivered({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      delivered_by: req.user!.id,
      proof_url: req.body.proof_url,
      received_by: req.body.received_by,
      note: req.body.note,
    });
    res.status(200).json({ success: true });
  }),
);

router.post(
  '/:id/fulfillment/cancel',
  requireStore,
  validate(cancelStoreFulfillmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await orderService.cancelStoreFulfillment({
      order_id: req.params.id,
      store_id: req.user!.store_id!,
      reason: req.body.reason,
    });
    res.status(200).json({ success: true });
  }),
);

// Customer or Vendor: cancel an order
const cancelSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

router.put(
  '/:id/cancel',
  requireAuth,
  validate(cancelSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getById(req.params.id);
    // Only the customer who placed the order, the vendor, or an admin can cancel
    const isCustomer = order.customer_id === req.user!.id;
    const isVendor = req.user!.store_id
      ? await orderService.hasStoreItems(req.params.id, req.user!.store_id)
      : false;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
    if (!isCustomer && !isVendor && !isAdmin) {
      res.status(404).json({ error: { message: 'Order not found' } });
      return;
    }
    await orderService.cancel(req.params.id, req.body.reason);
    res.status(200).json({ success: true, message: 'Order cancelled' });
  }),
);

export default router;
