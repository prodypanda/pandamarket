import { PoolClient } from 'pg';
import { query } from '../db/pool';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdValidationError } from '../errors';

export type LedgerAccountType =
  | 'customer_funds_receivable'
  | 'vendor_payable'
  | 'platform_revenue'
  | 'bank_cash_clearing';

export type EntryDirection = 'debit' | 'credit';

export interface LedgerLeg {
  account_type: LedgerAccountType;
  entity_id?: string; // store_id, user_id, or 'platform'
  entry_direction: EntryDirection;
  amount: number;
  description: string;
}

export interface RecordTransactionParams {
  transaction_id?: string;
  event_type: string;
  reference_id?: string;
  currency?: string;
  legs: LedgerLeg[];
}

export class LedgerService {
  /**
   * Records a balanced double-entry transaction.
   * Asserts the zero-sum invariant: SUM(debits) === SUM(credits).
   */
  async recordTransaction(client: PoolClient, params: RecordTransactionParams): Promise<string> {
    const txId = params.transaction_id || pdId('ltx');
    const currency = params.currency || 'TND';

    if (!params.legs || params.legs.length < 2) {
      throw new PdValidationError('Double-entry transaction must contain at least 2 legs');
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const leg of params.legs) {
      if (leg.amount <= 0) {
        throw new PdValidationError('Ledger leg amount must be greater than 0');
      }
      if (leg.entry_direction === 'debit') {
        totalDebits += Number(leg.amount.toFixed(3));
      } else if (leg.entry_direction === 'credit') {
        totalCredits += Number(leg.amount.toFixed(3));
      }
    }

    // Zero-sum invariant check with millime precision tolerance (0.001)
    const diff = Math.abs(totalDebits - totalCredits);
    if (diff > 0.001) {
      throw new PdValidationError(
        `Double-entry imbalance violation: debits (${totalDebits.toFixed(3)}) != credits (${totalCredits.toFixed(3)})`,
      );
    }

    for (const leg of params.legs) {
      await client.query(
        `INSERT INTO pd_ledger_entry
          (id, transaction_id, account_type, entity_id, entry_direction, amount, currency, description, event_type, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          pdId('ledg'),
          txId,
          leg.account_type,
          leg.entity_id || 'platform',
          leg.entry_direction,
          leg.amount,
          currency,
          leg.description,
          params.event_type,
          params.reference_id || null,
        ],
      );
    }

    logger.debug({ transactionId: txId, eventType: params.event_type, legsCount: params.legs.length }, 'Recorded balanced ledger entry');
    return txId;
  }

  /**
   * Computes the net ledger balance for a given entity (e.g. vendor payable = credits - debits)
   */
  async getStoreLedgerBalance(storeId: string): Promise<number> {
    const { rows } = await query<{ balance: string }>(
      `SELECT
         COALESCE(SUM(CASE WHEN entry_direction = 'credit' THEN amount ELSE -amount END), 0)::text AS balance
       FROM pd_ledger_entry
       WHERE entity_id = $1 AND account_type = 'vendor_payable'`,
      [storeId],
    );

    return parseFloat(rows[0]?.balance || '0');
  }

  /**
   * Reconciles the single-entry wallet balance with the double-entry ledger balance.
   */
  async reconcileStore(storeId: string): Promise<{
    store_id: string;
    wallet_balance: number;
    ledger_balance: number;
    is_reconciled: boolean;
    difference: number;
  }> {
    const { rows: walletRows } = await query<{ balance: string }>(
      `SELECT (available_balance + pending_balance)::text AS balance FROM pd_vendor_wallet WHERE store_id = $1`,
      [storeId],
    );

    const walletBalance = parseFloat(walletRows[0]?.balance || '0');
    const ledgerBalance = await this.getStoreLedgerBalance(storeId);
    const difference = Math.abs(walletBalance - ledgerBalance);

    return {
      store_id: storeId,
      wallet_balance: walletBalance,
      ledger_balance: ledgerBalance,
      is_reconciled: difference < 0.005,
      difference,
    };
  }
}

export const ledgerService = new LedgerService();
