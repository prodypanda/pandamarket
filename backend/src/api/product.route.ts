import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service';
import { storeService } from '../services/store.service';
import { categoryService } from '../services/category.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { ProductType, ProductStatus } from '@pandamarket/types';

const router = Router();

const createProductSchema = z.object({
  type: z.nativeEnum(ProductType),
  title: z.string().min(2),
  slug: z.string().max(100).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  product_reference: z.string().max(100).nullable().optional(),
  marketplace_category_id: z.string().nullable().optional(),
  storefront_category_id: z.string().nullable().optional(),
  price: z.number().min(0),
  inventory_quantity: z.number().min(0).optional(),
  weight_grams: z.number().min(0).optional(),
  thumbnail: z.string().url().nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(300).nullable().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.array(z.object({
    name: z.string().min(1).max(80),
    value: z.string().min(1).max(300),
  })).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  status: z.nativeEnum(ProductStatus).optional(),
});

const addProductImageSchema = z.object({
  url: z.string().url(),
  alt_text: z.string().max(200).optional(),
  is_thumbnail: z.boolean().optional(),
});

// Vendor: create product
router.post(
  '/',
  requireStore,
  validate(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Note: store_plan and store_is_verified should be fetched from store details in a real app
    // For this implementation, we assume defaults or fetch it here.
    const store = await storeService.getById(req.user!.store_id!);
    const categories = await categoryService.resolveProductCategories(
      req.user!.store_id!,
      req.body.marketplace_category_id,
      req.body.storefront_category_id,
    );
    const product = await productService.create({
      store_id: req.user!.store_id!,
      store_plan: store.subscription_plan,
      store_is_verified: store.is_verified,
      ...req.body,
      marketplace_category_id: categories.marketplace.id,
      storefront_category_id: categories.storefront.id,
      category: categories.marketplace.name,
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
    const marketplaceCategoryId = req.query.marketplace_category_id as string;
    const storeId = req.query.store_id as string;
    const result = await productService.listPublished({ page, limit, category, marketplaceCategoryId, storeId });
    res.status(200).json(result);
  }),
);

router.get(
  '/by-store/:storeId/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getPublishedByStoreSlug(req.params.storeId, req.params.slug);
    res.status(200).json({ product });
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

// Vendor: export products as CSV
router.get(
  '/export',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.listByStore(req.user!.store_id!, { limit: 1000 });
    const products = result.data;

    const csvHeader =
      'id,title,description,category,price,inventory_quantity,weight_grams,status,tags\n';
    const csvRows = products
      .map((p) =>
        [
          p.id,
          `"${(p.title || '').replace(/"/g, '""')}"`,
          `"${(p.description || '').replace(/"/g, '""')}"`,
          `"${(p.category || '').replace(/"/g, '""')}"`,
          p.price,
          p.inventory_quantity,
          p.weight_grams ?? '',
          p.status,
          `"${(p.tags || []).join(',')}"`,
        ].join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="products-${Date.now()}.csv"`,
    );
    res.send(csvHeader + csvRows);
  }),
);

// Vendor: import products from JSON (parsed from CSV on frontend)
router.post(
  '/import',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const importSchema = z.object({
      products: z
        .array(
          z.object({
            title: z.string().min(2),
  slug: z.string().max(100).optional(),
            description: z.string().optional(),
            category: z.string().optional(),
            marketplace_category_id: z.string().nullable().optional(),
            storefront_category_id: z.string().nullable().optional(),
            price: z.number().min(0),
            type: z.nativeEnum(ProductType).optional(),
            inventory_quantity: z.number().min(0).optional(),
            weight_grams: z.number().min(0).optional(),
            tags: z.array(z.string()).optional(),
          }),
        )
        .min(1)
        .max(500),
    });

    const parsed = importSchema.parse(req.body);
    const results = { created: 0, errors: [] as string[] };

    for (const item of parsed.products) {
      try {
        const store = await storeService.getById(req.user!.store_id!);
        const categories = await categoryService.resolveProductCategories(
          req.user!.store_id!,
          item.marketplace_category_id,
          item.storefront_category_id,
        );
        await productService.create({
          store_id: req.user!.store_id!,
          store_plan: store.subscription_plan,
          store_is_verified: store.is_verified,
          type: item.type ?? ProductType.Physical,
          title: item.title,
          description: item.description,
          category: categories.marketplace.name,
          marketplace_category_id: categories.marketplace.id,
          storefront_category_id: categories.storefront.id,
          price: item.price,
          inventory_quantity: item.inventory_quantity,
          weight_grams: item.weight_grams,
          tags: item.tags,
        });
        results.created++;
      } catch (err: any) {
        results.errors.push(`${item.title}: ${err.message}`);
      }
    }

    res.status(200).json({ success: true, ...results });
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
    const store = await storeService.getById(req.user!.store_id!);
    const patch = { ...req.body };
    if ('marketplace_category_id' in patch || 'storefront_category_id' in patch) {
      const categories = await categoryService.resolveProductCategories(
        req.user!.store_id!,
        patch.marketplace_category_id,
        patch.storefront_category_id,
      );
      patch.marketplace_category_id = categories.marketplace.id;
      patch.storefront_category_id = categories.storefront.id;
      patch.category = categories.marketplace.name;
    }
    if (patch.status === ProductStatus.Published && !store.is_verified) {
      patch.status = ProductStatus.PendingApproval;
    }
    const product = await productService.update(req.params.id, patch);
    res.status(200).json({ product });
  }),
);

router.post(
  '/:id/images',
  requireStore,
  validate(addProductImageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    const store = await storeService.getById(req.user!.store_id!);
    const image = await productService.addImage(req.params.id, store.subscription_plan, req.body);
    res.status(201).json({ image });
  }),
);

router.delete(
  '/:id/images/:imageId',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    await productService.assertOwnership(req.params.id, req.user!.store_id!);
    await productService.deleteImage(req.params.id, req.params.imageId);
    res.status(200).json({ success: true });
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

// Customer: download digital product
router.get(
  '/:id/download',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: { code: 'PD_AUTH_TOKEN_INVALID', message: 'Authentication required' } });
    }

    const product = await productService.getById(req.params.id);

    if (product.type !== 'digital') {
      return res.status(400).json({ error: { code: 'PD_PRODUCT_INVALID_TYPE', message: 'This product is not a digital product' } });
    }

    // Verify the customer has purchased this product
    const { query: dbQuery } = await import('../db/pool');
    const { rows: orderRows } = await dbQuery<{ id: string }>(
      `SELECT oi.id FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.customer_id = $2 AND o.payment_status = 'captured'
       LIMIT 1`,
      [req.params.id, req.user.id],
    );

    if (!orderRows[0]) {
      return res.status(403).json({ error: { code: 'PD_PERM_FORBIDDEN', message: 'You have not purchased this product' } });
    }

    // Check download limits
    const maxDownloads = product.max_downloads ?? 5;
    const downloadCount = product.download_count ?? 0;
    if (downloadCount >= maxDownloads) {
      return res.status(403).json({ error: { code: 'PD_PRODUCT_QUOTA_EXCEEDED', message: 'Download limit reached' } });
    }

    // Check for license key
    const { rows: licenseRows } = await dbQuery<{ license_key: string }>(
      `SELECT license_key FROM pd_license_key
       WHERE product_id = $1 AND order_id = (
         SELECT o.id FROM pd_order o
         JOIN pd_order_item oi ON oi.order_id = o.id
         WHERE oi.product_id = $1 AND o.customer_id = $2 AND o.payment_status = 'captured'
         LIMIT 1
       )
       LIMIT 1`,
      [req.params.id, req.user.id],
    );

    // Generate presigned download URL
    const { presignDownload } = await import('../utils/s3');
    const downloadUrl = await presignDownload({
      bucket: 'pd-private-files',
      key: `digital/${req.params.id}/${product.slug || 'download'}`,
      expiresInSeconds: (product.download_expires_hours ?? 72) * 3600,
    });

    // Increment download count
    await dbQuery(
      'UPDATE pd_product SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1',
      [req.params.id],
    );

    return res.json({
      data: {
        download_url: downloadUrl,
        license_key: licenseRows[0]?.license_key ?? null,
        downloads_remaining: maxDownloads - downloadCount - 1,
        expires_in_hours: product.download_expires_hours ?? 72,
      },
    });
  }),
);

export default router;

