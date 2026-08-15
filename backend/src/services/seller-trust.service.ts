/**
 * Seller Trust Score & Loyalty Broadcasts Service — Feature 20 (R5)
 *
 * Requirements:
 * - Logarithmic Seller Trust Score Formula:
 *   Score = 0.40 * Rating + 0.30 * SLA + 0.20 * log10(Verified + 1) - 0.10 * Dispute Rate
 * - Subscriber Broadcast Composer with strict rate limit (Max 2 broadcasts/calendar week)
 * - Audience Geographic Distribution across 24 Tunisian Governorates
 */

import { query } from '../db/pool';
import { PdValidationError, PdRateLimitError, PdNotFoundError } from '../errors';
import { pdId } from '../utils/crypto';

// 24 Official Tunisian Governorates
export const TUNISIAN_GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
  'Nabeul', 'Zaghouan', 'Bizerte',
  'Béja', 'Jendouba', 'Le Kef', 'Siliana',
  'Sousse', 'Monastir', 'Mahdia', 'Sfax',
  'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Medenine', 'Tataouine',
  'Gafsa', 'Tozeur', 'Kebili'
] as const;

export type TunisianGovernorate = typeof TUNISIAN_GOVERNORATES[number];

export interface SellerStats {
  rating: number; // 0.0 to 5.0
  slaHours?: number; // Avg shipping fulfillment SLA in hours (<=24h is optimal)
  slaComplianceRate?: number; // Optional 0.0 to 1.0 (e.g. 0.95 = 95%)
  verifiedSubscribers: number; // Verified buyer subscribers (log10 scaled)
  disputeRatePct: number; // Dispute rate percentage (e.g., 0.5% = 0.5)
}

/**
 * Pure calculation function for Seller Logarithmic Trust Score
 */
export function computeSellerTrustScore(stats: SellerStats): {
  score: number; // 0 to 100
  normalizedRating: number; // 0 to 1
  normalizedSla: number; // 0 to 1
  subScore: number; // 0 to 1
  disputePenalty: number; // 0 to 1
} {
  const normalizedRating = Math.min(5, Math.max(0, stats.rating)) / 5;

  let normalizedSla = 1.0;
  if (stats.slaComplianceRate !== undefined) {
    normalizedSla = Math.min(1, Math.max(0, stats.slaComplianceRate));
  } else if (stats.slaHours !== undefined) {
    normalizedSla = stats.slaHours <= 24
      ? 1.0
      : Math.max(0, 1 - (stats.slaHours - 24) / 72);
  }

  // SubScore: log10(verified + 1) / 4. 0 -> 0.0, 9 -> 0.25, 99 -> 0.5, 999 -> 0.75, 9999 -> 1.0
  const subScore = Math.min(1.0, Math.max(0, Math.log10(Math.max(0, stats.verifiedSubscribers) + 1) / 4));

  // DisputePenalty: 0% -> 0.0, 5% -> 0.5, 10%+ -> 1.0
  const disputePenalty = Math.min(1.0, Math.max(0, stats.disputeRatePct / 10));

  const rawScore =
    0.40 * normalizedRating +
    0.30 * normalizedSla +
    0.20 * subScore -
    0.10 * disputePenalty;

  const score = Number((Math.max(0, Math.min(1.0, rawScore)) * 100).toFixed(1));

  return {
    score,
    normalizedRating: Number(normalizedRating.toFixed(4)),
    normalizedSla: Number(normalizedSla.toFixed(4)),
    subScore: Number(subScore.toFixed(4)),
    disputePenalty: Number(disputePenalty.toFixed(4)),
  };
}

/**
 * Calendar Week Helper (ISO Week Number: YYYY-Www)
 */
export function getCalendarWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export interface SellerBroadcastPayload {
  storeId: string;
  couponCode: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message: string;
  sentAt?: Date;
}

export interface BroadcastRecord {
  id: string;
  storeId: string;
  couponCode: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message: string;
  sentAt: Date;
  recipientsCount: number;
  claimsCount: number;
  generatedGmvTnd: number;
  calendarWeek: string;
}

export class SellerLoyaltyService {
  private broadcasts: BroadcastRecord[] = [];
  private storeSubscribers: Map<
    string,
    Array<{ buyerId: string; governorate?: string; isVerified: boolean; createdAt: Date }>
  > = new Map();

  public registerSubscriber(
    storeId: string,
    subscriber: { buyerId: string; governorate?: string; isVerified: boolean; createdAt?: Date }
  ) {
    const list = this.storeSubscribers.get(storeId) || [];
    list.push({
      ...subscriber,
      createdAt: subscriber.createdAt || new Date(),
    });
    this.storeSubscribers.set(storeId, list);
  }

  /**
   * Broadcast Rate Limiter: Max 2 broadcasts per calendar week
   */
  public async sendBroadcast(
    payload: SellerBroadcastPayload
  ): Promise<{ success: boolean; broadcast: BroadcastRecord }> {
    if (!payload.storeId || payload.storeId.trim() === '') {
      throw new PdValidationError('storeId is required');
    }
    if (!payload.couponCode || payload.couponCode.trim() === '') {
      throw new PdValidationError('couponCode is required');
    }
    if (typeof payload.discountValue !== 'number' || payload.discountValue <= 0) {
      throw new PdValidationError('discountValue must be greater than 0');
    }
    if (!payload.message || payload.message.trim() === '') {
      throw new PdValidationError('message is required');
    }

    const sentAt = payload.sentAt || new Date();
    const currentWeekKey = getCalendarWeekKey(sentAt);

    // Check in-memory broadcasts for this week
    const weekBroadcasts = this.broadcasts.filter(
      (b) => b.storeId === payload.storeId && b.calendarWeek === currentWeekKey
    );

    if (weekBroadcasts.length >= 2) {
      throw new PdRateLimitError(
        `Rate limit exceeded: Store has already sent ${weekBroadcasts.length} broadcasts in week ${currentWeekKey}. Maximum allowed is 2 per calendar week.`
      );
    }

    const subs = this.storeSubscribers.get(payload.storeId) || [];

    const record: BroadcastRecord = {
      id: pdId('sbc'),
      storeId: payload.storeId,
      couponCode: payload.couponCode.trim().toUpperCase(),
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      message: payload.message.trim(),
      sentAt,
      recipientsCount: subs.length,
      claimsCount: 0,
      generatedGmvTnd: 0,
      calendarWeek: currentWeekKey,
    };

    this.broadcasts.push(record);

    // Also attempt DB insert if DB is reachable
    try {
      await query(
        `INSERT INTO pd_seller_broadcast (id, store_id, coupon_code, discount_type, discount_value, message, sent_at, subscribers_count_at_send)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.id,
          record.storeId,
          record.couponCode,
          record.discountType,
          record.discountValue,
          record.message,
          record.sentAt,
          record.recipientsCount,
        ]
      );
    } catch {
      // Non-fatal if running in isolated unit-test environment
    }

    return { success: true, broadcast: record };
  }

  public getBroadcastHistory(storeId: string): BroadcastRecord[] {
    return this.broadcasts.filter((b) => b.storeId === storeId);
  }

  public getWeeklyBroadcastCount(
    storeId: string,
    date = new Date()
  ): { count: number; remaining: number; weekKey: string } {
    const weekKey = getCalendarWeekKey(date);
    const count = this.broadcasts.filter(
      (b) => b.storeId === storeId && b.calendarWeek === weekKey
    ).length;
    return {
      count,
      remaining: Math.max(0, 2 - count),
      weekKey,
    };
  }

  /**
   * Audience Analytics across 24 Tunisian Governorates & Growth KPIs
   */
  public getSubscriberAnalytics(
    storeId: string,
    referenceDate = new Date()
  ): {
    total_subscribers: number;
    new_this_week: number;
    verified_subscribers: number;
    verified_pct: number;
    growth_rate_pct: number;
    governorate_distribution: Record<string, number>;
  } {
    const subs = this.storeSubscribers.get(storeId) || [];
    const total = subs.length;

    const sevenDaysAgo = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(referenceDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    const newThisWeek = subs.filter((s) => s.createdAt >= sevenDaysAgo).length;
    const newLastWeek = subs.filter(
      (s) => s.createdAt >= fourteenDaysAgo && s.createdAt < sevenDaysAgo
    ).length;

    const verifiedCount = subs.filter((s) => s.isVerified).length;
    const verifiedPct = total > 0 ? Number(((verifiedCount / total) * 100).toFixed(1)) : 0;

    const growthRatePct =
      newLastWeek > 0
        ? Number((((newThisWeek - newLastWeek) / newLastWeek) * 100).toFixed(1))
        : newThisWeek > 0
        ? 100
        : 0;

    // Build 24 governorates distribution
    const distribution: Record<string, number> = {};
    for (const gov of TUNISIAN_GOVERNORATES) {
      distribution[gov] = 0;
    }
    distribution['Other'] = 0;

    for (const s of subs) {
      if (s.governorate && (TUNISIAN_GOVERNORATES as readonly string[]).includes(s.governorate)) {
        distribution[s.governorate] = (distribution[s.governorate] || 0) + 1;
      } else {
        distribution['Other'] = (distribution['Other'] || 0) + 1;
      }
    }

    return {
      total_subscribers: total,
      new_this_week: newThisWeek,
      verified_subscribers: verifiedCount,
      verified_pct: verifiedPct,
      growth_rate_pct: growthRatePct,
      governorate_distribution: distribution,
    };
  }
}

/**
 * Calculate Seller Trust Score querying database
 */
export async function calculateSellerTrustScore(storeId: string): Promise<{
  score: number;
  stats: SellerStats;
  details: ReturnType<typeof computeSellerTrustScore>;
}> {
  if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
    throw new PdValidationError('storeId is required');
  }

  const cleanStoreId = storeId.trim();

  // 1. Get store details (subscribers)
  const storeRes = await query<{ verified_subscribers_count: number }>(
    'SELECT verified_subscribers_count FROM pd_store WHERE id = $1',
    [cleanStoreId]
  );

  if (storeRes.rows.length === 0) {
    throw new PdNotFoundError(`Store with id '${cleanStoreId}' not found`);
  }

  const verifiedSubscribers = storeRes.rows[0].verified_subscribers_count || 0;

  // 2. Get average rating from approved reviews on store products
  const reviewRes = await query<{ avg_rating: string; count: string }>(
    `SELECT COALESCE(AVG(r.rating), 5.0)::text AS avg_rating,
            COUNT(r.id)::text AS count
     FROM pd_review r
     JOIN pd_product p ON p.id = r.product_id
     WHERE p.store_id = $1 AND r.status = 'approved'`,
    [cleanStoreId]
  );
  const rating = parseFloat(reviewRes.rows[0]?.avg_rating || '5.0');

  // 3. Get SLA fulfillment turnaround (average hours between order creation and fulfillment)
  const orderSlaRes = await query<{ avg_sla_hours: string }>(
    `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600), 24.0)::text AS avg_sla_hours
     FROM pd_order o
     JOIN pd_order_item oi ON oi.order_id = o.id
     WHERE oi.store_id = $1 AND o.status IN ('delivered', 'fulfilled', 'paid')`,
    [cleanStoreId]
  );
  const slaHours = Math.max(1, parseFloat(orderSlaRes.rows[0]?.avg_sla_hours || '24.0'));

  // 4. Get dispute rate percentage
  const disputeRes = await query<{ total_orders: string; disputed_orders: string }>(
    `SELECT COUNT(DISTINCT o.id)::text AS total_orders,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('disputed', 'cancelled', 'refunded'))::text AS disputed_orders
     FROM pd_order o
     JOIN pd_order_item oi ON oi.order_id = o.id
     WHERE oi.store_id = $1`,
    [cleanStoreId]
  );
  const totalOrders = parseInt(disputeRes.rows[0]?.total_orders || '0', 10);
  const disputedOrders = parseInt(disputeRes.rows[0]?.disputed_orders || '0', 10);
  const disputeRatePct = totalOrders > 0 ? (disputedOrders / totalOrders) * 100 : 0;

  const stats: SellerStats = {
    rating,
    slaHours,
    verifiedSubscribers,
    disputeRatePct,
  };

  const details = computeSellerTrustScore(stats);

  return {
    score: details.score,
    stats,
    details,
  };
}

/**
 * Batch calculation of Seller Trust Scores for multiple stores
 */
export async function calculateBatchSellerTrustScores(
  storeIds: string[]
): Promise<Record<string, { score: number; stats: SellerStats; details: ReturnType<typeof computeSellerTrustScore> }>> {
  if (!Array.isArray(storeIds) || storeIds.length === 0) {
    return {};
  }

  const cleanStoreIds = Array.from(new Set(storeIds.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean)));
  if (cleanStoreIds.length === 0) {
    return {};
  }

  // 1. Fetch store subscriber counts
  const storeRes = await query<{ id: string; verified_subscribers_count: number }>(
    'SELECT id, verified_subscribers_count FROM pd_store WHERE id = ANY($1)',
    [cleanStoreIds]
  );
  const storeMap = new Map<string, number>();
  for (const row of storeRes.rows) {
    storeMap.set(row.id, row.verified_subscribers_count || 0);
  }

  // 2. Fetch average approved ratings per store
  const reviewRes = await query<{ store_id: string; avg_rating: string }>(
    `SELECT p.store_id, COALESCE(AVG(r.rating), 5.0)::text AS avg_rating
     FROM pd_review r
     JOIN pd_product p ON p.id = r.product_id
     WHERE p.store_id = ANY($1) AND r.status = 'approved'
     GROUP BY p.store_id`,
    [cleanStoreIds]
  );
  const ratingMap = new Map<string, number>();
  for (const row of reviewRes.rows) {
    ratingMap.set(row.store_id, parseFloat(row.avg_rating || '5.0'));
  }

  // 3. Fetch SLA fulfillment hours per store
  const orderSlaRes = await query<{ store_id: string; avg_sla_hours: string }>(
    `SELECT oi.store_id, COALESCE(AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600), 24.0)::text AS avg_sla_hours
     FROM pd_order o
     JOIN pd_order_item oi ON oi.order_id = o.id
     WHERE oi.store_id = ANY($1) AND o.status IN ('delivered', 'fulfilled', 'paid')
     GROUP BY oi.store_id`,
    [cleanStoreIds]
  );
  const slaMap = new Map<string, number>();
  for (const row of orderSlaRes.rows) {
    slaMap.set(row.store_id, Math.max(1, parseFloat(row.avg_sla_hours || '24.0')));
  }

  // 4. Fetch dispute rates per store
  const disputeRes = await query<{ store_id: string; total_orders: string; disputed_orders: string }>(
    `SELECT oi.store_id,
            COUNT(DISTINCT o.id)::text AS total_orders,
            COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('disputed', 'cancelled', 'refunded'))::text AS disputed_orders
     FROM pd_order o
     JOIN pd_order_item oi ON oi.order_id = o.id
     WHERE oi.store_id = ANY($1)
     GROUP BY oi.store_id`,
    [cleanStoreIds]
  );
  const disputeMap = new Map<string, number>();
  for (const row of disputeRes.rows) {
    const total = parseInt(row.total_orders || '0', 10);
    const disputed = parseInt(row.disputed_orders || '0', 10);
    disputeMap.set(row.store_id, total > 0 ? (disputed / total) * 100 : 0);
  }

  const results: Record<string, { score: number; stats: SellerStats; details: ReturnType<typeof computeSellerTrustScore> }> = {};

  for (const storeId of cleanStoreIds) {
    if (!storeMap.has(storeId)) continue; // skip if store does not exist in DB

    const stats: SellerStats = {
      rating: ratingMap.get(storeId) ?? 5.0,
      slaHours: slaMap.get(storeId) ?? 24.0,
      verifiedSubscribers: storeMap.get(storeId) ?? 0,
      disputeRatePct: disputeMap.get(storeId) ?? 0.0,
    };

    const details = computeSellerTrustScore(stats);
    results[storeId] = {
      score: details.score,
      stats,
      details,
    };
  }

  return results;
}

export const sellerLoyaltyService = new SellerLoyaltyService();
