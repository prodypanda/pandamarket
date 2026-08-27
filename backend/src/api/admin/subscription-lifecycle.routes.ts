import { query } from '../../db/pool';
import { asyncHandler, requireAdmin, requireAuth } from '../../middlewares';
import { logger } from '../../utils/logger';
import { Request, Response, Router } from 'express';

/** Subscription Lifecycle Operations — extracted from admin.route.ts (E15 split). */
const router = Router();

router.get(
  '/subscription-orders/proration',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const storeId = req.query.store_id as string;
    const targetPlan = req.query.target_plan as string;
    if (!storeId || !targetPlan) {
      res.status(400).json({ error: { message: 'store_id and target_plan are required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.calculateProration(storeId, targetPlan);
    res.status(200).json(result);
  }),
);

router.post(
  '/subscription-orders/manual-switch',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id, target_plan, effective_timing } = req.body;
    if (!store_id || !target_plan) {
      res.status(400).json({ error: { message: 'store_id and target_plan are required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.adminManualSwitchPlan(
      store_id,
      target_plan,
      effective_timing || 'immediate',
      req.user!.id,
    );
    res.status(200).json(result);
  }),
);

router.post(
  '/subscription-orders/pause',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id, resume_at } = req.body;
    if (!store_id) {
      res.status(400).json({ error: { message: 'store_id is required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.pauseSubscription(store_id, resume_at, req.user!.id);
    res.status(200).json({ success: true, store: result });
  }),
);

router.post(
  '/subscription-orders/resume',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id } = req.body;
    if (!store_id) {
      res.status(400).json({ error: { message: 'store_id is required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.resumeSubscription(store_id, req.user!.id);
    res.status(200).json({ success: true, store: result });
  }),
);

router.post(
  '/subscription-orders/cancel-subscription',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id, mode, cancel_date, reason } = req.body;
    if (!store_id) {
      res.status(400).json({ error: { message: 'store_id is required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.cancelSubscription(
      store_id,
      mode || 'immediate',
      cancel_date,
      reason,
      req.user!.id,
    );
    res.status(200).json({ success: true, store: result });
  }),
);

router.post(
  '/subscription-orders/extend',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id, type, extension_days } = req.body;
    if (!store_id || !extension_days) {
      res.status(400).json({ error: { message: 'store_id and extension_days are required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.extendTrialOrGrace(
      store_id,
      type || 'trial',
      Number(extension_days),
      req.user!.id,
    );
    res.status(200).json({ success: true, store: result });
  }),
);

router.post(
  '/subscription-orders/adjustments',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { store_id, type, amount, intent_id, reason } = req.body;
    if (!store_id || !type || !amount) {
      res.status(400).json({ error: { message: 'store_id, type, and amount are required' } });
      return;
    }
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.createAdjustment(
      store_id,
      type,
      Number(amount),
      intent_id,
      reason,
      req.user!.id,
    );
    res.status(200).json({ success: true, adjustment: result });
  }),
);

router.get(
  '/subscription-orders/adjustments/:storeId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { subscriptionPaymentService } = await import('../../services/subscription-payment.service');
    const result = await subscriptionPaymentService.getAdjustments(req.params.storeId);
    res.status(200).json(result);
  }),
);

router.get(
  '/platform-analytics/retention',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const retention = await analyticsService.getRetentionStatus();
    res.status(200).json(retention);
  }),
);

router.post(
  '/platform-analytics/retention/cleanup',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.runRetentionCleanup({
      dryRun: Boolean(req.body?.dryRun),
      batchSize: req.body?.batchSize ? Number(req.body.batchSize) : undefined,
    });
    res.status(200).json(result);
  }),
);

router.post(
  '/platform-analytics/rollups/recompute',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const end = req.body?.endDate || req.body?.to_date || new Date().toISOString();
    const start = req.body?.startDate || req.body?.from_date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = await analyticsService.recomputeRollups({
      startDate: start,
      endDate: end,
      includeSearch: req.body?.includeSearch,
      includeEvents: req.body?.includeEvents,
    });
    res.status(200).json(result);
  }),
);

router.post(
  '/platform-analytics/cache/invalidate',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const result = await analyticsService.invalidateCache({
      scope: req.body?.scope,
    });
    res.status(200).json(result);
  }),
);

router.get(
  '/platform-analytics/health',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { analyticsService } = await import('../../services/analytics.service');
    const health = await analyticsService.getAnalyticsHealth();
    res.status(200).json(health);
  }),
);

// Admin: AI Multi-Engine Purpose Routing
router.get(
  '/ai/purpose-routing',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { aiConfigService } = await import('../../services/ai-config.service');
    const routing = await aiConfigService.listPurposeRouting();
    res.status(200).json({ routing });
  }),
);

router.put(
  '/ai/purpose-routing',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { aiConfigService } = await import('../../services/ai-config.service');
    const {
      purpose,
      provider_config_id,
      fallback_provider_config_id_1,
      fallback_provider_config_id_2,
    } = req.body;
    const routing = await aiConfigService.setPurposeRouting(
      purpose,
      provider_config_id || null,
      fallback_provider_config_id_1 || null,
      fallback_provider_config_id_2 || null,
    );
    res.status(200).json({ routing });
  }),
);

// Admin: AI Prompt Templates Manager
router.get(
  '/ai/prompts',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { aiConfigService } = await import('../../services/ai-config.service');
    const templates = await aiConfigService.listPromptTemplates();
    res.status(200).json({ templates });
  }),
);

router.get(
  '/ai/prompts/:key',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { aiConfigService } = await import('../../services/ai-config.service');
    const template = await aiConfigService.getPromptTemplate(req.params.key);
    res.status(200).json({ template });
  }),
);

router.put(
  '/ai/prompts/:key',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const { aiConfigService } = await import('../../services/ai-config.service');
    const template = await aiConfigService.updatePromptTemplate(req.params.key, {
      system_prompt: req.body.system_prompt,
      default_prompt: req.body.default_prompt,
    });
    res.status(200).json({ template });
  }),
);

/**
 * GET /api/pd/admin/analytics/ai-tagging-health
 * Diagnostic health monitor for Gemini AI product auto-tagging coverage
 */
router.get(
  '/analytics/ai-tagging-health',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const { aiProductTaggerService } = await import('../../services/ai-product-tagger.service');
    const health = await aiProductTaggerService.getTaggingHealth();
    res.status(200).json({
      status: health.status,
      total_products: health.totalProducts,
      tagged_products: health.taggedProducts,
      tag_coverage_pct: health.tagCoveragePct,
      top_tags: health.topTags,
      last_sweep_at: health.lastSweepAt,
    });
  }),
);

/**
 * POST /api/pd/admin/analytics/ai-tagging-sweep
 * Trigger manual sweep to auto-tag untagged published products using Gemini Pro
 */
router.post(
  '/analytics/ai-tagging-sweep',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(200, Math.max(1, Number(req.body?.limit) || 100));
    const forceAll = Boolean(req.body?.force_all);
    const { aiProductTaggerService } = await import('../../services/ai-product-tagger.service');
    try {
      const result = await aiProductTaggerService.sweepUntaggedProducts(limit, forceAll);
      res.status(200).json({ success: true, result });
    } catch (err: any) {
      logger.error({ err: err?.message }, 'AI tagging sweep route error');
      res.status(200).json({
        success: false,
        message: err?.message || 'Sweep failed',
        result: { totalScanned: 0, tagged: 0, failed: 0, fallbackUsed: 0 },
      });
    }
  }),
);

/**
 * POST /api/pd/admin/analytics/feed-simulator
 * Simulate and compare feed variations for Superadmin A/B Testing & Tuning
 */
router.post(
  '/analytics/feed-simulator',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const persona = (req.body?.persona as string) || 'home_decor';
    const customTags = Array.isArray(req.body?.custom_tags) ? req.body.custom_tags : [];

    let personaTags: string[] = [];
    if (persona === 'cold_start') {
      personaTags = [];
    } else if (persona === 'home_decor') {
      personaTags = ['mosaique', 'artisanat', 'decoration', 'marbre', 'tableau', 'maison', 'tunisie'];
    } else if (persona === 'tech_diy') {
      personaTags = ['electronique', 'micro-controleur', 'diy', 'high-tech', 'gadget', 'gaming', 'arduino'];
    } else if (persona === 'fashion') {
      personaTags = ['mode', 'cuir', 'artisanat', 'bijoux', 'accessoire', 'femme', 'sac'];
    } else if (persona === 'custom') {
      personaTags = customTags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean);
    }

    const { applyDiversityPenalty } = await import('../marketplace.route');

    const MOCK_CATALOG = [
      { id: 'sim_p1', store_id: 'str_1', store_name: 'Mosaïques d’El Jem', slug: 'tableau-meduse', title: 'Tableau Mosaïque Romaine Méduse 25x25cm', price: 185.000, interest_tags: ['mosaique', 'artisanat', 'decoration', 'marbre'], category: 'Décoration', thumbnail: null },
      { id: 'sim_p2', store_id: 'str_1', store_name: 'Mosaïques d’El Jem', slug: 'fresque-romaine', title: 'Fresque Mosaïque Fleurie Antique', price: 240.000, interest_tags: ['mosaique', 'artisanat', 'tableau'], category: 'Décoration', thumbnail: null },
      { id: 'sim_p3', store_id: 'str_1', store_name: 'Mosaïques d’El Jem', slug: 'dessous-plat-marbre', title: 'Dessous de Plat en Marbre Taillé Main', price: 45.000, interest_tags: ['artisanat', 'marbre', 'maison'], category: 'Maison', thumbnail: null },
      { id: 'sim_p4', store_id: 'str_1', store_name: 'Mosaïques d’El Jem', slug: 'cadre-mosaique-colombs', title: 'Cadre Mural Deux Colombes Antiques', price: 130.000, interest_tags: ['mosaique', 'decoration'], category: 'Décoration', thumbnail: null },
      { id: 'sim_p5', store_id: 'str_2', store_name: 'Cuir & Tradition Kairouan', slug: 'sac-cuir-vintage', title: 'Sac Besace en Cuir Véritable Cousu Main', price: 160.000, interest_tags: ['mode', 'cuir', 'artisanat', 'sac'], category: 'Maroquinerie', thumbnail: null },
      { id: 'sim_p6', store_id: 'str_2', store_name: 'Cuir & Tradition Kairouan', slug: 'portefeuille-cuir-brun', title: 'Portefeuille Homme en Cuir Pleine Fleur', price: 55.000, interest_tags: ['mode', 'cuir', 'accessoire'], category: 'Maroquinerie', thumbnail: null },
      { id: 'sim_p7', store_id: 'str_2', store_name: 'Cuir & Tradition Kairouan', slug: 'ceinture-cuir-tresse', title: 'Ceinture Tressée Cuir de Veau', price: 48.000, interest_tags: ['mode', 'cuir', 'accessoire'], category: 'Maroquinerie', thumbnail: null },
      { id: 'sim_p8', store_id: 'str_3', store_name: 'TechLab Robotics Tunis', slug: 'kit-robotique-arduino', title: 'Kit Électronique & Robotique Débutant Arduino Uno', price: 125.000, interest_tags: ['electronique', 'diy', 'micro-controleur', 'high-tech'], category: 'High-Tech', thumbnail: null },
      { id: 'sim_p9', store_id: 'str_3', store_name: 'TechLab Robotics Tunis', slug: 'capteurs-iot-pack', title: 'Pack 37 Capteurs IoT & Domotique', price: 89.000, interest_tags: ['electronique', 'diy', 'high-tech'], category: 'High-Tech', thumbnail: null },
      { id: 'sim_p10', store_id: 'str_3', store_name: 'TechLab Robotics Tunis', slug: 'carte-esp32-wifi', title: 'Module ESP32 NodeMCU Wi-Fi & BLE', price: 28.000, interest_tags: ['electronique', 'diy', 'micro-controleur'], category: 'High-Tech', thumbnail: null },
      { id: 'sim_p11', store_id: 'str_4', store_name: 'Poterie & Céramique Nabeul', slug: 'service-a-table-bleu', title: 'Service de Table en Céramique Émaillée Bleue', price: 140.000, interest_tags: ['artisanat', 'decoration', 'maison'], category: 'Maison', thumbnail: null },
      { id: 'sim_p12', store_id: 'str_4', store_name: 'Poterie & Céramique Nabeul', slug: 'vase-terracotta-peint', title: 'Grand Vase Mural en Terre Cuite Émaillée', price: 75.000, interest_tags: ['artisanat', 'decoration'], category: 'Décoration', thumbnail: null },
      { id: 'sim_p13', store_id: 'str_5', store_name: 'Parfums & Senteurs Carthage', slug: 'huile-essentielle-neroli', title: 'Huile Essentielle Fleur d’Oranger Néroli 15ml', price: 65.000, interest_tags: ['bien-etre', 'naturel', 'tunisie'], category: 'Beauté', thumbnail: null },
      { id: 'sim_p14', store_id: 'str_5', store_name: 'Parfums & Senteurs Carthage', slug: 'savon-noir-eucalyptus', title: 'Savon Noir Artisanal à l’Huile d’Olive & Eucalyptus', price: 18.000, interest_tags: ['bien-etre', 'artisanat', 'naturel'], category: 'Beauté', thumbnail: null },
      { id: 'sim_p15', store_id: 'str_6', store_name: 'Bijoux & Filigrane Sousse', slug: 'collier-argent-filigrane', title: 'Collier Khomsa en Argent Massif 925 Filigrane', price: 110.000, interest_tags: ['mode', 'bijoux', 'artisanat', 'femme'], category: 'Bijoux', thumbnail: null },
      { id: 'sim_p16', store_id: 'str_6', store_name: 'Bijoux & Filigrane Sousse', slug: 'boucles-ambre-argent', title: 'Boucles d’Oreilles Ambre Naturel & Argent', price: 85.000, interest_tags: ['mode', 'bijoux', 'femme'], category: 'Bijoux', thumbnail: null },
    ];

    const simulateVariant = async (cfg: {
      label: string;
      base_sort: string;
      personalization_pct: number;
      diversity_enabled: boolean;
      max_items_per_store: number;
    }) => {
      let orderBy = 'RANDOM()';
      if (cfg.base_sort === 'newest') orderBy = 'p.created_at DESC';
      else if (cfg.base_sort === 'alphabetical') orderBy = 'LOWER(p.title) ASC, p.created_at DESC';
      else if (cfg.base_sort === 'best_sellers') orderBy = 'COALESCE(s.subscribers_count, 0) DESC, p.created_at DESC';

      let baseRes: { rows: any[] } = { rows: [] };
      try {
        baseRes = await query<any>(
          `SELECT p.id, p.store_id, s.name AS store_name, s.slug AS store_subdomain, p.title, p.slug, p.price, p.compare_at_price,
                  p.interest_tags, p.created_at, p.category, mc.slug AS marketplace_category_slug,
                  (SELECT image_url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1) AS thumbnail,
                  (SELECT image_url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1) AS image_url
           FROM pd_product p
           JOIN pd_store s ON s.id = p.store_id
           LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
           WHERE p.status = 'published'
           ORDER BY ${orderBy}
           LIMIT 60`
        );
      } catch {
        baseRes = { rows: [] };
      }

      let finalProducts = baseRes.rows.length >= 6 ? [...baseRes.rows] : (req.query.demo === 'true' ? [...MOCK_CATALOG] : [...baseRes.rows]);

      if (personaTags.length > 0 && cfg.personalization_pct > 0) {
        let recsRows: any[] = [];
        try {
          const recsRes = await query<any>(
            `SELECT p.id, p.store_id, s.name AS store_name, s.slug AS store_subdomain, p.title, p.slug, p.price, p.compare_at_price,
                    p.interest_tags, p.created_at, p.category, mc.slug AS marketplace_category_slug,
                    (SELECT image_url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1) AS thumbnail,
                    (SELECT image_url FROM pd_product_image WHERE product_id = p.id ORDER BY position ASC LIMIT 1) AS image_url
             FROM pd_product p
             JOIN pd_store s ON s.id = p.store_id
             LEFT JOIN pd_marketplace_category mc ON mc.id = p.marketplace_category_id
             WHERE p.status = 'published'
               AND p.interest_tags && $1::text[]
             ORDER BY (
               SELECT COUNT(*) FROM unnest(p.interest_tags) t WHERE t = ANY($1::text[])
             ) DESC, p.created_at DESC
             LIMIT 16`,
            [personaTags]
          );
          recsRows = recsRes.rows;
        } catch {
          recsRows = [];
        }

        // If no DB products match the tags, match from mock catalog
        if (recsRows.length === 0 && req.query.demo === 'true') {
          recsRows = MOCK_CATALOG.filter((p) =>
            p.interest_tags.some((t) => personaTags.includes(t.toLowerCase()))
          );
        }

        if (recsRows.length > 0) {
          const targetInject = Math.min(
            recsRows.length,
            Math.max(1, Math.round((finalProducts.length * cfg.personalization_pct) / 100))
          );
          const injected = recsRows.slice(0, targetInject).map((p) => ({ ...p, is_personalized: true }));
          const existingIds = new Set(injected.map((p) => p.id));
          const filteredBase = finalProducts.filter((p) => !existingIds.has(p.id));

          const interleaved: any[] = [];
          const interval = Math.max(2, Math.floor(filteredBase.length / (injected.length || 1)));
          let bIdx = 0;
          let iIdx = 0;
          while (bIdx < filteredBase.length || iIdx < injected.length) {
            for (let k = 0; k < interval && bIdx < filteredBase.length; k++) {
              interleaved.push(filteredBase[bIdx++]);
            }
            if (iIdx < injected.length) {
              interleaved.push(injected[iIdx++]);
            }
          }
          finalProducts = interleaved;
        }
      }

      if (cfg.diversity_enabled) {
        finalProducts = applyDiversityPenalty(finalProducts, cfg.max_items_per_store, true);
      }

      const sample = finalProducts.slice(0, 24);
      const storeCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      let personalizedInSample = 0;

      for (const p of sample) {
        if (p.is_personalized) personalizedInSample++;
        storeCounts[p.store_name || 'Autre'] = (storeCounts[p.store_name || 'Autre'] || 0) + 1;
        categoryCounts[p.category || 'Général'] = (categoryCounts[p.category || 'Général'] || 0) + 1;
      }

      const distinctStores = Object.keys(storeCounts).length;
      const maxStoreShare = Math.max(0, ...Object.values(storeCounts));
      const diversityScore = sample.length > 0 ? Math.round((distinctStores / sample.length) * 100) : 100;

      return {
        label: cfg.label,
        config: cfg,
        metrics: {
          total_items: sample.length,
          personalized_items: personalizedInSample,
          base_catalog_items: sample.length - personalizedInSample,
          distinct_stores: distinctStores,
          store_diversity_score: diversityScore,
          max_store_share: maxStoreShare,
          store_distribution: storeCounts,
          category_distribution: categoryCounts,
        },
        products: sample.map((p) => ({
          id: p.id,
          title: p.title,
          store_name: p.store_name,
          price: Number(p.price),
          thumbnail: p.thumbnail,
          interest_tags: p.interest_tags || [],
          is_personalized: Boolean(p.is_personalized),
          category: p.category,
        })),
      };
    };

    const variantAConfig = {
      label: req.body?.variant_a?.label || 'Variation A (Base Standard)',
      base_sort: req.body?.variant_a?.base_sort || 'random',
      personalization_pct: Number(req.body?.variant_a?.personalization_pct ?? 0),
      diversity_enabled: Boolean(req.body?.variant_a?.diversity_enabled ?? false),
      max_items_per_store: Number(req.body?.variant_a?.max_items_per_store ?? 10),
    };

    const variantBConfig = {
      label: req.body?.variant_b?.label || 'Variation B (Recommandation IA + Anti-Bulle)',
      base_sort: req.body?.variant_b?.base_sort || 'random',
      personalization_pct: Number(req.body?.variant_b?.personalization_pct ?? 30),
      diversity_enabled: Boolean(req.body?.variant_b?.diversity_enabled ?? true),
      max_items_per_store: Number(req.body?.variant_b?.max_items_per_store ?? 3),
    };

    const [simA, simB] = await Promise.all([
      simulateVariant(variantAConfig),
      simulateVariant(variantBConfig),
    ]);

    res.status(200).json({
      persona,
      persona_tags: personaTags,
      variant_a: simA,
      variant_b: simB,
    });
  }),
);
export default router;