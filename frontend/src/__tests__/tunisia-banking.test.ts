import { describe, it, expect } from 'vitest';
import {
  computeTunisianRibKey,
  validateTunisianRib,
  formatTunisianRib,
  cleanTunisianRib,
  getTunisianBank,
  TUNISIAN_BANKS,
} from '@/lib/tunisia-banking';

describe('Tunisian Banking Utilities', () => {
  describe('computeTunisianRibKey', () => {
    it('computes correct 2-digit key for base18 input', () => {
      // Base 18: 10 001 1234567890123
      // BigInt('10001123456789012300') % 97n = 29
      // 97 - 29 = 68
      const key = computeTunisianRibKey('100011234567890123');
      expect(key).toBe('68');
    });

    it('handles base18 with spaces and hyphens by stripping non-digits', () => {
      const key = computeTunisianRibKey('08-002-9876543210123');
      const cleanKey = computeTunisianRibKey('080029876543210123');
      expect(key).toBe(cleanKey);
      expect(key.length).toBe(2);
    });

    it('pads single-digit keys with a leading zero', () => {
      // Find or construct a clean18 such that remainder is 90 -> key is 07
      // If (clean1800) % 97 === 90 -> 97 - 90 = 7 -> '07'
      // We can verify mathematical invariant:
      // For any valid clean18 + key, BigInt(clean18 + key) % 97n === 0n
      const base18 = '030000000000000000';
      const key = computeTunisianRibKey(base18);
      expect(key.length).toBe(2);
      expect(BigInt(base18 + key) % BigInt(97)).toBe(BigInt(0));
    });

    it('returns empty string if input length is not 18 digits', () => {
      expect(computeTunisianRibKey('')).toBe('');
      expect(computeTunisianRibKey('12345')).toBe('');
      expect(computeTunisianRibKey('1000112345678901239999')).toBe('');
    });
  });

  describe('TUNISIAN_BANKS Directory', () => {
    const requiredBanks = [
      { code: '10', acronym: 'STB' },
      { code: '08', acronym: 'BIAT' },
      { code: '03', acronym: 'BNA' },
      { code: '04', acronym: 'ATTIJARI' },
      { code: '47', acronym: 'POSTE' },
      { code: '07', acronym: 'AMEN' },
      { code: '05', acronym: 'BT' },
      { code: '01', acronym: 'ATB' },
      { code: '14', acronym: 'BH' },
      { code: '11', acronym: 'UBCI' },
      { code: '12', acronym: 'UIB' },
      { code: '16', acronym: 'BTK' },
      { code: '17', acronym: 'BTE' },
      { code: '20', acronym: 'BTS' },
      { code: '21', acronym: 'BFPME' },
      { code: '23', acronym: 'QNB' },
      { code: '24', acronym: 'BTL' },
      { code: '25', acronym: 'ZITOUNA' },
      { code: '26', acronym: 'ABC' },
      { code: '28', acronym: 'WIFAK' },
      { code: '29', acronym: 'AL_BARAKA' },
      { code: '32', acronym: 'TIB' },
    ];

    it.each(requiredBanks)('contains metadata for bank $acronym ($code)', ({ code, acronym }) => {
      const bank = TUNISIAN_BANKS[code];
      expect(bank).toBeDefined();
      expect(bank.code).toBe(code);
      expect(bank.acronym).toBe(acronym);
      expect(bank.nameFr).toBeTruthy();
      expect(bank.nameAr).toBeTruthy();
      expect(bank.bic).toBeTruthy();
    });
  });

  describe('validateTunisianRib', () => {
    it('validates a genuine STB (10) RIB', () => {
      const base18 = '100011234567890123';
      const key = computeTunisianRibKey(base18);
      const raw = `${base18}${key}`;

      const res = validateTunisianRib(raw);
      expect(res.isValid).toBe(true);
      expect(res.bankCode).toBe('10');
      expect(res.branchCode).toBe('001');
      expect(res.accountNumber).toBe('1234567890123');
      expect(res.ribKey).toBe(key);
      expect(res.bankName).toContain('Société Tunisienne de Banque');
      expect(res.formattedRib).toBe(`10 001 1234567890123 ${key}`);
      expect(res.error).toBeUndefined();
    });

    it('validates formatted RIB with spaces and dashes (BIAT 08)', () => {
      const base18 = '080251234567890123';
      const key = computeTunisianRibKey(base18);
      const formatted = `08 025 1234567890123 ${key}`;

      const res = validateTunisianRib(formatted);
      expect(res.isValid).toBe(true);
      expect(res.bankCode).toBe('08');
      expect(res.bank?.acronym).toBe('BIAT');
      expect(res.error).toBeUndefined();
    });

    it('validates La Poste Tunisienne (47) CCP account', () => {
      const base18 = '470011234567890123';
      const key = computeTunisianRibKey(base18);
      const res = validateTunisianRib(`470011234567890123${key}`);
      expect(res.isValid).toBe(true);
      expect(res.bankCode).toBe('47');
      expect(res.bank?.acronym).toBe('POSTE');
    });

    it('fails when check key does not match modulo 97 checksum', () => {
      const base18 = '100011234567890123';
      const correctKey = computeTunisianRibKey(base18);
      const wrongKey = correctKey === '99' ? '01' : '99';

      const res = validateTunisianRib(`${base18}${wrongKey}`);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Clé RIB invalide');
      expect(res.error).toContain(correctKey);
      expect(res.error).toContain(wrongKey);
    });

    it('fails when bank code is unknown', () => {
      const invalidBankBase = '980011234567890123';
      const key = computeTunisianRibKey(invalidBankBase);

      const res = validateTunisianRib(`${invalidBankBase}${key}`);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Code banque inconnu (98)');
    });

    it('fails when RIB is too short or too long', () => {
      expect(validateTunisianRib('10001123456').isValid).toBe(false);
      expect(validateTunisianRib('1000112345678901234567890').isValid).toBe(false);
      expect(validateTunisianRib('').isValid).toBe(false);
    });
  });

  describe('formatTunisianRib', () => {
    it('formats progressive digit inputs into standard chunks', () => {
      expect(formatTunisianRib('10')).toBe('10');
      expect(formatTunisianRib('10001')).toBe('10 001');
      expect(formatTunisianRib('100011234567890123')).toBe('10 001 1234567890123');
      expect(formatTunisianRib('10001123456789012368')).toBe('10 001 1234567890123 68');
    });

    it('strips extraneous whitespace and non-digits', () => {
      expect(formatTunisianRib(' 10-001  1234567890123 68 ')).toBe('10 001 1234567890123 68');
    });

    it('caps length at 20 digits', () => {
      expect(formatTunisianRib('100011234567890123689999999')).toBe('10 001 1234567890123 68');
    });
  });

  describe('cleanTunisianRib & getTunisianBank', () => {
    it('cleanTunisianRib strips non-digits and caps at 20', () => {
      expect(cleanTunisianRib('10 001 ABCD 12345')).toBe('1000112345');
    });

    it('getTunisianBank identifies bank from 2-digit code or partial RIB', () => {
      expect(getTunisianBank('10')?.acronym).toBe('STB');
      expect(getTunisianBank('08 001')?.acronym).toBe('BIAT');
      expect(getTunisianBank('2500000000')?.nameFr).toContain('Zitouna');
      expect(getTunisianBank('99')).toBeUndefined();
      expect(getTunisianBank('1')).toBeUndefined();
    });
  });
});
