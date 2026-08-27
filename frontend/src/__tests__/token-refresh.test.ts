import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refreshSession, fetchWithCsrf } from '../lib/api';

describe('PLAN-B-26: Token Refresh Route Discrimination', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'pd_csrf=test_csrf_token',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('routes storefront 401 refreshes to /api/pd/storefront/auth/refresh', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // 1st call: store product fetch returns 401
    fetchMock.mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    // 2nd call: storefront token refresh returns 200 OK
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    // 3rd call: retried product fetch returns 200 OK
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ success: true }),
    });

    const res = await fetchWithCsrf('/api/pd/storefront/me/orders');

    expect(res.status).toBe(200);

    // Verify the second fetch call went to /api/pd/storefront/auth/refresh
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/pd/storefront/auth/refresh');
    expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  });

  it('routes hub/admin 401 refreshes to /api/pd/auth/refresh', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // 1st call: admin stats returns 401
    fetchMock.mockResolvedValueOnce({
      status: 401,
      ok: false,
    });

    // 2nd call: hub token refresh returns 200 OK
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    // 3rd call: retried stats fetch returns 200 OK
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
    });

    const res = await fetchWithCsrf('/api/pd/admin/stats');

    expect(res.status).toBe(200);

    // Verify the second fetch call went to /api/pd/auth/refresh
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/pd/auth/refresh');
  });
});
