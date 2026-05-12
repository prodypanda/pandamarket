'use client';

import { fetchWithCsrf } from '@/lib/api';
import { BadgeCheck, Eye, EyeOff, Gift, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function BuyerRegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordReady = form.password.length >= 8;
  const benefits = [
    { label: 'Offres personnalisées', icon: Gift },
    { label: 'Compte protégé', icon: ShieldCheck },
    { label: 'Wishlist & commandes', icon: Sparkles },
  ];

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithCsrf('/api/pd/auth/register/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error?.message || 'Registration failed');
        return;
      }

      window.location.href = '/hub/account';
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(255,122,0,0.18),transparent_34%),linear-gradient(135deg,#fffaf2,#fff7ed_45%,#ecfdf5)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="mx-auto w-full max-w-md lg:order-2">
          <div className="mb-7 text-center lg:hidden">
            <Link href="/hub" className="inline-flex items-center gap-2 text-2xl font-black text-gray-950">
              <span>🐼</span>
              PandaMarket
            </Link>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-orange-950/10 ring-1 ring-orange-100">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-[#16C784] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Nouveau client</p>
              <h1 className="mt-2 text-3xl font-black">Créer un compte acheteur</h1>
              <p className="mt-3 text-sm leading-6 text-white/82">Un seul compte pour vos commandes, favoris, adresses et avantages marketplace.</p>
            </div>

            <div className="p-7 sm:p-8">
              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">Prénom</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition-all focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
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
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <span className={`h-2 flex-1 rounded-full ${passwordReady ? 'bg-[#16C784]' : 'bg-gray-200'}`} />
                    {passwordReady ? 'Mot de passe prêt' : '8 caractères minimum'}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3.5 font-black text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Créer mon compte
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Déjà un compte ?{' '}
                  <Link href="/login/buyer" className="font-bold text-[#16C784] hover:underline">
                    Se connecter
                  </Link>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Pour vendre sur PandaMarket, utilisez{' '}
                  <Link href="/register/seller" className="font-bold text-orange-600 hover:underline">
                    l&apos;inscription vendeur
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
            <BadgeCheck className="h-4 w-4 text-orange-500" />
            Création sécurisée de compte client
          </div>
        </div>

        <section className="hidden lg:block">
          <Link href="/hub" className="inline-flex items-center gap-3 rounded-full bg-white/70 px-5 py-3 text-sm font-black text-gray-950 shadow-sm ring-1 ring-orange-100 backdrop-blur">
            <span className="text-xl">🐼</span>
            PandaMarket
          </Link>
          <div className="mt-10 max-w-xl">
            <span className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-orange-700 ring-1 ring-orange-200">
              Bienvenue sur le marketplace
            </span>
            <h2 className="mt-6 text-5xl font-black leading-tight tracking-tight text-gray-950">
              Créez votre espace d&apos;achat personnalisé.
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600">
              Votre compte acheteur regroupe vos commandes, vos adresses, vos favoris et votre panier sur une seule interface simple.
            </p>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
            {benefits.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-3xl border border-orange-100 bg-white/75 p-5 shadow-sm backdrop-blur">
                  <Icon className="h-6 w-6 text-orange-500" />
                  <p className="mt-4 text-sm font-bold text-gray-700">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
