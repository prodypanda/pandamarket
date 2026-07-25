'use client';

import { fetchWithCsrf } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Eye, EyeOff, Heart, LogIn, PackageCheck, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';

const BUYER_NEXT_PREFIXES = [
  '/hub/account',
  '/hub/profile',
  '/hub/orders',
  '/hub/messages',
  '/hub/wishlist',
  '/hub/cart',
  '/hub/checkout',
  '/hub/products',
  '/hub/search',
];

function getSafeBuyerNext(): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next?.startsWith('/') || next.startsWith('//')) return null;
  if (next === '/hub') return next;
  return BUYER_NEXT_PREFIXES.some((prefix) => next === prefix || next.startsWith(`${prefix}/`)) ? next : null;
}

export default function LoginPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const features = [
    { label: 'Commandes suivies', icon: PackageCheck },
    { label: 'Wishlist privée', icon: Heart },
    { label: 'Paiement protégé', icon: ShieldCheck },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithCsrf('/api/pd/auth/login/customer', {
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
      window.location.href = getSafeBuyerNext() || '/hub/account';
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
      window.location.href = getSafeBuyerNext() || '/hub/account';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(22,199,132,0.20),transparent_32%),linear-gradient(135deg,#f8fffb,#eefcf4_45%,#dff8eb)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <Link href="/hub" className="inline-flex items-center gap-3 rounded-full bg-white/70 px-5 py-3 text-sm font-black text-gray-950 shadow-sm ring-1 ring-emerald-100 backdrop-blur">
            <span className="text-xl">🐼</span>
            PandaMarket
          </Link>
          <div className="mt-10 max-w-xl">
            <span className="inline-flex rounded-full bg-[#16C784]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0f9f69] ring-1 ring-[#16C784]/15">
              Espace acheteur
            </span>
            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight text-gray-950">
              Retrouvez vos achats en un clin d&apos;œil.
            </h1>
            <p className="mt-5 text-lg leading-8 text-gray-600">
              Connectez-vous pour suivre vos commandes, gérer vos adresses, sauvegarder vos produits favoris et reprendre votre panier.
            </p>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-emerald-100 bg-white/75 p-5 shadow-sm backdrop-blur">
                  <Icon className="h-6 w-6 text-[#16C784]" />
                  <p className="mt-4 text-sm font-bold text-gray-700">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mx-auto w-full max-w-md">
        {/* Logo */}
        <div className="mb-7 text-center lg:hidden">
          <Link href="/hub" className="inline-flex items-center gap-2 text-2xl font-black text-gray-950">
            <span>🐼</span>
            PandaMarket
          </Link>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-emerald-950/10 ring-1 ring-emerald-100">
          <div className="bg-gradient-to-r from-[#16C784] to-[#1EE69A] p-6 text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Connexion client</p>
                <h1 className="mt-2 text-3xl font-black">{t('auth.login.title')}</h1>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18">
                <ShoppingBag className="h-7 w-7" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/82">{t('common.appName')} · compte acheteur marketplace</p>
          </div>

          <div className="p-7 sm:p-8">

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
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
                  placeholder="123456 ou code de secours"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('auth.login.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
                    placeholder="votre@email.tn"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">{t('auth.login.password')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-950 outline-none transition-all focus:border-[#16C784] focus:bg-white focus:ring-4 focus:ring-[#16C784]/10"
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
                  <label className="flex items-center gap-2 text-gray-600">
                    <input type="checkbox" className="rounded border-gray-300 text-[#16C784] focus:ring-[#16C784]" />
                    {t('common.save')}
                  </label>
                  <Link href="/forgot-password" className="font-bold text-[#16C784] hover:underline">
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16C784] px-5 py-3.5 font-black text-white shadow-lg shadow-[#16C784]/25 transition-all hover:-translate-y-0.5 hover:bg-[#14b576] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {twoFactorChallengeId ? 'Vérifier le code' : t('auth.login.submit')}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-4 text-gray-400">{t('common.or')}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {t('auth.login.noAccount')}{' '}
              <Link href="/register/buyer" className="text-[#16C784] font-semibold hover:underline">
                Créer un compte acheteur →
              </Link>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Vendeur ?{' '}
              <Link href="/login/seller" className="font-bold text-orange-600 hover:underline">
                Connectez-vous ici
              </Link>
              .
            </p>
          </div>
        </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
          <BadgeCheck className="h-4 w-4 text-[#16C784]" />
          Connexion sécurisée avec cookies HTTP-only
        </div>
      </div>
    </div>
    </div>
  );
}
