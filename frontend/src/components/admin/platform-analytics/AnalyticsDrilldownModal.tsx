'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpDown,
  Filter,
  ShoppingCart,
  Store,
  Users,
  Package,
  Search as SearchIcon,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  DrilldownType,
  AnalyticsTimeRange,
  AnalyticsDrilldownQueryParams,
  PaginatedDrilldownResponse,
  OrderDrilldownItem,
  VendorDrilldownItem,
  BuyerDrilldownItem,
  ProductDrilldownItem,
  SearchDrilldownItem,
  EventDrilldownItem,
} from '@/types/analytics';
import { fetchDrilldownData } from '@/lib/admin-platform-analytics';

type AnyDrilldownItem =
  | OrderDrilldownItem
  | VendorDrilldownItem
  | BuyerDrilldownItem
  | ProductDrilldownItem
  | SearchDrilldownItem
  | EventDrilldownItem;

interface AnalyticsDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: DrilldownType;
  timeRange?: AnalyticsTimeRange;
}

const DRILLDOWN_TABS: Array<{ type: DrilldownType; label: string; icon: React.ReactNode }> = [
  { type: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
  { type: 'vendors', label: 'Vendors', icon: <Store className="h-4 w-4" /> },
  { type: 'buyers', label: 'Buyers', icon: <Users className="h-4 w-4" /> },
  { type: 'products', label: 'Products', icon: <Package className="h-4 w-4" /> },
  { type: 'search', label: 'Search Queries', icon: <SearchIcon className="h-4 w-4" /> },
  { type: 'events', label: 'Raw Events', icon: <Activity className="h-4 w-4" /> },
];

export const AnalyticsDrilldownModal: React.FC<AnalyticsDrilldownModalProps> = ({
  isOpen,
  onClose,
  initialType = 'orders',
  timeRange = '30d',
}) => {
  const [activeType, setActiveType] = useState<DrilldownType>(initialType);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataResponse, setDataResponse] = useState<PaginatedDrilldownResponse<AnyDrilldownItem> | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDrilldownItem | null>(null);

  useEffect(() => {
    if (initialType) setActiveType(initialType);
  }, [initialType]);

  useEffect(() => {
    setPage(1);
    setStatusFilter('');
    setSearch('');
  }, [activeType]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const queryParams: AnalyticsDrilldownQueryParams = {
      timeRange,
      page,
      limit,
      sortBy,
      sortDir,
      search: search.trim() || undefined,
      status: statusFilter || undefined,
    };

    fetchDrilldownData<AnyDrilldownItem>(activeType, queryParams)
      .then((res) => {
        if (isMounted) {
          setDataResponse(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load drill-down records');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeType, timeRange, page, limit, sortBy, sortDir, search, statusFilter]);

  if (!isOpen) return null;

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const renderTableHead = (col: string, label: string) => (
    <th
      onClick={() => handleSort(col)}
      className="cursor-pointer px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900"
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <ArrowUpDown className="h-3 w-3" />
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Platform Analytics Drill-Down</h3>
            <p className="text-xs text-slate-500">
              Inspect underlying records for granular auditing & analysis ({timeRange} range)
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          {DRILLDOWN_TABS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => setActiveType(tab.type)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeType === tab.type
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-680 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeType}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-stone-50 pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>

          {(activeType === 'orders' || activeType === 'vendors' || activeType === 'products') && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-stone-50 px-3 py-2 text-xs text-slate-700 outline-none"
              >
                <option value="">All Statuses</option>
                {activeType === 'orders' && (
                  <>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </>
                )}
                {activeType === 'vendors' && (
                  <>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="paused">Paused</option>
                    <option value="suspended">Suspended</option>
                  </>
                )}
                {activeType === 'products' && (
                  <>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
              <p className="text-xs font-semibold">Loading records...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs font-bold text-rose-700">
              {error}
            </div>
          ) : !dataResponse || dataResponse.data.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-400">
              <p className="text-sm font-bold text-slate-600">No records found</p>
              <p className="text-xs">Try adjusting your filters or time range</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full border-collapse bg-white text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {activeType === 'orders' && (
                      <>
                        {renderTableHead('created_at', 'Date')}
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Order ID</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Store</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Buyer</th>
                        {renderTableHead('status', 'Status')}
                        {renderTableHead('total_amount', 'Amount (TND)')}
                        <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-slate-500">Action</th>
                      </>
                    )}
                    {activeType === 'vendors' && (
                      <>
                        {renderTableHead('name', 'Store Name')}
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Vendor Email</th>
                        {renderTableHead('status', 'Status')}
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">KYC Status</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Products</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">GMV (TND)</th>
                        {renderTableHead('created_at', 'Joined')}
                      </>
                    )}
                    {activeType === 'buyers' && (
                      <>
                        {renderTableHead('email', 'Buyer Email')}
                        {renderTableHead('created_at', 'Registered')}
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Orders</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Total Spend (TND)</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Repeat Buyer</th>
                      </>
                    )}
                    {activeType === 'products' && (
                      <>
                        {renderTableHead('title', 'Product Title')}
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Store</th>
                        {renderTableHead('price', 'Price (TND)')}
                        {renderTableHead('status', 'Status')}
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Views</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Add to Cart</th>
                      </>
                    )}
                    {activeType === 'search' && (
                      <>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Search Query</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Search Volume</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Zero Result Count</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Zero Result Rate</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Last Searched</th>
                      </>
                    )}
                    {activeType === 'events' && (
                      <>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Occurred At</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Event Type</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Store ID</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Path</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-500">Metadata Summary</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeType === 'orders' &&
                    (dataResponse.data as OrderDrilldownItem[]).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.id}</td>
                        <td className="px-4 py-3 text-slate-700">{item.store_name || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{item.buyer_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold capitalize text-slate-700">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.total_amount_tnd.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(item)}
                            className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            <span>View</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {activeType === 'vendors' &&
                    (dataResponse.data as VendorDrilldownItem[]).map((item) => (
                      <tr key={item.store_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{item.store_name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.vendor_email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 capitalize">
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{item.kyc_status || 'not_submitted'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.product_count}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.total_gmv_tnd.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}

                  {activeType === 'buyers' &&
                    (dataResponse.data as BuyerDrilldownItem[]).map((item) => (
                      <tr key={item.buyer_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{item.buyer_email || 'Anonymous'}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.order_count}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.total_spend_tnd.toFixed(2)}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{item.is_repeat_buyer ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}

                  {activeType === 'products' &&
                    (dataResponse.data as ProductDrilldownItem[]).map((item) => (
                      <tr key={item.product_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{item.title}</td>
                        <td className="px-4 py-3 text-slate-600">{item.store_name || '-'}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.price_tnd.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{item.status}</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">{item.views_count}</td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">{item.add_to_cart_count}</td>
                      </tr>
                    ))}

                  {activeType === 'search' &&
                    (dataResponse.data as SearchDrilldownItem[]).map((item) => (
                      <tr key={item.query_hash} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.query_display}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.search_count}</td>
                        <td className="px-4 py-3 text-slate-600">{item.zero_result_count}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.zero_result_rate_pct}%</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(item.last_searched_at).toLocaleDateString()}</td>
                      </tr>
                    ))}

                  {activeType === 'events' &&
                    (dataResponse.data as EventDrilldownItem[]).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{new Date(item.occurred_at).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.event_type}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono">{item.store_id || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{item.path || '-'}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{item.metadata_summary}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {dataResponse && dataResponse.meta && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <div className="text-xs text-slate-500 font-medium">
              Showing page {dataResponse.meta.page} of {dataResponse.meta.total_pages} ({dataResponse.meta.total} total records)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>
              <button
                disabled={page >= dataResponse.meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline Order Detail Inspection Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Order Details</span>
                <h4 className="text-lg font-black text-slate-900 font-mono mt-0.5">{selectedOrder.id}</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-500 font-medium block">Order Date</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Total Amount</span>
                  <span className="font-black text-[#B91C1C] text-sm block mt-0.5">
                    {selectedOrder.total_amount_tnd.toFixed(2)} TND
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-white rounded-2xl border border-slate-200">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Store Name:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.store_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.buyer_name || 'Anonymous'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Order Status:</span>
                  <span className="font-bold capitalize text-slate-900">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold capitalize text-emerald-600">{selectedOrder.payment_status}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Payment Gateway:</span>
                  <span className="font-bold uppercase text-slate-900">{selectedOrder.payment_gateway || 'Flouci'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close Preview
              </button>
              <a
                href="/hub/dashboard/orders"
                className="flex-1 text-center rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800"
              >
                Open Orders Dashboard
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
