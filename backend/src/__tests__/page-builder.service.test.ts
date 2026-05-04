/**
 * Page Builder Service — Unit Tests
 * ─────────────────────────────────────────────────────────────
 * Tests for CRUD operations, plan gating, tenant isolation,
 * homepage override logic, and size validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (fn: (client: unknown) => Promise<unknown>) => mockTransaction(fn),
}));

const mockGetLimits = vi.fn();
vi.mock('../services/subscription.service', () => ({
  subscriptionService: {
    getLimits: (...args: unknown[]) => mockGetLimits(...args),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { pageBuilderService } from '../services/page-builder.service';

// ─── Helpers ────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
};

function setupTransaction() {
  mockTransaction.mockImplementation(async (fn) => fn(mockClient));
}

function setupPlanCheck(hasPageBuilder: boolean, plan = 'regular') {
  // First call: get store's plan
  mockQuery.mockResolvedValueOnce({
    rows: [{ subscription_plan: plan }],
  });
  // Second call: get plan limits
  mockGetLimits.mockResolvedValueOnce({
    has_page_builder: hasPageBuilder,
    max_products: 100,
  });
}

// ─── Tests ──────────────────────────────────────────────────

describe('PageBuilderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTransaction();
  });

  // ─── Plan Gating ────────────────────────────────────────

  describe('assertHasPageBuilder()', () => {
    it('should allow access for Regular+ plans', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ subscription_plan: 'regular' }] });
      mockGetLimits.mockResolvedValueOnce({ has_page_builder: true });

      await expect(
        pageBuilderService.assertHasPageBuilder('store_1'),
      ).resolves.toBeUndefined();
    });

    it('should block access for Free plan', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ subscription_plan: 'free' }] });
      mockGetLimits.mockResolvedValueOnce({ has_page_builder: false });

      await expect(
        pageBuilderService.assertHasPageBuilder('store_1'),
      ).rejects.toThrow('Le Page Builder nécessite le plan Regular ou supérieur.');
    });

    it('should block access for Starter plan', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ subscription_plan: 'starter' }] });
      mockGetLimits.mockResolvedValueOnce({ has_page_builder: false });

      await expect(
        pageBuilderService.assertHasPageBuilder('store_1'),
      ).rejects.toThrow('Le Page Builder nécessite le plan Regular ou supérieur.');
    });

    it('should throw NotFound for non-existent store', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        pageBuilderService.assertHasPageBuilder('nonexistent'),
      ).rejects.toThrow('Boutique introuvable.');
    });
  });

  // ─── List Pages ─────────────────────────────────────────

  describe('listPages()', () => {
    it('should return all pages for a store', async () => {
      const mockPages = [
        { id: 'p1', slug: 'about', title: 'About', is_published: true },
        { id: 'p2', slug: 'promo', title: 'Promo', is_published: false },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockPages });

      const result = await pageBuilderService.listPages('store_1');
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE store_id = $1'),
        ['store_1'],
      );
    });
  });

  describe('listPublishedPages()', () => {
    it('should return only published pages', async () => {
      const mockPages = [
        { id: 'p1', slug: 'about', title: 'About', is_published: true },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockPages });

      const result = await pageBuilderService.listPublishedPages('store_1');
      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_published = true'),
        ['store_1'],
      );
    });

    it('should NOT include builder_data in public response', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await pageBuilderService.listPublishedPages('store_1');
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).not.toContain('builder_data');
    });
  });

  // ─── Get Page ───────────────────────────────────────────

  describe('getPageById()', () => {
    it('should return page with builder_data for owner', async () => {
      const mockPage = { id: 'p1', store_id: 'store_1', builder_data: { pages: [] } };
      mockQuery.mockResolvedValueOnce({ rows: [mockPage] });

      const result = await pageBuilderService.getPageById('p1', 'store_1');
      expect(result.builder_data).toBeDefined();
    });

    it('should throw NotFound for wrong store_id (tenant isolation)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        pageBuilderService.getPageById('p1', 'wrong_store'),
      ).rejects.toThrow('Page introuvable.');
    });
  });

  describe('getPublishedPageBySlug()', () => {
    it('should return published page by slug', async () => {
      const mockPage = { id: 'p1', slug: 'about', html: '<h1>About</h1>', css: 'h1{color:red}' };
      mockQuery.mockResolvedValueOnce({ rows: [mockPage] });

      const result = await pageBuilderService.getPublishedPageBySlug('store_1', 'about');
      expect(result?.html).toBe('<h1>About</h1>');
    });

    it('should return null for unpublished page', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await pageBuilderService.getPublishedPageBySlug('store_1', 'draft-page');
      expect(result).toBeNull();
    });
  });

  // ─── Create Page ────────────────────────────────────────

  describe('createPage()', () => {
    it('should create a page for Regular+ plan vendor', async () => {
      // Plan check
      setupPlanCheck(true);
      // Page count check
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 3 }] });
      // INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new', slug: 'about', title: 'About Us' }],
      });

      const result = await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'about',
        title: 'About Us',
      });

      expect(result.slug).toBe('about');
    });

    it('should reject invalid slug format', async () => {
      setupPlanCheck(true);

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'INVALID SLUG!',
          title: 'Test',
        }),
      ).rejects.toThrow('slug');
    });

    it('should enforce 20-page limit', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 20 }] });

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'new-page',
          title: 'New Page',
        }),
      ).rejects.toThrow('Limite de 20 pages atteinte');
    });

    it('should unset existing homepage when creating new homepage', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      // Unset existing homepage
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new', is_homepage: true }],
      });

      await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'home',
        title: 'Home',
        is_homepage: true,
      });

      // Verify the unset query was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_homepage = false'),
        ['store_1'],
      );
    });
  });

  // ─── Delete Page ────────────────────────────────────────

  describe('deletePage()', () => {
    it('should delete a page owned by the store', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });

      await expect(
        pageBuilderService.deletePage('p1', 'store_1'),
      ).resolves.toBeUndefined();
    });

    it('should throw NotFound for wrong store (tenant isolation)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        pageBuilderService.deletePage('p1', 'wrong_store'),
      ).rejects.toThrow('Page introuvable.');
    });
  });

  // ─── Homepage Override ──────────────────────────────────

  describe('getHomepageOverride()', () => {
    it('should return the homepage override if exists', async () => {
      const mockPage = { id: 'p1', is_homepage: true, html: '<h1>Custom Home</h1>' };
      mockQuery.mockResolvedValueOnce({ rows: [mockPage] });

      const result = await pageBuilderService.getHomepageOverride('store_1');
      expect(result?.is_homepage).toBe(true);
    });

    it('should return null if no homepage override', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await pageBuilderService.getHomepageOverride('store_1');
      expect(result).toBeNull();
    });
  });

  // ─── Update Page ─────────────────────────────────────────

  describe('updatePage()', () => {
    it('should update page title and content', async () => {
      // Plan check (2 queries: store plan + getLimits)
      setupPlanCheck(true);
      // Verify ownership
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
      // UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'p1', title: 'Updated Title', html: '<h1>New</h1>' }],
      });

      const result = await pageBuilderService.updatePage('p1', 'store_1', {
        title: 'Updated Title',
        html: '<h1>New</h1>',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should reject update for wrong store (tenant isolation)', async () => {
      setupPlanCheck(true);
      // Ownership check returns empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        pageBuilderService.updatePage('p1', 'wrong_store', { title: 'Hack' }),
      ).rejects.toThrow('Page introuvable.');
    });

    it('should reject empty update', async () => {
      setupPlanCheck(true);
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });

      await expect(
        pageBuilderService.updatePage('p1', 'store_1', {}),
      ).rejects.toThrow('Aucun champ à mettre à jour.');
    });

    it('should unset other homepages when setting new homepage', async () => {
      setupPlanCheck(true);
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
      // Unset existing homepage
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'p1', is_homepage: true }],
      });

      await pageBuilderService.updatePage('p1', 'store_1', { is_homepage: true });

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_homepage = false'),
        ['store_1', 'p1'],
      );
    });
  });

  // ─── Duplicate Page ─────────────────────────────────────

  describe('duplicatePage()', () => {
    it('should create a copy with modified slug and title', async () => {
      // getPageById
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'p1', store_id: 'store_1', slug: 'about', title: 'About',
          builder_data: { pages: [] }, html: '<h1>About</h1>', css: 'h1{}',
          is_homepage: false,
        }],
      });
      // assertHasPageBuilder (plan check)
      setupPlanCheck(true);
      // Page count check
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 2 }] });
      // INSERT
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_copy', slug: 'about-copy-xxx', title: 'About (copie)' }],
      });

      const result = await pageBuilderService.duplicatePage('p1', 'store_1');
      expect(result.title).toBe('About (copie)');
    });

    it('should never set duplicate as homepage', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'p1', store_id: 'store_1', slug: 'home', title: 'Home',
          builder_data: {}, html: '', css: '', is_homepage: true,
        }],
      });
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_copy', is_homepage: false }],
      });

      const result = await pageBuilderService.duplicatePage('p1', 'store_1');
      expect(result.is_homepage).toBe(false);
    });
  });

  // ─── Slug Conflict ──────────────────────────────────────

  describe('slug conflict handling', () => {
    it('should throw ConflictError on duplicate slug', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

      // Simulate PostgreSQL unique_violation
      const pgError = new Error('duplicate key') as any;
      pgError.code = '23505';
      pgError.constraint = 'uq_store_page_slug';
      mockTransaction.mockImplementationOnce(async () => { throw pgError; });

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'about',
          title: 'About',
        }),
      ).rejects.toThrow('existe déjà');
    });
  });

  // ─── HTML/CSS Sanitization ──────────────────────────────

  describe('sanitization', () => {
    it('should strip script tags from HTML on create', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new', html: '<h1>Clean</h1>' }],
      });

      await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'test-xss',
        title: 'Test',
        html: '<h1>Clean</h1><script>alert("xss")</script>',
      });

      // Verify the INSERT was called with sanitized HTML (no script tag)
      const insertCall = mockClient.query.mock.calls[0];
      const htmlArg = insertCall[1][5]; // 6th param is html
      expect(htmlArg).not.toContain('<script');
      expect(htmlArg).toContain('<h1>Clean</h1>');
    });

    it('should strip event handlers from HTML on create', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new' }],
      });

      await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'test-events',
        title: 'Test',
        html: '<img src="x" onerror="alert(1)" />',
      });

      const insertCall = mockClient.query.mock.calls[0];
      const htmlArg = insertCall[1][5];
      expect(htmlArg).not.toContain('onerror');
    });

    it('should strip @import from CSS on create', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new' }],
      });

      await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'test-css',
        title: 'Test',
        css: '@import url("https://evil.com/steal.css"); h1 { color: red; }',
      });

      const insertCall = mockClient.query.mock.calls[0];
      const cssArg = insertCall[1][6]; // 7th param is css
      expect(cssArg).not.toContain('@import');
      expect(cssArg).toContain('h1 { color: red; }');
    });
  });

  // ─── Size Validation ────────────────────────────────────

  describe('size validation', () => {
    it('should reject builder_data exceeding 5MB', async () => {
      setupPlanCheck(true);
      // Mock page count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const hugeData: Record<string, unknown> = {};
      // Create a string that's > 5MB
      hugeData.payload = 'x'.repeat(6 * 1024 * 1024);

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'huge-page',
          title: 'Huge',
          builder_data: hugeData,
        }),
      ).rejects.toThrow('données du builder dépassent la limite');
    });

    it('should reject HTML exceeding 2MB', async () => {
      setupPlanCheck(true);
      // Mock page count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'huge-html',
          title: 'Huge HTML',
          html: 'x'.repeat(3 * 1024 * 1024),
        }),
      ).rejects.toThrow('HTML dépasse la limite');
    });

    it('should reject CSS exceeding 512KB', async () => {
      setupPlanCheck(true);
      // Mock page count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'huge-css',
          title: 'Huge CSS',
          css: 'x'.repeat(600 * 1024),
        }),
      ).rejects.toThrow('CSS dépasse la limite');
    });
  });
});
