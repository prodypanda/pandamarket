'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedCurrency, formatPriceWithPreview, convertTndTo } from '../lib/currency';

interface CurrencyContextType {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
  formatPrice: (amountTnd: number, showBase?: boolean) => string;
  convertToSelected: (amountTnd: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'TND',
  setCurrency: () => {},
  formatPrice: (amt) => `${amt.toFixed(3)} TND`,
  convertToSelected: (amt) => amt,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>('TND');

  useEffect(() => {
    const saved = localStorage.getItem('pd_currency') as SupportedCurrency;
    if (saved && ['TND', 'EUR', 'USD', 'SAR'].includes(saved)) {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (c: SupportedCurrency) => {
    setCurrencyState(c);
    localStorage.setItem('pd_currency', c);
  };

  const formatPrice = (amountTnd: number, showBase = true) => {
    return formatPriceWithPreview(amountTnd, currency, showBase);
  };

  const convertToSelected = (amountTnd: number) => {
    return convertTndTo(amountTnd, currency);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertToSelected }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
