'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Check, X, Phone, FileText, Eye, Loader2 } from 'lucide-react';

interface KycSubmission {
  id: string;
  store_name: string;
  owner_email: string;
  phone_number: string | null;
  phone_verified: boolean;
  rc_document_url: string | null;
  cin_document_url: string | null;
  created_at: string;
}

export default function AdminKycPage() {
  const [queue, setQueue] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCsrf('/api/pd/admin/verifications/pending?limit=100');
      if (!res.ok) throw new Error('Failed to load KYC queue');
      const data = await res.json();
      setQueue(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load KYC queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  async function approveKyc(id: string) {
    setActionId(id);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/verifications/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to approve KYC submission');
      await fetchQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve KYC submission');
    } finally {
      setActionId(null);
    }
  }

  async function rejectKyc(id: string) {
    const rejectionReason = rejectReasons[id]?.trim();
    if (!rejectionReason) {
      setError('Rejection reason is required');
      return;
    }

    setActionId(id);
    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/admin/verifications/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });
      if (!res.ok) throw new Error('Failed to reject KYC submission');
      setRejectReasons((current) => ({ ...current, [id]: '' }));
      await fetchQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject KYC submission');
    } finally {
      setActionId(null);
    }
  }

  async function openDocument(fileRef: string | null) {
    if (!fileRef) return;
    if (/^https?:\/\//i.test(fileRef)) {
      window.open(fileRef, '_blank', 'noopener,noreferrer');
      return;
    }

    setError(null);
    try {
      const res = await fetchWithCsrf(`/api/pd/files/access?key=${encodeURIComponent(fileRef)}`);
      if (!res.ok) throw new Error('Failed to open document');
      const data = await res.json();
      if (data.download_url) window.open(data.download_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open document');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Verification Queue</h1>
          <p className="text-gray-500 mt-1">{queue.length} verifications pending review.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-medium">
          <ShieldCheck className="w-4 h-4" />
          {queue.length} pending
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : queue.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-[#16C784]" />
            <h3 className="text-lg font-semibold text-gray-900">No pending verifications</h3>
            <p className="mt-1 text-sm text-gray-500">All KYC submissions have been reviewed.</p>
          </div>
        ) : queue.map((kyc) => (
          <div
            key={kyc.id}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{kyc.store_name}</h3>
                <p className="text-sm text-gray-500">
                  {kyc.owner_email} • Submitted{' '}
                  {new Date(kyc.created_at).toLocaleDateString('fr-TN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                Pending
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Registre de Commerce</p>
                  <button
                    type="button"
                    onClick={() => openDocument(kyc.rc_document_url)}
                    className="text-sm font-medium text-[#16C784] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View Document
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Carte d&apos;Identité</p>
                  <button
                    type="button"
                    onClick={() => openDocument(kyc.cin_document_url)}
                    className="text-sm font-medium text-[#16C784] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View Document
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Phone Verification</p>
                  <p className="text-sm font-medium">
                    {kyc.phone_number}{' '}
                    {kyc.phone_verified ? (
                      <span className="text-[#16C784]">✓ Verified</span>
                    ) : (
                      <span className="text-yellow-600">Pending</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                onClick={() => approveKyc(kyc.id)}
                disabled={actionId === kyc.id}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b576] transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={rejectReasons[kyc.id] || ''}
                  onChange={(event) =>
                    setRejectReasons((current) => ({
                      ...current,
                      [kyc.id]: event.target.value,
                    }))
                  }
                  placeholder="Rejection reason..."
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <button
                  onClick={() => rejectKyc(kyc.id)}
                  disabled={actionId === kyc.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
              <a
                href={kyc.phone_number ? `tel:${kyc.phone_number}` : undefined}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call Vendor
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
