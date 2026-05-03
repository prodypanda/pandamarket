'use client';

import { Users, Store, ShieldCheck, Ban } from 'lucide-react';

// Mock data — in production, fetch from /api/pd/admin/vendors
const mockVendors = [
  {
    id: 'pd_store_001',
    name: 'Atelier Médina',
    subdomain: 'atelier-medina',
    owner_email: 'vendor.pro@test.tn',
    plan: 'pro',
    status: 'verified',
    products_count: 45,
    total_revenue: 4200,
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'pd_store_002',
    name: 'Sarra Boutique',
    subdomain: 'sarra-boutique',
    owner_email: 'vendor.free@test.tn',
    plan: 'free',
    status: 'unverified',
    products_count: 3,
    total_revenue: 150,
    created_at: '2026-04-20T14:00:00Z',
  },
];

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
  unverified: 'text-yellow-600',
  suspended: 'text-red-600',
};

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-500 mt-1">Manage all vendors on the platform.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
          <Users className="w-4 h-4" />
          {mockVendors.length} vendors
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mockVendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Store className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{vendor.name}</p>
                      <p className="text-xs text-gray-500">{vendor.owner_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${planColors[vendor.plan] || 'bg-gray-100'}`}>
                    {vendor.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium capitalize ${statusColors[vendor.status]}`}>
                    {vendor.status === 'verified' && <ShieldCheck className="w-4 h-4 inline mr-1" />}
                    {vendor.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{vendor.products_count}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  TND {vendor.total_revenue.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-[#16C784] transition-colors" title="Verify">
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Suspend">
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
