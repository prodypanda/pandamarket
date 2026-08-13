import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { platformCmsService } from '../services/platform-cms.service';
import { asyncHandler, requireAuth, requireSuperAdmin } from '../middlewares';

const router = Router();

const createPageSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/, 'Slug invalide'),
  title: z.string().min(1).max(200),
  is_published: z.boolean().optional(),
  show_in_footer: z.boolean().optional(),
  show_in_header: z.boolean().optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/, 'Slug invalide').optional(),
  builder_data: z.record(z.unknown()).optional(),
  html: z.string().max(2 * 1024 * 1024).optional(),
  css: z.string().max(512 * 1024).optional(),
  is_published: z.boolean().optional(),
  show_in_footer: z.boolean().optional(),
  show_in_header: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
});

// GET /api/pd/marketplace/cms
router.get(
  '/',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const pages = await platformCmsService.listPages();
    res.json({ data: pages });
  })
);

// GET /api/pd/marketplace/cms/public
router.get(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const pages = await platformCmsService.listPublicPages();
    res.json({ data: pages });
  })
);

// GET /api/pd/marketplace/cms/slug/:slug
router.get(
  '/slug/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const page = await platformCmsService.getPageBySlug(req.params.slug);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ data: page });
  })
);

// GET /api/pd/marketplace/cms/:id
router.get(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const page = await platformCmsService.getPage(req.params.id);
    if (!page) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.json({ data: page });
  })
);

// POST /api/pd/marketplace/cms
router.post(
  '/',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const data = createPageSchema.parse(req.body);
    const page = await platformCmsService.createPage(data);
    res.status(201).json({ data: page });
  })
);

// PUT /api/pd/marketplace/cms/:id
router.put(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updatePageSchema.parse(req.body);
    const page = await platformCmsService.updatePage(req.params.id, data);
    res.json({ data: page });
  })
);

// DELETE /api/pd/marketplace/cms/:id
router.delete(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    await platformCmsService.deletePage(req.params.id);
    res.status(204).send();
  })
);

export { router as platformCmsRouter };
