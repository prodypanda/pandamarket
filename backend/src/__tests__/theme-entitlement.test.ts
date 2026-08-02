import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ──────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  themeGetBySlug: vi.fn(),
  themeCanUseTheme: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mocks.query,
  transaction: vi.fn(),
}));

vi.mock('../utils/crypto', () => ({
  pdId: vi.fn(() => 'pd_store_new'),
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/subscription.service', () => ({
  subscriptionService: { assertPlanIsEnabled: vi.fn(), getLimits: vi.fn() },
}));

vi.mock('../services/wallet.service', () => ({
  walletService: { create: vi.fn() },
}));

vi.mock('../services/credits.service', () => ({
  creditsService: { create: vi.fn() },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {},
}));

vi.mock('../services/marketplace-analytics-event.service', () => ({
  marketplaceAnalyticsEventService: {},
}));

vi.mock('../services/theme.service', () => ({
  themeService: {
    getBySlug: mocks.themeGetBySlug,
    canUseTheme: mocks.themeCanUseTheme,
  },
}));

import { storeService } from '../services/store.service';
import { PdForbiddenError, PdNotFoundError, PdErrorCode } from '../errors';

// ─── Helpers ────────────────────────────────────────────────────
const STORE_ID = 'pd_store_abc';

function fakeTheme(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pd_theme_1',
    slug: 'classic',
    name: 'Classic',
    is_free: true,
    is_active: true,
    price: 0,
    ...overrides,
  };
}

function fakeStoreRow(overrides: Record<string, unknown> = {}) {
  return {
    id: STORE_ID,
    name: 'Test Store',
    theme_id: 'classic',
    status: 'verified',
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('StoreService.updateTheme — theme entitlement checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies a free theme successfully', async () => {
    mocks.themeGetBySlug.mockResolvedValue(fakeTheme({ slug: 'minimal', is_free: true }));
    mocks.query.mockResolvedValue({ rows: [fakeStoreRow({ theme_id: 'minimal' })] });

    const result = await storeService.updateTheme(STORE_ID, 'minimal');

    expect(mocks.themeGetBySlug).toHaveBeenCalledWith('minimal');
    expect(mocks.themeCanUseTheme).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledWith(
      'UPDATE pd_store SET theme_id = $2 WHERE id = $1 RETURNING *',
      [STORE_ID, 'minimal'],
    );
    expect(result.theme_id).toBe('minimal');
  });

  it('applies a purchased premium theme successfully', async () => {
    mocks.themeGetBySlug.mockResolvedValue(
      fakeTheme({ slug: 'neon', is_free: false, price: 120 }),
    );
    mocks.themeCanUseTheme.mockResolvedValue(true);
    mocks.query.mockResolvedValue({ rows: [fakeStoreRow({ theme_id: 'neon' })] });

    const result = await storeService.updateTheme(STORE_ID, 'neon');

    expect(mocks.themeGetBySlug).toHaveBeenCalledWith('neon');
    expect(mocks.themeCanUseTheme).toHaveBeenCalledWith(STORE_ID, 'neon');
    expect(result.theme_id).toBe('neon');
  });

  it('rejects a premium theme without purchase (403)', async () => {
    mocks.themeGetBySlug.mockResolvedValue(
      fakeTheme({ slug: 'luxe', is_free: false, price: 150 }),
    );
    mocks.themeCanUseTheme.mockResolvedValue(false);

    await expect(storeService.updateTheme(STORE_ID, 'luxe')).rejects.toThrow(PdForbiddenError);

    expect(mocks.themeCanUseTheme).toHaveBeenCalledWith(STORE_ID, 'luxe');
    // Should NOT execute the UPDATE query
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('rejects a non-existent / inactive theme (404)', async () => {
    mocks.themeGetBySlug.mockRejectedValue(
      new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Theme not found', { slug: 'nonexistent' }),
    );

    await expect(storeService.updateTheme(STORE_ID, 'nonexistent')).rejects.toThrow(
      PdNotFoundError,
    );

    expect(mocks.themeGetBySlug).toHaveBeenCalledWith('nonexistent');
    expect(mocks.themeCanUseTheme).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
