'use client';

import { fetchWithCsrf } from '@/lib/api';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, BarChart3, Eye, EyeOff, Rocket, ShieldCheck, Store, UserPlus } from 'lucide-react';
import { useLocale } from '../../../contexts/LocaleContext';
import { getSellerTypeOptions, type SellerTypeValue } from '../../../lib/seller-type';

export default function RegisterPage() {
  const { t } = useLocale();
  const sellerTypes = getSellerTypeOptions(t);
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    store_name: '',
    subdomain: '',
    seller_type: 'retailer' as SellerTypeValue,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sellerBenefits = [
    { label: 'Boutique prête', icon: Store },
    { label: 'Wallet vendeur', icon: BarChart3 },
    { label: 'Accès sécurisé', icon: ShieldCheck },
  ];

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan')?.trim().toLowerCase();
    setSelectedPlan(plan || 'free');
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'store_name' && !form.subdomain) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);
      setForm((prev) => ({ ...prev, subdomain: slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Register user
      const res = await fetchWithCsrf('/api/pd/auth/register/vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || 'Registration failed');
        return;
      }

      const accessToken = data?.tokens?.access_token;
      const storeHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (accessToken) {
        storeHeaders.Authorization = `Bearer ${accessToken}`;
      }

      const storeRes = await fetchWithCsrf('/api/pd/stores', {
        method: 'POST',
        headers: storeHeaders,
        credentials: 'include',
        body: JSON.stringify({
          name: form.store_name,
          subdomain: form.subdomain,
          seller_type: form.seller_type,
          plan: selectedPlan,
        }),
      });
      if (!storeRes.ok) {
        const storeData = await storeRes.json().catch(() => null);
        setError(storeData?.error?.message || 'Store creation failed');
        return;
      }

      window.location.href = '/hub/dashboard';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.26),transparent_34%),linear-gradient(135deg,#111827,#431407_54%,#7c2d12)] px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <Link href="/hub" className="inline-flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-sm font-black backdrop-blur transition hover:bg-white/15">
            <span className="text-xl">🐼</span>
            PandaMarket
          </Link>
          <div className="mt-10 max-w-xl">
            <span className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-700 ring-1 ring-orange-100">
              Inscription vendeur
            </span>
            <h1 className="mt-6 text-5xl font-black leading-tight tracking-tight">
              Lancez votre boutique marketplace en deux étapes.
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/72">
              Créez votre compte vendeur, réservez votre sous-domaine et commencez à piloter vos produits, commandes et revenus.
            </p>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            {sellerBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <Icon className="h-6 w-6 text-orange-400" />
                  <p className="mt-4 text-sm font-bold text-white/86">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mx-auto w-full max-w-md">
        {/* Logo */}
        <div className="mb-7 text-center lg:hidden">
          <Link href="/hub" className="inline-flex items-center gap-2 text-2xl font-black">
            <span>🐼</span>
            PandaMarket
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-[2rem] border border-white/70 bg-white p-7 text-gray-950 shadow-2xl shadow-black/25 sm:p-8">
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`} />
          </div>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-100">
            <Rocket className="h-3.5 w-3.5" />
            {step === 1 ? 'Compte vendeur' : 'Boutique'}
          </div>

          <h1 className="mb-2 text-3xl font-black text-gray-950">
            {step === 1 ? 'Créer votre compte' : 'Créer votre boutique'}
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            {step === 1
              ? 'Étape 1/2 — Informations personnelles'
              : 'Étape 2/2 — Informations de la boutique'}
          </p>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">Prénom</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      placeholder="Mohamed"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">Nom</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      placeholder="Ben Salah"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    placeholder="votre@email.tn"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    placeholder="+216 XX XXX XXX"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      placeholder="Min. 8 caractères"
                      required
                      minLength={8}
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
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Nom de la boutique
                  </label>
                  <input
                    type="text"
                    value={form.store_name}
                    onChange={(e) => updateField('store_name', e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    placeholder="Ma Super Boutique"
                    required
                    minLength={2}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Sous-domaine
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={form.subdomain}
                      onChange={(e) =>
                        updateField(
                          'subdomain',
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        )
                      }
                      className="min-w-0 flex-1 rounded-l-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                      placeholder="ma-boutique"
                      required
                      minLength={3}
                      pattern="^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$"
                    />
                    <span className="rounded-r-2xl border border-l-0 border-gray-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                      .pandamarket.tn
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <label className="mb-3 block text-sm font-bold text-gray-700">
                    {t('sellerTypes.title')}
                  </label>
                  <div className="grid gap-2">
                    {sellerTypes.map((sellerType) => {
                      const selected = form.seller_type === sellerType.value;
                      return (
                        <label
                          key={sellerType.value}
                          className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                            selected
                              ? 'border-orange-400 bg-white shadow-lg shadow-orange-500/10 ring-4 ring-orange-100'
                              : 'border-orange-100 bg-orange-50/50 hover:border-orange-200 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="seller_type"
                            value={sellerType.value}
                            checked={selected}
                            onChange={(e) => updateField('seller_type', e.target.value)}
                            className="sr-only"
                            required
                          />
                          <span className="flex items-start gap-3">
                            <span
                              className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                selected ? 'border-orange-500 bg-orange-500' : 'border-orange-200 bg-white'
                              }`}
                            >
                              {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </span>
                            <span>
                              <span className="block text-sm font-black text-gray-950">{sellerType.label}</span>
                              <span className="mt-0.5 block text-xs leading-5 text-gray-500">{sellerType.description}</span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Store className="h-5 w-5 text-orange-500" />
                    <span className="font-semibold text-gray-900">Plan sélectionné</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Votre boutique sera créée avec le plan {selectedPlan}. Seuls les plans actuellement activés peuvent être choisis.
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-2xl bg-gray-100 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Retour
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 font-black text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : step === 1 ? (
                  'Continuer →'
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Créer ma boutique
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/login/seller" className="font-bold text-orange-600 hover:underline">
                Se connecter
              </Link>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Acheteur ?{' '}
              <Link href="/register/buyer" className="font-bold text-[#16C784] hover:underline">
                Créer un compte acheteur
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-white/70">
          <BadgeCheck className="h-4 w-4 text-orange-300" />
          Compte vendeur sécurisé et isolé
        </div>
      </div>
      </div>
    </div>
  );
}
