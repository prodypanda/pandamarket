/**
 * Categories API routes — list product categories.
 *
 * Categories are derived from the `category` field on published products.
 * No separate categories table is needed for MVP.
 *
 * Endpoints:
 *   GET /api/pd/categories              — List all categories with product counts
 *   GET /api/pd/categories/:slug        — Get products in a specific category
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { productService } from '../services/product.service';
import { asyncHandler, validate } from '../middlewares';
import { ProductStatus } from '@pandamarket/types';

const router = Router();

// ==========================================================
// Schemas
// ==========================================================

const categoryProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ==========================================================
// Routes
// ==========================================================

/**
 * GET /api/pd/categories
 * List all distinct categories from published products, with product counts.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const { rows } = await query<{ category: string; product_count: string }>(
      `SELECT category, COUNT(*)::text AS product_count
       FROM pd_product
       WHERE status = $1 AND category IS NOT NULL AND category != ''
       GROUP BY category
       ORDER BY product_count DESC`,
      [ProductStatus.Published],
    );

    const categories = rows.map((r) => ({
      slug: r.category.toLowerCase().replace(/\s+/g, '-'),
      name: r.category,
      product_count: parseInt(r.product_count, 10),
    }));

    res.status(200).json({ data: categories });
  }),
);

/**
 * GET /api/pd/categories/:slug
 * Get published products in a specific category.
 */
router.get(
  '/:slug',
  validate(categoryProductsSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const slug = req.params.slug;

    // Convert slug back to category name (best-effort match)
    const { rows: catRows } = await query<{ category: string }>(
      `SELECT DISTINCT category FROM pd_product
       WHERE status = $1 AND category IS NOT NULL
         AND LOWER(REPLACE(category, ' ', '-')) = $2
       LIMIT 1`,
      [ProductStatus.Published, slug.toLowerCase()],
    );

    if (!catRows[0]) {
      res.status(404).json({ error: { message: 'Category not found' } });
      return;
    }

    const categoryName = catRows[0].category;
    const result = await productService.listPublished({ page, limit, category: categoryName });

    res.status(200).json({
      category: { slug, name: categoryName },
      ...result,
    });
  }),
);

export default router;
