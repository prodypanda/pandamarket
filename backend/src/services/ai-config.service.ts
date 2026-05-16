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

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'custom';

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

  async generateText(prompt: string, storeId?: string): Promise<TextGenerationResult> {
    const attempts = await this.getGenerationAttempts(storeId);
    if (attempts.length === 0) throw new PdValidationError('AI text provider is not configured.');

    const failures: string[] = [];
    for (const attempt of attempts) {
      try {
        const text = await generateWithProvider({
          provider: attempt.provider,
          model: attempt.model,
          base_url: attempt.base_url,
          api_key: attempt.api_key,
          prompt,
        });
        if (!text.trim()) throw new Error('AI provider returned an empty response');
        return {
          text,
          provider: attempt.provider,
          provider_label: attempt.label,
          source: attempt.source,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failures.push(`${attempt.label}: ${message}`);
        logger.warn({ provider: attempt.provider, source: attempt.source, err: message }, 'AI provider attempt failed');
      }
    }

    throw new PdValidationError(`All AI providers failed: ${failures.join(' | ')}`);
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
        attempts.push({
          provider: rows[0].provider,
          label: 'Seller AI provider',
          model: rows[0].model,
          base_url: rows[0].base_url,
          api_key: decrypt(rows[0].api_key_encrypted),
          source: 'seller',
        });
      }
    }

    const { rows } = await query<ProviderRow>(
      `SELECT * FROM pd_ai_provider_config
       WHERE is_enabled = true AND api_key_encrypted IS NOT NULL
       ORDER BY is_default DESC, priority ASC, created_at ASC`,
    );
    for (const row of rows) {
      if (!row.api_key_encrypted) continue;
      attempts.push({
        provider: row.provider,
        label: row.label,
        model: row.model,
        base_url: row.base_url,
        api_key: decrypt(row.api_key_encrypted),
        source: 'platform',
      });
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
}

export const aiConfigService = new AiConfigService();
