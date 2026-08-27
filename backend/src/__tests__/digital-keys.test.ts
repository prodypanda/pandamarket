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
    debug: vi.fn(),
  },
}));

vi.mock('../config', () => ({
  config: {
    encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}));

import { digitalKeyService } from '../services/digital-key.service';
import { encrypt } from '../utils/crypto';

describe('PLAN-M-10: Digital Products License Key Pool & Delivery Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encrypts and adds keys to product license pool, updating stock quantity', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const res = await digitalKeyService.addKeys('prod_steam_1', ['KEY-1111-2222', 'KEY-3333-4444']);
    expect(res.added).toBe(2);

    // Verify insert queries encrypted keys
    const insertCall = mockQuery.mock.calls[0];
    expect(insertCall[0]).toContain('INSERT INTO pd_serial_key');
    expect(insertCall[1][1]).toBe('prod_steam_1');
    expect(insertCall[1][2]).not.toBe('KEY-1111-2222'); // Must be ciphertext
  });

  it('assigns available keys for order items atomically in a transaction', async () => {
    const mockClient = {
      query: vi.fn()
        // 1. SELECT items
        .mockResolvedValueOnce({
          rows: [{ product_id: 'prod_steam_1', quantity: 1 }],
        })
        // 2. SELECT available keys FOR UPDATE SKIP LOCKED
        .mockResolvedValueOnce({
          rows: [{ id: 'key_1' }],
        })
        // 3. UPDATE pd_serial_key
        .mockResolvedValueOnce({ rowCount: 1 })
        // 4. UPDATE pd_product inventory_quantity
        .mockResolvedValueOnce({ rowCount: 1 }),
    };

    mockTransaction.mockImplementationOnce(async (cb) => cb(mockClient));

    const totalAssigned = await digitalKeyService.assignKeysForOrder('ord_123');
    expect(totalAssigned).toBe(1);

    // Verify key assignment query
    const updateCall = mockClient.query.mock.calls[2];
    expect(updateCall[0]).toContain('UPDATE pd_serial_key');
    expect(updateCall[1]).toEqual(['ord_123', ['key_1']]);
  });

  it('retrieves and decrypts assigned keys for an order', async () => {
    const rawKey = 'WIN-PRO-9988-7766';
    const ciphertext = encrypt(rawKey);

    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'key_1',
          product_id: 'prod_win_1',
          key_ciphertext: ciphertext,
          is_assigned: true,
          order_id: 'ord_123',
          assigned_at: new Date('2026-08-20T12:00:00Z'),
        },
      ],
    });

    const keys = await digitalKeyService.getKeysForOrder('ord_123');
    expect(keys.length).toBe(1);
    expect(keys[0].key).toBe(rawKey);
  });
});
