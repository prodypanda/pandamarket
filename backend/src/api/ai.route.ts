import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { creditsService } from '../services/credits.service';
import { asyncHandler, validate, requireStore } from '../middlewares';

const router = Router();

const compressSchema = z.object({
  image_url: z.string().min(1, 'image_url is required'),
  product_id: z.string().optional(),
});

const seoGenerateSchema = z.object({
  product_id: z.string().min(1, 'product_id is required'),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

// Vendor: Queue image compression (1 token)
router.post(
  '/compress',
  requireStore,
  validate(compressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const job = await aiService.queueImageCompression({
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      image_url: req.body.image_url,
      product_id: req.body.product_id,
    });
    res.status(201).json({ job });
  }),
);

// Vendor: Queue SEO generation (2 tokens)
router.post(
  '/seo-generate',
  requireStore,
  validate(seoGenerateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const job = await aiService.queueSeoGeneration({
      store_id: req.user!.store_id!,
      user_id: req.user!.id,
      product_id: req.body.product_id,
      language: req.body.language,
    });
    res.status(201).json({ job });
  }),
);

// Vendor: Get a specific AI job (tenant-isolated)
router.get(
  '/jobs/:id',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const job = await aiService.getById(req.params.id);
    // Tenant isolation: ensure the job belongs to the vendor's store
    if (job.store_id !== req.user!.store_id!) {
      res.status(404).json({ error: { message: 'AI job not found' } });
      return;
    }
    res.status(200).json({ job });
  }),
);

// Vendor: List AI job history
router.get(
  '/history',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const jobs = await aiService.listByStore(req.user!.store_id!, { page, limit });
    res.status(200).json({ jobs });
  }),
);

// Vendor: Get AI credits balance
router.get(
  '/credits',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const credits = await creditsService.getByStore(req.user!.store_id!);
    res.status(200).json({ credits });
  }),
);

export default router;
