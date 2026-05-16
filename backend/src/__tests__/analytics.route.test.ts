import express from 'express';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PdError, PdInternalError } from '../errors';

const mockQuery = vi.fn();

vi.mock('../db/pool', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('../services/system-log.service', () => ({
  systemLogService: { captureError: vi.fn() },
}));

vi.mock('../utils/sentry', () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

import analyticsRouter from '../api/analytics.route';

function testApp() {
  const app = express();
  app.use(express.json());
  app.use('/analytics', analyticsRouter);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof PdError) {
      res.status(err.httpStatus).json(err.toJSON());
      return;
    }
    const wrapped = new PdInternalError('Internal server error');
    res.status(500).json(wrapped.toJSON());
  });
  return app;
}

async function postPageBuilderEvent(app: express.Express, body: unknown, headers: Record<string, string> = {}) {
  const server = app.listen(0);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port');
    }
    const res = await fetch(`http://127.0.0.1:${(address as AddressInfo).port}/analytics/page-builder/event`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('analytics.route Page Builder events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a valid Page Builder page view for a published page', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const res = await postPageBuilderEvent(
      testApp(),
      {
        store_id: 'store_1',
        page_id: 'page_1',
        event_type: 'page_view',
        page_path: '/pages/about',
        visitor_id: 'visitor_1',
      },
      {
        'user-agent': 'vitest-agent',
        referer: 'https://store.example/pages/about',
      },
    );

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ success: true, tracked: true });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pd_store_page_analytics_event'),
      expect.arrayContaining([
        expect.stringMatching(/^pd_pbevt_/),
        'page_1',
        'store_1',
        'page_view',
        null,
        null,
        null,
        '/pages/about',
        'https://store.example/pages/about',
        expect.any(String),
        'vitest-agent',
      ]),
    );
  });

  it('returns tracked false when the page is not published or does not belong to the store', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await postPageBuilderEvent(testApp(), {
        store_id: 'store_1',
        page_id: 'page_2',
        event_type: 'cta_click',
        target_url: '/products',
        target_label: 'Voir tout',
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ success: true, tracked: false });
  });

  it('hashes visitor identity and normalizes optional text fields before inserting', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const visitorId = 'visitor_private_123';
    const res = await postPageBuilderEvent(
      testApp(),
      {
        store_id: 'store_1',
        page_id: 'page_1',
        event_type: 'product_click',
        product_id: '  prod_1  ',
        target_url: '  /products/cool-shoes  ',
        target_label: '  Cool Shoes  ',
        page_path: '  /pages/about  ',
        visitor_id: visitorId,
      },
      {
        'user-agent': 'vitest-agent',
      },
    );

    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(res.status).toBe(202);
    expect(params[4]).toBe('prod_1');
    expect(params[5]).toBe('/products/cool-shoes');
    expect(params[6]).toBe('Cool Shoes');
    expect(params[7]).toBe('/pages/about');
    expect(params[9]).toBe(createHash('sha256').update(visitorId).digest('hex'));
    expect(params).not.toContain(visitorId);
  });

  it('rejects invalid Page Builder event types', async () => {
    const res = await postPageBuilderEvent(testApp(), {
        store_id: 'store_1',
        page_id: 'page_1',
        event_type: 'form_submit',
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.message).toBe('Invalid input');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
