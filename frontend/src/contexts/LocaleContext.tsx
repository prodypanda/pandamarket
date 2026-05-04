'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_DIR, isValidLocale, type Locale } from '../i18n/config';
import { t as translate } from '../i18n/utils';

interface LocaleContextValue {
  /** Current active locale */
  locale: Locale;
  /** Change the active locale (persists to cookie + localStorage) */
  setLocale: (locale: Locale) => void;
  /** Text direction for the current locale */
  dir: 'ltr' | 'rtl';
  /** Translate a key with optional interpolation params */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Read the initial locale from cookie or localStorage.
 */
function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  // 1. Check cookie
  const cookieMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  if (cookieMatch) {
    const value = cookieMatch.split('=')[1];
    if (isValidLocale(value)) return value;
  }

  // 2. Check localStorage
  const stored = localStorage.getItem(LOCALE_COOKIE);
  if (isValidLocale(stored)) return stored;

  // 3. Check browser language
  const browserLang = navigator.language?.split('-')[0];
  if (isValidLocale(browserLang)) return browserLang;

  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  // Read initial locale on mount (client-side only)
  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);

    // Persist to cookie (1 year, SameSite=Lax, path=/)
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=${maxAge};SameSite=Lax`;

    // Persist to localStorage as backup
    localStorage.setItem(LOCALE_COOKIE, newLocale);

    // Update <html> lang and dir attributes
    document.documentElement.lang = newLocale;
    document.documentElement.dir = LOCALE_DIR[newLocale];
  }, []);

  // Apply dir attribute on mount and locale change
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
      document.documentElement.dir = LOCALE_DIR[locale];
    }
  }, [locale, mounted]);

  const tFn = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  const dir = LOCALE_DIR[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dir, t: tFn }}>
      {children}
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access the current locale and translation function.
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useLocale();
 * return <h1>{t('hub.hero.title')}</h1>;
 * ```
 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a <LocaleProvider>');
  }
  return ctx;
}
