import { query, transaction } from '../db/pool';
import { pdId } from '../utils/crypto';

export type EmailTemplateScope = 'marketplace' | 'store';

export interface RenderedEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailTemplateStyleRow {
  id: string;
  scope: EmailTemplateScope;
  store_id: string | null;
  template_key: string;
  label: string;
  subject: string | null;
  preheader: string | null;
  title: string | null;
  body_html: string | null;
  cta_label: string | null;
  cta_url: string | null;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  header_background: string;
  footer_text: string | null;
  is_enabled: boolean;
  updated_at: Date | null;
}

export interface EmailTemplateStyleInput {
  template_key: string;
  label?: string;
  subject?: string | null;
  preheader?: string | null;
  title?: string | null;
  body_html?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  primary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  header_background?: string;
  footer_text?: string | null;
  is_enabled?: boolean;
}

const DEFAULT_COLOR = {
  primary_color: '#16C784',
  accent_color: '#B91C1C',
  background_color: '#F8F9FC',
  text_color: '#1A1A2E',
  header_background: '#1A1A2E',
};

const DEFAULT_TEMPLATES: Record<string, { label: string; subject: string; title: string; body_html: string; cta_label?: string; cta_url?: string }> = {
  welcome_customer: {
    label: 'Buyer registration',
    subject: 'Bienvenue sur PandaMarket, {{name}} !',
    title: 'Bienvenue 👋',
    body_html: '<p>Bonjour {{name}},</p><p>Votre compte est prêt. Découvrez les produits proposés par nos vendeurs.</p>',
    cta_label: 'Explorer la boutique',
    cta_url: '{{store_url}}',
  },
  order_confirmed: {
    label: 'Order placed',
    subject: 'Commande #{{order_id}} confirmée',
    title: 'Merci pour votre commande !',
    body_html: '<p>Votre commande <strong>#{{order_id}}</strong> d’un montant de <strong>{{total}} TND</strong> a bien été reçue.</p>',
    cta_label: 'Voir ma commande',
    cta_url: '{{order_url}}',
  },
  payment_captured: {
    label: 'Payment confirmed',
    subject: 'Paiement reçu pour la commande #{{order_id}}',
    title: 'Paiement confirmé ✅',
    body_html: '<p>Nous avons bien reçu votre paiement de <strong>{{amount}} TND</strong> via {{method}}.</p><p>La commande <strong>#{{order_id}}</strong> est désormais en cours de préparation.</p>',
  },
  new_device_login: {
    label: 'New device login alert',
    subject: 'Nouvelle connexion à votre compte PandaMarket',
    title: 'Nouvelle connexion détectée',
    body_html: '<p>Bonjour {{name}},</p><p>Une connexion à votre compte a été effectuée depuis <strong>{{device_label}}</strong> avec l’adresse IP <strong>{{ip}}</strong> le {{login_time}}.</p><p>Si ce n’était pas vous, révoquez vos sessions et modifiez votre mot de passe.</p>',
    cta_label: 'Gérer la sécurité du compte',
    cta_url: '{{manage_url}}',
  },
};

function safeColor(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value.trim()) ? value.trim() : fallback;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderVars(template: string, vars: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match, key: string) => escapeHtml(vars[key]));
}

function sanitizeEmailHtml(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
}

function safeUrl(value: string): string {
  const trimmed = value.trim();
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;
  return '#';
}

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function rowToPublic(row: EmailTemplateStyleRow | null, scope: EmailTemplateScope, storeId: string | null, key: string) {
  const defaults = DEFAULT_TEMPLATES[key];
  return {
    id: row?.id ?? null,
    scope,
    store_id: storeId,
    template_key: key,
    label: row?.label ?? defaults?.label ?? key,
    subject: row?.subject ?? defaults?.subject ?? '',
    preheader: row?.preheader ?? '',
    title: row?.title ?? defaults?.title ?? '',
    body_html: row?.body_html ?? defaults?.body_html ?? '',
    cta_label: row?.cta_label ?? defaults?.cta_label ?? '',
    cta_url: row?.cta_url ?? defaults?.cta_url ?? '',
    primary_color: row?.primary_color ?? DEFAULT_COLOR.primary_color,
    accent_color: row?.accent_color ?? DEFAULT_COLOR.accent_color,
    background_color: row?.background_color ?? DEFAULT_COLOR.background_color,
    text_color: row?.text_color ?? DEFAULT_COLOR.text_color,
    header_background: row?.header_background ?? DEFAULT_COLOR.header_background,
    footer_text: row?.footer_text ?? 'PandaMarket SARL',
    is_enabled: row?.is_enabled ?? true,
    updated_at: row?.updated_at ? row.updated_at.toISOString() : null,
  };
}

export class EmailTemplateService {
  async list(scope: EmailTemplateScope, storeId?: string) {
    const { rows } = await query<EmailTemplateStyleRow>(
      scope === 'store'
        ? `SELECT * FROM pd_email_template_style WHERE scope = 'store' AND store_id = $1 ORDER BY template_key ASC`
        : `SELECT * FROM pd_email_template_style WHERE scope = 'marketplace' AND store_id IS NULL ORDER BY template_key ASC`,
      scope === 'store' ? [storeId] : [],
    );
    const byKey = new Map(rows.map((row) => [row.template_key, row]));
    const keys = Array.from(new Set([...Object.keys(DEFAULT_TEMPLATES), ...rows.map((row) => row.template_key)]));
    return keys.map((key) => rowToPublic(byKey.get(key) ?? null, scope, scope === 'store' ? storeId ?? null : null, key));
  }

  async upsert(scope: EmailTemplateScope, storeId: string | null, input: EmailTemplateStyleInput) {
    const defaults = DEFAULT_TEMPLATES[input.template_key];
    const id = pdId('emailtpl');
    const values = [
      id,
      scope,
      scope === 'store' ? storeId : null,
      input.template_key,
      input.label?.trim() || defaults?.label || input.template_key,
      input.subject?.trim() || null,
      input.preheader?.trim() || null,
      input.title?.trim() || null,
      sanitizeEmailHtml(input.body_html?.trim()),
      input.cta_label?.trim() || null,
      input.cta_url?.trim() || null,
      safeColor(input.primary_color, DEFAULT_COLOR.primary_color),
      safeColor(input.accent_color, DEFAULT_COLOR.accent_color),
      safeColor(input.background_color, DEFAULT_COLOR.background_color),
      safeColor(input.text_color, DEFAULT_COLOR.text_color),
      safeColor(input.header_background, DEFAULT_COLOR.header_background),
      input.footer_text?.trim() || null,
      input.is_enabled ?? true,
    ];
    const row = await transaction(async (client) => {
      const params = values.slice(4);
      const updateWhere = scope === 'store'
        ? `scope = 'store' AND store_id = $15 AND template_key = $16`
        : `scope = 'marketplace' AND store_id IS NULL AND template_key = $15`;
      const updateValues = scope === 'store'
        ? [...params, storeId, input.template_key]
        : [...params, input.template_key];
      const updated = await client.query<EmailTemplateStyleRow>(
        `UPDATE pd_email_template_style
         SET label = $1,
             subject = $2,
             preheader = $3,
             title = $4,
             body_html = $5,
             cta_label = $6,
             cta_url = $7,
             primary_color = $8,
             accent_color = $9,
             background_color = $10,
             text_color = $11,
             header_background = $12,
             footer_text = $13,
             is_enabled = $14,
             updated_at = NOW()
         WHERE ${updateWhere}
         RETURNING *`,
        updateValues,
      );
      if (updated.rows[0]) return updated.rows[0];
      const inserted = await client.query<EmailTemplateStyleRow>(
        `INSERT INTO pd_email_template_style
          (id, scope, store_id, template_key, label, subject, preheader, title, body_html, cta_label, cta_url,
           primary_color, accent_color, background_color, text_color, header_background, footer_text, is_enabled)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING *`,
        values,
      );
      return inserted.rows[0];
    });
    return rowToPublic(row, scope, scope === 'store' ? storeId : null, input.template_key);
  }

  async apply(templateKey: string, vars: Record<string, unknown>, base: RenderedEmailTemplate, opts: { scope?: EmailTemplateScope; storeId?: string | null } = {}): Promise<RenderedEmailTemplate> {
    const style = await this.getEffectiveStyle(templateKey, opts.scope, opts.storeId);
    const defaults = DEFAULT_TEMPLATES[templateKey];
    if (!style || !style.is_enabled || (!defaults && !style.body_html && !style.subject && !style.title)) return base;

    const primary = safeColor(style.primary_color, DEFAULT_COLOR.primary_color);
    const accent = safeColor(style.accent_color, DEFAULT_COLOR.accent_color);
    const bg = safeColor(style.background_color, DEFAULT_COLOR.background_color);
    const text = safeColor(style.text_color, DEFAULT_COLOR.text_color);
    const headerBg = safeColor(style.header_background, DEFAULT_COLOR.header_background);
    const subject = renderVars(style.subject || defaults?.subject || base.subject, vars);
    const title = renderVars(style.title || defaults?.title || subject, vars);
    const preheader = style.preheader ? renderVars(style.preheader, vars) : '';
    const body = renderVars(sanitizeEmailHtml(style.body_html) || defaults?.body_html || '', vars);
    const ctaLabel = style.cta_label || defaults?.cta_label;
    const ctaUrl = style.cta_url || defaults?.cta_url;
    const footer = renderVars(style.footer_text || 'PandaMarket SARL', vars);
    const cta = ctaLabel && ctaUrl
      ? `<p style="margin:24px 0;"><a href="${safeUrl(renderVars(ctaUrl, vars))}" style="background:${primary};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">${renderVars(ctaLabel, vars)}</a></p>`
      : '';
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head><body style="margin:0;padding:0;background:${bg};font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;color:${text};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:24px 0;"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);"><tr><td style="background:${headerBg};padding:24px;color:#fff;"><span style="font-size:20px;font-weight:800;">PandaMarket</span></td></tr><tr><td style="padding:32px 24px;font-size:16px;line-height:1.65;color:${text};"><h1 style="margin:0 0 16px;color:${accent};font-size:26px;line-height:1.2;">${title}</h1>${body}${cta}</td></tr><tr><td style="padding:16px 24px;font-size:12px;color:#6B7280;border-top:1px solid #F3F4F6;text-align:center;">${footer}</td></tr></table></td></tr></table></body></html>`;
    return { subject, html, text: stripTags(`${title} ${body}`) };
  }

  private async getEffectiveStyle(templateKey: string, scope?: EmailTemplateScope, storeId?: string | null): Promise<EmailTemplateStyleRow | null> {
    if (scope === 'store' && storeId) {
      const { rows } = await query<EmailTemplateStyleRow>(
        `SELECT * FROM pd_email_template_style
         WHERE template_key = $1 AND ((scope = 'store' AND store_id = $2) OR (scope = 'marketplace' AND store_id IS NULL))
         ORDER BY CASE WHEN scope = 'store' THEN 0 ELSE 1 END
         LIMIT 1`,
        [templateKey, storeId],
      );
      return rows[0] ?? null;
    }
    const { rows } = await query<EmailTemplateStyleRow>(
      `SELECT * FROM pd_email_template_style
       WHERE template_key = $1 AND scope = 'marketplace' AND store_id IS NULL
       LIMIT 1`,
      [templateKey],
    );
    return rows[0] ?? null;
  }
}

export const emailTemplateService = new EmailTemplateService();
