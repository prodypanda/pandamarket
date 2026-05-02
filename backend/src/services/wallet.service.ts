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
   */
  async creditPending(opts: {
    store_id: string;
    amount: number;
    order_id?: string;
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

      const availableAt = new Date(Date.now() + wallet.retention_days * 24 * 60 * 60 * 1000);

      await c.query(
        `UPDATE pd_vendor_wallet
         SET pending_balance = pending_balance + $2,
             total_earned    = total_earned    + $2
         WHERE id = $1`,
        [wallet.id, amount],
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
          opts.description ?? `Sale credited (pending ${wallet.retention_days}d)`,
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
           (id, wallet_id, type, amount, balance_after, description)
         VALUES ($1, $2, 'payout', $3, $4, $5)`,
        [pdId('wtx'), wallet.id, -amount, newBalance, opts.notes ?? 'Vendor withdrawal'],
      );
      const refreshed = await c.query<WalletRow>(
        'SELECT * FROM pd_vendor_wallet WHERE id = $1',
        [wallet.id],
      );
      logger.info({ store_id: opts.store_id, amount }, 'Withdrawal processed');
      return rowToWallet(refreshed.rows[0]);
    });
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
}

export const walletService = new WalletService();
