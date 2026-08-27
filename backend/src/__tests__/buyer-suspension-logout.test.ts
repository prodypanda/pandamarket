import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';

const { mockLogout, mockQuery } = vi.hoisted(() => ({
  mockLogout: vi.fn().mockResolvedValue(undefined),
  mockQuery: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  authService: {
    logout: mockLogout,
  },
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: vi.fn((cb: any) => cb({ query: mockQuery })),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../middlewares', () => ({
  asyncHandler: (fn: any) => async (req: any, res: any, next: any) => {
    try { await fn(req, res, next); } catch (e) { next(e); }
  },
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin_1', role: UserRole.Admin };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  requireSuperAdmin: (_req: any, _res: any, next: any) => next(),
  validate: () => (_req: any, _res: any, next: any) => next(),
  errorHandler: (err: any, _req: any, res: any, _next: any) => {
    const status = err.httpStatus || err.status || err.statusCode || 500;
    res.status(status).json({ error: { message: err.message } });
  },
}));

import adminRouter from '../api/admin.route';
import { errorHandler } from '../middlewares';

const app = express();
app.use(express.json());
app.use('/api/pd/admin', adminRouter);
app.use(errorHandler);

describe('PLAN-B-06: Buyer Suspension Session Revocation (vendors.routes.ts authoritative)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suspends buyer and calls authService.logout to immediately invalidate JWT/sessions (B-06)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'buyer_abc', email: 'buyer@example.com' }],
      rowCount: 1,
    });

    const res = await request(app)
      .put('/api/pd/admin/buyers/buyer_abc/suspend')
      .send({ reason: 'Suspected payment fraud' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.buyer.id).toBe('buyer_abc');

    // CRITICAL: Verify authService.logout is called (was bypassed when reports.routes.ts shadowed vendors.routes.ts)
    expect(mockLogout).toHaveBeenCalledWith('buyer_abc');
  });

  it('reactivates buyer account without calling logout', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'buyer_abc', email: 'buyer@example.com' }],
      rowCount: 1,
    });

    const res = await request(app)
      .put('/api/pd/admin/buyers/buyer_abc/reactivate')
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.buyer.id).toBe('buyer_abc');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('returns 404 when buyer account does not exist', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    });

    const res = await request(app)
      .put('/api/pd/admin/buyers/unknown_buyer/suspend')
      .send({ reason: 'Non-existent' });

    expect(res.status).toBe(404);
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
