import { query } from '../../db/pool';
import { PdErrorCode, PdNotFoundError } from '../../errors';
import { asyncHandler, validate } from '../../middlewares';
import { cleanAndDedupeTags } from '../../services/buyer-interest.service';
import { productService } from '../../services/product.service';
import { logger } from '../../utils/logger';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Product Approval Queue (unverified vendors) + Superadmin Product Catalog & Tag Management — extracted from admin.route.ts (E15 split). */
const router = Router();

const productListSchema = z.object({
  status: z
    .enum(['pending_approval', 'published', 'rejected'])
    .optional()
    .default('pending_approval'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/products/pending',
  validate(productListSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query as unknown as {
      status: string;
      page: number;
      limit: number;
    };
    const offset = (page - 1) * limit;
    const { rows } = await query<{
      id: string;
      title: string;
      status: string;
      store_id: string;
      store_name: string;
      created_at: Date;
    }>(
      `SELECT p.id, p.title, p.status, p.store_id, s.name AS store_name, p.created_at
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       WHERE p.status = $1
       ORDER BY p.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_product WHERE status = $1',
      [status],
    );
    const total = parseInt(countRows[0].count, 10);
    res
      .status(200)
      .json({ data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } });
  }),
);

router.put(
  '/products/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.approve(req.params.id);
    logger.info({ product_id: req.params.id, admin_id: req.user!.id }, 'Admin approved product');
    res.status(200).json({ success: true, product });
  }),
);

const rejectProductSchema = z.object({
  reason: z.string().min(1).max(500),
});

router.put(
  '/products/:id/reject',
  validate(rejectProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.reject(req.params.id, req.body.reason);
    logger.info({ product_id: req.params.id, admin_id: req.user!.id }, 'Admin rejected product');
    res.status(200).json({ success: true, product });
  }),
);

// =====================================================
// Superadmin Product Catalog & Tag Management
// =====================================================

const adminProductCatalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  q: z.string().trim().max(200).optional(),
  status: z
    .enum(['all', 'published', 'draft', 'pending_approval', 'rejected', 'archived'])
    .default('all'),
  marketplace_category_id: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1).optional(),
  category_id: z.string().trim().min(1).optional(),
  store_id: z.string().trim().min(1).optional(),
  storeId: z.string().trim().min(1).optional(),
  product_type: z.enum(['all', 'physical', 'digital', 'service', 'serial']).default('all'),
  stock_status: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).default('all'),
  ai_tagged: z.enum(['all', 'tagged', 'untagged']).default('all'),
  tag: z.string().trim().max(100).optional(),
  sort_by: z
    .enum(['created_at', 'price', 'title', 'inventory_quantity', 'store_name'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const adminUpdateProductTagsSchema = z
  .object({
    tags: z.array(z.string().max(50)).max(50).optional(),
    interest_tags: z.array(z.string().max(50)).max(50).optional(),
    curatedTags: z.array(z.string().max(50)).max(50).optional(),
  })
  .refine(
    (data) => data.tags !== undefined || data.interest_tags !== undefined || data.curatedTags !== undefined,
    {
      message: 'At least one of tags, interest_tags, or curatedTags must be provided',
    },
  );

interface AdminProductStore {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  is_verified: boolean;
  status: string;
  seller_type: string;
}

interface AdminProductCategory {
  id: string;
  name: string;
  slug: string;
}

interface AdminProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  position: number;
  is_thumbnail: boolean;
}

interface AdminProductVariant {
  id: string;
  sku: string | null;
  title: string;
  price: number | string;
  compare_at_price?: number | string | null;
  inventory_quantity: number;
  options: Record<string, unknown>;
  is_active: boolean;
  created_at: Date | string;
}

interface AdminProductRecord {
  id: string;
  store_id: string;
  product_type: string;
  status: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | string;
  compare_at_price?: number | string | null;
  inventory_quantity: number;
  weight_grams: number | null;
  thumbnail: string | null;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[];
  interest_tags: string[];
  interest_tags_synced_at: Date | string | null;
  attributes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  rejection_reason: string | null;
  product_reference: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  store: AdminProductStore;
  marketplace_category: AdminProductCategory | null;
  storefront_category: AdminProductCategory | null;
  images: AdminProductImage[];
  variants: AdminProductVariant[];
  variants_count: number;
}

router.get(
  '/products',
  validate(adminProductCatalogQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      page,
      limit,
      search,
      q,
      status,
      marketplace_category_id,
      categoryId,
      category_id,
      store_id,
      storeId,
      product_type,
      stock_status,
      ai_tagged,
      tag,
      sort_by,
      sort_order,
    } = req.query as unknown as z.infer<typeof adminProductCatalogQuerySchema>;

    const effectiveSearch = (q && q.trim().length > 0) ? q.trim() : (search && search.trim().length > 0) ? search.trim() : undefined;
    const effectiveStoreId = storeId || store_id;
    const effectiveCategoryId = categoryId || category_id || marketplace_category_id;

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (effectiveCategoryId) {
      params.push(effectiveCategoryId);
      conditions.push(`p.marketplace_category_id = $${params.length}`);
    }

    if (effectiveStoreId) {
      params.push(effectiveStoreId);
      conditions.push(`p.store_id = $${params.length}`);
    }

    if (product_type && product_type !== 'all') {
      params.push(product_type);
      conditions.push(`p.type = $${params.length}`);
    }

    if (stock_status && stock_status !== 'all') {
      if (stock_status === 'in_stock') {
        conditions.push(`p.inventory_quantity > 5`);
      } else if (stock_status === 'low_stock') {
        conditions.push(`p.inventory_quantity > 0 AND p.inventory_quantity <= 5`);
      } else if (stock_status === 'out_of_stock') {
        conditions.push(`p.inventory_quantity <= 0`);
      }
    }

    if (ai_tagged && ai_tagged !== 'all') {
      if (ai_tagged === 'tagged') {
        conditions.push(`(p.interest_tags IS NOT NULL AND cardinality(p.interest_tags) > 0)`);
      } else if (ai_tagged === 'untagged') {
        conditions.push(`(p.interest_tags IS NULL OR cardinality(p.interest_tags) = 0)`);
      }
    }

    if (tag && tag.trim().length > 0) {
      params.push(`%${tag.trim()}%`);
      const tIdx = params.length;
      conditions.push(`(
        p.tags::text ILIKE $${tIdx} OR
        array_to_string(p.interest_tags, ' ') ILIKE $${tIdx}
      )`);
    }

    if (effectiveSearch) {
      params.push(`%${effectiveSearch}%`);
      const sIdx = params.length;
      conditions.push(`(
        p.title ILIKE $${sIdx} OR
        p.description ILIKE $${sIdx} OR
        p.product_reference ILIKE $${sIdx} OR
        s.name ILIKE $${sIdx} OR
        p.tags::text ILIKE $${sIdx} OR
        array_to_string(p.interest_tags, ' ') ILIKE $${sIdx} OR
        EXISTS (SELECT 1 FROM pd_product_variant pv WHERE pv.product_id = p.id AND pv.sku ILIKE $${sIdx})
      )`);
    }

    const sortFieldMap: Record<string, string> = {
      created_at: 'p.created_at',
      price: 'p.price',
      title: 'p.title',
      inventory_quantity: 'p.inventory_quantity',
      store_name: 's.name',
    };

    const orderCol = sortFieldMap[sort_by] || 'p.created_at';
    const orderDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const orderByClause = `${orderCol} ${orderDir}`;

    const whereClause = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    const dataParams = [...params, limit, offset];
    const countParams = [...params];

    const dataSql = `
      SELECT
        p.id,
        p.store_id,
        p.type AS product_type,
        p.status,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.inventory_quantity,
        p.weight_grams,
        p.thumbnail,
        p.seo_title,
        p.seo_description,
        p.tags,
        p.interest_tags,
        p.interest_tags_synced_at,
        p.attributes,
        p.metadata,
        p.rejection_reason,
        p.product_reference,
        p.created_at,
        p.updated_at,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'subdomain', s.subdomain,
          'custom_domain', s.custom_domain,
          'is_verified', COALESCE(s.is_verified, false),
          'status', s.status,
          'seller_type', s.seller_type
        ) AS store,
        CASE
          WHEN mc.id IS NOT NULL THEN json_build_object('id', mc.id, 'name', mc.name, 'slug', mc.slug)
          ELSE NULL
        END AS marketplace_category,
        CASE
          WHEN sc.id IS NOT NULL THEN json_build_object('id', sc.id, 'name', sc.name, 'slug', sc.slug)
          ELSE NULL
        END AS storefront_category,
        COALESCE(img.images, '[]'::json) AS images,
        COALESCE(v.variants, '[]'::json) AS variants,
        COALESCE(v.variants_count, 0)::int AS variants_count
      FROM pd_product p
      JOIN pd_store s ON s.id = p.store_id
      LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
      LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.url,
            'alt_text', pi.alt_text,
            'position', pi.position,
            'is_thumbnail', pi.is_thumbnail
          )
          ORDER BY pi.position ASC
        ) AS images
        FROM pd_product_image pi
        WHERE pi.product_id = p.id
      ) img ON true
      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'title', pv.title,
              'price', pv.price,
              'compare_at_price', pv.compare_at_price,
              'inventory_quantity', pv.inventory_quantity,
              'options', pv.options,
              'is_active', pv.is_active,
              'created_at', pv.created_at
            )
            ORDER BY pv.created_at ASC
          ) AS variants,
          COUNT(pv.id)::int AS variants_count
        FROM pd_product_variant pv
        WHERE pv.product_id = p.id
      ) v ON true
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pd_product p
      JOIN pd_store s ON s.id = p.store_id
      LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
      LEFT JOIN pd_storefront_category sc ON sc.id = p.storefront_category_id
      WHERE ${whereClause}
    `;

    const metricsSql = `
      SELECT
        COUNT(*)::int AS total_products,
        COUNT(*) FILTER (WHERE p.status = 'published')::int AS published_count,
        COUNT(*) FILTER (WHERE p.status = 'pending_approval')::int AS pending_count,
        COUNT(*) FILTER (WHERE p.status = 'draft')::int AS draft_count,
        COUNT(*) FILTER (WHERE p.status = 'rejected')::int AS rejected_count,
        COUNT(*) FILTER (WHERE p.status = 'archived')::int AS archived_count,
        COUNT(*) FILTER (WHERE p.inventory_quantity <= 0)::int AS out_of_stock_count,
        COUNT(*) FILTER (WHERE p.inventory_quantity > 0 AND p.inventory_quantity <= 5)::int AS low_stock_count,
        COUNT(*) FILTER (WHERE p.interest_tags IS NOT NULL AND cardinality(p.interest_tags) > 0)::int AS ai_tagged_count
      FROM pd_product p
    `;

    const [dataResult, countResult, metricsResult] = await Promise.all([
      query<AdminProductRecord>(dataSql, dataParams),
      query<{ total: number | string }>(countSql, countParams),
      query<{
        total_products: number | string;
        published_count: number | string;
        pending_count: number | string;
        draft_count: number | string;
        rejected_count: number | string;
        archived_count: number | string;
        out_of_stock_count: number | string;
        low_stock_count: number | string;
        ai_tagged_count: number | string;
      }>(metricsSql),
    ]);

    const total = parseInt(String(countResult.rows[0]?.total ?? 0), 10);
    const metricsRow = metricsResult.rows[0] || {};
    const metrics = {
      total_products: parseInt(String(metricsRow.total_products ?? 0), 10),
      published_count: parseInt(String(metricsRow.published_count ?? 0), 10),
      pending_count: parseInt(String(metricsRow.pending_count ?? 0), 10),
      draft_count: parseInt(String(metricsRow.draft_count ?? 0), 10),
      rejected_count: parseInt(String(metricsRow.rejected_count ?? 0), 10),
      archived_count: parseInt(String(metricsRow.archived_count ?? 0), 10),
      out_of_stock_count: parseInt(String(metricsRow.out_of_stock_count ?? 0), 10),
      low_stock_count: parseInt(String(metricsRow.low_stock_count ?? 0), 10),
      ai_tagged_count: parseInt(String(metricsRow.ai_tagged_count ?? 0), 10),
    };

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
      metrics,
    });
  }),
);

router.patch(
  '/products/:id/tags',
  validate(adminUpdateProductTagsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { tags, interest_tags, curatedTags } = req.body as {
      tags?: string[];
      interest_tags?: string[];
      curatedTags?: string[];
    };
    const effectiveTags = tags !== undefined ? tags : curatedTags;

    const checkRes = await query<{ id: string }>('SELECT id FROM pd_product WHERE id = $1', [id]);
    if (!checkRes.rows[0]) {
      throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
    }

    const cleanVendorTags = effectiveTags !== undefined ? cleanAndDedupeTags(effectiveTags) : undefined;
    const cleanInterestTags = interest_tags !== undefined ? cleanAndDedupeTags(interest_tags) : undefined;

    const setClauses: string[] = ['updated_at = NOW()'];
    const updateParams: unknown[] = [id];

    if (cleanVendorTags !== undefined) {
      updateParams.push(JSON.stringify(cleanVendorTags));
      setClauses.push(`tags = $${updateParams.length}::jsonb`);
    }

    if (cleanInterestTags !== undefined) {
      updateParams.push(cleanInterestTags);
      setClauses.push(`interest_tags = $${updateParams.length}::text[]`);
      setClauses.push(`interest_tags_synced_at = NOW()`);
    }

    const updateSql = `
      UPDATE pd_product
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING id, tags, interest_tags, interest_tags_synced_at
    `;

    const { rows } = await query<{
      id: string;
      tags: unknown;
      interest_tags: string[];
      interest_tags_synced_at: Date | string | null;
    }>(updateSql, updateParams);

    const updated = rows[0];
    logger.info({ product_id: id, admin_id: req.user?.id }, 'Admin updated product tags');

    res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        tags: updated.tags,
        interest_tags: updated.interest_tags,
        interest_tags_synced_at: updated.interest_tags_synced_at,
      },
      message: 'Product tags updated successfully',
    });
  }),
);
export default router;