/**
 * Email worker — processes BullMQ jobs for transactional emails.
 *
 * In development, emails are simply logged.
 * In production, set PD_SMTP_* env vars and we use nodemailer-compatible SMTP.
 *
 * Templates (template ids defined in `notifications-system.md`) are rendered
 * inline as small HTML strings — keep this lean; for richer templates,
 * swap the body builder with a real template engine (mjml, react-email…).
 */

import { Job, Worker } from 'bullmq';
import { getRedis } from '../db/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EmailJobData } from '../queues/email-queue';
import { emailTemplateService } from '../services/email-template.service';

// ----------------------------------------------------------------
// Template renderer
// ----------------------------------------------------------------

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const PRIMARY = '#16C784';
const BLACK = '#1A1A2E';

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FC;font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;color:${BLACK};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8F9FC;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <tr><td style="background:${BLACK};padding:24px;color:#fff;">
          <span style="font-size:20px;font-weight:700;">🐼 PandaMarket</span>
        </td></tr>
        <tr><td style="padding:32px 24px;font-size:16px;line-height:1.6;color:${BLACK};">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 24px;font-size:12px;color:#6B7280;border-top:1px solid #F3F4F6;text-align:center;">
          PandaMarket SARL · <a href="https://pandamarket.tn" style="color:${PRIMARY};text-decoration:none;">pandamarket.tn</a><br>
          <a href="https://pandamarket.tn/help" style="color:#6B7280;">Aide</a> ·
          <a href="https://pandamarket.tn/cgu" style="color:#6B7280;">CGU</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function cta(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="background:${PRIMARY};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">${label}</a></p>`;
}

function v(vars: Record<string, unknown>, key: string, fallback = ''): string {
  const value = vars[key];
  if (value === undefined || value === null) return fallback;
  return String(value);
}

async function render(template: string, vars: Record<string, unknown>, opts: { scope?: 'marketplace' | 'store'; store_id?: string | null } = {}): Promise<RenderedEmail> {
  let rendered: RenderedEmail;
  switch (template) {
    case 'welcome_customer': {
      const subject = `Bienvenue sur PandaMarket, ${v(vars, 'name', '')} !`;
      const body = `<h1 style="margin-top:0;">Bienvenue 👋</h1>
        <p>Bonjour ${v(vars, 'name')},</p>
        <p>Votre compte est prêt. Découvrez les milliers de produits proposés par les vendeurs tunisiens.</p>
        ${cta('Explorer le Hub', 'https://pandamarket.tn')}`;
      rendered = { subject, html: layout(subject, body), text: stripTags(body) };
      break;
    }

    case 'welcome_vendor': {
      const subject = `Votre boutique ${v(vars, 'store_name')} est prête !`;
      const url = `https://${v(vars, 'subdomain')}.pandamarket.tn`;
      const body = `<h1 style="margin-top:0;">Félicitations 🎉</h1>
        <p>Bonjour ${v(vars, 'name')},</p>
        <p>Votre boutique <strong>${v(vars, 'store_name')}</strong> est en ligne :</p>
        <p><a href="${url}" style="color:${PRIMARY};">${url}</a></p>
        <p>Connectez-vous au dashboard pour ajouter vos produits et personnaliser votre boutique.</p>
        ${cta('Aller au dashboard', 'https://pandamarket.tn/dashboard')}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'order_confirmed': {
      const subject = `Commande #${v(vars, 'order_id')} confirmée`;
      const body = `<h1 style="margin-top:0;">Merci pour votre commande !</h1>
        <p>Votre commande <strong>#${v(vars, 'order_id')}</strong> d'un montant de <strong>${v(vars, 'total')} TND</strong> a bien été reçue.</p>
        ${cta('Voir ma commande', `https://pandamarket.tn/orders/${v(vars, 'order_id')}`)}`;
      rendered = { subject, html: layout(subject, body), text: stripTags(body) };
      break;
    }

    case 'payment_captured': {
      const subject = `Paiement reçu pour la commande #${v(vars, 'order_id')}`;
      const body = `<h1 style="margin-top:0;">Paiement confirmé ✅</h1>
        <p>Nous avons bien reçu votre paiement de <strong>${v(vars, 'amount')} TND</strong> via ${v(vars, 'method')}.</p>
        <p>La commande <strong>#${v(vars, 'order_id')}</strong> est désormais en cours de préparation.</p>`;
      rendered = { subject, html: layout(subject, body), text: stripTags(body) };
      break;
    }

    case 'mandat_approved': {
      const subject = `Mandat approuvé — Commande #${v(vars, 'order_id')} débloquée`;
      const body = `<h1 style="margin-top:0;">Mandat validé ✅</h1>
        <p>Votre preuve de Mandat Minute pour <strong>${v(vars, 'amount')} TND</strong> a été approuvée par notre équipe.</p>
        <p>La commande <strong>#${v(vars, 'order_id')}</strong> est maintenant en cours de traitement.</p>`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'mandat_rejected': {
      const subject = `Mandat rejeté — Action requise`;
      const body = `<h1 style="margin-top:0;">Mandat refusé ❌</h1>
        <p>Votre preuve a été rejetée pour la raison suivante :</p>
        <blockquote style="background:#F3F4F6;padding:12px 16px;border-left:4px solid #EA3943;margin:16px 0;">${v(vars, 'reason')}</blockquote>
        ${cta('Renvoyer une preuve', v(vars, 'reupload_url', 'https://pandamarket.tn'))}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'order_shipped': {
      const subject = `Votre commande #${v(vars, 'order_id')} est en route !`;
      const body = `<h1 style="margin-top:0;">En cours de livraison 🚚</h1>
        <p>Votre commande a été expédiée${vars.carrier ? ` via <strong>${v(vars, 'carrier')}</strong>` : ''}.</p>
        ${vars.tracking_number ? `<p>N° de suivi : <strong>${v(vars, 'tracking_number')}</strong></p>` : ''}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'kyc_approved': {
      const subject = `Félicitations ! Votre boutique est vérifiée ✓`;
      const body = `<h1 style="margin-top:0;">Boutique vérifiée 🎉</h1>
        <p>Bonjour ${v(vars, 'name')},</p>
        <p>Votre boutique <strong>${v(vars, 'store_name')}</strong> est désormais vérifiée. Vos prochains produits seront publiés instantanément, sans validation préalable.</p>
        ${cta('Aller au dashboard', 'https://pandamarket.tn/dashboard')}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'kyc_rejected': {
      const subject = `Vérification refusée`;
      const body = `<h1 style="margin-top:0;">Documents refusés</h1>
        <p>Bonjour ${v(vars, 'name')},</p>
        <p>Vos documents n'ont pas pu être validés :</p>
        <blockquote style="background:#F3F4F6;padding:12px 16px;border-left:4px solid #EA3943;margin:16px 0;">${v(vars, 'reason')}</blockquote>
        ${cta('Soumettre à nouveau', v(vars, 'resubmit_url', 'https://pandamarket.tn/dashboard/verification'))}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'product_approved': {
      const subject = `Produit publié : ${v(vars, 'product_name')}`;
      const body = `<h1 style="margin-top:0;">Produit en ligne ✅</h1>
        <p>Votre produit <strong>${v(vars, 'product_name')}</strong> a été approuvé et publié sur la plateforme.</p>
        ${cta('Voir le produit', v(vars, 'product_url', 'https://pandamarket.tn'))}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'product_rejected': {
      const subject = `Produit refusé : ${v(vars, 'product_name')}`;
      const body = `<h1 style="margin-top:0;">Produit refusé ❌</h1>
        <p>Votre produit <strong>${v(vars, 'product_name')}</strong> a été refusé :</p>
        <blockquote style="background:#F3F4F6;padding:12px 16px;border-left:4px solid #EA3943;margin:16px 0;">${v(vars, 'reason')}</blockquote>`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'new_order_vendor': {
      const subject = `🛍️ Nouvelle commande #${v(vars, 'order_id')}`;
      const body = `<h1 style="margin-top:0;">Nouvelle commande !</h1>
        <p>Vous avez reçu une nouvelle commande d'un montant de <strong>${v(vars, 'total')} TND</strong>.</p>
        ${cta('Voir la commande', `https://pandamarket.tn/dashboard/orders/${v(vars, 'order_id')}`)}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'wallet_available': {
      const subject = `Fonds disponibles : ${v(vars, 'amount')} TND`;
      const body = `<h1 style="margin-top:0;">Fonds débloqués 💰</h1>
        <p>Bonjour ${v(vars, 'name')}, <strong>${v(vars, 'amount')} TND</strong> sont désormais disponibles dans votre wallet.</p>
        ${cta('Demander un retrait', v(vars, 'wallet_url', 'https://pandamarket.tn/dashboard/wallet'))}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'payout_completed': {
      const subject = `Retrait de ${v(vars, 'amount')} TND effectué`;
      const body = `<h1 style="margin-top:0;">Retrait effectué ✅</h1>
        <p>Votre demande de retrait de <strong>${v(vars, 'amount')} TND</strong> a été traitée avec succès${vars.method ? ` via ${v(vars, 'method')}` : ''}.</p>`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'stock_low': {
      const subject = `⚠️ Stock faible : ${v(vars, 'product_name')}`;
      const body = `<h1 style="margin-top:0;">Stock faible</h1>
        <p>Le produit <strong>${v(vars, 'product_name')}</strong> n'a plus que <strong>${v(vars, 'quantity')}</strong> en stock.</p>
        ${cta('Mettre à jour le stock', 'https://pandamarket.tn/dashboard/products')}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'subscription_expiring': {
      const subject = `Votre abonnement expire dans 7 jours`;
      const body = `<h1 style="margin-top:0;">Renouvellement à venir</h1>
        <p>Bonjour ${v(vars, 'name')}, votre plan <strong>${v(vars, 'plan')}</strong> expire le <strong>${v(vars, 'expiry_date')}</strong>.</p>
        ${cta('Renouveler', v(vars, 'renew_url', 'https://pandamarket.tn/dashboard/subscription'))}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'subscription_expired': {
      const subject = `Votre abonnement ${v(vars, 'plan')} a expiré`;
      const body = `<h1 style="margin-top:0;">Abonnement expiré</h1>
        <p>Votre plan <strong>${v(vars, 'plan')}</strong> a expiré. Vous êtes basculé sur le plan Free (15% de commission).</p>
        ${cta('Réactiver', v(vars, 'renew_url', 'https://pandamarket.tn/dashboard/subscription'))}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    default: {
      const subject = vars.subject ? String(vars.subject) : 'Notification PandaMarket';
      const body = `<p>${v(vars, 'message', 'Vous avez une nouvelle notification.')}</p>`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }
  }
  try {
    return await emailTemplateService.apply(template, vars, rendered, {
      scope: opts.scope,
      storeId: opts.store_id,
    });
  } catch (err) {
    logger.warn({ err, template }, 'Email template override failed, using built-in template');
    return rendered;
  }
}

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------
// Mail transport
// ----------------------------------------------------------------

interface MailTransport {
  send(opts: { to: string; from: string; subject: string; html: string; text: string }): Promise<void>;
}

class ConsoleTransport implements MailTransport {
  async send(opts: { to: string; from: string; subject: string; html: string; text: string }) {
    logger.info(
      { to: opts.to, from: opts.from, subject: opts.subject, body_preview: opts.text.slice(0, 200) },
      '[email] (no SMTP configured) would send',
    );
  }
}

class SmtpTransport implements MailTransport {
  /**
   * Dynamic SMTP transport that reads config from the database first,
   * then falls back to env vars. Recreates the transporter when config changes.
   *
   * Config priority:
   *   1. Database (pd_platform_config) — set by Super Admin via dashboard
   *   2. Environment variables (PD_SMTP_*) — set in .env / Docker secrets
   *   3. Console fallback — logs email to stdout
   */
  private nodemailer: typeof import('nodemailer') | null = null;
  private transporter: import('nodemailer').Transporter | null = null;
  private configHash: string = '';
  private lastConfigCheck: number = 0;
  private readonly CONFIG_TTL_MS = 60_000; // re-read DB config every 60s

  private async loadNodemailer(): Promise<typeof import('nodemailer')> {
    if (this.nodemailer) return this.nodemailer;
    try {
      this.nodemailer = (await import('nodemailer')) as typeof import('nodemailer');
      return this.nodemailer;
    } catch {
      logger.warn('nodemailer not installed — falling back to console transport');
      throw new Error('nodemailer_missing');
    }
  }

  private async getSmtpConfig(): Promise<{
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    fromAddress: string;
  } | null> {
    // Try database config first (set by Super Admin)
    try {
      const { smtpConfigService } = await import('../services/smtp-config.service');
      const dbConfig = await smtpConfigService.getConfig();
      if (dbConfig && dbConfig.smtp_enabled && dbConfig.smtp_host) {
        return {
          host: dbConfig.smtp_host,
          port: dbConfig.smtp_port,
          user: dbConfig.smtp_user,
          pass: dbConfig.smtp_pass,
          secure: dbConfig.smtp_secure,
          fromAddress: `${dbConfig.smtp_from_name} <${dbConfig.smtp_from_email}>`,
        };
      }
    } catch (err) {
      logger.debug({ err: (err as Error).message }, 'Could not load SMTP config from DB, trying env vars');
    }

    // Fall back to env vars
    if (config.smtp.host) {
      return {
        host: config.smtp.host,
        port: config.smtp.port,
        user: config.smtp.user,
        pass: config.smtp.pass,
        secure: config.smtp.port === 465,
        fromAddress: config.mailFrom,
      };
    }

    return null;
  }

  private async ensure(): Promise<{ fromAddress: string }> {
    const now = Date.now();
    const shouldRefresh = now - this.lastConfigCheck > this.CONFIG_TTL_MS;

    const smtpConfig = await this.getSmtpConfig();
    if (!smtpConfig) {
      throw new Error('no_smtp_config');
    }

    // Build a hash to detect config changes
    const hash = `${smtpConfig.host}:${smtpConfig.port}:${smtpConfig.user}:${smtpConfig.secure}`;

    if (this.transporter && hash === this.configHash && !shouldRefresh) {
      return { fromAddress: smtpConfig.fromAddress };
    }

    // Config changed or TTL expired — recreate transporter
    if (this.transporter) {
      this.transporter.close();
    }

    const nm = await this.loadNodemailer();
    this.transporter = nm.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth:
        smtpConfig.user && smtpConfig.pass
          ? { user: smtpConfig.user, pass: smtpConfig.pass }
          : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });

    this.configHash = hash;
    this.lastConfigCheck = now;
    logger.info({ host: smtpConfig.host, port: smtpConfig.port }, 'SMTP transporter (re)created');

    return { fromAddress: smtpConfig.fromAddress };
  }

  async send(opts: { to: string; from: string; subject: string; html: string; text: string }) {
    const { fromAddress } = await this.ensure();
    if (!this.transporter) throw new Error('SMTP transporter not initialised');
    // Use the dynamically resolved from address
    await this.transporter.sendMail({ ...opts, from: fromAddress });
  }
}

const consoleTransport = new ConsoleTransport();
const smtpTransport = new SmtpTransport();

async function pickTransport(): Promise<MailTransport> {
  // Check if SMTP is configured (DB or env)
  try {
    const { smtpConfigService } = await import('../services/smtp-config.service');
    const dbConfig = await smtpConfigService.getConfig();
    if (dbConfig && dbConfig.smtp_enabled && dbConfig.smtp_host) {
      return smtpTransport;
    }
  } catch {
    // DB not available — check env
  }

  if (config.smtp.host) {
    return smtpTransport;
  }

  return consoleTransport;
}

// ----------------------------------------------------------------
// Worker bootstrap
// ----------------------------------------------------------------

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'pd_email_queue',
    async (job: Job<EmailJobData>) => {
      const { to, template, variables, subject, scope, store_id } = job.data;
      const rendered = await render(template, variables, { scope, store_id });
      if (subject) rendered.subject = subject;
      try {
        const transport = await pickTransport();
        await transport.send({
          to,
          from: config.mailFrom,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
      } catch (err) {
        const errMsg = (err as Error).message;
        if (errMsg === 'nodemailer_missing' || errMsg === 'no_smtp_config') {
          // Graceful degradation: log and succeed
          await consoleTransport.send({
            to,
            from: config.mailFrom,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          return;
        }
        throw err;
      }
    },
    { connection: getRedis(), concurrency: 8 },
  );

  worker.on('completed', (job) =>
    logger.debug({ to: job.data.to, template: job.data.template }, 'Email sent'),
  );
  worker.on('failed', (job, err) =>
    logger.error({ to: job?.data.to, template: job?.data.template, err: err.message }, 'Email failed'),
  );
  return worker;
}
