import { Pool } from 'pg';
import { getPool } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';

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
    const id = uuidv4();
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
        data.html || '',
        data.css || '',
        data.is_published || false,
        data.show_in_footer || false,
        data.show_in_header || false,
        data.sort_order || 0
      ]
    );
    return res.rows[0];
  }

  async updatePage(id: string, data: Partial<PlatformPage>): Promise<PlatformPage> {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const [key, value] of Object.entries(data)) {
      if (['slug', 'title', 'builder_data', 'html', 'css', 'is_published', 'show_in_footer', 'show_in_header', 'sort_order'].includes(key)) {
        updates.push(`${key} = $${i}`);
        values.push(value);
        i++;
      }
    }

    if (updates.length === 0) {
      return this.getPage(id) as Promise<PlatformPage>;
    }

    values.push(id);
    const res = await this.pool.query(
      `UPDATE pd_platform_page SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return res.rows[0];
  }

  async deletePage(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM pd_platform_page WHERE id = $1`, [id]);
  }
}

export const platformCmsService = new PlatformCmsService();
