import { Router, Request, Response } from 'express';
import { productService } from '../services/product.service';
import { asyncHandler } from '../middlewares';
import { ProductType } from '@pandamarket/types';

const router = Router();

type SearchSuggestionHit = {
  id: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  marketplace_category_slug?: string | null;
  price: string | number;
  thumbnail?: string | null;
  store_subdomain?: string | null;
};

// Public: Search products
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const priceMin = req.query.price_min !== undefined ? Number(req.query.price_min) : undefined;
    const priceMax = req.query.price_max !== undefined ? Number(req.query.price_max) : undefined;
    const type = Object.values(ProductType).includes(req.query.type as ProductType)
      ? (req.query.type as ProductType)
      : undefined;
    const verifiedOnly = req.query.verified === 'true';
    const sortBy = req.query.sort as string | undefined;

    const results = await productService.searchPublished({
      query: q,
      limit,
      offset,
      category,
      priceMin,
      priceMax,
      type,
      verifiedOnly,
      sortBy,
    });
    res.status(200).json(results);
  }),
);

// Public: Search suggest (autocomplete)
router.get(
  '/suggest',
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    if (q.length < 2) {
      return res.status(200).json({ suggestions: [] });
    }

    const results = await productService.searchPublished({ query: q, limit: 8 });
    const suggestions = (results.hits || []).map((hit: SearchSuggestionHit) => ({
      id: hit.id,
      title: hit.title,
      slug: hit.slug,
      category: hit.category,
      marketplace_category_slug: hit.marketplace_category_slug,
      price: hit.price,
      thumbnail: hit.thumbnail,
      store_subdomain: hit.store_subdomain,
    }));

    return res.status(200).json({ suggestions });
  }),
);

export default router;
