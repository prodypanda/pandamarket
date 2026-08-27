export type SupportedCurrency = 'TND' | 'EUR' | 'USD' | 'SAR';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  rateFromTnd: number; // 1 TND in target currency
  decimals: number;
}

export const DEFAULT_EXCHANGE_RATES: Record<SupportedCurrency, CurrencyConfig> = {
  TND: {
    code: 'TND',
    symbol: 'DT',
    name: 'Dinar Tunisien',
    rateFromTnd: 1.0,
    decimals: 3,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rateFromTnd: 0.30,
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateFromTnd: 0.32,
    decimals: 2,
  },
  SAR: {
    code: 'SAR',
    symbol: 'SAR',
    name: 'Riyal Saoudien',
    rateFromTnd: 1.20,
    decimals: 2,
  },
};

/**
 * Convert an amount in TND to target display currency.
 */
export function convertTndTo(amountTnd: number, target: SupportedCurrency, customRates = DEFAULT_EXCHANGE_RATES): number {
  const cfg = customRates[target] || DEFAULT_EXCHANGE_RATES[target];
  const converted = amountTnd * cfg.rateFromTnd;
  return Number(converted.toFixed(cfg.decimals));
}

/**
 * Format price with optional secondary currency conversion preview.
 * Example: "45.000 TND (≈ 13.50 €)"
 */
export function formatPriceWithPreview(
  amountTnd: number,
  displayCurrency: SupportedCurrency = 'TND',
  showBaseTnd = true,
): string {
  const tndStr = `${amountTnd.toFixed(3)} TND`;
  if (displayCurrency === 'TND') {
    return tndStr;
  }

  const converted = convertTndTo(amountTnd, displayCurrency);
  const cfg = DEFAULT_EXCHANGE_RATES[displayCurrency];
  const convertedStr = `${converted.toFixed(cfg.decimals)} ${cfg.symbol}`;

  if (showBaseTnd) {
    return `${tndStr} (≈ ${convertedStr})`;
  }
  return convertedStr;
}
