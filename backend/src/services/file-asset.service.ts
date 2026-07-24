import { query } from '../db/pool';
import { pdId } from '../utils/crypto';

export interface FileAssetRow {
  id: string;
  scope: 'store' | 'platform';
  purpose: string;
  url: string;
  file_key: string;
  bucket: string;
  filename: string;
  content_type: string;
  file_size: string | number | null;
  owner_user_id: string | null;
  store_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class FileAssetService {
  async registerAsset(input: {
    scope: 'store' | 'platform';
    purpose: string;
    url: string;
    file_key: string;
    bucket: string;
    filename: string;
    content_type: string;
    file_size?: number | null;
    owner_user_id?: string | null;
    store_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<FileAssetRow> {
    const id = pdId('asset');
    const { rows } = await query<FileAssetRow>(
      `INSERT INTO pd_file_asset
        (id, scope, purpose, url, file_key, bucket, filename, content_type, file_size, owner_user_id, store_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
       ON CONFLICT (file_key) DO UPDATE SET
         url = EXCLUDED.url,
         filename = EXCLUDED.filename,
         content_type = EXCLUDED.content_type,
         file_size = EXCLUDED.file_size,
         metadata = pd_file_asset.metadata || EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
        input.scope,
        input.purpose,
        input.url,
        input.file_key,
        input.bucket,
        input.filename,
        input.content_type,
        input.file_size ?? null,
        input.owner_user_id ?? null,
        input.store_id ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return rows[0];
  }

  async listAssets(opts: { scope?: 'store' | 'platform'; storeId?: string; type?: 'image' | 'document'; folder?: string; limit?: number } = {}) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 60));
    const params: unknown[] = [];
    const where: string[] = [];

    if (opts.scope) {
      params.push(opts.scope);
      where.push(`a.scope = $${params.length}`);
    }
    if (opts.storeId) {
      params.push(opts.storeId);
      where.push(`a.store_id = $${params.length}`);
    }
    if (opts.type === 'image') {
      where.push(`a.content_type LIKE 'image/%'`);
    }
    if (opts.type === 'document') {
      where.push(`a.content_type NOT LIKE 'image/%'`);
    }
    if (opts.folder && opts.folder !== 'all') {
      const f = opts.folder.toLowerCase();
      if (f === 'categories') {
        where.push(
          `(a.file_key LIKE '%/categories/%' OR a.file_key LIKE '%marketplace/pd_user_%' OR a.file_key LIKE '%category%' OR a.file_key LIKE '%cat_%' OR b.key LIKE '%/categories/%' OR b.key LIKE '%marketplace/pd_user_%' OR a.purpose = 'marketplace_asset')`,
        );
      } else if (f === 'branding') {
        where.push(
          `(a.file_key LIKE '%/branding/%' OR a.file_key LIKE '%logo%' OR a.file_key LIKE '%favicon%' OR a.file_key LIKE '%brand%' OR b.key LIKE '%/branding/%')`,
        );
      } else if (f === 'banners') {
        where.push(
          `(a.file_key LIKE '%/banners/%' OR a.file_key LIKE '%banner%' OR a.file_key LIKE '%hero%' OR a.file_key LIKE '%slide%' OR b.key LIKE '%/banners/%')`,
        );
      } else if (f === 'general') {
        where.push(
          `(a.file_key LIKE '%/general/%' OR b.key LIKE '%/general/%' OR (a.file_key NOT LIKE '%/categories/%' AND a.file_key NOT LIKE '%/branding/%' AND a.file_key NOT LIKE '%/banners/%'))`,
        );
      } else {
        params.push(`%/${opts.folder}/%`);
        where.push(`(a.file_key LIKE $${params.length} OR a.url LIKE $${params.length} OR b.key LIKE $${params.length})`);
      }
    }

    params.push(limit);
    const { rows } = await query<FileAssetRow>(
      `SELECT a.id, a.scope, a.purpose, a.url, a.file_key, a.bucket, a.filename,
              COALESCE(b.content_type, a.content_type) as content_type,
              COALESCE(OCTET_LENGTH(b.data), a.file_size) as file_size,
              a.owner_user_id, a.store_id, a.metadata, a.created_at, a.updated_at
       FROM pd_file_asset a
       INNER JOIN pd_file_blobs b ON (b.key = a.file_key OR b.key = 'pd-product-images/' || a.file_key OR a.url LIKE '%' || b.key OR b.key LIKE '%' || a.file_key)
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return rows;
  }
}

export const fileAssetService = new FileAssetService();
