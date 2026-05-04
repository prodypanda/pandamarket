import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { orderService } from '../services/order.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';
import { PaymentGateway } from '@pandamarket/types';

const router = Router();

const checkoutSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string(),
      variant_id: z.string().optional(),
      quantity: z.number().min(1),
    })
  ).min(1),
  shipping_address: z.any(), // Should be IAddress but any for simplicity here
  payment_gateway: z.nativeEnum(PaymentGateway),
});

const fulfillSchema = z.object({
  carrier: z.string().optional(),
  tracking_number: z.string().optional(),
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
    const result = await orderService.listByCustomer(req.user!.id, { page, limit });
    res.status(200).json(result);
  }),
);

// Vendor: list orders containing their products
router.get(
  '/store',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await orderService.listByStore(req.user!.store_id!, { page, limit });
    res.status(200).json(result);
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
