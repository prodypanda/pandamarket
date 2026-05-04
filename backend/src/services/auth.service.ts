/**
 * AuthService — registration, login, refresh, password handling.
 */

import bcrypt from 'bcryptjs';
import { query, transaction } from '../db/pool';
import { getRedis } from '../db/redis';
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
import { emailQueue } from '../queues/email-queue';
import { logger } from '../utils/logger';
import { UserRole } from '@pandamarket/types';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

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
   * Includes brute-force protection: locks account after MAX_LOGIN_ATTEMPTS
   * failed attempts for LOCKOUT_DURATION_SECONDS.
   */
  async login(email: string, password: string): Promise<UserRow> {
    const normalizedEmail = email.trim().toLowerCase();
    const lockoutKey = `pd:login_attempts:${normalizedEmail}`;

    // Check if account is locked out
    const redis = getRedis();
    const attempts = await redis.get(lockoutKey);
    if (attempts && parseInt(attempts, 10) >= MAX_LOGIN_ATTEMPTS) {
      const ttl = await redis.ttl(lockoutKey);
      logger.warn({ email: normalizedEmail, attempts }, 'Login attempt on locked account');
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_ACCOUNT_SUSPENDED,
        `Too many failed login attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      );
    }

    const { rows } = await query<UserRow>(
      `SELECT id, email, password_hash, first_name, last_name, role, store_id, email_verified, is_active, phone
       FROM pd_user
       WHERE email = $1`,
      [normalizedEmail],
    );
    const user = rows[0];
    if (!user) {
      // Increment failed attempts even for non-existent users (prevent enumeration)
      await this.incrementLoginAttempts(lockoutKey);
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
      await this.incrementLoginAttempts(lockoutKey);
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
      );
    }

    // Successful login — clear failed attempts
    await redis.del(lockoutKey);
    await query('UPDATE pd_user SET last_login_at = NOW() WHERE id = $1', [user.id]);
    return user;
  }

  private async incrementLoginAttempts(key: string): Promise<void> {
    try {
      const redis = getRedis();
      const current = await redis.incr(key);
      if (current === 1) {
        // First failed attempt — set expiry
        await redis.expire(key, LOCKOUT_DURATION_SECONDS);
      }
    } catch (err) {
      // Don't block login if Redis is down
      logger.warn({ err }, 'Failed to track login attempt in Redis');
    }
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

  /**
   * Generate a password reset token and store its hash in Redis.
   * In production, this would also queue an email via the email worker.
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM pd_user WHERE email = $1 AND is_active = true',
      [normalizedEmail],
    );
    // Always return success to prevent email enumeration
    if (!rows[0]) {
      logger.info({ email: normalizedEmail }, 'Forgot password for non-existent email');
      return;
    }
    const userId = rows[0].id;
    const { randomBytes } = await import('node:crypto');
    const token = randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const redis = getRedis();
    // Store token hash → userId mapping with 1-hour expiry
    await redis.set(`pd:reset_token:${tokenHash}`, userId, 'EX', 3600);

    // Build the reset link and queue the email
    const hubDomain = config.hubDomain.startsWith('http')
      ? config.hubDomain
      : `https://${config.hubDomain}`;
    const resetUrl = `${hubDomain}/reset-password?token=${token}`;

    await emailQueue.add('password_reset', {
      to: normalizedEmail,
      template: 'password_reset',
      variables: { reset_url: resetUrl },
    });

    logger.info({ user_id: userId }, 'Password reset email queued');
  }

  /**
   * Validate a reset token and update the user's password.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new PdValidationError('Password must be at least 8 characters', {
        field: 'password',
        min_length: 8,
      });
    }
    const tokenHash = sha256(token);
    const redis = getRedis();
    const userId = await redis.get(`pd:reset_token:${tokenHash}`);
    if (!userId) {
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_TOKEN_INVALID,
        'Invalid or expired reset token',
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await query('UPDATE pd_user SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    // Invalidate the token
    await redis.del(`pd:reset_token:${tokenHash}`);
    // Revoke all refresh tokens (force re-login)
    await this.logout(userId);
    logger.info({ user_id: userId }, 'Password reset successfully');
  }

  /**
   * Send a verification email. Stores a verification token in Redis.
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const { rows } = await query<{ email: string; email_verified: boolean }>(
      'SELECT email, email_verified FROM pd_user WHERE id = $1',
      [userId],
    );
    if (!rows[0]) return;
    if (rows[0].email_verified) return;

    const { randomBytes } = await import('node:crypto');
    const token = randomBytes(32).toString('hex');
    const tokenHash = sha256(token);
    const redis = getRedis();
    await redis.set(`pd:verify_email:${tokenHash}`, userId, 'EX', 86400); // 24 hours

    // Build the verification link and queue the email
    const hubDomain = config.hubDomain.startsWith('http')
      ? config.hubDomain
      : `https://${config.hubDomain}`;
    const verifyUrl = `${hubDomain}/api/pd/auth/verify-email?token=${token}`;

    await emailQueue.add('email_verification', {
      to: rows[0].email,
      template: 'email_verification',
      variables: { verify_url: verifyUrl },
    });

    logger.info({ user_id: userId }, 'Email verification email queued');
  }

  /**
   * Verify email using the token.
   */
  async verifyEmail(token: string): Promise<void> {
    const tokenHash = sha256(token);
    const redis = getRedis();
    const userId = await redis.get(`pd:verify_email:${tokenHash}`);
    if (!userId) {
      throw new PdAuthenticationError(
        PdErrorCode.AUTH_TOKEN_INVALID,
        'Invalid or expired verification token',
      );
    }
    await query('UPDATE pd_user SET email_verified = true WHERE id = $1', [userId]);
    await redis.del(`pd:verify_email:${tokenHash}`);
    logger.info({ user_id: userId }, 'Email verified');
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
