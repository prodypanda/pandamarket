'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, Clock3, Loader2, MonitorSmartphone, ShieldAlert, XCircle } from 'lucide-react';

interface AdminSecuritySession {
  id: string;
  ip?: string | null;
  device_label?: string | null;
  last_event_type?: string | null;
  created_at?: string | null;
  last_seen_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  revoked_reason?: string | null;
}

interface AdminSecurityEvent {
  id: string;
  event_type: string;
  success: boolean;
  failure_reason?: string | null;
  ip?: string | null;
  device_label?: string | null;
  created_at: string;
}

interface AdminSecurityAnomalyFlag {
  code: string;
  severity: 'low' | 'medium' | 'high';
  label: string;
  description: string;
  count?: number;
}

interface AdminSecuritySummary {
  active_sessions: number;
  revoked_sessions_7d: number;
  failed_logins_24h: number;
  distinct_success_ips_7d: number;
  two_factor_disabled_30d: number;
  password_resets_7d: number;
}

interface AdminSecurityPayload {
  sessions?: AdminSecuritySession[];
  events?: AdminSecurityEvent[];
  anomaly_flags?: AdminSecurityAnomalyFlag[];
  summary?: AdminSecuritySummary;
  data?: {
    sessions?: AdminSecuritySession[];
    events?: AdminSecurityEvent[];
    anomaly_flags?: AdminSecurityAnomalyFlag[];
    summary?: AdminSecuritySummary;
  };
}

interface AdminUserSecurityActivityPanelProps {
  userId: string;
  accentClass?: string;
}

const emptySummary: AdminSecuritySummary = {
  active_sessions: 0,
  revoked_sessions_7d: 0,
  failed_logins_24h: 0,
  distinct_success_ips_7d: 0,
  two_factor_disabled_30d: 0,
  password_resets_7d: 0,
};

async function getErrorMessage(res: Response, fallback = 'Request failed') {
  try {
    const data = await res.json();
    return data.error?.message || data.message || `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function eventLabel(type: string) {
  switch (type) {
    case 'login_success': return 'Login success';
    case 'login_failed': return 'Login failed';
    case 'login_2fa_challenge': return '2FA challenge';
    case 'login_2fa_success': return '2FA login success';
    case 'register_login': return 'Register + login';
    case 'refresh': return 'Session refreshed';
    case 'logout': return 'Logout';
    case 'password_reset_requested': return 'Password reset requested';
    case 'password_reset': return 'Password reset';
    case '2fa_enabled': return '2FA enabled';
    case '2fa_disabled': return '2FA disabled';
    case 'session_revoked': return 'Session revoked';
    case 'other_sessions_revoked': return 'Other sessions revoked';
    case 'security_activity_view': return 'Security viewed';
    default: return type.replace(/_/g, ' ');
  }
}

function severityClass(severity: AdminSecurityAnomalyFlag['severity']) {
  if (severity === 'high') return 'border-red-200 bg-red-50 text-red-700';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

export function AdminUserSecurityActivityPanel({ userId, accentClass = 'bg-slate-900' }: AdminUserSecurityActivityPanelProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<AdminSecuritySession[]>([]);
  const [events, setEvents] = useState<AdminSecurityEvent[]>([]);
  const [anomalies, setAnomalies] = useState<AdminSecurityAnomalyFlag[]>([]);
  const [summary, setSummary] = useState<AdminSecuritySummary>(emptySummary);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/users/${encodeURIComponent(userId)}/security-activity`, { credentials: 'include' });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Unable to load security activity'));
      const payload = await res.json() as AdminSecurityPayload;
      const data = payload.data || payload;
      setSessions(data.sessions || []);
      setEvents(data.events || []);
      setAnomalies(data.anomaly_flags || []);
      setSummary(data.summary || emptySummary);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load security activity');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const toggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !loaded) await loadActivity();
  };

  return (
    <div className="mt-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <button type="button" onClick={() => void toggleOpen()} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900">Security timeline</p>
            <p className="text-xs font-semibold text-gray-500">Admin-only sessions, events, and anomaly flags</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {anomalies.length > 0 && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-100">{anomalies.length} flag(s)</span>
          )}
          <ChevronDown className={`h-5 w-5 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-4 text-sm font-bold text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading security activity...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ['Active sessions', summary.active_sessions],
                  ['Revoked 7d', summary.revoked_sessions_7d],
                  ['Failures 24h', summary.failed_logins_24h],
                  ['IPs 7d', summary.distinct_success_ips_7d],
                  ['2FA disabled 30d', summary.two_factor_disabled_30d],
                  ['Password resets 7d', summary.password_resets_7d],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-gray-50 p-3">
                    <p className="text-lg font-black text-gray-900">{value}</p>
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {anomalies.length === 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    No anomaly flags
                  </span>
                ) : anomalies.map((flag) => (
                  <span key={flag.code} title={flag.description} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${severityClass(flag.severity)}`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {flag.label}{flag.count !== undefined ? ` (${flag.count})` : ''}
                  </span>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">Recent sessions</h3>
                  <div className="space-y-2">
                    {sessions.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No sessions recorded.</div>
                    ) : sessions.slice(0, 8).map((session) => (
                      <div key={session.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-gray-900">{session.device_label || 'Unknown device'}</p>
                            <p className="mt-1 text-xs font-semibold text-gray-500">IP: {session.ip || 'N/A'} · Last seen {formatDate(session.last_seen_at)}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${session.revoked_at ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {session.revoked_at ? 'Revoked' : 'Active'}
                          </span>
                        </div>
                        {session.revoked_reason && <p className="mt-2 text-xs font-bold text-red-600">Reason: {session.revoked_reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">Recent events</h3>
                  <div className="space-y-2">
                    {events.length === 0 ? (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No events recorded.</div>
                    ) : events.slice(0, 12).map((event) => (
                      <div key={event.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <div className={`mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ${event.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {event.success ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{eventLabel(event.event_type)}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-500">{formatDate(event.created_at)} · {event.device_label || event.ip || 'Unknown context'}</p>
                          {event.failure_reason && (
                            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                              <XCircle className="h-3 w-3" />
                              {event.failure_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => void loadActivity()} disabled={loading} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white disabled:opacity-60 ${accentClass}`}>
                <Clock3 className="h-4 w-4" />
                Refresh security timeline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
