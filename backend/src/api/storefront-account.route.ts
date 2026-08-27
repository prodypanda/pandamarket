import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storefrontAuthService } from '../services/storefront-auth.service';
import { addressService } from '../services/address.service';
import { asyncHandler, requireStorefrontCustomer, validate } from '../middlewares';

const router = Router();

const updateProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(8),
});

const addressSchema = z.object({
  label: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().min(1),
  address_line_1: z.string().min(1),
  address_line_2: z.string().optional().nullable(),
  city: z.string().min(1),
  state: z.string().optional().nullable(),
  postal_code: z.string().min(1),
  country: z.string().optional(),
  is_default: z.boolean().optional(),
});

const updateAddressSchema = addressSchema.partial();

// Session probe — audit B8/A11: storefront account layout resolves the
// authenticated customer through this endpoint.
router.get(
  '/me',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storefrontAuthService.getById(
      req.storefrontCustomer!.id,
      req.storefrontCustomer!.store_id,
    );
    res.status(200).json({ customer, data: customer });
  }),
);

// Profile
router.put(
  '/profile',
  requireStorefrontCustomer,
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storefrontAuthService.updateProfile(
      req.storefrontCustomer!.id,
      req.storefrontCustomer!.store_id,
      req.body,
    );
    res.status(200).json({ customer, data: customer });
  }),
);

// Password Change
router.put(
  '/password',
  requireStorefrontCustomer,
  validate(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await storefrontAuthService.changePassword(
      req.storefrontCustomer!.id,
      req.storefrontCustomer!.store_id,
      req.body.old_password,
      req.body.new_password,
    );
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  }),
);

// Address Management
router.get(
  '/addresses',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const addresses = await addressService.listStorefront(req.storefrontCustomer!.id);
    res.status(200).json({ addresses, data: addresses });
  }),
);

router.post(
  '/addresses',
  requireStorefrontCustomer,
  validate(addressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.createStorefront(req.storefrontCustomer!.id, req.body);
    res.status(201).json({ address, data: address });
  }),
);

router.put(
  '/addresses/:id',
  requireStorefrontCustomer,
  validate(updateAddressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const address = await addressService.updateStorefront(req.storefrontCustomer!.id, req.params.id, req.body);
    res.status(200).json({ address, data: address });
  }),
);

router.delete(
  '/addresses/:id',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    await addressService.deleteStorefront(req.storefrontCustomer!.id, req.params.id);
    res.status(200).json({ success: true });
  }),
);

// =====================================================
// Digital Downloads & License Key Entitlements
// =====================================================

router.get(
  '/downloads',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const { query: dbQuery } = await import('../db/pool');
    const storefrontCustomerId = req.storefrontCustomer!.id;
    const storeId = req.storefrontCustomer!.store_id;

    // Return digital/serial entitlements for paid orders belonging to this storefront customer and store
    const { rows: entitlements } = await dbQuery<{
      order_id: string;
      product_id: string;
      product_title: string;
      product_type: string;
      digital_file_key: string | null;
      digital_file_name: string | null;
      max_downloads: number | null;
      download_expires_hours: number | null;
      download_count: number;
      license_keys: string | null;
      order_created_at: Date;
    }>(
      `SELECT
         oi.order_id,
         oi.product_id,
         p.title AS product_title,
         p.type AS product_type,
         p.digital_file_key,
         p.digital_file_name,
         p.max_downloads,
         p.download_expires_hours,
         COALESCE(dd.download_count, 0)::int AS download_count,
         (SELECT string_agg(lk.license_key, '||')
          FROM pd_license_key lk
          WHERE lk.product_id = oi.product_id AND lk.order_id = oi.order_id
         ) AS license_keys,
         o.created_at AS order_created_at
       FROM pd_order_item oi
       JOIN pd_order o ON o.id = oi.order_id
       JOIN pd_product p ON p.id = oi.product_id
       LEFT JOIN pd_digital_download dd
         ON dd.order_id = oi.order_id AND dd.product_id = oi.product_id AND dd.storefront_customer_id = $1
       WHERE o.storefront_customer_id = $1
         AND oi.store_id = $2
         AND o.payment_status IN ('captured', 'paid')
         AND p.type IN ('digital', 'serial')
       ORDER BY o.created_at DESC`,
      [storefrontCustomerId, storeId],
    );

    const data = entitlements.map((e) => ({
      order_id: e.order_id,
      product_id: e.product_id,
      product_title: e.product_title,
      product_type: e.product_type,
      has_file: !!e.digital_file_key,
      file_name: e.digital_file_name,
      max_downloads: e.max_downloads ?? 5,
      download_count: e.download_count,
      downloads_remaining: Math.max(0, (e.max_downloads ?? 5) - e.download_count),
      license_keys: e.license_keys ? e.license_keys.split('||') : [],
      expires_hours: e.download_expires_hours ?? 72,
      order_date: e.order_created_at,
    }));

    res.status(200).json({ entitlements: data, data });
  }),
);

router.post(
  '/downloads/:productId/:orderId',
  requireStorefrontCustomer,
  asyncHandler(async (req: Request, res: Response) => {
    const { query: dbQuery } = await import('../db/pool');
    const { presignDownload } = await import('../utils/s3');
    const { config } = await import('../config');
    const { pdId } = await import('../utils/crypto');

    const storefrontCustomerId = req.storefrontCustomer!.id;
    const storeId = req.storefrontCustomer!.store_id;
    const { productId, orderId } = req.params;

    // 1. Verify order belongs to this storefront customer + store + paid
    const { rows: orderRows } = await dbQuery<{ id: string }>(
      `SELECT o.id FROM pd_order o
       JOIN pd_order_item oi ON oi.order_id = o.id
       WHERE o.id = $1
         AND o.storefront_customer_id = $2
         AND oi.product_id = $3
         AND oi.store_id = $4
         AND o.payment_status IN ('captured', 'paid')
       LIMIT 1`,
      [orderId, storefrontCustomerId, productId, storeId],
    );
    if (!orderRows[0]) {
      return res.status(403).json({
        error: { code: 'PD_PERM_FORBIDDEN', message: 'You have not purchased this product or payment is not confirmed' },
      });
    }

    // 2. Get product info
    const { rows: productRows } = await dbQuery<{
      id: string;
      type: string;
      digital_file_key: string | null;
      digital_file_name: string | null;
      max_downloads: number | null;
      download_expires_hours: number | null;
      store_id: string;
    }>(
      `SELECT id, type, digital_file_key, digital_file_name, max_downloads, download_expires_hours, store_id
       FROM pd_product WHERE id = $1`,
      [productId],
    );
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ error: { code: 'PD_NOT_FOUND', message: 'Product not found' } });
    }
    if (product.store_id !== storeId) {
      return res.status(403).json({ error: { code: 'PD_PERM_FORBIDDEN', message: 'Cross-store download not allowed' } });
    }
    if (!product.digital_file_key) {
      return res.status(404).json({ error: { code: 'PD_FILE_NOT_FOUND', message: 'No digital file is attached' } });
    }

    // 3. Upsert download record and enforce quota
    const maxDownloads = product.max_downloads ?? 5;
    await dbQuery(
      `INSERT INTO pd_digital_download (id, order_id, product_id, storefront_customer_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [pdId('dl'), orderId, productId, storefrontCustomerId],
    );
    const { rows: quotaRows } = await dbQuery<{ download_count: number; id: string }>(
      `UPDATE pd_digital_download
       SET download_count = download_count + 1,
           first_downloaded_at = COALESCE(first_downloaded_at, NOW()),
           last_downloaded_at = NOW()
       WHERE order_id = $1 AND product_id = $2 AND storefront_customer_id = $3 AND download_count < $4
       RETURNING download_count, id`,
      [orderId, productId, storefrontCustomerId, maxDownloads],
    );
    const downloadRow = quotaRows[0];
    if (!downloadRow) {
      return res.status(403).json({ error: { code: 'PD_PRODUCT_QUOTA_EXCEEDED', message: 'Download limit reached' } });
    }

    // 4. Generate signed URL
    const downloadUrl = await presignDownload({
      bucket: config.s3.bucketPrivate,
      key: product.digital_file_key,
      expiresInSeconds: (product.download_expires_hours ?? 72) * 3600,
    });

    // 5. Audit log
    await dbQuery(
      `INSERT INTO pd_download_audit_log
        (id, download_id, product_id, order_id, storefront_customer_id, store_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        pdId('dllog'),
        downloadRow.id,
        productId,
        orderId,
        storefrontCustomerId,
        storeId,
        req.ip ?? null,
        req.headers['user-agent'] ?? null,
      ],
    );

    // 6. Get license keys
    const { rows: licenseRows } = await dbQuery<{ license_key: string }>(
      `SELECT license_key FROM pd_license_key
       WHERE product_id = $1 AND order_id = $2
       ORDER BY assigned_at ASC, created_at ASC`,
      [productId, orderId],
    );

    return res.json({
      data: {
        download_url: downloadUrl,
        file_name: product.digital_file_name,
        license_keys: licenseRows.map((r) => r.license_key),
        download_count: downloadRow.download_count,
        downloads_remaining: maxDownloads - downloadRow.download_count,
        expires_in_hours: product.download_expires_hours ?? 72,
      },
    });
  }),
);

export default router;
