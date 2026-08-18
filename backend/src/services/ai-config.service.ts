import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiJobType } from '@pandamarket/types';
import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { config } from '../config';
import { decrypt, encrypt, pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdForbiddenError, PdNotFoundError, PdValidationError, PdErrorCode } from '../errors';
import { storeService } from './store.service';
import { subscriptionService } from './subscription.service';

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom' | 'replicate';

interface ProviderRow {
  id: string;
  provider: AiProvider;
  label: string;
  model: string;
  base_url: string | null;
  api_key_encrypted: string | null;
  is_enabled: boolean;
  is_default: boolean;
  priority: number;
  created_at: Date;
  updated_at: Date;
}

interface StoreProviderRow {
  id: string;
  store_id: string;
  provider: AiProvider;
  model: string;
  base_url: string | null;
  api_key_encrypted: string | null;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AiProviderInput {
  provider: AiProvider;
  label: string;
  model: string;
  base_url?: string | null;
  api_key?: string;
  is_enabled: boolean;
  is_default: boolean;
  priority: number;
}

export interface StoreAiProviderInput {
  provider: AiProvider;
  model: string;
  base_url?: string | null;
  api_key?: string;
  is_enabled: boolean;
}

export interface TextGenerationResult {
  text: string;
  provider: AiProvider;
  provider_label: string;
  source: 'seller' | 'platform' | 'env';
}

function maskSecret(value: string | null): boolean {
  return Boolean(value);
}

function safeDecrypt(payload: string | null | undefined): string | null {
  if (!payload || typeof payload !== 'string') return null;
  try {
    return decrypt(payload);
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Failed to decrypt AI provider API key (key mismatch or corrupted data), skipping');
    return null;
  }
}

function providerForResponse(row: ProviderRow) {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    model: row.model,
    base_url: row.base_url,
    api_key_set: maskSecret(row.api_key_encrypted),
    is_enabled: row.is_enabled,
    is_default: row.is_default,
    priority: row.priority,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function storeProviderForResponse(row: StoreProviderRow | null, allowed: boolean) {
  return {
    allowed,
    config: row
      ? {
        provider: row.provider,
        model: row.model,
        base_url: row.base_url,
        api_key_set: maskSecret(row.api_key_encrypted),
        is_enabled: row.is_enabled,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
      }
      : null,
  };
}

function parseOpenAiCompatibleResponse(data: unknown): string {
  const value = data as {
    choices?: Array<{ message?: { content?: string }; text?: string }>;
    text?: string;
    output_text?: string;
  };
  return value.choices?.[0]?.message?.content || value.choices?.[0]?.text || value.output_text || value.text || '';
}

async function generateWithProvider(opts: {
  provider: AiProvider;
  model: string;
  base_url: string | null;
  api_key: string;
  prompt: string;
}): Promise<string> {
  if (opts.provider === 'gemini') {
    const ai = new GoogleGenerativeAI(opts.api_key);
    const model = ai.getGenerativeModel({ model: opts.model });
    const result = await model.generateContent(opts.prompt);
    return result.response.text();
  }

  if (opts.provider === 'claude') {
    const url = `${(opts.base_url || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`;
    const { data } = await axios.post(
      url,
      {
        model: opts.model,
        max_tokens: config.gemini.maxTokens,
        messages: [{ role: 'user', content: opts.prompt }],
      },
      {
        timeout: 45_000,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': opts.api_key,
          'anthropic-version': '2023-06-01',
        },
      },
    );
    const content = (data as { content?: Array<{ text?: string }> }).content;
    return content?.map((item) => item.text || '').join('\n').trim() || '';
  }

  const baseUrl = opts.provider === 'openai'
    ? (opts.base_url || 'https://api.openai.com/v1')
    : opts.base_url;
  if (!baseUrl) throw new Error('Custom AI provider base URL is required');
  const { data } = await axios.post(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      model: opts.model,
      messages: [{ role: 'user', content: opts.prompt }],
      temperature: 0.4,
    },
    {
      timeout: 45_000,
      headers: {
        Authorization: `Bearer ${opts.api_key}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return parseOpenAiCompatibleResponse(data);
}



export class AiConfigService {
  async listProviders() {
    const { rows } = await query<ProviderRow>(
      `SELECT * FROM pd_ai_provider_config
       ORDER BY is_default DESC, priority ASC, created_at ASC`,
    );
    return rows.map(providerForResponse);
  }

  async createProvider(input: AiProviderInput) {
    return transaction(async (client) => {
      if (input.is_default) await this.clearDefault(client);
      const { rows } = await client.query<ProviderRow>(
        `INSERT INTO pd_ai_provider_config
           (id, provider, label, model, base_url, api_key_encrypted, is_enabled, is_default, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          pdId('aiprov'),
          input.provider,
          input.label,
          input.model,
          input.base_url || null,
          input.api_key ? encrypt(input.api_key) : null,
          input.is_enabled,
          input.is_default,
          input.priority,
        ],
      );
      return providerForResponse(rows[0]);
    });
  }

  async updateProvider(id: string, input: AiProviderInput) {
    return transaction(async (client) => {
      if (input.is_default) await this.clearDefault(client, id);
      const { rows } = await client.query<ProviderRow>(
        `UPDATE pd_ai_provider_config
         SET provider = $2,
             label = $3,
             model = $4,
             base_url = $5,
             api_key_encrypted = CASE WHEN $6::text IS NULL THEN api_key_encrypted ELSE $6 END,
             is_enabled = $7,
             is_default = $8,
             priority = $9,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          input.provider,
          input.label,
          input.model,
          input.base_url || null,
          input.api_key ? encrypt(input.api_key) : null,
          input.is_enabled,
          input.is_default,
          input.priority,
        ],
      );
      if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'AI provider not found');
      return providerForResponse(rows[0]);
    });
  }

  async deleteProvider(id: string): Promise<void> {
    const result = await query('DELETE FROM pd_ai_provider_config WHERE id = $1', [id]);
    if (!result.rowCount) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'AI provider not found');
  }

  async listPricing() {
    const defaultPrices: Record<string, number> = {
      [AiJobType.ImageCompression]: 1,
      [AiJobType.SeoGeneration]: 2,
      [AiJobType.PageCopy]: 1,
      [AiJobType.ProductDescription]: 2,
      [AiJobType.CategoryClassification]: 2,
    };

    for (const [jobType, defaultTokens] of Object.entries(defaultPrices)) {
      await query(
        `INSERT INTO pd_ai_feature_pricing (job_type, tokens_required, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (job_type) DO NOTHING`,
        [jobType, defaultTokens],
      ).catch(() => {});
    }

    const { rows } = await query<{ job_type: AiJobType; tokens_required: number; updated_at: Date }>(
      'SELECT * FROM pd_ai_feature_pricing ORDER BY job_type ASC',
    );
    return rows.map((row) => ({
      job_type: row.job_type,
      tokens_required: row.tokens_required,
      updated_at: row.updated_at.toISOString(),
    }));
  }

  async updatePricing(prices: Array<{ job_type: AiJobType; tokens_required: number }>) {
    return transaction(async (client) => {
      for (const price of prices) {
        await client.query(
          `INSERT INTO pd_ai_feature_pricing (job_type, tokens_required, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (job_type) DO UPDATE
           SET tokens_required = EXCLUDED.tokens_required,
               updated_at = NOW()`,
          [price.job_type, price.tokens_required],
        );
      }
      const { rows } = await client.query<{ job_type: AiJobType; tokens_required: number; updated_at: Date }>(
        'SELECT * FROM pd_ai_feature_pricing ORDER BY job_type ASC',
      );
      return rows.map((row) => ({
        job_type: row.job_type,
        tokens_required: row.tokens_required,
        updated_at: row.updated_at.toISOString(),
      }));
    });
  }

  async getFeaturePrice(type: AiJobType): Promise<number> {
    const { rows } = await query<{ tokens_required: number }>(
      'SELECT tokens_required FROM pd_ai_feature_pricing WHERE job_type = $1',
      [type],
    );
    if (rows[0]) return rows[0].tokens_required;
    if (type === AiJobType.ImageCompression) return 1;
    if (type === AiJobType.CategoryClassification) return 2;
    return 2;
  }

  async getStoreProvider(storeId: string) {
    const allowed = await this.storeCanUseOwnProvider(storeId);
    const { rows } = await query<StoreProviderRow>(
      'SELECT * FROM pd_store_ai_provider_config WHERE store_id = $1',
      [storeId],
    );
    return storeProviderForResponse(rows[0] || null, allowed);
  }

  async saveStoreProvider(storeId: string, input: StoreAiProviderInput) {
    await this.assertStoreCanUseOwnProvider(storeId);
    const encrypted = input.api_key ? encrypt(input.api_key) : null;
    const { rows } = await query<StoreProviderRow>(
      `INSERT INTO pd_store_ai_provider_config
         (id, store_id, provider, model, base_url, api_key_encrypted, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (store_id) DO UPDATE
       SET provider = EXCLUDED.provider,
           model = EXCLUDED.model,
           base_url = EXCLUDED.base_url,
           api_key_encrypted = CASE WHEN EXCLUDED.api_key_encrypted IS NULL THEN pd_store_ai_provider_config.api_key_encrypted ELSE EXCLUDED.api_key_encrypted END,
           is_enabled = EXCLUDED.is_enabled,
           updated_at = NOW()
       RETURNING *`,
      [pdId('storeai'), storeId, input.provider, input.model, input.base_url || null, encrypted, input.is_enabled],
    );
    return storeProviderForResponse(rows[0], true);
  }

  async deleteStoreProvider(storeId: string): Promise<void> {
    await query('DELETE FROM pd_store_ai_provider_config WHERE store_id = $1', [storeId]);
  }

  async generateText(prompt: string, storeId?: string, priorFailures: string[] = []): Promise<TextGenerationResult> {
    const attempts = await this.getGenerationAttempts(storeId);
    if (attempts.length === 0) {
      const details = priorFailures.length > 0 ? ` Détails des échecs précédents : ${priorFailures.join(' | ')}.` : '';
      logger.error('No functional AI providers configured or available');
      throw new PdValidationError(
        `Aucun fournisseur d'IA opérationnel n'est configuré sur la plateforme.${details} Veuillez configurer ou activer vos modèles IA (OpenAI, Gemini, Claude, Groq, etc.) dans l'onglet "Routage par Usage" du tableau de bord SuperAdmin.`,
      );
    }

    const failures: string[] = [...priorFailures];
    for (const attempt of attempts) {
      try {
        const text = await generateWithProvider({
          provider: attempt.provider,
          model: attempt.model,
          base_url: attempt.base_url,
          api_key: attempt.api_key,
          prompt,
        });
        if (!text || !text.trim()) throw new Error(`Le fournisseur IA "${attempt.label}" a retourné une réponse vide.`);
        return {
          text,
          provider: attempt.provider,
          provider_label: attempt.label,
          source: attempt.source,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${attempt.label}: ${message}`);
        logger.warn({ provider: attempt.provider, source: attempt.source, err: message }, 'Tentative fournisseur IA échouée, basculement vers le modèle suivant');
      }
    }

    logger.error({ failures: failures.join(' | ') }, 'Tous les fournisseurs d\'IA configurés ont échoué');
    throw new PdValidationError(
      `Échec de génération IA : Tous les modèles configurés (Principal, Secours 1, Secours 2 et pile générale) ont échoué (${failures.join(' | ')}). Veuillez vérifier la validité de vos clés API, vos quotas et consulter les journaux système dans le tableau de bord SuperAdmin.`,
    );
  }

  private async clearDefault(client: PoolClient, exceptId?: string): Promise<void> {
    await client.query(
      `UPDATE pd_ai_provider_config
       SET is_default = false,
           updated_at = NOW()
       WHERE ($1::text IS NULL OR id <> $1)`,
      [exceptId || null],
    );
  }

  private async storeCanUseOwnProvider(storeId: string): Promise<boolean> {
    const store = await storeService.getById(storeId);
    const limits = await subscriptionService.getLimits(store.subscription_plan);
    return Boolean(limits.has_own_ai_provider);
  }

  private async assertStoreCanUseOwnProvider(storeId: string): Promise<void> {
    const allowed = await this.storeCanUseOwnProvider(storeId);
    if (!allowed) {
      throw new PdForbiddenError(
        PdErrorCode.PERM_PLAN_REQUIRED,
        'Your current plan does not allow custom AI provider keys',
        { feature: 'has_own_ai_provider' },
      );
    }
  }

  private async getGenerationAttempts(storeId?: string) {
    const attempts: Array<{
      provider: AiProvider;
      label: string;
      model: string;
      base_url: string | null;
      api_key: string;
      source: 'seller' | 'platform' | 'env';
    }> = [];

    if (storeId && await this.storeCanUseOwnProvider(storeId)) {
      const { rows } = await query<StoreProviderRow>(
        `SELECT * FROM pd_store_ai_provider_config
         WHERE store_id = $1 AND is_enabled = true AND api_key_encrypted IS NOT NULL`,
        [storeId],
      );
      if (rows[0]?.api_key_encrypted) {
        const key = safeDecrypt(rows[0].api_key_encrypted);
        if (key) {
          attempts.push({
            provider: rows[0].provider,
            label: 'Seller AI provider',
            model: rows[0].model,
            base_url: rows[0].base_url,
            api_key: key,
            source: 'seller',
          });
        }
      }
    }

    const { rows } = await query<ProviderRow>(
      `SELECT * FROM pd_ai_provider_config
       WHERE is_enabled = true AND api_key_encrypted IS NOT NULL
       ORDER BY is_default DESC, priority ASC, created_at ASC`,
    );
    for (const row of rows) {
      if (!row.api_key_encrypted) continue;
      const key = safeDecrypt(row.api_key_encrypted);
      if (key) {
        attempts.push({
          provider: row.provider,
          label: row.label,
          model: row.model,
          base_url: row.base_url,
          api_key: key,
          source: 'platform',
        });
      }
    }

    if (config.gemini.apiKey) {
      attempts.push({
        provider: 'gemini',
        label: 'Environment Gemini fallback',
        model: config.gemini.model,
        base_url: null,
        api_key: config.gemini.apiKey,
        source: 'env',
      });
    }

    return attempts;
  }

  // ----------------------------------------------------------------
  // Multi-Engine Purpose Routing & Prompt Templates
  // ----------------------------------------------------------------

  private async ensurePurposeRoutingSchema(): Promise<void> {
    try {
      await query(`
        ALTER TABLE pd_ai_purpose_routing
        ADD COLUMN IF NOT EXISTS fallback_provider_config_id_1 TEXT REFERENCES pd_ai_provider_config(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS fallback_provider_config_id_2 TEXT REFERENCES pd_ai_provider_config(id) ON DELETE SET NULL;
      `);
    } catch {
      // Ignored if already altered or table not created yet
    }
  }

  async listPurposeRouting() {
    await this.ensurePurposeRoutingSchema();

    const { rows } = await query<{
      purpose: string;
      provider_config_id: string | null;
      provider_label: string | null;
      provider: string | null;
      model: string | null;
      fallback_provider_config_id_1: string | null;
      fallback_label_1: string | null;
      fallback_provider_1: string | null;
      fallback_model_1: string | null;
      fallback_provider_config_id_2: string | null;
      fallback_label_2: string | null;
      fallback_provider_2: string | null;
      fallback_model_2: string | null;
      updated_at: Date;
    }>(
      `SELECT 
        r.purpose, 
        r.provider_config_id, 
        c1.label AS provider_label, 
        c1.provider, 
        c1.model,
        r.fallback_provider_config_id_1,
        c2.label AS fallback_label_1,
        c2.provider AS fallback_provider_1,
        c2.model AS fallback_model_1,
        r.fallback_provider_config_id_2,
        c3.label AS fallback_label_2,
        c3.provider AS fallback_provider_2,
        c3.model AS fallback_model_2,
        r.updated_at
       FROM pd_ai_purpose_routing r
       LEFT JOIN pd_ai_provider_config c1 ON r.provider_config_id = c1.id
       LEFT JOIN pd_ai_provider_config c2 ON r.fallback_provider_config_id_1 = c2.id
       LEFT JOIN pd_ai_provider_config c3 ON r.fallback_provider_config_id_2 = c3.id
       ORDER BY r.purpose ASC`,
    );

    const defaultPurposes = [
      'product_description',
      'text_summarization',
      'content_generation',
      'product_tagging',
      'image_generation',
      'image_upscaling',
      'image_enhancement',
      'image_background_removal',
      'category_classification',
    ];
    const map = new Map(rows.map((r) => [r.purpose, r]));

    return defaultPurposes.map((purpose) => {
      const existing = map.get(purpose);
      return {
        purpose,
        // Primary (Choix 1)
        provider_config_id: existing?.provider_config_id || null,
        provider_label: existing?.provider_label || 'Pile de Priorité Défaut',
        provider: existing?.provider || null,
        model: existing?.model || null,
        // Fallback 1 (Choix 2)
        fallback_provider_config_id_1: existing?.fallback_provider_config_id_1 || null,
        fallback_label_1: existing?.fallback_label_1 || null,
        fallback_provider_1: existing?.fallback_provider_1 || null,
        fallback_model_1: existing?.fallback_model_1 || null,
        // Fallback 2 (Choix 3)
        fallback_provider_config_id_2: existing?.fallback_provider_config_id_2 || null,
        fallback_label_2: existing?.fallback_label_2 || null,
        fallback_provider_2: existing?.fallback_provider_2 || null,
        fallback_model_2: existing?.fallback_model_2 || null,
        updated_at: existing?.updated_at ? existing.updated_at.toISOString() : new Date().toISOString(),
      };
    });
  }

  async setPurposeRouting(
    purpose: string,
    providerConfigId: string | null,
    fallbackProviderConfigId1?: string | null,
    fallbackProviderConfigId2?: string | null,
  ) {
    await this.ensurePurposeRoutingSchema();

    const validPurposes = [
      'product_description',
      'text_summarization',
      'content_generation',
      'product_tagging',
      'image_generation',
      'image_upscaling',
      'image_enhancement',
      'image_background_removal',
      'category_classification',
    ];
    if (!validPurposes.includes(purpose)) {
      throw new PdValidationError(`Invalid AI purpose: ${purpose}`);
    }

    const validateProviderId = async (id: string | null | undefined) => {
      if (id) {
        const { rows } = await query('SELECT id FROM pd_ai_provider_config WHERE id = $1', [id]);
        if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, `Fournisseur IA introuvable (ID: ${id})`);
      }
    };

    await validateProviderId(providerConfigId);
    await validateProviderId(fallbackProviderConfigId1);
    await validateProviderId(fallbackProviderConfigId2);

    await query(
      `INSERT INTO pd_ai_purpose_routing (id, purpose, provider_config_id, fallback_provider_config_id_1, fallback_provider_config_id_2, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (purpose) DO UPDATE
       SET provider_config_id = EXCLUDED.provider_config_id,
           fallback_provider_config_id_1 = EXCLUDED.fallback_provider_config_id_1,
           fallback_provider_config_id_2 = EXCLUDED.fallback_provider_config_id_2,
           updated_at = NOW()`,
      [
        pdId('aipurp'),
        purpose,
        providerConfigId || null,
        fallbackProviderConfigId1 || null,
        fallbackProviderConfigId2 || null,
      ],
    );

    return this.listPurposeRouting();
  }

  async listPromptTemplates() {
    const { rows } = await query<{
      prompt_key: string;
      title: string;
      description: string | null;
      system_prompt: string;
      default_prompt: string;
      updated_at: Date;
    }>('SELECT * FROM pd_ai_prompt_templates ORDER BY prompt_key ASC');

    return rows.map((r) => ({
      prompt_key: r.prompt_key,
      title: r.title,
      description: r.description,
      system_prompt: r.system_prompt,
      default_prompt: r.default_prompt,
      updated_at: r.updated_at.toISOString(),
    }));
  }

  async getPromptTemplate(key: string) {
    let { rows } = await query<{
      prompt_key: string;
      title: string;
      description: string | null;
      system_prompt: string;
      default_prompt: string;
      updated_at: Date;
    }>('SELECT * FROM pd_ai_prompt_templates WHERE prompt_key = $1', [key]);

    if (!rows[0] && key === 'product_description') {
      try {
        await query(
          `INSERT INTO pd_ai_prompt_templates (prompt_key, title, description, system_prompt, default_prompt, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (prompt_key) DO NOTHING`,
          [
            'product_description',
            "Sublimer avec l'IA — Description Produit & Points Forts",
            "Rédige une description structurée en HTML avec points forts, bénéfices et accroche persuasive lors de l'utilisation du bouton 'Sublimer avec l'IA' par le vendeur.",
            `Vous êtes l'Expert Copywriter E-commerce & Concepteur-Rédacteur Merchandising d'Élite de PandaMarket.
Votre mission est de concevoir des fiches produits captivantes, vendeuses et hautement structurées, respectant les standards des plus grandes boutiques en ligne (Amazon A+, Shopify Plus, D2C).

Principes directeurs de rédaction :
1. Psychologie d'achat : Traduisez systématiquement chaque caractéristique technique en un bénéfice concret, émotionnel et rassurant pour l'acheteur.
2. Clarté & Hiérarchie Visuelle : Structurez le texte avec des balises HTML sémantiques strictes (<h3>, <p>, <strong>, <em>, <ul>, <li>) pour une lecture fluide et immédiate.
3. Authenticité & Confiance : Adoptez un ton raffiné, percutant et professionnel sans formulations creuses ni superlatifs mensongers.
4. Réponse JSON Stricte : Répondez TOUJOURS exclusivement par un objet JSON valide sans aucun texte additionnel.`,
            `Rédigez une description e-commerce hautement persuasive et structurée en HTML pour le produit suivant :

📦 INFORMATIONS PRODUIT :
- Titre : {title}
- Catégorie : {category}
- Attributs & Spécifications : {attributes}
- Description brute actuelle : {current_description}
- Langue ciblée : {language}
- Tonalité : {tone} (professionnel, élégant, séduisant et orienté conversion)

🎯 STRUCTURE HTML OBLIGATOIRE (pour "description_html") :
1. <p><strong>Accroche engageante :</strong> Mise en valeur du produit et de son bénéfice principal.</p>
2. <h3>✨ Points Forts & Avantages Clés</h3>
   <ul>
     <li><strong>Qualité & Conception :</strong> Confection soignée et matériaux de premier choix.</li>
     <li><strong>Praticité & Design :</strong> Utilisation intuitive et esthétique irréprochable.</li>
     <li><strong>Durabilité :</strong> Robuste et pensé pour durer dans le temps.</li>
   </ul>
3. <h3>📋 Spécifications & Détails Techniques</h3>
   <ul>
     <li>Spécifications précises issues des attributs et dimensions.</li>
   </ul>
4. <h3>💡 Conseils & Utilisation</h3>
   <p>Recommandations d'entretien, de mise en valeur ou conseils d'usage pratique.</p>

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "description_html": "<h3>...</h3><p>...</p><ul><li>...</li></ul>",
  "summary": "Une phrase d'accroche percutante et mémorable résumant l'essence du produit pour la vitrine."
}`,
          ],
        );
        const refetched = await query<{
          prompt_key: string;
          title: string;
          description: string | null;
          system_prompt: string;
          default_prompt: string;
          updated_at: Date;
        }>('SELECT * FROM pd_ai_prompt_templates WHERE prompt_key = $1', [key]);
        rows = refetched.rows;
      } catch (err: any) {
        logger.warn({ err: err?.message }, 'Failed to auto-seed product_description prompt template');
      }
    }

    if (!rows[0] && key === 'product_tagging') {
      try {
        await query(
          `INSERT INTO pd_ai_prompt_templates (prompt_key, title, description, system_prompt, default_prompt, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (prompt_key) DO NOTHING`,
          [
            'product_tagging',
            'Auto-Tagging Sémantique Catalogue & Intérêts',
            "Extrait 5 à 10 tags d'intérêt sémantiques normalisés pour chaque produit afin d'alimenter l'algorithme de recommandation et le flux d'intérêt acheteur du Hub.",
            `Vous êtes l'IA Analyste Sémantique et Taxonomie E-commerce de PandaMarket.
Votre rôle est d'analyser en profondeur les données des produits (titre, catégorie, description, matériaux, usage) et d'extraire entre 5 et 10 tags d'intérêt sémantiques normalisés pour alimenter l'algorithme de recommandation personnalisé et le flux d'intérêt acheteur.

Règles de normalisation des tags :
1. Format : Minuscules uniquement, sans accents, sans caractères spéciaux.
2. Mots composés : Séparés par des tirets (ex: "decoration-interieure", "fait-main", "cuir-veritable").
3. Couverture multi-dimensionnelle obligatoire : Nature du produit, matière/texture, usage/contexte, et style/thème.
4. Longueur : 2 à 30 caractères par tag.
5. Zéro redondance : Tags uniques, distincts et hautement pertinents.`,
            `Analysez le produit suivant et extrayez entre 5 et 10 tags sémantiques d'intérêt acheteur normalisés :

📦 PRODUIT :
- Titre : {title}
- Catégorie : {category}
- Description : {description}

RÈGLES STRICTES :
- Tous les tags doivent être en minuscules, sans accents, séparés par un tiret pour les mots composés.
- Couvrez : la nature du produit, le matériau, le domaine d'usage, et le style/thème.

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE :
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`,
          ],
        );
        const refetched = await query<{
          prompt_key: string;
          title: string;
          description: string | null;
          system_prompt: string;
          default_prompt: string;
          updated_at: Date;
        }>('SELECT * FROM pd_ai_prompt_templates WHERE prompt_key = $1', [key]);
        rows = refetched.rows;
      } catch (err: any) {
        logger.warn({ err: err?.message }, 'Failed to auto-seed product_tagging prompt template');
      }
    }

    if (key === 'category_classification') {
      const isLegacy = rows[0] && (!rows[0].system_prompt?.includes('TAXONOMIE VITRINE BOUTIQUE') || !rows[0].default_prompt?.includes('storefront_parent_category_id'));
      if (!rows[0] || isLegacy) {
        try {
          const sysPrompt = `Vous êtes un Expert en Classification Taxonomique & Merchandising E-commerce d'élite de PandaMarket.
Votre mission est d'analyser avec une précision chirurgicale le produit soumis (titre, description) et d'établir deux taxonomies distinctes :

1. 🌐 TAXONOMIE MARKETPLACE HUB (Globale, standardisée & contrainte) :
   - Vous devez OBLIGATOIREMENT choisir la catégorie ou sous-catégorie la plus spécifique parmi les catégories PandaMarket Hub fournies.
   - Renvoyez son "marketplace_category_id" exact et son "marketplace_category_name" exact.

2. 🏪 TAXONOMIE VITRINE BOUTIQUE (Merchandising libre, spécialisé & vendeur) :
   - La boutique privée du vendeur n'a AUCUNE contrainte de taxonomie standard.
   - Étape A : Examinez les catégories vitrine existantes du vendeur. Si l'une d'elles (catégorie ou sous-catégorie) correspond fidèlement au produit, réutilisez-la en indiquant son nom exact, son id et "created_new": false.
   - Étape B : Si AUCUNE catégorie existante ne convient précisément : NE CLONEZ PAS aveuglément la catégorie Marketplace Hub si elle est générique (ex: "Chaussures", "Mode", "Alimentation", "Électronique"). Créez un nom de catégorie vitrine sur-mesure, élégant, attractif et spécifique au créneau du produit (ex: "Sneakers & Baskets Sportswear", "Huiles d'Olive & Terroir", "Vases & Céramiques Émaillées", "Sacs en Cuir Artisanal", "Robes de Soirée & Caftans", etc.) et indiquez "created_new": true.
   - Étape C (Hiérarchie Vitrine) : Si le vendeur possède déjà une catégorie parente pertinente (ex: "Chaussures" ou "Maison"), vous pouvez définir "storefront_parent_category_id" avec l'ID de cette catégorie existante afin d'y imbriquer la nouvelle sous-catégorie créée.`;

          const defPrompt = `Analysez le produit suivant et déterminez sa classification optimale pour le Hub et pour la Vitrine Boutique :

📦 PRODUIT À CLASSIFIER :
- Titre : {title}
- Description : {description}
- Langue : {language}

🌐 Catégories Marketplace Hub disponibles (choix contraint avec ID) :
{marketplace_categories}

🏪 Catégories Vitrine Boutique existantes du vendeur :
{storefront_categories}

RÉPONDEZ EXCLUSIVEMENT PAR UN OBJET JSON VALIDE SANS TEXTE ADDITIONNEL :
{
  "marketplace_category_id": "id exact de la catégorie du Hub choisie",
  "marketplace_category_name": "Nom exact de la catégorie du Hub",
  "storefront_category_name": "Nom de catégorie vitrine spécifique (existante ou créée sur-mesure)",
  "storefront_category_id": "id si catégorie vitrine existante, sinon null",
  "storefront_parent_category_id": "id de la catégorie parente vitrine existante si applicable, sinon null",
  "created_new": false,
  "confidence": 0.95
}`;

          await query(
            `INSERT INTO pd_ai_prompt_templates (prompt_key, title, description, system_prompt, default_prompt, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (prompt_key) DO UPDATE SET
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               system_prompt = EXCLUDED.system_prompt,
               default_prompt = EXCLUDED.default_prompt,
               updated_at = NOW()`,
            [
              'category_classification',
              'Classification Automatique de Catégories IA',
              "Analyse le titre et la description pour mapper la catégorie Hub Marketplace et créer ou sélectionner la catégorie vitrine boutique sur-mesure.",
              sysPrompt,
              defPrompt,
            ],
          );
          const refetched = await query<{
            prompt_key: string;
            title: string;
            description: string | null;
            system_prompt: string;
            default_prompt: string;
            updated_at: Date;
          }>('SELECT * FROM pd_ai_prompt_templates WHERE prompt_key = $1', [key]);
          rows = refetched.rows;
        } catch (err: any) {
          logger.warn({ err: err?.message }, 'Failed to auto-seed/upgrade category_classification prompt template');
        }
      }
    }

    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, `Prompt template not found: ${key}`);
    }

    return {
      prompt_key: rows[0].prompt_key,
      title: rows[0].title,
      description: rows[0].description,
      system_prompt: rows[0].system_prompt,
      default_prompt: rows[0].default_prompt,
      updated_at: rows[0].updated_at.toISOString(),
    };
  }

  async updatePromptTemplate(key: string, input: { system_prompt?: string; default_prompt?: string }) {
    const { rows } = await query(
      `UPDATE pd_ai_prompt_templates
       SET system_prompt = COALESCE($2, system_prompt),
           default_prompt = COALESCE($3, default_prompt),
           updated_at = NOW()
       WHERE prompt_key = $1
       RETURNING *`,
      [key, input.system_prompt || null, input.default_prompt || null],
    );

    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, `Prompt template not found: ${key}`);
    }

    return this.getPromptTemplate(key);
  }

  async generateTextForPurpose(purpose: string, prompt: string, storeId?: string): Promise<TextGenerationResult> {
    await this.ensurePurposeRoutingSchema();

    const routingRes = await query<{
      provider_config_id: string | null;
      fallback_provider_config_id_1: string | null;
      fallback_provider_config_id_2: string | null;
    }>(
      'SELECT provider_config_id, fallback_provider_config_id_1, fallback_provider_config_id_2 FROM pd_ai_purpose_routing WHERE purpose = $1',
      [purpose],
    );

    const routingRow = routingRes.rows[0];
    const candidateTiers = [
      { id: routingRow?.provider_config_id, label: 'Modèle Principal (Choix 1)' },
      { id: routingRow?.fallback_provider_config_id_1, label: 'Modèle de Secours 1 (Choix 2)' },
      { id: routingRow?.fallback_provider_config_id_2, label: 'Modèle de Secours 2 (Choix 3)' },
    ].filter((item): item is { id: string; label: string } => Boolean(item.id));

    const purposeFailures: string[] = [];

    // Execute through the 3-tier cascade: Primary -> Fallback 1 -> Fallback 2
    for (const { id: providerId, label: tierLabel } of candidateTiers) {
      const { rows } = await query<ProviderRow>(
        'SELECT * FROM pd_ai_provider_config WHERE id = $1',
        [providerId],
      );

      const provider = rows[0];
      if (!provider) {
        purposeFailures.push(`[${tierLabel}]: Le fournisseur IA sélectionné (ID: ${providerId}) n'existe pas en base.`);
        continue;
      }

      if (!provider.is_enabled) {
        purposeFailures.push(`[${tierLabel}: ${provider.label}]: Le fournisseur est actuellement désactivé dans l'onglet 'Fournisseurs & Clés API'.`);
        continue;
      }

      if (!provider.api_key_encrypted) {
        purposeFailures.push(`[${tierLabel}: ${provider.label}]: Aucune clé API n'a été configurée pour ce fournisseur.`);
        continue;
      }

      const apiKey = safeDecrypt(provider.api_key_encrypted);
      if (!apiKey) {
        purposeFailures.push(`[${tierLabel}: ${provider.label}]: Clé API invalide ou impossible à déchiffrer. Veuillez réenregistrer la clé API dans l'onglet 'Fournisseurs & Clés API'.`);
        continue;
      }

      try {
        const text = await generateWithProvider({
          provider: provider.provider,
          model: provider.model,
          base_url: provider.base_url,
          api_key: apiKey,
          prompt,
        });
        if (text && text.trim()) {
          return {
            text,
            provider: provider.provider,
            provider_label: `${provider.label} (${purpose} — ${tierLabel})`,
            source: 'platform',
          };
        }
        throw new Error(`Le modèle "${provider.label}" a retourné une réponse vide.`);
      } catch (err: any) {
        const msg = err?.message || String(err);
        purposeFailures.push(`[${tierLabel}: ${provider.label}]: ${msg}`);
        logger.warn(
          { purpose, tier: tierLabel, provider: provider.provider, model: provider.model, err: msg },
          `Échec du ${tierLabel} pour '${purpose}'. Basculement automatique vers le modèle de secours suivant...`,
        );
      }
    }

    // If all configured tier models failed (or none were explicitly configured), fallback to general platform stack
    return this.generateText(prompt, storeId, purposeFailures);
  }

  async generateImageForPurpose(purpose: string, prompt: string, imageUrl?: string, _storeId?: string): Promise<string> {
    await this.ensurePurposeRoutingSchema();

    const routingRes = await query<{
      provider_config_id: string | null;
      fallback_provider_config_id_1: string | null;
      fallback_provider_config_id_2: string | null;
    }>(
      'SELECT provider_config_id, fallback_provider_config_id_1, fallback_provider_config_id_2 FROM pd_ai_purpose_routing WHERE purpose = $1',
      [purpose],
    );

    const routingRow = routingRes.rows[0];
    const candidateTiers = [
      { id: routingRow?.provider_config_id, label: 'Modèle Principal (Choix 1)' },
      { id: routingRow?.fallback_provider_config_id_1, label: 'Modèle de Secours 1 (Choix 2)' },
      { id: routingRow?.fallback_provider_config_id_2, label: 'Modèle de Secours 2 (Choix 3)' },
    ].filter((item): item is { id: string; label: string } => Boolean(item.id));

    const imageFailures: string[] = [];

    for (const { id: providerId, label: tierLabel } of candidateTiers) {
      const { rows } = await query<ProviderRow>(
        'SELECT * FROM pd_ai_provider_config WHERE id = $1',
        [providerId],
      );

      const providerConfig = rows[0];
      if (!providerConfig) {
        imageFailures.push(`[${tierLabel}]: Le fournisseur d'image sélectionné n'existe pas.`);
        continue;
      }

      if (!providerConfig.is_enabled) {
        imageFailures.push(`[${tierLabel}: ${providerConfig.label}]: Le fournisseur est désactivé.`);
        continue;
      }

      if (!providerConfig.api_key_encrypted) {
        imageFailures.push(`[${tierLabel}: ${providerConfig.label}]: Aucune clé API n'a été configurée.`);
        continue;
      }

      const apiKey = safeDecrypt(providerConfig.api_key_encrypted as string);
      if (!apiKey) {
        imageFailures.push(`[${tierLabel}: ${providerConfig.label}]: Clé API invalide ou corrompue.`);
        continue;
      }

      try {
        if (providerConfig.provider === 'replicate') {
          const url = `${(providerConfig.base_url || 'https://api.replicate.com').replace(/\/$/, '')}/v1/predictions`;
          const { data } = await axios.post(
            url,
            {
              version: providerConfig.model,
              input: { prompt, image: imageUrl },
            },
            {
              headers: {
                Authorization: `Token ${apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          );
          const resultUrl = data.output?.[0] || data.output;
          if (resultUrl) return resultUrl;
          throw new Error('Réponse vide du modèle Replicate');
        } else {
          const url = `${(providerConfig.base_url || 'https://api.openai.com/v1').replace(/\/$/, '')}/images/generations`;
          const { data } = await axios.post(
            url,
            {
              model: providerConfig.model,
              prompt,
              n: 1,
              size: '1024x1024',
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
            },
          );
          const resultUrl = data.data?.[0]?.url;
          if (resultUrl) return resultUrl;
          throw new Error('Réponse vide du modèle de génération d\'image');
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        imageFailures.push(`[${tierLabel}: ${providerConfig.label}]: ${msg}`);
        logger.warn({ purpose, tier: tierLabel, provider: providerConfig.provider, err: msg }, 'Échec génération image IA, basculement au secours');
      }
    }

    throw new PdValidationError(
      `Échec de génération d'image IA : Tous les modèles configurés pour '${purpose}' ont échoué (${imageFailures.join(' | ')}). Veuillez vérifier vos clés API et les quotas dans le tableau de bord SuperAdmin.`,
    );
  }
}

export const aiConfigService = new AiConfigService();
