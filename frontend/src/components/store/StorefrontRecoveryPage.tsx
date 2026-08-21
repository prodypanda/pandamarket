'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';

type RecoveryMode = 'forgot' | 'reset' | 'verify';

interface StoreData {
  id: string;
  name: string;
  settings?: {
    colors?: { primary?: string; secondary?: string };
  };
}

interface StorefrontRecoveryPageProps {
  mode: RecoveryMode;
}

function normalizeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/checkout';
  return value;
}

export function StorefrontRecoveryPage({ mode }: StorefrontRecoveryPageProps) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const storeHost = decodeURIComponent(params.storeHost as string);
  const requestedStoreId = searchParams.get('store_id');
  const token = searchParams.get('token') || '';
  const next = normalizeNext(searchParams.get('next'));

  const [store, setStore] = useState<StoreData | null>(null);
  const [routeBase, setRouteBase] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const verifyStarted = useRef(false);

  useEffect(() => {
    setRouteBase(window.location.pathname.startsWith('/store/') ? `/store/${encodeURIComponent(storeHost)}` : '');
  }, [storeHost]);

  useEffect(() => {
    async function loadStore() {
      try {
        const response = await fetchWithCsrf(`/api/pd/stores/by-host/${encodeURIComponent(storeHost)}`);
        if (!response.ok) {
          setError('Boutique introuvable ou indisponible.');
          return;
        }
        const data = await response.json();
        setStore(data.store || null);
        if (!data.store) setError('Boutique introuvable ou indisponible.');
      } catch {
        setError('Impossible de charger cette boutique.');
      } finally {
        setLoading(false);
      }
    }
    void loadStore();
  }, [storeHost]);

  const primaryColor = store?.settings?.colors?.primary || '#16a34a';
  const storeMismatch = Boolean(store && requestedStoreId && requestedStoreId !== store.id);
  const title = mode === 'forgot'
    ? 'Mot de passe oublié'
    : mode === 'reset'
      ? 'Choisir un nouveau mot de passe'
      : 'Vérifier votre adresse email';
  const description = mode === 'forgot'
    ? 'Saisissez votre email. Si un compte existe dans cette boutique, vous recevrez un lien de réinitialisation.'
    : mode === 'reset'
      ? 'Choisissez un mot de passe d’au moins 8 caractères. Le lien de réinitialisation est valable une heure.'
      : 'Nous allons vérifier le lien reçu par email et activer votre compte client dans cette boutique.';

  const route = (path: string) => `${routeBase}${path}`;
  const loginHref = `${route('/login')}?next=${encodeURIComponent(next)}`;

  async function postRecovery(endpoint: string, body: Record<string, string>): Promise<boolean> {
    const response = await fetchWithCsrf(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) return true;
    const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    setError(data?.error?.message || 'Impossible de continuer.');
    return false;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!store || storeMismatch) return;
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      if (mode === 'forgot') {
        const ok = await postRecovery('/api/pd/storefront/auth/forgot-password', {
          store_id: store.id,
          email: email.trim(),
        });
        if (ok) {
          setMessage('Si un compte existe avec cette adresse, un email de réinitialisation vient d’être envoyé. Vérifiez aussi vos courriers indésirables.');
        }
      } else if (mode === 'reset') {
        if (!token) {
          setError('Le lien de réinitialisation est incomplet ou invalide.');
        } else if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.');
        } else {
          const ok = await postRecovery('/api/pd/storefront/auth/reset-password', {
            store_id: store.id,
            token,
            password,
          });
          if (ok) {
            setMessage('Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.');
            window.setTimeout(() => router.replace(loginHref), 900);
          }
        }
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!store || storeMismatch || !email.trim()) {
      setError('Saisissez l’adresse email utilisée pour votre compte.');
      return;
    }
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const ok = await postRecovery('/api/pd/storefront/auth/resend-verification', {
        store_id: store.id,
        email: email.trim(),
      });
      if (ok) setMessage('Si le compte existe et n’est pas encore vérifié, un nouvel email a été envoyé.');
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (mode !== 'verify' || loading || !store || storeMismatch || !token || verifyStarted.current) return;
    verifyStarted.current = true;
    setSubmitting(true);
    setError('');
    void postRecovery('/api/pd/storefront/auth/verify-email', { store_id: store.id, token })
      .then((ok) => {
        if (ok) setMessage('Votre adresse email est vérifiée. Vous pouvez maintenant vous connecter.');
      })
      .catch(() => setError('Erreur réseau. Veuillez réessayer.'))
      .finally(() => setSubmitting(false));
  }, [loading, mode, store, storeMismatch, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <Link href={routeBase || '/'} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: primaryColor }}>
          <ArrowLeft className="h-4 w-4" />
          Retour à la boutique
        </Link>

        <div className="flex items-start gap-3">
          <div className="rounded-2xl p-3" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
            {mode === 'verify' ? <ShieldCheck className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        {store?.name && <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">{store.name}</p>}

        {storeMismatch && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Ce lien appartient à une autre boutique. Demandez un nouveau lien depuis la boutique d’origine.</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {mode === 'verify' ? (
          <div className="mt-7 space-y-4">
            {!token && <p className="text-sm text-slate-600">Le lien de vérification ne contient pas de jeton valide.</p>}
            <div className="border-t border-slate-100 pt-5">
              <label htmlFor="recovery_email" className="block text-xs font-semibold text-slate-700 mb-1">Renvoyer le lien de vérification</label>
              <input
                id="recovery_email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="votre@email.com"
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
              />
              <button
                type="button"
                onClick={() => void resendVerification()}
                disabled={submitting || !store || storeMismatch}
                className="mt-3 w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Veuillez patienter...' : 'Renvoyer le lien'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {mode === 'forgot' ? (
              <div>
                <label htmlFor="recovery_email" className="block text-xs font-semibold text-slate-700 mb-1">Adresse email</label>
                <input
                  id="recovery_email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="votre@email.com"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="recovery_password" className="block text-xs font-semibold text-slate-700 mb-1">Nouveau mot de passe</label>
                  <input
                    id="recovery_password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="recovery_confirm_password" className="block text-xs font-semibold text-slate-700 mb-1">Confirmer le mot de passe</label>
                  <input
                    id="recovery_confirm_password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:ring-2"
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={submitting || !store || storeMismatch}
              className="w-full rounded-2xl px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {submitting ? 'Veuillez patienter...' : mode === 'forgot' ? 'Envoyer le lien' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}

        <div className="mt-7 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          <Link href={loginHref} className="font-semibold" style={{ color: primaryColor }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
