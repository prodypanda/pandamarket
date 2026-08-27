import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../components/admin/AdsPlatformChart', () => ({
  AdsPlatformChart: () => null,
}));

vi.mock('@/lib/api', () => ({ fetchWithCsrf: vi.fn() }));

import AdminAdsPage from '../app/(admin)/ads/page';
import { fetchWithCsrf } from '@/lib/api';

describe('AdminAdsPage', () => {
  const mockFetch = (url: string) => {
    if (url.includes('/fraud/blocked-ips')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          blocked_ips: [{ ip_hash: 'hash_123', reason: 'Spam clicks', blocked_at: new Date('2026-07-01T10:00:00Z').toISOString() }]
        }),
      });
    }
    if (url.includes('/placements')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ placements: [] }) });
    }
    if (url.includes('/config')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ config: { ads_enabled: true } }) });
    }
    if (url.includes('/transactions')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ transactions: [] }) });
    }
    if (url.includes('/coupons')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ coupons: [] }) });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        summary: {},
        campaigns: [],
        accounts: [],
        daily: [],
        reviews: [],
      }),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetchWithCsrf as any).mockImplementation(mockFetch);
  });

  it('renders without crashing', async () => {
    render(<AdminAdsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/PandaMarket Ads/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Fraud/i })).toBeInTheDocument();
    });
  });

  it('renders blocked IPs when data is available', async () => {
    render(<AdminAdsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fraud/i })).toBeInTheDocument();
    });

    const fraudTab = screen.getByRole('button', { name: /Fraud/i });
    act(() => {
      fireEvent.click(fraudTab);
    });

    await waitFor(() => {
      expect(screen.getByText(/Blocked IP Hashes/i)).toBeInTheDocument();
      expect(screen.getByText('hash_123')).toBeInTheDocument();
      expect(screen.getByText(/Spam clicks/i)).toBeInTheDocument();
    });
  });

  it('submits block IP form correctly', async () => {
    render(<AdminAdsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fraud/i })).toBeInTheDocument();
    });

    const fraudTab = screen.getByRole('button', { name: /Fraud/i });
    act(() => {
      fireEvent.click(fraudTab);
    });

    (fetchWithCsrf as any).mockImplementation((url: string, options: any) => {
      if (url === '/api/pd/admin/ads/fraud/blocked-ips' && options?.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return mockFetch(url);
    });

    const ipHashInput = screen.getByPlaceholderText(/IP Hash/i);
    const reasonInput = screen.getByPlaceholderText(/Block reason/i);
    const submitBtn = screen.getByRole('button', { name: /Block Identifier/i });

    act(() => {
      fireEvent.change(ipHashInput, { target: { value: 'hash_456' } });
      fireEvent.change(reasonInput, { target: { value: 'Bot traffic' } });
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(fetchWithCsrf).toHaveBeenCalledWith('/api/pd/admin/ads/fraud/block-ip', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ip_hash: 'hash_456', reason: 'Bot traffic' })
      }));
    });
  });
});
