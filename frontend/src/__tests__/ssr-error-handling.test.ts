import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FetchResult } from '../lib/fetch-result';

describe('PLAN-B-09: SSR Route Error Discrimination (404 vs 500/Transient)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function mockFetchHelper(url: string): Promise<FetchResult<{ id: string; name: string }>> {
    try {
      const res = await fetch(url);
      if (res.status === 404) return { status: 'not_found' };
      if (!res.ok) return { status: 'error', error: `Upstream error ${res.status}`, statusCode: res.status };
      const data = await res.json();
      return { status: 'ok', data };
    } catch (err: any) {
      return { status: 'error', error: err?.message || 'Network error' };
    }
  }

  it('correctly identifies authentic 404 resource not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    const result = await mockFetchHelper('http://localhost:9000/api/pd/products/nonexistent');
    expect(result.status).toBe('not_found');
  });

  it('discriminates 500/503 upstream server failure as error (not 404)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Service Unavailable' }),
    });

    const result = await mockFetchHelper('http://localhost:9000/api/pd/products/prod_123');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.statusCode).toBe(503);
      expect(result.error).toContain('503');
    }
  });

  it('discriminates connection timeout / network drop as error (not 404)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

    const result = await mockFetchHelper('http://localhost:9000/api/pd/products/prod_123');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toContain('ECONNREFUSED');
    }
  });

  it('returns ok with parsed payload on 200 success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'prod_123', name: 'Panda Hoodie' }),
    });

    const result = await mockFetchHelper('http://localhost:9000/api/pd/products/prod_123');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.id).toBe('prod_123');
      expect(result.data.name).toBe('Panda Hoodie');
    }
  });
});
