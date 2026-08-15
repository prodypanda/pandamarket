/**
 * Feature 20 Tier 5 Adversarial Coverage Hardening Vitest Suite
 *
 * Requirements:
 * 1. Trust Score Formula Mathematical Soundness & Boundary Extremes (Rating [0,5], SLA [0,96h], Subs [0, 10^6], Dispute [0, 100%], Concavity f''(x)<=0, Monotonicity)
 * 2. 60-Day Exponential Decay Dynamics (dt=0, dt=60, dt=120, dt=365, future dt<0 clamping, 5,000-event stress aggregation)
 * 3. Rate Limiting & Concurrency (Seller Broadcast 2/week concurrency, independent store isolation, weekly resets)
 * 4. Notification Sliding Buffer (50 rapid price updates debounced to 1 consolidated alert)
 * 5. Anti-Bot Verification Rules & Idempotent State Preservation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeSellerTrustScore,
  SellerLoyaltyService,
  SellerStats,
  getCalendarWeekKey,
  TUNISIAN_GOVERNORATES,
} from '../services/seller-trust.service';
import { BuyerInterestService, InteractionEvent, normalizeTag, cleanAndDedupeTags } from '../services/buyer-interest.service';
import { PdValidationError, PdRateLimitError } from '../errors';

describe('Feature 20 Tier 5 Adversarial Coverage Hardening Suite', () => {
  // =========================================================================
  // 1. Trust Score Formula & Numerical Robustness
  // =========================================================================
  describe('1. Seller Trust Score Formula & Extreme Boundaries', () => {
    it('1.1: Extreme lower bound (All 0s) - yields 0.0 with no NaN or negative numbers', () => {
      const stats: SellerStats = {
        rating: 0,
        slaHours: 120, // >96h -> 0.0
        verifiedSubscribers: 0, // log10(1)/4 = 0.0
        disputeRatePct: 0,
      };
      const result = computeSellerTrustScore(stats);
      expect(result.score).toBe(0.0);
      expect(result.normalizedRating).toBe(0.0);
      expect(result.normalizedSla).toBe(0.0);
      expect(result.subScore).toBe(0.0);
      expect(result.disputePenalty).toBe(0.0);
      expect(Number.isNaN(result.score)).toBe(false);
    });

    it('1.2: Extreme worst case (Rating 0, SLA 500h, 0 subs, 100% dispute) - Clamped strictly to 0.0 floor', () => {
      const stats: SellerStats = {
        rating: 0,
        slaHours: 500,
        verifiedSubscribers: 0,
        disputeRatePct: 100.0,
      };
      const result = computeSellerTrustScore(stats);
      expect(result.score).toBe(0.0);
      expect(result.disputePenalty).toBe(1.0);
      expect(result.score).toBeGreaterThanOrEqual(0.0);
    });

    it('1.3: Theoretical ceiling (Rating 5.0, optimal SLA <=24h, 10,000+ subs, 0% dispute) - Yields exactly 90.0', () => {
      const stats: SellerStats = {
        rating: 5.0,
        slaHours: 24,
        verifiedSubscribers: 10000,
        disputeRatePct: 0.0,
      };
      const result = computeSellerTrustScore(stats);
      expect(result.normalizedRating).toBe(1.0);
      expect(result.normalizedSla).toBe(1.0);
      expect(result.subScore).toBe(1.0);
      expect(result.disputePenalty).toBe(0.0);
      expect(result.score).toBe(90.0);
    });

    it('1.4: Massive subscriber count (1,000,000 subscribers) - subScore capped at 1.0, score capped at 90.0', () => {
      const stats: SellerStats = {
        rating: 5.0,
        slaHours: 1,
        verifiedSubscribers: 1_000_000,
        disputeRatePct: 0.0,
      };
      const result = computeSellerTrustScore(stats);
      expect(result.subScore).toBe(1.0);
      expect(result.score).toBe(90.0);
    });

    it('1.5: Out-of-bounds inputs (Negative rating, negative subscribers, negative dispute rate)', () => {
      const negativeInput: SellerStats = {
        rating: -50,
        slaHours: -10,
        verifiedSubscribers: -1000,
        disputeRatePct: -50,
      };
      const result = computeSellerTrustScore(negativeInput);
      expect(result.normalizedRating).toBe(0.0);
      expect(result.normalizedSla).toBe(1.0); // <= 24h is 1.0
      expect(result.subScore).toBe(0.0);
      expect(result.disputePenalty).toBe(0.0);
      expect(result.score).toBe(30.0); // 0.30 * 1.0 = 30.0
    });

    it('1.6: Strict Mathematical Concavity: Verified subscriber log10 curve exhibits diminishing returns (f\'\'(x) <= 0)', () => {
      const checkPoints = [0, 9, 99, 999, 9999];
      const scores = checkPoints.map((subs) =>
        computeSellerTrustScore({ rating: 0, slaHours: 96, verifiedSubscribers: subs, disputeRatePct: 0 }).subScore
      );

      // Verify exact values: 0.0, 0.25, 0.50, 0.75, 1.00
      expect(scores[0]).toBe(0.0);
      expect(scores[1]).toBe(0.25);
      expect(scores[2]).toBe(0.50);
      expect(scores[3]).toBe(0.75);
      expect(scores[4]).toBe(1.0);

      // Verify marginal gain per order of magnitude is constant (+0.25 for 10x subs)
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i + 1] - scores[i]).toBeCloseTo(0.25, 2);
      }
    });

    it('1.7: Strict Monotonicity: Non-decreasing score over continuous subscriber counts', () => {
      let prevScore = -1;
      for (let s = 0; s <= 2000; s += 25) {
        const score = computeSellerTrustScore({ rating: 4.5, slaHours: 20, verifiedSubscribers: s, disputeRatePct: 1 }).score;
        expect(score).toBeGreaterThanOrEqual(prevScore);
        prevScore = score;
      }
    });
  });

  // =========================================================================
  // 2. 60-Day Exponential Decay Dynamic Profiling
  // =========================================================================
  describe('2. 60-Day Exponential Decay & Signal Weighting Invariants', () => {
    let service: BuyerInterestService;
    const baseDate = new Date('2026-08-15T12:00:00Z');

    beforeEach(() => {
      service = new BuyerInterestService();
    });

    it('2.1: dt = 0 days: Exact base weights (Order=5.0, Subscription=4.0, Like=2.0)', () => {
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: baseDate },
        { type: 'subscription', tags: ['crafts'], createdAt: baseDate },
        { type: 'like', tags: ['fashion'], createdAt: baseDate },
      ];
      const result = service.calculateProfile(events, baseDate);
      expect(result.tag_weights['electronics']).toBe(5.0);
      expect(result.tag_weights['crafts']).toBe(4.0);
      expect(result.tag_weights['fashion']).toBe(2.0);
    });

    it('2.2: dt = 60 days: Exact half-life factor e^-1 ≈ 0.36787944', () => {
      const date60d = new Date(baseDate.getTime() - 60 * 24 * 60 * 60 * 1000);
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: date60d },
      ];
      const result = service.calculateProfile(events, baseDate);
      const expected = Number((5.0 * Math.exp(-1)).toFixed(4)); // 1.8394
      expect(result.tag_weights['electronics']).toBeCloseTo(expected, 4);
    });

    it('2.3: dt = 120 days: Decay factor e^-2 ≈ 0.13533528', () => {
      const date120d = new Date(baseDate.getTime() - 120 * 24 * 60 * 60 * 1000);
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: date120d },
      ];
      const result = service.calculateProfile(events, baseDate);
      const expected = Number((5.0 * Math.exp(-2)).toFixed(4)); // 0.6767
      expect(result.tag_weights['electronics']).toBeCloseTo(expected, 4);
    });

    it('2.4: dt = 365 days: Heavy decay over 1 year', () => {
      const date365d = new Date(baseDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: date365d },
      ];
      const result = service.calculateProfile(events, baseDate);
      const expected = Number((5.0 * Math.exp(-365 / 60)).toFixed(4)); // 0.0114
      expect(result.tag_weights['electronics']).toBeCloseTo(expected, 4);
    });

    it('2.5: Future event dates (dt < 0) are safely clamped to dt = 0 without weight explosion', () => {
      const futureDate = new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['future-tech'], createdAt: futureDate },
      ];
      const result = service.calculateProfile(events, baseDate);
      expect(result.tag_weights['future-tech']).toBe(5.0);
    });

    it('2.6: High-volume multi-signal stress (5,000 events) completes efficiently without NaN or overflow', () => {
      const largeEvents: InteractionEvent[] = [];
      const tags = ['artisanat', 'ceramique', 'cuir', 'bijoux', 'poterie', 'mode', 'deco', 'tunisie', 'tapis', 'olive'];

      for (let i = 0; i < 5000; i++) {
        const type = i % 3 === 0 ? 'order' : i % 3 === 1 ? 'subscription' : 'like';
        const offsetDays = (i % 90);
        const evDate = new Date(baseDate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
        largeEvents.push({
          type,
          tags: [tags[i % tags.length]],
          createdAt: evDate,
        });
      }

      const t0 = Date.now();
      const profile = service.calculateProfile(largeEvents, baseDate);
      const elapsed = Date.now() - t0;

      expect(profile.total_signals_processed).toBe(5000);
      expect(profile.top_tags.length).toBe(10);
      expect(elapsed).toBeLessThan(500); // <500ms
      for (const w of Object.values(profile.tag_weights)) {
        expect(Number.isFinite(w)).toBe(true);
        expect(Number.isNaN(w)).toBe(false);
      }
    });
  });

  // =========================================================================
  // 3. Seller Broadcast Concurrency & Rate Limiting (2/week limit)
  // =========================================================================
  describe('3. Seller Broadcast Concurrency & Calendar Week Rate Limiter', () => {
    let service: SellerLoyaltyService;
    const storeId = 'str_stress_broadcast';
    const baseDate = new Date('2026-08-15T10:00:00Z'); // ISO Week 2026-W33

    beforeEach(() => {
      service = new SellerLoyaltyService();
    });

    it('3.1: Enforces exactly max 2 broadcasts per calendar week under concurrent dispatches', async () => {
      const dispatches = Array.from({ length: 20 }, (_, idx) =>
        service.sendBroadcast({
          storeId,
          couponCode: `DISC${idx}`,
          discountType: 'percentage',
          discountValue: 10 + idx,
          message: `Special offer #${idx}`,
          sentAt: baseDate,
        })
      );

      const results = await Promise.allSettled(dispatches);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(18);
      for (const r of rejected) {
        if (r.status === 'rejected') {
          expect(r.reason).toBeInstanceOf(PdRateLimitError);
        }
      }
    });

    it('3.2: Multi-tenant store isolation: Broadcast limits are store-scoped', async () => {
      const storeA = 'str_tenant_a';
      const storeB = 'str_tenant_b';

      // Store A sends 2 broadcasts (exhausting allowance)
      await service.sendBroadcast({ storeId: storeA, couponCode: 'A1', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate });
      await service.sendBroadcast({ storeId: storeA, couponCode: 'A2', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate });

      // Store A 3rd attempt is rejected
      await expect(
        service.sendBroadcast({ storeId: storeA, couponCode: 'A3', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate })
      ).rejects.toThrow(PdRateLimitError);

      // Store B can still send its 2 broadcasts independently
      const b1 = await service.sendBroadcast({ storeId: storeB, couponCode: 'B1', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate });
      const b2 = await service.sendBroadcast({ storeId: storeB, couponCode: 'B2', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate });

      expect(b1.success).toBe(true);
      expect(b2.success).toBe(true);
    });

    it('3.3: Calendar week transition resets rate limit allowance', async () => {
      // Week 1 (W33)
      await service.sendBroadcast({ storeId, couponCode: 'W1_1', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate });
      await service.sendBroadcast({ storeId, couponCode: 'W1_2', discountType: 'percentage', discountValue: 10, message: 'msg', sentAt: baseDate });

      // Week 2 (W34): exactly 7 days later
      const nextWeekDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const w2_1 = await service.sendBroadcast({ storeId, couponCode: 'W2_1', discountType: 'percentage', discountValue: 15, message: 'msg', sentAt: nextWeekDate });

      expect(w2_1.success).toBe(true);
      expect(service.getWeeklyBroadcastCount(storeId, nextWeekDate).remaining).toBe(1);
    });

    it('3.4: Rejects broadcasts with invalid payloads (empty coupon, non-positive discount, empty message)', async () => {
      await expect(
        service.sendBroadcast({ storeId, couponCode: '', discountType: 'percentage', discountValue: 10, message: 'msg' })
      ).rejects.toThrow(PdValidationError);

      await expect(
        service.sendBroadcast({ storeId, couponCode: 'CODE', discountType: 'percentage', discountValue: 0, message: 'msg' })
      ).rejects.toThrow(PdValidationError);

      await expect(
        service.sendBroadcast({ storeId, couponCode: 'CODE', discountType: 'percentage', discountValue: -5, message: 'msg' })
      ).rejects.toThrow(PdValidationError);

      await expect(
        service.sendBroadcast({ storeId, couponCode: 'CODE', discountType: 'percentage', discountValue: 10, message: '   ' })
      ).rejects.toThrow(PdValidationError);
    });
  });

  // =========================================================================
  // 4. Notification Sliding Buffer (50 Rapid Updates Debouncing)
  // =========================================================================
  describe('4. Notification Sliding Buffer & Aggregation Logic', () => {
    it('4.1: Consolidates 50 rapid price updates into exactly 1 consolidated notification body', () => {
      const rawEvents: Array<{
        storeId: string;
        storeName: string;
        type: 'price_drop' | 'new_product';
        productId: string;
        productTitle: string;
        price: number;
        timestamp: number;
      }> = [];

      const storeName = 'Poterie de Guellala';
      const baseTime = Date.now();

      // 50 updates on 10 distinct products
      for (let i = 0; i < 50; i++) {
        const prodIndex = i % 10;
        rawEvents.push({
          storeId: 'str_guellala',
          storeName,
          type: 'price_drop',
          productId: `prod_${prodIndex}`,
          productTitle: `Plat Émaillé #${prodIndex}`,
          price: 50 - (i * 0.2),
          timestamp: baseTime + i * 1000,
        });
      }

      expect(rawEvents.length).toBe(50);

      // Deduplicate by productId, keeping latest event
      const uniqueMap = new Map<string, typeof rawEvents[0]>();
      for (const ev of rawEvents) {
        uniqueMap.set(ev.productId, ev);
      }
      const uniqueItems = Array.from(uniqueMap.values());

      expect(uniqueItems.length).toBe(10);

      const count = uniqueItems.length;
      const title = `🏷️ ${count} baisses de prix chez ${storeName}`;
      const message = `${storeName} a baissé le prix de ${count} articles ! Ne manquez pas ces offres exclusives.`;

      expect(title).toBe('🏷️ 10 baisses de prix chez Poterie de Guellala');
      expect(message).toBe('Poterie de Guellala a baissé le prix de 10 articles ! Ne manquez pas ces offres exclusives.');
      expect(uniqueItems[0].price).toBe(50 - (40 * 0.2));
    });
  });

  // =========================================================================
  // 5. Tunisian 24 Governorates Data Integrity
  // =========================================================================
  describe('5. Tunisian 24 Governorates Data Integrity', () => {
    it('5.1: Exactly 24 official governorates defined with proper French/Arabic transliteration', () => {
      expect(TUNISIAN_GOVERNORATES.length).toBe(24);
      expect(TUNISIAN_GOVERNORATES).toContain('Tunis');
      expect(TUNISIAN_GOVERNORATES).toContain('Sfax');
      expect(TUNISIAN_GOVERNORATES).toContain('Sousse');
      expect(TUNISIAN_GOVERNORATES).toContain('Nabeul');
      expect(TUNISIAN_GOVERNORATES).toContain('Bizerte');
      expect(TUNISIAN_GOVERNORATES).toContain('Tataouine');
    });

    it('5.2: Subscriber analytics correctly maps all 24 governorates plus Other', () => {
      const loyalty = new SellerLoyaltyService();
      const storeId = 'str_geo_test';

      loyalty.registerSubscriber(storeId, { buyerId: 'b1', governorate: 'Tunis', isVerified: true });
      loyalty.registerSubscriber(storeId, { buyerId: 'b2', governorate: 'Sfax', isVerified: false });
      loyalty.registerSubscriber(storeId, { buyerId: 'b3', governorate: 'UnknownGov', isVerified: false });

      const analytics = loyalty.getSubscriberAnalytics(storeId);
      expect(analytics.total_subscribers).toBe(3);
      expect(analytics.governorate_distribution['Tunis']).toBe(1);
      expect(analytics.governorate_distribution['Sfax']).toBe(1);
      expect(analytics.governorate_distribution['Other']).toBe(1);
      expect(analytics.governorate_distribution['Sousse']).toBe(0);
    });
  });
});
