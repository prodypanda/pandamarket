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

function setupPlanCheck(hasPageBuilder: boolean, plan = 'regular', maxPageBuilderPages = 20) {
  // First call: get store's plan
  mockQuery.mockResolvedValueOnce({
    rows: [{ subscription_plan: plan }],
  });
  // Second call: get plan limits
  mockGetLimits.mockResolvedValueOnce({
    has_page_builder: hasPageBuilder,
    has_ai_seo: hasPageBuilder,
    max_products: 100,
    max_page_builder_pages: maxPageBuilderPages,
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

    it('should include 30-day analytics aggregates for dashboard page cards', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'p1',
          slug: 'about',
          title: 'About',
          is_published: true,
          views_30d: 12,
          cta_clicks_30d: 3,
          product_clicks_30d: 4,
        }],
      });

      const result = await pageBuilderService.listPages('store_1');
      const sql = mockQuery.mock.calls[0][0] as string;

      expect(result[0]).toMatchObject({
        views_30d: 12,
        cta_clicks_30d: 3,
        product_clicks_30d: 4,
      });
      expect(sql).toContain('pd_store_page_analytics_event');
      expect(sql).toContain('views_30d');
      expect(sql).toContain('cta_clicks_30d');
      expect(sql).toContain('product_clicks_30d');
      expect(sql).toContain('WHERE store_id = $1');
      expect(sql).toContain('stats.page_id = pd_store_page.id');
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['store_1']);
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

  describe('draft preview', () => {
    it('should create a scoped preview token for a page', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'p1',
          store_id: 'store_1',
          slug: 'about',
          title: 'About',
          is_homepage: false,
          builder_data: { pages: [] },
        }],
      });

      const result = await pageBuilderService.createPreviewToken('p1', 'store_1', 'user_1');

      expect(result.token).toEqual(expect.any(String));
      expect(result.page).toEqual({ id: 'p1', slug: 'about', title: 'About', is_homepage: false });
      expect(Date.parse(result.expires_at)).toBeGreaterThan(Date.now());
    });

    it('should return draft HTML/CSS for a valid preview token', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'p1',
          store_id: 'store_1',
          slug: 'about',
          title: 'About',
          is_homepage: false,
          builder_data: { pages: [] },
        }],
      });
      const preview = await pageBuilderService.createPreviewToken('p1', 'store_1', 'user_1');
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'p1', slug: 'about', html: '<h1>Draft</h1>', css: 'h1{color:green}', is_homepage: false }],
      });

      const result = await pageBuilderService.getDraftPreviewPage('store_1', preview.token, { slug: 'about' });

      expect(result?.html).toBe('<h1>Draft</h1>');
      expect(result?.css).toBe('h1{color:green}');
      const previewQuery = mockQuery.mock.calls.at(-1)?.[0] as string;
      expect(previewQuery).toContain('COALESCE(draft_html, html)');
    });

    it('should reject preview tokens used for a different slug', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'p1',
          store_id: 'store_1',
          slug: 'about',
          title: 'About',
          is_homepage: false,
          builder_data: { pages: [] },
        }],
      });
      const preview = await pageBuilderService.createPreviewToken('p1', 'store_1', 'user_1');

      await expect(
        pageBuilderService.getDraftPreviewPage('store_1', preview.token, { slug: 'contact' }),
      ).rejects.toThrow('Invalid page preview token');
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

    it('should enforce configured page limit', async () => {
      setupPlanCheck(true, 'regular', 5);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });

      await expect(
        pageBuilderService.createPage({
          store_id: 'store_1',
          slug: 'new-page',
          title: 'New Page',
        }),
      ).rejects.toThrow('Limite de 5 pages atteinte');
    });

    it('should persist SEO and navigation settings on create', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new', seo_title: 'Promo SEO' }],
      });

      await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'promo',
        title: 'Promo',
        seo_title: '  Promo SEO  ',
        seo_description: 'Description SEO',
        og_image: 'javascript:alert(1)',
        noindex: true,
        show_in_navigation: true,
        show_in_footer: true,
      });

      const insertCall = mockClient.query.mock.calls[0];
      const params = insertCall[1] as unknown[];
      expect(insertCall[0]).toContain('seo_title');
      expect(params[8]).toBe('Promo SEO');
      expect(params[9]).toBe('Description SEO');
      expect(params[10]).toBeNull();
      expect(params[11]).toBe(true);
      expect(params[12]).toBe(true);
      expect(params[13]).toBe(true);
    });

    it('should sanitize stored page html and css on create', async () => {
      setupPlanCheck(true);
      mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'pd_page_new' }],
      });

      await pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'secure-page',
        title: 'Secure Page',
        html: '<style>.bad{color:red}</style><img src="vbscript:alert(1)" srcset="javascript:alert(1) 1x, /pd-product-images/safe.jpg 2x" onerror="alert(1)" style="background:url(javascript:alert(1));color:red;behavior:url(x)" /><form><input /></form><iframe src="https://evil.test"></iframe>',
        css: '@import url("https://evil.test/x.css"); section{background:url(data:text/html,<svg>);behavior:url(x);-moz-binding:url(x);color:red}',
      });

      const params = mockClient.query.mock.calls[0][1] as unknown[];
      const html = params[5] as string;
      const css = params[6] as string;
      expect(html).toContain('/pd-product-images/safe.jpg 2x');
      expect(html).toContain('data-pd-form-placeholder');
      expect(html).not.toContain('<style');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('<form');
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('javascript:alert');
      expect(html).not.toContain('vbscript:alert');
      expect(html).not.toContain('behavior:url');
      expect(css).not.toContain('@import');
      expect(css).not.toContain('data:text/html');
      expect(css).not.toContain('behavior');
      expect(css).not.toContain('-moz-binding');
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

    it('should save content changes into draft fields only', async () => {
      setupPlanCheck(true);
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'p1', draft_html: '<h1>Draft</h1>', html: '<h1>Live</h1>' }],
      });

      await pageBuilderService.updatePage('p1', 'store_1', {
        builder_data: { pages: [] },
        html: '<h1>Draft</h1>',
        css: 'h1{color:green}',
      });

      const updateCall = mockClient.query.mock.calls[1];
      const sql = updateCall[0] as string;
      expect(sql).toContain('draft_builder_data');
      expect(sql).toContain('draft_html');
      expect(sql).toContain('draft_css');
      expect(sql).not.toMatch(/(^|, )builder_data =/);
      expect(sql).not.toMatch(/(^|, )html =/);
      expect(sql).not.toMatch(/(^|, )css =/);
    });

    it('should copy draft content into public fields when publishing', async () => {
      setupPlanCheck(true);
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'p1',
          builder_data: { live: true },
          html: '<h1>Live</h1>',
          css: 'h1{color:black}',
          draft_builder_data: { draft: true },
          draft_html: '<h1>Draft</h1>',
          draft_css: 'h1{color:green}',
          draft_seo_title: 'Draft SEO',
          draft_seo_description: 'Draft description',
          draft_og_image: '/pd-product-images/draft.jpg',
          draft_noindex: true,
          draft_show_in_navigation: true,
          draft_show_in_footer: true,
          draft_sort_order: 7,
        }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'p1',
          store_id: 'store_1',
          slug: 'about',
          title: 'About',
          builder_data: { draft: true },
          html: '<h1>Draft</h1>',
          css: 'h1{color:green}',
          seo_title: 'Draft SEO',
          seo_description: 'Draft description',
          og_image: '/pd-product-images/draft.jpg',
          noindex: true,
          show_in_navigation: true,
          show_in_footer: true,
          sort_order: 7,
          published_at: new Date('2026-05-15T12:00:00Z'),
          is_published: true,
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [{ version_number: 1 }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'pd_page_version_1', version_number: 1 }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await pageBuilderService.updatePage('p1', 'store_1', { is_published: true });

      const updateCall = mockClient.query.mock.calls[1];
      const sql = updateCall[0] as string;
      const params = updateCall[1] as unknown[];
      expect(sql).toContain('builder_data');
      expect(sql).toContain('html');
      expect(sql).toContain('css');
      expect(sql).toContain('published_at');
      expect(sql).toContain('is_published');
      expect(params[0]).toBe(JSON.stringify({ draft: true }));
      expect(params[1]).toBe('<h1>Draft</h1>');
      expect(params[2]).toBe('h1{color:green}');
      expect(params[3]).toBe('Draft SEO');
      expect(params[6]).toBe(true);
      expect(params[7]).toBe(true);
      expect(params[8]).toBe(true);
      expect(params[9]).toBe(7);
      expect(mockClient.query.mock.calls[2][0]).toContain('FROM pd_store_page_version');
      expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO pd_store_page_version');
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

      const result = pageBuilderService.createPage({
        store_id: 'store_1',
        slug: 'about',
        title: 'About',
      });

      await expect(result).rejects.toThrow('existe déjà');
      await expect(result).rejects.toMatchObject({
        details: { field: 'slug', slug: 'about', resource: 'page_builder_page' },
      });
    });

    it('should expose slug conflict details on update', async () => {
      setupPlanCheck(true);
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] });
      const pgError = new Error('duplicate key') as any;
      pgError.code = '23505';
      pgError.constraint = 'uq_store_page_slug';
      mockClient.query.mockRejectedValueOnce(pgError);

      const result = pageBuilderService.updatePage('p1', 'store_1', { slug: 'about' });

      await expect(result).rejects.toThrow('existe déjà');
      await expect(result).rejects.toMatchObject({
        details: { field: 'slug', slug: 'about', resource: 'page_builder_page' },
      });
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
