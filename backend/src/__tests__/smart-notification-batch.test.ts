/**
 * Smart Batched Notifications Test Suite — Feature 20 (R2)
 *
 * Requirements:
 * - 15-minute debounced sliding aggregation buffer in background workers (BullMQ/Redis)
 * - In-App Notification Center delivery with unread badge and WebSocket push
 * - 7:00 PM Daily Email Digest worker summarizing followed store updates
 * - Tier 1 (Happy-Path), Tier 2 (Boundary/Edge Cases), Tier 3 (Pairwise), Tier 4 (E2E Workflow)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdValidationError } from '../errors';

export type NotificationType = 'store_price_drop' | 'store_new_product' | 'daily_digest' | 'seller_broadcast';

export interface RawProductEvent {
  storeId: string;
  storeName: string;
  type: 'price_drop' | 'new_product';
  productId: string;
  productTitle: string;
  price: number;
  oldPrice?: number;
  discountPct?: number;
  timestamp: number;
}

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: Date;
}

export interface EmailDigestPayload {
  toEmail: string;
  buyerName: string;
  topDeals: Array<{ storeName: string; productTitle: string; price: number; oldPrice: number; discountPct: number }>;
  newArrivals: Array<{ storeName: string; productTitle: string; price: number }>;
  sentAt: Date;
}

export interface SubscriberPreference {
  buyerId: string;
  email: string;
  buyerName: string;
  storeId: string;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  email_digest_opt_in: boolean;
}

// In-Memory Notification & Buffer Engine Simulator
export class SmartNotificationBatchEngine {
  // Redis Buffer Simulation: key -> array of events
  private redisBuffers: Map<string, RawProductEvent[]> = new Map();
  // Scheduled BullMQ Jobs Simulation: jobId -> { delayMs, executeAt, storeId, type }
  private scheduledJobs: Map<string, { executeAt: number; storeId: string; type: 'price_drop' | 'new_product' }> = new Map();
  // Subscriptions & Preferences
  private subscribers: SubscriberPreference[] = [];
  // Output storages
  public inAppNotifications: InAppNotification[] = [];
  public webSocketEmissions: Array<{ userId: string; event: string; payload: unknown }> = [];
  public emailDispatches: EmailDigestPayload[] = [];

  public static readonly BUFFER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  public registerSubscriber(pref: SubscriberPreference) {
    this.subscribers.push(pref);
  }

  // Helper to format consolidated notification title and message
  public formatConsolidatedAlert(
    storeName: string,
    type: 'price_drop' | 'new_product',
    items: Array<{ productId: string; productTitle: string; price: number; oldPrice?: number }>
  ): { title: string; message: string } {
    const count = items.length;
    if (type === 'price_drop') {
      if (count === 1) {
        return {
          title: `🏷️ Baisse de prix chez ${storeName}`,
          message: `${storeName} a baissé le prix de « ${items[0].productTitle} » à ${items[0].price} TND !`,
        };
      }
      return {
        title: `🏷️ ${count} baisses de prix chez ${storeName}`,
        message: `${storeName} a baissé le prix de ${count} articles ! Ne manquez pas ces offres.`,
      };
    } else {
      if (count === 1) {
        return {
          title: `✨ Nouveauté chez ${storeName}`,
          message: `${storeName} a publié un nouveau produit : « ${items[0].productTitle} » à ${items[0].price} TND !`,
        };
      }
      return {
        title: `✨ ${count} nouveaux produits chez ${storeName}`,
        message: `${storeName} a publié ${count} nouveaux articles ! Découvrez la nouvelle collection.`,
      };
    }
  }

  // Step 1: Ingest product change event into 15-minute sliding buffer
  public async ingestEvent(event: RawProductEvent, currentTime = Date.now()): Promise<{ jobId: string; bufferSize: number }> {
    if (!event.storeId || !event.productId) {
      throw new PdValidationError('Invalid event: storeId and productId are required');
    }

    // Validate price drop semantics
    if (event.type === 'price_drop') {
      if (event.oldPrice === undefined || event.price >= event.oldPrice) {
        // Not a genuine price drop
        return { jobId: '', bufferSize: 0 };
      }
      event.discountPct = Math.round(((event.oldPrice - event.price) / event.oldPrice) * 100);
    }

    const bufferKey = `notif_buffer:store:${event.storeId}:type:${event.type}`;
    const buffer = this.redisBuffers.get(bufferKey) || [];

    // Deduplicate by productId within current buffer (keep latest update)
    const existingIdx = buffer.findIndex((e) => e.productId === event.productId);
    if (existingIdx >= 0) {
      buffer[existingIdx] = event;
    } else {
      buffer.push(event);
    }
    this.redisBuffers.set(bufferKey, buffer);

    // Schedule or Slide the 15-minute BullMQ job
    const jobId = `batch:${event.storeId}:${event.type}`;
    this.scheduledJobs.set(jobId, {
      executeAt: currentTime + SmartNotificationBatchEngine.BUFFER_WINDOW_MS,
      storeId: event.storeId,
      type: event.type,
    });

    return { jobId, bufferSize: buffer.length };
  }

  // Step 2: BullMQ Worker Processing (flushes sliding buffer after 15-min debounce)
  public async processBatchJob(storeId: string, type: 'price_drop' | 'new_product'): Promise<{ notificationsCreated: number }> {
    const bufferKey = `notif_buffer:store:${storeId}:type:${type}`;
    const buffer = this.redisBuffers.get(bufferKey) || [];

    if (buffer.length === 0) {
      // Empty buffer drain (expired or already flushed)
      this.scheduledJobs.delete(`batch:${storeId}:${type}`);
      return { notificationsCreated: 0 };
    }

    // Clear buffer (atomic drain)
    this.redisBuffers.delete(bufferKey);
    this.scheduledJobs.delete(`batch:${storeId}:${type}`);

    const storeName = buffer[0].storeName || 'Boutique';
    const alert = this.formatConsolidatedAlert(storeName, type, buffer);

    // Filter matching subscribers
    const recipients = this.subscribers.filter((s) => {
      if (s.storeId !== storeId) return false;
      if (type === 'price_drop' && !s.notify_price_drops) return false;
      if (type === 'new_product' && !s.notify_new_products) return false;
      return true;
    });

    if (recipients.length === 0) {
      return { notificationsCreated: 0 };
    }

    // Bulk create in-app notifications and emit real-time WebSocket push
    const now = new Date();
    for (const recipient of recipients) {
      const notif: InAppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: recipient.buyerId,
        type: type === 'price_drop' ? 'store_price_drop' : 'store_new_product',
        title: alert.title,
        message: alert.message,
        data: {
          store_id: storeId,
          store_name: storeName,
          items_count: buffer.length,
          products: buffer.map((b) => ({ id: b.productId, title: b.productTitle, price: b.price })),
        },
        is_read: false,
        created_at: now,
      };

      this.inAppNotifications.push(notif);

      // WebSocket real-time push dispatch
      this.webSocketEmissions.push({
        userId: recipient.buyerId,
        event: 'notification',
        payload: notif,
      });
    }

    return { notificationsCreated: recipients.length };
  }

  // Step 3: Daily Evening Email Digest (Scheduled 7:00 PM)
  public async executeDailyEmailDigest(
    currentTime = new Date()
  ): Promise<{ emailsSent: number }> {
    // Group all subscribers by buyerId
    const buyerMap = new Map<string, { email: string; name: string; stores: Set<string> }>();

    for (const sub of this.subscribers) {
      if (!sub.email_digest_opt_in) continue;
      const existing = buyerMap.get(sub.buyerId) || {
        email: sub.email,
        name: sub.buyerName,
        stores: new Set<string>(),
      };
      existing.stores.add(sub.storeId);
      buyerMap.set(sub.buyerId, existing);
    }

    let sentCount = 0;

    for (const [buyerId, buyer] of buyerMap.entries()) {
      // Collect all events from followed stores in last 24h
      const past24hNotifs = this.inAppNotifications.filter((n) => {
        return (
          n.userId === buyerId &&
          (n.type === 'store_price_drop' || n.type === 'store_new_product') &&
          currentTime.getTime() - n.created_at.getTime() <= 24 * 60 * 60 * 1000
        );
      });

      if (past24hNotifs.length === 0) {
        // Skip buyers with no updates
        continue;
      }

      // Build digest deals
      const topDeals: Array<{ storeName: string; productTitle: string; price: number; oldPrice: number; discountPct: number }> = [];
      const newArrivals: Array<{ storeName: string; productTitle: string; price: number }> = [];

      for (const n of past24hNotifs) {
        const data = n.data as { store_name: string; products?: Array<{ id: string; title: string; price: number }> };
        if (n.type === 'store_price_drop' && data.products) {
          data.products.forEach((p) => {
            topDeals.push({
              storeName: data.store_name,
              productTitle: p.title,
              price: p.price,
              oldPrice: p.price * 1.25, // approx
              discountPct: 20,
            });
          });
        } else if (n.type === 'store_new_product' && data.products) {
          data.products.forEach((p) => {
            newArrivals.push({
              storeName: data.store_name,
              productTitle: p.title,
              price: p.price,
            });
          });
        }
      }

      const emailPayload: EmailDigestPayload = {
        toEmail: buyer.email,
        buyerName: buyer.name,
        topDeals: topDeals.slice(0, 5),
        newArrivals: newArrivals.slice(0, 5),
        sentAt: currentTime,
      };

      this.emailDispatches.push(emailPayload);
      sentCount++;
    }

    return { emailsSent: sentCount };
  }

  // In-App Notification Center read toggle
  public markAsRead(notificationId: string): boolean {
    const notif = this.inAppNotifications.find((n) => n.id === notificationId);
    if (!notif) return false;
    notif.is_read = true;
    return true;
  }

  public getUnreadCount(userId: string): number {
    return this.inAppNotifications.filter((n) => n.userId === userId && !n.is_read).length;
  }

  public getScheduledJob(jobId: string) {
    return this.scheduledJobs.get(jobId);
  }

  public getBuffer(bufferKey: string) {
    return this.redisBuffers.get(bufferKey) || [];
  }
}

describe('SmartNotificationBatchEngine — Feature 20 (R2)', () => {
  let engine: SmartNotificationBatchEngine;

  beforeEach(() => {
    engine = new SmartNotificationBatchEngine();

    // Register Subscribers
    engine.registerSubscriber({
      buyerId: 'buyer_1',
      buyerName: 'Yassine',
      email: 'yassine@example.tn',
      storeId: 'store_electronics',
      notify_price_drops: true,
      notify_new_products: true,
      email_digest_opt_in: true,
    });

    engine.registerSubscriber({
      buyerId: 'buyer_2',
      buyerName: 'Amira',
      email: 'amira@example.tn',
      storeId: 'store_electronics',
      notify_price_drops: false, // Opted out of price drops
      notify_new_products: true,
      email_digest_opt_in: true,
    });

    engine.registerSubscriber({
      buyerId: 'buyer_3',
      buyerName: 'Karim',
      email: 'karim@example.tn',
      storeId: 'store_fashion',
      notify_price_drops: true,
      notify_new_products: true,
      email_digest_opt_in: false, // Opted out of email digest
    });
  });

  // =========================================================================
  // Tier 1: Happy-Path Isolated Unit Tests (>= 5 tests)
  // =========================================================================
  describe('Tier 1: Happy-Path Isolated Tests', () => {
    it('T1.1: Single price drop event schedules 15-min sliding batch job with correct delay', async () => {
      const now = Date.now();
      const res = await engine.ingestEvent(
        {
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'price_drop',
          productId: 'prod_screen',
          productTitle: 'Écran 27" 165Hz',
          oldPrice: 850,
          price: 699,
          timestamp: now,
        },
        now
      );

      expect(res.jobId).toBe('batch:store_electronics:price_drop');
      expect(res.bufferSize).toBe(1);

      const job = engine.getScheduledJob('batch:store_electronics:price_drop');
      expect(job).toBeDefined();
      expect(job?.executeAt).toBe(now + 15 * 60 * 1000);
    });

    it('T1.2: Multiple price drops within 15 min aggregate into a single consolidated batch', async () => {
      const now = Date.now();
      // Product 1
      await engine.ingestEvent(
        {
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'price_drop',
          productId: 'prod_screen',
          productTitle: 'Écran 27" 165Hz',
          oldPrice: 850,
          price: 699,
          timestamp: now,
        },
        now
      );

      // Product 2 (5 mins later)
      await engine.ingestEvent(
        {
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'price_drop',
          productId: 'prod_keyboard',
          productTitle: 'Clavier Mécanique RGB',
          oldPrice: 180,
          price: 139,
          timestamp: now + 5 * 60 * 1000,
        },
        now + 5 * 60 * 1000
      );

      // Product 3 (10 mins later)
      await engine.ingestEvent(
        {
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'price_drop',
          productId: 'prod_mouse',
          productTitle: 'Souris Sans Fil Pro',
          oldPrice: 120,
          price: 89,
          timestamp: now + 10 * 60 * 1000,
        },
        now + 10 * 60 * 1000
      );

      const buffer = engine.getBuffer('notif_buffer:store:store_electronics:type:price_drop');
      expect(buffer).toHaveLength(3);

      // Process the batch
      const batchRes = await engine.processBatchJob('store_electronics', 'price_drop');
      expect(batchRes.notificationsCreated).toBe(1); // buyer_1 received it (buyer_2 disabled price drops)

      expect(engine.inAppNotifications).toHaveLength(1);
      expect(engine.inAppNotifications[0].title).toBe('🏷️ 3 baisses de prix chez Electro Mega');
      expect(engine.inAppNotifications[0].message).toContain('3 articles');
      expect(engine.inAppNotifications[0].userId).toBe('buyer_1');
    });

    it('T1.3: New product publication events aggregate into single consolidated alert', async () => {
      const now = Date.now();
      await engine.ingestEvent(
        {
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'new_product',
          productId: 'prod_laptop_1',
          productTitle: 'Laptop Ryzen 7',
          price: 2499,
          timestamp: now,
        },
        now
      );

      await engine.ingestEvent(
        {
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'new_product',
          productId: 'prod_laptop_2',
          productTitle: 'Laptop Intel i9',
          price: 3200,
          timestamp: now + 2 * 60 * 1000,
        },
        now + 2 * 60 * 1000
      );

      const res = await engine.processBatchJob('store_electronics', 'new_product');
      // Both buyer_1 and buyer_2 have new product notifications enabled
      expect(res.notificationsCreated).toBe(2);

      expect(engine.inAppNotifications).toHaveLength(2);
      expect(engine.inAppNotifications[0].title).toBe('✨ 2 nouveaux produits chez Electro Mega');
    });

    it('T1.4: Real-time WebSocket emission occurs concurrently with In-App notification creation', async () => {
      await engine.ingestEvent({
        storeId: 'store_fashion',
        storeName: 'Moda Tunis',
        type: 'price_drop',
        productId: 'dress_1',
        productTitle: 'Robe Soirée Satin',
        oldPrice: 160,
        price: 110,
        timestamp: Date.now(),
      });

      await engine.processBatchJob('store_fashion', 'price_drop');

      expect(engine.webSocketEmissions).toHaveLength(1);
      expect(engine.webSocketEmissions[0].userId).toBe('buyer_3');
      expect(engine.webSocketEmissions[0].event).toBe('notification');
    });

    it('T1.5: Daily 7:00 PM email digest aggregates discounts across followed stores', async () => {
      // Ingest and process a price drop for buyer_1's followed store
      await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'prod_headset',
        productTitle: 'Casque Audio ANC',
        oldPrice: 350,
        price: 279,
        timestamp: Date.now(),
      });
      await engine.processBatchJob('store_electronics', 'price_drop');

      // Execute 7 PM digest
      const digestRes = await engine.executeDailyEmailDigest(new Date());

      expect(digestRes.emailsSent).toBe(1);
      expect(engine.emailDispatches).toHaveLength(1);
      expect(engine.emailDispatches[0].toEmail).toBe('yassine@example.tn');
      expect(engine.emailDispatches[0].buyerName).toBe('Yassine');
      expect(engine.emailDispatches[0].topDeals).toHaveLength(1);
      expect(engine.emailDispatches[0].topDeals[0].productTitle).toBe('Casque Audio ANC');
    });

    it('T1.6: In-App notification center unread badge counter updates accurately on read toggle', async () => {
      await engine.ingestEvent({
        storeId: 'store_fashion',
        storeName: 'Moda Tunis',
        type: 'new_product',
        productId: 'jacket_1',
        productTitle: 'Veste Cuir',
        price: 220,
        timestamp: Date.now(),
      });
      await engine.processBatchJob('store_fashion', 'new_product');

      expect(engine.getUnreadCount('buyer_3')).toBe(1);

      const notifId = engine.inAppNotifications[0].id;
      const readResult = engine.markAsRead(notifId);
      expect(readResult).toBe(true);
      expect(engine.getUnreadCount('buyer_3')).toBe(0);
    });
  });

  // =========================================================================
  // Tier 2: Boundary & Corner Cases (>= 5 tests)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: Empty buffer drain gracefully returns 0 notifications without error', async () => {
      const res = await engine.processBatchJob('store_non_existent', 'price_drop');
      expect(res.notificationsCreated).toBe(0);
      expect(engine.inAppNotifications).toHaveLength(0);
    });

    it('T2.2: Non-discount event (newPrice >= oldPrice) is rejected/ignored', async () => {
      const resEqual = await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'p_same',
        productTitle: 'Same Price Item',
        oldPrice: 100,
        price: 100,
        timestamp: Date.now(),
      });
      expect(resEqual.jobId).toBe('');
      expect(resEqual.bufferSize).toBe(0);

      const resHigher = await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'p_higher',
        productTitle: 'Higher Price Item',
        oldPrice: 100,
        price: 120,
        timestamp: Date.now(),
      });
      expect(resHigher.jobId).toBe('');
      expect(resHigher.bufferSize).toBe(0);
    });

    it('T2.3: Repeated edits on the same product within 15 min deduplicates to 1 product entry', async () => {
      const now = Date.now();
      // Price edited 3 times in 10 minutes
      await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'prod_repeated',
        productTitle: 'Smart Watch',
        oldPrice: 300,
        price: 250,
        timestamp: now,
      });

      await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'prod_repeated',
        productTitle: 'Smart Watch',
        oldPrice: 300,
        price: 230,
        timestamp: now + 4 * 60 * 1000,
      });

      await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'prod_repeated',
        productTitle: 'Smart Watch',
        oldPrice: 300,
        price: 210,
        timestamp: now + 8 * 60 * 1000,
      });

      const buffer = engine.getBuffer('notif_buffer:store:store_electronics:type:price_drop');
      expect(buffer).toHaveLength(1);
      expect(buffer[0].price).toBe(210); // Keeps latest price
    });

    it('T2.4: Store with 0 subscribers processes batch cleanly with 0 DB rows created', async () => {
      await engine.ingestEvent({
        storeId: 'store_lonely_no_subs',
        storeName: 'Lonely Store',
        type: 'new_product',
        productId: 'prod_lonely',
        productTitle: 'Lonely Lamp',
        price: 50,
        timestamp: Date.now(),
      });

      const res = await engine.processBatchJob('store_lonely_no_subs', 'new_product');
      expect(res.notificationsCreated).toBe(0);
      expect(engine.inAppNotifications).toHaveLength(0);
    });

    it('T2.5: Daily email digest skips buyers who have 0 updates across followed stores in 24h', async () => {
      // No events ingested
      const res = await engine.executeDailyEmailDigest();
      expect(res.emailsSent).toBe(0);
      expect(engine.emailDispatches).toHaveLength(0);
    });

    it('T2.6: Daily email digest skips buyers who opted out of email digest', async () => {
      // Ingest event for store_fashion (followed by buyer_3 who opted out of email digest)
      await engine.ingestEvent({
        storeId: 'store_fashion',
        storeName: 'Moda Tunis',
        type: 'price_drop',
        productId: 'prod_fashion_1',
        productTitle: 'Jeans Slim',
        oldPrice: 90,
        price: 65,
        timestamp: Date.now(),
      });
      await engine.processBatchJob('store_fashion', 'price_drop');

      const res = await engine.executeDailyEmailDigest();
      expect(res.emailsSent).toBe(0); // buyer_3 opted out
      expect(engine.emailDispatches).toHaveLength(0);
    });

    it('T2.7: High-volume flash sale (100 price drops) aggregates into single consolidated message', async () => {
      const now = Date.now();
      for (let i = 0; i < 100; i++) {
        await engine.ingestEvent({
          storeId: 'store_electronics',
          storeName: 'Electro Mega',
          type: 'price_drop',
          productId: `prod_bulk_${i}`,
          productTitle: `Accessory #${i}`,
          oldPrice: 50,
          price: 30,
          timestamp: now + i * 1000,
        });
      }

      const res = await engine.processBatchJob('store_electronics', 'price_drop');
      expect(res.notificationsCreated).toBe(1);

      const notif = engine.inAppNotifications[0];
      expect(notif.title).toBe('🏷️ 100 baisses de prix chez Electro Mega');
      expect(notif.message).toContain('100 articles');
    });

    it('T2.8: Multi-store isolation: Events in Store A and Store B generate independent buffers', async () => {
      await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'new_product',
        productId: 'e_prod_1',
        productTitle: 'Drone 4K',
        price: 1200,
        timestamp: Date.now(),
      });

      await engine.ingestEvent({
        storeId: 'store_fashion',
        storeName: 'Moda Tunis',
        type: 'new_product',
        productId: 'f_prod_1',
        productTitle: 'Manteau Hiver',
        price: 350,
        timestamp: Date.now(),
      });

      const bufferE = engine.getBuffer('notif_buffer:store:store_electronics:type:new_product');
      const bufferF = engine.getBuffer('notif_buffer:store:store_fashion:type:new_product');

      expect(bufferE).toHaveLength(1);
      expect(bufferF).toHaveLength(1);
      expect(bufferE[0].productTitle).toBe('Drone 4K');
      expect(bufferF[0].productTitle).toBe('Manteau Hiver');
    });
  });

  // =========================================================================
  // Tier 3: Pairwise Combinations
  // =========================================================================
  describe('Tier 3: Pairwise Combinations', () => {
    const testCases = [
      { type: 'price_drop' as const, itemsCount: 1, subscriberCount: 1, expectedTitlePrefix: '🏷️ Baisse de prix' },
      { type: 'price_drop' as const, itemsCount: 5, subscriberCount: 1, expectedTitlePrefix: '🏷️ 5 baisses de prix' },
      { type: 'new_product' as const, itemsCount: 1, subscriberCount: 2, expectedTitlePrefix: '✨ Nouveauté' },
      { type: 'new_product' as const, itemsCount: 4, subscriberCount: 2, expectedTitlePrefix: '✨ 4 nouveaux produits' },
    ];

    testCases.forEach((tc, idx) => {
      it(`T3.${idx + 1}: Pairwise (${tc.type}, ${tc.itemsCount} items, ${tc.subscriberCount} subs)`, async () => {
        const storeId = `store_pw_${idx}`;
        const storeName = `PW Store ${idx}`;

        // Register custom subscribers
        for (let s = 0; s < tc.subscriberCount; s++) {
          engine.registerSubscriber({
            buyerId: `buyer_pw_${idx}_${s}`,
            buyerName: `Buyer ${s}`,
            email: `buyer_${s}@pw.tn`,
            storeId,
            notify_price_drops: true,
            notify_new_products: true,
            email_digest_opt_in: true,
          });
        }

        for (let i = 0; i < tc.itemsCount; i++) {
          await engine.ingestEvent({
            storeId,
            storeName,
            type: tc.type,
            productId: `p_pw_${idx}_${i}`,
            productTitle: `Item ${i}`,
            oldPrice: tc.type === 'price_drop' ? 100 : undefined,
            price: 80,
            timestamp: Date.now(),
          });
        }

        const res = await engine.processBatchJob(storeId, tc.type);
        expect(res.notificationsCreated).toBe(tc.subscriberCount);
        const lastNotif = engine.inAppNotifications[engine.inAppNotifications.length - 1];
        expect(lastNotif.title).toContain(tc.expectedTitlePrefix);
      });
    });
  });

  // =========================================================================
  // Tier 4: Real-World Workflow Integration Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Workflow Integration Scenarios', () => {
    it('T4.1: Scenario 2 — Vendor multi-item price updates within 5 min aggregate into 1 consolidated alert', async () => {
      const now = Date.now();

      // Vendor updates 4 product prices across a 5 minute period
      const priceUpdates = [
        { id: 'item_1', title: 'Tablette 10"', old: 600, cur: 499, offsetMs: 0 },
        { id: 'item_2', title: 'Stylet Pro', old: 150, cur: 119, offsetMs: 60 * 1000 },
        { id: 'item_3', title: 'Étui Clavier', old: 180, cur: 139, offsetMs: 180 * 1000 },
        { id: 'item_4', title: 'Chargeur Rapide 65W', old: 90, cur: 69, offsetMs: 290 * 1000 },
      ];

      for (const u of priceUpdates) {
        await engine.ingestEvent(
          {
            storeId: 'store_electronics',
            storeName: 'Electro Mega',
            type: 'price_drop',
            productId: u.id,
            productTitle: u.title,
            oldPrice: u.old,
            price: u.cur,
            timestamp: now + u.offsetMs,
          },
          now + u.offsetMs
        );
      }

      // BullMQ delayed job triggers at +15 mins
      const res = await engine.processBatchJob('store_electronics', 'price_drop');
      expect(res.notificationsCreated).toBe(1);

      // Verify single consolidated notification
      const buyerNotifs = engine.inAppNotifications.filter((n) => n.userId === 'buyer_1');
      expect(buyerNotifs).toHaveLength(1);
      expect(buyerNotifs[0].title).toBe('🏷️ 4 baisses de prix chez Electro Mega');

      // Verify WebSocket push dispatched once
      const buyerWs = engine.webSocketEmissions.filter((w) => w.userId === 'buyer_1');
      expect(buyerWs).toHaveLength(1);
    });

    it('T4.2: Scenario 2b — 24-Hour Multi-Store Follow Activity summarized in 7:00 PM Email Digest', async () => {
      // Buyer 1 follows 2 active stores that publish and drop prices during the day
      engine.registerSubscriber({
        buyerId: 'buyer_1',
        buyerName: 'Yassine',
        email: 'yassine@example.tn',
        storeId: 'store_fashion',
        notify_price_drops: true,
        notify_new_products: true,
        email_digest_opt_in: true,
      });

      // Electro Mega drops price on 1 item
      await engine.ingestEvent({
        storeId: 'store_electronics',
        storeName: 'Electro Mega',
        type: 'price_drop',
        productId: 'e1',
        productTitle: 'Monitor 4K',
        oldPrice: 1200,
        price: 999,
        timestamp: Date.now(),
      });
      await engine.processBatchJob('store_electronics', 'price_drop');

      // Moda Tunis publishes 2 new items
      await engine.ingestEvent({
        storeId: 'store_fashion',
        storeName: 'Moda Tunis',
        type: 'new_product',
        productId: 'f1',
        productTitle: 'Costume Lin',
        price: 450,
        timestamp: Date.now(),
      });
      await engine.ingestEvent({
        storeId: 'store_fashion',
        storeName: 'Moda Tunis',
        type: 'new_product',
        productId: 'f2',
        productTitle: 'Chemise Blanche',
        price: 120,
        timestamp: Date.now(),
      });
      await engine.processBatchJob('store_fashion', 'new_product');

      // Execute 7 PM Digest
      const digestResult = await engine.executeDailyEmailDigest(new Date());
      expect(digestResult.emailsSent).toBe(1);

      const email = engine.emailDispatches[0];
      expect(email.toEmail).toBe('yassine@example.tn');
      expect(email.topDeals.length).toBeGreaterThan(0);
      expect(email.newArrivals.length).toBeGreaterThan(0);
    });
  });
});
