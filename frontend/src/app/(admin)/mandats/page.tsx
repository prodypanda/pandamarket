'use client';

import { useState } from 'react';
import { Receipt, Check, X, Eye, DollarSign } from 'lucide-react';

// Mock data — in production, fetch from /api/pd/admin/mandats/pending
const mockMandats = [
  {
    id: 'mandat_001',
    order_id: 'pd_order_abc123',
    customer_email: 'sami@example.tn',
    amount_expected: 85.0,
    image_url: '#',
    uploaded_at: '2026-05-02T14:30:00Z',
    uploaded_by: 'buyer',
  },
  {
    id: 'mandat_002',
    order_id: 'pd_order_def456',
    customer_email: 'amira@example.tn',
    amount_expected: 120.5,
    image_url: '#',
    uploaded_at: '2026-05-02T11:00:00Z',
    uploaded_by: 'buyer',
  },
];

export default function AdminMandatsPage() {
  const [mandats, setMandats] = useState(mockMandats);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mandat Minute Validation</h1>
          <p className="text-gray-500 mt-1">{mandats.length} proofs awaiting validation.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium">
          <Receipt className="w-4 h-4" />
          {mandats.length} pending
        </div>
      </div>

      <div className="space-y-4">
        {mandats.map((mandat) => (
          <div
            key={mandat.id}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Order #{mandat.order_id.slice(-8).toUpperCase()}
                </h3>
                <p className="text-sm text-gray-500">
                  {mandat.customer_email} • Uploaded{' '}
                  {new Date(mandat.uploaded_at).toLocaleDateString('fr-TN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-[#16C784]/10 text-[#16C784] rounded-full text-sm font-bold">
                <DollarSign className="w-4 h-4" />
                {mandat.amount_expected.toFixed(3)} TND
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Proof of Payment</p>
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <button className="flex items-center gap-2 text-sm font-medium text-[#16C784] hover:underline">
                    <Eye className="w-4 h-4" /> View Full Image
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Expected Amount</p>
                <p className="text-3xl font-bold text-gray-900">
                  {mandat.amount_expected.toFixed(3)} TND
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Verify that the receipt matches this amount.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b576] transition-colors">
                <Check className="w-4 h-4" /> Approve
              </button>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  placeholder="Rejection reason..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
