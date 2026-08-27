import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  transaction: async (cb: any) => cb({ query: mockQuery }),
  query: mockQuery,
}));

vi.mock('../config', () => ({
  config: {
    minWithdrawalTnd: 20,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { walletService } from '../services/wallet.service';

describe('PLAN-B-18: Wallet Withdrawal Idempotency & Double Debit Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents double-debiting when matching idempotency_key exists', async () => {
    const existingWalletRow = {
      id: 'wal_123',
      store_id: 'store_test',
      balance: '150.000',
      total_withdrawn: '50.000',
      pending_balance: '0.000',
      retention_days: 7,
      payout_mode: 'manual',
    };

    // First query inside transaction: Check idempotency key in pd_wallet_transaction
    mockQuery.mockResolvedValueOnce({
      rows: [existingWalletRow],
    });

    const result = await walletService.withdraw({
      store_id: 'store_test',
      amount: 50,
      idempotency_key: 'idem_withdraw_12345',
    });

    expect(result.id).toBe('wal_123');
    expect(result.balance).toBe(150);
    // Should NOT have run UPDATE or INSERT
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain("tx.metadata->>'idempotency_key' = $1");
  });

  it('executes withdrawal and persists idempotency_key when key is new', async () => {
    const walletRow = {
      id: 'wal_123',
      store_id: 'store_test',
      balance: '200.000',
      total_withdrawn: '0.000',
      pending_balance: '0.000',
      retention_days: 7,
      payout_mode: 'manual',
    };

    const refreshedWalletRow = {
      ...walletRow,
      balance: '150.000',
      total_withdrawn: '50.000',
    };

    // 1. Idempotency check -> no existing tx
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2. Select wallet for update
    mockQuery.mockResolvedValueOnce({ rows: [walletRow] });
    // 3. Update wallet balance
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 4. Insert wallet transaction
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 5. Select refreshed wallet
    mockQuery.mockResolvedValueOnce({ rows: [refreshedWalletRow] });

    const result = await walletService.withdraw({
      store_id: 'store_test',
      amount: 50,
      notes: 'Vendor withdrawal',
      idempotency_key: 'idem_new_9999',
    });

    expect(result.balance).toBe(150);
    expect(result.total_withdrawn).toBe(50);

    // Verify INSERT statement included metadata with idempotency_key
    const insertCall = mockQuery.mock.calls[3];
    expect(insertCall[0]).toContain('INSERT INTO pd_wallet_transaction');
    expect(insertCall[1][5]).toContain('idem_new_9999');
  });
});
