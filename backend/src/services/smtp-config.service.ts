/**
 * SMTP Configuration Service.
 *
 * Manages SMTP provider settings stored in `pd_platform_config` (key-value table).
 * SMTP password is encrypted at rest using AES-256-GCM via `utils/crypto.ts`.
 *
 * The Super Admin can configure the SMTP provider from the admin dashboard,
 * test the connection, and the email worker dynamically reads the latest config.
 */

import { query } from '../db/pool';
import { encrypt, decrypt } from '../utils/crypto';
import { logger } from '../utils/logger';
import { PdValidationError, PdInternalError } from '../errors';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string; // decrypted for internal use, never returned to client
  smtp_secure: boolean; // true = TLS on connect (port 465), false = STARTTLS (port 587)
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

export interface SmtpConfigPublic {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass_set: boolean; // indicates whether a password is configured (never expose actual value)
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

const SMTP_KEYS = [
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_pass',
  'smtp_secure',
  'smtp_from_name',
  'smtp_from_email',
  'smtp_enabled',
] as const;

const SMTP_PASS_KEY = 'smtp_pass';

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

class SmtpConfigService {
  /**
   * Retrieve the current SMTP configuration from the database.
   * Returns null if no SMTP config has been set.
   * The password is decrypted for internal use only.
   */
  async getConfig(): Promise<SmtpConfig | null> {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM pd_platform_config WHERE key = ANY($1)`,
      [SMTP_KEYS as unknown as string[]],
    );

    if (rows.length === 0) return null;

    const map = new Map(rows.map((r) => [r.key, r.value]));

    // If host is not set, consider config as not configured
    const host = map.get('smtp_host');
    if (!host) return null;

    let password = '';
    const encryptedPass = map.get(SMTP_PASS_KEY);
    if (encryptedPass) {
      try {
        password = decrypt(encryptedPass);
      } catch (err) {
        logger.error({ err }, 'Failed to decrypt SMTP password — config may be corrupted');
        password = '';
      }
    }

    return {
      smtp_host: host,
      smtp_port: parseInt(map.get('smtp_port') ?? '587', 10),
      smtp_user: map.get('smtp_user') ?? '',
      smtp_pass: password,
      smtp_secure: map.get('smtp_secure') === 'true',
      smtp_from_name: map.get('smtp_from_name') ?? 'PandaMarket',
      smtp_from_email: map.get('smtp_from_email') ?? 'noreply@pandamarket.tn',
      smtp_enabled: map.get('smtp_enabled') === 'true',
    };
  }

  /**
   * Retrieve the SMTP configuration for the admin UI.
   * Password is masked — only indicates whether it's set.
   */
  async getPublicConfig(): Promise<SmtpConfigPublic> {
    const config = await this.getConfig();

    if (!config) {
      return {
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass_set: false,
        smtp_secure: false,
        smtp_from_name: 'PandaMarket',
        smtp_from_email: 'noreply@pandamarket.tn',
        smtp_enabled: false,
      };
    }

    return {
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      smtp_pass_set: config.smtp_pass.length > 0,
      smtp_secure: config.smtp_secure,
      smtp_from_name: config.smtp_from_name,
      smtp_from_email: config.smtp_from_email,
      smtp_enabled: config.smtp_enabled,
    };
  }

  /**
   * Save SMTP configuration to the database.
   * Password is encrypted before storage.
   * If `smtp_pass` is empty string and a password already exists, keep the existing one.
   */
  async saveConfig(
    input: {
      smtp_host: string;
      smtp_port: number;
      smtp_user: string;
      smtp_pass?: string; // empty = keep existing
      smtp_secure: boolean;
      smtp_from_name: string;
      smtp_from_email: string;
      smtp_enabled: boolean;
    },
    adminId: string,
  ): Promise<void> {
    // Validate email format
    if (input.smtp_from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.smtp_from_email)) {
      throw new PdValidationError('Invalid sender email address');
    }

    // Validate port range
    if (input.smtp_port < 1 || input.smtp_port > 65535) {
      throw new PdValidationError('SMTP port must be between 1 and 65535');
    }

    const entries: Array<[string, string]> = [
      ['smtp_host', input.smtp_host],
      ['smtp_port', String(input.smtp_port)],
      ['smtp_user', input.smtp_user],
      ['smtp_secure', String(input.smtp_secure)],
      ['smtp_from_name', input.smtp_from_name],
      ['smtp_from_email', input.smtp_from_email],
      ['smtp_enabled', String(input.smtp_enabled)],
    ];

    // Handle password: only update if a new value is provided
    if (input.smtp_pass !== undefined && input.smtp_pass !== '') {
      const encryptedPass = encrypt(input.smtp_pass);
      entries.push([SMTP_PASS_KEY, encryptedPass]);
    }

    for (const [key, value] of entries) {
      await query(
        `INSERT INTO pd_platform_config (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
        [key, value, adminId],
      );
    }

    logger.info(
      { admin_id: adminId, keys: entries.map(([k]) => k).filter((k) => k !== SMTP_PASS_KEY) },
      'SMTP configuration updated',
    );
  }

  /**
   * Test the SMTP connection by sending a test email.
   * Uses the provided config (or saved config if not provided).
   * Returns { success: true } or throws with the error message.
   */
  async testConnection(
    overrides?: {
      smtp_host: string;
      smtp_port: number;
      smtp_user: string;
      smtp_pass?: string;
      smtp_secure: boolean;
      smtp_from_name: string;
      smtp_from_email: string;
    },
    recipientEmail?: string,
  ): Promise<{ success: boolean; message: string }> {
    let host: string;
    let port: number;
    let user: string;
    let pass: string;
    let secure: boolean;
    let fromName: string;
    let fromEmail: string;

    if (overrides) {
      host = overrides.smtp_host;
      port = overrides.smtp_port;
      user = overrides.smtp_user;
      secure = overrides.smtp_secure;
      fromName = overrides.smtp_from_name;
      fromEmail = overrides.smtp_from_email;

      // If password not provided in overrides, try to get from saved config
      if (!overrides.smtp_pass || overrides.smtp_pass === '') {
        const saved = await this.getConfig();
        pass = saved?.smtp_pass ?? '';
      } else {
        pass = overrides.smtp_pass;
      }
    } else {
      const saved = await this.getConfig();
      if (!saved || !saved.smtp_host) {
        throw new PdValidationError('No SMTP configuration found. Please configure SMTP settings first.');
      }
      host = saved.smtp_host;
      port = saved.smtp_port;
      user = saved.smtp_user;
      pass = saved.smtp_pass;
      secure = saved.smtp_secure;
      fromName = saved.smtp_from_name;
      fromEmail = saved.smtp_from_email;
    }

    if (!host) {
      throw new PdValidationError('SMTP host is required');
    }

    let nodemailer: typeof import('nodemailer');
    try {
      nodemailer = (await import('nodemailer')) as typeof import('nodemailer');
    } catch {
      throw new PdInternalError(
        'nodemailer is not installed. Run: npm install nodemailer @types/nodemailer',
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    try {
      // Step 1: Verify connection
      await transporter.verify();

      // Step 2: Send a test email if recipient provided
      if (recipientEmail) {
        await transporter.sendMail({
          from: `${fromName} <${fromEmail}>`,
          to: recipientEmail,
          subject: '✅ PandaMarket SMTP Test — Connection Successful',
          html: `
            <div style="font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
              <div style="background:#1A1A2E;padding:20px;border-radius:12px 12px 0 0;color:#fff;">
                <span style="font-size:20px;font-weight:700;">🐼 PandaMarket</span>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#16C784;margin-top:0;">SMTP Test Successful ✅</h2>
                <p style="color:#374151;">Your SMTP configuration is working correctly.</p>
                <table style="width:100%;font-size:14px;color:#6B7280;margin-top:16px;">
                  <tr><td style="padding:4px 0;"><strong>Host:</strong></td><td>${host}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Port:</strong></td><td>${port}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>Secure:</strong></td><td>${secure ? 'TLS' : 'STARTTLS'}</td></tr>
                  <tr><td style="padding:4px 0;"><strong>From:</strong></td><td>${fromName} &lt;${fromEmail}&gt;</td></tr>
                </table>
                <p style="color:#9CA3AF;font-size:12px;margin-top:16px;">
                  This is a test email sent from the PandaMarket admin panel.
                </p>
              </div>
            </div>
          `,
          text: `PandaMarket SMTP Test Successful. Host: ${host}, Port: ${port}, From: ${fromName} <${fromEmail}>`,
        });

        return {
          success: true,
          message: `Connection verified and test email sent to ${recipientEmail}`,
        };
      }

      return { success: true, message: 'SMTP connection verified successfully' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown SMTP error';
      logger.warn({ host, port, err: errorMessage }, 'SMTP test connection failed');
      return { success: false, message: `SMTP connection failed: ${errorMessage}` };
    } finally {
      transporter.close();
    }
  }
}

export const smtpConfigService = new SmtpConfigService();
