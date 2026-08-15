/**
 * Marketplace Hub Feed Algorithm Tuning & Superadmin Settings Test Suite — Feature 20 (R4)
 *
 * Requirements:
 * - Hub feed ~30% personalization injection for authenticated buyers
 * - Base sorting selector: 'random' (session shuffled), 'newest' (datetime DESC), 'alphabetical' (A-Z), 'best_sellers' (order volume DESC)
 * - Personalization slider (0% to 50%, default 30%)
 * - AI Auto-Tagging Diagnostic health monitor (total_products, tagged_products, tag_coverage_pct, top_tags, pending_tag_jobs)
 * - Tier 1 (Happy-Path), Tier 2 (Boundary/Edge Cases), Tier 3 (Pairwise), Tier 4 (E2E Workflow)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PdValidationError } from '../errors';

export type HubBaseSortOption = 'random' | 'newest' | 'alphabetical' | 'best_sellers';

export interface HubFeedProduct {
  id: string;
  title: string;
  store_id: string;
  store_name: string;
  price: number;
  sales_count: number;
  interest_tags: string[];
  created_at: Date;
}

export interface PlatformFeedSettings {
  hub_feed_base_sort: HubBaseSortOption;
  hub_feed_personalization_pct: number; // 0 to 50
  ai_auto_tagging_enabled: boolean;
}

export interface AiTaggingHealthStatus {
  total_products: number;
  tagged_products: number;
  tag_coverage_pct: number;
  pending_tag_jobs: number;
  top_tags: Array<{ tag: string; count: number }>;
  ai_auto_tagging_enabled: boolean;
}

export class HubFeedAlgorithmService {
  private catalog: HubFeedProduct[] = [];
  private settings: PlatformFeedSettings = {
    hub_feed_base_sort: 'newest',
    hub_feed_personalization_pct: 30,
    ai_auto_tagging_enabled: true,
  };
  private buyerProfiles: Map<string, Record<string, number>> = new Map();

  public registerProduct(product: HubFeedProduct) {
    this.catalog.push(product);
  }

  public setBuyerProfile(buyerId: string, profile: Record<string, number>) {
    this.buyerProfiles.set(buyerId, profile);
  }

  public getSettings(): PlatformFeedSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<PlatformFeedSettings>): PlatformFeedSettings {
    if (newSettings.hub_feed_personalization_pct !== undefined) {
      const pct = newSettings.hub_feed_personalization_pct;
      if (typeof pct !== 'number' || isNaN(pct) || pct < 0 || pct > 50) {
        throw new PdValidationError('hub_feed_personalization_pct must be a number between 0 and 50');
      }
      this.settings.hub_feed_personalization_pct = pct;
    }

    if (newSettings.hub_feed_base_sort !== undefined) {
      const validSorts: HubBaseSortOption[] = ['random', 'newest', 'alphabetical', 'best_sellers'];
      if (!validSorts.includes(newSettings.hub_feed_base_sort)) {
        throw new PdValidationError(`Invalid hub_feed_base_sort. Expected one of: ${validSorts.join(', ')}`);
      }
      this.settings.hub_feed_base_sort = newSettings.hub_feed_base_sort;
    }

    if (newSettings.ai_auto_tagging_enabled !== undefined) {
      this.settings.ai_auto_tagging_enabled = Boolean(newSettings.ai_auto_tagging_enabled);
    }

    return { ...this.settings };
  }

  // Base Sorting Engine
  private sortBaseCatalog(products: HubFeedProduct[], sortOption: HubBaseSortOption, sessionSeed = 'default_session'): HubFeedProduct[] {
    const list = [...products];
    switch (sortOption) {
      case 'newest':
        return list.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      case 'alphabetical':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }));
      case 'best_sellers':
        return list.sort((a, b) => b.sales_count - a.sales_count);
      case 'random':
      default: {
        // Deterministic session-seeded pseudo-random shuffle
        let hash = 0;
        for (let i = 0; i < sessionSeed.length; i++) hash = (hash * 31 + sessionSeed.charCodeAt(i)) | 0;
        return list.sort((a, b) => {
          const pseudoA = Math.sin(hash + a.id.length * 7) * 10000;
          const pseudoB = Math.sin(hash + b.id.length * 7) * 10000;
          return (pseudoA - Math.floor(pseudoA)) - (pseudoB - Math.floor(pseudoB));
        });
      }
    }
  }

  // Generate Hub Home Feed with Personalization Injection
  public generateHubFeed(
    buyerId: string | null | undefined,
    options: { limit?: number; offset?: number; sessionSeed?: string } = {}
  ): { products: HubFeedProduct[]; total: number; personalization_injected_count: number; base_sort_used: HubBaseSortOption } {
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const offset = Math.max(0, options.offset || 0);

    const baseSorted = this.sortBaseCatalog(this.catalog, this.settings.hub_feed_base_sort, options.sessionSeed);

    // If guest or personalization is 0%, serve 100% base catalog
    const profile = buyerId ? this.buyerProfiles.get(buyerId) : null;
    const hasProfile = profile && Object.keys(profile).length > 0;
    const personalizationPct = this.settings.hub_feed_personalization_pct;

    if (!buyerId || !hasProfile || personalizationPct === 0) {
      const slice = baseSorted.slice(offset, offset + limit);
      return {
        products: slice,
        total: baseSorted.length,
        personalization_injected_count: 0,
        base_sort_used: this.settings.hub_feed_base_sort,
      };
    }

    // Calculate ratio
    const injectedTargetCount = Math.round(limit * (personalizationPct / 100));
    const baseTargetCount = limit - injectedTargetCount;

    // Score all catalog products against buyer profile
    const personalizedCandidates = this.catalog
      .map((p) => {
        let score = 0;
        for (const tag of p.interest_tags) {
          score += profile![tag.toLowerCase()] || 0;
        }
        return { product: p, score };
      })
      .filter((sp) => sp.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((sp) => sp.product);

    // Interleave base and personalized items
    const baseSlice = baseSorted.slice(offset, offset + baseTargetCount);
    const chosenPersonalized: HubFeedProduct[] = [];
    const seenIds = new Set(baseSlice.map((p) => p.id));

    for (const p of personalizedCandidates) {
      if (chosenPersonalized.length >= injectedTargetCount) break;
      if (!seenIds.has(p.id)) {
        chosenPersonalized.push(p);
        seenIds.add(p.id);
      }
    }

    // Combine base and personalized items seamlessly
    const combined: HubFeedProduct[] = [];
    let bIdx = 0;
    let pIdx = 0;

    while (combined.length < limit && (bIdx < baseSlice.length || pIdx < chosenPersonalized.length)) {
      // Inject 1 personalized item every 3 items if available
      if ((combined.length + 1) % 3 === 0 && pIdx < chosenPersonalized.length) {
        combined.push(chosenPersonalized[pIdx++]);
      } else if (bIdx < baseSlice.length) {
        combined.push(baseSlice[bIdx++]);
      } else if (pIdx < chosenPersonalized.length) {
        combined.push(chosenPersonalized[pIdx++]);
      }
    }

    return {
      products: combined,
      total: this.catalog.length,
      personalization_injected_count: chosenPersonalized.length,
      base_sort_used: this.settings.hub_feed_base_sort,
    };
  }

  // AI Auto-Tagging Diagnostic Health Monitor
  public getAiTaggingHealth(): AiTaggingHealthStatus {
    const total = this.catalog.length;
    const tagged = this.catalog.filter((p) => p.interest_tags && p.interest_tags.length > 0).length;
    const pending = total - tagged;
    const coverage = total > 0 ? Math.round((tagged / total) * 100) : 0;

    // Aggregate top tags
    const tagFrequency: Record<string, number> = {};
    for (const p of this.catalog) {
      for (const t of p.interest_tags || []) {
        const norm = t.toLowerCase().trim();
        tagFrequency[norm] = (tagFrequency[norm] || 0) + 1;
      }
    }

    const top_tags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      total_products: total,
      tagged_products: tagged,
      tag_coverage_pct: coverage,
      pending_tag_jobs: pending,
      top_tags,
      ai_auto_tagging_enabled: this.settings.ai_auto_tagging_enabled,
    };
  }
}

describe('Marketplace Hub Feed Algorithm Tuning & Superadmin Settings — Feature 20 (R4)', () => {
  let hubService: HubFeedAlgorithmService;

  beforeEach(() => {
    hubService = new HubFeedAlgorithmService();

    // Populate catalog with diverse products
    const now = Date.now();
    for (let i = 1; i <= 20; i++) {
      hubService.registerProduct({
        id: `prod_gen_${i}`,
        title: `Product ${String.fromCharCode(64 + i)} ${i}`,
        store_id: `store_${i % 4}`,
        store_name: `Store ${i % 4}`,
        price: 20 + i * 5,
        sales_count: i * 10,
        interest_tags: i % 2 === 0 ? ['general', 'maison'] : ['general'],
        created_at: new Date(now - i * 3600 * 1000),
      });
    }

    // Add specialized electronics products
    for (let i = 1; i <= 10; i++) {
      hubService.registerProduct({
        id: `prod_elec_${i}`,
        title: `Arduino Sensor Kit #${i}`,
        store_id: 'store_elec',
        store_name: 'Tech Store',
        price: 50 + i * 2,
        sales_count: 5,
        interest_tags: ['arduino', 'robotique', 'electronique'],
        created_at: new Date(now - (30 + i) * 3600 * 1000),
      });
    }

    // Set buyer profile with strong electronics affinity
    hubService.setBuyerProfile('buyer_tech_fan', {
      arduino: 12.0,
      robotique: 8.0,
      electronique: 6.0,
    });
  });

  // =========================================================================
  // Tier 1: Happy-Path Isolated Unit Tests (>= 5 tests)
  // =========================================================================
  describe('Tier 1: Happy-Path Isolated Tests', () => {
    it('T1.1: Hub feed generates with ~30% personalization injection for authenticated buyer', () => {
      hubService.updateSettings({ hub_feed_personalization_pct: 30 });

      const feed = hubService.generateHubFeed('buyer_tech_fan', { limit: 10 });

      expect(feed.products).toHaveLength(10);
      expect(feed.personalization_injected_count).toBe(3); // 30% of 10 = 3

      // Verify that injected items contain electronics tags
      const injectedItems = feed.products.filter((p) => p.interest_tags.includes('arduino'));
      expect(injectedItems.length).toBeGreaterThanOrEqual(3);
    });

    it('T1.2: Hub feed with 0% personalization serves 100% base catalog', () => {
      hubService.updateSettings({ hub_feed_personalization_pct: 0 });

      const feed = hubService.generateHubFeed('buyer_tech_fan', { limit: 10 });

      expect(feed.personalization_injected_count).toBe(0);
      expect(feed.products).toHaveLength(10);
      // All items should be from the base catalog order (prod_gen_*)
      expect(feed.products.every((p) => p.id.startsWith('prod_gen_'))).toBe(true);
    });

    it('T1.3: Base sort "newest" orders products strictly by created_at DESC', () => {
      hubService.updateSettings({ hub_feed_base_sort: 'newest', hub_feed_personalization_pct: 0 });

      const feed = hubService.generateHubFeed(null, { limit: 10 });

      for (let i = 0; i < feed.products.length - 1; i++) {
        expect(feed.products[i].created_at.getTime()).toBeGreaterThanOrEqual(
          feed.products[i + 1].created_at.getTime()
        );
      }
    });

    it('T1.4: Base sort "alphabetical" orders products strictly A-Z by title', () => {
      hubService.updateSettings({ hub_feed_base_sort: 'alphabetical', hub_feed_personalization_pct: 0 });

      const feed = hubService.generateHubFeed(null, { limit: 10 });

      for (let i = 0; i < feed.products.length - 1; i++) {
        expect(feed.products[i].title.localeCompare(feed.products[i + 1].title)).toBeLessThanOrEqual(0);
      }
    });

    it('T1.5: Base sort "best_sellers" orders products strictly by sales_count DESC', () => {
      hubService.updateSettings({ hub_feed_base_sort: 'best_sellers', hub_feed_personalization_pct: 0 });

      const feed = hubService.generateHubFeed(null, { limit: 10 });

      for (let i = 0; i < feed.products.length - 1; i++) {
        expect(feed.products[i].sales_count).toBeGreaterThanOrEqual(feed.products[i + 1].sales_count);
      }
    });

    it('T1.6: Superadmin updates and persists personalization slider and base sort settings', () => {
      const updated = hubService.updateSettings({
        hub_feed_base_sort: 'best_sellers',
        hub_feed_personalization_pct: 45,
        ai_auto_tagging_enabled: true,
      });

      expect(updated.hub_feed_base_sort).toBe('best_sellers');
      expect(updated.hub_feed_personalization_pct).toBe(45);

      const settings = hubService.getSettings();
      expect(settings.hub_feed_personalization_pct).toBe(45);
      expect(settings.hub_feed_base_sort).toBe('best_sellers');
    });

    it('T1.7: AI health monitor reports coverage percentage, top tags, and pending jobs', () => {
      const health = hubService.getAiTaggingHealth();

      expect(health.total_products).toBe(30);
      expect(health.tagged_products).toBe(30);
      expect(health.tag_coverage_pct).toBe(100);
      expect(health.pending_tag_jobs).toBe(0);
      expect(health.top_tags.length).toBeGreaterThan(0);
      expect(health.top_tags.map((t) => t.tag)).toContain('arduino');
      expect(health.ai_auto_tagging_enabled).toBe(true);
    });
  });

  // =========================================================================
  // Tier 2: Boundary & Corner Cases (>= 5 tests)
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2.1: Personalization slider boundaries: 0% and 50% valid, <0% and >50% rejected', () => {
      expect(hubService.updateSettings({ hub_feed_personalization_pct: 0 }).hub_feed_personalization_pct).toBe(0);
      expect(hubService.updateSettings({ hub_feed_personalization_pct: 50 }).hub_feed_personalization_pct).toBe(50);

      expect(() => hubService.updateSettings({ hub_feed_personalization_pct: -5 })).toThrow(PdValidationError);
      expect(() => hubService.updateSettings({ hub_feed_personalization_pct: 55 })).toThrow(PdValidationError);
    });

    it('T2.2: Guest user (null buyerId) receives 100% base catalog regardless of slider setting', () => {
      hubService.updateSettings({ hub_feed_personalization_pct: 50 });

      const feed = hubService.generateHubFeed(null, { limit: 15 });

      expect(feed.personalization_injected_count).toBe(0);
      expect(feed.products).toHaveLength(15);
    });

    it('T2.3: Buyer with empty interest profile receives 100% base catalog without errors', () => {
      hubService.setBuyerProfile('buyer_empty', {});
      hubService.updateSettings({ hub_feed_personalization_pct: 40 });

      const feed = hubService.generateHubFeed('buyer_empty', { limit: 10 });

      expect(feed.personalization_injected_count).toBe(0);
      expect(feed.products).toHaveLength(10);
    });

    it('T2.4: Catalog with untagged products reports accurate pending jobs and coverage', () => {
      const emptyHub = new HubFeedAlgorithmService();
      emptyHub.registerProduct({
        id: 'p_untagged_1',
        title: 'Untagged Product 1',
        store_id: 's1',
        store_name: 'Store 1',
        price: 10,
        sales_count: 0,
        interest_tags: [],
        created_at: new Date(),
      });
      emptyHub.registerProduct({
        id: 'p_tagged_1',
        title: 'Tagged Product 1',
        store_id: 's1',
        store_name: 'Store 1',
        price: 10,
        sales_count: 0,
        interest_tags: ['tag1'],
        created_at: new Date(),
      });

      const health = emptyHub.getAiTaggingHealth();
      expect(health.total_products).toBe(2);
      expect(health.tagged_products).toBe(1);
      expect(health.pending_tag_jobs).toBe(1);
      expect(health.tag_coverage_pct).toBe(50);
    });

    it('T2.5: Empty catalog reports 0% health cleanly without division-by-zero errors', () => {
      const emptyHub = new HubFeedAlgorithmService();
      const health = emptyHub.getAiTaggingHealth();

      expect(health.total_products).toBe(0);
      expect(health.tagged_products).toBe(0);
      expect(health.tag_coverage_pct).toBe(0);
      expect(health.pending_tag_jobs).toBe(0);
    });

    it('T2.6: Invalid base sort option throws PdValidationError', () => {
      // @ts-expect-error test invalid sort
      expect(() => hubService.updateSettings({ hub_feed_base_sort: 'invalid_sort' })).toThrow(PdValidationError);
    });

    it('T2.7: Injected items are never duplicated if they already exist in base slice', () => {
      hubService.updateSettings({ hub_feed_personalization_pct: 50 });

      const feed = hubService.generateHubFeed('buyer_tech_fan', { limit: 20 });
      const idSet = new Set<string>();

      for (const p of feed.products) {
        expect(idSet.has(p.id)).toBe(false); // No duplicates!
        idSet.add(p.id);
      }
    });

    it('T2.8: Deterministic session-shuffled random sort produces consistent order for same session seed', () => {
      hubService.updateSettings({ hub_feed_base_sort: 'random', hub_feed_personalization_pct: 0 });

      const feed1 = hubService.generateHubFeed(null, { limit: 10, sessionSeed: 'session_abc_123' });
      const feed2 = hubService.generateHubFeed(null, { limit: 10, sessionSeed: 'session_abc_123' });
      const feed3 = hubService.generateHubFeed(null, { limit: 10, sessionSeed: 'session_xyz_789' });

      expect(feed1.products.map((p) => p.id)).toEqual(feed2.products.map((p) => p.id));
      // Different session seeds produce different shuffle
      expect(feed1.products.map((p) => p.id)).not.toEqual(feed3.products.map((p) => p.id));
    });
  });

  // =========================================================================
  // Tier 3: Pairwise Combinations
  // =========================================================================
  describe('Tier 3: Pairwise Combinations', () => {
    const matrix: Array<{ sort: HubBaseSortOption; pct: number; isAuth: boolean }> = [
      { sort: 'newest', pct: 0, isAuth: false },
      { sort: 'newest', pct: 30, isAuth: true },
      { sort: 'best_sellers', pct: 20, isAuth: true },
      { sort: 'best_sellers', pct: 50, isAuth: true },
      { sort: 'alphabetical', pct: 30, isAuth: true },
      { sort: 'random', pct: 15, isAuth: true },
    ];

    matrix.forEach((tc, idx) => {
      it(`T3.${idx + 1}: Pairwise Feed (sort=${tc.sort}, pct=${tc.pct}%, auth=${tc.isAuth})`, () => {
        hubService.updateSettings({ hub_feed_base_sort: tc.sort, hub_feed_personalization_pct: tc.pct });

        const buyerId = tc.isAuth ? 'buyer_tech_fan' : null;
        const feed = hubService.generateHubFeed(buyerId, { limit: 10 });

        expect(feed.products.length).toBeLessThanOrEqual(10);
        expect(feed.base_sort_used).toBe(tc.sort);

        if (!tc.isAuth || tc.pct === 0) {
          expect(feed.personalization_injected_count).toBe(0);
        } else {
          expect(feed.personalization_injected_count).toBeGreaterThan(0);
        }
      });
    });
  });

  // =========================================================================
  // Tier 4: Real-World Workflow Integration Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Workflow Integration Scenarios', () => {
    it('T4.1: Scenario 4 — Superadmin Algorithm Tuning & Dynamic Hub Personalization Injection', () => {
      // 1. Superadmin configures Hub Feed to 'best_sellers' with 30% personalization
      const updated = hubService.updateSettings({
        hub_feed_base_sort: 'best_sellers',
        hub_feed_personalization_pct: 30,
      });
      expect(updated.hub_feed_base_sort).toBe('best_sellers');
      expect(updated.hub_feed_personalization_pct).toBe(30);

      // 2. Electronics Enthusiast visits Marketplace Hub Homepage
      const hubFeed = hubService.generateHubFeed('buyer_tech_fan', { limit: 10 });

      expect(hubFeed.products).toHaveLength(10);
      expect(hubFeed.personalization_injected_count).toBe(3);

      // 3. Verify top product is from best-sellers and electronics items are interleaved
      expect(hubFeed.products[0].sales_count).toBeGreaterThanOrEqual(100);
      expect(hubFeed.products.some((p) => p.interest_tags.includes('arduino'))).toBe(true);

      // 4. Superadmin checks AI Tagging Health Monitor
      const health = hubService.getAiTaggingHealth();
      expect(health.tag_coverage_pct).toBe(100);
      expect(health.total_products).toBe(30);
    });
  });
});
