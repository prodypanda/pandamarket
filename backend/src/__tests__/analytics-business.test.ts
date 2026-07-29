import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../services/analytics.service';

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../db/redis', () => ({
  getRedis: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  }),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

describe('AnalyticsService getBusinessAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes business analytics with truthful database queries and growth comparisons', async () => {
    mockQuery.mockImplementation((sql: string) => {
      // 1. Orders
      if (sql.includes('total_orders')) {
        return Promise.resolve({
          rows: [
            {
              total_orders: 50,
              paid_orders: 40,
              cancelled_orders: 5,
              fulfilled_orders: 35,
              gmv_tnd: '12000.000',
            },
          ],
        });
      }
      if (sql.includes('FROM pd_order') && sql.includes('created_at >= $1::timestamp') && !sql.includes('customer_id')) {
        return Promise.resolve({
          rows: [{ paid_orders: 30, gmv_tnd: '9000.000' }],
        });
      }

      // 2. Buyers
      if (sql.includes('total_buyers_current')) {
        return Promise.resolve({
          rows: [{ total_buyers_current: 200, new_buyers: 25 }],
        });
      }
      if (sql.includes("role = 'customer'") && sql.includes('count')) {
        return Promise.resolve({ rows: [{ count: 20 }] });
      }
      if (sql.includes('active_buyers')) {
        return Promise.resolve({ rows: [{ active_buyers: 30 }] });
      }
      if (sql.includes('repeat_buyers')) {
        return Promise.resolve({ rows: [{ repeat_buyers: 10 }] });
      }

      // 3. Sellers
      if (sql.includes('total_sellers_current')) {
        return Promise.resolve({
          rows: [{ total_sellers_current: 40, new_sellers: 6 }],
        });
      }
      if (sql.includes("role IN ('vendor', 'seller')") && sql.includes('count')) {
        return Promise.resolve({ rows: [{ count: 4 }] });
      }
      if (sql.includes('stores_created')) {
        return Promise.resolve({
          rows: [{ stores_created: 5, active_stores_current: 32 }],
        });
      }
      if (sql.includes('stores_with_products')) {
        return Promise.resolve({ rows: [{ stores_with_products: 28 }] });
      }
      if (sql.includes('stores_with_orders')) {
        return Promise.resolve({ rows: [{ stores_with_orders: 22 }] });
      }

      // 4. Payouts & Wallets
      if (sql.includes('FROM pd_vendor_wallet')) {
        return Promise.resolve({
          rows: [{ total_balance: '15000.500', pending_balance: '3000.000', total_withdrawn: '45000.000' }],
        });
      }
      if (sql.includes('FROM pd_wallet_transaction')) {
        return Promise.resolve({
          rows: [{ count: 12, amount: '5400.000' }],
        });
      }

      // 5. Risk & Reports
      if (sql.includes('FROM pd_reports') && !sql.includes('high_risk_vendors')) {
        return Promise.resolve({
          rows: [{ total_reports: 3, open_reports: 1 }],
        });
      }
      if (sql.includes('FROM pd_subscription_dispute')) {
        return Promise.resolve({ rows: [{ open_disputes: 0 }] });
      }
      if (sql.includes('FROM pd_store_order_refund')) {
        return Promise.resolve({ rows: [{ refunds_count: 2, refunds_amount: '250.000' }] });
      }
      if (sql.includes('high_risk_vendors')) {
        return Promise.resolve({ rows: [{ high_risk_vendors: 0 }] });
      }

      // 6. KYC & Support Operations
      if (sql.includes('FROM pd_verification_documents')) {
        return Promise.resolve({
          rows: [{ pending_kyc: 2, approved_kyc: 18, rejected_kyc: 2 }],
        });
      }
      if (sql.includes('FROM pd_support_ticket')) {
        return Promise.resolve({
          rows: [{ open_tickets: 4, urgent_tickets: 1 }],
        });
      }

      return Promise.resolve({ rows: [] });
    });

    const result = await analyticsService.getBusinessAnalytics({ timeRange: '30d' });

    expect(result.orders.available).toBe(true);
    expect(result.orders.total_orders).toBe(50);
    expect(result.orders.paid_orders).toBe(40);
    expect(result.orders.marketplace_gmv_tnd).toBe(12000);
    expect(result.orders.average_order_value_tnd).toBe(300);
    expect(result.orders.order_growth_pct).toBe(33.33);

    expect(result.checkout.available).toBe(false);
    expect(result.checkout.unavailable_reason).toBe('Checkout funnel events are not tracked yet.');

    expect(result.buyers.total_buyers_current).toBe(200);
    expect(result.buyers.new_buyers).toBe(25);
    expect(result.buyers.active_buyers).toBe(30);
    expect(result.buyers.repeat_buyers).toBe(10);
    expect(result.buyers.repeat_buyer_rate_pct).toBe(33.3);

    expect(result.sellers.total_sellers_current).toBe(40);
    expect(result.sellers.stores_with_orders).toBe(22);
    expect(result.sellers.activation_rate_pct).toBe(55);

    expect(result.payouts.total_wallet_balance_tnd).toBe(15000.5);
    expect(result.payouts.payout_amount_in_period_tnd).toBe(5400);

    expect(result.risk.reports_count).toBe(3);
    expect(result.risk.refunds_amount_tnd).toBe(250);

    expect(result.operations.pending_kyc_count).toBe(2);
    expect(result.operations.approved_kyc_count).toBe(18);
    expect(result.operations.kyc_approval_rate_pct).toBe(90);
  });

  it('exports business metrics in CSV correctly', async () => {
    mockQuery.mockResolvedValue({ rows: [{ total_orders: 10, paid_orders: 8, gmv_tnd: '1500.000' }] });
    const csv = await analyticsService.generateExportCSV({ type: 'business', timeRange: '30d' });

    expect(csv).toContain('"Marketplace Orders"');
    expect(csv).toContain('"Total Orders in Period"');
    expect(csv).toContain('"Checkout Funnel"');
    expect(csv).toContain('"No (Events not tracked yet)"');
    expect(csv).toContain('"Buyers"');
    expect(csv).toContain('"Sellers"');
    expect(csv).toContain('"Payouts"');
    expect(csv).toContain('"Risk & Disputes"');
    expect(csv).toContain('"Operations"');
  });
});
