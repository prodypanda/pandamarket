import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedisStore = new Map<string, string>();

const mockRedis = {
  get: vi.fn((key: string) => Promise.resolve(mockRedisStore.get(key) || null)),
  setex: vi.fn((key: string, _ttl: number, val: string) => {
    mockRedisStore.set(key, val);
    return Promise.resolve('OK');
  }),
  del: vi.fn((key: string) => {
    mockRedisStore.delete(key);
    return Promise.resolve(1);
  }),
  incr: vi.fn((key: string) => {
    const cur = parseInt(mockRedisStore.get(key) || '0', 10);
    const next = cur + 1;
    mockRedisStore.set(key, String(next));
    return Promise.resolve(next);
  }),
  expire: vi.fn(() => Promise.resolve(1)),
};

vi.mock('../db/redis', () => ({
  getRedis: () => mockRedis,
  withRedisTimeout: (p: any) => p,
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: vi.fn().mockResolvedValue({
      notifications_sms_enabled: true,
      notifications_sms_provider: 'console',
      notifications_sms_sender_name: 'PandaMarket',
    }),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { smsService } from '../services/sms.service';
import { PdValidationError } from '../errors';

describe('PLAN-M-09: Customer Phone Number OTP Verification Engine', () => {
  beforeEach(() => {
    mockRedisStore.clear();
    vi.clearAllMocks();
  });

  it('validates Tunisian phone format and generates 6-digit OTP stored in Redis', async () => {
    const result = await smsService.sendOtp('20123456');
    expect(result.message).toContain('Code de vérification');

    // Verify OTP was stored in Redis with normalized phone (+21620123456)
    const storedOtp = mockRedisStore.get('pd:otp:+21620123456');
    expect(storedOtp).toBeDefined();
    expect(storedOtp?.length).toBe(6);
  });

  it('rejects invalid phone number formats', async () => {
    await expect(smsService.sendOtp('12345')).rejects.toThrow(PdValidationError);
    await expect(smsService.sendOtp('abcdefgh')).rejects.toThrow(PdValidationError);
  });

  it('verifies valid OTP and deletes Redis keys on success', async () => {
    mockRedisStore.set('pd:otp:+21620123456', '778899');

    const isValid = await smsService.verifyOtp('20123456', '778899');
    expect(isValid).toBe(true);

    // Verify key was cleaned up
    expect(mockRedisStore.get('pd:otp:+21620123456')).toBeUndefined();
  });

  it('rejects wrong OTP and tracks failed attempts', async () => {
    mockRedisStore.set('pd:otp:+21620123456', '778899');

    const isValid = await smsService.verifyOtp('20123456', '000000');
    expect(isValid).toBe(false);

    const attempts = mockRedisStore.get('pd:otp_attempts:+21620123456');
    expect(attempts).toBe('1');
  });
});
