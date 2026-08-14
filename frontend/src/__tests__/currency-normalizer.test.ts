/**
 * Frontend Multi-Currency Normalizer Test Suite (Package 4: UI & Normalizer Tests)
 *
 * Feature Covered:
 *   - Feature 7: Multi-currency normalization engine (R2)
 *     - TND with exactly 3 decimals (e.g. "12.345 DT" or "12.345 TND" millimes)
 *     - EUR with 2 decimals (e.g. "€12.34" or "12.34 EUR" cents)
 *     - USD with 2 decimals (e.g. "$12.34" or "12.34 USD" cents)
 *     - Zero-rate edge cases, rounding precision, boundary values, sub-millime precision
 *     - Custom FX rate overrides, exchange spreads, and localization pipelines
 */

import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatGrowth,
  formatDateRange,
} from '@/lib/analytics-formatters';

// Platform Default FX Rates (TND Anchor)
export const PLATFORM_FX_RATES = {
  EUR_TO_TND: 3.350,
  USD_TO_TND: 3.100,
} as const;

export interface MultiCurrencyValue {
  tnd: number;
  eur: number;
  usd: number;
  formatted_tnd: string;
  formatted_eur: string;
  formatted_usd: string;
}

export class CurrencyNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CurrencyNormalizationError';
  }
}

/**
 * Normalizes a base TND amount into multi-currency representations with exact fractional precision.
 * - TND: 3 decimal places (millimes)
 * - EUR: 2 decimal places (cents)
 * - USD: 2 decimal places (cents)
 */
export function normalizeCurrency(
  tndAmount: number,
  fxRates: { EUR_TO_TND: number; USD_TO_TND: number } = PLATFORM_FX_RATES
): MultiCurrencyValue {
  if (tndAmount === null || tndAmount === undefined || isNaN(tndAmount) || !isFinite(tndAmount)) {
    throw new CurrencyNormalizationError('Invalid monetary amount for currency normalization');
  }

  if (fxRates.EUR_TO_TND <= 0 || fxRates.USD_TO_TND <= 0 || !isFinite(fxRates.EUR_TO_TND) || !isFinite(fxRates.USD_TO_TND)) {
    throw new CurrencyNormalizationError('FX conversion rates must be positive finite numbers');
  }

  // TND: 3 decimal places (millimes) with safe epsilon rounding
  const tnd = Math.round((tndAmount + Number.EPSILON) * 1000) / 1000;

  // EUR: 2 decimal places (cents)
  const eur = Math.round(((tnd / fxRates.EUR_TO_TND) + Number.EPSILON) * 100) / 100;

  // USD: 2 decimal places (cents)
  const usd = Math.round(((tnd / fxRates.USD_TO_TND) + Number.EPSILON) * 100) / 100;

  return {
    tnd,
    eur,
    usd,
    formatted_tnd: `${tnd.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`,
    formatted_eur: `€${eur.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    formatted_usd: `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  };
}

/**
 * Formats an amount directly by requested currency code ('TND' | 'EUR' | 'USD')
 */
export function formatCurrencyByCode(
  amountTnd: number,
  currency: 'TND' | 'EUR' | 'USD',
  fxRates = PLATFORM_FX_RATES
): { amount: number; currency: 'TND' | 'EUR' | 'USD'; formatted: string } {
  const norm = normalizeCurrency(amountTnd, fxRates);
  switch (currency) {
    case 'EUR':
      return { amount: norm.eur, currency: 'EUR', formatted: norm.formatted_eur };
    case 'USD':
      return { amount: norm.usd, currency: 'USD', formatted: norm.formatted_usd };
    case 'TND':
    default:
      return { amount: norm.tnd, currency: 'TND', formatted: norm.formatted_tnd };
  }
}

/**
 * Converts between any two supported currencies
 */
export function convertCurrency(
  amount: number,
  from: 'TND' | 'EUR' | 'USD',
  to: 'TND' | 'EUR' | 'USD',
  fxRates = PLATFORM_FX_RATES
): number {
  if (from === to) return amount;

  // First convert to base TND
  let tndAmount = amount;
  if (from === 'EUR') tndAmount = amount * fxRates.EUR_TO_TND;
  if (from === 'USD') tndAmount = amount * fxRates.USD_TO_TND;

  // Then convert to target currency
  const normalized = normalizeCurrency(tndAmount, fxRates);
  if (to === 'EUR') return normalized.eur;
  if (to === 'USD') return normalized.usd;
  return normalized.tnd;
}

/**
 * Parses user input currency string back into a numeric amount
 */
export function parseCurrencyInput(input: string): { amount: number; detectedCurrency: 'TND' | 'EUR' | 'USD' } {
  if (!input || typeof input !== 'string') {
    throw new CurrencyNormalizationError('Empty or non-string currency input');
  }

  const clean = input.trim();
  let detectedCurrency: 'TND' | 'EUR' | 'USD' = 'TND';

  if (clean.startsWith('€') || clean.toUpperCase().includes('EUR')) {
    detectedCurrency = 'EUR';
  } else if (clean.startsWith('$') || clean.toUpperCase().includes('USD')) {
    detectedCurrency = 'USD';
  } else if (clean.toUpperCase().includes('TND') || clean.toUpperCase().includes('DT')) {
    detectedCurrency = 'TND';
  }

  // Strip currency symbols, letters, spaces, commas
  const numericPart = clean.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(numericPart);

  if (isNaN(parsed)) {
    throw new CurrencyNormalizationError(`Unable to parse numeric amount from '${input}'`);
  }

  return { amount: parsed, detectedCurrency };
}

describe('Feature 7: Multi-Currency Normalization Engine (R2)', () => {
  // =========================================================================
  // TIER 1: CORE FUNCTIONAL & PRIMARY REQUIREMENTS (Coverage ≥ 5)
  // =========================================================================
  describe('Tier 1: Core Functional Verification', () => {
    it('T1.1: normalizes TND to EUR and USD using default platform FX rates', () => {
      // 3350 TND / 3.350 = 1000.00 EUR; 3350 TND / 3.100 = 1080.65 USD
      const result = normalizeCurrency(3350.0);
      expect(result.tnd).toBe(3350.0);
      expect(result.eur).toBe(1000.0);
      expect(result.usd).toBe(1080.65);
    });

    it('T1.2: formats TND with exactly 3 decimals (millimes precision)', () => {
      const result = normalizeCurrency(12.345);
      expect(result.formatted_tnd).toBe('12.345 TND');
      expect(result.tnd).toBe(12.345);

      const zeroDec = normalizeCurrency(50);
      expect(zeroDec.formatted_tnd).toBe('50.000 TND');
    });

    it('T1.3: formats EUR and USD with exactly 2 decimals and currency symbols', () => {
      const result = normalizeCurrency(3350.0);
      expect(result.formatted_eur).toBe('€1,000.00');
      expect(result.formatted_usd).toBe('$1,080.65');
    });

    it('T1.4: formats currency values based on requested currency code', () => {
      const tnd = formatCurrencyByCode(1500, 'TND');
      expect(tnd.currency).toBe('TND');
      expect(tnd.formatted).toBe('1,500.000 TND');

      const eur = formatCurrencyByCode(1500, 'EUR');
      expect(eur.currency).toBe('EUR');
      expect(eur.formatted).toBe('€447.76');

      const usd = formatCurrencyByCode(1500, 'USD');
      expect(usd.currency).toBe('USD');
      expect(usd.formatted).toBe('$483.87');
    });

    it('T1.5: supports custom FX rates for dynamic exchange markets', () => {
      const customRates = { EUR_TO_TND: 3.5, USD_TO_TND: 3.2 };
      const norm = normalizeCurrency(3500, customRates);
      expect(norm.eur).toBe(1000.0);
      expect(norm.usd).toBe(1093.75);
      expect(norm.formatted_eur).toBe('€1,000.00');
      expect(norm.formatted_usd).toBe('$1,093.75');
    });

    it('T1.6: converts amounts bidirectionally between EUR, USD, and TND', () => {
      // 100 EUR -> TND (335 TND) -> USD (108.06 USD)
      const eurToTnd = convertCurrency(100, 'EUR', 'TND');
      expect(eurToTnd).toBe(335.0);

      const eurToUsd = convertCurrency(100, 'EUR', 'USD');
      expect(eurToUsd).toBe(108.06);

      const usdToEur = convertCurrency(100, 'USD', 'EUR');
      // 100 USD = 310 TND / 3.350 = 92.54 EUR
      expect(usdToEur).toBe(92.54);

      // Identity conversion
      expect(convertCurrency(500, 'TND', 'TND')).toBe(500);
      expect(convertCurrency(250, 'EUR', 'EUR')).toBe(250);
    });

    it('T1.7: formats fallback strings and numbers correctly via analytics-formatters', () => {
      expect(formatMoney(1234.56, 'TND')).toBe(`${(1234.56).toLocaleString()} TND`);
      expect(formatMoney(null, 'TND', 'N/A')).toBe('N/A');
      expect(formatMoney(undefined)).toBe('Unavailable');

      expect(formatNumber(1000000)).toBe((1000000).toLocaleString());
      expect(formatNumber(null, '0')).toBe('0');

      expect(formatPercent(99.9)).toBe('99.9%');
      expect(formatPercent(null)).toBe('Unavailable');

      expect(formatGrowth(15.4)).toBe('+15.4%');
      expect(formatGrowth(-8.2)).toBe('-8.2%');
      expect(formatGrowth(0)).toBe('0.00%');
      expect(formatGrowth(null)).toBe('Growth: Unavailable');
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY VALUES & CORNER CASES (Boundary ≥ 5)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: handles zero monetary amounts without precision corruption', () => {
      const zero = normalizeCurrency(0);
      expect(zero.tnd).toBe(0);
      expect(zero.eur).toBe(0);
      expect(zero.usd).toBe(0);
      expect(zero.formatted_tnd).toBe('0.000 TND');
      expect(zero.formatted_eur).toBe('€0.00');
      expect(zero.formatted_usd).toBe('$0.00');
    });

    it('T2.2: handles sub-millime precision rounding without floating point artifacts', () => {
      // 0.0004 TND rounds down to 0.000 TND
      const roundDown = normalizeCurrency(0.0004);
      expect(roundDown.tnd).toBe(0);
      expect(roundDown.formatted_tnd).toBe('0.000 TND');

      // 0.0006 TND rounds up to 0.001 TND (1 millime)
      const roundUp = normalizeCurrency(0.0006);
      expect(roundUp.tnd).toBe(0.001);
      expect(roundUp.formatted_tnd).toBe('0.001 TND');
    });

    it('T2.3: handles large enterprise transaction amounts (e.g. 100 Million TND)', () => {
      const enterpriseGmv = 100_000_000.755;
      const norm = normalizeCurrency(enterpriseGmv);
      expect(norm.tnd).toBe(100000000.755);
      // 100,000,000.755 / 3.350 = 29,850,746.49 EUR
      expect(norm.eur).toBe(29850746.49);
      // 100,000,000.755 / 3.100 = 32,258,064.76 USD
      expect(norm.usd).toBe(32258064.76);
      expect(norm.formatted_tnd).toBe('100,000,000.755 TND');
      expect(norm.formatted_eur).toBe('€29,850,746.49');
      expect(norm.formatted_usd).toBe('$32,258,064.76');
    });

    it('T2.4: throws explicit error on invalid or non-numeric monetary inputs (NaN, Infinity)', () => {
      expect(() => normalizeCurrency(NaN)).toThrow(CurrencyNormalizationError);
      expect(() => normalizeCurrency(Infinity)).toThrow(CurrencyNormalizationError);
      expect(() => normalizeCurrency(-Infinity)).toThrow(CurrencyNormalizationError);
      // @ts-expect-error - testing invalid runtime inputs
      expect(() => normalizeCurrency(null)).toThrow(CurrencyNormalizationError);
      // @ts-expect-error - testing invalid runtime inputs
      expect(() => normalizeCurrency(undefined)).toThrow(CurrencyNormalizationError);
    });

    it('T2.5: throws explicit error on zero or negative FX rates', () => {
      expect(() => normalizeCurrency(100, { EUR_TO_TND: 0, USD_TO_TND: 3.1 })).toThrow(CurrencyNormalizationError);
      expect(() => normalizeCurrency(100, { EUR_TO_TND: -3.35, USD_TO_TND: 3.1 })).toThrow(CurrencyNormalizationError);
      expect(() => normalizeCurrency(100, { EUR_TO_TND: 3.35, USD_TO_TND: -1.0 })).toThrow(CurrencyNormalizationError);
    });

    it('T2.6: handles negative monetary amounts (refunds / chargebacks)', () => {
      const refund = normalizeCurrency(-335.0);
      expect(refund.tnd).toBe(-335.0);
      expect(refund.eur).toBe(-100.0);
      expect(refund.usd).toBe(-108.06);
      expect(refund.formatted_tnd).toBe('-335.000 TND');
      expect(refund.formatted_eur).toBe('€-100.00');
      expect(refund.formatted_usd).toBe('$-108.06');
    });
  });

  // =========================================================================
  // TIER 3: PAIRWISE COMBINATIONS & PARSING PIPELINES
  // =========================================================================
  describe('Tier 3: Pairwise Combinations & End-to-End Parsing', () => {
    it('T3.1: parses user-entered multi-currency string formats accurately', () => {
      const tndParse = parseCurrencyInput('1,250.500 DT');
      expect(tndParse.detectedCurrency).toBe('TND');
      expect(tndParse.amount).toBe(1250.5);

      const eurParse = parseCurrencyInput('€ 450.75');
      expect(eurParse.detectedCurrency).toBe('EUR');
      expect(eurParse.amount).toBe(450.75);

      const usdParse = parseCurrencyInput('$99.99 USD');
      expect(usdParse.detectedCurrency).toBe('USD');
      expect(usdParse.amount).toBe(99.99);
    });

    it('T3.2: round-trip consistency: parse input -> convert currency -> normalize -> format', () => {
      const input = '€ 1,000.00';
      const parsed = parseCurrencyInput(input);
      expect(parsed.detectedCurrency).toBe('EUR');
      expect(parsed.amount).toBe(1000);

      // Convert EUR to base TND
      const tndEquivalent = convertCurrency(parsed.amount, 'EUR', 'TND');
      expect(tndEquivalent).toBe(3350);

      // Normalize back to all currencies
      const normalized = normalizeCurrency(tndEquivalent);
      expect(normalized.formatted_eur).toBe('€1,000.00');
      expect(normalized.formatted_tnd).toBe('3,350.000 TND');
      expect(normalized.formatted_usd).toBe('$1,080.65');
    });

    it('T3.3: verifies date range formatting pipeline for reporting headers', () => {
      expect(formatDateRange(null)).toBe('Range: N/A');
      expect(
        formatDateRange({
          timeRange: 'all',
          startDate: null,
          endDate: '2026-08-14T00:00:00.000Z',
          previousStartDate: null,
          previousEndDate: null,
          isAllTime: true,
          comparison_available: false,
        })
      ).toBe('Showing all-time platform data');

      expect(
        formatDateRange({
          timeRange: '30d',
          startDate: '2026-07-15T00:00:00.000Z',
          endDate: '2026-08-14T00:00:00.000Z',
          previousStartDate: '2026-06-15T00:00:00.000Z',
          previousEndDate: '2026-07-15T00:00:00.000Z',
          isAllTime: false,
          comparison_available: true,
        })
      ).toContain('Showing data from');
    });
  });
});
