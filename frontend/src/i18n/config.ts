/**
 * PandaMarket — Internationalization Configuration
 * ─────────────────────────────────────────────────
 * Supported locales: French (default), English, Arabic.
 * Arabic uses RTL layout direction.
 *
 * Locale detection priority:
 *   1. URL cookie `pd_locale`
 *   2. Accept-Language header
 *   3. Default: 'fr'
 */

export const LOCALES = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '🇹🇳',
  en: '🇬🇧',
  ar: '🇹🇳',
};

/** Whether the locale uses right-to-left text direction */
export const LOCALE_DIR: Record<Locale, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};

/** Cookie name for persisting locale preference */
export const LOCALE_COOKIE = 'pd_locale';

/** Validate a string is a supported locale */
export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale);
}
