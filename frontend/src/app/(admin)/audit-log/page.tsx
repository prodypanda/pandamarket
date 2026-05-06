'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  'kyc.approve': 'bg-green-100 text-green-700',
  'kyc.reject': 'bg-red-100 text-red-700',
  'mandat.approve': 'bg-green-100 text-green-700',
  'mandat.reject': 'bg-red-100 text-red-700',
  'store.suspend': 'bg-red-100 text-red-700',
  'store.unsuspend': 'bg-green-100 text-green-700',
  'plan.update': 'bg-blue-100 text-blue-700',
  'withdrawal.approve': 'bg-green-100 text-green-700',
  'report.update': 'bg-yellow-100 text-yellow-700',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    async function fetchAuditLog() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
        });
        if (searchQuery) params.set('search', searchQuery);
        if (actionFilter !== 'all') params.set('action', actionFilter);

        const res = await fetchWithCsrf(`/api/pd/admin/audit-log?${params}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setEntries(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAuditLog();
  }, [page, searchQuery, actionFilter]);

  const actionTypes = [
    'all',
    'kyc.approve',
    'kyc.reject',
    'mandat.approve',
    'mandat.reject',
    'store.suspend',
    'store.unsuspend',
    'plan.update',
    'withdrawal.approve',
    'report.update',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#16C784]/10 rounded-lg">
          <Shield className="h-6 w-6 text-[#16C784]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500">Track all administrative actions on the platform.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by admin email, resource ID..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#16C784]/20 focus:border-[#16C784]"
        >
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action === 'all' ? 'All Actions' : action}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Timestamp</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Admin</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Action</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Resource</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">IP</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString('fr-TN')}
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {entry.admin_email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                      {entry.resource_type}/{entry.resource_id?.slice(-8)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                      {entry.ip_address}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                      {entry.details ? JSON.stringify(entry.details) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
