/**
 * AI Product Auto-Tagger Service — Feature 20 (R3)
 *
 * Automatically generates 4–8 normalized lowercase semantic interest tags
 * for products using Gemini Pro with resilient fallback keyword extraction.
 * Tags are persisted to pd_product.interest_tags (TEXT[]) and indexed via GIN.
 */

import { query } from '../db/pool';
import { logger } from '../utils/logger';
import { aiQueue } from '../queues/ai-queue';
import { aiConfigService } from './ai-config.service';
import { cleanAndDedupeTags, extractFallbackTags } from './buyer-interest.service';

export interface AiTaggingOptions {
  force?: boolean;
  storeId?: string;
}

export interface AiTaggingResult {
  productId: string;
  tags: string[];
  source: 'gemini-pro' | 'fallback';
  syncedAt: Date;
}

export interface ExtractTagsInput {
  title: string;
  category?: string | null;
  description?: string | null;
  attributes?: Array<{ name: string; value: string }>;
}

export class AiProductTaggerService {
  /**
   * Extract 4–8 normalized lowercase interest tags using Gemini Pro or heuristic fallback
   */
  async extractTags(
    product: ExtractTagsInput,
    storeId?: string
  ): Promise<{ tags: string[]; source: 'gemini-pro' | 'fallback' }> {
    if (!product.title || product.title.trim().length === 0) {
      return {
        tags: [],
        source: 'fallback',
      };
    }

    const fallback = extractFallbackTags(product.title, product.category || '', product.description || '');

    const prompt = `You are an e-commerce semantic tagging expert for the PandaMarket marketplace.
Analyze the product below and generate 4 to 8 normalized, lowercase interest tags describing the product's semantic domain, category, technical domain, and usage.
Rules:
- Return ONLY valid JSON: { "tags": string[] }
- Tags must be lowercase, 2-30 chars, no accents/diacritics, hyphen-separated for multi-words (e.g. "arduino", "microcontroller", "electronique", "robotique", "diy", "programmation").
- Return between 4 and 8 relevant semantic tags.

Product:
- Title: ${product.title}
- Category: ${product.category || 'General'}
- Description: ${product.description ? product.description.slice(0, 500) : '(no description)'}
${product.attributes && product.attributes.length > 0 ? `- Attributes: ${product.attributes.map((a) => `${a.name}: ${a.value}`).join(', ')}` : ''}`;

    try {
      const result = await aiConfigService.generateTextForPurpose('product_tagging', prompt, storeId);
      const text = result?.text?.trim() || '';

      if (text) {
        let parsedTags: string[] = [];
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as { tags?: string[] };
            if (Array.isArray(parsed.tags)) {
              parsedTags = parsed.tags;
            }
          }
        } catch {
          // If JSON parse failed, try extracting comma/newline separated words
          const lines = text.replace(/```json|```|[{"}]/g, '').split(/[\n,]+/);
          parsedTags = lines.map((l) => l.trim()).filter((l) => l.length >= 2);
        }

        const cleaned = cleanAndDedupeTags(parsedTags);
        if (cleaned.length >= 4) {
          return {
            tags: cleaned.slice(0, 8),
            source: 'gemini-pro',
          };
        }

        // If fewer than 4 tags returned, supplement with fallback keywords
        const supplemented = cleanAndDedupeTags([...cleaned, ...fallback]);
        return {
          tags: supplemented.slice(0, 8),
          source: 'gemini-pro',
        };
      }
    } catch (err: any) {
      logger.warn({ title: product.title, err: err?.message }, 'Gemini AI tagging failed, falling back to heuristic tags');
    }

    return {
      tags: cleanAndDedupeTags(fallback).slice(0, 8),
      source: 'fallback',
    };
  }

  /**
   * Tag a single product by ID and save interest_tags to database
   */
  async tagProduct(productId: string, options?: AiTaggingOptions): Promise<AiTaggingResult> {
    const { rows } = await query<{
      id: string;
      store_id: string;
      title: string;
      category: string | null;
      description: string | null;
      interest_tags: string[];
      interest_tags_synced_at: Date | null;
      attributes: any;
    }>(
      `SELECT id, store_id, title, category, description, interest_tags, interest_tags_synced_at, attributes
       FROM pd_product
       WHERE id = $1`,
      [productId]
    );

    const product = rows[0];
    if (!product) {
      throw new Error(`Product not found for tagging: ${productId}`);
    }

    if (!options?.force && product.interest_tags && product.interest_tags.length >= 4 && product.interest_tags_synced_at) {
      return {
        productId,
        tags: product.interest_tags,
        source: 'gemini-pro',
        syncedAt: product.interest_tags_synced_at,
      };
    }

    let parsedAttributes: Array<{ name: string; value: string }> = [];
    if (product.attributes) {
      try {
        parsedAttributes = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
      } catch {
        parsedAttributes = [];
      }
    }

    const { tags, source } = await this.extractTags(
      {
        title: product.title,
        category: product.category,
        description: product.description,
        attributes: parsedAttributes,
      },
      options?.storeId || product.store_id
    );

    const now = new Date();
    await query(
      `UPDATE pd_product
       SET interest_tags = $2::text[],
           interest_tags_synced_at = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [productId, tags, now]
    );

    logger.info({ productId, tagCount: tags.length, source }, 'Product interest tags successfully updated');

    return {
      productId,
      tags,
      source,
      syncedAt: now,
    };
  }

  /**
   * Queue product tagging job to BullMQ pd_ai_queue
   */
  async queueProductTagging(productId: string, storeId?: string): Promise<void> {
    try {
      await aiQueue.add(
        'product_tagging',
        {
          type: 'product_tagging',
          product_id: productId,
          productId,
          store_id: storeId,
          storeId,
          job_id: `tag_${productId}_${Date.now()}`,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
      logger.info({ productId, storeId }, 'Product tagging job queued');
    } catch (err: any) {
      logger.error({ productId, err: err?.message }, 'Failed to enqueue product tagging job');
    }
  }

  /**
   * Batch process untagged published products
   */
  async sweepUntaggedProducts(
    limit = 100,
    forceAll = false
  ): Promise<{
    totalScanned: number;
    tagged: number;
    failed: number;
    fallbackUsed: number;
  }> {
    const whereClause = forceAll
      ? `status = 'published'`
      : `status = 'published' AND (interest_tags = '{}' OR interest_tags IS NULL OR interest_tags_synced_at IS NULL)`;

    const { rows } = await query<{ id: string; store_id: string }>(
      `SELECT id, store_id FROM pd_product WHERE ${whereClause} ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    let tagged = 0;
    let failed = 0;
    let fallbackUsed = 0;

    for (const p of rows) {
      try {
        const result = await this.tagProduct(p.id, { force: true, storeId: p.store_id });
        tagged++;
        if (result.source === 'fallback') {
          fallbackUsed++;
        }
      } catch (err: any) {
        failed++;
        logger.error({ productId: p.id, err: err?.message }, 'Sweep failed to tag product');
      }
    }

    return {
      totalScanned: rows.length,
      tagged,
      failed,
      fallbackUsed,
    };
  }

  /**
   * Get tagging diagnostic health monitor statistics
   */
  async getTaggingHealth(): Promise<{
    status: 'healthy' | 'degraded';
    totalProducts: number;
    taggedProducts: number;
    tagCoveragePct: number;
    topTags: Array<{ tag: string; count: number }>;
    lastSweepAt: string;
  }> {
    const totalRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_product WHERE status = 'published'`
    );
    const taggedRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_product WHERE status = 'published' AND array_length(interest_tags, 1) > 0`
    );

    const total = parseInt(totalRes.rows[0]?.count || '0', 10);
    const tagged = parseInt(taggedRes.rows[0]?.count || '0', 10);
    const coveragePct = total > 0 ? Math.round((tagged / total) * 100) : 100;

    const topTagsRes = await query<{ tag: string; count: string }>(
      `SELECT unnest(interest_tags) AS tag, COUNT(*)::text AS count
       FROM pd_product
       WHERE status = 'published'
       GROUP BY tag
       ORDER BY count DESC
       LIMIT 10`
    );

    return {
      status: coveragePct >= 80 ? 'healthy' : 'degraded',
      totalProducts: total,
      taggedProducts: tagged,
      tagCoveragePct: coveragePct,
      topTags: topTagsRes.rows.map((r) => ({ tag: r.tag, count: parseInt(r.count, 10) })),
      lastSweepAt: new Date().toISOString(),
    };
  }
}

export const aiProductTaggerService = new AiProductTaggerService();
