'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useEffect, useState } from 'react';

type AdminTicket = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  assigned_admin_id?: string | null;
  store_name?: string;
};

type AdminTicketMessage = {
  id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

type AdminStatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_seller' | 'waiting_admin' | 'resolved' | 'closed';
type AdminPriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent';

function asAdminStatusFilter(value: string): AdminStatusFilter {
  const allowed: AdminStatusFilter[] = ['all', 'open', 'in_progress', 'waiting_seller', 'waiting_admin', 'resolved', 'closed'];
  return (allowed as string[]).includes(value) ? (value as AdminStatusFilter) : 'all';
}

function asAdminPriorityFilter(value: string): AdminPriorityFilter {
  const allowed: AdminPriorityFilter[] = ['all', 'low', 'normal', 'high', 'urgent'];
  return (allowed as string[]).includes(value) ? (value as AdminPriorityFilter) : 'all';
}

type AdminTicketAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

export default function AdminSupportQueuePage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminTicketMessage[]>([]);
  const [attachments, setAttachments] = useState<AdminTicketAttachment[]>([]);
  const [replyBody, setReplyBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentMimeType, setAttachmentMimeType] = useState('application/octet-stream');
  const [attachmentSizeBytes, setAttachmentSizeBytes] = useState('0');
  const [replyInternal, setReplyInternal] = useState(false);
  const [assignAdminId, setAssignAdminId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<AdminPriorityFilter>('all');

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || null;



  async function loadCurrentAdmin() {
    try {
      const res = await fetchWithCsrf('/api/pd/auth/me', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.user?.id) setCurrentAdminId(String(data.user.id));
    } catch {
      // non-blocking; assignment still possible via manual id input
    }
  }

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: '1', limit: '50' });
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (priorityFilter !== 'all') query.set('priority', priorityFilter);
      const res = await fetchWithCsrf(`/api/pd/support/admin?${query.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to load support queue');
      const nextTickets = Array.isArray(data.data) ? data.data : [];
      setTickets(nextTickets);
      if (!selectedTicketId && nextTickets[0]?.id) setSelectedTicketId(nextTickets[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support queue');
    } finally {
      setLoading(false);
    }
  }

  async function loadTicketDetail(ticketId: string) {
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/admin/${ticketId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to load ticket detail');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket detail');
    }
  }

  async function updateStatus(ticketId: string, status: 'in_progress' | 'resolved' | 'closed') {
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/admin/${ticketId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to update ticket status');
      await loadQueue();
      if (selectedTicketId) await loadTicketDetail(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
    }
  }

  async function markInProgress(ticketId: string) {
    await updateStatus(ticketId, 'in_progress');
  }

  async function assignToMe(ticketId: string) {
    if (!currentAdminId) {
      setError('Unable to resolve current admin id. You can still assign manually.');
      return;
    }
    setAssignAdminId(currentAdminId);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/admin/${ticketId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_admin_id: currentAdminId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to assign ticket');
      await loadQueue();
      if (selectedTicketId) await loadTicketDetail(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    }
  }

  async function assignTicket(ticketId: string) {
    setError(null);
    try {
      const payload: Record<string, string | null> = { assigned_admin_id: assignAdminId.trim() || null };
      const res = await fetchWithCsrf(`/api/pd/support/admin/${ticketId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to update assignment');
      await loadQueue();
      if (selectedTicketId) await loadTicketDetail(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment');
    }
  }

  async function updatePriority(ticketId: string, priority: 'low' | 'normal' | 'high' | 'urgent') {
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/admin/${ticketId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to update ticket priority');
      await loadQueue();
      if (selectedTicketId) await loadTicketDetail(selectedTicketId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket priority');
    }
  }

  async function addAttachment(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicketId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/admin/${selectedTicketId}/attachments`, {
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

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTicketId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/support/admin/${selectedTicketId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody, is_internal: replyInternal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to send admin reply');
      setReplyBody('');
      setReplyInternal(false);
      await loadTicketDetail(selectedTicketId);
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send admin reply');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { void loadQueue(); }, [statusFilter, priorityFilter]);
  useEffect(() => { void loadCurrentAdmin(); }, []);
  useEffect(() => { if (selectedTicketId) void loadTicketDetail(selectedTicketId); }, [selectedTicketId]);
  useEffect(() => {
    if (selectedTicket?.assigned_admin_id !== undefined) {
      setAssignAdminId(selectedTicket.assigned_admin_id || '');
    }
  }, [selectedTicket?.assigned_admin_id]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-slate-900">Support queue</h1>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Filters</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(asAdminStatusFilter(e.target.value))} className="rounded-xl border px-3 py-2 text-sm">
            <option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting_seller">Waiting seller</option><option value="waiting_admin">Waiting admin</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(asAdminPriorityFilter(e.target.value))} className="rounded-xl border px-3 py-2 text-sm">
            <option value="all">All priorities</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-black">Tickets</h2>
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-xl border p-3 text-left ${selectedTicketId === ticket.id ? 'border-[#B91C1C] bg-red-50' : 'border-slate-200'}`}
                  >
                    <p className="font-bold">{ticket.ticket_number} — {ticket.subject}</p>
                    <p className="text-xs text-slate-500">{ticket.store_name || 'Unknown store'} · {ticket.status} · {ticket.priority}</p>
                    <p className="mt-1 text-[11px] text-slate-400">Assigned: {ticket.assigned_admin_id || 'Unassigned'}</p>
                  </button>
                </li>
              ))}
              {!tickets.length ? <p className="text-sm text-slate-500">No tickets in queue.</p> : null}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-black">Conversation</h2>
          {!selectedTicketId ? <p className="text-sm text-slate-500">Select a ticket to view conversation.</p> : (
            <>
              <div className="mb-3 max-h-72 space-y-2 overflow-auto">
                {messages.map((message) => (
                  <div key={message.id} className={`rounded-xl border p-2 ${message.is_internal ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
                    <p className="text-sm text-slate-700">{message.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(message.created_at).toLocaleString()} {message.is_internal ? '· Internal note' : ''}
                    </p>
                  </div>
                ))}
                {!messages.length ? <p className="text-sm text-slate-500">No messages yet.</p> : null}
              </div>

              <div className="mb-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Attachments</p>
                <ul className="space-y-1">
                  {attachments.map((attachment) => (
                    <li key={attachment.id}>
                      <a className="text-xs text-blue-700 underline" href={attachment.file_url} target="_blank" rel="noreferrer">{attachment.file_name}</a>
                    </li>
                  ))}
                  {!attachments.length ? <li className="text-xs text-slate-500">No attachments yet.</li> : null}
                </ul>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void markInProgress(selectedTicketId)}
                  className="rounded-lg border px-3 py-1 text-sm font-bold"
                >
                  Mark in progress
                </button>
                <button
                  type="button"
                  onClick={() => void updateStatus(selectedTicketId, 'resolved')}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700"
                >
                  Mark resolved
                </button>
                <button
                  type="button"
                  onClick={() => void updateStatus(selectedTicketId, 'closed')}
                  className="rounded-lg border border-slate-400 bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700"
                >
                  Close ticket
                </button>
              </div>


              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void updatePriority(selectedTicketId, 'low')}
                  className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700"
                >
                  Priority low
                </button>
                <button
                  type="button"
                  onClick={() => void updatePriority(selectedTicketId, 'normal')}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-700"
                >
                  Priority normal
                </button>
                <button
                  type="button"
                  onClick={() => void updatePriority(selectedTicketId, 'high')}
                  className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700"
                >
                  Priority high
                </button>
                <button
                  type="button"
                  onClick={() => void updatePriority(selectedTicketId, 'urgent')}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-sm font-bold text-red-700"
                >
                  Priority urgent
                </button>
              </div>


              <div className="mb-3 space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assignment</p>
                <p className="text-[11px] text-slate-500">Current: {selectedTicket?.assigned_admin_id || 'Unassigned'}</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={assignAdminId}
                    onChange={(e) => setAssignAdminId(e.target.value)}
                    placeholder="Admin user id (leave empty to unassign)"
                    className="min-w-[260px] flex-1 rounded-xl border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => selectedTicketId && void assignTicket(selectedTicketId)}
                    className="rounded-lg border px-3 py-2 text-sm font-bold"
                  >
                    Save assignment
                  </button>
                  <button
                    type="button"
                    disabled={!currentAdminId}
                    onClick={() => selectedTicketId && void assignToMe(selectedTicketId)}
                    className="rounded-lg border border-[#B91C1C] bg-red-50 px-3 py-2 text-sm font-bold text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Assign to me
                  </button>
                </div>
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
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write an admin reply"
                  className="min-h-24 w-full rounded-xl border px-3 py-2"
                  required
                  minLength={1}
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={replyInternal} onChange={(e) => setReplyInternal(e.target.checked)} />
                  Send as internal note (not visible to seller)
                </label>
                <button type="submit" disabled={submitting} className="rounded-xl border px-4 py-2 font-bold disabled:opacity-60">
                  {submitting ? 'Sending...' : 'Send reply'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
