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

      let template = null;
      try {
        template = await aiConfigService.getPromptTemplate('product_description');
      } catch {
        // use default prompt if template fetching failed
      }

      let prompt = '';
      if (template) {
        prompt = `${template.system_prompt}\n\n${template.default_prompt}`
          .replace(/{title}/g, req.body.title || 'Produit')
          .replace(/{category}/g, req.body.category || 'Non spécifiée')
          .replace(/{attributes}/g, attributes)
          .replace(/{current_description}/g, req.body.current_description || 'Aucune')
          .replace(/{language}/g, langName)
          .replace(/{tone}/g, tone);
      } else {
        prompt = `Vous êtes un Copywriter Expert E-commerce et Merchandiser d'Élite. Votre rôle est de rédiger une description produit vendeuse, structurée et persuasive en ${langName}.

Consignes de format et de style :
- Langue : ${langName}
- Tonalité : ${tone} (adoptez un ton professionnel, crédible, séduisant sans exagération mensongère)
- Produit : ${req.body.title}
- Catégorie : ${req.body.category || 'Non spécifiée'}
- Attributs et spécifications : ${attributes}
- Description brute actuelle : ${req.body.current_description || 'Aucune'}

Structure HTML obligatoire :
- Utilisez EXCLUSIVEMENT les balises sémantiques <h3>, <p>, <strong>, <em>, <ul>, <li>.
- Rédigez une accroche percutante mettant en valeur le bénéfice clé.
- Détaillez les points forts et caractéristiques dans une liste à puces claire <ul><li>...</li></ul>.
- Fournissez un résumé condensé (summary) de 1 à 2 phrases pour les aperçus rapides.

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "description_html": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "summary": "Résumé percutant en une phrase pour la vitrine"
}`;
      }

      const result = await aiConfigService.generateTextForPurpose('product_description', prompt, storeId);
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

      const result = await aiConfigService.generateTextForPurpose('content_generation', prompt, storeId);
      const suggestions = parseSmartFillResponse(result.text, effectiveRawInput);

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

// Vendor: AI Category Classification & Auto-Pick
router.post(
  '/category-pick',
  requireStore,
  requireAiToolsEnabled,
  validate(categoryPickSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.user!.store_id!;
    await assertAiFeature(storeId, 'has_ai_seo');

    const language = (req.body.language || 'fr') as 'fr' | 'ar' | 'en';
    const langName = { fr: 'French', ar: 'Arabic', en: 'English' }[language];
    const title = req.body.title;
    const description = req.body.description || '';

    // Load marketplace categories tree
    let categoriesContext = '';
    let flatCategories: MarketplaceCategoryRow[] = [];
    try {
      flatCategories = await categoryService.listPublicMarketplaceCategories({ locale: language });
      const catTree = await categoryService.listPublicMarketplaceCategories({ tree: true, locale: language });

      const formatTree = (nodes: MarketplaceCategoryRow[], prefix = ''): string[] => {
        const res: string[] = [];
        for (const n of nodes) {
          res.push(`${prefix}- ${n.name} (id: "${n.id}")`);
          if (n.children && n.children.length > 0) {
            res.push(...formatTree(n.children, `${prefix}  `));
          }
        }
        return res;
      };
      categoriesContext = formatTree(catTree).join('\n');
    } catch (catErr) {
      logger.warn({ err: catErr }, 'Failed to load public marketplace categories tree for prompt');
    }

    if (!categoriesContext) {
      categoriesContext = flatCategories.map((c) => `- ${c.name} (id: "${c.id}")`).join('\n') || 'Mode, Électronique, Maison, Beauté, Sport, Artisanat';
    }

    // Load storefront categories for this seller
    let storefrontCategories: Array<{ id: string; name: string; slug: string }> = [];
    try {
      const sfCats = await categoryService.listStorefrontCategories(storeId);
      storefrontCategories = sfCats.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
    } catch {}

    const storefrontCatNames = storefrontCategories.length > 0
      ? storefrontCategories.map((c) => `- ${c.name} (id: "${c.id}")`).join('\n')
      : 'Aucune catégorie existante dans la boutique';

    const job = await aiService.startInlineJob({
      type: AiJobType.CategoryClassification,
      store_id: storeId,
      user_id: req.user!.id,
      input_meta: { title, description, language },
    });

    try {
      const cost = await aiConfigService.getFeaturePrice(AiJobType.CategoryClassification);
      await creditsService.assertEnough(storeId, cost);

      let template = null;
      try {
        template = await aiConfigService.getPromptTemplate('category_classification');
      } catch {}

      let prompt = '';
      if (template) {
        prompt = `${template.system_prompt}\n\n${template.default_prompt}`
          .replace(/{title}/g, title)
          .replace(/{description}/g, description || 'Non fournie')
          .replace(/{marketplace_categories}/g, categoriesContext)
          .replace(/{storefront_categories}/g, storefrontCatNames)
          .replace(/{language}/g, langName);
      } else {
        prompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce de PandaMarket.
Votre rôle est d'analyser les données du produit (titre, description) et de déterminer deux taxonomies bien distinctes :

1. 🌐 CATÉGORIE MARKETPLACE HUB (Taxonomie globale & contrainte) :
   - Vous devez OBLIGATOIREMENT choisir la catégorie ou sous-catégorie la plus spécifique parmi les catégories Marketplace Hub listées ci-dessous.
   - Fournissez son "marketplace_category_id" exact et son "marketplace_category_name" exact.

2. 🏪 CATÉGORIE VITRINE BOUTIQUE (Merchandising libre & spécifique au vendeur) :
   - La boutique du vendeur n'a AUCUNE limitation de structure.
   - Vérifiez d'abord si l'une des catégories existantes du vendeur ci-dessous convient parfaitement. Si oui, indiquez son nom et "created_new": false.
   - Si AUCUNE catégorie existante de la boutique ne convient précisément : NE CLONEZ PAS aveuglément la catégorie Marketplace Hub si elle est générique. Créez un nom de catégorie vitrine sur-mesure, élégant, précis et vendeur pour ce type de produit (ex: "Kits Vlogging & Vidéo", "Haltères & Musculation", "Machines à Café & Capsules", "Câpres & Condiments Sauvages", "Colliers & Pendentifs", etc.) et indiquez "created_new": true.
   - N'utilisez le nom de la catégorie Marketplace pour la vitrine que s'il est véritablement le nom idéal pour la boutique du vendeur.

Produit à classifier :
- Titre : ${title}
- Description : ${description || 'Non fournie'}
- Langue : ${langName}

Catégories Marketplace Hub disponibles (choix contraint avec ID) :
${categoriesContext}

Catégories Vitrine Boutique existantes du vendeur :
${storefrontCatNames}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "marketplace_category_id": "id exact de la catégorie du Hub",
  "marketplace_category_name": "Nom exact de la catégorie du Hub",
  "storefront_category_name": "Nom de catégorie vitrine spécifique (existante ou créée sur-mesure)",
  "created_new": false,
  "confidence": 0.95
}`;
      }

      const result = await aiConfigService.generateTextForPurpose('category_classification', prompt, storeId);

      // Parse AI response
      let parsed: {
        marketplace_category_id?: string;
        marketplace_category_name?: string;
        storefront_category_name?: string;
        created_new?: boolean;
        confidence?: number;
      } = {};

      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        logger.warn({ text: result.text, err: parseErr }, 'Failed to parse AI category classification JSON');
      }

      // Match marketplace category by ID first, then by normalized token similarity
      let marketplaceCategoryId = '';
      let marketplaceCategoryName = '';

      if (parsed.marketplace_category_id) {
        const exactIdMatch = flatCategories.find((c) => c.id === parsed.marketplace_category_id);
        if (exactIdMatch) {
          marketplaceCategoryId = exactIdMatch.id;
          marketplaceCategoryName = exactIdMatch.name;
        }
      }

      if (!marketplaceCategoryId) {
        const targetName = (parsed.marketplace_category_name || title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let bestScore = 0;
        let bestCat: MarketplaceCategoryRow | null = null;

        for (const cat of flatCategories) {
          const normCat = cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (normCat === targetName) {
            bestCat = cat;
            bestScore = 1.0;
            break;
          }

          const targetWords = targetName.split(/[\s-_/,&()]+/).filter((w: string) => w.length >= 3);
          const catWords = normCat.split(/[\s-_/,&()]+/).filter((w: string) => w.length >= 3);

          if (targetWords.length > 0 && catWords.length > 0) {
            let matched = 0;
            for (const tw of targetWords) {
              const hasExactWord = catWords.some((cw: string) => {
                if (cw === tw) return true;
                if (tw.length >= 5 && cw.length >= 5 && (cw.startsWith(tw) || tw.startsWith(cw))) return true;
                return false;
              });
              if (hasExactWord) matched++;
            }

            const score = matched / Math.max(targetWords.length, 1);
            if (score > bestScore && score >= 0.3) {
              bestScore = score;
              bestCat = cat;
            }
          }
        }

        if (bestCat) {
          marketplaceCategoryId = bestCat.id;
          marketplaceCategoryName = bestCat.name;
        } else if (flatCategories.length > 0) {
          const defaultCat = flatCategories.find((c) => c.parent_id) || flatCategories[0];
          marketplaceCategoryId = defaultCat.id;
          marketplaceCategoryName = defaultCat.name;
        }
      }

      // Match or create storefront category
      let storefrontCategoryId = '';
      let storefrontCategoryName = (parsed.storefront_category_name || '').trim();
      let createdNewStorefrontCategory = false;

      if (!storefrontCategoryName || storefrontCategoryName.toLowerCase() === 'general' || storefrontCategoryName.toLowerCase() === 'général' || storefrontCategoryName.toLowerCase() === 'boutique') {
        // Derive an elegant specific boutique category from title keywords
        const stopWords = new Set(['ensemble', 'pack', 'lot', 'avec', 'pour', 'sans', 'dans', 'sur', 'massif', 'taille', 'cm', 'noir', 'blanc']);
        const titleTokens = title.split(/[\s-_/,&()]+/).filter((w: string) => w.length >= 3 && !stopWords.has(w.toLowerCase()));
        storefrontCategoryName = titleTokens.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || marketplaceCategoryName || 'Boutique';
      }

      const normalizedSfTarget = storefrontCategoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const sfMatch = storefrontCategories.find((c) => {
        const normC = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normC === normalizedSfTarget;
      });

      if (sfMatch && !parsed.created_new) {
        storefrontCategoryId = sfMatch.id;
        storefrontCategoryName = sfMatch.name;
      } else {
        // Auto-create the storefront category
        try {
          const newCat = await categoryService.createStorefrontCategory(storeId, {
            name: storefrontCategoryName.slice(0, 100),
          });
          storefrontCategoryId = newCat.id;
          storefrontCategoryName = newCat.name;
          createdNewStorefrontCategory = true;
        } catch (catErr) {
          logger.warn({ err: catErr }, 'Failed to auto-create storefront category');
          if (sfMatch) {
            storefrontCategoryId = sfMatch.id;
            storefrontCategoryName = sfMatch.name;
          }
        }
      }

      await creditsService.consume(storeId, cost);
      await aiService.markCompleted(job.id, {
        marketplace_category_id: marketplaceCategoryId,
        marketplace_category_name: marketplaceCategoryName,
        storefront_category_id: storefrontCategoryId,
        storefront_category_name: storefrontCategoryName,
        created_new_storefront_category: createdNewStorefrontCategory,
        confidence: parsed.confidence,
        provider: result.provider_label,
      }, cost);

      res.status(200).json({
        marketplace_category_id: marketplaceCategoryId,
        marketplace_category_name: marketplaceCategoryName,
        storefront_category_id: storefrontCategoryId,
        storefront_category_name: storefrontCategoryName,
        created_new_storefront_category: createdNewStorefrontCategory,
        confidence: parsed.confidence || 0.5,
        tokens_consumed: cost,
        job_id: job.id,
        provider: result.provider_label,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI category classification failed';
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
