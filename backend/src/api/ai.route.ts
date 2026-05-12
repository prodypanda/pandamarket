import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { creditsService } from '../services/credits.service';
import { productService } from '../services/product.service';
import { storeService } from '../services/store.service';
import { subscriptionService } from '../services/subscription.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { PdErrorCode, PdForbiddenError } from '../errors';

const router = Router();

const compressSchema = z.object({
  image_url: z.string().min(1, 'image_url is required'),
  product_id: z.string().optional(),
});

const seoGenerateSchema = z.object({
  product_id: z.string().min(1, 'product_id is required'),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

async function assertAiFeature(
  storeId: string,
  feature: 'has_image_compression' | 'has_ai_seo',
): Promise<void> {
  const store = await storeService.getById(storeId);
  const limits = await subscriptionService.getLimits(store.subscription_plan);
  if (!limits[feature]) {
    throw new PdForbiddenError(
      PdErrorCode.PERM_PLAN_REQUIRED,
      feature === 'has_image_compression'
        ? 'Your current plan does not include image compression'
        : 'Your current plan does not include AI SEO generation',
      { current_plan: store.subscription_plan, feature },
    );
  }
}

// Vendor: Queue image compression (1 token)
router.post(
  '/compress',
  requireStore,
  validate(compressSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_image_compression');
    if (req.body.product_id) {
      await productService.assertOwnership(req.body.product_id, storeId);
    }
    const job = await aiService.queueImageCompression({
      store_id: storeId,
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
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_ai_seo');
    await productService.assertOwnership(req.body.product_id, storeId);
    const job = await aiService.queueSeoGeneration({
      store_id: storeId,
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
