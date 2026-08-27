import { query, transaction } from '../db/pool';
import { encrypt, decrypt, pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdValidationError } from '../errors';

export interface SerialKeyRow {
  id: string;
  product_id: string;
  key_ciphertext: string;
  is_assigned: boolean;
  order_id: string | null;
  assigned_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DecryptedSerialKey {
  id: string;
  product_id: string;
  key: string;
  assigned_at: Date | null;
}

export class DigitalKeyService {
  /**
   * Add a batch of license keys to the product's available key pool.
   */
  async addKeys(productId: string, rawKeys: string[]): Promise<{ added: number }> {
    const cleanedKeys = rawKeys.map((k) => k.trim()).filter((k) => k.length > 0);
    if (cleanedKeys.length === 0) {
      throw new PdValidationError('No valid license keys provided');
    }

    let added = 0;
    for (const key of cleanedKeys) {
      const encryptedKey = encrypt(key);
      await query(
        `INSERT INTO pd_serial_key (id, product_id, key_ciphertext, is_assigned, created_at, updated_at)
         VALUES ($1, $2, $3, false, NOW(), NOW())`,
        [pdId('key'), productId, encryptedKey],
      );
      added++;
    }

    // Update product stock quantity according to unassigned pool count
    await query(
      `UPDATE pd_product
       SET inventory_quantity = (
         SELECT COUNT(*)::int FROM pd_serial_key WHERE product_id = $1 AND is_assigned = false
       ),
       updated_at = NOW()
       WHERE id = $1`,
      [productId],
    );

    logger.info({ productId, count: added }, 'Added license keys to digital pool');
    return { added };
  }

  /**
   * Automatically assign keys for digital products present in an order upon payment capture.
   */
  async assignKeysForOrder(orderId: string): Promise<number> {
    return transaction(async (client) => {
      // Find order items that have available serial keys
      const { rows: items } = await client.query<{ product_id: string; quantity: number }>(
        `SELECT oi.product_id, oi.quantity
         FROM pd_order_item oi
         JOIN pd_product p ON p.id = oi.product_id
         WHERE oi.order_id = $1`,
        [orderId],
      );

      let totalAssigned = 0;

      for (const item of items) {
        const { rows: availableKeys } = await client.query<{ id: string }>(
          `SELECT id FROM pd_serial_key
           WHERE product_id = $1 AND is_assigned = false
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT $2`,
          [item.product_id, item.quantity],
        );

        if (availableKeys.length > 0) {
          const keyIds = availableKeys.map((k) => k.id);
          await client.query(
            `UPDATE pd_serial_key
             SET is_assigned = true,
                 order_id = $1,
                 assigned_at = NOW(),
                 updated_at = NOW()
             WHERE id = ANY($2::text[])`,
            [orderId, keyIds],
          );

          totalAssigned += keyIds.length;

          // Update stock count
          await client.query(
            `UPDATE pd_product
             SET inventory_quantity = (
               SELECT COUNT(*)::int FROM pd_serial_key WHERE product_id = $1 AND is_assigned = false
             ),
             updated_at = NOW()
             WHERE id = $1`,
            [item.product_id],
          );
        }
      }

      logger.info({ orderId, totalAssigned }, 'Assigned digital license keys for order');
      return totalAssigned;
    });
  }

  /**
   * Retrieve and decrypt assigned license keys for a given order.
   */
  async getKeysForOrder(orderId: string): Promise<DecryptedSerialKey[]> {
    const { rows } = await query<SerialKeyRow>(
      `SELECT * FROM pd_serial_key WHERE order_id = $1 ORDER BY assigned_at ASC`,
      [orderId],
    );

    return rows.map((row) => {
      let decryptedKey = '***';
      try {
        decryptedKey = decrypt(row.key_ciphertext);
      } catch (err) {
        logger.error({ err, keyId: row.id }, 'Failed to decrypt license key');
      }

      return {
        id: row.id,
        product_id: row.product_id,
        key: decryptedKey,
        assigned_at: row.assigned_at,
      };
    });
  }
}

export const digitalKeyService = new DigitalKeyService();
