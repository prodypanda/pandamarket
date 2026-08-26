import { asyncHandler, validate } from '../../middlewares';
import { categoryService } from '../../services/category.service';
import { Request, Response, Router } from 'express';
import { z } from 'zod';

/** Marketplace Categories — extracted from admin.route.ts (E15 split). */
const router = Router();

const categorySchema = z.object({
  name: z.string().min(2).max(120),
  name_fr: z.string().max(255).nullable().optional(),
  name_ar: z.string().max(255).nullable().optional(),
  name_en: z.string().max(255).nullable().optional(),
  parent_id: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  description_fr: z.string().max(1000).nullable().optional(),
  description_ar: z.string().max(1000).nullable().optional(),
  description_en: z.string().max(1000).nullable().optional(),
  short_description: z.string().max(255).nullable().optional(),
  long_description: z.string().max(5000).nullable().optional(),
  image_url: z.string().nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  banner_url: z.string().nullable().optional(),
  seo_title: z.string().max(255).nullable().optional(),
  seo_description: z.string().max(2000).nullable().optional(),
  position: z.number().int().optional(),
  show_in_megamenu: z.boolean().optional(),
});

const updateCategorySchema = categorySchema.partial().extend({
  is_active: z.boolean().optional(),
});

router.get(
  '/marketplace-categories',
  asyncHandler(async (req: Request, res: Response) => {
    const isTree = req.query.tree === 'true';
    const categories = (await categoryService.listMarketplaceCategories({ tree: isTree })).map(
      (category) => ({
        ...category,
        product_count: parseInt(category.product_count || '0', 10),
      }),
    );
    res.status(200).json({ data: categories });
  }),
);

router.post(
  '/marketplace-categories',
  validate(categorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const category = await categoryService.createMarketplaceCategory(req.body);
    res.status(201).json({ category });
  }),
);

const handleUpdateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateMarketplaceCategory(req.params.id, req.body);
  res.status(200).json({ category });
});

const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      position: z.number().int(),
      parent_id: z.string().nullable().optional(),
    }),
  ),
});

router.put(
  '/marketplace-categories/reorder',
  validate(reorderCategoriesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    await categoryService.reorderMarketplaceCategories(req.body.items);
    res.status(200).json({ success: true });
  }),
);

router.put('/marketplace-categories/:id', validate(updateCategorySchema), handleUpdateCategory);
router.patch('/marketplace-categories/:id', validate(updateCategorySchema), handleUpdateCategory);

router.get(
  '/marketplace-categories/:id/delete-impact',
  asyncHandler(async (req: Request, res: Response) => {
    const impact = await categoryService.getMarketplaceDeleteImpact(req.params.id);
    res.status(200).json(impact);
  }),
);

router.delete(
  '/marketplace-categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const confirm = req.query.confirm === 'true';
    const result = await categoryService.deleteMarketplaceCategory(req.params.id, confirm);
    res.status(200).json({ success: true, ...result });
  }),
);
export default router;