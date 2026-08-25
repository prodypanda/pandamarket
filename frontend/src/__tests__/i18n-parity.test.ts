import { describe, expect, it } from 'vitest';
import ar from '../i18n/messages/ar.json';
import en from '../i18n/messages/en.json';
import fr from '../i18n/messages/fr.json';

/**
 * Audit M11: locale files drifted (11 keys missing in FR, 6 in AR, and 7
 * seller-loyalty keys that existed only in FR despite being rendered by
 * SellerLoyaltyDashboard). This test fails on any future drift between the
 * three locales, in either direction.
 */

type LocaleNode = Record<string, unknown>;

function flattenKeys(node: LocaleNode, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(node)) {
    const dotted = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      for (const nested of flattenKeys(value as LocaleNode, dotted)) {
        keys.add(nested);
      }
    } else {
      keys.add(dotted);
    }
  }
  return keys;
}

const enKeys = flattenKeys(en);
const frKeys = flattenKeys(fr);
const arKeys = flattenKeys(ar);

function diff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((k) => !b.has(k)).sort();
}

describe('i18n locale parity', () => {
  it('FR has every EN key', () => {
    const missing = diff(enKeys, frKeys);
    expect(missing, `Missing in fr.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('AR has every EN key', () => {
    const missing = diff(enKeys, arKeys);
    expect(missing, `Missing in ar.json: ${missing.join(', ')}`).toEqual([]);
  });

  it('EN has every FR key (no orphans)', () => {
    const orphaned = diff(frKeys, enKeys);
    expect(orphaned, `Orphaned in fr.json: ${orphaned.join(', ')}`).toEqual([]);
  });

  it('EN has every AR key (no orphans)', () => {
    const orphaned = diff(arKeys, enKeys);
    expect(orphaned, `Orphaned in ar.json: ${orphaned.join(', ')}`).toEqual([]);
  });

  it('all locales expose identical non-empty string values', () => {
    // Guard against placeholder values like "" or duplicated objects.
    for (const key of enKeys) {
      for (const locale of [fr, ar]) {
        const parts = key.split('.');
        let cur: unknown = locale;
        for (const part of parts) {
          cur = (cur as LocaleNode)[part];
        }
        expect(typeof cur === 'string' && cur.length > 0, `${key} empty/missing`).toBe(true);
      }
    }
  });
});
