import { Pool, PoolClient } from 'pg';
import { getPool } from '../db/pool';
import { pdId } from '../utils/crypto';
import {
  signPlatformPagePreviewToken,
  verifyPlatformPagePreviewToken,
} from '../utils/jwt';
// Audit P1-5: reuse the store page-builder sanitizers — do not write new ones.
import { sanitizeCss, sanitizeHtml } from './page-builder.service';

const VERSION_RETENTION_LIMIT = 20;
const PREVIEW_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface PlatformPage {
  id: string;
  slug: string;
  title: string;
  builder_data: any;
  html: string;
  css: string;
  is_published: boolean;
  show_in_footer: boolean;
  show_in_header: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface PlatformPageVersionSummary {
  id: string;
  page_id: string;
  version_number: number;
  title: string | null;
  slug: string | null;
  published_at: Date | null;
  created_by: string | null;
  created_at: Date;
}

export class PlatformCmsService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async listPages(): Promise<PlatformPage[]> {
    const res = await this.pool.query(
      `SELECT id, slug, title, is_published, show_in_footer, show_in_header, sort_order, created_at, updated_at 
       FROM pd_platform_page 
       ORDER BY sort_order ASC, created_at DESC`
    );
    return res.rows;
  }

  async listPublicPages(): Promise<PlatformPage[]> {
    const res = await this.pool.query(
      `SELECT id, slug, title, show_in_footer, show_in_header, sort_order 
       FROM pd_platform_page 
       WHERE is_published = true 
       ORDER BY sort_order ASC, created_at DESC`
    );
    return res.rows;
  }

  async getPage(id: string): Promise<PlatformPage | null> {
    const res = await this.pool.query(`SELECT * FROM pd_platform_page WHERE id = $1`, [id]);
    return res.rows[0] || null;
  }

  async getPageBySlug(slug: string): Promise<PlatformPage | null> {
    const res = await this.pool.query(`SELECT * FROM pd_platform_page WHERE slug = $1 AND is_published = true`, [slug]);
    return res.rows[0] || null;
  }

  // =====================================================
  // Versioning (audit P1-6 / M1 — mirrors page-builder.service store flow)
  // =====================================================

  /**
   * Snapshot the published state of a page into pd_platform_page_version.
   * Mirrors the store builder's createPublishedVersion: versions are created
   * on publish, pruned to VERSION_RETENTION_LIMIT per page.
   */
  private async createPublishedVersion(
    client: PoolClient,
    page: Record<string, unknown>,
    userId?: string | null,
  ): Promise<void> {
    const versionId = pdId('page_version');
    const nextVersion = await client.query(
      `SELECT COALESCE(MAX(version_number), 0)::int + 1 AS version_number
       FROM pd_platform_page_version
       WHERE page_id = $1`,
      [page.id],
    );
    const versionNumber = (nextVersion.rows[0] as { version_number: number }).version_number;
    await client.query(
      `INSERT INTO pd_platform_page_version (
         id, page_id, version_number, title, slug, builder_data, html, css,
         seo_title, show_in_navigation, show_in_footer, sort_order,
         published_at, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        versionId,
        page.id,
        versionNumber,
        page.title ?? null,
        page.slug ?? null,
        JSON.stringify(page.builder_data ?? {}),
        page.html ?? '',
        page.css ?? '',
        null,
        false,
        page.show_in_footer ?? false,
        page.sort_order ?? 0,
        new Date(),
        userId ?? null,
      ],
    );
    // Prune old versions beyond retention limit
    await client.query(
      `DELETE FROM pd_platform_page_version
       WHERE page_id = $1
         AND id NOT IN (
           SELECT id FROM pd_platform_page_version
           WHERE page_id = $1
           ORDER BY version_number DESC
           LIMIT $2
         )`,
      [page.id, VERSION_RETENTION_LIMIT],
    );
  }

  async listVersions(pageId: string): Promise<PlatformPageVersionSummary[]> {
    const res = await this.pool.query<PlatformPageVersionSummary>(
      `SELECT id, page_id, version_number, title, slug, published_at, created_by, created_at
       FROM pd_platform_page_version
       WHERE page_id = $1
       ORDER BY version_number DESC`,
      [pageId],
    );
    return res.rows;
  }

  /**
   * Restore a version's content into the live page. Content is re-sanitized on
   * the way back in — older rows may predate write-side sanitization (P1-5).
   */
  async restoreVersion(pageId: string, versionId: string): Promise<(PlatformPage & {
    seo_title: null;
    seo_description: null;
    og_image: null;
    noindex: boolean;
    show_in_navigation: boolean;
  }) | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const pageRes = await client.query(`SELECT * FROM pd_platform_page WHERE id = $1 FOR UPDATE`, [pageId]);
      if (!pageRes.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const versionRes = await client.query(
        `SELECT * FROM pd_platform_page_version WHERE id = $1 AND page_id = $2`,
        [versionId, pageId],
      );
      if (!versionRes.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const snapshot = versionRes.rows[0];
      const restored = await client.query(
        `UPDATE pd_platform_page SET
           title          = COALESCE($2, title),
           builder_data   = COALESCE($3, builder_data),
           html           = $4,
           css            = $5,
           updated_at     = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          pageId,
          snapshot.title ?? null,
          snapshot.builder_data ?? null,
          sanitizeHtml(snapshot.html ?? ''),
          sanitizeCss(snapshot.css ?? ''),
        ],
      );
      await client.query('COMMIT');
      const row = restored.rows[0];
      return {
        ...row,
        seo_title: null,
        seo_description: null,
        og_image: null,
        noindex: false,
        show_in_navigation: false,
      };
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Create a short-lived preview token for an (optionally unpublished) page.
   * The editor opens /hub/pages/<slug>?pb_preview=<token>, which resolves via
   * getPageBySlugForPreview below.
   */
  async createPagePreviewToken(
    pageId: string,
    userId: string,
  ): Promise<{ token: string; expires_at: string; page: { id: string; slug: string; title: string; is_homepage: boolean } } | null> {
    const res = await this.pool.query(`SELECT * FROM pd_platform_page WHERE id = $1`, [pageId]);
    const page = res.rows[0];
    if (!page) return null;
    const token = signPlatformPagePreviewToken({ sub: userId, page_id: page.id, slug: page.slug });
    return {
      token,
      expires_at: new Date(Date.now() + PREVIEW_TOKEN_TTL_MS).toISOString(),
      page: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        is_homepage: false,
      },
    };
  }

  async getPageBySlugForPreview(slug: string, token: string): Promise<PlatformPage | null> {
    const payload = verifyPlatformPagePreviewToken(token);
    if (payload.slug !== slug) return null;
    const res = await this.pool.query(`SELECT * FROM pd_platform_page WHERE id = $1`, [payload.page_id]);
    const page = res.rows[0];
    if (!page || page.slug !== slug) return null;
    return page;
  }

  async createPage(data: Partial<PlatformPage>): Promise<PlatformPage> {
    // Audit P1-7: use the schema-standard pd_<type>_<nanoid> id shape.
    const id = pdId('page');
    const res = await this.pool.query(
      `INSERT INTO pd_platform_page
        (id, slug, title, builder_data, html, css, is_published, show_in_footer, show_in_header, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        data.slug,
        data.title,
        data.builder_data || {},
        sanitizeHtml(data.html || ''),
        sanitizeCss(data.css || ''),
        data.is_published || false,
        data.show_in_footer || false,
        data.show_in_header || false,
        data.sort_order || 0
      ]
    );
    return res.rows[0];
  }

  async updatePage(
    id: string,
    data: Partial<PlatformPage>,
    userId?: string,
  ): Promise<PlatformPage> {
    // Audit P1-7: static SET list with COALESCE — no identifier is ever built
    // by string concatenation from caller-influenced keys. Sanitize rich
    // content on write (audit P1-5).
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE pd_platform_page SET
           slug           = COALESCE($2, slug),
           title          = COALESCE($3, title),
           builder_data   = COALESCE($4, builder_data),
           html           = COALESCE($5, html),
           css            = COALESCE($6, css),
           is_published   = COALESCE($7, is_published),
           show_in_footer = COALESCE($8, show_in_footer),
           show_in_header = COALESCE($9, show_in_header),
           sort_order     = COALESCE($10, sort_order),
           updated_at     = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          data.slug ?? null,
          data.title ?? null,
          data.builder_data ?? null,
          data.html === undefined ? null : sanitizeHtml(data.html),
          data.css === undefined ? null : sanitizeCss(data.css),
          data.is_published ?? null,
          data.show_in_footer ?? null,
          data.show_in_header ?? null,
          data.sort_order ?? null,
        ],
      );
      if (!res.rows[0]) {
        await client.query('COMMIT');
        return this.getPage(id) as Promise<PlatformPage>;
      }
      // Audit P1-6: snapshot a version on every publish transition (mirrors
      // the store page builder's createPublishedVersion).
      const row = res.rows[0] as Record<string, unknown>;
      if (data.is_published === true && row.is_published === true) {
        await this.createPublishedVersion(client, row, userId);
      }
      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
      throw err;
    } finally {
      client.release();
    }
  }

  async deletePage(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM pd_platform_page WHERE id = $1`, [id]);
  }
}

export const platformCmsService = new PlatformCmsService();
