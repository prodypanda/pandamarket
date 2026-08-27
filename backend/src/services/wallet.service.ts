/**
 * WalletService — vendor wallet operations.
 * - Credits funds (with retention) when payments are captured.
 * - Releases pending → available after retention period.
 * - Processes withdrawals (debit balance, create transaction).
 */

import { PoolClient } from 'pg';
import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  PdNotFoundError,
  PdValidationError,
  PdErrorCode,
} from '../errors';
import {
  IVendorWallet,
  PayoutMode,
  WalletTransactionType,
} from '@pandamarket/types';
import { roundTnd } from '../utils/money';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface WalletRow {
  id: string;
  store_id: string;
  balance: string;
  pending_balance: string;
  total_earned: string;
  total_withdrawn: string;
  payout_mode: PayoutMode;
  retention_days: number;
  currency: string;
}

export interface WalletTransactionRow {
  id: string;
  wallet_id: string;
  type: WalletTransactionType | string;
  amount: string;
  balance_after: string;
  description: string | null;
  metadata?: any;
  created_at: Date;
}

function rowToWallet(r: WalletRow): IVendorWallet {
  return {
    id: r.id,
    store_id: r.store_id,
    balance: parseFloat(r.balance),
    pending_balance: parseFloat(r.pending_balance),
    total_earned: parseFloat(r.total_earned),
    total_withdrawn: parseFloat(r.total_withdrawn),
    payout_mode: r.payout_mode,
    retention_days: r.retention_days,
    currency: r.currency,
  };
}

export class WalletService {
  /**
   * Bootstrap a wallet for a new store.
   */
  async create(storeId: string, client?: PoolClient): Promise<IVendorWallet> {
    const id = pdId('wallet');
    const sql = `INSERT INTO pd_vendor_wallet (id, store_id, retention_days)
                 VALUES ($1, $2, $3) RETURNING *`;
    const params = [id, storeId, config.defaultRetentionDays];
    const result = client
      ? await client.query<WalletRow>(sql, params)
      : await query<WalletRow>(sql, params);
    return rowToWallet(result.rows[0]);
  }

  async getByStore(storeId: string): Promise<IVendorWallet> {
    const { rows } = await query<WalletRow>(
      'SELECT * FROM pd_vendor_wallet WHERE store_id = $1',
      [storeId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found', { store_id: storeId });
    }
    return rowToWallet(rows[0]);
  }

  /**
   * Credit funds to the wallet's pending_balance.
   * After `retention_days` they will be moved to `balance` by a background job.
   *
   * `retention_days` (optional) overrides the wallet's default retention period.
   * Callers should pass the per-payment-method retention from platform config
   * so the correct release date is applied per transaction.
   */
  async creditPending(opts: {
    store_id: string;
    amount: number;
    order_id?: string;
    description?: string;
    retention_days?: number;
    client?: PoolClient;
  }): Promise<void> {
    const amount = roundTnd(opts.amount);
    if (amount <= 0) {
      throw new PdValidationError('Amount must be positive');
    }
    const exec = opts.client ?? null;
    const inner = async (c: PoolClient) => {
      const { rows } = await c.query<WalletRow>(
        'SELECT * FROM pd_vendor_wallet WHERE store_id = $1 FOR UPDATE',
        [opts.store_id],
      );
      const wallet = rows[0];
      if (!wallet) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found');

      const retentionDays =
        opts.retention_days && opts.retention_days > 0
          ? opts.retention_days
          : wallet.retention_days;
      const availableAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

      await c.query(
        `UPDATE pd_vendor_wallet
         SET pending_balance = pending_balance + $2,
             total_earned    = total_earned    + $2,
             retention_days  = $3
         WHERE id = $1`,
        [wallet.id, amount, retentionDays],
      );
      await c.query(
        `INSERT INTO pd_wallet_transaction
          (id, wallet_id, type, amount, order_id, description, available_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          pdId('wtx'),
          wallet.id,
          WalletTransactionType.Sale,
          amount,
          opts.order_id ?? null,
          opts.description ?? `Sale credited (pending ${retentionDays}d)`,
          availableAt,
        ],
      );
    };

    if (exec) await inner(exec);
    else await transaction(inner);
  }

  /**
   * Move pending → available for any wallet whose available_at has passed.
   * Called by a periodic background job.
   */
  async releaseDueFunds(): Promise<number> {
    const result = await transaction(async (c) => {
      const { rows: dueTx } = await c.query<{
        id: string;
        wallet_id: string;
        amount: string;
      }>(
        `SELECT id, wallet_id, amount
         FROM pd_wallet_transaction
         WHERE type = 'sale'
           AND available_at IS NOT NULL
           AND available_at <= NOW()
           AND metadata->>'released' IS NULL
         FOR UPDATE`,
      );
      if (dueTx.length === 0) return 0;

      for (const tx of dueTx) {
        const amt = parseFloat(tx.amount);
        await c.query(
          `UPDATE pd_vendor_wallet
           SET balance         = balance + $2,
               pending_balance = pending_balance - $2
           WHERE id = $1`,
          [tx.wallet_id, amt],
        );
        await c.query(
          `UPDATE pd_wallet_transaction
           SET metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{released}', 'true'::jsonb)
           WHERE id = $1`,
          [tx.id],
        );
      }
      return dueTx.length;
    });
    if (result > 0) logger.info({ released: result }, 'Released wallet transactions');
    return result;
  }

  /**
   * Process a vendor withdrawal request.
   * In a real system this triggers a bank transfer; here it just debits the wallet.
   */
  async withdraw(opts: {
    store_id: string;
    amount: number;
    notes?: string;
    idempotency_key?: string;
  }): Promise<IVendorWallet> {
    const amount = roundTnd(opts.amount);
    if (amount < config.minWithdrawalTnd) {
      throw new PdValidationError(
        `Minimum withdrawal is ${config.minWithdrawalTnd} TND`,
        {
          code: PdErrorCode.WALLET_MIN_WITHDRAWAL,
          min: config.minWithdrawalTnd,
          requested: amount,
        },
      );
    }

    return transaction(async (c) => {
      if (opts.idempotency_key) {
        const existingTx = await c.query<WalletRow>(
          `SELECT w.* FROM pd_wallet_transaction tx
           JOIN pd_vendor_wallet w ON w.id = tx.wallet_id
           WHERE tx.metadata->>'idempotency_key' = $1`,
          [opts.idempotency_key],
        );
        if (existingTx.rows.length > 0) {
          logger.info({ idempotency_key: opts.idempotency_key }, 'Withdrawal already processed for idempotency key');
          return rowToWallet(existingTx.rows[0]);
        }
      }

      const { rows } = await c.query<WalletRow>(
        'SELECT * FROM pd_vendor_wallet WHERE store_id = $1 FOR UPDATE',
        [opts.store_id],
      );
      const wallet = rows[0];
      if (!wallet) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found');
      const balance = parseFloat(wallet.balance);
      if (balance < amount) {
        throw new PdValidationError('Insufficient funds', {
          code: PdErrorCode.WALLET_INSUFFICIENT_FUNDS,
          requested: amount,
          available: balance,
        });
      }
      const newBalance = roundTnd(balance - amount);
      await c.query(
        `UPDATE pd_vendor_wallet
         SET balance         = $2,
             total_withdrawn = total_withdrawn + $3
         WHERE id = $1`,
        [wallet.id, newBalance, amount],
      );
      await c.query(
        `INSERT INTO pd_wallet_transaction
           (id, wallet_id, type, amount, balance_after, description, metadata)
         VALUES ($1, $2, 'payout', $3, $4, $5, $6)`,
        [
          pdId('wtx'),
          wallet.id,
          -amount,
          newBalance,
          opts.notes ?? 'Vendor withdrawal',
          JSON.stringify({
            payout_status: 'pending',
            ...(opts.idempotency_key ? { idempotency_key: opts.idempotency_key } : {}),
          }),
        ],
      );
      const refreshed = await c.query<WalletRow>(
        'SELECT * FROM pd_vendor_wallet WHERE id = $1',
        [wallet.id],
      );
      logger.info({ store_id: opts.store_id, amount }, 'Withdrawal processed');
      return rowToWallet(refreshed.rows[0]);
    });
  }


  /**
   * Debit vendor wallet for an order refund.
   * If funds are still in pending_balance, deduct from pending_balance and total_earned.
   * Otherwise deduct from available balance and total_earned.
   */
  async debitRefund(opts: {
    store_id: string;
    amount: number;
    order_id: string;
    description?: string;
    client?: PoolClient;
  }): Promise<void> {
    const amount = roundTnd(opts.amount);
    if (amount <= 0) {
      throw new PdValidationError('Amount must be positive');
    }
    const exec = opts.client ?? null;
    const inner = async (c: PoolClient) => {
      const { rows } = await c.query<WalletRow>(
        'SELECT * FROM pd_vendor_wallet WHERE store_id = $1 FOR UPDATE',
        [opts.store_id],
      );
      const wallet = rows[0];
      if (!wallet) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found');

      const pendingBal = parseFloat(wallet.pending_balance);
      const availBal = parseFloat(wallet.balance);

      // Check if original sale transaction is still pending release
      const { rows: saleTxRows } = await c.query<{ id: string; amount: string }>(
        `SELECT id, amount FROM pd_wallet_transaction
         WHERE wallet_id = $1 AND order_id = $2 AND type = 'sale' AND metadata->>'released' IS NULL
         LIMIT 1`,
        [wallet.id, opts.order_id],
      );

      let newPending = pendingBal;
      let newAvail = availBal;

      if (saleTxRows.length > 0 && pendingBal >= amount) {
        newPending = roundTnd(pendingBal - amount);
        await c.query(
          `UPDATE pd_vendor_wallet
           SET pending_balance = $2,
               total_earned    = total_earned - $3
           WHERE id = $1`,
          [wallet.id, newPending, amount],
        );
      } else {
        newAvail = roundTnd(availBal - amount);
        await c.query(
          `UPDATE pd_vendor_wallet
           SET balance      = $2,
               total_earned = total_earned - $3
           WHERE id = $1`,
          [wallet.id, newAvail, amount],
        );
      }

      await c.query(
        `INSERT INTO pd_wallet_transaction
          (id, wallet_id, type, amount, balance_after, order_id, description, metadata)
         VALUES ($1, $2, 'refund', $3, $4, $5, $6, $7)`,
        [
          pdId('wtx'),
          wallet.id,
          -amount,
          newAvail,
          opts.order_id,
          opts.description ?? 'Order refund reversal',
          JSON.stringify({ refund_order_id: opts.order_id }),
        ],
      );
    };

    if (exec) await inner(exec);
    else await transaction(inner);
  }

  async setPayoutMode(storeId: string, mode: PayoutMode): Promise<IVendorWallet> {
    const { rows } = await query<WalletRow>(
      'UPDATE pd_vendor_wallet SET payout_mode = $2 WHERE store_id = $1 RETURNING *',
      [storeId, mode],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found');
    return rowToWallet(rows[0]);
  }

  async listTransactions(storeId: string, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;
    const wallet = await this.getByStore(storeId);
    const { rows } = await query(
      `SELECT * FROM pd_wallet_transaction
       WHERE wallet_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [wallet.id, limit, offset],
    );
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM pd_wallet_transaction WHERE wallet_id = $1`,
      [wallet.id],
    );
    const total = parseInt(countRows[0].count, 10);
    return {
      data: rows,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }


  /**
   * Approve a vendor payout withdrawal request.
   */
  async approveWithdrawal(transactionId: string, adminId: string) {
    return transaction(async (c) => {
      const { rows } = await c.query(
        `UPDATE pd_wallet_transaction
         SET metadata = jsonb_set(
           jsonb_set(
             coalesce(metadata, '{}'::jsonb),
             '{payout_status}',
             to_jsonb('approved'::text)
           ),
           '{payout_review}',
           jsonb_build_object(
             'reviewed_by', $2::text,
             'reviewed_at', NOW()
           )
         )
         WHERE id = $1 AND type = 'payout'
         RETURNING *`,
        [transactionId, adminId],
      );

      if (!rows[0]) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Withdrawal transaction not found');
      }
      return rows[0];
    });
  }

  /**
   * Reject a vendor payout withdrawal request and reverse funds to available wallet balance.
   */
  async rejectWithdrawal(transactionId: string, adminId: string, reason?: string) {
    return transaction(async (c) => {
      const txRes = await c.query<WalletTransactionRow>(
        `SELECT * FROM pd_wallet_transaction WHERE id = $1 AND type = 'payout' FOR UPDATE`,
        [transactionId],
      );
      const tx = txRes.rows[0];
      if (!tx) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Withdrawal transaction not found');
      }

      const meta = typeof tx.metadata === 'string' ? JSON.parse(tx.metadata || '{}') : (tx.metadata || {});
      if (meta.payout_status === 'rejected') {
        throw new PdValidationError('Withdrawal is already rejected');
      }

      const refundAmount = Math.abs(parseFloat(tx.amount));
      const walletRes = await c.query<WalletRow>(
        `SELECT * FROM pd_vendor_wallet WHERE id = $1 FOR UPDATE`,
        [tx.wallet_id],
      );
      const wallet = walletRes.rows[0];
      if (!wallet) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Wallet not found');
      }

      const newBalance = roundTnd(parseFloat(wallet.balance) + refundAmount);
      const newTotalWithdrawn = Math.max(0, roundTnd(parseFloat(wallet.total_withdrawn) - refundAmount));

      await c.query(
        `UPDATE pd_vendor_wallet
         SET balance = $2,
             total_withdrawn = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [wallet.id, newBalance, newTotalWithdrawn],
      );

      const { rows } = await c.query(
        `UPDATE pd_wallet_transaction
         SET metadata = jsonb_set(
           jsonb_set(
             coalesce(metadata, '{}'::jsonb),
             '{payout_status}',
             to_jsonb('rejected'::text)
           ),
           '{payout_review}',
           jsonb_build_object(
             'reviewed_by', $2::text,
             'reviewed_at', NOW(),
             'reason', $3::text
           )
         )
         WHERE id = $1
         RETURNING *`,
        [transactionId, adminId, reason || 'Rejected by administrator'],
      );

      logger.info({ transactionId, walletId: wallet.id, refundAmount }, 'Withdrawal rejected and funds reversed to wallet');
      return rows[0];
    });
  }

  /**
   * Complete a vendor payout with bank transfer slip reference.
   */
  async completeWithdrawal(transactionId: string, adminId: string, bankReference: string) {
    return transaction(async (c) => {
      const { rows } = await c.query(
        `UPDATE pd_wallet_transaction
         SET metadata = jsonb_set(
           jsonb_set(
             coalesce(metadata, '{}'::jsonb),
             '{payout_status}',
             to_jsonb('completed'::text)
           ),
           '{payout_review}',
           jsonb_build_object(
             'reviewed_by', $2::text,
             'reviewed_at', NOW(),
             'bank_reference', $3::text
           )
         )
         WHERE id = $1 AND type = 'payout'
         RETURNING *`,
        [transactionId, adminId, bankReference],
      );

      if (!rows[0]) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Withdrawal transaction not found');
      }
      return rows[0];
    });
  }
}

export const walletService = new WalletService();
