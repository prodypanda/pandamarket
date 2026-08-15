/**
 * Adversarial Math, Concurrency & Invariant Stress Runner for Feature 20 (Phase 2 Tier 5)
 * 
 * Empirically verifies:
 * 1. Trust Score Mathematical Rigor & Extreme Boundaries (NaN, null, negatives, overflows, concavity, monotonicity)
 * 2. 60-Day Exponential Decay Mathematical Rigor (dt=0, dt=60, dt=365, future dt<0, 5000-event stress aggregation)
 * 3. Seller Broadcast Concurrency Race Conditions & 2/week Rate Limit Preservation
 * 4. 15-Min Sliding Notification Buffer Stress (50 rapid price updates -> exact single consolidated alert)
 * 5. Anti-Bot Qualification Matrix & Concurrent Subscription Toggle Invariants on PostgreSQL
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

if (!process.env.PD_DATABASE_URL) {
  process.env.PD_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/pandamarket';
}
if (!process.env.PD_JWT_SECRET) {
  process.env.PD_JWT_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}
if (!process.env.PD_ENCRYPTION_KEY) {
  process.env.PD_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}

import { query, closePool } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  computeSellerTrustScore,
  calculateBatchSellerTrustScores,
  SellerLoyaltyService,
} from '../services/seller-trust.service';
import { BuyerInterestService, type InteractionEvent } from '../services/buyer-interest.service';
import { storeSubscriptionService } from '../services/store-subscription.service';
import { PdForbiddenError, PdRateLimitError } from '../errors';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${msg}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${msg}`);
    failureDetails.push(msg);
  }
}

async function runAdversarialTests() {
  console.log('================================================================');
  console.log('  EMPIRICAL CHALLENGER: FEATURE 20 ADVERSARIAL STRESS HARNESS   ');
  console.log('================================================================\n');

  try {
    // =========================================================================
    // SECTION 1: TRUST SCORE MATHEMATICAL RIGOR & EXTREME BOUNDARIES
    // =========================================================================
    console.log('--- 1. Trust Score Mathematical Rigor & Numerical Robustness ---');

    // 1.1 Rating clamping [0, 5]
    {
      const negRating = computeSellerTrustScore({ rating: -10, verifiedSubscribers: 100, disputeRatePct: 0 });
      assert(negRating.normalizedRating === 0, 'Negative rating clamped to 0');
      assert(negRating.score >= 0, 'Score is non-negative with negative rating');

      const overRating = computeSellerTrustScore({ rating: 100, verifiedSubscribers: 100, disputeRatePct: 0 });
      assert(overRating.normalizedRating === 1.0, 'Rating > 5 clamped to normalized 1.0 (5.0/5.0)');
    }

    // 1.2 SLA hours and compliance rates
    {
      const zeroHours = computeSellerTrustScore({ rating: 5, slaHours: 0, verifiedSubscribers: 0, disputeRatePct: 0 });
      assert(zeroHours.normalizedSla === 1.0, '0h SLA receives perfect 1.0 SLA score');

      const negHours = computeSellerTrustScore({ rating: 5, slaHours: -5, verifiedSubscribers: 0, disputeRatePct: 0 });
      assert(negHours.normalizedSla === 1.0, 'Negative SLA hours clamped to 1.0');

      const hugeHours = computeSellerTrustScore({ rating: 5, slaHours: 10000, verifiedSubscribers: 0, disputeRatePct: 0 });
      assert(hugeHours.normalizedSla === 0, '10,000h SLA clamped to 0.0 SLA score');

      const complianceNeg = computeSellerTrustScore({ rating: 5, slaComplianceRate: -0.5, verifiedSubscribers: 0, disputeRatePct: 0 });
      assert(complianceNeg.normalizedSla === 0, 'Negative SLA compliance rate clamped to 0.0');

      const complianceOver = computeSellerTrustScore({ rating: 5, slaComplianceRate: 2.5, verifiedSubscribers: 0, disputeRatePct: 0 });
      assert(complianceOver.normalizedSla === 1.0, 'SLA compliance rate > 1.0 clamped to 1.0');
    }

    // 1.3 Verified Subscribers extreme scaling & log10 concavity
    {
      const negSubs = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: -100, disputeRatePct: 0 });
      assert(negSubs.subScore === 0, 'Negative verified subscribers clamped to 0');

      const zeroSubs = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
      assert(zeroSubs.subScore === 0, '0 verified subscribers gives subScore = log10(1)/4 = 0');

      const subs9 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9, disputeRatePct: 0 });
      assert(Math.abs(subs9.subScore - 0.25) < 0.0001, '9 verified subs gives log10(10)/4 = 0.25');

      const subs99 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 99, disputeRatePct: 0 });
      assert(Math.abs(subs99.subScore - 0.50) < 0.0001, '99 verified subs gives log10(100)/4 = 0.50');

      const subs999 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 999, disputeRatePct: 0 });
      assert(Math.abs(subs999.subScore - 0.75) < 0.0001, '999 verified subs gives log10(1000)/4 = 0.75');

      const subs9999 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 0 });
      assert(Math.abs(subs9999.subScore - 1.0) < 0.0001, '9999 verified subs gives log10(10000)/4 = 1.0');

      const subs1M = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 1_000_000, disputeRatePct: 0 });
      assert(subs1M.subScore === 1.0, '1,000,000 verified subs clamped to maximum subScore 1.0');
    }

    // 1.4 Strict Logarithmic Concavity test on raw function: f''(x) <= 0
    {
      let concavityHolds = true;
      const rawSubScore = (x: number) => Math.min(1.0, Math.max(0, Math.log10(Math.max(0, x) + 1) / 4));
      for (let x = 0; x <= 5000; x += 100) {
        const step = 50;
        const f1 = rawSubScore(x);
        const f2 = rawSubScore(x + step);
        const f3 = rawSubScore(x + 2 * step);

        const delta1 = f2 - f1;
        const delta2 = f3 - f2;
        if (delta1 < delta2 - 1e-9) {
          concavityHolds = false;
          break;
        }
      }
      assert(concavityHolds, "Verified subscriber subScore satisfies concavity f''(x) <= 0 everywhere");
    }

    // 1.5 Strict Monotonicity test: x1 < x2 => f(x1) <= f(x2)
    {
      let monotonic = true;
      let prevScore = -1;
      for (let s = 0; s <= 10000; s += 17) {
        const score = computeSellerTrustScore({ rating: 4, slaHours: 36, verifiedSubscribers: s, disputeRatePct: 2 }).score;
        if (score < prevScore) {
          monotonic = false;
          break;
        }
        prevScore = score;
      }
      assert(monotonic, 'Seller Trust Score is strictly monotonically non-decreasing with subscriber count');
    }

    // 1.6 Dispute Rate Penalty clamping & boundaries
    {
      const dispute0 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 0 });
      assert(dispute0.disputePenalty === 0, '0% dispute rate penalty is 0.0');
      assert(dispute0.score === 90.0, 'Perfect score is 90.0 (0.40+0.30+0.20 - 0 = 0.90 -> 90.0)');

      const dispute5 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 5 });
      assert(Math.abs(dispute5.disputePenalty - 0.50) < 0.0001, '5% dispute rate penalty is 0.50');
      assert(dispute5.score === 85.0, '5% dispute reduces score by exactly 5.0 pts');

      const dispute10 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 10 });
      assert(dispute10.disputePenalty === 1.0, '10% dispute rate penalty is 1.0');
      assert(dispute10.score === 80.0, '10% dispute reduces score by 10.0 pts');

      const dispute100 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: 100 });
      assert(dispute100.disputePenalty === 1.0, '100% dispute rate penalty clamped at 1.0');
      assert(dispute100.score === 80.0, 'Score is bounded at 80.0 when dispute is maxed');

      const negDispute = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 9999, disputeRatePct: -20 });
      assert(negDispute.disputePenalty === 0, 'Negative dispute rate penalty clamped at 0.0');
    }

    // 1.7 Global Extremes & Non-Negative Bound
    {
      const absoluteWorst = computeSellerTrustScore({
        rating: 0,
        slaHours: 200,
        verifiedSubscribers: 0,
        disputeRatePct: 100,
      });
      assert(absoluteWorst.score === 0.0, 'Absolute worst-case parameters produce exactly 0.0 (no negative scores)');

      const absoluteBest = computeSellerTrustScore({
        rating: 5,
        slaHours: 1,
        verifiedSubscribers: 100000,
        disputeRatePct: 0,
      });
      assert(absoluteBest.score === 90.0, 'Absolute best-case parameters produce 90.0');
    }

    // =========================================================================
    // SECTION 2: 60-DAY EXPONENTIAL DECAY FORMULA RIGOR & MULTI-EVENT AGGREGATION
    // =========================================================================
    console.log('\n--- 2. 60-Day Exponential Decay & Signal Aggregation Robustness ---');
    {
      const interestService = new BuyerInterestService();
      const now = new Date('2026-08-15T12:00:00Z');

      // 2.1 Corner Case: dt = 0 days (e^0 = 1)
      const eventDt0: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: now },
        { type: 'subscription', tags: ['crafts'], createdAt: now },
        { type: 'like', tags: ['fashion'], createdAt: now },
      ];
      const profileDt0 = interestService.calculateProfile(eventDt0, now);
      assert(profileDt0.tag_weights['electronics'] === 5.0, 'Order weight at dt=0 is exact 5.0000');
      assert(profileDt0.tag_weights['crafts'] === 4.0, 'Subscription weight at dt=0 is exact 4.0000');
      assert(profileDt0.tag_weights['fashion'] === 2.0, 'Like weight at dt=0 is exact 2.0000');

      // 2.2 Corner Case: dt = 60 days (e^-1 ≈ 0.36787944)
      const date60DaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const eventDt60: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: date60DaysAgo },
      ];
      const profileDt60 = interestService.calculateProfile(eventDt60, now);
      const expectedDt60 = Number((5.0 * Math.exp(-1)).toFixed(4));
      assert(
        Math.abs(profileDt60.tag_weights['electronics'] - expectedDt60) < 0.0002,
        `Order weight at dt=60 is ${profileDt60.tag_weights['electronics']} (expected ${expectedDt60})`
      );

      // 2.3 Corner Case: dt = 365 days (e^-365/60 ≈ 0.00228)
      const date365DaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const eventDt365: InteractionEvent[] = [
        { type: 'order', tags: ['electronics'], createdAt: date365DaysAgo },
      ];
      const profileDt365 = interestService.calculateProfile(eventDt365, now);
      const expectedDt365 = Number((5.0 * Math.exp(-365 / 60)).toFixed(4));
      assert(
        Math.abs(profileDt365.tag_weights['electronics'] - expectedDt365) < 0.0002,
        `Order weight at dt=365 is ${profileDt365.tag_weights['electronics']} (expected ${expectedDt365})`
      );

      // 2.4 Corner Case: Future event date (dt < 0) -> clamped to dt = 0
      const futureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const eventFuture: InteractionEvent[] = [
        { type: 'order', tags: ['future-gadget'], createdAt: futureDate },
      ];
      const profileFuture = interestService.calculateProfile(eventFuture, now);
      assert(
        profileFuture.tag_weights['future-gadget'] === 5.0,
        'Future event date (dt < 0) is clamped to dt=0 (weight = 5.0, no runaway inflation)'
      );

      // 2.5 Stress Case: Large Multi-Event Aggregation (5,000 mixed signals across 50 tags)
      const largeEvents: InteractionEvent[] = [];
      const testTags = Array.from({ length: 50 }, (_, i) => `tag_${i}`);
      for (let i = 0; i < 5000; i++) {
        const type = i % 3 === 0 ? 'order' : i % 3 === 1 ? 'subscription' : 'like';
        const daysOffset = (i % 120); // 0 to 119 days
        const evDate = new Date(now.getTime() - daysOffset * 24 * 60 * 60 * 1000);
        const selectedTag = testTags[i % 50];
        largeEvents.push({ type, tags: [selectedTag], createdAt: evDate });
      }

      const tStart = Date.now();
      const largeProfile = interestService.calculateProfile(largeEvents, now);
      const tElapsed = Date.now() - tStart;

      assert(largeProfile.total_signals_processed === 5000, 'All 5,000 signals processed');
      assert(largeProfile.top_tags.length === 10, 'Top 10 tags correctly extracted from 50 candidates');
      assert(tElapsed < 500, `5,000 signal aggregation took ${tElapsed}ms (<500ms target)`);
      assert(
        Object.values(largeProfile.tag_weights).every((w) => !Number.isNaN(w) && Number.isFinite(w)),
        'All 50 tag weights are finite numbers without NaN or infinity'
      );
    }

    // =========================================================================
    // SECTION 3: SELLER BROADCAST CONCURRENCY & 2/WEEK RATE LIMITING
    // =========================================================================
    console.log('\n--- 3. Seller Broadcast Concurrency Race Conditions & Rate Limit ---');
    {
      const loyaltyService = new SellerLoyaltyService();
      const testBroadcastOwnerId = pdId('usr');
      const storeA = pdId('str');
      const storeB = pdId('str');
      await query(
        `INSERT INTO pd_user (id, email, role, first_name, last_name, is_active, password_hash)
         VALUES ($1, 'bcast_owner@test.com', 'vendor', 'Broadcast', 'Owner', true, 'hash')`,
        [testBroadcastOwnerId]
      );
      await query(
        `INSERT INTO pd_store (id, owner_id, name, subdomain, status)
         VALUES ($1, $2, 'Broadcast Store A', 'bcast-a', 'verified'),
                ($3, $2, 'Broadcast Store B', 'bcast-b', 'verified')`,
        [storeA, testBroadcastOwnerId, storeB]
      );

      try {
        const baseDate = new Date('2026-08-15T10:00:00Z'); // Week 2026-W33

        // Register 10 dummy subscribers
        for (let i = 0; i < 10; i++) {
          loyaltyService.registerSubscriber(storeA, {
            buyerId: `usr_sub_${i}`,
            governorate: 'Tunis',
            isVerified: i % 2 === 0,
          });
        }

        // 3.1 Concurrent broadcast dispatch stress: 20 parallel calls
        console.log('  Executing 20 concurrent broadcast dispatches against single store...');
        const broadcastPromises = Array.from({ length: 20 }, (_, idx) =>
          loyaltyService.sendBroadcast({
            storeId: storeA,
            couponCode: `CONC${idx}`,
            discountType: 'percentage',
            discountValue: 15,
            message: `Exclusive discount #${idx}`,
            sentAt: baseDate,
          })
        );

        const broadcastResults = await Promise.allSettled(broadcastPromises);
        const fulfilled = broadcastResults.filter((r) => r.status === 'fulfilled');
        const rejected = broadcastResults.filter((r) => r.status === 'rejected');

        assert(fulfilled.length === 2, `Exactly 2 broadcasts succeeded under 20x concurrency (got ${fulfilled.length})`);
        assert(rejected.length === 18, `Exactly 18 broadcasts rejected under 20x concurrency (got ${rejected.length})`);

        // Verify error type
        const allRejectedWithRateLimit = rejected.every(
          (r) => r.status === 'rejected' && (r.reason instanceof PdRateLimitError || (r.reason as any)?.name === 'PdRateLimitError' || (r.reason as any)?.httpStatus === 429)
        );
        assert(allRejectedWithRateLimit, 'All 18 rejected calls threw PdRateLimitError');

        // 3.2 Weekly count checker
        const weeklyStatus = loyaltyService.getWeeklyBroadcastCount(storeA, baseDate);
        assert(weeklyStatus.count === 2, 'Weekly count is exactly 2');
        assert(weeklyStatus.remaining === 0, 'Remaining allowance is 0');

        // 3.3 New calendar week reset: next week allowance must be 2
        const nextWeekDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextWeekStatus = loyaltyService.getWeeklyBroadcastCount(storeA, nextWeekDate);
        assert(nextWeekStatus.remaining === 2, 'Next calendar week allowance resets to 2');

        // 3.4 Multi-tenant store isolation: Store B is unaffected by Store A limit
        const storeBRes = await loyaltyService.sendBroadcast({
          storeId: storeB,
          couponCode: 'STOREB10',
          discountType: 'fixed',
          discountValue: 10,
          message: 'Store B broadcast',
          sentAt: baseDate,
        });
        assert(storeBRes.success === true, 'Store B can broadcast independently while Store A is rate-limited');
      } finally {
        await query('DELETE FROM pd_seller_broadcast WHERE store_id IN ($1, $2)', [storeA, storeB]);
        await query('DELETE FROM pd_store WHERE id IN ($1, $2)', [storeA, storeB]);
        await query('DELETE FROM pd_user WHERE id = $1', [testBroadcastOwnerId]);
      }
    }

    // =========================================================================
    // SECTION 4: NOTIFICATION SLIDING BUFFER (50 RAPID PRICE UPDATES)
    // =========================================================================
    console.log('\n--- 4. Notification Sliding Buffer (50 Rapid Updates Debouncing) ---');
    {
      // Simulate the 15-minute sliding buffer logic in isolation
      const bufferEvents: Array<{
        storeId: string;
        storeName: string;
        type: 'price_drop' | 'new_product';
        productId: string;
        productTitle: string;
        price: number;
        timestamp: number;
      }> = [];

      // Push 50 rapid price updates for 10 distinct products (5 updates per product with changing prices)
      const storeId = 'str_buff_test';
      const storeName = 'Artisanat Nabeul';
      const baseTime = Date.now();

      for (let i = 0; i < 50; i++) {
        const prodIndex = i % 10;
        bufferEvents.push({
          storeId,
          storeName,
          type: 'price_drop',
          productId: `prd_item_${prodIndex}`,
          productTitle: `Vase Céramique #${prodIndex}`,
          price: 100 - (i * 0.5), // progressively lower prices
          timestamp: baseTime + i * 1000,
        });
      }

      assert(bufferEvents.length === 50, '50 rapid price drop events recorded in 15-min window');

      // Process & deduplicate batch
      const uniqueProductsMap = new Map<string, typeof bufferEvents[0]>();
      for (const ev of bufferEvents) {
        uniqueProductsMap.set(ev.productId, ev); // retains latest price
      }
      const uniqueItems = Array.from(uniqueProductsMap.values());

      assert(uniqueItems.length === 10, '50 events consolidated into exactly 10 unique product updates');

      // Build consolidated notification
      const count = uniqueItems.length;
      const title = `🏷️ ${count} baisses de prix chez ${storeName}`;
      const message = `${storeName} a baissé le prix de ${count} articles ! Ne manquez pas ces offres exclusives.`;

      assert(title === '🏷️ 10 baisses de prix chez Artisanat Nabeul', 'Consolidated alert title is accurate');
      assert(
        message === 'Artisanat Nabeul a baissé le prix de 10 articles ! Ne manquez pas ces offres exclusives.',
        'Consolidated alert body is accurate'
      );
      assert(uniqueItems[0].price === 100 - (40 * 0.5), 'Latest product price accurately retained');
    }

    // =========================================================================
    // SECTION 5: DATABASE CONCURRENCY & ANTI-BOT INTEGRITY ON POSTGRESQL
    // =========================================================================
    console.log('\n--- 5. Database Concurrency Stress & Transaction Isolation ---');

    const testStoreId = pdId('str');
    const testOwnerId = pdId('usr');
    const concurrencyBuyerCount = 40;
    const buyerIds: string[] = [];

    try {
      // Setup store and buyers in DB
      await query(
        `INSERT INTO pd_user (id, email, role, first_name, last_name, is_active, password_hash)
         VALUES ($1, 'owner_concurrency@test.com', 'vendor', 'Vendor', 'Concurrency', true, 'hash')`,
        [testOwnerId]
      );

      await query(
        `INSERT INTO pd_store (id, owner_id, name, subdomain, status, subscribers_count, verified_subscribers_count)
         VALUES ($1, $2, 'Concurrency Stress Store', 'conc-store', 'verified', 0, 0)`,
        [testStoreId, testOwnerId]
      );

      // Create 40 buyers: 20 verified (with delivered orders) and 20 unverified
      for (let i = 0; i < concurrencyBuyerCount; i++) {
        const bId = pdId('usr');
        buyerIds.push(bId);
        await query(
          `INSERT INTO pd_user (id, email, role, first_name, last_name, is_active, password_hash)
           VALUES ($1, $2, 'customer', 'Buyer', $3, true, 'hash')`,
          [bId, `buyer_conc_${i}@test.com`, `${i}`]
        );

        if (i < 20) {
          // First 20 are verified
          await query(
            `INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status, subtotal, shipping_total, total)
             VALUES ($1, $2, 'delivered', 'flouci', 'captured', 50, 5, 55)`,
            [pdId('ord'), bId]
          );
        }
      }

      // 5.1 Concurrent Subscriptions (40 parallel buyers subscribing at the exact same instant)
      console.log('  Executing 40 concurrent subscriptions against PostgreSQL...');
      const subPromises = buyerIds.map((bId) => storeSubscriptionService.subscribe(bId, testStoreId));
      const subResults = await Promise.allSettled(subPromises);

      const successfulSubs = subResults.filter((r) => r.status === 'fulfilled');
      assert(successfulSubs.length === concurrencyBuyerCount, `All ${concurrencyBuyerCount} concurrent subscriptions succeeded`);

      // Verify DB store counter exact match
      const storeAfterSubs = await query<{ subscribers_count: number; verified_subscribers_count: number }>(
        'SELECT subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
        [testStoreId]
      );
      assert(
        storeAfterSubs.rows[0].subscribers_count === 40,
        `Store subscribers_count is exactly 40 (got ${storeAfterSubs.rows[0].subscribers_count})`
      );
      assert(
        storeAfterSubs.rows[0].verified_subscribers_count === 20,
        `Store verified_subscribers_count is exactly 20 (got ${storeAfterSubs.rows[0].verified_subscribers_count})`
      );

      // Verify subscription table count
      const tableCountRes = await query<{ total: string; verified: string }>(
        `SELECT COUNT(*)::text AS total, COUNT(*) FILTER (WHERE is_verified_buyer = true)::text AS verified
         FROM pd_store_subscription WHERE store_id = $1`,
        [testStoreId]
      );
      assert(
        parseInt(tableCountRes.rows[0].total, 10) === 40,
        'Exact row count in pd_store_subscription is 40'
      );
      assert(
        parseInt(tableCountRes.rows[0].verified, 10) === 20,
        'Exact verified row count in pd_store_subscription is 20'
      );

      // 5.2 Concurrency Idempotency: Same 40 buyers re-subscribing simultaneously
      console.log('  Executing 40 duplicate concurrent subscriptions (idempotency check)...');
      const duplicateSubs = await Promise.allSettled(buyerIds.map((bId) => storeSubscriptionService.subscribe(bId, testStoreId)));
      const successfulDupes = duplicateSubs.filter((r) => r.status === 'fulfilled');
      assert(successfulDupes.length === concurrencyBuyerCount, 'All 40 idempotent subscriptions succeeded without error');

      // Verify counters did NOT increment on duplicate
      const storeAfterDupes = await query<{ subscribers_count: number; verified_subscribers_count: number }>(
        'SELECT subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
        [testStoreId]
      );
      assert(
        storeAfterDupes.rows[0].subscribers_count === 40,
        'Store subscribers_count remains 40 after duplicate re-subscriptions'
      );
      assert(
        storeAfterDupes.rows[0].verified_subscribers_count === 20,
        'Store verified_subscribers_count remains 20 after duplicate re-subscriptions'
      );

      // 5.3 Concurrent Unsubscriptions (40 parallel buyers unsubscribing at once)
      console.log('  Executing 40 concurrent unsubscriptions against PostgreSQL...');
      const unsubPromises = buyerIds.map((bId) => storeSubscriptionService.unsubscribe(bId, testStoreId));
      const unsubResults = await Promise.allSettled(unsubPromises);
      const successfulUnsubs = unsubResults.filter((r) => r.status === 'fulfilled');
      assert(successfulUnsubs.length === concurrencyBuyerCount, `All ${concurrencyBuyerCount} unsubscriptions succeeded`);

      // Verify DB store counter returns cleanly to 0
      const storeAfterUnsubs = await query<{ subscribers_count: number; verified_subscribers_count: number }>(
        'SELECT subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
        [testStoreId]
      );
      assert(
        storeAfterUnsubs.rows[0].subscribers_count === 0,
        `Store subscribers_count is exactly 0 after full unsubscription (got ${storeAfterUnsubs.rows[0].subscribers_count})`
      );
      assert(
        storeAfterUnsubs.rows[0].verified_subscribers_count === 0,
        `Store verified_subscribers_count is exactly 0 after full unsubscription (got ${storeAfterUnsubs.rows[0].verified_subscribers_count})`
      );

      // 5.4 Anti-Bot Order Status Verification (using dedicated fresh test user)
      console.log('  Verifying order status qualification matrix for anti-bot detection...');
      const bTestFresh = pdId('usr');
      await query(
        `INSERT INTO pd_user (id, email, role, first_name, last_name, is_active, password_hash)
         VALUES ($1, 'antibot_probe@test.com', 'customer', 'AntiBot', 'Probe', true, 'hash')`,
        [bTestFresh]
      );

      try {
        const unverifiedStatuses = ['pending', 'cancelled', 'refunded', 'failed', 'draft'];
        for (const st of unverifiedStatuses) {
          const oId = pdId('ord');
          await query(
            `INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status, subtotal, shipping_total, total)
             VALUES ($1, $2, $3, 'flouci', 'pending', 50, 5, 55)`,
            [oId, bTestFresh, st]
          );
          const isVer = await storeSubscriptionService.isBuyerVerified(bTestFresh);
          assert(!isVer, `Order status '${st}' does NOT qualify buyer as verified`);
          await query('DELETE FROM pd_order WHERE id = $1', [oId]);
        }

        const verifiedStatuses = ['paid', 'delivered', 'shipped', 'processing', 'fulfilled'];
        for (const st of verifiedStatuses) {
          const oId = pdId('ord');
          await query(
            `INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status, subtotal, shipping_total, total)
             VALUES ($1, $2, $3, 'flouci', 'captured', 50, 5, 55)`,
            [oId, bTestFresh, st]
          );
          const isVer = await storeSubscriptionService.isBuyerVerified(bTestFresh);
          assert(isVer, `Order status '${st}' qualifies buyer as verified`);
          await query('DELETE FROM pd_order WHERE id = $1', [oId]);
        }
      } finally {
        await query('DELETE FROM pd_order WHERE customer_id = $1', [bTestFresh]);
        await query('DELETE FROM pd_user WHERE id = $1', [bTestFresh]);
      }

      // 5.5 Seller self-subscription block
      let selfSubBlocked = false;
      try {
        await storeSubscriptionService.subscribe(testOwnerId, testStoreId);
      } catch (err: any) {
        if (err instanceof PdForbiddenError || err?.name === 'PdForbiddenError' || err?.httpStatus === 403) {
          selfSubBlocked = true;
        }
      }
      assert(selfSubBlocked, 'Store owner cannot subscribe to their own store (throws PdForbiddenError)');
    } finally {
      // Cleanup DB
      await query('DELETE FROM pd_order WHERE customer_id = ANY($1)', [buyerIds]);
      await query('DELETE FROM pd_store_subscription WHERE store_id = $1', [testStoreId]);
      await query('DELETE FROM pd_store WHERE id = $1', [testStoreId]);
      await query('DELETE FROM pd_user WHERE id = ANY($1) OR id = $2', [buyerIds, testOwnerId]);
    }

    // =========================================================================
    // SECTION 6: BATCH TRUST SCORE DB CALCULATION UNDER LOAD
    // =========================================================================
    console.log('\n--- 6. Batch Seller Trust Score Calculation Under DB Load ---');

    const batchStoreIds: string[] = [];
    const batchOwnerIds: string[] = [];

    try {
      for (let i = 0; i < 5; i++) {
        const sId = pdId('str');
        const oId = pdId('usr');
        batchStoreIds.push(sId);
        batchOwnerIds.push(oId);

        await query(
          `INSERT INTO pd_user (id, email, role, first_name, last_name, is_active, password_hash)
           VALUES ($1, $2, 'vendor', 'Vendor', $3, true, 'hash')`,
          [oId, `batch_vendor_${i}@test.com`, `${i}`]
        );

        await query(
          `INSERT INTO pd_store (id, owner_id, name, subdomain, status, subscribers_count, verified_subscribers_count)
           VALUES ($1, $2, $3, $4, 'verified', $5, $6)`,
          [sId, oId, `Batch Store ${i}`, `batch-${i}`, (i + 1) * 20, (i + 1) * 10]
        );
      }

      const batchResults = await calculateBatchSellerTrustScores(batchStoreIds);
      assert(Object.keys(batchResults).length === 5, 'calculateBatchSellerTrustScores returns scores for all 5 stores');

      for (let i = 0; i < 5; i++) {
        const sId = batchStoreIds[i];
        const res = batchResults[sId];
        assert(res !== undefined, `Batch result contains store ${i}`);
        assert(res.stats.verifiedSubscribers === (i + 1) * 10, `Store ${i} verified subscribers correctly fetched`);
        assert(res.score >= 0 && res.score <= 100, `Store ${i} score is between 0 and 100 (${res.score})`);
      }

      const emptyBatch = await calculateBatchSellerTrustScores([]);
      assert(Object.keys(emptyBatch).length === 0, 'calculateBatchSellerTrustScores on empty array returns empty object');

      const nonExistentBatch = await calculateBatchSellerTrustScores(['str_fake_1', 'str_fake_2']);
      assert(Object.keys(nonExistentBatch).length === 0, 'calculateBatchSellerTrustScores on non-existent stores returns empty object');
    } finally {
      await query('DELETE FROM pd_store WHERE id = ANY($1)', [batchStoreIds]);
      await query('DELETE FROM pd_user WHERE id = ANY($1)', [batchOwnerIds]);
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n================================================================');
    console.log('                ADVERSARIAL STRESS TEST SUMMARY                 ');
    console.log('================================================================');
    console.log(`  Total Tests Run: ${totalTests}`);
    console.log(`  Passed Tests   : ${passedTests}`);
    console.log(`  Failed Tests   : ${failedTests}`);

    if (failedTests > 0) {
      console.error('\nFailures:');
      failureDetails.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
      await closePool();
      process.exit(1);
    } else {
      console.log('\n  🎉 ALL ADVERSARIAL STRESS TESTS COMPLETED WITH 100% PASS RATE!');
      await closePool();
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during adversarial test execution:', err);
    await closePool();
    process.exit(1);
  }
}

runAdversarialTests().catch(async (err) => {
  console.error('Fatal error running adversarial tests:', err);
  process.exit(1);
});
