'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserPlus, Store, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    store_name: '',
    subdomain: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const res = await fetch('/api/pd/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          role: 'Vendor',
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Registration failed');
        return;
      }

      // Create store
      const storeRes = await fetch('/api/pd/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.tokens.access_token}`,
        },
        body: JSON.stringify({
          name: form.store_name,
          subdomain: form.subdomain,
        }),
      });
      if (!storeRes.ok) {
        const storeData = await storeRes.json();
        setError(storeData.error?.message || 'Store creation failed');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F0F23] to-[#1A1A2E] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/hub" className="inline-block">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#16C784] to-[#1EE69A]">
              🐼 PandaMarket
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-[#16C784]' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-[#16C784]' : 'bg-gray-200'}`} />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 1 ? 'Créer votre compte' : 'Créer votre boutique'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1
              ? 'Étape 1/2 — Informations personnelles'
              : 'Étape 2/2 — Informations de la boutique'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784]"
                      placeholder="Mohamed"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784]"
                      placeholder="Ben Salah"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784]"
                    placeholder="votre@email.tn"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784]"
                    placeholder="+216 XX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784] pr-10"
                      placeholder="Min. 8 caractères"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la boutique
                  </label>
                  <input
                    type="text"
                    value={form.store_name}
                    onChange={(e) => updateField('store_name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784]"
                    placeholder="Ma Super Boutique"
                    required
                    minLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784]"
                      placeholder="ma-boutique"
                      required
                      minLength={3}
                      pattern="^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$"
                    />
                    <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">
                      .pandamarket.tn
                    </span>
                  </div>
                </div>

                <div className="bg-[#16C784]/5 rounded-lg p-4 border border-[#16C784]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-5 h-5 text-[#16C784]" />
                    <span className="font-semibold text-gray-900">Plan Gratuit</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Commencez gratuitement avec 10 produits et 15% de commission.
                    Upgradez à tout moment pour 0% de commission.
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Retour
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b576] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : step === 1 ? (
                  'Continuer →'
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Créer ma boutique
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-[#16C784] font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
