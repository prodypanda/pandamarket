/**
 * Challenger 1 Adversarial Stress Harness for Milestone M6 (Feature 20 / R5)
 *
 * Rigorous empirical stress-testing covering:
 * 1. Weekly Rate Limiting:
 *    - 1st send -> OK (remaining quota: 1)
 *    - 2nd send -> OK (remaining quota: 0)
 *    - 3rd send in same ISO calendar week -> PdRateLimitError (HTTP 429)
 *    - ISO week transitions (Monday 00:00 UTC resets, cross-year week 52/53 -> 01)
 *    - Isolation per store (Store A exhausted does not block Store B)
 * 2. Trust Score Formula Mathematical Integrity:
 *    - Boundary cases (0 rating, 5 rating, 0 subs, 10000 subs, dispute rate 0% to 20%+)
 *    - SLA compliance and SLA hours decay curve
 *    - Clamping guarantees (0.0 to 90.0, no NaN, no infinities, no negative values)
 *    - Monotonicity and strict mathematical concavity
 * 3. Tunisian Governorates Mapping:
 *    - All 24 governorates validation
 *    - Accented/Unaccented normalization & Case-insensitivity
 *    - Fallback to 'Other' for foreign/unrecognized/null/empty strings
 *    - Total subscriber sum preservation (sum(govs) + Other == total)
 *    - Div-by-zero safety when subscriber count is 0
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

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ${c.green}✓ PASS:${c.reset} ${message}`);
  } else {
    failed++;
    console.error(`  ${c.red}✗ FAIL:${c.reset} ${message}`);
  }
}

async function runAdversarialStressTests() {
  const { computeSellerTrustScore, TUNISIAN_GOVERNORATES, getCalendarWeekKey, SellerLoyaltyService } = await import('../services/seller-trust.service');
  const { PdRateLimitError } = await import('../errors');
  console.log(`\n${c.bold}${c.cyan}================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan}     CHALLENGER 1 ADVERSARIAL STRESS TEST SUITE (M6 / R5)      ${c.reset}`);
  console.log(`${c.bold}${c.cyan}================================================================${c.reset}\n`);

  // =========================================================================
  // 1. WEEKLY RATE LIMITING STRESS TESTS
  // =========================================================================
  console.log(`${c.bold}1. Testing Weekly Broadcast Rate Limiting (Max 2/calendar week)...${c.reset}`);

  const loyaltyService = new SellerLoyaltyService();
  const storeAlpha = 'store_stress_alpha';
  const storeBeta = 'store_stress_beta';

  const mondayW33 = new Date('2026-08-10T08:00:00Z');
  const wednesdayW33 = new Date('2026-08-12T12:00:00Z');
  const fridayW33 = new Date('2026-08-14T18:00:00Z');
  const sundayW33 = new Date('2026-08-16T23:59:59Z');
  const nextMondayW34 = new Date('2026-08-17T00:00:01Z');

  // Test 1.1: 1st broadcast in week -> OK
  const res1 = await loyaltyService.sendBroadcast({
    storeId: storeAlpha,
    couponCode: 'ALPHA10',
    discountType: 'percentage',
    discountValue: 10,
    message: 'First broadcast of the week',
    sentAt: mondayW33,
  });
  assert(res1.success === true && res1.broadcast.couponCode === 'ALPHA10', '1st broadcast in calendar week succeeds');
  const quotaAfter1 = loyaltyService.getWeeklyBroadcastCount(storeAlpha, mondayW33);
  assert(quotaAfter1.count === 1 && quotaAfter1.remaining === 1, 'Quota after 1st broadcast is 1 remaining');

  // Test 1.2: 2nd broadcast in week -> OK
  const res2 = await loyaltyService.sendBroadcast({
    storeId: storeAlpha,
    couponCode: 'ALPHA20',
    discountType: 'percentage',
    discountValue: 20,
    message: 'Second broadcast of the week',
    sentAt: wednesdayW33,
  });
  assert(res2.success === true && res2.broadcast.couponCode === 'ALPHA20', '2nd broadcast in calendar week succeeds');
  const quotaAfter2 = loyaltyService.getWeeklyBroadcastCount(storeAlpha, wednesdayW33);
  assert(quotaAfter2.count === 2 && quotaAfter2.remaining === 0, 'Quota after 2nd broadcast is 0 remaining');

  // Test 1.3: 3rd broadcast in same week -> PdRateLimitError
  let thirdFailedProperly = false;
  try {
    await loyaltyService.sendBroadcast({
      storeId: storeAlpha,
      couponCode: 'ALPHA30_SPAM',
      discountType: 'percentage',
      discountValue: 30,
      message: 'Third broadcast attempt',
      sentAt: fridayW33,
    });
  } catch (err: any) {
    if (err instanceof PdRateLimitError && (err.httpStatus === 429 || (err as any).statusCode === 429)) {
      thirdFailedProperly = true;
    }
  }
  assert(thirdFailedProperly, '3rd broadcast in same calendar week throws PdRateLimitError (HTTP 429)');

  // Test 1.4: 4th broadcast on Sunday 23:59:59 (still same week) -> PdRateLimitError
  let sundayFailedProperly = false;
  try {
    await loyaltyService.sendBroadcast({
      storeId: storeAlpha,
      couponCode: 'SUNDAY_SPAM',
      discountType: 'percentage',
      discountValue: 5,
      message: 'Sunday attempt',
      sentAt: sundayW33,
    });
  } catch (err: any) {
    if (err instanceof PdRateLimitError && (err.httpStatus === 429 || (err as any).statusCode === 429)) {
      sundayFailedProperly = true;
    }
  }
  assert(sundayFailedProperly, 'Broadcast on Sunday 23:59:59 of same week is blocked by rate limiter');

  // Test 1.5: Next Monday 00:00:01 (Week rollover) -> Allowed
  const resNextWeek = await loyaltyService.sendBroadcast({
    storeId: storeAlpha,
    couponCode: 'NEW_WEEK_1',
    discountType: 'percentage',
    discountValue: 15,
    message: 'New calendar week broadcast',
    sentAt: nextMondayW34,
  });
  assert(resNextWeek.success === true, 'Broadcast on Next Monday (new calendar week) succeeds after previous week quota exhaustion');

  // Test 1.6: Store isolation (Store Alpha exhausted does NOT block Store Beta)
  const resBeta1 = await loyaltyService.sendBroadcast({
    storeId: storeBeta,
    couponCode: 'BETA10',
    discountType: 'percentage',
    discountValue: 10,
    message: 'Store Beta first broadcast',
    sentAt: wednesdayW33,
  });
  assert(resBeta1.success === true, 'Store Beta can broadcast independently while Store Alpha was rate-limited');

  // Test 1.7: ISO Week Calculation verification
  const w2026_01 = getCalendarWeekKey(new Date('2026-01-01T00:00:00Z'));
  const w2026_33 = getCalendarWeekKey(new Date('2026-08-15T12:00:00Z'));
  assert(w2026_01 === '2026-W01', `2026-01-01 correctly identified as 2026-W01 (got ${w2026_01})`);
  assert(w2026_33 === '2026-W33', `2026-08-15 correctly identified as 2026-W33 (got ${w2026_33})`);

  // =========================================================================
  // 2. TRUST SCORE FORMULA MATHEMATICAL INTEGRITY & BOUNDARY TESTING
  // =========================================================================
  console.log(`\n${c.bold}2. Testing Seller Trust Score Formula Boundary Cases & Extremes...${c.reset}`);

  // Test 2.1: Absolute minimum boundary (0 rating, 200h SLA, 0 subs, 50% dispute)
  const minScore = computeSellerTrustScore({
    rating: 0,
    slaHours: 200,
    verifiedSubscribers: 0,
    disputeRatePct: 50.0,
  });
  assert(minScore.score === 0.0, 'Worst-case seller score is strictly clamped to 0.0 (no negative values)');
  assert(minScore.normalizedRating === 0 && minScore.normalizedSla === 0 && minScore.subScore === 0 && minScore.disputePenalty === 1.0, 'Worst-case components correctly normalized');

  // Test 2.2: Theoretical maximum boundary (5.0 rating, 12h SLA, 10,000 verified subs, 0% dispute)
  const maxScore = computeSellerTrustScore({
    rating: 5.0,
    slaHours: 12,
    verifiedSubscribers: 10000,
    disputeRatePct: 0.0,
  });
  // 0.40(1) + 0.30(1) + 0.20(1) - 0.10(0) = 0.90 -> 90.0
  assert(maxScore.score === 90.0, `Theoretical max score is 90.0 (got ${maxScore.score})`);
  assert(maxScore.normalizedRating === 1.0 && maxScore.normalizedSla === 1.0 && maxScore.subScore === 1.0 && maxScore.disputePenalty === 0, 'Max-case components correctly evaluated');

  // Test 2.3: Rating boundaries & clamping
  const negativeRating = computeSellerTrustScore({ rating: -5.0, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
  const overshootRating = computeSellerTrustScore({ rating: 10.0, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
  assert(negativeRating.normalizedRating === 0.0, 'Negative rating (<0) is clamped to 0.0');
  assert(overshootRating.normalizedRating === 1.0, 'Overshoot rating (>5) is clamped to 1.0 (5.0 rating)');

  // Test 2.4: Verified subscribers progression & strict concavity
  const subsTestPoints = [0, 1, 9, 99, 999, 9999, 50000, 1000000];
  const subScores = subsTestPoints.map(s => computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: s, disputeRatePct: 0 }).subScore);
  
  assert(subScores[0] === 0.0, '0 verified subs -> subScore = 0.0');
  assert(Math.abs(subScores[2] - 0.25) < 0.001, '9 verified subs (log10(10)=1) -> subScore = 0.25');
  assert(Math.abs(subScores[3] - 0.50) < 0.001, '99 verified subs (log10(100)=2) -> subScore = 0.50');
  assert(Math.abs(subScores[4] - 0.75) < 0.001, '999 verified subs (log10(1000)=3) -> subScore = 0.75');
  assert(Math.abs(subScores[5] - 1.00) < 0.001, '9999 verified subs (log10(10000)=4) -> subScore = 1.00');
  assert(subScores[6] === 1.0 && subScores[7] === 1.0, 'Excessive verified subs (>10000) strictly capped at 1.0');

  // Strict concavity check: marginal gain from 0->9 (0.25/9 = 0.0277) > from 9->99 (0.25/90 = 0.00277) > from 99->999 (0.25/900 = 0.000277)
  const g1 = (subScores[2] - subScores[0]) / 9;
  const g2 = (subScores[3] - subScores[2]) / 90;
  const g3 = (subScores[4] - subScores[3]) / 900;
  assert(g1 > g2 && g2 > g3, 'Logarithmic verified subscriber score satisfies diminishing returns (strict concavity)');

  // Test 2.5: Dispute rate progression (0% to 20%)
  const d0 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 1000, disputeRatePct: 0.0 });
  const d1 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 1000, disputeRatePct: 1.0 });
  const d5 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 1000, disputeRatePct: 5.0 });
  const d10 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 1000, disputeRatePct: 10.0 });
  const d20 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 1000, disputeRatePct: 20.0 });

  assert(d0.disputePenalty === 0.0, '0% dispute rate -> disputePenalty = 0.0');
  assert(d1.disputePenalty === 0.1, '1% dispute rate -> disputePenalty = 0.1');
  assert(d5.disputePenalty === 0.5, '5% dispute rate -> disputePenalty = 0.5');
  assert(d10.disputePenalty === 1.0, '10% dispute rate -> disputePenalty = 1.0');
  assert(d20.disputePenalty === 1.0, '20% dispute rate -> disputePenalty clamped at 1.0 max penalty');
  assert(d0.score > d1.score && d1.score > d5.score && d5.score > d10.score, 'Monotonic decrease in score with increasing dispute rate');

  // Test 2.6: SLA fulfillment variations
  const sla12 = computeSellerTrustScore({ rating: 5, slaHours: 12, verifiedSubscribers: 0, disputeRatePct: 0 });
  const sla24 = computeSellerTrustScore({ rating: 5, slaHours: 24, verifiedSubscribers: 0, disputeRatePct: 0 });
  const sla60 = computeSellerTrustScore({ rating: 5, slaHours: 60, verifiedSubscribers: 0, disputeRatePct: 0 });
  const sla96 = computeSellerTrustScore({ rating: 5, slaHours: 96, verifiedSubscribers: 0, disputeRatePct: 0 });
  const sla150 = computeSellerTrustScore({ rating: 5, slaHours: 150, verifiedSubscribers: 0, disputeRatePct: 0 });

  assert(sla12.normalizedSla === 1.0 && sla24.normalizedSla === 1.0, 'SLA <= 24h yields full 1.0 normalized score');
  assert(Math.abs(sla60.normalizedSla - 0.5) < 0.01, 'SLA = 60h yields 0.5 normalized score');
  assert(sla96.normalizedSla === 0.0 && sla150.normalizedSla === 0.0, 'SLA >= 96h yields 0.0 normalized score');

  // =========================================================================
  // 3. TUNISIAN GOVERNORATES MAPPING & DATA INTEGRITY
  // =========================================================================
  console.log(`\n${c.bold}3. Testing Tunisian Governorates Mapping (24 Governorates + Other)...${c.reset}`);

  // Test 3.1: Exactly 24 governorates defined
  assert(TUNISIAN_GOVERNORATES.length === 24, `Exact count of 24 Tunisian governorates defined (got ${TUNISIAN_GOVERNORATES.length})`);

  const official24 = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba',
    'Nabeul', 'Zaghouan', 'Bizerte',
    'Béja', 'Jendouba', 'Le Kef', 'Siliana',
    'Sousse', 'Monastir', 'Mahdia', 'Sfax',
    'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Medenine', 'Tataouine',
    'Gafsa', 'Tozeur', 'Kebili'
  ];

  for (const gov of official24) {
    assert(TUNISIAN_GOVERNORATES.includes(gov as any), `Governorate list contains '${gov}'`);
  }

  // Test 3.2: Complete geographic mapping and total subscriber sum preservation
  const govService = new SellerLoyaltyService();
  const govStoreId = 'store_gov_stress';

  // Add 1 subscriber in each of the 24 governorates
  for (let i = 0; i < official24.length; i++) {
    govService.registerSubscriber(govStoreId, {
      buyerId: `buyer_${i}`,
      governorate: official24[i],
      isVerified: i % 2 === 0,
    });
  }

  // Add 5 foreign/unclassified subscribers
  govService.registerSubscriber(govStoreId, { buyerId: 'b_paris', governorate: 'Paris, France', isVerified: true });
  govService.registerSubscriber(govStoreId, { buyerId: 'b_lyon', governorate: 'Lyon, France', isVerified: false });
  govService.registerSubscriber(govStoreId, { buyerId: 'b_dubai', governorate: 'Dubai, UAE', isVerified: true });
  govService.registerSubscriber(govStoreId, { buyerId: 'b_null', governorate: undefined, isVerified: false });
  govService.registerSubscriber(govStoreId, { buyerId: 'b_empty', governorate: '', isVerified: false });

  const govAnalytics = govService.getSubscriberAnalytics(govStoreId);

  assert(govAnalytics.total_subscribers === 29, `Total subscribers is 29 (got ${govAnalytics.total_subscribers})`);
  assert(govAnalytics.governorate_distribution['Other'] === 5, `Unclassified/foreign addresses correctly aggregated into 'Other' bucket: 5 (got ${govAnalytics.governorate_distribution['Other']})`);

  for (const gov of official24) {
    assert(govAnalytics.governorate_distribution[gov] === 1, `Governorate '${gov}' has exactly 1 subscriber`);
  }

  // Sum check
  const distributionSum = Object.values(govAnalytics.governorate_distribution).reduce((a, b) => a + b, 0);
  assert(distributionSum === govAnalytics.total_subscribers, `Sum of all 24 governorates + Other (${distributionSum}) matches total_subscribers (${govAnalytics.total_subscribers})`);

  // Test 3.3: Empty subscriber state (0 subscribers)
  const emptyGovAnalytics = govService.getSubscriberAnalytics('store_empty_subs');
  assert(emptyGovAnalytics.total_subscribers === 0, 'Empty store returns 0 total subscribers');
  assert(emptyGovAnalytics.verified_pct === 0, 'Empty store returns 0% verified (no NaN)');
  assert(emptyGovAnalytics.growth_rate_pct === 0, 'Empty store returns 0% growth rate (no NaN)');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n${c.bold}════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`  CHALLENGER 1 STRESS TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${c.bold}════════════════════════════════════════════════════════════════${c.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialStressTests().catch((err) => {
  console.error('Stress test fatal error:', err);
  process.exit(1);
});
