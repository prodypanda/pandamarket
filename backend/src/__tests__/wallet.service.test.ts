/**
 * Unit tests for WalletService.
 * Tests wallet operations: create, credit, release, withdraw, payout mode.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool
vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'test-wallet-id'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    defaultRetentionDays: 7,
  },
}));

import { query, transaction } from '../db/pool';
import { WalletService } from '../services/wallet.service';

const mockQuery = vi.mocked(query);
const mockTransaction = vi.mocked(transaction);

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(() => {
    vi.clearAllMocks();
    walletService = new WalletService();
  });

  describe('getByStore', () => {
    it('should return wallet data for a valid store', async () => {
      const mockWallet = {
        id: 'wallet-1',
        store_id: 'store-1',
        balance: '430.500',
        pending_balance: '85.000',
        total_earned: '1250.000',
        total_withdrawn: '200.000',
        payout_mode: 'manual',
        retention_days: 7,
        currency: 'TND',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockWallet],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await walletService.getByStore('store-1');

      expect(result.balance).toBe(430.5);
      expect(result.pending_balance).toBe(85);
      expect(result.total_earned).toBe(1250);
      expect(result.total_withdrawn).toBe(200);
      expect(result.payout_mode).toBe('manual');
      expect(result.store_id).toBe('store-1');
    });

    it('should throw PdNotFoundError when wallet does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(walletService.getByStore('nonexistent')).rejects.toThrow('Wallet not found');
    });
  });

  describe('create', () => {
    it('should create a new wallet with default retention days', async () => {
      const mockWallet = {
        id: 'test-wallet-id',
        store_id: 'store-1',
        balance: '0.000',
        pending_balance: '0.000',
        total_earned: '0.000',
        total_withdrawn: '0.000',
        payout_mode: 'manual',
        retention_days: 7,
        currency: 'TND',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockWallet],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      const result = await walletService.create('store-1');

      expect(result.balance).toBe(0);
      expect(result.pending_balance).toBe(0);
      expect(result.store_id).toBe('store-1');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pd_vendor_wallet'),
        expect.arrayContaining(['test-wallet-id', 'store-1', 7]),
      );
    });
  });

  describe('roundTnd', () => {
    it('should correctly parse numeric strings from PostgreSQL', async () => {
      const mockWallet = {
        id: 'wallet-1',
        store_id: 'store-1',
        balance: '100.123',
        pending_balance: '0.001',
        total_earned: '999.999',
        total_withdrawn: '0.000',
        payout_mode: 'manual',
        retention_days: 7,
        currency: 'TND',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockWallet],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await walletService.getByStore('store-1');

      expect(result.balance).toBe(100.123);
      expect(result.pending_balance).toBe(0.001);
      expect(result.total_earned).toBe(999.999);
    });
  });
});
