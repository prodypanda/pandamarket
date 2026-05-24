import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service';
import { storeService } from '../services/store.service';
import { categoryService } from '../services/category.service';
import { platformConfigService } from '../services/platform-config.service';
import { asyncHandler, validate, requireAuth, requireStore } from '../middlewares';
import { ProductType, ProductStatus, SellerType } from '@pandamarket/types';
import { pdId } from '../utils/crypto';
import { PdValidationError } from '../errors';

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
  status: z.nativeEnum(ProductStatus).optional(),
  attributes: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        value: z.string().min(1).max(300),
      }),
    )
    .optional(),
  max_downloads: z.number().int().min(1).max(100).nullable().optional(),
  download_expires_hours: z.number().int().min(1).max(8760).nullable().optional(),
  digital_file_key: z.string().max(1024).nullable().optional(),
  digital_file_name: z.string().max(255).nullable().optional(),
  digital_file_content_type: z.string().max(100).nullable().optional(),
  digital_file_size: z.number().int().min(0).nullable().optional(),
  license_keys: z.array(z.string().min(1).max(2000)).max(1000).optional(),
  wholesale_min_quantity: z.number().int().min(2).nullable().optional(),
  wholesale_price_tiers: z
    .array(
      z.object({
        min_quantity: z.number().int().min(2),
        unit_price: z.number().min(0),
      }),
    )
    .max(20)
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string().max(64).optional(),
        sku: z.string().max(100).nullable().optional(),
        title: z.string().min(1).max(200),
        price: z.number().min(0),
        inventory_quantity: z.number().int().min(0).optional(),
        options: z.record(z.string()).optional(),
      }),
    )
    .max(100)
    .optional(),
});

const updateProductSchema = createProductSchema.partial();

const addProductImageSchema = z.object({
  url: z.string().url(),
  alt_text: z.string().max(200).optional(),
  is_thumbnail: z.boolean().optional(),
});

function assertDigitalFileOwnership(
  payload: { digital_file_key?: string | null },
  storeId: string,
) {
  if (payload.digital_file_key && !payload.digital_file_key.startsWith(`digital/${storeId}/`)) {
    throw new PdValidationError('Digital file does not belong to this store');
  }
}

// Vendor: create product
router.post(
  '/',
  requireStore,
  validate(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Note: store_plan and store_is_verified should be fetched from store details in a real app
    // For this implementation, we assume defaults or fetch it here.
    const store = await storeService.getById(req.user!.store_id!);
    assertDigitalFileOwnership(req.body, req.user!.store_id!);
    const categories = await categoryService.resolveProductCategories(
      req.user!.store_id!,
      req.body.marketplace_category_id,
      req.body.storefront_category_id,
    );
    const product = await productService.create({
      store_id: req.user!.store_id!,
      store_plan: store.subscription_plan,
      store_is_verified: store.is_verified,
      store_seller_type: store.seller_type,
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
    const sellerType = Object.values(SellerType).includes(req.query.seller_type as SellerType)
      ? (req.query.seller_type as SellerType)
      : undefined;
    const settings = await platformConfigService.getSettings();
    const sortBy =
      (req.query.sort as string | undefined) || String(settings.catalog_default_sort || 'newest');
    const result = await productService.listPublished({
      page,
      limit,
      category,
      marketplaceCategoryId,
      storeId,
      sellerType,
      sortBy,
    });
    res.status(200).json(result);
  }),
);

router.get(
  '/by-store/:storeId/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getPublishedByStoreSlug(
      req.params.storeId,
      req.params.slug,
    );
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
    res.setHeader('Content-Disposition', `attachment; filename="products-${Date.now()}.csv"`);
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

    // Performance optimization: Fetch store data once before the loop to prevent N+1 queries.
    // Fetching this inside the loop (up to 500 times) caused severe performance degradation and high DB load.
    const store = await storeService.getById(req.user!.store_id!);

    for (const item of parsed.products) {
      try {
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
      } catch (err: unknown) {
        results.errors.push(
          `${item.title}: ${err instanceof Error ? err.message : 'Import failed'}`,
        );
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
    patch.store_seller_type = store.seller_type;
    assertDigitalFileOwnership(patch, req.user!.store_id!);
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
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getById(req.params.id);
    const customerId = req.user!.id;

    if (product.type !== ProductType.Digital && product.type !== ProductType.Serial) {
      return res
        .status(400)
        .json({
          error: { code: 'PD_PRODUCT_INVALID_TYPE', message: 'This product is not downloadable' },
        });
    }

    if (!product.digital_file_key) {
      return res
        .status(404)
        .json({
          error: {
            code: 'PD_FILE_NOT_FOUND',
            message: 'No digital file is attached to this product',
          },
        });
    }

    const { query: dbQuery } = await import('../db/pool');
    const { rows: orderRows } = await dbQuery<{ id: string; created_at: Date }>(
      `SELECT o.id, o.created_at FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
       WHERE oi.product_id = $1 AND o.customer_id = $2 AND o.payment_status = 'captured'
       ORDER BY o.created_at DESC
       LIMIT 1`,
      [req.params.id, customerId],
    );
    const order = orderRows[0];

    if (!order) {
      return res
        .status(403)
        .json({
          error: { code: 'PD_PERM_FORBIDDEN', message: 'You have not purchased this product' },
        });
    }

    const maxDownloads = product.max_downloads ?? 5;
    await dbQuery(
      `INSERT INTO pd_digital_download (id, order_id, product_id, customer_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id, product_id, customer_id) DO NOTHING`,
      [pdId('dl'), order.id, req.params.id, customerId],
    );
    const { rows: quotaRows } = await dbQuery<{ download_count: number }>(
      `UPDATE pd_digital_download
       SET download_count = download_count + 1,
           first_downloaded_at = COALESCE(first_downloaded_at, NOW()),
           last_downloaded_at = NOW()
       WHERE order_id = $1 AND product_id = $2 AND customer_id = $3 AND download_count < $4
       RETURNING download_count`,
      [order.id, req.params.id, customerId, maxDownloads],
    );
    const downloadCount = quotaRows[0]?.download_count;
    if (!downloadCount) {
      return res
        .status(403)
        .json({ error: { code: 'PD_PRODUCT_QUOTA_EXCEEDED', message: 'Download limit reached' } });
    }

    // Check for license key
    const { rows: licenseRows } = await dbQuery<{ license_key: string }>(
      `SELECT license_key FROM pd_license_key
       WHERE product_id = $1 AND order_id = $2
       ORDER BY assigned_at ASC, created_at ASC`,
      [req.params.id, order.id],
    );
    const licenseKeys = licenseRows.map((row) => row.license_key);

    const { presignDownload } = await import('../utils/s3');
    const { config } = await import('../config');
    const downloadUrl = await presignDownload({
      bucket: config.s3.bucketPrivate,
      key: product.digital_file_key,
      expiresInSeconds: (product.download_expires_hours ?? 72) * 3600,
    });

    await dbQuery(
      'UPDATE pd_product SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1',
      [req.params.id],
    );

    return res.json({
      data: {
        download_url: downloadUrl,
        license_key: licenseKeys[0] ?? null,
        license_keys: licenseKeys,
        downloads_remaining: maxDownloads - downloadCount,
        expires_in_hours: product.download_expires_hours ?? 72,
      },
    });
  }),
);

export default router;
