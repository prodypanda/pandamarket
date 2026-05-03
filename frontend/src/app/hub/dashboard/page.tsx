'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Package,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

interface WalletData {
  balance: number;
  pending_balance: number;
  total_earned: number;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  customer_email?: string;
}

function formatPrice(price: number): string {
  return `${price.toFixed(3)} TND`;
}

export default function DashboardOverview() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [orderCount, setOrderCount] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [walletRes, productsRes, ordersRes] = await Promise.allSettled([
          fetch('/api/pd/wallet/me', { credentials: 'include' }),
          fetch('/api/pd/products/me?limit=1', { credentials: 'include' }),
          fetch('/api/pd/orders/store?limit=5', { credentials: 'include' }),
        ]);

        if (walletRes.status === 'fulfilled' && walletRes.value.ok) {
          const data = await walletRes.value.json();
          setWallet(data.wallet);
        }

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          const data = await productsRes.value.json();
          setProductCount(data.meta?.total || 0);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const data = await ordersRes.value.json();
          setRecentOrders(data.data || []);
          setOrderCount(data.meta?.total || 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = [
    {
      name: 'Total Revenue',
      value: loading ? '—' : formatPrice(wallet?.total_earned || 0),
      icon: DollarSign,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
    {
      name: 'Active Products',
      value: loading ? '—' : String(productCount),
      icon: Package,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
    {
      name: 'Total Orders',
      value: loading ? '—' : String(orderCount),
      icon: ShoppingCart,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
    {
      name: 'Available Balance',
      value: loading ? '—' : formatPrice(wallet?.balance || 0),
      icon: Wallet,
      color: 'bg-[#16C784]/10 text-[#16C784]',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Here is what&apos;s happening with your store today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                {loading ? (
                  <div className="h-9 w-24 bg-gray-100 rounded animate-pulse mt-2" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Sales</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
            Chart coming soon
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Orders</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length > 0 ? (
            <ul className="space-y-4">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 font-medium text-xs">
                      #{order.id.slice(-4)}
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {order.customer_email || 'Customer'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('fr-TN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {formatPrice(order.total_amount)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
          )}
          <Link
            href="/hub/dashboard/orders"
            className="block mt-4 text-center text-sm font-medium text-[#16C784] hover:text-[#14b876]"
          >
            View all orders →
          </Link>
        </div>
      </div>
    </div>
  );
}
