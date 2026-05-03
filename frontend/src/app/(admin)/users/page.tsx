'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Store,
  ShieldCheck,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Search,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  subdomain: string;
  owner_id: string;
  subscription_plan: string;
  status: string;
  is_verified: boolean;
  created_at: string;
}

const planColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-100 text-blue-700',
  regular: 'bg-indigo-100 text-indigo-700',
  agency: 'bg-purple-100 text-purple-700',
  pro: 'bg-[#16C784]/10 text-[#16C784]',
  golden: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-gray-800 text-white',
};

const statusColors: Record<string, string> = {
  verified: 'text-[#16C784]',
  active: 'text-[#16C784]',
  unverified: 'text-yellow-600',
  pending: 'text-yellow-600',
  suspended: 'text-red-600',
};

export default function AdminUsersPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pd/admin/vendors?page=${page}&limit=20`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data.data || []);
        setTotalPages(data.meta?.total_pages || 1);
        setTotal(data.meta?.total || 0);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleSuspend = async (storeId: string) => {
    setSuspendingId(storeId);
    try {
      const res = await fetch(`/api/pd/admin/vendors/${storeId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: suspendReason || 'Suspended by admin' }),
      });
      if (res.ok) {
        fetchVendors();
      }
    } catch {
      // ignore
    } finally {
      setSuspendingId(null);
      setConfirmSuspend(null);
      setSuspendReason('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500 mt-1">Manage all vendors on the platform.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
          <Users className="w-4 h-4" />
          {total} vendor{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No vendors found</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{vendor.name}</p>
                          <p className="text-xs text-gray-500">{vendor.subdomain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          planColors[vendor.subscription_plan?.toLowerCase()] || 'bg-gray-100'
                        }`}
                      >
                        {vendor.subscription_plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-medium capitalize ${
                          statusColors[vendor.status?.toLowerCase()] || 'text-gray-600'
                        }`}
                      >
                        {vendor.is_verified && (
                          <ShieldCheck className="w-4 h-4 inline mr-1" />
                        )}
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(vendor.created_at).toLocaleDateString('fr-TN')}
                    </td>
                    <td className="px-6 py-4">
                      {confirmSuspend === vendor.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            placeholder="Reason..."
                            className="px-2 py-1 text-xs border border-gray-300 rounded-lg w-32"
                          />
                          <button
                            onClick={() => handleSuspend(vendor.id)}
                            disabled={suspendingId === vendor.id}
                            className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            {suspendingId === vendor.id ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => {
                              setConfirmSuspend(null);
                              setSuspendReason('');
                            }}
                            className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setConfirmSuspend(vendor.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
