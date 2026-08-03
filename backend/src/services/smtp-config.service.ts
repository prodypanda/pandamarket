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
import * as dns from 'node:dns/promises';
import * as net from 'node:net';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type EmailTransportMode = 'smtp' | 'brevo_api';

export interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string; // decrypted for internal use, never returned to client
  smtp_secure: boolean; // true = TLS on connect (port 465), false = STARTTLS (port 587)
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
  email_transport: EmailTransportMode; // 'smtp' = classic SMTP, 'brevo_api' = Brevo HTTP API
  brevo_api_key: string; // decrypted for internal use, never returned to client
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
  email_transport: EmailTransportMode;
  brevo_api_key_set: boolean; // indicates whether a Brevo API key is configured
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
  'email_transport',
  'brevo_api_key',
] as const;

const SMTP_PASS_KEY = 'smtp_pass';
const BREVO_API_KEY_KEY = 'brevo_api_key';

const BREVO_API_BASE = 'https://api.brevo.com';

/**
 * Probe raw TCP reachability of the SMTP server from this host, trying each
 * resolved IPv4 address in turn. Returns null on success or a user-facing
 * error message on failure.
 *
 * This exists because mail providers (OVH in particular) frequently drop
 * traffic from cloud/datacenter IPs, which surfaces as an opaque nodemailer
 * "Connection timeout". A direct probe yields an accurate, actionable error.
 */
function probeTcp(host: string, addresses: string[], port: number): Promise<string | null> {
  return new Promise((resolve) => {
    const attempt = (ip: string, remaining: string[]) => {
      const socket = net.connect({ host: ip, port, family: 4, timeout: 8000 });
      const finish = (message: string | null) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(message);
      };
      socket.once('connect', () => finish(null));
      socket.once('timeout', () => {
        if (remaining.length > 0) {
          attempt(remaining[0], remaining.slice(1));
        } else {
          finish(
            `TCP connection to ${host}:${port} (${ip}) timed out. The mail server is unreachable from this server's network — many mail providers silently drop connections from cloud/datacenter IPs. Try another SMTP relay (e.g. Brevo, Mailgun, Postmark, or Gmail with an app password) or ask the provider to allowlist this server.`,
          );
        }
      });
      socket.once('error', (err: NodeJS.ErrnoException) => {
        if (remaining.length > 0) {
          attempt(remaining[0], remaining.slice(1));
          return;
        }
        finish(`TCP connection to ${host}:${port} (${ip}) failed: ${err.code || err.message}.`);
      });
    };
    attempt(addresses[0], addresses.slice(1));
  });
}

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

    const transportMode: EmailTransportMode =
      map.get('email_transport') === 'brevo_api' ? 'brevo_api' : 'smtp';

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

    let brevoApiKey = '';
    const encryptedBrevoKey = map.get(BREVO_API_KEY_KEY);
    if (encryptedBrevoKey) {
      try {
        brevoApiKey = decrypt(encryptedBrevoKey);
      } catch (err) {
        logger.error({ err }, 'Failed to decrypt Brevo API key — config may be corrupted');
        brevoApiKey = '';
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
      email_transport: transportMode,
      brevo_api_key: brevoApiKey,
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
        email_transport: 'smtp',
        brevo_api_key_set: false,
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
      email_transport: config.email_transport,
      brevo_api_key_set: config.brevo_api_key.length > 0,
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
      email_transport?: EmailTransportMode;
      brevo_api_key?: string; // empty = keep existing
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
      ['email_transport', input.email_transport === 'brevo_api' ? 'brevo_api' : 'smtp'],
    ];

    // Handle password: only update if a new value is provided
    if (input.smtp_pass !== undefined && input.smtp_pass !== '') {
      const encryptedPass = encrypt(input.smtp_pass);
      entries.push([SMTP_PASS_KEY, encryptedPass]);
    }

    // Handle Brevo API key: only update if a new value is provided
    if (input.brevo_api_key !== undefined && input.brevo_api_key !== '') {
      entries.push([BREVO_API_KEY_KEY, encrypt(input.brevo_api_key.trim())]);
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
      { admin_id: adminId, keys: entries.map(([k]) => k).filter((k) => k !== SMTP_PASS_KEY && k !== BREVO_API_KEY_KEY) },
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
      smtp_host?: string;
      smtp_port?: number;
      smtp_user?: string;
      smtp_pass?: string;
      smtp_secure?: boolean;
      smtp_from_name?: string;
      smtp_from_email?: string;
      email_transport?: EmailTransportMode;
      brevo_api_key?: string;
    },
    recipientEmail?: string,
  ): Promise<{ success: boolean; message: string }> {
    // Resolve transport mode: explicit override > saved config > SMTP.
    let mode: EmailTransportMode | undefined = overrides?.email_transport;
    if (!mode) {
      const savedForMode = await this.getConfig();
      mode = savedForMode?.email_transport ?? 'smtp';
    }
    if (mode === 'brevo_api') {
      return this.testBrevoApi(overrides, recipientEmail);
    }

    let host: string;
    let port: number;
    let user: string;
    let pass: string;
    let secure: boolean;
    let fromName: string;
    let fromEmail: string;

    if (overrides && overrides.smtp_host) {
      host = overrides.smtp_host;
      port = overrides.smtp_port ?? 587;
      user = overrides.smtp_user ?? '';
      secure = overrides.smtp_secure ?? false;
      fromName = overrides.smtp_from_name ?? 'PandaMarket';
      fromEmail = overrides.smtp_from_email ?? '';

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

    // Stage 1 — DNS resolution (IPv4 only: container IPv6 egress is often
    // unavailable and can hang connections when AAAA records exist).
    let addresses: string[];
    try {
      addresses = await dns.resolve4(host);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code || 'DNS_ERROR';
      logger.warn({ host, code }, 'SMTP test DNS resolution failed');
      return {
        success: false,
        message: `SMTP connection failed: DNS lookup for "${host}" returned no IPv4 records (${code}). Check the SMTP hostname.`,
      };
    }

    // Stage 2 — raw TCP reachability from this server.
    const tcpError = await probeTcp(host, addresses, port);
    if (tcpError) {
      logger.warn({ host, port, addresses }, 'SMTP test TCP probe failed');
      return { success: false, message: `SMTP connection failed: ${tcpError}` };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
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
      const e = err as Error & { code?: string };
      const errorMessage = e?.message || 'Unknown SMTP error';
      // TCP already succeeded at this point, so a timeout here means the SMTP
      // handshake stalled — almost always a TLS-mode/port mismatch.
      const hint = /timeout/i.test(errorMessage)
        ? ` TCP connected but the SMTP handshake stalled — check that "Secure/TLS" matches the port (465 = TLS on connect, 587 = STARTTLS).`
        : '';
      logger.warn({ host, port, code: e?.code, err: errorMessage }, 'SMTP test connection failed');
      return { success: false, message: `SMTP connection failed: ${errorMessage}.${hint}` };
    } finally {
      transporter.close();
    }
  }

  /**
   * Test the Brevo HTTP API transport (works where SMTP ports are blocked,
   * e.g. Render free instances block outbound 25/465/587).
   * Step 1: validate the API key against GET /v3/account.
   * Step 2: optionally send a test email via POST /v3/smtp/email.
   */
  private async testBrevoApi(
    overrides?: { brevo_api_key?: string; smtp_from_name?: string; smtp_from_email?: string },
    recipientEmail?: string,
  ): Promise<{ success: boolean; message: string }> {
    let apiKey = (overrides?.brevo_api_key || '').trim();
    if (!apiKey) {
      apiKey = (await this.getConfig())?.brevo_api_key ?? '';
    }
    if (!apiKey) {
      return { success: false, message: 'Brevo API key is required. Get one from Brevo → SMTP & API → API Keys.' };
    }

    // Step 1 — validate the API key
    try {
      const res = await fetch(`${BREVO_API_BASE}/v3/account`, {
        headers: { 'api-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        const detail = body?.message || `HTTP ${res.status}`;
        logger.warn({ status: res.status }, 'Brevo API key rejected');
        return { success: false, message: `Brevo rejected the API key: ${detail}` };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ err: msg }, 'Brevo API unreachable');
      return { success: false, message: `Could not reach the Brevo API: ${msg}` };
    }

    if (!recipientEmail) {
      return { success: true, message: 'Brevo API key verified successfully. Add a recipient email to test sending.' };
    }

    // Step 2 — send a real test email
    const saved = await this.getConfig();
    const fromName = overrides?.smtp_from_name || saved?.smtp_from_name || 'PandaMarket';
    const fromEmail = overrides?.smtp_from_email || saved?.smtp_from_email || '';
    if (!fromEmail) {
      return { success: false, message: 'A sender email address is required to send the test email.' };
    }

    try {
      const sendRes = await fetch(`${BREVO_API_BASE}/v3/smtp/email`, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: recipientEmail }],
          subject: '✅ PandaMarket Email Test — Connection Successful',
          htmlContent: `
            <div style="font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
              <div style="background:#1A1A2E;padding:20px;border-radius:12px 12px 0 0;color:#fff;">
                <span style="font-size:20px;font-weight:700;">🐼 PandaMarket</span>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <h2 style="color:#16C784;margin-top:0;">Email Test Successful ✅</h2>
                <p style="color:#374151;">Your Brevo API configuration is working correctly.</p>
                <table style="width:100%;font-size:14px;color:#6B7280;margin-top:16px;">
                  <tr><td style="padding:4px 0;"><strong>Transport:</strong></td><td>Brevo HTTP API</td></tr>
                  <tr><td style="padding:4px 0;"><strong>From:</strong></td><td>${fromName} &lt;${fromEmail}&gt;</td></tr>
                </table>
                <p style="color:#9CA3AF;font-size:12px;margin-top:16px;">This is a test email sent from the PandaMarket admin panel.</p>
              </div>
            </div>
          `,
          textContent: `PandaMarket Email Test Successful. Transport: Brevo HTTP API. From: ${fromName} <${fromEmail}>`,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!sendRes.ok) {
        const body = (await sendRes.json().catch(() => null)) as { message?: string } | null;
        const detail = body?.message || `HTTP ${sendRes.status}`;
        const senderHint = /sender|domain/i.test(detail)
          ? ' Verify the sender/domain in Brevo (Senders & Domains) before testing again.'
          : '';
        logger.warn({ status: sendRes.status, detail }, 'Brevo test email send failed');
        return {
          success: false,
          message: `Brevo API key is valid but sending failed: ${detail}.${senderHint}`,
        };
      }

      return {
        success: true,
        message: `Brevo API verified and test email sent to ${recipientEmail}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ err: msg }, 'Brevo test email send failed');
      return { success: false, message: `Brevo send failed: ${msg}` };
    }
  }
}

export const smtpConfigService = new SmtpConfigService();
