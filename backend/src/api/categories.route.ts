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
  locale: z.string().optional(),
});

// ==========================================================
// Routes
// ==========================================================

function extractReqLocale(req: Request): string {
  if (typeof req.query.locale === 'string' && req.query.locale.trim()) {
    return req.query.locale.trim();
  }
  if (typeof req.headers['x-locale'] === 'string' && req.headers['x-locale'].trim()) {
    return req.headers['x-locale'].trim();
  }
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.split('; ').find((row) => row.startsWith('pd_locale='));
  if (match) {
    const val = match.split('=')[1];
    if (val) return val.trim();
  }
  const acceptLang = (req.headers['accept-language'] || '').toLowerCase();
  if (acceptLang.includes('ar')) return 'ar';
  if (acceptLang.includes('en')) return 'en';
  return 'fr';
}

/**
 * GET /api/pd/categories
 * List all active marketplace categories with published product counts.
 * Supports ?tree=true to return nested hierarchy tree.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const isTree = req.query.tree === 'true';
    const locale = extractReqLocale(req);
    const categories = await categoryService.listPublicMarketplaceCategories({ tree: isTree, locale });

    const formatCategory = (cat: any): any => ({
      ...cat,
      product_count: parseInt(cat.product_count || '0', 10),
      children: Array.isArray(cat.children) ? cat.children.map(formatCategory) : undefined,
    });

    res.status(200).json({ data: categories.map(formatCategory) });
  }),
);

/**
 * GET /api/pd/categories/:slug
 * Get published products in a specific category (including child subcategories), plus ancestors & subcategories.
 */
router.get(
  '/:slug',
  validate(categoryProductsSchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const slug = req.params.slug;
    const locale = extractReqLocale(req);

    const category = await categoryService.getMarketplaceCategoryBySlug(slug.toLowerCase(), locale);
    const [result, ancestors, allCategories] = await Promise.all([
      productService.listPublished({ page, limit, category: category.slug }),
      categoryService.getCategoryAncestors(category.id, locale),
      categoryService.listPublicMarketplaceCategories({ locale }),
    ]);

    const subcategories = allCategories
      .filter((c) => c.parent_id === category.id)
      .map((c) => ({ ...c, product_count: parseInt(c.product_count || '0', 10) }));

    res.status(200).json({
      category,
      ancestors,
      subcategories,
      ...result,
    });
  }),
);

export default router;
