/**
 * Categories API routes — list marketplace product categories.
 *
 * Endpoints:
 *   GET /api/pd/categories              — List all categories with product counts
 *   GET /api/pd/categories/:slug        — Get products in a specific category
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { productService } from '../services/product.service';
import { categoryService } from '../services/category.service';
import { asyncHandler, validate } from '../middlewares';

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
 * List all active marketplace categories with published product counts.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = (await categoryService.listPublicMarketplaceCategories()).map((category) => ({
      ...category,
      product_count: parseInt(category.product_count || '0', 10),
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

    const category = await categoryService.getMarketplaceCategoryBySlug(slug.toLowerCase());
    const result = await productService.listPublished({ page, limit, marketplaceCategoryId: category.id });

    res.status(200).json({
      category,
      ...result,
    });
  }),
);

export default router;
