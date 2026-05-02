import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';

export default function DashboardOverview() {
  const stats = [
    { name: 'Total Revenue', value: 'TND 4,200', icon: DollarSign, change: '+12%', trend: 'up' },
    { name: 'Active Products', value: '45', icon: Package, change: '+3', trend: 'up' },
    { name: 'Total Orders', value: '128', icon: ShoppingCart, change: '+18%', trend: 'up' },
    { name: 'Conversion Rate', value: '3.2%', icon: TrendingUp, change: '-0.4%', trend: 'down' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Here is what's happening with your store today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change}
              </span>
              <span className="text-gray-400 ml-2">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Sales</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
            Chart Placeholder
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Pending Orders</h3>
          <ul className="space-y-4">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-center">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 font-medium">
                    #{1000 + i}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Order from Client {i}</p>
                    <p className="text-xs text-gray-500">2 mins ago</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900">TND 125</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
