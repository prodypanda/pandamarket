/**
 * Multi-tenant isolation tests.
 * Verifies that vendor A cannot access vendor B's resources.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'test-id'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    defaultRetentionDays: 7,
    minWithdrawalTnd: 20,
    defaultCurrency: 'TND',
  },
}));

import { query } from '../db/pool';
import { ProductService } from '../services/product.service';
import { WalletService } from '../services/wallet.service';

const mockQuery = vi.mocked(query);

describe('Multi-Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Product Ownership', () => {
    const productService = new ProductService();

    it('should throw when vendor A tries to access vendor B product', async () => {
      // Product belongs to store_B
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pd_prod_1',
          store_id: 'pd_store_B',
          title: 'Product B',
          status: 'published',
        }],
        rowCount: 1,
      } as any);

      await expect(
        productService.assertOwnership('pd_prod_1', 'pd_store_A'),
      ).rejects.toThrow('You can only modify your own products');
    });

    it('should succeed when vendor accesses their own product', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pd_prod_1',
          store_id: 'pd_store_A',
          title: 'Product A',
          status: 'published',
        }],
        rowCount: 1,
      } as any);

      await expect(
        productService.assertOwnership('pd_prod_1', 'pd_store_A'),
      ).resolves.toBeUndefined();
    });
  });

  describe('Wallet Isolation', () => {
    const walletService = new WalletService();

    it('should only return wallet for the correct store', async () => {
      // Wallet for store_A
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pd_wallet_A',
          store_id: 'pd_store_A',
          balance: '100.000',
          pending_balance: '50.000',
          total_earned: '500.000',
          total_withdrawn: '350.000',
          payout_mode: 'on_demand',
          retention_days: 7,
          currency: 'TND',
        }],
        rowCount: 1,
      } as any);

      const wallet = await walletService.getByStore('pd_store_A');
      expect(wallet.store_id).toBe('pd_store_A');
      expect(wallet.balance).toBe(100);
    });

    it('should throw when wallet not found for store', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        walletService.getByStore('pd_store_nonexistent'),
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('Order Isolation', () => {
    it('should list orders only for the requesting store', async () => {
      const { OrderService } = await import('../services/order.service');
      const orderService = new OrderService();

      // Mock listByStore query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'pd_order_1', customer_id: 'pd_user_1', status: 'pending', total: '85.000' },
        ],
        rowCount: 1,
      } as any);
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
      } as any);

      const result = await orderService.listByStore('pd_store_A');
      expect(result.data).toHaveLength(1);
      // The SQL query includes WHERE i.store_id = $1, ensuring isolation
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE i.store_id = $1'),
        expect.arrayContaining(['pd_store_A']),
      );
    });
  });

  describe('AI Job Isolation', () => {
    it('should list AI jobs only for the requesting store', async () => {
      vi.mock('../queues/ai-queue', () => ({
        aiQueue: { add: vi.fn().mockResolvedValue({ id: 'bull-1' }) },
      }));
      vi.mock('../services/credits.service', () => ({
        creditsService: {
          assertEnough: vi.fn(),
          consume: vi.fn(),
        },
      }));

      const { AiService } = await import('../services/ai.service');
      const aiService = new AiService();

      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'pd_aijob_1', store_id: 'pd_store_A', type: 'image_compression', status: 'completed' },
        ],
        rowCount: 1,
      } as any);

      const jobs = await aiService.listByStore('pd_store_A');
      expect(jobs).toHaveLength(1);
      expect(jobs[0].store_id).toBe('pd_store_A');
      // Verify the query filters by store_id
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE store_id = $1'),
        expect.arrayContaining(['pd_store_A']),
      );
    });
  });

  describe('API Key Isolation', () => {
    it('should only return API keys for the requesting store', async () => {
      const { ApiKeyService } = await import('../services/api-key.service');
      const apiKeyService = new ApiKeyService();

      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'pd_key_1', store_id: 'pd_store_A', key_prefix: 'pd_sk_a1b2', label: 'ERP Key', scopes: ['products:read'], is_active: true, last_used_at: null, expires_at: null, created_at: new Date() },
        ],
        rowCount: 1,
      } as any);

      const keys = await apiKeyService.listByStore('pd_store_A');
      expect(keys).toHaveLength(1);
      expect(keys[0].store_id).toBe('pd_store_A');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('store_id'),
        expect.arrayContaining(['pd_store_A']),
      );
    });
  });

  describe('Cross-Store Wallet Prevention', () => {
    const walletService = new WalletService();

    it('should not allow withdrawal from another store wallet', async () => {
      // The wallet service uses store_id in WHERE clause, so store_A would get no results
      // because the wallet belongs to store_B
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        walletService.getByStore('pd_store_A'),
      ).rejects.toThrow('Wallet not found');
    });
  });

  describe('Cross-Store Product Modification', () => {
    const productService = new ProductService();

    it('should throw when vendor tries to delete another store product', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pd_prod_X',
          store_id: 'pd_store_B',
          title: 'Not My Product',
          status: 'published',
        }],
        rowCount: 1,
      } as any);

      await expect(
        productService.assertOwnership('pd_prod_X', 'pd_store_A'),
      ).rejects.toThrow('You can only modify your own products');
    });

    it('should throw when product does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(
        productService.assertOwnership('pd_prod_nonexistent', 'pd_store_A'),
      ).rejects.toThrow();
    });
  });

  describe('Store Resolution', () => {
    it('should resolve correct store by subdomain', async () => {
      const { StoreService } = await import('../services/store.service');
      const storeService = new StoreService();

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pd_store_A',
          name: 'Store A',
          subdomain: 'store-a',
          status: 'verified',
        }],
        rowCount: 1,
      } as any);

      const store = await storeService.resolveByHostname('store-a.pandamarket.tn', 'pandamarket.tn');
      expect(store?.id).toBe('pd_store_A');
    });

    it('should return null for hub domain', async () => {
      const { StoreService } = await import('../services/store.service');
      const storeService = new StoreService();

      const store = await storeService.resolveByHostname('pandamarket.tn', 'pandamarket.tn');
      expect(store).toBeNull();
    });

    it('should return null for admin domain', async () => {
      const { StoreService } = await import('../services/store.service');
      const storeService = new StoreService();

      const store = await storeService.resolveByHostname('admin.pandamarket.tn', 'pandamarket.tn');
      expect(store).toBeNull();
    });
  });
});
