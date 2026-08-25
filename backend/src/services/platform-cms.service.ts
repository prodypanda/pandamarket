import { Pool } from 'pg';
import { getPool } from '../db/pool';
import { pdId } from '../utils/crypto';
// Audit P1-5: reuse the store page-builder sanitizers — do not write new ones.
import { sanitizeCss, sanitizeHtml } from './page-builder.service';

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

  async updatePage(id: string, data: Partial<PlatformPage>): Promise<PlatformPage> {
    // Audit P1-7: static SET list with COALESCE — no identifier is ever built
    // by string concatenation from caller-influenced keys. Sanitize rich
    // content on write (audit P1-5).
    const res = await this.pool.query(
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
      ]
    );
    if (!res.rows[0]) {
      return this.getPage(id) as Promise<PlatformPage>;
    }
    return res.rows[0];
  }

  async deletePage(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM pd_platform_page WHERE id = $1`, [id]);
  }
}

export const platformCmsService = new PlatformCmsService();
