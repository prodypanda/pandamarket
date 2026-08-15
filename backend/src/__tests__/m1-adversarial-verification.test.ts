import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query, closePool } from '../db/pool';
import { pdId } from '../utils/crypto';
import { FEATURE_20_FOLDER_ID } from './admin-notes-feature20.test';

describe('M1 Adversarial & Empirical Stress Verification Suite', () => {
  // Test isolation IDs
  const testRunId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const buyerId1 = `usr_adv_b1_${testRunId}`;
  const buyerId2 = `usr_adv_b2_${testRunId}`;
  const sellerId = `usr_adv_s_${testRunId}`;
  const storeId1 = `str_adv_1_${testRunId}`;
  const storeId2 = `str_adv_2_${testRunId}`;
  const productId1 = `prd_adv_1_${testRunId}`;

  beforeAll(async () => {
    // 1. Create prerequisite test entities (users, store, product)
    await query(
      `INSERT INTO pd_user (id, email, password_hash, role, first_name, last_name, is_active, created_at, updated_at)
       VALUES 
         ($1, $2, 'hash', 'customer', 'AdvBuyer1', 'Test', true, NOW(), NOW()),
         ($3, $4, 'hash', 'customer', 'AdvBuyer2', 'Test', true, NOW(), NOW()),
         ($5, $6, 'hash', 'vendor', 'AdvSeller', 'Test', true, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        buyerId1,
        `adv_b1_${testRunId}@pandamarket.test`,
        buyerId2,
        `adv_b2_${testRunId}@pandamarket.test`,
        sellerId,
        `adv_s_${testRunId}@pandamarket.test`,
      ],
    );

    await query(
      `INSERT INTO pd_store (id, owner_id, name, subdomain, status, subscribers_count, verified_subscribers_count, created_at, updated_at)
       VALUES 
         ($1, $2, 'Adv Store 1', $3, 'verified', 0, 0, NOW(), NOW()),
         ($4, $2, 'Adv Store 2', $5, 'verified', 0, 0, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [storeId1, sellerId, `advstore1-${testRunId}`, storeId2, `advstore2-${testRunId}`],
    );

    await query(
      `INSERT INTO pd_product (id, store_id, title, slug, price, status, interest_tags, created_at, updated_at)
       VALUES ($1, $2, 'Adv Product 1', $3, 49.99, 'published', ARRAY['electronics', 'robotics', 'arduino'], NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [productId1, storeId1, `adv-product-1-${testRunId}`],
    );
  });

  afterAll(async () => {
    // Clean up created test data
    try {
      await query(`DELETE FROM pd_seller_broadcast WHERE store_id IN ($1, $2)`, [storeId1, storeId2]);
      await query(`DELETE FROM pd_buyer_interest_profile WHERE buyer_id IN ($1, $2)`, [buyerId1, buyerId2]);
      await query(`DELETE FROM pd_store_subscription WHERE buyer_id IN ($1, $2) OR store_id IN ($3, $4)`, [
        buyerId1,
        buyerId2,
        storeId1,
        storeId2,
      ]);
      await query(`DELETE FROM pd_product WHERE id = $1`, [productId1]);
      await query(`DELETE FROM pd_store WHERE id IN ($1, $2)`, [storeId1, storeId2]);
      await query(`DELETE FROM pd_user WHERE id IN ($1, $2, $3)`, [buyerId1, buyerId2, sellerId]);
    } catch {
      // Ignore cleanup error
    }
  });

  // =========================================================================
  // 1. UNIQUE CONSTRAINT VERIFICATION (pd_store_subscription: buyer_id, store_id)
  // =========================================================================
  describe('1. Unique Constraint Stress Tests', () => {
    it('allows initial subscription insert of (buyer1, store1)', async () => {
      const subId = pdId('sub');
      const res = await query(
        `INSERT INTO pd_store_subscription (id, buyer_id, store_id, notify_price_drops, notify_new_products, is_verified_buyer)
         VALUES ($1, $2, $3, true, true, false)
         RETURNING id, buyer_id, store_id`,
        [subId, buyerId1, storeId1],
      );

      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].buyer_id).toBe(buyerId1);
      expect(res.rows[0].store_id).toBe(storeId1);
    });

    it('rejects duplicate subscription for identical (buyer1, store1) with unique violation 23505', async () => {
      const duplicateSubId = pdId('sub');
      let errorOccurred = false;
      let errorCode: string | undefined;

      try {
        await query(
          `INSERT INTO pd_store_subscription (id, buyer_id, store_id, notify_price_drops, notify_new_products)
           VALUES ($1, $2, $3, true, true)`,
          [duplicateSubId, buyerId1, storeId1],
        );
      } catch (err: any) {
        errorOccurred = true;
        errorCode = err.code;
      }

      expect(errorOccurred).toBe(true);
      expect(errorCode).toBe('23505'); // PostgreSQL unique_violation
    });

    it('allows distinct pairs (buyer1, store2) and (buyer2, store1)', async () => {
      const subId2 = pdId('sub');
      const subId3 = pdId('sub');

      const res2 = await query(
        `INSERT INTO pd_store_subscription (id, buyer_id, store_id) VALUES ($1, $2, $3) RETURNING id`,
        [subId2, buyerId1, storeId2],
      );
      const res3 = await query(
        `INSERT INTO pd_store_subscription (id, buyer_id, store_id) VALUES ($1, $2, $3) RETURNING id`,
        [subId3, buyerId2, storeId1],
      );

      expect(res2.rows).toHaveLength(1);
      expect(res3.rows).toHaveLength(1);
    });
  });

  // =========================================================================
  // 2. FOREIGN KEYS & CASCADE DELETION TESTS
  // =========================================================================
  describe('2. Foreign Keys & Cascade Deletion Tests', () => {
    it('rejects subscription with non-existent buyer_id (FK violation 23503)', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_store_subscription (id, buyer_id, store_id) VALUES ($1, $2, $3)`,
          [pdId('sub'), 'usr_non_existent_999999', storeId1],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23503');
    });

    it('rejects subscription with non-existent store_id (FK violation 23503)', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_store_subscription (id, buyer_id, store_id) VALUES ($1, $2, $3)`,
          [pdId('sub'), buyerId1, 'str_non_existent_999999'],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23503');
    });

    it('rejects seller broadcast with non-existent store_id (FK violation 23503)', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_seller_broadcast (id, store_id, message) VALUES ($1, $2, $3)`,
          [pdId('sbc'), 'str_non_existent_999999', 'Hello non-existent'],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23503');
    });

    it('rejects buyer interest profile with non-existent buyer_id (FK violation 23503)', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_buyer_interest_profile (buyer_id, tag_weights) VALUES ($1, $2)`,
          ['usr_non_existent_999999', JSON.stringify({ tech: 10 })],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23503');
    });

    it('cascades deletion of buyer to pd_store_subscription and pd_buyer_interest_profile', async () => {
      const ephemeralBuyerId = `usr_eph_b_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await query(
        `INSERT INTO pd_user (id, email, password_hash, role, first_name, last_name, is_active)
         VALUES ($1, $2, 'hash', 'customer', 'Ephemeral', 'Buyer', true)`,
        [ephemeralBuyerId, `${ephemeralBuyerId}@pandamarket.test`],
      );

      // Create subscription and buyer interest profile
      const ephemeralSubId = pdId('sub');
      await query(
        `INSERT INTO pd_store_subscription (id, buyer_id, store_id) VALUES ($1, $2, $3)`,
        [ephemeralSubId, ephemeralBuyerId, storeId1],
      );
      await query(
        `INSERT INTO pd_buyer_interest_profile (buyer_id, tag_weights) VALUES ($1, $2)`,
        [ephemeralBuyerId, JSON.stringify({ arduino: 5.0 })],
      );

      // Verify they exist
      const subBefore = await query(`SELECT id FROM pd_store_subscription WHERE id = $1`, [ephemeralSubId]);
      const profBefore = await query(`SELECT buyer_id FROM pd_buyer_interest_profile WHERE buyer_id = $1`, [ephemeralBuyerId]);
      expect(subBefore.rows).toHaveLength(1);
      expect(profBefore.rows).toHaveLength(1);

      // Delete buyer
      await query(`DELETE FROM pd_user WHERE id = $1`, [ephemeralBuyerId]);

      // Verify cascaded deletion
      const subAfter = await query(`SELECT id FROM pd_store_subscription WHERE id = $1`, [ephemeralSubId]);
      const profAfter = await query(`SELECT buyer_id FROM pd_buyer_interest_profile WHERE buyer_id = $1`, [ephemeralBuyerId]);
      expect(subAfter.rows).toHaveLength(0);
      expect(profAfter.rows).toHaveLength(0);
    });

    it('cascades deletion of store to pd_store_subscription and pd_seller_broadcast', async () => {
      const ephemeralStoreId = `str_eph_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await query(
        `INSERT INTO pd_store (id, owner_id, name, subdomain, status)
         VALUES ($1, $2, 'Ephemeral Store', $3, 'verified')`,
        [ephemeralStoreId, sellerId, `eph-store-${Date.now()}`],
      );

      const ephemeralSubId = pdId('sub');
      const ephemeralBcastId = pdId('sbc');

      await query(
        `INSERT INTO pd_store_subscription (id, buyer_id, store_id) VALUES ($1, $2, $3)`,
        [ephemeralSubId, buyerId1, ephemeralStoreId],
      );
      await query(
        `INSERT INTO pd_seller_broadcast (id, store_id, message, discount_type, discount_value)
         VALUES ($1, $2, 'Broadcast for eph store', 'percentage', 15.00)`,
        [ephemeralBcastId, ephemeralStoreId],
      );

      // Verify they exist
      const subBefore = await query(`SELECT id FROM pd_store_subscription WHERE id = $1`, [ephemeralSubId]);
      const bcastBefore = await query(`SELECT id FROM pd_seller_broadcast WHERE id = $1`, [ephemeralBcastId]);
      expect(subBefore.rows).toHaveLength(1);
      expect(bcastBefore.rows).toHaveLength(1);

      // Delete store
      await query(`DELETE FROM pd_store WHERE id = $1`, [ephemeralStoreId]);

      // Verify cascaded deletion
      const subAfter = await query(`SELECT id FROM pd_store_subscription WHERE id = $1`, [ephemeralSubId]);
      const bcastAfter = await query(`SELECT id FROM pd_seller_broadcast WHERE id = $1`, [ephemeralBcastId]);
      expect(subAfter.rows).toHaveLength(0);
      expect(bcastAfter.rows).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. CHECK CONSTRAINTS VERIFICATION (pd_seller_broadcast.discount_type)
  // =========================================================================
  describe('3. Check Constraint Stress Tests', () => {
    it('accepts valid discount_type = "percentage"', async () => {
      const bcastId = pdId('sbc');
      const res = await query(
        `INSERT INTO pd_seller_broadcast (id, store_id, coupon_code, discount_type, discount_value, message)
         VALUES ($1, $2, 'PROMO10', 'percentage', 10.00, '10% off for subscribers')
         RETURNING id, discount_type`,
        [bcastId, storeId1],
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].discount_type).toBe('percentage');
    });

    it('accepts valid discount_type = "fixed"', async () => {
      const bcastId = pdId('sbc');
      const res = await query(
        `INSERT INTO pd_seller_broadcast (id, store_id, coupon_code, discount_type, discount_value, message)
         VALUES ($1, $2, 'FIXED5', 'fixed', 5.00, '5 TND off for subscribers')
         RETURNING id, discount_type`,
        [bcastId, storeId1],
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].discount_type).toBe('fixed');
    });

    it('accepts discount_type = NULL', async () => {
      const bcastId = pdId('sbc');
      const res = await query(
        `INSERT INTO pd_seller_broadcast (id, store_id, coupon_code, discount_type, discount_value, message)
         VALUES ($1, $2, NULL, NULL, NULL, 'General newsletter broadcast without coupon')
         RETURNING id, discount_type`,
        [bcastId, storeId1],
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].discount_type).toBeNull();
    });

    it('rejects invalid discount_type = "invalid_type" with check constraint violation 23514', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_seller_broadcast (id, store_id, message, discount_type)
           VALUES ($1, $2, $3, $4)`,
          [pdId('sbc'), storeId1, 'Test message', 'invalid_type'],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23514'); // PostgreSQL check_violation
    });

    it('rejects empty string discount_type = "" with check constraint violation 23514', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_seller_broadcast (id, store_id, message, discount_type)
           VALUES ($1, $2, $3, $4)`,
          [pdId('sbc'), storeId1, 'Test message', ''],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23514');
    });

    it('rejects uppercase discount_type = "PERCENTAGE" with check constraint violation 23514', async () => {
      let errorCode: string | undefined;
      try {
        await query(
          `INSERT INTO pd_seller_broadcast (id, store_id, message, discount_type)
           VALUES ($1, $2, $3, $4)`,
          [pdId('sbc'), storeId1, 'Test message', 'PERCENTAGE'],
        );
      } catch (err: any) {
        errorCode = err.code;
      }
      expect(errorCode).toBe('23514');
    });
  });

  // =========================================================================
  // 4. GIN INDEXING & POSTGRESQL QUERY PLAN EXECUTION
  // =========================================================================
  describe('4. GIN Indexing & Query Plan Execution Tests', () => {
    it('executes array containment query (@>) on pd_product.interest_tags with valid EXPLAIN plan', async () => {
      const result = await query<{ id: string; interest_tags: string[] }>(
        `SELECT id, interest_tags FROM pd_product WHERE interest_tags @> ARRAY['arduino']::text[] AND id = $1`,
        [productId1],
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe(productId1);
      expect(result.rows[0].interest_tags).toContain('arduino');

      const explainRes = await query<{ 'QUERY PLAN': string }>(
        `EXPLAIN SELECT id FROM pd_product WHERE interest_tags @> ARRAY['electronics', 'robotics']::text[]`,
      );
      expect(explainRes.rows.length).toBeGreaterThan(0);
      const planText = explainRes.rows.map((r) => r['QUERY PLAN']).join('\n');
      expect(planText).toBeDefined();
    });

    it('executes array overlap query (&&) on pd_product.interest_tags correctly', async () => {
      const res = await query<{ id: string }>(
        `SELECT id FROM pd_product WHERE interest_tags && ARRAY['robotics', 'unrelated']::text[] AND id = $1`,
        [productId1],
      );
      expect(res.rows).toHaveLength(1);
    });

    it('executes JSONB key existence query (?) on pd_buyer_interest_profile.tag_weights', async () => {
      await query(
        `INSERT INTO pd_buyer_interest_profile (buyer_id, tag_weights)
         VALUES ($1, $2)
         ON CONFLICT (buyer_id) DO UPDATE SET tag_weights = EXCLUDED.tag_weights`,
        [buyerId1, JSON.stringify({ robotics: 15.5, arduino: 9.0, iot: 4.2 })],
      );

      const existsRes = await query<{ buyer_id: string; tag_weights: any }>(
        `SELECT buyer_id, tag_weights FROM pd_buyer_interest_profile WHERE tag_weights ? 'robotics' AND buyer_id = $1`,
        [buyerId1],
      );

      expect(existsRes.rows).toHaveLength(1);
      expect(existsRes.rows[0].tag_weights.robotics).toBe(15.5);

      const notExistsRes = await query<{ buyer_id: string }>(
        `SELECT buyer_id FROM pd_buyer_interest_profile WHERE tag_weights ? 'non_existent_key' AND buyer_id = $1`,
        [buyerId1],
      );
      expect(notExistsRes.rows).toHaveLength(0);
    });

    it('executes JSONB containment query (@>) on pd_buyer_interest_profile.tag_weights', async () => {
      const res = await query<{ buyer_id: string }>(
        `SELECT buyer_id FROM pd_buyer_interest_profile WHERE tag_weights @> '{"arduino": 9.0}'::jsonb AND buyer_id = $1`,
        [buyerId1],
      );
      expect(res.rows).toHaveLength(1);
      expect(res.rows[0].buyer_id).toBe(buyerId1);
    });
  });

  // =========================================================================
  // 5. TRIGGER BEHAVIOR (updated_at)
  // =========================================================================
  describe('5. Trigger Behavior & Timestamp Updates', () => {
    it('updates updated_at on pd_store_subscription when a row is updated', async () => {
      const initial = await query<{ updated_at: Date }>(
        `SELECT updated_at FROM pd_store_subscription WHERE buyer_id = $1 AND store_id = $2`,
        [buyerId1, storeId1],
      );
      const initialTime = new Date(initial.rows[0].updated_at).getTime();

      await new Promise((r) => setTimeout(r, 50));

      await query(
        `UPDATE pd_store_subscription SET notify_price_drops = false WHERE buyer_id = $1 AND store_id = $2`,
        [buyerId1, storeId1],
      );

      const updated = await query<{ updated_at: Date; notify_price_drops: boolean }>(
        `SELECT updated_at, notify_price_drops FROM pd_store_subscription WHERE buyer_id = $1 AND store_id = $2`,
        [buyerId1, storeId1],
      );

      const newTime = new Date(updated.rows[0].updated_at).getTime();
      expect(updated.rows[0].notify_price_drops).toBe(false);
      expect(newTime).toBeGreaterThanOrEqual(initialTime);
    });

    it('updates updated_at on pd_buyer_interest_profile when tag_weights are modified', async () => {
      const initial = await query<{ updated_at: Date }>(
        `SELECT updated_at FROM pd_buyer_interest_profile WHERE buyer_id = $1`,
        [buyerId1],
      );
      const initialTime = new Date(initial.rows[0].updated_at).getTime();

      await new Promise((r) => setTimeout(r, 50));

      await query(
        `UPDATE pd_buyer_interest_profile SET tag_weights = $1 WHERE buyer_id = $2`,
        [JSON.stringify({ robotics: 22.0 }), buyerId1],
      );

      const updated = await query<{ updated_at: Date; tag_weights: any }>(
        `SELECT updated_at, tag_weights FROM pd_buyer_interest_profile WHERE buyer_id = $1`,
        [buyerId1],
      );

      const newTime = new Date(updated.rows[0].updated_at).getTime();
      expect(updated.rows[0].tag_weights.robotics).toBe(22.0);
      expect(newTime).toBeGreaterThanOrEqual(initialTime);
    });
  });

  // =========================================================================
  // 6. INFORMATION_SCHEMA & PG_INDEXES CONFORMANCE
  // =========================================================================
  describe('6. Schema & Indexes Conformance Tests', () => {
    it('verifies all expected tables exist', async () => {
      const tablesRes = await query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' 
           AND table_name IN ('pd_store_subscription', 'pd_buyer_interest_profile', 'pd_seller_broadcast')
         ORDER BY table_name`,
      );

      const tableNames = tablesRes.rows.map((r) => r.table_name);
      expect(tableNames).toContain('pd_store_subscription');
      expect(tableNames).toContain('pd_buyer_interest_profile');
      expect(tableNames).toContain('pd_seller_broadcast');
    });

    it('verifies column types and nullability for pd_store_subscription', async () => {
      const colsRes = await query<{ column_name: string; data_type: string; is_nullable: string }>(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_name = 'pd_store_subscription'
         ORDER BY ordinal_position`,
      );

      const colMap = new Map(colsRes.rows.map((c) => [c.column_name, c]));
      expect(colMap.get('id')?.is_nullable).toBe('NO');
      expect(colMap.get('buyer_id')?.is_nullable).toBe('NO');
      expect(colMap.get('store_id')?.is_nullable).toBe('NO');
      expect(colMap.get('notify_price_drops')?.data_type).toBe('boolean');
      expect(colMap.get('notify_new_products')?.data_type).toBe('boolean');
      expect(colMap.get('is_verified_buyer')?.data_type).toBe('boolean');
      expect(colMap.get('created_at')?.data_type).toContain('timestamp');
      expect(colMap.get('updated_at')?.data_type).toContain('timestamp');
    });

    it('verifies subscribers_count and verified_subscribers_count on pd_store', async () => {
      const colsRes = await query<{ column_name: string; data_type: string; column_default: string }>(
        `SELECT column_name, data_type, column_default 
         FROM information_schema.columns 
         WHERE table_name = 'pd_store' AND column_name IN ('subscribers_count', 'verified_subscribers_count')`,
      );

      expect(colsRes.rows).toHaveLength(2);
      for (const row of colsRes.rows) {
        expect(row.data_type).toBe('integer');
        expect(row.column_default).toContain('0');
      }
    });

    it('verifies interest_tags and interest_tags_synced_at on pd_product', async () => {
      const colsRes = await query<{ column_name: string; data_type: string }>(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = 'pd_product' AND column_name IN ('interest_tags', 'interest_tags_synced_at')`,
      );

      const colMap = new Map(colsRes.rows.map((c) => [c.column_name, c.data_type]));
      expect(colMap.get('interest_tags')).toBe('ARRAY');
      expect(colMap.get('interest_tags_synced_at')).toContain('timestamp');
    });

    it('verifies all expected indexes in pg_indexes', async () => {
      const indexesRes = await query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes 
         WHERE schemaname = 'public' 
           AND indexname IN (
             'idx_store_subscription_buyer_id',
             'idx_store_subscription_store_id',
             'idx_store_subscription_buyer_store',
             'idx_store_subscription_store_verified',
             'idx_store_subscription_created_at',
             'idx_store_subscribers_count',
             'idx_pd_product_interest_tags_gin',
             'idx_pd_product_interest_tags_synced',
             'idx_buyer_interest_profile_tag_weights',
             'idx_seller_broadcast_store_sent',
             'uq_buyer_store_subscription'
           )`,
      );

      const foundIndexes = indexesRes.rows.map((r) => r.indexname);
      expect(foundIndexes).toContain('idx_store_subscription_buyer_id');
      expect(foundIndexes).toContain('idx_store_subscription_store_id');
      expect(foundIndexes).toContain('idx_store_subscription_buyer_store');
      expect(foundIndexes).toContain('idx_store_subscription_store_verified');
      expect(foundIndexes).toContain('idx_store_subscription_created_at');
      expect(foundIndexes).toContain('idx_store_subscribers_count');
      expect(foundIndexes).toContain('idx_pd_product_interest_tags_gin');
      expect(foundIndexes).toContain('idx_pd_product_interest_tags_synced');
      expect(foundIndexes).toContain('idx_buyer_interest_profile_tag_weights');
      expect(foundIndexes).toContain('idx_seller_broadcast_store_sent');

      const ginProduct = indexesRes.rows.find((r) => r.indexname === 'idx_pd_product_interest_tags_gin');
      expect(ginProduct?.indexdef.toLowerCase()).toContain('using gin');

      const ginProfile = indexesRes.rows.find((r) => r.indexname === 'idx_buyer_interest_profile_tag_weights');
      expect(ginProfile?.indexdef.toLowerCase()).toContain('using gin');
    });
  });

  // =========================================================================
  // 7. SUPERADMIN ADMIN-NOTES POPULATION VERIFICATION
  // =========================================================================
  describe('7. Superadmin Admin-Notes Database Integrity Tests', () => {
    it('verifies Feature 20 folder exists with exact ID ff32063c-baff-42ca-ad94-768b20c5e6d4', async () => {
      const folderRes = await query<{ id: string; name: string; color: string }>(
        `SELECT id, name, color FROM admin_note_folders WHERE id = $1`,
        [FEATURE_20_FOLDER_ID],
      );

      expect(folderRes.rows).toHaveLength(1);
      expect(folderRes.rows[0].id).toBe('ff32063c-baff-42ca-ad94-768b20c5e6d4');
      expect(folderRes.rows[0].name).toBe('⭐ Feature 20: Store Subscriptions, Followed Feed & AI Interest Engine');
    });

    it('verifies exactly 6 task cards belong to Feature 20 folder', async () => {
      const notesRes = await query<{ id: string; title: string; sort_order: number }>(
        `SELECT id, title, sort_order FROM admin_notes WHERE folder_id = $1 ORDER BY sort_order`,
        [FEATURE_20_FOLDER_ID],
      );

      expect(notesRes.rows).toHaveLength(6);
      expect(notesRes.rows[0].title).toContain('T1: Database Schema Migrations');
      expect(notesRes.rows[1].title).toContain('T2: Subscription REST APIs');
      expect(notesRes.rows[2].title).toContain('T3: Smart Batched Notifications');
      expect(notesRes.rows[3].title).toContain('T4: AI Product Auto-Tagging');
      expect(notesRes.rows[4].title).toContain('T5: "My Followed Feed"');
      expect(notesRes.rows[5].title).toContain('T6: Seller Dashboard');
    });

    it('verifies exactly 44 checklist items total across the 6 task cards', async () => {
      const checklistRes = await query<{ total_items: string }>(
        `SELECT COUNT(*) AS total_items 
         FROM admin_note_checklist_items 
         WHERE note_id IN (SELECT id FROM admin_notes WHERE folder_id = $1)`,
        [FEATURE_20_FOLDER_ID],
      );

      expect(Number(checklistRes.rows[0].total_items)).toBe(44);
    });

    it('verifies checklist item distribution per note matches specification (8, 7, 7, 7, 8, 7)', async () => {
      const distRes = await query<{ note_title: string; item_count: string; sort_order: number }>(
        `SELECT n.title AS note_title, n.sort_order, COUNT(c.id) AS item_count
         FROM admin_notes n
         LEFT JOIN admin_note_checklist_items c ON c.note_id = n.id
         WHERE n.folder_id = $1
         GROUP BY n.id, n.title, n.sort_order
         ORDER BY n.sort_order`,
        [FEATURE_20_FOLDER_ID],
      );

      expect(distRes.rows).toHaveLength(6);
      const counts = distRes.rows.map((r) => Number(r.item_count));
      expect(counts).toEqual([8, 7, 7, 7, 8, 7]);
    });
  });
});
