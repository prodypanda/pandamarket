'use client';

import { fetchWithCsrf } from '@/lib/api';
import { AlertCircle, Loader2, Mail, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type EmailTemplateScope = 'storefront' | 'marketplace';

interface EmailTemplateStyle {
  id: string | null;
  scope: 'store' | 'marketplace';
  store_id: string | null;
  template_key: string;
  label: string;
  subject: string;
  preheader: string;
  title: string;
  body_html: string;
  cta_label: string;
  cta_url: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  header_background: string;
  footer_text: string;
  is_enabled: boolean;
}

interface EmailTemplateManagerProps {
  scope: EmailTemplateScope;
  title: string;
  description: string;
}

const colorFields: Array<{ key: keyof Pick<EmailTemplateStyle, 'primary_color' | 'accent_color' | 'background_color' | 'text_color' | 'header_background'>; label: string }> = [
  { key: 'primary_color', label: 'Primary' },
  { key: 'accent_color', label: 'Accent' },
  { key: 'background_color', label: 'Background' },
  { key: 'text_color', label: 'Text' },
  { key: 'header_background', label: 'Header' },
];

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function sanitizePreviewHtml(value: string) {
  return value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '');
}

export function EmailTemplateManager({ scope, title, description }: EmailTemplateManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplateStyle[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [draft, setDraft] = useState<EmailTemplateStyle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const endpoint = `/api/pd/email-templates/${scope}`;
  const selected = useMemo(
    () => templates.find((item) => item.template_key === selectedKey) || null,
    [selectedKey, templates],
  );

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(endpoint, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to load email templates'));
      const data = await res.json();
      const loaded = (data.templates || []) as EmailTemplateStyle[];
      setTemplates(loaded);
      setSelectedKey((current) => current || loaded[0]?.template_key || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load email templates');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (selected) setDraft({ ...selected });
  }, [selected]);

  const updateDraft = <K extends keyof EmailTemplateStyle>(key: K, value: EmailTemplateStyle[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveTemplate = async () => {
    if (!draft) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithCsrf(`${endpoint}/${draft.template_key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          label: draft.label,
          subject: draft.subject || null,
          preheader: draft.preheader || null,
          title: draft.title || null,
          body_html: draft.body_html || null,
          cta_label: draft.cta_label || null,
          cta_url: draft.cta_url || null,
          primary_color: draft.primary_color,
          accent_color: draft.accent_color,
          background_color: draft.background_color,
          text_color: draft.text_color,
          header_background: draft.header_background,
          footer_text: draft.footer_text || null,
          is_enabled: draft.is_enabled,
        }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to save email template'));
      const data = await res.json();
      setTemplates((current) => current.map((item) => (item.template_key === draft.template_key ? data.template : item)));
      setSuccess('Email template saved. New emails will use this style.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save email template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-xl shadow-slate-900/5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-gray-950">
            <Mail className="h-5 w-5 text-[#B91C1C]" />
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void saveTemplate()}
          disabled={saving || !draft}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-5 py-3 text-sm font-black text-white transition hover:bg-[#991B1B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save template
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">{success}</div>}

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading email templates...
        </div>
      ) : draft ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[260px_1fr]">
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.template_key}
                type="button"
                onClick={() => setSelectedKey(template.template_key)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedKey === template.template_key ? 'border-[#B91C1C] bg-red-50 text-[#7F1D1D]' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-white'}`}
              >
                <span className="block text-sm font-black">{template.label}</span>
                <span className="mt-1 block text-xs font-semibold opacity-70">{template.template_key}</span>
              </button>
            ))}
          </div>

          <div className="space-y-5 rounded-3xl border border-gray-100 bg-gray-50 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-bold text-gray-700">
                Label
                <input
                  value={draft.label}
                  onChange={(event) => updateDraft('label', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={draft.is_enabled}
                  onChange={(event) => updateDraft('is_enabled', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#B91C1C] focus:ring-[#B91C1C]"
                />
                Enabled
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-bold text-gray-700">
                Subject
                <input
                  value={draft.subject}
                  onChange={(event) => updateDraft('subject', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
              </label>
              <label className="space-y-1 text-sm font-bold text-gray-700">
                Preheader
                <input
                  value={draft.preheader}
                  onChange={(event) => updateDraft('preheader', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
              </label>
            </div>

            <label className="space-y-1 text-sm font-bold text-gray-700">
              Title
              <input
                value={draft.title}
                onChange={(event) => updateDraft('title', event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              />
            </label>

            <label className="space-y-1 text-sm font-bold text-gray-700">
              Body HTML
              <textarea
                value={draft.body_html}
                onChange={(event) => updateDraft('body_html', event.target.value)}
                rows={7}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-bold text-gray-700">
                CTA label
                <input
                  value={draft.cta_label}
                  onChange={(event) => updateDraft('cta_label', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
              </label>
              <label className="space-y-1 text-sm font-bold text-gray-700">
                CTA URL
                <input
                  value={draft.cta_url}
                  onChange={(event) => updateDraft('cta_url', event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {colorFields.map((field) => (
                <label key={field.key} className="space-y-1 text-xs font-black uppercase tracking-wide text-gray-500">
                  {field.label}
                  <input
                    type="color"
                    value={draft[field.key] || '#000000'}
                    onChange={(event) => updateDraft(field.key, event.target.value)}
                    className="h-12 w-full rounded-2xl border border-gray-200 bg-white p-1"
                  />
                </label>
              ))}
            </div>

            <label className="space-y-1 text-sm font-bold text-gray-700">
              Footer text
              <textarea
                value={draft.footer_text}
                onChange={(event) => updateDraft('footer_text', event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#B91C1C] focus:ring-4 focus:ring-[#B91C1C]/10"
              />
            </label>

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
              <div style={{ background: draft.header_background, color: '#fff' }} className="px-5 py-4 text-sm font-black">
                PandaMarket
              </div>
              <div style={{ background: draft.background_color, color: draft.text_color }} className="p-5">
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h3 style={{ color: draft.accent_color }} className="text-xl font-black">{draft.title || 'Email title'}</h3>
                  <div className="mt-3 text-sm" dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(draft.body_html || '<p>Email body preview</p>') }} />
                  {draft.cta_label && (
                    <span style={{ background: draft.primary_color }} className="mt-4 inline-flex rounded-xl px-4 py-2 text-sm font-black text-white">
                      {draft.cta_label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm font-bold text-gray-500">
          No email templates found.
        </div>
      )}
    </section>
  );
}
