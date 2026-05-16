/**
 * Page Builder API Routes
 * ─────────────────────────────────────────────────────────────
 * Vendor endpoints (JWT auth + store ownership):
 *   GET    /api/pd/page-builder/pages          — List all pages for the vendor's store
 *   GET    /api/pd/page-builder/pages/:id       — Get a single page (includes builder_data)
 *   POST   /api/pd/page-builder/pages           — Create a new page
 *   PUT    /api/pd/page-builder/pages/:id        — Update a page (save builder content)
 *   DELETE /api/pd/page-builder/pages/:id        — Delete a page
 *   POST   /api/pd/page-builder/pages/:id/duplicate — Duplicate a page
 *
 * Public endpoints (storefront rendering):
 *   GET    /api/pd/stores/:storeId/pages         — List published pages for a store
 *   GET    /api/pd/stores/:storeId/pages/:slug    — Get a published page by slug (HTML/CSS only)
 *   GET    /api/pd/stores/:storeId/homepage       — Get the homepage override (if any)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pageBuilderService } from '../services/page-builder.service';
import { requireAuth, requireVendor, requireStore, validate } from '../middlewares';

const router = Router();

// ─── Zod Schemas ────────────────────────────────────────────

const createPageSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/, 'Slug invalide (lettres minuscules, chiffres, tirets)'),
  title: z.string().min(1).max(200),
  builder_data: z.record(z.unknown()).optional(),
  html: z.string().max(2 * 1024 * 1024).optional(),
  css: z.string().max(512 * 1024).optional(),
  is_homepage: z.boolean().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(320).nullable().optional(),
  og_image: z.string().max(2048).nullable().optional(),
  noindex: z.boolean().optional(),
  show_in_navigation: z.boolean().optional(),
  show_in_footer: z.boolean().optional(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/, 'Slug invalide')
    .optional(),
  builder_data: z.record(z.unknown()).optional(),
  html: z.string().max(2 * 1024 * 1024).optional(),
  css: z.string().max(512 * 1024).optional(),
  is_published: z.boolean().optional(),
  is_homepage: z.boolean().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(320).nullable().optional(),
  og_image: z.string().max(2048).nullable().optional(),
  noindex: z.boolean().optional(),
  show_in_navigation: z.boolean().optional(),
  show_in_footer: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
});

// ─── Vendor Endpoints (Authenticated) ───────────────────────

/**
 * GET /api/pd/page-builder/pages
 * List all pages for the authenticated vendor's store.
 */
router.get(
  '/pages',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const limits = await pageBuilderService.getPageBuilderLimits(storeId);
      const pages = await pageBuilderService.listPages(storeId);
      res.json({ data: pages, count: pages.length, limits });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/pd/page-builder/pages/:id
 * Get a single page with full builder_data (for the editor).
 */
router.get(
  '/pages/:id',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const page = await pageBuilderService.getPageById(req.params.id, storeId);
      res.json({ page });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/pd/page-builder/pages
 * Create a new page. Plan check (Regular+) enforced by service.
 */
router.post(
  '/pages',
  requireAuth,
  requireVendor,
  requireStore,
  validate(createPageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const page = await pageBuilderService.createPage({
        store_id: storeId,
        ...req.body,
      });
      res.status(201).json({ page });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/pd/page-builder/pages/:id
 * Update a page (save builder content, publish/unpublish, etc.).
 */
router.put(
  '/pages/:id',
  requireAuth,
  requireVendor,
  requireStore,
  validate(updatePageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const page = await pageBuilderService.updatePage(req.params.id, storeId, req.body, req.user!.id);
      res.json({ page });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/pages/:id/versions',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const versions = await pageBuilderService.listVersions(req.params.id, storeId);
      res.json({ data: versions, count: versions.length });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/pages/:id/versions/:versionId/restore',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const page = await pageBuilderService.restoreVersion(req.params.id, storeId, req.params.versionId);
      res.json({ page });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/pages/:id/preview',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const preview = await pageBuilderService.createPreviewToken(req.params.id, storeId, req.user!.id);
      res.json(preview);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/pd/page-builder/pages/:id
 * Delete a page.
 */
router.delete(
  '/pages/:id',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      await pageBuilderService.deletePage(req.params.id, storeId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/pd/page-builder/pages/:id/duplicate
 * Duplicate a page.
 */
router.post(
  '/pages/:id/duplicate',
  requireAuth,
  requireVendor,
  requireStore,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.user!.store_id!;
      const page = await pageBuilderService.duplicatePage(req.params.id, storeId);
      res.status(201).json({ page });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
