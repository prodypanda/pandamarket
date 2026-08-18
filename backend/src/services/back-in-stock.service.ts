/**
 * Product Back-In-Stock Alert Engine — Feature 20 (R5)
 *
 * Handles:
 * - Customer registration for restock alerts on out-of-stock items
 * - Automated notification dispatch when stock transitions from 0 to > 0
 * - In-app notification, realtime websocket event, and email notification
 */

import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdValidationError, PdNotFoundError } from '../errors';
import { socketGateway } from '../realtime/socket-gateway';

export interface BackInStockSubscription {
  id: string;
  product_id: string;
  store_id: string;
  buyer_id?: string | null;
  email: string;
  status: 'pending' | 'notified' | 'cancelled';
  created_at: string;
  notified_at?: string | null;
}

export class BackInStockService {
  /**
   * Subscribe an email / user to restock alerts for a product
   */
  public async subscribeAlert(
    productId: string,
    email: string,
    buyerId?: string | null
  ): Promise<{ success: boolean; alert_id: string; message: string }> {
    if (!productId || !productId.trim()) {
      throw new PdValidationError('Product ID is required');
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new PdValidationError('Valid email address is required');
    }

    // Verify product exists and get store_id
    const prodRes = await query<{
      id: string;
      title: string;
      store_id: string;
      inventory_quantity: number;
    }>(
      `SELECT id, title, store_id, inventory_quantity 
       FROM pd_product 
       WHERE id = $1`,
      [productId]
    );

    if (prodRes.rows.length === 0) {
      throw new PdNotFoundError(`Product '${productId}' not found`);
    }

    const product = prodRes.rows[0];
    const alertId = pdId('bisa');

    await query(
      `INSERT INTO pd_product_back_in_stock_alert (
        id, product_id, store_id, buyer_id, email, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      ON CONFLICT (product_id, email) DO UPDATE
      SET status = 'pending',
          buyer_id = COALESCE(EXCLUDED.buyer_id, pd_product_back_in_stock_alert.buyer_id),
          updated_at = NOW()`,
      [alertId, product.id, product.store_id, buyerId || null, cleanEmail]
    );

    logger.info({ productId, email: cleanEmail, buyerId }, 'Customer subscribed to back-in-stock alert');

    return {
      success: true,
      alert_id: alertId,
      message: 'Vous serez alerté dès le retour en stock de cet article !',
    };
  }

  /**
   * Get alert status for a given product and user/email
   */
  public async getAlertStatus(
    productId: string,
    email?: string | null,
    buyerId?: string | null
  ): Promise<{ subscribed: boolean; status?: string }> {
    if (!productId) return { subscribed: false };

    let res;
    if (buyerId) {
      res = await query<{ status: string }>(
        `SELECT status FROM pd_product_back_in_stock_alert 
         WHERE product_id = $1 AND (buyer_id = $2 OR email = $3)
         ORDER BY updated_at DESC LIMIT 1`,
        [productId, buyerId, email?.toLowerCase() || '']
      );
    } else if (email) {
      res = await query<{ status: string }>(
        `SELECT status FROM pd_product_back_in_stock_alert 
         WHERE product_id = $1 AND email = $2
         ORDER BY updated_at DESC LIMIT 1`,
        [productId, email.trim().toLowerCase()]
      );
    } else {
      return { subscribed: false };
    }

    if (res.rows.length > 0 && res.rows[0].status === 'pending') {
      return { subscribed: true, status: res.rows[0].status };
    }

    return { subscribed: false };
  }

  /**
   * Unsubscribe from restock alerts
   */
  public async unsubscribeAlert(
    productId: string,
    email?: string | null,
    buyerId?: string | null
  ): Promise<{ success: boolean }> {
    if (!productId) return { success: false };

    if (buyerId) {
      await query(
        `UPDATE pd_product_back_in_stock_alert 
         SET status = 'cancelled', updated_at = NOW()
         WHERE product_id = $1 AND (buyer_id = $2 OR email = $3)`,
        [productId, buyerId, email?.toLowerCase() || '']
      );
    } else if (email) {
      await query(
        `UPDATE pd_product_back_in_stock_alert 
         SET status = 'cancelled', updated_at = NOW()
         WHERE product_id = $1 AND email = $2`,
        [productId, email.trim().toLowerCase()]
      );
    }

    return { success: true };
  }

  /**
   * Triggered when product stock transitions from 0 to > 0.
   * Dispatches alerts to all waiting subscribers.
   */
  public async notifySubscribersOnRestock(
    productId: string,
    newStock: number
  ): Promise<{ notified_count: number }> {
    if (newStock <= 0) return { notified_count: 0 };

    // Get pending alert recipients
    const alertsRes = await query<{
      id: string;
      product_id: string;
      store_id: string;
      buyer_id: string | null;
      email: string;
    }>(
      `SELECT id, product_id, store_id, buyer_id, email 
       FROM pd_product_back_in_stock_alert 
       WHERE product_id = $1 AND status = 'pending'`,
      [productId]
    );

    if (alertsRes.rows.length === 0) {
      return { notified_count: 0 };
    }

    // Get product and store details
    const prodRes = await query<{
      title: string;
      price: number;
      thumbnail: string | null;
      store_name: string;
    }>(
      `SELECT p.title, p.price, p.thumbnail, s.name as store_name
       FROM pd_product p
       JOIN pd_store s ON s.id = p.store_id
       WHERE p.id = $1`,
      [productId]
    );

    const productInfo = prodRes.rows[0] || {
      title: 'Votre produit favori',
      price: 0,
      thumbnail: null,
      store_name: 'La boutique',
    };

    const notifTitle = `🎉 Réassort : ${productInfo.title} est de retour en stock !`;
    const notifMessage = `Bonne nouvelle ! ${productInfo.title} chez ${productInfo.store_name} est de nouveau disponible. Commandez avant rupture !`;

    let notifiedCount = 0;

    for (const alert of alertsRes.rows) {
      try {
        if (alert.buyer_id) {
          const notifId = pdId('notif');
          const payloadData = {
            product_id: productId,
            store_id: alert.store_id,
            store_name: productInfo.store_name,
            product_title: productInfo.title,
            product_thumbnail: productInfo.thumbnail,
            price: productInfo.price,
            event_type: 'back_in_stock',
          };

          await query(
            `INSERT INTO pd_notifications (id, user_id, type, title, message, data, is_read, created_at)
             VALUES ($1, $2, 'back_in_stock', $3, $4, $5, FALSE, NOW())`,
            [notifId, alert.buyer_id, notifTitle, notifMessage, JSON.stringify(payloadData)]
          );

          socketGateway.emitToUser(alert.buyer_id, 'notification', {
            id: notifId,
            user_id: alert.buyer_id,
            type: 'back_in_stock',
            title: notifTitle,
            message: notifMessage,
            data: payloadData,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }

        notifiedCount++;
      } catch (err) {
        logger.warn({ err, alertId: alert.id }, 'Failed to dispatch back-in-stock alert');
      }
    }

    // Mark alerts as notified
    await query(
      `UPDATE pd_product_back_in_stock_alert 
       SET status = 'notified', notified_at = NOW(), updated_at = NOW()
       WHERE product_id = $1 AND status = 'pending'`,
      [productId]
    );

    logger.info({ productId, notifiedCount }, 'Back-in-stock alerts dispatched successfully');

    return { notified_count: notifiedCount };
  }
}

export const backInStockService = new BackInStockService();
