import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockTransaction, mockSendSms, mockGetSettings } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(),
  mockSendSms: vi.fn(),
  mockGetSettings: vi.fn(),
}));

vi.mock('../db/pool', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock('../services/sms.service', () => ({
  smsService: { sendSms: mockSendSms },
}));

vi.mock('../services/platform-config.service', () => ({
  platformConfigService: {
    getSettings: mockGetSettings,
    getSettingsFresh: mockGetSettings,
  },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { orderService, COD_OTP_TTL_MINUTES, COD_OTP_MAX_ATTEMPTS } from '../services/order.service';
import { sha256 } from '../utils/crypto';
import { logger } from '../utils/logger';

const EXISTING_VERIFICATION = {
  id: 'codv_1',
  order_id: 'ord_1',
  store_id: 'store_1',
  status: 'pending',
  call_attempts: 0,
  otp_sent_at: null,
  otp_hash: null,
  otp_expires_at: null,
  otp_attempts: 0,
  risk_score: 30,
  risk_factors: [],
};

describe('COD OTP hardening (audit P1-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({ marketplace_name: 'PandaMarket' });
  });

  describe('sendCodOtp', () => {
    it('never returns or logs the code, hashes it, sets an expiry, and SMSes the customer', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('SELECT * FROM pd_cod_verification')) return { rows: [EXISTING_VERIFICATION] };
        if (q.includes('COALESCE(u.phone')) return { rows: [{ phone: '+21620123456', customer_name: 'Ahmed' }] };
        if (q.includes('SET otp_hash')) return { rowCount: 1 };
        return { rows: [], rowCount: 0 };
      });
      mockSendSms.mockResolvedValue(true);

      const result = await orderService.sendCodOtp('ord_1', 'store_1');

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      // The response message must not contain a 6-digit code
      expect(result.message).not.toMatch(/\d{6}/);

      // The SMS goes to the CUSTOMER phone and carries the code
      expect(mockSendSms).toHaveBeenCalledTimes(1);
      const [phone, message] = mockSendSms.mock.calls[0];
      expect(phone).toBe('+21620123456');
      const codeMatch = String(message).match(/\b(\d{6})\b/);
      expect(codeMatch).not.toBeNull();
      const sentCode = codeMatch![1];

      // Only the hash is persisted, with expiry + attempt reset
      const updateCall = mockQuery.mock.calls.find((call) => String(call[0]).includes('SET otp_hash'));
      expect(updateCall).toBeDefined();
      expect(String(updateCall![0])).toContain('otp_expires_at = NOW() +');
      expect(String(updateCall![0])).toContain('otp_attempts = 0');
      expect(updateCall![1]).toContain(sha256(sentCode));
      expect(updateCall![1]).toContain(String(COD_OTP_TTL_MINUTES));
      // The plaintext code must never be a query parameter
      expect(updateCall![1]).not.toContain(sentCode);

      // The code must never reach the logs
      const loggedPayloads = (logger.info as unknown as { mock: { calls: unknown[][] } }).mock.calls
        .map((call) => JSON.stringify(call[0]))
        .join(' ');
      expect(loggedPayloads).not.toContain(sentCode);
    });

    it('rate-limits resends within the cooldown window', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        if (String(sql).includes('SELECT * FROM pd_cod_verification')) {
          return { rows: [{ ...EXISTING_VERIFICATION, otp_sent_at: new Date() }] };
        }
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.sendCodOtp('ord_1', 'store_1')).rejects.toThrow(/patienter/);
      expect(mockSendSms).not.toHaveBeenCalled();
    });

    it('refuses to send when the order has no customer phone number', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('SELECT * FROM pd_cod_verification')) return { rows: [EXISTING_VERIFICATION] };
        if (q.includes('COALESCE(u.phone')) return { rows: [{ phone: null, customer_name: null }] };
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.sendCodOtp('ord_1', 'store_1')).rejects.toThrow(
        /Aucun numéro de téléphone client/,
      );
      expect(mockSendSms).not.toHaveBeenCalled();
    });

    it('reports channel=none (no silent success) when SMS notifications are disabled', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('SELECT * FROM pd_cod_verification')) return { rows: [EXISTING_VERIFICATION] };
        if (q.includes('COALESCE(u.phone')) return { rows: [{ phone: '+21620123456', customer_name: 'Ahmed' }] };
        return { rows: [], rowCount: 0 };
      });
      mockSendSms.mockResolvedValue(false);

      const result = await orderService.sendCodOtp('ord_1', 'store_1');
      expect(result.success).toBe(false);
      expect(result.channel).toBe('none');
    });
  });

  describe('verifyCodOtp', () => {
    it('accepts the correct code, clears the hash, and marks the verification', async () => {
      const code = '123456';
      mockQuery.mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('SELECT * FROM pd_cod_verification')) {
          return {
            rows: [{
              ...EXISTING_VERIFICATION,
              otp_hash: sha256(code),
              otp_expires_at: new Date(Date.now() + 60_000),
              otp_attempts: 0,
            }],
          };
        }
        if (q.includes("status = 'otp_verified'")) {
          return { rows: [{ ...EXISTING_VERIFICATION, status: 'otp_verified', risk_score: 0 }] };
        }
        return { rows: [], rowCount: 0 };
      });

      const verification = await orderService.verifyCodOtp('ord_1', 'store_1', code);
      expect(verification.status).toBe('otp_verified');

      const updateCall = mockQuery.mock.calls.find((call) => String(call[0]).includes("status = 'otp_verified'"));
      expect(String(updateCall![0])).toContain('otp_hash = NULL');
      expect(String(updateCall![0])).toContain('otp_attempts = 0');
    });

    it('rejects a wrong code and increments the attempt counter', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('SELECT * FROM pd_cod_verification')) {
          return {
            rows: [{
              ...EXISTING_VERIFICATION,
              otp_hash: sha256('123456'),
              otp_expires_at: new Date(Date.now() + 60_000),
              otp_attempts: 1,
            }],
          };
        }
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.verifyCodOtp('ord_1', 'store_1', '999999')).rejects.toThrow('Code OTP invalide');

      const attemptCall = mockQuery.mock.calls.find((call) => String(call[0]).includes('otp_attempts = otp_attempts + 1'));
      expect(attemptCall).toBeDefined();
    });

    it('rejects an expired code', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        if (String(sql).includes('SELECT * FROM pd_cod_verification')) {
          return {
            rows: [{
              ...EXISTING_VERIFICATION,
              otp_hash: sha256('123456'),
              otp_expires_at: new Date(Date.now() - 1_000),
            }],
          };
        }
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.verifyCodOtp('ord_1', 'store_1', '123456')).rejects.toThrow(/expiré/);
    });

    it('locks verification after the maximum number of failed attempts', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        if (String(sql).includes('SELECT * FROM pd_cod_verification')) {
          return {
            rows: [{
              ...EXISTING_VERIFICATION,
              otp_hash: sha256('123456'),
              otp_expires_at: new Date(Date.now() + 60_000),
              otp_attempts: COD_OTP_MAX_ATTEMPTS,
            }],
          };
        }
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.verifyCodOtp('ord_1', 'store_1', '123456')).rejects.toThrow(/Trop de tentatives/);
    });

    it('rejects when no code was ever sent', async () => {
      mockQuery.mockImplementation(async (sql: string) => {
        if (String(sql).includes('SELECT * FROM pd_cod_verification')) {
          return { rows: [EXISTING_VERIFICATION] };
        }
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.verifyCodOtp('ord_1', 'store_1', '123456')).rejects.toThrow(/Aucun code actif/);
    });
  });
});
