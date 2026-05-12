/**
 * ApiKeyService — vendor-side API keys for ERP/POS integration.
 * - Only Agency+ plans can create keys (enforced at the route layer).
 * - The full key is shown ONCE on creation; we store only the hash.
 */

import { query } from '../db/pool';
import { generateApiKey, sha256 } from '../utils/crypto';
import { pdId } from '../utils/crypto';
import {
  PdAuthenticationError,
  PdErrorCode,
  PdForbiddenError,
  PdNotFoundError,
} from '../errors';
import { ApiKeyScope, IApiKey } from '@pandamarket/types';
import { logger } from '../utils/logger';

export interface ApiKeyRow {
  id: string;
  store_id: string;
  key_hash: string;
  key_prefix: string;
  label: string;
  scopes: ApiKeyScope[];
  is_active: boolean;
  last_used_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

function rowToPublic(r: ApiKeyRow): IApiKey {
  return {
    id: r.id,
    store_id: r.store_id,
    key_prefix: r.key_prefix,
    label: r.label,
    scopes: r.scopes,
    is_active: r.is_active,
    last_used_at: r.last_used_at ? r.last_used_at.toISOString() : null,
    expires_at: r.expires_at ? r.expires_at.toISOString() : null,
    created_at: r.created_at.toISOString(),
  };
}

export class ApiKeyService {
  /**
   * Generate a new API key. Returns the FULL key — the caller must show it
   * to the vendor exactly once.
   */
  async create(opts: {
    store_id: string;
    label: string;
    scopes: ApiKeyScope[];
    expires_at?: string;
  }): Promise<{ key: string; record: IApiKey }> {
    const { key, prefix, hash } = generateApiKey();
    const id = pdId('apikey');
    const expiresAt = opts.expires_at ? new Date(opts.expires_at) : null;
    const { rows } = await query<ApiKeyRow>(
      `INSERT INTO pd_api_keys
        (id, store_id, key_hash, key_prefix, label, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, opts.store_id, hash, prefix, opts.label, JSON.stringify(opts.scopes), expiresAt],
    );
    logger.info({ key_id: id, store_id: opts.store_id }, 'API key created');
    return { key, record: rowToPublic(rows[0]) };
  }

  async listByStore(storeId: string): Promise<IApiKey[]> {
    const { rows } = await query<ApiKeyRow>(
      `SELECT * FROM pd_api_keys WHERE store_id = $1 ORDER BY created_at DESC`,
      [storeId],
    );
    return rows.map(rowToPublic);
  }

  async revoke(keyId: string, storeId: string): Promise<void> {
    const { rowCount } = await query(
      `UPDATE pd_api_keys SET is_active = false WHERE id = $1 AND store_id = $2`,
      [keyId, storeId],
    );
    if (!rowCount) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'API key not found');
  }

  /**
   * Verify a raw key, return its row. Throws if invalid/expired/revoked.
   * Also updates last_used_at.
   */
  async verify(rawKey: string): Promise<ApiKeyRow> {
    const hash = sha256(rawKey);
    const { rows } = await query<ApiKeyRow>(
      `SELECT * FROM pd_api_keys WHERE key_hash = $1`,
      [hash],
    );
    const row = rows[0];
    if (!row) {
      throw new PdAuthenticationError(PdErrorCode.KEY_INVALID, 'Invalid API key');
    }
    if (!row.is_active) {
      throw new PdAuthenticationError(PdErrorCode.KEY_INVALID, 'API key revoked');
    }
    if (row.expires_at && row.expires_at.getTime() < Date.now()) {
      throw new PdAuthenticationError(PdErrorCode.KEY_EXPIRED, 'API key expired');
    }
    // touch last_used_at (fire-and-forget)
    query('UPDATE pd_api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]).catch(
      (err) => logger.warn({ err }, 'Failed to update API key last_used_at'),
    );
    return row;
  }

  /**
   * Throw if the key does not have the required scope.
   */
  assertScope(row: { scopes: ApiKeyScope[] }, required: ApiKeyScope): void {
    if (!row.scopes.includes(required)) {
      throw new PdForbiddenError(
        PdErrorCode.KEY_SCOPE_DENIED,
        'This API key does not have the required scope',
        { required_scope: required },
      );
    }
  }
}

export const apiKeyService = new ApiKeyService();
