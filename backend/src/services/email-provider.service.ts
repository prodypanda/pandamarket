import { config } from '../config';
import { logger } from '../utils/logger';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  variables?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'brevo' | 'resend' | 'console';
  messageId?: string;
}

export class EmailProviderService {
  private brevoApiKey: string;
  private resendApiKey: string;
  private fromName: string;
  private fromEmail: string;

  constructor(opts?: {
    brevoApiKey?: string;
    resendApiKey?: string;
    fromName?: string;
    fromEmail?: string;
  }) {
    this.brevoApiKey = opts?.brevoApiKey ?? config.email?.brevoApiKey ?? process.env.PD_BREVO_API_KEY ?? '';
    this.resendApiKey = opts?.resendApiKey ?? config.email?.resendApiKey ?? process.env.PD_RESEND_API_KEY ?? '';
    this.fromName = opts?.fromName ?? config.email?.fromName ?? 'PandaMarket';
    this.fromEmail = opts?.fromEmail ?? config.email?.fromEmail ?? 'noreply@pandamarket.tn';
  }

  async send(payload: EmailPayload): Promise<SendEmailResult> {
    const errors: string[] = [];

    // 1. Primary: Brevo API v3
    if (this.brevoApiKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': this.brevoApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: this.fromName, email: this.fromEmail },
            to: [{ email: payload.to }],
            subject: payload.subject,
            htmlContent: payload.html,
            textContent: payload.text || payload.html.replace(/<[^>]+>/g, ' ').trim(),
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { messageId?: string };
          logger.info({ to: payload.to, messageId: data.messageId }, '[EmailProvider] Delivered via Brevo');
          return { success: true, provider: 'brevo', messageId: data.messageId };
        }

        const errBody = await res.text().catch(() => '');
        errors.push(`Brevo HTTP ${res.status}: ${errBody}`);
        logger.warn({ to: payload.to, status: res.status, err: errBody }, '[EmailProvider] Brevo failed, trying fallback');
      } catch (err: any) {
        errors.push(`Brevo network error: ${err.message}`);
        logger.warn({ to: payload.to, err: err.message }, '[EmailProvider] Brevo failed with network error, trying fallback');
      }
    }

    // 2. Fallback: Resend API
    if (this.resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${this.fromName} <${this.fromEmail}>`,
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
            text: payload.text || payload.html.replace(/<[^>]+>/g, ' ').trim(),
          }),
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          const data = (await res.json().catch(() => ({}))) as { id?: string };
          logger.info({ to: payload.to, messageId: data.id }, '[EmailProvider] Delivered via Resend fallback');
          return { success: true, provider: 'resend', messageId: data.id };
        }

        const errBody = await res.text().catch(() => '');
        errors.push(`Resend HTTP ${res.status}: ${errBody}`);
        logger.error({ to: payload.to, status: res.status, err: errBody }, '[EmailProvider] Resend fallback failed');
      } catch (err: any) {
        errors.push(`Resend network error: ${err.message}`);
        logger.error({ to: payload.to, err: err.message }, '[EmailProvider] Resend fallback failed with network error');
      }
    }

    // 3. Fallback in development: Console logger
    if (config.env !== 'production' && !this.brevoApiKey && !this.resendApiKey) {
      logger.info({ to: payload.to, subject: payload.subject }, '[EmailProvider] Mock delivered in development');
      return { success: true, provider: 'console' };
    }

    throw new Error(`All transactional email providers failed: ${errors.join('; ')}`);
  }
}

export const emailProvider = new EmailProviderService();
