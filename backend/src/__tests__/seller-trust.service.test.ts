/**
 * Seller Trust Score & Loyalty Broadcasts Test Suite — Feature 20 (R5)
 *
 * Requirements:
 * - Logarithmic Seller Trust Score Formula:
 *   Score = 0.40 * Rating + 0.30 * SLA + 0.20 * log10(Verified + 1) - 0.10 * Dispute Rate
 * - Subscriber Broadcast Composer with strict rate limit (Max 2 broadcasts/calendar week)
 * - Audience Geographic Distribution across 24 Tunisian Governorates
 * - Tier 1 (Happy-Path), Tier 2 (Boundary/Edge Cases), Tier 3 (Pairwise), Tier 4 (E2E Workflow)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PdValidationError, PdRateLimitError, PdNotFoundError } from '../errors';

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

// Core Trust Score Calculation Function
export interface SellerStats {
  rating: number; // 0.0 to 5.0
  slaHours: number; // Avg shipping fulfillment SLA in hours (<=24h is optimal)
  verifiedSubscribers: number; // Verified buyer subscribers (log10 scaled)
  disputeRatePct: number; // Dispute rate percentage (e.g., 0.5% = 0.5)
}

export function computeSellerTrustScore(stats: SellerStats): {
  score: number; // 0 to 100
  normalizedRating: number; // 0 to 1
  normalizedSla: number; // 0 to 1
  subScore: number; // 0 to 1
  disputePenalty: number; // 0 to 1
} {
  const normalizedRating = Math.min(5, Math.max(0, stats.rating)) / 5;
  
  // SLA <= 24h gives full 1.0 score. 96h gives 0.0. Linear penalty between 24h and 96h.
  const normalizedSla = stats.slaHours <= 24
    ? 1.0
    : Math.max(0, 1 - (stats.slaHours - 24) / 72);

  // SubScore: log10(verified + 1) / 4. 0 -> 0.0, 9 -> 0.25, 99 -> 0.5, 999 -> 0.75, 9999 -> 1.0
  const subScore = Math.min(1.0, Math.max(0, Math.log10(stats.verifiedSubscribers + 1) / 4));

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

// Calendar Week Helper (ISO Week Number)
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
  private storeSubscribers: Map<string, Array<{ buyerId: string; governorate?: string; isVerified: boolean; createdAt: Date }>> = new Map();

  public registerSubscriber(storeId: string, subscriber: { buyerId: string; governorate?: string; isVerified: boolean; createdAt?: Date }) {
    const list = this.storeSubscribers.get(storeId) || [];
    list.push({
      ...subscriber,
      createdAt: subscriber.createdAt || new Date(),
    });
    this.storeSubscribers.set(storeId, list);
  }

  // Broadcast Rate Limiter: Max 2 broadcasts per calendar week
  public async sendBroadcast(payload: SellerBroadcastPayload): Promise<{ success: boolean; broadcast: BroadcastRecord }> {
    if (!payload.storeId) throw new PdValidationError('storeId is required');
    if (!payload.couponCode || payload.couponCode.trim() === '') throw new PdValidationError('couponCode is required');
    if (payload.discountValue <= 0) throw new PdValidationError('discountValue must be greater than 0');
    if (!payload.message || payload.message.trim() === '') throw new PdValidationError('message is required');

    const sentAt = payload.sentAt || new Date();
    const currentWeekKey = getCalendarWeekKey(sentAt);

    // Check rate limit for this store in this calendar week
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
      id: `sbc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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

    return { success: true, broadcast: record };
  }

  public getBroadcastHistory(storeId: string): BroadcastRecord[] {
    return this.broadcasts.filter((b) => b.storeId === storeId);
  }

  public getWeeklyBroadcastCount(storeId: string, date = new Date()): { count: number; remaining: number; weekKey: string } {
    const weekKey = getCalendarWeekKey(date);
    const count = this.broadcasts.filter((b) => b.storeId === storeId && b.calendarWeek === weekKey).length;
    return {
      count,
      remaining: Math.max(0, 2 - count),
      weekKey,
    };
  }

  // Audience Analytics across 24 Tunisian Governorates & Growth KPIs
  public getSubscriberAnalytics(storeId: string, referenceDate = new Date()): {
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
    const newLastWeek = subs.filter((s) => s.createdAt >= fourteenDaysAgo && s.createdAt < sevenDaysAgo).length;

    const verifiedCount = subs.filter((s) => s.isVerified).length;
    const verifiedPct = total > 0 ? Number(((verifiedCount / total) * 100).toFixed(1)) : 0;

    const growthRatePct = newLastWeek > 0
      ? Number((((newThisWeek - newLastWeek) / newLastWeek) * 100).toFixed(1))
      : newThisWeek > 0 ? 100 : 0;

    // Build 24 governorates distribution
    const distribution: Record<string, number> = {};
    for (const gov of TUNISIAN_GOVERNORATES) {
      distribution[gov] = 0;
    }
    distribution['Other'] = 0;

    for (const s of subs) {
      if (s.governorate && TUNISIAN_GOVERNORATES.includes(s.governorate as TunisianGovernorate)) {
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

describe('Seller Trust Score & Loyalty Broadcasts — Feature 20 (R5)', () => {
  let loyaltyService: SellerLoyaltyService;

  beforeEach(() => {
    loyaltyService = new SellerLoyaltyService();

    // Seed test store subscribers across Tunisian governorates
    loyaltyService.registerSubscriber('store_alpha', { buyerId: 'b1', governorate: 'Tunis', isVerified: true });
    loyaltyService.registerSubscriber('store_alpha', { buyerId: 'b2', governorate: 'Ariana', isVerified: true });
    loyaltyService.registerSubscriber('store_alpha', { buyerId: 'b3', governorate: 'Sousse', isVerified: true });
    loyaltyService.registerSubscriber('store_alpha', { buyerId: 'b4', governorate: 'Sfax', isVerified: false });
    loyaltyService.registerSubscriber('store_alpha', { buyerId: 'b5', governorate: 'Nabeul', isVerified: true });
  });

  // =========================================================================
  // Tier 1: Happy-Path Isolated Unit Tests (>= 5 tests)
  // =========================================================================
  describe('Tier 1: Happy-Path Isolated Tests', () => {
    it('T1.1: Standard trust score calculation with realistic metrics', () => {
      // Rating: 4.5/5 (0.90 -> 0.36)
      // SLA: 18h (1.0 -> 0.30)
      // Verified: 999 (log10(1000)/4 = 3/4 = 0.75 -> 0.15)
      // Dispute: 1% (1/10 = 0.10 -> -0.01)
      // Total = 0.36 + 0.30 + 0.15 - 0.01 = 0.80 -> 80.0
      const result = computeSellerTrustScore({
        rating: 4.5,
        slaHours: 18,
        verifiedSubscribers: 999,
        disputeRatePct: 1.0,
      });

      expect(result.score).toBe(80.0);
      expect(result.normalizedRating).toBe(0.9);
      expect(result.normalizedSla).toBe(1.0);
      expect(result.subScore).toBe(0.75);
      expect(result.disputePenalty).toBe(0.1);
    });

    it('T1.2: Perfect seller score calculation yields theoretical maximum of 90.0', () => {
      // Rating 5.0 (0.40*1.0 = 0.40) + SLA 12h (0.30*1.0 = 0.30) + 9999 verified (0.20*1.0 = 0.20) - 0% dispute = 0.90 -> 90.0
      const result = computeSellerTrustScore({
        rating: 5.0,
        slaHours: 12,
        verifiedSubscribers: 9999,
        disputeRatePct: 0.0,
      });

      expect(result.score).toBe(90.0);
    });

    it('T1.3: Logarithmic verified subscriber proof exhibits expected diminishing returns', () => {
      const s0 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
      const s10 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9, disputeRatePct: 0 }); // log10(10)/4 = 0.25 -> +5.0 pts
      const s100 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 99, disputeRatePct: 0 }); // log10(100)/4 = 0.50 -> +10.0 pts
      const s1000 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 999, disputeRatePct: 0 }); // log10(1000)/4 = 0.75 -> +15.0 pts
      const s10000 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 0 }); // log10(10000)/4 = 1.0 -> +20.0 pts

      expect(s0.score).toBe(70.0);
      expect(s10.score).toBe(75.0);
      expect(s100.score).toBe(80.0);
      expect(s1000.score).toBe(85.0);
      expect(s10000.score).toBe(90.0);
    });

    it('T1.4: First and second broadcast in a calendar week succeed', async () => {
      const res1 = await loyaltyService.sendBroadcast({
        storeId: 'store_alpha',
        couponCode: 'VIP10',
        discountType: 'percentage',
        discountValue: 10,
        message: 'Chers abonnés, profitez de 10% !',
      });
      expect(res1.success).toBe(true);
      expect(res1.broadcast.recipientsCount).toBe(5);

      const res2 = await loyaltyService.sendBroadcast({
        storeId: 'store_alpha',
        couponCode: 'FLASH5',
        discountType: 'fixed',
        discountValue: 5,
        message: '5 TND de réduction ce weekend !',
      });
      expect(res2.success).toBe(true);

      const status = loyaltyService.getWeeklyBroadcastCount('store_alpha');
      expect(status.count).toBe(2);
      expect(status.remaining).toBe(0);
    });

    it('T1.5: Audience analytics calculates 24-governorate distribution and growth KPIs', () => {
      const analytics = loyaltyService.getSubscriberAnalytics('store_alpha');

      expect(analytics.total_subscribers).toBe(5);
      expect(analytics.verified_subscribers).toBe(4);
      expect(analytics.verified_pct).toBe(80.0);
      expect(analytics.governorate_distribution['Tunis']).toBe(1);
      expect(analytics.governorate_distribution['Ariana']).toBe(1);
      expect(analytics.governorate_distribution['Sousse']).toBe(1);
      expect(analytics.governorate_distribution['Sfax']).toBe(1);
      expect(analytics.governorate_distribution['Nabeul']).toBe(1);
      expect(analytics.governorate_distribution['Bizerte']).toBe(0);
    });

    it('T1.6: Broadcast history records details with uppercase coupon codes', async () => {
      await loyaltyService.sendBroadcast({
        storeId: 'store_alpha',
        couponCode: 'weekend_special',
        discountType: 'percentage',
        discountValue: 15,
        message: 'Offre exclusive',
      });

      const history = loyaltyService.getBroadcastHistory('store_alpha');
      expect(history).toHaveLength(1);
      expect(history[0].couponCode).toBe('WEEKEND_SPECIAL');
      expect(history[0].discountValue).toBe(15);
    });
  });

  // =========================================================================
  // Tier 2: Boundary & Corner Cases (>= 5 tests)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: 3rd broadcast in same calendar week is rejected with PdRateLimitError', async () => {
      const now = new Date('2026-08-15T10:00:00Z');

      // Send 2 broadcasts in week
      await loyaltyService.sendBroadcast({
        storeId: 'store_alpha',
        couponCode: 'C1',
        discountType: 'percentage',
        discountValue: 10,
        message: 'Msg 1',
        sentAt: now,
      });

      await loyaltyService.sendBroadcast({
        storeId: 'store_alpha',
        couponCode: 'C2',
        discountType: 'percentage',
        discountValue: 15,
        message: 'Msg 2',
        sentAt: now,
      });

      // 3rd broadcast in same week must throw PdRateLimitError
      await expect(
        loyaltyService.sendBroadcast({
          storeId: 'store_alpha',
          couponCode: 'C3',
          discountType: 'percentage',
          discountValue: 20,
          message: 'Msg 3',
          sentAt: now,
        })
      ).rejects.toThrow(PdRateLimitError);
    });

    it('T2.2: Broadcast in the next calendar week succeeds after hitting limit in previous week', async () => {
      const week1Date = new Date('2026-08-10T10:00:00Z'); // Monday
      const week2Date = new Date('2026-08-17T10:00:00Z'); // Next Monday

      // Week 1 limit reached
      await loyaltyService.sendBroadcast({ storeId: 'store_alpha', couponCode: 'W1A', discountType: 'percentage', discountValue: 5, message: 'm', sentAt: week1Date });
      await loyaltyService.sendBroadcast({ storeId: 'store_alpha', couponCode: 'W1B', discountType: 'percentage', discountValue: 5, message: 'm', sentAt: week1Date });

      // Week 2 broadcast must succeed
      const res = await loyaltyService.sendBroadcast({
        storeId: 'store_alpha',
        couponCode: 'W2A',
        discountType: 'percentage',
        discountValue: 10,
        message: 'New week discount',
        sentAt: week2Date,
      });

      expect(res.success).toBe(true);
      expect(loyaltyService.getWeeklyBroadcastCount('store_alpha', week2Date).count).toBe(1);
    });

    it('T2.3: Zero and worst-case metrics clamp score strictly at 0.0 (no negative numbers)', () => {
      const worstResult = computeSellerTrustScore({
        rating: 0,
        slaHours: 120, // > 96h -> 0
        verifiedSubscribers: 0, // 0 -> 0
        disputeRatePct: 50.0, // 50% -> penalty 1.0 (-10 pts)
      });

      expect(worstResult.score).toBe(0.0);
      expect(worstResult.normalizedRating).toBe(0);
      expect(worstResult.normalizedSla).toBe(0);
      expect(worstResult.subScore).toBe(0);
      expect(worstResult.disputePenalty).toBe(1.0);
    });

    it('T2.4: SLA boundaries: exact 24h, 48h, 96h, and >96h', () => {
      const sla24 = computeSellerTrustScore({ rating: 0, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
      const sla48 = computeSellerTrustScore({ rating: 0, slaHours: 48, verifiedSubscribers: 0, disputeRatePct: 0 });
      const sla96 = computeSellerTrustScore({ rating: 0, slaHours: 96, verifiedSubscribers: 0, disputeRatePct: 0 });
      const sla120 = computeSellerTrustScore({ rating: 0, slaHours: 120, verifiedSubscribers: 0, disputeRatePct: 0 });

      expect(sla24.normalizedSla).toBe(1.0); // 30.0 pts
      expect(sla24.score).toBe(30.0);

      expect(sla48.normalizedSla).toBeCloseTo(0.6667, 3); // 20.0 pts
      expect(sla48.score).toBe(20.0);

      expect(sla96.normalizedSla).toBe(0.0); // 0.0 pts
      expect(sla96.score).toBe(0.0);

      expect(sla120.normalizedSla).toBe(0.0);
      expect(sla120.score).toBe(0.0);
    });

    it('T2.5: Extreme verified subscribers count (1,000,000) caps subScore at 1.0', () => {
      const result = computeSellerTrustScore({
        rating: 5,
        slaHours: 24,
        verifiedSubscribers: 1_000_000,
        disputeRatePct: 0,
      });

      expect(result.subScore).toBe(1.0);
      expect(result.score).toBe(90.0);
    });

    it('T2.6: Invalid broadcast parameters throw PdValidationError', async () => {
      await expect(
        loyaltyService.sendBroadcast({
          storeId: '',
          couponCode: 'TEST',
          discountType: 'percentage',
          discountValue: 10,
          message: 'Hello',
        })
      ).rejects.toThrow(PdValidationError);

      await expect(
        loyaltyService.sendBroadcast({
          storeId: 'store_alpha',
          couponCode: '',
          discountType: 'percentage',
          discountValue: 10,
          message: 'Hello',
        })
      ).rejects.toThrow(PdValidationError);

      await expect(
        loyaltyService.sendBroadcast({
          storeId: 'store_alpha',
          couponCode: 'TEST',
          discountType: 'percentage',
          discountValue: -5,
          message: 'Hello',
        })
      ).rejects.toThrow(PdValidationError);

      await expect(
        loyaltyService.sendBroadcast({
          storeId: 'store_alpha',
          couponCode: 'TEST',
          discountType: 'percentage',
          discountValue: 10,
          message: '   ',
        })
      ).rejects.toThrow(PdValidationError);
    });

    it('T2.7: Foreign/Unclassified subscriber addresses map to Other category in governorate map', () => {
      loyaltyService.registerSubscriber('store_unclassified', {
        buyerId: 'b_paris',
        governorate: 'Paris, France',
        isVerified: true,
      });
      loyaltyService.registerSubscriber('store_unclassified', {
        buyerId: 'b_none',
        governorate: undefined,
        isVerified: false,
      });

      const stats = loyaltyService.getSubscriberAnalytics('store_unclassified');
      expect(stats.governorate_distribution['Other']).toBe(2);
      expect(stats.total_subscribers).toBe(2);
    });
  });

  // =========================================================================
  // Tier 3: Pairwise Combinations
  // =========================================================================
  describe('Tier 3: Pairwise Combinations', () => {
    const trustMatrix = [
      { rating: 5.0, sla: 24, subs: 10000, dispute: 0.0, expectedScore: 90.0 },
      { rating: 4.0, sla: 24, subs: 1000, dispute: 1.0, expectedScore: 76.0 },
      { rating: 3.0, sla: 48, subs: 100, dispute: 2.0, expectedScore: 52.0 },
      { rating: 2.0, sla: 72, subs: 10, dispute: 5.0, expectedScore: 26.2 },
      { rating: 1.0, sla: 96, subs: 0, dispute: 10.0, expectedScore: 0.0 },
    ];

    trustMatrix.forEach((tc, idx) => {
      it(`T3.${idx + 1}: Pairwise Trust Score (R=${tc.rating}, SLA=${tc.sla}h, Subs=${tc.subs}, D=${tc.dispute}%)`, () => {
        const res = computeSellerTrustScore({
          rating: tc.rating,
          slaHours: tc.sla,
          verifiedSubscribers: tc.subs,
          disputeRatePct: tc.dispute,
        });

        expect(res.score).toBeCloseTo(tc.expectedScore, 0);
      });
    });
  });

  // =========================================================================
  // Tier 4: Real-World Workflow Integration Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Workflow Integration Scenarios', () => {
    it('T4.1: Scenario 5 — Seller Loyalty Dashboard, Broadcast Rate Limiting & Trust Score Elevation', async () => {
      const storeId = 'store_vip_tech';

      // 1. Register 100 subscribers (75 verified) across Tunisia
      for (let i = 0; i < 75; i++) {
        loyaltyService.registerSubscriber(storeId, {
          buyerId: `b_v_${i}`,
          governorate: TUNISIAN_GOVERNORATES[i % 24],
          isVerified: true,
        });
      }
      for (let i = 0; i < 25; i++) {
        loyaltyService.registerSubscriber(storeId, {
          buyerId: `b_u_${i}`,
          governorate: TUNISIAN_GOVERNORATES[i % 24],
          isVerified: false,
        });
      }

      // 2. Query Dashboard Analytics
      const analytics = loyaltyService.getSubscriberAnalytics(storeId);
      expect(analytics.total_subscribers).toBe(100);
      expect(analytics.verified_subscribers).toBe(75);
      expect(analytics.verified_pct).toBe(75.0);

      // 3. Dispatch Broadcast 1 (15% promo)
      const b1 = await loyaltyService.sendBroadcast({
        storeId,
        couponCode: 'FIDELITE15',
        discountType: 'percentage',
        discountValue: 15,
        message: 'Merci pour votre fidélité ! 15% de remise immédiate.',
      });
      expect(b1.success).toBe(true);

      // 4. Dispatch Broadcast 2 (Fixed 10 TND)
      const b2 = await loyaltyService.sendBroadcast({
        storeId,
        couponCode: 'REDUC10',
        discountType: 'fixed',
        discountValue: 10,
        message: '10 TND offerts dès 50 TND d’achat ce weekend !',
      });
      expect(b2.success).toBe(true);

      // 5. Attempt 3rd Broadcast in same week -> Rejected
      await expect(
        loyaltyService.sendBroadcast({
          storeId,
          couponCode: 'SPAM_REJECT',
          discountType: 'percentage',
          discountValue: 5,
          message: 'Third attempt in same week',
        })
      ).rejects.toThrow(PdRateLimitError);

      // 6. Recalculate Seller Trust Score with 75 verified subscribers
      const trustScore = computeSellerTrustScore({
        rating: 4.8,
        slaHours: 20,
        verifiedSubscribers: analytics.verified_subscribers,
        disputeRatePct: 0.2,
      });

      // Rating: 4.8/5 = 0.96 * 0.40 = 0.384
      // SLA: <= 24h = 1.0 * 0.30 = 0.300
      // Verified: log10(76)/4 ≈ 1.8808 / 4 = 0.4702 * 0.20 = 0.0940
      // Dispute: 0.2 / 10 = 0.02 * 0.10 = 0.002
      // Score ≈ 0.384 + 0.300 + 0.0940 - 0.002 = 0.7760 -> 77.6
      expect(trustScore.score).toBe(77.6);
    });
  });
});
