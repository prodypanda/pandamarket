/**
 * PandaMarket — i18n Utilities
 * ────────────────────────────
 * Message loading, interpolation, and nested key resolution.
 */

import type { Locale } from './config';
import { DEFAULT_LOCALE } from './config';

import fr from './messages/fr.json';
import en from './messages/en.json';
import ar from './messages/ar.json';

type Messages = Record<string, unknown>;

const messagesByLocale: Record<Locale, Messages> = { fr, en, ar };

/**
 * Get the full messages object for a locale.
 */
export function getMessages(locale: Locale): Messages {
  return messagesByLocale[locale] || messagesByLocale[DEFAULT_LOCALE];
}

/**
 * Resolve a dot-separated key from a nested object.
 * Example: resolve('hub.hero.title', messages) → "Découvrez..."
 */
function resolve(key: string, obj: Messages): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate variables in a message string.
 * Replaces `{key}` placeholders with values from the params object.
 *
 * Example: formatMessage("Hello, {name}!", { name: "Ahmed" }) → "Hello, Ahmed!"
 */
export function formatMessage(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Translate a key for a given locale with optional interpolation.
 *
 * @param locale - The target locale
 * @param key - Dot-separated message key (e.g. 'hub.hero.title')
 * @param params - Optional interpolation values
 * @returns The translated string, or the key itself if not found
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const messages = getMessages(locale);
  const value = resolve(key, messages);

  if (value === undefined) {
    // Fallback to default locale
    if (locale !== DEFAULT_LOCALE) {
      const fallback = resolve(key, getMessages(DEFAULT_LOCALE));
      if (fallback !== undefined) {
        return formatMessage(fallback, params);
      }
    }
    // Return the key itself as last resort (helps identify missing translations)
    return key;
  }

  return formatMessage(value, params);
}
