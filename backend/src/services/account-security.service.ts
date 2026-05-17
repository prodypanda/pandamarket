import type { Request } from 'express';
import type { PoolClient } from 'pg';
import { query } from '../db/pool';
import { emailQueue } from '../queues/email-queue';
import { PdErrorCode, PdNotFoundError } from '../errors';
import { pdId } from '../utils/crypto';
import { logger } from '../utils/logger';
import type { UserRole } from '@pandamarket/types';

export interface AccountSecurityContext {
  ip?: string | null;
  user_agent?: string | null;
  device_label?: string | null;
  metadata?: Record<string, unknown>;
}

interface SessionUserInput {
  id: string;
  role?: UserRole | string | null;
  store_id?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface RecordEventInput extends AccountSecurityContext {
  user_id?: string | null;
  email?: string | null;
  role?: UserRole | string | null;
  store_id?: string | null;
  session_id?: string | null;
  event_type: string;
  success?: boolean;
  failure_reason?: string | null;
}

interface UserSessionRow {
  id: string;
  user_id: string;
  role: string | null;
  store_id: string | null;
  refresh_token_id: string | null;
  ip: string | null;
  user_agent: string | null;
  device_label: string | null;
  last_event_type: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
  created_at: Date;
  last_seen_at: Date;
}

interface LoginEventRow {
  id: string;
  user_id: string | null;
  email: string | null;
  role: string | null;
  store_id: string | null;
  session_id: string | null;
  event_type: string;
  success: boolean;
  failure_reason: string | null;
  ip: string | null;
  user_agent: string | null;
  device_label: string | null;
  created_at: Date;
}

interface AdminSecurityUserRow {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  store_id: string | null;
  email_verified: boolean | null;
  is_active: boolean | null;
  two_factor_enabled: boolean | null;
  last_login_at: Date | null;
  created_at: Date | null;
}

interface SecurityAnomalyFlag {
  code: string;
  severity: 'low' | 'medium' | 'high';
  label: string;
  description: string;
  count?: number;
}

function clampText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function clientIp(req: Request): string | null {
  const forwarded = clampText(req.headers['x-forwarded-for'], 500);
  if (forwarded) return forwarded.split(',')[0].trim();
  return clampText(req.headers['cf-connecting-ip'], 80)
    || clampText(req.headers['x-real-ip'], 80)
    || clampText(req.ip, 80);
}

function deviceLabel(userAgent?: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('edg/') ? 'Edge'
    : ua.includes('chrome/') ? 'Chrome'
      : ua.includes('firefox/') ? 'Firefox'
        : ua.includes('safari/') ? 'Safari'
          : 'Browser';
  const os = ua.includes('windows') ? 'Windows'
    : ua.includes('android') ? 'Android'
      : ua.includes('iphone') || ua.includes('ipad') ? 'iOS'
        : ua.includes('mac os') ? 'macOS'
          : ua.includes('linux') ? 'Linux'
            : 'Unknown OS';
  const formFactor = ua.includes('mobile') || ua.includes('iphone') || ua.includes('android') ? 'Mobile' : 'Desktop';
  return `${browser} on ${os} (${formFactor})`;
}

function toIso<T extends { created_at?: Date; last_seen_at?: Date; expires_at?: Date; revoked_at?: Date | null }>(row: T) {
  return {
    ...row,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    last_seen_at: row.last_seen_at?.toISOString?.() ?? row.last_seen_at,
    expires_at: row.expires_at?.toISOString?.() ?? row.expires_at,
    revoked_at: row.revoked_at?.toISOString?.() ?? row.revoked_at,
  };
}

function eventToIso(row: LoginEventRow) {
  return {
    ...row,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

function userToIso(row: AdminSecurityUserRow) {
  return {
    ...row,
    last_login_at: row.last_login_at?.toISOString?.() ?? row.last_login_at,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export class AccountSecurityService {
  fromRequest(req: Request, metadata: Record<string, unknown> = {}): AccountSecurityContext {
    const userAgent = clampText(req.headers['user-agent'], 2000);
    return {
      ip: clientIp(req),
      user_agent: userAgent,
      device_label: deviceLabel(userAgent),
      metadata: {
        request_id: req.requestId,
        method: req.method,
        path: req.originalUrl,
        ...metadata,
      },
    };
  }

  async createSession(input: {
    session_id: string;
    user: SessionUserInput;
    refresh_token_id?: string | null;
    expires_at: Date;
    context?: AccountSecurityContext;
  }): Promise<void> {
    const context = input.context || {};
    const shouldAlertNewLogin = await this.shouldAlertNewDeviceLogin(input.user.id, context);
    await query(
      `INSERT INTO pd_user_session (
        id, user_id, role, store_id, refresh_token_id, ip, user_agent, device_label,
        metadata, last_event_type, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        input.session_id,
        input.user.id,
        input.user.role ?? null,
        input.user.store_id ?? null,
        input.refresh_token_id ?? null,
        clampText(context.ip, 80),
        clampText(context.user_agent, 2000),
        clampText(context.device_label, 255),
        JSON.stringify(context.metadata || {}),
        'login_success',
        input.expires_at,
      ],
    );
    if (shouldAlertNewLogin) {
      this.enqueueNewDeviceLoginAlert(input.user, context);
    }
  }

  private async shouldAlertNewDeviceLogin(userId: string, context: AccountSecurityContext): Promise<boolean> {
    const authFlow = typeof context.metadata?.auth_flow === 'string' ? context.metadata.auth_flow : '';
    if (!['password', '2fa'].includes(authFlow)) return false;
    const ip = clampText(context.ip, 80);
    const device = clampText(context.device_label, 255);
    if (!ip && !device) return false;

    const { rows } = await query<{ total_count: number; matching_count: number }>(
      `SELECT COUNT(*)::int AS total_count,
              (COUNT(*) FILTER (
                WHERE ip IS NOT DISTINCT FROM $2::varchar
                  AND device_label IS NOT DISTINCT FROM $3::varchar
              ))::int AS matching_count
       FROM pd_user_session
       WHERE user_id = $1`,
      [userId, ip, device],
    );
    const row = rows[0];
    return Boolean(row && row.total_count > 0 && row.matching_count === 0);
  }

  private enqueueNewDeviceLoginAlert(user: SessionUserInput, context: AccountSecurityContext): void {
    const email = clampText(user.email?.toLowerCase(), 255);
    if (!email) return;
    const name = clampText(user.first_name, 100) || email.split('@')[0] || 'PandaMarket';
    emailQueue.add('new_device_login', {
      to: email,
      template: 'new_device_login',
      variables: {
        name,
        device_label: context.device_label || 'Appareil inconnu',
        ip: context.ip || 'N/A',
        login_time: new Date().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }),
        manage_url: '/hub/profile',
      },
      scope: 'marketplace',
    }).catch((err) => logger.warn({ err, user_id: user.id }, 'New device login email enqueue failed'));
  }

  async touchSession(
    sessionId: string | null | undefined,
    context: AccountSecurityContext | undefined,
    eventType: string,
    refreshTokenId?: string | null,
    client?: PoolClient,
  ): Promise<void> {
    if (!sessionId) return;
    const fields = [
      'last_seen_at = NOW()',
      'last_event_type = $2',
      'ip = COALESCE($3, ip)',
      'user_agent = COALESCE($4, user_agent)',
      'device_label = COALESCE($5, device_label)',
    ];
    const params: unknown[] = [
      sessionId,
      eventType,
      clampText(context?.ip, 80),
      clampText(context?.user_agent, 2000),
      clampText(context?.device_label, 255),
    ];
    if (refreshTokenId !== undefined) {
      params.push(refreshTokenId);
      fields.push(`refresh_token_id = $${params.length}`);
    }
    const sql = `UPDATE pd_user_session SET ${fields.join(', ')} WHERE id = $1 AND revoked_at IS NULL`;
    if (client) {
      await client.query(sql, params);
    } else {
      await query(sql, params);
    }
  }

  async revokeUserSessions(userId: string, reason = 'logout'): Promise<void> {
    await query(
      `UPDATE pd_user_session
       SET revoked_at = COALESCE(revoked_at, NOW()), revoked_reason = COALESCE(revoked_reason, $2), last_event_type = $2
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, reason],
    );
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE pd_user_session
       SET revoked_at = NOW(), revoked_reason = 'user_revoked', last_event_type = 'session_revoked'
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [sessionId, userId],
    );
    if (!rowCount) return false;
    await query(
      `UPDATE pd_refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE user_id = $1 AND session_id = $2 AND revoked_at IS NULL`,
      [userId, sessionId],
    );
    await this.recordEvent({ user_id: userId, session_id: sessionId, event_type: 'session_revoked', success: true });
    return true;
  }

  async revokeOtherSessions(userId: string, keepSessionId?: string | null): Promise<number> {
    const { rowCount } = await query(
      `UPDATE pd_user_session
       SET revoked_at = NOW(), revoked_reason = 'user_revoked_others', last_event_type = 'other_sessions_revoked'
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND ($2::varchar IS NULL OR id <> $2::varchar)`,
      [userId, keepSessionId ?? null],
    );
    await query(
      `UPDATE pd_refresh_tokens
       SET revoked_at = COALESCE(revoked_at, NOW())
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND ($2::varchar IS NULL OR session_id IS NULL OR session_id <> $2::varchar)`,
      [userId, keepSessionId ?? null],
    );
    await this.recordEvent({ user_id: userId, session_id: keepSessionId ?? null, event_type: 'other_sessions_revoked', success: true });
    return rowCount || 0;
  }

  async recordEvent(input: RecordEventInput): Promise<void> {
    try {
      await query(
        `INSERT INTO pd_user_login_event (
          id, user_id, email, role, store_id, session_id, event_type, success,
          failure_reason, ip, user_agent, device_label, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
        [
          pdId('login_event'),
          input.user_id ?? null,
          clampText(input.email?.toLowerCase(), 255),
          input.role ?? null,
          input.store_id ?? null,
          input.session_id ?? null,
          input.event_type,
          input.success ?? false,
          clampText(input.failure_reason, 255),
          clampText(input.ip, 80),
          clampText(input.user_agent, 2000),
          clampText(input.device_label, 255),
          JSON.stringify(input.metadata || {}),
        ],
      );
    } catch (err) {
      logger.warn({ err, event_type: input.event_type, user_id: input.user_id }, 'Account security event recording failed');
    }
  }

  async recordLoginFailureByEmail(email: string, context: AccountSecurityContext, reason: string): Promise<void> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { rows } = await query<{ id: string; role: string | null; store_id: string | null }>(
        'SELECT id, role, store_id FROM pd_user WHERE email = $1',
        [normalizedEmail],
      );
      const user = rows[0];
      await this.recordEvent({
        ...context,
        user_id: user?.id ?? null,
        email: normalizedEmail,
        role: user?.role ?? null,
        store_id: user?.store_id ?? null,
        event_type: 'login_failed',
        success: false,
        failure_reason: reason,
      });
    } catch (err) {
      logger.warn({ err, email }, 'Login failure tracking failed');
    }
  }

  async listSecurityOverview(userId: string): Promise<{ sessions: Array<ReturnType<typeof toIso<UserSessionRow>>>; events: ReturnType<typeof eventToIso>[] }> {
    const [sessionsResult, eventsResult] = await Promise.all([
      query<UserSessionRow>(
        `SELECT id, user_id, role, store_id, refresh_token_id, ip, user_agent, device_label,
                last_event_type, expires_at, revoked_at, revoked_reason, created_at, last_seen_at
         FROM pd_user_session
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND expires_at > NOW()
         ORDER BY last_seen_at DESC
         LIMIT 20`,
        [userId],
      ),
      query<LoginEventRow>(
        `SELECT id, user_id, email, role, store_id, session_id, event_type, success,
                failure_reason, ip, user_agent, device_label, created_at
         FROM pd_user_login_event
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 30`,
        [userId],
      ),
    ]);

    return {
      sessions: sessionsResult.rows.map(toIso),
      events: eventsResult.rows.map(eventToIso),
    };
  }

  async listAdminUserSecurityActivity(userId: string): Promise<{
    user: ReturnType<typeof userToIso>;
    sessions: Array<ReturnType<typeof toIso<UserSessionRow>>>;
    events: ReturnType<typeof eventToIso>[];
    summary: {
      active_sessions: number;
      revoked_sessions_7d: number;
      failed_logins_24h: number;
      distinct_success_ips_7d: number;
      two_factor_disabled_30d: number;
      password_resets_7d: number;
    };
    anomaly_flags: SecurityAnomalyFlag[];
  }> {
    const userResult = await query<AdminSecurityUserRow>(
      `SELECT id, email, first_name, last_name, role, store_id, email_verified, is_active,
              two_factor_enabled, last_login_at, created_at
       FROM pd_user
       WHERE id = $1`,
      [userId],
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'User not found');
    }

    const [sessionsResult, eventsResult, statsResult] = await Promise.all([
      query<UserSessionRow>(
        `SELECT id, user_id, role, store_id, refresh_token_id, ip, user_agent, device_label,
                last_event_type, expires_at, revoked_at, revoked_reason, created_at, last_seen_at
         FROM pd_user_session
         WHERE user_id = $1
         ORDER BY COALESCE(last_seen_at, created_at) DESC
         LIMIT 30`,
        [userId],
      ),
      query<LoginEventRow>(
        `SELECT id, user_id, email, role, store_id, session_id, event_type, success,
                failure_reason, ip, user_agent, device_label, created_at
         FROM pd_user_login_event
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 60`,
        [userId],
      ),
      query<{
        active_sessions: number;
        revoked_sessions_7d: number;
        failed_logins_24h: number;
        distinct_success_ips_7d: number;
        two_factor_disabled_30d: number;
        password_resets_7d: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::int FROM pd_user_session WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()) AS active_sessions,
           (SELECT COUNT(*)::int FROM pd_user_session WHERE user_id = $1 AND revoked_at >= NOW() - INTERVAL '7 days') AS revoked_sessions_7d,
           COUNT(*) FILTER (WHERE event_type = 'login_failed' AND created_at >= NOW() - INTERVAL '24 hours')::int AS failed_logins_24h,
           COUNT(DISTINCT ip) FILTER (WHERE success = true AND ip IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days')::int AS distinct_success_ips_7d,
           COUNT(*) FILTER (WHERE event_type = '2fa_disabled' AND created_at >= NOW() - INTERVAL '30 days')::int AS two_factor_disabled_30d,
           COUNT(*) FILTER (WHERE event_type = 'password_reset' AND created_at >= NOW() - INTERVAL '7 days')::int AS password_resets_7d
         FROM pd_user_login_event
         WHERE user_id = $1`,
        [userId],
      ),
    ]);

    const summary = statsResult.rows[0] || {
      active_sessions: 0,
      revoked_sessions_7d: 0,
      failed_logins_24h: 0,
      distinct_success_ips_7d: 0,
      two_factor_disabled_30d: 0,
      password_resets_7d: 0,
    };
    const anomalyFlags: SecurityAnomalyFlag[] = [];
    if (summary.failed_logins_24h >= 3) {
      anomalyFlags.push({
        code: 'failed_login_spike',
        severity: summary.failed_logins_24h >= 5 ? 'high' : 'medium',
        label: 'Failed login spike',
        description: 'Multiple failed login attempts were recorded in the last 24 hours.',
        count: summary.failed_logins_24h,
      });
    }
    if (summary.distinct_success_ips_7d >= 3) {
      anomalyFlags.push({
        code: 'many_recent_ips',
        severity: 'medium',
        label: 'Many recent IPs',
        description: 'Successful account activity came from several distinct IP addresses in the last 7 days.',
        count: summary.distinct_success_ips_7d,
      });
    }
    if (summary.revoked_sessions_7d >= 2) {
      anomalyFlags.push({
        code: 'recent_session_revocations',
        severity: 'low',
        label: 'Recent session revocations',
        description: 'Several account sessions were revoked recently.',
        count: summary.revoked_sessions_7d,
      });
    }
    if (summary.two_factor_disabled_30d > 0) {
      anomalyFlags.push({
        code: 'two_factor_recently_disabled',
        severity: 'medium',
        label: '2FA recently disabled',
        description: 'Two-factor authentication was disabled for this account in the last 30 days.',
        count: summary.two_factor_disabled_30d,
      });
    }
    if (summary.password_resets_7d > 0) {
      anomalyFlags.push({
        code: 'recent_password_reset',
        severity: 'low',
        label: 'Recent password reset',
        description: 'The account password was reset during the last 7 days.',
        count: summary.password_resets_7d,
      });
    }
    if (user.is_active === false && summary.active_sessions > 0) {
      anomalyFlags.push({
        code: 'suspended_account_active_sessions',
        severity: 'high',
        label: 'Suspended account has active sessions',
        description: 'This inactive account still has non-expired sessions.',
        count: summary.active_sessions,
      });
    }
    if (['vendor', 'admin', 'super_admin'].includes(String(user.role || '').toLowerCase()) && !user.two_factor_enabled) {
      anomalyFlags.push({
        code: 'privileged_account_without_2fa',
        severity: 'medium',
        label: 'Privileged account without 2FA',
        description: 'This account has elevated access but does not currently have two-factor authentication enabled.',
      });
    }

    return {
      user: userToIso(user),
      sessions: sessionsResult.rows.map(toIso),
      events: eventsResult.rows.map(eventToIso),
      summary,
      anomaly_flags: anomalyFlags,
    };
  }
}

export const accountSecurityService = new AccountSecurityService();
