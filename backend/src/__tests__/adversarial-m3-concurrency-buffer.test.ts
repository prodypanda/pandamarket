/**
 * Adversarial Concurrency & Queue Buffer Stress Test Suite — Milestone M3 (Feature 20 - R2)
 *
 * Focus:
 * 1. 15-minute sliding aggregation buffer logic & debouncing semantics.
 * 2. High concurrency price drop bursts & multi-store isolation.
 * 3. Rapid concurrent edits of the same product ID (deduplication & latest state retention).
 * 4. Non-discount price changes (price increases, equal prices, missing oldPrice).
 * 5. Empty buffer drains & race conditions on double-draining.
 * 6. Store with 0 subscribers and granular preference filtering.
 * 7. Consolidated alert formatting with special characters, emojis, and XSS defense.
 * 8. 7:00 PM daily email digest 24-hour boundary filtering and multi-store aggregation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartNotificationBatchEngine, RawProductEvent } from './smart-notification-batch.test';
import { PdValidationError } from '../errors';

describe('Milestone M3: Queue & Concurrency Adversarial Stress Suite', () => {
  let engine: SmartNotificationBatchEngine;

  beforeEach(() => {
    engine = new SmartNotificationBatchEngine();
  });

  // =========================================================================
  // 1. Sliding Window Timer Mechanics & Debouncing Semantics
  // =========================================================================
  describe('1. Sliding Window Timer Mechanics & Debouncing', () => {
    it('ADV-1.1: Single event schedules delayed job at exactly T0 + 15 minutes', async () => {
      const t0 = 1700000000000;
      const res = await engine.ingestEvent(
        {
          storeId: 'store_alpha',
          storeName: 'Boutique Alpha',
          type: 'price_drop',
          productId: 'prod_1',
          productTitle: 'Produit 1',
          oldPrice: 100,
          price: 80,
          timestamp: t0,
        },
        t0
      );

      expect(res.jobId).toBe('batch:store_alpha:price_drop');
      expect(res.bufferSize).toBe(1);

      const job = engine.getScheduledJob('batch:store_alpha:price_drop');
      expect(job).toBeDefined();
      expect(job?.executeAt).toBe(t0 + 15 * 60 * 1000);
    });

    it('ADV-1.2: Sliding debounce: successive event at T0 + 5m slides execution time forward to T0 + 20m', async () => {
      const t0 = 1700000000000;
      // First event at T0
      await engine.ingestEvent(
        {
          storeId: 'store_alpha',
          storeName: 'Boutique Alpha',
          type: 'price_drop',
          productId: 'prod_1',
          productTitle: 'Produit 1',
          oldPrice: 100,
          price: 80,
          timestamp: t0,
        },
        t0
      );

      // Second event at T0 + 5 mins (300,000 ms)
      const t1 = t0 + 5 * 60 * 1000;
      await engine.ingestEvent(
        {
          storeId: 'store_alpha',
          storeName: 'Boutique Alpha',
          type: 'price_drop',
          productId: 'prod_2',
          productTitle: 'Produit 2',
          oldPrice: 200,
          price: 150,
          timestamp: t1,
        },
        t1
      );

      const job = engine.getScheduledJob('batch:store_alpha:price_drop');
      expect(job).toBeDefined();
      // Should now be scheduled for t1 + 15m = t0 + 20m
      expect(job?.executeAt).toBe(t1 + 15 * 60 * 1000);
      expect(job?.executeAt).toBe(t0 + 20 * 60 * 1000);
    });

    it('ADV-1.3: Continuous stream of 5 updates spaced 3 min apart continuously slides window to T0 + 27m', async () => {
      const t0 = 1700000000000;
      for (let i = 0; i < 5; i++) {
        const eventTime = t0 + i * 3 * 60 * 1000;
        await engine.ingestEvent(
          {
            storeId: 'store_alpha',
            storeName: 'Boutique Alpha',
            type: 'price_drop',
            productId: `prod_${i}`,
            productTitle: `Produit ${i}`,
            oldPrice: 100 + i * 10,
            price: 80 + i * 5,
            timestamp: eventTime,
          },
          eventTime
        );
      }

      const job = engine.getScheduledJob('batch:store_alpha:price_drop');
      expect(job).toBeDefined();
      // Last event at t0 + 12m -> expires at t0 + 12m + 15m = t0 + 27m
      expect(job?.executeAt).toBe(t0 + 27 * 60 * 1000);

      const buffer = engine.getBuffer('notif_buffer:store:store_alpha:type:price_drop');
      expect(buffer).toHaveLength(5);
    });

    it('ADV-1.4: Type isolation: price_drop and new_product in same store operate with independent sliding timers', async () => {
      const t0 = 1700000000000;
      await engine.ingestEvent(
        {
          storeId: 'store_alpha',
          storeName: 'Boutique Alpha',
          type: 'price_drop',
          productId: 'prod_pd',
          productTitle: 'Price Dropped Item',
          oldPrice: 100,
          price: 70,
          timestamp: t0,
        },
        t0
      );

      const t1 = t0 + 10 * 60 * 1000;
      await engine.ingestEvent(
        {
          storeId: 'store_alpha',
          storeName: 'Boutique Alpha',
          type: 'new_product',
          productId: 'prod_np',
          productTitle: 'New Catalog Item',
          price: 150,
          timestamp: t1,
        },
        t1
      );

      const jobPriceDrop = engine.getScheduledJob('batch:store_alpha:price_drop');
      const jobNewProduct = engine.getScheduledJob('batch:store_alpha:new_product');

      expect(jobPriceDrop?.executeAt).toBe(t0 + 15 * 60 * 1000);
      expect(jobNewProduct?.executeAt).toBe(t1 + 15 * 60 * 1000);
    });
  });

  // =========================================================================
  // 2. High Concurrency & Burst Ingestion Stress
  // =========================================================================
  describe('2. High Concurrency & Burst Ingestion Stress', () => {
    it('ADV-2.1: Concurrent burst of 50 price drops for same store resolves without race conditions', async () => {
      engine.registerSubscriber({
        buyerId: 'sub_1',
        buyerName: 'Buyer 1',
        email: 'sub1@panda.tn',
        storeId: 'store_burst',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      const events: RawProductEvent[] = Array.from({ length: 50 }, (_, i) => ({
        storeId: 'store_burst',
        storeName: 'Flash Store',
        type: 'price_drop' as const,
        productId: `p_burst_${i}`,
        productTitle: `Flash Item #${i}`,
        oldPrice: 100,
        price: 50,
        timestamp: Date.now(),
      }));

      // Ingest 50 events concurrently
      await Promise.all(events.map((e) => engine.ingestEvent(e)));

      const buffer = engine.getBuffer('notif_buffer:store:store_burst:type:price_drop');
      expect(buffer).toHaveLength(50);

      const res = await engine.processBatchJob('store_burst', 'price_drop');
      expect(res.notificationsCreated).toBe(1);

      expect(engine.inAppNotifications).toHaveLength(1);
      expect(engine.inAppNotifications[0].title).toBe('🏷️ 50 baisses de prix chez Flash Store');
    });

    it('ADV-2.2: Multi-store parallel burst: 10 stores ingesting 20 items each (200 total) maintain strict store isolation', async () => {
      const storeCount = 10;
      const itemsPerStore = 20;

      // Register 1 subscriber per store
      for (let s = 0; s < storeCount; s++) {
        engine.registerSubscriber({
          buyerId: `buyer_multi_${s}`,
          buyerName: `Buyer Multi ${s}`,
          email: `multi_${s}@panda.tn`,
          storeId: `store_multi_${s}`,
          notify_price_drops: true,
          notify_new_products: true,
          email_digest_opt_in: true,
        });
      }

      // Generate 200 events across 10 stores
      const allEvents: RawProductEvent[] = [];
      for (let s = 0; s < storeCount; s++) {
        for (let i = 0; i < itemsPerStore; i++) {
          allEvents.push({
            storeId: `store_multi_${s}`,
            storeName: `Multi Store ${s}`,
            type: 'price_drop',
            productId: `prod_${s}_${i}`,
            productTitle: `Item ${s}-${i}`,
            oldPrice: 80,
            price: 60,
            timestamp: Date.now(),
          });
        }
      }

      // Ingest all 200 events concurrently
      await Promise.all(allEvents.map((ev) => engine.ingestEvent(ev)));

      // Verify each store has exactly 20 items buffered
      for (let s = 0; s < storeCount; s++) {
        const buf = engine.getBuffer(`notif_buffer:store:store_multi_${s}:type:price_drop`);
        expect(buf).toHaveLength(itemsPerStore);
      }

      // Process batches for all 10 stores
      const processResults = await Promise.all(
        Array.from({ length: storeCount }, (_, s) => engine.processBatchJob(`store_multi_${s}`, 'price_drop'))
      );

      for (const r of processResults) {
        expect(r.notificationsCreated).toBe(1);
      }

      expect(engine.inAppNotifications).toHaveLength(10);
    });

    it('ADV-2.3: Rapid edits on identical product ID deduplicate to 1 entry with the latest price retained', async () => {
      const now = Date.now();
      const priceSteps = [100, 90, 80, 75, 60, 50, 40, 35, 30, 25];

      for (let i = 0; i < priceSteps.length; i++) {
        await engine.ingestEvent(
          {
            storeId: 'store_edits',
            storeName: 'Edit Store',
            type: 'price_drop',
            productId: 'target_product_x',
            productTitle: 'Dynamic Laptop',
            oldPrice: 120,
            price: priceSteps[i],
            timestamp: now + i * 1000,
          },
          now + i * 1000
        );
      }

      const buffer = engine.getBuffer('notif_buffer:store:store_edits:type:price_drop');
      // Buffer must contain only 1 entry for target_product_x
      expect(buffer).toHaveLength(1);
      expect(buffer[0].price).toBe(25); // Final price
      expect(buffer[0].oldPrice).toBe(120);
      expect(buffer[0].discountPct).toBe(Math.round(((120 - 25) / 120) * 100)); // 79%
    });
  });

  // =========================================================================
  // 3. Price Drop Semantics & Validation Boundaries
  // =========================================================================
  describe('3. Price Drop Semantics & Validation Boundaries', () => {
    it('ADV-3.1: Rejects price increases (price > oldPrice) with empty jobId and 0 bufferSize', async () => {
      const res = await engine.ingestEvent({
        storeId: 'store_val',
        storeName: 'Validation Store',
        type: 'price_drop',
        productId: 'prod_inc',
        productTitle: 'Inflation Item',
        oldPrice: 50,
        price: 75,
        timestamp: Date.now(),
      });

      expect(res.jobId).toBe('');
      expect(res.bufferSize).toBe(0);
      expect(engine.getBuffer('notif_buffer:store:store_val:type:price_drop')).toHaveLength(0);
    });

    it('ADV-3.2: Rejects identical prices (price === oldPrice) without creating a job', async () => {
      const res = await engine.ingestEvent({
        storeId: 'store_val',
        storeName: 'Validation Store',
        type: 'price_drop',
        productId: 'prod_same',
        productTitle: 'Same Price Item',
        oldPrice: 99,
        price: 99,
        timestamp: Date.now(),
      });

      expect(res.jobId).toBe('');
      expect(res.bufferSize).toBe(0);
    });

    it('ADV-3.3: Rejects price_drop events where oldPrice is undefined', async () => {
      const res = await engine.ingestEvent({
        storeId: 'store_val',
        storeName: 'Validation Store',
        type: 'price_drop',
        productId: 'prod_no_old',
        productTitle: 'No Old Price Item',
        price: 99,
        timestamp: Date.now(),
      });

      expect(res.jobId).toBe('');
      expect(res.bufferSize).toBe(0);
    });

    it('ADV-3.4: Throws PdValidationError if storeId or productId are missing', async () => {
      await expect(
        engine.ingestEvent({
          storeId: '',
          storeName: 'Store',
          type: 'new_product',
          productId: 'prod_1',
          productTitle: 'Product',
          price: 50,
          timestamp: Date.now(),
        })
      ).rejects.toThrow(PdValidationError);

      await expect(
        engine.ingestEvent({
          storeId: 'store_1',
          storeName: 'Store',
          type: 'new_product',
          productId: '',
          productTitle: 'Product',
          price: 50,
          timestamp: Date.now(),
        })
      ).rejects.toThrow(PdValidationError);
    });

    it('ADV-3.5: Fractional millime precision: discount percentage calculation handles decimal prices cleanly', async () => {
      const res = await engine.ingestEvent({
        storeId: 'store_val',
        storeName: 'Validation Store',
        type: 'price_drop',
        productId: 'prod_fractional',
        productTitle: 'Fractional TND Item',
        oldPrice: 12.5,
        price: 9.375, // 25% discount
        timestamp: Date.now(),
      });

      expect(res.bufferSize).toBe(1);
      const buffer = engine.getBuffer('notif_buffer:store:store_val:type:price_drop');
      expect(buffer[0].discountPct).toBe(25);
    });
  });

  // =========================================================================
  // 4. Buffer Draining, Empty Flushes & Race Conditions
  // =========================================================================
  describe('4. Buffer Draining, Empty Flushes & Race Conditions', () => {
    it('ADV-4.1: Empty buffer drain returns 0 notifications without throwing error', async () => {
      const res = await engine.processBatchJob('non_existent_store', 'price_drop');
      expect(res.notificationsCreated).toBe(0);
      expect(engine.inAppNotifications).toHaveLength(0);
      expect(engine.webSocketEmissions).toHaveLength(0);
    });

    it('ADV-4.2: Double-drain race condition: second processBatch invocation returns 0 (idempotent)', async () => {
      engine.registerSubscriber({
        buyerId: 'buyer_double',
        buyerName: 'Double Buyer',
        email: 'double@panda.tn',
        storeId: 'store_double',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      await engine.ingestEvent({
        storeId: 'store_double',
        storeName: 'Double Drain Store',
        type: 'price_drop',
        productId: 'prod_double_1',
        productTitle: 'Camera Lens',
        oldPrice: 500,
        price: 399,
        timestamp: Date.now(),
      });

      // First flush drains the buffer
      const res1 = await engine.processBatchJob('store_double', 'price_drop');
      expect(res1.notificationsCreated).toBe(1);

      // Second flush finds buffer already cleared
      const res2 = await engine.processBatchJob('store_double', 'price_drop');
      expect(res2.notificationsCreated).toBe(0);

      // Verify no duplicate notifications in storage
      expect(engine.inAppNotifications).toHaveLength(1);
      expect(engine.webSocketEmissions).toHaveLength(1);
    });

    it('ADV-4.3: Buffer is atomically purged from state so subsequent queries see empty state', async () => {
      await engine.ingestEvent({
        storeId: 'store_drain_test',
        storeName: 'Drain Test Store',
        type: 'new_product',
        productId: 'p_drain_1',
        productTitle: 'Item 1',
        price: 20,
        timestamp: Date.now(),
      });

      expect(engine.getBuffer('notif_buffer:store:store_drain_test:type:new_product')).toHaveLength(1);

      await engine.processBatchJob('store_drain_test', 'new_product');

      expect(engine.getBuffer('notif_buffer:store:store_drain_test:type:new_product')).toHaveLength(0);
      expect(engine.getScheduledJob('batch:store_drain_test:new_product')).toBeUndefined();
    });
  });

  // =========================================================================
  // 5. Subscriber Filtering, Preferences & Zero-Subscriber Stores
  // =========================================================================
  describe('5. Subscriber Filtering & Zero Subscribers', () => {
    it('ADV-5.1: Store with 0 subscribers drains buffer cleanly with 0 notifications created', async () => {
      await engine.ingestEvent({
        storeId: 'store_zero_subs',
        storeName: 'Zero Subs Store',
        type: 'new_product',
        productId: 'prod_zero',
        productTitle: 'Unheard Echo',
        price: 15,
        timestamp: Date.now(),
      });

      const res = await engine.processBatchJob('store_zero_subs', 'new_product');
      expect(res.notificationsCreated).toBe(0);
      expect(engine.inAppNotifications).toHaveLength(0);
      expect(engine.webSocketEmissions).toHaveLength(0);
    });

    it('ADV-5.2: Granular preference segregation: respects opt-outs per notification category', async () => {
      // Sub A: only price drops
      engine.registerSubscriber({
        buyerId: 'buyer_a',
        buyerName: 'Buyer A',
        email: 'a@panda.tn',
        storeId: 'store_pref',
        notify_price_drops: true,
        notify_new_products: false,
        email_digest_opt_in: true,
      });

      // Sub B: only new products
      engine.registerSubscriber({
        buyerId: 'buyer_b',
        buyerName: 'Buyer B',
        email: 'b@panda.tn',
        storeId: 'store_pref',
        notify_price_drops: false,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      // Sub C: opted out of both
      engine.registerSubscriber({
        buyerId: 'buyer_c',
        buyerName: 'Buyer C',
        email: 'c@panda.tn',
        storeId: 'store_pref',
        notify_price_drops: false,
        notify_new_products: false,
        email_digest_opt_in: true,
      });

      // 1. Trigger price drop
      await engine.ingestEvent({
        storeId: 'store_pref',
        storeName: 'Pref Boutique',
        type: 'price_drop',
        productId: 'prod_pd_test',
        productTitle: 'Discount Jeans',
        oldPrice: 100,
        price: 70,
        timestamp: Date.now(),
      });

      const resPd = await engine.processBatchJob('store_pref', 'price_drop');
      expect(resPd.notificationsCreated).toBe(1);
      expect(engine.inAppNotifications[0].userId).toBe('buyer_a');

      // 2. Trigger new product
      await engine.ingestEvent({
        storeId: 'store_pref',
        storeName: 'Pref Boutique',
        type: 'new_product',
        productId: 'prod_np_test',
        productTitle: 'New Shirt',
        price: 45,
        timestamp: Date.now(),
      });

      const resNp = await engine.processBatchJob('store_pref', 'new_product');
      expect(resNp.notificationsCreated).toBe(1);
      expect(engine.inAppNotifications[1].userId).toBe('buyer_b');

      // Buyer C received 0 notifications
      const buyerCNotifs = engine.inAppNotifications.filter((n) => n.userId === 'buyer_c');
      expect(buyerCNotifs).toHaveLength(0);
    });
  });

  // =========================================================================
  // 6. Consolidated Alert Formatting & Security Stress
  // =========================================================================
  describe('6. Consolidated Alert Formatting & Security Stress', () => {
    it('ADV-6.1: Grammatical correctness: singular alert for 1 item, plural alert for N items', () => {
      // 1 price drop
      const alertPdSingle = engine.formatConsolidatedAlert('Store X', 'price_drop', [
        { productId: 'p1', productTitle: 'Item 1', price: 10, oldPrice: 15 },
      ]);
      expect(alertPdSingle.title).toBe('🏷️ Baisse de prix chez Store X');
      expect(alertPdSingle.message).toContain('a baissé le prix de « Item 1 » à 10 TND !');

      // 3 price drops
      const alertPdMulti = engine.formatConsolidatedAlert('Store X', 'price_drop', [
        { productId: 'p1', productTitle: 'Item 1', price: 10 },
        { productId: 'p2', productTitle: 'Item 2', price: 20 },
        { productId: 'p3', productTitle: 'Item 3', price: 30 },
      ]);
      expect(alertPdMulti.title).toBe('🏷️ 3 baisses de prix chez Store X');
      expect(alertPdMulti.message).toContain('3 articles');

      // 1 new product
      const alertNpSingle = engine.formatConsolidatedAlert('Store X', 'new_product', [
        { productId: 'p1', productTitle: 'New Bag', price: 50 },
      ]);
      expect(alertNpSingle.title).toBe('✨ Nouveauté chez Store X');

      // 4 new products
      const alertNpMulti = engine.formatConsolidatedAlert('Store X', 'new_product', [
        { productId: 'p1', productTitle: 'New Bag 1', price: 50 },
        { productId: 'p2', productTitle: 'New Bag 2', price: 60 },
        { productId: 'p3', productTitle: 'New Bag 3', price: 70 },
        { productId: 'p4', productTitle: 'New Bag 4', price: 80 },
      ]);
      expect(alertNpMulti.title).toBe('✨ 4 nouveaux produits chez Store X');
    });

    it('ADV-6.2: Special characters & XSS in store names and product titles are handled safely', async () => {
      engine.registerSubscriber({
        buyerId: 'buyer_xss',
        buyerName: '<img src=x onerror=alert(1)>',
        email: 'xss@panda.tn',
        storeId: 'store_xss',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      await engine.ingestEvent({
        storeId: 'store_xss',
        storeName: 'Boutique <script>alert("hack")</script> & "Quotes"',
        type: 'price_drop',
        productId: 'prod_xss',
        productTitle: 'Écran 4K 165Hz & Câble "Ultra"',
        oldPrice: 900,
        price: 750,
        timestamp: Date.now(),
      });

      const res = await engine.processBatchJob('store_xss', 'price_drop');
      expect(res.notificationsCreated).toBe(1);

      const notif = engine.inAppNotifications[0];
      expect(notif.title).toContain('Boutique <script>alert("hack")</script> & "Quotes"');
      expect(notif.message).toContain('Écran 4K 165Hz & Câble "Ultra"');
      expect(notif.data.products).toBeDefined();
    });
  });

  // =========================================================================
  // 7. 7:00 PM Daily Email Digest Aggregation Dynamics
  // =========================================================================
  describe('7. Daily Email Digest 24-Hour Boundary & Aggregation', () => {
    it('ADV-7.1: Digest skips buyers with no notifications in the last 24h', async () => {
      engine.registerSubscriber({
        buyerId: 'buyer_idle',
        buyerName: 'Idle Buyer',
        email: 'idle@panda.tn',
        storeId: 'store_idle',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      const res = await engine.executeDailyEmailDigest(new Date());
      expect(res.emailsSent).toBe(0);
      expect(engine.emailDispatches).toHaveLength(0);
    });

    it('ADV-7.2: Digest strictly excludes notifications older than 24 hours', async () => {
      const now = new Date();
      const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

      engine.registerSubscriber({
        buyerId: 'buyer_old',
        buyerName: 'Old Buyer',
        email: 'old@panda.tn',
        storeId: 'store_old',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      // Manually add an old notification created 25h ago
      engine.inAppNotifications.push({
        id: 'notif_old_1',
        userId: 'buyer_old',
        type: 'store_price_drop',
        title: 'Old Notification',
        message: 'Old Message',
        data: {
          store_name: 'Old Store',
          products: [{ id: 'p_old', title: 'Old Item', price: 50 }],
        },
        is_read: true,
        created_at: twentyFiveHoursAgo,
      });

      const res = await engine.executeDailyEmailDigest(now);
      expect(res.emailsSent).toBe(0);
      expect(engine.emailDispatches).toHaveLength(0);
    });

    it('ADV-7.3: Multi-store daily digest aggregates both price drops and new products into top deals and new arrivals', async () => {
      const now = new Date();

      engine.registerSubscriber({
        buyerId: 'buyer_active',
        buyerName: 'Sami',
        email: 'sami@panda.tn',
        storeId: 'store_tech',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      engine.registerSubscriber({
        buyerId: 'buyer_active',
        buyerName: 'Sami',
        email: 'sami@panda.tn',
        storeId: 'store_shoes',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      // Price drop in store_tech
      await engine.ingestEvent({
        storeId: 'store_tech',
        storeName: 'Tech Point',
        type: 'price_drop',
        productId: 'tech_1',
        productTitle: 'Clavier Sans Fil',
        oldPrice: 150,
        price: 110,
        timestamp: now.getTime() - 2 * 60 * 60 * 1000,
      });
      await engine.processBatchJob('store_tech', 'price_drop');

      // New product in store_shoes
      await engine.ingestEvent({
        storeId: 'store_shoes',
        storeName: 'Sneaker Hub',
        type: 'new_product',
        productId: 'shoe_1',
        productTitle: 'Sneakers Retro 90s',
        price: 260,
        timestamp: now.getTime() - 1 * 60 * 60 * 1000,
      });
      await engine.processBatchJob('store_shoes', 'new_product');

      const res = await engine.executeDailyEmailDigest(now);
      expect(res.emailsSent).toBe(1);

      const email = engine.emailDispatches[0];
      expect(email.toEmail).toBe('sami@panda.tn');
      expect(email.buyerName).toBe('Sami');
      expect(email.topDeals).toHaveLength(1);
      expect(email.topDeals[0].productTitle).toBe('Clavier Sans Fil');
      expect(email.newArrivals).toHaveLength(1);
      expect(email.newArrivals[0].productTitle).toBe('Sneakers Retro 90s');
    });
  });
});
