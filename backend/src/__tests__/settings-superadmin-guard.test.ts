import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { UserRole } from '@pandamarket/types';
import { platformConfigService } from '../services/platform-config.service';

vi.mock('../db/pool', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  transaction: vi.fn(async (cb: any) => cb({
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  })),
}));

vi.mock('../db/redis', () => ({
  getRedis: vi.fn(() => null),
  withRedisTimeout: vi.fn(async (_p, fallback) => fallback),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('PLAN-P0-06: Platform Settings Superadmin Privilege Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects plain admin from modifying finance settings via updateSettings (P0-06)', async () => {
    await expect(
      platformConfigService.updateSettings(
        { mandat_bank_rib: '12345678901234567890' },
        'admin_user_1',
        UserRole.Admin, // Plain admin
      ),
    ).rejects.toThrow(/SuperAdmin privilege required to update finance or security platform settings/i);
  });

  it('rejects plain admin from modifying security settings via updateSettings (P0-06)', async () => {
    await expect(
      platformConfigService.updateSettings(
        { security_login_max_attempts: 10 },
        'admin_user_1',
        UserRole.Admin, // Plain admin
      ),
    ).rejects.toThrow(/SuperAdmin privilege required to update finance or security platform settings/i);
  });

  it('rejects plain admin from modifying finance section via updateSectionSettings (P0-06)', async () => {
    await expect(
      platformConfigService.updateSectionSettings(
        'finance',
        { mandat_bank_rib: '12345678901234567890' },
        'admin_user_1',
        undefined,
        UserRole.Admin, // Plain admin
      ),
    ).rejects.toThrow(/Modifying finance settings requires SuperAdmin privileges/i);
  });

  it('allows super_admin to modify finance and security settings', async () => {
    const updated = await platformConfigService.updateSettings(
      { mandat_bank_rib: '12345678901234567890' },
      'super_admin_user_1',
      UserRole.SuperAdmin, // Superadmin
    );

    expect(updated).toContain('mandat_bank_rib');
  });

  it('allows plain admin to modify non-privileged settings (e.g. marketplace)', async () => {
    const updated = await platformConfigService.updateSettings(
      { marketplace_name: 'PandaMarket Tunisia' },
      'admin_user_1',
      UserRole.Admin, // Plain admin
    );

    expect(updated).toContain('marketplace_name');
  });
});
