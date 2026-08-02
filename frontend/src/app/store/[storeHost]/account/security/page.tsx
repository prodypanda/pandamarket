'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, Key, Laptop, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';

interface Session {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function StorefrontAccountSecurityPage() {
  const params = useParams();
  const storeHost = decodeURIComponent(params.storeHost as string);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  const [passForm, setPassForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  async function loadSessions() {
    try {
      const res = await fetchWithCsrf('/api/pd/storefront/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || data.data || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, [storeHost]);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPassError('');
    setPassMessage('');

    if (passForm.new_password !== passForm.confirm_password) {
      setPassError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (passForm.new_password.length < 8) {
      setPassError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setPassSubmitting(true);

    try {
      const res = await fetchWithCsrf('/api/pd/storefront/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: passForm.old_password,
          new_password: passForm.new_password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPassError(data?.error?.message || 'Erreur lors de la modification du mot de passe.');
        setPassSubmitting(false);
        return;
      }

      setPassMessage('Mot de passe mis à jour avec succès.');
      setPassForm({ old_password: '', new_password: '', confirm_password: '' });
      await loadSessions();
    } catch {
      setPassError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setPassSubmitting(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    if (!confirm('Voulez-vous vraiment révoquer cette session ?')) return;
    try {
      const res = await fetchWithCsrf(`/api/pd/storefront/auth/sessions/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        await loadSessions();
      }
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Password Change Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-4 mb-6">
          <Key className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-gray-900">Modifier le mot de passe</h1>
        </div>

        {passMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {passMessage}
          </div>
        )}

        {passError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500" />
            {passError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Mot de passe actuel</label>
            <input
              type="password"
              value={passForm.old_password}
              onChange={(e) => setPassForm((prev) => ({ ...prev, old_password: e.target.value }))}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Nouveau mot de passe (8 car. min)</label>
            <input
              type="password"
              value={passForm.new_password}
              onChange={(e) => setPassForm((prev) => ({ ...prev, new_password: e.target.value }))}
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={passForm.confirm_password}
              onChange={(e) => setPassForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={passSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#16C784] text-white font-bold text-sm rounded-xl hover:bg-[#14b576] transition-colors disabled:opacity-60"
          >
            {passSubmitting ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>

      {/* Active Sessions Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 border-b pb-4 mb-6">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Sessions & Appareils connectés</h2>
        </div>

        {sessions.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune session active enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => (
              <div key={sess.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{sess.user_agent || 'Appareil inconnu'}</p>
                    <p className="text-xs text-gray-500">
                      IP : {sess.ip_address || 'Inconnue'} • Connecté le {new Date(sess.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Révoquer la session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
