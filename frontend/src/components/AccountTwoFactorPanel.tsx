'use client';

import { fetchWithCsrf } from '@/lib/api';
import { createQrCodeSvg } from '@/lib/qr-code';
import { CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TwoFactorStatus {
  enabled: boolean;
  recovery_codes_remaining: number;
  enabled_at: string | null;
  last_used_at: string | null;
}

interface TwoFactorSetup {
  secret: string;
  formatted_secret: string;
  otpauth_url: string;
  expires_in: number;
}

interface AccountTwoFactorPanelProps {
  compact?: boolean;
  accentClass?: string;
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || fallback;
  } catch {
    return fallback;
  }
}

export function AccountTwoFactorPanel({ compact = false, accentClass = 'bg-[#16C784]' }: AccountTwoFactorPanelProps) {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [qrCodeSvg, setQrCodeSvg] = useState('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeError, setQrCodeError] = useState('');

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/2fa/status', { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to load 2FA status'));
      const data = await res.json();
      setStatus(data.data || data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (!setup?.otpauth_url) {
      setQrCodeSvg('');
      setQrCodeError('');
      setQrCodeLoading(false);
      return;
    }

    let cancelled = false;
    setQrCodeLoading(true);
    setQrCodeError('');
    void createQrCodeSvg(setup.otpauth_url)
      .then((svg) => {
        if (!cancelled) setQrCodeSvg(svg);
      })
      .catch(() => {
        if (!cancelled) {
          setQrCodeSvg('');
          setQrCodeError('QR code generation failed. Use the manual setup key below.');
        }
      })
      .finally(() => {
        if (!cancelled) setQrCodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [setup?.otpauth_url]);

  async function startSetup() {
    setBusy(true);
    setMessage('');
    setError('');
    setRecoveryCodes([]);
    try {
      const res = await fetchWithCsrf('/api/pd/auth/2fa/setup', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Failed to start 2FA setup'));
      const data = await res.json();
      setSetup(data.data || data.setup);
      setMessage('Add this key to your authenticator app, then enter the generated code.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start 2FA setup');
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: confirmCode }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Invalid authentication code'));
      const data = await res.json();
      setStatus(data.status || data.data?.status);
      setRecoveryCodes(data.recovery_codes || data.data?.recovery_codes || []);
      setSetup(null);
      setConfirmCode('');
      setMessage('Two-factor authentication is now enabled. Save your recovery codes in a safe place.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function disableTwoFactor() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: disableCode }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Invalid authentication code'));
      const data = await res.json();
      setStatus(data.data || data.status);
      setDisableCode('');
      setRecoveryCodes([]);
      setMessage('Two-factor authentication has been disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage('Copied to clipboard.');
    } catch {
      setMessage('Copy failed. Select and copy manually.');
    }
  }

  return (
    <section className={`rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm ${compact ? '' : 'sm:p-6'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
            <ShieldCheck className="h-4 w-4" />
            Account security
          </div>
          <h2 className="mt-3 text-xl font-black text-gray-900">Two-factor authentication</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Optional extra protection for login. Use Google Authenticator, 1Password, Authy, Microsoft Authenticator, or any TOTP app.
          </p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${status?.enabled ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
          {status?.enabled ? <CheckCircle2 className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          {status?.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {(message || error) && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {error || message}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading security status...
        </div>
      ) : status?.enabled ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4 text-sm">
              <p className="font-black text-gray-900">Recovery codes remaining</p>
              <p className="mt-1 text-gray-500">{status.recovery_codes_remaining}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-sm">
              <p className="font-black text-gray-900">Last used</p>
              <p className="mt-1 text-gray-500">{status.last_used_at ? new Date(status.last_used_at).toLocaleString() : 'Never'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <label className="mb-2 block text-sm font-black text-red-900">Disable 2FA</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                placeholder="Authenticator or recovery code"
                className="flex-1 rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-red-300"
              />
              <button
                type="button"
                onClick={disableTwoFactor}
                disabled={busy || !disableCode.trim()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      ) : setup ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4 text-center">
              <p className="text-sm font-black text-gray-900">Scan QR code</p>
              <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-gray-100">
                {qrCodeLoading ? (
                  <div className="flex h-56 w-56 items-center justify-center text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : qrCodeSvg ? (
                  <div
                    role="img"
                    aria-label="Two-factor authentication QR code"
                    className="mx-auto h-56 w-56"
                    dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                  />
                ) : (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl bg-gray-50 px-4 text-xs font-bold text-gray-400">
                    QR unavailable
                  </div>
                )}
              </div>
              {qrCodeError && <p className="mt-2 text-xs font-bold text-red-600">{qrCodeError}</p>}
              <p className="mt-3 text-xs font-semibold leading-5 text-gray-500">
                Open your authenticator app and scan this code.
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-black text-gray-900">Manual setup key</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-black tracking-wider text-gray-800 ring-1 ring-gray-100">{setup.formatted_secret}</code>
                <button type="button" onClick={() => copyText(setup.secret)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-black text-gray-600 hover:bg-gray-50">
                  <Copy className="h-4 w-4" />
                  Copy key
                </button>
              </div>
              <p className="mt-3 break-all text-xs font-semibold text-gray-400">{setup.otpauth_url}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={confirmCode}
              onChange={(event) => setConfirmCode(event.target.value)}
              placeholder="6-digit code"
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-800 outline-none focus:border-[#16C784]"
            />
            <button type="button" onClick={confirmSetup} disabled={busy || !confirmCode.trim()} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white disabled:opacity-60 ${accentClass}`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Confirm and enable
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startSetup} disabled={busy} className={`mt-5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white disabled:opacity-60 ${accentClass}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Enable 2FA
        </button>
      )}

      {recoveryCodes.length > 0 && (
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">Save these recovery codes now</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recoveryCodes.map((code) => (
              <code key={code} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-amber-900 ring-1 ring-amber-100">{code}</code>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
