'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState } from 'react';

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
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to load tickets');
      const nextTickets = Array.isArray(data.data) ? data.data : [];
      setTickets(nextTickets);
      if (!selectedTicketId && nextTickets[0]?.id) setSelectedTicketId(nextTickets[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }

  async function loadTicketDetail(ticketId: string) {
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/me/${ticketId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to load ticket detail');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket detail');
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
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to create ticket');
      setSubject('');
      setDescription('');
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
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
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to add attachment');
      setAttachmentName('');
      setAttachmentUrl('');
      setAttachmentMimeType('application/octet-stream');
      setAttachmentSizeBytes('0');
      await loadTicketDetail(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attachment');
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
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to update ticket status');
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
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
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to send reply');
      setReplyBody('');
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { void loadTickets(); }, [statusFilter]);
  useEffect(() => { if (selectedTicketId) void loadTicketDetail(selectedTicketId); }, [selectedTicketId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900">Support tickets</h1>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Ticket filter</p>
        <select value={statusFilter} onChange={(e) => setStatusFilter(asSellerStatusFilter(e.target.value))} className="w-full rounded-xl border px-3 py-2 text-sm">
          <option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_seller">Waiting seller</option><option value="waiting_admin">Waiting admin</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
      </div>

      <form onSubmit={createTicket} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-xl border px-3 py-2" required minLength={3} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue" className="min-h-32 w-full rounded-xl border px-3 py-2" required minLength={10} />
        <button type="submit" disabled={submitting} className="rounded-xl bg-[#B91C1C] px-4 py-2 font-bold text-white disabled:opacity-60">{submitting ? 'Creating...' : 'Create ticket'}</button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-black">My tickets</h2>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button type="button" onClick={() => setSelectedTicketId(ticket.id)} className={`w-full rounded-xl border p-3 text-left ${selectedTicketId === ticket.id ? 'border-[#B91C1C] bg-red-50' : 'border-slate-200'}`}>
                    <p className="font-bold">{ticket.ticket_number} — {ticket.subject}</p>
                    <p className="text-xs text-slate-500">{ticket.status} · {ticket.priority} · {new Date(ticket.updated_at).toLocaleString()}</p>
                  </button>
                </li>
              ))}
              {!tickets.length ? <p className="text-sm text-slate-500">No tickets yet.</p> : null}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-black">Conversation</h2>
          {!selectedTicketId ? <p className="text-sm text-slate-500">Select a ticket to view conversation.</p> : (
            <>
              <div className="mb-3 max-h-72 space-y-2 overflow-auto">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 p-2">
                    <p className="text-sm text-slate-700">{m.body}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {!messages.length ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
              </div>
              <div className="mb-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Attachments</p>
                <ul className="space-y-1">
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <a className="text-xs text-blue-700 underline" href={a.file_url} target="_blank" rel="noreferrer">{a.file_name}</a>
                    </li>
                  ))}
                  {!attachments.length ? <li className="text-xs text-slate-500">No attachments yet.</li> : null}
                </ul>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void updateSellerStatus('open')} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">Reopen ticket</button>
                <button type="button" onClick={() => void updateSellerStatus('closed')} className="rounded-lg border border-slate-400 bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">Close ticket</button>
              </div>

              <form onSubmit={addAttachment} className="mb-3 space-y-2">
                <input value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Attachment name" className="w-full rounded-xl border px-3 py-2" required minLength={1} />
                <input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="Attachment URL" className="w-full rounded-xl border px-3 py-2" required type="url" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={attachmentMimeType} onChange={(e) => setAttachmentMimeType(e.target.value)} placeholder="MIME type" className="w-full rounded-xl border px-3 py-2" required />
                  <input value={attachmentSizeBytes} onChange={(e) => setAttachmentSizeBytes(e.target.value)} placeholder="File size bytes" className="w-full rounded-xl border px-3 py-2" type="number" min={0} />
                </div>
                <button type="submit" disabled={submitting} className="rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-60">Add attachment</button>
              </form>

              <form onSubmit={sendReply} className="space-y-2">
                <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} placeholder="Write a reply" className="min-h-24 w-full rounded-xl border px-3 py-2" required minLength={1} />
                <button type="submit" disabled={submitting} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-60">{submitting ? 'Sending...' : 'Send reply'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
