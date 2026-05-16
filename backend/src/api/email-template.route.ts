import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, requireAdmin, requireStore, validate } from '../middlewares';
import { emailTemplateService } from '../services/email-template.service';

const router = Router();

const templateSchema = z.object({
  label: z.string().trim().min(1).max(160).optional(),
  subject: z.string().trim().max(300).nullable().optional(),
  preheader: z.string().trim().max(300).nullable().optional(),
  title: z.string().trim().max(300).nullable().optional(),
  body_html: z.string().trim().max(10000).nullable().optional(),
  cta_label: z.string().trim().max(120).nullable().optional(),
  cta_url: z.string().trim().max(2048).nullable().optional(),
  primary_color: z.string().trim().max(20).optional(),
  accent_color: z.string().trim().max(20).optional(),
  background_color: z.string().trim().max(20).optional(),
  text_color: z.string().trim().max(20).optional(),
  header_background: z.string().trim().max(20).optional(),
  footer_text: z.string().trim().max(1000).nullable().optional(),
  is_enabled: z.boolean().optional(),
});

router.get(
  '/storefront',
  requireStore,
  asyncHandler(async (req: Request, res: Response) => {
    const templates = await emailTemplateService.list('store', req.user!.store_id!);
    res.status(200).json({ templates });
  }),
);

router.put(
  '/storefront/:templateKey',
  requireStore,
  validate(templateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await emailTemplateService.upsert('store', req.user!.store_id!, {
      ...req.body,
      template_key: req.params.templateKey,
    });
    res.status(200).json({ template });
  }),
);

router.get(
  '/marketplace',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const templates = await emailTemplateService.list('marketplace');
    res.status(200).json({ templates });
  }),
);

router.put(
  '/marketplace/:templateKey',
  requireAdmin,
  validate(templateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const template = await emailTemplateService.upsert('marketplace', null, {
      ...req.body,
      template_key: req.params.templateKey,
    });
    res.status(200).json({ template });
  }),
);

export default router;
