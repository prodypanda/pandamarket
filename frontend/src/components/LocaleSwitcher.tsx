'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLocale } from '../contexts/LocaleContext';
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from '../i18n/config';

/**
 * LocaleSwitcher — Dropdown to switch between FR / EN / AR.
 *
 * Renders a globe icon button that opens a dropdown with locale options.
 * Follows the PandaMarket design system (Panda Green accents, 20px icons).
 */
export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors pd-focus"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe size={18} strokeWidth={1.75} />
        <span className="hidden sm:inline">{LOCALE_FLAGS[locale]}</span>
      </button>

      {open && (
        <div
          className="absolute end-0 top-full mt-1 w-40 bg-white dark:bg-[#1A1A2E] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 animate-dropdown-in overflow-hidden"
          role="listbox"
          aria-label="Select language"
        >
          {LOCALES.map((loc: Locale) => (
            <button
              key={loc}
              role="option"
              aria-selected={locale === loc}
              onClick={() => {
                setLocale(loc);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                locale === loc
                  ? 'bg-[#16C784]/10 text-[#16C784] font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-base">{LOCALE_FLAGS[loc]}</span>
              <span>{LOCALE_LABELS[loc]}</span>
              {locale === loc && (
                <span className="ms-auto text-[#16C784]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
