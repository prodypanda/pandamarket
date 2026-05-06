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

  async listAssets(opts: { scope?: 'store' | 'platform'; storeId?: string; type?: 'image' | 'document'; limit?: number } = {}) {
    const limit = Math.min(100, Math.max(1, opts.limit ?? 60));
    const params: unknown[] = [];
    const where: string[] = [];

    if (opts.scope) {
      params.push(opts.scope);
      where.push(`scope = $${params.length}`);
    }
    if (opts.storeId) {
      params.push(opts.storeId);
      where.push(`store_id = $${params.length}`);
    }
    if (opts.type === 'image') {
      where.push(`content_type LIKE 'image/%'`);
    }
    if (opts.type === 'document') {
      where.push(`content_type NOT LIKE 'image/%'`);
    }

    params.push(limit);
    const { rows } = await query<FileAssetRow>(
      `SELECT * FROM pd_file_asset
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params,
    );
    return rows;
  }
}

export const fileAssetService = new FileAssetService();
