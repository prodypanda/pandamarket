'use client';

import { fetchWithCsrf } from '@/lib/api';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, BarChart3, Eye, EyeOff, Mail, ShieldCheck, Store, UserPlus } from 'lucide-react';
import { MarketplaceBrand } from '@/components/MarketplaceBrand';
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
    { label: 'Boutique prête', detail: 'Votre vitrine en ligne, immédiate.', icon: Store },
    { label: 'Wallet vendeur', detail: 'Ventes, revenus et paiements suivis.', icon: BarChart3 },
    { label: 'Accès sécurisé', detail: 'Compte isolé et protégé.', icon: ShieldCheck },
  ];

  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get('plan')?.trim().toLowerCase();
    setSelectedPlan(plan || 'free');
  }, []);

  const [marketplaceSettings, setMarketplaceSettings] = useState<{
    marketplace_name?: string;
    marketplace_logo_url?: string;
    marketplace_logo_light_url?: string;
    marketplace_logo_dark_url?: string;
  }>({});
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

      if (selectedPlan && selectedPlan !== 'free') {
        window.location.href = `/hub/dashboard/subscription?plan=${selectedPlan}`;
      } else {
        window.location.href = '/hub/dashboard';
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            href="/hub"
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
            Lancez votre boutique marketplace en deux étapes.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-white/70">
            Créez votre compte vendeur, réservez votre sous-domaine et commencez à piloter vos produits, commandes et revenus.
          </p>
          <ul className="mt-12 max-w-md divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {sellerBenefits.map((item) => {
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
              href="/hub"
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

            {/* Step indicator */}
            <div className="mb-6 flex items-center gap-2">
              <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`} />
              <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`} />
            </div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              {step === 1 ? 'Étape 1/2 · Compte vendeur' : 'Étape 2/2 · Boutique'}
            </p>
            <h1 className="text-2xl font-black tracking-[-0.02em] text-gray-950">
              {step === 1 ? 'Créer votre compte' : 'Créer votre boutique'}
            </h1>
            <p className="mb-6 mt-1 text-sm text-gray-500">
              {step === 1 ? 'Informations personnelles' : 'Informations de la boutique'}
            </p>

          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="group">
                    <label htmlFor="first_name" className="mb-2 block text-sm font-semibold text-gray-700">Prénom</label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      autoComplete="given-name"
                      autoFocus
                      value={form.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                      placeholder="Mohamed"
                      required
                    />
                  </div>
                  <div className="group">
                    <label htmlFor="last_name" className="mb-2 block text-sm font-semibold text-gray-700">Nom</label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      autoComplete="family-name"
                      value={form.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                      placeholder="Ben Salah"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500/60 transition group-focus-within:text-orange-500" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                      placeholder="votre@email.tn"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-gray-700">Téléphone</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                    placeholder="+216 XX XXX XXX"
                  />
                </div>

                <div className="group">
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">Mot de passe</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      enterKeyHint="next"
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                      placeholder="Min. 8 caractères"
                      required
                      minLength={8}
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
              </>
            ) : (
              <>
                <div className="group">
                  <label htmlFor="store_name" className="mb-2 block text-sm font-semibold text-gray-700">
                    Nom de la boutique
                  </label>
                  <input
                    id="store_name"
                    name="store_name"
                    type="text"
                    autoComplete="organization-name"
                    value={form.store_name}
                    onChange={(e) => updateField('store_name', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                    placeholder="Ma Super Boutique"
                    required
                    minLength={2}
                  />
                </div>

                <div className="group">
                  <label htmlFor="subdomain" className="mb-2 block text-sm font-semibold text-gray-700">
                    Sous-domaine
                  </label>
                  <div className="flex items-center">
                    <input
                      id="subdomain"
                      name="subdomain"
                      type="text"
                      value={form.subdomain}
                      onChange={(e) =>
                        updateField(
                          'subdomain',
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        )
                      }
                      className="min-w-0 flex-1 rounded-l-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/15"
                      placeholder="ma-boutique"
                      required
                      minLength={3}
                      pattern="^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$"
                    />
                    <span className="rounded-r-xl border border-l-0 border-gray-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                      .garbage.team
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                  <label className="mb-3 block text-sm font-semibold text-gray-700">
                    {t('sellerTypes.title')}
                  </label>
                  <div className="grid gap-2">
                    {sellerTypes.map((sellerType) => {
                      const selected = form.seller_type === sellerType.value;
                      return (
                        <label
                          key={sellerType.value}
                          className={`cursor-pointer rounded-xl border p-3 transition-all ${
                            selected
                              ? 'border-orange-400 bg-white shadow-md shadow-orange-500/10 ring-2 ring-orange-100'
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
                              <span className="block text-sm font-bold text-gray-950">{sellerType.label}</span>
                              <span className="mt-0.5 block text-xs leading-5 text-gray-500">{sellerType.description}</span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <div className="mb-1 flex items-center gap-2">
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
                  className="rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40"
                >
                  Retour
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(249,115,22,0.55)] transition-all duration-200 hover:bg-orange-600 hover:shadow-[0_16px_40px_-10px_rgba(249,115,22,0.65)] active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
              <Link href="/login/seller" className="font-semibold text-orange-600 hover:underline">
                Se connecter
              </Link>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Acheteur ?{' '}
              <Link href="/register/buyer" className="font-semibold text-[#16C784] hover:underline">
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
