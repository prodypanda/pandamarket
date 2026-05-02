/**
 * CreditsService — manages AI tokens for vendors.
 * Tokens are decremented per AI action (compress, SEO).
 * Plans Pro+ get unlimited tokens (-1).
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdNotFoundError, PdForbiddenError, PdErrorCode } from '../errors';
import { IVendorCredits, SubscriptionPlan } from '@pandamarket/types';
import { isUnlimited, PLAN_DEFAULTS } from '../utils/plans';
import { logger } from '../utils/logger';

interface CreditsRow {
  id: string;
  store_id: string;
  ai_tokens: number;
  tokens_used: number;
  last_refill: Date | null;
}

function rowToCredits(r: CreditsRow): IVendorCredits {
  return {
    id: r.id,
    store_id: r.store_id,
    ai_tokens: r.ai_tokens,
    tokens_used: r.tokens_used,
    last_refill: r.last_refill ? r.last_refill.toISOString() : null,
  };
}

export class CreditsService {
  /**
   * Bootstrap a credits row when a store is created.
   * Initial tokens = plan default (or -1 for unlimited plans).
   */
  async create(storeId: string, plan: SubscriptionPlan, client?: PoolClient): Promise<IVendorCredits> {
    const id = pdId('credits');
    const initial = PLAN_DEFAULTS[plan].ai_tokens_included;
    const sql = `INSERT INTO pd_vendor_credits
                   (id, store_id, ai_tokens, last_refill)
                 VALUES ($1, $2, $3, NOW()) RETURNING *`;
    const params = [id, storeId, initial];
    const result = client
      ? await client.query<CreditsRow>(sql, params)
      : await query<CreditsRow>(sql, params);
    return rowToCredits(result.rows[0]);
  }

  async getByStore(storeId: string): Promise<IVendorCredits> {
    const { rows } = await query<CreditsRow>(
      'SELECT * FROM pd_vendor_credits WHERE store_id = $1',
      [storeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Credits not found');
    return rowToCredits(rows[0]);
  }

  /**
   * Throw if the vendor doesn't have enough tokens.
   * Returns immediately for unlimited plans.
   */
  async assertEnough(storeId: string, required: number): Promise<void> {
    const credits = await this.getByStore(storeId);
    if (isUnlimited(credits.ai_tokens)) return;
    if (credits.ai_tokens < required) {
      throw new PdForbiddenError(
        PdErrorCode.AI_INSUFFICIENT_TOKENS,
        'Insufficient AI tokens',
        { required, available: credits.ai_tokens },
      );
    }
  }

  /**
   * Decrement tokens atomically. No-op if unlimited.
   */
  async consume(storeId: string, amount: number): Promise<IVendorCredits> {
    return transaction(async (c) => {
      const { rows } = await c.query<CreditsRow>(
        'SELECT * FROM pd_vendor_credits WHERE store_id = $1 FOR UPDATE',
        [storeId],
      );
      const credits = rows[0];
      if (!credits) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Credits not found');
      if (isUnlimited(credits.ai_tokens)) {
        // unlimited: just track usage
        await c.query(
          `UPDATE pd_vendor_credits SET tokens_used = tokens_used + $2 WHERE id = $1`,
          [credits.id, amount],
        );
        return rowToCredits({ ...credits, tokens_used: credits.tokens_used + amount });
      }
      if (credits.ai_tokens < amount) {
        throw new PdForbiddenError(
          PdErrorCode.AI_INSUFFICIENT_TOKENS,
          'Insufficient AI tokens',
          { required: amount, available: credits.ai_tokens },
        );
      }
      const updated = await c.query<CreditsRow>(
        `UPDATE pd_vendor_credits
         SET ai_tokens   = ai_tokens   - $2,
             tokens_used = tokens_used + $2
         WHERE id = $1 RETURNING *`,
        [credits.id, amount],
      );
      logger.info({ store_id: storeId, consumed: amount }, 'AI tokens consumed');
      return rowToCredits(updated.rows[0]);
    });
  }

  /**
   * Refill tokens (e.g. after the vendor buys a pack or monthly reset).
   * If the wallet is unlimited (-1) this is a no-op.
   */
  async refill(storeId: string, amount: number): Promise<IVendorCredits> {
    const { rows } = await query<CreditsRow>(
      `UPDATE pd_vendor_credits
       SET ai_tokens = CASE WHEN ai_tokens = -1 THEN -1 ELSE ai_tokens + $2 END,
           last_refill = NOW()
       WHERE store_id = $1 RETURNING *`,
      [storeId, amount],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Credits not found');
    logger.info({ store_id: storeId, amount }, 'AI tokens refilled');
    return rowToCredits(rows[0]);
  }

  /**
   * Set the token quota explicitly (used after plan upgrade/downgrade).
   */
  async setForPlan(storeId: string, plan: SubscriptionPlan, client?: PoolClient): Promise<void> {
    const tokens = PLAN_DEFAULTS[plan].ai_tokens_included;
    const sql = `UPDATE pd_vendor_credits
                 SET ai_tokens = $2, last_refill = NOW()
                 WHERE store_id = $1`;
    const params = [storeId, tokens];
    if (client) await client.query(sql, params);
    else await query(sql, params);
  }
}

export const creditsService = new CreditsService();
