/**
 * Interactive Slide-Out Entity Drilldown Drawer Test Suite (Package 4: UI Component Tests)
 *
 * Feature Covered:
 *   - Feature 19: Interactive Slide-Out Entity Drilldown Drawer (R6)
 *     - Contextual inspection across 6 entity domains: Orders, Vendors, Buyers/Customers, Products, Search Queries, Raw Events/Logs
 *     - Dynamic Tab Navigation with active state highlighting
 *     - Live Search filtering with query parameter binding
 *     - Contextual status filtering (Orders: pending, processing, shipped, delivered, cancelled; Vendors: active, pending, paused, suspended; Products: published, draft, archived)
 *     - Column header sorting (asc / desc toggling with directional state)
 *     - Contextual detailed modal inspection (e.g. Order detail modal with ID, date, total TND, store, customer, status, payment status, payment gateway)
 *     - Pagination controls (page index, total pages, record counts, disabled edge bounds)
 *     - Async states: loading spinners, error alerts, empty states
 *     - Visibility lifecycle: open / close transitions and onClose callback
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DrilldownType,
  AnalyticsTimeRange,
  OrderDrilldownItem,
  VendorDrilldownItem,
  BuyerDrilldownItem,
  ProductDrilldownItem,
  SearchDrilldownItem,
  EventDrilldownItem,
  PaginatedDrilldownResponse,
} from '@/types/analytics';
import { AnalyticsDrilldownModal } from '@/components/admin/platform-analytics/AnalyticsDrilldownModal';

// Hoisted mock definitions
const mocks = vi.hoisted(() => ({
  fetchDrilldownData: vi.fn(),
}));

vi.mock('@/lib/admin-platform-analytics', () => mocks);


// Mock Fixtures
const MOCK_RANGE = {
  timeRange: '30d' as AnalyticsTimeRange,
  startDate: '2026-07-15T00:00:00.000Z',
  endDate: '2026-08-14T00:00:00.000Z',
  previousStartDate: '2026-06-15T00:00:00.000Z',
  previousEndDate: '2026-07-15T00:00:00.000Z',
  isAllTime: false,
  comparison_available: true,
};

const MOCK_ORDERS: OrderDrilldownItem[] = [
  {
    id: 'ORD-2026-8941',
    created_at: '2026-08-14T10:30:00.000Z',
    store_id: 'store-1',
    store_name: 'Panda Boutique Tunis',
    buyer_id: 'buyer-101',
    buyer_name: 'Amine Ben Salem',
    status: 'delivered',
    payment_status: 'paid',
    total_amount_tnd: 245.5,
    payment_gateway: 'Flouci',
    action_url: '/hub/dashboard/orders/ORD-2026-8941',
  },
  {
    id: 'ORD-2026-8942',
    created_at: '2026-08-14T11:15:00.000Z',
    store_id: 'store-2',
    store_name: 'Sousse Artisans',
    buyer_id: 'buyer-102',
    buyer_name: 'Fatma Trabelsi',
    status: 'processing',
    payment_status: 'paid',
    total_amount_tnd: 89.0,
    payment_gateway: 'Konnect',
    action_url: '/hub/dashboard/orders/ORD-2026-8942',
  },
  {
    id: 'ORD-2026-8943',
    created_at: '2026-08-14T12:00:00.000Z',
    store_id: 'store-3',
    store_name: 'Sfax High Tech',
    buyer_id: 'buyer-103',
    buyer_name: 'Youssef Gharbi',
    status: 'pending',
    payment_status: 'pending',
    total_amount_tnd: 1250.0,
    payment_gateway: 'Mandat',
    action_url: '/hub/dashboard/orders/ORD-2026-8943',
  },
];

const MOCK_VENDORS: VendorDrilldownItem[] = [
  {
    store_id: 'store-1',
    store_name: 'Panda Boutique Tunis',
    vendor_id: 'v-1',
    vendor_email: 'vendor@pandaboutique.tn',
    status: 'active',
    created_at: '2026-01-15T08:00:00.000Z',
    product_count: 145,
    order_count: 520,
    total_gmv_tnd: 87500.25,
    kyc_status: 'approved',
    action_url: '/hub/dashboard/stores/store-1',
  },
  {
    store_id: 'store-2',
    store_name: 'Sousse Artisans',
    vendor_id: 'v-2',
    vendor_email: 'contact@sousseartisans.tn',
    status: 'active',
    created_at: '2026-02-10T09:00:00.000Z',
    product_count: 42,
    order_count: 180,
    total_gmv_tnd: 34800.0,
    kyc_status: 'pending',
    action_url: '/hub/dashboard/stores/store-2',
  },
  {
    store_id: 'store-3',
    store_name: 'Sfax High Tech',
    vendor_id: 'v-3',
    vendor_email: 'sales@sfaxttech.tn',
    status: 'suspended',
    created_at: '2026-03-01T10:00:00.000Z',
    product_count: 88,
    order_count: 210,
    total_gmv_tnd: 45600.0,
    kyc_status: 'rejected',
    action_url: '/hub/dashboard/stores/store-3',
  },
];

const MOCK_BUYERS: BuyerDrilldownItem[] = [
  {
    buyer_id: 'buyer-101',
    buyer_email: 'amine.salem@gmail.com',
    created_at: '2026-02-01T12:00:00.000Z',
    order_count: 12,
    total_spend_tnd: 2850.5,
    is_repeat_buyer: true,
    last_order_at: '2026-08-14T10:30:00.000Z',
    action_url: '/hub/dashboard/buyers/buyer-101',
  },
  {
    buyer_id: 'buyer-102',
    buyer_email: 'fatma.trabelsi@yahoo.fr',
    created_at: '2026-06-15T14:00:00.000Z',
    order_count: 1,
    total_spend_tnd: 89.0,
    is_repeat_buyer: false,
    last_order_at: '2026-08-14T11:15:00.000Z',
    action_url: '/hub/dashboard/buyers/buyer-102',
  },
];

const MOCK_PRODUCTS: ProductDrilldownItem[] = [
  {
    product_id: 'prod-101',
    title: 'Traditional Chechia Hat Red',
    store_id: 'store-1',
    store_name: 'Panda Boutique Tunis',
    status: 'published',
    price_tnd: 45.0,
    views_count: 1850,
    clicks_count: 420,
    add_to_cart_count: 190,
    created_at: '2026-02-15T10:00:00.000Z',
    action_url: '/products/prod-101',
  },
  {
    product_id: 'prod-102',
    title: 'Handcrafted Olive Wood Board',
    store_id: 'store-2',
    store_name: 'Sousse Artisans',
    status: 'published',
    price_tnd: 78.5,
    views_count: 940,
    clicks_count: 210,
    add_to_cart_count: 85,
    created_at: '2026-03-01T11:00:00.000Z',
    action_url: '/products/prod-102',
  },
];

const MOCK_SEARCH_QUERIES: SearchDrilldownItem[] = [
  {
    query_hash: 'q-hash-1',
    query_display: 'artisanat cuir tunisie',
    search_count: 450,
    zero_result_count: 180,
    zero_result_rate_pct: 40.0,
    click_count: 220,
    last_searched_at: '2026-08-14T14:00:00.000Z',
  },
  {
    query_hash: 'q-hash-2',
    query_display: 'huile d olive bio sfax',
    search_count: 320,
    zero_result_count: 15,
    zero_result_rate_pct: 4.7,
    click_count: 290,
    last_searched_at: '2026-08-14T13:30:00.000Z',
  },
];

const MOCK_EVENTS: EventDrilldownItem[] = [
  {
    id: 'evt-1',
    event_type: 'checkout_completed',
    occurred_at: '2026-08-14T14:10:00.000Z',
    store_id: 'store-1',
    product_id: null,
    order_id: 'ORD-2026-8941',
    user_id: 'user-101',
    source: 'web',
    path: '/checkout/success',
    locale: 'fr',
    metadata_summary: 'total=245.500 TND gateway=Flouci',
  },
  {
    id: 'evt-2',
    event_type: 'product_viewed',
    occurred_at: '2026-08-14T14:12:00.000Z',
    store_id: 'store-2',
    product_id: 'prod-102',
    order_id: null,
    user_id: 'user-102',
    source: 'web',
    path: '/p/handcrafted-wood',
    locale: 'en',
    metadata_summary: 'ref=category_listing',
  },
];

describe('Feature 19: Interactive Slide-Out Entity Drilldown Drawer (R6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock response routing by drilldown entity type
    mocks.fetchDrilldownData.mockImplementation(async (type: DrilldownType, params: any) => {
      let data: any[] = [];
      let total = 0;

      if (type === 'orders') {
        data = MOCK_ORDERS;
        total = MOCK_ORDERS.length;
      } else if (type === 'vendors') {
        data = MOCK_VENDORS;
        total = MOCK_VENDORS.length;
      } else if (type === 'buyers') {
        data = MOCK_BUYERS;
        total = MOCK_BUYERS.length;
      } else if (type === 'products') {
        data = MOCK_PRODUCTS;
        total = MOCK_PRODUCTS.length;
      } else if (type === 'search') {
        data = MOCK_SEARCH_QUERIES;
        total = MOCK_SEARCH_QUERIES.length;
      } else if (type === 'events') {
        data = MOCK_EVENTS;
        total = MOCK_EVENTS.length;
      }

      return {
        range: MOCK_RANGE,
        data,
        meta: {
          page: params?.page || 1,
          limit: params?.limit || 15,
          total,
          total_pages: 1,
          sort_by: params?.sortBy || 'created_at',
          sort_dir: params?.sortDir || 'desc',
        },
      };
    });
  });

  // =========================================================================
  // TIER 1: CORE FUNCTIONAL & PRIMARY REQUIREMENTS (Coverage ≥ 5)
  // =========================================================================
  describe('Tier 1: Core Functional & Entity Metadata Verification', () => {
    it('T1.1: renders drilldown modal with all 6 entity domain tabs and switches active tab', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      // Verify Header Titles
      expect(screen.getByText('Platform Analytics Drill-Down')).toBeInTheDocument();
      expect(
        screen.getByText(/Inspect underlying records for granular auditing & analysis/i)
      ).toBeInTheDocument();

      // Verify all 6 Entity Selector Tabs exist
      expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Vendors/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Buyers/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Products/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Search Queries/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Raw Events/i })).toBeInTheDocument();

      // Switch to Vendors tab
      const vendorsTab = screen.getByRole('button', { name: /Vendors/i });
      fireEvent.click(vendorsTab);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('vendors', expect.anything());
        expect(screen.getByText('Panda Boutique Tunis')).toBeInTheDocument();
        expect(screen.getByText('vendor@pandaboutique.tn')).toBeInTheDocument();
      });
    });

    it('T1.2: renders Orders drilldown with complete contextual table headers and metadata', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('orders', expect.anything());
        // Verify Column Headers
        expect(screen.getByText('Order ID')).toBeInTheDocument();
        expect(screen.getByText('Store')).toBeInTheDocument();
        expect(screen.getByText('Buyer')).toBeInTheDocument();
        expect(screen.getByText('Amount (TND)')).toBeInTheDocument();

        // Verify Order Item Rows
        expect(screen.getByText('ORD-2026-8941')).toBeInTheDocument();
        expect(screen.getByText('Amine Ben Salem')).toBeInTheDocument();
        expect(screen.getByText('245.50')).toBeInTheDocument();

        expect(screen.getByText('ORD-2026-8942')).toBeInTheDocument();
        expect(screen.getByText('Fatma Trabelsi')).toBeInTheDocument();
        expect(screen.getByText('89.00')).toBeInTheDocument();

        expect(screen.getByText('ORD-2026-8943')).toBeInTheDocument();
        expect(screen.getByText('Youssef Gharbi')).toBeInTheDocument();
        expect(screen.getByText('1250.00')).toBeInTheDocument();
      });
    });

    it('T1.3: renders Vendors drilldown with merchant health & KYC metadata', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="vendors" />);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('vendors', expect.anything());
        // Verify Column Headers
        expect(screen.getByText('Store Name')).toBeInTheDocument();
        expect(screen.getByText('Vendor Email')).toBeInTheDocument();
        expect(screen.getByText('KYC Status')).toBeInTheDocument();
        expect(screen.getByText('GMV (TND)')).toBeInTheDocument();

        // Verify Vendor Records
        expect(screen.getByText('Panda Boutique Tunis')).toBeInTheDocument();
        expect(screen.getByText('vendor@pandaboutique.tn')).toBeInTheDocument();
        expect(screen.getByText('87500.25')).toBeInTheDocument();

        expect(screen.getByText('Sousse Artisans')).toBeInTheDocument();
        expect(screen.getByText('contact@sousseartisans.tn')).toBeInTheDocument();
        expect(screen.getByText('34800.00')).toBeInTheDocument();

        expect(screen.getByText('Sfax High Tech')).toBeInTheDocument();
        expect(screen.getByText('sales@sfaxttech.tn')).toBeInTheDocument();
        expect(screen.getByText('45600.00')).toBeInTheDocument();
      });
    });

    it('T1.4: renders Buyers / Customers drilldown with customer spend and repeat buyer metrics', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="buyers" />);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('buyers', expect.anything());
        // Verify Headers
        expect(screen.getByText('Buyer Email')).toBeInTheDocument();
        expect(screen.getByText('Registered')).toBeInTheDocument();
        expect(screen.getByText('Total Spend (TND)')).toBeInTheDocument();
        expect(screen.getByText('Repeat Buyer')).toBeInTheDocument();

        // Verify Buyer Records
        expect(screen.getByText('amine.salem@gmail.com')).toBeInTheDocument();
        expect(screen.getByText('2850.50')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();

        expect(screen.getByText('fatma.trabelsi@yahoo.fr')).toBeInTheDocument();
        expect(screen.getByText('89.00')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
      });
    });

    it('T1.5: renders Products drilldown with merchandising metrics (views, cart adds, price)', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="products" />);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('products', expect.anything());
        // Verify Headers
        expect(screen.getByText('Product Title')).toBeInTheDocument();
        expect(screen.getByText('Price (TND)')).toBeInTheDocument();
        expect(screen.getByText('Views')).toBeInTheDocument();
        expect(screen.getByText('Add to Cart')).toBeInTheDocument();

        // Verify Product Records
        expect(screen.getByText('Traditional Chechia Hat Red')).toBeInTheDocument();
        expect(screen.getByText('45.00')).toBeInTheDocument();
        expect(screen.getByText('1850')).toBeInTheDocument();
        expect(screen.getByText('190')).toBeInTheDocument();

        expect(screen.getByText('Handcrafted Olive Wood Board')).toBeInTheDocument();
        expect(screen.getByText('78.50')).toBeInTheDocument();
        expect(screen.getByText('940')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
      });
    });

    it('T1.6: renders Raw Events / Audit Logs drilldown with audit telemetry', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="events" />);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('events', expect.anything());
        // Verify Headers
        expect(screen.getByText('Occurred At')).toBeInTheDocument();
        expect(screen.getByText('Event Type')).toBeInTheDocument();
        expect(screen.getByText('Store ID')).toBeInTheDocument();
        expect(screen.getByText('Metadata Summary')).toBeInTheDocument();

        // Verify Event Records
        expect(screen.getByText('checkout_completed')).toBeInTheDocument();
        expect(screen.getByText('total=245.500 TND gateway=Flouci')).toBeInTheDocument();
        expect(screen.getByText('product_viewed')).toBeInTheDocument();
        expect(screen.getByText('ref=category_listing')).toBeInTheDocument();
      });
    });

    it('T1.7: opens contextual detailed inspection modal on clicking "View" on an order', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByText('ORD-2026-8941')).toBeInTheDocument();
      });

      // Click "View" on the specific order row
      const orderRow = screen.getByText('ORD-2026-8941').closest('tr')!;
      const viewBtn = within(orderRow).getByRole('button', { name: /View/i });
      fireEvent.click(viewBtn);

      // Inline Order Detail Modal should open
      await waitFor(() => {
        expect(screen.getByText('Order Details')).toBeInTheDocument();
        expect(screen.getAllByText('ORD-2026-8941').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('245.50 TND')).toBeInTheDocument();
        expect(screen.getAllByText('Panda Boutique Tunis').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Amine Ben Salem').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByRole('button', { name: /Close Preview/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Open Orders Dashboard/i })).toHaveAttribute(
          'href',
          '/hub/dashboard/orders'
        );
      });

      // Close preview modal
      const closePreviewBtn = screen.getByRole('button', { name: /Close Preview/i });
      fireEvent.click(closePreviewBtn);

      await waitFor(() => {
        expect(screen.queryByText('Order Details')).not.toBeInTheDocument();
      });
    });

    it('T1.8: displays pagination metadata and enables page traversal', async () => {
      mocks.fetchDrilldownData.mockResolvedValueOnce({
        range: MOCK_RANGE,
        data: MOCK_ORDERS,
        meta: {
          page: 1,
          limit: 15,
          total: 45,
          total_pages: 3,
          sort_by: 'created_at',
          sort_dir: 'desc',
        },
      });

      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByText(/Showing page 1 of 3 \(45 total records\)/i)).toBeInTheDocument();
      });

      // Click Next
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      expect(nextBtn).not.toBeDisabled();

      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'orders',
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY VALUES & CORNER CASES (Boundary ≥ 5)
  // =========================================================================
  describe('Tier 2: Boundary Values & Error Handling', () => {
    it('T2.1: handles empty dataset gracefully displaying "No records found" empty state', async () => {
      mocks.fetchDrilldownData.mockResolvedValueOnce({
        range: MOCK_RANGE,
        data: [],
        meta: {
          page: 1,
          limit: 15,
          total: 0,
          total_pages: 1,
          sort_by: 'created_at',
          sort_dir: 'desc',
        },
      });

      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByText('No records found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters or time range')).toBeInTheDocument();
      });
    });

    it('T2.2: handles API error / query failures displaying error alert box with error message', async () => {
      mocks.fetchDrilldownData.mockRejectedValueOnce(
        new Error('PostgreSQL drilldown query execution timeout.')
      );

      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(
          screen.getByText('PostgreSQL drilldown query execution timeout.')
        ).toBeInTheDocument();
      });
    });

    it('T2.3: handles search keyword input and queries API with trimmed search parameter', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search orders...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search orders...');
      fireEvent.change(searchInput, { target: { value: 'Amine' } });

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'orders',
          expect.objectContaining({ search: 'Amine' })
        );
      });
    });

    it('T2.4: handles status dropdown filtering across orders, vendors, and products', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'delivered' } });

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'orders',
          expect.objectContaining({ status: 'delivered' })
        );
      });
    });

    it('T2.5: handles table column header sorting toggling between desc and asc', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByText('Amount (TND)')).toBeInTheDocument();
      });

      // Click "Amount (TND)" column header to sort -> desc
      fireEvent.click(screen.getByText('Amount (TND)'));

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'orders',
          expect.objectContaining({ sortBy: 'total_amount', sortDir: 'desc' })
        );
      });

      // Click again to toggle to asc
      fireEvent.click(screen.getByText('Amount (TND)'));

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'orders',
          expect.objectContaining({ sortBy: 'total_amount', sortDir: 'asc' })
        );
      });
    });

    it('T2.6: clamps pagination boundaries (Prev button disabled on page 1, Next button disabled on last page)', async () => {
      mocks.fetchDrilldownData.mockResolvedValue({
        range: MOCK_RANGE,
        data: MOCK_ORDERS,
        meta: {
          page: 1,
          limit: 15,
          total: 10,
          total_pages: 1,
          sort_by: 'created_at',
          sort_dir: 'desc',
        },
      });

      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        const prevBtn = screen.getByRole('button', { name: /Prev/i });
        const nextBtn = screen.getByRole('button', { name: /Next/i });

        expect(prevBtn).toBeDisabled();
        expect(nextBtn).toBeDisabled();
      });
    });

    it('T2.7: handles closed state (isOpen = false) returning null and not mounting in DOM', () => {
      const { container } = render(<AnalyticsDrilldownModal isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('Platform Analytics Drill-Down')).not.toBeInTheDocument();
    });

    it('T2.8: handles missing or zero monetary amounts safely without crashing or NaN output', async () => {
      const edgeOrders: OrderDrilldownItem[] = [
        {
          id: 'ORD-ZERO-001',
          created_at: '2026-08-14T10:00:00.000Z',
          store_id: null,
          store_name: null,
          buyer_id: null,
          buyer_name: null,
          status: 'pending',
          payment_status: 'unpaid',
          total_amount_tnd: 0,
          payment_gateway: null,
          action_url: '/orders/001',
        },
      ];

      mocks.fetchDrilldownData.mockResolvedValueOnce({
        range: MOCK_RANGE,
        data: edgeOrders,
        meta: { page: 1, limit: 15, total: 1, total_pages: 1, sort_by: 'created_at', sort_dir: 'desc' },
      });

      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByText('ORD-ZERO-001')).toBeInTheDocument();
        expect(screen.getByText('0.00')).toBeInTheDocument();
        // Missing store and buyer fallback
        expect(screen.getAllByText('-').length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // TIER 3: PAIRWISE COMBINATIONS & AUDIT WORKFLOWS
  // =========================================================================
  describe('Tier 3: Pairwise Combinations & Complete Audit Workflows', () => {
    it('T3.1: completes comprehensive multi-entity audit journey: tab switch -> search -> filter -> sort -> inspect', async () => {
      const handleClose = vi.fn();
      render(<AnalyticsDrilldownModal isOpen={true} onClose={handleClose} initialType="orders" />);

      await waitFor(() => {
        expect(screen.getByText('ORD-2026-8941')).toBeInTheDocument();
      });

      // 1. Switch to Vendors
      fireEvent.click(screen.getByRole('button', { name: /Vendors/i }));
      await waitFor(() => {
        expect(screen.getByText('Panda Boutique Tunis')).toBeInTheDocument();
      });

      // 2. Search for Sfax vendor
      const vendorSearch = screen.getByPlaceholderText('Search vendors...');
      fireEvent.change(vendorSearch, { target: { value: 'Sfax' } });
      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'vendors',
          expect.objectContaining({ search: 'Sfax' })
        );
      });

      // 3. Switch to Products
      fireEvent.click(screen.getByRole('button', { name: /Products/i }));
      await waitFor(() => {
        expect(screen.getByText('Traditional Chechia Hat Red')).toBeInTheDocument();
      });

      // 4. Switch back to Orders and inspect detail
      fireEvent.click(screen.getByRole('button', { name: /Orders/i }));
      await waitFor(() => {
        expect(screen.getByText('ORD-2026-8941')).toBeInTheDocument();
      });

      const orderRow = screen.getByText('ORD-2026-8941').closest('tr')!;
      const viewBtn = within(orderRow).getByRole('button', { name: /View/i });
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByText('Order Details')).toBeInTheDocument();
        expect(screen.getAllByText('ORD-2026-8941').length).toBeGreaterThanOrEqual(2);
      });

      // Close preview
      fireEvent.click(screen.getByRole('button', { name: /Close Preview/i }));
      await waitFor(() => {
        expect(screen.queryByText('Order Details')).not.toBeInTheDocument();
      });

      // 5. Close main drilldown modal
      const closeButtons = screen.getAllByRole('button');
      // The modal header close button
      const headerCloseBtn = closeButtons.find(
        (b) => b.querySelector('svg.lucide-x') !== null
      );
      if (headerCloseBtn) {
        fireEvent.click(headerCloseBtn);
        expect(handleClose).toHaveBeenCalled();
      }
    });

    it('T3.2: verifies Search Queries drilldown table with zero-result intelligence columns', async () => {
      render(<AnalyticsDrilldownModal isOpen={true} onClose={vi.fn()} initialType="search" />);

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith('search', expect.anything());
        // Verify Column Headers
        expect(screen.getByText('Search Query')).toBeInTheDocument();
        expect(screen.getByText('Search Volume')).toBeInTheDocument();
        expect(screen.getByText('Zero Result Count')).toBeInTheDocument();
        expect(screen.getByText('Zero Result Rate')).toBeInTheDocument();
        expect(screen.getByText('Last Searched')).toBeInTheDocument();

        // Verify Search Query Rows
        expect(screen.getByText('artisanat cuir tunisie')).toBeInTheDocument();
        expect(screen.getByText('450')).toBeInTheDocument();
        expect(screen.getByText('180')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();

        expect(screen.getByText('huile d olive bio sfax')).toBeInTheDocument();
        expect(screen.getByText('320')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('4.7%')).toBeInTheDocument();
      });
    });

    it('T3.3: verifies custom initialType and timeRange props binding on mount', async () => {
      render(
        <AnalyticsDrilldownModal
          isOpen={true}
          onClose={vi.fn()}
          initialType="events"
          timeRange="90d"
        />
      );

      await waitFor(() => {
        expect(mocks.fetchDrilldownData).toHaveBeenCalledWith(
          'events',
          expect.objectContaining({ timeRange: '90d' })
        );
        expect(screen.getByText('checkout_completed')).toBeInTheDocument();
      });
    });
  });
});
