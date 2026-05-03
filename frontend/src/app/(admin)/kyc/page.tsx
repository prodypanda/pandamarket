'use client';

import { useState } from 'react';
import { ShieldCheck, Check, X, Phone, FileText, Eye } from 'lucide-react';

// Mock data — in production, fetch from /api/pd/admin/verifications/pending
const mockKycQueue = [
  {
    id: 'kyc_001',
    store_name: 'BoutiqueX',
    owner_email: 'ahmed@example.tn',
    phone_number: '+216 98 765 432',
    phone_verified: false,
    rc_document_url: '#',
    cin_document_url: '#',
    submitted_at: '2026-05-02T10:30:00Z',
  },
  {
    id: 'kyc_002',
    store_name: 'ShopY',
    owner_email: 'sarra@example.tn',
    phone_number: '+216 22 111 222',
    phone_verified: true,
    rc_document_url: '#',
    cin_document_url: '#',
    submitted_at: '2026-05-01T14:00:00Z',
  },
];

export default function AdminKycPage() {
  const [queue, setQueue] = useState(mockKycQueue);

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

      <div className="space-y-4">
        {queue.map((kyc) => (
          <div
            key={kyc.id}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{kyc.store_name}</h3>
                <p className="text-sm text-gray-500">
                  {kyc.owner_email} • Submitted{' '}
                  {new Date(kyc.submitted_at).toLocaleDateString('fr-TN', {
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
                  <button className="text-sm font-medium text-[#16C784] hover:underline flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View Document
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Carte d&apos;Identité</p>
                  <button className="text-sm font-medium text-[#16C784] hover:underline flex items-center gap-1">
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

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-[#16C784] text-white rounded-lg text-sm font-medium hover:bg-[#14b576] transition-colors">
                <Check className="w-4 h-4" /> Approve
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                <Phone className="w-4 h-4" /> Call Vendor
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
