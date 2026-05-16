/**
 * CreditsService — manages AI tokens for vendors.
 * Tokens are decremented per AI action (compress, SEO).
 * Plan quotas come from pd_subscription_limits; -1 means unlimited.
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import { PdNotFoundError, PdForbiddenError, PdErrorCode, PdValidationError } from '../errors';
import { IVendorCredits, WalletTransactionType } from '@pandamarket/types';
import { isUnlimited } from '../utils/plans';
import { logger } from '../utils/logger';
import { roundTnd } from '../utils/money';

interface CreditsRow {
  id: string;
  store_id: string;
  ai_tokens: number;
  tokens_used: number;
  last_refill: Date | null;
}

interface TokenPackRow {
  id: string;
  label: string;
  tokens: number;
  price_tnd: string;
  is_enabled: boolean;
  sort_order: number;
}

interface TokenPurchaseRow {
  id: string;
  store_id: string;
  pack_id: string | null;
  tokens: number;
  amount_tnd: string;
  status: string;
  payment_method: string;
  wallet_transaction_id: string | null;
  created_at: Date;
  completed_at: Date | null;
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

async function getPlanTokens(plan: string): Promise<number> {
  const { rows } = await query<{ ai_tokens_included: number }>(
    'SELECT ai_tokens_included FROM pd_subscription_limits WHERE plan_id = $1',
    [plan],
  );
  if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Plan not found');
  return rows[0].ai_tokens_included;
}

export class CreditsService {
  async listTokenPacks(): Promise<Array<{ id: string; label: string; tokens: number; price_tnd: number }>> {
    const { rows } = await query<TokenPackRow>(
      `SELECT * FROM pd_ai_token_pack
       WHERE is_enabled = true
       ORDER BY sort_order ASC, tokens ASC`,
    );
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      tokens: row.tokens,
      price_tnd: parseFloat(row.price_tnd),
    }));
  }

  async listPurchases(storeId: string, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, opts.limit ?? 10);
    const offset = (page - 1) * limit;
    const { rows } = await query<TokenPurchaseRow & { pack_label: string | null }>(
      `SELECT p.*, pack.label AS pack_label
       FROM pd_ai_token_purchase p
       LEFT JOIN pd_ai_token_pack pack ON pack.id = p.pack_id
       WHERE p.store_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [storeId, limit, offset],
    );
    const { rows: countRows } = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM pd_ai_token_purchase WHERE store_id = $1',
      [storeId],
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);
    return {
      data: rows.map((row) => ({
        id: row.id,
        pack_id: row.pack_id,
        pack_label: row.pack_label,
        tokens: row.tokens,
        amount_tnd: parseFloat(row.amount_tnd),
        status: row.status,
        payment_method: row.payment_method,
        created_at: row.created_at.toISOString(),
        completed_at: row.completed_at ? row.completed_at.toISOString() : null,
      })),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async buyPackFromWallet(storeId: string, packId: string): Promise<{ credits: IVendorCredits; purchase: unknown }> {
    return transaction(async (c) => {
      const { rows: packRows } = await c.query<TokenPackRow>(
        'SELECT * FROM pd_ai_token_pack WHERE id = $1 AND is_enabled = true',
        [packId],
      );
      const pack = packRows[0];
      if (!pack) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'AI token pack not found');

      const { rows: creditRows } = await c.query<CreditsRow>(
        'SELECT * FROM pd_vendor_credits WHERE store_id = $1 FOR UPDATE',
        [storeId],
      );
      const currentCredits = creditRows[0];
      if (!currentCredits) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Credits not found');
      if (isUnlimited(currentCredits.ai_tokens)) {
        throw new PdValidationError('Your plan already includes unlimited AI tokens');
      }

      const { rows: walletRows } = await c.query<{ id: string; balance: string }>(
        'SELECT id, balance::text FROM pd_vendor_wallet WHERE store_id = $1 FOR UPDATE',
        [storeId],
      );
      const wallet = walletRows[0];
      if (!wallet) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found');

      const price = roundTnd(parseFloat(pack.price_tnd));
      const walletBalance = roundTnd(parseFloat(wallet.balance));
      if (walletBalance < price) {
        throw new PdValidationError('Insufficient wallet balance', {
          code: PdErrorCode.WALLET_INSUFFICIENT_FUNDS,
          required: price,
          available: walletBalance,
        });
      }

      const nextBalance = roundTnd(walletBalance - price);
      await c.query('UPDATE pd_vendor_wallet SET balance = $2 WHERE id = $1', [wallet.id, nextBalance]);
      const walletTxId = pdId('wtx');
      await c.query(
        `INSERT INTO pd_wallet_transaction
          (id, wallet_id, type, amount, balance_after, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          walletTxId,
          wallet.id,
          WalletTransactionType.AddonPurchase,
          -price,
          nextBalance,
          `AI token pack purchase: ${pack.label}`,
          JSON.stringify({ pack_id: pack.id, tokens: pack.tokens }),
        ],
      );

      const purchaseId = pdId('aitokbuy');
      const { rows: purchaseRows } = await c.query<TokenPurchaseRow>(
        `INSERT INTO pd_ai_token_purchase
          (id, store_id, pack_id, tokens, amount_tnd, status, payment_method, wallet_transaction_id, completed_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', 'wallet', $6, NOW())
         RETURNING *`,
        [purchaseId, storeId, pack.id, pack.tokens, price, walletTxId],
      );

      const { rows: updatedRows } = await c.query<CreditsRow>(
        `UPDATE pd_vendor_credits
         SET ai_tokens = ai_tokens + $2,
             last_refill = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [currentCredits.id, pack.tokens],
      );
      logger.info({ store_id: storeId, pack_id: pack.id, tokens: pack.tokens }, 'AI token pack purchased');
      return {
        credits: rowToCredits(updatedRows[0]),
        purchase: {
          id: purchaseRows[0].id,
          pack_id: purchaseRows[0].pack_id,
          tokens: purchaseRows[0].tokens,
          amount_tnd: parseFloat(purchaseRows[0].amount_tnd),
          status: purchaseRows[0].status,
          payment_method: purchaseRows[0].payment_method,
          created_at: purchaseRows[0].created_at.toISOString(),
          completed_at: purchaseRows[0].completed_at ? purchaseRows[0].completed_at.toISOString() : null,
        },
      };
    });
  }

  /**
   * Bootstrap a credits row when a store is created.
   * Initial tokens = plan default (or -1 for unlimited plans).
   */
  async create(storeId: string, plan: string, client?: PoolClient): Promise<IVendorCredits> {
    const id = pdId('credits');
    const initial = await getPlanTokens(plan);
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
    const { rows } = await query<CreditsRow & { plan_tokens: number }>(
      `SELECT vc.*, l.ai_tokens_included AS plan_tokens
       FROM pd_vendor_credits vc
       JOIN pd_store s ON s.id = vc.store_id
       JOIN pd_subscription_limits l ON l.plan_id = s.subscription_plan
       WHERE vc.store_id = $1`,
      [storeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Credits not found');
    if (rows[0].ai_tokens === -1 && rows[0].plan_tokens !== -1) {
      const { rows: syncedRows } = await query<CreditsRow>(
        `UPDATE pd_vendor_credits
         SET ai_tokens = $2,
             last_refill = NOW(),
             updated_at = NOW()
         WHERE store_id = $1
         RETURNING *`,
        [storeId, rows[0].plan_tokens],
      );
      logger.info({ store_id: storeId, ai_tokens: rows[0].plan_tokens }, 'AI credits synchronized with plan quota');
      return rowToCredits(syncedRows[0]);
    }
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
  async setForPlan(storeId: string, plan: string, client?: PoolClient): Promise<void> {
    const tokens = await getPlanTokens(plan);
    const sql = `UPDATE pd_vendor_credits
                 SET ai_tokens = $2, last_refill = NOW()
                 WHERE store_id = $1`;
    const params = [storeId, tokens];
    if (client) await client.query(sql, params);
    else await query(sql, params);
  }

  async syncForPlan(plan: string, tokens: number, client?: PoolClient): Promise<number> {
    const sql = `UPDATE pd_vendor_credits vc
                 SET ai_tokens = $2,
                     last_refill = NOW(),
                     updated_at = NOW()
                 FROM pd_store s
                 WHERE s.id = vc.store_id
                   AND s.subscription_plan = $1`;
    const params = [plan, tokens];
    const result = client ? await client.query(sql, params) : await query(sql, params);
    logger.info({ plan, tokens, affected: result.rowCount ?? 0 }, 'AI credits synchronized for subscription plan');
    return result.rowCount ?? 0;
  }
}

export const creditsService = new CreditsService();
