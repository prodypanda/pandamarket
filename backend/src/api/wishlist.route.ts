/**
 * Wishlist API routes.
 *
 * All endpoints require authentication.
 *
 *   GET    /wishlist              — list wishlist items
 *   POST   /wishlist/toggle       — toggle product in wishlist (add/remove)
 *   POST   /wishlist              — add product to wishlist
 *   DELETE /wishlist/:productId   — remove product from wishlist
 *   GET    /wishlist/check/:productId — check if product is in wishlist
 *   POST   /wishlist/check/batch  — check multiple products
 *   GET    /wishlist/count        — get wishlist count
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, validate } from '../middlewares';
import { wishlistService } from '../services/wishlist.service';
import { z } from 'zod';
import { PdValidationError } from '../errors';
import { platformConfigService } from '../services/platform-config.service';

const router = Router();

// All wishlist routes require auth
router.use(requireAuth);

// ─── Validators ─────────────────────────────────────────────────────

const toggleSchema = z.object({
  product_id: z.string().min(1),
});

const batchCheckSchema = z.object({
  product_ids: z.array(z.string().min(1)).min(1).max(100),
});

async function wishlistEnabled() {
  const settings = await platformConfigService.getSettings();
  return Boolean(settings.wishlist_enabled);
}

async function assertWishlistEnabled() {
  if (!(await wishlistEnabled())) {
    throw new PdValidationError('Wishlist is disabled by platform settings');
  }
}

// ─── List wishlist ──────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    if (!(await wishlistEnabled())) {
      res.json({ items: [], total: 0, page, limit, pages: 0 });
      return;
    }

    const result = await wishlistService.list(req.user!.id, { page, limit });

    res.json({
      items: result.items,
      total: result.total,
      page,
      limit,
      pages: Math.ceil(result.total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Toggle (add or remove) ─────────────────────────────────────────

router.post(
  '/toggle',
  validate(toggleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertWishlistEnabled();
      const result = await wishlistService.toggle(req.user!.id, req.body.product_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Add to wishlist ────────────────────────────────────────────────

router.post(
  '/',
  validate(toggleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertWishlistEnabled();
      const item = await wishlistService.add(req.user!.id, req.body.product_id);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Remove from wishlist ───────────────────────────────────────────

router.delete(
  '/:productId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertWishlistEnabled();
      await wishlistService.remove(req.user!.id, req.params.productId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Check single product ───────────────────────────────────────────

router.get(
  '/check/:productId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await wishlistEnabled())) {
        res.json({ in_wishlist: false });
        return;
      }
      const inWishlist = await wishlistService.isInWishlist(
        req.user!.id,
        req.params.productId,
      );
      res.json({ in_wishlist: inWishlist });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Batch check ────────────────────────────────────────────────────

router.post(
  '/check/batch',
  validate(batchCheckSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await wishlistEnabled())) {
        res.json({
          wishlisted: Object.fromEntries(
            req.body.product_ids.map((id: string) => [id, false]),
          ),
        });
        return;
      }
      const wishlisted = await wishlistService.getWishlistStatus(
        req.user!.id,
        req.body.product_ids,
      );
      res.json({
        wishlisted: Object.fromEntries(
          req.body.product_ids.map((id: string) => [id, wishlisted.has(id)]),
        ),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Count ──────────────────────────────────────────────────────────

router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await wishlistEnabled())) {
      res.json({ count: 0 });
      return;
    }
    const count = await wishlistService.count(req.user!.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

export default router;
