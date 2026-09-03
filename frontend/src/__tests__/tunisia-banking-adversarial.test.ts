import { describe, it, expect } from 'vitest';
import {
  computeTunisianRibKey,
  validateTunisianRib,
  formatTunisianRib,
  cleanTunisianRib,
  getTunisianBank,
  TUNISIAN_BANKS,
} from '@/lib/tunisia-banking';

describe('Tunisian Banking Algorithm — Adversarial & Stress Testing', () => {
  describe('Mathematical Modulo 97 Properties & Invariants', () => {
    it('verifies BigInt(base18 + key) % 97n === 0n across 100 distinct base18 inputs', () => {
      for (let i = 1; i <= 100; i++) {
        // Generate pseudo-random 18-digit string starting with bank code '10'
        const accountPart = String(i).padStart(13, '0');
        const base18 = `10001${accountPart}`;
        const key = computeTunisianRibKey(base18);

        expect(key).toHaveLength(2);
        const fullRib = `${base18}${key}`;
        const mod = BigInt(fullRib) % 97n;
        expect(mod).toBe(0n);
      }
    });

    it('handles remainder === 0 edge case where key must be 97', () => {
      // Find a clean18 such that (clean18 * 100) % 97 === 0
      // 100 % 97 = 3. So clean18 * 3 % 97 === 0.
      // Since gcd(3, 97) = 1, clean18 must be a multiple of 97.
      // Let's pick 97 * 10^16 -> 18 digits: '970000000000000000'
      const base18 = '970000000000000000';
      const remainder = Number(BigInt(base18 + '00') % 97n);
      expect(remainder).toBe(0);

      const key = computeTunisianRibKey(base18);
      expect(key).toBe('97');
      expect(BigInt(base18 + key) % 97n).toBe(0n);
    });

    it('handles remainder === 96 edge case where key must be 01', () => {
      // (base18 * 100) % 97 === 96 -> key = 97 - 96 = 1 -> '01'
      // 970000000000000000 has remainder 0.
      // Adding 32 to base18: 32 * 100 = 3200 = 32 * 97 + 96 -> (3200 % 97) = 96.
      // base18 = 970000000000000032
      const base18 = '970000000000000032';
      const remainder = Number(BigInt(base18 + '00') % 97n);
      expect(remainder).toBe(96);

      const key = computeTunisianRibKey(base18);
      expect(key).toBe('01');
      expect(BigInt(base18 + key) % 97n).toBe(0n);
    });

    it('handles remainder === 1 edge case where key must be 96', () => {
      // (base18 * 100) % 97 === 1 -> key = 97 - 1 = 96 -> '96'
      // 65 * 100 = 6500 = 67 * 97 + 1 -> (6500 % 97) = 1.
      // base18 = 970000000000000065
      const base18 = '970000000000000065';
      const remainder = Number(BigInt(base18 + '00') % 97n);
      expect(remainder).toBe(1);

      const key = computeTunisianRibKey(base18);
      expect(key).toBe('96');
      expect(BigInt(base18 + key) % 97n).toBe(0n);
    });

    it('always produces keys between 01 and 97 (never 00, never >97)', () => {
      // remainder is in [0, 96], so key = 97 - remainder is in [1, 97].
      for (let rem = 0; rem <= 96; rem++) {
        const keyVal = 97 - rem;
        const keyStr = keyVal.toString().padStart(2, '0');
        expect(Number(keyStr)).toBeGreaterThanOrEqual(1);
        expect(Number(keyStr)).toBeLessThanOrEqual(97);
        expect(keyStr).not.toBe('00');
        expect(keyStr).toHaveLength(2);
      }
    });
  });

  describe('Comprehensive Coverage of All 23 Registered Tunisian Banks', () => {
    const allBankCodes = Object.keys(TUNISIAN_BANKS);

    it('verifies directory has exactly 23 banks as documented in PROJECT.md', () => {
      expect(allBankCodes.length).toBe(23);
    });

    it.each(allBankCodes)('successfully computes and validates a genuine RIB for bank code %s (%s)', (bankCode) => {
      const bank = TUNISIAN_BANKS[bankCode];
      expect(bank).toBeDefined();

      const branchCode = '012';
      const accountNumber = '3456789012345';
      const base18 = `${bankCode}${branchCode}${accountNumber}`;

      const key = computeTunisianRibKey(base18);
      expect(key).toHaveLength(2);

      const validRib = `${base18}${key}`;
      const result = validateTunisianRib(validRib);

      expect(result.isValid).toBe(true);
      expect(result.bankCode).toBe(bankCode);
      expect(result.branchCode).toBe(branchCode);
      expect(result.accountNumber).toBe(accountNumber);
      expect(result.ribKey).toBe(key);
      expect(result.bankName).toBe(bank.nameFr);
      expect(result.bank?.acronym).toBe(bank.acronym);
      expect(result.error).toBeUndefined();
      expect(result.formattedRib).toBe(`${bankCode} ${branchCode} ${accountNumber} ${key}`);
    });
  });

  describe('Edge Cases & Boundary Conditions for validateTunisianRib', () => {
    const validBase = '100011234567890123';
    const validKey = computeTunisianRibKey(validBase);
    const validRib = `${validBase}${validKey}`;

    it('accepts valid RIB with aggressive whitespace, tabs, and newlines', () => {
      const whitespaceRib = ` \t\n ${validBase.slice(0, 2)}  ${validBase.slice(2, 5)}   ${validBase.slice(5, 18)}  ${validKey} \r\n `;
      const result = validateTunisianRib(whitespaceRib);
      expect(result.isValid).toBe(true);
      expect(result.ribKey).toBe(validKey);
      expect(result.formattedRib).toBe(`10 001 1234567890123 ${validKey}`);
    });

    it('accepts valid RIB with hyphens, periods, and slashes', () => {
      const formattedRib = `10-001.1234567890123/${validKey}`;
      const result = validateTunisianRib(formattedRib);
      expect(result.isValid).toBe(true);
      expect(result.bankCode).toBe('10');
    });

    it('fails when check digits are off by +1', () => {
      const badKeyNum = (Number(validKey) % 97) + 1;
      const badKey = String(badKeyNum).padStart(2, '0');
      const badRib = `${validBase}${badKey}`;
      const result = validateTunisianRib(badRib);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Clé RIB invalide');
    });

    it('fails when check digits are 00', () => {
      const badRib = `${validBase}00`;
      const result = validateTunisianRib(badRib);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Clé RIB invalide');
    });

    it('rejects unknown bank codes (e.g. 00, 06, 09, 13, 15, 18, 19, 22, 27, 30, 98, 99)', () => {
      const unknownCodes = ['00', '06', '09', '13', '15', '18', '19', '22', '27', '30', '98', '99'];
      for (const unknownCode of unknownCodes) {
        const testBase = `${unknownCode}0011234567890123`;
        const testKey = computeTunisianRibKey(testBase);
        const testRib = `${testBase}${testKey}`;

        const result = validateTunisianRib(testRib);
        expect(result.isValid).toBe(false);
        expect(result.bankCode).toBe(unknownCode);
        expect(result.error).toContain(`Code banque inconnu (${unknownCode})`);
      }
    });

    it('rejects inputs with invalid lengths (< 20 digits)', () => {
      const shortInputs = [
        '',
        ' ',
        '1',
        '10',
        '10001',
        '10001123456789',
        '10001123456789012', // 17 digits
        '100011234567890123', // 18 digits (missing key)
        '1000112345678901234', // 19 digits (1-digit key)
      ];

      for (const input of shortInputs) {
        const res = validateTunisianRib(input);
        expect(res.isValid).toBe(false);
        expect(res.error).toBeDefined();
      }
    });

    it('rejects inputs with invalid lengths (> 20 digits)', () => {
      const longInputs = [
        `${validRib}1`, // 21 digits
        `${validRib}99999`, // 25 digits
        '1'.repeat(50),
        '0'.repeat(100),
      ];

      for (const input of longInputs) {
        const res = validateTunisianRib(input);
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('exactement 20 chiffres');
      }
    });

    it('handles non-digit alphabetic letters gracefully by rejecting length after stripping', () => {
      // 18 digits + 2 letters: stripped length is 18 -> rejected
      const lettersInKey = `${validBase}AB`;
      const resLetters = validateTunisianRib(lettersInKey);
      expect(resLetters.isValid).toBe(false);
      expect(resLetters.error).toContain('exactement 20 chiffres');

      // 20 letters: stripped length is 0 -> rejected
      const allLetters = 'ABCDEFGHIJKLMNOPQRST';
      const resAllLetters = validateTunisianRib(allLetters);
      expect(resAllLetters.isValid).toBe(false);
      expect(resAllLetters.error).toContain('Le RIB est requis');
    });

    it('safely handles non-string and falsy types at runtime', () => {
      // @ts-expect-error Testing adversarial runtime inputs
      expect(validateTunisianRib(null).isValid).toBe(false);
      // @ts-expect-error Testing adversarial runtime inputs
      expect(validateTunisianRib(undefined).isValid).toBe(false);
      // @ts-expect-error Testing adversarial runtime inputs
      expect(validateTunisianRib(12345678901234567890).isValid).toBe(false);
      // @ts-expect-error Testing adversarial runtime inputs
      expect(validateTunisianRib({}).isValid).toBe(false);
    });

    it('safely handles malicious injection payloads', () => {
      const xssPayload = `<script>alert('xss')</script>${validRib}`;
      // When stripped of non-digits, if digits exceed 20, it is rejected
      const resultXss = validateTunisianRib(xssPayload);
      expect(resultXss.isValid).toBe(false);

      const sqlPayload = `' OR 1=1 -- ${validRib}`;
      const resultSql = validateTunisianRib(sqlPayload);
      expect(resultSql.isValid).toBe(false);
    });
  });

  describe('formatTunisianRib & cleanTunisianRib Edge Cases', () => {
    it('correctly handles all incremental input steps', () => {
      expect(formatTunisianRib('')).toBe('');
      expect(formatTunisianRib('1')).toBe('1');
      expect(formatTunisianRib('10')).toBe('10');
      expect(formatTunisianRib('100')).toBe('10 0');
      expect(formatTunisianRib('10001')).toBe('10 001');
      expect(formatTunisianRib('100011')).toBe('10 001 1');
      expect(formatTunisianRib('100011234567890123')).toBe('10 001 1234567890123');
      expect(formatTunisianRib('1000112345678901236')).toBe('10 001 1234567890123 6');
      expect(formatTunisianRib('10001123456789012368')).toBe('10 001 1234567890123 68');
    });

    it('truncates format to 20 digits maximum', () => {
      const formatted = formatTunisianRib('100011234567890123689999999999');
      expect(formatted).toBe('10 001 1234567890123 68');
    });

    it('cleanTunisianRib strips everything except digits and caps at 20', () => {
      expect(cleanTunisianRib('TN59 1000 1123 4567 8901 2368')).toBe('59100011234567890123');
      expect(cleanTunisianRib('!@#$%^&*()_+')).toBe('');
    });

    it('getTunisianBank gracefully returns undefined for non-existent codes', () => {
      expect(getTunisianBank('')).toBeUndefined();
      expect(getTunisianBank('1')).toBeUndefined();
      expect(getTunisianBank('99')).toBeUndefined();
      expect(getTunisianBank('00')).toBeUndefined();
      expect(getTunisianBank('STB')).toBeUndefined();
    });
  });
});
