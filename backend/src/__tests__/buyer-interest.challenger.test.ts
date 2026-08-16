/**
 * Challenger 1 Adversarial Test Suite for BuyerInterestService — Milestone M4 (R3)
 *
 * Empirical verification:
 * 1. Mathematical accuracy of 60-day exponential decay formula:
 *    Sum W(e) * e^(-dt / 60) at dt in {0, 15, 30, 60, 120, 365} days
 * 2. Weight multiplier verification: Orders=5.0, Subscriptions=4.0, Likes=2.0
 * 3. Tag normalization consistency (normalizeTag, cleanAndDedupeTags, extractFallbackTags)
 * 4. Extreme inputs: unicode, diacritics, non-latin, symbols, empty arrays, malformed inputs
 * 5. Security edge cases: JS Object prototype collision ('constructor', '__proto__', etc.), XSS/SQLi strings
 * 6. High-scale stress testing: 10,000+ events and memory/performance bounds
 * 7. Storefront isolation boundary verification
 */

import { describe, it, expect } from 'vitest';
import {
  BuyerInterestService,
  normalizeTag,
  cleanAndDedupeTags,
  extractFallbackTags,
  InteractionEvent,
} from '../services/buyer-interest.service';

describe('Challenger 1 Adversarial Verification: BuyerInterestService', () => {
  const service = new BuyerInterestService();

  // =========================================================================
  // Dimension 1: Mathematical Accuracy of 60-day Exponential Decay Formula
  // Formula: Tag Weight(T) = sum( W(e) * e^(-dt / 60) )
  // =========================================================================
  describe('Dimension 1: Exponential Decay Mathematical Accuracy', () => {
    const decayTestPoints = [
      { dtDays: 0, expectedMultiplier: 1.0 },
      { dtDays: 15, expectedMultiplier: Math.exp(-15 / 60) }, // ~0.778800783
      { dtDays: 30, expectedMultiplier: Math.exp(-30 / 60) }, // ~0.606530660
      { dtDays: 60, expectedMultiplier: Math.exp(-60 / 60) }, // ~0.367879441
      { dtDays: 120, expectedMultiplier: Math.exp(-120 / 60) }, // ~0.135335283
      { dtDays: 365, expectedMultiplier: Math.exp(-365 / 60) }, // ~0.002280517
    ];

    decayTestPoints.forEach(({ dtDays, expectedMultiplier }) => {
      it(`Decay at dt = ${dtDays} days produces accurate weight within precision tolerance`, () => {
        const refDate = new Date('2026-08-15T12:00:00.000Z');
        const eventDate = new Date(refDate.getTime() - dtDays * 24 * 60 * 60 * 1000);

        const events: InteractionEvent[] = [
          { type: 'order', tags: ['robotique'], createdAt: eventDate }, // base 5.0
          { type: 'subscription', tags: ['electronique'], createdAt: eventDate }, // base 4.0
          { type: 'like', tags: ['diy'], createdAt: eventDate }, // base 2.0
        ];

        const result = service.calculateProfile(events, refDate);

        const expectedOrder = Number((5.0 * expectedMultiplier).toFixed(4));
        const expectedSub = Number((4.0 * expectedMultiplier).toFixed(4));
        const expectedLike = Number((2.0 * expectedMultiplier).toFixed(4));

        expect(result.tag_weights['robotique']).toBeCloseTo(expectedOrder, 3);
        expect(result.tag_weights['electronique']).toBeCloseTo(expectedSub, 3);
        expect(result.tag_weights['diy']).toBeCloseTo(expectedLike, 3);
      });
    });

    it('Superposition principle: cumulative events across different days sum linearly with decay', () => {
      const refDate = new Date('2026-08-15T00:00:00.000Z');
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['arduino'], createdAt: refDate }, // 5.0 * e^0 = 5.0
        { type: 'order', tags: ['arduino'], createdAt: new Date(refDate.getTime() - 60 * 86400000) }, // 5.0 * e^-1 = 1.8394
        { type: 'subscription', tags: ['arduino'], createdAt: new Date(refDate.getTime() - 30 * 86400000) }, // 4.0 * e^-0.5 = 2.4261
        { type: 'like', tags: ['arduino'], createdAt: new Date(refDate.getTime() - 15 * 86400000) }, // 2.0 * e^-0.25 = 1.5576
      ];

      const result = service.calculateProfile(events, refDate);
      const theoreticalSum = 5.0 * 1.0 + 5.0 * Math.exp(-1) + 4.0 * Math.exp(-0.5) + 2.0 * Math.exp(-0.25);
      expect(result.tag_weights['arduino']).toBeCloseTo(theoreticalSum, 2);
    });

    it('Future event timestamps (clock skew / negative dt) are clamped to 0 days (e^0 = 1.0)', () => {
      const refDate = new Date('2026-08-15T00:00:00.000Z');
      const futureDate = new Date(refDate.getTime() + 10 * 86400000); // 10 days in the future

      const events: InteractionEvent[] = [
        { type: 'order', tags: ['future-gadget'], createdAt: futureDate },
      ];

      const result = service.calculateProfile(events, refDate);
      // Clamped to daysAgo = 0, so weight is exactly 5.0 (does NOT explode with e^(+10/60))
      expect(result.tag_weights['future-gadget']).toBe(5.0);
    });

    it('String formatted createdAt dates are parsed and computed equivalently to Date objects', () => {
      const refDate = new Date('2026-08-15T00:00:00.000Z');
      const dateString = '2026-06-16T00:00:00.000Z'; // exactly 60 days prior

      const events: InteractionEvent[] = [
        { type: 'order', tags: ['string-date-tag'], createdAt: dateString as any },
      ];

      const result = service.calculateProfile(events, refDate);
      expect(result.tag_weights['string-date-tag']).toBeCloseTo(5.0 * Math.exp(-1), 3);
    });
  });

  // =========================================================================
  // Dimension 2: Weight Multipliers Verification
  // Orders = 5.0, Subscriptions = 4.0, Likes = 2.0
  // =========================================================================
  describe('Dimension 2: Weight Multiplier Ratios and Ranking', () => {
    it('Accurately applies relative weights: Order (5.0) > Subscription (4.0) > Like (2.0)', () => {
      const now = new Date();
      const events: InteractionEvent[] = [
        { type: 'like', tags: ['tier-like'], createdAt: now },
        { type: 'subscription', tags: ['tier-sub'], createdAt: now },
        { type: 'order', tags: ['tier-order'], createdAt: now },
      ];

      const result = service.calculateProfile(events, now);

      expect(result.tag_weights['tier-order']).toBe(5.0);
      expect(result.tag_weights['tier-sub']).toBe(4.0);
      expect(result.tag_weights['tier-like']).toBe(2.0);

      // Verify strict ranking order
      expect(result.top_tags).toEqual(['tier-order', 'tier-sub', 'tier-like']);
    });

    it('Defaults unknown event types to base weight 2.0 (like equivalent)', () => {
      const now = new Date();
      const events: InteractionEvent[] = [
        { type: 'unknown_type' as any, tags: ['unclassified-tag'], createdAt: now },
      ];

      const result = service.calculateProfile(events, now);
      expect(result.tag_weights['unclassified-tag']).toBe(2.0);
    });

    it('Top tags are sliced to maximum of 10 sorted in descending weight', () => {
      const now = new Date();
      const events: InteractionEvent[] = [];

      for (let i = 1; i <= 25; i++) {
        events.push({
          type: 'order',
          tags: [`item-${i}`],
          // Spread creation dates so weights are distinct
          createdAt: new Date(now.getTime() - i * 86400000),
        });
      }

      const result = service.calculateProfile(events, now);

      expect(result.top_tags.length).toBe(10);
      // Verify descending order
      for (let j = 0; j < result.top_tags.length - 1; j++) {
        const currTag = result.top_tags[j];
        const nextTag = result.top_tags[j + 1];
        expect(result.tag_weights[currTag]).toBeGreaterThanOrEqual(result.tag_weights[nextTag]);
      }
    });
  });

  // =========================================================================
  // Dimension 3: Tag Normalization Consistency & Edge Cases
  // =========================================================================
  describe('Dimension 3: Tag Normalization and Sanitization', () => {
    it('Normalizes French accents and diacritics into standard lowercase ASCII', () => {
      expect(normalizeTag('Électronique')).toBe('electronique');
      expect(normalizeTag('Prêt-à-porter')).toBe('pret-a-porter');
      expect(normalizeTag('Céramique & Poterie d’art')).toBe('ceramique-poterie-dart');
      expect(normalizeTag('Épicerie')).toBe('epicerie');
      expect(normalizeTag('Châle en Soie')).toBe('chale-en-soie');
      expect(normalizeTag('Glaçons')).toBe('glacons');
    });

    it('Sanitizes spaces, slashes, ampersands and collapses duplicate hyphens', () => {
      expect(normalizeTag('  Audio / Video & Hi-Fi  ')).toBe('audio-video-hi-fi');
      expect(normalizeTag('---super----gadget---')).toBe('super-gadget');
      expect(normalizeTag('home & living / kitchen')).toBe('home-living-kitchen');
    });

    it('Safely handles non-Latin unicode (Arabic, Kanji, Cyrillic, Emojis) without throwing', () => {
      // Non-latin characters are stripped to empty or latin-equivalent
      expect(normalizeTag('قفطان تونسي')).toBe('');
      expect(normalizeTag('🔥 Robe 👗')).toBe('robe');
      expect(normalizeTag('Arduino 2026!')).toBe('arduino-2026');
      expect(normalizeTag('日本語')).toBe('');
      expect(normalizeTag('!!!@@@###$$$%%%')).toBe('');
    });

    it('cleanAndDedupeTags deduplicates case/accent variations and limits to 10 items', () => {
      const rawTags = [
        'Électronique',
        'electronique',
        'ELECTRONIQUE',
        '  électronique  ',
        'Arduino Uno',
        'arduino-uno',
        'Robotique',
        'Capteurs',
        'DIY',
        '3D Print',
        'CNC',
        'Raspberry Pi',
        'ESP32',
        'Microcontroller',
        'Extra 1',
        'Extra 2',
      ];

      const cleaned = cleanAndDedupeTags(rawTags);

      // 'electronique' and 'arduino-uno' should appear only once
      expect(cleaned.filter((t) => t === 'electronique').length).toBe(1);
      expect(cleaned.filter((t) => t === 'arduino-uno').length).toBe(1);
      expect(cleaned.length).toBeLessThanOrEqual(10);
    });

    it('extractFallbackTags extracts significant words excluding stop words and diacritics', () => {
      const tags = extractFallbackTags(
        'Belle Robe de Soirée pour Femme avec Broderie',
        'Mode & Vêtements',
        'Robe confectionnée en Tunisie avec tissu de haute qualité pour les fêtes'
      );

      expect(tags).toContain('belle');
      expect(tags).toContain('robe');
      expect(tags).toContain('soiree');
      expect(tags).toContain('femme');
      // Stop words 'pour', 'avec', 'les', 'des' must not be included
      expect(tags).not.toContain('pour');
      expect(tags).not.toContain('avec');
      expect(tags).not.toContain('les');
      expect(tags.length).toBeLessThanOrEqual(6);
    });
  });

  // =========================================================================
  // Dimension 4: Security & Object Prototype Collisions
  // =========================================================================
  describe('Dimension 4: Security & JS Prototype Robustness', () => {
    it('Demonstrates prototype collision vulnerability on "constructor" tag in plain JS objects', () => {
      // In JS, {}.constructor is Object.prototype.constructor (function)
      // When BuyerInterestService accesses weights['constructor'], it collides with Object prototype
      const now = new Date();
      const events: InteractionEvent[] = [
        { type: 'order', tags: ['constructor'], createdAt: now },
      ];

      // Documenting the known bug:
      // In unpatched implementation, weights['constructor'] is Object, leading to TypeError on .toFixed()
      expect(() => {
        service.calculateProfile(events, now);
      }).toThrow();
    });

    it('Sanitizes SQL injection and XSS payloads in tag inputs', () => {
      const maliciousTags = [
        "<script>alert('XSS')</script>",
        "'; DROP TABLE pd_product; --",
        "' OR '1'='1",
        "../../etc/passwd",
        "\x00nullbyte",
      ];

      const sanitized = maliciousTags.map(normalizeTag);

      expect(sanitized).toContain('scriptalertxss-script');
      expect(sanitized).toContain('drop-table-pd_product');
      expect(sanitized).toContain('or-11');
      expect(sanitized).toContain('etc-passwd');
      expect(sanitized).toContain('nullbyte');

      // None of the sanitized tags contain active SQL/HTML punctuation
      for (const tag of sanitized) {
        expect(tag).not.toMatch(/[<>'";\\]/);
      }
    });
  });

  // =========================================================================
  // Dimension 5: Extreme Inputs & High-Scale Stress Testing
  // =========================================================================
  describe('Dimension 5: Scale, Performance & Degenerate Inputs', () => {
    it('Degenerate input: handles empty events, empty tags, null-ish tags gracefully', () => {
      const emptyResult = service.calculateProfile([], new Date());
      expect(emptyResult.tag_weights).toEqual({});
      expect(emptyResult.top_tags).toEqual([]);
      expect(emptyResult.total_signals_processed).toBe(0);

      const degenerateEvents: InteractionEvent[] = [
        { type: 'order', tags: [], createdAt: new Date() },
        { type: 'like', tags: ['   ', '---', '!!!'], createdAt: new Date() },
      ];

      const degResult = service.calculateProfile(degenerateEvents, new Date());
      expect(degResult.tag_weights).toEqual({});
      expect(degResult.top_tags).toEqual([]);
    });

    it('High-Scale Stress: processes 10,000 interaction events across 500 distinct tags in < 250ms', () => {
      const now = new Date();
      const largeEventSet: InteractionEvent[] = [];

      for (let i = 0; i < 10000; i++) {
        const daysAgo = i % 180;
        const tag1 = `tag-${i % 500}`;
        const tag2 = `category-${i % 50}`;
        const eventType: 'order' | 'subscription' | 'like' =
          i % 5 === 0 ? 'order' : i % 5 === 1 ? 'subscription' : 'like';

        largeEventSet.push({
          type: eventType,
          tags: [tag1, tag2],
          createdAt: new Date(now.getTime() - daysAgo * 86400000),
        });
      }

      const tStart = performance.now();
      const result = service.calculateProfile(largeEventSet, now);
      const tEnd = performance.now();
      const durationMs = tEnd - tStart;

      expect(durationMs).toBeLessThan(250); // Under 250ms for 10,000 events
      expect(result.total_signals_processed).toBe(10000);
      expect(Object.keys(result.tag_weights).length).toBe(550); // 500 tags + 50 categories
      expect(result.top_tags.length).toBe(10);

      // Verify no NaN or Infinite weights exist
      for (const [tag, weight] of Object.entries(result.tag_weights)) {
        expect(Number.isFinite(weight)).toBe(true);
        expect(weight).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Dimension 6: Storefront Isolation Boundary (Strict Seller Retention)
  // =========================================================================
  describe('Dimension 6: Strict Storefront Isolation Boundary', () => {
    it('Guarantees 100% empty competitor recommendations when isStorefrontScope=true', async () => {
      const recs = await service.getRecommendations('any_buyer_id', true);

      expect(recs.recommended_products).toEqual([]);
      expect(recs.similar_stores).toEqual([]);
    });
  });
});
