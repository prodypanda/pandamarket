import { Router, Request, Response } from 'express';
import { searchService } from '../services/search.service';
import { asyncHandler } from '../middlewares';

const router = Router();

// Public: Search products
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const q = (req.query.q as string) || '';
    const category = req.query.category as string;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const results = await searchService.searchProducts(q, { limit, offset, category });
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

    const results = await searchService.searchProducts(q, { limit: 8 });
    const suggestions = (results.hits || []).map((hit: any) => ({
      id: hit.id,
      title: hit.title,
      category: hit.category,
      price: hit.price,
      thumbnail: hit.thumbnail,
    }));

    res.status(200).json({ suggestions });
  }),
);

export default router;
