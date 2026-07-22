import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../components/admin/AdsPlatformChart', () => ({
  AdsPlatformChart: () => null,
}));

vi.mock('@/lib/api', () => ({ fetchWithCsrf: vi.fn() }));

import AdminAdsPage from '../app/(admin)/ads/page';
import { fetchWithCsrf } from '@/lib/api';

describe('AdminAdsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (fetchWithCsrf as any).mockImplementation((url: string) => {
      if (url === '/api/pd/admin/ads') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ campaigns: [], accounts: [], reviews: [], summary: {}, daily: [] }) });
      }
      if (url === '/api/pd/admin/ads/placements') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ placements: [] }) });
      }
      if (url === '/api/pd/admin/ads/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ config: { ads_enabled: true } }) });
      }
      if (url === '/api/pd/admin/ads/transactions?limit=100') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ transactions: [] }) });
      }
      if (url === '/api/pd/admin/ads/coupons') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ coupons: [] }) });
      }
      if (url === '/api/pd/admin/ads/fraud/blocked-ips') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ blocked_ips: [] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders without crashing', async () => {
    render(<AdminAdsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('PandaMarket Ads')).toBeInTheDocument();
      expect(screen.getByText('Global Ads configuration')).toBeInTheDocument();
      expect(screen.getByText('Fraud & Safety')).toBeInTheDocument();
    });
  });

  it('renders blocked IPs when data is available', async () => {
    (fetchWithCsrf as any).mockImplementation((url: string) => {
      if (url === '/api/pd/admin/ads/fraud/blocked-ips') {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({ 
            blocked_ips: [{ ip_hash: 'hash_123', reason: 'Spam clicks', blocked_at: new Date('2026-07-01T10:00:00Z').toISOString() }] 
          }) 
        });
      }
      // other mocks fallback
      if (url === '/api/pd/admin/ads') return Promise.resolve({ ok: true, json: () => Promise.resolve({ campaigns: [], accounts: [], reviews: [], summary: {}, daily: [] }) });
      if (url === '/api/pd/admin/ads/placements') return Promise.resolve({ ok: true, json: () => Promise.resolve({ placements: [] }) });
      if (url === '/api/pd/admin/ads/config') return Promise.resolve({ ok: true, json: () => Promise.resolve({ config: { ads_enabled: true } }) });
      if (url === '/api/pd/admin/ads/transactions?limit=100') return Promise.resolve({ ok: true, json: () => Promise.resolve({ transactions: [] }) });
      if (url === '/api/pd/admin/ads/coupons') return Promise.resolve({ ok: true, json: () => Promise.resolve({ coupons: [] }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<AdminAdsPage />);

    await waitFor(() => {
      expect(screen.getByText('hash_123')).toBeInTheDocument();
      expect(screen.getByText('Spam clicks')).toBeInTheDocument();
    });
  });

  it('submits block IP form correctly', async () => {
    render(<AdminAdsPage />);

    await waitFor(() => {
      expect(screen.getByText('PandaMarket Ads')).toBeInTheDocument();
    });

    (fetchWithCsrf as any).mockImplementation((url: string, options: any) => {
      if (url === '/api/pd/admin/ads/fraud/block-ip' && options?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      // Re-mock load endpoints to resolve immediately
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ 
        campaigns: [], accounts: [], reviews: [], summary: {}, daily: [], placements: [], config: {}, transactions: [], coupons: [], blocked_ips: [] 
      }) });
    });

    const ipHashInput = screen.getByPlaceholderText('IP Hash');
    const reasonInput = screen.getByPlaceholderText('Reason (optional)');
    const submitBtn = screen.getByRole('button', { name: 'Block IP' });

    fireEvent.change(ipHashInput, { target: { value: 'hash_456' } });
    fireEvent.change(reasonInput, { target: { value: 'Bot traffic' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/admin/ads/fraud/block-ip', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ip_hash: 'hash_456', reason: 'Bot traffic' })
      }));
    });
  });
});
