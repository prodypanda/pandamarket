'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/pd/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }
      // Redirect based on role
      if (data.user.role === 'Admin' || data.user.role === 'SuperAdmin') {
        window.location.href = '/dashboard';
      } else if (data.user.store_id) {
        window.location.href = '/hub/dashboard';
      } else {
        window.location.href = '/hub';
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F0F23] to-[#1A1A2E] px-4">
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h1>
          <p className="text-gray-500 text-sm mb-6">
            Connectez-vous à votre compte PandaMarket.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784] transition-all"
                placeholder="votre@email.tn"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/30 focus:border-[#16C784] transition-all pr-10"
                  placeholder="••••••••"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" className="rounded border-gray-300 text-[#16C784] focus:ring-[#16C784]" />
                Se souvenir de moi
              </label>
              <a href="#" className="text-[#16C784] hover:underline font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#16C784] text-white font-semibold rounded-lg hover:bg-[#14b576] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Se connecter
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
                <span className="bg-white px-4 text-gray-400">ou</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-[#16C784] font-semibold hover:underline">
                Créer ma boutique →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
