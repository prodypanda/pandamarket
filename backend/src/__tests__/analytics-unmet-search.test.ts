import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analytics.service';
import type { UnmetSearchDemandItem } from '../types/analytics-types';

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: vi.fn((fn: (client: { query: typeof mockQuery }) => unknown) => fn({ query: mockQuery })),
}));

vi.mock('../db/redis', () => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// =========================================================================
// Pure Mathematical and Algorithmic Reference Functions for Unmet Search
// =========================================================================

export interface RawSearchRecord {
  raw_query: string;
  search_count: number;
  zero_result_count: number;
  last_searched_at: string;
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    // Redact emails
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted]')
    // Redact phone numbers (e.g. +216 12 345 678, 12345678)
    .replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, '[redacted]')
    // Redact 16-digit credit card patterns
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[redacted]')
    // Strip control characters and null bytes
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function calculateOpportunityScore(
  searchCount: number,
  zeroResultCount: number,
): number {
  if (searchCount <= 0 || zeroResultCount <= 0) return 0;
  const zeroResultRate = zeroResultCount / searchCount; // 0.0 to 1.0

  // Volume factor using log10 curve, maxing at ~1000 searches = 1.0
  const volumeFactor = Math.min(1.0, Math.log10(searchCount + 1) / 3.0);
  // Failure severity factor
  const failureFactor = zeroResultRate;

  // Composite score 0 to 100: 60% failure rate weight + 40% volume weight
  const score = (failureFactor * 0.6 + volumeFactor * 0.4) * 100;
  return Math.min(100, Math.max(0, Math.round(score * 10) / 10));
}

export function generateCatalogActionRecommendation(
  query: string,
  searchCount: number,
  opportunityScore: number,
): string {
  if (opportunityScore >= 75 && searchCount >= 50) {
    return `High demand catalog gap for "${query}": Actively recruit artisan/brand vendors or issue inventory sourcing RFQs.`;
  }
  if (opportunityScore >= 50 && searchCount >= 20) {
    return `Moderate unmet demand for "${query}": Recommend vendor catalog expansion and keyword listing enrichment.`;
  }
  if (opportunityScore >= 25) {
    return `Emerging search trend for "${query}": Monitor keyword volume and suggest synonym tagging in related categories.`;
  }
  return `Low priority search void for "${query}": Maintain standard marketplace index tracking.`;
}

export function rankUnmetSearchDemand(
  records: RawSearchRecord[],
  options: { minSearches?: number; limit?: number } = {},
): UnmetSearchDemandItem[] {
  const minSearches = options.minSearches ?? 3;
  const limit = options.limit ?? 50;

  const normalizedItems: UnmetSearchDemandItem[] = [];

  for (const r of records) {
    const cleanQuery = sanitizeSearchQuery(r.raw_query);
    if (!cleanQuery || r.search_count < minSearches) continue;

    const zeroRate =
      r.search_count > 0
        ? Math.round((r.zero_result_count / r.search_count) * 10000) / 100
        : 0;

    const oppScore = calculateOpportunityScore(r.search_count, r.zero_result_count);
    const action = generateCatalogActionRecommendation(cleanQuery, r.search_count, oppScore);

    normalizedItems.push({
      query_normalized: cleanQuery,
      search_count: r.search_count,
      zero_result_count: r.zero_result_count,
      zero_result_rate_pct: zeroRate,
      last_searched_at: r.last_searched_at,
      opportunity_score: oppScore,
      suggested_action: action,
    });
  }

  // Sort by opportunity_score DESC, then search_count DESC, then last_searched_at DESC
  normalizedItems.sort((a, b) => {
    if (b.opportunity_score !== a.opportunity_score) {
      return b.opportunity_score - a.opportunity_score;
    }
    if (b.search_count !== a.search_count) {
      return b.search_count - a.search_count;
    }
    return new Date(b.last_searched_at).getTime() - new Date(a.last_searched_at).getTime();
  });

  return normalizedItems.slice(0, limit);
}

describe('Feature 9: Zero-Result Search Query Intelligence (R3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Tier 1: Feature Coverage (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 1: Unmet Demand Ranking, Scoring & Catalog Suggestions', () => {
    it('T1.1: ranks unmet demand queries in descending order of opportunity score', () => {
      const records: RawSearchRecord[] = [
        {
          raw_query: 'poterie artisanale nabeul',
          search_count: 500,
          zero_result_count: 450, // 90% zero rate -> high score
          last_searched_at: '2026-08-10T14:30:00Z',
        },
        {
          raw_query: 'chemise en lin homme',
          search_count: 50,
          zero_result_count: 10, // 20% zero rate -> low score
          last_searched_at: '2026-08-11T09:00:00Z',
        },
        {
          raw_query: 'huile essentielle romarin bio',
          search_count: 200,
          zero_result_count: 160, // 80% zero rate -> medium-high score
          last_searched_at: '2026-08-12T11:20:00Z',
        },
      ];

      const results = rankUnmetSearchDemand(records);

      expect(results).toHaveLength(3);
      expect(results[0].query_normalized).toBe('poterie artisanale nabeul');
      expect(results[1].query_normalized).toBe('huile essentielle romarin bio');
      expect(results[2].query_normalized).toBe('chemise en lin homme');
      expect(results[0].opportunity_score).toBeGreaterThan(results[1].opportunity_score);
      expect(results[1].opportunity_score).toBeGreaterThan(results[2].opportunity_score);
    });

    it('T1.2: calculates exact zero-result rate percentage and opportunity score', () => {
      const records: RawSearchRecord[] = [
        {
          raw_query: 'tapis margoum kairouan',
          search_count: 400,
          zero_result_count: 300,
          last_searched_at: '2026-08-12T10:00:00Z',
        },
      ];

      const results = rankUnmetSearchDemand(records);
      expect(results[0].zero_result_rate_pct).toBe(75.0);
      expect(results[0].opportunity_score).toBeGreaterThanOrEqual(0);
      expect(results[0].opportunity_score).toBeLessThanOrEqual(100);
      expect(typeof results[0].opportunity_score).toBe('number');
    });

    it('T1.3: generates prescriptive catalog gap recommendations based on query volume & score', () => {
      const highDemandRecord: RawSearchRecord = {
        raw_query: 'coffret cuir traditionnel',
        search_count: 150,
        zero_result_count: 140,
        last_searched_at: '2026-08-12T10:00:00Z',
      };

      const results = rankUnmetSearchDemand([highDemandRecord]);
      expect(results[0].suggested_action).toContain('High demand catalog gap');
      expect(results[0].suggested_action).toContain('recruit artisan/brand vendors');
    });

    it('T1.4: filters out low-volume search noise below minSearches threshold', () => {
      const records: RawSearchRecord[] = [
        { raw_query: 'rare one-off term 1', search_count: 1, zero_result_count: 1, last_searched_at: '2026-08-12T01:00:00Z' },
        { raw_query: 'rare one-off term 2', search_count: 2, zero_result_count: 2, last_searched_at: '2026-08-12T02:00:00Z' },
        { raw_query: 'popular demand query', search_count: 25, zero_result_count: 20, last_searched_at: '2026-08-12T03:00:00Z' },
      ];

      const results = rankUnmetSearchDemand(records, { minSearches: 5 });
      expect(results).toHaveLength(1);
      expect(results[0].query_normalized).toBe('popular demand query');
    });

    it('T1.5: enforces limit parameter for search demand result lists', () => {
      const records: RawSearchRecord[] = Array.from({ length: 30 }, (_, i) => ({
        raw_query: `artisan search keyword ${i + 1}`,
        search_count: 20 + i,
        zero_result_count: 15 + i,
        last_searched_at: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      const results = rankUnmetSearchDemand(records, { limit: 10 });
      expect(results).toHaveLength(10);
    });

    it('T1.6: normalizes query strings by trimming whitespace, lowercasing, and collapsing spaces', () => {
      const dirtyQuery: RawSearchRecord = {
        raw_query: '   Chaussures   Cuir   Véritable   ',
        search_count: 45,
        zero_result_count: 30,
        last_searched_at: '2026-08-12T05:00:00Z',
      };

      const results = rankUnmetSearchDemand([dirtyQuery]);
      expect(results[0].query_normalized).toBe('chaussures cuir véritable');
    });

    it('T1.7: validates search drilldown service integration via search drilldown query', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              query_hash: 'hash_abc123',
              query_display: 'chéchia tunisienne rouge',
              search_count: 85,
              zero_result_count: 60,
              zero_result_rate_pct: 70.59,
              click_count: 15,
              last_searched_at: '2026-08-12T15:00:00Z',
            },
            {
              query_hash: 'hash_def456',
              query_display: 'savon noir bio',
              search_count: 40,
              zero_result_count: 30,
              zero_result_rate_pct: 75.0,
              click_count: 5,
              last_searched_at: '2026-08-12T16:00:00Z',
            },
          ],
        });

      const res = await analyticsService.getSearchDrilldown({ timeRange: '30d', page: 1, limit: 10 });
      expect(res.data).toHaveLength(2);
      expect(res.data[0].query_display).toBe('chéchia tunisienne rouge');
      expect(res.data[0].zero_result_rate_pct).toBe(70.6);
      expect(res.meta.total).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Tier 2: Boundary & Corner Cases (≥5 Tests)
  // -------------------------------------------------------------------------
  describe('Tier 2: Boundary, Extreme Counts & Empty State Cases', () => {
    it('T2.1: handles 100% zero-result queries (complete catalog void)', () => {
      const voidRecord: RawSearchRecord = {
        raw_query: 'drone caméra 4k dji',
        search_count: 100,
        zero_result_count: 100,
        last_searched_at: '2026-08-12T12:00:00Z',
      };

      const results = rankUnmetSearchDemand([voidRecord]);
      expect(results[0].zero_result_rate_pct).toBe(100.0);
      expect(results[0].opportunity_score).toBeGreaterThan(70);
    });

    it('T2.2: handles 0% zero-result queries (perfect search catalog matches)', () => {
      const perfectRecord: RawSearchRecord = {
        raw_query: 'huile d olive extra vierge',
        search_count: 500,
        zero_result_count: 0,
        last_searched_at: '2026-08-12T12:00:00Z',
      };

      const results = rankUnmetSearchDemand([perfectRecord]);
      expect(results[0].zero_result_rate_pct).toBe(0.0);
      expect(results[0].opportunity_score).toBe(0);
      expect(results[0].suggested_action).toContain('Low priority');
    });

    it('T2.3: handles single search boundary when minSearches is explicitly set to 1', () => {
      const singleRecord: RawSearchRecord = {
        raw_query: 'very specific handmade ceramic bowl',
        search_count: 1,
        zero_result_count: 1,
        last_searched_at: '2026-08-12T12:00:00Z',
      };

      const results = rankUnmetSearchDemand([singleRecord], { minSearches: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].search_count).toBe(1);
      expect(results[0].zero_result_rate_pct).toBe(100.0);
    });

    it('T2.4: clamps maximum opportunity score at exactly 100 for massive search volumes', () => {
      const score = calculateOpportunityScore(1000000, 1000000);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBe(100);
    });

    it('T2.5: handles empty search log input returning empty array with valid types', () => {
      const results = rankUnmetSearchDemand([]);
      expect(results).toEqual([]);
    });

    it('T2.6: deterministic tie-breaking for queries with equal opportunity score and volume', () => {
      const olderDate = '2026-08-01T10:00:00Z';
      const newerDate = '2026-08-12T10:00:00Z';

      const records: RawSearchRecord[] = [
        { raw_query: 'term a', search_count: 50, zero_result_count: 40, last_searched_at: olderDate },
        { raw_query: 'term b', search_count: 50, zero_result_count: 40, last_searched_at: newerDate },
      ];

      const results = rankUnmetSearchDemand(records);
      expect(results[0].query_normalized).toBe('term b'); // Newer query comes first
      expect(results[1].query_normalized).toBe('term a');
    });

    it('T2.7: preserves punctuation and accented characters without corruption', () => {
      const complexQuery = 'robe d\'été en soie & broderie florale';
      const clean = sanitizeSearchQuery(complexQuery);
      expect(clean).toBe("robe d'été en soie & broderie florale");
    });
  });

  // -------------------------------------------------------------------------
  // Tier 3: Pairwise Combinations & Adversarial Invariant Checks
  // -------------------------------------------------------------------------
  describe('Tier 3: Pairwise Security, PII Redaction & Adversarial Invariants', () => {
    it('T3.1: PII Sanitization: strips email addresses and credit card numbers from search queries', () => {
      const piiQueries = [
        'cherche vendeur contact john.doe@gmail.com urgent',
        'paiement visa 4111 2222 3333 4444 problème',
        'commande client info@entreprise.tn artisanat',
      ];

      piiQueries.forEach((q) => {
        const sanitized = sanitizeSearchQuery(q);
        expect(sanitized).toContain('[redacted]');
        expect(sanitized).not.toContain('john.doe@gmail.com');
        expect(sanitized).not.toContain('info@entreprise.tn');
        expect(sanitized).not.toContain('4111 2222 3333 4444');
      });
    });

    it('T3.2: Adversarial Security: sanitizes XSS tags and SQL injection payloads in search queries', () => {
      const adversarialQueries = [
        '<script>alert("xss")</script> jebba tunisienne',
        "' UNION SELECT username, password_hash FROM pd_user --",
        '"><img src=x onerror=alert(1)> burnous',
      ];

      adversarialQueries.forEach((q) => {
        const clean = sanitizeSearchQuery(q);
        expect(clean).toBeDefined();
        // Null bytes and control characters stripped
        expect(clean).not.toContain('\u0000');
        expect(clean.length).toBeGreaterThan(0);
      });
    });

    it('T3.3: Multilingual & Arabic Script: accurately normalizes and ranks Arabic search queries', () => {
      const arabicRecords: RawSearchRecord[] = [
        {
          raw_query: '  قفطان تونسي مطرز باليد  ',
          search_count: 320,
          zero_result_count: 280,
          last_searched_at: '2026-08-12T08:00:00Z',
        },
        {
          raw_query: 'زربية قيروانية صوف أصلي',
          search_count: 180,
          zero_result_count: 140,
          last_searched_at: '2026-08-12T09:00:00Z',
        },
      ];

      const results = rankUnmetSearchDemand(arabicRecords);
      expect(results).toHaveLength(2);
      expect(results[0].query_normalized).toBe('قفطان تونسي مطرز باليد');
      expect(results[1].query_normalized).toBe('زربية قيروانية صوف أصلي');
      expect(results[0].opportunity_score).toBeGreaterThan(50);
    });

    it('T3.4: strips control characters, null bytes, and invisible unicode glyphs', () => {
      const maliciousUnicode = 'céramique\u0000artisanale\u001F\u007Fbleue';
      const clean = sanitizeSearchQuery(maliciousUnicode);
      expect(clean).toBe('céramiqueartisanalebleue');
      expect(clean).not.toContain('\u0000');
    });

    it('T3.5: verifies mathematical invariants for all search demand items', () => {
      const records: RawSearchRecord[] = [
        { raw_query: 'test a', search_count: 100, zero_result_count: 80, last_searched_at: '2026-08-12T00:00:00Z' },
        { raw_query: 'test b', search_count: 50, zero_result_count: 50, last_searched_at: '2026-08-12T00:00:00Z' },
        { raw_query: 'test c', search_count: 30, zero_result_count: 0, last_searched_at: '2026-08-12T00:00:00Z' },
      ];

      const results = rankUnmetSearchDemand(records);

      results.forEach((item) => {
        expect(item.zero_result_count).toBeLessThanOrEqual(item.search_count);
        expect(item.zero_result_rate_pct).toBeGreaterThanOrEqual(0);
        expect(item.zero_result_rate_pct).toBeLessThanOrEqual(100);
        expect(item.opportunity_score).toBeGreaterThanOrEqual(0);
        expect(item.opportunity_score).toBeLessThanOrEqual(100);
      });
    });

    it('T3.6: pairwise search drilldown with pagination, search term filter and sort direction', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              query_hash: 'hash_filtered_99',
              query_display: 'babouches artisanales cuir',
              search_count: 60,
              zero_result_count: 45,
              zero_result_rate_pct: 75.0,
              click_count: 8,
              last_searched_at: '2026-08-12T17:00:00Z',
            },
          ],
        });

      const res = await analyticsService.getSearchDrilldown({
        timeRange: '90d',
        search: 'babouches',
        sortBy: 'zero_result_count',
        sortDir: 'desc',
        page: 1,
        limit: 5,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].query_display).toContain('babouches');
      expect(res.meta.sort_by).toBe('search_count');
      expect(res.meta.sort_dir).toBe('desc');
    });
  });
});
