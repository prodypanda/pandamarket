import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/order.service';
import { asyncHandler, validate, requireAuth, requireStore, requireStorefrontCustomer } from '../middlewares';
import { OrderStatus, PaymentGateway } from '@pandamarket/types';

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
});

const fulfillSchema = z.object({
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
});

const storeOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
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
    const { page, limit, status, search } = req.query as unknown as {
      page: number;
      limit: number;
      status?: OrderStatus;
      search?: string;
    };
    const result = await orderService.listByStore(req.user!.store_id!, { page, limit, status, search });
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
