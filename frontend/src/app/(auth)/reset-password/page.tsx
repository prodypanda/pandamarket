'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (!token) {
      setError('Token de réinitialisation manquant');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pd/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setSuccess(true);
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

  if (success) {
    return (
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-[#16C784]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-[#16C784]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Mot de passe réinitialisé</h1>
        <p className="text-gray-500 mb-6">
          Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
        </p>
        <Link
          href="/login"
          className="inline-block px-8 py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] transition-colors"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau mot de passe</h1>
        <p className="text-gray-500 mt-2">Choisissez un nouveau mot de passe sécurisé.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 caractères"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Confirmez votre mot de passe"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-[#16C784] focus:ring-1 focus:ring-[#16C784] outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#16C784] text-white font-semibold rounded-xl hover:bg-[#14b876] transition-colors disabled:opacity-50"
        >
          {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <Suspense fallback={<div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-pulse" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
