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

export interface ProductBatchEvent {
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

export class NotificationBatchService {
  public static readonly BUFFER_TTL_SECONDS = 15 * 60; // 15 minutes

  /**
   * Record a product price drop or new arrival into the store's 15-minute sliding buffer
   */
  public async recordEvent(event: ProductBatchEvent): Promise<void> {
    const redis = getRedis();
    const bufferKey = `notif_buffer:store:${event.storeId}:type:${event.type}`;
    const jobId = `batch:${event.storeId}:${event.type}`;

    try {
      // 1. Push event to Redis buffer with 15-min TTL
      await redis.rpush(bufferKey, JSON.stringify(event));
      await redis.expire(bufferKey, NotificationBatchService.BUFFER_TTL_SECONDS);

      // 2. Schedule or replace delayed job (15 min from now)
      const existingJob = await notificationBatchQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
      }

      await notificationBatchQueue.add(
        'process-store-batch',
        event,
        {
          jobId,
          delay: NotificationBatchService.BUFFER_TTL_SECONDS * 1000,
        }
      );

      logger.info({ storeId: event.storeId, type: event.type, productId: event.productId }, 'Product batch event recorded');
    } catch (err) {
      logger.error({ err, event }, 'Failed to record notification batch event');
    }
  }

  /**
   * Process and flush the buffered events for a store into a single consolidated notification
   */
  public async processBatch(storeId: string, type: 'price_drop' | 'new_product'): Promise<number> {
    const redis = getRedis();
    const bufferKey = `notif_buffer:store:${storeId}:type:${type}`;

    const rawItems = await redis.lrange(bufferKey, 0, -1);
    if (!rawItems || rawItems.length === 0) {
      return 0;
    }

    // Clear buffer
    await redis.del(bufferKey);

    const events: ProductBatchEvent[] = rawItems.map((item) => JSON.parse(item));
    const storeName = events[0]?.storeName || 'Boutique';

    // Deduplicate by productId, keeping latest price
    const uniqueProductsMap = new Map<string, ProductBatchEvent>();
    for (const ev of events) {
      uniqueProductsMap.set(ev.productId, ev);
    }
    const uniqueItems = Array.from(uniqueProductsMap.values());
    const count = uniqueItems.length;

    // Build consolidated message
    let title = '';
    let message = '';

    if (type === 'price_drop') {
      if (count === 1) {
        title = `🏷️ Baisse de prix chez ${storeName}`;
        message = `${storeName} a baissé le prix de « ${uniqueItems[0].productTitle} » à ${uniqueItems[0].price} TND !`;
      } else {
        title = `🏷️ ${count} baisses de prix chez ${storeName}`;
        message = `${storeName} a baissé le prix de ${count} articles ! Ne manquez pas ces offres exclusives.`;
      }
    } else {
      if (count === 1) {
        title = `✨ Nouveauté chez ${storeName}`;
        message = `${storeName} a publié un nouveau produit : « ${uniqueItems[0].productTitle} » à ${uniqueItems[0].price} TND !`;
      } else {
        title = `✨ ${count} nouveaux produits chez ${storeName}`;
        message = `${storeName} a ajouté ${count} nouveaux articles à son catalogue ! Venez les découvrir.`;
      }
    }

    // Find all subscribers with preference enabled
    const prefCol = type === 'price_drop' ? 'notify_price_drops' : 'notify_new_products';
    const subRes = await query<{ buyer_id: string }>(
      `SELECT buyer_id FROM pd_store_subscription WHERE store_id = $1 AND ${prefCol} = TRUE`,
      [storeId]
    );

    const subscribers = subRes.rows;
    if (subscribers.length === 0) {
      return 0;
    }

    // Insert notifications and emit via WebSockets
    const notifType = type === 'price_drop' ? 'store_price_drop' : 'store_new_product';
    const payloadData = {
      store_id: storeId,
      store_name: storeName,
      items_count: count,
      products: uniqueItems.slice(0, 5).map((p) => ({
        id: p.productId,
        title: p.productTitle,
        price: p.price,
        old_price: p.oldPrice,
      })),
    };

    for (const sub of subscribers) {
      const notifId = pdId('notif');
      await query(
        `INSERT INTO pd_notifications (id, user_id, type, title, message, data, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())`,
        [notifId, sub.buyer_id, notifType, title, message, JSON.stringify(payloadData)]
      );

      // Emit real-time WebSocket push
      socketGateway.emitToUser(sub.buyer_id, 'notification', {
        id: notifId,
        user_id: sub.buyer_id,
        type: notifType,
        title,
        message,
        data: payloadData,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }

    logger.info({ storeId, type, recipientsCount: subscribers.length, itemsCount: count }, 'Consolidated notification dispatched');
    return subscribers.length;
  }

  /**
   * Daily 7:00 PM Email Digest worker
   */
  public async dispatchDailyDigest(): Promise<number> {
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
           AND (p.updated_at >= NOW() - INTERVAL '24 hours' OR p.created_at >= NOW() - INTERVAL '24 hours')
         ORDER BY p.updated_at DESC
         LIMIT 6`,
        [buyer.buyer_id]
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

    logger.info({ totalDigestsEnqueued: sentCount }, 'Daily digest dispatched');
    return sentCount;
  }
}

export const notificationBatchService = new NotificationBatchService();
