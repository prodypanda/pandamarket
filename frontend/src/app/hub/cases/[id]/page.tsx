'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Clock, Download, FileText, Loader2, MessageSquare, Paperclip, Send, Upload, XCircle, AlertTriangle } from 'lucide-react';
import { HubNavbar } from '../../../../components/hub/HubNavbar';
import { HubFooter } from '../../../../components/hub/HubFooter';
import { useMarketplaceTheme } from '../../../../hooks/useMarketplaceTheme';
import { fetchWithCsrf } from '../../../../lib/api';

type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  store_name?: string | null;
  order_id: string | null;
  category: string;
  priority: string;
  reason: string;
  status: ReportStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
}

interface ReportMessage {
  id: string;
  author_email?: string | null;
  author_role: string;
  body: string;
  created_at: string;
}

interface ReportAttachment {
  id: string;
  message_id: string | null;
  file_url: string | null;
  file_key: string | null;
  file_name: string;
  content_type: string;
  file_size: number | string | null;
  created_at: string;
}

interface ReportEvent {
  id: string;
  actor_email?: string | null;
  event_type: string;
  created_at: string;
}

interface CaseDetails {
  report: Report;
  messages: ReportMessage[];
  attachments: ReportAttachment[];
  events: ReportEvent[];
}

const statusConfig: Record<ReportStatus, { label: string; className: string; icon: typeof AlertTriangle }> = {
  open: { label: 'Ouvert', className: 'bg-red-50 text-red-700 ring-red-100', icon: AlertTriangle },
  investigating: { label: 'En analyse', className: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Clock },
  awaiting_buyer: { label: 'Action acheteur requise', className: 'bg-blue-50 text-blue-700 ring-blue-100', icon: MessageSquare },
  awaiting_seller: { label: 'Réponse vendeur attendue', className: 'bg-purple-50 text-purple-700 ring-purple-100', icon: MessageSquare },
  resolved: { label: 'Résolu', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: CheckCircle },
  dismissed: { label: 'Rejeté', className: 'bg-gray-100 text-gray-600 ring-gray-200', icon: XCircle },
};

function attachmentSize(size: number | string | null) {
  const value = Number(size || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BuyerCaseDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const { settings, classes, isAliExpress } = useMarketplaceTheme();
  const [details, setDetails] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const accentText = isAliExpress ? 'text-[#ff4747]' : 'text-[#16C784]';
  const accentBg = isAliExpress ? 'bg-[#ff4747]' : 'bg-[#16C784]';

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/reports/${reportId}`);
      if (res.status === 401) {
        window.location.href = `/login/buyer?next=/hub/cases/${reportId}`;
        return;
      }
      if (!res.ok) throw new Error('Dossier introuvable');
      setDetails(await res.json());
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Impossible de charger ce dossier');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []).slice(0, 10));
  }

  async function uploadFiles() {
    const attachments = [];
    for (const file of files) {
      const contentType = file.type || 'application/octet-stream';
      const presignRes = await fetchWithCsrf('/api/pd/files/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: contentType, file_size: file.size, purpose: 'report_evidence' }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error?.message || 'Upload refusé');
      const uploadRes = await fetch(presignData.upload_url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!uploadRes.ok) throw new Error(`Upload échoué pour ${file.name}`);
      attachments.push({ file_key: presignData.file_key, file_name: file.name, content_type: contentType, file_size: file.size });
    }
    return attachments;
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() && files.length === 0) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const attachments = await uploadFiles();
      const res = await fetchWithCsrf(`/api/pd/reports/${reportId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() || 'Pièces jointes ajoutées.', attachments }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Impossible d’ajouter votre message');
      setDetails(data);
      setBody('');
      setFiles([]);
      setFeedback('Information ajoutée au dossier.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Envoi échoué');
    } finally {
      setSubmitting(false);
    }
  }

  async function openAttachment(attachment: ReportAttachment) {
    if (attachment.file_url) {
      window.open(attachment.file_url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!attachment.file_key) return;
    const res = await fetchWithCsrf(`/api/pd/files/access?key=${encodeURIComponent(attachment.file_key)}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.download_url) window.open(data.download_url, '_blank', 'noopener,noreferrer');
  }

  const report = details?.report;
  const config = report ? statusConfig[report.status] : null;
  const StatusIcon = config?.icon || AlertTriangle;

  return (
    <div className={`min-h-screen ${classes.pageSoft}`}>
      <HubNavbar marketplaceName={settings.marketplace_name} marketplaceLogoUrl={settings.marketplace_logo_url} marketplaceTheme={settings.marketplace_theme} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/hub/cases" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Retour aux dossiers
        </Link>

        {loading ? (
          <div className={`${classes.panel} flex min-h-[420px] items-center justify-center`}>
            <Loader2 className={`h-8 w-8 animate-spin ${accentText}`} />
          </div>
        ) : !report || !config ? (
          <div className={`${classes.panel} p-10 text-center text-gray-500`}>{feedback || 'Dossier introuvable.'}</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.35fr]">
            <aside className="space-y-5">
              <section className={`${classes.panel} p-6`}>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
                  <StatusIcon className="h-4 w-4" />
                  {config.label}
                </span>
                <h1 className="mt-5 text-2xl font-black text-gray-900">{report.store_name || 'Dossier marketplace'}</h1>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">#{report.id.slice(-8).toUpperCase()}</p>
                <div className="mt-5 space-y-3 text-sm text-gray-600">
                  <p><span className="font-black text-gray-900">Catégorie:</span> {report.category}</p>
                  <p><span className="font-black text-gray-900">Priorité:</span> {report.priority}</p>
                  {report.order_id && <p><span className="font-black text-gray-900">Commande:</span> #{report.order_id.slice(-8).toUpperCase()}</p>}
                  <p><span className="font-black text-gray-900">Créé:</span> {new Date(report.created_at).toLocaleString('fr-TN')}</p>
                </div>
                <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">{report.reason}</div>
                {report.admin_notes && <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">{report.admin_notes}</div>}
              </section>

              <section className={`${classes.panel} p-6`}>
                <h2 className="mb-4 text-lg font-black text-gray-900">Chronologie</h2>
                <div className="space-y-3">
                  {details.events.map((event) => (
                    <div key={event.id} className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
                      <p className="font-black text-gray-700">{event.event_type.replaceAll('_', ' ')}</p>
                      <p>{new Date(event.created_at).toLocaleString('fr-TN')}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>

            <section className={`${classes.panel} overflow-hidden`}>
              <div className="border-b border-gray-100 p-6">
                <h2 className="text-xl font-black text-gray-900">Conversation avec marketplace</h2>
                <p className="mt-1 text-sm text-gray-500">Ces messages sont visibles par vous et l'équipe marketplace.</p>
              </div>

              <div className="max-h-[520px] space-y-4 overflow-y-auto p-6">
                {details.messages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">Aucun message pour le moment.</div>
                ) : details.messages.map((message) => (
                  <div key={message.id} className="rounded-2xl bg-gray-50 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-400">
                      <span>{message.author_email || message.author_role}</span>
                      <span>{new Date(message.created_at).toLocaleString('fr-TN')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{message.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {details.attachments.filter((attachment) => attachment.message_id === message.id).map((attachment) => (
                        <button key={attachment.id} type="button" onClick={() => openAttachment(attachment)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-gray-600 ring-1 ring-gray-200 hover:text-gray-900">
                          <Download className="h-3.5 w-3.5" />
                          {attachment.file_name} {attachmentSize(attachment.file_size)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={submitMessage} className="border-t border-gray-100 bg-gray-50 p-6">
                {feedback && <div className="mb-4 rounded-2xl bg-white p-3 text-sm font-bold text-gray-600 ring-1 ring-gray-100">{feedback}</div>}
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={4}
                  placeholder="Ajoutez des détails, une explication ou une mise à jour..."
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-600 hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    Ajouter des fichiers
                    <input type="file" multiple className="hidden" onChange={onFileChange} accept="image/*,application/pdf,text/plain" />
                  </label>
                  <button type="submit" disabled={submitting || (!body.trim() && files.length === 0)} className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black text-white disabled:opacity-60 ${accentBg}`}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer
                  </button>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {files.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
                        <Paperclip className="h-3 w-3" />
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </form>
            </section>
          </div>
        )}
      </main>
      <HubFooter {...settings} />
    </div>
  );
}
