'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

interface StoreData {
  id: string;
  name: string;
  settings?: {
    colors?: { primary?: string; secondary?: string };
  };
}

interface StorefrontAuthPageProps {
  mode: 'login' | 'register';
}

export function StorefrontAuthPage({ mode }: StorefrontAuthPageProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const next = searchParams.get('next') || '/checkout';
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [routeBase, setRouteBase] = useState('');

  useEffect(() => {
    async function loadStore() {
      try {
        const res = await fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`);
        if (res.ok) {
          const data = await res.json();
          setStore(data.store);
        } else {
          setError('Boutique introuvable ou indisponible.');
        }
      } catch {
        setError('Impossible de charger cette boutique.');
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [storeHost]);

  useEffect(() => {
    if (window.location.pathname.startsWith('/store/')) {
      setRouteBase(`/store/${encodeURIComponent(storeHost)}`);
    }
  }, [storeHost]);

  const primaryColor = store?.settings?.colors?.primary || '#16a34a';
  const title = mode === 'login' ? 'Connexion client' : 'Créer un compte client';
  const submitLabel = mode === 'login' ? 'Se connecter' : 'Créer mon compte';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!store) return;
    setError('');
    setSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/api/pd/storefront/auth/login' : '/api/pd/storefront/auth/register';
      const payload = mode === 'login'
        ? { store_id: store.id, email: form.email, password: form.password }
        : { store_id: store.id, ...form };
      const res = await fetchWithCsrf(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message || 'Impossible de continuer.');
        setSubmitting(false);
        return;
      }

      router.replace(next.startsWith('/') ? next : `${routeBase}/checkout`);
      router.refresh();
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <Link href={routeBase || '/'} className="mb-8 inline-flex text-sm font-semibold" style={{ color: primaryColor }}>
          Retour à la boutique
        </Link>
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {store?.name ? `Connectez-vous à votre compte client ${store.name}.` : 'Connectez-vous à votre compte client.'}
        </p>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input
                value={form.first_name}
                onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                required
                placeholder="Prénom"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
              />
              <input
                value={form.last_name}
                onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                required
                placeholder="Nom"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
              />
            </div>
          )}
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
            type="email"
            placeholder="Email"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
          />
          <input
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
            minLength={mode === 'register' ? 8 : 1}
            type="password"
            placeholder="Mot de passe"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
          />
          {mode === 'register' && (
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Téléphone"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
            />
          )}
          <button
            type="submit"
            disabled={submitting || !store}
            className="w-full rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? 'Veuillez patienter...' : submitLabel}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {mode === 'login' ? (
            <span>
              Nouveau client ?{' '}
              <Link href={`${routeBase}/register?next=${encodeURIComponent(next)}`} className="font-semibold" style={{ color: primaryColor }}>
                Créer un compte
              </Link>
            </span>
          ) : (
            <span>
              Déjà client ?{' '}
              <Link href={`${routeBase}/login?next=${encodeURIComponent(next)}`} className="font-semibold" style={{ color: primaryColor }}>
                Se connecter
              </Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
