import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { ProductType, ProductStatus } from '@pandamarket/types';

const router = Router();

const createProductSchema = z.object({
  type: z.nativeEnum(ProductType),
  title: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0),
  inventory_quantity: z.number().min(0).optional(),
  weight_grams: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
});

// Vendor: create product
router.post(
  '/',
  requireStore,
  validate(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Note: store_plan and store_is_verified should be fetched from store details in a real app
    // For this implementation, we assume defaults or fetch it here.
    const product = await productService.create({
      store_id: req.user!.store_id!,
      store_plan: 'free' as any, // Mock
      store_is_verified: true, // Mock
      ...req.body,
    });
    res.status(201).json({ product });
  }),
);

// Public: list all published products
router.get(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const category = req.query.category as string;
    const result = await productService.listPublished({ page, limit, category });
    res.status(200).json(result);
  }),
);

// Vendor: list own products
router.get(
  '/me',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as ProductStatus;
    const result = await productService.listByStore(req.user!.store_id!, { page, limit, status });
    res.status(200).json(result);
  }),
);

// Vendor/Public: get single product
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getById(req.params.id);
    res.status(200).json({ product });
  }),
);

// Vendor: update product
router.put(
  '/:id',
  requireStore,
  validate(updateProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    const product = await productService.update(req.params.id, req.body);
    res.status(200).json({ product });
  }),
);

// Vendor: delete product
router.delete(
  '/:id',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    await productService.delete(req.params.id);
    res.status(200).json({ success: true });
  }),
);

export default router;
