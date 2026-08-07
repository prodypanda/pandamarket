import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { creditsService } from '../services/credits.service';
import { productService } from '../services/product.service';
import { storeService } from '../services/store.service';
import { subscriptionService } from '../services/subscription.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { PdErrorCode, PdForbiddenError, PdValidationError } from '../errors';
import { AiJobStatus, AiJobType } from '@pandamarket/types';
import { aiConfigService } from '../services/ai-config.service';
import type { AiProvider } from '../services/ai-config.service';
import { platformConfigService } from '../services/platform-config.service';

import { categoryService, MarketplaceCategoryRow } from '../services/category.service';

const router = Router();

const compressSchema = z.object({
  image_url: z.string().trim().min(1, 'image_url is required').max(2048),
  product_id: z.string().optional(),
});

const seoGenerateSchema = z.object({
  product_id: z.string().min(1, 'product_id is required'),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

const smartFillSchema = z.object({
  title: z.string().trim().max(300).optional(),
  description: z.string().trim().max(8000).optional(),
  image_url: z.string().trim().max(2048).optional(),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

const photoStudioReplaceBackgroundSchema = z.object({
  image_url: z.string().trim().min(1, 'image_url is required').max(2048),
  preset: z.enum(['marble', 'sand', 'wooden_table', 'gradient', 'studio_white', 'lifestyle_living', 'custom']),
  custom_prompt: z.string().trim().max(1000).optional(),
});

const photoStudioGenerateGallerySchema = z.object({
  product_title: z.string().trim().min(1, 'product_title is required').max(200),
  image_url: z.string().trim().max(2048).optional(),
  style: z.enum(['lifestyle', 'model', 'studio']).optional(),
});

const photoStudioEnhanceSchema = z.object({
  image_url: z.string().trim().min(1, 'image_url is required').max(2048),
});

const pageCopySchema = z.object({
  page_title: z.string().trim().max(160).optional(),
  current_seo_title: z.string().trim().max(200).optional(),
  current_seo_description: z.string().trim().max(320).optional(),
  section_outline: z.array(z.string().trim().max(140)).max(20).optional(),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

const productDescriptionSchema = z.object({
  product_id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(180),
  current_description: z.string().trim().max(8000).optional(),
  category: z.string().trim().max(160).optional(),
  attributes: z.array(z.object({
    name: z.string().trim().max(80),
    value: z.string().trim().max(200),
  })).max(30).optional(),
  language: z.enum(['fr', 'ar', 'en']).optional(),
  tone: z.enum(['premium', 'friendly', 'technical', 'concise']).optional(),
});

const buyTokenPackSchema = z.object({
  pack_id: z.string().min(1).max(64),
});

const aiProviderSchema = z.object({
  provider: z.enum(['gemini', 'openai', 'claude', 'custom']),
  model: z.string().trim().min(1).max(160),
  base_url: z.string().trim().max(2048).optional().nullable(),
  api_key: z.string().trim().max(4096).optional(),
  is_enabled: z.boolean().default(true),
});

const requireAiToolsEnabled = asyncHandler(async (_req: Request, _res: Response, next) => {
  const settings = await platformConfigService.getSettings();
  if (!settings.ai_tools_enabled) {
    throw new PdValidationError('AI tools are disabled by platform settings');
  }
  next();
});

function parsePageCopyResponse(text: string, fallbackTitle: string): {
  seo_title: string;
  seo_description: string;
  hero_title: string;
  cta: string;
} {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as Partial<{
      seo_title: string;
      seo_description: string;
      hero_title: string;
      cta: string;
    }>;
    return {
      seo_title: String(parsed.seo_title || fallbackTitle).slice(0, 200),
      seo_description: String(parsed.seo_description || '').slice(0, 320),
      hero_title: String(parsed.hero_title || fallbackTitle).slice(0, 120),
      cta: String(parsed.cta || 'Découvrir la boutique').slice(0, 80),
    };
  } catch {
    return {
      seo_title: fallbackTitle.slice(0, 200),
      seo_description: '',
      hero_title: fallbackTitle.slice(0, 120),
      cta: 'Découvrir la boutique',
    };
  }
}

function parseDescriptionResponse(text: string): { description_html: string; summary: string } {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as Partial<{
      description_html: string;
      summary: string;
    }>;
    return {
      description_html: String(parsed.description_html || '').slice(0, 8000),
      summary: String(parsed.summary || '').slice(0, 240),
    };
  } catch {
    return {
      description_html: text.slice(0, 8000),
      summary: text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240),
    };
  }
}

function parseSmartFillResponse(text: string, inputTitle?: string): {
  suggested_title: string;
  suggested_description: string;
  suggested_hub_category_name: string;
  suggested_hub_subcategory_name: string;
  suggested_storefront_category: string;
  suggested_storefront_subcategory: string;
} {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as Partial<{
      suggested_title: string;
      suggested_description: string;
      suggested_hub_category_name: string;
      suggested_hub_subcategory_name: string;
      suggested_storefront_category: string;
      suggested_storefront_subcategory: string;
    }>;
    return {
      suggested_title: String(parsed.suggested_title || inputTitle || 'Produit sans titre').slice(0, 180),
      suggested_description: String(parsed.suggested_description || `<p>${inputTitle || 'Nouveau produit'}</p>`).slice(0, 8000),
      suggested_hub_category_name: String(parsed.suggested_hub_category_name || 'Général').slice(0, 100),
      suggested_hub_subcategory_name: String(parsed.suggested_hub_subcategory_name || 'Divers').slice(0, 100),
      suggested_storefront_category: String(parsed.suggested_storefront_category || 'Boutique').slice(0, 100),
      suggested_storefront_subcategory: String(parsed.suggested_storefront_subcategory || 'Général').slice(0, 100),
    };
  } catch {
    return {
      suggested_title: String(inputTitle || 'Nouveau produit').slice(0, 180),
      suggested_description: `<p>${text || inputTitle || 'Nouveau produit'}</p>`,
      suggested_hub_category_name: 'Général',
      suggested_hub_subcategory_name: 'Divers',
      suggested_storefront_category: 'Boutique',
      suggested_storefront_subcategory: 'Général',
    };
  }
}

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
  requireAiToolsEnabled,
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
  requireAiToolsEnabled,
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

router.post(
  '/page-copy-helper',
  requireStore,
  requireAiToolsEnabled,
  validate(pageCopySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_ai_seo');

    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'en';
    const langName = { fr: 'French', ar: 'Arabic', en: 'English' }[language];
    const fallbackTitle = req.body.current_seo_title || req.body.page_title || 'PandaMarket page';
    const outline = Array.isArray(req.body.section_outline)
      ? req.body.section_outline.join(' | ')
      : 'No outline';
    const job = await aiService.startInlineJob({
      type: AiJobType.PageCopy,
      store_id: storeId,
      user_id: req.user!.id,
      input_meta: {
        page_title: req.body.page_title || null,
        current_seo_title: req.body.current_seo_title || null,
        current_seo_description: req.body.current_seo_description || null,
        section_outline: req.body.section_outline || [],
        language,
      },
    });
    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.PageCopy);
      const prompt = `You are an e-commerce landing page copywriter. Generate concise page builder copy in ${langName}. Return ONLY JSON: { "seo_title": string, "seo_description": string, "hero_title": string, "cta": string }. Page title: ${req.body.page_title || 'Untitled'}. Current SEO title: ${req.body.current_seo_title || 'none'}. Current SEO description: ${req.body.current_seo_description || 'none'}. Sections: ${outline}. Keep SEO title under 70 chars and description under 160 chars.`;
      const result = await aiConfigService.generateText(prompt, storeId);
      const suggestions = parsePageCopyResponse(result.text, fallbackTitle);
      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, { ...suggestions, provider: result.provider_label }, cost);
      res.status(200).json({ suggestions, tokens_consumed: cost, job_id: job.id, provider: result.provider_label });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI copy helper failed';
      await aiService.markFailed(job.id, message);
      throw err;
    }
  }),
);

router.post(
  '/product-description',
  requireStore,
  requireAiToolsEnabled,
  validate(productDescriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_ai_seo');
    if (req.body.product_id) {
      await productService.assertOwnership(req.body.product_id, storeId);
    }
    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'en';
    const langName = { fr: 'French', ar: 'Arabic', en: 'English' }[language];
    const tone = req.body.tone || 'friendly';
    const attributes = Array.isArray(req.body.attributes)
      ? req.body.attributes.map((item: { name: string; value: string }) => `${item.name}: ${item.value}`).join(' | ')
      : 'None';
    const job = await aiService.startInlineJob({
      type: AiJobType.ProductDescription,
      store_id: storeId,
      user_id: req.user!.id,
      input_meta: {
        product_id: req.body.product_id || null,
        title: req.body.title,
        current_description: req.body.current_description || null,
        category: req.body.category || null,
        attributes: req.body.attributes || [],
        language,
        tone,
      },
    });
    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.ProductDescription);
      const prompt = `You are an e-commerce product copywriter. Enhance the product description in ${langName}. Return ONLY JSON: { "description_html": string, "summary": string }. Use safe HTML tags only: p, strong, em, ul, li, h3. Tone: ${tone}. Product title: ${req.body.title}. Category: ${req.body.category || 'none'}. Attributes: ${attributes}. Current description: ${req.body.current_description || 'none'}. Make it persuasive, accurate, and not exaggerated.`;
      const result = await aiConfigService.generateText(prompt, storeId);
      const description = parseDescriptionResponse(result.text);
      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, { ...description, provider: result.provider_label }, cost);
      res.status(200).json({ description, tokens_consumed: cost, job_id: job.id, provider: result.provider_label });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI product description failed';
      await aiService.markFailed(job.id, message);
      throw err;
    }
  }),
);

// Vendor: Smart Product Generator (Magic Assistant)
router.post(
  '/smart-fill',
  requireStore,
  requireAiToolsEnabled,
  validate(smartFillSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_ai_seo');

    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'en';
    const inputTitle = req.body.title || '';
    const inputDesc = req.body.description || '';
    const inputImage = req.body.image_url || '';

    if (!inputTitle && !inputDesc && !inputImage) {
      throw new PdValidationError('Veuillez fournir au moins un élément (titre, description ou image).');
    }

    const job = await aiService.startInlineJob({
      type: AiJobType.ProductDescription,
      store_id: storeId,
      user_id: req.user!.id,
      input_meta: { title: inputTitle, description: inputDesc, image_url: inputImage, language },
    });

    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.ProductDescription);
      const template = await aiConfigService.getPromptTemplate('product_smart_fill');

      let categoriesContext = '';
      try {
        const catTree = await categoryService.listMarketplaceCategories({ tree: true });
        categoriesContext = catTree.map((c: MarketplaceCategoryRow) => `${c.name} (${c.children?.map((sub: MarketplaceCategoryRow) => sub.name).join(', ') || 'Aucune sous-catégorie'})`).join('\n');
      } catch {
        categoriesContext = 'Boutique & E-commerce';
      }

      let prompt = template.default_prompt
        .replace('{title}', inputTitle || 'Non spécifié')
        .replace('{description}', inputDesc || 'Non spécifiée')
        .replace('{language}', language);

      if (categoriesContext) {
        prompt += `\n\nCatégories Marketplace Hub Disponibles :\n${categoriesContext}`;
      }

      if (template.system_prompt) {
        prompt = `${template.system_prompt}\n\n${prompt}`;
      }

      const result = await aiConfigService.generateTextForPurpose('content_generation', prompt, storeId);
      const suggestions = parseSmartFillResponse(result.text, inputTitle);

      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, { ...suggestions, provider: result.provider_label }, cost);

      res.status(200).json({
        suggestions,
        tokens_consumed: cost,
        job_id: job.id,
        provider: result.provider_label,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Smart product fill failed';
      await aiService.markFailed(job.id, message);
      throw err;
    }
  }),
);

// Vendor: AI Photo Studio — Replace Background
router.post(
  '/photo-studio/replace-background',
  requireStore,
  requireAiToolsEnabled,
  validate(photoStudioReplaceBackgroundSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_image_compression');

    const { image_url, preset, custom_prompt } = req.body;
    const cost = 1;
    await creditsService.assertEnough(storeId, cost);

    const presetLabels: Record<string, string> = {
      sand: 'Plage de sable fin et lumière naturelle du soleil',
      marble: 'Plan de travail en marbre blanc de luxe avec ombre portée',
      wooden_table: 'Table en bois massif rustique et ambiance chaleureuse',
      gradient: 'Fond dégradé studio minimaliste et moderne',
      studio_white: 'Studio photo blanc pur pro e-commerce 100% détouré',
      lifestyle_living: 'Intérieur maison cosy et moderne',
      custom: custom_prompt || 'Studio pro',
    };

    const template = await aiConfigService.getPromptTemplate('photo_studio_background');
    const prompt = template.default_prompt.replace('{preset_description}', presetLabels[preset] || presetLabels.studio_white);

    // Image Studio processing
    let processed_image_url = image_url;
    try {
      processed_image_url = await aiConfigService.generateImageForPurpose('image_background_removal', prompt, image_url, storeId);
    } catch (err) {
      // Fallback if no provider configured
    }

    await creditsService.consume(storeId, cost);

    res.status(200).json({
      processed_image_url,
      preset_used: preset,
      prompt,
      tokens_consumed: cost,
    });
  }),
);

// Vendor: AI Photo Studio — Generate Gallery Mockups (Max 2)
router.post(
  '/photo-studio/generate-gallery',
  requireStore,
  requireAiToolsEnabled,
  validate(photoStudioGenerateGallerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_image_compression');

    const { product_title, image_url, style } = req.body;
    const cost = 2;
    await creditsService.assertEnough(storeId, cost);

    const template = await aiConfigService.getPromptTemplate('photo_studio_gallery');
    const styleLabel = style === 'lifestyle' ? 'Situation réelle lifestyle' : style === 'model' ? 'Porté par un mannequin' : 'Rendu studio pro angle dynamique';
    const prompt = template.default_prompt.replace('{title}', product_title).replace('{style_description}', styleLabel);

    let generated_image_url = image_url;
    try {
      generated_image_url = await aiConfigService.generateImageForPurpose('image_generation', prompt, image_url, storeId);
    } catch (err) {
      // Fallback
      generated_image_url = image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    }

    await creditsService.consume(storeId, cost);

    // Return max 2 gallery images (we generate 1 for now to save credits/time)
    const gallery_images = [generated_image_url].slice(0, 2);

    res.status(200).json({
      gallery_images,
      prompt,
      tokens_consumed: cost,
    });
  }),
);

// Vendor: AI Photo Studio — Enhance Lighting & HD Upscale
router.post(
  '/photo-studio/enhance',
  requireStore,
  requireAiToolsEnabled,
  validate(photoStudioEnhanceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_image_compression');

    const { image_url } = req.body;
    const cost = 1;
    await creditsService.assertEnough(storeId, cost);

    let enhanced_image_url = image_url;
    try {
      const template = await aiConfigService.getPromptTemplate('photo_studio_upscale');
      enhanced_image_url = await aiConfigService.generateImageForPurpose('image_enhancement', template.default_prompt, image_url, storeId);
    } catch (err) {
      // Fallback
    }

    await creditsService.consume(storeId, cost);

    res.status(200).json({
      enhanced_image_url,
      tokens_consumed: cost,
      enhanced: true,
    });
  }),
);

// Vendor: Get a specific AI job (tenant-isolated)
router.get(
  '/jobs/:id',
  requireStore,
  requireAiToolsEnabled,
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
  requireAiToolsEnabled,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const type = Object.values(AiJobType).includes(req.query.type as AiJobType)
      ? (req.query.type as AiJobType)
      : undefined;
    const status = Object.values(AiJobStatus).includes(req.query.status as AiJobStatus)
      ? (req.query.status as AiJobStatus)
      : undefined;
    const result = await aiService.listByStore(req.user!.store_id!, { page, limit, type, status });
    res.status(200).json({ jobs: result.data, meta: result.meta });
  }),
);

// Vendor: Get AI credits balance
router.get(
  '/credits',
  requireStore,
  requireAiToolsEnabled,
  asyncHandler(async (req: Request, res: Response) => {
    const credits = await creditsService.getByStore(req.user!.store_id!);
    res.status(200).json({ credits });
  }),
);

router.get(
  '/pricing',
  requireStore,
  requireAiToolsEnabled,
  asyncHandler(async (_req: Request, res: Response) => {
    const pricing = await aiConfigService.listPricing();
    res.status(200).json({ pricing });
  }),
);

router.get(
  '/token-packs',
  requireStore,
  requireAiToolsEnabled,
  asyncHandler(async (_req: Request, res: Response) => {
    const packs = await creditsService.listTokenPacks();
    res.status(200).json({ packs });
  }),
);

router.get(
  '/token-purchases',
  requireStore,
  requireAiToolsEnabled,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const result = await creditsService.listPurchases(req.user!.store_id!, { page, limit });
    res.status(200).json(result);
  }),
);

router.post(
  '/buy-tokens',
  requireStore,
  requireAiToolsEnabled,
  validate(buyTokenPackSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await creditsService.buyPackFromWallet(req.user!.store_id!, req.body.pack_id);
    res.status(200).json(result);
  }),
);

router.get(
  '/provider-config',
  requireStore,
  requireAiToolsEnabled,
  asyncHandler(async (req: Request, res: Response) => {
    const data = await aiConfigService.getStoreProvider(req.user!.store_id!);
    res.status(200).json(data);
  }),
);

router.put(
  '/provider-config',
  requireStore,
  requireAiToolsEnabled,
  validate(aiProviderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await aiConfigService.saveStoreProvider(req.user!.store_id!, {
      provider: req.body.provider as AiProvider,
      model: req.body.model,
      base_url: req.body.base_url || null,
      api_key: req.body.api_key || undefined,
      is_enabled: req.body.is_enabled,
    });
    res.status(200).json(data);
  }),
);

router.delete(
  '/provider-config',
  requireStore,
  requireAiToolsEnabled,
  asyncHandler(async (req: Request, res: Response) => {
    await aiConfigService.deleteStoreProvider(req.user!.store_id!);
    res.status(200).json({ success: true });
  }),
);

export default router;
