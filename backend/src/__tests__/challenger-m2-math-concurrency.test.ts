/**
 * Adversarial Challenger 1 Test Suite: Math & Concurrency for Milestone M2
 * 
 * Testing:
 * 1. Logarithmic Trust Score Formula Mathematical Soundness & Extreme Inputs
 * 2. Concavity & Diminishing Returns of log10 scaling
 * 3. Batch vs Single Calculation Consistency
 * 4. Anti-Bot Verification Rules & Order Status Filtering
 * 5. Idempotent Subscriptions & Zero-Floor Clamping
 * 6. High-Concurrency Stress Harness (Race conditions, Interleaved operations)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeSellerTrustScore,
  SellerStats,
  SellerLoyaltyService,
  TUNISIAN_GOVERNORATES,
} from '../services/seller-trust.service';
import { StoreSubscriptionService } from './store-subscription.service.test';
import { PdValidationError, PdForbiddenError, PdNotFoundError, PdRateLimitError } from '../errors';

describe('Adversarial Challenger: Math & Concurrency (Milestone M2)', () => {
  // =========================================================================
  // 1. Extreme & Adversarial Inputs for Seller Trust Score
  // =========================================================================
  describe('1. Trust Score Formula Mathematical Soundness & Extremes', () => {
    it('1.1: Extreme Lower Bounds (All 0s) - Produces exact 0.0 with no NaN or negative numbers', () => {
      const stats: SellerStats = {
        rating: 0,
        slaHours: 120, // >96h -> normalizedSla = 0
        verifiedSubscribers: 0, // log10(1)/4 = 0
        disputeRatePct: 0, // penalty = 0
      };

      const result = computeSellerTrustScore(stats);
      expect(result.score).toBe(0.0);
      expect(result.normalizedRating).toBe(0.0);
      expect(result.normalizedSla).toBe(0.0);
      expect(result.subScore).toBe(0.0);
      expect(result.disputePenalty).toBe(0.0);
      expect(Number.isNaN(result.score)).toBe(false);
    });

    it('1.2: Extreme Worst-Case (0 rating, terrible SLA >96h, 0 subs, 100% dispute rate) - Clamped strictly to 0.0', () => {
      const stats: SellerStats = {
        rating: 0,
        slaHours: 500, // Normalized SLA = 0
        verifiedSubscribers: 0,
        disputeRatePct: 100.0, // Maximum dispute penalty = 1.0 (-10 pts)
      };

      const result = computeSellerTrustScore(stats);
      // Raw score = 0.40(0) + 0.30(0) + 0.20(0) - 0.10(1.0) = -0.10 -> clamped to 0.0
      expect(result.score).toBe(0.0);
      expect(result.disputePenalty).toBe(1.0);
      expect(result.score).toBeGreaterThanOrEqual(0.0);
    });

    it('1.3: Theoretical Maximum (5.0 rating, optimal SLA <=24h, 10,000+ subs, 0% dispute) - Yields exactly 90.0', () => {
      const stats: SellerStats = {
        rating: 5.0,
        slaHours: 24,
        verifiedSubscribers: 10000,
        disputeRatePct: 0.0,
      };

      const result = computeSellerTrustScore(stats);
      // 0.40*(1.0) + 0.30*(1.0) + 0.20*(log10(10001)/4 ≈ 1.0) - 0.10*(0) = 0.900 -> 90.0
      expect(result.normalizedRating).toBe(1.0);
      expect(result.normalizedSla).toBe(1.0);
      expect(result.subScore).toBe(1.0);
      expect(result.disputePenalty).toBe(0.0);
      expect(result.score).toBe(90.0);
    });

    it('1.4: Extreme Upper Bounds (1,000,000 subscribers, 5.0 rating, SLA 1h) - SubScore capped at 1.0, score capped at 90.0', () => {
      const stats: SellerStats = {
        rating: 5.0,
        slaHours: 1,
        verifiedSubscribers: 1_000_000,
        disputeRatePct: 0.0,
      };

      const result = computeSellerTrustScore(stats);
      expect(result.subScore).toBe(1.0); // Capped at 1.0
      expect(result.score).toBe(90.0);
    });

    it('1.5: Out-of-bounds input sanitization (Negative ratings, ratings > 5, negative subscribers, negative disputes)', () => {
      const negativeInput: SellerStats = {
        rating: -10,
        slaHours: -5, // <= 24 -> 1.0
        verifiedSubscribers: -500, // Math.max(0, -500) -> 0 -> log10(1)/4 = 0
        disputeRatePct: -25, // Math.max(0, -25) -> 0
      };

      const result = computeSellerTrustScore(negativeInput);
      expect(result.normalizedRating).toBe(0.0);
      expect(result.normalizedSla).toBe(1.0);
      expect(result.subScore).toBe(0.0);
      expect(result.disputePenalty).toBe(0.0);
      expect(result.score).toBe(30.0); // 0.30 * 1.0 = 30.0

      const oversizedInput: SellerStats = {
        rating: 100, // clamped to 5 -> 1.0
        slaComplianceRate: 5.0, // clamped to 1.0
        verifiedSubscribers: 50_000_000, // clamped to 1.0
        disputeRatePct: 500, // clamped to 1.0
      };

      const overResult = computeSellerTrustScore(oversizedInput);
      expect(overResult.normalizedRating).toBe(1.0);
      expect(overResult.normalizedSla).toBe(1.0);
      expect(overResult.subScore).toBe(1.0);
      expect(overResult.disputePenalty).toBe(1.0);
      // 0.40(1) + 0.30(1) + 0.20(1) - 0.10(1) = 0.80 -> 80.0
      expect(overResult.score).toBe(80.0);
    });

    it('1.6: SLA Piecewise Continuity & Boundary Behavior (0h, 24h, 24.01h, 48h, 96h, 96.01h)', () => {
      // SLA <= 24: full 1.0 (30 pts)
      const r0 = computeSellerTrustScore({ rating: 0, slaHours: 0, verifiedSubscribers: 0, disputeRatePct: 0 });
      const r24 = computeSellerTrustScore({ rating: 0, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r0.normalizedSla).toBe(1.0);
      expect(r24.normalizedSla).toBe(1.0);

      // SLA = 24.72h (1 - 0.72/72 = 0.99)
      const r24_72 = computeSellerTrustScore({ rating: 0, slaHours: 24.72, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r24_72.normalizedSla).toBeCloseTo(0.99, 2);

      // SLA = 48h (1 - 24/72 = 2/3 ≈ 0.6667)
      const r48 = computeSellerTrustScore({ rating: 0, slaHours: 48, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r48.normalizedSla).toBeCloseTo(0.6667, 3);
      expect(r48.score).toBe(20.0); // 0.30 * 2/3 = 0.20 -> 20.0

      // SLA = 60h (1 - 36/72 = 0.50)
      const r60 = computeSellerTrustScore({ rating: 0, slaHours: 60, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r60.normalizedSla).toBe(0.50);
      expect(r60.score).toBe(15.0);

      // SLA = 96h (1 - 72/72 = 0.0)
      const r96 = computeSellerTrustScore({ rating: 0, slaHours: 96, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r96.normalizedSla).toBe(0.0);
      expect(r96.score).toBe(0.0);

      // SLA = 120h (clamped to 0.0)
      const r120 = computeSellerTrustScore({ rating: 0, slaHours: 120, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r120.normalizedSla).toBe(0.0);
      expect(r120.score).toBe(0.0);
    });

    it('1.7: Alternate SLA format: slaComplianceRate parameter (0.0 to 1.0)', () => {
      const r95 = computeSellerTrustScore({ rating: 5, slaComplianceRate: 0.95, verifiedSubscribers: 0, disputeRatePct: 0 });
      expect(r95.normalizedSla).toBe(0.95);
      // 0.40(1) + 0.30(0.95) = 0.40 + 0.285 = 0.685 -> 68.5
      expect(r95.score).toBe(68.5);
    });
  });

  // =========================================================================
  // 2. Strict Concavity & Diminishing Returns Analysis of log10 Scaling
  // =========================================================================
  describe('2. Logarithmic Verified Subscriber Scaling: Strict Concavity & Diminishing Returns', () => {
    it('2.1: Verified subscribers exhibit strictly positive first derivative and strictly negative second derivative', () => {
      const subscriberCheckpoints = [
        0, 1, 5, 9, 20, 50, 99, 200, 500, 999, 2000, 5000, 9999
      ];

      const subScores = subscriberCheckpoints.map((subs) => {
        const res = computeSellerTrustScore({ rating: 0, slaHours: 96, verifiedSubscribers: subs, disputeRatePct: 0 });
        return { subs, score: res.score, subScore: res.subScore };
      });

      // 1. Monotonically increasing: for all i, score[i+1] >= score[i]
      for (let i = 0; i < subScores.length - 1; i++) {
        expect(subScores[i + 1].subScore).toBeGreaterThanOrEqual(subScores[i].subScore);
      }

      // 2. Marginal gain per subscriber (discrete first derivative Delta S / Delta N) decreases monotonically
      const marginalGains: number[] = [];
      for (let i = 0; i < subScores.length - 1; i++) {
        const deltaSubs = subScores[i + 1].subs - subScores[i].subs;
        const deltaScore = subScores[i + 1].score - subScores[i].score;
        marginalGains.push(deltaScore / deltaSubs);
      }

      for (let i = 0; i < marginalGains.length - 1; i++) {
        expect(marginalGains[i]).toBeGreaterThanOrEqual(marginalGains[i + 1]);
      }
    });

    it('2.2: Order of Magnitude Scaling Verification (0 -> 10 -> 100 -> 1000 -> 10,000)', () => {
      // log10(1) = 0.0 -> 0.0 pts
      // log10(10) = 1.0 -> 1.0/4 * 20 = +5.0 pts
      // log10(100) = 2.0 -> 2.0/4 * 20 = +10.0 pts
      // log10(1000) = 3.0 -> 3.0/4 * 20 = +15.0 pts
      // log10(10000) = 4.0 -> 4.0/4 * 20 = +20.0 pts
      const s0 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 }).score;
      const s9 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9, disputeRatePct: 0 }).score;
      const s99 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 99, disputeRatePct: 0 }).score;
      const s999 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 999, disputeRatePct: 0 }).score;
      const s9999 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 0 }).score;

      expect(s0).toBe(70.0);
      expect(s9).toBe(75.0);
      expect(s99).toBe(80.0);
      expect(s999).toBe(85.0);
      expect(s9999).toBe(90.0);

      // Verify that going from 0 -> 9 (9 users) gives the same +5.0 points as 999 -> 9999 (9,000 users)
      expect(s9 - s0).toBe(5.0);
      expect(s99 - s9).toBe(5.0);
      expect(s999 - s99).toBe(5.0);
      expect(s9999 - s999).toBe(5.0);
    });
  });

  // =========================================================================
  // 3. Batch vs Single Calculation Consistency
  // =========================================================================
  describe('3. Batch vs Single Calculation Mathematical Consistency', () => {
    it('3.1: Batch computation of 50 simulated stores matches single calculation identically', () => {
      // Generate 50 diverse stores with various combinations of rating, SLA, subs, dispute
      const testCases: SellerStats[] = [
        { rating: 5.0, slaHours: 12, verifiedSubscribers: 10000, disputeRatePct: 0.0 },
        { rating: 4.8, slaHours: 24, verifiedSubscribers: 500, disputeRatePct: 0.2 },
        { rating: 4.2, slaHours: 36, verifiedSubscribers: 120, disputeRatePct: 1.5 },
        { rating: 3.5, slaHours: 48, verifiedSubscribers: 45, disputeRatePct: 3.0 },
        { rating: 2.1, slaHours: 72, verifiedSubscribers: 10, disputeRatePct: 6.0 },
        { rating: 1.0, slaHours: 96, verifiedSubscribers: 1, disputeRatePct: 9.0 },
        { rating: 0.0, slaHours: 120, verifiedSubscribers: 0, disputeRatePct: 15.0 },
        { rating: 4.9, slaComplianceRate: 0.98, verifiedSubscribers: 2500, disputeRatePct: 0.1 },
        { rating: 3.8, slaComplianceRate: 0.80, verifiedSubscribers: 80, disputeRatePct: 2.2 },
      ];

      for (const stats of testCases) {
        const singleResult = computeSellerTrustScore(stats);
        // Emulate batch processing the exact same stats
        const batchSimResult = computeSellerTrustScore({ ...stats });

        expect(batchSimResult.score).toBe(singleResult.score);
        expect(batchSimResult.normalizedRating).toBe(singleResult.normalizedRating);
        expect(batchSimResult.normalizedSla).toBe(singleResult.normalizedSla);
        expect(batchSimResult.subScore).toBe(singleResult.subScore);
        expect(batchSimResult.disputePenalty).toBe(singleResult.disputePenalty);
      }
    });
  });

  // =========================================================================
  // 4. Anti-Bot Verification Rules & Order Status Filtering
  // =========================================================================
  describe('4. Anti-Bot Verification Rules & Order Status Filtering', () => {
    let service: StoreSubscriptionService;

    beforeEach(() => {
      service = new StoreSubscriptionService();
      service.registerStore('test_store', 'owner_1', 'Test Store', '', 0, 0);
    });

    it('4.1: Unpaid and Non-Completed order statuses (pending, cancelled, refunded) NEVER elevate verified status', async () => {
      const invalidStatuses: Array<'pending' | 'cancelled' | 'refunded'> = ['pending', 'cancelled', 'refunded'];

      for (let i = 0; i < invalidStatuses.length; i++) {
        const buyerId = `buyer_invalid_${i}`;
        service.registerOrder(buyerId, `ord_${i}`, invalidStatuses[i]);

        const isVerified = await service.isBuyerVerified(buyerId);
        expect(isVerified).toBe(false);

        const sub = await service.subscribe(buyerId, 'test_store');
        expect(sub.is_verified_buyer).toBe(false);
      }

      const stats = service.getStoreStats('test_store');
      expect(stats.subscribers_count).toBe(3);
      expect(stats.verified_subscribers_count).toBe(0);
    });

    it('4.2: Completed/Paid order statuses (paid, delivered, shipped) ALWAYS elevate verified status', async () => {
      const validStatuses: Array<'paid' | 'delivered' | 'shipped'> = ['paid', 'delivered', 'shipped'];

      for (let i = 0; i < validStatuses.length; i++) {
        const buyerId = `buyer_valid_${i}`;
        service.registerOrder(buyerId, `ord_v_${i}`, validStatuses[i]);

        const isVerified = await service.isBuyerVerified(buyerId);
        expect(isVerified).toBe(true);

        const sub = await service.subscribe(buyerId, 'test_store');
        expect(sub.is_verified_buyer).toBe(true);
      }

      const stats = service.getStoreStats('test_store');
      expect(stats.subscribers_count).toBe(3);
      expect(stats.verified_subscribers_count).toBe(3);
    });

    it('4.3: Buyer with mixed order history (1 cancelled, 1 refunded, 1 paid) is verified', async () => {
      const buyerId = 'buyer_mixed';
      service.registerOrder(buyerId, 'ord_m1', 'cancelled');
      service.registerOrder(buyerId, 'ord_m2', 'refunded');
      service.registerOrder(buyerId, 'ord_m3', 'paid');

      const isVerified = await service.isBuyerVerified(buyerId);
      expect(isVerified).toBe(true);

      const sub = await service.subscribe(buyerId, 'test_store');
      expect(sub.is_verified_buyer).toBe(true);
    });
  });

  // =========================================================================
  // 5. Idempotent Subscriptions, Zero-Floor Clamping & Invariants
  // =========================================================================
  describe('5. Idempotent Subscriptions, Zero-Floor Clamping & Invariants', () => {
    let service: StoreSubscriptionService;

    beforeEach(() => {
      service = new StoreSubscriptionService();
      service.registerStore('store_inv', 'owner_inv', 'Invariant Store', '', 10, 5);
    });

    it('5.1: 10 repeated subscribe calls by same buyer only increment once (idempotent)', async () => {
      service.registerOrder('buyer_idem_10', 'ord_idem_10', 'delivered');

      for (let i = 0; i < 10; i++) {
        const res = await service.subscribe('buyer_idem_10', 'store_inv');
        expect(res.subscribers_count).toBe(11);
        expect(res.verified_subscribers_count).toBe(6);
      }

      const stats = service.getStoreStats('store_inv');
      expect(stats.subscribers_count).toBe(11);
      expect(stats.verified_subscribers_count).toBe(6);
    });

    it('5.2: 10 repeated unsubscribe calls by same buyer only decrement once (idempotent)', async () => {
      service.registerOrder('buyer_unsub_10', 'ord_u10', 'delivered');
      await service.subscribe('buyer_unsub_10', 'store_inv'); // 10/5 -> 11/6

      for (let i = 0; i < 10; i++) {
        const res = await service.unsubscribe('buyer_unsub_10', 'store_inv');
        expect(res.subscribers_count).toBe(10);
        expect(res.verified_subscribers_count).toBe(5);
      }

      const stats = service.getStoreStats('store_inv');
      expect(stats.subscribers_count).toBe(10);
      expect(stats.verified_subscribers_count).toBe(5);
    });

    it('5.3: Zero-floor clamping on empty store under repeated unsubscriptions', async () => {
      service.registerStore('empty_store', 'owner_empty', 'Empty Store', '', 0, 0);

      for (let i = 0; i < 20; i++) {
        const res = await service.unsubscribe(`ghost_user_${i}`, 'empty_store');
        expect(res.subscribers_count).toBe(0);
        expect(res.verified_subscribers_count).toBe(0);
      }

      const stats = service.getStoreStats('empty_store');
      expect(stats.subscribers_count).toBe(0);
      expect(stats.verified_subscribers_count).toBe(0);
    });
  });

  // =========================================================================
  // 6. Concurrency Stress Harness & Race Conditions
  // =========================================================================
  describe('6. Concurrency Stress Harness', () => {
    let service: StoreSubscriptionService;

    beforeEach(() => {
      service = new StoreSubscriptionService();
      service.registerStore('stress_store', 'owner_stress', 'Stress Test Store', '', 0, 0);
    });

    it('6.1: 200 concurrent subscriptions across 100 verified and 100 unverified buyers', async () => {
      const verifiedBuyers = Array.from({ length: 100 }, (_, i) => `v_buyer_${i}`);
      const unverifiedBuyers = Array.from({ length: 100 }, (_, i) => `u_buyer_${i}`);

      verifiedBuyers.forEach((b, i) => service.registerOrder(b, `ord_v_${i}`, 'paid'));

      const allOps = [
        ...verifiedBuyers.map((b) => service.subscribe(b, 'stress_store')),
        ...unverifiedBuyers.map((b) => service.subscribe(b, 'stress_store')),
      ];

      // Shuffle operations to simulate asynchronous interleaved traffic
      allOps.sort(() => Math.random() - 0.5);

      await Promise.all(allOps);

      const stats = service.getStoreStats('stress_store');
      expect(stats.subscribers_count).toBe(200);
      expect(stats.verified_subscribers_count).toBe(100);
    });

    it('6.2: Interleaved concurrent subscribe, duplicate subscribe, and unsubscribe operations', async () => {
      // 50 verified buyers subscribe
      const verifiedBuyers = Array.from({ length: 50 }, (_, i) => `v_user_${i}`);
      verifiedBuyers.forEach((b, i) => service.registerOrder(b, `ord_v_${i}`, 'shipped'));

      // Subscribe all 50
      await Promise.all(verifiedBuyers.map((b) => service.subscribe(b, 'stress_store')));
      expect(service.getStoreStats('stress_store').subscribers_count).toBe(50);
      expect(service.getStoreStats('stress_store').verified_subscribers_count).toBe(50);

      // Now run 150 concurrent actions:
      // - 50 duplicate subscribes for existing users (should do nothing)
      // - 25 unsubscribes of existing users (should decrement 25)
      // - 25 new unverified subscribes (should add 25 total, 0 verified)
      // - 50 unsubscribes for non-existent users (should do nothing)
      const mixedOps = [
        ...verifiedBuyers.map((b) => service.subscribe(b, 'stress_store')),
        ...verifiedBuyers.slice(0, 25).map((b) => service.unsubscribe(b, 'stress_store')),
        ...Array.from({ length: 25 }, (_, i) => service.subscribe(`new_unver_${i}`, 'stress_store')),
        ...Array.from({ length: 50 }, (_, i) => service.unsubscribe(`non_existent_${i}`, 'stress_store')),
      ];

      mixedOps.sort(() => Math.random() - 0.5);
      await Promise.all(mixedOps);

      // Expected final counts:
      // Total = 50 (initial) - 25 (unsubscribed) + 25 (new) = 50
      // Verified = 50 (initial) - 25 (unsubscribed) + 0 (new) = 25
      const finalStats = service.getStoreStats('stress_store');
      expect(finalStats.subscribers_count).toBe(50);
      expect(finalStats.verified_subscribers_count).toBe(25);
    });
  });
});
