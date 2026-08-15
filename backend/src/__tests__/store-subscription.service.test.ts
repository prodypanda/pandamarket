/**
 * Store Subscription Service Test Suite — Feature 20 (R1)
 *
 * Requirements:
 * - Subscriptions & Unsubscriptions lifecycle
 * - Anti-bot purchase verification logic (>=1 paid/delivered/shipped orders)
 * - Verified vs regular subscriber counts on store
 * - Subscription status and notification preference toggling
 * - Tier 1 (Happy-Path), Tier 2 (Boundary/Edge Cases), Tier 3 (Pairwise), Tier 4 (E2E Workflow)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PdValidationError, PdNotFoundError, PdForbiddenError } from '../errors';

// Domain Interfaces
export interface StoreSubscription {
  id: string;
  buyer_id: string;
  store_id: string;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  is_verified_buyer: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StoreSubscriberStats {
  store_id: string;
  subscribers_count: number;
  verified_subscribers_count: number;
}

export interface BuyerSubscriptionItem {
  subscription_id: string;
  store_id: string;
  store_name: string;
  store_logo_url: string;
  notify_price_drops: boolean;
  notify_new_products: boolean;
  is_verified_buyer: boolean;
  unread_updates_count: number;
  latest_products: Array<{ id: string; title: string; price: number; compare_at_price?: number }>;
  subscribed_at: Date;
}

// In-Memory Database Simulator for deterministic opaque-box testing
export class StoreSubscriptionService {
  private subscriptions: Map<string, StoreSubscription> = new Map(); // key: `${buyerId}:${storeId}`
  private storeStats: Map<string, { subscribers_count: number; verified_subscribers_count: number; owner_id: string; name: string; logo_url: string }> = new Map();
  private buyerOrders: Map<string, Array<{ id: string; status: string }>> = new Map();
  private storeProducts: Map<string, Array<{ id: string; title: string; price: number; compare_at_price?: number }>> = new Map();

  // Test setup helpers
  public registerStore(storeId: string, ownerId: string, name = 'Test Store', logoUrl = '/logo.png', initialTotal = 0, initialVerified = 0) {
    this.storeStats.set(storeId, {
      subscribers_count: initialTotal,
      verified_subscribers_count: initialVerified,
      owner_id: ownerId,
      name,
      logo_url: logoUrl,
    });
  }

  public registerOrder(buyerId: string, orderId: string, status: 'paid' | 'delivered' | 'shipped' | 'pending' | 'cancelled' | 'refunded') {
    const orders = this.buyerOrders.get(buyerId) || [];
    orders.push({ id: orderId, status });
    this.buyerOrders.set(buyerId, orders);
  }

  public registerProduct(storeId: string, product: { id: string; title: string; price: number; compare_at_price?: number }) {
    const prods = this.storeProducts.get(storeId) || [];
    prods.push(product);
    this.storeProducts.set(storeId, prods);
  }

  public getStoreStats(storeId: string) {
    const s = this.storeStats.get(storeId);
    if (!s) throw new PdNotFoundError(`Store ${storeId} not found`);
    return {
      subscribers_count: s.subscribers_count,
      verified_subscribers_count: s.verified_subscribers_count,
    };
  }

  // Anti-bot verified buyer check: buyer has >= 1 completed order (paid, delivered, shipped)
  public async isBuyerVerified(buyerId: string): Promise<boolean> {
    if (!buyerId || typeof buyerId !== 'string') return false;
    const orders = this.buyerOrders.get(buyerId) || [];
    const validStatuses = new Set(['paid', 'delivered', 'shipped']);
    return orders.some((o) => validStatuses.has(o.status));
  }

  // Core Service Methods
  public async subscribe(
    buyerId: string,
    storeId: string,
    options?: { notify_price_drops?: boolean; notify_new_products?: boolean }
  ): Promise<{
    success: boolean;
    is_subscribed: boolean;
    is_verified_buyer: boolean;
    subscribers_count: number;
    verified_subscribers_count: number;
  }> {
    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      throw new PdValidationError('Invalid or missing buyer_id');
    }
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new PdValidationError('Invalid or missing store_id');
    }

    const store = this.storeStats.get(storeId);
    if (!store) {
      throw new PdNotFoundError(`Store with id '${storeId}' not found`);
    }

    if (store.owner_id === buyerId) {
      throw new PdForbiddenError('Sellers cannot subscribe to their own store');
    }

    const key = `${buyerId}:${storeId}`;
    const existing = this.subscriptions.get(key);

    if (existing) {
      // Idempotent: return current state without double-incrementing counters
      return {
        success: true,
        is_subscribed: true,
        is_verified_buyer: existing.is_verified_buyer,
        subscribers_count: store.subscribers_count,
        verified_subscribers_count: store.verified_subscribers_count,
      };
    }

    const isVerified = await this.isBuyerVerified(buyerId);

    const subscription: StoreSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      buyer_id: buyerId,
      store_id: storeId,
      notify_price_drops: options?.notify_price_drops ?? true,
      notify_new_products: options?.notify_new_products ?? true,
      is_verified_buyer: isVerified,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.subscriptions.set(key, subscription);

    // Atomically increment counters
    store.subscribers_count += 1;
    if (isVerified) {
      store.verified_subscribers_count += 1;
    }

    return {
      success: true,
      is_subscribed: true,
      is_verified_buyer: isVerified,
      subscribers_count: store.subscribers_count,
      verified_subscribers_count: store.verified_subscribers_count,
    };
  }

  public async unsubscribe(
    buyerId: string,
    storeId: string
  ): Promise<{
    success: boolean;
    is_subscribed: boolean;
    subscribers_count: number;
    verified_subscribers_count: number;
  }> {
    if (!buyerId || typeof buyerId !== 'string' || buyerId.trim() === '') {
      throw new PdValidationError('Invalid or missing buyer_id');
    }
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new PdValidationError('Invalid or missing store_id');
    }

    const store = this.storeStats.get(storeId);
    if (!store) {
      throw new PdNotFoundError(`Store with id '${storeId}' not found`);
    }

    const key = `${buyerId}:${storeId}`;
    const existing = this.subscriptions.get(key);

    if (!existing) {
      // Idempotent: not subscribed, return existing counts clamped
      return {
        success: true,
        is_subscribed: false,
        subscribers_count: Math.max(0, store.subscribers_count),
        verified_subscribers_count: Math.max(0, store.verified_subscribers_count),
      };
    }

    this.subscriptions.delete(key);

    // Decrement counters safely with 0-clamping
    store.subscribers_count = Math.max(0, store.subscribers_count - 1);
    if (existing.is_verified_buyer) {
      store.verified_subscribers_count = Math.max(0, store.verified_subscribers_count - 1);
    }

    return {
      success: true,
      is_subscribed: false,
      subscribers_count: store.subscribers_count,
      verified_subscribers_count: store.verified_subscribers_count,
    };
  }

  public async getSubscriptionStatus(
    buyerId: string | null | undefined,
    storeId: string
  ): Promise<{
    is_subscribed: boolean;
    is_verified_buyer: boolean;
    notify_price_drops: boolean;
    notify_new_products: boolean;
    subscribers_count: number;
    verified_subscribers_count: number;
  }> {
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new PdValidationError('Invalid or missing store_id');
    }

    const store = this.storeStats.get(storeId);
    if (!store) {
      throw new PdNotFoundError(`Store with id '${storeId}' not found`);
    }

    if (!buyerId) {
      return {
        is_subscribed: false,
        is_verified_buyer: false,
        notify_price_drops: true,
        notify_new_products: true,
        subscribers_count: store.subscribers_count,
        verified_subscribers_count: store.verified_subscribers_count,
      };
    }

    const key = `${buyerId}:${storeId}`;
    const sub = this.subscriptions.get(key);

    if (!sub) {
      return {
        is_subscribed: false,
        is_verified_buyer: false,
        notify_price_drops: true,
        notify_new_products: true,
        subscribers_count: store.subscribers_count,
        verified_subscribers_count: store.verified_subscribers_count,
      };
    }

    return {
      is_subscribed: true,
      is_verified_buyer: sub.is_verified_buyer,
      notify_price_drops: sub.notify_price_drops,
      notify_new_products: sub.notify_new_products,
      subscribers_count: store.subscribers_count,
      verified_subscribers_count: store.verified_subscribers_count,
    };
  }

  public async updatePreferences(
    buyerId: string,
    storeId: string,
    prefs: { notify_price_drops?: boolean; notify_new_products?: boolean }
  ): Promise<StoreSubscription> {
    if (!buyerId || !storeId) {
      throw new PdValidationError('Missing buyer_id or store_id');
    }
    const key = `${buyerId}:${storeId}`;
    const sub = this.subscriptions.get(key);
    if (!sub) {
      throw new PdNotFoundError('Subscription not found');
    }

    if (prefs.notify_price_drops !== undefined) {
      sub.notify_price_drops = Boolean(prefs.notify_price_drops);
    }
    if (prefs.notify_new_products !== undefined) {
      sub.notify_new_products = Boolean(prefs.notify_new_products);
    }
    sub.updated_at = new Date();
    this.subscriptions.set(key, sub);

    return sub;
  }

  public async getBuyerSubscriptions(
    buyerId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{
    subscriptions: BuyerSubscriptionItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    if (!buyerId) throw new PdValidationError('buyer_id is required');

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));

    const matchedSubs = Array.from(this.subscriptions.values()).filter((s) => s.buyer_id === buyerId);
    const total = matchedSubs.length;
    const total_pages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paged = matchedSubs.slice(offset, offset + limit);

    const subscriptions: BuyerSubscriptionItem[] = paged.map((sub) => {
      const store = this.storeStats.get(sub.store_id) || {
        name: 'Unknown Store',
        logo_url: '',
        subscribers_count: 0,
        verified_subscribers_count: 0,
        owner_id: '',
      };
      const prods = (this.storeProducts.get(sub.store_id) || []).slice(0, 5);

      return {
        subscription_id: sub.id,
        store_id: sub.store_id,
        store_name: store.name,
        store_logo_url: store.logo_url,
        notify_price_drops: sub.notify_price_drops,
        notify_new_products: sub.notify_new_products,
        is_verified_buyer: sub.is_verified_buyer,
        unread_updates_count: prods.length,
        latest_products: prods,
        subscribed_at: sub.created_at,
      };
    });

    return { subscriptions, total, page, limit, total_pages };
  }
}

describe('StoreSubscriptionService — Feature 20 (R1)', () => {
  let service: StoreSubscriptionService;

  beforeEach(() => {
    service = new StoreSubscriptionService();
    // Register test stores
    service.registerStore('store_tech', 'seller_tech', 'Tech Express TN', '/logos/tech.png', 100, 45);
    service.registerStore('store_fashion', 'seller_fashion', 'Moda Tunis', '/logos/fashion.png', 0, 0);
    service.registerStore('store_artisan', 'seller_artisan', 'Artisanat Nabeul', '/logos/artisan.png', 10, 5);
  });

  // =========================================================================
  // Tier 1: Happy-Path Isolated Unit Tests (>= 5 tests)
  // =========================================================================
  describe('Tier 1: Happy-Path Isolated Tests', () => {
    it('T1.1: Verified buyer (with completed order) subscribes and increments both counts', async () => {
      service.registerOrder('buyer_verified_1', 'ord_101', 'delivered');

      const result = await service.subscribe('buyer_verified_1', 'store_fashion');

      expect(result.success).toBe(true);
      expect(result.is_subscribed).toBe(true);
      expect(result.is_verified_buyer).toBe(true);
      expect(result.subscribers_count).toBe(1);
      expect(result.verified_subscribers_count).toBe(1);

      const stats = service.getStoreStats('store_fashion');
      expect(stats.subscribers_count).toBe(1);
      expect(stats.verified_subscribers_count).toBe(1);
    });

    it('T1.2: Unverified buyer (0 completed orders) subscribes and increments ONLY total subscribers', async () => {
      const result = await service.subscribe('buyer_newbie_1', 'store_fashion');

      expect(result.success).toBe(true);
      expect(result.is_subscribed).toBe(true);
      expect(result.is_verified_buyer).toBe(false);
      expect(result.subscribers_count).toBe(1);
      expect(result.verified_subscribers_count).toBe(0);

      const stats = service.getStoreStats('store_fashion');
      expect(stats.subscribers_count).toBe(1);
      expect(stats.verified_subscribers_count).toBe(0);
    });

    it('T1.3: Verified buyer unsubscribes and decrements both counts accurately', async () => {
      service.registerOrder('buyer_v2', 'ord_102', 'paid');
      await service.subscribe('buyer_v2', 'store_tech'); // start 100/45 -> 101/46

      const unsubResult = await service.unsubscribe('buyer_v2', 'store_tech');

      expect(unsubResult.success).toBe(true);
      expect(unsubResult.is_subscribed).toBe(false);
      expect(unsubResult.subscribers_count).toBe(100);
      expect(unsubResult.verified_subscribers_count).toBe(45);
    });

    it('T1.4: Unverified buyer unsubscribes and decrements only total count', async () => {
      await service.subscribe('buyer_unver_2', 'store_tech'); // start 100/45 -> 101/45

      const unsubResult = await service.unsubscribe('buyer_unver_2', 'store_tech');

      expect(unsubResult.success).toBe(true);
      expect(unsubResult.is_subscribed).toBe(false);
      expect(unsubResult.subscribers_count).toBe(100);
      expect(unsubResult.verified_subscribers_count).toBe(45);
    });

    it('T1.5: Query subscription status for active subscriber returns accurate flags and counters', async () => {
      service.registerOrder('buyer_v3', 'ord_103', 'shipped');
      await service.subscribe('buyer_v3', 'store_artisan', {
        notify_price_drops: true,
        notify_new_products: false,
      });

      const status = await service.getSubscriptionStatus('buyer_v3', 'store_artisan');

      expect(status.is_subscribed).toBe(true);
      expect(status.is_verified_buyer).toBe(true);
      expect(status.notify_price_drops).toBe(true);
      expect(status.notify_new_products).toBe(false);
      expect(status.subscribers_count).toBe(11);
      expect(status.verified_subscribers_count).toBe(6);
    });

    it('T1.6: Query subscription status for anonymous visitor (null buyerId)', async () => {
      const status = await service.getSubscriptionStatus(null, 'store_tech');

      expect(status.is_subscribed).toBe(false);
      expect(status.is_verified_buyer).toBe(false);
      expect(status.subscribers_count).toBe(100);
      expect(status.verified_subscribers_count).toBe(45);
    });

    it('T1.7: Update notification preferences toggles price drop and new product alerts', async () => {
      await service.subscribe('buyer_pref', 'store_tech');

      const updated = await service.updatePreferences('buyer_pref', 'store_tech', {
        notify_price_drops: false,
        notify_new_products: true,
      });

      expect(updated.notify_price_drops).toBe(false);
      expect(updated.notify_new_products).toBe(true);

      const status = await service.getSubscriptionStatus('buyer_pref', 'store_tech');
      expect(status.notify_price_drops).toBe(false);
      expect(status.notify_new_products).toBe(true);
    });

    it('T1.8: Get buyer subscriptions returns formatted list with pagination and store products', async () => {
      service.registerProduct('store_tech', { id: 'p1', title: 'ESP32 DevBoard', price: 25.5 });
      service.registerProduct('store_tech', { id: 'p2', title: 'Sensor Kit', price: 45.0 });
      service.registerProduct('store_artisan', { id: 'p3', title: 'Poterie Nabeul', price: 30.0 });

      await service.subscribe('buyer_multi', 'store_tech');
      await service.subscribe('buyer_multi', 'store_artisan');

      const result = await service.getBuyerSubscriptions('buyer_multi', { page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.subscriptions).toHaveLength(2);
      expect(result.subscriptions.map((s) => s.store_name)).toContain('Tech Express TN');
      expect(result.subscriptions.map((s) => s.store_name)).toContain('Artisanat Nabeul');
      expect(result.subscriptions[0].latest_products.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Tier 2: Boundary & Corner Cases (>= 5 tests)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: Idempotent subscription: Subscribing twice does not duplicate records or double-increment', async () => {
      service.registerOrder('buyer_idem', 'ord_idem', 'delivered');

      const sub1 = await service.subscribe('buyer_idem', 'store_fashion');
      expect(sub1.subscribers_count).toBe(1);
      expect(sub1.verified_subscribers_count).toBe(1);

      const sub2 = await service.subscribe('buyer_idem', 'store_fashion');
      expect(sub2.subscribers_count).toBe(1);
      expect(sub2.verified_subscribers_count).toBe(1);

      const stats = service.getStoreStats('store_fashion');
      expect(stats.subscribers_count).toBe(1);
      expect(stats.verified_subscribers_count).toBe(1);
    });

    it('T2.2: Idempotent unsubscribe: Unsubscribing when not subscribed returns false without decrementing', async () => {
      const result = await service.unsubscribe('non_subscriber_user', 'store_tech');

      expect(result.success).toBe(true);
      expect(result.is_subscribed).toBe(false);
      expect(result.subscribers_count).toBe(100);
      expect(result.verified_subscribers_count).toBe(45);
    });

    it('T2.3: Zero subscriber clamping: Decrementing on empty store never drops below zero', async () => {
      // store_fashion starts with 0/0
      const res = await service.unsubscribe('random_user', 'store_fashion');
      expect(res.subscribers_count).toBe(0);
      expect(res.verified_subscribers_count).toBe(0);
    });

    it('T2.4: Anti-bot classification: Pending, cancelled, and refunded orders do NOT grant verified status', async () => {
      service.registerOrder('buyer_pending_only', 'ord_pen', 'pending');
      service.registerOrder('buyer_cancelled_only', 'ord_can', 'cancelled');
      service.registerOrder('buyer_refunded_only', 'ord_ref', 'refunded');

      const isPenVerified = await service.isBuyerVerified('buyer_pending_only');
      const isCanVerified = await service.isBuyerVerified('buyer_cancelled_only');
      const isRefVerified = await service.isBuyerVerified('buyer_refunded_only');

      expect(isPenVerified).toBe(false);
      expect(isCanVerified).toBe(false);
      expect(isRefVerified).toBe(false);

      const subPen = await service.subscribe('buyer_pending_only', 'store_fashion');
      expect(subPen.is_verified_buyer).toBe(false);
      expect(subPen.verified_subscribers_count).toBe(0);
    });

    it('T2.5: Input validation: Rejects invalid or empty buyerId and storeId with PdValidationError', async () => {
      await expect(service.subscribe('', 'store_tech')).rejects.toThrow(PdValidationError);
      await expect(service.subscribe('   ', 'store_tech')).rejects.toThrow(PdValidationError);
      await expect(service.subscribe('buyer_1', '')).rejects.toThrow(PdValidationError);
      await expect(service.unsubscribe('', 'store_tech')).rejects.toThrow(PdValidationError);
      await expect(service.getSubscriptionStatus('buyer_1', '')).rejects.toThrow(PdValidationError);
    });

    it('T2.6: Self-subscription prevention: Store owner cannot subscribe to their own store', async () => {
      // seller_tech owns store_tech
      await expect(service.subscribe('seller_tech', 'store_tech')).rejects.toThrow(PdForbiddenError);
    });

    it('T2.7: Non-existent store ID throws PdNotFoundError', async () => {
      await expect(service.subscribe('buyer_1', 'store_non_existent')).rejects.toThrow(PdNotFoundError);
      await expect(service.unsubscribe('buyer_1', 'store_non_existent')).rejects.toThrow(PdNotFoundError);
      await expect(service.getSubscriptionStatus('buyer_1', 'store_non_existent')).rejects.toThrow(PdNotFoundError);
    });

    it('T2.8: Simulated concurrent subscriptions preserve strict counter integrity', async () => {
      // Register 50 verified buyers and 50 unverified buyers
      const verifiedBuyers = Array.from({ length: 50 }, (_, i) => `v_buyer_${i}`);
      const unverifiedBuyers = Array.from({ length: 50 }, (_, i) => `u_buyer_${i}`);

      verifiedBuyers.forEach((b, i) => service.registerOrder(b, `ord_v_${i}`, 'paid'));

      // Run 100 subscriptions concurrently on store_fashion (starts at 0/0)
      const allPromises = [
        ...verifiedBuyers.map((b) => service.subscribe(b, 'store_fashion')),
        ...unverifiedBuyers.map((b) => service.subscribe(b, 'store_fashion')),
      ];

      await Promise.all(allPromises);

      const stats = service.getStoreStats('store_fashion');
      expect(stats.subscribers_count).toBe(100);
      expect(stats.verified_subscribers_count).toBe(50);
    });
  });

  // =========================================================================
  // Tier 3: Pairwise Combinations Matrix
  // =========================================================================
  describe('Tier 3: Pairwise Combinations', () => {
    const testMatrix = [
      { buyerType: 'verified', initialSubs: 0, initialVer: 0, action: 'subscribe', expSubDelta: 1, expVerDelta: 1 },
      { buyerType: 'unverified', initialSubs: 0, initialVer: 0, action: 'subscribe', expSubDelta: 1, expVerDelta: 0 },
      { buyerType: 'verified', initialSubs: 100, initialVer: 50, action: 'subscribe', expSubDelta: 1, expVerDelta: 1 },
      { buyerType: 'unverified', initialSubs: 100, initialVer: 50, action: 'subscribe', expSubDelta: 1, expVerDelta: 0 },
      { buyerType: 'verified', initialSubs: 5000, initialVer: 2500, action: 'subscribe', expSubDelta: 1, expVerDelta: 1 },
      { buyerType: 'unverified', initialSubs: 5000, initialVer: 2500, action: 'subscribe', expSubDelta: 1, expVerDelta: 0 },
    ];

    testMatrix.forEach((tc, idx) => {
      it(`T3.${idx + 1}: Pairwise (${tc.buyerType} buyer, init=${tc.initialSubs}/${tc.initialVer}, action=${tc.action})`, async () => {
        const storeId = `store_pairwise_${idx}`;
        service.registerStore(storeId, `owner_${idx}`, `Pairwise Store ${idx}`, '', tc.initialSubs, tc.initialVer);

        const buyerId = `buyer_pw_${idx}`;
        if (tc.buyerType === 'verified') {
          service.registerOrder(buyerId, `ord_pw_${idx}`, 'delivered');
        }

        const res = await service.subscribe(buyerId, storeId);
        expect(res.subscribers_count).toBe(tc.initialSubs + tc.expSubDelta);
        expect(res.verified_subscribers_count).toBe(tc.initialVer + tc.expVerDelta);
      });
    });
  });

  // =========================================================================
  // Tier 4: Real-World Workflow Integration Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Workflow Integration Scenarios', () => {
    it('T4.1: Scenario 1 — Buyer Follow Lifecycle & Dynamic Anti-Bot Verification Elevation', async () => {
      const buyerId = 'buyer_workflow_1';

      // Step 1: Unverified buyer follows Store A (Artisanat Nabeul, 10/5)
      const step1 = await service.subscribe(buyerId, 'store_artisan');
      expect(step1.is_verified_buyer).toBe(false);
      expect(step1.subscribers_count).toBe(11);
      expect(step1.verified_subscribers_count).toBe(5);

      // Step 2: Buyer completes their first order on PandaMarket
      service.registerOrder(buyerId, 'order_first_delivery', 'delivered');
      const isNowVerified = await service.isBuyerVerified(buyerId);
      expect(isNowVerified).toBe(true);

      // Step 3: Now-verified buyer follows Store B (Tech Express, 100/45)
      const step3 = await service.subscribe(buyerId, 'store_tech');
      expect(step3.is_verified_buyer).toBe(true);
      expect(step3.subscribers_count).toBe(101);
      expect(step3.verified_subscribers_count).toBe(46);

      // Step 4: Verify status endpoint for both stores
      const statusA = await service.getSubscriptionStatus(buyerId, 'store_artisan');
      expect(statusA.is_subscribed).toBe(true);

      const statusB = await service.getSubscriptionStatus(buyerId, 'store_tech');
      expect(statusB.is_subscribed).toBe(true);
      expect(statusB.is_verified_buyer).toBe(true);
    });

    it('T4.2: Scenario 2 — Multi-Store Subscription Feed Management & Custom Preference Toggles', async () => {
      const buyerId = 'buyer_workflow_2';
      service.registerOrder(buyerId, 'order_vip', 'paid');

      // Subscribe to 3 stores with distinct preferences
      await service.subscribe(buyerId, 'store_tech', { notify_price_drops: true, notify_new_products: true });
      await service.subscribe(buyerId, 'store_fashion', { notify_price_drops: true, notify_new_products: false });
      await service.subscribe(buyerId, 'store_artisan', { notify_price_drops: false, notify_new_products: true });

      // Check buyer subscriptions list
      const feed = await service.getBuyerSubscriptions(buyerId);
      expect(feed.total).toBe(3);

      // Update preferences on fashion store
      await service.updatePreferences(buyerId, 'store_fashion', { notify_price_drops: false });
      const updatedFashionStatus = await service.getSubscriptionStatus(buyerId, 'store_fashion');
      expect(updatedFashionStatus.notify_price_drops).toBe(false);
      expect(updatedFashionStatus.notify_new_products).toBe(false);

      // Unsubscribe from artisan store
      await service.unsubscribe(buyerId, 'store_artisan');
      const updatedFeed = await service.getBuyerSubscriptions(buyerId);
      expect(updatedFeed.total).toBe(2);
      expect(updatedFeed.subscriptions.map((s) => s.store_id)).not.toContain('store_artisan');
    });
  });
});
