import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { emailQueue } from '../queues/email-queue';

export interface AbandonedCartRow {
  id: string;
  customer_email: string | null;
  customer_phone: string | null;
  user_id: string | null;
  items: any;
  updated_at: Date;
}

export class CartRecoveryService {
  /**
   * Scans active abandoned carts and dispatches sequence step 1 (2h reminder)
   * or sequence step 2 (24h reminder with incentive coupon).
   */
  async detectAndDispatchRecovery(): Promise<{ step1Dispatched: number; step2Dispatched: number }> {
    let step1Count = 0;
    let step2Count = 0;

    // 1. Process Step 1: Abandoned between 2h and 24h ago with no step 1 recovery sent
    const { rows: step1Carts } = await query<AbandonedCartRow>(
      `SELECT c.id, c.customer_email, c.customer_phone, c.user_id, c.items, c.updated_at
       FROM pd_cart c
       WHERE (c.customer_email IS NOT NULL OR c.customer_phone IS NOT NULL)
         AND c.items IS NOT NULL
         AND jsonb_array_length(CASE WHEN jsonb_typeof(c.items::jsonb) = 'array' THEN c.items::jsonb ELSE '[]'::jsonb END) > 0
         AND c.updated_at < NOW() - INTERVAL '2 hours'
         AND c.updated_at >= NOW() - INTERVAL '24 hours'
         AND NOT EXISTS (
           SELECT 1 FROM pd_cart_recovery_log l
           WHERE l.cart_id = c.id AND l.sequence_step = 1
         )
       LIMIT 50`,
    );

    for (const cart of step1Carts) {
      const recipient = cart.customer_email || cart.customer_phone;
      if (!recipient) continue;

      const channel = cart.customer_email ? 'email' : 'sms';

      await transaction(async (client) => {
        await client.query(
          `INSERT INTO pd_cart_recovery_log (id, cart_id, sequence_step, channel, recipient, dispatched_at)
           VALUES ($1, $2, 1, $3, $4, NOW())`,
          [pdId('carl'), cart.id, channel, recipient],
        );

        if (cart.customer_email) {
          await emailQueue.add('abandoned_cart_reminder_step1', {
            to: cart.customer_email,
            template: 'abandoned_cart_reminder',
            variables: {
              cart_id: cart.id,
              restore_url: `https://pandamarket.tn/cart?restore=${cart.id}`,
            },
          });
        }
      });

      step1Count++;
    }

    // 2. Process Step 2: Abandoned > 24h ago with step 1 sent but no step 2 sent
    const { rows: step2Carts } = await query<AbandonedCartRow>(
      `SELECT c.id, c.customer_email, c.customer_phone, c.user_id, c.items, c.updated_at
       FROM pd_cart c
       WHERE (c.customer_email IS NOT NULL OR c.customer_phone IS NOT NULL)
         AND c.updated_at < NOW() - INTERVAL '24 hours'
         AND EXISTS (
           SELECT 1 FROM pd_cart_recovery_log l1
           WHERE l1.cart_id = c.id AND l1.sequence_step = 1
         )
         AND NOT EXISTS (
           SELECT 1 FROM pd_cart_recovery_log l2
           WHERE l2.cart_id = c.id AND l2.sequence_step = 2
         )
       LIMIT 50`,
    );

    for (const cart of step2Carts) {
      const recipient = cart.customer_email || cart.customer_phone;
      if (!recipient) continue;

      const channel = cart.customer_email ? 'email' : 'sms';

      await transaction(async (client) => {
        await client.query(
          `INSERT INTO pd_cart_recovery_log (id, cart_id, sequence_step, channel, recipient, dispatched_at)
           VALUES ($1, $2, 2, $3, $4, NOW())`,
          [pdId('carl'), cart.id, channel, recipient],
        );

        if (cart.customer_email) {
          await emailQueue.add('abandoned_cart_reminder_step2', {
            to: cart.customer_email,
            template: 'abandoned_cart_discount',
            variables: {
              cart_id: cart.id,
              coupon_code: 'REVIENS5',
              discount_percent: '5%',
              restore_url: `https://pandamarket.tn/cart?restore=${cart.id}&coupon=REVIENS5`,
            },
          });
        }
      });

      step2Count++;
    }

    logger.info(
      { step1Count, step2Count },
      `[CartRecovery] Processed abandoned cart recovery sequences.`,
    );

    return { step1Dispatched: step1Count, step2Dispatched: step2Count };
  }
}

export const cartRecoveryService = new CartRecoveryService();
