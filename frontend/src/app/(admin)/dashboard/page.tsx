import { ShieldCheck, Receipt, Flag, Users, DollarSign, ShoppingCart } from 'lucide-react';

export default function AdminDashboard() {
  // In production, these would be fetched from /api/pd/admin/stats
  const stats = [
    { name: 'Total Vendors', value: '142', icon: Users, color: 'bg-blue-50 text-blue-600' },
    { name: 'Total Revenue (GMV)', value: 'TND 45,200', icon: DollarSign, color: 'bg-green-50 text-[#16C784]' },
    { name: 'Total Orders', value: '328', icon: ShoppingCart, color: 'bg-purple-50 text-purple-600' },
    { name: 'Pending KYC', value: '3', icon: ShieldCheck, color: 'bg-yellow-50 text-yellow-600' },
    { name: 'Pending Mandats', value: '5', icon: Receipt, color: 'bg-orange-50 text-orange-600' },
    { name: 'Open Reports', value: '2', icon: Flag, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and urgent actions.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Urgent Actions */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Urgent Actions</h3>
        <div className="space-y-3">
          <a href="/kyc" className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">3 KYC verifications pending</span>
            </div>
            <span className="text-yellow-600 text-sm font-medium">Review →</span>
          </a>
          <a href="/mandats" className="flex items-center justify-between p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">5 Mandat proofs to validate</span>
            </div>
            <span className="text-orange-600 text-sm font-medium">Review →</span>
          </a>
          <a href="/reports" className="flex items-center justify-between p-4 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">2 open reports</span>
            </div>
            <span className="text-red-600 text-sm font-medium">Review →</span>
          </a>
        </div>
      </div>
    </div>
  );
}
