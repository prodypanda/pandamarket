import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { creditsService } from '../services/credits.service';
import { productService } from '../services/product.service';
import { storeService } from '../services/store.service';
import { subscriptionService } from '../services/subscription.service';
import { asyncHandler, validate, requireStore } from '../middlewares';
import { PdErrorCode, PdForbiddenError, PdNotFoundError, PdValidationError } from '../errors';
import { AiJobStatus, AiJobType } from '@pandamarket/types';
import { aiConfigService } from '../services/ai-config.service';
import type { AiProvider } from '../services/ai-config.service';
import { platformConfigService } from '../services/platform-config.service';
import { query } from '../db/pool';
import { categoryService, MarketplaceCategoryRow, StorefrontCategoryRow } from '../services/category.service';
import { logger } from '../utils/logger';

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
  prompt: z.string().trim().max(10000).optional(),
  raw_input: z.string().trim().max(10000).optional(),
  title: z.string().trim().max(300).optional(),
  description: z.string().trim().max(10000).optional(),
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

const categoryPickSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(300),
  description: z.string().trim().max(10000).optional(),
  brand: z.string().trim().max(200).optional(),
  attributes: z.union([z.record(z.any()), z.array(z.object({ key: z.string(), value: z.string() }))]).optional(),
  tags: z.array(z.string()).optional(),
  price: z.number().optional(),
  language: z.enum(['fr', 'ar', 'en']).optional(),
});

const batchCategoryPickSchema = z.object({
  product_ids: z.array(z.string().min(1)).min(1).max(50),
  apply_automatically: z.boolean().default(false),
  language: z.enum(['fr', 'ar', 'en']).optional(),
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

export interface SmartFillProductResult {
  suggested_title: string;
  suggested_description: string;
  suggested_price: number | null;
  suggested_hub_category_name: string;
  suggested_hub_subcategory_name: string;
  suggested_storefront_category: string;
  suggested_storefront_subcategory: string;
  suggested_tags: string[];
  suggested_attributes: Array<{ name: string; value: string }>;
  suggested_variants: Array<{ name: string; values: string[] }>;
  suggested_seo_title: string;
  suggested_seo_description: string;
}

function extractPriceHeuristic(text: string): number | null {
  const match = text.match(/(?:prix\s*[:=]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:dt|tnd|dinar|dinars|dtnt)\b/i) ||
                text.match(/(?:prix\s*[:=]\s*)(\d+(?:[.,]\d+)?)/i);
  if (match && match[1]) {
    const num = parseFloat(match[1].replace(',', '.'));
    if (Number.isFinite(num) && num > 0) return num;
  }
  return null;
}

function extractVariantsHeuristic(text: string): Array<{ name: string; values: string[] }> {
  const variants: Array<{ name: string; values: string[] }> = [];
  
  // Range of sizes: "taille 40 à 45" or "pointures 36 à 41"
  const rangeMatch = text.match(/(?:taille|pointure|pointures|tailles)\s*(?:de)?\s*(\d{2})\s*(?:à|a|-|to)\s*(\d{2})/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start > 0 && end >= start && end - start <= 15) {
      const values: string[] = [];
      for (let s = start; s <= end; s++) values.push(String(s));
      variants.push({ name: 'Pointure', values });
    }
  } else {
    // List of sizes: "tailles: S, M, L, XL"
    const sizeListMatch = text.match(/(?:tailles?|sizes?)\s*[:=]?\s*([SMLXL2-4]+(?:\s*[,/\-]\s*[SMLXL2-4]+)+)/i);
    if (sizeListMatch && sizeListMatch[1]) {
      const values = sizeListMatch[1].split(/[,/\-]/).map((v) => v.trim()).filter(Boolean);
      if (values.length > 0) variants.push({ name: 'Taille', values });
    }
  }

  // Colors: "couleurs: noir, blanc, rouge"
  const colorMatch = text.match(/(?:couleurs?|colors?)\s*[:=]?\s*([a-zA-ZÀ-ÿ]+(?:\s*[,/\-]\s*[a-zA-ZÀ-ÿ]+)+)/i);
  if (colorMatch && colorMatch[1]) {
    const values = colorMatch[1].split(/[,/\-]/).map((v) => v.trim()).filter((v) => v.length >= 2);
    if (values.length > 0) variants.push({ name: 'Couleur', values });
  }

  return variants;
}

function parseSmartFillResponse(text: string, rawInputText?: string): SmartFillProductResult {
  const heuristicPrice = extractPriceHeuristic(rawInputText || text);
  const heuristicVariants = extractVariantsHeuristic(rawInputText || text);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as Partial<{
      suggested_title: string;
      suggested_description: string;
      suggested_price: number | string | null;
      suggested_hub_category_name: string;
      suggested_hub_subcategory_name: string;
      suggested_storefront_category: string;
      suggested_storefront_subcategory: string;
      suggested_tags: string[] | string;
      suggested_attributes: Array<{ name: string; value: string }>;
      suggested_variants: Array<{ name: string; values: string[] }>;
      suggested_seo_title: string;
      suggested_seo_description: string;
    }>;

    const parsedPrice = parsed.suggested_price !== undefined && parsed.suggested_price !== null
      ? parseFloat(String(parsed.suggested_price))
      : null;
    const finalPrice = Number.isFinite(parsedPrice) && parsedPrice! > 0 ? parsedPrice : heuristicPrice;

    // Normalizing tags
    let tags: string[] = [];
    if (Array.isArray(parsed.suggested_tags)) {
      tags = parsed.suggested_tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof parsed.suggested_tags === 'string') {
      tags = parsed.suggested_tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Normalizing attributes
    let attributes: Array<{ name: string; value: string }> = [];
    if (Array.isArray(parsed.suggested_attributes)) {
      attributes = parsed.suggested_attributes
        .filter((a) => a && typeof a === 'object' && a.name && a.value)
        .map((a) => ({ name: String(a.name).trim(), value: String(a.value).trim() }));
    }

    // Normalizing variants
    let variants: Array<{ name: string; values: string[] }> = [];
    if (Array.isArray(parsed.suggested_variants) && parsed.suggested_variants.length > 0) {
      variants = parsed.suggested_variants
        .filter((v) => v && typeof v === 'object' && v.name && Array.isArray(v.values) && v.values.length > 0)
        .map((v) => ({ name: String(v.name).trim(), values: v.values.map(String).filter(Boolean) }));
    }
    if (variants.length === 0 && heuristicVariants.length > 0) {
      variants = heuristicVariants;
    }

    const title = String(parsed.suggested_title || rawInputText?.slice(0, 80) || 'Produit sans titre').slice(0, 180);

    return {
      suggested_title: title,
      suggested_description: String(parsed.suggested_description || `<p>${title}</p>`).slice(0, 8000),
      suggested_price: finalPrice,
      suggested_hub_category_name: String(parsed.suggested_hub_category_name || 'Général').slice(0, 100),
      suggested_hub_subcategory_name: String(parsed.suggested_hub_subcategory_name || 'Divers').slice(0, 100),
      suggested_storefront_category: String(parsed.suggested_storefront_category || 'Boutique').slice(0, 100),
      suggested_storefront_subcategory: String(parsed.suggested_storefront_subcategory || 'Général').slice(0, 100),
      suggested_tags: tags.slice(0, 15),
      suggested_attributes: attributes.slice(0, 10),
      suggested_variants: variants.slice(0, 3),
      suggested_seo_title: String(parsed.suggested_seo_title || `${title} | Meilleur Prix Tunisie`).slice(0, 70),
      suggested_seo_description: String(parsed.suggested_seo_description || `Découvrez ${title} au meilleur prix sur PandaMarket Tunisie. Livraison rapide et qualité garantie.`).slice(0, 160),
    };
  } catch {
    const title = String(rawInputText?.slice(0, 80) || 'Nouveau produit').slice(0, 180);
    return {
      suggested_title: title,
      suggested_description: `<p>${text || title}</p>`,
      suggested_price: heuristicPrice,
      suggested_hub_category_name: 'Général',
      suggested_hub_subcategory_name: 'Divers',
      suggested_storefront_category: 'Boutique',
      suggested_storefront_subcategory: 'Général',
      suggested_tags: ['nouveau', 'e-commerce', 'tunisie'],
      suggested_attributes: [],
      suggested_variants: heuristicVariants,
      suggested_seo_title: `${title} | Acheter en Tunisie`,
      suggested_seo_description: `Achetez ${title} avec livraison rapide partout en Tunisie sur PandaMarket.`,
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
    const systemPrompt = `You are an e-commerce landing page copywriter. Generate concise page builder copy in ${langName}. Return ONLY JSON: { "seo_title": string, "seo_description": string, "hero_title": string, "cta": string }. Keep SEO title under 70 chars and description under 160 chars.`;
    const userPrompt = `Page title: ${req.body.page_title || 'Untitled'}. Current SEO title: ${req.body.current_seo_title || 'none'}. Current SEO description: ${req.body.current_seo_description || 'none'}. Sections: ${outline}.`;
    const prompt = `${systemPrompt}\n\n${userPrompt}`;

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
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        prompt,
      },
    });
    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.PageCopy);
      const result = await aiConfigService.generateText(prompt, storeId);
      const suggestions = parsePageCopyResponse(result.text, fallbackTitle);
      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, { ...suggestions, provider: result.provider_label }, cost, {
        page_title: req.body.page_title || null,
        current_seo_title: req.body.current_seo_title || null,
        current_seo_description: req.body.current_seo_description || null,
        section_outline: req.body.section_outline || [],
        language,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        prompt,
      });
      res.status(200).json({ suggestions, tokens_consumed: cost, job_id: job.id, provider: result.provider_label });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI copy helper failed';
      await aiService.markFailed(job.id, message, {
        page_title: req.body.page_title || null,
        current_seo_title: req.body.current_seo_title || null,
        current_seo_description: req.body.current_seo_description || null,
        section_outline: req.body.section_outline || [],
        language,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        prompt,
      });
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

      let template = null;
      try {
        template = await aiConfigService.getPromptTemplate('product_description');
      } catch {
        // use default prompt if template fetching failed
      }

      let prompt = '';
      let systemPrompt = '';
      let userPrompt = '';
      if (template) {
        systemPrompt = template.system_prompt;
        userPrompt = template.default_prompt
          .replace(/{title}/g, req.body.title || 'Produit')
          .replace(/{category}/g, req.body.category || 'Non spécifiée')
          .replace(/{attributes}/g, attributes)
          .replace(/{current_description}/g, req.body.current_description || 'Aucune')
          .replace(/{language}/g, langName)
          .replace(/{tone}/g, tone);
        prompt = `${systemPrompt}\n\n${userPrompt}`;
      } else {
        systemPrompt = `Vous êtes un Copywriter Expert E-commerce et Merchandiser d'Élite. Votre rôle est de rédiger une description produit vendeuse, structurée et persuasive en ${langName}.

Consignes de format et de style :
- Langue : ${langName}
- Tonalité : ${tone} (adoptez un ton professionnel, crédible, séduisant sans exagération mensongère)

Structure HTML obligatoire :
- Utilisez EXCLUSIVEMENT les balises sémantiques <h3>, <p>, <strong>, <em>, <ul>, <li>.
- Rédigez une accroche percutante mettant en valeur le bénéfice clé.
- Détaillez les points forts et caractéristiques dans une liste à puces claire <ul><li>...</li></ul>.
- Fournissez un résumé condensé (summary) de 1 à 2 phrases pour les aperçus rapides.`;

        userPrompt = `Produit : ${req.body.title}
Catégorie : ${req.body.category || 'Non spécifiée'}
Attributs et spécifications : ${attributes}
Description brute actuelle : ${req.body.current_description || 'Aucune'}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "description_html": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "summary": "Résumé percutant en une phrase pour la vitrine"
}`;
        prompt = `${systemPrompt}\n\n${userPrompt}`;
      }

      const inputMetaUpdated = {
        product_id: req.body.product_id || null,
        title: req.body.title,
        current_description: req.body.current_description || null,
        category: req.body.category || null,
        attributes: req.body.attributes || [],
        language,
        tone,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        prompt,
      };

      const result = await aiConfigService.generateTextForPurpose('product_description', prompt, storeId);
      const description = parseDescriptionResponse(result.text);
      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, { ...description, provider: result.provider_label }, cost, inputMetaUpdated);
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
    const inputPrompt = req.body.prompt || req.body.raw_input || '';
    const inputTitle = req.body.title || '';
    const inputDesc = req.body.description || '';
    const inputImage = req.body.image_url || '';

    const effectiveRawInput = inputPrompt || [inputTitle, inputDesc].filter(Boolean).join(' - ');

    if (!effectiveRawInput && !inputImage) {
      throw new PdValidationError('Veuillez fournir une description brute, un prompt libre, un titre ou une image.');
    }

    const job = await aiService.startInlineJob({
      type: AiJobType.ProductDescription,
      store_id: storeId,
      user_id: req.user!.id,
      input_meta: { prompt: inputPrompt, title: inputTitle, description: inputDesc, image_url: inputImage, language },
    });

    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.ProductDescription);
      let categoriesContext = '';
      try {
        const catTree = await categoryService.listMarketplaceCategories({ tree: true });
        categoriesContext = catTree.map((c: MarketplaceCategoryRow) => `${c.name} (${c.children?.map((sub: MarketplaceCategoryRow) => sub.name).join(', ') || 'Général'})`).join('\n');
      } catch {
        categoriesContext = 'Mode, Électronique, Maison, Beauté, Sport, Artisanat';
      }

      const systemPrompt = `Vous êtes l'Assistant IA Expert en E-commerce et Merchandising de PandaMarket Tunisie.
Votre mission : transformer n'importe quel texte brut, message WhatsApp de fournisseur, note rapide ou fiche produit en une fiche catalogue e-commerce parfaite, séduisante et complète.
Vous devez identifier : le titre commercial vendeur, la description HTML structurée (<p>, <strong>, <ul>, <li>, <h3>), le prix en Dinars Tunisiens (TND), les catégories adaptées, les caractéristiques techniques clés (matière, origine, usage...), les déclinaisons/variantes (tailles, couleurs...) et les balises SEO.`;

      const userPrompt = `Analysez attentivement ce texte brut / message fournisseur et générez la fiche produit e-commerce complète en langue: ${language}.

Texte brut / Prompt vendeur :
"${effectiveRawInput || 'Produit e-commerce à créer'}"

${inputImage ? `Image fournie: ${inputImage}\n` : ''}

Catégories Marketplace Hub disponibles :
${categoriesContext}

RÉPONDEZ STRICTEMENT PAR UN OBJET JSON VALIDE AVEC CETTE STRUCTURE EXACTE :
{
  "suggested_title": "Titre commercial accrocheur et professionnel",
  "suggested_description": "<p>Introduction captivante...</p><h3>Points Forts</h3><ul><li>Avantage 1</li><li>Avantage 2</li></ul><h3>Caractéristiques</h3><ul><li>Spécification 1</li></ul>",
  "suggested_price": 120.0,
  "suggested_hub_category_name": "Nom d'une catégorie du Hub ci-dessus",
  "suggested_hub_subcategory_name": "Nom d'une sous-catégorie",
  "suggested_storefront_category": "Nom recommandé pour la vitrine du vendeur",
  "suggested_storefront_subcategory": "Sous-catégorie vitrine",
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggested_attributes": [
    { "name": "Matière", "value": "Ex: Coton / Cuir / Synthétique" },
    { "name": "Origine", "value": "Ex: Tunisie / Italie / Import" }
  ],
  "suggested_variants": [
    { "name": "Pointure", "values": ["40", "41", "42", "43", "44", "45"] }
  ],
  "suggested_seo_title": "Titre SEO optimisé (50-60 car.)",
  "suggested_seo_description": "Méta description SEO vendeuse (130-160 car.)"
}`;

      const prompt = `${systemPrompt}\n\n${userPrompt}`;

      const inputMetaUpdated = {
        prompt: inputPrompt,
        title: inputTitle,
        description: inputDesc,
        image_url: inputImage,
        language,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        full_prompt: prompt,
      };

      const result = await aiConfigService.generateTextForPurpose('content_generation', prompt, storeId);
      const suggestions = parseSmartFillResponse(result.text, effectiveRawInput);

      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, { ...suggestions, provider: result.provider_label }, cost, inputMetaUpdated);

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

// Helper: Build breadcrumb path for Marketplace Categories
function buildMarketplaceBreadcrumb(categoryId: string, flatCategories: MarketplaceCategoryRow[]): string {
  const catMap = new Map<string, MarketplaceCategoryRow>(flatCategories.map((c) => [c.id, c]));
  const path: string[] = [];
  let curr = catMap.get(categoryId);
  const visited = new Set<string>();
  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    path.unshift(curr.name);
    curr = curr.parent_id ? catMap.get(curr.parent_id) : undefined;
  }
  return path.join(' › ') || '';
}

// Helper: Build breadcrumb path for Storefront Categories
function buildStorefrontBreadcrumb(item: { id?: string | null; name: string; parent_id?: string | null }, storefrontCategories: StorefrontCategoryRow[]): string {
  const catMap = new Map<string, StorefrontCategoryRow>(storefrontCategories.map((c) => [c.id, c]));
  const path: string[] = [item.name];
  let parentId = item.parent_id || (item.id ? catMap.get(item.id)?.parent_id : null);
  const visited = new Set<string>();
  while (parentId && catMap.has(parentId) && !visited.has(parentId)) {
    visited.add(parentId);
    const parentCat = catMap.get(parentId)!;
    path.unshift(parentCat.name);
    parentId = parentCat.parent_id;
  }
  return path.join(' › ');
}

// Vendor: AI Category Classification & Auto-Pick (Interactive Top-3 Suggestions)
router.post(
  '/category-pick',
  requireStore,
  requireAiToolsEnabled,
  validate(categoryPickSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'en';
    const langName = { fr: 'French', ar: 'Arabic', en: 'English' }[language];
    const title = req.body.title;
    const description = req.body.description || '';
    const brand = req.body.brand || '';
    const tags = Array.isArray(req.body.tags) ? req.body.tags.join(', ') : '';
    const price = typeof req.body.price === 'number' ? `${req.body.price} TND` : '';
    let attributesStr = '';
    if (req.body.attributes) {
      if (Array.isArray(req.body.attributes)) {
        attributesStr = req.body.attributes.map((a: any) => `${a.key}: ${a.value}`).join(', ');
      } else if (typeof req.body.attributes === 'object') {
        attributesStr = Object.entries(req.body.attributes).map(([k, v]) => `${k}: ${v}`).join(', ');
      }
    }

    // Load marketplace categories tree
    let categoriesContext = '';
    let flatCategories: MarketplaceCategoryRow[] = [];
    try {
      flatCategories = await categoryService.listPublicMarketplaceCategories({ locale: language });
      const catTree = await categoryService.listPublicMarketplaceCategories({ tree: true, locale: language });

      const formatTree = (nodes: MarketplaceCategoryRow[], prefix = ''): string[] => {
        const resultLines: string[] = [];
        for (const n of nodes) {
          resultLines.push(`${prefix}- ${n.name} (id: "${n.id}")`);
          if (n.children && n.children.length > 0) {
            resultLines.push(...formatTree(n.children, `${prefix}  `));
          }
        }
        return resultLines;
      };
      categoriesContext = formatTree(catTree).join('\n');
    } catch (catErr) {
      logger.warn({ err: catErr }, 'Failed to load public marketplace categories tree for prompt');
    }

    if (!categoriesContext) {
      categoriesContext = flatCategories.map((c) => `- ${c.name} (id: "${c.id}")`).join('\n') || 'Mode, Électronique, Maison, Beauté, Sport, Artisanat';
    }

    // Load storefront categories for this seller
    let storefrontCategories: StorefrontCategoryRow[] = [];
    try {
      storefrontCategories = await categoryService.listStorefrontCategories(storeId);
    } catch {}

    const formatStorefrontTree = (cats: StorefrontCategoryRow[]): string => {
      const roots = cats.filter((c) => !c.parent_id && !c.is_default);
      const childrenMap = new Map<string, StorefrontCategoryRow[]>();
      cats.forEach((c) => {
        if (c.parent_id) {
          const list = childrenMap.get(c.parent_id) || [];
          list.push(c);
          childrenMap.set(c.parent_id, list);
        }
      });

      if (roots.length === 0 && cats.filter((c) => !c.is_default).length === 0) {
        return 'Aucune catégorie personnalisée dans la boutique';
      }

      const lines: string[] = [];
      for (const root of roots) {
        lines.push(`- ${root.name} (id: "${root.id}")`);
        const subList = childrenMap.get(root.id) || [];
        for (const sub of subList) {
          lines.push(`  └─ ${sub.name} (id: "${sub.id}")`);
        }
      }
      return lines.join('\n');
    };

    const storefrontCatNames = formatStorefrontTree(storefrontCategories);

    const systemPrompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.
Votre mission est d'analyser le produit soumis (titre, description, marque, attributs, tags) et de proposer les 3 MEILLEURES OPTIONS DE CLASSIFICATION (Top 3 Candidates classées par pertinence).

Pour chaque candidat :
1. 🌐 TAXONOMIE MARKETPLACE HUB :
   - Choisissez la catégorie ou sous-catégorie la plus spécifique parmi les catégories PandaMarket Hub fournies.
   - Renvoyez son "marketplace_category_id" exact et son "marketplace_category_name" exact.

2. 🏪 TAXONOMIE VITRINE BOUTIQUE :
   - Examinez les catégories vitrine existantes du vendeur. Si l'une correspond fidèlement, réutilisez son nom et son id.
   - Sinon, créez un nom de catégorie vitrine sur-mesure, élégant, attractif et spécifique au créneau du produit (ex: "Sneakers & Baskets Sportswear", "Huiles d'Olive & Terroir", "Céramiques & Poteries").
   - Si le vendeur possède déjà une catégorie parente pertinente (ex: "Chaussures" ou "Maison"), spécifiez "storefront_parent_category_id".
   - Fournissez également les traductions ("name_fr", "name_ar", "name_en"), une icône suggérée ("icon": Lucide icon name comme "ShoppingBag", "Footprints", "Shirt", "Sparkles", "Utensils", etc.), un "seo_title" et une "seo_description".
   - Donnez une explication concise du choix dans "reason".`;

    const userPrompt = `📦 PRODUIT À CLASSIFIER :
- Titre : ${title}
- Description : ${description || 'Non fournie'}
- Marque : ${brand || 'Non spécifiée'}
- Attributs & Spécifications : ${attributesStr || 'Non spécifiés'}
- Tags : ${tags || 'Aucun'}
- Prix indicatif : ${price || 'Non spécifié'}
- Langue : ${langName}

Catégories Marketplace Hub disponibles (choix contraint avec ID) :
${categoriesContext}

Catégories Vitrine Boutique existantes du vendeur :
${storefrontCatNames}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS TEXTE ADDITIONNEL :
{
  "candidates": [
    {
      "rank": 1,
      "marketplace_category_id": "id exact de la catégorie Hub choisie",
      "marketplace_category_name": "Nom exact de la catégorie Hub",
      "storefront_category_name": "Nom de la catégorie vitrine (existante ou sur-mesure)",
      "storefront_category_id": "id si catégorie vitrine existante, sinon null",
      "storefront_parent_category_id": "id catégorie parente existante si applicable, sinon null",
      "name_fr": "Nom français",
      "name_ar": "الاسم بالعربية",
      "name_en": "English name",
      "icon": "Footprints",
      "seo_title": "Titre SEO",
      "seo_description": "Description SEO",
      "confidence": 0.96,
      "reason": "Explication courte du choix NLP"
    }
  ]
}`;

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const inputMetaUpdated = {
      title,
      description,
      brand,
      attributes: attributesStr,
      tags,
      price,
      language,
      system_prompt: systemPrompt,
      user_prompt: userPrompt,
      prompt,
    };

    const job = await aiService.startInlineJob({
      type: AiJobType.CategoryClassification,
      store_id: storeId,
      user_id: req.user!.id,
      input_meta: inputMetaUpdated,
    });

    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.CategoryClassification);
      let canDeductTokens = false;
      try {
        await creditsService.assertEnough(storeId, cost);
        canDeductTokens = true;
      } catch {
        canDeductTokens = false;
      }

      const result = await aiConfigService.generateTextForPurpose('category_classification', prompt, storeId);

      // Parse AI response
      let rawCandidates: any[] = [];
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
            rawCandidates = parsed.candidates;
          } else if (parsed.marketplace_category_id || parsed.marketplace_category_name) {
            rawCandidates = [parsed];
          }
        }
      } catch (parseErr) {
        logger.warn({ text: result.text, err: parseErr }, 'Failed to parse AI category classification JSON');
      }

      // If empty, use rule-based fallback candidates
      if (rawCandidates.length === 0) {
        rawCandidates = [
          {
            rank: 1,
            marketplace_category_id: flatCategories[0]?.id || 'cat_market_uncategorized',
            marketplace_category_name: flatCategories[0]?.name || 'Non catégorisé',
            storefront_category_name: title.slice(0, 40) || 'Collection Produit',
            confidence: 0.70,
            reason: 'Classification automatique basée sur les mots-clés du produit.',
          },
        ];
      }

      // Format and resolve candidates
      const resolvedCandidates = rawCandidates.slice(0, 3).map((raw, idx) => {
        // 1. Resolve marketplace category
        let mpCat = flatCategories.find((c) => c.id === raw.marketplace_category_id);
        if (!mpCat && raw.marketplace_category_name) {
          const normTarget = raw.marketplace_category_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          mpCat = flatCategories.find((c) => c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normTarget);
        }
        if (!mpCat) {
          mpCat = flatCategories[0] || { id: 'cat_market_uncategorized', name: 'Non catégorisé' } as any;
        }

        const mpPath = buildMarketplaceBreadcrumb(mpCat.id, flatCategories);

        // 2. Resolve storefront category & parent
        let sfMatch: StorefrontCategoryRow | undefined;
        const sfName = (raw.storefront_category_name || raw.name_fr || mpCat.name).trim();
        const normSfTarget = sfName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (raw.storefront_category_id) {
          const byId = storefrontCategories.find((c) => c.id === raw.storefront_category_id && !c.is_default);
          if (byId) {
            const normById = byId.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (normById === normSfTarget || normById.includes(normSfTarget) || normSfTarget.includes(normById)) {
              sfMatch = byId;
            }
          }
        }

        if (!sfMatch && sfName) {
          sfMatch = storefrontCategories.find((c) => {
            if (c.is_default) return false;
            const normName = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normName === normSfTarget || normName.includes(normSfTarget) || normSfTarget.includes(normName);
          });
        }

        const sfParentName = (raw.storefront_parent_name || raw.parent_name_fr || '').trim();
        let sfParentId = raw.storefront_parent_category_id || raw.storefront_parent_id || (sfMatch ? sfMatch.parent_id : null);
        let parentMatch = sfParentId ? storefrontCategories.find((c) => c.id === sfParentId && !c.is_default) : undefined;
        if (!parentMatch && sfParentName) {
          const normParentTarget = sfParentName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          parentMatch = storefrontCategories.find((c) => {
            if (c.is_default) return false;
            const normName = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normName === normParentTarget || normName.includes(normParentTarget) || normParentTarget.includes(normName);
          });
        }

        const resolvedParentName = parentMatch ? parentMatch.name : (sfParentName || null);
        const resolvedParentId = parentMatch ? parentMatch.id : null;

        let sfPath = '';
        if (resolvedParentName && sfName && resolvedParentName !== sfName) {
          sfPath = `${resolvedParentName} › ${sfMatch?.name || sfName}`;
        } else {
          sfPath = buildStorefrontBreadcrumb(
            { id: sfMatch?.id, name: sfName, parent_id: resolvedParentId },
            storefrontCategories,
          ) || sfName;
        }

        return {
          rank: idx + 1,
          marketplace_category_id: mpCat.id,
          marketplace_category_name: mpCat.name,
          marketplace_category_path: mpPath || mpCat.name,
          storefront_category_name: sfMatch ? sfMatch.name : sfName,
          storefront_category_id: sfMatch ? sfMatch.id : null,
          storefront_parent_id: resolvedParentId,
          storefront_parent_name: resolvedParentName,
          storefront_category_path: sfPath,
          multilingual: {
            name_fr: raw.name_fr || sfName,
            name_ar: raw.name_ar || null,
            name_en: raw.name_en || null,
          },
          parent_multilingual: {
            name_fr: raw.parent_name_fr || resolvedParentName,
            name_ar: raw.parent_name_ar || null,
            name_en: raw.parent_name_en || null,
          },
          icon: raw.icon || 'Tag',
          seo_title: raw.seo_title || `${sfName} | Boutique`,
          seo_description: raw.seo_description || `Découvrez nos articles dans la catégorie ${sfName}.`,
          is_existing_storefront: Boolean(sfMatch),
          confidence: typeof raw.confidence === 'number' ? Math.min(0.99, Math.max(0.4, raw.confidence)) : 0.85 - idx * 0.08,
          reason: raw.reason || `Classification recommandée pour '${mpCat.name}'.`,
        };
      });

      const topPrimary = resolvedCandidates[0];
      const tokensConsumed = canDeductTokens ? cost : 0;
      if (canDeductTokens && cost > 0) {
        await creditsService.consume(storeId, cost);
      }

      await aiService.markCompleted(
        job.id,
        {
          candidates: resolvedCandidates,
          marketplace_category_id: topPrimary.marketplace_category_id,
          marketplace_category_name: topPrimary.marketplace_category_name,
          storefront_category_id: topPrimary.storefront_category_id,
          storefront_category_name: topPrimary.storefront_category_name,
          storefront_parent_id: topPrimary.storefront_parent_id,
          storefront_parent_name: topPrimary.storefront_parent_name,
          confidence: topPrimary.confidence,
          provider: result.provider_label,
        },
        tokensConsumed,
        inputMetaUpdated,
      );

      res.status(200).json({
        candidates: resolvedCandidates,
        // Backward-compatible fields
        marketplace_category_id: topPrimary.marketplace_category_id,
        marketplace_category_name: topPrimary.marketplace_category_name,
        marketplace_category_path: topPrimary.marketplace_category_path,
        storefront_category_id: topPrimary.storefront_category_id,
        storefront_category_name: topPrimary.storefront_category_name,
        storefront_parent_id: topPrimary.storefront_parent_id,
        storefront_parent_name: topPrimary.storefront_parent_name,
        storefront_category_path: topPrimary.storefront_category_path,
        confidence: topPrimary.confidence,
        tokens_consumed: tokensConsumed,
        job_id: job.id,
        provider: result.provider_label,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI category classification failed';
      await aiService.markFailed(job.id, message, inputMetaUpdated);
      throw err;
    }
  }),
);

// Vendor: AI Batch Category Classification for multiple selected products
router.post(
  '/category-pick-batch',
  requireStore,
  requireAiToolsEnabled,
  validate(batchCategoryPickSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    const productIds: string[] = req.body.product_ids;
    const applyAutomatically = Boolean(req.body.apply_automatically);
    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'en';

    if (!productIds || productIds.length === 0) {
      throw new PdValidationError('No products specified for batch categorization');
    }

    const { rows: products } = await query<{
      id: string;
      title: string;
      description: string | null;
      brand: string | null;
      tags: string[] | null;
      price: string;
      marketplace_category_id: string | null;
      storefront_category_id: string | null;
    }>(
      `SELECT id, title, description, brand, tags, price, marketplace_category_id, storefront_category_id
       FROM pd_product
       WHERE store_id = $1 AND id = ANY($2)`,
      [storeId, productIds],
    );

    if (products.length === 0) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'No matching products found');
    }

    // Load categories
    const flatMarketplace = await categoryService.listPublicMarketplaceCategories({ locale: language });
    const storefrontCategories = await categoryService.listStorefrontCategories(storeId);

    const costPerItem = await aiConfigService.getFeaturePrice(AiJobType.CategoryClassification);
    const totalCost = costPerItem * products.length;
    let canDeductTokens = false;
    try {
      await creditsService.assertEnough(storeId, totalCost);
      canDeductTokens = true;
    } catch {
      canDeductTokens = false;
    }

    const results: any[] = [];
    let processedCount = 0;

    for (const prod of products) {
      try {
        const prompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.
📦 PRODUIT À CLASSIFIER :
- Titre : ${prod.title}
- Description : ${prod.description || ''}
- Marque : ${prod.brand || ''}
- Attributs & Spécifications : ${(prod as any).attributes ? (typeof (prod as any).attributes === 'string' ? (prod as any).attributes : JSON.stringify((prod as any).attributes)) : ''}
- Tags : ${Array.isArray(prod.tags) ? prod.tags.join(', ') : (prod.tags || '')}
- Langue : ${language}

Catégories Marketplace Hub disponibles (choix contraint avec ID) :
${flatMarketplace.map((c) => `- ${c.name} (id: "${c.id}")`).join('\n')}

Catégories Vitrine Boutique existantes du vendeur :
${storefrontCategories.map((c) => `- ${c.name} (id: "${c.id}")`).join('\n')}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS TEXTE ADDITIONNEL :
{
  "candidates": []
}`;

        const genRes = await aiConfigService.generateTextForPurpose('category_classification', prompt, storeId);
        let parsed: any = {};
        try {
          parsed = JSON.parse(genRes.text);
        } catch {
          parsed = {};
        }

        const topCandidate = Array.isArray(parsed.candidates) && parsed.candidates[0] ? parsed.candidates[0] : null;
        let bestMp = topCandidate ? flatMarketplace.find((c) => c.id === topCandidate.marketplace_category_id) : undefined;
        if (!bestMp && topCandidate?.marketplace_category_name) {
          const normTarget = topCandidate.marketplace_category_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          bestMp = flatMarketplace.find((c) => c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normTarget);
        }
        if (!bestMp) {
          bestMp = flatMarketplace[0] || { id: 'cat_market_uncategorized', name: 'Non catégorisé' } as any;
        }

        let sfName = (topCandidate?.storefront_category_name || topCandidate?.name_fr || bestMp.name).trim();
        const normSfTarget = sfName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let matchedSf: StorefrontCategoryRow | undefined;
        if (topCandidate?.storefront_category_id) {
          const byId = storefrontCategories.find((c) => c.id === topCandidate.storefront_category_id && !c.is_default);
          if (byId) {
            const normById = byId.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (normById === normSfTarget || normById.includes(normSfTarget) || normSfTarget.includes(normById)) {
              matchedSf = byId;
            }
          }
        }

        if (!matchedSf) {
          matchedSf = storefrontCategories.find((s) => {
            if (s.is_default) return false;
            const normSf = s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normSf === normSfTarget || normSf.includes(normSfTarget) || normSfTarget.includes(normSf);
          });
        }

        let sfId = matchedSf ? matchedSf.id : null;
        if (matchedSf) {
          sfName = matchedSf.name;
        }
        let sfParentId = matchedSf ? matchedSf.parent_id : null;

        if (applyAutomatically) {
          if (!sfId) {
            try {
              const newCat = await categoryService.createStorefrontCategory(storeId, {
                name: sfName,
                name_fr: sfName,
                position: 10,
              });
              sfId = newCat.id;
              sfName = newCat.name;
            } catch {}
          }

          await query(
            `UPDATE pd_product
             SET marketplace_category_id = $1,
                 storefront_category_id = $2,
                 category = $3,
                 updated_at = NOW()
             WHERE id = $4 AND store_id = $5`,
            [bestMp.id, sfId, sfName, prod.id, storeId],
          );
        }

        results.push({
          product_id: prod.id,
          title: prod.title,
          status: 'success',
          previous_marketplace_category_id: prod.marketplace_category_id,
          previous_storefront_category_id: prod.storefront_category_id,
          suggested_marketplace_category_id: bestMp.id,
          suggested_marketplace_category_name: bestMp.name,
          suggested_marketplace_category_path: buildMarketplaceBreadcrumb(bestMp.id, flatMarketplace),
          suggested_storefront_category_name: sfName,
          suggested_storefront_category_id: sfId,
          suggested_storefront_parent_id: sfParentId,
          confidence: topCandidate ? topCandidate.confidence : 0.70,
          reason: topCandidate ? topCandidate.reason : 'Recommandation globale par défaut.',
          applied: applyAutomatically,
        });
        processedCount++;
      } catch (prodErr) {
        results.push({
          product_id: prod.id,
          title: prod.title,
          status: 'failed',
          error: prodErr instanceof Error ? prodErr.message : 'Failed to categorize',
          applied: false,
        });
      }
    }

    const tokensConsumed = canDeductTokens ? costPerItem * processedCount : 0;
    if (canDeductTokens && tokensConsumed > 0) {
      await creditsService.consume(storeId, tokensConsumed);
    }

    res.status(200).json({
      total_requested: products.length,
      total_processed: processedCount,
      tokens_consumed: tokensConsumed,
      results,
    });
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
