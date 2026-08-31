import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';

vi.mock('../db/pool', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  transaction: vi.fn((cb: any) => cb({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  })),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn((prefix: string) => `pd_${prefix}_test123`),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('../queues/email-queue', () => ({
  emailQueue: {
    add: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../config', () => ({
  config: {
    bcryptRounds: 4,
    env: 'test',
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => 'hashed_password'),
    compare: vi.fn(async (plain: string, _hash: string) => plain === 'correct_password'),
  },
}));

vi.mock('../utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'mock_access_token_123'),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === 'active_token') {
      return { sub: 'sfcust_123', role: UserRole.Customer, store_id: 'store_1' };
    }
    if (token === 'disabled_token') {
      return { sub: 'sfcust_disabled', role: UserRole.Customer, store_id: 'store_1' };
    }
    throw new Error('Invalid token');
  }),
}));

vi.mock('../services/system-log.service', () => ({
  systemLogService: {
    captureError: vi.fn(),
  },
}));

vi.mock('../middlewares', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middlewares')>();
  return {
    ...actual,
    authRateLimit: (_req: any, _res: any, next: any) => next(),
  };
});

import { query } from '../db/pool';
import { emailQueue } from '../queues/email-queue';
import storefrontAuthRouter from '../api/storefront-auth.route';
import { errorHandler } from '../middlewares';

const mockedQuery = vi.mocked(query);
const mockedEmailAdd = vi.mocked(emailQueue.add);

const app = express();
app.use(express.json());
app.use('/api/pd/storefront/auth', storefrontAuthRouter);
app.use(errorHandler);

describe('Storefront Auth & Customer Security (GAP-P1-002 & GAP-P2-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  it('rejects registration if store is not verified/public', async () => {
    // assertPublicStore query
    mockedQuery.mockResolvedValueOnce({
      rows: [{ status: 'pending', is_verified: false }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/register')
      .send({
        store_id: 'store_unverified',
        email: 'buyer@test.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Doe',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Store is not eligible');
  });

  it('registers buyer and generates verification token when store is verified', async () => {
    // 1. assertPublicStore
    mockedQuery.mockResolvedValueOnce({
      rows: [{ status: 'verified', is_verified: true }],
      rowCount: 1,
    } as any);
    // 2. Existing customer check
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    // 3. Insert customer
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'sfcust_123',
          store_id: 'store_1',
          email: 'buyer@test.com',
          first_name: 'Jane',
          last_name: 'Doe',
          phone: null,
          email_verified: false,
          is_active: true,
          created_at: new Date(),
        },
      ],
      rowCount: 1,
    } as any);
    // 4. Insert verification token
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/register')
      .send({
        store_id: 'store_1',
        email: 'buyer@test.com',
        password: 'password123',
        first_name: 'Jane',
        last_name: 'Doe',
      });

    expect(res.status).toBe(201);
    expect(res.body.customer.email).toBe('buyer@test.com');
    expect(res.body.verify_token).toBeDefined();
  });

  it('rejects authentication for disabled/suspended customer tokens', async () => {
    // requireStorefrontCustomer middleware queries is_active
    mockedQuery.mockResolvedValueOnce({
      rows: [{ is_active: false }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .get('/api/pd/storefront/auth/me')
      .set('Authorization', 'Bearer disabled_token');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('Account disabled');
  });

  it('allows authentication for active customer tokens', async () => {
    // 1. requireStorefrontCustomer middleware checks is_active
    mockedQuery.mockResolvedValueOnce({
      rows: [{ is_active: true }],
      rowCount: 1,
    } as any);
    // 2. getById in /me handler
    mockedQuery.mockResolvedValueOnce({
      rows: [{
        id: 'sfcust_123',
        store_id: 'store_1',
        email: 'buyer@test.com',
        first_name: 'Jane',
        last_name: 'Doe',
        phone: null,
        email_verified: true,
        is_active: true,
        created_at: new Date(),
      }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .get('/api/pd/storefront/auth/me')
      .set('Authorization', 'Bearer active_token');

    expect(res.status).toBe(200);
    expect(res.body.customer.email).toBe('buyer@test.com');
  });

  it('verifies email with valid verification token', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'token_1', customer_id: 'sfcust_123' }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/verify-email')
      .send({
        store_id: 'store_1',
        token: 'valid_verify_token_123',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Email verified');
  });

  it('returns silent success for forgot-password even with unknown email', async () => {
    // Customer lookup returns nothing
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/forgot-password')
      .send({
        store_id: 'store_1',
        email: 'unknown@test.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If an account exists');
  });

  it('queues a tenant-bound reset link without exposing the raw token in the URL context', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'sfcust_123', first_name: 'Jane' }],
      rowCount: 1,
    } as any);
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
    mockedQuery.mockResolvedValueOnce({
      rows: [{ subdomain: 'boutique1', custom_domain: null }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/forgot-password')
      .send({ store_id: 'store_1', email: 'buyer@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If an account exists');
    expect(mockedEmailAdd).toHaveBeenCalledWith('password_reset', expect.objectContaining({
      scope: 'store',
      store_id: 'store_1',
      variables: expect.objectContaining({
        store_id: 'store_1',
        reset_url: expect.stringContaining('boutique1.pandamarket.local'),
      }),
    }));
    const job = mockedEmailAdd.mock.calls.at(-1)?.[1] as { variables: Record<string, unknown> };
    expect(String(job.variables.reset_url)).toContain('token=');
    expect(String(job.variables.reset_url)).not.toContain('undefined');
  });

  it('keeps verification resend generic and tenant-scoped', async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ status: 'verified', is_verified: true }],
      rowCount: 1,
    } as any);
    mockedQuery.mockResolvedValueOnce({
      rows: [{ id: 'sfcust_123', first_name: 'Jane', email_verified: false }],
      rowCount: 1,
    } as any);
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);
    mockedQuery.mockResolvedValueOnce({
      rows: [{ subdomain: 'boutique1', custom_domain: null }],
      rowCount: 1,
    } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/resend-verification')
      .send({ store_id: 'store_1', email: 'buyer@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If the account exists');
    expect(mockedEmailAdd).toHaveBeenCalledWith('email_verification', expect.objectContaining({
      store_id: 'store_1',
      variables: expect.objectContaining({
        store_id: 'store_1',
        verify_url: expect.stringContaining('/verify-email?store_id=store_1&token='),
      }),
    }));
  });

  it('rejects a verification token when the token is not valid for the requested tenant', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const res = await request(app)
      .post('/api/pd/storefront/auth/verify-email')
      .send({ store_id: 'store_other', token: 'token-from-store-1' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Invalid or expired verification token');
  });
});
