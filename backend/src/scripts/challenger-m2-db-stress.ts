/**
 * Adversarial Database & Concurrency Stress Test for M2
 * 
 * Verifies real PostgreSQL executions:
 * 1. Single vs Batch Seller Trust Score Calculation with identical SQL aggregation
 * 2. SQL Edge cases: 0 reviews (AVG null), 0 orders (EXTRACT null, total_orders = 0), missing rows
 * 3. PostgreSQL Transaction Atomic Concurrency: High-throughput concurrent subscribe/unsubscribe
 * 4. Idempotency & Zero-Clamping in PostgreSQL with GREATEST(0, ...)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env
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

async function runAdversarialDbSuite() {
  const { query, closePool } = await import('../db/pool');
  const { pdId } = await import('../utils/crypto');
  const { calculateSellerTrustScore, calculateBatchSellerTrustScores } = await import('../services/seller-trust.service');
  const { storeSubscriptionService } = await import('../services/store-subscription.service');

  console.log('\n================================================================');
  console.log('⚡ ADVERSARIAL DB STRESS & EMPIRICAL MATHEMATICAL ORACLE RUNNER');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function assertTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}`);
      failed++;
    }
  }

  // Generate unique IDs for testing
  const testVendorId1 = pdId('usr');
  const testVendorId2 = pdId('usr');
  const testStoreId1 = pdId('str');
  const testStoreId2 = pdId('str');
  const testStoreId3 = pdId('str'); // Empty store with 0 reviews, 0 orders
  const testStoreId4 = pdId('str'); // Giant store with 1,000,000 verified subs

  const testBuyerIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    testBuyerIds.push(pdId('usr'));
  }

  try {
    // ------------------------------------------------------------------------
    // SETUP DB FIXTURES
    // ------------------------------------------------------------------------
    await assertTest('Setup Database Fixtures for Multi-Store Test Matrix', async () => {
      // 1. Create Vendors & Buyers
      const userInserts = [
        `('${testVendorId1}', 'adv_vendor1@test.tn', 'vendor', 'Adv1', 'Vendor', true, 'hash')`,
        `('${testVendorId2}', 'adv_vendor2@test.tn', 'vendor', 'Adv2', 'Vendor', true, 'hash')`,
        ...testBuyerIds.map((bId, idx) => `('${bId}', 'adv_buyer_${idx}@test.tn', 'customer', 'Buyer', '${idx}', true, 'hash')`),
      ];
      await query(`
        INSERT INTO pd_user (id, email, role, first_name, last_name, is_active, password_hash)
        VALUES ${userInserts.join(', ')}
      `);

      // 2. Create 4 Stores
      await query(`
        INSERT INTO pd_store (id, owner_id, name, subdomain, status, subscribers_count, verified_subscribers_count)
        VALUES 
          ('${testStoreId1}', '${testVendorId1}', 'Store Alpha (High Perf)', 'adv-alpha', 'verified', 500, 250),
          ('${testStoreId2}', '${testVendorId2}', 'Store Beta (Disputed)', 'adv-beta', 'verified', 20, 10),
          ('${testStoreId3}', '${testVendorId1}', 'Store Gamma (Empty)', 'adv-gamma', 'verified', 0, 0),
          ('${testStoreId4}', '${testVendorId2}', 'Store Delta (Megastore)', 'adv-delta', 'verified', 2000000, 1000000)
      `);

      // 3. Create Products for Store 1 & Store 2
      const prod1 = pdId('prd');
      const prod2 = pdId('prd');
      await query(`
        INSERT INTO pd_product (id, store_id, title, slug, price, status)
        VALUES 
          ('${prod1}', '${testStoreId1}', 'Prod Alpha', 'prod-alpha', 50.0, 'published'),
          ('${prod2}', '${testStoreId2}', 'Prod Beta', 'prod-beta', 30.0, 'published')
      `);

      // 4. Create Reviews: Store 1 gets 5-star reviews, Store 2 gets 2-star reviews
      // Note: pd_review schema columns: id, product_id, customer_id, store_id, rating, title, body, status
      await query(`
        INSERT INTO pd_review (id, product_id, customer_id, store_id, rating, title, body, status)
        VALUES 
          ('${pdId('rev')}', '${prod1}', '${testBuyerIds[0]}', '${testStoreId1}', 5, 'Great!', 'Excellent product', 'published'),
          ('${pdId('rev')}', '${prod1}', '${testBuyerIds[1]}', '${testStoreId1}', 5, 'Perfect!', 'Very fast', 'published'),
          ('${pdId('rev')}', '${prod2}', '${testBuyerIds[2]}', '${testStoreId2}', 2, 'Bad quality', 'Low quality', 'published'),
          ('${pdId('rev')}', '${prod2}', '${testBuyerIds[3]}', '${testStoreId2}', 1, 'Broken', 'Not working', 'published')
      `);

      // 5. Create Orders & Order Items:
      // Store 1: 5 completed orders, fast SLA (12 hours)
      // Store 2: 10 orders, 5 disputed, slow SLA (72 hours)
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const oId = pdId('ord');
        const createdAt = new Date(now.getTime() - 24 * 3600 * 1000);
        const updatedAt = new Date(now.getTime() - 12 * 3600 * 1000); // 12h fulfillment
        await query(`
          INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status, subtotal, shipping_total, total, created_at, updated_at)
          VALUES ('${oId}', '${testBuyerIds[i]}', 'delivered', 'flouci', 'captured', 50, 7, 57, '${createdAt.toISOString()}', '${updatedAt.toISOString()}')
        `);
        await query(`
          INSERT INTO pd_order_item (id, order_id, product_id, store_id, title, unit_price, quantity, subtotal)
          VALUES ('${pdId('oit')}', '${oId}', '${prod1}', '${testStoreId1}', 'Prod Alpha', 50, 1, 50)
        `);
      }

      // Store 2 orders
      for (let i = 5; i < 15; i++) {
        const oId = pdId('ord');
        const status = i < 10 ? 'delivered' : 'disputed';
        const createdAt = new Date(now.getTime() - 96 * 3600 * 1000);
        const updatedAt = new Date(now.getTime() - 24 * 3600 * 1000); // 72h SLA
        await query(`
          INSERT INTO pd_order (id, customer_id, status, payment_gateway, payment_status, subtotal, shipping_total, total, created_at, updated_at)
          VALUES ('${oId}', '${testBuyerIds[i]}', '${status}', 'flouci', 'captured', 30, 7, 37, '${createdAt.toISOString()}', '${updatedAt.toISOString()}')
        `);
        await query(`
          INSERT INTO pd_order_item (id, order_id, product_id, store_id, title, unit_price, quantity, subtotal)
          VALUES ('${pdId('oit')}', '${oId}', '${prod2}', '${testStoreId2}', 'Prod Beta', 30, 1, 30)
        `);
      }
    });

    // ------------------------------------------------------------------------
    // TEST 1: Single vs Batch Consistency in Real Database
    // ------------------------------------------------------------------------
    await assertTest('Single vs Batch Seller Trust Score Calculation Match 100% on DB', async () => {
      const storeIds = [testStoreId1, testStoreId2, testStoreId3, testStoreId4];

      // Single queries
      const singleScores: Record<string, any> = {};
      for (const sId of storeIds) {
        singleScores[sId] = await calculateSellerTrustScore(sId);
      }

      // Batch query
      const batchScores = await calculateBatchSellerTrustScores(storeIds);

      for (const sId of storeIds) {
        const single = singleScores[sId];
        const batch = batchScores[sId];

        if (!batch) {
          throw new Error(`Batch missing result for store ${sId}`);
        }

        if (single.score !== batch.score) {
          throw new Error(`Score mismatch for store ${sId}: single=${single.score} vs batch=${batch.score}`);
        }

        if (single.stats.rating !== batch.stats.rating) {
          throw new Error(`Rating mismatch for ${sId}: single=${single.stats.rating} vs batch=${batch.stats.rating}`);
        }

        if (Math.abs((single.stats.slaHours ?? 24) - (batch.stats.slaHours ?? 24)) > 0.01) {
          throw new Error(`SLA mismatch for ${sId}: single=${single.stats.slaHours} vs batch=${batch.stats.slaHours}`);
        }

        if (single.stats.verifiedSubscribers !== batch.stats.verifiedSubscribers) {
          throw new Error(`Verified subs mismatch for ${sId}: single=${single.stats.verifiedSubscribers} vs batch=${batch.stats.verifiedSubscribers}`);
        }

        if (Math.abs(single.stats.disputeRatePct - batch.stats.disputeRatePct) > 0.01) {
          throw new Error(`Dispute % mismatch for ${sId}: single=${single.stats.disputeRatePct} vs batch=${batch.stats.disputeRatePct}`);
        }
      }
    });

    // ------------------------------------------------------------------------
    // TEST 2: Empty Store DB Handling (Zero reviews, zero orders)
    // ------------------------------------------------------------------------
    await assertTest('Empty Store DB Defaults Fallbacks (Rating=5.0, SLA=24h, Subs=0, Dispute=0%)', async () => {
      const emptyStoreScore = await calculateSellerTrustScore(testStoreId3);
      if (emptyStoreScore.stats.rating !== 5.0) {
        throw new Error(`Expected default rating 5.0, got ${emptyStoreScore.stats.rating}`);
      }
      if (emptyStoreScore.stats.slaHours !== 24.0) {
        throw new Error(`Expected default SLA 24.0h, got ${emptyStoreScore.stats.slaHours}`);
      }
      if (emptyStoreScore.stats.verifiedSubscribers !== 0) {
        throw new Error(`Expected 0 verified subs, got ${emptyStoreScore.stats.verifiedSubscribers}`);
      }
      if (emptyStoreScore.stats.disputeRatePct !== 0) {
        throw new Error(`Expected 0% dispute, got ${emptyStoreScore.stats.disputeRatePct}`);
      }
      // Score = 0.40(1) + 0.30(1) + 0.20(0) - 0.10(0) = 0.70 -> 70.0
      if (emptyStoreScore.score !== 70.0) {
        throw new Error(`Expected score 70.0 for fresh store, got ${emptyStoreScore.score}`);
      }
    });

    // ------------------------------------------------------------------------
    // TEST 3: Megastore Logarithmic Cap (1,000,000 subscribers)
    // ------------------------------------------------------------------------
    await assertTest('Megastore with 1,000,000 verified subscribers capped at SubScore=1.0, Trust Score=90.0', async () => {
      const megaScore = await calculateSellerTrustScore(testStoreId4);
      if (megaScore.details.subScore !== 1.0) {
        throw new Error(`Expected subScore 1.0, got ${megaScore.details.subScore}`);
      }
      if (megaScore.score !== 90.0) {
        throw new Error(`Expected score 90.0, got ${megaScore.score}`);
      }
    });

    // ------------------------------------------------------------------------
    // TEST 4: Anti-Bot Verification in Real PostgreSQL
    // ------------------------------------------------------------------------
    await assertTest('Anti-Bot Purchase History Verification: Unverified vs Verified in DB', async () => {
      // testBuyerIds[0] has delivered order -> verified
      // testBuyerIds[19] has no order -> unverified
      const verifiedCheck1 = await storeSubscriptionService.isBuyerVerified(testBuyerIds[0]);
      const verifiedCheck2 = await storeSubscriptionService.isBuyerVerified(testBuyerIds[19]);

      if (verifiedCheck1 !== true) {
        throw new Error(`Expected buyer[0] to be verified`);
      }
      if (verifiedCheck2 !== false) {
        throw new Error(`Expected buyer[19] to be unverified`);
      }
    });

    // ------------------------------------------------------------------------
    // TEST 5: PostgreSQL Real Transaction Concurrency Stress
    // ------------------------------------------------------------------------
    await assertTest('PostgreSQL Concurrent Subscribe/Unsubscribe Stress on Store Gamma', async () => {
      // Concurrently subscribe 10 buyers (5 verified, 5 unverified)
      const subPromises = testBuyerIds.slice(0, 10).map((bId) =>
        storeSubscriptionService.subscribe(bId, testStoreId3)
      );

      const results = await Promise.all(subPromises);
      if (results.length !== 10) {
        throw new Error('Expected 10 subscription results');
      }

      // Check DB counters
      const storeRes = await query<{ subscribers_count: number; verified_subscribers_count: number }>(
        'SELECT subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
        [testStoreId3]
      );

      if (storeRes.rows[0].subscribers_count !== 10) {
        throw new Error(`Expected 10 subscribers, got ${storeRes.rows[0].subscribers_count}`);
      }

      // Concurrently unsubscribe 5 buyers
      const unsubPromises = testBuyerIds.slice(0, 5).map((bId) =>
        storeSubscriptionService.unsubscribe(bId, testStoreId3)
      );
      await Promise.all(unsubPromises);

      const storeResAfter = await query<{ subscribers_count: number; verified_subscribers_count: number }>(
        'SELECT subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
        [testStoreId3]
      );

      if (storeResAfter.rows[0].subscribers_count !== 5) {
        throw new Error(`Expected 5 subscribers, got ${storeResAfter.rows[0].subscribers_count}`);
      }
    });

    // ------------------------------------------------------------------------
    // TEST 6: Zero-Floor Clamping in PostgreSQL
    // ------------------------------------------------------------------------
    await assertTest('Zero-Floor Clamping: Repeated Unsubscribes on Empty Store Never Yield Negative Values', async () => {
      // Repeatedly unsubscribe on store 3 beyond remaining count
      const ghostUnsubs = Array.from({ length: 15 }, (_, i) =>
        storeSubscriptionService.unsubscribe(`ghost_usr_${i}`, testStoreId3)
      );
      await Promise.all(ghostUnsubs);

      const storeRes = await query<{ subscribers_count: number; verified_subscribers_count: number }>(
        'SELECT subscribers_count, verified_subscribers_count FROM pd_store WHERE id = $1',
        [testStoreId3]
      );

      if (storeRes.rows[0].subscribers_count < 0 || storeRes.rows[0].verified_subscribers_count < 0) {
        throw new Error(`Negative counts detected! subs=${storeRes.rows[0].subscribers_count}, ver=${storeRes.rows[0].verified_subscribers_count}`);
      }
    });

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP FIXTURES
    // ------------------------------------------------------------------------
    console.log('\n🧹 Cleaning up test database fixtures...');
    try {
      await query(`DELETE FROM pd_review WHERE customer_id = ANY($1)`, [testBuyerIds]);
      await query(`DELETE FROM pd_order_item WHERE store_id IN ($1, $2, $3, $4)`, [testStoreId1, testStoreId2, testStoreId3, testStoreId4]);
      await query(`DELETE FROM pd_order WHERE customer_id = ANY($1)`, [testBuyerIds]);
      await query(`DELETE FROM pd_store_subscription WHERE store_id IN ($1, $2, $3, $4)`, [testStoreId1, testStoreId2, testStoreId3, testStoreId4]);
      await query(`DELETE FROM pd_product WHERE store_id IN ($1, $2, $3, $4)`, [testStoreId1, testStoreId2, testStoreId3, testStoreId4]);
      await query(`DELETE FROM pd_store WHERE id IN ($1, $2, $3, $4)`, [testStoreId1, testStoreId2, testStoreId3, testStoreId4]);
      await query(`DELETE FROM pd_user WHERE id IN ($1, $2, ${testBuyerIds.map((_, i) => `$${i + 3}`).join(', ')})`, [testVendorId1, testVendorId2, ...testBuyerIds]);
    } catch (cleanErr: any) {
      console.warn('Cleanup warning:', cleanErr.message);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------------------\n');

  await closePool();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialDbSuite().catch((err) => {
  console.error('Fatal execution error in adversarial suite:', err);
  process.exit(1);
});
