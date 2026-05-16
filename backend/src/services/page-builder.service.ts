/**
 * Page Builder Service
 * ─────────────────────────────────────────────────────────────
 * Manages GrapesJS page builder content for vendor storefronts.
 *
 * Access control:
 *   - Only vendors on Regular+ plans (has_page_builder = true) can use this.
 *   - All mutations enforce store_id ownership (tenant isolation).
 *   - Public read of published pages is allowed (for storefront rendering).
 *
 * Data flow:
 *   1. Vendor opens the Page Builder editor in their dashboard.
 *   2. GrapesJS saves project JSON (builder_data) + compiled HTML/CSS.
 *   3. On the storefront, published pages are rendered from the compiled HTML/CSS
 *      for fast SSR (no GrapesJS runtime needed on the public site).
 */

import { query, transaction } from '../db/pool';
import { subscriptionService } from './subscription.service';
import {
  PdAuthenticationError,
  PdForbiddenError,
  PdNotFoundError,
  PdConflictError,
  PdValidationError,
  PdErrorCode,
} from '../errors';
import type { PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { signPageBuilderPreviewToken, verifyPageBuilderPreviewToken } from '../utils/jwt';
import { isUnlimited } from '../utils/plans';

// ─── HTML Sanitization ──────────────────────────────────────

function neutralizeForms(html: string): string {
  return html
    .replace(/<form\b/gi, '<div data-pd-form-placeholder="true"')
    .replace(/<\/form>/gi, '</div>');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isUnsafeUrl(value: string, allowDataImage = false): boolean {
  const compact = [...value.trim()]
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127 && !/\s/.test(char);
    })
    .join('')
    .toLowerCase();
  if (compact.startsWith('javascript:') || compact.startsWith('vbscript:')) return true;
  if (compact.startsWith('data:')) return !(allowDataImage && compact.startsWith('data:image/'));
  return false;
}

function findCssUrlClose(input: string, start: number): number {
  let quote: string | null = null;
  for (let i = start; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === '\\') {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ')') return i;
  }
  return -1;
}

function cssUrlValue(raw: string): string {
  const trimmed = raw.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function sanitizeCssUrls(css: string): string {
  let output = '';
  let index = 0;
  const pattern = /url\s*\(/gi;
  while (index < css.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(css);
    if (!match) {
      output += css.slice(index);
      break;
    }
    const valueStart = pattern.lastIndex;
    const closeIndex = findCssUrlClose(css, valueStart);
    if (closeIndex === -1) {
      output += css.slice(index);
      break;
    }
    const rawValue = css.slice(valueStart, closeIndex);
    output += css.slice(index, match.index);
    output += isUnsafeUrl(cssUrlValue(rawValue), true) ? 'url()' : css.slice(match.index, closeIndex + 1);
    index = closeIndex + 1;
  }
  return output;
}

function sanitizeUrlAttributes(html: string): string {
  return html.replace(
    /\s+(href|src|action|poster|formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (match, attr: string, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, '');
      const allowDataImage = /^(src|poster)$/i.test(attr);
      return isUnsafeUrl(value, allowDataImage) ? ` ${attr}=""` : match;
    },
  );
}

function sanitizeSrcsetAttributes(html: string): string {
  return html.replace(
    /\s+srcset\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (_match, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, '');
      const candidates = value
        .split(',')
        .map((candidate) => candidate.trim())
        .filter((candidate) => {
          const url = candidate.split(/\s+/)[0] || '';
          return url && !isUnsafeUrl(url, true);
        });
      return candidates.length ? ` srcset="${escapeAttr(candidates.join(', '))}"` : '';
    },
  );
}

function sanitizeInlineStyles(html: string): string {
  return html.replace(
    /\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    (_match, raw: string) => {
      const value = raw.replace(/^["']|["']$/g, '');
      const clean = sanitizeCss(value).trim();
      return clean ? ` style="${escapeAttr(clean)}"` : '';
    },
  );
}

/**
 * Sanitize HTML to prevent XSS attacks from stored page content.
 * Allows a generous set of tags/attributes for page builder output
 * while stripping dangerous elements (script, event handlers, etc.).
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Strip <script> tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Strip event handler attributes (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Strip javascript: protocol in href/src/action attributes
  clean = sanitizeUrlAttributes(clean);
  clean = sanitizeSrcsetAttributes(clean);
  clean = sanitizeInlineStyles(clean);
  // Strip <iframe> tags (prevent embedding malicious content)
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  // Strip <object>, <embed>, <applet> tags
  clean = clean.replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  clean = clean.replace(/<(object|embed|applet)\b[^>]*\/?>/gi, '');
  // Strip <form> tags (prevent phishing forms)
  clean = neutralizeForms(clean);
  clean = clean.replace(/<(link|meta|base)\b[^>]*\/?>/gi, '');
  return clean;
}

/**
 * Sanitize CSS to prevent CSS-based attacks.
 * Strips @import, expression(), url() with javascript:, and behavior properties.
 */
function sanitizeCss(css: string): string {
  if (!css) return '';
  let clean = css;
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip @import rules (prevent loading external stylesheets)
  clean = clean.replace(/@import\s+(?:url\s*\()?[^;{}]+;?/gi, '');
  // Strip expression() (IE CSS expressions)
  clean = clean.replace(/expression\s*\([^)]*\)/gi, '');
  // Strip javascript: in url()
  clean = sanitizeCssUrls(clean);
  // Strip behavior property (IE-specific, can execute HTC files)
  clean = clean.replace(/behavior\s*:\s*[^;]+;?/gi, '');
  // Strip -moz-binding (Firefox XBL binding)
  clean = clean.replace(/-moz-binding\s*:\s*[^;]+;?/gi, '');
  return clean;
}
function sanitizeText(value: string | null | undefined, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function sanitizeImageUrl(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.startsWith('/')) return normalized;
  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? normalized : null;
  } catch {
    return null;
  }
}
// ─── Types ──────────────────────────────────────────────────

export interface IStorePage {
  id: string;
  store_id: string;
  slug: string;
  title: string;
  builder_data: Record<string, unknown>;
  html: string;
  css: string;
  is_published: boolean;
  is_homepage: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex: boolean;
  show_in_navigation: boolean;
  show_in_footer: boolean;
  sort_order: number;
  views_30d?: number;
  cta_clicks_30d?: number;
  product_clicks_30d?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePageInput {
  store_id: string;
  slug: string;
  title: string;
  builder_data?: Record<string, unknown>;
  html?: string;
  css?: string;
  is_homepage?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  show_in_navigation?: boolean;
  show_in_footer?: boolean;
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  builder_data?: Record<string, unknown>;
  html?: string;
  css?: string;
  is_published?: boolean;
  is_homepage?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  show_in_navigation?: boolean;
  show_in_footer?: boolean;
  sort_order?: number;
}

export interface PagePreviewTokenResult {
  token: string;
  expires_at: string;
  page: Pick<IStorePage, 'id' | 'slug' | 'title' | 'is_homepage'>;
}

export interface IStorePageVersion {
  id: string;
  page_id: string;
  store_id: string;
  version_number: number;
  title: string;
  slug: string;
  builder_data: Record<string, unknown>;
  html: string;
  css: string;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image?: string | null;
  noindex: boolean;
  show_in_navigation: boolean;
  show_in_footer: boolean;
  sort_order: number;
  published_at?: string | null;
  created_by?: string | null;
  created_at: string;
}

export type StorePageVersionSummary = Pick<
  IStorePageVersion,
  'id' | 'page_id' | 'version_number' | 'title' | 'slug' | 'published_at' | 'created_by' | 'created_at'
>;

// ─── Helpers ────────────────────────────────────────────────

function generatePageId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `pd_page_${ts}${rand}`;
}

function isPgUniqueViolation(err: unknown, constraint: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'constraint' in err &&
    err.code === '23505' &&
    err.constraint === constraint
  );
}

function pageSlugConflict(slug: string): PdConflictError {
  return new PdConflictError(
    PdErrorCode.STORE_SUBDOMAIN_TAKEN,
    `Une page avec le slug "${slug}" existe déjà dans cette boutique.`,
    { field: 'slug', slug, resource: 'page_builder_page' },
  );
}

const MAX_BUILDER_DATA_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_CSS_SIZE = 512 * 1024; // 512 KB
const EDITOR_PAGE_SELECT = `
  id, store_id, slug, title,
  COALESCE(draft_builder_data, builder_data) AS builder_data,
  COALESCE(draft_html, html) AS html,
  COALESCE(draft_css, css) AS css,
  is_published, is_homepage,
  COALESCE(draft_seo_title, seo_title) AS seo_title,
  COALESCE(draft_seo_description, seo_description) AS seo_description,
  COALESCE(draft_og_image, og_image) AS og_image,
  COALESCE(draft_noindex, noindex) AS noindex,
  COALESCE(draft_show_in_navigation, show_in_navigation) AS show_in_navigation,
  COALESCE(draft_show_in_footer, show_in_footer) AS show_in_footer,
  COALESCE(draft_sort_order, sort_order) AS sort_order,
  created_at, updated_at
`;
const DRAFT_PREVIEW_PAGE_SELECT = `
  id, store_id, slug, title,
  COALESCE(draft_html, html) AS html,
  COALESCE(draft_css, css) AS css,
  is_published, is_homepage,
  COALESCE(draft_seo_title, seo_title) AS seo_title,
  COALESCE(draft_seo_description, seo_description) AS seo_description,
  COALESCE(draft_og_image, og_image) AS og_image,
  COALESCE(draft_noindex, noindex) AS noindex,
  COALESCE(draft_show_in_navigation, show_in_navigation) AS show_in_navigation,
  COALESCE(draft_show_in_footer, show_in_footer) AS show_in_footer,
  COALESCE(draft_sort_order, sort_order) AS sort_order,
  created_at, updated_at
`;
const PREVIEW_TOKEN_TTL_MS = 15 * 60 * 1000;
const VERSION_RETENTION_LIMIT = 20;

// ─── Service ────────────────────────────────────────────────

class PageBuilderService {
  /**
   * Assert that the vendor's plan includes the page builder feature.
   * Fetches the store's current plan from the database, then checks limits.
   */
  async getPageBuilderLimits(storeId: string): Promise<{ plan: string; max_page_builder_pages: number; has_ai_seo: boolean }> {
    const storeResult = await query(
      `SELECT subscription_plan FROM pd_store WHERE id = $1`,
      [storeId],
    );
    if (storeResult.rows.length === 0) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Boutique introuvable.');
    }
    const plan = storeResult.rows[0].subscription_plan;
    const limits = await subscriptionService.getLimits(plan);
    if (!limits.has_page_builder) {
      throw new PdForbiddenError(
        'PD_PERM_PLAN_REQUIRED',
        'Le Page Builder nécessite le plan Regular ou supérieur.',
        { required_plan: 'regular', current_plan: plan },
      );
    }
    return {
      plan,
      max_page_builder_pages: limits.max_page_builder_pages,
      has_ai_seo: limits.has_ai_seo,
    };
  }

  async assertHasPageBuilder(storeId: string): Promise<void> {
    await this.getPageBuilderLimits(storeId);
  }

  /**
   * List all pages for a store (vendor dashboard).
   */
  async listPages(storeId: string): Promise<IStorePage[]> {
    const result = await query<IStorePage>(
      `SELECT ${EDITOR_PAGE_SELECT},
              COALESCE(stats.views_30d, 0)::int AS views_30d,
              COALESCE(stats.cta_clicks_30d, 0)::int AS cta_clicks_30d,
              COALESCE(stats.product_clicks_30d, 0)::int AS product_clicks_30d
       FROM pd_store_page
       LEFT JOIN (
         SELECT
           page_id,
           COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '30 days') AS views_30d,
           COUNT(*) FILTER (WHERE event_type = 'cta_click' AND created_at >= NOW() - INTERVAL '30 days') AS cta_clicks_30d,
           COUNT(*) FILTER (WHERE event_type = 'product_click' AND created_at >= NOW() - INTERVAL '30 days') AS product_clicks_30d
         FROM pd_store_page_analytics_event
         WHERE store_id = $1
         GROUP BY page_id
       ) stats ON stats.page_id = pd_store_page.id
       WHERE store_id = $1
       ORDER BY COALESCE(draft_sort_order, sort_order) ASC, created_at DESC`,
      [storeId],
    );
    return result.rows;
  }

  /**
   * List published pages for a store (public storefront).
   */
  async listPublishedPages(storeId: string): Promise<IStorePage[]> {
    const result = await query<IStorePage>(
      `SELECT id, store_id, slug, title, html, css, is_homepage, seo_title, seo_description, og_image, noindex, show_in_navigation, show_in_footer, sort_order, created_at, updated_at
       FROM pd_store_page
       WHERE store_id = $1 AND is_published = true
       ORDER BY sort_order ASC`,
      [storeId],
    );
    return result.rows;
  }

  /**
   * Get a single page by ID (vendor dashboard — includes builder_data).
   */
  async getPageById(pageId: string, storeId: string): Promise<IStorePage> {
    const result = await query<IStorePage>(
      `SELECT ${EDITOR_PAGE_SELECT}
       FROM pd_store_page
       WHERE id = $1 AND store_id = $2`,
      [pageId, storeId],
    );
    if (result.rows.length === 0) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Page introuvable.');
    }
    return result.rows[0];
  }

  async createPreviewToken(pageId: string, storeId: string, userId: string): Promise<PagePreviewTokenResult> {
    await this.assertHasPageBuilder(storeId);
    const page = await this.getPageById(pageId, storeId);
    const token = signPageBuilderPreviewToken({
      sub: userId,
      store_id: storeId,
      page_id: page.id,
      slug: page.slug,
    });
    return {
      token,
      expires_at: new Date(Date.now() + PREVIEW_TOKEN_TTL_MS).toISOString(),
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        is_homepage: page.is_homepage,
      },
    };
  }

  async getDraftPreviewPage(
    storeId: string,
    token: string,
    options: { slug?: string; homepage?: boolean } = {},
  ): Promise<IStorePage | null> {
    const payload = verifyPageBuilderPreviewToken(token);
    if (payload.store_id !== storeId || (options.slug !== undefined && payload.slug !== options.slug)) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Invalid page preview token');
    }
    const result = await query<IStorePage>(
      `SELECT ${DRAFT_PREVIEW_PAGE_SELECT}
       FROM pd_store_page
       WHERE store_id = $1 AND id = $2`,
      [storeId, payload.page_id],
    );
    const page = result.rows[0] || null;
    if (!page) return null;
    if (options.slug !== undefined && page.slug !== options.slug) return null;
    if (options.homepage === true && !page.is_homepage) return null;
    return page;
  }

  /**
   * Get a published page by slug (public storefront rendering).
   * Does NOT return builder_data (only compiled HTML/CSS for performance).
   */
  async getPublishedPageBySlug(storeId: string, slug: string): Promise<IStorePage | null> {
    const result = await query<IStorePage>(
      `SELECT id, store_id, slug, title, html, css, is_homepage, seo_title, seo_description, og_image, noindex, show_in_navigation, show_in_footer, sort_order, created_at, updated_at
       FROM pd_store_page
       WHERE store_id = $1 AND slug = $2 AND is_published = true`,
      [storeId, slug],
    );
    return result.rows[0] || null;
  }

  /**
   * Get the homepage override for a store (if any).
   */
  async getHomepageOverride(storeId: string): Promise<IStorePage | null> {
    const result = await query<IStorePage>(
      `SELECT id, store_id, slug, title, html, css, is_homepage, seo_title, seo_description, og_image, noindex, show_in_navigation, show_in_footer, sort_order, created_at, updated_at
       FROM pd_store_page
       WHERE store_id = $1 AND is_homepage = true AND is_published = true
       LIMIT 1`,
      [storeId],
    );
    return result.rows[0] || null;
  }

  private async createPublishedVersion(
    client: PoolClient,
    page: Record<string, unknown>,
    userId?: string | null,
  ): Promise<IStorePageVersion> {
    const versionId = generatePageId().replace('pd_page_', 'pd_page_version_');
    const nextVersion = await client.query(
      `SELECT COALESCE(MAX(version_number), 0)::int + 1 AS version_number
       FROM pd_store_page_version
       WHERE page_id = $1`,
      [page.id],
    );
    const versionNumber = (nextVersion.rows[0] as { version_number: number }).version_number;
    const result = await client.query(
      `INSERT INTO pd_store_page_version (
        id, page_id, store_id, version_number, title, slug, builder_data, html, css,
        seo_title, seo_description, og_image, noindex, show_in_navigation,
        show_in_footer, sort_order, published_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        versionId,
        page.id,
        page.store_id,
        versionNumber,
        page.title,
        page.slug,
        JSON.stringify(page.builder_data ?? {}),
        page.html ?? '',
        page.css ?? '',
        page.seo_title ?? null,
        page.seo_description ?? null,
        page.og_image ?? null,
        page.noindex ?? false,
        page.show_in_navigation ?? false,
        page.show_in_footer ?? false,
        page.sort_order ?? 0,
        page.published_at ?? new Date(),
        userId ?? null,
      ],
    );
    await this.pruneOldVersions(client, page.id as string);
    return result.rows[0];
  }

  private async pruneOldVersions(
    client: PoolClient,
    pageId: string,
  ): Promise<void> {
    await client.query(
      `DELETE FROM pd_store_page_version
       WHERE page_id = $1
         AND id NOT IN (
           SELECT id
           FROM pd_store_page_version
           WHERE page_id = $1
           ORDER BY version_number DESC
           LIMIT $2
         )`,
      [pageId, VERSION_RETENTION_LIMIT],
    );
  }

  async listVersions(pageId: string, storeId: string): Promise<StorePageVersionSummary[]> {
    await this.assertHasPageBuilder(storeId);
    await this.getPageById(pageId, storeId);
    const result = await query<StorePageVersionSummary>(
      `SELECT id, page_id, version_number, title, slug, published_at, created_by, created_at
       FROM pd_store_page_version
       WHERE page_id = $1 AND store_id = $2
       ORDER BY version_number DESC`,
      [pageId, storeId],
    );
    return result.rows;
  }

  async restoreVersion(pageId: string, storeId: string, versionId: string): Promise<IStorePage> {
    await this.assertHasPageBuilder(storeId);
    return transaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM pd_store_page WHERE id = $1 AND store_id = $2`,
        [pageId, storeId],
      );
      if (existing.rows.length === 0) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Page introuvable.');
      }
      const version = await client.query<IStorePageVersion>(
        `SELECT *
         FROM pd_store_page_version
         WHERE id = $1 AND page_id = $2 AND store_id = $3`,
        [versionId, pageId, storeId],
      );
      if (version.rows.length === 0) {
        throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Version introuvable.');
      }
      const snapshot = version.rows[0];
      const result = await client.query<IStorePage>(
        `UPDATE pd_store_page
         SET draft_builder_data = $1,
             draft_html = $2,
             draft_css = $3,
             draft_seo_title = $4,
             draft_seo_description = $5,
             draft_og_image = $6,
             draft_noindex = $7,
             draft_show_in_navigation = $8,
             draft_show_in_footer = $9,
             draft_sort_order = $10
         WHERE id = $11 AND store_id = $12
         RETURNING ${EDITOR_PAGE_SELECT}`,
        [
          JSON.stringify(snapshot.builder_data ?? {}),
          snapshot.html ?? '',
          snapshot.css ?? '',
          snapshot.seo_title ?? null,
          snapshot.seo_description ?? null,
          snapshot.og_image ?? null,
          snapshot.noindex ?? false,
          snapshot.show_in_navigation ?? false,
          snapshot.show_in_footer ?? false,
          snapshot.sort_order ?? 0,
          pageId,
          storeId,
        ],
      );
      logger.info({ pageId, storeId, versionId }, 'Page builder version restored to draft');
      return result.rows[0];
    });
  }

  /**
   * Create a new page.
   */
  async createPage(input: CreatePageInput): Promise<IStorePage> {
    const limits = await this.getPageBuilderLimits(input.store_id);

    // Validate slug format
    if (!/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(input.slug)) {
      throw new PdValidationError(
        'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets (2-100 caractères).',
      );
    }

    // Check page count limit
    const countResult = await query(
      `SELECT COUNT(*)::int AS count FROM pd_store_page WHERE store_id = $1`,
      [input.store_id],
    );
    if (!isUnlimited(limits.max_page_builder_pages) && countResult.rows[0].count >= limits.max_page_builder_pages) {
      throw new PdForbiddenError(
        'PD_PRODUCT_QUOTA_EXCEEDED',
        `Limite de ${limits.max_page_builder_pages} pages atteinte pour votre plan.`,
        { current: countResult.rows[0].count, limit: limits.max_page_builder_pages, plan: limits.plan },
      );
    }

    // Validate sizes
    this.validateSizes(input.builder_data, input.html, input.css);

    const id = generatePageId();

    // Sanitize HTML and CSS before storage
    const cleanBuilderData = input.builder_data || {};
    const cleanHtml = sanitizeHtml(input.html || '');
    const cleanCss = sanitizeCss(input.css || '');
    const seoTitle = sanitizeText(input.seo_title, 200);
    const seoDescription = sanitizeText(input.seo_description, 320);
    const ogImage = sanitizeImageUrl(input.og_image);

    try {
      return await transaction(async (client) => {
        // If this page is set as homepage, unset any existing homepage
        if (input.is_homepage) {
          await client.query(
            `UPDATE pd_store_page SET is_homepage = false WHERE store_id = $1 AND is_homepage = true`,
            [input.store_id],
          );
        }

        const result = await client.query(
          `INSERT INTO pd_store_page (id, store_id, slug, title, builder_data, html, css, is_homepage, seo_title, seo_description, og_image, noindex, show_in_navigation, show_in_footer, draft_builder_data, draft_html, draft_css, draft_seo_title, draft_seo_description, draft_og_image, draft_noindex, draft_show_in_navigation, draft_show_in_footer, draft_sort_order, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
           RETURNING *`,
          [
            id,
            input.store_id,
            input.slug,
            input.title,
            JSON.stringify(cleanBuilderData),
            cleanHtml,
            cleanCss,
            input.is_homepage || false,
            seoTitle,
            seoDescription,
            ogImage,
            input.noindex || false,
            input.show_in_navigation || false,
            input.show_in_footer || false,
            JSON.stringify(cleanBuilderData),
            cleanHtml,
            cleanCss,
            seoTitle,
            seoDescription,
            ogImage,
            input.noindex || false,
            input.show_in_navigation || false,
            input.show_in_footer || false,
            0,
            null,
          ],
        );

        logger.info({ pageId: id, storeId: input.store_id, slug: input.slug }, 'Page builder page created');
        return result.rows[0];
      });
    } catch (err: unknown) {
      // Handle duplicate slug (PostgreSQL unique_violation 23505)
      if (isPgUniqueViolation(err, 'uq_store_page_slug')) {
        throw pageSlugConflict(input.slug);
      }
      throw err;
    }
  }

  /**
   * Update an existing page.
   */
  async updatePage(pageId: string, storeId: string, input: UpdatePageInput, userId?: string | null): Promise<IStorePage> {
    await this.assertHasPageBuilder(storeId);

    // Validate slug if provided
    if (input.slug !== undefined && !/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/.test(input.slug)) {
      throw new PdValidationError(
        'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets (2-100 caractères).',
      );
    }

    // Validate sizes
    this.validateSizes(input.builder_data, input.html, input.css);

    // Sanitize HTML and CSS if provided
    const sanitizedInput = { ...input };
    if (sanitizedInput.html !== undefined) {
      sanitizedInput.html = sanitizeHtml(sanitizedInput.html);
    }
    if (sanitizedInput.css !== undefined) {
      sanitizedInput.css = sanitizeCss(sanitizedInput.css);
    }
    sanitizedInput.seo_title = sanitizeText(sanitizedInput.seo_title, 200);
    sanitizedInput.seo_description = sanitizeText(sanitizedInput.seo_description, 320);
    sanitizedInput.og_image = sanitizeImageUrl(sanitizedInput.og_image);

    try {
      return await transaction(async (client) => {
        // Verify ownership
        const existing = await client.query(
          `SELECT * FROM pd_store_page WHERE id = $1 AND store_id = $2`,
          [pageId, storeId],
        );
        if (existing.rows.length === 0) {
          throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Page introuvable.');
        }
        const existingPage = existing.rows[0] as Record<string, unknown>;

        // If setting as homepage, unset any existing homepage
        if (sanitizedInput.is_homepage === true) {
          await client.query(
            `UPDATE pd_store_page SET is_homepage = false WHERE store_id = $1 AND is_homepage = true AND id != $2`,
            [storeId, pageId],
          );
        }

        // Build dynamic SET clause
        const sets: string[] = [];
        const values: unknown[] = [];
        const jsonColumns = new Set(['builder_data', 'draft_builder_data']);
        let paramIdx = 1;

        const addField = (column: string, value: unknown) => {
          if (value !== undefined) {
            sets.push(`${column} = $${paramIdx}`);
            values.push(jsonColumns.has(column) ? JSON.stringify(value ?? {}) : value);
            paramIdx++;
          }
        };
        const valueOrExisting = <T>(value: T | undefined, draftColumn: string, liveColumn: string, fallback: T): T => (
          value !== undefined ? value : (existingPage[draftColumn] ?? existingPage[liveColumn] ?? fallback) as T
        );

        addField('title', sanitizedInput.title);
        addField('slug', sanitizedInput.slug);
        addField('draft_builder_data', sanitizedInput.builder_data);
        addField('draft_html', sanitizedInput.html);
        addField('draft_css', sanitizedInput.css);
        addField('is_homepage', sanitizedInput.is_homepage);
        addField('draft_seo_title', sanitizedInput.seo_title);
        addField('draft_seo_description', sanitizedInput.seo_description);
        addField('draft_og_image', sanitizedInput.og_image);
        addField('draft_noindex', sanitizedInput.noindex);
        addField('draft_show_in_navigation', sanitizedInput.show_in_navigation);
        addField('draft_show_in_footer', sanitizedInput.show_in_footer);
        addField('draft_sort_order', sanitizedInput.sort_order);

        if (sanitizedInput.is_published === true) {
          addField('builder_data', valueOrExisting(sanitizedInput.builder_data, 'draft_builder_data', 'builder_data', {}));
          addField('html', valueOrExisting(sanitizedInput.html, 'draft_html', 'html', ''));
          addField('css', valueOrExisting(sanitizedInput.css, 'draft_css', 'css', ''));
          addField('seo_title', valueOrExisting(sanitizedInput.seo_title, 'draft_seo_title', 'seo_title', null));
          addField('seo_description', valueOrExisting(sanitizedInput.seo_description, 'draft_seo_description', 'seo_description', null));
          addField('og_image', valueOrExisting(sanitizedInput.og_image, 'draft_og_image', 'og_image', null));
          addField('noindex', valueOrExisting(sanitizedInput.noindex, 'draft_noindex', 'noindex', false));
          addField('show_in_navigation', valueOrExisting(sanitizedInput.show_in_navigation, 'draft_show_in_navigation', 'show_in_navigation', false));
          addField('show_in_footer', valueOrExisting(sanitizedInput.show_in_footer, 'draft_show_in_footer', 'show_in_footer', false));
          addField('sort_order', valueOrExisting(sanitizedInput.sort_order, 'draft_sort_order', 'sort_order', 0));
          addField('published_at', new Date());
          addField('is_published', true);
        } else if (sanitizedInput.is_published === false) {
          addField('is_published', false);
        }

        if (sets.length === 0) {
          throw new PdValidationError('Aucun champ à mettre à jour.');
        }

        values.push(pageId, storeId);
        const result = await client.query(
          `UPDATE pd_store_page SET ${sets.join(', ')}
           WHERE id = $${paramIdx} AND store_id = $${paramIdx + 1}
           RETURNING *`,
          values,
        );

        if (sanitizedInput.is_published === true) {
          await this.createPublishedVersion(client, result.rows[0] as Record<string, unknown>, userId);
        }

        logger.info({ pageId, storeId }, 'Page builder page updated');
        return result.rows[0];
      });
    } catch (err: unknown) {
      // Handle duplicate slug
      if (isPgUniqueViolation(err, 'uq_store_page_slug') && typeof sanitizedInput.slug === 'string') {
        throw pageSlugConflict(sanitizedInput.slug);
      }
      throw err;
    }
  }
  /**
   * Delete a page.
   */
  async deletePage(pageId: string, storeId: string): Promise<void> {
    const result = await query(
      `DELETE FROM pd_store_page WHERE id = $1 AND store_id = $2 RETURNING id`,
      [pageId, storeId],
    );
    if (result.rows.length === 0) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Page introuvable.');
    }
    logger.info({ pageId, storeId }, 'Page builder page deleted');
  }

  /**
   * Duplicate a page (useful for creating variations).
   */
  async duplicatePage(pageId: string, storeId: string): Promise<IStorePage> {
    const original = await this.getPageById(pageId, storeId);
    return this.createPage({
      store_id: storeId,
      slug: `${original.slug}-copy-${Date.now().toString(36)}`,
      title: `${original.title} (copie)`,
      builder_data: original.builder_data,
      html: original.html,
      css: original.css,
      is_homepage: false,
      seo_title: original.seo_title || undefined,
      seo_description: original.seo_description || undefined,
      og_image: original.og_image || undefined,
      noindex: original.noindex,
      show_in_navigation: false,
      show_in_footer: false,
    });
  }

  /**
   * Validate payload sizes to prevent abuse.
   */
  private validateSizes(
    builderData?: Record<string, unknown>,
    html?: string,
    css?: string,
  ): void {
    if (builderData) {
      const size = Buffer.byteLength(JSON.stringify(builderData), 'utf8');
      if (size > MAX_BUILDER_DATA_SIZE) {
        throw new PdValidationError(
          `Les données du builder dépassent la limite de ${MAX_BUILDER_DATA_SIZE / 1024 / 1024} Mo.`,
        );
      }
    }
    if (html && Buffer.byteLength(html, 'utf8') > MAX_HTML_SIZE) {
      throw new PdValidationError(
        `Le HTML dépasse la limite de ${MAX_HTML_SIZE / 1024 / 1024} Mo.`,
      );
    }
    if (css && Buffer.byteLength(css, 'utf8') > MAX_CSS_SIZE) {
      throw new PdValidationError(
        `Le CSS dépasse la limite de ${MAX_CSS_SIZE / 1024} Ko.`,
      );
    }
  }
}

export const pageBuilderService = new PageBuilderService();
