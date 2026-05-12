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
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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
  const isAdmin = variant === 'admin';
  const accent = isAdmin ? '#7C3AED' : '#F97316';
  const accentSoft = isAdmin ? 'bg-violet-50 text-violet-700 ring-violet-100' : 'bg-orange-50 text-orange-700 ring-orange-100';
  const pageBg = isAdmin
    ? 'bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),linear-gradient(135deg,#020617,#111827_52%,#312e81)]'
    : 'bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_35%),linear-gradient(135deg,#111827,#431407_55%,#7c2d12)]';
  const heroTitle = isAdmin ? 'Centre de contrôle marketplace' : 'Espace vendeur haute performance';
  const heroText = isAdmin
    ? 'Surveillez les vendeurs, les retraits, les mandats et les paramètres clés depuis un accès sécurisé.'
    : 'Retrouvez vos commandes, revenus, produits et outils de croissance dans un tableau de bord pensé pour vendre plus vite.';
  const heroItems = isAdmin
    ? [
      { label: 'Accès sécurisé', icon: ShieldCheck },
      { label: 'Pilotage global', icon: BarChart3 },
      { label: 'Audit marketplace', icon: LockKeyhole },
    ]
    : [
      { label: 'Boutique en ligne', icon: Store },
      { label: 'Revenus & wallet', icon: BarChart3 },
      { label: 'Outils vendeurs', icon: Sparkles },
    ];
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
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#020617] px-4 py-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(124,58,237,0.34),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(14,165,233,0.22),transparent_25%),radial-gradient(circle_at_70%_86%,rgba(217,70,239,0.16),transparent_30%),linear-gradient(135deg,#020617,#070b1d_46%,#111827)]" />
        <div className="admin-vault-grid absolute -inset-20 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="admin-vault-dots absolute inset-0 [background-image:radial-gradient(circle_at_center,rgba(34,211,238,0.24)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="admin-vault-orb absolute -left-28 top-1/3 h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="admin-vault-orb-delayed absolute -right-28 bottom-8 h-96 w-96 rounded-full bg-fuchsia-500/12 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 lg:block">
          <div className="admin-vault-ring absolute inset-0 rounded-full border border-cyan-200/10 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
          <div className="admin-vault-ring-reverse absolute inset-16 rounded-full border border-violet-300/15 [mask-image:linear-gradient(to_top,black,transparent_72%)]" />
          <div className="admin-vault-breathe absolute inset-36 rounded-full border border-fuchsia-300/20 bg-white/[0.02]" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col">
          <div className="flex items-center justify-between gap-4">
            <Link href={logoHref} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-black shadow-2xl shadow-violet-950/30 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.12] hover:shadow-cyan-950/30">
              <span className="text-xl">🐼</span>
              <span>PandaMarket</span>
              <span className="hidden rounded-full bg-violet-400/15 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-violet-100 sm:inline">
                Vault
              </span>
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200 shadow-lg shadow-emerald-950/20 backdrop-blur-xl sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
              Secure channel armed
            </div>
          </div>

          <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1.06fr_0.94fr]">
            <section className="admin-vault-panel relative">
              <div className="absolute -left-8 top-10 hidden h-32 w-1 rounded-full bg-gradient-to-b from-cyan-300 via-violet-400 to-transparent shadow-[0_0_32px_rgba(34,211,238,0.45)] lg:block" />
              <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-violet-100 shadow-xl shadow-violet-950/30 backdrop-blur transition duration-300 hover:border-cyan-200/35 hover:bg-cyan-300/10">
                Superadmin zero-trust portal
              </span>
              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
                Enter the world&apos;s most secure marketplace <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">vault.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
                This is the critical control plane for PandaMarket. Every credential is challenged, every route is restricted, and every privileged session enters through a hardened administrative gateway.
              </p>

              <div aria-hidden="true" className="relative mt-12 hidden h-48 max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-cyan-950/20 backdrop-blur-xl lg:block">
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(34,211,238,0.10),transparent)]" />
                <div className="admin-vault-ring absolute left-10 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full border border-cyan-200/15" />
                <div className="admin-vault-ring-reverse absolute left-20 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full border border-fuchsia-200/15" />
                <div className="absolute right-8 top-1/2 h-1 w-44 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-transparent shadow-[0_0_32px_rgba(34,211,238,0.45)]" />
                <div className="admin-vault-orb absolute right-24 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-cyan-300/20 blur-xl" />
              </div>
            </section>

            <div className="admin-vault-card relative mx-auto w-full max-w-md">
              <div className="absolute -inset-1 rounded-[2.25rem] bg-gradient-to-br from-cyan-300/35 via-violet-500/45 to-fuchsia-500/30 opacity-80 blur-xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-slate-950/[0.88] p-7 shadow-2xl shadow-black/50 backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:border-cyan-200/25 hover:shadow-[0_28px_90px_rgba(8,47,73,0.45)] sm:p-8">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />
                <div className="relative">
                  <div className="mb-7 flex items-start justify-between gap-5">
                    <div>
                      <span className="inline-flex rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
                        Clearance required
                      </span>
                      <h2 className="mt-5 text-3xl font-black tracking-tight text-white">{title}</h2>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{subtitle}</p>
                    </div>
                    <div className="admin-vault-breathe flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-violet-300/20 bg-violet-400/10">
                      <LockKeyhole className="h-8 w-8 text-violet-100" />
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-semibold text-red-100">
                      {error}
                    </div>
                  )}

                  <form onSubmit={twoFactorChallengeId ? handleTwoFactorSubmit : handleSubmit} className="space-y-5">
                    {twoFactorChallengeId ? (
                      <div className="group">
                        <label className="mb-2 block text-sm font-black text-slate-200">Authenticator code</label>
                        <div className="relative">
                          <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-200 transition duration-300 group-focus-within:text-cyan-200 group-focus-within:drop-shadow-[0_0_10px_rgba(34,211,238,0.65)]" />
                          <input
                            type="text"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.08] focus:border-cyan-200/55 focus:bg-white/[0.10] focus:ring-4 focus:ring-cyan-300/10"
                            placeholder="123456 or recovery code"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="group">
                          <label className="mb-2 block text-sm font-black text-slate-200">Authorized email</label>
                          <div className="relative">
                            <Fingerprint className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-200 transition duration-300 group-focus-within:text-cyan-200 group-focus-within:drop-shadow-[0_0_10px_rgba(34,211,238,0.65)]" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 pl-11 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.08] focus:border-cyan-200/55 focus:bg-white/[0.10] focus:ring-4 focus:ring-cyan-300/10"
                              placeholder="superadmin@pandamarket.tn"
                              required
                            />
                          </div>
                        </div>

                        <div className="group">
                          <label className="mb-2 block text-sm font-black text-slate-200">Master passphrase</label>
                          <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-200 transition duration-300 group-focus-within:text-cyan-200 group-focus-within:drop-shadow-[0_0_10px_rgba(34,211,238,0.65)]" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 pl-11 pr-12 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 hover:border-white/20 hover:bg-white/[0.08] focus:border-cyan-200/55 focus:bg-white/[0.10] focus:ring-4 focus:ring-cyan-300/10"
                              placeholder="••••••••••••"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-200"
                              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <Link href="/forgot-password" className="font-bold text-cyan-200 transition hover:text-cyan-100 hover:underline">
                            Recover credentials
                          </Link>
                          <Link href="/hub" className="font-semibold text-slate-500 transition hover:text-slate-300">
                            Exit perimeter
                          </Link>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="admin-vault-button group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 px-5 py-4 font-black text-white shadow-[0_22px_60px_rgba(124,58,237,0.34)] transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_26px_70px_rgba(34,211,238,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
                      {loading ? (
                        <div className="relative h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <>
                          <LogIn className="relative h-4 w-4" />
                          <span className="relative">{twoFactorChallengeId ? 'Verify second factor' : 'Unlock secure portal'}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-4 py-10 text-white ${pageBg}`}>
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <Link href={logoHref} className="inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-sm font-black backdrop-blur transition hover:bg-white/15">
            <span className="text-xl">🐼</span>
            PandaMarket
          </Link>
          <div className="mt-10 max-w-xl">
            <span className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ring-1 ${accentSoft}`}>
              {isAdmin ? 'Superadmin' : 'Vendeur'}
            </span>
            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight">{heroTitle}</h1>
            <p className="mt-5 text-lg leading-8 text-white/72">{heroText}</p>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            {heroItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <Icon className="h-6 w-6" style={{ color: accent }} />
                  <p className="mt-4 text-sm font-bold text-white/86">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-7 text-center lg:hidden">
            <Link href={logoHref} className="inline-flex items-center gap-2 text-2xl font-black">
              <span>🐼</span>
              PandaMarket
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white p-7 text-gray-950 shadow-2xl shadow-black/25 sm:p-8">
            <div className="mb-7">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${accentSoft}`}>
                {isAdmin ? 'Accès protégé' : 'Dashboard vendeur'}
              </span>
              <h1 className="mt-4 text-3xl font-black text-gray-950">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p>
            </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={twoFactorChallengeId ? handleTwoFactorSubmit : handleSubmit} className="space-y-5">
            {twoFactorChallengeId ? (
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">Code 2FA</label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-transparent focus:bg-white focus:ring-2"
                  style={{ '--tw-ring-color': `${accent}40` } as React.CSSProperties}
                  placeholder="123456 ou code de secours"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-transparent focus:bg-white focus:ring-2"
                    style={{ '--tw-ring-color': `${accent}40` } as React.CSSProperties}
                    placeholder="votre@email.tn"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-950 outline-none transition-all focus:border-transparent focus:bg-white focus:ring-2"
                      style={{ '--tw-ring-color': `${accent}40` } as React.CSSProperties}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="font-bold hover:underline" style={{ color: accent }}>
                    Mot de passe oublié ?
                  </Link>
                  <Link href="/hub" className="text-gray-500 hover:text-gray-700">
                    Retour au hub
                  </Link>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-black text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: accent, boxShadow: `0 18px 40px ${accent}33` }}
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
                <Link href={registerHref} className="font-bold hover:underline" style={{ color: accent }}>
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
