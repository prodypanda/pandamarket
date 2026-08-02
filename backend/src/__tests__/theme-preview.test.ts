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
import { signThemePreviewToken, verifyThemePreviewToken } from '../utils/jwt';
import { PdForbiddenError } from '../errors';

const STORE_ID = 'pd_store_123';
const USER_ID = 'usr_owner_456';

describe('StoreService — Theme Draft & Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs and verifies a valid theme preview token', async () => {
    const { token, expires_at } = await storeService.createThemePreviewToken(STORE_ID, USER_ID);
    expect(token).toBeDefined();
    expect(expires_at).toBeDefined();

    const payload = verifyThemePreviewToken(token);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.store_id).toBe(STORE_ID);
    expect(payload.type).toBe('theme_preview');
  });

  it('updates draft theme settings without modifying live theme', async () => {
    mocks.themeGetBySlug.mockResolvedValue({ id: 'theme_modern', slug: 'modern', is_free: true });

    mocks.query.mockResolvedValue({
      rows: [
        {
          id: STORE_ID,
          theme_id: 'classic',
          settings: {
            draft_theme_id: 'modern',
            draftThemeCustomization: { customColors: { primary: '#FF0000' } },
          },
        },
      ],
      rowCount: 1,
    });

    const store = await storeService.updateThemeDraft(STORE_ID, {
      draft_theme_id: 'modern',
      draftThemeCustomization: { customColors: { primary: '#FF0000' } },
    });

    expect(store.theme_id).toBe('classic');
    expect(store.settings?.draft_theme_id).toBe('modern');
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE pd_store'),
      expect.arrayContaining([STORE_ID]),
    );
  });

  it('publishes draft theme settings to live theme', async () => {
    // Mock getStoreById call
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: STORE_ID,
          theme_id: 'classic',
          settings: {
            themeCustomization: { colorPresetId: 'classic-preset' },
            draft_theme_id: 'modern',
            draftThemeCustomization: { colorPresetId: 'modern-preset' },
          },
        },
      ],
      rowCount: 1,
    });

    // Mock UPDATE call
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: STORE_ID,
          theme_id: 'modern',
          settings: {
            themeCustomization: { colorPresetId: 'modern-preset' },
            draft_theme_id: 'modern',
            draftThemeCustomization: { colorPresetId: 'modern-preset' },
          },
        },
      ],
      rowCount: 1,
    });

    const publishedStore = await storeService.publishThemeDraft(STORE_ID);

    expect(publishedStore.theme_id).toBe('modern');
    expect(publishedStore.settings?.themeCustomization).toEqual({ colorPresetId: 'modern-preset' });
  });

  it('rejects preview token validation when store ID mismatches', async () => {
    const token = signThemePreviewToken({ sub: USER_ID, store_id: 'pd_store_other' });

    await expect(storeService.getThemePreviewData(STORE_ID, token)).rejects.toThrow(
      PdForbiddenError,
    );
  });
});
