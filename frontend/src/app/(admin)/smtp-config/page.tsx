'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Save,
  RotateCcw,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Server,
  AlertTriangle,
} from 'lucide-react';

interface SmtpConfigPublic {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass_set: boolean;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

interface SmtpFormData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  smtp_from_name: string;
  smtp_from_email: string;
  smtp_enabled: boolean;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const PROVIDER_PRESETS: Record<
  string,
  { host: string; port: number; secure: boolean; label: string }
> = {
  brevo: { host: 'smtp-relay.brevo.com', port: 587, secure: false, label: 'Brevo (Sendinblue)' },
  resend: { host: 'smtp.resend.com', port: 465, secure: true, label: 'Resend' },
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false, label: 'Gmail (App Password)' },
  outlook: { host: 'smtp-mail.outlook.com', port: 587, secure: false, label: 'Outlook / Office 365' },
  mailgun: { host: 'smtp.mailgun.org', port: 587, secure: false, label: 'Mailgun' },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false, label: 'SendGrid' },
  custom: { host: '', port: 587, secure: false, label: 'Custom SMTP Server' },
};

const DEFAULT_FORM: SmtpFormData = {
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  smtp_secure: false,
  smtp_from_name: 'PandaMarket',
  smtp_from_email: 'noreply@pandamarket.tn',
  smtp_enabled: false,
};

export default function AdminSmtpConfigPage() {
  const [form, setForm] = useState<SmtpFormData>(DEFAULT_FORM);
  const [existingPassSet, setExistingPassSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [error, setError] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
        credentials: 'include',
      });
      if (res.ok) {
        const { data } = (await res.json()) as { data: SmtpConfigPublic };
        setForm({
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port,
          smtp_user: data.smtp_user,
          smtp_pass: '', // never returned from server
          smtp_secure: data.smtp_secure,
          smtp_from_name: data.smtp_from_name,
          smtp_from_email: data.smtp_from_email,
          smtp_enabled: data.smtp_enabled,
        });
        setExistingPassSet(data.smtp_pass_set);

        // Detect preset from host
        const matchedPreset = Object.entries(PROVIDER_PRESETS).find(
          ([key, preset]) => key !== 'custom' && preset.host === data.smtp_host,
        );
        setSelectedPreset(matchedPreset ? matchedPreset[0] : data.smtp_host ? 'custom' : 'custom');
      }
    } catch {
      setError('Failed to load SMTP configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  function updateField<K extends keyof SmtpFormData>(key: K, value: SmtpFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError('');
  }

  function applyPreset(presetKey: string) {
    setSelectedPreset(presetKey);
    const preset = PROVIDER_PRESETS[presetKey];
    if (preset && presetKey !== 'custom') {
      updateField('smtp_host', preset.host);
      updateField('smtp_port', preset.port);
      updateField('smtp_secure', preset.secure);
    }
  }

  async function handleSave() {
    if (!form.smtp_host && form.smtp_enabled) {
      setError('SMTP host is required when email is enabled');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/admin/smtp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        if (form.smtp_pass) {
          setExistingPassSet(true);
          setForm((prev) => ({ ...prev, smtp_pass: '' }));
        }
        setTimeout(() => setSaved(false), 3000);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(
          (body as { error?: { message?: string } })?.error?.message ||
            'Failed to save configuration',
        );
      }
    } catch {
      setError('Network error — could not save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestStatus('testing');
    setTestMessage('');
    try {
      const payload: Record<string, unknown> = {};

      // Send current form values so the test uses unsaved config
      if (form.smtp_host) {
        payload.smtp_host = form.smtp_host;
        payload.smtp_port = form.smtp_port;
        payload.smtp_user = form.smtp_user;
        payload.smtp_pass = form.smtp_pass || undefined;
        payload.smtp_secure = form.smtp_secure;
        payload.smtp_from_name = form.smtp_from_name;
        payload.smtp_from_email = form.smtp_from_email;
      }

      if (testEmail) {
        payload.recipient_email = testEmail;
      }

      const res = await fetchWithCsrf('/api/pd/admin/smtp-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = (await res.json()) as { success: boolean; message: string };
      setTestStatus(result.success ? 'success' : 'error');
      setTestMessage(result.message);
    } catch {
      setTestStatus('error');
      setTestMessage('Network error — could not reach the server');
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#16C784]/10 rounded-lg">
            <Mail className="h-6 w-6 text-[#16C784]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Configuration</h1>
            <p className="text-sm text-gray-500">
              Configure SMTP provider for transactional emails.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b876] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <RotateCcw className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${form.smtp_enabled ? 'bg-[#16C784]/10' : 'bg-gray-100'}`}
            >
              <Shield
                className={`h-5 w-5 ${form.smtp_enabled ? 'text-[#16C784]' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Email Sending</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {form.smtp_enabled
                  ? 'Emails are being sent via SMTP'
                  : 'Emails are logged to console (development mode)'}
              </p>
            </div>
          </div>
          <button
            onClick={() => updateField('smtp_enabled', !form.smtp_enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              form.smtp_enabled ? 'bg-[#16C784]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.smtp_enabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </section>

      {/* Provider Preset */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Email Provider</h3>
        <p className="text-xs text-gray-500 mb-4">
          Select a provider to auto-fill SMTP settings, or choose Custom.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                selectedPreset === key
                  ? 'border-[#16C784] bg-[#16C784]/5 text-[#16C784]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* SMTP Server Settings */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Server Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={form.smtp_host}
                onChange={(e) => updateField('smtp_host', e.target.value)}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                value={form.smtp_port}
                onChange={(e) => updateField('smtp_port', parseInt(e.target.value) || 587)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username / API Key</label>
            <input
              type="text"
              value={form.smtp_user}
              onChange={(e) => updateField('smtp_user', e.target.value)}
              placeholder="your-api-key or email"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password / Secret
              {existingPassSet && !form.smtp_pass && (
                <span className="ml-2 text-xs text-[#16C784] font-normal">
                  ✓ Password is set (leave empty to keep current)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.smtp_pass}
                onChange={(e) => updateField('smtp_pass', e.target.value)}
                placeholder={existingPassSet ? '••••••••••••' : 'Enter password or API secret'}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Use TLS on connect (port 465)</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Enable for port 465 (implicit TLS). Disable for port 587 (STARTTLS).
              </p>
            </div>
            <button
              onClick={() => updateField('smtp_secure', !form.smtp_secure)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.smtp_secure ? 'bg-[#16C784]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.smtp_secure ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Sender Identity */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Sender Identity</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input
              type="text"
              value={form.smtp_from_name}
              onChange={(e) => updateField('smtp_from_name', e.target.value)}
              placeholder="PandaMarket"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input
              type="email"
              value={form.smtp_from_email}
              onChange={(e) => updateField('smtp_from_email', e.target.value)}
              placeholder="noreply@pandamarket.tn"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Make sure your email provider has verified this sender address / domain.
        </p>
      </section>

      {/* Test Connection */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Test Connection</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Verify your SMTP settings by testing the connection. Optionally send a test email.
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Test Recipient (optional)
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="admin@pandamarket.tn"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784] transition-colors"
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing' || !form.smtp_host}
            className="flex items-center gap-2 px-5 py-2 bg-[#1A1A2E] text-white rounded-lg text-sm font-medium hover:bg-[#25253D] transition-all active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
          >
            {testStatus === 'testing' ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testStatus !== 'idle' && testStatus !== 'testing' && (
          <div
            className={`mt-4 flex items-start gap-2 p-3 rounded-lg text-sm ${
              testStatus === 'success'
                ? 'bg-[#16C784]/5 border border-[#16C784]/20 text-[#16C784]'
                : 'bg-red-50 border border-red-100 text-red-700'
            }`}
          >
            {testStatus === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{testMessage}</span>
          </div>
        )}
      </section>

      {/* Info Box */}
      <section className="bg-[#1A1A2E]/5 rounded-xl border border-[#1A1A2E]/10 p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">How it works</h4>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-[#16C784] mt-0.5">•</span>
            The email worker reads this configuration dynamically — no restart needed.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#16C784] mt-0.5">•</span>
            Password is encrypted at rest using AES-256-GCM and never exposed in the UI.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#16C784] mt-0.5">•</span>
            When disabled, emails are logged to the console (useful for development).
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#16C784] mt-0.5">•</span>
            Environment variables (PD_SMTP_*) are used as fallback if no DB config is set.
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#16C784] mt-0.5">•</span>
            Recommended providers for Tunisia: Brevo (free tier: 300 emails/day) or Resend.
          </li>
        </ul>
      </section>
    </div>
  );
}
