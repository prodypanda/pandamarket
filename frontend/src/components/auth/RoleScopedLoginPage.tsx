'use client';

import { fetchWithCsrf } from '@/lib/api';
import {
  BarChart3,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MarketplaceBrand } from '../MarketplaceBrand';

type LoginVariant = 'seller' | 'admin';

interface RoleScopedLoginPageProps {
  title: string;
  subtitle: string;
  endpoint: string;
  defaultRedirect: string;
  logoHref?: string;
  registerHref?: string;
  registerLabel?: string;
  allowedNextPrefixes: string[];
  variant?: LoginVariant;
}

interface MarketplaceSettings {
  marketplace_name?: string;
  marketplace_logo_url?: string;
  marketplace_logo_light_url?: string;
  marketplace_logo_dark_url?: string;
}

function getSafeNext(allowedPrefixes: string[]): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next?.startsWith('/') || next.startsWith('//')) return null;
  return allowedPrefixes.some((prefix) => next === prefix || next.startsWith(`${prefix}/`)) ? next : null;
}

export function RoleScopedLoginPage({
  title,
  subtitle,
  endpoint,
  defaultRedirect,
  logoHref = '/hub',
  registerHref,
  registerLabel,
  allowedNextPrefixes,
  variant = 'seller',
}: RoleScopedLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings>({});
  const isAdmin = variant === 'admin';
  const heroTitle = isAdmin ? 'Centre de contrôle marketplace' : 'Espace vendeur haute performance';
  const heroText = isAdmin
    ? 'Surveillez les vendeurs, les retraits, les mandats et les paramètres clés depuis un accès sécurisé.'
    : 'Retrouvez vos commandes, revenus, produits et outils de croissance dans un tableau de bord pensé pour vendre plus vite.';
  const heroItems = isAdmin
    ? [
      { label: 'Accès sécurisé', detail: 'Accès protégé et chiffré.', icon: ShieldCheck },
      { label: 'Pilotage global', detail: 'Vendeurs, finance et audit.', icon: BarChart3 },
      { label: 'Audit marketplace', detail: 'Traçabilité des actions.', icon: LockKeyhole },
    ]
    : [
      { label: 'Boutique en ligne', detail: 'Votre vitrine, prête à vendre.', icon: Store },
      { label: 'Revenus & wallet', detail: 'Ventes, revenus et paiements.', icon: BarChart3 },
      { label: 'Outils vendeurs', detail: 'Croissance et gestion intégrées.', icon: Sparkles },
    ];
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
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithCsrf(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || 'Login failed');
        return;
      }
      if (data?.requires_2fa && data.challenge_id) {
        setTwoFactorChallengeId(data.challenge_id);
        setPassword('');
        return;
      }
      window.location.href = getSafeNext(allowedNextPrefixes) || defaultRedirect;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorChallengeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: twoFactorChallengeId, code: twoFactorCode }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || 'Invalid authentication code');
        return;
      }
      window.location.href = getSafeNext(allowedNextPrefixes) || defaultRedirect;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    const ledger = [
      { icon: ShieldCheck, title: 'Two-factor verification', detail: 'Required on every admin session.' },
      { icon: LockKeyhole, title: 'Audit-logged sessions', detail: 'Every privileged action is recorded.' },
      { icon: Fingerprint, title: 'Encrypted in transit', detail: 'TLS end-to-end on each request.' },
    ];
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#070b1d] px-4 py-8 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 16% 12%, rgba(124,58,237,0.16), transparent 38%), radial-gradient(circle at 88% 92%, rgba(56,189,248,0.09), transparent 40%), linear-gradient(180deg, #070b1d, #0a0e22 60%, #070b1d)',
          }}
        />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
          <div className="flex items-center justify-between gap-4">
            <MarketplaceBrand
              href={logoHref}
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="dark"
              className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black shadow-xl shadow-black/30 transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
              imageClassName="h-8 max-w-[160px] object-contain"
              textClassName="text-sm font-black text-white"
              fallbackMarkClassName="text-xl"
              showTextWithLogo
            />
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/[0.06] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90 sm:flex">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
              Secure channel armed
            </div>
          </div>

          <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="admin-vault-panel relative hidden lg:block">
              <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.03em] text-white">
                Restricted access to the{' '}
                <span className="font-black text-violet-300">admin console.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300/90">
                The critical control surface for PandaMarket governance — vendors, finance, audit, and platform-critical controls. Every credential is challenged and every privileged session is audit-logged.
              </p>

              <ul className="mt-12 max-w-md divide-y divide-white/[0.06] border-t border-white/[0.06]">
                {ledger.map(({ icon: Icon, title, detail }) => (
                  <li key={title} className="flex items-start gap-4 py-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-400/[0.08]">
                      <Icon className="h-4 w-4 text-violet-200" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{title}</span>
                      <span className="mt-0.5 block text-sm text-slate-400">{detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="admin-vault-card relative mx-auto w-full max-w-md">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-7 shadow-[0_30px_80px_-24px_rgba(124,58,237,0.28)] backdrop-blur-xl sm:p-8">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />
                <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-violet-500/12 blur-3xl" />
                <div className="relative">
                  <div className="mb-7 flex items-start justify-between gap-5">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.02em] text-white">{title}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/[0.08]">
                      <LockKeyhole className="h-6 w-6 text-violet-200" />
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="mb-4 rounded-xl border border-red-400/25 bg-red-500/[0.08] px-3.5 py-3 text-sm font-medium text-red-200">
                      {error}
                    </div>
                  )}

                  <form onSubmit={twoFactorChallengeId ? handleTwoFactorSubmit : handleSubmit} className="space-y-5">
                    {twoFactorChallengeId ? (
                      <div className="group">
                        <label htmlFor="admin-otp" className="mb-2 block text-sm font-semibold text-slate-200">Authenticator code</label>
                        <div className="relative">
                          <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70 transition group-focus-within:text-violet-200" />
                          <input
                            id="admin-otp"
                            name="otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pl-11 text-sm text-white outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.06] focus:border-violet-300/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-400/15"
                            placeholder="123456 or recovery code"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="group">
                          <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-slate-200">Authorized email</label>
                          <div className="relative">
                            <Fingerprint className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70 transition group-focus-within:text-violet-200" />
                            <input
                              id="admin-email"
                              name="email"
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              autoFocus
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pl-11 text-sm text-white outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.06] focus:border-violet-300/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-400/15"
                              placeholder="superadmin@pandamarket.tn"
                              required
                            />
                          </div>
                        </div>

                        <div className="group">
                          <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-slate-200">Master passphrase</label>
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70 transition group-focus-within:text-violet-200" />
                            <input
                              id="admin-password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              enterKeyHint="go"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pl-11 pr-12 text-sm text-white outline-none transition duration-200 placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.06] focus:border-violet-300/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-violet-400/15"
                              placeholder="••••••••••••"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/40"
                              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <Link href="/forgot-password" className="font-semibold text-violet-300 transition hover:text-violet-200 hover:underline">
                            Recover credentials
                          </Link>
                          <Link href="/hub" className="font-medium text-slate-500 transition hover:text-slate-300">
                            Exit perimeter
                          </Link>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-violet-600 px-5 py-3.5 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(124,58,237,0.6)] transition-all duration-200 hover:bg-violet-500 hover:shadow-[0_16px_40px_-10px_rgba(124,58,237,0.7)] active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      {loading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          <span>{twoFactorChallengeId ? 'Verify second factor' : 'Unlock secure portal'}</span>
                        </>
                      )}
                    </button>
                  </form>

                  <p className="mt-6 text-center text-xs text-slate-500">
                    Sessions are protected with two-factor verification and audit logging.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c0a09] px-4 py-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 16% 14%, rgba(249,115,22,0.16), transparent 38%), radial-gradient(circle at 86% 88%, rgba(217,119,6,0.08), transparent 42%), linear-gradient(180deg, #0c0a09, #1a1208 60%, #0c0a09)',
        }}
      />
      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-panel relative hidden lg:block">
          <MarketplaceBrand
            href={logoHref}
            marketplaceName={marketplaceSettings.marketplace_name}
            marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
            marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
            marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
            logoSurface="dark"
            className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black shadow-xl shadow-black/30 transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
            imageClassName="h-8 max-w-[160px] object-contain"
            textClassName="text-sm font-black text-white"
            fallbackMarkClassName="text-xl"
            showTextWithLogo
          />
          <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.03em] text-white">
            {heroTitle}
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/70">{heroText}</p>
          <ul className="mt-12 max-w-md divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {heroItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-start gap-4 py-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-300/15 bg-orange-400/[0.08]">
                    <Icon className="h-4 w-4 text-orange-300" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{item.label}</span>
                    <span className="mt-0.5 block text-sm text-white/55">{item.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="auth-card relative mx-auto w-full max-w-md">
          <div className="mb-7 text-center lg:hidden">
            <MarketplaceBrand
              href={logoHref}
              marketplaceName={marketplaceSettings.marketplace_name}
              marketplaceLogoUrl={marketplaceSettings.marketplace_logo_url}
              marketplaceLogoLightUrl={marketplaceSettings.marketplace_logo_light_url}
              marketplaceLogoDarkUrl={marketplaceSettings.marketplace_logo_dark_url}
              logoSurface="dark"
              className="inline-flex justify-center text-2xl font-black"
              imageClassName="h-10 max-w-[180px] object-contain"
              textClassName="text-2xl font-black text-white"
              fallbackMarkClassName="text-2xl"
              showTextWithLogo
            />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-7 text-gray-950 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
            <div className="mb-7">
              <h1 className="text-2xl font-black tracking-[-0.02em] text-gray-950">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p>
            </div>

            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={twoFactorChallengeId ? handleTwoFactorSubmit : handleSubmit} className="space-y-5">
              {twoFactorChallengeId ? (
                <div className="group">
                  <label htmlFor="seller-otp" className="mb-2 block text-sm font-semibold text-gray-700">Code 2FA</label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/60 transition group-focus-within:text-orange-500" />
                    <input
                      id="seller-otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                      placeholder="123456 ou code de secours"
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="group">
                    <label htmlFor="seller-email" className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/60 transition group-focus-within:text-orange-500" />
                      <input
                        id="seller-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                        placeholder="votre@email.tn"
                        required
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label htmlFor="seller-password" className="mb-2 block text-sm font-semibold text-gray-700">Mot de passe</label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/60 transition group-focus-within:text-orange-500" />
                      <input
                        id="seller-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        enterKeyHint="go"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 pr-12 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Link href="/forgot-password" className="font-semibold text-orange-600 transition hover:text-orange-700 hover:underline">
                      Mot de passe oublié ?
                    </Link>
                    <Link href="/hub" className="font-medium text-gray-500 transition hover:text-gray-700">
                      Retour au hub
                    </Link>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(249,115,22,0.55)] transition-all duration-200 hover:bg-orange-600 hover:shadow-[0_16px_40px_-10px_rgba(249,115,22,0.65)] active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {twoFactorChallengeId ? 'Vérifier le code' : 'Se connecter'}
                  </>
                )}
              </button>
            </form>

            {registerHref && registerLabel && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ?{' '}
                  <Link href={registerHref} className="font-semibold text-orange-600 transition hover:text-orange-700 hover:underline">
                    {registerLabel} →
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
