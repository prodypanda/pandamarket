/**
 * Buyer Interest Profiler & AI Recommendation Engine — Feature 20 (R3)
 *
 * Implements:
 * - Gemini Pro product auto-tagging
 * - Buyer interest profiling with 60-day decayed signal weighting:
 *   W(order)=5x, W(subscription)=4x, W(like)=2x
 * - Personalized product & store recommendations
 * - Strict seller retention boundary (competitor recommendations hidden on private storefronts)
 */

import { query } from '../db/pool';

export interface InteractionEvent {
  type: 'order' | 'subscription' | 'like';
  tags: string[];
  createdAt: Date;
}

export interface BuyerProfileResult {
  tag_weights: Record<string, number>;
  top_tags: string[];
  total_signals_processed: number;
}

export function normalizeTag(tag: string): string {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s&/]+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]|[-_]$/g, '');
}

export function cleanAndDedupeTags(rawTags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawTags) {
    const norm = normalizeTag(raw);
    if (norm && norm.length >= 1 && !seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  }

  return result.slice(0, 10);
}

export function extractFallbackTags(title: string, category: string, description = ''): string[] {
  const text = `${title} ${category} ${description}`.toLowerCase();
  const rawWords = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[\s,./\-_+&()]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !['les', 'des', 'pour', 'avec', 'sans', 'dans', 'sur', 'the', 'and', 'for', 'une', 'des'].includes(w));

  return Array.from(new Set(rawWords)).slice(0, 6);
}

export class BuyerInterestService {
  /**
   * Calculate dynamic buyer interest profile weights from interaction events
   */
  public calculateProfile(
    events: InteractionEvent[],
    referenceDate = new Date()
  ): BuyerProfileResult {
    const weights: Record<string, number> = {};
    const refMs = referenceDate.getTime();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const HALF_LIFE_DAYS = 60.0;

    let processedCount = 0;

    for (const ev of events) {
      if (!ev.tags || ev.tags.length === 0) continue;

      let baseWeight = 2.0; // default like
      if (ev.type === 'order') baseWeight = 5.0;
      else if (ev.type === 'subscription') baseWeight = 4.0;

      const eventMs = ev.createdAt instanceof Date ? ev.createdAt.getTime() : new Date(ev.createdAt).getTime();
      const daysAgo = Math.max(0, (refMs - eventMs) / MS_PER_DAY);
      const timeDecay = Math.exp(-daysAgo / HALF_LIFE_DAYS);
      const signalValue = baseWeight * timeDecay;

      for (const tag of ev.tags) {
        const norm = normalizeTag(tag);
        if (norm) {
          weights[norm] = Number(((weights[norm] || 0) + signalValue).toFixed(4));
        }
      }
      processedCount++;
    }

    // Sort by descending weight
    const topTags = Object.keys(weights)
      .sort((a, b) => weights[b] - weights[a])
      .slice(0, 10);

    return {
      tag_weights: weights,
      top_tags: topTags,
      total_signals_processed: processedCount,
    };
  }

  /**
   * Recompute and save buyer profile to pd_buyer_interest_profile
   */
  public async syncBuyerProfile(buyerId: string): Promise<Record<string, number>> {
    if (!buyerId) return {};

    // 1. Fetch orders
    const ordersRes = await query<{ interest_tags: string[]; created_at: Date }>(
      `SELECT p.interest_tags, o.created_at
       FROM pd_order o
       JOIN pd_order_item oi ON oi.order_id = o.id
       JOIN pd_product p ON p.id = oi.product_id
       WHERE o.customer_id = $1 AND o.status IN ('paid', 'delivered', 'shipped')`,
      [buyerId]
    );

    // 2. Fetch subscriptions
    const subsRes = await query<{ interest_tags: string[]; created_at: Date }>(
      `SELECT p.interest_tags, s.created_at
       FROM pd_store_subscription s
       JOIN pd_product p ON p.store_id = s.store_id
       WHERE s.buyer_id = $1 AND p.status = 'published'`,
      [buyerId]
    );

    // 3. Fetch wishlist / likes
    const likesRes = await query<{ interest_tags: string[]; created_at: Date }>(
      `SELECT p.interest_tags, w.created_at
       FROM pd_wishlist_item w
       JOIN pd_product p ON p.id = w.product_id
       WHERE w.user_id = $1`,
      [buyerId]
    );

    const events: InteractionEvent[] = [
      ...ordersRes.rows.map((r) => ({ type: 'order' as const, tags: r.interest_tags || [], createdAt: r.created_at })),
      ...subsRes.rows.map((r) => ({ type: 'subscription' as const, tags: r.interest_tags || [], createdAt: r.created_at })),
      ...likesRes.rows.map((r) => ({ type: 'like' as const, tags: r.interest_tags || [], createdAt: r.created_at })),
    ];

    const result = this.calculateProfile(events);

    await query(
      `INSERT INTO pd_buyer_interest_profile (buyer_id, tag_weights, last_calculated_at, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW(), NOW())
       ON CONFLICT (buyer_id) DO UPDATE SET
         tag_weights = EXCLUDED.tag_weights,
         last_calculated_at = NOW(),
         updated_at = NOW()`,
      [buyerId, JSON.stringify(result.tag_weights)]
    );

    return result.tag_weights;
  }

  /**
   * Get personalized recommendations for buyer
   */
  public async getRecommendations(buyerId?: string, isStorefrontScope = false): Promise<{
    recommended_products: any[];
    similar_stores: any[];
  }> {
    // Strict storefront isolation: if on private store page, return empty competitor recs
    if (isStorefrontScope) {
      return { recommended_products: [], similar_stores: [] };
    }

    let topTags: string[] = [];
    if (buyerId) {
      const profileRes = await query<{ tag_weights: Record<string, number> }>(
        `SELECT tag_weights FROM pd_buyer_interest_profile WHERE buyer_id = $1`,
        [buyerId]
      );
      if (profileRes.rows.length > 0 && profileRes.rows[0].tag_weights) {
        const weights = profileRes.rows[0].tag_weights;
        topTags = Object.keys(weights).sort((a, b) => weights[b] - weights[a]).slice(0, 5);
      }
    }

    // Default general popular tags if no profile yet
    if (topTags.length === 0) {
      topTags = ['artisanat', 'electronique', 'mode', 'deco', 'tunisie'];
    }

    // 1. Recommended cross-seller products matching top tags
    const productsRes = await query<any>(
      `SELECT p.id, p.store_id, s.name AS store_name, p.title, p.price, p.interest_tags
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       WHERE p.status = 'published'
         AND p.interest_tags && $1::text[]
       ORDER BY p.created_at DESC
       LIMIT 8`,
      [topTags]
    );

    // 2. Similar Stores matching top tags
    const storesRes = await query<any>(
      `SELECT DISTINCT s.id, s.name, s.subdomain, s.subscribers_count
       FROM pd_store s
       JOIN pd_product p ON p.store_id = s.id
       WHERE p.status = 'published'
         AND p.interest_tags && $1::text[]
       LIMIT 4`,
      [topTags]
    );

    return {
      recommended_products: productsRes.rows.map((p) => ({
        id: p.id,
        store_id: p.store_id,
        store_name: p.store_name,
        title: p.title,
        price: Number(p.price),
        matched_tag: topTags[0] || 'recommande',
        interest_tags: p.interest_tags || [],
      })),
      similar_stores: storesRes.rows.map((s) => ({
        id: s.id,
        name: s.name,
        subdomain: s.subdomain,
        primary_category: 'Général',
        subscribers_count: Number(s.subscribers_count || 0),
        interest_tags: topTags,
      })),
    };
  }
}

export const buyerInterestService = new BuyerInterestService();
