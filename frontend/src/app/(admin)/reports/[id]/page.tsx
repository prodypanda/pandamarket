'use client';

import { fetchWithCsrf } from '@/lib/api';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Download, Loader2, MessageSquare, Paperclip, Send, ShieldAlert, Upload, XCircle } from 'lucide-react';

type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';
type ReportMessageVisibility = 'buyer_admin' | 'seller_admin' | 'all_parties' | 'admin_internal';

interface Report {
  id: string;
  reporter_email?: string | null;
  target_user_email?: string | null;
  store_name?: string | null;
  store_subdomain?: string | null;
  target_type: 'seller' | 'buyer';
  order_id: string | null;
  category: string;
  priority: string;
  reason: string;
  status: ReportStatus;
  admin_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

interface ReportMessage {
  id: string;
  author_email?: string | null;
  author_role: string;
  visibility: ReportMessageVisibility;
  body: string;
  created_at: string;
}

interface ReportAttachment {
  id: string;
  message_id: string | null;
  visibility: ReportMessageVisibility;
  file_url: string | null;
  file_key: string | null;
  file_name: string;
  file_size: number | string | null;
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
  open: { label: 'Open', className: 'bg-red-50 text-red-700 ring-red-100', icon: AlertTriangle },
  investigating: { label: 'Investigating', className: 'bg-yellow-50 text-yellow-700 ring-yellow-100', icon: Clock },
  awaiting_buyer: { label: 'Awaiting buyer', className: 'bg-blue-50 text-blue-700 ring-blue-100', icon: MessageSquare },
  awaiting_seller: { label: 'Awaiting seller', className: 'bg-purple-50 text-purple-700 ring-purple-100', icon: ShieldAlert },
  resolved: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: CheckCircle },
  dismissed: { label: 'Dismissed', className: 'bg-gray-100 text-gray-600 ring-gray-200', icon: XCircle },
};

const visibilityOptions: Array<{ value: ReportMessageVisibility; label: string; helper: string }> = [
  { value: 'buyer_admin', label: 'Buyer ↔ Admin', helper: 'Buyer can read, seller cannot.' },
  { value: 'seller_admin', label: 'Seller ↔ Admin', helper: 'Seller can read, buyer cannot.' },
  { value: 'all_parties', label: 'All parties', helper: 'Buyer, seller, and admins can read.' },
  { value: 'admin_internal', label: 'Internal note', helper: 'Only admins can read.' },
];

function formatSize(size: number | string | null) {
  const value = Number(size || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function visibilityClass(visibility: ReportMessageVisibility) {
  if (visibility === 'buyer_admin') return 'bg-blue-50 text-blue-700 ring-blue-100';
  if (visibility === 'seller_admin') return 'bg-purple-50 text-purple-700 ring-purple-100';
  if (visibility === 'all_parties') return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  return 'bg-slate-900 text-white ring-slate-900';
}

export default function AdminReportCasePage() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [details, setDetails] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<ReportMessageVisibility>('buyer_admin');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/reports/${reportId}`);
      if (!res.ok) throw new Error('Report case not found');
      const data = await res.json();
      setDetails(data);
      if (data.report?.target_type === 'seller') setVisibility('seller_admin');
      if (data.report?.target_type === 'buyer') setVisibility('buyer_admin');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to load case');
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
      if (!presignRes.ok) throw new Error(presignData.error?.message || 'Upload refused');
      const uploadRes = await fetch(presignData.upload_url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`);
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
      const res = await fetchWithCsrf(`/api/pd/admin/reports/${reportId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility, body: body.trim() || 'Attachments added.', attachments }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to send message');
      setDetails(data);
      setBody('');
      setFiles([]);
      setFeedback('Message added to the case.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Send failed');
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

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] bg-white shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[#16C784]" />
      </div>
    );
  }

  if (!report || !config) {
    return <div className="rounded-[2rem] bg-white p-10 text-center text-gray-500 shadow-sm">{feedback || 'Report case not found.'}</div>;
  }

  return (
    <div className="space-y-6">
      <Link href="/reports" className="inline-flex items-center gap-2 text-sm font-black text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <aside className="space-y-5">
          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${config.className}`}>
              <StatusIcon className="h-4 w-4" />
              {config.label}
            </span>
            <h1 className="mt-5 text-2xl font-black text-gray-900">{report.store_name || report.target_user_email || 'Marketplace case'}</h1>
            <p className="mt-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-gray-400">#{report.id}</p>
            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <p><span className="font-black text-gray-900">Reporter:</span> {report.reporter_email || 'Unknown'}</p>
              <p><span className="font-black text-gray-900">Target:</span> {report.target_type}</p>
              <p><span className="font-black text-gray-900">Category:</span> {report.category}</p>
              <p><span className="font-black text-gray-900">Priority:</span> {report.priority}</p>
              {report.order_id && <p><span className="font-black text-gray-900">Order:</span> #{report.order_id.slice(-8).toUpperCase()}</p>}
              <p><span className="font-black text-gray-900">Created:</span> {new Date(report.created_at).toLocaleString('fr-TN')}</p>
            </div>
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">{report.reason}</div>
            {report.admin_notes && <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">{report.admin_notes}</div>}
          </section>

          <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-black text-gray-900">Audit timeline</h2>
            <div className="space-y-3">
              {details.events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
                  <p className="font-black text-gray-700">{event.event_type.replaceAll('_', ' ')}</p>
                  <p>{event.actor_email || 'System'} · {new Date(event.created_at).toLocaleString('fr-TN')}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-6">
            <h2 className="text-xl font-black text-gray-900">Case conversations</h2>
            <p className="mt-1 text-sm text-gray-500">Choose each message visibility carefully before sending.</p>
          </div>

          <div className="max-h-[560px] space-y-4 overflow-y-auto p-6">
            {details.messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">No messages yet.</div>
            ) : details.messages.map((message) => (
              <div key={message.id} className="rounded-2xl bg-gray-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-gray-400">
                  <span>{message.author_email || message.author_role}</span>
                  <span>{new Date(message.created_at).toLocaleString('fr-TN')}</span>
                </div>
                <span className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${visibilityClass(message.visibility)}`}>{message.visibility.replaceAll('_', ' ')}</span>
                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{message.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {details.attachments.filter((attachment) => attachment.message_id === message.id).map((attachment) => (
                    <button key={attachment.id} type="button" onClick={() => openAttachment(attachment)} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-gray-600 ring-1 ring-gray-200 hover:text-gray-900">
                      <Download className="h-3.5 w-3.5" />
                      {attachment.file_name} {formatSize(attachment.file_size)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitMessage} className="border-t border-gray-100 bg-gray-50 p-6">
            {feedback && <div className="mb-4 rounded-2xl bg-white p-3 text-sm font-bold text-gray-600 ring-1 ring-gray-100">{feedback}</div>}
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              {visibilityOptions.map((option) => (
                <label key={option.value} className={`cursor-pointer rounded-2xl border p-4 transition ${visibility === option.value ? 'border-[#16C784] bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input type="radio" className="sr-only" value={option.value} checked={visibility === option.value} onChange={() => setVisibility(option.value)} />
                  <span className="block text-sm font-black text-gray-900">{option.label}</span>
                  <span className="mt-1 block text-xs font-semibold text-gray-500">{option.helper}</span>
                </label>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder="Write an update, request more information, or add an internal note..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-[#16C784]"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-600 hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Attach files
                <input type="file" multiple className="hidden" onChange={onFileChange} accept="image/*,application/pdf,text/plain" />
              </label>
              <button type="submit" disabled={submitting || (!body.trim() && files.length === 0)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#16C784] px-6 py-3 text-sm font-black text-white disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Add message
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
    </div>
  );
}
