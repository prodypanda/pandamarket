import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';
import { requireAuth, requireStorefrontCustomer, errorHandler } from '../middlewares';
import { signAccessToken } from '../utils/jwt';

// Mock DB pool
vi.mock('../db/pool', () => ({
  query: vi.fn(async (sql: string) => {
    if (sql.includes('SELECT is_active FROM pd_storefront_customer')) {
      return { rows: [{ is_active: true }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }),
  transaction: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

describe('PLAN-P0-03: Storefront Customer Token Boundary Isolation', () => {
  const app = express();
  app.use(express.json());

  // Marketplace protected endpoint
  app.get('/api/pd/marketplace/seller-endpoint', requireAuth, (_req, res) => {
    res.status(200).json({ ok: true, surface: 'marketplace' });
  });

  // Storefront protected endpoint
  app.get('/api/pd/storefront/orders', requireStorefrontCustomer, (req, res) => {
    res.status(200).json({ ok: true, customerId: (req as any).storefrontCustomer.id });
  });

  app.use(errorHandler);

  it('rejects a storefront customer token from accessing marketplace endpoints (P0-03)', async () => {
    const storefrontToken = signAccessToken({
      sub: 'cust_xyz_123',
      role: UserRole.Customer,
      store_id: 'store_target_456',
      token_type: 'storefront_customer',
    });

    const res = await request(app)
      .get('/api/pd/marketplace/seller-endpoint')
      .set('Authorization', `Bearer ${storefrontToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Storefront customer token cannot access marketplace APIs/i);
  });

  it('allows a marketplace user token to access marketplace endpoints', async () => {
    const marketplaceUserToken = signAccessToken({
      sub: 'usr_merchant_789',
      role: UserRole.Vendor,
      store_id: 'store_target_456',
      token_type: 'marketplace_user',
    });

    const res = await request(app)
      .get('/api/pd/marketplace/seller-endpoint')
      .set('Authorization', `Bearer ${marketplaceUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('allows a storefront customer token to access storefront endpoints', async () => {
    const storefrontToken = signAccessToken({
      sub: 'cust_xyz_123',
      role: UserRole.Customer,
      store_id: 'store_target_456',
      token_type: 'storefront_customer',
    });

    const res = await request(app)
      .get('/api/pd/storefront/orders')
      .set('Authorization', `Bearer ${storefrontToken}`);

    expect(res.status).toBe(200);
    expect(res.body.customerId).toBe('cust_xyz_123');
  });
});
