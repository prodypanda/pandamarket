/**
 * PandaMarket — i18n Module
 * ─────────────────────────
 * Lightweight i18n system with no external dependencies.
 * Supports French (default), English, and Arabic (RTL).
 */

export { LOCALES, DEFAULT_LOCALE, LOCALE_LABELS, LOCALE_FLAGS, LOCALE_DIR, LOCALE_COOKIE, isValidLocale } from './config';
export type { Locale } from './config';
export { getMessages, t, formatMessage } from './utils';
