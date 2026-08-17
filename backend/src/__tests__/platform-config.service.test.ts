import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const mockTransaction = vi.fn();
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  publish: vi.fn(),
};

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (...args: unknown[]) => mockTransaction(...args),
}));

vi.mock('../db/redis', () => ({
  getRedis: () => mockRedis,
  withRedisTimeout: <T>(promise: Promise<T>) => promise,
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { PdConflictError, PdErrorCode } from '../errors';
import { platformConfigService } from '../services/platform-config.service';

describe('PlatformConfigService section saves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.del.mockResolvedValue(1);
    mockRedis.publish.mockResolvedValue(1);
  });

  it('reports the newest timestamp for every settings section', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { key: 'marketplace_name', updated_at: new Date('2026-08-13T10:00:00.000Z') },
        { key: 'hub_homepage_layout', updated_at: new Date('2026-08-13T12:00:00.000Z') },
        { key: 'platform_commission_rate', updated_at: new Date('2026-08-13T11:00:00.000Z') },
      ],
    });

    const versions = await platformConfigService.getSectionVersions();

    expect(versions.marketplace).toBe('2026-08-13T12:00:00.000Z');
    expect(versions.finance).toBe('2026-08-13T11:00:00.000Z');
    expect(versions.shipping).toBeNull();
    expect(versions.security).toBeNull();
  });

  it('rejects a stale section version before writing any key', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ updated_at: new Date('2026-08-13T12:00:00.000Z') }] });
    mockTransaction.mockImplementation(async (callback: (client: { query: typeof clientQuery }) => Promise<unknown>) => (
      callback({ query: clientQuery })
    ));

    await expect(platformConfigService.updateSectionSettings(
      'marketplace',
      { marketplace_name: 'New Hub' },
      'admin_1',
      '2026-08-13T10:00:00.000Z',
    )).rejects.toMatchObject({
      code: PdErrorCode.SETTINGS_CONFLICT,
      httpStatus: 409,
    } satisfies Partial<PdConflictError>);

    expect(clientQuery).toHaveBeenCalledTimes(2);
    expect(clientQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO pd_platform_config'), expect.anything());
  });

  it('writes only allowed section keys when the version matches', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ updated_at: new Date('2026-08-13T12:00:00.000Z') }] })
      .mockResolvedValue({ rows: [] });
    mockTransaction.mockImplementation(async (callback: (client: { query: typeof clientQuery }) => Promise<unknown>) => (
      callback({ query: clientQuery })
    ));

    const updated = await platformConfigService.updateSectionSettings(
      'marketplace',
      { marketplace_name: 'New Hub', platform_commission_rate: 5 },
      'admin_1',
      '2026-08-13T12:00:00.000Z',
    );

    expect(updated).toEqual(['marketplace_name']);
    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pd_platform_config'),
      ['marketplace_name', 'New Hub', 'admin_1'],
    );
    expect(clientQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pd_platform_config'),
      expect.arrayContaining(['platform_commission_rate']),
    );
  });

  it('correctly provides watermark defaults and updates watermark section settings', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockQuery.mockResolvedValueOnce({
      rows: [
        { key: 'watermark_enabled', value: 'true' },
        { key: 'watermark_text', value: 'PandaTN' },
        { key: 'watermark_opacity', value: '75' },
      ],
    });

    const settings = await platformConfigService.getSettings();
    expect(settings.watermark_enabled).toBe(true);
    expect(settings.watermark_text).toBe('PandaTN');
    expect(settings.watermark_opacity).toBe(75);
    expect(settings.watermark_type).toBe('text');
    expect(settings.watermark_position).toBe('bottom-right');
    expect(settings.watermark_copy_protection).toBe(false);

    const publicSettings = await platformConfigService.getPublicSettings();
    expect(publicSettings.watermark_enabled).toBe(true);
    expect(publicSettings.watermark_text).toBe('PandaTN');
  });

  it('allows updating watermark fields in marketplace section update', async () => {
    const clientQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ updated_at: new Date('2026-08-17T12:00:00.000Z') }] })
      .mockResolvedValue({ rows: [] });
    mockTransaction.mockImplementation(async (callback: (client: { query: typeof clientQuery }) => Promise<unknown>) => (
      callback({ query: clientQuery })
    ));

    const updated = await platformConfigService.updateSectionSettings(
      'marketplace',
      {
        watermark_enabled: true,
        watermark_type: 'image',
        watermark_image_url: '/pd-product-images/marketplace/branding/pd_user_123/logo.png',
        watermark_opacity: 35,
      },
      'admin_user_123',
      '2026-08-17T12:00:00.000Z',
    );

    expect(updated).toContain('watermark_enabled');
    expect(updated).toContain('watermark_type');
    expect(updated).toContain('watermark_image_url');
    expect(updated).toContain('watermark_opacity');
  });
});


