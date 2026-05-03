'use client';

import { useState } from 'react';
import { Flag, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Mock data — in production, fetch from /api/pd/admin/reports
const mockReports = [
  {
    id: 'report_001',
    reporter_email: 'customer1@example.tn',
    store_name: 'FakeStore',
    store_id: 'pd_store_xxx',
    order_id: 'pd_order_abc',
    reason: 'Product received was completely different from the listing. The photos showed a leather bag but I received a plastic one.',
    status: 'open' as const,
    created_at: '2026-05-01T09:00:00Z',
  },
  {
    id: 'report_002',
    reporter_email: 'customer2@example.tn',
    store_name: 'ScamShop',
    store_id: 'pd_store_yyy',
    order_id: null,
    reason: 'This store is selling counterfeit products. Multiple items are clearly fake branded goods.',
    status: 'investigating' as const,
    created_at: '2026-04-28T15:30:00Z',
  },
];

const statusColors = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
};

const statusIcons = {
  open: AlertTriangle,
  investigating: Flag,
  resolved: CheckCircle,
  dismissed: XCircle,
};

export default function AdminReportsPage() {
  const [reports] = useState(mockReports);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Management</h1>
          <p className="text-gray-500 mt-1">Review and manage fraud reports from customers.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
          <Flag className="w-4 h-4" />
          {reports.filter((r) => r.status === 'open').length} open
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'open', 'investigating', 'resolved', 'dismissed'].map((tab) => (
          <button
            key={tab}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors capitalize"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {reports.map((report) => {
          const StatusIcon = statusIcons[report.status];
          return (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      Report against {report.store_name}
                    </h3>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${statusColors[report.status]}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    By {report.reporter_email} •{' '}
                    {new Date(report.created_at).toLocaleDateString('fr-TN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {report.order_id && ` • Order #${report.order_id.slice(-8).toUpperCase()}`}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700">{report.reason}</p>
              </div>

              <div className="flex items-center gap-3">
                <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16C784]/20">
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
                <button className="px-4 py-2 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b576] transition-colors">
                  Update Status
                </button>
                <button className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                  Suspend Store
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
