'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  updated_at: string;
};

type SellerStatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_seller' | 'waiting_admin' | 'resolved' | 'closed';

function asSellerStatusFilter(value: string): SellerStatusFilter {
  const allowed: SellerStatusFilter[] = ['all', 'open', 'in_progress', 'waiting_seller', 'waiting_admin', 'resolved', 'closed'];
  return (allowed as string[]).includes(value) ? (value as SellerStatusFilter) : 'all';
}

type TicketMessage = {
  id: string;
  body: string;
  created_at: string;
  is_internal?: boolean;
};

type TicketAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

export default function SellerSupportPage() {
  const { t, locale, dir } = useLocale();
  const dateLocale = locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-US' : 'fr-TN';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentMimeType, setAttachmentMimeType] = useState('application/octet-stream');
  const [attachmentSizeBytes, setAttachmentSizeBytes] = useState('0');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SellerStatusFilter>('all');

  async function loadTickets() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: '1', limit: '20' });
      if (statusFilter !== 'all') query.set('status', statusFilter);
      const res = await fetchWithCsrf(`/api/pd/support/me?${query.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.support.errorLoadTickets'));
      const nextTickets = Array.isArray(data.data) ? data.data : [];
      setTickets(nextTickets);
      if (!selectedTicketId && nextTickets[0]?.id) setSelectedTicketId(nextTickets[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.support.errorLoadTickets'));
    } finally {
      setLoading(false);
    }
  }

  async function loadTicketDetail(ticketId: string) {
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/me/${ticketId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.support.errorLoadTicketDetail'));
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.support.errorLoadTicketDetail'));
    }
  }

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/support/me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.support.errorCreateTicket'));
      setSubject('');
      setDescription('');
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.support.errorCreateTicket'));
    } finally {
      setSubmitting(false);
    }
  }

  async function addAttachment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicketId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/me/${selectedTicketId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: attachmentName, mime_type: attachmentMimeType, file_size_bytes: Number(attachmentSizeBytes) || 0, file_url: attachmentUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.support.errorAddAttachment'));
      setAttachmentName('');
      setAttachmentUrl('');
      setAttachmentMimeType('application/octet-stream');
      setAttachmentSizeBytes('0');
      await loadTicketDetail(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.support.errorAddAttachment'));
    } finally {
      setSubmitting(false);
    }
  }

  async function updateSellerStatus(status: 'open' | 'closed') {
    if (!selectedTicketId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/me/${selectedTicketId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.support.errorUpdateStatus'));
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.support.errorUpdateStatus'));
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicketId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/me/${selectedTicketId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || t('dashboardPages.support.errorSendReply'));
      setReplyBody('');
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboardPages.support.errorSendReply'));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { void loadTickets(); }, [statusFilter]);
  useEffect(() => { if (selectedTicketId) void loadTicketDetail(selectedTicketId); }, [selectedTicketId]);

  return (
    <div dir={dir} className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboardPages.support.title')}</h1>
      {error ? (
        <p className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-sm font-medium text-rose-700 dark:text-rose-400">
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('dashboardPages.support.ticketFilter')}</p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(asSellerStatusFilter(e.target.value))}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
        >
          <option value="all" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.allStatuses')}</option>
          <option value="open" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.statusOpen')}</option>
          <option value="in_progress" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.statusInProgress')}</option>
          <option value="waiting_seller" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.statusWaitingSeller')}</option>
          <option value="waiting_admin" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.statusWaitingAdmin')}</option>
          <option value="resolved" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.statusResolved')}</option>
          <option value="closed" className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{t('dashboardPages.support.statusClosed')}</option>
        </select>
      </div>

      <form onSubmit={createTicket} className="space-y-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('dashboardPages.support.subject')}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          required
          minLength={3}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('dashboardPages.support.describeIssue')}
          className="min-h-32 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
          required
          minLength={10}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-sm font-medium text-white shadow-2xs transition disabled:opacity-60"
        >
          {submitting ? t('dashboardPages.support.creating') : t('dashboardPages.support.createTicket')}
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.support.myTickets')}</h2>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.common.loading')}</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedTicketId === ticket.id
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80'
                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{ticket.ticket_number} — {ticket.subject}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ticket.status} · {ticket.priority} · {new Date(ticket.updated_at).toLocaleString(dateLocale)}</p>
                  </button>
                </li>
              ))}
              {!tickets.length ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.support.noTickets')}</p> : null}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t('dashboardPages.support.conversation')}</h2>
          {!selectedTicketId ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.support.selectTicket')}</p>
          ) : (
            <>
              <div className="mb-3 max-h-72 space-y-2 overflow-auto">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{m.body}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{new Date(m.created_at).toLocaleString(dateLocale)}</p>
                  </div>
                ))}
                {!messages.length ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboardPages.support.noMessages')}</p> : null}
              </div>
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('dashboardPages.support.attachments')}</p>
                <ul className="space-y-1">
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <a className="text-xs text-blue-600 dark:text-blue-400 hover:underline" href={a.file_url} target="_blank" rel="noreferrer">{a.file_name}</a>
                    </li>
                  ))}
                  {!attachments.length ? <li className="text-xs text-slate-500 dark:text-slate-400">{t('dashboardPages.support.noAttachments')}</li> : null}
                </ul>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void updateSellerStatus('open')}
                  className="rounded-lg border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition"
                >
                  {t('dashboardPages.support.reopenTicket')}
                </button>
                <button
                  type="button"
                  onClick={() => void updateSellerStatus('closed')}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  {t('dashboardPages.support.closeTicket')}
                </button>
              </div>

              <form onSubmit={addAttachment} className="mb-3 space-y-2">
                <input
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder={t('dashboardPages.support.attachmentName')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  required
                  minLength={1}
                />
                <input
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder={t('dashboardPages.support.attachmentUrl')}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  required
                  type="url"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={attachmentMimeType}
                    onChange={(e) => setAttachmentMimeType(e.target.value)}
                    placeholder={t('dashboardPages.support.mimeType')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                    required
                  />
                  <input
                    value={attachmentSizeBytes}
                    onChange={(e) => setAttachmentSizeBytes(e.target.value)}
                    placeholder={t('dashboardPages.support.fileSizeBytes')}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                    type="number"
                    min={0}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-60"
                >
                  {t('dashboardPages.support.addAttachment')}
                </button>
              </form>

              <form onSubmit={sendReply} className="space-y-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={t('dashboardPages.support.writeReply')}
                  className="min-h-24 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  required
                  minLength={1}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 px-4 py-2 text-sm font-medium text-white shadow-2xs transition disabled:opacity-60"
                >
                  {submitting ? t('dashboardPages.support.sending') : t('dashboardPages.support.sendReply')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
