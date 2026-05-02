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

function render(template: string, vars: Record<string, unknown>): RenderedEmail {
  switch (template) {
    case 'welcome_customer': {
      const subject = `Bienvenue sur PandaMarket, ${v(vars, 'name', '')} !`;
      const body = `<h1 style="margin-top:0;">Bienvenue 👋</h1>
        <p>Bonjour ${v(vars, 'name')},</p>
        <p>Votre compte est prêt. Découvrez les milliers de produits proposés par les vendeurs tunisiens.</p>
        ${cta('Explorer le Hub', 'https://pandamarket.tn')}`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
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
      return { subject, html: layout(subject, body), text: stripTags(body) };
    }

    case 'payment_captured': {
      const subject = `Paiement reçu pour la commande #${v(vars, 'order_id')}`;
      const body = `<h1 style="margin-top:0;">Paiement confirmé ✅</h1>
        <p>Nous avons bien reçu votre paiement de <strong>${v(vars, 'amount')} TND</strong> via ${v(vars, 'method')}.</p>
        <p>La commande <strong>#${v(vars, 'order_id')}</strong> est désormais en cours de préparation.</p>`;
      return { subject, html: layout(subject, body), text: stripTags(body) };
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
  // Minimal SMTP client built on top of `nodemailer` IF available.
  // We keep it optional to avoid forcing the dep when not needed.
  private nodemailer: typeof import('nodemailer') | null = null;
  private transporter: import('nodemailer').Transporter | null = null;

  private async ensure() {
    if (this.transporter) return;
    try {
      this.nodemailer = (await import('nodemailer')) as typeof import('nodemailer');
    } catch {
      logger.warn('nodemailer not installed — falling back to console transport');
      throw new Error('nodemailer_missing');
    }
    this.transporter = this.nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth:
        config.smtp.user && config.smtp.pass
          ? { user: config.smtp.user, pass: config.smtp.pass }
          : undefined,
    });
  }

  async send(opts: { to: string; from: string; subject: string; html: string; text: string }) {
    await this.ensure();
    if (!this.transporter) throw new Error('SMTP transporter not initialised');
    await this.transporter.sendMail(opts);
  }
}

const consoleTransport = new ConsoleTransport();
const smtpTransport = new SmtpTransport();

function pickTransport(): MailTransport {
  return config.smtp.host ? smtpTransport : consoleTransport;
}

// ----------------------------------------------------------------
// Worker bootstrap
// ----------------------------------------------------------------

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    'pd_email_queue',
    async (job: Job<EmailJobData>) => {
      const { to, template, variables, subject } = job.data;
      const rendered = render(template, variables);
      if (subject) rendered.subject = subject;
      try {
        await pickTransport().send({
          to,
          from: config.mailFrom,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
      } catch (err) {
        if ((err as Error).message === 'nodemailer_missing') {
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
