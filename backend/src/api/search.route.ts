import { Router, Request, Response } from 'express';
import { productService } from '../services/product.service';
import { platformConfigService } from '../services/platform-config.service';
import { asyncHandler } from '../middlewares';
import { ProductType, SellerType } from '@pandamarket/types';

const router = Router();

type SearchSuggestionHit = {
  id: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  marketplace_category_slug?: string | null;
  price: string | number;
  compare_at_price?: string | number | null;
  thumbnail?: string | null;
  images?: Array<{ url: string } | string>;
  store_name?: string | null;
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
    const sellerType = Object.values(SellerType).includes(req.query.seller_type as SellerType)
      ? (req.query.seller_type as SellerType)
      : undefined;
    const settings = await platformConfigService.getSettings();
    const sortBy = (req.query.sort as string | undefined) || String(settings.catalog_default_sort || 'newest');

    const results = await productService.searchPublished({
      query: q,
      limit,
      offset,
      category,
      priceMin,
      priceMax,
      type,
      verifiedOnly,
      sellerType,
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
    const hits: SearchSuggestionHit[] = (results as any).hits || results.data || [];
    const suggestions = hits.map((hit: SearchSuggestionHit) => {
      const firstImage = hit.images && hit.images[0];
      const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage?.url || null);
      return {
        id: hit.id,
        title: hit.title,
        slug: hit.slug,
        category: hit.category,
        marketplace_category_slug: hit.marketplace_category_slug,
        price: hit.price,
        compare_at_price: hit.compare_at_price ?? null,
        thumbnail: hit.thumbnail || imageUrl,
        images: hit.images || [],
        store_name: hit.store_name ?? null,
        store_subdomain: hit.store_subdomain ?? null,
      };
    });

    return res.status(200).json({ suggestions });
  }),
);

// Storefront: Search products (store-scoped)
const handleStorefrontSearch = asyncHandler(async (req: Request, res: Response) => {
  const storeId = (req.query.store_id as string) || (req.query.storeId as string) || '';
  if (!storeId) {
    return res.status(400).json({ error: 'store_id parameter is required' });
  }

  const q = (req.query.q as string) || (req.query.query as string) || '';
  const category = req.query.category as string;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const priceMin = req.query.price_min !== undefined ? Number(req.query.price_min) : undefined;
  const priceMax = req.query.price_max !== undefined ? Number(req.query.price_max) : undefined;
  const productType = Object.values(ProductType).includes(req.query.type as ProductType)
    ? (req.query.type as ProductType)
    : Object.values(ProductType).includes(req.query.product_type as ProductType)
      ? (req.query.product_type as ProductType)
      : undefined;
  const sortBy = (req.query.sort as string) || 'newest';

  const results = await productService.listPublished({
    storeId,
    q,
    page,
    limit,
    category,
    priceMin,
    priceMax,
    productType,
    sortBy,
  });

  return res.status(200).json(results);
});

router.get('/storefront', handleStorefrontSearch);
router.get('/storefront/search', handleStorefrontSearch);

// Storefront: Search suggest (store-scoped autocomplete)
const handleStorefrontSuggest = asyncHandler(async (req: Request, res: Response) => {
  const storeId = (req.query.store_id as string) || (req.query.storeId as string) || '';
  const q = (req.query.q as string) || (req.query.query as string) || '';

  if (!storeId || q.trim().length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  const results = await productService.listPublished({
    storeId,
    q: q.trim(),
    page: 1,
    limit: 8,
  });

  const suggestions = (results.data || (results as any).products || []).map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    price: p.price,
    thumbnail: p.thumbnail,
  }));

  return res.status(200).json({ suggestions });
});

router.get('/storefront/suggest', handleStorefrontSuggest);
router.get('/storefront/search/suggest', handleStorefrontSuggest);

export default router;
