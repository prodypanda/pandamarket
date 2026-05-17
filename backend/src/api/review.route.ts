/**
 * Review API routes.
 *
 * Public:
 *   GET  /products/:productId/reviews       — list reviews for a product
 *   GET  /products/:productId/rating        — get aggregate rating
 *
 * Authenticated (customer):
 *   POST   /reviews                         — create a review
 *   PUT    /reviews/:id                     — update own review
 *   DELETE /reviews/:id                     — delete own review
 *   POST   /reviews/:id/helpful             — mark as helpful
 *
 * Admin:
 *   GET    /admin/reviews/pending           — list flagged/pending reviews
 *   PUT    /admin/reviews/:id/status        — moderate a review
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, validate } from '../middlewares';
import { reviewService } from '../services/review.service';
import { z } from 'zod';
import { ReviewStatus } from '@pandamarket/types';
import { PdValidationError } from '../errors';
import { platformConfigService } from '../services/platform-config.service';

const router = Router();

// ─── Validators ─────────────────────────────────────────────────────

const createReviewSchema = z.object({
  product_id: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
  order_id: z.string().optional(),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

const adminStatusSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  admin_notes: z.string().max(1000).optional(),
});

async function reviewsEnabled() {
  const settings = await platformConfigService.getSettings();
  return Boolean(settings.reviews_enabled);
}

async function assertReviewsEnabled() {
  if (!(await reviewsEnabled())) {
    throw new PdValidationError('Reviews are disabled by platform settings');
  }
}

function emptyRating(productId: string) {
  return {
    product_id: productId,
    average_rating: 0,
    review_count: 0,
    rating_1: 0,
    rating_2: 0,
    rating_3: 0,
    rating_4: 0,
    rating_5: 0,
  };
}

// ─── Public: List reviews for a product ─────────────────────────────

router.get(
  '/products/:productId/reviews',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { productId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sort = (req.query.sort as string) || 'recent';
      if (!(await reviewsEnabled())) {
        res.json({ reviews: [], total: 0, page, limit, pages: 0 });
        return;
      }

      const result = await reviewService.listByProduct(productId, {
        page,
        limit,
        sort: sort as 'recent' | 'helpful' | 'highest' | 'lowest',
      });

      res.json({
        reviews: result.reviews,
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Public: Get aggregate rating for a product ─────────────────────

router.get(
  '/products/:productId/rating',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await reviewsEnabled())) {
        res.json(emptyRating(req.params.productId));
        return;
      }
      const rating = await reviewService.getProductRating(req.params.productId);
      res.json(rating ?? emptyRating(req.params.productId));
    } catch (err) {
      next(err);
    }
  },
);

// ─── Batch ratings for multiple products ────────────────────────────

router.post(
  '/products/ratings/batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { product_ids } = req.body as { product_ids: string[] };
      if (!Array.isArray(product_ids) || product_ids.length === 0) {
        res.json({ ratings: {} });
        return;
      }
      if (!(await reviewsEnabled())) {
        res.json({ ratings: {} });
        return;
      }
      const ratings = await reviewService.getProductRatings(
        product_ids.slice(0, 100),
      );
      const result: Record<string, unknown> = {};
      for (const [id, rating] of ratings) {
        result[id] = rating;
      }
      res.json({ ratings: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Auth: Create review ────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  validate(createReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertReviewsEnabled();
      const review = await reviewService.create({
        product_id: req.body.product_id,
        customer_id: req.user!.id,
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
        order_id: req.body.order_id,
      });
      res.status(201).json(review);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Auth: Update own review ────────────────────────────────────────

router.put(
  '/:id',
  requireAuth,
  validate(updateReviewSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertReviewsEnabled();
      const review = await reviewService.update({
        review_id: req.params.id,
        customer_id: req.user!.id,
        rating: req.body.rating,
        title: req.body.title,
        body: req.body.body,
      });
      res.json(review);
    } catch (err) {
      next(err);
    }
  },
);

// ─── Auth: Delete own review ────────────────────────────────────────

router.delete(
  '/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertReviewsEnabled();
      await reviewService.delete(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Auth: Mark as helpful ──────────────────────────────────────────

router.post(
  '/:id/helpful',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assertReviewsEnabled();
      await reviewService.markHelpful(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Admin: List pending/flagged reviews ────────────────────────────

router.get(
  '/admin/pending',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await reviewService.adminListPending({ page, limit });
      res.json({
        reviews: result.reviews,
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Admin: Moderate review ─────────────────────────────────────────

router.put(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  validate(adminStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const review = await reviewService.adminUpdateStatus(
        req.params.id,
        req.body.status,
        req.body.admin_notes,
      );
      res.json(review);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
