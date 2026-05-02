/**
 * AuthService — registration, login, refresh, password handling.
 */

import bcrypt from 'bcryptjs';
import { query, transaction } from '../db/pool';
import {
  PdAuthenticationError,
  PdConflictError,
  PdErrorCode,
  PdValidationError,
} from '../errors';
import { config } from '../config';
import { pdId, sha256 } from '../utils/crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { logger } from '../utils/logger';
import { UserRole } from '@pandamarket/types';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  store_id: string | null;
  email_verified: boolean;
  is_active: boolean;
  phone: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export class AuthService {
  /**
   * Register a new user (customer or vendor).
   * If vendor, the StoreService will create the store separately.
   */
  async register(opts: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role?: UserRole;
    phone?: string;
  }): Promise<UserRow> {
    const email = opts.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new PdValidationError('Invalid email format', { field: 'email' });
    }
    if (opts.password.length < 8) {
      throw new PdValidationError('Password must be at least 8 characters', {
        field: 'password',
        min_length: 8,
      });
    }

    const exists = await query('SELECT id FROM pd_user WHERE email = $1', [email]);
    if (exists.rowCount && exists.rowCount > 0) {
      throw new PdConflictError(
        PdErrorCode.AUTH_EMAIL_EXISTS,
        'An account already exists with this email',
        { email },
      );
    }

    const passwordHash = await bcrypt.hash(opts.password, config.bcryptRounds);
    const id = pdId('user');
    const role = opts.role ?? UserRole.Customer;

    const { rows } = await query<UserRow>(
      `INSERT INTO pd_user
        (id, email, password_hash, first_name, last_name, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, password_hash, first_name, last_name, role, store_id, email_verified, is_active, phone`,
      [id, email, passwordHash, opts.first_name, opts.last_name, role, opts.phone ?? null],
    );

    logger.info({ user_id: id, role }, 'User registered');
    return rows[0];
  }

  /**
   * Verify email + password and return user (no tokens here).
   */
  async login(email: string, password: string): Promise<UserRow> {
    const { rows } = await query<UserRow>(
      `SELECT id, email, password_hash, first_name, last_name, role, store_id, email_verified, is_active, phone
       FROM pd_user
       WHERE email = $1`,
      [email.trim().toLowerCase()],
    );
    const user = rows[0];
    if (!user) {
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }
    if (!user.is_active) {
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_ACCOUNT_SUSPENDED,
        'Your account has been suspended',
      );
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }
    await query('UPDATE pd_user SET last_login_at = NOW() WHERE id = $1', [user.id]);
    return user;
  }

  /**
   * Issue access + refresh tokens for a user.
   */
  async issueTokens(user: UserRow): Promise<AuthTokens> {
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      store_id: user.store_id,
    });
    const refreshToken = signRefreshToken(user.id);
    await this.storeRefreshToken(user.id, refreshToken);
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  /**
   * Validate a refresh token and rotate it (return new pair).
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = sha256(refreshToken);

    return transaction(async (client) => {
      const { rows: tokenRows } = await client.query(
        `SELECT id, expires_at, revoked_at
         FROM pd_refresh_tokens
         WHERE token_hash = $1 AND user_id = $2`,
        [tokenHash, payload.sub],
      );
      const tokenRow = tokenRows[0] as
        | { id: string; expires_at: Date; revoked_at: Date | null }
        | undefined;
      if (!tokenRow || tokenRow.revoked_at) {
        throw new PdAuthenticationError(
          PdErrorCode.AUTH_REFRESH_EXPIRED,
          'Refresh token revoked',
        );
      }
      if (tokenRow.expires_at.getTime() < Date.now()) {
        throw new PdAuthenticationError(
          PdErrorCode.AUTH_REFRESH_EXPIRED,
          'Refresh token expired',
        );
      }
      // Rotate: revoke old, issue new pair
      await client.query(
        'UPDATE pd_refresh_tokens SET revoked_at = NOW() WHERE id = $1',
        [tokenRow.id],
      );
      const { rows: userRows } = await client.query<UserRow>(
        'SELECT id, email, password_hash, first_name, last_name, role, store_id, email_verified, is_active, phone FROM pd_user WHERE id = $1',
        [payload.sub],
      );
      const user = userRows[0];
      if (!user || !user.is_active) {
        throw new PdAuthenticationError();
      }
      const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        store_id: user.store_id,
      });
      const newRefresh = signRefreshToken(user.id);
      await this.storeRefreshToken(user.id, newRefresh, client);
      return { access_token: accessToken, refresh_token: newRefresh };
    });
  }

  /**
   * Revoke all refresh tokens of a user (logout from all devices).
   */
  async logout(userId: string): Promise<void> {
    await query(
      'UPDATE pd_refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
  }

  // ----------------------------------------------------------------
  // internals
  // ----------------------------------------------------------------

  private async storeRefreshToken(
    userId: string,
    token: string,
    client?: import('pg').PoolClient,
  ): Promise<void> {
    const id = pdId('rtok');
    const tokenHash = sha256(token);
    // 7d default; we trust the JWT exp
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sql = `INSERT INTO pd_refresh_tokens (id, user_id, token_hash, expires_at)
                 VALUES ($1, $2, $3, $4)`;
    const params = [id, userId, tokenHash, expiresAt];
    if (client) {
      await client.query(sql, params);
    } else {
      await query(sql, params);
    }
  }
}

export const authService = new AuthService();
