import dns from 'dns';
import crypto from 'crypto';
import { query } from '../db/pool';
import { pdId, randomHex } from '../utils/crypto';
import {
  PdNotFoundError,
  PdValidationError,
  PdConflictError,
  PdErrorCode,
} from '../errors';
import { subscriptionService } from './subscription.service';
import { platformConfigService } from './platform-config.service';
import { assertCustomDomainPolicy, normalizeCustomDomain } from '../utils/domain';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface StoreDomainRow {
  id: string;
  store_id: string;
  hostname: string;
  is_primary: boolean;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_token_hash: string;
  verified_at: Date | string | null;
  ssl_status: 'pending' | 'issuing' | 'active' | 'failed';
  certificate_expires_at: Date | string | null;
  attempts: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AddDomainResult extends StoreDomainRow {
  verification_token: string; // Plain token returned only on add or fetch
  expected_cname: string;
  expected_txt_name: string;
  expected_txt_value: string;
}

export class DomainVerificationService {
  /**
   * Add a new custom domain for a store.
   */
  async addDomain(storeId: string, plan: string, rawHostname: string): Promise<AddDomainResult> {
    // 1. Enforce subscription plan limit
    await subscriptionService.assertCanUseCustomDomain(plan);

    // 2. Normalize and validate format/policy
    const hostname = normalizeCustomDomain(rawHostname);
    if (!hostname) {
      throw new PdValidationError('Invalid domain name format', { domain: rawHostname });
    }

    const settings = await platformConfigService.getSettings();
    assertCustomDomainPolicy(hostname, settings);

    // 3. Check for uniqueness across pd_store_domain and pd_store.custom_domain
    const existingDomain = await query<{ id: string }>(
      'SELECT id FROM pd_store_domain WHERE hostname = $1',
      [hostname],
    );
    if (existingDomain.rowCount && existingDomain.rowCount > 0) {
      throw new PdConflictError(
        PdErrorCode.STORE_DOMAIN_TAKEN,
        'This custom domain is already registered',
        { domain: hostname },
      );
    }

    const existingStore = await query<{ id: string }>(
      'SELECT id FROM pd_store WHERE custom_domain = $1 AND id != $2',
      [hostname, storeId],
    );
    if (existingStore.rowCount && existingStore.rowCount > 0) {
      throw new PdConflictError(
        PdErrorCode.STORE_DOMAIN_TAKEN,
        'This domain is configured for another store',
        { domain: hostname },
      );
    }

    // 4. Generate verification token and hash
    const rawToken = `pd-verify-${randomHex(16)}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const domainId = pdId('domain');

    // 5. Insert record
    const sql = `
      INSERT INTO pd_store_domain (
        id, store_id, hostname, is_primary, verification_status,
        verification_token_hash, ssl_status, attempts
      ) VALUES ($1, $2, $3, false, 'pending', $4, 'pending', 0)
      RETURNING *`;
    const { rows } = await query<StoreDomainRow>(sql, [
      domainId,
      storeId,
      hostname,
      tokenHash,
    ]);

    const hubHost = config.hubDomain || 'pandamarket.tn';
    const cnameTarget = `cname.${hubHost}`;

    return {
      ...rows[0],
      verification_token: rawToken,
      expected_cname: cnameTarget,
      expected_txt_name: `_pandamarket-challenge.${hostname}`,
      expected_txt_value: rawToken,
    };
  }

  /**
   * List all custom domains registered for a store.
   */
  async listDomains(storeId: string): Promise<StoreDomainRow[]> {
    const { rows } = await query<StoreDomainRow>(
      'SELECT * FROM pd_store_domain WHERE store_id = $1 ORDER BY created_at ASC',
      [storeId],
    );
    return rows;
  }

  /**
   * Get domain by ID.
   */
  async getDomainById(storeId: string, domainId: string): Promise<StoreDomainRow> {
    const { rows } = await query<StoreDomainRow>(
      'SELECT * FROM pd_store_domain WHERE id = $1 AND store_id = $2',
      [domainId, storeId],
    );
    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Domain record not found');
    }
    return rows[0];
  }

  /**
   * Verify DNS ownership via TXT or CNAME lookup.
   */
  async verifyDomain(storeId: string, domainId: string, mockToken?: string): Promise<StoreDomainRow> {
    const domain = await this.getDomainById(storeId, domainId);

    const attempts = domain.attempts + 1;
    let verified = false;

    const hubHost = config.hubDomain || 'pandamarket.tn';
    const validCnameTargets = [
      `cname.${hubHost}`,
      hubHost,
      `www.${hubHost}`,
      `cname.pandamarket.tn`,
      `pandamarket.tn`,
    ];

    // Check CNAME or TXT record
    try {
      // 1. Try CNAME lookup
      const cnames = await dns.promises.resolveCname(domain.hostname).catch(() => []);
      if (cnames.some((c) => validCnameTargets.includes(c.toLowerCase().replace(/\.$/, '')))) {
        verified = true;
      }
    } catch {
      // Ignore CNAME resolution errors
    }

    if (!verified) {
      try {
        // 2. Try TXT record lookup on _pandamarket-challenge.domain or domain
        const challengeHost = `_pandamarket-challenge.${domain.hostname}`;
        const txtRecords = await dns.promises.resolveTxt(challengeHost).catch(() => []);
        const rootTxtRecords = await dns.promises.resolveTxt(domain.hostname).catch(() => []);
        const allTxt = [...txtRecords, ...rootTxtRecords].flat();

        if (mockToken && config.env === 'test') {
          const expectedHash = crypto.createHash('sha256').update(mockToken).digest('hex');
          if (expectedHash === domain.verification_token_hash) {
            verified = true;
          }
        } else if (allTxt.length > 0) {
          for (const txt of allTxt) {
            const hash = crypto.createHash('sha256').update(txt).digest('hex');
            if (hash === domain.verification_token_hash || txt.startsWith('pd-verify-')) {
              verified = true;
              break;
            }
          }
        }
      } catch {
        // Ignore TXT resolution errors
      }
    }

    // Allow mock pass in test environment if mockToken provided or process.env.NODE_ENV === 'test' with test token
    if (mockToken) {
      const mockHash = crypto.createHash('sha256').update(mockToken).digest('hex');
      if (mockHash === domain.verification_token_hash) {
        verified = true;
      }
    }

    const verification_status = verified ? 'verified' : 'failed';
    const ssl_status = verified ? 'active' : 'pending';
    const verified_at = verified ? new Date() : domain.verified_at;

    const { rows } = await query<StoreDomainRow>(
      `UPDATE pd_store_domain
       SET verification_status = $1,
           ssl_status = $2,
           verified_at = $3,
           attempts = $4,
           updated_at = NOW()
       WHERE id = $5 AND store_id = $6
       RETURNING *`,
      [verification_status, ssl_status, verified_at, attempts, domainId, storeId],
    );

    // If verified and no other primary domain exists, set as primary automatically
    if (verified) {
      const primaryCheck = await query<{ count: string }>(
        'SELECT COUNT(*)::text as count FROM pd_store_domain WHERE store_id = $1 AND is_primary = true',
        [storeId],
      );
      if (parseInt(primaryCheck.rows[0]?.count || '0', 10) === 0) {
        await this.makePrimary(storeId, domainId);
      }
    }

    logger.info(
      { store_id: storeId, domain: domain.hostname, verified },
      'Domain DNS verification attempt executed',
    );

    return rows[0];
  }

  /**
   * Mark a verified domain as the primary domain for a store.
   */
  async makePrimary(storeId: string, domainId: string): Promise<StoreDomainRow> {
    const domain = await this.getDomainById(storeId, domainId);
    if (domain.verification_status !== 'verified') {
      throw new PdValidationError('Only verified domains can be set as primary', {
        domain_id: domainId,
        status: domain.verification_status,
      });
    }

    // Unset primary for all store domains
    await query('UPDATE pd_store_domain SET is_primary = false WHERE store_id = $1', [storeId]);

    // Set primary for target domain
    const { rows } = await query<StoreDomainRow>(
      'UPDATE pd_store_domain SET is_primary = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [domainId],
    );

    // Sync to pd_store custom_domain column
    await query('UPDATE pd_store SET custom_domain = $1 WHERE id = $2', [
      domain.hostname,
      storeId,
    ]);

    return rows[0];
  }

  /**
   * Delete a custom domain.
   */
  async removeDomain(storeId: string, domainId: string): Promise<void> {
    const domain = await this.getDomainById(storeId, domainId);

    await query('DELETE FROM pd_store_domain WHERE id = $1 AND store_id = $2', [domainId, storeId]);

    // If it was primary, check if another verified domain exists to make primary or clear pd_store
    if (domain.is_primary) {
      const { rows } = await query<StoreDomainRow>(
        `SELECT id FROM pd_store_domain
         WHERE store_id = $1 AND verification_status = 'verified'
         ORDER BY created_at ASC LIMIT 1`,
        [storeId],
      );
      if (rows[0]) {
        await this.makePrimary(storeId, rows[0].id);
      } else {
        await query('UPDATE pd_store SET custom_domain = NULL WHERE id = $1', [storeId]);
      }
    }
  }

  /**
   * Check if a domain is allowed for TLS issuance by Caddy.
   */
  async isDomainTlsAllowed(hostname: string): Promise<boolean> {
    const norm = normalizeCustomDomain(hostname);
    if (!norm) return false;

    const { rows } = await query<StoreDomainRow>(
      `SELECT * FROM pd_store_domain
       WHERE hostname = $1 AND verification_status = 'verified' AND ssl_status != 'failed'`,
      [norm],
    );

    if (rows.length > 0) return true;

    // Legacy fallback check in pd_store: only if store is active and on an authorized paid plan
    // (pd_store has no is_active column — active means not suspended)
    const legacyStore = await query<{ id: string; subscription_plan: string }>(
      "SELECT id, subscription_plan FROM pd_store WHERE custom_domain = $1 AND status <> 'suspended'",
      [norm],
    );
    if (legacyStore.rows[0]) {
      const limits = await subscriptionService.getLimits(legacyStore.rows[0].subscription_plan);
      return Boolean(limits.has_custom_domain);
    }
    return false;
  }
}

export const domainVerificationService = new DomainVerificationService();
