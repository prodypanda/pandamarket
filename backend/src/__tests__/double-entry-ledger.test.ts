import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ledgerService } from '../services/ledger.service';
import { PdValidationError } from '../errors';

describe('PLAN-T3-01: Double-Entry Financial General Ledger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a balanced payment capture transaction (Debit Receivable, Credit Vendor & Platform Revenue)', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    };

    const txId = await ledgerService.recordTransaction(mockClient as any, {
      event_type: 'order.payment_captured',
      reference_id: 'ord_123',
      legs: [
        {
          account_type: 'customer_funds_receivable',
          entry_direction: 'debit',
          amount: 100.0,
          description: 'Flouci gateway capture',
        },
        {
          account_type: 'vendor_payable',
          entity_id: 'store_artisan_1',
          entry_direction: 'credit',
          amount: 90.0,
          description: 'Merchant net earnings',
        },
        {
          account_type: 'platform_revenue',
          entry_direction: 'credit',
          amount: 10.0,
          description: 'Marketplace commission 10%',
        },
      ],
    });

    expect(txId).toBeDefined();
    expect(mockClient.query).toHaveBeenCalledTimes(3);
  });

  it('rejects an unbalanced transaction violating the zero-sum invariant', async () => {
    const mockClient = {
      query: vi.fn(),
    };

    await expect(
      ledgerService.recordTransaction(mockClient as any, {
        event_type: 'order.payment_captured',
        legs: [
          {
            account_type: 'customer_funds_receivable',
            entry_direction: 'debit',
            amount: 100.0,
            description: 'Gateway capture',
          },
          {
            account_type: 'vendor_payable',
            entry_direction: 'credit',
            amount: 80.0, // Missing 20 TND!
            description: 'Incomplete credit leg',
          },
        ],
      }),
    ).rejects.toThrow(PdValidationError);
  });

  it('reconciles single-entry wallet balance with double-entry ledger balance', async () => {
    // 1. SELECT wallet balance (90.000)
    mockQuery.mockResolvedValueOnce({
      rows: [{ balance: '90.000' }],
    });
    // 2. SELECT ledger balance (90.000)
    mockQuery.mockResolvedValueOnce({
      rows: [{ balance: '90.000' }],
    });

    const reconciliation = await ledgerService.reconcileStore('store_artisan_1');
    expect(reconciliation.is_reconciled).toBe(true);
    expect(reconciliation.difference).toBeLessThan(0.005);
  });
});
