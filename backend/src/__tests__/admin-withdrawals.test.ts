import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { walletService } from '../services/wallet.service';
import { PdValidationError, PdNotFoundError } from '../errors';

describe('PLAN-M-05: Administrator Withdrawal Approval & Bank Transfer Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('approves a pending withdrawal transaction', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'wtx_123',
            wallet_id: 'w_1',
            type: 'payout',
            amount: '-50.000',
            balance_after: '150.000',
            metadata: { payout_status: 'approved' },
          },
        ],
      }),
    };
    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await walletService.approveWithdrawal('wtx_123', 'admin_1');
    expect(result.id).toBe('wtx_123');
    expect(mockClient.query).toHaveBeenCalledTimes(1);
    expect(mockClient.query.mock.calls[0][0]).toContain("to_jsonb('approved'::text)");
  });

  it('rejects a withdrawal and reverses funds back to the vendor wallet', async () => {
    const mockClient = {
      query: vi.fn()
        // 1. Find transaction
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'wtx_123',
              wallet_id: 'w_1',
              type: 'payout',
              amount: '-50.000',
              metadata: { payout_status: 'pending' },
            },
          ],
        })
        // 2. Find wallet
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'w_1',
              store_id: 'store_1',
              balance: '150.000',
              total_withdrawn: '50.000',
            },
          ],
        })
        // 3. Update wallet (balance 150 + 50 = 200, total_withdrawn 50 - 50 = 0)
        .mockResolvedValueOnce({ rowCount: 1 })
        // 4. Update transaction
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'wtx_123',
              metadata: { payout_status: 'rejected' },
            },
          ],
        }),
    };
    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await walletService.rejectWithdrawal('wtx_123', 'admin_1', 'RIB invalide');
    expect(result.id).toBe('wtx_123');

    // Verify wallet update has balance 200 and total_withdrawn 0
    const walletUpdateSql = mockClient.query.mock.calls[2];
    expect(walletUpdateSql[0]).toContain('UPDATE pd_vendor_wallet');
    expect(walletUpdateSql[1]).toEqual(['w_1', 200, 0]);
  });

  it('completes a withdrawal with bank transfer slip reference', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            id: 'wtx_123',
            wallet_id: 'w_1',
            type: 'payout',
            amount: '-50.000',
            metadata: {
              payout_status: 'completed',
              payout_review: { bank_reference: 'VIR_BCT_889900' },
            },
          },
        ],
      }),
    };
    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const result = await walletService.completeWithdrawal('wtx_123', 'admin_1', 'VIR_BCT_889900');
    expect(result.id).toBe('wtx_123');
    expect(mockClient.query.mock.calls[0][1]).toEqual(['wtx_123', 'admin_1', 'VIR_BCT_889900']);
  });
});
