'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, MonitorSmartphone, ShieldAlert, XCircle } from 'lucide-react';

interface AccountSession {
  id: string;
  ip?: string | null;
  user_agent?: string | null;
  device_label?: string | null;
  last_event_type?: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

interface LoginEvent {
  id: string;
  event_type: string;
  success: boolean;
  failure_reason?: string | null;
  ip?: string | null;
  device_label?: string | null;
  created_at: string;
}

interface SecurityActivityResponse {
  sessions?: AccountSession[];
  events?: LoginEvent[];
  current_session_id?: string | null;
  data?: {
    sessions?: AccountSession[];
    events?: LoginEvent[];
    current_session_id?: string | null;
  };
}

interface AccountSecurityActivityPanelProps {
  compact?: boolean;
  accentClass?: string;
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function eventLabel(type: string) {
  switch (type) {
    case 'login_success': return 'Connexion réussie';
    case 'login_failed': return 'Connexion échouée';
    case 'login_2fa_challenge': return 'Code 2FA demandé';
    case 'login_2fa_success': return 'Connexion 2FA réussie';
    case 'register_login': return 'Inscription et connexion';
    case 'refresh': return 'Session prolongée';
    case 'logout': return 'Déconnexion';
    case 'password_reset_requested': return 'Réinitialisation demandée';
    case 'password_reset': return 'Mot de passe réinitialisé';
    case '2fa_enabled': return '2FA activée';
    case '2fa_disabled': return '2FA désactivée';
    case 'session_revoked': return 'Session révoquée';
    default: return type.replace(/_/g, ' ');
  }
}

export function AccountSecurityActivityPanel({ compact = false, accentClass = 'bg-[#16C784]' }: AccountSecurityActivityPanelProps) {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/security/activity', { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Impossible de charger l’activité de sécurité'));
      const payload = await res.json() as SecurityActivityResponse;
      setSessions(payload.data?.sessions || payload.sessions || []);
      setEvents(payload.data?.events || payload.events || []);
      setCurrentSessionId(payload.data?.current_session_id || payload.current_session_id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger l’activité de sécurité');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const revokeSession = async (sessionId: string) => {
    setBusySessionId(sessionId);
    setMessage('');
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/security/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Impossible de révoquer la session'));
      setMessage('Session révoquée.');
      await loadActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de révoquer la session');
    } finally {
      setBusySessionId(null);
    }
  };

  const revokeOtherSessions = async () => {
    setBusySessionId('others');
    setMessage('');
    setError('');
    try {
      const res = await fetchWithCsrf('/api/pd/auth/security/sessions/revoke-others', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Impossible de révoquer les autres sessions'));
      const data = await res.json();
      setMessage(`${Number(data.revoked || 0).toLocaleString('fr-FR')} autre(s) session(s) révoquée(s).`);
      await loadActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de révoquer les autres sessions');
    } finally {
      setBusySessionId(null);
    }
  };

  return (
    <div className={`rounded-3xl border border-gray-100 bg-white shadow-sm ${compact ? 'p-5' : 'p-6'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
            <MonitorSmartphone className="h-4 w-4" />
            Activité de sécurité
          </div>
          <h2 className="mt-3 text-xl font-black text-gray-900">Sessions et connexions</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Consultez les sessions actives, les appareils récents et les événements sensibles de votre compte.
          </p>
        </div>
        <button type="button" onClick={() => void loadActivity()} disabled={loading} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white disabled:opacity-60 ${accentClass}`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
          Actualiser
        </button>
      </div>

      {message && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div>}
      {error && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">Sessions actives</h3>
          {sessions.length > 1 && (
            <button type="button" onClick={() => void revokeOtherSessions()} disabled={busySessionId === 'others'} className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 disabled:opacity-60">
              {busySessionId === 'others' ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
              Révoquer les autres sessions
            </button>
          )}
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-gray-500">Chargement...</div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">Aucune session active trouvée.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-gray-900">
                        {session.device_label || 'Appareil inconnu'}
                        {session.id === currentSessionId && (
                          <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">Actuelle</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">IP: {session.ip || 'N/A'}</p>
                      <p className="mt-1 text-xs text-gray-500">Dernière activité: {formatDate(session.last_seen_at)}</p>
                    </div>
                    <button type="button" onClick={() => void revokeSession(session.id)} disabled={busySessionId === session.id || session.id === currentSessionId} className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-white px-3 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-60">
                      {busySessionId === session.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                      Révoquer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-500">Événements récents</h3>
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-bold text-gray-500">Chargement...</div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">Aucun événement récent.</div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, compact ? 8 : 12).map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className={`mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${event.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {event.success ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-gray-900">{eventLabel(event.event_type)}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(event.created_at)} · {event.device_label || event.ip || 'Contexte inconnu'}</p>
                    {event.failure_reason && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        {event.failure_reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
