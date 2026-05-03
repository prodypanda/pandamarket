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
  PdForbiddenError,
  PdNotFoundError,
  PdConflictError,
  PdValidationError,
} from '../errors';
import { logger } from '../utils/logger';

// ─── HTML Sanitization ──────────────────────────────────────

/**
 * Sanitize HTML to prevent XSS attacks from stored page content.
 * Allows a generous set of tags/attributes for page builder output
 * while stripping dangerous elements (script, event handlers, etc.).
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  // Strip <script> tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Strip event handler attributes (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Strip javascript: protocol in href/src/action attributes
  clean = clean.replace(/(href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
  // Strip data: protocol in src (except data:image for inline images)
  clean = clean.replace(/src\s*=\s*"data:(?!image\/)[^"]*"/gi, 'src=""');
  // Strip <iframe> tags (prevent embedding malicious content)
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  // Strip <object>, <embed>, <applet> tags
  clean = clean.replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  clean = clean.replace(/<(object|embed|applet)\b[^>]*\/?>/gi, '');
  // Strip <form> tags (prevent phishing forms)
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  return clean;
}

/**
 * Sanitize CSS to prevent CSS-based attacks.
 * Strips @import, expression(), url() with javascript:, and behavior properties.
 */
function sanitizeCss(css: string): string {
  if (!css) return '';
  let clean = css;
  // Strip @import rules (prevent loading external stylesheets)
  clean = clean.replace(/@import\s+[^;]+;/gi, '');
  // Strip expression() (IE CSS expressions)
  clean = clean.replace(/expression\s*\([^)]*\)/gi, '');
  // Strip javascript: in url()
  clean = clean.replace(/url\s*\(\s*(['"]?)javascript:[^)]*\1\s*\)/gi, 'url()');
  // Strip behavior property (IE-specific, can execute HTC files)
  clean = clean.replace(/behavior\s*:\s*[^;]+;?/gi, '');
  // Strip -moz-binding (Firefox XBL binding)
  clean = clean.replace(/-moz-binding\s*:\s*[^;]+;?/gi, '');
  return clean;
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
  sort_order: number;
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
}

export interface UpdatePageInput {
  title?: string;
  slug?: string;
  builder_data?: Record<string, unknown>;
  html?: string;
  css?: string;
  is_published?: boolean;
  is_homepage?: boolean;
  sort_order?: number;
}

// ─── Helpers ────────────────────────────────────────────────

function generatePageId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `pd_page_${ts}${rand}`;
}

const MAX_PAGES_PER_STORE = 20;
const MAX_BUILDER_DATA_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_CSS_SIZE = 512 * 1024; // 512 KB

// ─── Service ────────────────────────────────────────────────

class PageBuilderService {
  /**
   * Assert that the vendor's plan includes the page builder feature.
   * Fetches the store's current plan from the database, then checks limits.
   */
  async assertHasPageBuilder(storeId: string): Promise<void> {
    const storeResult = await query(
      `SELECT subscription_plan FROM pd_store WHERE id = $1`,
      [storeId],
    );
    if (storeResult.rows.length === 0) {
      throw new PdNotFoundError('Boutique introuvable.');
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
  }

  /**
   * List all pages for a store (vendor dashboard).
   */
  async listPages(storeId: string): Promise<IStorePage[]> {
    const result = await query(
      `SELECT * FROM pd_store_page
       WHERE store_id = $1
       ORDER BY sort_order ASC, created_at DESC`,
      [storeId],
    );
    return result.rows;
  }

  /**
   * List published pages for a store (public storefront).
   */
  async listPublishedPages(storeId: string): Promise<IStorePage[]> {
    const result = await query(
      `SELECT id, store_id, slug, title, html, css, is_homepage, sort_order, created_at, updated_at
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
    const result = await query(
      `SELECT * FROM pd_store_page WHERE id = $1 AND store_id = $2`,
      [pageId, storeId],
    );
    if (result.rows.length === 0) {
      throw new PdNotFoundError('Page introuvable.');
    }
    return result.rows[0];
  }

  /**
   * Get a published page by slug (public storefront rendering).
   * Does NOT return builder_data (only compiled HTML/CSS for performance).
   */
  async getPublishedPageBySlug(storeId: string, slug: string): Promise<IStorePage | null> {
    const result = await query(
      `SELECT id, store_id, slug, title, html, css, is_homepage, sort_order, created_at, updated_at
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
    const result = await query(
      `SELECT id, store_id, slug, title, html, css, is_homepage, sort_order, created_at, updated_at
       FROM pd_store_page
       WHERE store_id = $1 AND is_homepage = true AND is_published = true
       LIMIT 1`,
      [storeId],
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new page.
   */
  async createPage(input: CreatePageInput): Promise<IStorePage> {
    await this.assertHasPageBuilder(input.store_id);

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
    if (countResult.rows[0].count >= MAX_PAGES_PER_STORE) {
      throw new PdForbiddenError(
        'PD_PRODUCT_QUOTA_EXCEEDED',
        `Limite de ${MAX_PAGES_PER_STORE} pages atteinte.`,
        { current: countResult.rows[0].count, limit: MAX_PAGES_PER_STORE },
      );
    }

    // Validate sizes
    this.validateSizes(input.builder_data, input.html, input.css);

    const id = generatePageId();

    // Sanitize HTML and CSS before storage
    const cleanHtml = sanitizeHtml(input.html || '');
    const cleanCss = sanitizeCss(input.css || '');

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
          `INSERT INTO pd_store_page (id, store_id, slug, title, builder_data, html, css, is_homepage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            id,
            input.store_id,
            input.slug,
            input.title,
            JSON.stringify(input.builder_data || {}),
            cleanHtml,
            cleanCss,
            input.is_homepage || false,
          ],
        );

        logger.info({ pageId: id, storeId: input.store_id, slug: input.slug }, 'Page builder page created');
        return result.rows[0];
      });
    } catch (err: any) {
      // Handle duplicate slug (PostgreSQL unique_violation 23505)
      if (err?.code === '23505' && err?.constraint === 'uq_store_page_slug') {
        throw new PdConflictError(
          `Une page avec le slug "${input.slug}" existe déjà dans cette boutique.`,
        );
      }
      throw err;
    }
  }

  /**
   * Update an existing page.
   */
  async updatePage(pageId: string, storeId: string, input: UpdatePageInput): Promise<IStorePage> {
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

    try {
      return await transaction(async (client) => {
        // Verify ownership
        const existing = await client.query(
          `SELECT id FROM pd_store_page WHERE id = $1 AND store_id = $2`,
          [pageId, storeId],
        );
        if (existing.rows.length === 0) {
          throw new PdNotFoundError('Page introuvable.');
        }

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
        let paramIdx = 1;

        const addField = (column: string, value: unknown) => {
          if (value !== undefined) {
            sets.push(`${column} = $${paramIdx}`);
            values.push(column === 'builder_data' ? JSON.stringify(value) : value);
            paramIdx++;
          }
        };

        addField('title', sanitizedInput.title);
        addField('slug', sanitizedInput.slug);
        addField('builder_data', sanitizedInput.builder_data);
        addField('html', sanitizedInput.html);
        addField('css', sanitizedInput.css);
        addField('is_published', sanitizedInput.is_published);
        addField('is_homepage', sanitizedInput.is_homepage);
        addField('sort_order', sanitizedInput.sort_order);

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

        logger.info({ pageId, storeId }, 'Page builder page updated');
        return result.rows[0];
      });
    } catch (err: any) {
      // Handle duplicate slug
      if (err?.code === '23505' && err?.constraint === 'uq_store_page_slug') {
        throw new PdConflictError(
          `Une page avec le slug "${sanitizedInput.slug}" existe déjà dans cette boutique.`,
        );
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
      throw new PdNotFoundError('Page introuvable.');
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
