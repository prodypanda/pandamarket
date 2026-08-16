/**
 * Smart Notification Batching Service — Feature 20 (R2)
 *
 * Implements:
 * - 15-minute sliding window debouncing per store
 * - Single consolidated alert formatting (no spam)
 * - In-App Notification Center + WebSocket push via socketGateway
 * - 7:00 PM Daily Email Digest dispatch
 */

import { query } from '../db/pool';
import { getRedis } from '../db/redis';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { socketGateway } from '../realtime/socket-gateway';
import { notificationBatchQueue } from '../queues/notification-batch-queue';
import { emailQueue } from '../queues/email-queue';
import { PdValidationError } from '../errors';

export interface ProductBatchEvent {
  storeId: string;
  storeName: string;
  type: 'price_drop' | 'new_product';
  productId: string;
  productTitle: string;
  price: number;
  oldPrice?: number;
  discountPct?: number;
  timestamp?: number;
}

export class NotificationBatchService {
  public static readonly BUFFER_TTL_SECONDS = 15 * 60; // 15 minutes (900 seconds)
  public static readonly BUFFER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in ms

  private static inMemoryBuffers = new Map<string, ProductBatchEvent[]>();
  private static inMemoryTimers = new Map<string, NodeJS.Timeout>();

  public static getBufferWindowMs(): number {
    if (process.env.NOTIFICATION_BATCH_WINDOW_MS) {
      return Math.max(1000, parseInt(process.env.NOTIFICATION_BATCH_WINDOW_MS, 10));
    }
    if (process.env.NOTIFICATION_BATCH_WINDOW_SECONDS) {
      return Math.max(1000, parseInt(process.env.NOTIFICATION_BATCH_WINDOW_SECONDS, 10) * 1000);
    }
    return NotificationBatchService.BUFFER_WINDOW_MS;
  }

  /**
   * Helper to format consolidated notification title and message
   */
  public formatConsolidatedAlert(
    storeName: string,
    type: 'price_drop' | 'new_product',
    items: Array<{ productId: string; productTitle: string; price: number; oldPrice?: number }>
  ): { title: string; message: string } {
    const count = items.length;
    const name = storeName || 'Boutique';

    if (type === 'price_drop') {
      if (count === 1) {
        return {
          title: `🏷️ Baisse de prix chez ${name}`,
          message: `${name} a baissé le prix de « ${items[0].productTitle} » à ${items[0].price} TND !`,
        };
      }
      return {
        title: `🏷️ ${count} baisses de prix chez ${name}`,
        message: `${name} a baissé le prix de ${count} articles ! Ne manquez pas ces offres exclusives.`,
      };
    } else {
      if (count === 1) {
        return {
          title: `✨ Nouveauté chez ${name}`,
          message: `${name} a publié un nouveau produit : « ${items[0].productTitle} » à ${items[0].price} TND !`,
        };
      }
      return {
        title: `✨ ${count} nouveaux produits chez ${name}`,
        message: `${name} a ajouté ${count} nouveaux articles à son catalogue ! Venez les découvrir.`,
      };
    }
  }

  /**
   * Ingest and buffer a product change event into the sliding buffer.
   */
  public async ingestEvent(
    event: ProductBatchEvent,
    currentTime = Date.now()
  ): Promise<{ jobId: string; bufferSize: number }> {
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
    const jobId = `batch:${event.storeId}:${event.type}`;
    const windowMs = NotificationBatchService.getBufferWindowMs();

    try {
      const redis = getRedis();

      // 1. Read existing buffer for deduplication (same product updated multiple times)
      const existingRaw = await redis.lrange(bufferKey, 0, -1);
      const existingEvents: ProductBatchEvent[] = existingRaw.map((raw) => JSON.parse(raw));

      const existingIdx = existingEvents.findIndex((e) => e.productId === event.productId);
      if (existingIdx >= 0) {
        existingEvents[existingIdx] = event;
      } else {
        existingEvents.push(event);
      }

      // Rewrite buffer atomically in Redis
      await redis.del(bufferKey);
      if (existingEvents.length > 0) {
        const serialized = existingEvents.map((e) => JSON.stringify(e));
        await redis.rpush(bufferKey, ...serialized);
        await redis.expire(bufferKey, NotificationBatchService.BUFFER_TTL_SECONDS);
      }

      // 2. Schedule or slide the BullMQ job
      try {
        const existingJob = await notificationBatchQueue.getJob(jobId);
        if (existingJob) {
          await existingJob.remove();
        }

        await notificationBatchQueue.add(
          'process-store-batch',
          {
            storeId: event.storeId,
            storeName: event.storeName,
            type: event.type,
            timestamp: currentTime,
          },
          {
            jobId,
            delay: windowMs,
          }
        );
      } catch (queueErr) {
        // BullMQ error: fallback to timer
        logger.warn({ queueErr }, 'BullMQ unavailable for notification batch, scheduling timer fallback');
        const existingTimer = NotificationBatchService.inMemoryTimers.get(jobId);
        if (existingTimer) clearTimeout(existingTimer);
        const timer = setTimeout(() => {
          this.processBatch(event.storeId, event.type).catch((err) => logger.error({ err }, 'Timer batch failed'));
        }, windowMs);
        NotificationBatchService.inMemoryTimers.set(jobId, timer);
      }

      logger.info(
        { storeId: event.storeId, type: event.type, productId: event.productId, bufferSize: existingEvents.length },
        'Product batch event buffered in Redis'
      );

      return { jobId, bufferSize: existingEvents.length };
    } catch (err) {
      logger.warn({ err, event }, 'Redis error during notification ingest, using in-memory buffer fallback');

      // In-Memory Fallback
      const memEvents = NotificationBatchService.inMemoryBuffers.get(bufferKey) || [];
      const existingIdx = memEvents.findIndex((e) => e.productId === event.productId);
      if (existingIdx >= 0) {
        memEvents[existingIdx] = event;
      } else {
        memEvents.push(event);
      }
      NotificationBatchService.inMemoryBuffers.set(bufferKey, memEvents);

      const existingTimer = NotificationBatchService.inMemoryTimers.get(jobId);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        this.processBatch(event.storeId, event.type).catch((batchErr) => logger.error({ batchErr }, 'In-memory batch failed'));
      }, windowMs);
      NotificationBatchService.inMemoryTimers.set(jobId, timer);

      return { jobId, bufferSize: memEvents.length };
    }
  }

  /**
   * Alias for recordEvent to match interface
   */
  public async recordEvent(event: ProductBatchEvent): Promise<{ jobId: string; bufferSize: number }> {
    return this.ingestEvent(event);
  }

  /**
   * Flush and process all pending notification batches for a store immediately
   */
  public async flushStoreBatches(storeId: string): Promise<{ priceDropCount: number; newProductCount: number }> {
    const [priceDropCount, newProductCount] = await Promise.all([
      this.processBatch(storeId, 'price_drop'),
      this.processBatch(storeId, 'new_product'),
    ]);
    return { priceDropCount, newProductCount };
  }

  /**
   * Process and flush the buffered events for a store into a single consolidated notification
   */
  public async processBatch(storeId: string, type: 'price_drop' | 'new_product'): Promise<number> {
    const bufferKey = `notif_buffer:store:${storeId}:type:${type}`;
    let rawItems: string[] = [];
    let memEvents: ProductBatchEvent[] = [];

    try {
      const redis = getRedis();
      rawItems = await redis.lrange(bufferKey, 0, -1);
      if (rawItems && rawItems.length > 0) {
        await redis.del(bufferKey);
      }
    } catch {
      // Redis unavailable
    }

    if (NotificationBatchService.inMemoryBuffers.has(bufferKey)) {
      memEvents = NotificationBatchService.inMemoryBuffers.get(bufferKey) || [];
      NotificationBatchService.inMemoryBuffers.delete(bufferKey);
    }

    const events: ProductBatchEvent[] = [
      ...rawItems.map((item) => JSON.parse(item) as ProductBatchEvent),
      ...memEvents,
    ];

    if (events.length === 0) {
      return 0;
    }
    const storeName = events[0]?.storeName || 'Boutique';

    // Deduplicate by productId, keeping latest price/entry
    const uniqueProductsMap = new Map<string, ProductBatchEvent>();
    for (const ev of events) {
      uniqueProductsMap.set(ev.productId, ev);
    }
    const uniqueItems = Array.from(uniqueProductsMap.values());
    const count = uniqueItems.length;

    if (count === 0) {
      return 0;
    }

    // Build consolidated alert
    const alert = this.formatConsolidatedAlert(storeName, type, uniqueItems);

    // Find all subscribers with preference enabled
    const prefCol = type === 'price_drop' ? 'notify_price_drops' : 'notify_new_products';
    const subRes = await query<{ buyer_id: string }>(
      `SELECT buyer_id FROM pd_store_subscription WHERE store_id = $1 AND ${prefCol} = TRUE`,
      [storeId]
    );

    const subscribers = subRes.rows;
    if (subscribers.length === 0) {
      logger.info({ storeId, type, itemsCount: count }, 'No matching subscribers for store notification batch');
      return 0;
    }

    // Insert notifications and emit via WebSockets
    const notifType = type === 'price_drop' ? 'store_price_drop' : 'store_new_product';
    const payloadData = {
      store_id: storeId,
      store_name: storeName,
      items_count: count,
      products: uniqueItems.slice(0, 10).map((p) => ({
        id: p.productId,
        title: p.productTitle,
        price: p.price,
        old_price: p.oldPrice,
      })),
    };

    const now = new Date();
    for (const sub of subscribers) {
      const notifId = pdId('notif');
      try {
        await query(
          `INSERT INTO pd_notifications (id, user_id, type, title, message, data, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
          [notifId, sub.buyer_id, notifType, alert.title, alert.message, JSON.stringify(payloadData)]
        );
      } catch (err) {
        logger.warn({ err, userId: sub.buyer_id }, 'Failed to persist in-app notification');
      }

      // Emit real-time WebSocket push
      socketGateway.emitToUser(sub.buyer_id, 'notification', {
        id: notifId,
        user_id: sub.buyer_id,
        type: notifType,
        title: alert.title,
        message: alert.message,
        data: payloadData,
        is_read: false,
        created_at: now.toISOString(),
      });
    }

    logger.info(
      { storeId, type, recipientsCount: subscribers.length, itemsCount: count },
      'Consolidated store notification batch dispatched'
    );
    return subscribers.length;
  }

  /**
   * Daily 7:00 PM Email Digest worker
   */
  public async dispatchDailyDigest(currentTime = new Date()): Promise<number> {
    // Find all buyers who follow stores
    const buyersRes = await query<{ buyer_id: string; email: string; first_name: string }>(
      `SELECT DISTINCT u.id AS buyer_id, u.email, u.first_name 
       FROM pd_user u
       JOIN pd_store_subscription s ON s.buyer_id = u.id
       WHERE u.email IS NOT NULL AND u.email != ''`
    );

    let sentCount = 0;
    for (const buyer of buyersRes.rows) {
      // Find top updates in last 24h from followed stores
      const updatesRes = await query<{
        store_id: string;
        store_name: string;
        product_id: string;
        product_title: string;
        price: number;
        compare_at_price?: number;
        created_at: Date;
      }>(
        `SELECT s.id AS store_id, s.name AS store_name, p.id AS product_id, p.title AS product_title, p.price, p.compare_at_price, p.created_at
         FROM pd_store_subscription sub
         JOIN pd_store s ON s.id = sub.store_id
         JOIN pd_product p ON p.store_id = s.id
         WHERE sub.buyer_id = $1 
           AND p.status = 'published'
           AND (p.updated_at >= $2::timestamptz - INTERVAL '24 hours' OR p.created_at >= $2::timestamptz - INTERVAL '24 hours')
         ORDER BY p.updated_at DESC
         LIMIT 6`,
        [buyer.buyer_id, currentTime]
      );

      if (updatesRes.rows.length > 0) {
        await emailQueue.add('daily-digest', {
          to: buyer.email,
          template: 'buyer_daily_followed_digest',
          subject: '🏷️ Vos nouveautés et baisses de prix du jour — PandaMarket',
          variables: {
            buyerName: buyer.first_name || 'Abonné',
            updatesCount: updatesRes.rows.length,
            products: updatesRes.rows,
          },
          scope: 'marketplace',
        });
        sentCount++;
      }
    }

    logger.info({ totalDigestsEnqueued: sentCount }, 'Daily email digest dispatched');
    return sentCount;
  }
}

export const notificationBatchService = new NotificationBatchService();

