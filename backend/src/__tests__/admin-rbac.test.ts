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

import { adminCapabilityService } from '../services/admin-capability.service';
import { requireCapability } from '../middlewares';
import { UserRole } from '@pandamarket/types';
import { PdForbiddenError } from '../errors';

describe('PLAN-M-07: Multi-Admin Capability & Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('manages admin capabilities correctly', async () => {
    // 1. Grant capability
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const granted = await adminCapabilityService.grantCapability('admin_123', 'finance:payout', 'super_admin_1');
    expect(granted).toBe(true);

    // 2. Query capabilities
    mockQuery.mockResolvedValueOnce({
      rows: [{ capability: 'finance:payout' }, { capability: 'finance:view' }],
    });
    const caps = await adminCapabilityService.getUserCapabilities('admin_123');
    expect(caps).toEqual(['finance:payout', 'finance:view']);

    // 3. Revoke capability
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const revoked = await adminCapabilityService.revokeCapability('admin_123', 'finance:payout');
    expect(revoked).toBe(true);
  });

  it('allows SuperAdmin to bypass capability checks without querying database', async () => {
    const middleware = requireCapability('finance:payout');
    const req: any = {
      user: { id: 'usr_super', role: UserRole.SuperAdmin },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('allows Admin with matched capability', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capability: 'catalog:manage' }],
    });

    const middleware = requireCapability('catalog:manage', 'settings:manage');
    const req: any = {
      user: { id: 'usr_admin', role: UserRole.Admin },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects Admin missing required capability with PdForbiddenError', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capability: 'support:manage' }],
    });

    const middleware = requireCapability('finance:payout');
    const req: any = {
      user: { id: 'usr_admin', role: UserRole.Admin },
    };
    const res: any = {};
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(PdForbiddenError));
  });
});
