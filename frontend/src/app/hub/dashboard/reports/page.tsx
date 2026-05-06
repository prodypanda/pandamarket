'use client';

import { fetchWithCsrf } from '@/lib/api';
import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

interface Report {
  id: string;
  store_id: string;
  order_id: string | null;
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  investigating: { label: 'Investigating', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  dismissed: { label: 'Dismissed', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

export default function VendorReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetchWithCsrf('/api/pd/reports/store', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setReports(data.data || []);
        }
      } catch {
        // Reports endpoint may not exist yet for vendor view
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Disputes</h1>
        <p className="text-sm text-gray-500 mt-1">
          View reports filed against your store and track their resolution status.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'open', 'investigating', 'resolved', 'dismissed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-[#16C784] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'All' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}
            {status !== 'all' && (
              <span className="ml-1.5 text-xs opacity-75">
                ({reports.filter((r) => r.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <CheckCircle className="h-12 w-12 text-[#16C784] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports</h3>
          <p className="text-sm text-gray-500">
            {filter === 'all'
              ? 'Your store has no reports filed against it. Keep up the great work!'
              : `No ${filter} reports found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const config = STATUS_CONFIG[report.status];
            const StatusIcon = config.icon;
            return (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        #{report.id.slice(-8)}
                      </span>
                      {report.order_id && (
                        <span className="text-xs text-gray-400">
                          Order #{report.order_id.slice(-8)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{report.reason}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>Filed {new Date(report.created_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {report.resolved_at && (
                        <span>Resolved {new Date(report.resolved_at).toLocaleDateString('fr-TN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReport(report)}
                    className="ml-4 p-2 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/5 rounded-lg transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                </div>

                {report.admin_notes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-1">Admin Response</p>
                    <p className="text-sm text-blue-800">{report.admin_notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Report Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Report ID</p>
                <p className="text-sm text-gray-900 font-mono">{selectedReport.id}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedReport.status].color}`}>
                  {STATUS_CONFIG[selectedReport.status].label}
                </span>
              </div>

              {selectedReport.order_id && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Related Order</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedReport.order_id}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Reason</p>
                <p className="text-sm text-gray-700">{selectedReport.reason}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Filed On</p>
                <p className="text-sm text-gray-900">
                  {new Date(selectedReport.created_at).toLocaleString('fr-TN')}
                </p>
              </div>

              {selectedReport.admin_notes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Admin Notes</p>
                  <p className="text-sm text-blue-800">{selectedReport.admin_notes}</p>
                </div>
              )}

              {selectedReport.resolved_at && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Resolved On</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedReport.resolved_at).toLocaleString('fr-TN')}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedReport(null)}
              className="mt-6 w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
