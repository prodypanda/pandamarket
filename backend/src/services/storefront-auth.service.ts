import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole } from '@pandamarket/types';
import { config } from '../config';
import { query, transaction } from '../db/pool';
import { PdAuthenticationError, PdConflictError, PdErrorCode, PdForbiddenError, PdNotFoundError, PdValidationError } from '../errors';
import { pdId } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { emailQueue } from '../queues/email-queue';

export interface StorefrontCustomerRow {
  id: string;
  store_id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PublicStorefrontCustomer {
  id: string;
  store_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email_verified: boolean;
  is_active: boolean;
  created_at: Date;
}

export interface StorefrontSessionRow {
  id: string;
  customer_id: string;
  store_id: string;
  user_agent: string | null;
  ip_address: string | null;
  is_revoked: boolean;
  expires_at: Date;
  created_at: Date;
}

interface StorefrontRecoveryContext {
  ip?: string | null;
  user_agent?: string | null;
}

interface StorefrontLinks {
  store_url: string;
  verify_url: (token: string) => string;
  reset_url: (token: string) => string;
}

function toPublicCustomer(customer: StorefrontCustomerRow): PublicStorefrontCustomer {
  return {
    id: customer.id,
    store_id: customer.store_id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    email_verified: customer.email_verified,
    is_active: customer.is_active,
    created_at: customer.created_at,
  };
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export class StorefrontAuthService {
  private getHubOrigin(): string {
    const configured = (config.hubDomain || 'pandamarket.local:3000').trim().replace(/\/$/, '');
    if (/^https?:\/\//i.test(configured)) return configured;
    const protocol = config.env === 'production' && !/(localhost|127\.0\.0\.1|\.local)(?::|$)/i.test(configured)
      ? 'https'
      : 'http';
    return `${protocol}://${configured}`;
  }

  private async getStorefrontLinks(storeId: string): Promise<StorefrontLinks> {
    const { rows } = await query<{ subdomain: string | null; custom_domain: string | null }>(
      'SELECT subdomain, custom_domain FROM pd_store WHERE id = $1',
      [storeId],
    );
    const store = rows[0];
    let storeUrl = `${this.getHubOrigin()}/store/${encodeURIComponent(storeId)}`;

    if (store?.custom_domain?.trim()) {
      storeUrl = `https://${store.custom_domain.trim().toLowerCase()}`;
    } else if (store?.subdomain?.trim()) {
      try {
        const hub = new URL(this.getHubOrigin());
        storeUrl = `${hub.protocol}//${store.subdomain.trim().toLowerCase()}.${hub.host}`;
      } catch {
        storeUrl = `${this.getHubOrigin()}/store/${encodeURIComponent(storeId)}`;
      }
    }

    const storeQuery = `store_id=${encodeURIComponent(storeId)}`;
    return {
      store_url: storeUrl,
      verify_url: (token) => `${storeUrl}/verify-email?${storeQuery}&token=${encodeURIComponent(token)}`,
      reset_url: (token) => `${storeUrl}/reset-password?${storeQuery}&token=${encodeURIComponent(token)}`,
    };
  }

  private recordRecoveryAudit(input: {
    action: string;
    storeId: string;
    customerId?: string | null;
    email?: string | null;
    success: boolean;
    context?: StorefrontRecoveryContext;
  }): void {
    query(
      `INSERT INTO pd_audit_log
        (id, actor_id, actor_role, action, resource_type, resource_id, ip, user_agent, metadata)
       VALUES ($1, NULL, 'customer', $2, 'storefront_customer', $3, $4::inet, $5, $6::jsonb)`,
      [
        pdId('audit'),
        input.action,
        input.customerId || input.storeId,
        input.context?.ip ?? null,
        input.context?.user_agent ?? null,
        JSON.stringify({
          store_id: input.storeId,
          email: input.email?.trim().toLowerCase() || null,
          success: input.success,
        }),
      ],
    ).catch((err) => logger.warn({ err, action: input.action, store_id: input.storeId }, 'Storefront recovery audit failed'));
  }

  private async assertPublicStore(storeId: string): Promise<void> {
    const { rows } = await query<{ status: string; is_verified: boolean }>(
      'SELECT status, is_verified FROM pd_store WHERE id = $1',
      [storeId],
    );
    const store = rows[0];
    if (!store) {
      throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found', { store_id: storeId });
    }
    if (store.status !== 'verified' || !store.is_verified) {
      throw new PdForbiddenError(PdErrorCode.STORE_NOT_VERIFIED, 'Store is not eligible for public operations');
    }
  }

  async register(opts: {
    store_id: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<{ customer: PublicStorefrontCustomer; verify_token?: string }> {
    const storeId = opts.store_id.trim();
    await this.assertPublicStore(storeId);

    const email = opts.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new PdValidationError('Invalid email format', { field: 'email' });
    }
    if (opts.password.length < 8) {
      throw new PdValidationError('Password must be at least 8 characters', { field: 'password', min_length: 8 });
    }

    const existing = await query('SELECT id FROM pd_storefront_customer WHERE store_id = $1 AND email = $2', [storeId, email]);
    if (existing.rowCount && existing.rowCount > 0) {
      throw new PdConflictError(PdErrorCode.AUTH_EMAIL_EXISTS, 'An account already exists with this email for this storefront', { store_id: storeId, email });
    }

    const id = pdId('sfcust');
    const passwordHash = await bcrypt.hash(opts.password, config.bcryptRounds);
    const { rows } = await query<StorefrontCustomerRow>(
      `INSERT INTO pd_storefront_customer
        (id, store_id, email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, storeId, email, passwordHash, opts.first_name, opts.last_name, opts.phone ?? null],
    );

    // Create verification token
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawVerifyToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      `INSERT INTO pd_storefront_customer_token (id, customer_id, store_id, token_hash, type, expires_at)
       VALUES ($1, $2, $3, $4, 'email_verify', $5)`,
      [pdId('sfctok'), id, storeId, tokenHash, expiresAt],
    );

    const links = await this.getStorefrontLinks(storeId);

    logger.info({ storefront_customer_id: id, store_id: storeId }, 'Storefront customer registered');
    emailQueue.add('welcome_customer', {
      to: email,
      template: 'welcome_customer',
      variables: {
        name: opts.first_name,
        store_url: links.store_url,
        verify_url: links.verify_url(rawVerifyToken),
        store_id: storeId,
        verify_token: rawVerifyToken,
      },
      scope: 'store',
      store_id: storeId,
    }).catch((err) => logger.warn({ err, store_id: storeId }, 'Storefront welcome email enqueue failed'));

    return { customer: toPublicCustomer(rows[0]), verify_token: rawVerifyToken };
  }

  async login(
    storeId: string,
    email: string,
    password: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ customer: PublicStorefrontCustomer; session_id: string; access_token: string; refresh_token: string }> {
    const normalizedStoreId = storeId.trim();
    await this.assertPublicStore(normalizedStoreId);

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query<StorefrontCustomerRow>(
      `SELECT * FROM pd_storefront_customer
       WHERE store_id = $1 AND email = $2`,
      [normalizedStoreId, normalizedEmail],
    );
    const customer = rows[0];
    if (!customer) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }
    if (!customer.is_active) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_ACCOUNT_SUSPENDED, 'Your account has been suspended');
    }
    const ok = await bcrypt.compare(password, customer.password_hash);
    if (!ok) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid email or password');
    }

    await query('UPDATE pd_storefront_customer SET last_login_at = NOW() WHERE id = $1', [customer.id]);

    const session = await this.createSession(customer.id, customer.store_id, meta?.userAgent, meta?.ipAddress);
    const access_token = this.issueAccessToken(toPublicCustomer(customer));

    return {
      customer: toPublicCustomer(customer),
      session_id: session.session_id,
      access_token,
      refresh_token: session.refresh_token,
    };
  }

  async createSession(
    customerId: string,
    storeId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ session_id: string; refresh_token: string }> {
    const sessionId = pdId('sfcsess');
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await query(
      `INSERT INTO pd_storefront_customer_session
        (id, customer_id, store_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, customerId, storeId, tokenHash, userAgent ?? null, ipAddress ?? null, expiresAt],
    );

    return { session_id: sessionId, refresh_token: rawRefreshToken };
  }

  async refreshSession(rawRefreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const tokenHash = hashToken(rawRefreshToken);

    const { rows: sessionRows } = await query<StorefrontSessionRow>(
      `SELECT * FROM pd_storefront_customer_session
       WHERE refresh_token_hash = $1 AND is_revoked = false AND expires_at > NOW()`,
      [tokenHash],
    );
    const session = sessionRows[0];
    if (!session) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_EXPIRED, 'Invalid or expired refresh token');
    }

    const customer = await this.getById(session.customer_id, session.store_id);

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      `UPDATE pd_storefront_customer_session
       SET refresh_token_hash = $1, expires_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [newTokenHash, newExpiresAt, session.id],
    );

    const access_token = this.issueAccessToken(customer);
    return { access_token, refresh_token: newRefreshToken };
  }

  async verifyEmail(storeId: string, rawToken: string, context?: StorefrontRecoveryContext): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const { rows: tokenRows } = await query<{ id: string; customer_id: string }>(
      `SELECT id, customer_id FROM pd_storefront_customer_token
       WHERE token_hash = $1 AND store_id = $2 AND type = 'email_verify' AND expires_at > NOW()`,
      [tokenHash, storeId],
    );
    const token = tokenRows[0];
    if (!token) {
      this.recordRecoveryAudit({
        action: 'storefront.auth.email_verification_failed',
        storeId,
        success: false,
        context,
      });
      throw new PdValidationError('Invalid or expired verification token');
    }

    await transaction(async (client) => {
      await client.query('UPDATE pd_storefront_customer SET email_verified = true WHERE id = $1', [token.customer_id]);
      await client.query('DELETE FROM pd_storefront_customer_token WHERE id = $1', [token.id]);
    });
    this.recordRecoveryAudit({
      action: 'storefront.auth.email_verification_completed',
      storeId,
      customerId: token.customer_id,
      success: true,
      context,
    });
  }

  async forgotPassword(storeId: string, email: string, context?: StorefrontRecoveryContext): Promise<string | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query<StorefrontCustomerRow>(
      'SELECT id, first_name FROM pd_storefront_customer WHERE store_id = $1 AND email = $2 AND is_active = true',
      [storeId, normalizedEmail],
    );
    const customer = rows[0];
    if (!customer) {
      this.recordRecoveryAudit({
        action: 'storefront.auth.password_reset_requested',
        storeId,
        email: normalizedEmail,
        success: true,
        context,
      });
      return undefined; // Silent failure to prevent email enumeration
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO pd_storefront_customer_token (id, customer_id, store_id, token_hash, type, expires_at)
       VALUES ($1, $2, $3, $4, 'password_reset', $5)`,
      [pdId('sfctok'), customer.id, storeId, tokenHash, expiresAt],
    );

    const links = await this.getStorefrontLinks(storeId);

    emailQueue.add('password_reset', {
      to: normalizedEmail,
      template: 'password_reset',
      variables: {
        name: customer.first_name || 'Client',
        store_url: links.store_url,
        reset_url: links.reset_url(rawResetToken),
        store_id: storeId,
        reset_token: rawResetToken,
      },
      scope: 'store',
      store_id: storeId,
    }).catch((err) => logger.warn({ err, store_id: storeId }, 'Password reset email enqueue failed'));

    this.recordRecoveryAudit({
      action: 'storefront.auth.password_reset_requested',
      storeId,
      customerId: customer.id,
      email: normalizedEmail,
      success: true,
      context,
    });

    return rawResetToken;
  }

  async resetPassword(storeId: string, rawToken: string, newPassword: string, context?: StorefrontRecoveryContext): Promise<void> {
    if (newPassword.length < 8) {
      throw new PdValidationError('Password must be at least 8 characters', { field: 'password' });
    }

    const tokenHash = hashToken(rawToken);
    const { rows: tokenRows } = await query<{ id: string; customer_id: string }>(
      `SELECT id, customer_id FROM pd_storefront_customer_token
       WHERE token_hash = $1 AND store_id = $2 AND type = 'password_reset' AND expires_at > NOW()`,
      [tokenHash, storeId],
    );
    const token = tokenRows[0];
    if (!token) {
      this.recordRecoveryAudit({
        action: 'storefront.auth.password_reset_failed',
        storeId,
        success: false,
        context,
      });
      throw new PdValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);

    await transaction(async (client) => {
      await client.query('UPDATE pd_storefront_customer SET password_hash = $1 WHERE id = $2', [passwordHash, token.customer_id]);
      await client.query('DELETE FROM pd_storefront_customer_token WHERE id = $1', [token.id]);
      // Revoke all existing sessions
      await client.query('UPDATE pd_storefront_customer_session SET is_revoked = true WHERE customer_id = $1', [token.customer_id]);
    });
    this.recordRecoveryAudit({
      action: 'storefront.auth.password_reset_completed',
      storeId,
      customerId: token.customer_id,
      success: true,
      context,
    });
  }

  async resendVerification(storeId: string, email: string, context?: StorefrontRecoveryContext): Promise<string | undefined> {
    const normalizedStoreId = storeId.trim();
    await this.assertPublicStore(normalizedStoreId);
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query<Pick<StorefrontCustomerRow, 'id' | 'first_name' | 'email_verified'>>(
      `SELECT id, first_name, email_verified
       FROM pd_storefront_customer
       WHERE store_id = $1 AND email = $2 AND is_active = true`,
      [normalizedStoreId, normalizedEmail],
    );
    const customer = rows[0];
    if (!customer || customer.email_verified) {
      this.recordRecoveryAudit({
        action: 'storefront.auth.email_verification_resent',
        storeId: normalizedStoreId,
        email: normalizedEmail,
        success: true,
        context,
      });
      return undefined;
    }

    await query(
      `DELETE FROM pd_storefront_customer_token
       WHERE customer_id = $1 AND store_id = $2 AND type = 'email_verify'`,
      [customer.id, normalizedStoreId],
    );
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    await query(
      `INSERT INTO pd_storefront_customer_token (id, customer_id, store_id, token_hash, type, expires_at)
       VALUES ($1, $2, $3, $4, 'email_verify', $5)`,
      [
        pdId('sfctok'),
        customer.id,
        normalizedStoreId,
        hashToken(rawVerifyToken),
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ],
    );
    const links = await this.getStorefrontLinks(normalizedStoreId);
    emailQueue.add('email_verification', {
      to: normalizedEmail,
      template: 'email_verification',
      variables: {
        name: customer.first_name || 'Client',
        store_url: links.store_url,
        verify_url: links.verify_url(rawVerifyToken),
        store_id: normalizedStoreId,
      },
      scope: 'store',
      store_id: normalizedStoreId,
    }).catch((err) => logger.warn({ err, store_id: normalizedStoreId }, 'Verification email enqueue failed'));
    this.recordRecoveryAudit({
      action: 'storefront.auth.email_verification_resent',
      storeId: normalizedStoreId,
      customerId: customer.id,
      email: normalizedEmail,
      success: true,
      context,
    });
    return rawVerifyToken;
  }

  async listSessions(customerId: string, storeId: string): Promise<StorefrontSessionRow[]> {
    const { rows } = await query<StorefrontSessionRow>(
      `SELECT id, customer_id, store_id, user_agent, ip_address, is_revoked, expires_at, created_at
       FROM pd_storefront_customer_session
       WHERE customer_id = $1 AND store_id = $2 AND is_revoked = false AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [customerId, storeId],
    );
    return rows;
  }

  async revokeSession(customerId: string, storeId: string, sessionId: string): Promise<void> {
    const { rowCount } = await query(
      `UPDATE pd_storefront_customer_session
       SET is_revoked = true, updated_at = NOW()
       WHERE id = $1 AND customer_id = $2 AND store_id = $3`,
      [sessionId, customerId, storeId],
    );
    if (!rowCount) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Session not found');
    }
  }

  async updateProfile(
    customerId: string,
    storeId: string,
    input: { first_name?: string; last_name?: string; phone?: string },
  ): Promise<PublicStorefrontCustomer> {
    const { rows } = await query<StorefrontCustomerRow>(
      `UPDATE pd_storefront_customer
       SET first_name = COALESCE($3, first_name),
           last_name = COALESCE($4, last_name),
           phone = COALESCE($5, phone),
           updated_at = NOW()
       WHERE id = $1 AND store_id = $2 AND is_active = true
       RETURNING *`,
      [customerId, storeId, input.first_name?.trim() || null, input.last_name?.trim() || null, input.phone?.trim() || null],
    );

    if (!rows[0]) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Customer profile not found');
    }

    return toPublicCustomer(rows[0]);
  }

  async changePassword(customerId: string, storeId: string, oldPassword: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new PdValidationError('New password must be at least 8 characters', { field: 'newPassword' });
    }

    const { rows } = await query<StorefrontCustomerRow>(
      'SELECT password_hash FROM pd_storefront_customer WHERE id = $1 AND store_id = $2 AND is_active = true',
      [customerId, storeId],
    );
    const customer = rows[0];
    if (!customer) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Customer not found');
    }

    const ok = await bcrypt.compare(oldPassword, customer.password_hash);
    if (!ok) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_INVALID_CREDENTIALS, 'Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await query('UPDATE pd_storefront_customer SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, customerId]);
  }

  async getById(id: string, storeId: string): Promise<PublicStorefrontCustomer> {
    const { rows } = await query<StorefrontCustomerRow>(
      'SELECT * FROM pd_storefront_customer WHERE id = $1 AND store_id = $2',
      [id, storeId],
    );
    const customer = rows[0];
    if (!customer || !customer.is_active) {
      throw new PdAuthenticationError(PdErrorCode.AUTH_TOKEN_INVALID, 'Authentication required');
    }
    return toPublicCustomer(customer);
  }

  issueAccessToken(customer: PublicStorefrontCustomer): string {
    return signAccessToken({
      sub: customer.id,
      role: UserRole.Customer,
      store_id: customer.store_id,
    });
  }
}

export const storefrontAuthService = new StorefrontAuthService();
