'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Download, Loader2, MessageSquare, Paperclip, Send, Upload, XCircle } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';

type ReportStatus = 'open' | 'investigating' | 'awaiting_buyer' | 'awaiting_seller' | 'resolved' | 'dismissed';

interface Report {
  id: string;
  reporter_email?: string | null;
  store_name?: string | null;
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
  body: string;
  created_at: string;
}

interface ReportAttachment {
  id: string;
  message_id: string | null;
  file_url: string | null;
  file_key: string | null;
  file_name: string;
  file_size: number | string | null;
}

interface CaseDetails {
  report: Report;
  messages: ReportMessage[];
  attachments: ReportAttachment[];
}

const statusConfig: Record<ReportStatus, { className: string; icon: typeof AlertTriangle }> = {
  open: { className: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 ring-rose-200 dark:ring-rose-900/60', icon: AlertTriangle },
  investigating: { className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-900/60', icon: Clock },
  awaiting_buyer: { className: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 ring-blue-200 dark:ring-blue-900/60', icon: MessageSquare },
  awaiting_seller: { className: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 ring-purple-200 dark:ring-purple-900/60', icon: MessageSquare },
  resolved: { className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-900/60', icon: CheckCircle },
  dismissed: { className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-slate-200 dark:ring-slate-700', icon: XCircle },
};

function formatSize(size: number | string | null) {
  const value = Number(size || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VendorReportDetailPage() {
  const { t, locale, dir } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [details, setDetails] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/pd/reports/store/${reportId}`);
      if (!res.ok) throw new Error(t('dashboardPages.reportDetail.errorReportNotFound'));
      setDetails(await res.json());
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('dashboardPages.reportDetail.feedbackLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [reportId, t]);

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
      if (!presignRes.ok) throw new Error(presignData.error?.message || t('dashboardPages.reportDetail.errorUploadRefused'));
      const uploadRes = await fetch(presignData.upload_url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!uploadRes.ok) throw new Error(t('dashboardPages.reportDetail.errorUploadFailed', { name: file.name }));
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
      const res = await fetchWithCsrf(`/api/pd/reports/store/${reportId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() || t('dashboardPages.reportDetail.defaultBodyAttachments'), attachments }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.reportDetail.errorSendFailed'));
      setDetails(data);
      setBody('');
      setFiles([]);
      setFeedback(t('dashboardPages.reportDetail.feedbackResponseSent'));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : t('dashboardPages.reportDetail.feedbackSendFailed'));
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
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    );
  }

  if (!report || !config) {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-slate-500 dark:text-slate-400 shadow-2xs">
        {feedback || t('dashboardPages.reportDetail.reportNotFound')}
      </div>
    );
  }

  return (
    <div dir={dir} className="space-y-6">
      <Link href="/hub/dashboard/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition">
        <ArrowLeft className="h-4 w-4" />
        {t('dashboardPages.reportDetail.backToReports')}
      </Link>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.className}`}>
              <StatusIcon className="h-4 w-4" />
              {t(`dashboardPages.reportDetail.statuses.${report.status}`)}
            </span>
            <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.caseTitle', { id: report.id.slice(-8).toUpperCase() })}</h1>
            <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p><span className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.buyerLabel')}</span> {report.reporter_email || t('dashboardPages.reportDetail.buyerDefault')}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.categoryLabel')}</span> {report.category}</p>
              <p><span className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.priorityLabel')}</span> {report.priority}</p>
              {report.order_id && <p><span className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.orderLabel')}</span> #{report.order_id.slice(-8).toUpperCase()}</p>}
              <p><span className="font-semibold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.createdLabel')}</span> {new Date(report.created_at).toLocaleString(dateLocale)}</p>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{report.reason}</div>
            {report.admin_notes && <div className="mt-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 p-4 text-sm leading-6 text-blue-800 dark:text-blue-300">{report.admin_notes}</div>}
          </section>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="border-b border-slate-200/80 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.reportDetail.conversationTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.reportDetail.conversationSubtitle')}</p>
          </div>

          <div className="max-h-[520px] space-y-4 overflow-y-auto p-6">
            {details.messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.reportDetail.noMessages')}</div>
            ) : details.messages.map((message) => (
              <div key={message.id} className="rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                  <span>{message.author_email || message.author_role}</span>
                  <span>{new Date(message.created_at).toLocaleString(dateLocale)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{message.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {details.attachments.filter((attachment) => attachment.message_id === message.id).map((attachment) => (
                    <button key={attachment.id} type="button" onClick={() => openAttachment(attachment)} className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 hover:text-slate-900 dark:hover:text-white transition">
                      <Download className="h-3.5 w-3.5" />
                      {attachment.file_name} {formatSize(attachment.file_size)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitMessage} className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-6">
            {feedback && <div className="mb-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-2xs">{feedback}</div>}
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              placeholder={t('dashboardPages.reportDetail.responsePlaceholder')}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <Upload className="h-4 w-4" />
                {t('dashboardPages.reportDetail.attachFiles')}
                <input type="file" multiple className="hidden" onChange={onFileChange} accept="image/*,application/pdf,text/plain" />
              </label>
              <button type="submit" disabled={submitting || (!body.trim() && files.length === 0)} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-6 py-2.5 text-sm font-medium text-white shadow-2xs transition disabled:opacity-60">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('dashboardPages.reportDetail.sendResponse')}
              </button>
            </div>
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
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
