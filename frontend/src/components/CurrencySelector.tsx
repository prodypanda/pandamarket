'use client';

import React from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { SupportedCurrency, DEFAULT_EXCHANGE_RATES } from '../lib/currency';

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="relative inline-block text-left">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
        className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        aria-label="Sélectionner la devise d'affichage"
      >
        {Object.values(DEFAULT_EXCHANGE_RATES).map((cfg) => (
          <option key={cfg.code} value={cfg.code}>
            {cfg.code} ({cfg.symbol})
          </option>
        ))}
      </select>
    </div>
  );
}
