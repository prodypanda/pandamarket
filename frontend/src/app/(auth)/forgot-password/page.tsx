'use client';

import { fetchWithCsrf } from '@/lib/api';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { MarketplaceBrand } from '@/components/MarketplaceBrand';

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});

  useEffect(() => {
    let cancelled = false;
    async function fetchMarketplaceSettings() {
      try {
        const res = await fetchWithCsrf('/api/pd/marketplace/settings', { credentials: 'include' });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setMarketplaceSettings(data.data || {});
        }
      } catch {
        if (!cancelled) setMarketplaceSettings({});
      }
    }
    fetchMarketplaceSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetchWithCsrf('/api/pd/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error?.message || 'An error occurred');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const surface =
    'radial-gradient(circle at 16% 14%, rgba(249,115,22,0.16), transparent 38%), radial-gradient(circle at 86% 88%, rgba(217,119,6,0.08), transparent 42%), linear-gradient(180deg, #0c0a09, #1a1208 60%, #0c0a09)';

  if (sent) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0c0a09] px-4 py-10 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: surface }} />
        <div className="auth-card relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col items-center justify-center gap-6">
          <MarketplaceBrand
            href="/hub"
            marketplaceName={marketplaceSettings.marketplace_name}
            marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
            marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
            marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
            logoSurface="dark"
            className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black shadow-xl shadow-black/30"
            imageClassName="h-8 max-w-[160px] object-contain"
            textClassName="text-sm font-black text-white"
            fallbackMarkClassName="text-xl"
            showTextWithLogo
          />
          <div className="relative w-full overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-8 text-center text-gray-950 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/10">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </span>
            <h1 className="mt-5 text-2xl font-black tracking-[-0.02em] text-gray-950">Vérifiez votre email</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Si un compte existe pour <strong className="font-semibold text-gray-700">{email}</strong>, nous avons envoyé un lien de
              réinitialisation.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0a09] px-4 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: surface }} />
      <div className="auth-card relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col items-center justify-center gap-6">
        <MarketplaceBrand
          href="/hub"
          marketplaceName={marketplaceSettings.marketplace_name}
          marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
          marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
          marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
          logoSurface="dark"
          className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black shadow-xl shadow-black/30"
          imageClassName="h-8 max-w-[160px] object-contain"
          textClassName="text-sm font-black text-white"
          fallbackMarkClassName="text-xl"
          showTextWithLogo
        />
        <div className="relative w-full overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-7 text-gray-950 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-[-0.02em] text-gray-950">Mot de passe oublié ?</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Entrez votre email et nous vous enverrons un lien de réinitialisation.
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="group">
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/60 transition group-focus-within:text-orange-500" />
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                  placeholder="votre@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(249,115,22,0.55)] transition-all duration-200 hover:bg-orange-600 hover:shadow-[0_16px_40px_-10px_rgba(249,115,22,0.65)] active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                'Envoyer le lien'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition hover:text-orange-700 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
